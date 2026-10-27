import {
    normalizeStoredMediaValue,
    normalizeMediaArray,
} from '../utils/media-storage.js';
import { sendError } from '../utils/http-response.js';

const BASE_UPDATABLE_FIELDS = [
    'title',
    'capacity',
    'duration',
    'scheduling',
    'subtitle',
    'description',
    'thumbnail',
    'images',
];

const validateTextLength = (value, fieldName, maxLength, errors) => {
    if (value !== null && value !== undefined && String(value).length > maxLength) {
        errors.push(`${fieldName} cannot exceed ${maxLength} characters`);
    }
};

const parseOptionalNumber = (value) => {
    if (value === null || value === undefined) {
        return null;
    }

    const trimmed = String(value).trim();
    if (trimmed === '') {
        return null;
    }

    const parsed = Number(trimmed);
    return Number.isFinite(parsed) ? parsed : null;
};

const normalizeBaseCreatePayload = (payload, limits) => {
    const errors = [];
    const title = String(payload.title || '').trim();
    const capacity = Number(payload.capacity);
    const duration = Number(payload.duration);
    const locationId = Number(payload.locationId || payload.LocationId);
    const organizationId = Number(payload.organizationId || payload.OrganizationId);

    if (!title) errors.push('title is required');
    if (!Number.isInteger(capacity) || capacity <= 0) errors.push('capacity must be a positive integer');
    if (!Number.isInteger(duration) || duration <= 0) errors.push('duration must be a positive integer');
    if (!Number.isInteger(locationId)) errors.push('locationId is required');
    if (!Number.isInteger(organizationId)) errors.push('organizationId is required');

    validateTextLength(title, 'title', limits.maxTitleLength, errors);

    const normalized = {
        title,
        capacity,
        duration,
        locationId,
        organizationId,
        scheduling: limits.maxSchedulingLength ? (payload.scheduling ? String(payload.scheduling).trim() : null) : undefined,
        subtitle: payload.subtitle ? String(payload.subtitle).trim() : null,
        description: payload.description ? String(payload.description).trim() : null,
        thumbnail: normalizeStoredMediaValue(payload.thumbnail),
        images: normalizeMediaArray(Array.isArray(payload.images) ? payload.images : []),
        ratings: payload.ratings ?? null,
    };

    validateTextLength(normalized.subtitle, 'subtitle', limits.maxSubtitleLength, errors);
    validateTextLength(normalized.description, 'description', limits.maxDescriptionLength, errors);
    if (limits.maxSchedulingLength) {
        validateTextLength(normalized.scheduling, 'scheduling', limits.maxSchedulingLength, errors);
    }

    return { errors, normalized };
};

const normalizeBaseUpdatePayload = (payload, limits) => {
    const errors = [];

    const updatePayload = BASE_UPDATABLE_FIELDS.reduce((accumulator, fieldName) => {
        if (payload[fieldName] !== undefined) {
            accumulator[fieldName] = payload[fieldName];
        }
        return accumulator;
    }, {});

    if (updatePayload.title !== undefined) {
        updatePayload.title = String(updatePayload.title || '').trim();
        if (!updatePayload.title) {
            errors.push('title cannot be empty');
        }

        if (updatePayload.title.length > limits.maxTitleLength) {
            errors.push(`title cannot exceed ${limits.maxTitleLength} characters`);
        }
    }

    if (updatePayload.subtitle !== undefined) {
        updatePayload.subtitle = updatePayload.subtitle
            ? String(updatePayload.subtitle).trim()
            : null;

        if (updatePayload.subtitle && updatePayload.subtitle.length > limits.maxSubtitleLength) {
            errors.push(`subtitle cannot exceed ${limits.maxSubtitleLength} characters`);
        }
    }

    if (updatePayload.description !== undefined) {
        updatePayload.description = updatePayload.description
            ? String(updatePayload.description).trim()
            : null;

        if (updatePayload.description && updatePayload.description.length > limits.maxDescriptionLength) {
            errors.push(`description cannot exceed ${limits.maxDescriptionLength} characters`);
        }
    }

    if (updatePayload.scheduling !== undefined && limits.maxSchedulingLength) {
        updatePayload.scheduling = updatePayload.scheduling
            ? String(updatePayload.scheduling).trim()
            : null;

        if (updatePayload.scheduling && updatePayload.scheduling.length > limits.maxSchedulingLength) {
            errors.push(`scheduling cannot exceed ${limits.maxSchedulingLength} characters`);
        }
    } else {
        // If scheduling is not supported (e.g., Experience), remove it from the update payload
        delete updatePayload.scheduling;
    }

    if (updatePayload.capacity !== undefined) {
        const parsedCapacity = Number(updatePayload.capacity);
        if (!Number.isInteger(parsedCapacity) || parsedCapacity <= 0) {
            errors.push('capacity must be a positive integer');
        } else {
            updatePayload.capacity = parsedCapacity;
        }
    }

    if (updatePayload.duration !== undefined) {
        const parsedDuration = Number(updatePayload.duration);
        if (!Number.isInteger(parsedDuration) || parsedDuration <= 0) {
            errors.push('duration must be a positive integer');
        } else {
            updatePayload.duration = parsedDuration;
        }
    }

    if (updatePayload.thumbnail !== undefined) {
        updatePayload.thumbnail = normalizeStoredMediaValue(updatePayload.thumbnail);
    }

    if (updatePayload.images !== undefined) {
        updatePayload.images = normalizeMediaArray(
            Array.isArray(updatePayload.images) ? updatePayload.images : []
        );
    }

    return { errors, updatePayload };
};

