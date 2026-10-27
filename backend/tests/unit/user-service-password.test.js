const mockUser = {
  findOne: jest.fn(),
  findByPk: jest.fn(),
  create: jest.fn(),
};

const mockPasswordReset = {
  findOne: jest.fn(),
  create: jest.fn(),
  update: jest.fn(),
};

jest.mock('../../server/models/index.js', () => ({
  __esModule: true,
  default: {
    sequelize: { transaction: jest.fn() },
    User: mockUser,
    PasswordReset: mockPasswordReset,
    Organizer: {},
    Organization: {},
  },
}));

jest.mock('../../server/services/Notification.service.js', () => ({
  __esModule: true,
  sendNotification: jest.fn().mockResolvedValue(true),
}));

jest.mock('../../server/utils/auth-helpers.js', () => ({
  __esModule: true,
  generateNewToken: jest.fn().mockReturnValue('mock-jwt-token'),
  validateToken: jest.fn().mockReturnValue(false),
}));

import { sendNotification } from '../../server/services/Notification.service.js';

const User = mockUser;
const PasswordReset = mockPasswordReset;

let UserService;

beforeAll(async () => {
  const mod = await import('../../server/services/User.service.js');
  UserService = mod.default;
});

beforeEach(() => {
  jest.clearAllMocks();
});

// ─── forgotPassword ─────────────────────────────────────────────────────────

describe('forgotPassword', () => {
  test('returns sent:true for existing user and creates token', async () => {
    User.findOne.mockResolvedValue({ id: 1, email: 'user@test.com' });
    PasswordReset.create.mockResolvedValue({});

    const result = await UserService.forgotPassword('user@test.com');

    expect(result).toEqual({ sent: true });
    expect(PasswordReset.create).toHaveBeenCalledTimes(1);
    const createArg = PasswordReset.create.mock.calls[0][0];
    expect(createArg.email).toBe('user@test.com');
    expect(createArg.token).toBeDefined();
    expect(createArg.token.length).toBe(64); // 32 bytes hex
    expect(new Date(createArg.expiresAt).getTime()).toBeGreaterThan(Date.now());
    expect(sendNotification).toHaveBeenCalledWith(
      expect.objectContaining({
        template: 'forgot-password',
        to: 'user@test.com',
      })
    );
  });

  test('returns sent:true for non-existent user (anti-enumeration)', async () => {
    User.findOne.mockResolvedValue(null);

    const result = await UserService.forgotPassword('nobody@test.com');

    expect(result).toEqual({ sent: true });
    expect(PasswordReset.create).not.toHaveBeenCalled();
    expect(sendNotification).not.toHaveBeenCalled();
  });

  test('still succeeds when notification sending fails', async () => {
    User.findOne.mockResolvedValue({ id: 1, email: 'user@test.com' });
    PasswordReset.create.mockResolvedValue({});
    sendNotification.mockRejectedValueOnce(new Error('SMTP down'));

    const result = await UserService.forgotPassword('user@test.com');

    expect(result).toEqual({ sent: true });
    expect(PasswordReset.create).toHaveBeenCalledTimes(1);
  });
});

// ─── validateResetToken ─────────────────────────────────────────────────────

describe('validateResetToken', () => {
  test('returns valid:true for valid unexpired token', async () => {
    PasswordReset.findOne.mockResolvedValue({
      token: 'abc',
      usedAt: null,
      expiresAt: new Date(Date.now() + 3600000),
    });

    const result = await UserService.validateResetToken('abc');
    expect(result).toEqual({ valid: true });
  });

  test('returns not-found for unknown token', async () => {
    PasswordReset.findOne.mockResolvedValue(null);

    const result = await UserService.validateResetToken('unknown');
    expect(result).toEqual({ valid: false, reason: 'not-found' });
  });

  test('returns used for already-used token', async () => {
    PasswordReset.findOne.mockResolvedValue({
      token: 'abc',
      usedAt: new Date(),
      expiresAt: new Date(Date.now() + 3600000),
    });

    const result = await UserService.validateResetToken('abc');
    expect(result).toEqual({ valid: false, reason: 'used' });
  });

  test('returns expired for expired token', async () => {
    PasswordReset.findOne.mockResolvedValue({
      token: 'abc',
      usedAt: null,
      expiresAt: new Date(Date.now() - 1000),
    });

    const result = await UserService.validateResetToken('abc');
    expect(result).toEqual({ valid: false, reason: 'expired' });
  });
});

// ─── completePasswordReset ──────────────────────────────────────────────────

describe('completePasswordReset', () => {
  test('resets password and marks token as used', async () => {
    const mockRecord = {
      email: 'user@test.com',
      usedAt: null,
      expiresAt: new Date(Date.now() + 3600000),
      update: jest.fn(),
    };
    const mockUser = {
      id: 1,
      email: 'user@test.com',
      update: jest.fn(),
    };
    PasswordReset.findOne.mockResolvedValue(mockRecord);
    User.findOne.mockResolvedValue(mockUser);
    PasswordReset.update.mockResolvedValue([1]);

    const result = await UserService.completePasswordReset('tok1', null, 'newPass123');

    expect(result).toBe(true);
    expect(mockUser.update).toHaveBeenCalledWith({ password: expect.any(String) });
    expect(mockRecord.update).toHaveBeenCalledWith({ usedAt: expect.any(Date) });
    // Bulk invalidation of other tokens
    expect(PasswordReset.update).toHaveBeenCalledWith(
      { usedAt: expect.any(Date) },
      { where: { email: 'user@test.com', usedAt: null } }
    );
    expect(sendNotification).toHaveBeenCalledWith(
      expect.objectContaining({ template: 'password-changed', to: 'user@test.com' })
    );
  });

  test('throws 400 for expired token', async () => {
    PasswordReset.findOne.mockResolvedValue({
      email: 'user@test.com',
      usedAt: null,
      expiresAt: new Date(Date.now() - 1000),
    });

    await expect(UserService.completePasswordReset('tok1', null, 'newPass'))
      .rejects.toThrow('Invalid or expired token');
  });

  test('throws 400 when token record not found', async () => {
    PasswordReset.findOne.mockResolvedValue(null);

    await expect(UserService.completePasswordReset('bad', null, 'newPass'))
      .rejects.toThrow('Invalid or expired token');
  });

  test('throws 404 when user for email not found', async () => {
    PasswordReset.findOne.mockResolvedValue({
      email: 'ghost@test.com',
      usedAt: null,
      expiresAt: new Date(Date.now() + 3600000),
    });
    User.findOne.mockResolvedValue(null);

    await expect(UserService.completePasswordReset('tok1', null, 'newPass'))
      .rejects.toThrow('User not found');
  });

  test('works when email param is also provided', async () => {
    const mockRecord = {
      email: 'user@test.com',
      usedAt: null,
      expiresAt: new Date(Date.now() + 3600000),
      update: jest.fn(),
    };
    const mockUser = { id: 1, email: 'user@test.com', update: jest.fn() };
    PasswordReset.findOne.mockResolvedValue(mockRecord);
    User.findOne.mockResolvedValue(mockUser);
    PasswordReset.update.mockResolvedValue([1]);

    const result = await UserService.completePasswordReset('tok1', 'user@test.com', 'newPass123');

    expect(result).toBe(true);
    expect(PasswordReset.findOne).toHaveBeenCalledWith({
      where: { token: 'tok1', usedAt: null, email: 'user@test.com' },
    });
  });
});
