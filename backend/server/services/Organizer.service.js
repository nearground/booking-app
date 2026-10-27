import { createRequire } from 'node:module';
const require = createRequire(import.meta.url);

const crypto = require('crypto');
const bcrypt = require('bcrypt');

import {
    User,
    Organizer,
    Organization,
    OrganizationInvite,
    Location,
    Experience,
    ScheduledExperience,
    ExperienceReservation,
    ExperienceReservationAttendee,
    ExperienceReservationAnswer,
    Service,
    ScheduledService,
    TicketTier,
    Order,
    OrderItem,
    Comment,
    sequelize,
} from '../models/index.js';
import { validateUserInputs, UserExists } from '../utils/validators.js';
import {
    BCRYPT_CONFIG,
} from '../utils/constants.js';
import { generateNewToken } from '../utils/auth-helpers.js';
import { Op, fn, col, where } from 'sequelize';
import {
    normalizeStoredMediaValue,
    resolveMediaUrl,
} from '../utils/media-storage.js';
import { DEFAULT_TIMEZONE, isValidIanaTimezone, normalizeTimezone } from '../utils/timezone.js';
import { sendNotification } from '../services/Notification.service.js';

const ALLOWED_INVITE_ROLES = new Set(['member', 'admin']);
const MAX_INVITE_EXPIRY_DAYS = 30;
const MAX_ORGANIZER_DESCRIPTION_LENGTH = 2000;
const MAX_ORGANIZATION_NAME_LENGTH = 120;
const MAX_EMAIL_LENGTH = 320;
const INVITE_TOKEN_REGEX = /^[a-f0-9]{48}$/i;
const INVITE_CODE_REGEX = /^[A-Z0-9]{6}$/;
const EMAIL_REGEX = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
const FRONTEND_BASE_URL = String(
    process.env.FRONTEND_BASE_URL || 'http://localhost:8080'
).replace(/\/+$/, '');

const normalizeEmail = (email) => String(email || '').trim().toLowerCase();
const normalizeName = (name) => String(name || '').trim();
const normalizeInviteToken = (token) => String(token || '').trim();
const normalizeInviteCode = (code) => String(code || '').trim().toUpperCase();
const normalizeLocationText = (value) => String(value || '').trim();
const isValidEmail = (email) =>
    Boolean(email) &&
    email.length <= MAX_EMAIL_LENGTH &&
    EMAIL_REGEX.test(email);

const generateInviteCode = () =>
    Math.random().toString(36).slice(2, 8).toUpperCase();

const generateInviteToken = () => crypto.randomBytes(24).toString('hex');
const buildInviteUrl = (token) =>
    `${FRONTEND_BASE_URL}/organizer-signup/invite?token=${encodeURIComponent(
        String(token || '').trim()
    )}`;

const isInviteActive = (invite) => {
    if (!invite) return false;
    if (invite.usedAt) return false;
    if (!invite.expiresAt) return false;
    return new Date(invite.expiresAt).getTime() > Date.now();
};

const findActiveInvite = async ({ inviteToken, inviteCode, email }) => {
    const whereClause = { usedAt: null };

    if (email) {
        whereClause.email = normalizeEmail(email);
    }

    if (inviteToken) {
        whereClause.token = String(inviteToken).trim();
    } else if (inviteCode) {
        whereClause.code = String(inviteCode).trim().toUpperCase();
    } else {
        return null;
    }

    const invite = await OrganizationInvite.findOne({
        where: whereClause,
        include: [{ model: Organization, attributes: ['id', 'name', 'email'] }],
        order: [['createdAt', 'DESC']],
    });

    if (!isInviteActive(invite)) return null;
    return invite;
};

const createInviteService = async ({ organizationId, email, role = 'member', expiresInDays = 7, requestingUser }) => {
    const normalizedEmail = normalizeEmail(email);
    const normalizedRole = String(role || 'member').trim().toLowerCase();
    const parsedOrganizationId = Number(organizationId);
    const parsedExpiresInDays = Math.min(
        MAX_INVITE_EXPIRY_DAYS,
        Math.max(1, Number(expiresInDays) || 7)
    );

    if (!normalizedEmail) throw { status: 400, errors: ['email is required'] };
    if (!isValidEmail(normalizedEmail)) throw { status: 400, errors: ['Invalid email format'] };
    if (!Number.isInteger(parsedOrganizationId)) throw { status: 400, errors: ['organizationId is required'] };
    if (!ALLOWED_INVITE_ROLES.has(normalizedRole)) throw { status: 400, errors: ['role must be either member or admin'] };

    const organization = await Organization.findByPk(parsedOrganizationId);
    if (!organization) throw { status: 404, errors: ['Organization not found'] };

    const membership = await sequelize.models.OrganizationMembers.findOne({
        where: { UserId: requestingUser.id, OrganizationId: parsedOrganizationId, isAdmin: true },
    });

    if (!membership) throw { status: 403, errors: ['Only organization admins can send invites'] };

    const expiresAt = new Date(Date.now() + parsedExpiresInDays * 24 * 60 * 60 * 1000);
    const inviteCode = generateInviteCode();
    const inviteToken = generateInviteToken();

    const invite = await OrganizationInvite.create({
        OrganizationId: parsedOrganizationId,
        invitedByUserId: requestingUser.id,
        email: normalizedEmail,
        code: inviteCode,
        token: inviteToken,
        role: normalizedRole,
        expiresAt,
    });

    let delivery = { sent: false, provider: 'console' };
    try {
        delivery = await sendNotification({
            template: 'organizer-invite',
            to: invite.email,
            payload: {
                organizationName: organization.name,
                inviteCode: invite.code,
                inviteUrl: buildInviteUrl(invite.token),
                expiresAt: invite.expiresAt,
                role: invite.role,
            },
        });
    } catch (_e) {
        delivery = { sent: false, provider: 'console' };
    }

    return {
        invite,
        organization,
        inviteUrl: buildInviteUrl(invite.token),
        delivery,
    };
};

