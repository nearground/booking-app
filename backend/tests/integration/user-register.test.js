jest.mock('../../server/models/index.js', () => ({
  __esModule: true,
  default: {
    sequelize: {
      sync: jest.fn().mockResolvedValue(undefined),
      authenticate: jest.fn().mockResolvedValue(undefined),
    },
    Experience: { findAll: jest.fn().mockResolvedValue([]) },
    User: { create: jest.fn(), findOne: jest.fn() },
    PasswordReset: { create: jest.fn(), findOne: jest.fn() },
    Organizer: { findOne: jest.fn() },
    Organization: { findOne: jest.fn() },
    Service: { findAll: jest.fn().mockResolvedValue([]) },
    Comment: { findAll: jest.fn().mockResolvedValue([]) },
  },
}));

jest.mock('node-cron', () => ({
  validate: jest.fn().mockReturnValue(true),
  schedule: jest.fn(),
}));

jest.mock('../../server/services/Scheduler.service.js', () => ({
  __esModule: true,
  syncExperienceSchedule: jest.fn().mockResolvedValue(undefined),
  syncAggregatedCommentsData: jest.fn().mockResolvedValue(undefined),
}));

jest.mock('../../server/middlewares/csrf.js', () => ({
  __esModule: true,
  ensureCsrfCookie: (req, res, next) => next(),
  validateCsrfForAuthenticatedWrites: (req, res, next) => next(),
  default: {
    ensureCsrfCookie: (req, res, next) => next(),
    validateCsrfForAuthenticatedWrites: (req, res, next) => next(),
  },
}));

jest.mock('../../server/middlewares/auth-rate-limit.js', () => ({
  __esModule: true,
  createLoginRateLimiter: () => (req, res, next) => next(),
  createRegisterRateLimiter: () => (req, res, next) => next(),
  createForgotPasswordRateLimiter: () => (req, res, next) => next(),
  createOrganizerOnboardingRateLimiter: () => (req, res, next) => next(),
  createOrganizerInviteResolveRateLimiter: () => (req, res, next) => next(),
  createUsernameLookupRateLimiter: () => (req, res, next) => next(),
}));

jest.mock('../../server/middlewares/rate-limit.js', () => ({
  __esModule: true,
  createFixedWindowRateLimiter: () => (req, res, next) => next(),
  createOrganizerInviteRateLimiter: () => (req, res, next) => next(),
  default: {
    createFixedWindowRateLimiter: () => (req, res, next) => next(),
    createOrganizerInviteRateLimiter: () => (req, res, next) => next(),
  },
}));

jest.mock('../../server/utils/validators.js', () => ({
  __esModule: true,
  validateUserInputs: jest.fn(),
  validateEmail: jest.fn(),
  validatePhoneNumber: jest.fn(),
  UserExists: jest.fn(),
  default: {
    validateUserInputs: jest.fn(),
    validateEmail: jest.fn(),
    validatePhoneNumber: jest.fn(),
    UserExists: jest.fn(),
  },
}));

jest.mock('../../server/middlewares/auth.js', () => ({
  __esModule: true,
  authUser: (req, res, next) => next(),
  default: { authUser: (req, res, next) => next() },
}));

jest.mock('../../server/services/User.service.js', () => ({
  __esModule: true,
  UserService: class MockUserService {},
  default: {
    createUser: jest.fn(),
    authenticateUser: jest.fn(),
    getUser: jest.fn(),
    updateUser: jest.fn(),
    updatePassword: jest.fn(),
    getUserBookings: jest.fn(),
    getUserPaymentMethods: jest.fn(),
    resetPassword: jest.fn(),
    completePasswordReset: jest.fn(),
  },
}));

import { createRequire } from 'node:module';
const _r = createRequire(import.meta.url);
const express = _r('express');
const request = _r('supertest');

import usersRouter from '../../server/routes/users.js';
import { validateUserInputs } from '../../server/utils/validators.js';
import UserService from '../../server/services/User.service.js';

// Build a minimal express app mounting only the users router,
// bypassing all app.js startup side-effects (DB sync, cron, CORS, etc.)
const app = express();
app.use(express.json());
app.use('/api/users', usersRouter);

const VALID_BODY = {
  firstName: 'Alice',
  lastName: 'Smith',
  email: 'alice@example.com',
  password: 'Pass1@word',
  phoneNumber: '555-555-5555',
  country: 'USA',
};

beforeEach(() => {
  jest.resetAllMocks();
  validateUserInputs.mockResolvedValue([]);
  UserService.createUser.mockResolvedValue({ id: 1 });
});

describe('PUT /api/users/register', () => {
  test('returns 201 with success message when inputs are valid and user is created', async () => {
    const res = await request(app).put('/api/users/register').send(VALID_BODY);
    expect(res.status).toBe(201);
    expect(res.body.errors).toEqual([]);
    expect(res.body.data.status).toBe('Registration Successful');
  });

  test('returns 400 with validation errors when validateUserInputs returns errors', async () => {
    validateUserInputs.mockResolvedValue(['first name is required']);
    const res = await request(app).put('/api/users/register').send(VALID_BODY);
    expect(res.status).toBe(400);
    expect(res.body.errors).toEqual(['first name is required']);
    expect(res.body.data.status).toBe('User not created');
  });

  test('returns 500 when createUser throws an unexpected error', async () => {
    UserService.createUser.mockRejectedValue(new Error('DB connection failed'));
    const res = await request(app).put('/api/users/register').send(VALID_BODY);
    expect(res.status).toBe(500);
    expect(res.body.errors.length).toBeGreaterThan(0);
  });

  test('returns an email conflict if a concurrent registration hits the unique index', async () => {
    UserService.createUser.mockRejectedValue(Object.assign(new Error('Unique constraint'), {
      name: 'SequelizeUniqueConstraintError',
      fields: { email: 'alice@example.com' },
    }));
    const res = await request(app).put('/api/users/register').send(VALID_BODY);
    expect(res.status).toBe(409);
    expect(res.body.errors).toEqual(['A user with this email already exists']);
  });

  test('returns 400 when body is empty and validation fails', async () => {
    validateUserInputs.mockResolvedValue([
      'first name is required',
      'last name is required',
      'Email address is required',
      'Password is required.',
      'Phone number is required.',
      'Country is required.',
    ]);
    const res = await request(app).put('/api/users/register').send({});
    expect(res.status).toBe(400);
    expect(res.body.errors.length).toBeGreaterThanOrEqual(1);
  });

  describe('POST /api/users/reset-password', () => {
    test('accepts the token and new password sent by the reset page without requiring email', async () => {
      const res = await request(app).post('/api/users/reset-password').send({ token: 'valid-reset-token', newPassword: 'UpdatedPass1!' });
      expect(res.status).toBe(200);
      expect(UserService.completePasswordReset).toHaveBeenCalledWith('valid-reset-token', undefined, 'UpdatedPass1!');
    });

    test('rejects missing tokens and short passwords', async () => {
      const res = await request(app).post('/api/users/reset-password').send({ newPassword: 'short' });
      expect(res.status).toBe(400);
      expect(UserService.completePasswordReset).not.toHaveBeenCalled();
    });
  });
});
