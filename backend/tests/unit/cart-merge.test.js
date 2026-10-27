const mockTx = {
    commit: jest.fn().mockResolvedValue(undefined),
    rollback: jest.fn().mockResolvedValue(undefined),
    finished: false,
    LOCK: { UPDATE: 'UPDATE' },
};
const mockTransaction = jest.fn().mockResolvedValue(mockTx);
const mockCartFindOne = jest.fn();
const mockCartItemFindAll = jest.fn();
const mockCartItemUpdate = jest.fn().mockResolvedValue([1]);

jest.mock('../../server/models/database.js', () => ({
    __esModule: true,
    default: { transaction: (...args) => mockTransaction(...args) },
}));
jest.mock('../../server/models/Cart.model.js', () => ({
    __esModule: true,
    default: { findOne: (...args) => mockCartFindOne(...args) },
}));
jest.mock('../../server/models/CartItem.model.js', () => ({
    __esModule: true,
    default: {
        findAll: (...args) => mockCartItemFindAll(...args),
        update: (...args) => mockCartItemUpdate(...args),
    },
}));

import { mergeGuestCart } from '../../server/services/Cart.service.js';

describe('mergeGuestCart', () => {
    beforeEach(() => {
        jest.clearAllMocks();
        mockTx.finished = false;
        mockTransaction.mockResolvedValue(mockTx);
    });

    it('moves each guest line into the account cart and recalculates its total once', async () => {
        const guestCart = { id: 11, update: jest.fn().mockResolvedValue(undefined) };
        const accountCart = { id: 22, update: jest.fn().mockResolvedValue(undefined) };
        mockCartFindOne.mockResolvedValueOnce(guestCart).mockResolvedValueOnce(accountCart);
        mockCartItemFindAll
            .mockResolvedValueOnce([{ id: 1, totalPrice: '40.00' }, { id: 2, totalPrice: '60.00' }])
            .mockResolvedValueOnce([{ id: 3, totalPrice: '50.00' }, { id: 1, totalPrice: '40.00' }, { id: 2, totalPrice: '60.00' }]);

        await expect(mergeGuestCart({ sessionToken: 'guest-token', customerId: 7 })).resolves.toBe(true);

        expect(mockCartItemUpdate).toHaveBeenCalledWith(
            { CartId: 22 },
            expect.objectContaining({ where: { CartId: 11 }, transaction: mockTx })
        );
        expect(accountCart.update).toHaveBeenCalledWith({ totalAmount: 150 }, { transaction: mockTx });
        expect(guestCart.update).toHaveBeenCalledWith(
            { status: 'converted', sessionToken: null, totalAmount: 0 },
            { transaction: mockTx }
        );
        expect(mockTx.commit).toHaveBeenCalledTimes(1);
        expect(mockTx.rollback).not.toHaveBeenCalled();
    });

    it('reassigns the guest cart when the account has no active cart', async () => {
        const guestCart = { id: 11, update: jest.fn().mockResolvedValue(undefined) };
        mockCartFindOne.mockResolvedValueOnce(guestCart).mockResolvedValueOnce(null);

        await expect(mergeGuestCart({ sessionToken: 'guest-token', customerId: 7 })).resolves.toBe(true);

        expect(guestCart.update).toHaveBeenCalledWith(
            { CustomerId: 7, sessionToken: null },
            { transaction: mockTx }
        );
        expect(mockCartItemUpdate).not.toHaveBeenCalled();
        expect(mockTx.commit).toHaveBeenCalledTimes(1);
    });

    it('does not alter carts if the guest cookie has no active cart', async () => {
        mockCartFindOne.mockResolvedValueOnce(null);

        await expect(mergeGuestCart({ sessionToken: 'stale-token', customerId: 7 })).resolves.toBe(false);

        expect(mockCartFindOne).toHaveBeenCalledTimes(1);
        expect(mockTx.commit).toHaveBeenCalledTimes(1);
    });
});