const resendInviteService = async ({ inviteId, requestingUser }) => {
    const parsedId = Number(inviteId);
    if (!Number.isInteger(parsedId)) throw { status: 400, errors: ['inviteId is required'] };

    const invite = await OrganizationInvite.findByPk(parsedId, {
        include: [{ model: Organization, attributes: ['id', 'name', 'email'] }],
    });
    if (!invite) throw { status: 404, errors: ['Invite not found'] };

    if (invite.usedAt) throw { status: 400, errors: ['Invite has already been used'] };
    if (new Date(invite.expiresAt).getTime() <= Date.now()) throw { status: 400, errors: ['Invite has expired'] };

    const membership = await sequelize.models.OrganizationMembers.findOne({
        where: { UserId: requestingUser.id, OrganizationId: invite.OrganizationId, isAdmin: true },
    });
    if (!membership) throw { status: 403, errors: ['Only organization admins can resend invites'] };

    let delivery = { sent: false, provider: 'console' };
    try {
        delivery = await sendNotification({
            template: 'organizer-invite',
            to: invite.email,
            payload: {
                organizationName: invite.Organization.name,
                inviteCode: invite.code,
                inviteUrl: buildInviteUrl(invite.token),
                expiresAt: invite.expiresAt,
                role: invite.role,
            },
        });
    } catch (_e) {
        delivery = { sent: false, provider: 'console' };
    }

    return { invite, delivery };
};

const cancelInviteService = async ({ inviteId, requestingUser }) => {
    const parsedId = Number(inviteId);
    if (!Number.isInteger(parsedId)) throw { status: 400, errors: ['inviteId is required'] };

    const invite = await OrganizationInvite.findByPk(parsedId);
    if (!invite) throw { status: 404, errors: ['Invite not found'] };
    if (invite.usedAt) throw { status: 400, errors: ['Invite has already been used'] };

    const membership = await sequelize.models.OrganizationMembers.findOne({
        where: { UserId: requestingUser.id, OrganizationId: invite.OrganizationId, isAdmin: true },
    });
    if (!membership) throw { status: 403, errors: ['Only organization admins can cancel invites'] };

    await invite.destroy();

    return { deleted: true };
};

const resolveInviteService = async ({ token, code, email }) => {
    const normalizedToken = normalizeInviteToken(token);
    const normalizedCode = normalizeInviteCode(code);
    const normalizedEmail = normalizeEmail(email);

    if (!normalizedToken && !normalizedCode) throw { status: 400, errors: ['token or code is required'] };
    if (normalizedToken && !INVITE_TOKEN_REGEX.test(normalizedToken)) throw { status: 400, errors: ['Invalid invite token format'] };
    if (normalizedCode && !INVITE_CODE_REGEX.test(normalizedCode)) throw { status: 400, errors: ['Invalid invite code format'] };
    if (normalizedEmail && !isValidEmail(normalizedEmail)) throw { status: 400, errors: ['Invalid email format'] };

    const invite = await findActiveInvite({ inviteToken: normalizedToken, inviteCode: normalizedCode, email: normalizedEmail });
    if (!invite) throw { status: 404, errors: ['Invite not found or expired'] };

    return invite;
};

const startOnboardingService = async ({ mode, email, inviteToken, inviteCode }) => {
    const normalizedMode = String(mode || '').trim().toLowerCase();
    const normalizedEmail = normalizeEmail(email);
    const normalizedInviteToken = normalizeInviteToken(inviteToken);
    const normalizedInviteCode = normalizeInviteCode(inviteCode);

    if (!normalizedEmail) throw { status: 400, errors: ['email is required'] };
    if (!isValidEmail(normalizedEmail)) throw { status: 400, errors: ['Invalid email format'] };
    if (!['invite', 'create'].includes(normalizedMode)) throw { status: 400, errors: ['mode must be either invite or create'] };
    if (await UserExists(normalizedEmail)) throw { status: 409, errors: ['A user with this email already exists'] };

    if (normalizedMode === 'invite') {
        if (!normalizedInviteToken && !normalizedInviteCode) throw { status: 400, errors: ['inviteToken or inviteCode is required for invite mode'] };
        if (normalizedInviteToken && !INVITE_TOKEN_REGEX.test(normalizedInviteToken)) throw { status: 400, errors: ['Invalid invite token format'] };
        if (normalizedInviteCode && !INVITE_CODE_REGEX.test(normalizedInviteCode)) throw { status: 400, errors: ['Invalid invite code format'] };

        const invite = await findActiveInvite({ inviteToken: normalizedInviteToken, inviteCode: normalizedInviteCode, email: normalizedEmail });
        if (!invite) throw { status: 404, errors: ['Invite not found or expired'] };

        return { mode: 'invite', email: normalizedEmail, organization: { id: invite.Organization.id, name: invite.Organization.name, email: invite.Organization.email }, role: invite.role, token: invite.token };
    }

    return { mode: 'create', email: normalizedEmail };
};

