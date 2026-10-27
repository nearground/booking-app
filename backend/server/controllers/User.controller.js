import { createRequire } from 'node:module';
const require = createRequire(import.meta.url);

import modelRegistry1 from '../models/index.js';
import { validateUserInputs } from '../utils/validators.js';
import { generateNewToken, validateToken } from '../utils/auth-helpers.js';
const crypto = require('crypto');

import {
    USER_CREATION_MESSAGES,
    HTTP_RESPONSE_COOKIE_CONFIG,
    CSRF_COOKIE_CONFIG,
} from '../utils/constants.js';

import UserService from '../services/User.service.js';
import { mergeGuestCart } from '../services/Cart.service.js';
import {
    normalizeStoredMediaValue,
    resolveMediaUrl,
} from '../utils/media-storage.js';
import { sendError } from '../utils/http-response.js';

const { User, Organizer, Organization, PasswordReset } = modelRegistry1;

const PHONE_NUMBER_REGEX = /^\+?[0-9()\-\s]{7,20}$/;
const DATE_OF_BIRTH_REGEX = /^\d{4}-\d{2}-\d{2}$/;

const buildCsrfCookieOptions = () => ({
    maxAge: CSRF_COOKIE_CONFIG.MAX_AGE,
    httpOnly: CSRF_COOKIE_CONFIG.HTTP_ONLY,
    secure: CSRF_COOKIE_CONFIG.SECURE,
    sameSite: CSRF_COOKIE_CONFIG.SAME_SITE,
    ...(CSRF_COOKIE_CONFIG.DOMAIN
        ? { domain: CSRF_COOKIE_CONFIG.DOMAIN }
        : {}),
});

const isValidDateOnly = (dateString) => {
    if (!DATE_OF_BIRTH_REGEX.test(dateString)) {
        return false;
    }

    const parsedDate = new Date(`${dateString}T00:00:00.000Z`);
    if (Number.isNaN(parsedDate.getTime())) {
        return false;
    }

    return parsedDate.toISOString().slice(0, 10) === dateString;
};

const registerUser = async (req, res) => {
    try {
        const errorsList = await validateUserInputs(req.body);
        if (errorsList.length > 0) {
            return res.status(400).json({
                errors: errorsList,
                data: { status: 'User not created' },
            });
        }

        try {
            await UserService.createUser(req.body);
            if (typeof UserService.startEmailVerification === 'function') {
                try { await UserService.startEmailVerification(req.body.email); } catch (_error) { /* allow registration retry via resend */ }
            }
            return res.status(201).json({
                errors: [],
                data: { status: USER_CREATION_MESSAGES.SUCCESS },
            });
        } catch (err) {
            // eslint-disable-next-line no-console
            console.error('Error while creating user', err && err.message ? err.message : err);
            return sendError(res, {
                status: err.status || 500,
                message: err.message || 'Error while creating user',
                data: { status: USER_CREATION_MESSAGES.FAILED },
                requestId: req.requestId,
            });
        }
    } catch (error) {
        // eslint-disable-next-line no-console
        console.error('A technical error has occurred', error);
        return sendError(res, {
            status: 500,
            message: 'A technical error has occurred',
            data: { status: 'User not created' },
            requestId: req.requestId,
        });
    }
};

/**
 * Handles user login, including token generation and validation.
 *
 * @param {Object} req - The request object containing login credentials.
 * @param {Object} res - The response object used to send back the HTTP response.
 * @returns {Promise} A promise that resolves to the HTTP response with either a token or an error message.
 */
const loginUser = async (req, res) => {
    const cookieOptions = {
        maxAge: HTTP_RESPONSE_COOKIE_CONFIG.MAX_AGE,
        httpOnly: HTTP_RESPONSE_COOKIE_CONFIG.HTTP_ONLY,
        secure: HTTP_RESPONSE_COOKIE_CONFIG.SECURE,
        sameSite: HTTP_RESPONSE_COOKIE_CONFIG.SAME_SITE,
        ...(HTTP_RESPONSE_COOKIE_CONFIG.DOMAIN
            ? { domain: HTTP_RESPONSE_COOKIE_CONFIG.DOMAIN }
            : {}),
    };

    try {
        const { username, password, organizationUsername } = req.body;
        if (!username || !password) {
            return sendError(res, {
                status: 400,
                message: 'Username and password are required',
                requestId: req.requestId,
            });
        }
        const existingToken = req.cookies._token ?? '';
        const { token, user } = await UserService.authenticateUser({
            username,
            password,
            organizationUsername: organizationUsername || undefined,
            existingToken,
        });
        await mergeGuestCart({ sessionToken: req.cookies?._cart_session, customerId: user.id });

        res.cookie('_token', token, cookieOptions);
        res.cookie(
            CSRF_COOKIE_CONFIG.NAME,
            req.cookies?.[CSRF_COOKIE_CONFIG.NAME] || crypto.randomBytes(32).toString('hex'),
            buildCsrfCookieOptions()
        );
        return res.status(200).json({ data: { token }, errors: [] });
    } catch (error) {
        // eslint-disable-next-line no-console
        console.error('An error occurred during the login process', error);
        return sendError(res, {
            status: error.status || 500,
            message: error.message || 'An error occurred during the login process',
            requestId: req.requestId,
        });
    }
};

