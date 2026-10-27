/**
 * Configuration settings for bcrypt hashing function.
 */
const BCRYPT_CONFIG = Object.freeze({
    SALT_ROUNDS: 10,
});

/**
 * Standard messages related to user creation outcomes.
 */
const USER_CREATION_MESSAGES = Object.freeze({
    SUCCESS: 'Registration Successful',
    FAILED: 'Registration Failed',
});
/**
 * A collection of error messages related to JWT authentication.
 */
const JWT_ERROR_MESSAGES = Object.freeze({
    JWT_GENERAL: 'Validation of token failed',
});

/**
 * Config for response cookie when user authenticates on /login route.
 */
const parseBoolean = (value, fallback) => {
    if (value === undefined || value === null || value === '') {
        return fallback;
    }

    return String(value).trim().toLowerCase() === 'true';
};

const resolveSameSite = () => {
    const candidate = String(process.env.COOKIE_SAME_SITE || 'lax')
        .trim()
        .toLowerCase();

    if (['lax', 'strict', 'none'].includes(candidate)) {
        return candidate;
    }

    return 'lax';
};

const resolvedCookieSecure = parseBoolean(
    process.env.COOKIE_SECURE,
    process.env.NODE_ENV === 'production'
);

const HTTP_RESPONSE_COOKIE_CONFIG = Object.freeze({
    MAX_AGE: 1000 * 60 * 15, // would expire after 15 minutes
    HTTP_ONLY: true,
    SECURE: resolvedCookieSecure,
    SAME_SITE: resolveSameSite(),
    DOMAIN: String(process.env.COOKIE_DOMAIN || '').trim() || undefined,
});

const CSRF_COOKIE_CONFIG = Object.freeze({
    NAME: String(process.env.CSRF_COOKIE_NAME || '_csrf_token').trim() || '_csrf_token',
    MAX_AGE: HTTP_RESPONSE_COOKIE_CONFIG.MAX_AGE,
    HTTP_ONLY: false,
    SECURE: resolvedCookieSecure,
    SAME_SITE: resolveSameSite(),
    DOMAIN: String(process.env.COOKIE_DOMAIN || '').trim() || undefined,
});

/**
 * Cooldown period between reviews for the same bookable (14 days in ms).
 */
const REVIEW_COOLDOWN_MS = 14 * 24 * 60 * 60 * 1000;

const defaultExport = { BCRYPT_CONFIG, USER_CREATION_MESSAGES, JWT_ERROR_MESSAGES, HTTP_RESPONSE_COOKIE_CONFIG, CSRF_COOKIE_CONFIG, REVIEW_COOLDOWN_MS };

export { BCRYPT_CONFIG, USER_CREATION_MESSAGES, JWT_ERROR_MESSAGES, HTTP_RESPONSE_COOKIE_CONFIG, CSRF_COOKIE_CONFIG, REVIEW_COOLDOWN_MS };
export default defaultExport;