const completeOnboardingService = async ({ body }) => {
    const transaction = await sequelize.transaction();
    try {
        const {
            mode,
            firstName,
            lastName,
            email,
            username,
            password,
            phoneNumber,
            country,
            organizerDescription,
            inviteToken,
            inviteCode,
            organization,
        } = body;

        const normalizedMode = String(mode || '').trim().toLowerCase();
        const normalizedInviteToken = normalizeInviteToken(inviteToken);
        const normalizedInviteCode = normalizeInviteCode(inviteCode);
        const normalizedOrganizerDescription = organizerDescription ? String(organizerDescription).trim() : null;
        const normalizedEmail = normalizeEmail(email);

        const userPayload = { firstName, lastName, email: normalizedEmail, username, password, phoneNumber, country };
        const validationErrors = await validateUserInputs(userPayload);
        if (validationErrors.length) { await transaction.rollback(); throw { status: 400, errors: validationErrors }; }

        if (!['invite', 'create'].includes(normalizedMode)) { await transaction.rollback(); throw { status: 400, errors: ['mode must be either invite or create'] }; }
        if (!isValidEmail(normalizedEmail)) { await transaction.rollback(); throw { status: 400, errors: ['Invalid email format'] }; }

        if (normalizedOrganizerDescription && normalizedOrganizerDescription.length > MAX_ORGANIZER_DESCRIPTION_LENGTH) { await transaction.rollback(); throw { status: 400, errors: [`organizerDescription exceeds ${MAX_ORGANIZER_DESCRIPTION_LENGTH} characters`] }; }

        const userPasswordHash = await bcrypt.hash(password, BCRYPT_CONFIG.SALT_ROUNDS);

        const user = await User.create({ firstName, lastName, username, email: normalizedEmail, password: userPasswordHash, phoneNumber, country, profilePicture: '', isRegistered: true }, { transaction });

        await Organizer.create({ UserId: user.id, description: normalizedOrganizerDescription }, { transaction });

        let organizationId = null;
        let isAdmin = false;

        if (normalizedMode === 'invite') {
            if (!normalizedInviteToken && !normalizedInviteCode) { await transaction.rollback(); throw { status: 400, errors: ['inviteToken or inviteCode is required for invite mode'] }; }
            if (normalizedInviteToken && !INVITE_TOKEN_REGEX.test(normalizedInviteToken)) { await transaction.rollback(); throw { status: 400, errors: ['Invalid invite token format'] }; }
            if (normalizedInviteCode && !INVITE_CODE_REGEX.test(normalizedInviteCode)) { await transaction.rollback(); throw { status: 400, errors: ['Invalid invite code format'] }; }

            const invite = await findActiveInvite({ inviteToken: normalizedInviteToken, inviteCode: normalizedInviteCode, email: normalizedEmail });
            if (!invite) { await transaction.rollback(); throw { status: 404, errors: ['Invite not found or expired'] }; }

            organizationId = invite.OrganizationId;
            isAdmin = invite.role === 'admin';
            await invite.update({ usedAt: new Date() }, { transaction });
        } else if (normalizedMode === 'create') {
            const orgName = normalizeName(organization?.name || '');
            const orgEmail = normalizeEmail(organization?.email || '');
            const orgUsername = (organization?.organizationUsername || orgName).toLowerCase().replace(/[^a-z0-9]/g, '');
            const locationId = Number(organization?.locationId || organization?.LocationId) || null;
            let selectedLocation = null;

            if (!orgName || !orgEmail) { await transaction.rollback(); throw { status: 400, errors: ['organization name and email are required'] }; }
            if (!orgUsername || orgUsername.length < 3) { await transaction.rollback(); throw { status: 400, errors: ['organization username must be at least 3 characters'] }; }
            if (orgUsername.length > 30) { await transaction.rollback(); throw { status: 400, errors: ['organization username must not exceed 30 characters'] }; }
            if (!/^[a-z0-9]+$/.test(orgUsername)) { await transaction.rollback(); throw { status: 400, errors: ['organization username can only contain lowercase letters and numbers'] }; }
            if (orgName.length > MAX_ORGANIZATION_NAME_LENGTH) { await transaction.rollback(); throw { status: 400, errors: [`organization name exceeds ${MAX_ORGANIZATION_NAME_LENGTH} characters`] }; }
            if (!isValidEmail(orgEmail)) { await transaction.rollback(); throw { status: 400, errors: ['Invalid organization email format'] }; }

            if (locationId) {
                selectedLocation = await Location.findByPk(locationId, { transaction });
                if (!selectedLocation) { await transaction.rollback(); throw { status: 400, errors: ['Invalid locationId'] }; }
                if (selectedLocation.OrganizationId) { await transaction.rollback(); throw { status: 403, errors: ['Selected location is already assigned to another organization'] }; }
            }

            const existingOrganization = await Organization.findOne({ where: where(fn('LOWER', col('name')), orgName.toLowerCase()), transaction });
            if (existingOrganization) { await transaction.rollback(); throw { status: 409, errors: ['An organization with this name already exists'] }; }

            const existingOrgUsername = await Organization.findOne({ where: { organizationUsername: orgUsername }, transaction });
            if (existingOrgUsername) { await transaction.rollback(); throw { status: 409, errors: ['This organization username is already taken'] }; }

            const newOrganization = await Organization.create({ name: orgName, email: orgEmail, organizationUsername: orgUsername, ...(locationId ? { LocationId: locationId } : {}) }, { transaction });

            if (selectedLocation) { await selectedLocation.update({ OrganizationId: newOrganization.id }, { transaction }); }

            organizationId = newOrganization.id;
            isAdmin = true;
        } else {
            await transaction.rollback(); throw { status: 400, errors: ['mode must be either invite or create'] };
        }

        await sequelize.models.OrganizationMembers.create({ UserId: user.id, OrganizationId: organizationId, isAdmin }, { transaction });

        await transaction.commit();

        const token = generateNewToken(user);
        return { user, token, organizationId, isAdmin };
    } catch (error) {
        if (!transaction.finished) await transaction.rollback();
        if (error.name === 'SequelizeUniqueConstraintError' &&
            (error.errors?.some((item) => item.path === 'email') || Object.hasOwn(error.fields || {}, 'email'))) {
            throw {
                status: 409,
                errors: ['A user with this email already exists'],
            };
        }
        throw error;
    }
};

const updateOrganizerProfileService = async ({ userId, description, profilePicture }) => {
    if (description !== undefined && description !== null && String(description).trim().length > MAX_ORGANIZER_DESCRIPTION_LENGTH) {
        throw { status: 400, errors: [`description exceeds ${MAX_ORGANIZER_DESCRIPTION_LENGTH} characters`] };
    }

    const organizer = await Organizer.findOne({ where: { UserId: userId } });
    if (!organizer) throw { status: 404, errors: ['Organizer profile not found'] };

    const user = await User.findByPk(userId);

    await organizer.update({ ...(description !== undefined ? { description: description ? String(description).trim() : null } : {}) });

    if (user && profilePicture !== undefined) {
        const normalizedProfilePicture = normalizeStoredMediaValue(profilePicture);
        if (normalizedProfilePicture && normalizedProfilePicture.length > 512) throw { status: 400, errors: ['profilePicture value is too long'] };
        await user.update({ profilePicture: normalizedProfilePicture });
    }

    return { organizer, user }; 
};

const updateOrganizationService = async ({ userId, organizationIdParam, payload }) => {
    const organizationId = Number(organizationIdParam);
    if (!Number.isInteger(organizationId)) throw { status: 400, errors: ['Invalid organization id'] };

    const membership = await sequelize.models.OrganizationMembers.findOne({ where: { UserId: userId, OrganizationId: organizationId, isAdmin: true } });
    if (!membership) throw { status: 403, errors: ['Only organization admins can edit organization settings'] };

    const organization = await Organization.findByPk(organizationId);
    if (!organization) throw { status: 404, errors: ['Organization not found'] };

    const updatePayload = {};
    const { name, email, locationId } = payload;

    if (name !== undefined) {
        const normalizedName = normalizeName(name);
        if (!normalizedName) throw { status: 400, errors: ['Organization name cannot be empty'] };
        if (normalizedName.length > MAX_ORGANIZATION_NAME_LENGTH) throw { status: 400, errors: [`Organization name cannot exceed ${MAX_ORGANIZATION_NAME_LENGTH} characters`] };

        const duplicateOrganization = await Organization.findOne({ where: { id: { [Op.ne]: organizationId }, [Op.and]: [where(fn('LOWER', col('name')), normalizedName.toLowerCase())] } });
        if (duplicateOrganization) throw { status: 409, errors: ['An organization with this name already exists'] };
        updatePayload.name = normalizedName;
    }

    if (email !== undefined) {
        const normalizedEmail = normalizeEmail(email);
        if (!normalizedEmail) throw { status: 400, errors: ['Organization email is required'] };
        if (!isValidEmail(normalizedEmail)) throw { status: 400, errors: ['Invalid organization email format'] };
        updatePayload.email = normalizedEmail;
    }

    if (locationId !== undefined) {
        const parsedLocationId = Number(locationId);
        if (locationId === null || locationId === '') {
            updatePayload.LocationId = null;
        } else if (!Number.isInteger(parsedLocationId) || parsedLocationId <= 0) {
            throw { status: 400, errors: ['locationId must be a positive integer or null'] };
        } else {
            const location = await Location.findOne({ where: { id: parsedLocationId, [Op.or]: [{ OrganizationId: null }, { OrganizationId: organizationId }] } });
            if (!location) throw { status: 400, errors: ['Invalid locationId for this organization'] };
            if (location.OrganizationId !== organizationId) await location.update({ OrganizationId: organizationId });
            updatePayload.LocationId = parsedLocationId;
        }
    }

    await organization.update(updatePayload);
    return { organization };
};