const createAssignOrganizersHandler = ({
    sequelize,
    User,
    entityModel,
    entityLabel,
    entityIdParam,
    responseKey,
}) => async (req, res) => {
    const transaction = await sequelize.transaction();

    try {
        const entityId = Number(req.params[entityIdParam]);
        const organizerUserIds = Array.isArray(req.body.organizerUserIds)
            ? [...new Set(req.body.organizerUserIds.map((value) => Number(value)).filter(Number.isInteger))]
            : [];

        if (!Number.isInteger(entityId)) {
            await transaction.rollback();
            return res.status(400).json({ errors: [`Invalid ${entityLabel} id`], data: {} });
        }

        const entity = await entityModel.findByPk(entityId, { transaction });
        if (!entity) {
            await transaction.rollback();
            return res.status(404).json({ errors: [`${entityLabel} not found`], data: {} });
        }

        const membership = await sequelize.models.OrganizationMembers.findOne({
            where: {
                UserId: req.user.id,
                OrganizationId: entity.OrganizationId,
                isAdmin: true,
            },
            transaction,
        });

        if (!membership) {
            await transaction.rollback();
            return res.status(403).json({
                errors: [`Only organization admins can assign ${entityLabel.toLowerCase()} organizers`],
                data: {},
            });
        }

        const orgMembers = await sequelize.models.OrganizationMembers.findAll({
            where: {
                OrganizationId: entity.OrganizationId,
                UserId: organizerUserIds,
            },
            transaction,
        });

        if (orgMembers.length !== organizerUserIds.length) {
            await transaction.rollback();
            return res.status(400).json({
                errors: ['One or more selected organizers are not members of this organization'],
                data: {},
            });
        }

        const organizers = await User.findAll({
            where: { id: organizerUserIds },
            transaction,
        });

        await entity.setOrganizers(organizers, { transaction });
        await transaction.commit();

        const updatedEntity = await entityModel.findByPk(entity.id, {
            include: [
                {
                    model: User,
                    as: 'Organizers',
                    attributes: ['id', 'firstName', 'lastName', 'email'],
                    through: { attributes: [] },
                },
            ],
        });

        return res.status(200).json({
            errors: [],
            data: {
                [responseKey]: updatedEntity,
            },
        });
    } catch (_error) {
        await transaction.rollback();
        return sendError(res, {
            status: 500,
            message: `Error assigning organizers to ${entityLabel.toLowerCase()}`,
            requestId: req.requestId,
        });
    }
};

