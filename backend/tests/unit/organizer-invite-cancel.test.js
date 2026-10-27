jest.mock('../../server/models/index.js', () => {
  const mockOrganizationInvite = {
    findByPk: jest.fn(),
  };
  const mockOrganizationMembers = {
    findOne: jest.fn(),
  };

  return {
    __esModule: true,
    User: {},
    Organizer: {},
    Organization: {},
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
      models: { OrganizationMembers: mockOrganizationMembers },
    },
    default: {
      User: {},
      Organizer: {},
      Organization: {},
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
        models: { OrganizationMembers: mockOrganizationMembers },
      },
    },
  };
});

jest.mock('../../server/services/Notification.service.js', () => ({
  __esModule: true,
  sendNotification: jest.fn(),
}));

jest.mock('../../server/utils/validators.js', () => ({
  __esModule: true,
  validateUserInputs: jest.fn(),
  UserExists: jest.fn().mockResolvedValue(false),
}));

jest.mock('../../server/utils/auth-helpers.js', () => ({
  __esModule: true,
  generateNewToken: jest.fn().mockReturnValue('mock-token'),
}));

jest.mock('../../server/utils/media-storage.js', () => ({
  __esModule: true,
  normalizeStoredMediaValue: jest.fn((value) => value),
  resolveMediaUrl: jest.fn((value) => value),
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

import { OrganizationInvite, sequelize } from '../../server/models/index.js';
import { cancelInviteService } from '../../server/services/Organizer.service.js';

const OrganizationMembers = sequelize.models.OrganizationMembers;

beforeEach(() => {
  jest.clearAllMocks();
});

describe('cancelInviteService', () => {
  const requestingUser = { id: 10 };

  test('deletes an unused invite for an organization admin', async () => {
    const destroy = jest.fn().mockResolvedValue(undefined);

    OrganizationInvite.findByPk.mockResolvedValue({
      id: 5,
      OrganizationId: 1,
      usedAt: null,
      destroy,
    });
    OrganizationMembers.findOne.mockResolvedValue({ isAdmin: true });

    const result = await cancelInviteService({ inviteId: 5, requestingUser });

    expect(destroy).toHaveBeenCalled();
    expect(result).toEqual({ deleted: true });
  });

  test('throws 404 when invite does not exist', async () => {
    OrganizationInvite.findByPk.mockResolvedValue(null);

    await expect(cancelInviteService({ inviteId: 99, requestingUser })).rejects.toEqual(
      expect.objectContaining({ status: 404, errors: ['Invite not found'] })
    );
  });

  test('throws 403 when requester is not an organization admin', async () => {
    OrganizationInvite.findByPk.mockResolvedValue({
      id: 5,
      OrganizationId: 1,
      usedAt: null,
      destroy: jest.fn(),
    });
    OrganizationMembers.findOne.mockResolvedValue(null);

    await expect(cancelInviteService({ inviteId: 5, requestingUser })).rejects.toEqual(
      expect.objectContaining({ status: 403 })
    );
  });
});