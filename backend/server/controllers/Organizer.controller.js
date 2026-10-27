import { createRequire } from 'node:module';
const require = createRequire(import.meta.url);


const crypto = require('crypto');

import {
    HTTP_RESPONSE_COOKIE_CONFIG,
    CSRF_COOKIE_CONFIG,
} from '../utils/constants.js';
import {
    resolveMediaUrl,
} from '../utils/media-storage.js';
import { sendError } from '../utils/http-response.js';
import * as OrganizerService from '../services/Organizer.service.js';

const createInvite = async (req, res) => {
    try {
        const { organizationId, email, role = 'member', expiresInDays = 7 } = req.body;
        const result = await OrganizerService.createInviteService({ organizationId, email, role, expiresInDays, requestingUser: req.user });
        return res.status(201).json({ errors: [], data: { inviteId: result.invite.id, organizationId: result.organization.id, organizationName: result.organization.name, email: result.invite.email, code: result.invite.code, token: result.invite.token, inviteUrl: result.inviteUrl, expiresAt: result.invite.expiresAt, delivery: result.delivery } });
    } catch (error) {
        if (error && error.status && error.errors) return res.status(error.status).json({ errors: error.errors, data: {} });
        return sendError(res, { status: 500, message: 'Error creating organization invite', requestId: req.requestId });
    }
};

const resolveInvite = async (req, res) => {
    try {
        const invite = await OrganizerService.resolveInviteService({ token: req.query.token, code: req.query.code, email: req.query.email });
        return res.status(200).json({ errors: [], data: { organization: { id: invite.Organization.id, name: invite.Organization.name, email: invite.Organization.email }, email: invite.email, role: invite.role, expiresAt: invite.expiresAt, token: invite.token, code: invite.code } });
    } catch (error) {
        if (error && error.status && error.errors) return res.status(error.status).json({ errors: error.errors, data: {} });
        return sendError(res, { status: 500, message: 'Error resolving invite', requestId: req.requestId });
    }
};

const startOnboarding = async (req, res) => {
    try {
        const { mode, email, inviteToken, inviteCode } = req.body;
        const result = await OrganizerService.startOnboardingService({ mode, email, inviteToken, inviteCode });
        return res.status(200).json({ errors: [], data: result });
    } catch (error) {
        if (error && error.status && error.errors) return res.status(error.status).json({ errors: error.errors, data: {} });
        return sendError(res, { status: 500, message: 'Error starting organizer onboarding', requestId: req.requestId });
    }
};

const completeOnboarding = async (req, res) => {
    try {
        const result = await OrganizerService.completeOnboardingService({ body: req.body });

        res.cookie('_token', result.token, {
            maxAge: HTTP_RESPONSE_COOKIE_CONFIG.MAX_AGE,
            httpOnly: HTTP_RESPONSE_COOKIE_CONFIG.HTTP_ONLY,
            secure: HTTP_RESPONSE_COOKIE_CONFIG.SECURE,
            sameSite: HTTP_RESPONSE_COOKIE_CONFIG.SAME_SITE,
            ...(HTTP_RESPONSE_COOKIE_CONFIG.DOMAIN ? { domain: HTTP_RESPONSE_COOKIE_CONFIG.DOMAIN } : {}),
        });

        res.cookie(CSRF_COOKIE_CONFIG.NAME, crypto.randomBytes(32).toString('hex'), {
            maxAge: CSRF_COOKIE_CONFIG.MAX_AGE,
            httpOnly: CSRF_COOKIE_CONFIG.HTTP_ONLY,
            secure: CSRF_COOKIE_CONFIG.SECURE,
            sameSite: CSRF_COOKIE_CONFIG.SAME_SITE,
            ...(CSRF_COOKIE_CONFIG.DOMAIN ? { domain: CSRF_COOKIE_CONFIG.DOMAIN } : {}),
        });

        return res.status(201).json({ errors: [], data: { userId: result.user.id, organizationId: result.organizationId, isAdmin: result.isAdmin } });
    } catch (error) {
        if (error && error.status && error.errors) return res.status(error.status).json({ errors: error.errors, data: {} });
        return sendError(res, { status: 500, message: 'Error completing organizer onboarding', requestId: req.requestId });
    }
};

