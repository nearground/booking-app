import { createRequire } from 'node:module';
const require = createRequire(import.meta.url);

const crypto = require('crypto');

import { CSRF_COOKIE_CONFIG } from '../utils/constants.js';

const CSRF_HEADER_NAME = 'x-csrf-token';
const SAFE_METHODS = new Set(['GET', 'HEAD', 'OPTIONS']);

const buildCsrfCookieOptions = () => ({
    maxAge: CSRF_COOKIE_CONFIG.MAX_AGE,
    httpOnly: CSRF_COOKIE_CONFIG.HTTP_ONLY,
    secure: CSRF_COOKIE_CONFIG.SECURE,
    sameSite: CSRF_COOKIE_CONFIG.SAME_SITE,
    ...(CSRF_COOKIE_CONFIG.DOMAIN
        ? { domain: CSRF_COOKIE_CONFIG.DOMAIN }
        : {}),
});

const generateCsrfToken = () => crypto.randomBytes(32).toString('hex');

const ensureCsrfCookie = (req, res, next) => {
    const authToken = req.cookies?._token;
    if (!authToken) {
        return next();
    }

    const csrfCookieName = CSRF_COOKIE_CONFIG.NAME;
    const existingCsrfToken = req.cookies?.[csrfCookieName];

    if (!existingCsrfToken) {
        res.cookie(csrfCookieName, generateCsrfToken(), buildCsrfCookieOptions());
    }

    return next();
};

const validateCsrfForAuthenticatedWrites = (req, res, next) => {
    if (SAFE_METHODS.has(String(req.method || '').toUpperCase())) {
        return next();
    }

    const authToken = req.cookies?._token;
    if (!authToken) {
        return next();
    }

    const csrfCookieName = CSRF_COOKIE_CONFIG.NAME;
    const csrfCookieToken = req.cookies?.[csrfCookieName];
    const csrfHeaderToken = req.get(CSRF_HEADER_NAME) || req.get('x-xsrf-token');

    if (!csrfCookieToken || !csrfHeaderToken || csrfCookieToken !== csrfHeaderToken) {
        return res.status(403).json({
            errors: ['Invalid or missing CSRF token'],
            data: {},
        });
    }

    return next();
};

const defaultExport = { ensureCsrfCookie, validateCsrfForAuthenticatedWrites };

export { ensureCsrfCookie, validateCsrfForAuthenticatedWrites };
export default defaultExport;
