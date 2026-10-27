import { createRequire } from 'node:module';
const require = createRequire(import.meta.url);

import modelRegistry1 from '../models/index.js';
import { sendError } from '../utils/http-response.js';
import { resolveMediaUrl } from '../utils/media-storage.js';
import { syncServiceSchedule } from '../services/Scheduler.service.js';
import cache from '../utils/cache.js';


const { Op } = require('sequelize');
const { Service, ScheduledService, ServiceReservation, Location, User } = modelRegistry1;

const normalizeBillingPayload = (billingPayload = {}) => ({
    email: String(billingPayload.email || '').trim(),
    name: String(billingPayload.name || '').trim(),
    address: String(billingPayload.address || '').trim(),
    city: String(billingPayload.city || '').trim(),
    state: String(billingPayload.state || '').trim(),
    postalCode: String(billingPayload.postalCode || '').trim(),
});

const isBillingPayloadValid = (billingPayload) =>
    Boolean(
        billingPayload?.email &&
            billingPayload?.name &&
            billingPayload?.address &&
            billingPayload?.city &&
            billingPayload?.state &&
            billingPayload?.postalCode
    );

const normalizeAttendeePayload = (attendees = []) =>
    attendees.map((attendee, attendeeIndex) => ({
        firstName: String(attendee.firstName || '').trim(),
        lastName: String(attendee.lastName || '').trim(),
        email: String(attendee.email || '').trim(),
        isMainContact: Boolean(attendee.isMainContact) || attendeeIndex === 0,
    }));

const generateConfirmationCode = (serviceId, scheduledServiceId) => {
    const randomSuffix = Math.random().toString(36).slice(2, 10).toUpperCase();
    return `${serviceId}-${scheduledServiceId}-${Date.now()}-${randomSuffix}`;
};

const getAllServices = async (_req, res) => {
    try {
        const cacheKey = 'services:list';
        const cached = await cache.get(cacheKey);
        if (cached) return res.status(200).json(cached);
        const services = await Service.findAll({
            include: [
                {
                    model: Location,
                    attributes: ['id', 'name', 'city', 'country', 'timezone'],
                    required: false,
                },
            ],
            order: [['createdAt', 'DESC']],
        });

        const elements = services.map((service) => ({
            ...service.toJSON(),
            thumbnail: resolveMediaUrl(service.thumbnail),
            images: Array.isArray(service.images)
                ? service.images.map((image) => resolveMediaUrl(image)).filter(Boolean)
                : [],
        }));

        return res.status(200).json({
            errors: [],
            data: {
                elements,
            },
        });
        // cache list
        try {
            await cache.set(cacheKey, { errors: [], data: { elements } }, 60);
        } catch (e) {}
    } catch (error) {
        return sendError(res, {
            status: 500,
            message: 'Error loading services',
            requestId: _req.requestId,
        });
    }
};

const getServiceByCode = async (req, res) => {
    try {
        const serviceCode = Number(req.params.serviceCode);
        const cacheKey = `service:detail:${serviceCode}`;
        const cached = await cache.get(cacheKey);
        if (cached) return res.status(200).json(cached);

        if (!Number.isInteger(serviceCode)) {
            return res.status(400).json({ errors: ['Invalid service code'], data: {} });
        }

        const service = await Service.findByPk(serviceCode, {
            include: [
                {
                    model: Location,
                    attributes: ['id', 'name', 'city', 'country', 'timezone'],
                    required: false,
                },
                {
                    model: User,
                    as: 'Organizers',
                    attributes: ['id', 'firstName', 'lastName', 'email', 'profilePicture'],
                    through: { attributes: [] },
                    required: false,
                },
            ],
        });

        if (!service) {
            return res.status(404).json({ errors: ['Service not found'], data: {} });
        }

        const element = {
            ...service.toJSON(),
            thumbnail: resolveMediaUrl(service.thumbnail),
            images: Array.isArray(service.images)
                ? service.images.map((image) => resolveMediaUrl(image)).filter(Boolean)
                : [],
            Organizers: (service.Organizers || []).map((organizer) => ({
                ...organizer.toJSON(),
                profilePicture: resolveMediaUrl(organizer.profilePicture),
            })),
        };

        return res.status(200).json({
            errors: [],
            data: {
                element,
            },
        });
        try {
            await cache.set(cacheKey, { errors: [], data: { element } }, 60);
        } catch (e) {}
    } catch (error) {
        return sendError(res, {
            status: 500,
            message: 'Error loading service details',
            requestId: req.requestId,
        });
    }
};

const formatDateKey = (dateValue) => {
    const date = dateValue instanceof Date ? dateValue : new Date(dateValue);
    const year = date.getUTCFullYear();
    const month = String(date.getUTCMonth() + 1).padStart(2, '0');
    const day = String(date.getUTCDate()).padStart(2, '0');
    return `${year}-${month}-${day}`;
};

