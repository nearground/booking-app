import { createRequire } from 'node:module';
const require = createRequire(import.meta.url);

const express = require('express');

import {
    getPopularDestinations,
    forgotPassword,
    getCountries,
    postPaymentConfirmation,
} from '../controllers/Misc.controller.js';
import { getNearbyHotels, getCities } from '../controllers/Hotel.controller.js';
import { createForgotPasswordRateLimiter } from '../middlewares/auth-rate-limit.js';

const router = express.Router();
const forgotPasswordRateLimiter = createForgotPasswordRateLimiter();

router.get('/popularDestinations', getPopularDestinations);
router.get('/nearbyHotels', getNearbyHotels);
router.get('/availableCities', getCities);
router.post('/forgot', forgotPasswordRateLimiter, forgotPassword);
router.post('/payments/confirmation', postPaymentConfirmation);
router.get('/misc/countries', getCountries);

export default router;
