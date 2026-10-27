/**
 * Unit tests for Task 010 — Schedule Builder Update Start Date for Existing
 *
 * Tests:
 * 1. previewStartDateUpdate classifies empty vs non-empty sessions
 * 2. previewStartDateUpdate returns empty arrays when no sessions exist before newStartDate
 * 3. previewStartDateUpdate rejects an invalid newStartDate
 * 4. previewStartDateUpdate computes suggestedStartDate from last session
 * 5. confirmStartDateUpdate cancels empty sessions and skips non-empty
 * 6. confirmStartDateUpdate updates template startDates
 * 7. confirmStartDateUpdate rolls back on error
 * 8. confirmStartDateUpdate skips cancellation when cancelEmptySessions is false
 */

jest.mock('../../server/models/database.js', () => ({
    transaction: jest.fn().mockResolvedValue({
        commit: jest.fn(),
        rollback: jest.fn(),
    }),
    models: { ScheduledExperience: null },
}));

jest.mock('../../server/models/index.js', () => {
    const ScheduledExperience = {
        findAll: jest.fn().mockResolvedValue([]),
        findOne: jest.fn().mockResolvedValue(null),
        findByPk: jest.fn(),
        bulkCreate: jest.fn().mockImplementation((rows) =>
            rows.map((r, i) => ({ id: i + 1, ...r }))
        ),
        create: jest.fn().mockImplementation((data) => ({ id: 100, ...data })),
    };
    const ScheduleTemplate = {
        findAll: jest.fn().mockResolvedValue([]),
        update: jest.fn().mockResolvedValue([1]),
    };
    const PickedOccurrence = {
        findAll: jest.fn().mockResolvedValue([]),
    };
    const Location = {
        findByPk: jest.fn().mockResolvedValue({ id: 1, timezone: 'UTC' }),
    };
    const Experience = {
        findByPk: jest.fn(),
        update: jest.fn(),
    };
    const Comment = {
        findAll: jest.fn().mockResolvedValue([]),
    };
    const ExperienceReservation = {};

    const commitMock = jest.fn();
    const rollbackMock = jest.fn();

    return {
        __esModule: true,
        default: {
            ScheduledExperience,
            ScheduleTemplate,
            PickedOccurrence,
            Location,
            Experience,
            Comment,
            ExperienceReservation,
            sequelize: {
                transaction: jest.fn().mockResolvedValue({
                    commit: commitMock,
                    rollback: rollbackMock,
                }),
                models: { ScheduleTemplate, PickedOccurrence },
            },
        },
    };
});

jest.mock('../../server/utils/cache.js', () => ({
    __esModule: true,
    default: {
        get: jest.fn(),
        set: jest.fn(),
        del: jest.fn(),
        delByPrefix: jest.fn(),
    },
}));

import modelRegistry from '../../server/models/index.js';

const { ScheduledExperience, ScheduleTemplate, ExperienceReservation } = modelRegistry;

let previewStartDateUpdate, confirmStartDateUpdate;

beforeAll(async () => {
    const mod = await import('../../server/services/Scheduler.service.js');
    previewStartDateUpdate = mod.previewStartDateUpdate;
    confirmStartDateUpdate = mod.confirmStartDateUpdate;
});

beforeEach(() => {
    jest.clearAllMocks();
    ScheduledExperience.findAll.mockResolvedValue([]);
});

