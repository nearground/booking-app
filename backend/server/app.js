import { createRequire } from 'node:module';
import { fileURLToPath } from 'node:url';
import indexRouter from './routes/index.js';
import usersRouter from './routes/users.js';
import hotelsRouter from './routes/hotels.js';
import hotelRouter from './routes/hotel.js';
import experiencesRouter from './routes/experiences.js';
import servicesRouter from './routes/services.js';
import organizersRouter from './routes/organizers.js';
import miscRouter from './routes/misc.js';
import mediaRouter from './routes/media.js';
import commentsRouter from './routes/comments.js';
import cartRouter from './routes/cart.js';
import ordersRouter from './routes/orders.js';
import organizationSitesRouter from './routes/organization-sites.js';
import db from './models/index.js';
import {
    syncExperienceSchedule,
    syncAggregatedCommentsData,
} from './services/Scheduler.service.js';
import {
    ensureCsrfCookie,
    validateCsrfForAuthenticatedWrites,
} from './middlewares/csrf.js';
import { sendError } from './utils/http-response.js';

const require = createRequire(import.meta.url);


const express = require('express');
const crypto = require('crypto');
const path = require('path');
const cookieParser = require('cookie-parser');
const logger = require('morgan');
const cors = require('cors');
const helmet = require('helmet');
const cron = require('node-cron');

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const app = express();
const shouldTrustProxy = String(process.env.TRUST_PROXY || 'true').trim().toLowerCase() === 'true';
const jsonBodyLimit = String(process.env.JSON_BODY_LIMIT || '2mb').trim();
const urlEncodedBodyLimit = String(process.env.URLENCODED_BODY_LIMIT || '2mb').trim();
const parseBoolean = (value, fallback) => {
    if (value === undefined || value === null || value === '') {
        return fallback;
    }

    return String(value).trim().toLowerCase() === 'true';
};

const shouldSyncDatabaseOnStartup = parseBoolean(
    process.env.DB_SYNC_ON_STARTUP,
    false
);
const allowSyncInProduction = parseBoolean(
    process.env.ALLOW_DB_SYNC_IN_PRODUCTION,
    false
);
const shouldForceDatabaseSync = parseBoolean(
    process.env.DB_SYNC_FORCE,
    false
);
const shouldRunScheduler = parseBoolean(
    process.env.SCHEDULER_SYNC_ENABLED,
    process.env.NODE_ENV !== 'production'
);
const schedulerCronExpression = String(
    process.env.SCHEDULER_SYNC_CRON ||
        (process.env.NODE_ENV === 'production' ? '0 0 * * *' : '* * * * *')
).trim();

if (shouldTrustProxy) {
    app.set('trust proxy', 1);
}

const initializeDatabaseAndScheduler = async () => {
    try {
        if (shouldSyncDatabaseOnStartup && process.env.NODE_ENV === 'production' && !allowSyncInProduction) {
            // eslint-disable-next-line no-console
            console.warn(
                'DB_SYNC_ON_STARTUP is enabled but blocked in production. Use migrations and set ALLOW_DB_SYNC_IN_PRODUCTION=true only for emergency recovery.'
            );
        } else if (shouldSyncDatabaseOnStartup) {
            await db.sequelize.sync({ force: shouldForceDatabaseSync });
            // eslint-disable-next-line no-console
            console.log(
                'Database sync on startup completed successfully'
            );
        } else {
            // eslint-disable-next-line no-console
            console.log(
                'Database sync on startup is disabled; migrations should be applied separately'
            );
        }

        if (shouldRunScheduler) {
            if (!cron.validate(schedulerCronExpression)) {
                // eslint-disable-next-line no-console
                console.error(
                    `Invalid SCHEDULER_SYNC_CRON expression: ${schedulerCronExpression}`
                );
                return;
            }

            cron.schedule(schedulerCronExpression, async () => {
                // eslint-disable-next-line no-console
                console.log('Running scheduled experience/service sync...');
                try {
                    const experiences = await db.Experience.findAll({
                        // where: {
                        //     scheduling: { [Op.ne]: null },
                        // },
                    });
                    for (const experience of experiences) {
                        await syncExperienceSchedule(experience);
                        await syncAggregatedCommentsData(experience);
                    }
                    // const services = await db.Service.findAll({
                    //     where: {
                    //         scheduling: { [Op.ne]: null },
                    //     },
                    // });
                    // for (const service of services) {
                    //     await syncServiceSchedule(service);
                    // }
                    // eslint-disable-next-line no-console
                    console.log('Scheduled experience/service sync completed.');
                } catch (error) {
                    // eslint-disable-next-line no-console
                    console.error('Error running scheduled experience/service sync:', error);
                }
            });
        }
    } catch (error) {
        // eslint-disable-next-line no-console
        console.error('Error during startup initialization:', error);
    }
};

initializeDatabaseAndScheduler();

app.use((req, res, next) => {
    req.requestId = crypto.randomUUID();
    res.setHeader('X-Request-Id', req.requestId);
    return next();
});

app.use(logger('dev'));
app.use(
    helmet({
        contentSecurityPolicy: false,
        crossOriginResourcePolicy: { policy: 'cross-origin' },
    })
);
app.use(express.json({ limit: jsonBodyLimit }));
// CORS configuration for both development and production
const defaultAllowedOrigins = [
    'http://localhost:3000',
    'http://localhost',
    'http://frontend',
];
const configuredCorsOrigins = String(process.env.CORS_ALLOWED_ORIGINS || '')
    .split(',')
    .map((value) => value.trim())
    .filter(Boolean);
const allowedOrigins = new Set(
    configuredCorsOrigins.length > 0
        ? configuredCorsOrigins
        : defaultAllowedOrigins
);
app.use(
    cors({
        origin: function (origin, callback) {
            // Allow requests with no origin (like mobile apps or curl requests)
            if (!origin) return callback(null, true);
            if (!allowedOrigins.has(origin)) {
                const msg = 'The CORS policy for this site does not allow access from the specified Origin.';
                return callback(new Error(msg), false);
            }
            return callback(null, true);
        },
        credentials: true,
    })
);
app.use(express.urlencoded({ extended: false, limit: urlEncodedBodyLimit }));
app.use(cookieParser());
app.use(ensureCsrfCookie);
app.use(validateCsrfForAuthenticatedWrites);
app.use(express.static(path.join(__dirname, '../public')));

app.use('/', indexRouter);
app.use('/api/users', usersRouter);
app.use('/api/hotels', hotelsRouter);
app.use('/api/hotel', hotelRouter);
app.use('/api/experiences', experiencesRouter);
app.use('/api/services', servicesRouter);
app.use('/api/organizers', organizersRouter);
app.use('/api/organization-sites', organizationSitesRouter);
app.use('/api/media', mediaRouter);
app.use('/api', miscRouter);
app.use('/api/comments', commentsRouter);
app.use('/api/cart', cartRouter);
app.use('/api/orders', ordersRouter);
// catch 404
app.use(function (req, res) {
    return sendError(res, {
        status: 404,
        message: 'No route found',
        requestId: req.requestId,
    });
});

// error handler
app.use(function (err, req, res) {
    const status = Number(err?.status) || 500;

    // eslint-disable-next-line no-console
    console.error('Unhandled API error', {
        requestId: req.requestId,
        status,
        path: req.originalUrl,
        method: req.method,
        message: err?.message,
    });

    return sendError(res, {
        status,
        message: status >= 500 ? 'Internal server error' : 'Request failed',
        requestId: req.requestId,
    });
});

export default app;
