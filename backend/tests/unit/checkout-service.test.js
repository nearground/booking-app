/**
 * Unit tests for Checkout.service.js
 *
 * These tests verify the core behaviour of checkoutCart at the unit level by
 * mocking every Sequelize model and the database transaction so no real DB is
 * required.
 */

// ---------------------------------------------------------------------------
// Mock all Sequelize models before importing the service.
// Note: jest.mock factories are hoisted before variable declarations, so we
// build the transaction object inside the factory and expose it via a shared
// holder that the test body can reference.
// ---------------------------------------------------------------------------

// Shared holder – populated inside the factory so hoisting is not a problem.
const txHolder = {};

const capturedOrderItemCreates = [];
const capturedOrderCreates = [];

jest.mock('../../server/models/database.js', () => {
    const tx = {
        commit: jest.fn().mockResolvedValue(undefined),
        rollback: jest.fn().mockResolvedValue(undefined),
        finished: false,
    };
    txHolder.tx = tx;
    return {
        transaction: jest.fn().mockResolvedValue(tx),
        models: { ScheduledExperience: null },
    };
});

jest.mock('../../server/models/Cart.model.js', () => ({
    findOne: jest.fn(),
    create: jest.fn().mockResolvedValue({ id: 2, status: 'active' }),
}));

jest.mock('../../server/models/CartItem.model.js', () => ({}));

jest.mock('../../server/models/Order.model.js', () => ({
    create: jest.fn().mockImplementation((data) => {
        capturedOrderCreates.push(data);
        return Promise.resolve({
            id: 1,
            orderNumber: data.orderNumber || 'ORD-TEST-0001',
            status: 'draft',
            update: jest.fn().mockResolvedValue({}),
        });
    }),
    findByPk: jest.fn(),
}));

jest.mock('../../server/models/OrderItem.model.js', () => ({
    create: jest.fn().mockImplementation((data) => {
        capturedOrderItemCreates.push(data);
        return Promise.resolve({ id: capturedOrderItemCreates.length, ...data });
    }),
}));

jest.mock('../../server/models/ExperienceReservation.model.js', () => ({
    create: jest.fn().mockResolvedValue({
        id: 10,
        confirmationCode: 'EXP-CONF-001',
    }),
}));

jest.mock('../../server/models/ExperienceReservationAttendee.model.js', () => ({
    bulkCreate: jest.fn().mockResolvedValue([]),
}));

jest.mock('../../server/models/ExperienceReservationAnswer.model.js', () => ({
    bulkCreate: jest.fn().mockResolvedValue([]),
}));

jest.mock('../../server/models/ExperienceReservationAttendeeAnswer.model.js', () => ({
    bulkCreate: jest.fn().mockResolvedValue([]),
}));

jest.mock('../../server/models/TicketTier.model.js', () => ({
    findAll: jest.fn().mockResolvedValue([{ id: 4, price: '0.00' }]),
}));

jest.mock('../../server/models/ScheduledExperience.model.js', () => ({
    findOne: jest.fn().mockResolvedValue({ id: 555 }),
}));

jest.mock('../../server/models/ServiceReservation.model.js', () => ({
    create: jest.fn().mockResolvedValue({
        id: 20,
        confirmationCode: 'SVC-CONF-002',
    }),
}));

jest.mock('../../server/models/HotelReservation.model.js', () => ({
    create: jest.fn().mockResolvedValue({
        id: 30,
        confirmationCode: 'HTL-CONF-003',
    }),
}));

jest.mock('../../server/services/Notification.service.js', () => ({
    __esModule: true,
    sendNotification: jest.fn().mockResolvedValue({ sent: true, provider: 'smtp' }),
}));

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

const makeCartItem = (type, metadataOverrides = {}) => {
    const base = {
        id: 1,
        ProductType: type,
        ProductId: 101,
        description: `${type} item`,
        unitPrice: '100.00',
        quantity: 1,
        totalPrice: '100.00',
        metadata: {},
    };

    if (type === 'Experience') {
        base.quantity = 2;
        base.unitPrice = '50.00';
        base.metadata = {
            ScheduledExperienceId: 555,
            experienceTitle: 'Sunset Tour',
            experienceThumbnail: 'https://example.com/thumb.jpg',
            sessionDateTime: '2026-05-15T18:00:00.000Z',
            experienceDurationMinutes: 120,
            ticketSelections: [{ ticketTierId: 4, quantity: 2, title: 'Adult', unitPrice: 50 }],
            numberOfAttendees: 2,
            ...metadataOverrides,
        };
    } else if (type === 'Service') {
        base.metadata = {
            ScheduledServiceId: 210,
            ...metadataOverrides,
        };
    } else if (type === 'Hotel') {
        base.metadata = {
            HotelId: 7,
            checkInDate: '2026-06-01',
            checkOutDate: '2026-06-05',
            ...metadataOverrides,
        };
    }

    return base;
};