const createOrganizationLocationService = async ({ userId, organizationIdParam, payload }) => {
    const organizationId = Number(organizationIdParam);
    if (!Number.isInteger(organizationId)) throw { status: 400, errors: ['Invalid organization id'] };

    const membership = await sequelize.models.OrganizationMembers.findOne({ where: { UserId: userId, OrganizationId: organizationId, isAdmin: true } });
    if (!membership) throw { status: 403, errors: ['Only organization admins can create locations'] };

    const organization = await Organization.findByPk(organizationId);
    if (!organization) throw { status: 404, errors: ['Organization not found'] };

    const {
        name,
        country,
        state,
        city,
        street,
        zipCode,
        notes,
        latitude,
        longitude,
        timezone,
    } = payload;

    const normalizedName = normalizeLocationText(name);
    const normalizedCountry = normalizeLocationText(country);
    const normalizedState = normalizeLocationText(state);
    const normalizedCity = normalizeLocationText(city);
    const normalizedStreet = normalizeLocationText(street);
    const normalizedZipCode = normalizeLocationText(zipCode);
    const normalizedNotes = notes === undefined || notes === null ? null : String(notes).trim();
    const normalizedTimezoneInput = String(timezone || '').trim();
    const normalizedTimezone = normalizeTimezone(normalizedTimezoneInput, DEFAULT_TIMEZONE);
    const parsedLatitude = Number(latitude);
    const parsedLongitude = Number(longitude);

    if (!normalizedName || !normalizedCountry || !normalizedState || !normalizedCity || !normalizedStreet || !normalizedZipCode) {
        throw { status: 400, errors: ['name, country, state, city, street, and zipCode are required'] };
    }

    if (!Number.isFinite(parsedLatitude) || parsedLatitude < -90 || parsedLatitude > 90) throw { status: 400, errors: ['latitude must be a number between -90 and 90'] };
    if (!Number.isFinite(parsedLongitude) || parsedLongitude < -180 || parsedLongitude > 180) throw { status: 400, errors: ['longitude must be a number between -180 and 180'] };
    if (normalizedTimezoneInput && !isValidIanaTimezone(normalizedTimezoneInput)) throw { status: 400, errors: ['timezone must be a valid IANA timezone (for example, America/New_York)'] };

    const location = await Location.create({ name: normalizedName, country: normalizedCountry, state: normalizedState, city: normalizedCity, street: normalizedStreet, zipCode: normalizedZipCode, notes: normalizedNotes, timezone: normalizedTimezone, coordinates: { type: 'Point', coordinates: [parsedLongitude, parsedLatitude] }, OrganizationId: organizationId });

    return { location };
};

const updateOrganizationLocationService = async ({ userId, organizationIdParam, locationIdParam, payload }) => {
    const organizationId = Number(organizationIdParam);
    const locationId = Number(locationIdParam);
    if (!Number.isInteger(organizationId)) throw { status: 400, errors: ['Invalid organization id'] };
    if (!Number.isInteger(locationId)) throw { status: 400, errors: ['Invalid location id'] };

    const membership = await sequelize.models.OrganizationMembers.findOne({ where: { UserId: userId, OrganizationId: organizationId, isAdmin: true } });
    if (!membership) throw { status: 403, errors: ['Only organization admins can update locations'] };

    const location = await Location.findOne({ where: { id: locationId, OrganizationId: organizationId } });
    if (!location) throw { status: 404, errors: ['Location not found'] };

    const { name, country, state, city, street, zipCode, notes, latitude, longitude, timezone } = payload;

    const updatePayload = {};

    if (name !== undefined) {
        const normalizedName = normalizeLocationText(name);
        if (!normalizedName) throw { status: 400, errors: ['Location name cannot be empty'] };
        updatePayload.name = normalizedName;
    }
    if (country !== undefined) {
        const normalizedCountry = normalizeLocationText(country);
        if (!normalizedCountry) throw { status: 400, errors: ['Country cannot be empty'] };
        updatePayload.country = normalizedCountry;
    }
    if (state !== undefined) {
        const normalizedState = normalizeLocationText(state);
        if (!normalizedState) throw { status: 400, errors: ['State cannot be empty'] };
        updatePayload.state = normalizedState;
    }
    if (city !== undefined) {
        const normalizedCity = normalizeLocationText(city);
        if (!normalizedCity) throw { status: 400, errors: ['City cannot be empty'] };
        updatePayload.city = normalizedCity;
    }
    if (street !== undefined) {
        const normalizedStreet = normalizeLocationText(street);
        if (!normalizedStreet) throw { status: 400, errors: ['Street cannot be empty'] };
        updatePayload.street = normalizedStreet;
    }
    if (zipCode !== undefined) {
        const normalizedZipCode = normalizeLocationText(zipCode);
        if (!normalizedZipCode) throw { status: 400, errors: ['Zip code cannot be empty'] };
        updatePayload.zipCode = normalizedZipCode;
    }
    if (notes !== undefined) {
        updatePayload.notes = notes === null ? null : String(notes).trim();
    }
    if (timezone !== undefined) {
        const normalizedTimezoneInput = String(timezone || '').trim();
        if (normalizedTimezoneInput && !isValidIanaTimezone(normalizedTimezoneInput)) throw { status: 400, errors: ['timezone must be a valid IANA timezone'] };
        updatePayload.timezone = normalizeTimezone(normalizedTimezoneInput, DEFAULT_TIMEZONE);
    }
    if (latitude !== undefined && longitude !== undefined) {
        const parsedLatitude = Number(latitude);
        const parsedLongitude = Number(longitude);
        if (!Number.isFinite(parsedLatitude) || parsedLatitude < -90 || parsedLatitude > 90) throw { status: 400, errors: ['latitude must be a number between -90 and 90'] };
        if (!Number.isFinite(parsedLongitude) || parsedLongitude < -180 || parsedLongitude > 180) throw { status: 400, errors: ['longitude must be a number between -180 and 180'] };
        updatePayload.coordinates = { type: 'Point', coordinates: [parsedLongitude, parsedLatitude] };
    }

    await location.update(updatePayload);
    return { location };
};