const createSyncManagedScheduleHandler = ({
    sequelize,
    entityModel,
    entityLabel,
    entityIdParam,
    syncSchedule,
    scheduledModel,
    scheduleForeignKey,
}) => async (req, res) => {
    try {
        const entityId = Number(req.params[entityIdParam]);

        if (!Number.isInteger(entityId)) {
            return res.status(400).json({ errors: [`Invalid ${entityLabel} id`], data: {} });
        }

        const entity = await entityModel.findByPk(entityId);
        if (!entity) {
            return res.status(404).json({ errors: [`${entityLabel} not found`], data: {} });
        }

        const membership = await sequelize.models.OrganizationMembers.findOne({
            where: {
                UserId: req.user.id,
                OrganizationId: entity.OrganizationId,
                isAdmin: true,
            },
        });

        if (!membership) {
            return res.status(403).json({
                errors: [`Only organization admins can sync ${entityLabel.toLowerCase()} schedule`],
                data: {},
            });
        }

        const syncedEntities = await syncSchedule(entity);
        const upcomingSchedule = await scheduledModel.findAll({
            where: {
                [scheduleForeignKey]: entity.id,
            },
            order: [['dateTime', 'ASC']],
            limit: 20,
        });

        return res.status(200).json({
            errors: [],
            data: {
                syncedCount: syncedEntities.length,
                schedule: upcomingSchedule,
            },
        });
    } catch (_error) {
        return sendError(res, {
            status: 500,
            message: `Error syncing managed ${entityLabel.toLowerCase()} schedule`,
            requestId: req.requestId,
        });
    }
};

const normalizeSchedules = (schedules) => {
    if (schedules === undefined) return { templates: [], picks: [], errors: [] };
    const errors = [];
    const templates = [];
    const picks = [];

    if (!Array.isArray(schedules)) {
        errors.push('schedules must be an array');
        return { templates, picks, errors };
    }

    schedules.forEach((item, idx) => {
        const kind = String(item?.kind || '').trim();
        if (kind === 'template') {
            const ruleType = String(item.ruleType || 'cron');
            if (!['cron', 'datetime'].includes(ruleType)) {
                errors.push(`schedules[${idx}].ruleType must be 'cron' or 'datetime'`);
                return;
            }

            const tpl = {
                name: item.name ? String(item.name).trim() : null,
                type: 'recurring',
                ruleType,
                ruleCron: item.ruleCron ? String(item.ruleCron).trim() : null,
                ruleDateTime: item.ruleDateTime ? new Date(item.ruleDateTime) : null,
                timezone: item.timezone ? String(item.timezone).trim() : 'UTC',
                durationMinutes: parseOptionalNumber(item.durationMinutes),
                capacity: parseOptionalNumber(item.capacity),
                startDate: item.startDate ? new Date(item.startDate) : null,
                endDate: item.endDate ? new Date(item.endDate) : null,
                maxOccurrences: Number.isInteger(Number(item.maxOccurrences)) ? Number(item.maxOccurrences) : null,
                active: item.active === undefined ? true : Boolean(item.active),
            };

            if (tpl.endDate && tpl.endDate < new Date()) {
                errors.push(`schedules[${idx}].endDate cannot be in the past`);
            }

            if (tpl.startDate && tpl.endDate && tpl.startDate >= tpl.endDate) {
                errors.push(`schedules[${idx}].startDate must be before endDate`);
            }

            if (tpl.ruleType === 'cron' && !tpl.ruleCron) {
                errors.push(`schedules[${idx}].ruleCron is required for cron templates`);
            }

            if (tpl.ruleType === 'datetime' && !tpl.ruleDateTime) {
                errors.push(`schedules[${idx}].ruleDateTime is required for datetime templates`);
            }

            templates.push(tpl);
        } else if (kind === 'picked') {
            const pick = {
                dateTime: item.dateTime ? new Date(item.dateTime) : null,
                endDateTime: item.endDateTime ? new Date(item.endDateTime) : null,
                capacity: parseOptionalNumber(item.capacity),
                status: item.status ? String(item.status).trim() : 'active',
                note: item.note ? String(item.note) : null,
                source: item.source ? String(item.source) : null,
            };

            if (!pick.dateTime) {
                errors.push(`schedules[${idx}].dateTime is required for picked occurrences`);
            }

            if (pick.endDateTime && pick.endDateTime <= pick.dateTime) {
                errors.push(`schedules[${idx}].endDateTime must be after dateTime`);
            }

            picks.push(pick);
        } else {
            errors.push(`schedules[${idx}].kind must be 'template' or 'picked'`);
        }
    });

    return { templates, picks, errors };
};

const defaultExport = { normalizeBaseCreatePayload, normalizeBaseUpdatePayload, createAssignOrganizersHandler, createSyncManagedScheduleHandler, normalizeSchedules };

export { normalizeBaseCreatePayload, normalizeBaseUpdatePayload, createAssignOrganizersHandler, createSyncManagedScheduleHandler, normalizeSchedules };
export default defaultExport;