const getScheduledServices = async (req, res) => {
    try {
        const serviceCode = Number(req.params.serviceCode);
        const { currentPage = 1, pageSize = 6, startDate } = req.query;

        if (!Number.isInteger(serviceCode)) {
            return res.status(400).json({ errors: ['Invalid service code'], data: {} });
        }

        const service = await Service.findByPk(serviceCode, {
            attributes: ['id', 'scheduling'],
        });

        if (!service) {
            return res.status(404).json({ errors: ['Service not found'], data: {} });
        }

        const parsedPageSize = Math.max(1, parseInt(pageSize, 10) || 6);
        const parsedCurrentPage = Math.max(1, parseInt(currentPage, 10) || 1);
        const offset = (parsedCurrentPage - 1) * parsedPageSize;

        const rangeStartDate = startDate ? new Date(startDate) : new Date();

        let { count, rows: services } = await ScheduledService.findAndCountAll({
            where: {
                ServiceId: serviceCode,
                status: 'scheduled',
                dateTime: {
                    [Op.gte]: rangeStartDate,
                },
            },
            limit: parsedPageSize,
            offset,
            order: [['dateTime', 'ASC']],
        });

        if (count === 0 && service.scheduling) {
            await syncServiceSchedule(service);
            const refreshedResult = await ScheduledService.findAndCountAll({
                where: {
                    ServiceId: serviceCode,
                    status: 'scheduled',
                    dateTime: {
                        [Op.gte]: rangeStartDate,
                    },
                },
                limit: parsedPageSize,
                offset,
                order: [['dateTime', 'ASC']],
            });

            count = refreshedResult.count;
            services = refreshedResult.rows;
        }

        const totalPages = Math.max(1, Math.ceil(count / parsedPageSize));

        return res.status(200).json({
            errors: [],
            data: {
                elements: services,
                paging: {
                    currentPage: parsedCurrentPage,
                    totalPages,
                    pageSize: parsedPageSize,
                },
                metadata: {
                    totalResults: count,
                },
            },
        });
    } catch (error) {
        return sendError(res, {
            status: 500,
            message: 'Error loading service schedule',
            requestId: req.requestId,
        });
    }
};

const getScheduledServicesCalendarSummary = async (req, res) => {
    try {
        const serviceCode = Number(req.params.serviceCode);
        const month = String(req.query.month || '').trim();

        if (!Number.isInteger(serviceCode)) {
            return res.status(400).json({ errors: ['Invalid service code'], data: {} });
        }

        const service = await Service.findByPk(serviceCode, {
            attributes: ['id', 'scheduling'],
        });

        if (!service) {
            return res.status(404).json({ errors: ['Service not found'], data: {} });
        }

        const [yearString, monthString] = /^\d{4}-\d{2}$/.test(month)
            ? month.split('-')
            : [String(new Date().getUTCFullYear()), String(new Date().getUTCMonth() + 1).padStart(2, '0')];

        const year = Number(yearString);
        const monthNumber = Number(monthString);
        const monthStart = new Date(Date.UTC(year, monthNumber - 1, 1, 0, 0, 0));
        const nextMonthStart = new Date(Date.UTC(year, monthNumber, 1, 0, 0, 0));
        const monthEnd = new Date(nextMonthStart.getTime() - 1);
        const now = new Date();
        const rangeStart = monthStart > now ? monthStart : now;

        let services = await ScheduledService.findAll({
            where: {
                ServiceId: serviceCode,
                status: 'scheduled',
                dateTime: {
                    [Op.between]: [rangeStart, monthEnd],
                },
            },
            attributes: ['dateTime', 'availableSpots'],
            order: [['dateTime', 'ASC']],
        });

        if (services.length === 0 && service.scheduling) {
            await syncServiceSchedule(service);
            services = await ScheduledService.findAll({
                where: {
                    ServiceId: serviceCode,
                    status: 'scheduled',
                    dateTime: {
                        [Op.between]: [rangeStart, monthEnd],
                    },
                },
                attributes: ['dateTime', 'availableSpots'],
                order: [['dateTime', 'ASC']],
            });
        }

        const dayStatusMap = new Map();

        services.forEach((scheduledService) => {
            const dateKey = formatDateKey(new Date(scheduledService.dateTime));
            const hasOpenSpots = Number(scheduledService.availableSpots) > 0;

            if (!dayStatusMap.has(dateKey)) {
                dayStatusMap.set(dateKey, { hasOpenSpots: false });
            }

            if (hasOpenSpots) {
                dayStatusMap.get(dateKey).hasOpenSpots = true;
            }
        });

        const elements = Array.from(dayStatusMap.entries()).map(([date, value]) => ({
            date,
            status: value.hasOpenSpots ? 'open' : 'full',
        }));

        return res.status(200).json({
            errors: [],
            data: {
                elements,
                metadata: {
                    month: `${year}-${String(monthNumber).padStart(2, '0')}`,
                    totalDays: elements.length,
                },
            },
        });
    } catch (error) {
        return sendError(res, {
            status: 500,
            message: 'Error loading service schedule calendar summary',
            requestId: req.requestId,
        });
    }
};