const deleteOrganizationLocationService = async ({ userId, organizationIdParam, locationIdParam }) => {
    const organizationId = Number(organizationIdParam);
    const locationId = Number(locationIdParam);
    if (!Number.isInteger(organizationId)) throw { status: 400, errors: ['Invalid organization id'] };
    if (!Number.isInteger(locationId)) throw { status: 400, errors: ['Invalid location id'] };

    const membership = await sequelize.models.OrganizationMembers.findOne({ where: { UserId: userId, OrganizationId: organizationId, isAdmin: true } });
    if (!membership) throw { status: 403, errors: ['Only organization admins can delete locations'] };

    const location = await Location.findOne({ where: { id: locationId, OrganizationId: organizationId } });
    if (!location) throw { status: 404, errors: ['Location not found'] };

    const experienceCount = await Experience.count({ where: { LocationId: locationId } });
    const serviceCount = await Service.count({ where: { LocationId: locationId } });
    if (experienceCount > 0 || serviceCount > 0) {
        throw { status: 409, errors: ['Cannot delete a location that is assigned to experiences or services. Reassign them first.'] };
    }

    const orgUsingAsHq = await Organization.findOne({ where: { LocationId: locationId } });
    if (orgUsingAsHq) {
        throw { status: 409, errors: ['Cannot delete a location that is used as an organization headquarters. Change the HQ first.'] };
    }

    await location.destroy();
    return { deleted: true };
};

const getOrganizerWorkspaceService = async ({ userId, includePast = false }) => {
    const organizer = await Organizer.findOne({ where: { UserId: userId } });
    if (!organizer) throw { status: 404, errors: ['Organizer profile not found'] };

    const scheduledExperienceWhere = includePast ? {} : { dateTime: { [Op.gte]: new Date() } };

    const organizations = await Organization.findAll({
        include: [
            {
                model: User,
                as: 'Member',
                attributes: ['id', 'firstName', 'lastName', 'email', 'profilePicture'],
                through: { attributes: ['isAdmin'] },
                where: { id: userId },
                required: true,
            },
            {
                model: Experience,
                as: 'Experiences',
                required: false,
                include: [
                    { model: User, as: 'Organizers', attributes: ['id', 'firstName', 'lastName', 'email', 'profilePicture'], through: { attributes: [] }, required: false },
                    { model: ScheduledExperience, as: 'ScheduledExperiences', required: false, where: scheduledExperienceWhere, limit: includePast ? 50 : 12, order: [['dateTime', includePast ? 'DESC' : 'ASC']] },
                    { model: TicketTier, required: false },
                ],
            },
            {
                model: Service,
                as: 'Services',
                required: false,
                include: [
                    { model: User, as: 'Organizers', attributes: ['id', 'firstName', 'lastName', 'email', 'profilePicture'], through: { attributes: [] }, required: false },
                    { model: ScheduledService, as: 'ScheduledServices', required: false, where: { dateTime: { [Op.gte]: new Date() } }, limit: 12, order: [['dateTime', 'ASC']] },
                ],
            },
            { model: Location, required: false },
            { model: Location, as: 'Locations', required: false },
        ],
        order: [['name', 'ASC']],
    });

    const organizationIds = organizations.map((organization) => organization.id);
    const members = organizationIds.length ? await sequelize.models.OrganizationMembers.findAll({ where: { OrganizationId: { [Op.in]: organizationIds } }, include: [{ model: User, attributes: ['id', 'firstName', 'lastName', 'email', 'profilePicture'] }] }) : [];
    const invites = organizationIds.length
        ? await OrganizationInvite.findAll({
            where: { OrganizationId: { [Op.in]: organizationIds }, usedAt: null },
            include: [{ model: User, as: 'InvitedBy', attributes: ['id', 'firstName', 'lastName', 'email'] }],
            order: [['createdAt', 'DESC']],
        })
        : [];

    const membersByOrganization = members.reduce((accumulator, member) => {
        if (!accumulator[member.OrganizationId]) accumulator[member.OrganizationId] = [];
        accumulator[member.OrganizationId].push({ id: member.User?.id, firstName: member.User?.firstName, lastName: member.User?.lastName, email: member.User?.email, profilePicture: resolveMediaUrl(member.User?.profilePicture), isAdmin: Boolean(member.isAdmin) });
        return accumulator;
    }, {});

    const pendingInvitesByOrganization = invites.reduce((accumulator, invite) => {
        if (!isInviteActive(invite)) return accumulator;

        if (!accumulator[invite.OrganizationId]) accumulator[invite.OrganizationId] = [];
        accumulator[invite.OrganizationId].push({
            id: invite.id,
            email: invite.email,
            code: invite.code,
            role: invite.role,
            expiresAt: invite.expiresAt,
            createdAt: invite.createdAt,
            inviteUrl: buildInviteUrl(invite.token),
            invitedBy: invite.InvitedBy
                ? {
                    id: invite.InvitedBy.id,
                    firstName: invite.InvitedBy.firstName,
                    lastName: invite.InvitedBy.lastName,
                    email: invite.InvitedBy.email,
                }
                : null,
        });
        return accumulator;
    }, {});

    const serializedOrganizations = organizations.map((organization) => {
        const serialized = organization.toJSON();

        const normalizedExperiences = (serialized.Experiences || []).map((experience) => ({
            ...experience,
            thumbnail: resolveMediaUrl(experience.thumbnail),
            images: Array.isArray(experience.images) ? experience.images.map((image) => resolveMediaUrl(image)).filter(Boolean) : [],
            Organizers: (experience.Organizers || []).map((organizerMember) => ({ ...organizerMember, profilePicture: resolveMediaUrl(organizerMember.profilePicture) })),
        }));

        const normalizedServices = (serialized.Services || []).map((service) => ({
            ...service,
            thumbnail: resolveMediaUrl(service.thumbnail),
            images: Array.isArray(service.images) ? service.images.map((image) => resolveMediaUrl(image)).filter(Boolean) : [],
            Organizers: (service.Organizers || []).map((organizerMember) => ({ ...organizerMember, profilePicture: resolveMediaUrl(organizerMember.profilePicture) })),
        }));

        return {
            ...serialized,
            Experiences: normalizedExperiences,
            Services: normalizedServices,
            members: membersByOrganization[organization.id] || [],
            pendingInvites: pendingInvitesByOrganization[organization.id] || [],
        };
    });

    return { organizer, organizations: serializedOrganizations };
};