const makeBillingInfo = () => ({
    email: 'guest@example.com',
    name: 'Jane Doe',
    address: '1 Main St',
    city: 'Springfield',
    state: 'IL',
    postalCode: '62701',
});

// ---------------------------------------------------------------------------
// Import service after mocks are in place
// ---------------------------------------------------------------------------

import { checkoutCart } from '../../server/services/Checkout.service.js';
import Cart from '../../server/models/Cart.model.js';
import Order from '../../server/models/Order.model.js';
import OrderItem from '../../server/models/OrderItem.model.js';
import ExperienceReservation from '../../server/models/ExperienceReservation.model.js';
import ServiceReservation from '../../server/models/ServiceReservation.model.js';
import HotelReservation from '../../server/models/HotelReservation.model.js';
import TicketTier from '../../server/models/TicketTier.model.js';
import ScheduledExperience from '../../server/models/ScheduledExperience.model.js';
import { sendNotification } from '../../server/services/Notification.service.js';

// ---------------------------------------------------------------------------
// Test suite
// ---------------------------------------------------------------------------

beforeEach(() => {
    jest.clearAllMocks();
    TicketTier.findAll.mockResolvedValue([{ id: 4, price: '0.00' }]);
    ScheduledExperience.findOne.mockResolvedValue({ id: 555 });
    Order.findByPk.mockResolvedValue({
        id: 1,
        orderNumber: 'ORD-TEST-0001',
        status: 'pending',
        mainContactEmail: 'guest@example.com',
        mainContactName: 'Jane Doe',
        totalAmount: 100.00,
        Items: [],
        metadata: { guestReceiptTokenHash: 'receipt-hash' },
        setDataValue: jest.fn(function setDataValue(key, value) { this[key] = value; }),
        update: jest.fn().mockResolvedValue({}),
    });
    capturedOrderCreates.length = 0;
    capturedOrderItemCreates.length = 0;
    // Re-initialise the transaction mock state after clearAllMocks
    txHolder.tx.finished = false;
    txHolder.tx.commit.mockResolvedValue(undefined);
    txHolder.tx.rollback.mockResolvedValue(undefined);
    // Re-wire database.transaction to return the tx object again
    require('../../server/models/database.js').transaction.mockResolvedValue(txHolder.tx);
});

