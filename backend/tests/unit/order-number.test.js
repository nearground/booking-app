import { describe, expect, test } from '@jest/globals';
import Order from '../../server/models/Order.model.js';

const orderValues = {
    status: 'pending',
    currency: 'USD',
    subtotalAmount: 25,
    totalAmount: 25,
    paymentMethod: 'online',
};

describe('order number generation', () => {
    test('generates the required order number before validating a new order', async () => {
        const order = Order.build(orderValues);

        await expect(order.validate()).resolves.toBe(order);
        expect(order.orderNumber).toMatch(/^ORD-\d{8}-[A-Z0-9]{4}$/);

        const orderNumber = order.orderNumber;
        await order.validate();
        await Order.runHooks('beforeCreate', order, {});
        expect(order.orderNumber).toBe(orderNumber);
    });

    test.each(['ORD-20260601-ABCD', 'SEED-demo-0001'])(
        'preserves a supplied order number: %s',
        async (orderNumber) => {
            const order = Order.build({ ...orderValues, orderNumber });

            await order.validate();
            await Order.runHooks('beforeCreate', order, {});

            expect(order.orderNumber).toBe(orderNumber);
        }
    );

    test('does not generate a replacement number when validating an existing order', async () => {
        const order = Order.build(orderValues, { isNewRecord: false });

        await expect(order.validate()).rejects.toThrow('Order.orderNumber cannot be null');
        expect(order.orderNumber).toBeUndefined();
    });
});
