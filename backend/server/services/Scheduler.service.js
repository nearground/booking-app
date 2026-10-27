import { createRequire } from 'node:module';
import modelRegistry from '../models/index.js';
import { DEFAULT_TIMEZONE, normalizeTimezone } from '../utils/timezone.js';
import cache from '../utils/cache.js';

const require = createRequire(import.meta.url);


const { CronExpressionParser } = require('cron-parser');
const { Op } = require('sequelize');

const parseOptionalNumber = (value) => {
    if (value === null || value === undefined || value === '') {
        return null;
    }

    const parsed = Number(value);
    return Number.isFinite(parsed) ? parsed : null;
};

const resolveExperienceTimezone = async (experience) => {
    const explicitTimezone = normalizeTimezone(
        experience?.scheduleTimezone || experience?.timezone || experience?.Location?.timezone,
        DEFAULT_TIMEZONE
    );

    if (explicitTimezone !== DEFAULT_TIMEZONE || experience?.Location?.timezone) {
        return explicitTimezone;
    }

    if (!Number.isInteger(Number(experience?.LocationId))) {
        return DEFAULT_TIMEZONE;
    }

    const { Location } = modelRegistry;
    const location = await Location.findByPk(experience.LocationId, {
        attributes: ['id', 'timezone'],
    });

    return normalizeTimezone(location?.timezone, DEFAULT_TIMEZONE);
};

const resolveServiceTimezone = async (service) => {
    const explicitTimezone = normalizeTimezone(
        service?.scheduleTimezone || service?.timezone || service?.Location?.timezone,
        DEFAULT_TIMEZONE
    );

    if (explicitTimezone !== DEFAULT_TIMEZONE || service?.Location?.timezone) {
        return explicitTimezone;
    }

    if (!Number.isInteger(Number(service?.LocationId))) {
        return DEFAULT_TIMEZONE;
    }

    const { Location } = modelRegistry;
    const location = await Location.findByPk(service.LocationId, {
        attributes: ['id', 'timezone'],
    });

    return normalizeTimezone(location?.timezone, DEFAULT_TIMEZONE);
};

const syncScheduleByCron = async ({
    sourceEntity,
    sourceType,
    resolveTimezone,
    scheduledModelName,
    foreignKey,
}) => {
    const ScheduledModel = modelRegistry[scheduledModelName];

    const daysToSync = 90;

    try {
        if (!sourceEntity || !sourceEntity.scheduling) return [];
        const timezone = await resolveTimezone(sourceEntity);

        const options = {
            currentDate: new Date(),
            endDate: new Date(Date.now() + daysToSync * 24 * 60 * 60 * 1000),
            iterator: true,
            tz: timezone,
        };

        const interval = CronExpressionParser.parse(sourceEntity.scheduling, options);
        const createdRows = [];

        // Collect all occurrence dates first
        const occurrences = [];
        for (const item of interval) {
            occurrences.push(item.toDate());
        }

        if (occurrences.length === 0) return createdRows;

        // Fetch any existing scheduled rows for these dates in one query
        const existingRows = await ScheduledModel.findAll({
            where: {
                [foreignKey]: sourceEntity.id,
                dateTime: occurrences,
            },
            attributes: ['id', 'dateTime'],
        });

        const existingTimestamps = new Set(
            existingRows.map((r) => new Date(r.dateTime).getTime())
        );

        // Prepare bulk insert for missing occurrences
        const toCreate = occurrences.reduce((acc, date) => {
            const ts = date.getTime();
            if (!existingTimestamps.has(ts)) {
                const durationInMinutes = parseOptionalNumber(sourceEntity.duration);
                const endDate = durationInMinutes !== null
                    ? new Date(date.getTime() + durationInMinutes * 60000)
                    : null;
                const experienceCapacity = parseOptionalNumber(sourceEntity.capacity);
                acc.push({
                    [foreignKey]: sourceEntity.id,
                    dateTime: date,
                    endDateTime: endDate,
                    capacity: experienceCapacity,
                    availableSpots: experienceCapacity,
                    status: 'scheduled',
                });
            }
            return acc;
        }, []);

        if (toCreate.length > 0) {
            const created = await ScheduledModel.bulkCreate(toCreate);
            createdRows.push(...created);
        }

        return createdRows;
    } catch (err) {
        // eslint-disable-next-line no-console
        console.error(`Error syncing schedule for ${sourceType} ${sourceEntity ? sourceEntity.id : 'unknown'}:`, err);
        return [];
    }
};