const getOrganizerReceivedCommentsService = async ({ userId, query }) => {
    const organizer = await Organizer.findOne({ where: { UserId: userId }, attributes: ['id'] });
    if (!organizer) throw { status: 404, errors: ['Organizer profile not found'] };

    const targetType = String(query.targetType || 'all').trim().toLowerCase();
    const validTargetTypes = new Set(['all', 'organizer', 'experience']);
    if (!validTargetTypes.has(targetType)) throw { status: 400, errors: ['targetType must be one of: all, organizer, experience'] };

    const currentPage = Math.max(1, Number.parseInt(query.currentPage, 10) || 1);
    const requestedPageSize = Number.parseInt(query.pageSize, 10) || 10;
    const pageSize = Math.min(50, Math.max(5, requestedPageSize));
    const sortType = String(query.sortType || 'newest').trim().toLowerCase();
    const validSortTypes = new Set(['newest', 'rating_desc', 'rating_asc']);
    if (!validSortTypes.has(sortType)) throw { status: 400, errors: ['sortType must be one of: newest, rating_desc, rating_asc'] };

    const userWithOrganizedExperiences = await User.findByPk(userId, { attributes: ['id'], include: [{ model: Experience, as: 'OrganizedExperiences', attributes: ['id', 'title'], through: { attributes: [] }, required: false }] });
    const organizedExperiences = userWithOrganizedExperiences?.OrganizedExperiences || [];
    const organizedExperienceIds = organizedExperiences.map((experience) => experience.id);
    const experienceTitleById = organizedExperiences.reduce((accumulator, experience) => { accumulator[experience.id] = experience.title || ''; return accumulator; }, {});

    const commentWhereConditions = [];
    if (targetType === 'all' || targetType === 'organizer') commentWhereConditions.push({ CommentableType: 'Organizer', CommentableId: organizer.id });
    if ((targetType === 'all' || targetType === 'experience') && organizedExperienceIds.length > 0) commentWhereConditions.push({ CommentableType: 'Experience', CommentableId: { [Op.in]: organizedExperienceIds } });

    if (commentWhereConditions.length === 0) return { elements: [], metadata: { currentPage, pageSize, totalItems: 0, totalPages: 0, hasNext: false } };

    const commentWhere = commentWhereConditions.length === 1 ? commentWhereConditions[0] : { [Op.or]: commentWhereConditions };
    const offset = (currentPage - 1) * pageSize;
    const order = sortType === 'rating_desc' ? [['stars', 'DESC'], ['createdAt', 'DESC']] : sortType === 'rating_asc' ? [['stars', 'ASC'], ['createdAt', 'DESC']] : [['createdAt', 'DESC']];

    const commentsResult = await Comment.findAndCountAll({ where: commentWhere, include: [{ model: User, attributes: ['firstName', 'city', 'country', 'profilePicture'] }], order, limit: pageSize, offset, attributes: ['id', 'CommentableId', 'CommentableType', 'stars', 'title', 'comment', 'anonymity', 'createdAt', 'UserId', 'ParentId', 'repliesDisabled', 'repliesCount'] });

    const elements = commentsResult.rows.map((commentRecord) => {
        const isOrganizerTarget = commentRecord.CommentableType === 'Organizer';
        const isFullyAnonymous = Number(commentRecord.anonymity) === 0;
        return {
            id: commentRecord.id,
            stars: commentRecord.stars,
            title: commentRecord.title,
            comment: commentRecord.comment,
            anonymity: commentRecord.anonymity,
            createdAt: commentRecord.createdAt,
            UserId: commentRecord.UserId,
            ParentId: commentRecord.ParentId,
            target: { type: isOrganizerTarget ? 'organizer' : 'experience', id: commentRecord.CommentableId, name: isOrganizerTarget ? 'Your Organizer Profile' : experienceTitleById[commentRecord.CommentableId] || 'Experience' },
            commenter: isFullyAnonymous ? { firstName: '', city: '', country: '', profilePicture: '' } : { firstName: commentRecord.User?.firstName || '', city: commentRecord.User?.city || '', country: commentRecord.User?.country || '', profilePicture: resolveMediaUrl(commentRecord.User?.profilePicture) },
            repliesDisabled: commentRecord.repliesDisabled,
            repliesCount: commentRecord.repliesCount,
        };
    });

    const totalItems = Number(commentsResult.count || 0);
    const totalPages = totalItems > 0 ? Math.ceil(totalItems / pageSize) : 0;

    return { elements, metadata: { currentPage, pageSize, totalItems, totalPages, hasNext: currentPage < totalPages } };
};

const getOnboardingMetaService = async ({ cookies }) => {
    const token = cookies?._token;
    const { validateToken } = await import('../utils/auth-helpers.js');
    const decodedToken = token ? validateToken(token) : false;

    let locationWhere = { OrganizationId: null };
    if (decodedToken?.id) {
        const memberships = await sequelize.models.OrganizationMembers.findAll({ where: { UserId: decodedToken.id }, attributes: ['OrganizationId'] });
        const organizationIds = memberships.map((membership) => Number(membership.OrganizationId)).filter((organizationId) => Number.isInteger(organizationId));
        if (organizationIds.length > 0) locationWhere = { OrganizationId: { [Op.in]: organizationIds } };
    }

    const locations = await Location.findAll({ where: locationWhere, attributes: ['id', 'name', 'city', 'state', 'country', 'street', 'zipCode', 'timezone', 'coordinates'], order: [['country', 'ASC'], ['state', 'ASC'], ['city', 'ASC']], limit: 300 });

    return { locations };
};

