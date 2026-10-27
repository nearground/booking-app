jest.mock('../../server/models/index.js', () => {
  const mockUser = {
    findOne: jest.fn(),
    findByPk: jest.fn(),
    create: jest.fn(),
  };
  const mockOrganization = {
    findOne: jest.fn(),
  };
  const mockOrganizationMembers = {
    findOne: jest.fn(),
  };
  const mockOrganizer = {};
  const mockPasswordReset = {};

  return {
    __esModule: true,
    User: mockUser,
    Organization: mockOrganization,
    OrganizationMembers: mockOrganizationMembers,
    Organizer: mockOrganizer,
    PasswordReset: mockPasswordReset,
    sequelize: {
      models: { OrganizationMembers: mockOrganizationMembers },
    },
    default: {
      User: mockUser,
      Organization: mockOrganization,
      OrganizationMembers: mockOrganizationMembers,
      Organizer: mockOrganizer,
      PasswordReset: mockPasswordReset,
      sequelize: {
        models: { OrganizationMembers: mockOrganizationMembers },
      },
    },
  };
});

jest.mock('../../server/utils/auth-helpers.js', () => ({
  __esModule: true,
  generateNewToken: jest.fn().mockReturnValue('mock-jwt-token'),
  validateToken: jest.fn().mockReturnValue(false),
}));

jest.mock('../../server/services/Notification.service.js', () => ({
  __esModule: true,
  sendNotification: jest.fn(),
}));

import { User, Organization, OrganizationMembers } from '../../server/models/index.js';
import { UserService } from '../../server/services/User.service.js';
import { generateNewToken } from '../../server/utils/auth-helpers.js';

let service;

beforeEach(() => {
  jest.clearAllMocks();
  service = new UserService();
});

describe('authenticateUser', () => {
  // Pre-computed bcrypt hash for 'adminpassword' with 10 rounds
  const hashedPassword = '$2a$10$mrRYiTpW5hXrqqd0Pds9Wu7YtfBpN7ZukE.AkuZscpKqX5BBuEu.a';

  test('authenticates with username + password', async () => {
    User.findOne.mockResolvedValue({
      id: 1,
      username: 'testuser',
      firstName: 'Test',
      lastName: 'User',
      password: hashedPassword,
    });

    const result = await service.authenticateUser({ username: 'testuser', password: 'adminpassword' });

    expect(User.findOne).toHaveBeenCalledWith({ where: { username: 'testuser' } });
    expect(result.token).toBe('mock-jwt-token');
    expect(result.user.username).toBe('testuser');
  });

  test('rejects non-existent username', async () => {
    User.findOne.mockResolvedValue(null);

    await expect(
      service.authenticateUser({ username: 'nonexistent', password: 'anything' })
    ).rejects.toMatchObject({ status: 404 });
  });

  test('rejects wrong password', async () => {
    User.findOne.mockResolvedValue({
      id: 1,
      username: 'testuser',
      password: hashedPassword,
    });

    await expect(
      service.authenticateUser({ username: 'testuser', password: 'wrongpass' })
    ).rejects.toMatchObject({ status: 404 });
  });

  test('authenticates organizer with organizationUsername + username + password', async () => {
    User.findOne.mockResolvedValue({
      id: 5,
      username: 'orguser',
      firstName: 'Org',
      lastName: 'User',
      password: hashedPassword,
    });
    Organization.findOne.mockResolvedValue({ id: 10, organizationUsername: 'acmecorp' });
    OrganizationMembers.findOne.mockResolvedValue({ UserId: 5, OrganizationId: 10, isAdmin: true });

    const result = await service.authenticateUser({
      username: 'orguser',
      password: 'adminpassword',
      organizationUsername: 'acmecorp',
    });

    expect(Organization.findOne).toHaveBeenCalledWith({ where: { organizationUsername: 'acmecorp' } });
    expect(OrganizationMembers.findOne).toHaveBeenCalledWith({ where: { UserId: 5, OrganizationId: 10 } });
    expect(result.token).toBe('mock-jwt-token');
  });

  test('rejects organizationUsername not found', async () => {
    User.findOne.mockResolvedValue({
      id: 5,
      username: 'orguser',
      password: hashedPassword,
    });
    Organization.findOne.mockResolvedValue(null);

    await expect(
      service.authenticateUser({
        username: 'orguser',
        password: 'adminpassword',
        organizationUsername: 'nonexistent',
      })
    ).rejects.toMatchObject({ status: 404, message: 'Organization not found' });
  });

  test('rejects user not a member of organization', async () => {
    User.findOne.mockResolvedValue({
      id: 5,
      username: 'orguser',
      password: hashedPassword,
    });
    Organization.findOne.mockResolvedValue({ id: 10, organizationUsername: 'acmecorp' });
    OrganizationMembers.findOne.mockResolvedValue(null);

    await expect(
      service.authenticateUser({
        username: 'orguser',
        password: 'adminpassword',
        organizationUsername: 'acmecorp',
      })
    ).rejects.toMatchObject({ status: 403 });
  });
});

describe('createUser', () => {
  test('creates user with username', async () => {
    User.create.mockResolvedValue({ id: 99, username: 'newuser', email: 'new@test.com' });

    const result = await service.createUser({
      firstName: 'New',
      lastName: 'User',
      username: 'newuser',
      email: 'new@test.com',
      password: 'TestPass1!',
      phoneNumber: '1234567890',
      country: 'Mexico',
    });

    expect(User.create).toHaveBeenCalledWith(
      expect.objectContaining({ username: 'newuser', email: 'new@test.com' })
    );
    expect(result.username).toBe('newuser');
  });
});
