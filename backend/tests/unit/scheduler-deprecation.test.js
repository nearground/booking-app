/**
 * Unit tests for Scheduler.service.js - task 006 deprecation of Experience.scheduling
 *
 * Verifies that syncExperienceSchedule reads from ScheduleTemplate records
 * (and PickedOccurrences) instead of accessing the deprecated Experience.scheduling field.
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

    return {
        __esModule: true,
        default: {
            ScheduledExperience,
            ScheduleTemplate,
            PickedOccurrence,
            Location,
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

import { syncExperienceSchedule } from '../../server/services/Scheduler.service.js';
import modelRegistry from '../../server/models/index.js';

const { ScheduledExperience, ScheduleTemplate, PickedOccurrence } = modelRegistry;

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

describe('syncExperienceSchedule - deprecated scheduling field', () => {
    test('does NOT read from experience.scheduling even when it is set', async () => {
        const experience = {
            id: 1,
            scheduling: '0 6 * * *',
            duration: 120,
            capacity: 10,
            LocationId: 1,
        };

        const result = await syncExperienceSchedule(experience);

        expect(result).toEqual([]);
        expect(ScheduleTemplate.findAll).toHaveBeenCalledWith({
            where: { ExperienceId: 1, active: true },
        });
        expect(PickedOccurrence.findAll).toHaveBeenCalledWith({
            where: { ExperienceId: 1, status: 'active' },
        });
    });

    test('syncs from ScheduleTemplate cron rules', async () => {
        ScheduleTemplate.findAll.mockResolvedValue([
            {
                id: 10,
                ExperienceId: 1,
                ruleType: 'cron',
                ruleCron: '0 6 * * *',
                timezone: 'America/Mexico_City',
                durationMinutes: 120,
                capacity: 10,
                startDate: null,
                endDate: null,
                maxOccurrences: null,
                active: true,
            },
        ]);

        const experience = {
            id: 1,
            scheduling: null,
            duration: 120,
            capacity: 10,
            LocationId: 1,
        };

        const result = await syncExperienceSchedule(experience);

        expect(ScheduledExperience.bulkCreate).toHaveBeenCalled();
        const createdRows = ScheduledExperience.bulkCreate.mock.calls[0][0];
        expect(createdRows.length).toBeGreaterThan(0);
        expect(createdRows[0].ScheduleTemplateId).toBe(10);
        expect(createdRows[0].ExperienceId).toBe(1);
    });

    test('skips inactive templates', async () => {
        ScheduleTemplate.findAll.mockResolvedValue([]);

        const experience = { id: 1, scheduling: null, duration: 60, capacity: 5, LocationId: 1 };

        await syncExperienceSchedule(experience);

        expect(ScheduleTemplate.findAll).toHaveBeenCalledWith(
            expect.objectContaining({
                where: expect.objectContaining({ active: true }),
            })
        );
    });

    test('skips templates without cron rule', async () => {
        ScheduleTemplate.findAll.mockResolvedValue([
            {
                id: 20,
                ExperienceId: 1,
                ruleType: 'datetime',
                ruleCron: null,
                timezone: 'UTC',
                durationMinutes: 60,
                capacity: 5,
                active: true,
            },
        ]);

        const experience = { id: 1, scheduling: null, duration: 60, capacity: 5, LocationId: 1 };

        await syncExperienceSchedule(experience);

        expect(ScheduledExperience.bulkCreate).not.toHaveBeenCalled();
    });

    test('syncs from PickedOccurrences', async () => {
        const futureDate = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000);

        PickedOccurrence.findAll.mockResolvedValue([
            {
                id: 50,
                ExperienceId: 1,
                dateTime: futureDate,
                endDateTime: new Date(futureDate.getTime() + 120 * 60000),
                capacity: 10,
                status: 'active',
            },
        ]);

        const experience = { id: 1, scheduling: null, duration: 120, capacity: 10, LocationId: 1 };

        await syncExperienceSchedule(experience);

        expect(ScheduledExperience.create).toHaveBeenCalledWith(
            expect.objectContaining({
                ExperienceId: 1,
                PickedOccurrenceId: 50,
            })
        );
    });

    test('returns empty array when experience is null', async () => {
        const result = await syncExperienceSchedule(null);
        expect(result).toEqual([]);
    });

    test('does not create duplicate scheduled rows for existing expansions', async () => {
        const futureDate = new Date();
        futureDate.setDate(futureDate.getDate() + 1);
        futureDate.setHours(6, 0, 0, 0);

        ScheduleTemplate.findAll.mockResolvedValue([
            {
                id: 10,
                ExperienceId: 1,
                ruleType: 'cron',
                ruleCron: '0 6 * * *',
                timezone: 'UTC',
                durationMinutes: 60,
                capacity: 5,
                startDate: null,
                endDate: null,
                maxOccurrences: 3,
                active: true,
            },
        ]);

        ScheduledExperience.findAll.mockResolvedValue([
            { id: 1, dateTime: futureDate },
        ]);

        const experience = { id: 1, scheduling: null, duration: 60, capacity: 5, LocationId: 1 };

        await syncExperienceSchedule(experience);

        if (ScheduledExperience.bulkCreate.mock.calls.length > 0) {
            const created = ScheduledExperience.bulkCreate.mock.calls[0][0];
            const existingTs = futureDate.getTime();
            const duplicates = created.filter((r) => new Date(r.dateTime).getTime() === existingTs);
            expect(duplicates).toHaveLength(0);
        }
    });
});