const createServiceReservation = async (req, res) => {
    const transaction = await Service.sequelize.transaction();

    try {
        const serviceId = parseInt(req.params.serviceCode, 10);
        const {
            scheduledServiceId,
            attendees = [],
            billing,
            totalPrice,
            specialRequests,
        } = req.body;

        if (!Number.isInteger(serviceId)) {
            await transaction.rollback();
            return res.status(400).json({ errors: ['Invalid service code'], data: {} });
        }

        const parsedScheduledServiceId = Number(scheduledServiceId);
        if (!Number.isInteger(parsedScheduledServiceId)) {
            await transaction.rollback();
            return res.status(400).json({ errors: ['scheduledServiceId is required'], data: {} });
        }

        if (!Array.isArray(attendees) || attendees.length === 0) {
            await transaction.rollback();
            return res.status(400).json({ errors: ['At least one attendee is required'], data: {} });
        }

        const normalizedBilling = normalizeBillingPayload(billing);
        if (!isBillingPayloadValid(normalizedBilling)) {
            await transaction.rollback();
            return res.status(400).json({
                errors: ['billing must include valid email, name, and full address details'],
                data: {},
            });
        }

        const normalizedAttendees = normalizeAttendeePayload(attendees);
        const invalidAttendee = normalizedAttendees.find(
            (attendee) => !attendee.firstName || !attendee.lastName || !attendee.email
        );

        if (invalidAttendee) {
            await transaction.rollback();
            return res.status(400).json({
                errors: ['Each attendee must include firstName, lastName, and email'],
                data: {},
            });
        }

        const service = await Service.findByPk(serviceId, { transaction });
        if (!service) {
            await transaction.rollback();
            return res.status(404).json({ errors: ['Service not found'], data: {} });
        }

        const scheduledService = await ScheduledService.findOne({
            where: {
                id: parsedScheduledServiceId,
                ServiceId: serviceId,
            },
            transaction,
        });

        if (!scheduledService) {
            await transaction.rollback();
            return res.status(404).json({ errors: ['Scheduled service not found for this service'], data: {} });
        }

        const requestedTotalPrice = Number(totalPrice);
        const normalizedTotalPrice = Number.isFinite(requestedTotalPrice) && requestedTotalPrice >= 0
            ? requestedTotalPrice
            : 0;

        const reservation = await ServiceReservation.create(
            {
                confirmationCode: generateConfirmationCode(serviceId, scheduledService.id),
                numberOfAttendees: normalizedAttendees.length,
                totalPrice: Number(normalizedTotalPrice.toFixed(2)),
                status: 'pending',
                specialRequests: specialRequests ? String(specialRequests).trim() : null,
                attendeeNames: normalizedAttendees.map(
                    (attendee) => `${attendee.firstName} ${attendee.lastName}`
                ),
                billingEmail: normalizedBilling.email,
                billingName: normalizedBilling.name,
                billingAddress: normalizedBilling.address,
                billingCity: normalizedBilling.city,
                billingState: normalizedBilling.state,
                billingPostalCode: normalizedBilling.postalCode,
                ScheduledServiceId: scheduledService.id,
                ...(req.user?.id ? { CustomerId: req.user.id } : {}),
            },
            { transaction }
        );

        await transaction.commit();

        // invalidate caches related to this service
        try {
            await cache.delByPrefix('services:');
            await cache.del(`service:detail:${serviceId}`);
        } catch (e) { /* ignore cache errors */ }

        return res.status(201).json({
            errors: [],
            data: {
                reservationId: reservation.id,
                confirmationCode: reservation.confirmationCode,
                status: reservation.status,
                numberOfAttendees: reservation.numberOfAttendees,
                totalPrice: Number(reservation.totalPrice),
                scheduledServiceId: scheduledService.id,
                bookingDate: reservation.createdAt,
                serviceName: service.title,
            },
        });
    } catch (error) {
        await transaction.rollback();
        return sendError(res, {
            status: 500,
            message: 'Error creating service reservation',
            requestId: req.requestId,
        });
    }
};

const defaultExport = { getAllServices, getServiceByCode, getScheduledServices, getScheduledServicesCalendarSummary, createServiceReservation };

export { getAllServices, getServiceByCode, getScheduledServices, getScheduledServicesCalendarSummary, createServiceReservation };
export default defaultExport;
