import { createRequire } from 'node:module';
import modelRegistry from '../models/index.js';
import { sendNotification } from '../services/Notification.service.js';
import cache from '../utils/cache.js';

const require = createRequire(import.meta.url);


const crypto = require('crypto');
const countriesData = require('../data/countries.json');
const { PasswordReset, User } = modelRegistry;

const POPULAR_DESTINATIONS = [
    { code: 1216, name: 'Puerto Vallarta', imageUrl: '/images/cities/puertovallarta.jpg' },
];

const getPopularDestinations = async (_req, res) => {
    try {
        const cacheKey = 'misc:popular-destinations';
        const cached = await cache.get(cacheKey);
        if (cached) return res.status(200).json(cached);
        const payload = { errors: [], data: { elements: POPULAR_DESTINATIONS } };
        res.status(200).json(payload);
        try { await cache.set(cacheKey, payload, 300); } catch (e) {}
    } catch (e) {
        return res.status(200).json({ errors: [], data: { elements: POPULAR_DESTINATIONS } });
    }
};

const forgotPassword = async (req, res) => {
    try {
        const email = String((req.body && req.body.email) || '').trim().toLowerCase();
        if (!email) {
            return res.status(400).json({ errors: ['email is required'], data: {} });
        }

        // create token regardless of whether user exists to avoid enumeration
        const token = crypto.randomBytes(24).toString('hex');
        const expiresAt = new Date(Date.now() + 60 * 60 * 1000); // 1 hour

        await PasswordReset.create({ email, token, expiresAt });

        const resetUrl = `${String(process.env.FRONTEND_BASE_URL || 'http://localhost:3000').replace(/\/+$/, '')}/reset-password?token=${encodeURIComponent(
            token
        )}&email=${encodeURIComponent(email)}`;

        try {
            await sendNotification({
                template: 'forgot-password',
                to: email,
                payload: { resetUrl, expiresAt },
            });
        } catch (e) {
            // swallow email send errors
        }

        return res.status(200).json({
            errors: [],
            data: { status: "If that email exists, password recovery instructions have been sent." },
        });
    } catch (error) {
        return res.status(500).json({ errors: ['Failed to process password recovery'], data: {} });
    }
};

const getCountries = async (_req, res) => {
    try {
        const cacheKey = 'misc:countries';
        const cached = await cache.get(cacheKey);
        if (cached) return res.status(200).json(cached);
        const payload = { errors: [], data: { elements: countriesData } };
        res.status(200).json(payload);
        try { await cache.set(cacheKey, payload, 3600); } catch (e) {}
    } catch (e) {
        return res.status(200).json({ errors: [], data: { elements: countriesData } });
    }
};

const postPaymentConfirmation = (_req, res) => {
    return res.status(200).json({
        errors: [],
        data: {
            status: 'Payment successful',
            bookingDetails: [
                { label: 'Booking ID', value: 'BKG123' },
                { label: 'Booking Date', value: '2024-01-10' },
                { label: 'Hotel Name', value: 'Seaside Resort' },
                { label: 'Check-in Date', value: '2024-01-20' },
                { label: 'Check-out Date', value: '2024-01-25' },
                { label: 'Total Fare', value: '₹14,500' },
            ],
        },
    });
};

const defaultExport = {
    getPopularDestinations,
    forgotPassword,
    getCountries,
    postPaymentConfirmation,
};

export {
    getPopularDestinations,
    forgotPassword,
    getCountries,
    postPaymentConfirmation,
};
export default defaultExport;
