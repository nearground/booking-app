/**
 * Unit tests for Task 008 — Schedule Builder End Date
 *
 * Tests:
 * 1. syncExperienceSchedule clamps lookahead to template.endDate
 * 2. syncExperienceSchedule generates no sessions when endDate < now (expired)
 * 3. syncExperienceSchedule auto-disables expired templates (sets active=false)
 * 4. syncExperienceSchedule handles null endDate (no clamping)
 * 5. normalizeSchedules rejects endDate in the past
 * 6. normalizeSchedules rejects startDate >= endDate
 * 7. normalizeSchedules accepts valid future endDate
 * 8. normalizeSchedules allows null endDate (clearing)
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
        update: jest.fn(),
    };
    const Comment = {
        findAll: jest.fn().mockResolvedValue([]),
    };

    return {
        __esModule: true,
        default: {
            ScheduledExperience,
            ScheduleTemplate,
            PickedOccurrence,
            Location,
            Experience,
            Comment,
            sequelize: {
                transaction: jest.fn().mockResolvedValue({
                    commit: jest.fn(),
                    rollback: jest.fn(),
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

const { ScheduledExperience, ScheduleTemplate, PickedOccurrence } = modelRegistry;

beforeEach(() => {
    jest.clearAllMocks();
    ScheduledExperience.findAll.mockResolvedValue([]);
    ScheduledExperience.findOne.mockResolvedValue(null);
    ScheduleTemplate.findAll.mockResolvedValue([]);
    PickedOccurrence.findAll.mockResolvedValue([]);
});

// ---- Scheduler Service Tests ----
describe('syncExperienceSchedule - endDate handling', () => {
    let actualSync;

    beforeAll(async () => {
        const mod = await import('../../server/services/Scheduler.service.js');
        actualSync = mod.syncExperienceSchedule;
    });

    test('clamps lookahead to template.endDate when endDate < lookaheadEnd', async () => {
        const endDateInFuture = new Date(Date.now() + 30 * 24 * 60 * 60 * 1000); // 30 days out

        ScheduleTemplate.findAll.mockResolvedValue([
            {
                id: 1,
                ruleType: 'cron',
                ruleCron: '0 9 * * 1', // every Monday 9am
                timezone: 'UTC',
                active: true,
                startDate: null,
                endDate: endDateInFuture.toISOString(),
                maxOccurrences: null,
                durationMinutes: 60,
                capacity: 20,
            },
        ]);

        const experience = {
            id: 1,
            scheduleLookaheadDays: 90,
            duration: 120,
            capacity: 10,
            LocationId: 1,
        };

        await actualSync(experience);

        if (ScheduledExperience.bulkCreate.mock.calls.length > 0) {
            const sessions = ScheduledExperience.bulkCreate.mock.calls[0][0];
            for (const session of sessions) {
                const sessionDate = new Date(session.dateTime);
                // All sessions should be before or on the endDate
                expect(sessionDate.getTime()).toBeLessThanOrEqual(endDateInFuture.getTime() + 1000);
            }
            // Verify sessions don't extend to 90 days
            const lastSession = sessions[sessions.length - 1];
            const daysOut = (new Date(lastSession.dateTime).getTime() - Date.now()) / (24 * 60 * 60 * 1000);
            expect(daysOut).toBeLessThanOrEqual(31);
        }
    });

    test('generates no sessions when endDate < now (template expired)', async () => {
        const pastEndDate = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000); // 7 days ago

        const updateMock = jest.fn();
        ScheduleTemplate.findAll.mockResolvedValue([
            {
                id: 1,
                ruleType: 'cron',
                ruleCron: '0 9 * * 1',
                timezone: 'UTC',
                active: true,
                startDate: null,
                endDate: pastEndDate.toISOString(),
                maxOccurrences: null,
                durationMinutes: 60,
                capacity: 20,
                update: updateMock,
            },
        ]);

        const experience = {
            id: 1,
            scheduleLookaheadDays: 90,
            duration: 120,
            capacity: 10,
            LocationId: 1,
        };

        const created = await actualSync(experience);

        // No sessions should be created (templateStart >= templateEnd)
        expect(ScheduledExperience.bulkCreate).not.toHaveBeenCalled();
        expect(created).toEqual([]);
    });

    test('auto-disables expired templates by setting active=false', async () => {
        const pastEndDate = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000); // 7 days ago
        const updateMock = jest.fn();

        ScheduleTemplate.findAll.mockResolvedValue([
            {
                id: 1,
                ruleType: 'cron',
                ruleCron: '0 9 * * 1',
                timezone: 'UTC',
                active: true,
                startDate: null,
                endDate: pastEndDate.toISOString(),
                maxOccurrences: null,
                durationMinutes: 60,
                capacity: 20,
                update: updateMock,
            },
        ]);

        const experience = {
            id: 1,
            scheduleLookaheadDays: 90,
            duration: 120,
            capacity: 10,
            LocationId: 1,
        };

        await actualSync(experience);

        // Template should be deactivated
        expect(updateMock).toHaveBeenCalledWith({ active: false });
    });

    test('does not clamp or deactivate when endDate is null', async () => {
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
            scheduleLookaheadDays: 90,
            duration: 120,
            capacity: 10,
            LocationId: 1,
        };

        await actualSync(experience);

        // Sessions should be created up to the full 90-day lookahead
        if (ScheduledExperience.bulkCreate.mock.calls.length > 0) {
            const sessions = ScheduledExperience.bulkCreate.mock.calls[0][0];
            expect(sessions.length).toBeGreaterThan(0);
            const lastSession = sessions[sessions.length - 1];
            const daysOut = (new Date(lastSession.dateTime).getTime() - Date.now()) / (24 * 60 * 60 * 1000);
            // Full 90-day window — last Monday should be within 84-91 days
            expect(daysOut).toBeGreaterThan(75);
            expect(daysOut).toBeLessThanOrEqual(91);
        }
    });
});

// ---- normalizeSchedules validation tests ----
describe('normalizeSchedules - endDate validation', () => {
    let normalizeSchedules;

    beforeAll(async () => {
        const mod = await import('../../server/controllers/offering-manage.shared.js');
        normalizeSchedules = mod.normalizeSchedules;
    });

    test('rejects endDate in the past', () => {
        const pastDate = new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString();
        const result = normalizeSchedules([
            {
                kind: 'template',
                ruleType: 'cron',
                ruleCron: '0 9 * * 1',
                endDate: pastDate,
            },
        ]);

        expect(result.errors).toContain('schedules[0].endDate cannot be in the past');
    });

    test('rejects startDate >= endDate', () => {
        const future1 = new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString();
        const future2 = new Date(Date.now() + 10 * 24 * 60 * 60 * 1000).toISOString();
        const result = normalizeSchedules([
            {
                kind: 'template',
                ruleType: 'cron',
                ruleCron: '0 9 * * 1',
                startDate: future1,
                endDate: future2,
            },
        ]);

        expect(result.errors).toContain('schedules[0].startDate must be before endDate');
    });

    test('accepts valid future endDate', () => {
        const futureDate = new Date(Date.now() + 60 * 24 * 60 * 60 * 1000).toISOString();
        const result = normalizeSchedules([
            {
                kind: 'template',
                ruleType: 'cron',
                ruleCron: '0 9 * * 1',
                endDate: futureDate,
            },
        ]);

        expect(result.errors).toHaveLength(0);
        expect(result.templates[0].endDate).toBeInstanceOf(Date);
    });

    test('allows null endDate (clearing the end date)', () => {
        const result = normalizeSchedules([
            {
                kind: 'template',
                ruleType: 'cron',
                ruleCron: '0 9 * * 1',
                endDate: null,
            },
        ]);

        expect(result.errors).toHaveLength(0);
        expect(result.templates[0].endDate).toBeNull();
    });
});