describe('previewStartDateUpdate', () => {
    test('classifies empty vs non-empty sessions', async () => {
        const newStartDate = '2025-06-01';

        // First findAll: sessions before newStartDate (with includes)
        // Second findAll: last session for suggestedStartDate
        ScheduledExperience.findAll
            .mockResolvedValueOnce([
                {
                    id: 1,
                    dateTime: '2025-05-10T09:00:00Z',
                    status: 'scheduled',
                    ExperienceReservations: [],
                },
                {
                    id: 2,
                    dateTime: '2025-05-15T09:00:00Z',
                    status: 'scheduled',
                    ExperienceReservations: [
                        { id: 10, numberOfAttendees: 3, status: 'confirmed' },
                        { id: 11, numberOfAttendees: 2, status: 'cancelled' },
                    ],
                },
                {
                    id: 3,
                    dateTime: '2025-05-20T09:00:00Z',
                    status: 'scheduled',
                    ExperienceReservations: [
                        { id: 12, numberOfAttendees: 1, status: 'confirmed' },
                        { id: 13, numberOfAttendees: 4, status: 'confirmed' },
                    ],
                },
            ])
            .mockResolvedValueOnce([{ dateTime: '2025-07-01T09:00:00Z' }]);

        const result = await previewStartDateUpdate({ experienceId: 1, newStartDate });

        expect(result.emptySessions).toHaveLength(1);
        expect(result.emptySessions[0].id).toBe(1);

        expect(result.nonEmptySessions).toHaveLength(2);
        expect(result.nonEmptySessions[0].id).toBe(2);
        expect(result.nonEmptySessions[0].reservationCount).toBe(1); // only non-cancelled
        expect(result.nonEmptySessions[0].totalAttendees).toBe(3);

        expect(result.nonEmptySessions[1].id).toBe(3);
        expect(result.nonEmptySessions[1].reservationCount).toBe(2);
        expect(result.nonEmptySessions[1].totalAttendees).toBe(5);
    });

    test('returns empty arrays when no sessions before newStartDate', async () => {
        ScheduledExperience.findAll
            .mockResolvedValueOnce([]) // no sessions before
            .mockResolvedValueOnce([{ dateTime: '2025-08-01T09:00:00Z' }]); // last session

        const result = await previewStartDateUpdate({ experienceId: 1, newStartDate: '2025-01-01' });

        expect(result.emptySessions).toHaveLength(0);
        expect(result.nonEmptySessions).toHaveLength(0);
    });

    test('rejects an invalid newStartDate', async () => {
        await expect(
            previewStartDateUpdate({ experienceId: 1, newStartDate: 'not-a-date' })
        ).rejects.toMatchObject({ status: 400, errors: ['Invalid newStartDate'] });
    });

    test('computes suggestedStartDate from last session', async () => {
        ScheduledExperience.findAll
            .mockResolvedValueOnce([]) // no sessions before
            .mockResolvedValueOnce([{ dateTime: '2025-07-15T09:00:00Z' }]); // last session

        const result = await previewStartDateUpdate({ experienceId: 1, newStartDate: '2025-01-01' });

        // suggestedStartDate should be last session + 1 day
        expect(result.suggestedStartDate).toBe('2025-07-16');
    });
});

describe('confirmStartDateUpdate', () => {
    test('cancels empty sessions and skips non-empty', async () => {
        const emptySession = {
            id: 1,
            dateTime: '2025-05-10T09:00:00Z',
            status: 'scheduled',
            ExperienceReservations: [],
            update: jest.fn(),
        };
        const bookedSession = {
            id: 2,
            dateTime: '2025-05-15T09:00:00Z',
            status: 'scheduled',
            ExperienceReservations: [
                { id: 10, status: 'confirmed' },
            ],
            update: jest.fn(),
        };

        ScheduledExperience.findAll.mockResolvedValueOnce([emptySession, bookedSession]);

        const result = await confirmStartDateUpdate({
            experienceId: 1,
            newStartDate: '2025-06-01',
            cancelEmptySessions: true,
        });

        expect(result.cancelledCount).toBe(1);
        expect(emptySession.update).toHaveBeenCalledWith(
            { status: 'cancelled' },
            expect.objectContaining({ transaction: expect.anything() })
        );
        expect(bookedSession.update).not.toHaveBeenCalled();
        expect(result.skippedNonEmpty).toHaveLength(1);
        expect(result.skippedNonEmpty[0].id).toBe(2);
    });

    test('updates template startDates', async () => {
        ScheduledExperience.findAll.mockResolvedValueOnce([]);

        await confirmStartDateUpdate({
            experienceId: 1,
            newStartDate: '2025-06-01',
            cancelEmptySessions: false,
        });

        expect(ScheduleTemplate.update).toHaveBeenCalledWith(
            { startDate: expect.any(Date) },
            expect.objectContaining({
                where: { ExperienceId: 1, active: true },
                transaction: expect.anything(),
            })
        );
    });

    test('rolls back on error', async () => {
        const rollbackMock = jest.fn();
        modelRegistry.sequelize.transaction.mockResolvedValueOnce({
            commit: jest.fn(),
            rollback: rollbackMock,
        });
        // Make ScheduleTemplate.update throw to trigger the catch block
        ScheduleTemplate.update.mockRejectedValueOnce(new Error('DB error'));

        await expect(
            confirmStartDateUpdate({
                experienceId: 1,
                newStartDate: '2025-06-01',
                cancelEmptySessions: false,
            })
        ).rejects.toThrow('DB error');

        expect(rollbackMock).toHaveBeenCalled();
    });

    test('skips cancellation when cancelEmptySessions is false', async () => {
        const result = await confirmStartDateUpdate({
            experienceId: 1,
            newStartDate: '2025-06-01',
            cancelEmptySessions: false,
        });

        // findAll should not be called for session lookup when cancelEmptySessions is false
        // But ScheduleTemplate.update should still be called
        expect(result.cancelledCount).toBe(0);
        expect(result.skippedNonEmpty).toHaveLength(0);
        expect(ScheduleTemplate.update).toHaveBeenCalled();
    });
});
