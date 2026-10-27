import { createRequire } from 'node:module';
const require = createRequire(import.meta.url);

const express = require('express');

import {
    getAllServices,
    getServiceByCode,
    getScheduledServices,
    getScheduledServicesCalendarSummary,
    createServiceReservation,
} from '../controllers/Service.controller.js';
import {
    createService,
    updateService,
    assignServiceOrganizers,
    syncManagedServiceSchedule,
} from '../controllers/ServiceManage.controller.js';
import { authUser } from '../middlewares/auth.js';
import { requireOrganizationAdmin } from '../middlewares/organization-auth.js';
import { requireServiceOrganizationAdmin } from '../middlewares/service-auth.js';

const router = express.Router();

router.get('/', getAllServices);
router.get('/:serviceCode/schedule/calendar', getScheduledServicesCalendarSummary);
router.get('/:serviceCode/schedule', getScheduledServices);
router.post('/:serviceCode/reservations', createServiceReservation);
router.post('/manage', authUser, requireOrganizationAdmin, createService);
router.patch('/manage/:serviceId', authUser, requireServiceOrganizationAdmin, updateService);
router.patch('/manage/:serviceId/assign-organizers', authUser, requireServiceOrganizationAdmin, assignServiceOrganizers);
router.post('/manage/:serviceId/sync-schedule', authUser, requireServiceOrganizationAdmin, syncManagedServiceSchedule);
router.get('/:serviceCode', getServiceByCode);

export default router;