const updateOrganizerProfile = async (req, res) => {
    try {
        const { description, profilePicture } = req.body;
        const result = await OrganizerService.updateOrganizerProfileService({ userId: req.user.id, description, profilePicture });
        return res.status(200).json({ errors: [], data: { organizer: result.organizer, user: result.user ? { id: result.user.id, profilePicture: resolveMediaUrl(result.user.profilePicture) } : null } });
    } catch (error) {
        if (error && error.status && error.errors) return res.status(error.status).json({ errors: error.errors, data: {} });
        return sendError(res, { status: 500, message: 'Error updating organizer profile', requestId: req.requestId });
    }
};

const updateOrganization = async (req, res) => {
    try {
        const result = await OrganizerService.updateOrganizationService({ userId: req.user.id, organizationIdParam: req.params.organizationId, payload: req.body });
        return res.status(200).json({ errors: [], data: { organization: result.organization } });
    } catch (error) {
        if (error && error.status && error.errors) return res.status(error.status).json({ errors: error.errors, data: {} });
        return sendError(res, { status: 500, message: 'Error updating organization', requestId: req.requestId });
    }
};

const createOrganizationLocation = async (req, res) => {
    try {
        const result = await OrganizerService.createOrganizationLocationService({ userId: req.user.id, organizationIdParam: req.params.organizationId, payload: req.body });
        return res.status(201).json({ errors: [], data: { location: result.location } });
    } catch (error) {
        if (error && error.status && error.errors) return res.status(error.status).json({ errors: error.errors, data: {} });
        return sendError(res, { status: 500, message: 'Error creating organization location', requestId: req.requestId });
    }
};

const updateOrganizationLocation = async (req, res) => {
    try {
        const result = await OrganizerService.updateOrganizationLocationService({ userId: req.user.id, organizationIdParam: req.params.organizationId, locationIdParam: req.params.locationId, payload: req.body });
        return res.status(200).json({ errors: [], data: { location: result.location } });
    } catch (error) {
        if (error && error.status && error.errors) return res.status(error.status).json({ errors: error.errors, data: {} });
        return sendError(res, { status: 500, message: 'Error updating organization location', requestId: req.requestId });
    }
};

const deleteOrganizationLocation = async (req, res) => {
    try {
        await OrganizerService.deleteOrganizationLocationService({ userId: req.user.id, organizationIdParam: req.params.organizationId, locationIdParam: req.params.locationId });
        return res.status(200).json({ errors: [], data: { deleted: true } });
    } catch (error) {
        if (error && error.status && error.errors) return res.status(error.status).json({ errors: error.errors, data: {} });
        return sendError(res, { status: 500, message: 'Error deleting organization location', requestId: req.requestId });
    }
};

const getOrganizerWorkspace = async (req, res) => {
    try {
        const includePast = req.query.includePast === 'true';
        const result = await OrganizerService.getOrganizerWorkspaceService({ userId: req.user.id, includePast });
        return res.status(200).json({ errors: [], data: { organizer: result.organizer, organizations: result.organizations } });
    } catch (error) {
        if (error && error.status && error.errors) return res.status(error.status).json({ errors: error.errors, data: {} });
        return sendError(res, { status: 500, message: 'Error loading organizer workspace', requestId: req.requestId });
    }
};

const getOrganizerReceivedComments = async (req, res) => {
    try {
        const result = await OrganizerService.getOrganizerReceivedCommentsService({ userId: req.user.id, query: req.query });
        return res.status(200).json({ errors: [], data: { elements: result.elements }, metadata: result.metadata });
    } catch (error) {
        if (error && error.status && error.errors) return res.status(error.status).json({ errors: error.errors, data: {} });
        return sendError(res, { status: 500, message: 'Error loading received organizer comments', requestId: req.requestId });
    }
};