describe('checkoutCart – confirmationCode snapshotting into OrderItem.metadata', () => {
    const setupCart = (items) => {
        Cart.findOne.mockResolvedValue({
            id: 1,
            Items: items,
            currency: 'USD',
            totalAmount: '100.00',
            discountAmount: '0.00',
            update: jest.fn().mockResolvedValue({}),
        });
    };

    test('snapshots ExperienceReservation confirmationCode into OrderItem metadata', async () => {
        const item = makeCartItem('Experience');
        setupCart([item]);

        await checkoutCart(1, 42, makeBillingInfo());

        expect(OrderItem.create).toHaveBeenCalledTimes(1);
        const savedMetadata = capturedOrderItemCreates[0].metadata;
        expect(savedMetadata.confirmationCode).toBe('EXP-CONF-001');
    });

    test('confirms free registration atomically without waiting for a payment webhook', async () => {
        const item = { ...makeCartItem('Experience'), unitPrice: '0.00', totalPrice: '0.00' };
        Cart.findOne.mockResolvedValue({
            id: 1,
            Items: [item],
            currency: 'USD',
            totalAmount: '0.00',
            discountAmount: '0.00',
            update: jest.fn().mockResolvedValue({}),
        });

        await checkoutCart(1, 42, makeBillingInfo());

        expect(ExperienceReservation.create).toHaveBeenCalledWith(
            expect.objectContaining({ status: 'confirmed', totalPrice: 0 }),
            { transaction: txHolder.tx }
        );
        const order = await Order.create.mock.results[0].value;
        expect(order.update).toHaveBeenCalledWith({ status: 'paid' }, { transaction: txHolder.tx });
        expect(txHolder.tx.commit).toHaveBeenCalledTimes(1);
    });

    test('paid-price bookings still await payment confirmation', async () => {
        setupCart([makeCartItem('Experience')]);
        await checkoutCart(1, 42, makeBillingInfo());
        expect(ExperienceReservation.create).toHaveBeenCalledWith(
            expect.objectContaining({ status: 'pending' }),
            { transaction: txHolder.tx }
        );
        const order = await Order.create.mock.results[0].value;
        expect(order.update).toHaveBeenCalledWith({ status: 'pending' }, { transaction: txHolder.tx });
    });

    test.each([{ tiers: [{ id: 4, price: '50.00' }] }, { tiers: [] }])('does not auto-confirm client-supplied zero prices for paid or unrelated tiers', async ({ tiers }) => {
        const item = { ...makeCartItem('Experience'), unitPrice: '0.00', totalPrice: '0.00' };
        Cart.findOne.mockResolvedValue({
            id: 1, Items: [item], currency: 'USD', totalAmount: '0.00', discountAmount: '0.00',
            update: jest.fn().mockResolvedValue({}),
        });
        TicketTier.findAll.mockResolvedValue(tiers);
        await expect(checkoutCart(1, 42, makeBillingInfo())).rejects.toThrow('Free registration requires free ticket tiers');
        expect(ExperienceReservation.create).not.toHaveBeenCalled();
        expect(txHolder.tx.rollback).toHaveBeenCalledTimes(1);
    });

    test('binds a free ticket to its experience session before confirming', async () => {
        const item = { ...makeCartItem('Experience'), unitPrice: '0.00', totalPrice: '0.00' };
        Cart.findOne.mockResolvedValue({
            id: 1, Items: [item], currency: 'USD', totalAmount: '0.00', discountAmount: '0.00',
            update: jest.fn().mockResolvedValue({}),
        });
        ScheduledExperience.findOne.mockResolvedValue(null);
        await expect(checkoutCart(1, 42, makeBillingInfo())).rejects.toThrow('Invalid Experience session');
        expect(ScheduledExperience.findOne).toHaveBeenCalledWith({
            where: { id: 555, ExperienceId: 101 }, attributes: ['id'], transaction: txHolder.tx,
        });
        expect(ExperienceReservation.create).not.toHaveBeenCalled();
    });

    test('preserves original CartItem metadata fields alongside confirmationCode for Experience', async () => {
        const item = makeCartItem('Experience');
        setupCart([item]);

        await checkoutCart(1, 42, makeBillingInfo());

        const savedMetadata = capturedOrderItemCreates[0].metadata;
        expect(savedMetadata.experienceTitle).toBe('Sunset Tour');
        expect(savedMetadata.ticketSelections).toHaveLength(1);
        expect(savedMetadata.sessionDateTime).toBe('2026-05-15T18:00:00.000Z');
        expect(savedMetadata.confirmationCode).toBe('EXP-CONF-001');
    });

    test('rejects experience checkout when selections no longer match cart quantity', async () => {
        setupCart([makeCartItem('Experience', { ticketSelections: [{ ticketTierId: 4, quantity: 1 }] })]);
        await expect(checkoutCart(1, 42, makeBillingInfo())).rejects.toThrow('Invalid Experience ticket selections');
        expect(ExperienceReservation.create).not.toHaveBeenCalled();
    });
    test('rejects legacy Service cart rows', async () => {
        setupCart([makeCartItem('Service')]);
        await expect(checkoutCart(1, 42, makeBillingInfo())).rejects.toThrow('Only Experience items can be checked out');
        expect(OrderItem.create).not.toHaveBeenCalled();
    });

    test('rejects legacy Hotel cart rows', async () => {
        setupCart([makeCartItem('Hotel')]);
        await expect(checkoutCart(1, 42, makeBillingInfo())).rejects.toThrow('Only Experience items can be checked out');
        expect(OrderItem.create).not.toHaveBeenCalled();
    });

    test('creates one OrderItem for each Experience cart line', async () => {
        const items = [makeCartItem('Experience'), makeCartItem('Experience')];
        items[1].id = 2;
        setupCart(items);
        await checkoutCart(1, 42, makeBillingInfo());
        expect(OrderItem.create).toHaveBeenCalledTimes(2);
        expect(capturedOrderItemCreates.every((item) => item.ProductType === 'Experience')).toBe(true);
    });

    test('generates an orderNumber when creating an order', async () => {
        setupCart([makeCartItem('Experience')]);
        await checkoutCart(1, 42, makeBillingInfo());
        expect(capturedOrderCreates).toHaveLength(1);
        expect(capturedOrderCreates[0].orderNumber).toMatch(/^ORD-\d{8}-[A-Z0-9]{4}$/);
    });

    test('throws when cart is not found', async () => {
        Cart.findOne.mockResolvedValue(null);
        await expect(checkoutCart(999, 42, makeBillingInfo())).rejects.toThrow(
            'Cart not found or not in a valid state for checkout'
        );
    });

    test('throws when cart is empty', async () => {
        Cart.findOne.mockResolvedValue({
            id: 1,
            Items: [],
            currency: 'USD',
            totalAmount: '0.00',
            discountAmount: '0.00',
            update: jest.fn(),
        });
        await expect(checkoutCart(1, 42, makeBillingInfo())).rejects.toThrow('Cart is empty');
    });

    test('creates ExperienceReservation with correct CustomerId', async () => {
        setupCart([makeCartItem('Experience')]);

        await checkoutCart(1, 99, makeBillingInfo());

        expect(ExperienceReservation.create).toHaveBeenCalledWith(
            expect.objectContaining({ CustomerId: 99 }),
            expect.anything()
        );
    });

    test('rejects Service cart rows before creating reservations', async () => {
        setupCart([makeCartItem('Service')]);
        await expect(checkoutCart(1, 42, makeBillingInfo())).rejects.toThrow('Only Experience items can be checked out');
        expect(ServiceReservation.create).not.toHaveBeenCalled();
    });

    test('rejects Hotel cart rows before creating reservations', async () => {
        setupCart([makeCartItem('Hotel')]);
        await expect(checkoutCart(1, 42, makeBillingInfo())).rejects.toThrow('Only Experience items can be checked out');
        expect(HotelReservation.create).not.toHaveBeenCalled();
    });

    test('transaction is committed on success', async () => {
        setupCart([makeCartItem('Experience')]);

        await checkoutCart(1, 42, makeBillingInfo());

        expect(txHolder.tx.commit).toHaveBeenCalledTimes(1);
        expect(txHolder.tx.rollback).not.toHaveBeenCalled();
    });

    test('transaction is rolled back on ExperienceReservation create failure', async () => {
        ExperienceReservation.create.mockRejectedValueOnce(new Error('DB error'));
        setupCart([makeCartItem('Experience')]);

        await expect(checkoutCart(1, 42, makeBillingInfo())).rejects.toThrow('DB error');
        expect(txHolder.tx.rollback).toHaveBeenCalledTimes(1);
        expect(txHolder.tx.commit).not.toHaveBeenCalled();
    });
});

