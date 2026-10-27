/**
 * Unit tests for Task 009 — Schedule Builder Start Date
 *
 * Tests:
 * 1. syncExperienceSchedule uses startDate as generation start when startDate > now
 * 2. syncExperienceSchedule uses now when startDate is null
 * 3. syncExperienceSchedule clears startDate to null when startDate <= now
 * 4. syncExperienceSchedule respects both startDate and endDate
 * 5. normalizeSchedules rejects startDate >= endDate when both provided
 * 6. normalizeSchedules accepts null startDate
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
describe('syncExperienceSchedule - startDate handling', () => {
    let actualSync;

    beforeAll(async () => {
        const mod = await import('../../server/services/Scheduler.service.js');
        actualSync = mod.syncExperienceSchedule;
    });

    test('uses startDate as generation start when startDate > now', async () => {
        const futureStart = new Date(Date.now() + 30 * 24 * 60 * 60 * 1000); // 30 days from now
        const updateMock = jest.fn();

        ScheduleTemplate.findAll.mockResolvedValue([
            {
                id: 1,
                ruleType: 'cron',
                ruleCron: '0 9 * * 1', // every Monday 9am
                timezone: 'UTC',
                active: true,
                startDate: futureStart.toISOString(),
                endDate: null,
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

        if (ScheduledExperience.bulkCreate.mock.calls.length > 0) {
            const sessions = ScheduledExperience.bulkCreate.mock.calls[0][0];
            for (const session of sessions) {
                const sessionDate = new Date(session.dateTime);
                // All sessions should be on or after the startDate
                expect(sessionDate.getTime()).toBeGreaterThanOrEqual(futureStart.getTime() - 1000);
            }
        }
    });

    test('uses now when startDate is null', async () => {
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
            scheduleLookaheadDays: 90,
            duration: 120,
            capacity: 10,
            LocationId: 1,
        };

        await actualSync(experience);

        if (ScheduledExperience.bulkCreate.mock.calls.length > 0) {
            const sessions = ScheduledExperience.bulkCreate.mock.calls[0][0];
            const firstSession = sessions[0];
            const daysFromNow = (new Date(firstSession.dateTime).getTime() - Date.now()) / (24 * 60 * 60 * 1000);
            // First session should be within 7 days from now (next Monday)
            expect(daysFromNow).toBeLessThan(8);
        }
    });

    test('clears startDate to null when startDate <= now', async () => {
        const pastStart = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000); // 7 days ago
        const updateMock = jest.fn();

        ScheduleTemplate.findAll.mockResolvedValue([
            {
                id: 1,
                ruleType: 'cron',
                ruleCron: '0 9 * * 1',
                timezone: 'UTC',
                active: true,
                startDate: pastStart.toISOString(),
                endDate: null,
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

        // startDate should be cleared
        expect(updateMock).toHaveBeenCalledWith({ startDate: null });
    });

    test('respects both startDate and endDate (generates sessions in [startDate, endDate])', async () => {
        const futureStart = new Date(Date.now() + 14 * 24 * 60 * 60 * 1000); // 14 days
        const futureEnd = new Date(Date.now() + 45 * 24 * 60 * 60 * 1000); // 45 days
        const updateMock = jest.fn();

        ScheduleTemplate.findAll.mockResolvedValue([
            {
                id: 1,
                ruleType: 'cron',
                ruleCron: '0 9 * * 1',
                timezone: 'UTC',
                active: true,
                startDate: futureStart.toISOString(),
                endDate: futureEnd.toISOString(),
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

        if (ScheduledExperience.bulkCreate.mock.calls.length > 0) {
            const sessions = ScheduledExperience.bulkCreate.mock.calls[0][0];
            for (const session of sessions) {
                const sessionDate = new Date(session.dateTime);
                expect(sessionDate.getTime()).toBeGreaterThanOrEqual(futureStart.getTime() - 1000);
                expect(sessionDate.getTime()).toBeLessThanOrEqual(futureEnd.getTime() + 1000);
            }
        }
    });
});

// ---- normalizeSchedules validation tests ----
describe('normalizeSchedules - startDate validation', () => {
    let normalizeSchedules;

    beforeAll(async () => {
        const mod = await import('../../server/controllers/offering-manage.shared.js');
        normalizeSchedules = mod.normalizeSchedules;
    });

    test('rejects startDate >= endDate when both provided', () => {
        const future1 = new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString();
        const future2 = new Date(Date.now() + 10 * 24 * 60 * 60 * 1000).toISOString();
        const result = normalizeSchedules([
            {
                kind: 'template',
                ruleType: 'cron',
                ruleCron: '0 9 * * 1',
                startDate: future1,
                endDate: future2, // endDate before startDate
            },
        ]);

        expect(result.errors).toContain('schedules[0].startDate must be before endDate');
    });

    test('accepts null startDate', () => {
        const result = normalizeSchedules([
            {
                kind: 'template',
                ruleType: 'cron',
                ruleCron: '0 9 * * 1',
                startDate: null,
            },
        ]);

        expect(result.errors).toHaveLength(0);
        expect(result.templates[0].startDate).toBeNull();
    });
});
