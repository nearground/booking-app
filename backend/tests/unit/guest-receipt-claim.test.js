jest.mock('../../server/models/index.js', () => ({
    __esModule: true,
    default: {
        User: { findOne: jest.fn(), create: jest.fn() },
        PasswordReset: {},
        EmailVerificationToken: { create: jest.fn(), findOne: jest.fn(), update: jest.fn() },
        Order: { findAll: jest.fn() },
        OrderItem: { findAll: jest.fn() },
        ExperienceReservation: { update: jest.fn() },
        ExperienceReservationAnswer: { findAll: jest.fn() },
        sequelize: { transaction: jest.fn() },
    },
}));
jest.mock('../../server/utils/auth-helpers.js', () => ({
    __esModule: true,
    generateNewToken: jest.fn(),
    validateToken: jest.fn(),
}));
jest.mock('../../server/services/Notification.service.js', () => ({
    __esModule: true,
    sendNotification: jest.fn().mockResolvedValue({ sent: true }),
}));

import crypto from 'node:crypto';
import modelRegistry from '../../server/models/index.js';
import { UserService } from '../../server/services/User.service.js';
import { sendNotification } from '../../server/services/Notification.service.js';

const mockUser = modelRegistry.User;
const mockVerificationToken = modelRegistry.EmailVerificationToken;
const mockOrder = modelRegistry.Order;
const mockOrderItem = modelRegistry.OrderItem;
const mockExperienceReservation = modelRegistry.ExperienceReservation;
const mockReservationAnswer = modelRegistry.ExperienceReservationAnswer;
const mockTx = {
    commit: jest.fn().mockResolvedValue(undefined),
    rollback: jest.fn().mockResolvedValue(undefined),
    finished: false,
    LOCK: { UPDATE: 'UPDATE' },
};
const service = new UserService();