describe('checkoutCart � guest ownership', () => {
    test.each([undefined, true, false])('persists guest save-for-later preference %s with receipt access intact', async (preference) => {
        Cart.findOne.mockResolvedValue({
            id: 5, CustomerId: null, sessionToken: 'guest-session',
            Items: [makeCartItem('Experience')], currency: 'USD',
            totalAmount: '100.00', discountAmount: '0.00',
            update: jest.fn().mockResolvedValue({}),
        });
        await checkoutCart(5, null, makeBillingInfo(), {}, 'guest-session', {
            tokenHash: 'a'.repeat(64), expiresAt: '2030-01-01T00:00:00Z', saveBookingForLater: preference,
        });
        expect(capturedOrderCreates[0].metadata).toEqual({
            guestReceiptTokenHash: 'a'.repeat(64),
            guestReceiptExpiresAt: '2030-01-01T00:00:00Z',
            saveBookingForLater: preference !== false,
        });
    });

    test('checks the guest session token and stores only a hashed receipt capability', async () => {
        const cart = {
            id: 5,
            CustomerId: null,
            sessionToken: 'guest-session',
            Items: [makeCartItem('Experience')],
            currency: 'USD',
            totalAmount: '100.00',
            discountAmount: '0.00',
            update: jest.fn().mockResolvedValue({}),
        };
        Cart.findOne.mockResolvedValue(cart);
        const guestReceipt = { tokenHash: 'a'.repeat(64), expiresAt: new Date(Date.now() + 60000).toISOString() };

        await checkoutCart(5, null, makeBillingInfo(), { fullName: 'Jane Doe', email: 'guest@example.com' }, 'guest-session', guestReceipt);

        expect(Cart.findOne).toHaveBeenCalledWith(expect.objectContaining({
            where: expect.objectContaining({ id: 5, sessionToken: 'guest-session' }),
        }));
        expect(capturedOrderCreates[0]).toEqual(expect.objectContaining({
            CustomerId: null,
            metadata: expect.objectContaining({ guestReceiptTokenHash: 'a'.repeat(64) }),
        }));
        expect(cart.update).toHaveBeenLastCalledWith({ status: 'converted', sessionToken: null }, { transaction: txHolder.tx });
        expect(Cart.create).toHaveBeenCalledWith(expect.objectContaining({ CustomerId: null, sessionToken: 'guest-session' }), { transaction: txHolder.tx });
    });

    test('rejects checkout without an authenticated owner or guest session', async () => {
        await expect(checkoutCart(5, null, makeBillingInfo())).rejects.toThrow('Cart not found or not in a valid state for checkout');
        expect(Cart.findOne).not.toHaveBeenCalled();
    });
});
describe('checkoutCart – booking confirmation email', () => {
    const setupCart = (items) => {
        Cart.findOne.mockResolvedValue({
            id: 1,
            Items: items,
            currency: 'USD',
            totalAmount: '100.00',
            discountAmount: '0.00',
            update: jest.fn().mockResolvedValue({}),
        });
    };

    test('sends booking-confirmation email after successful checkout', async () => {
        setupCart([makeCartItem('Experience')]);

        const result = await checkoutCart(1, 42, makeBillingInfo());

        expect(sendNotification).toHaveBeenCalledTimes(1);
        expect(sendNotification).toHaveBeenCalledWith(
            expect.objectContaining({
                template: 'booking-confirmation',
                to: 'guest@example.com',
                payload: expect.objectContaining({
                    mainContactName: 'Jane Doe',
                    orderNumber: 'ORD-TEST-0001',
                }),
            })
        );
        expect(result.update).toHaveBeenCalledWith({
            metadata: {
                guestReceiptTokenHash: 'receipt-hash',
                confirmationEmail: { status: 'sent', attemptedAt: expect.any(String) },
            },
        });
    });

    test('checkout succeeds even when email notification fails', async () => {
        sendNotification.mockRejectedValueOnce(new Error('SMTP down'));
        setupCart([makeCartItem('Experience')]);

        const result = await checkoutCart(1, 42, makeBillingInfo());

        expect(result).toBeDefined();
        expect(result.orderNumber).toBe('ORD-TEST-0001');
        expect(result.metadata.confirmationEmail.status).toBe('failed');
        expect(txHolder.tx.commit).toHaveBeenCalledTimes(1);
    });

    test.each([
        { sent: false, provider: 'smtp', reason: 'authentication_failed' },
        { sent: false, provider: 'disabled' },
        { sent: true, provider: 'console' },
    ])('flags non-delivery for $provider without failing checkout', async (notification) => {
        sendNotification.mockResolvedValueOnce(notification);
        setupCart([makeCartItem('Experience')]);

        const result = await checkoutCart(1, 42, makeBillingInfo());

        expect(result.metadata.confirmationEmail.status).toBe('failed');
        expect(result.update).toHaveBeenCalledWith(expect.objectContaining({
            metadata: expect.objectContaining({ confirmationEmail: expect.objectContaining({ status: 'failed' }) }),
        }));
        expect(txHolder.tx.rollback).not.toHaveBeenCalled();
    });

    test('returns the failure flag and logs if persisting email status fails after commit', async () => {
        const order = await Order.findByPk();
        order.update.mockRejectedValueOnce(new Error('DB unavailable'));
        const log = jest.spyOn(console, 'error').mockImplementation(() => {});
        sendNotification.mockResolvedValueOnce({ sent: false, provider: 'smtp' });
        setupCart([makeCartItem('Experience')]);

        const result = await checkoutCart(1, 42, makeBillingInfo());

        expect(result.metadata.confirmationEmail.status).toBe('failed');
        expect(log).toHaveBeenCalledWith('[checkout] could not persist confirmation email status', expect.objectContaining({ orderId: 1 }));
        expect(txHolder.tx.rollback).not.toHaveBeenCalled();
        log.mockRestore();
    });

    test('does not send email when mainContactEmail is absent', async () => {
        Order.findByPk.mockResolvedValueOnce({
            id: 1,
            orderNumber: 'ORD-TEST-0001',
            status: 'pending',
            mainContactEmail: null,
            mainContactName: null,
            totalAmount: 100.00,
            Items: [],
            setDataValue: jest.fn(function setDataValue(key, value) { this[key] = value; }),
            update: jest.fn().mockResolvedValue({}),
        });
        setupCart([makeCartItem('Experience')]);

        await checkoutCart(1, 42, makeBillingInfo());

        expect(sendNotification).not.toHaveBeenCalled();
    });

    test('does not send email when transaction rolls back', async () => {
        ExperienceReservation.create.mockRejectedValueOnce(new Error('DB error'));
        setupCart([makeCartItem('Experience')]);

        await expect(checkoutCart(1, 42, makeBillingInfo())).rejects.toThrow('DB error');

        expect(sendNotification).not.toHaveBeenCalled();
    });
});