const getSessionReservationsService = async ({ userId, sessionId }) => {
    const parsedSessionId = Number(sessionId);
    if (!Number.isInteger(parsedSessionId)) throw { status: 400, errors: ['Invalid session id'] };

    const scheduledExperience = await ScheduledExperience.findByPk(parsedSessionId, {
        include: [
            {
                model: Experience,
                attributes: ['id', 'title', 'capacity', 'duration', 'OrganizationId'],
                include: [
                    { model: Organization, attributes: ['id', 'name'] },
                    { model: TicketTier, attributes: ['id', 'title', 'price'] },
                ],
            },
        ],
    });

    if (!scheduledExperience) throw { status: 404, errors: ['Session not found'] };

    const organizationId = scheduledExperience.Experience?.OrganizationId;
    if (!organizationId) throw { status: 404, errors: ['Session not found'] };

    const membership = await sequelize.models.OrganizationMembers.findOne({
        where: { UserId: userId, OrganizationId: organizationId },
    });
    if (!membership) throw { status: 403, errors: ['You do not have access to this session'] };

    const reservations = await ExperienceReservation.findAll({
        where: { ScheduledExperienceId: parsedSessionId },
        include: [
            {
                model: sequelize.models.ExperienceReservationAttendee,
                as: 'Attendees',
                include: [
                    { model: TicketTier, attributes: ['id', 'title', 'price'] },
                ],
            },
            {
                model: ExperienceReservationAnswer,
                as: 'ReservationAnswers',
                attributes: ['questionKey', 'answerText'],
            },
        ],
        order: [['createdAt', 'DESC']],
    });

    const serializedReservations = reservations.map((reservation) => {
        const attendeesByTier = {};
        (reservation.Attendees || []).forEach((attendee) => {
            const tierName = attendee.TicketTier?.title || 'General';
            const tierPrice = attendee.TicketTier?.price || 0;
            const tierKey = attendee.TicketTierId || 'general';
            if (!attendeesByTier[tierKey]) {
                attendeesByTier[tierKey] = { tierName, tierPrice, count: 0 };
            }
            attendeesByTier[tierKey].count += 1;
        });

        return {
            id: reservation.id,
            confirmationCode: reservation.confirmationCode,
            billingName: reservation.billingName,
            dayOfPhone: reservation.dayOfPhone,
            billingEmail: reservation.billingEmail,
            status: reservation.status,
            numberOfAttendees: reservation.numberOfAttendees,
            totalPrice: reservation.totalPrice,
            hotelName: reservation.hotelName,
            comments: reservation.comments,
            specialRequests: reservation.specialRequests,
            createdAt: reservation.createdAt,
            ticketBreakdown: Object.values(attendeesByTier),
            reservationAnswers: (reservation.ReservationAnswers || []).map((answer) => ({
                questionKey: answer.questionKey,
                answerText: answer.answerText,
            })),
        };
    });

    return {
        session: {
            id: scheduledExperience.id,
            dateTime: scheduledExperience.dateTime,
            endDateTime: scheduledExperience.endDateTime,
            capacity: scheduledExperience.capacity,
            availableSpots: scheduledExperience.availableSpots,
            status: scheduledExperience.status,
            experienceTitle: scheduledExperience.Experience?.title || '',
            experienceDuration: scheduledExperience.Experience?.duration || null,
            organizationName: scheduledExperience.Experience?.Organization?.name || '',
            ticketTiers: (scheduledExperience.Experience?.TicketTiers || []).map((tier) => ({
                id: tier.id,
                name: tier.title,
                price: tier.price,
            })),
        },
        reservations: serializedReservations,
    };
};

