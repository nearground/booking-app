import { createFixedWindowRateLimiter } from './rate-limit.js';

const buildIpKey = (req) => String(req.ip || req.headers['x-forwarded-for'] || 'unknown-ip');

const createLoginRateLimiter = () =>
    createFixedWindowRateLimiter({
        keyPrefix: 'auth-login',
        maxRequests: Number(process.env.AUTH_LOGIN_RATE_LIMIT_MAX || 10),
        windowMs: Number(process.env.AUTH_LOGIN_RATE_LIMIT_WINDOW_MS || 15 * 60 * 1000),
        keyResolver: (req) => {
            const username = req.body?.username;
            return username ? `user:${username}` : buildIpKey(req);
        },
        message: 'Too many login attempts. Please try again later.',
    });

const createRegisterRateLimiter = () =>
    createFixedWindowRateLimiter({
        keyPrefix: 'auth-register',
        maxRequests: Number(process.env.AUTH_REGISTER_RATE_LIMIT_MAX || 10),
        windowMs: Number(process.env.AUTH_REGISTER_RATE_LIMIT_WINDOW_MS || 60 * 60 * 1000),
        keyResolver: buildIpKey,
        message: 'Too many registration attempts. Please try again later.',
    });

const createForgotPasswordRateLimiter = () =>
    createFixedWindowRateLimiter({
        keyPrefix: 'auth-forgot-password',
        maxRequests: Number(process.env.AUTH_FORGOT_RATE_LIMIT_MAX || 8),
        windowMs: Number(process.env.AUTH_FORGOT_RATE_LIMIT_WINDOW_MS || 60 * 60 * 1000),
        keyResolver: buildIpKey,
        message: 'Too many password recovery attempts. Please try again later.',
    });

const createUsernameLookupRateLimiter = () =>
    createFixedWindowRateLimiter({
        keyPrefix: 'auth-username-lookup',
        maxRequests: 3,
        windowMs: 60 * 60 * 1000,
        keyResolver: (req) => {
            const email = req.body?.email;
            return email ? `email:${email.toLowerCase()}` : buildIpKey(req);
        },
        message: 'Too many username lookup attempts. Please try again later.',
    });

const createOrganizerOnboardingRateLimiter = () =>
    createFixedWindowRateLimiter({
        keyPrefix: 'organizer-onboarding',
        maxRequests: Number(process.env.ORGANIZER_ONBOARDING_RATE_LIMIT_MAX || 8),
        windowMs: Number(process.env.ORGANIZER_ONBOARDING_RATE_LIMIT_WINDOW_MS || 60 * 60 * 1000),
        keyResolver: buildIpKey,
        message: 'Too many organizer onboarding attempts. Please try again later.',
    });

const createOrganizerInviteResolveRateLimiter = () =>
    createFixedWindowRateLimiter({
        keyPrefix: 'organizer-invite-resolve',
        maxRequests: Number(process.env.ORGANIZER_INVITE_RESOLVE_RATE_LIMIT_MAX || 30),
        windowMs: Number(process.env.ORGANIZER_INVITE_RESOLVE_RATE_LIMIT_WINDOW_MS || 15 * 60 * 1000),
        keyResolver: buildIpKey,
        message: 'Too many invite validation attempts. Please try again later.',
    });

const defaultExport = { createLoginRateLimiter, createRegisterRateLimiter, createForgotPasswordRateLimiter, createOrganizerOnboardingRateLimiter, createOrganizerInviteResolveRateLimiter, createUsernameLookupRateLimiter };

export { createLoginRateLimiter, createRegisterRateLimiter, createForgotPasswordRateLimiter, createOrganizerOnboardingRateLimiter, createOrganizerInviteResolveRateLimiter, createUsernameLookupRateLimiter };
export default defaultExport;
