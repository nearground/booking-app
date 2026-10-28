import { createRequire } from 'node:module';
const require = createRequire(import.meta.url);

const express = require('express');

import {
    getAllExperiences,
    getExperienceByCode,
    getCities,
    getVerticalFilters,
    getExperienceBookingEnquiry,
    getNearbyExperiences,
    syncSchedule,
    getScheduledExperiences,
    getScheduledExperiencesCalendarSummary,
    createExperienceReservation,
} from '../controllers/Experience.controller.js';
import {
    createExperience,
    updateExperience,
    deleteExperience,
    getExperienceForEdit,
    assignExperienceOrganizers,
    syncManagedExperienceSchedule,
    toggleAutoSync,
    toggleSessionSyncLock,
    updateLookahead,
    previewPopulateSchedule,
    populateSchedule,
    previewStartDate,
    confirmStartDate,
} from '../controllers/ExperienceManage.controller.js';
import { authUser } from '../middlewares/auth.js';
import { requireOrganizationAdmin } from '../middlewares/organization-auth.js';
import { requireExperienceOrganizationAdmin } from '../middlewares/experience-auth.js';
import { getExperienceAttendance } from '../controllers/ExperienceAttendance.controller.js';

const router = express.Router();

router.get('/', getAllExperiences);
router.get('/verticalFilters', getVerticalFilters);
router.get('/availableCities', getCities);
router.get('/nearbyExperiences', getNearbyExperiences);
router.get('/:experienceCode/schedule/calendar', getScheduledExperiencesCalendarSummary);
router.get('/:experienceCode/schedule', getScheduledExperiences);
router.get('/:experienceCode/schedule/:sessionId/attendance', getExperienceAttendance);
router.get('/:experienceCode/attendance', getExperienceAttendance);
router.post('/:experienceCode/reservations', createExperienceReservation);
router.post('/:experienceCode/sync-schedule', syncSchedule);
router.post('/manage', authUser, requireOrganizationAdmin, createExperience);
router.get('/manage/:experienceId', authUser, requireExperienceOrganizationAdmin, getExperienceForEdit);
router.patch('/manage/:experienceId', authUser, requireExperienceOrganizationAdmin, updateExperience);
router.delete('/manage/:experienceId', authUser, requireExperienceOrganizationAdmin, deleteExperience);
router.patch('/manage/:experienceId/assign-organizers', authUser, requireExperienceOrganizationAdmin, assignExperienceOrganizers);
router.post('/manage/:experienceId/sync-schedule', authUser, requireExperienceOrganizationAdmin, syncManagedExperienceSchedule);
router.post('/manage/:experienceId/schedule/preview-populate', authUser, requireExperienceOrganizationAdmin, previewPopulateSchedule);
router.post('/manage/:experienceId/schedule/populate', authUser, requireExperienceOrganizationAdmin, populateSchedule);
router.post('/manage/:experienceId/schedule/preview-start-date', authUser, requireExperienceOrganizationAdmin, previewStartDate);
router.post('/manage/:experienceId/schedule/update-start-date', authUser, requireExperienceOrganizationAdmin, confirmStartDate);
router.patch('/manage/:experienceId/auto-sync', authUser, requireExperienceOrganizationAdmin, toggleAutoSync);
router.patch('/manage/:experienceId/lookahead', authUser, requireExperienceOrganizationAdmin, updateLookahead);
router.patch('/manage/scheduled-experiences/:sessionId/sync-lock', authUser, toggleSessionSyncLock);
router.get('/:experienceCode/booking/enquiry', getExperienceBookingEnquiry);
router.get('/:experienceCode', getExperienceByCode);

export default router;