/**
 * Logs out the user by clearing the JWT token cookie.
 *
 * @param {Object} _req - The request object from Express.js, which is not used in this function.
 * @param {Object} res - The response object from Express.js used to send back the desired HTTP response.
 * @returns {Object} The HTTP response with a message indicating that the user has been logged out successfully.
 */
const logoutUser = (_req, res) => {
    res.clearCookie('_token');
    res.clearCookie(CSRF_COOKIE_CONFIG.NAME, {
        secure: CSRF_COOKIE_CONFIG.SECURE,
        sameSite: CSRF_COOKIE_CONFIG.SAME_SITE,
        ...(CSRF_COOKIE_CONFIG.DOMAIN
            ? { domain: CSRF_COOKIE_CONFIG.DOMAIN }
            : {}),
    });
    return res.status(200).json({ message: 'User logged out successfully' });
};

/**
 * Fetches and returns user details by user ID.
 *
 * @param {Object} req - The request object from Express.js, containing the user's information in `req.user`.
 * @param {Object} res - The response object from Express.js used to send back the desired HTTP response.
 * @returns {Promise<Object>} A promise that resolves to the response object, which includes the user's details or an error message.
 */
const getUser = async (req, res) => {
    try {
        const { id: userId } = req.user;
        const userDetails = await UserService.getUserById(userId);

        if (!userDetails) {
            return res.status(404).json({
                errors: ['User not found'],
            });
        }

        const {
            id,
            firstName,
            lastName,
            username,
            email,
            phoneNumber,
            dateOfBirth,
            city,
            country,
            isPhoneVerified,
            isEmailVerified,
            profilePicture,
            Organizer: organizer,
            Organizations,
        } = userDetails;
        return res.status(200).json({
            errors: [],
            data: {
                isAuthenticated: true,
                userDetails: {
                    id,
                    firstName,
                    lastName,
                    username,
                    email,
                    phoneNumber,
                    dateOfBirth,
                    city,
                    country,
                    isPhoneVerified,
                    isEmailVerified,
                    profilePicture: resolveMediaUrl(profilePicture),
                    organizerProfile: organizer
                        ? {
                              id: organizer.id,
                              description: organizer.description,
                          }
                        : null,
                    organizations: (Organizations || []).map((organization) => ({
                        id: organization.id,
                        name: organization.name,
                        organizationUsername: organization.organizationUsername,
                        email: organization.email,
                        isAdmin: Boolean(organization.OrganizationMembers?.isAdmin),
                    })),
                },
            },
        });
    } catch (error) {
        return sendError(res, {
            status: 500,
            message: 'A technical error has occurred',
            requestId: req.requestId,
        });
    }
};

/**
 * Updates the user's profile information.
 *
 * @param {Object} req - The request object from Express.js, containing the user's updated details.
 * @param {Object} res - The response object from Express.js used to send back the desired HTTP response.
 * @returns {Promise<Object>} A promise that resolves to the response object, which includes the user's updated details or an error message.
 */