const createManualBookingService = async ({ userId, sessionId, booking }) => {
    const parsedSessionId = Number(sessionId);
    if (!Number.isInteger(parsedSessionId) || parsedSessionId < 1) {
        throw { status: 400, errors: ['Invalid session id'] };
    }

    const fullName = normalizeName(booking?.fullName);
    const email = normalizeEmail(booking?.email);
    const phone = String(booking?.phone || '').trim();
    const contactMethod = String(booking?.contactMethod || '').trim().toLowerCase();
    const paymentMethod = String(booking?.paymentMethod || '').trim().toLowerCase();
    const ticketSelections = Array.isArray(booking?.ticketSelections) ? booking.ticketSelections : [];

    if (!fullName || fullName.length > 120) {
        throw { status: 400, errors: ['A valid attendee name is required'] };
    }
    if (email && !isValidEmail(email)) {
        throw { status: 400, errors: ['A valid email address is required'] };
    }
    if (email && email.length > MAX_EMAIL_LENGTH) {
        throw { status: 400, errors: ['A valid email address is required'] };
    }
    if (!['email', 'sms', 'whatsapp'].includes(contactMethod)) {
        throw { status: 400, errors: ['contactMethod must be email, sms, or whatsapp'] };
    }
    if (contactMethod === 'email' && !email) {
        throw { status: 400, errors: ['An email address is required for email delivery'] };
    }
    const phoneDigits = phone.replace(/\D/g, '');
    if (contactMethod !== 'email' && (phoneDigits.length < 7 || phoneDigits.length > 15 || phone.length > 30)) {
        throw { status: 400, errors: ['A phone number is required for phone delivery'] };
    }
    if (!['online', 'in_person'].includes(paymentMethod)) {
        throw { status: 400, errors: ['paymentMethod must be online or in_person'] };
    }
    if (!ticketSelections.length || ticketSelections.length > 20) {
        throw { status: 400, errors: ['At least one attendee is required'] };
    }

    const transaction = await sequelize.transaction();
    try {
        const scheduledExperience = await ScheduledExperience.findByPk(parsedSessionId, {
            include: [
                {
                    model: Experience,
                    include: [
                        { model: Organization, attributes: ['id', 'name'] },
                        { model: TicketTier },
                    ],
                },
            ],
            transaction,
            lock: transaction.LOCK?.UPDATE,
        });
        if (!scheduledExperience) throw { status: 404, errors: ['Session not found'] };

        const experience = scheduledExperience.Experience;
        const organizationId = experience?.OrganizationId;
        if (!organizationId) throw { status: 404, errors: ['Session not found'] };

        const membership = await sequelize.models.OrganizationMembers.findOne({
            where: { UserId: userId, OrganizationId: organizationId },
            transaction,
        });
        if (!membership) throw { status: 403, errors: ['You do not have access to this session'] };

        if (scheduledExperience.status === 'cancelled' || scheduledExperience.status === 'completed' ||
            new Date(scheduledExperience.dateTime).getTime() <= Date.now()) {
            throw { status: 400, errors: ['This session is not available for booking'] };
        }

        const availableTiers = experience.TicketTiers || [];
        const tierMap = new Map(availableTiers.map((tier) => [Number(tier.id), tier]));
        let attendeeCount = 0;
        let totalCents = 0;
        const normalizedSelections = ticketSelections.map((selection) => {
            const quantity = Number(selection?.quantity);
            if (!Number.isInteger(quantity) || quantity < 1) {
                throw { status: 400, errors: ['Ticket quantities must be positive whole numbers'] };
            }
            attendeeCount += quantity;
            if (attendeeCount > 20) {
                throw { status: 400, errors: ['A manual booking can include at most 20 attendees'] };
            }

            if (selection.ticketTierId == null && availableTiers.length === 0) {
                return { ticketTierId: null, quantity, unitPrice: 0 };
            }

            const ticketTierId = Number(selection.ticketTierId);
            const ticketTier = tierMap.get(ticketTierId);
            if (!Number.isInteger(ticketTierId) || !ticketTier) {
                throw { status: 400, errors: ['A selected ticket type is not available for this experience'] };
            }
            const unitPrice = Number(ticketTier.price);
            if (!Number.isFinite(unitPrice) || unitPrice < 0) {
                throw { status: 400, errors: ['Ticket prices are invalid'] };
            }
            totalCents += Math.round(unitPrice * 100) * quantity;
            return { ticketTierId, quantity, unitPrice };
        });

        if (attendeeCount > Number(scheduledExperience.availableSpots || 0)) {
            throw { status: 409, errors: ['Not enough available spots'] };
        }

        if (!Number.isSafeInteger(totalCents) || totalCents > 9999999999) {
            throw { status: 400, errors: ['The booking total is too high'] };
        }

        const totalAmount = totalCents / 100;
        const confirmationCode = `MAN-${crypto.randomBytes(6).toString('hex').toUpperCase()}`;
        const reservation = await ExperienceReservation.create({
            confirmationCode,
            numberOfAttendees: attendeeCount,
            totalPrice: totalAmount,
            status: 'pending',
            billingName: fullName,
            billingEmail: email || null,
            billingAddress: null,
            billingCity: null,
            billingState: null,
            billingPostalCode: null,
            dayOfPhone: phone || null,
            ScheduledExperienceId: parsedSessionId,
            CustomerId: null,
        }, { transaction });

        await ExperienceReservationAttendee.bulkCreate(
            normalizedSelections.flatMap((selection) =>
                Array.from({ length: selection.quantity }, () => ({
                    ExperienceReservationId: reservation.id,
                    TicketTierId: selection.ticketTierId,
                    status: 'active',
                }))
            ),
            { transaction }
        );

        const order = await Order.create({
            CustomerId: null,
            CartId: null,
            status: 'pending',
            currency: 'USD',
            subtotalAmount: totalAmount,
            taxAmount: 0,
            discountAmount: 0,
            totalAmount,
            paymentMethod,
            mainContactName: fullName,
            mainContactPhone: phone || null,
            mainContactEmail: email || null,
            metadata: { registrationType: 'manual', contactMethod },
        }, { transaction });

        const unitPrice = attendeeCount ? totalAmount / attendeeCount : 0;
        await OrderItem.create({
            OrderId: order.id,
            ProductType: 'Experience',
            ProductId: experience.id,
            ExperienceReservationId: reservation.id,
            description: experience.title,
            unitPrice,
            quantity: attendeeCount,
            totalPrice: totalAmount,
            metadata: {
                confirmationCode,
                ScheduledExperienceId: parsedSessionId,
                ticketSelections: normalizedSelections.map(({ ticketTierId, quantity, unitPrice: price }) => ({
                    ticketTierId,
                    quantity,
                    unitPrice: price,
                })),
            },
        }, { transaction });

        await transaction.commit();

        let delivery = { status: 'manual', provider: null };
        if (contactMethod === 'email') {
            try {
                const notification = await sendNotification({
                    template: 'manual-booking-details',
                    to: email,
                    payload: {
                        mainContactName: fullName,
                        orderNumber: order.orderNumber,
                        confirmationCode,
                        experienceTitle: experience.title,
                        sessionDateTime: scheduledExperience.dateTime,
                        totalAmount,
                        paymentMethod,
                    },
                });
                delivery = {
                    status: notification.sent && !['console', 'disabled'].includes(notification.provider) ? 'sent' : 'failed',
                    provider: notification.provider,
                };
            } catch (_error) {
                delivery = { status: 'failed', provider: null };
            }
        }

        return {
            orderNumber: order.orderNumber,
            orderStatus: order.status,
            confirmationCode,
            experienceTitle: experience.title,
            sessionDateTime: scheduledExperience.dateTime,
            totalAmount,
            attendeeCount,
            paymentMethod,
            contactMethod,
            phone: phone || null,
            email: email || null,
            delivery,
        };
    } catch (error) {
        if (!transaction.finished) await transaction.rollback();
        if (error?.name === 'SequelizeUniqueConstraintError') {
            throw { status: 409, errors: ['Could not create a unique booking code. Please try again.'] };
        }
        if (error?.message?.includes('Not enough available spots')) {
            throw { status: 409, errors: ['Not enough available spots'] };
        }
        throw error;
    }
};

const cancelSessionService = async ({ userId, sessionId }) => {
    const parsedSessionId = Number(sessionId);
    if (!Number.isInteger(parsedSessionId)) throw { status: 400, errors: ['Invalid session id'] };

    const scheduledExperience = await ScheduledExperience.findByPk(parsedSessionId, {
        include: [
            {
                model: Experience,
                attributes: ['id', 'OrganizationId'],
            },
        ],
    });

    if (!scheduledExperience) throw { status: 404, errors: ['Session not found'] };

    const organizationId = scheduledExperience.Experience?.OrganizationId;
    if (!organizationId) throw { status: 404, errors: ['Session not found'] };

    const membership = await sequelize.models.OrganizationMembers.findOne({
        where: { UserId: userId, OrganizationId: organizationId, isAdmin: true },
    });
    if (!membership) throw { status: 403, errors: ['Only organization admins can cancel sessions'] };

    if (scheduledExperience.status === 'cancelled') {
        throw { status: 400, errors: ['Session is already cancelled'] };
    }

    const transaction = await sequelize.transaction();
    try {
        await scheduledExperience.update({ status: 'cancelled' }, { transaction });

        const reservations = await ExperienceReservation.findAll({
            where: {
                ScheduledExperienceId: parsedSessionId,
                status: { [Op.notIn]: ['cancelled'] },
            },
            transaction,
        });

        for (const reservation of reservations) {
            await reservation.update({ status: 'cancelled' }, { transaction });
        }

        await transaction.commit();
        return { session: scheduledExperience };
    } catch (error) {
        await transaction.rollback();
        throw error;
    }
};

export {
    createInviteService,
    resendInviteService,
    cancelInviteService,
    resolveInviteService,
    startOnboardingService,
    completeOnboardingService,
    updateOrganizerProfileService,
    updateOrganizationService,
    createOrganizationLocationService,
    updateOrganizationLocationService,
    deleteOrganizationLocationService,
    getOrganizerWorkspaceService,
    getOrganizerReceivedCommentsService,
    getOnboardingMetaService,
    getSessionReservationsService,
    createManualBookingService,
    cancelSessionService,
};
