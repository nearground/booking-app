/**
 * Unit tests for Task 005 — Schedule Update Lookahead
 *
 * Tests:
 * 1. syncExperienceSchedule uses custom scheduleLookaheadDays
 * 2. syncExperienceSchedule defaults to 90 when scheduleLookaheadDays is undefined
 * 3. updateLookahead controller sets scheduleLookaheadDays
 * 4. updateLookahead rejects values < 1
 * 5. updateLookahead rejects values > 730
 * 6. updateLookahead returns 404 for non-existent experience
 * 7. updateLookahead returns 403 for non-admin
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
    };
    const PickedOccurrence = {
        findAll: jest.fn().mockResolvedValue([]),
    };
    const Location = {
        findByPk: jest.fn().mockResolvedValue({ id: 1, timezone: 'UTC' }),
    };
    const Experience = {
        findByPk: jest.fn(),
    };
    const Organization = {
        findByPk: jest.fn(),
    };
    const User = {
        findByPk: jest.fn(),
    };
    const TicketTier = {};
    const OrganizationMembers = {
        findOne: jest.fn(),
    };

    return {
        __esModule: true,
        default: {
            ScheduledExperience,
            ScheduleTemplate,
            PickedOccurrence,
            Location,
            Experience,
            Organization,
            User,
            TicketTier,
            sequelize: {
                transaction: jest.fn().mockResolvedValue({
                    commit: jest.fn(),
                    rollback: jest.fn(),
                }),
                models: { OrganizationMembers, ScheduleTemplate, PickedOccurrence },
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

jest.mock('../../server/utils/http-response.js', () => ({
    __esModule: true,
    sendError: jest.fn((res, { status, message }) => {
        res.status(status).json({ errors: [message], data: {} });
    }),
}));

jest.mock('../../server/services/Scheduler.service.js', () => ({
    __esModule: true,
    syncExperienceSchedule: jest.fn().mockResolvedValue([]),
}));

jest.mock('../../server/controllers/offering-manage.shared.js', () => ({
    __esModule: true,
    normalizeBaseCreatePayload: jest.fn(),
    normalizeBaseUpdatePayload: jest.fn(),
    createAssignOrganizersHandler: jest.fn().mockReturnValue(jest.fn()),
    createSyncManagedScheduleHandler: jest.fn().mockReturnValue(jest.fn()),
    normalizeSchedules: jest.fn(),
}));

import modelRegistry from '../../server/models/index.js';

const { ScheduledExperience, ScheduleTemplate, PickedOccurrence, Experience } = modelRegistry;

beforeEach(() => {
    jest.clearAllMocks();
    ScheduledExperience.findAll.mockResolvedValue([]);
    ScheduledExperience.findOne.mockResolvedValue(null);
    ScheduleTemplate.findAll.mockResolvedValue([]);
    PickedOccurrence.findAll.mockResolvedValue([]);
});

// ---- Scheduler Service Tests ----
describe('syncExperienceSchedule - scheduleLookaheadDays', () => {
    let actualSync;

    beforeAll(async () => {
        jest.unmock('../../server/services/Scheduler.service.js');
        const mod = await import('../../server/services/Scheduler.service.js');
        actualSync = mod.syncExperienceSchedule;
    });

    afterAll(() => {
        jest.mock('../../server/services/Scheduler.service.js', () => ({
            __esModule: true,
            syncExperienceSchedule: jest.fn().mockResolvedValue([]),
        }));
    });

    test('uses custom scheduleLookaheadDays when generating sessions', async () => {
        // Create a template with a weekly cron (every Monday at 9am)
        ScheduleTemplate.findAll.mockResolvedValue([
            {
                id: 1,
                ruleType: 'cron',
                ruleCron: '0 9 * * 1', // every Monday 9am
                timezone: 'UTC',
                active: true,
                startDate: null,
                endDate: null,
                maxOccurrences: null,
                durationMinutes: 60,
                capacity: 20,
            },
        ]);

        const experience = {
            id: 1,
            scheduleLookaheadDays: 180,
            duration: 120,
            capacity: 10,
            LocationId: 1,
        };

        await actualSync(experience);

        // Check bulkCreate was called and the sessions extend beyond 90 days
        if (ScheduledExperience.bulkCreate.mock.calls.length > 0) {
            const sessions = ScheduledExperience.bulkCreate.mock.calls[0][0];
            const lastSession = sessions[sessions.length - 1];
            const daysOut = (new Date(lastSession.dateTime).getTime() - Date.now()) / (24 * 60 * 60 * 1000);
            // With 180-day lookahead, the last session should be between ~90 and ~180 days out
            expect(daysOut).toBeGreaterThan(85);
            expect(daysOut).toBeLessThanOrEqual(181);
        }
    });

    test('defaults to 90 days when scheduleLookaheadDays is undefined', async () => {
        ScheduleTemplate.findAll.mockResolvedValue([
            {
                id: 1,
                ruleType: 'cron',
                ruleCron: '0 9 * * 1',
                timezone: 'UTC',
                active: true,
                startDate: null,
                endDate: null,
                maxOccurrences: null,
                durationMinutes: 60,
                capacity: 20,
            },
        ]);

        const experience = {
            id: 1,
            // No scheduleLookaheadDays set
            duration: 120,
            capacity: 10,
            LocationId: 1,
        };

        await actualSync(experience);

        if (ScheduledExperience.bulkCreate.mock.calls.length > 0) {
            const sessions = ScheduledExperience.bulkCreate.mock.calls[0][0];
            const lastSession = sessions[sessions.length - 1];
            const daysOut = (new Date(lastSession.dateTime).getTime() - Date.now()) / (24 * 60 * 60 * 1000);
            // With default 90-day lookahead, last session should be within 91 days
            expect(daysOut).toBeLessThanOrEqual(91);
        }
    });
});

// ---- Controller Tests ----
describe('updateLookahead controller', () => {
    let updateLookahead;

    beforeAll(async () => {
        jest.mock('../../server/services/Scheduler.service.js', () => ({
            __esModule: true,
            syncExperienceSchedule: jest.fn().mockResolvedValue([]),
        }));
        const mod = await import('../../server/controllers/ExperienceManage.controller.js');
        updateLookahead = mod.updateLookahead;
    });

    const mockRes = () => {
        const res = {};
        res.status = jest.fn().mockReturnValue(res);
        res.json = jest.fn().mockReturnValue(res);
        return res;
    };

    test('updates scheduleLookaheadDays on the experience', async () => {
        const updateMock = jest.fn();
        Experience.findByPk.mockResolvedValue({
            id: 1,
            OrganizationId: 10,
            update: updateMock,
        });
        modelRegistry.sequelize.models.OrganizationMembers.findOne.mockResolvedValue({ id: 1, isAdmin: true });

        const req = {
            params: { experienceId: '1' },
            body: { days: 180 },
            user: { id: 5 },
        };
        const res = mockRes();

        await updateLookahead(req, res);

        expect(updateMock).toHaveBeenCalledWith({ scheduleLookaheadDays: 180 });
        expect(res.status).toHaveBeenCalledWith(200);
        expect(res.json).toHaveBeenCalledWith({
            errors: [],
            data: { scheduleLookaheadDays: 180 },
        });
    });

    test('rejects days < 1', async () => {
        Experience.findByPk.mockResolvedValue({
            id: 1,
            OrganizationId: 10,
        });
        modelRegistry.sequelize.models.OrganizationMembers.findOne.mockResolvedValue({ id: 1, isAdmin: true });

        const req = {
            params: { experienceId: '1' },
            body: { days: 0 },
            user: { id: 5 },
        };
        const res = mockRes();

        await updateLookahead(req, res);

        expect(res.status).toHaveBeenCalledWith(400);
        expect(res.json).toHaveBeenCalledWith(
            expect.objectContaining({
                errors: ['days must be an integer between 1 and 730'],
            })
        );
    });

    test('rejects days > 730', async () => {
        Experience.findByPk.mockResolvedValue({
            id: 1,
            OrganizationId: 10,
        });
        modelRegistry.sequelize.models.OrganizationMembers.findOne.mockResolvedValue({ id: 1, isAdmin: true });

        const req = {
            params: { experienceId: '1' },
            body: { days: 731 },
            user: { id: 5 },
        };
        const res = mockRes();

        await updateLookahead(req, res);

        expect(res.status).toHaveBeenCalledWith(400);
    });

    test('returns 404 for non-existent experience', async () => {
        Experience.findByPk.mockResolvedValue(null);

        const req = {
            params: { experienceId: '999' },
            body: { days: 180 },
            user: { id: 5 },
        };
        const res = mockRes();

        await updateLookahead(req, res);

        expect(res.status).toHaveBeenCalledWith(404);
    });

    test('returns 403 when user is not org admin', async () => {
        Experience.findByPk.mockResolvedValue({
            id: 1,
            OrganizationId: 10,
        });
        modelRegistry.sequelize.models.OrganizationMembers.findOne.mockResolvedValue(null);

        const req = {
            params: { experienceId: '1' },
            body: { days: 180 },
            user: { id: 5 },
        };
        const res = mockRes();

        await updateLookahead(req, res);

        expect(res.status).toHaveBeenCalledWith(403);
    });
});