const updateUser = async (req, res) => {
    try {
        const { id: userId } = req.user;
        const userDetails = await User.findByPk(userId);

        if (!userDetails) {
            return res.status(404).json({
                errors: ['User not found'],
            });
        }

        const allowedFields = [
            'firstName',
            'lastName',
            'phoneNumber',
            'username',
            'dateOfBirth',
            'country',
            'city',
            'profilePicture',
        ];

        const updatePayload = allowedFields.reduce((payload, fieldName) => {
            if (Object.prototype.hasOwnProperty.call(req.body, fieldName)) {
                payload[fieldName] = req.body[fieldName];
            }
            return payload;
        }, {});

        ['firstName', 'lastName', 'phoneNumber', 'username'].forEach((fieldName) => {
            if (typeof updatePayload[fieldName] === 'string') {
                updatePayload[fieldName] = updatePayload[fieldName].trim();
            }
        });

        if (updatePayload.profilePicture !== undefined) {
            updatePayload.profilePicture = normalizeStoredMediaValue(updatePayload.profilePicture);
        }

        if (Object.prototype.hasOwnProperty.call(updatePayload, 'dateOfBirth')) {
            updatePayload.dateOfBirth = updatePayload.dateOfBirth || null;
        }

        if (
            Object.prototype.hasOwnProperty.call(updatePayload, 'phoneNumber') &&
            updatePayload.phoneNumber &&
            !PHONE_NUMBER_REGEX.test(updatePayload.phoneNumber.trim())
        ) {
            return res.status(400).json({
                errors: ['Invalid phone number format'],
                data: {},
            });
        }

        if (
            Object.prototype.hasOwnProperty.call(updatePayload, 'dateOfBirth') &&
            updatePayload.dateOfBirth !== null &&
            !isValidDateOnly(updatePayload.dateOfBirth)
        ) {
            return res.status(400).json({
                errors: ['Invalid dateOfBirth format. Use YYYY-MM-DD'],
                data: {},
            });
        }

        const changedKeys = Object.keys(updatePayload).filter((fieldName) => {
            const nextValue = updatePayload[fieldName] ?? null;
            const currentValue = userDetails[fieldName] ?? null;
            return nextValue !== currentValue;
        });

        if (changedKeys.length === 0) {
            return res.status(200).json({
                errors: [],
                data: {
                    updatedUserDetails: userDetails,
                    status: 'No changes detected',
                },
            });
        }

        const updatedUserDetails = await UserService.updateUser(userId, updatePayload);
        return res.status(200).json({
            errors: [],
            data: {
                updatedUserDetails,
            },
        });
    } catch (error) {
        return sendError(res, {
            status: 500,
            message: 'A technical error has occurred',
            requestId: req.requestId,
        });
    }
};

const updatePassword = async (req, res) => {
    try {
        const { currentPassword, newPassword } = req.body || {};

        if (!currentPassword || !newPassword) {
            return res.status(400).json({ errors: ['Both currentPassword and newPassword are required'], data: {} });
        }

        const { updatedUser, token } = await UserService.updatePassword(req.user.id, currentPassword, newPassword);

        const cookieOptions = {
            maxAge: HTTP_RESPONSE_COOKIE_CONFIG.MAX_AGE,
            httpOnly: HTTP_RESPONSE_COOKIE_CONFIG.HTTP_ONLY,
            secure: HTTP_RESPONSE_COOKIE_CONFIG.SECURE,
            sameSite: HTTP_RESPONSE_COOKIE_CONFIG.SAME_SITE,
            ...(HTTP_RESPONSE_COOKIE_CONFIG.DOMAIN ? { domain: HTTP_RESPONSE_COOKIE_CONFIG.DOMAIN } : {}),
        };
        res.cookie('_token', token, cookieOptions);
        res.cookie(CSRF_COOKIE_CONFIG.NAME, crypto.randomBytes(32).toString('hex'), buildCsrfCookieOptions());

        return res.status(200).json({ errors: [], data: { status: 'Password updated', token } });
    } catch (error) {
        // eslint-disable-next-line no-console
        console.error('Error updating password', error);
        return sendError(res, { status: error.status || 500, message: error.message || 'A technical error has occurred', requestId: req.requestId });
    }
};

const resetPassword = async (req, res) => {
    try {
        const { token, newPassword, email } = req.body || {};
        if (!token || !newPassword || !email) {
            return res.status(400).json({ errors: ['token, email and newPassword are required'], data: {} });
        }

        await UserService.completePasswordReset(token, email, newPassword);

        return res.status(200).json({ errors: [], data: { status: 'Password updated' } });
    } catch (error) {
        // eslint-disable-next-line no-console
        console.error('Error resetting password', error);
        return res.status(error.status || 500).json({ errors: [error.message || 'Failed to reset password'], data: {} });
    }
};