const syncExperienceSchedule = async (experience) => {
    if (!experience || !experience.id) return [];

    // Skip sync when auto-sync is explicitly disabled
    if (experience.autoSyncEnabled === false) return [];

    const {
        ScheduledExperience,
        ScheduleTemplate,
        PickedOccurrence,
    } = modelRegistry;

    const daysToSync = (experience.scheduleLookaheadDays && Number.isFinite(Number(experience.scheduleLookaheadDays)))
        ? Math.max(1, Math.min(730, Number(experience.scheduleLookaheadDays)))
        : 90;
    const now = new Date();
    const endDate = new Date(now.getTime() + daysToSync * 24 * 60 * 60 * 1000);
    const allCreated = [];

    // 1. Sync from ScheduleTemplates (primary scheduling path)
    try {
        const templates = await ScheduleTemplate.findAll({
            where: { ExperienceId: experience.id, active: true },
        });

        for (const template of templates) {
            if (template.ruleType !== 'cron' || !template.ruleCron) continue;

            const tz = normalizeTimezone(template.timezone, DEFAULT_TIMEZONE);
            const fallbackTimezone = await resolveExperienceTimezone(experience);
            const timezone = tz || fallbackTimezone;

            const templateStart = template.startDate ? new Date(Math.max(now.getTime(), new Date(template.startDate).getTime())) : now;
            const templateEnd = template.endDate ? new Date(Math.min(endDate.getTime(), new Date(template.endDate).getTime())) : endDate;

            if (templateStart >= templateEnd) continue;

            let occurrences = [];
            try {
                const interval = CronExpressionParser.parse(template.ruleCron, {
                    currentDate: templateStart,
                    endDate: templateEnd,
                    iterator: true,
                    tz: timezone,
                });
                for (const item of interval) {
                    if (template.maxOccurrences && occurrences.length >= template.maxOccurrences) break;
                    occurrences.push(item.toDate());
                }
            } catch (parseErr) {
                // eslint-disable-next-line no-console
                console.error(`Error parsing cron for ScheduleTemplate ${template.id}:`, parseErr);
                continue;
            }

            if (occurrences.length === 0) continue;

            // Fetch existing ScheduledExperiences linked to this template
            const existingRows = await ScheduledExperience.findAll({
                where: { ExperienceId: experience.id, ScheduleTemplateId: template.id, dateTime: occurrences },
                attributes: ['id', 'dateTime'],
            });
            const existingTimestamps = new Set(existingRows.map((r) => new Date(r.dateTime).getTime()));

            const durationInMinutes = parseOptionalNumber(template.durationMinutes) ?? parseOptionalNumber(experience.duration);
            const capacity = parseOptionalNumber(template.capacity) ?? parseOptionalNumber(experience.capacity) ?? 0;

            const toCreate = occurrences
                .filter((date) => !existingTimestamps.has(date.getTime()))
                .map((date) => ({
                    ExperienceId: experience.id,
                    ScheduleTemplateId: template.id,
                    dateTime: date,
                    endDateTime: durationInMinutes !== null ? new Date(date.getTime() + durationInMinutes * 60000) : null,
                    capacity,
                    availableSpots: capacity,
                    status: 'scheduled',
                }));

            if (toCreate.length > 0) {
                const created = await ScheduledExperience.bulkCreate(toCreate);
                allCreated.push(...created);
            }
        }

        // Auto-disable expired templates (endDate has passed)
        const expiredTemplates = templates.filter(
            (t) => t.endDate && new Date(t.endDate) < now && t.active
        );
        for (const expired of expiredTemplates) {
            try {
                await expired.update({ active: false });
            } catch (deactivateErr) {
                // eslint-disable-next-line no-console
                console.error(`Error deactivating expired template ${expired.id}:`, deactivateErr);
            }
        }

        // Auto-clear startDate when it has been reached
        const startedTemplates = templates.filter(
            (t) => t.startDate && new Date(t.startDate) <= now
        );
        for (const started of startedTemplates) {
            try {
                await started.update({ startDate: null });
            } catch (clearErr) {
                // eslint-disable-next-line no-console
                console.error(`Error clearing startDate on template ${started.id}:`, clearErr);
            }
        }
    } catch (err) {
        // eslint-disable-next-line no-console
        console.error(`Error syncing ScheduleTemplates for experience ${experience.id}:`, err);
    }

    // 2. Sync from PickedOccurrences (manually picked dates)
    try {
        const picks = await PickedOccurrence.findAll({
            where: { ExperienceId: experience.id, status: 'active' },
        });

        for (const pick of picks) {
            const pickDate = new Date(pick.dateTime);
            if (pickDate <= now) continue;

            const existing = await ScheduledExperience.findOne({
                where: { ExperienceId: experience.id, PickedOccurrenceId: pick.id },
                attributes: ['id'],
            });

            if (existing) continue;

            const capacity = parseOptionalNumber(pick.capacity) ?? parseOptionalNumber(experience.capacity) ?? 0;

            const endDateTime = pick.endDateTime
                ? new Date(pick.endDateTime)
                : parseOptionalNumber(experience.duration) !== null
                    ? new Date(pickDate.getTime() + parseOptionalNumber(experience.duration) * 60000)
                    : null;

            const created = await ScheduledExperience.create({
                ExperienceId: experience.id,
                PickedOccurrenceId: pick.id,
                dateTime: pickDate,
                endDateTime,
                capacity,
                availableSpots: capacity,
                status: 'scheduled',
            });
            allCreated.push(created);
        }
    } catch (err) {
        // eslint-disable-next-line no-console
        console.error(`Error syncing PickedOccurrences for experience ${experience.id}:`, err);
    }

    return allCreated;
};

