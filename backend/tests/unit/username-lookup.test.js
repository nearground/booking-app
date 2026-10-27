jest.mock('../../server/models/index.js', () => {
    const mockUser = {
        findOne: jest.fn(),
        findByPk: jest.fn(),
        findAll: jest.fn(),
        create: jest.fn(),
    };
    const mockOrganization = {};

    return {
        __esModule: true,
        User: mockUser,
        Organization: mockOrganization,
        default: {
            User: mockUser,
            Organization: mockOrganization,
        },
    };
});

jest.mock('../../server/utils/auth-helpers.js', () => ({
    __esModule: true,
    generateNewToken: jest.fn(),
    validateToken: jest.fn(),
}));

jest.mock('../../server/services/Notification.service.js', () => ({
    __esModule: true,
    sendNotification: jest.fn().mockResolvedValue({ sent: true }),
    default: { sendNotification: jest.fn().mockResolvedValue({ sent: true }) },
}));

import { User } from '../../server/models/index.js';
import { sendNotification } from '../../server/services/Notification.service.js';
import service from '../../server/services/User.service.js';

describe('lookupUsernameByEmail', () => {
    beforeEach(() => {
        jest.clearAllMocks();
    });

    test('returns usernames for matching email', async () => {
        User.findAll.mockResolvedValue([
            { username: 'alice', Organizations: [] },
            { username: 'bob', Organizations: [{ organizationUsername: 'acmecorp' }] },
        ]);

        const result = await service.lookupUsernameByEmail('test@example.com');

        expect(User.findAll).toHaveBeenCalledWith(
            expect.objectContaining({ where: { email: 'test@example.com' } })
        );
        expect(result).toEqual([
            { username: 'alice', organizationUsername: null },
            { username: 'bob', organizationUsername: 'acmecorp' },
        ]);
    });

    test('returns empty array when no users match', async () => {
        User.findAll.mockResolvedValue([]);

        const result = await service.lookupUsernameByEmail('nobody@example.com');

        expect(result).toEqual([]);
    });
});

describe('sendUsernameLookupEmail', () => {
    beforeEach(() => {
        jest.clearAllMocks();
    });

    test('sends notification with usernames', async () => {
        const usernames = [
            { username: 'alice', organizationUsername: null },
            { username: 'bob', organizationUsername: 'acmecorp' },
        ];

        await service.sendUsernameLookupEmail('test@example.com', usernames);

        expect(sendNotification).toHaveBeenCalledWith({
            template: 'username-lookup',
            to: 'test@example.com',
            payload: { usernames },
        });
    });

    test('does not send when usernames is empty', async () => {
        await service.sendUsernameLookupEmail('test@example.com', []);

        expect(sendNotification).not.toHaveBeenCalled();
    });

    test('does not throw on notification error', async () => {
        sendNotification.mockRejectedValue(new Error('SMTP down'));

        const usernames = [{ username: 'alice', organizationUsername: null }];
        await expect(
            service.sendUsernameLookupEmail('test@example.com', usernames)
        ).resolves.not.toThrow();
    });
});