const getSessionReservations = async (req, res) => {
    try {
        const result = await OrganizerService.getSessionReservationsService({ userId: req.user.id, sessionId: req.params.sessionId });
        return res.status(200).json({ errors: [], data: result });
    } catch (error) {
        if (error && error.status && error.errors) return res.status(error.status).json({ errors: error.errors, data: {} });
        return sendError(res, { status: 500, message: 'Error loading session reservations', requestId: req.requestId });
    }
};

const createManualBooking = async (req, res) => {
    try {
        const result = await OrganizerService.createManualBookingService({
            userId: req.user.id,
            sessionId: req.params.sessionId,
            booking: req.body,
        });
        return res.status(201).json({ errors: [], data: result });
    } catch (error) {
        if (error && error.status && error.errors) return res.status(error.status).json({ errors: error.errors, data: {} });
        return sendError(res, { status: 500, message: 'Error creating manual booking', requestId: req.requestId });
    }
};

const cancelSession = async (req, res) => {
    try {
        const result = await OrganizerService.cancelSessionService({ userId: req.user.id, sessionId: req.params.sessionId });
        return res.status(200).json({ errors: [], data: { session: result.session } });
    } catch (error) {
        if (error && error.status && error.errors) return res.status(error.status).json({ errors: error.errors, data: {} });
        return sendError(res, { status: 500, message: 'Error cancelling session', requestId: req.requestId });
    }
};

const getOnboardingMeta = async (req, res) => {
    try {
        const result = await OrganizerService.getOnboardingMetaService({ cookies: req.cookies });
        return res.status(200).json({ errors: [], data: { locations: result.locations } });
    } catch (error) {
        if (error && error.status && error.errors) return res.status(error.status).json({ errors: error.errors, data: {} });
        return sendError(res, { status: 500, message: 'Error loading onboarding metadata', requestId: req.requestId });
    }
};

const resendInvite = async (req, res) => {
    try {
        const result = await OrganizerService.resendInviteService({ inviteId: req.params.id, requestingUser: req.user });
        return res.status(200).json({ errors: [], data: { inviteId: result.invite.id, email: result.invite.email, delivery: result.delivery } });
    } catch (error) {
        if (error && error.status && error.errors) return res.status(error.status).json({ errors: error.errors, data: {} });
        return sendError(res, { status: 500, message: 'Error resending invite', requestId: req.requestId });
    }
};

const cancelInvite = async (req, res) => {
    try {
        await OrganizerService.cancelInviteService({ inviteId: req.params.id, requestingUser: req.user });
        return res.status(200).json({ errors: [], data: { deleted: true } });
    } catch (error) {
        if (error && error.status && error.errors) return res.status(error.status).json({ errors: error.errors, data: {} });
        return sendError(res, { status: 500, message: 'Error cancelling invite', requestId: req.requestId });
    }
};

const defaultExport = { createInvite, resendInvite, cancelInvite, resolveInvite, startOnboarding, completeOnboarding, getOnboardingMeta, updateOrganizerProfile, updateOrganization, createOrganizationLocation, updateOrganizationLocation, deleteOrganizationLocation, getOrganizerWorkspace, getOrganizerReceivedComments, getSessionReservations, createManualBooking, cancelSession };

export { createInvite, resendInvite, cancelInvite, resolveInvite, startOnboarding, completeOnboarding, getOnboardingMeta, updateOrganizerProfile, updateOrganization, createOrganizationLocation, updateOrganizationLocation, deleteOrganizationLocation, getOrganizerWorkspace, getOrganizerReceivedComments, getSessionReservations, createManualBooking, cancelSession };
export default defaultExport;
