jest.mock('../../server/models/index.js', () => {
  const mockOrganizer = {
    findOne: jest.fn(),
  };
  const mockOrganization = {
    findAll: jest.fn(),
  };
  const mockOrganizationInvite = {
    findAll: jest.fn(),
  };
  const mockOrganizationMembers = {
    findAll: jest.fn(),
  };

  return {
    __esModule: true,
    User: {},
    Organizer: mockOrganizer,
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
      models: { OrganizationMembers: mockOrganizationMembers },
    },
    default: {
      User: {},
      Organizer: mockOrganizer,
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

import {
  Organizer,
  Organization,
  OrganizationInvite,
  sequelize,
} from '../../server/models/index.js';
import { getOrganizerWorkspaceService } from '../../server/services/Organizer.service.js';

const OrganizationMembers = sequelize.models.OrganizationMembers;

beforeEach(() => {
  jest.clearAllMocks();
});

describe('getOrganizerWorkspaceService', () => {
  test('includes active pending invites in the serialized organization workspace', async () => {
    Organizer.findOne.mockResolvedValue({ id: 7 });
    Organization.findAll.mockResolvedValue([
      {
        id: 1,
        toJSON: () => ({
          id: 1,
          name: 'Acme Adventures',
          email: 'team@acme.test',
          Experiences: [],
          Services: [],
        }),
      },
    ]);
    OrganizationMembers.findAll.mockResolvedValue([]);
    OrganizationInvite.findAll.mockResolvedValue([
      {
        id: 11,
        OrganizationId: 1,
        email: 'active@acme.test',
        code: 'ABC123',
        token: 'a'.repeat(48),
        role: 'member',
        usedAt: null,
        expiresAt: new Date(Date.now() + 86400000),
        createdAt: new Date('2099-01-01T12:00:00.000Z'),
        InvitedBy: { id: 10, firstName: 'Sam', lastName: 'Guide', email: 'sam@acme.test' },
      },
      {
        id: 12,
        OrganizationId: 1,
        email: 'expired@acme.test',
        code: 'XYZ999',
        token: 'b'.repeat(48),
        role: 'member',
        usedAt: null,
        expiresAt: new Date(Date.now() - 86400000),
        createdAt: new Date('2099-01-02T12:00:00.000Z'),
        InvitedBy: null,
      },
    ]);

    const result = await getOrganizerWorkspaceService({ userId: 10 });

    expect(result.organizations[0].pendingInvites).toHaveLength(1);
    expect(result.organizations[0].pendingInvites[0]).toMatchObject({
      id: 11,
      email: 'active@acme.test',
      code: 'ABC123',
      role: 'member',
      invitedBy: {
        id: 10,
        firstName: 'Sam',
        lastName: 'Guide',
        email: 'sam@acme.test',
      },
    });
    expect(result.organizations[0].pendingInvites[0].inviteUrl).toContain('/organizer-signup/invite?token=');
  });
});