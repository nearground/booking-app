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
    findByPk: jest.fn().mockResolvedValue({
        id: 1,
        orderNumber: 'ORD-TEST-0001',
        status: 'pending',
        mainContactEmail: 'guest@example.com',
        mainContactName: 'Jane Doe',
        totalAmount: 100.00,
        Items: [],
    }),
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
import OrderItem from '../../server/models/OrderItem.model.js';
import ExperienceReservation from '../../server/models/ExperienceReservation.model.js';
import ServiceReservation from '../../server/models/ServiceReservation.model.js';
import HotelReservation from '../../server/models/HotelReservation.model.js';
import { sendNotification } from '../../server/services/Notification.service.js';

// ---------------------------------------------------------------------------
// Test suite
// ---------------------------------------------------------------------------

beforeEach(() => {
    jest.clearAllMocks();
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
    const Order = require('../../server/models/Order.model.js');

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

        await checkoutCart(1, 42, makeBillingInfo());

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
    });

    test('checkout succeeds even when email notification fails', async () => {
        sendNotification.mockRejectedValueOnce(new Error('SMTP down'));
        setupCart([makeCartItem('Experience')]);

        const result = await checkoutCart(1, 42, makeBillingInfo());

        expect(result).toBeDefined();
        expect(result.orderNumber).toBe('ORD-TEST-0001');
        expect(txHolder.tx.commit).toHaveBeenCalledTimes(1);
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
