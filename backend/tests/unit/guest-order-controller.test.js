import crypto from 'node:crypto';

const mockFindOrder = jest.fn();
jest.mock('../../server/models/Order.model.js', () => ({ __esModule: true, default: { findOne: (...args) => mockFindOrder(...args) } }));
jest.mock('../../server/models/OrderItem.model.js', () => ({ __esModule: true, default: {} }));
jest.mock('../../server/models/ExperienceReservation.model.js', () => ({ __esModule: true, default: {} }));
jest.mock('../../server/models/ScheduledExperience.model.js', () => ({ __esModule: true, default: {} }));
jest.mock('../../server/models/Experience.model.js', () => ({ __esModule: true, default: {} }));
jest.mock('../../server/models/Organization.model.js', () => ({ __esModule: true, default: {} }));
jest.mock('../../server/models/ServiceReservation.model.js', () => ({ __esModule: true, default: {} }));
jest.mock('../../server/models/HotelReservation.model.js', () => ({ __esModule: true, default: {} }));
jest.mock('../../server/services/Checkout.service.js', () => ({
    __esModule: true,
    checkoutCart: jest.fn(),
    confirmOrder: jest.fn(),
    cancelOrder: jest.fn(),
}));

import { getGuestOrder, initiateCheckout, getOrderConfirmation } from '../../server/controllers/Order.controller.js';
import { checkoutCart } from '../../server/services/Checkout.service.js';

const makeResponse = () => ({
    status: jest.fn().mockReturnThis(),
    json: jest.fn().mockReturnThis(),
});

describe('guest receipt capability', () => {
    beforeEach(() => jest.clearAllMocks());

    test('returns an unclaimed guest order only with its valid, unexpired capability', async () => {
        const token = 'capability-token';
        const order = {
            metadata: {
                guestReceiptTokenHash: crypto.createHash('sha256').update(token).digest('hex'),
                guestReceiptExpiresAt: new Date(Date.now() + 60000).toISOString(),
                confirmationEmail: { status: 'failed', attemptedAt: '2026-10-27T04:00:00Z' },
            },
            setDataValue: jest.fn(function setDataValue(key, value) { this[key] = value; }),
        };
        mockFindOrder.mockResolvedValue(order);
        const res = makeResponse();

        await getGuestOrder({ body: { orderNumber: 'ORD-1', receiptToken: token } }, res);

        expect(mockFindOrder).toHaveBeenCalledWith(expect.objectContaining({ where: { orderNumber: 'ORD-1', CustomerId: null } }));
        expect(order.setDataValue).toHaveBeenCalledWith('metadata', null);
        expect(order.setDataValue).toHaveBeenCalledWith('confirmationEmail', { status: 'failed', attemptedAt: '2026-10-27T04:00:00Z' });
        expect(res.status).toHaveBeenCalledWith(200);
        expect(res.json).toHaveBeenCalledWith(expect.objectContaining({ data: { order } }));
    });

    describe('confirmation email status responses', () => {
        beforeEach(() => jest.clearAllMocks());

        test.each(['sent', 'failed'])('checkout exposes %s email status without exposing receipt metadata', async (status) => {
            const confirmationEmail = { status, attemptedAt: '2026-10-27T04:00:00Z' };
            checkoutCart.mockResolvedValue({
                id: 1,
                orderNumber: 'ORD-1',
                metadata: { guestReceiptTokenHash: 'secret', confirmationEmail },
            });
            const res = makeResponse();

            await initiateCheckout({
                user: { id: 1 },
                body: {
                    cartId: 1,
                    billingInfo: { email: 'guest@example.com', name: 'Guest', address: '1 Main', city: 'Town', state: 'State', postalCode: '12345' },
                },
            }, res);

            expect(res.status).toHaveBeenCalledWith(201);
            const response = res.json.mock.calls[0][0];
            expect(response.data.confirmationEmail).toEqual(confirmationEmail);
            expect(response.data).not.toHaveProperty('metadata');
        });

        test('reopening a confirmation returns persisted email failure status', async () => {
            const confirmationEmail = { status: 'failed', attemptedAt: '2026-10-27T04:00:00Z' };
            mockFindOrder.mockResolvedValue({ metadata: { confirmationEmail } });
            const res = makeResponse();

            await getOrderConfirmation({ user: { id: 1 }, params: { orderNumber: 'ORD-1' } }, res);

            expect(res.status).toHaveBeenCalledWith(200);
            expect(res.json.mock.calls[0][0].data.confirmationEmail).toEqual(confirmationEmail);
        });
    });

    test('does not disclose orders for invalid capability tokens', async () => {
        mockFindOrder.mockResolvedValue({ metadata: { guestReceiptTokenHash: 'a'.repeat(64), guestReceiptExpiresAt: new Date(Date.now() + 60000).toISOString() } });
        const res = makeResponse();

        await getGuestOrder({ body: { orderNumber: 'ORD-1', receiptToken: 'wrong-token' } }, res);

        expect(res.status).toHaveBeenCalledWith(404);
    });
});