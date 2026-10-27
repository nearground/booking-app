jest.mock('../../server/models/index.js', () => {
  const mockOrganizationInvite = {
    findByPk: jest.fn(),
    create: jest.fn(),
  };
  const mockOrganization = {
    findByPk: jest.fn(),
  };
  const mockOrganizationMembers = {
    findOne: jest.fn(),
  };
  const mockTransaction = { commit: jest.fn(), rollback: jest.fn() };

  return {
    __esModule: true,
    User: { findOne: jest.fn(), findByPk: jest.fn() },
    Organizer: {},
    Organization: mockOrganization,
    OrganizationInvite: mockOrganizationInvite,
    Location: {},
    Experience: {},
    ScheduledExperience: {},
    ExperienceReservation: {},
    ExperienceReservationAnswer: {},
    Service: {},
    ScheduledService: {},
    TicketTier: {},
    Comment: {},
    sequelize: {
      transaction: jest.fn().mockResolvedValue(mockTransaction),
      models: { OrganizationMembers: mockOrganizationMembers },
    },
    default: {
      User: { findOne: jest.fn(), findByPk: jest.fn() },
      Organizer: {},
      Organization: mockOrganization,
      OrganizationInvite: mockOrganizationInvite,
      Location: {},
      Experience: {},
      ScheduledExperience: {},
      ExperienceReservation: {},
      ExperienceReservationAnswer: {},
      Service: {},
      ScheduledService: {},
      TicketTier: {},
      Comment: {},
      sequelize: {
        transaction: jest.fn().mockResolvedValue(mockTransaction),
        models: { OrganizationMembers: mockOrganizationMembers },
      },
    },
  };
});

jest.mock('../../server/services/Notification.service.js', () => ({
  __esModule: true,
  sendNotification: jest.fn().mockResolvedValue({ sent: true, provider: 'smtp' }),
}));

jest.mock('../../server/utils/validators.js', () => ({
  __esModule: true,
  validateUserInputs: jest.fn(),
  UserExists: jest.fn().mockResolvedValue(false),
}));

jest.mock('../../server/utils/auth-helpers.js', () => ({
  __esModule: true,
  generateNewToken: jest.fn().mockReturnValue('mock-token'),
  validateToken: jest.fn(),
}));

jest.mock('../../server/utils/media-storage.js', () => ({
  __esModule: true,
  normalizeStoredMediaValue: jest.fn((v) => v),
  resolveMediaUrl: jest.fn((v) => v),
}));

jest.mock('../../server/utils/timezone.js', () => ({
  __esModule: true,
  DEFAULT_TIMEZONE: 'UTC',
  isValidIanaTimezone: jest.fn(() => true),
  normalizeTimezone: jest.fn((tz) => tz || 'UTC'),
}));

jest.mock('../../server/utils/cache.js', () => ({
  __esModule: true,
  default: { del: jest.fn(), delByPrefix: jest.fn() },
}));

import { OrganizationInvite, Organization, sequelize } from '../../server/models/index.js';
import { sendNotification } from '../../server/services/Notification.service.js';
import { resendInviteService } from '../../server/services/Organizer.service.js';

const OrganizationMembers = sequelize.models.OrganizationMembers;

beforeEach(() => {
  jest.clearAllMocks();
});

describe('resendInviteService', () => {
  const requestingUser = { id: 10 };

  test('resends email for valid, active invite', async () => {
    const mockInvite = {
      id: 5,
      OrganizationId: 1,
      email: 'invitee@test.com',
      code: 'ABC123',
      token: 'a'.repeat(48),
      role: 'member',
      expiresAt: new Date(Date.now() + 86400000),
      usedAt: null,
      Organization: { id: 1, name: 'Test Org', email: 'org@test.com' },
    };
    OrganizationInvite.findByPk.mockResolvedValue(mockInvite);
    OrganizationMembers.findOne.mockResolvedValue({ isAdmin: true });

    const result = await resendInviteService({ inviteId: 5, requestingUser });

    expect(result.invite.id).toBe(5);
    expect(result.delivery.sent).toBe(true);
    expect(sendNotification).toHaveBeenCalledWith(
      expect.objectContaining({
        template: 'organizer-invite',
        to: 'invitee@test.com',
        payload: expect.objectContaining({
          organizationName: 'Test Org',
          inviteCode: 'ABC123',
          role: 'member',
        }),
      })
    );
  });

  test('throws 404 when invite not found', async () => {
    OrganizationInvite.findByPk.mockResolvedValue(null);

    await expect(resendInviteService({ inviteId: 99, requestingUser }))
      .rejects.toEqual(expect.objectContaining({ status: 404 }));
  });

  test('throws 400 when invite already used', async () => {
    OrganizationInvite.findByPk.mockResolvedValue({
      id: 5,
      OrganizationId: 1,
      usedAt: new Date(),
      expiresAt: new Date(Date.now() + 86400000),
      Organization: { id: 1, name: 'Test Org' },
    });

    await expect(resendInviteService({ inviteId: 5, requestingUser }))
      .rejects.toEqual(expect.objectContaining({ status: 400, errors: ['Invite has already been used'] }));
  });

  test('throws 400 when invite expired', async () => {
    OrganizationInvite.findByPk.mockResolvedValue({
      id: 5,
      OrganizationId: 1,
      usedAt: null,
      expiresAt: new Date(Date.now() - 1000),
      Organization: { id: 1, name: 'Test Org' },
    });

    await expect(resendInviteService({ inviteId: 5, requestingUser }))
      .rejects.toEqual(expect.objectContaining({ status: 400, errors: ['Invite has expired'] }));
  });

  test('throws 403 when user is not org admin', async () => {
    OrganizationInvite.findByPk.mockResolvedValue({
      id: 5,
      OrganizationId: 1,
      usedAt: null,
      expiresAt: new Date(Date.now() + 86400000),
      Organization: { id: 1, name: 'Test Org' },
    });
    OrganizationMembers.findOne.mockResolvedValue(null);

    await expect(resendInviteService({ inviteId: 5, requestingUser }))
      .rejects.toEqual(expect.objectContaining({ status: 403 }));
  });

  test('returns sent:false when notification fails', async () => {
    const mockInvite = {
      id: 5,
      OrganizationId: 1,
      email: 'invitee@test.com',
      code: 'ABC123',
      token: 'a'.repeat(48),
      role: 'member',
      expiresAt: new Date(Date.now() + 86400000),
      usedAt: null,
      Organization: { id: 1, name: 'Test Org', email: 'org@test.com' },
    };
    OrganizationInvite.findByPk.mockResolvedValue(mockInvite);
    OrganizationMembers.findOne.mockResolvedValue({ isAdmin: true });
    sendNotification.mockRejectedValueOnce(new Error('SMTP fail'));

    const result = await resendInviteService({ inviteId: 5, requestingUser });

    expect(result.delivery.sent).toBe(false);
  });
});