describe('guest receipt email verification', () => {
    beforeEach(() => {
        jest.clearAllMocks();
        mockTx.finished = false;
        mockTx.commit.mockResolvedValue(undefined);
        mockTx.rollback.mockResolvedValue(undefined);
        modelRegistry.sequelize.transaction.mockResolvedValue(mockTx);
        mockOrderItem.findAll.mockResolvedValue([]);
        mockReservationAnswer.findAll.mockResolvedValue([]);
        mockExperienceReservation.update.mockResolvedValue([0]);
    });

    test('stores only a token hash and sends a verification link', async () => {
        mockUser.findOne.mockResolvedValue({ email: 'guest@example.com', isEmailVerified: false });
        mockVerificationToken.create.mockResolvedValue({});

        await service.startEmailVerification('guest@example.com');

        const saved = mockVerificationToken.create.mock.calls[0][0];
        expect(saved.tokenHash).toMatch(/^[a-f0-9]{64}$/);
        expect(sendNotification).toHaveBeenCalledWith(expect.objectContaining({
            template: 'email-verification',
            to: 'guest@example.com',
            payload: expect.objectContaining({ verifyUrl: expect.stringContaining('/verify-email?token=') }),
        }));
    });

    test('uses the configured app origin for emailed verification links', async () => {
        const previous = process.env.FRONTEND_BASE_URL;
        try {
            process.env.FRONTEND_BASE_URL = 'http://localhost:8080/';
            mockUser.findOne.mockResolvedValue({ email: 'guest@example.com', isEmailVerified: false });
            await service.startEmailVerification('guest@example.com');
            expect(sendNotification.mock.calls[0][0].payload.verifyUrl).toMatch(/^http:\/\/localhost:8080\/verify-email\?token=/);
        } finally {
            if (previous === undefined) delete process.env.FRONTEND_BASE_URL;
            else process.env.FRONTEND_BASE_URL = previous;
        }
    });

    test('claims only matching unowned orders after a valid token and is transactional', async () => {
        const token = 'a'.repeat(64);
        const record = { email: 'Guest@Example.com', expiresAt: new Date(Date.now() + 60000), usedAt: null };
        const firstOrder = { id: 21, mainContactEmail: 'guest@example.com', update: jest.fn().mockResolvedValue(undefined) };
        const secondOrder = { mainContactEmail: 'other@example.com', update: jest.fn() };
        const user = { id: 8, email: 'Guest@Example.com', update: jest.fn().mockResolvedValue(undefined) };
        mockVerificationToken.findOne.mockResolvedValue(record);
        mockUser.findOne.mockResolvedValue(user);
        mockOrder.findAll.mockResolvedValue([firstOrder]);
        mockOrderItem.findAll.mockResolvedValue([{ ExperienceReservationId: 31 }]);
        mockReservationAnswer.findAll.mockResolvedValue([{ ExperienceReservationId: 31 }]);

        await expect(service.confirmEmailVerification(token)).resolves.toEqual({ valid: true, claimedOrderCount: 1 });

        expect(mockVerificationToken.findOne).toHaveBeenCalledWith(expect.objectContaining({
            where: { tokenHash: crypto.createHash('sha256').update(token).digest('hex'), usedAt: null },
            transaction: mockTx,
        }));
        expect(user.update).toHaveBeenCalledWith({ isEmailVerified: true }, { transaction: mockTx });
        expect(firstOrder.update).toHaveBeenCalledWith({ CustomerId: 8 }, { transaction: mockTx });
        expect(mockExperienceReservation.update).toHaveBeenCalledWith(
            { CustomerId: 8 },
            expect.objectContaining({ where: expect.objectContaining({ CustomerId: null }), transaction: mockTx })
        );
        expect(secondOrder.update).not.toHaveBeenCalled();
        expect(mockOrder.findAll.mock.calls[0][0].where.CustomerId).toBeNull();
        expect(mockVerificationToken.update).toHaveBeenCalledWith({ usedAt: expect.any(Date) }, expect.objectContaining({ where: { email: record.email, usedAt: null }, transaction: mockTx }));
        expect(mockTx.commit).toHaveBeenCalledTimes(1);
    });

    test('does not claim orders for a different normalized email', async () => {
        const token = 'c'.repeat(64);
        const record = { email: 'account@example.com', expiresAt: new Date(Date.now() + 60000), usedAt: null };
        const user = { id: 8, email: 'account@example.com', update: jest.fn().mockResolvedValue(undefined) };
        mockVerificationToken.findOne.mockResolvedValue(record);
        mockUser.findOne.mockResolvedValue(user);
        mockOrder.findAll.mockResolvedValue([]);

        await expect(service.confirmEmailVerification(token)).resolves.toEqual({ valid: true, claimedOrderCount: 0 });
        expect(mockOrder.findAll).toHaveBeenCalledWith(expect.objectContaining({ where: expect.objectContaining({ CustomerId: null }), transaction: mockTx }));
    });

    test('never claims opted-out bookings, while preserving opted-in and legacy bookings', async () => {
        mockVerificationToken.findOne.mockResolvedValue({
            email: 'guest@example.com', expiresAt: new Date(Date.now() + 60000), usedAt: null,
        });
        mockUser.findOne.mockResolvedValue({ id: 8, email: 'guest@example.com', update: jest.fn() });
        const optedIn = { metadata: { saveBookingForLater: true }, update: jest.fn() };
        const optedOut = { metadata: { saveBookingForLater: false }, update: jest.fn() };
        const legacy = { metadata: null, update: jest.fn() };
        mockOrder.findAll.mockResolvedValue([optedIn, optedOut, legacy]);

        await expect(service.confirmEmailVerification('d'.repeat(64))).resolves.toEqual({ valid: true, claimedOrderCount: 2 });

        expect(optedIn.update).toHaveBeenCalledWith({ CustomerId: 8 }, { transaction: mockTx });
        expect(legacy.update).toHaveBeenCalledWith({ CustomerId: 8 }, { transaction: mockTx });
        expect(optedOut.update).not.toHaveBeenCalled();
    });

    test('links only explicitly opted-in experience reservations for an opted-out guest order', async () => {
        mockVerificationToken.findOne.mockResolvedValue({
            email: 'guest@example.com', expiresAt: new Date(Date.now() + 60000), usedAt: null,
        });
        mockUser.findOne.mockResolvedValue({ id: 8, email: 'guest@example.com', update: jest.fn() });
        const optedOutOrder = { id: 44, metadata: { saveBookingForLater: false }, update: jest.fn() };
        mockOrder.findAll.mockResolvedValue([optedOutOrder]);
        mockOrderItem.findAll.mockResolvedValue([{ ExperienceReservationId: 55 }]);
        mockReservationAnswer.findAll.mockResolvedValue([{ ExperienceReservationId: 55 }]);

        await expect(service.confirmEmailVerification('e'.repeat(64))).resolves.toEqual({
            valid: true,
            claimedOrderCount: 0,
        });
        expect(optedOutOrder.update).not.toHaveBeenCalled();
        expect(mockExperienceReservation.update).toHaveBeenCalledWith(
            { CustomerId: 8 },
            expect.objectContaining({ where: expect.objectContaining({ id: expect.any(Object), CustomerId: null }) })
        );
    });
    test('rejects short tokens and expired verification links', async () => {
        await expect(service.confirmEmailVerification('bad')).resolves.toEqual({ valid: false });
        mockVerificationToken.findOne.mockResolvedValue({ expiresAt: new Date(Date.now() - 1000), email: 'guest@example.com' });
        await expect(service.confirmEmailVerification('b'.repeat(64))).resolves.toEqual({ valid: false });
        expect(mockUser.findOne).not.toHaveBeenCalled();
    });
});