const populateScheduleBounded = async ({ experienceId, templateId, startDate, endDate, dryRun = false }) => {
    const { ScheduledExperience, ScheduleTemplate, Experience } = modelRegistry;

    const template = await ScheduleTemplate.findByPk(templateId);
    if (!template || template.ExperienceId !== experienceId) {
        throw { status: 400, errors: ['Template not found or does not belong to this experience'] };
    }

    if (template.ruleType !== 'cron' || !template.ruleCron) {
        throw { status: 400, errors: ['Template does not have a cron rule'] };
    }

    const start = new Date(startDate);
    const end = new Date(endDate);

    if (Number.isNaN(start.getTime()) || Number.isNaN(end.getTime())) {
        throw { status: 400, errors: ['Invalid start or end date'] };
    }

    if (start >= end) {
        throw { status: 400, errors: ['startDate must be before endDate'] };
    }

    const windowDays = (end.getTime() - start.getTime()) / (24 * 60 * 60 * 1000);
    if (windowDays > 730) {
        throw { status: 400, errors: ['Population window cannot exceed 730 days'] };
    }

    const experience = await Experience.findByPk(experienceId);
    const tz = normalizeTimezone(template.timezone, DEFAULT_TIMEZONE);
    const fallbackTimezone = await resolveExperienceTimezone(experience || { LocationId: null });
    const timezone = tz || fallbackTimezone;

    let occurrences = [];
    try {
        const interval = CronExpressionParser.parse(template.ruleCron, {
            currentDate: start,
            endDate: end,
            iterator: true,
            tz: timezone,
        });
        for (const item of interval) {
            if (template.maxOccurrences && occurrences.length >= template.maxOccurrences) break;
            occurrences.push(item.toDate());
        }
    } catch (parseErr) {
        throw { status: 400, errors: ['Failed to parse cron expression: ' + parseErr.message] };
    }

    if (occurrences.length === 0) {
        return { created: 0, skipped: 0, sessions: [] };
    }

    // Dedup against existing
    const existingRows = await ScheduledExperience.findAll({
        where: { ExperienceId: experienceId, ScheduleTemplateId: templateId, dateTime: occurrences },
        attributes: ['id', 'dateTime'],
    });
    const existingTimestamps = new Set(existingRows.map((r) => new Date(r.dateTime).getTime()));

    const durationInMinutes = parseOptionalNumber(template.durationMinutes) ?? parseOptionalNumber(experience?.duration);
    const capacity = parseOptionalNumber(template.capacity) ?? parseOptionalNumber(experience?.capacity) ?? 0;

    const newOccurrences = occurrences.filter((d) => !existingTimestamps.has(d.getTime()));

    const sessions = newOccurrences.map((date) => ({
        ExperienceId: experienceId,
        ScheduleTemplateId: templateId,
        dateTime: date,
        endDateTime: durationInMinutes !== null ? new Date(date.getTime() + durationInMinutes * 60000) : null,
        capacity,
        availableSpots: capacity,
        status: 'scheduled',
    }));

    if (dryRun) {
        return {
            created: sessions.length,
            skipped: existingRows.length,
            sessions: sessions.map((s) => ({ dateTime: s.dateTime, endDateTime: s.endDateTime })),
        };
    }

    if (sessions.length > 0) {
        await ScheduledExperience.bulkCreate(sessions);
    }

    return {
        created: sessions.length,
        skipped: existingRows.length,
        sessions: sessions.map((s) => ({ dateTime: s.dateTime, endDateTime: s.endDateTime })),
    };
};


const syncAggregatedCommentsData = async (exp) => {
    const { Experience, Comment } = modelRegistry;
    try {

            // Get only top-level comments (exclude replies) for this experience
            const comments = await Comment.findAll({
                where: {
                    CommentableId: exp.id,
                    CommentableType: 'Experience',
                    ParentId: null,
                },
                attributes: ['stars'],
            });
            const commentsCount = comments.length;
            const ratings = commentsCount > 0
                ? comments.reduce((sum, c) => sum + (Number(c.stars) || 0), 0) / commentsCount
                : 0;
            await Experience.update(
                { commentsCount, ratings },
                { where: { id: exp.id } }
            );

            // Invalidate related caches so subsequent reads return fresh data
            try {
                await cache.del(`experience:detail:${exp.id}`);
                await cache.delByPrefix('experiences:');
            } catch (e) {
                // cache is best-effort; keep fail-open behavior
                // eslint-disable-next-line no-console
                console.warn('Failed to invalidate cache after aggregating comments', e && e.message ? e.message : e);
            }

            return true;
    } catch (err) {
        // eslint-disable-next-line no-console
        console.error('Error syncing aggregated comments data:', err);
        return false;
    }
};

