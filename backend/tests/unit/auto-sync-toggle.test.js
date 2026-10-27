/**
 * Unit tests for Task 004 — Disable Automatic Schedule Syncing
 *
 * Tests:
 * 1. syncExperienceSchedule skips when autoSyncEnabled=false
 * 2. syncExperienceSchedule runs normally when autoSyncEnabled=true
 * 3. syncExperienceSchedule runs when autoSyncEnabled is undefined (default behavior)
 * 4. toggleAutoSync controller updates experience field
 * 5. toggleAutoSync returns 404 for non-existent experience
 * 6. toggleAutoSync returns 403 for non-admin
 * 7. toggleSessionSyncLock updates session field
 * 8. toggleSessionSyncLock returns 404 for non-existent session
 * 9. toggleSessionSyncLock returns 403 for non-admin
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
        findByPk: jest.fn().mockResolvedValue({ id: 1, timezone: 'America/Mexico_City' }),
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

import { syncExperienceSchedule as realSyncExperienceSchedule } from '../../server/services/Scheduler.service.js';
import modelRegistry from '../../server/models/index.js';

const { ScheduledExperience, ScheduleTemplate, PickedOccurrence, Experience } = modelRegistry;

// We need the real syncExperienceSchedule from the service for scheduler tests
// but we also need the controller. Let's import the real scheduler for service tests.

beforeEach(() => {
    jest.clearAllMocks();
    ScheduledExperience.findAll.mockResolvedValue([]);
    ScheduledExperience.findOne.mockResolvedValue(null);
    ScheduledExperience.bulkCreate.mockImplementation((rows) =>
        rows.map((r, i) => ({ id: i + 1, ...r }))
    );
    ScheduleTemplate.findAll.mockResolvedValue([]);
    PickedOccurrence.findAll.mockResolvedValue([]);
});

// ---- Scheduler Service Tests ----
// We need to import the real scheduler service for these tests
// The jest.mock above mocks it for the controller — so we need to test the actual logic
// Instead, let's test it from a fresh import of the actual module

describe('syncExperienceSchedule - autoSyncEnabled', () => {
    let actualSync;

    beforeAll(async () => {
        // Clear the mock for the scheduler service module and reimport
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

    test('skips sync when autoSyncEnabled=false', async () => {
        const experience = {
            id: 1,
            autoSyncEnabled: false,
            duration: 120,
            capacity: 10,
            LocationId: 1,
        };

        const result = await actualSync(experience);
        expect(result).toEqual([]);
        // ScheduleTemplate.findAll should NOT have been called
        expect(ScheduleTemplate.findAll).not.toHaveBeenCalled();
    });

    test('runs sync when autoSyncEnabled=true', async () => {
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
            autoSyncEnabled: true,
            duration: 120,
            capacity: 10,
            LocationId: 1,
        };

        const result = await actualSync(experience);
        expect(ScheduleTemplate.findAll).toHaveBeenCalledWith(
            expect.objectContaining({
                where: { ExperienceId: 1, active: true },
            })
        );
    });

    test('runs sync when autoSyncEnabled is undefined (default)', async () => {
        ScheduleTemplate.findAll.mockResolvedValue([]);
        PickedOccurrence.findAll.mockResolvedValue([]);

        const experience = {
            id: 1,
            duration: 120,
            capacity: 10,
            LocationId: 1,
        };

        await actualSync(experience);
        expect(ScheduleTemplate.findAll).toHaveBeenCalled();
    });
});

// ---- Controller Tests ----
describe('toggleAutoSync controller', () => {
    let toggleAutoSync;

    beforeAll(async () => {
        // Re-mock scheduler for controller import
        jest.mock('../../server/services/Scheduler.service.js', () => ({
            __esModule: true,
            syncExperienceSchedule: jest.fn().mockResolvedValue([]),
        }));
        const mod = await import('../../server/controllers/ExperienceManage.controller.js');
        toggleAutoSync = mod.toggleAutoSync;
    });

    const mockRes = () => {
        const res = {};
        res.status = jest.fn().mockReturnValue(res);
        res.json = jest.fn().mockReturnValue(res);
        return res;
    };

    test('updates autoSyncEnabled on the experience', async () => {
        const updateMock = jest.fn();
        Experience.findByPk.mockResolvedValue({
            id: 1,
            OrganizationId: 10,
            update: updateMock,
        });
        modelRegistry.sequelize.models.OrganizationMembers.findOne.mockResolvedValue({ id: 1, isAdmin: true });

        const req = {
            params: { experienceId: '1' },
            body: { enabled: false },
            user: { id: 5 },
        };
        const res = mockRes();

        await toggleAutoSync(req, res);

        expect(updateMock).toHaveBeenCalledWith({ autoSyncEnabled: false });
        expect(res.status).toHaveBeenCalledWith(200);
        expect(res.json).toHaveBeenCalledWith({
            errors: [],
            data: { autoSyncEnabled: false },
        });
    });

    test('returns 404 for non-existent experience', async () => {
        Experience.findByPk.mockResolvedValue(null);

        const req = {
            params: { experienceId: '999' },
            body: { enabled: false },
            user: { id: 5 },
        };
        const res = mockRes();

        await toggleAutoSync(req, res);

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
            body: { enabled: false },
            user: { id: 5 },
        };
        const res = mockRes();

        await toggleAutoSync(req, res);

        expect(res.status).toHaveBeenCalledWith(403);
    });
});

describe('toggleSessionSyncLock controller', () => {
    let toggleSessionSyncLock;

    beforeAll(async () => {
        const mod = await import('../../server/controllers/ExperienceManage.controller.js');
        toggleSessionSyncLock = mod.toggleSessionSyncLock;
    });

    const mockRes = () => {
        const res = {};
        res.status = jest.fn().mockReturnValue(res);
        res.json = jest.fn().mockReturnValue(res);
        return res;
    };

    test('updates syncLocked on the session', async () => {
        const updateMock = jest.fn();
        ScheduledExperience.findByPk.mockResolvedValue({
            id: 5,
            ExperienceId: 1,
            update: updateMock,
        });
        Experience.findByPk.mockResolvedValue({
            id: 1,
            OrganizationId: 10,
        });
        modelRegistry.sequelize.models.OrganizationMembers.findOne.mockResolvedValue({ id: 1, isAdmin: true });

        const req = {
            params: { sessionId: '5' },
            body: { locked: true },
            user: { id: 5 },
        };
        const res = mockRes();

        await toggleSessionSyncLock(req, res);

        expect(updateMock).toHaveBeenCalledWith({ syncLocked: true });
        expect(res.status).toHaveBeenCalledWith(200);
        expect(res.json).toHaveBeenCalledWith({
            errors: [],
            data: { syncLocked: true },
        });
    });

    test('returns 404 for non-existent session', async () => {
        ScheduledExperience.findByPk.mockResolvedValue(null);

        const req = {
            params: { sessionId: '999' },
            body: { locked: true },
            user: { id: 5 },
        };
        const res = mockRes();

        await toggleSessionSyncLock(req, res);

        expect(res.status).toHaveBeenCalledWith(404);
    });

    test('returns 403 when user is not org admin', async () => {
        ScheduledExperience.findByPk.mockResolvedValue({
            id: 5,
            ExperienceId: 1,
        });
        Experience.findByPk.mockResolvedValue({
            id: 1,
            OrganizationId: 10,
        });
        modelRegistry.sequelize.models.OrganizationMembers.findOne.mockResolvedValue(null);

        const req = {
            params: { sessionId: '5' },
            body: { locked: true },
            user: { id: 5 },
        };
        const res = mockRes();

        await toggleSessionSyncLock(req, res);

        expect(res.status).toHaveBeenCalledWith(403);
    });
});
