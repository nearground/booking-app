import { createRequire } from 'node:module';
const require = createRequire(import.meta.url);

const express = require('express');

import { authUser } from '../middlewares/auth.js';
import { createOrganizerInviteRateLimiter } from '../middlewares/rate-limit.js';
import {
    createOrganizerOnboardingRateLimiter,
    createOrganizerInviteResolveRateLimiter,
} from '../middlewares/auth-rate-limit.js';
import {
    createInvite,
    resendInvite,
    cancelInvite,
    resolveInvite,
    startOnboarding,
    completeOnboarding,
    getOnboardingMeta,
    updateOrganizerProfile,
    updateOrganization,
    createOrganizationLocation,
    updateOrganizationLocation,
    deleteOrganizationLocation,
    getOrganizerWorkspace,
    getOrganizerReceivedComments,
    getSessionReservations,
    cancelSession,
} from '../controllers/Organizer.controller.js';

const router = express.Router();
const organizerInviteRateLimiter = createOrganizerInviteRateLimiter();
const organizerOnboardingRateLimiter = createOrganizerOnboardingRateLimiter();
const organizerInviteResolveRateLimiter = createOrganizerInviteResolveRateLimiter();

router.get('/onboarding/meta', getOnboardingMeta);
router.post('/onboarding/start', organizerOnboardingRateLimiter, startOnboarding);
router.post('/onboarding/complete', organizerOnboardingRateLimiter, completeOnboarding);
router.get('/invites/resolve', organizerInviteResolveRateLimiter, resolveInvite);
router.post('/invites', authUser, organizerInviteRateLimiter, createInvite);
router.post('/invites/:id/resend', authUser, organizerInviteRateLimiter, resendInvite);
router.delete('/invites/:id', authUser, organizerInviteRateLimiter, cancelInvite);
router.get('/workspace', authUser, getOrganizerWorkspace);
router.get('/sessions/:sessionId/reservations', authUser, getSessionReservations);
router.patch('/sessions/:sessionId/cancel', authUser, cancelSession);
router.get('/comments/received', authUser, getOrganizerReceivedComments);
router.patch('/profile', authUser, updateOrganizerProfile);
router.patch('/organizations/:organizationId', authUser, updateOrganization);
router.post('/organizations/:organizationId/locations', authUser, createOrganizationLocation);
router.patch('/organizations/:organizationId/locations/:locationId', authUser, updateOrganizationLocation);
router.delete('/organizations/:organizationId/locations/:locationId', authUser, deleteOrganizationLocation);

export default router;
