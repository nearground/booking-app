import { beforeEach, describe, expect, jest, test } from '@jest/globals';

jest.mock('../../server/models/index.js', () => {
    const mockOrganizationMembers = { findOne: jest.fn() };
    const mockScheduledExperience = { findByPk: jest.fn() };
    const mockReservation = { create: jest.fn() };
    const mockAttendee = { bulkCreate: jest.fn() };
    const mockOrder = { create: jest.fn() };
    const mockOrderItem = { create: jest.fn() };
    const transaction = {
        LOCK: { UPDATE: 'UPDATE' },
        finished: false,
        commit: jest.fn(async function commit() {
            this.finished = 'commit';
        }),
        rollback: jest.fn(async function rollback() {
            this.finished = 'rollback';
        }),
    };
    const mockSequelize = {
        transaction: jest.fn(async () => {
            transaction.finished = false;
            return transaction;
        }),
        models: { OrganizationMembers: mockOrganizationMembers },
    };

    return {
        __esModule: true,
        User: {},
        Organizer: {},
        Organization: {},
        OrganizationInvite: {},
        Location: {},
        Experience: {},
        ScheduledExperience: mockScheduledExperience,
        ExperienceReservation: mockReservation,
        ExperienceReservationAttendee: mockAttendee,
        ExperienceReservationAnswer: {},
        Service: {},
        ScheduledService: {},
        TicketTier: {},
        Order: mockOrder,
        OrderItem: mockOrderItem,
        Comment: {},
        sequelize: mockSequelize,
        default: {
            User: {},
            Organizer: {},
            Organization: {},
            OrganizationInvite: {},
            Location: {},
            Experience: {},
            ScheduledExperience: mockScheduledExperience,
            ExperienceReservation: mockReservation,
            ExperienceReservationAttendee: mockAttendee,
            ExperienceReservationAnswer: {},
            Service: {},
            ScheduledService: {},
            TicketTier: {},
            Order: mockOrder,
            OrderItem: mockOrderItem,
            Comment: {},
            sequelize: mockSequelize,
        },
    };
});

jest.mock('../../server/services/Notification.service.js', () => ({
    __esModule: true,
    sendNotification: jest
        .fn()
        .mockResolvedValue({ sent: true, provider: 'smtp' }),
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
    normalizeTimezone: jest.fn((timezone) => timezone || 'UTC'),
}));

jest.mock('../../server/utils/cache.js', () => ({
    __esModule: true,
    default: { del: jest.fn(), delByPrefix: jest.fn() },
}));

import {
    ExperienceReservation,
    ExperienceReservationAttendee,
    Order,
    OrderItem,
    ScheduledExperience,
    sequelize,
} from '../../server/models/index.js';
import { sendNotification } from '../../server/services/Notification.service.js';
import { createManualBookingService } from '../../server/services/Organizer.service.js';

const OrganizationMembers = sequelize.models.OrganizationMembers;

const makeSession = () => ({
    id: 31,
    dateTime: new Date('2099-06-01T10:00:00.000Z'),
    availableSpots: 5,
    status: 'scheduled',
    Experience: {
        id: 4,
        title: 'Harbor Tour',
        OrganizationId: 8,
        Organization: { id: 8, name: 'Harbor Tours' },
        TicketTiers: [{ id: 12, title: 'Adult', price: '25.00' }],
    },
});

beforeEach(() => {
    jest.clearAllMocks();
    ScheduledExperience.findByPk.mockResolvedValue(makeSession());
    OrganizationMembers.findOne.mockResolvedValue({
        UserId: 10,
        OrganizationId: 8,
    });
    ExperienceReservation.create.mockResolvedValue({ id: 41 });
    ExperienceReservationAttendee.bulkCreate.mockResolvedValue([]);
    Order.create.mockResolvedValue({
        id: 51,
        orderNumber: 'ORD-20260601-ABCD',
        status: 'pending',
    });
    OrderItem.create.mockResolvedValue({});
    sendNotification.mockResolvedValue({ sent: true, provider: 'smtp' });
});

describe('createManualBookingService', () => {
    const booking = {
        fullName: 'Guest Person',
        email: 'guest@example.test',
        contactMethod: 'email',
        paymentMethod: 'online',
        ticketSelections: [{ ticketTierId: 12, quantity: 2 }],
    };

    test('creates an authorized reservation and order, then emails booking details', async () => {
        const result = await createManualBookingService({
            userId: 10,
            sessionId: 31,
            booking,
        });
        const activeTransaction =
            await sequelize.transaction.mock.results[0].value;

        expect(result).toMatchObject({
            orderNumber: 'ORD-20260601-ABCD',
            confirmationCode: expect.stringMatching(/^MAN-[A-F0-9]{12}$/),
            attendeeCount: 2,
            totalAmount: 50,
            paymentMethod: 'online',
            delivery: { status: 'sent', provider: 'smtp' },
        });
        expect(ExperienceReservation.create).toHaveBeenCalledWith(
            expect.objectContaining({
                numberOfAttendees: 2,
                totalPrice: 50,
                billingEmail: 'guest@example.test',
                ScheduledExperienceId: 31,
            }),
            expect.objectContaining({ transaction: activeTransaction })
        );
        expect(ExperienceReservationAttendee.bulkCreate).toHaveBeenCalledWith(
            [
                {
                    ExperienceReservationId: 41,
                    TicketTierId: 12,
                    status: 'active',
                },
                {
                    ExperienceReservationId: 41,
                    TicketTierId: 12,
                    status: 'active',
                },
            ],
            expect.objectContaining({ transaction: activeTransaction })
        );
        expect(Order.create).toHaveBeenCalledWith(
            expect.objectContaining({
                paymentMethod: 'online',
                status: 'pending',
                totalAmount: 50,
            }),
            expect.objectContaining({ transaction: activeTransaction })
        );
        expect(sendNotification).toHaveBeenCalledWith(
            expect.objectContaining({
                template: 'manual-booking-details',
                to: 'guest@example.test',
            })
        );
    });

    test('rejects users who are not members of the session organization', async () => {
        OrganizationMembers.findOne.mockResolvedValue(null);

        await expect(
            createManualBookingService({ userId: 11, sessionId: 31, booking })
        ).rejects.toEqual(expect.objectContaining({ status: 403 }));
        const activeTransaction =
            await sequelize.transaction.mock.results[0].value;
        expect(Order.create).not.toHaveBeenCalled();
        expect(activeTransaction.rollback).toHaveBeenCalled();
    });

    test('rejects phone delivery without a phone number', async () => {
        await expect(
            createManualBookingService({
                userId: 10,
                sessionId: 31,
                booking: { ...booking, contactMethod: 'sms', phone: '' },
            })
        ).rejects.toEqual(expect.objectContaining({ status: 400 }));
        expect(sequelize.transaction).not.toHaveBeenCalled();
    });
});
