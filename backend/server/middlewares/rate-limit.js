import { createRequire } from 'node:module';
const require = createRequire(import.meta.url);

import redis from '../utils/ioredis-client.js';


let RateLimiterRedis;
try {
    ({ RateLimiterRedis } = require('rate-limiter-flexible'));
} catch (e) {
    RateLimiterRedis = null;
    console.warn('rate-limiter-flexible not installed; falling back to in-memory limiter');
}

const getSeconds = (ms) => Math.max(1, Math.ceil(Number(ms) / 1000));

/**
 * createFixedWindowRateLimiter({ keyPrefix, maxRequests, windowMs, keyResolver, message })
 * Returns express middleware
 */
const createFixedWindowRateLimiter = ({
    keyPrefix,
    maxRequests,
    windowMs,
    keyResolver,
    message,
}) => {
    const normalizedPrefix = String(keyPrefix || 'rate-limit').trim();
    const points = Number(maxRequests) || 10;
    const duration = getSeconds(windowMs || 60 * 1000);

    if (RateLimiterRedis && redis) {
        const opts = {
            storeClient: redis,
            points,
            duration,
            keyPrefix: normalizedPrefix,
        };
        const limiter = new RateLimiterRedis(opts);

        return async (req, res, next) => {
            try {
                const resolvedKey = String((keyResolver && keyResolver(req)) || 'anonymous').trim();
                await limiter.consume(resolvedKey);
                return next();
            } catch (rej) {
                const retrySecs = Math.ceil((rej.msBeforeNext || duration * 1000) / 1000);
                res.setHeader('Retry-After', retrySecs);
                return res.status(429).json({
                    errors: [message || 'Too many requests'],
                    data: { limit: points, windowMs: duration * 1000 },
                });
            }
        };
    }

    // Fallback: in-memory fixed window (original behavior)
    const windows = new Map();
    const nowFn = () => Date.now();

    const pruneExpired = (now) => {
        for (const [k, bucket] of windows) {
            if (bucket.resetAt <= now) windows.delete(k);
        }
    };

    return (req, res, next) => {
        const now = nowFn();
        const resolvedKey = String((keyResolver && keyResolver(req)) || 'anonymous').trim();
        const key = `${normalizedPrefix}:${resolvedKey}`;
        pruneExpired(now);

        const current = windows.get(key);
        const windowMsNum = Number(duration * 1000);

        if (!current || current.resetAt <= now) {
            windows.set(key, { count: 1, resetAt: now + windowMsNum });
            return next();
        }

        if (current.count >= points) {
            res.setHeader('Retry-After', Math.ceil((current.resetAt - now) / 1000));
            return res.status(429).json({
                errors: [message || 'Too many requests'],
                data: { limit: points, windowMs: windowMsNum },
            });
        }

        current.count += 1;
        windows.set(key, current);
        return next();
    };
};

const createOrganizerInviteRateLimiter = () => {
    const maxRequests = Number(process.env.ORGANIZER_INVITE_RATE_LIMIT_MAX || 20);
    const windowMs = Number(process.env.ORGANIZER_INVITE_RATE_LIMIT_WINDOW_MS || 15 * 60 * 1000);

    return createFixedWindowRateLimiter({
        keyPrefix: 'organizer-invite',
        maxRequests,
        windowMs,
        keyResolver: (req) => {
            const userId = req.user?.id || 'anonymous';
            const organizationId = req.body?.organizationId || req.body?.OrganizationId || 'unknown-org';
            return `${userId}:${organizationId}`;
        },
        message: 'Too many invite creation attempts. Please try again later.',
    });
};

const defaultExport = { createFixedWindowRateLimiter, createOrganizerInviteRateLimiter };

export { createFixedWindowRateLimiter, createOrganizerInviteRateLimiter };
export default defaultExport;
