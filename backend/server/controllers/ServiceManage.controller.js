import modelRegistry1 from '../models/index.js';
import { syncServiceSchedule } from '../services/Scheduler.service.js';
import { sendError } from '../utils/http-response.js';
import cache from '../utils/cache.js';
import {
    normalizeBaseCreatePayload,
    normalizeBaseUpdatePayload,
    createAssignOrganizersHandler,
    createSyncManagedScheduleHandler,
} from './offering-manage.shared.js';

const {
    Service,
    Location,
    Organization,
    User,
    ScheduledService,
    sequelize,
} = modelRegistry1;

const MAX_SERVICE_TITLE_LENGTH = 120;
const MAX_SERVICE_SUBTITLE_LENGTH = 180;
const MAX_SERVICE_DESCRIPTION_LENGTH = 5000;
const MAX_SERVICE_SCHEDULING_LENGTH = 120;

const createService = async (req, res) => {
    const transaction = await sequelize.transaction();

    try {
        const { errors, normalized } = normalizeBaseCreatePayload(req.body, {
            maxTitleLength: MAX_SERVICE_TITLE_LENGTH,
            maxSubtitleLength: MAX_SERVICE_SUBTITLE_LENGTH,
            maxDescriptionLength: MAX_SERVICE_DESCRIPTION_LENGTH,
            maxSchedulingLength: MAX_SERVICE_SCHEDULING_LENGTH,
        });
        if (errors.length > 0) {
            await transaction.rollback();
            return res.status(400).json({ errors, data: {} });
        }

        if (req.organizationId !== normalized.organizationId) {
            await transaction.rollback();
            return res.status(403).json({
                errors: ['Authenticated organization does not match payload organizationId'],
                data: {},
            });
        }

        const [location, organization] = await Promise.all([
            Location.findOne({
                where: {
                    id: normalized.locationId,
                    OrganizationId: normalized.organizationId,
                },
                transaction,
            }),
            Organization.findByPk(normalized.organizationId, { transaction }),
        ]);

        if (!location || !organization) {
            await transaction.rollback();
            return res.status(400).json({
                errors: ['Invalid locationId for the specified organization or invalid organizationId'],
                data: {},
            });
        }

        const service = await Service.create(
            {
                title: normalized.title,
                capacity: normalized.capacity,
                duration: normalized.duration,
                scheduling: normalized.scheduling,
                subtitle: normalized.subtitle,
                description: normalized.description,
                thumbnail: normalized.thumbnail,
                images: normalized.images,
                ratings: normalized.ratings,
                OrganizationId: normalized.organizationId,
                LocationId: normalized.locationId,
                UserId: req.user.id,
            },
            { transaction }
        );

        await service.addOrganizer(req.user.id, { transaction });

        await transaction.commit();

        const createdService = await Service.findByPk(service.id, {
            include: [
                {
                    model: User,
                    as: 'Organizers',
                    attributes: ['id', 'firstName', 'lastName', 'email'],
                    through: { attributes: [] },
                },
            ],
        });

        try {
            await cache.delByPrefix('services:');
            await cache.del(`service:detail:${createdService.id}`);
        } catch (e) {
            /* ignore cache errors */
        }

        return res.status(201).json({
            errors: [],
            data: {
                service: createdService,
            },
        });
    } catch (error) {
        await transaction.rollback();
        return sendError(res, {
            status: 500,
            message: 'Error creating service',
            requestId: req.requestId,
        });
    }
};

const updateService = async (req, res) => {
    const transaction = await sequelize.transaction();

    try {
        const serviceId = Number(req.params.serviceId);
        if (!Number.isInteger(serviceId)) {
            await transaction.rollback();
            return res.status(400).json({ errors: ['Invalid service id'], data: {} });
        }

        const service = await Service.findByPk(serviceId, { transaction });
        if (!service) {
            await transaction.rollback();
            return res.status(404).json({ errors: ['Service not found'], data: {} });
        }

        const membership = await sequelize.models.OrganizationMembers.findOne({
            where: {
                UserId: req.user.id,
                OrganizationId: service.OrganizationId,
                isAdmin: true,
            },
            transaction,
        });

        if (!membership) {
            await transaction.rollback();
            return res.status(403).json({
                errors: ['Only organization admins can update this service'],
                data: {},
            });
        }

        const {
            errors: updatePayloadErrors,
            updatePayload,
        } = normalizeBaseUpdatePayload(req.body, {
            maxTitleLength: MAX_SERVICE_TITLE_LENGTH,
            maxSubtitleLength: MAX_SERVICE_SUBTITLE_LENGTH,
            maxDescriptionLength: MAX_SERVICE_DESCRIPTION_LENGTH,
            maxSchedulingLength: MAX_SERVICE_SCHEDULING_LENGTH,
        });

        if (updatePayloadErrors.length > 0) {
            await transaction.rollback();
            return res.status(400).json({
                errors: updatePayloadErrors,
                data: {},
            });
        }

        await service.update(updatePayload, { transaction });
        await transaction.commit();

        const updatedService = await Service.findByPk(service.id, {
            include: [
                {
                    model: User,
                    as: 'Organizers',
                    attributes: ['id', 'firstName', 'lastName', 'email'],
                    through: { attributes: [] },
                },
            ],
        });

        try {
            await cache.delByPrefix('services:');
            await cache.del(`service:detail:${updatedService.id}`);
        } catch (e) {
            /* ignore cache errors */
        }

        return res.status(200).json({
            errors: [],
            data: {
                service: updatedService,
            },
        });
    } catch (error) {
        await transaction.rollback();
        return sendError(res, {
            status: 500,
            message: 'Error updating service',
            requestId: req.requestId,
        });
    }
};

const assignServiceOrganizers = createAssignOrganizersHandler({
    sequelize,
    User,
    entityModel: Service,
    entityLabel: 'Service',
    entityIdParam: 'serviceId',
    responseKey: 'service',
});

const syncManagedServiceSchedule = createSyncManagedScheduleHandler({
    sequelize,
    entityModel: Service,
    entityLabel: 'Service',
    entityIdParam: 'serviceId',
    syncSchedule: syncServiceSchedule,
    scheduledModel: ScheduledService,
    scheduleForeignKey: 'ServiceId',
});

const defaultExport = { createService, updateService, assignServiceOrganizers, syncManagedServiceSchedule };

export { createService, updateService, assignServiceOrganizers, syncManagedServiceSchedule };
export default defaultExport;