const syncServiceSchedule = async (service) => {
    return syncScheduleByCron({
        sourceEntity: service,
        sourceType: 'service',
        resolveTimezone: resolveServiceTimezone,
        scheduledModelName: 'ScheduledService',
        foreignKey: 'ServiceId',
    });
};

const previewStartDateUpdate = async ({ experienceId, newStartDate }) => {
    const { ScheduledExperience, ScheduleTemplate, ExperienceReservation } = modelRegistry;

    const start = new Date(newStartDate);
    if (Number.isNaN(start.getTime())) {
        throw { status: 400, errors: ['Invalid newStartDate'] };
    }

    // Find all sessions before the new start date
    const sessions = await ScheduledExperience.findAll({
        where: {
            ExperienceId: experienceId,
            dateTime: { [Op.lt]: start },
        },
        include: [{ model: ExperienceReservation, attributes: ['id', 'numberOfAttendees', 'status'] }],
        order: [['dateTime', 'ASC']],
    });

    const emptySessions = [];
    const nonEmptySessions = [];

    for (const session of sessions) {
        const reservations = session.ExperienceReservations || [];
        const activeReservations = reservations.filter((r) => r.status !== 'cancelled');
        if (activeReservations.length === 0) {
            emptySessions.push({
                id: session.id,
                dateTime: session.dateTime,
                status: session.status,
            });
        } else {
            nonEmptySessions.push({
                id: session.id,
                dateTime: session.dateTime,
                status: session.status,
                reservationCount: activeReservations.length,
                totalAttendees: activeReservations.reduce((sum, r) => sum + (r.numberOfAttendees || 0), 0),
            });
        }
    }

    // Compute suggested start date: last generated session + 1 day
    const allSessions = await ScheduledExperience.findAll({
        where: { ExperienceId: experienceId },
        attributes: ['dateTime'],
        order: [['dateTime', 'DESC']],
        limit: 1,
    });

    const suggestedStartDate = allSessions.length > 0
        ? new Date(new Date(allSessions[0].dateTime).getTime() + 24 * 60 * 60 * 1000).toISOString().slice(0, 10)
        : new Date().toISOString().slice(0, 10);

    return { emptySessions, nonEmptySessions, suggestedStartDate };
};

const confirmStartDateUpdate = async ({ experienceId, newStartDate, cancelEmptySessions }) => {
    const { ScheduledExperience, ScheduleTemplate, ExperienceReservation, sequelize: seq } = modelRegistry;

    const start = new Date(newStartDate);
    if (Number.isNaN(start.getTime())) {
        throw { status: 400, errors: ['Invalid newStartDate'] };
    }

    const transaction = await seq.transaction();

    try {
        let cancelledCount = 0;
        const skippedNonEmpty = [];

        if (cancelEmptySessions) {
            // Find sessions before the new start date
            const sessions = await ScheduledExperience.findAll({
                where: {
                    ExperienceId: experienceId,
                    dateTime: { [Op.lt]: start },
                    status: { [Op.ne]: 'cancelled' },
                },
                include: [{ model: ExperienceReservation, attributes: ['id', 'status'] }],
                transaction,
            });

            for (const session of sessions) {
                const activeReservations = (session.ExperienceReservations || []).filter((r) => r.status !== 'cancelled');
                if (activeReservations.length === 0) {
                    await session.update({ status: 'cancelled' }, { transaction });
                    cancelledCount++;
                } else {
                    skippedNonEmpty.push({
                        id: session.id,
                        dateTime: session.dateTime,
                        reservationCount: activeReservations.length,
                    });
                }
            }
        }

        // Update all active templates for this experience with the new startDate
        await ScheduleTemplate.update(
            { startDate: start },
            { where: { ExperienceId: experienceId, active: true }, transaction }
        );

        await transaction.commit();

        return { cancelledCount, skippedNonEmpty };
    } catch (err) {
        await transaction.rollback();
        throw err;
    }
};

const defaultExport = {
    syncExperienceSchedule,
    syncServiceSchedule,
    syncAggregatedCommentsData,
    populateScheduleBounded,
    previewStartDateUpdate,
    confirmStartDateUpdate,
};

export {
    syncExperienceSchedule,
    syncServiceSchedule,
    syncAggregatedCommentsData,
    populateScheduleBounded,
    previewStartDateUpdate,
    confirmStartDateUpdate,
};
export default defaultExport;
