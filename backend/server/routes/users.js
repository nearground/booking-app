import { createRequire } from 'node:module';
const require = createRequire(import.meta.url);

const express = require('express');

import {
    registerUser,
    loginUser,
    getUser,
    logoutUser,
    updateUser,
    updatePassword,
    resetPassword,
    forgotPassword,
    validateResetToken,
    getUserBookings,
    getUserPaymentMethods,
    lookupUsername,
} from '../controllers/User.controller.js';
import { authUser } from '../middlewares/auth.js';
import {
    createLoginRateLimiter,
    createRegisterRateLimiter,
    createForgotPasswordRateLimiter,
    createUsernameLookupRateLimiter,
} from '../middlewares/auth-rate-limit.js';

const router = express.Router();
const loginRateLimiter = createLoginRateLimiter();
const registerRateLimiter = createRegisterRateLimiter();
const forgotPasswordRateLimiter = createForgotPasswordRateLimiter();
const usernameLookupRateLimiter = createUsernameLookupRateLimiter();

/**
 * @route PUT /register
 * @desc Registers a new user with the provided details. This route is not protected and is accessible without authentication.
 * @access Public
 */
router.put('/register', registerRateLimiter, registerUser);

/**
 * @route POST /login
 * @desc Authenticates a user and returns a JWT token for accessing protected routes. This route is not protected and is accessible without authentication.
 * @access Public
 */
router.post('/login', loginRateLimiter, loginUser);

/**
 * @route GET /auth-user
 * @desc Fetch the user's profile information. This route is protected and requires authentication.
 * @access Protected
 * @middleware authUser - Ensures that the request is authenticated.
 */
router.get('/auth-user', authUser, getUser);

/**
 * @route POST /logout
 * @desc Logs out the user by clearing the JWT token cookie.
 * @access Protected
 */
router.post('/logout', authUser, logoutUser);

/**
 * @route PATCH /update
 * @desc Updates the user's profile information. This route is protected and requires authentication.
 * @access Protected
 */
router.patch('/update', authUser, updateUser);
router.patch('/update-profile', authUser, updateUser);
/**
 * @route PUT /password
 * @desc Change authenticated user's password
 * @access Protected
 */
router.put('/password', authUser, updatePassword);
router.post('/forgot-password', forgotPasswordRateLimiter, forgotPassword);
router.get('/reset-password/:token', validateResetToken);
router.post('/reset-password', resetPassword);
router.post('/reset', resetPassword);
router.get('/bookings', authUser, getUserBookings);
router.get('/payment-methods', authUser, getUserPaymentMethods);
router.post('/lookup-username', usernameLookupRateLimiter, lookupUsername);

export default router;
