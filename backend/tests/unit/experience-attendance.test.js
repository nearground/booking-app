import {
    getPartyAttendance,
    getPublicExperienceAttendance,
} from '../../server/services/ExperienceAttendance.service.js';
import { getExperienceAttendance } from '../../server/controllers/ExperienceAttendance.controller.js';
import {
    ScheduledExperience,
    ExperienceReservation,
    ExperienceReservationAnswer,
    User,
} from '../../server/models/index.js';

jest.mock('../../server/utils/media-storage.js', () => ({
    resolveMediaUrl: jest.fn((value) => value || null),
}));

describe('public registered attendance', () => {
    beforeEach(() => {
        jest.spyOn(ScheduledExperience, 'findOne').mockResolvedValue({
            id: 12,
            status: 'in-progress',
        });
        jest.spyOn(ScheduledExperience, 'findAll').mockResolvedValue([
            { id: 12, status: 'in-progress', dateTime: '2026-10-28T00:00:00Z' },
        ]);
        jest.spyOn(ExperienceReservation, 'sum').mockResolvedValue('8');
        jest.spyOn(ExperienceReservation, 'findAll').mockResolvedValue([]);
    });
    afterEach(() => jest.restoreAllMocks());

    test('counts confirmed attendees and only queries explicitly opted-in registered identities', async () => {
        ExperienceReservation.findAll.mockResolvedValue([
            {
                Customer: {
                    id: 1,
                    firstName: 'Alex',
                    lastName: 'Rivera',
                    profilePicture: '/images/alex.jpg',
                    email: 'private@example.com',
                    phoneNumber: 'private',
                },
            },
            { Customer: { id: 1, firstName: 'Alex', lastName: 'Rivera' } },
            { Customer: null },
        ]);
        const result = await getPublicExperienceAttendance({
            experienceCode: '2',
            sessionId: '12',
        });
        expect(ScheduledExperience.findOne).toHaveBeenCalledWith(
            expect.objectContaining({
                where: { id: '12', ExperienceId: '2' },
            })
        );
        expect(ExperienceReservation.sum).toHaveBeenCalledWith(
            'numberOfAttendees',
            {
            where: { ScheduledExperienceId: 12, status: ['confirmed', 'attended'] },
            }
        );
        expect(ExperienceReservation.findAll).toHaveBeenCalledWith(
            expect.objectContaining({
                attributes: ['CustomerId'],
                include: expect.arrayContaining([
                    expect.objectContaining({
                        model: User,
                        as: 'Customer',
                        required: true,
                    }),
                    expect.objectContaining({
                        model: ExperienceReservationAnswer,
                        where: {
                            questionKey: 'publicAttendance',
                            answerText: 'true',
                        },
                        required: true,
                    }),
                ]),
                limit: 50,
            })
        );
        expect(
            ExperienceReservation.findAll.mock.calls[0][0].include.find(
                (include) => include.as === 'Customer'
            ).where
        ).toBeUndefined();
        expect(result).toEqual({
            status: 200,
            errors: [],
            data: {
                attendeeCount: 8,
                attendees: [
                    { name: 'Alex Rivera', avatar: '/images/alex.jpg' },
                ],
            },
        });
    });

    test('shows an aggregate without inventing identities when nobody consents', async () => {
        expect(
            (
                await getPublicExperienceAttendance({
                    experienceCode: 2,
                    sessionId: 12,
                })
            ).data
        ).toEqual({ attendeeCount: 8, attendees: [] });
    });

    test('normalizes empty counts', async () => {
        ExperienceReservation.sum.mockResolvedValue(null);
        expect(
            (
                await getPublicExperienceAttendance({
                    experienceCode: 2,
                    sessionId: 12,
                })
            ).data.attendeeCount
        ).toBe(0);
    });

    test('resolves the sole event even after doors open without the future-only booking calendar', async () => {
        const result = await getPartyAttendance({ experienceCode: 2 });
        expect(result.data.session).toEqual({
            id: 12,
            status: 'in-progress',
            dateTime: '2026-10-28T00:00:00Z',
        });
        expect(result.data.attendeeCount).toBe(8);
        expect(ScheduledExperience.findAll).toHaveBeenCalledWith(
            expect.objectContaining({ limit: 2 })
        );
    });

    test.each([{ sessions: [] }, { sessions: [{ id: 12 }, { id: 13 }] }])(
        'does not silently choose an event from an invalid single-event schedule',
        async ({ sessions }) => {
            ScheduledExperience.findAll.mockResolvedValue(sessions);
            expect(
                (await getPartyAttendance({ experienceCode: 2 })).status
            ).toBe(409);
            expect(ExperienceReservation.sum).not.toHaveBeenCalled();
        }
    );

    test.each([null, { id: 12, status: 'cancelled' }])(
        'does not expose missing or cancelled sessions',
        async (session) => {
            ScheduledExperience.findOne.mockResolvedValue(session);
            expect(
                (
                    await getPublicExperienceAttendance({
                        experienceCode: 2,
                        sessionId: 12,
                    })
                ).status
            ).toBe(404);
            expect(ExperienceReservation.sum).not.toHaveBeenCalled();
        }
    );

    test.each(['0', '-1', 'abc', '1.2'])(
        'rejects invalid session %s before querying',
        async (sessionId) => {
            expect(
                (
                    await getPublicExperienceAttendance({
                        experienceCode: 2,
                        sessionId,
                    })
                ).status
            ).toBe(400);
            expect(ScheduledExperience.findOne).not.toHaveBeenCalled();
        }
    );

    test('controller disables caching and returns a safe failure', async () => {
        ScheduledExperience.findOne.mockRejectedValue(
            new Error('database connection details')
        );
        const res = {
            set: jest.fn(),
            status: jest.fn().mockReturnThis(),
            json: jest.fn(),
        };
        await getExperienceAttendance(
            { params: { experienceCode: 2, sessionId: 12 } },
            res
        );
        expect(res.set).toHaveBeenCalledWith('Cache-Control', 'no-store');
        expect(res.status).toHaveBeenCalledWith(500);
        expect(JSON.stringify(res.json.mock.calls)).not.toContain(
            'database connection details'
        );
    });
});
