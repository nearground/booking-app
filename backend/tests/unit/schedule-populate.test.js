/**
 * Unit tests for Task 007 — Schedule Update Bounds (populateScheduleBounded)
 *
 * Tests:
 * 1. populateScheduleBounded generates sessions for a bounded window
 * 2. populateScheduleBounded deduplicates against existing sessions
 * 3. populateScheduleBounded dry-run returns sessions without creating
 * 4. populateScheduleBounded rejects startDate >= endDate
 * 5. populateScheduleBounded rejects window > 730 days
 * 6. populateScheduleBounded rejects invalid templateId
 * 7. previewPopulateSchedule controller returns dry-run results
 * 8. populateSchedule controller creates records
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
        findByPk: jest.fn(),
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
    const Organization = { findByPk: jest.fn() };
    const User = { findByPk: jest.fn() };
    const TicketTier = {};
    const OrganizationMembers = { findOne: jest.fn() };

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
                transaction: jest.fn().mockResolvedValue({ commit: jest.fn(), rollback: jest.fn() }),
                models: { OrganizationMembers, ScheduleTemplate, PickedOccurrence },
            },
        },
    };
});

jest.mock('../../server/utils/cache.js', () => ({
    __esModule: true,
    default: { get: jest.fn(), set: jest.fn(), del: jest.fn(), delByPrefix: jest.fn() },
}));

jest.mock('../../server/utils/http-response.js', () => ({
    __esModule: true,
    sendError: jest.fn((res, { status, message }) => {
        res.status(status).json({ errors: [message], data: {} });
    }),
}));

import modelRegistry from '../../server/models/index.js';
const { ScheduledExperience, ScheduleTemplate, Experience } = modelRegistry;

beforeEach(() => {
    jest.clearAllMocks();
    ScheduledExperience.findAll.mockResolvedValue([]);
    ScheduledExperience.bulkCreate.mockImplementation((rows) =>
        rows.map((r, i) => ({ id: i + 1, ...r }))
    );
});

const makeTemplate = (overrides = {}) => ({
    id: 1,
    ExperienceId: 1,
    ruleType: 'cron',
    ruleCron: '0 9 * * 1', // every Monday 9am
    timezone: 'UTC',
    active: true,
    startDate: null,
    endDate: null,
    maxOccurrences: null,
    durationMinutes: 60,
    capacity: 20,
    ...overrides,
});

describe('populateScheduleBounded', () => {
    let populateScheduleBounded;

    beforeAll(async () => {
        const mod = await import('../../server/services/Scheduler.service.js');
        populateScheduleBounded = mod.populateScheduleBounded;
    });

    test('generates sessions for a bounded window', async () => {
        ScheduleTemplate.findByPk.mockResolvedValue(makeTemplate());
        Experience.findByPk.mockResolvedValue({ id: 1, duration: 60, capacity: 10, LocationId: 1 });

        const now = new Date();
        const start = now.toISOString();
        const end = new Date(now.getTime() + 30 * 24 * 60 * 60 * 1000).toISOString();

        const result = await populateScheduleBounded({
            experienceId: 1,
            templateId: 1,
            startDate: start,
            endDate: end,
        });

        expect(result.created).toBeGreaterThan(0);
        expect(ScheduledExperience.bulkCreate).toHaveBeenCalled();
    });

    test('deduplicates against existing sessions', async () => {
        ScheduleTemplate.findByPk.mockResolvedValue(makeTemplate());
        Experience.findByPk.mockResolvedValue({ id: 1, duration: 60, capacity: 10, LocationId: 1 });

        const now = new Date();
        const start = now.toISOString();
        const end = new Date(now.getTime() + 14 * 24 * 60 * 60 * 1000).toISOString();

        // First call: no existing sessions
        ScheduledExperience.findAll.mockResolvedValue([]);
        const result1 = await populateScheduleBounded({
            experienceId: 1,
            templateId: 1,
            startDate: start,
            endDate: end,
        });

        // Second call: mock existing sessions as same dates
        const existingDates = ScheduledExperience.bulkCreate.mock.calls[0][0].map(r => ({
            id: r.ExperienceId,
            dateTime: r.dateTime,
        }));
        ScheduledExperience.findAll.mockResolvedValue(existingDates);

        const result2 = await populateScheduleBounded({
            experienceId: 1,
            templateId: 1,
            startDate: start,
            endDate: end,
        });

        expect(result2.created).toBe(0);
        expect(result2.skipped).toBe(existingDates.length);
    });

    test('dry-run returns sessions without creating', async () => {
        ScheduleTemplate.findByPk.mockResolvedValue(makeTemplate());
        Experience.findByPk.mockResolvedValue({ id: 1, duration: 60, capacity: 10, LocationId: 1 });

        const now = new Date();
        const start = now.toISOString();
        const end = new Date(now.getTime() + 30 * 24 * 60 * 60 * 1000).toISOString();

        // Reset bulkCreate call count
        ScheduledExperience.bulkCreate.mockClear();

        const result = await populateScheduleBounded({
            experienceId: 1,
            templateId: 1,
            startDate: start,
            endDate: end,
            dryRun: true,
        });

        expect(result.created).toBeGreaterThan(0);
        expect(result.sessions.length).toBeGreaterThan(0);
        expect(ScheduledExperience.bulkCreate).not.toHaveBeenCalled();
    });

    test('rejects startDate >= endDate', async () => {
        ScheduleTemplate.findByPk.mockResolvedValue(makeTemplate());

        const now = new Date();
        await expect(
            populateScheduleBounded({
                experienceId: 1,
                templateId: 1,
                startDate: now.toISOString(),
                endDate: now.toISOString(),
            })
        ).rejects.toEqual(expect.objectContaining({
            status: 400,
            errors: ['startDate must be before endDate'],
        }));
    });

    test('rejects window > 730 days', async () => {
        ScheduleTemplate.findByPk.mockResolvedValue(makeTemplate());

        const now = new Date();
        const far = new Date(now.getTime() + 731 * 24 * 60 * 60 * 1000);

        await expect(
            populateScheduleBounded({
                experienceId: 1,
                templateId: 1,
                startDate: now.toISOString(),
                endDate: far.toISOString(),
            })
        ).rejects.toEqual(expect.objectContaining({
            status: 400,
            errors: ['Population window cannot exceed 730 days'],
        }));
    });

    test('rejects invalid templateId', async () => {
        ScheduleTemplate.findByPk.mockResolvedValue(null);

        await expect(
            populateScheduleBounded({
                experienceId: 1,
                templateId: 999,
                startDate: new Date().toISOString(),
                endDate: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString(),
            })
        ).rejects.toEqual(expect.objectContaining({ status: 400 }));
    });
});

describe('previewPopulateSchedule controller', () => {
    let previewPopulateSchedule;

    beforeAll(async () => {
        jest.mock('../../server/services/Scheduler.service.js', () => ({
            __esModule: true,
            syncExperienceSchedule: jest.fn().mockResolvedValue([]),
            populateScheduleBounded: jest.fn().mockResolvedValue({ created: 4, skipped: 1, sessions: [] }),
        }));
        jest.mock('../../server/controllers/offering-manage.shared.js', () => ({
            __esModule: true,
            normalizeBaseCreatePayload: jest.fn(),
            normalizeBaseUpdatePayload: jest.fn(),
            createAssignOrganizersHandler: jest.fn().mockReturnValue(jest.fn()),
            createSyncManagedScheduleHandler: jest.fn().mockReturnValue(jest.fn()),
            normalizeSchedules: jest.fn(),
        }));
        const mod = await import('../../server/controllers/ExperienceManage.controller.js');
        previewPopulateSchedule = mod.previewPopulateSchedule;
    });

    const mockRes = () => {
        const res = {};
        res.status = jest.fn().mockReturnValue(res);
        res.json = jest.fn().mockReturnValue(res);
        return res;
    };

    test('returns dry-run results', async () => {
        const req = {
            params: { experienceId: '1' },
            body: { templateId: 1, startDate: '2026-05-01', endDate: '2026-06-01' },
            user: { id: 5 },
        };
        const res = mockRes();

        await previewPopulateSchedule(req, res);

        expect(res.status).toHaveBeenCalledWith(200);
        expect(res.json).toHaveBeenCalledWith(
            expect.objectContaining({
                data: expect.objectContaining({ created: 4, skipped: 1 }),
            })
        );
    });
});

describe('populateSchedule controller', () => {
    let populateSchedule;

    beforeAll(async () => {
        const mod = await import('../../server/controllers/ExperienceManage.controller.js');
        populateSchedule = mod.populateSchedule;
    });

    const mockRes = () => {
        const res = {};
        res.status = jest.fn().mockReturnValue(res);
        res.json = jest.fn().mockReturnValue(res);
        return res;
    };

    test('calls populateScheduleBounded and returns results', async () => {
        const req = {
            params: { experienceId: '1' },
            body: { templateId: 1, startDate: '2026-05-01', endDate: '2026-06-01' },
            user: { id: 5 },
        };
        const res = mockRes();

        await populateSchedule(req, res);

        expect(res.status).toHaveBeenCalledWith(200);
    });
});