const getUserBookings = async (_req, res) => {
    return res.status(200).json({
        errors: [],
        data: {
            elements: [
                {
                    bookingId: 'BKG123',
                    bookingDate: '2024-01-10',
                    hotelName: 'Seaside Resort',
                    checkInDate: '2024-01-20',
                    checkOutDate: '2024-01-25',
                    totalFare: '₹14,500',
                },
                {
                    bookingId: 'BKG124',
                    bookingDate: '2024-01-03',
                    hotelName: 'Mountain Retreat',
                    checkInDate: '2024-02-15',
                    checkOutDate: '2024-02-20',
                    totalFare: '₹5,890',
                },
                {
                    bookingId: 'BKG125',
                    bookingDate: '2024-01-11',
                    hotelName: 'City Central Hotel',
                    checkInDate: '2024-03-01',
                    checkOutDate: '2024-03-05',
                    totalFare: '₹21,700',
                },
            ],
        },
    });
};

const getUserPaymentMethods = async (_req, res) => {
    return res.status(200).json({
        errors: [],
        data: {
            elements: [
                {
                    id: '1',
                    cardType: 'Visa',
                    cardNumber: '**** **** **** 1234',
                    expiryDate: '08/26',
                },
                {
                    id: '2',
                    cardType: 'MasterCard',
                    cardNumber: '**** **** **** 5678',
                    expiryDate: '07/24',
                },
                {
                    id: '3',
                    cardType: 'American Express',
                    cardNumber: '**** **** **** 9012',
                    expiryDate: '05/25',
                },
            ],
        },
    });
};

const requestEmailVerification = async (req, res) => {
    try {
        await UserService.startEmailVerification(req.body?.email);
        return res.status(200).json({ errors: [], data: { message: 'If an unverified account exists for that email, a verification link has been sent.' } });
    } catch (error) {
        return sendError(res, { status: 500, message: 'Unable to send verification email' });
    }
};

const confirmEmailVerification = async (req, res) => {
    try {
        const result = await UserService.confirmEmailVerification(req.body?.token);
        if (!result.valid) return sendError(res, { status: 400, message: 'Verification link is invalid or expired' });
        return res.status(200).json({ errors: [], data: { emailVerified: true, claimedOrderCount: result.claimedOrderCount } });
    } catch (error) {
        return sendError(res, { status: 500, message: 'Unable to verify email' });
    }
};
const forgotPassword = async (req, res) => {
    try {
        const { email } = req.body || {};
        if (!email) {
            return res.status(400).json({ errors: ['Email is required'], data: {} });
        }
        await UserService.forgotPassword(email);
        // Always return 200 (anti-enumeration)
        return res.status(200).json({ errors: [], data: { status: 'If an account with that email exists, you will receive a password reset link.' } });
    } catch (error) {
        // eslint-disable-next-line no-console
        console.error('Error in forgotPassword', error);
        return res.status(200).json({ errors: [], data: { status: 'If an account with that email exists, you will receive a password reset link.' } });
    }
};

const lookupUsername = async (req, res) => {
    try {
        const { email } = req.body || {};
        if (!email) {
            return res.status(400).json({ errors: ['Email is required'], data: {} });
        }

        const usernames = await UserService.lookupUsernameByEmail(email);
        if (usernames.length > 0) {
            await UserService.sendUsernameLookupEmail(email, usernames);
        }

        // Always return generic success (anti-enumeration)
        return res.status(200).json({
            errors: [],
            data: { status: 'If an account with that email exists, you will receive an email with your username(s).' },
        });
    } catch (error) {
        // eslint-disable-next-line no-console
        console.error('Error in lookupUsername', error);
        return res.status(200).json({
            errors: [],
            data: { status: 'If an account with that email exists, you will receive an email with your username(s).' },
        });
    }
};

const validateResetToken = async (req, res) => {
    try {
        const { token } = req.params;
        if (!token) {
            return res.status(400).json({ errors: ['Token is required'], data: { valid: false } });
        }
        const result = await UserService.validateResetToken(token);
        return res.status(200).json({ errors: [], data: result });
    } catch (error) {
        // eslint-disable-next-line no-console
        console.error('Error validating reset token', error);
        return sendError(res, { status: 500, message: 'A technical error has occurred', requestId: req.requestId });
    }
};

const defaultExport = { registerUser, loginUser, logoutUser, getUser, updateUser, updatePassword, resetPassword, forgotPassword, requestEmailVerification, confirmEmailVerification, validateResetToken, getUserBookings, getUserPaymentMethods, lookupUsername };

export { registerUser, loginUser, logoutUser, getUser, updateUser, updatePassword, resetPassword, forgotPassword, requestEmailVerification, confirmEmailVerification, validateResetToken, getUserBookings, getUserPaymentMethods, lookupUsername };
export default defaultExport;
