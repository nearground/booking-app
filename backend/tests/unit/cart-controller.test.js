const mockCartFindOne = jest.fn();
const mockCartItemDestroy = jest.fn();
const mockCartItemFindOne = jest.fn();
const mockCartItemUpdate = jest.fn();
const mockCartItemFindAll = jest.fn();

jest.mock('../../server/models/Cart.model.js', () => ({ __esModule: true, default: { findOne: (...args) => mockCartFindOne(...args) } }));
jest.mock('../../server/models/CartItem.model.js', () => ({ __esModule: true, default: { destroy: (...args) => mockCartItemDestroy(...args), findOne: (...args) => mockCartItemFindOne(...args), findAll: (...args) => mockCartItemFindAll(...args) } }));

import { addItem, getCart, updateItem } from '../../server/controllers/Cart.controller.js';

const makeResponse = () => {
    const response = {
        status: jest.fn().mockReturnThis(),
        json: jest.fn().mockReturnThis(),
        cookie: jest.fn(),
    };
    return response;
};

describe('experience-only cart API', () => {
    beforeEach(() => jest.clearAllMocks());

    test.each(['Hotel', 'Service'])('rejects %s additions', async (ProductType) => {
        const res = makeResponse();
        await addItem({ body: { ProductType, description: 'legacy', unitPrice: 12 }, cookies: {} }, res);
        expect(res.status).toHaveBeenCalledWith(400);
        expect(res.json).toHaveBeenCalledWith(expect.objectContaining({ errors: ['Only Experience items can be added to the cart'] }));
        expect(mockCartFindOne).not.toHaveBeenCalled();
    });

    test('rejects item updates when ticket selections do not match quantity', async () => {
        const cart = { id: 8 };
        const item = { id: 3, ProductType: 'Experience', quantity: 1, metadata: { ScheduledExperienceId: 55, ticketSelections: [{ ticketTierId: 2, quantity: 1 }] }, update: jest.fn() };
        mockCartFindOne.mockResolvedValue(cart);
        mockCartItemFindOne.mockResolvedValue(item);
        const res = makeResponse();

        await updateItem({ params: { id: 3 }, body: { quantity: 2 }, cookies: { _cart_session: 'guest' } }, res);

        expect(res.status).toHaveBeenCalledWith(400);
        expect(item.update).not.toHaveBeenCalled();
    });
    test('clears legacy lines, recomputes totals, and reports a notice on next cart load', async () => {
        const cart = {
            id: 8,
            status: 'active',
            Items: [
                { id: 1, ProductType: 'Experience', totalPrice: '50.00' },
                { id: 2, ProductType: 'Hotel', totalPrice: '90.00' },
                { id: 3, ProductType: 'Service', totalPrice: '20.00' },
            ],
            update: jest.fn().mockResolvedValue(undefined),
            setDataValue: jest.fn(function setDataValue(key, value) { this[key] = value; }),
        };
        mockCartFindOne.mockResolvedValue(cart);
        mockCartItemDestroy.mockResolvedValue(2);
        const res = makeResponse();

        await getCart({ cookies: { _cart_session: 'guest' } }, res);

        const deletionWhere = mockCartItemDestroy.mock.calls[0][0].where;
        expect(deletionWhere.CartId).toBe(8);
        const inOperator = Object.getOwnPropertySymbols(deletionWhere.id)[0];
        expect(deletionWhere.id[inOperator]).toEqual([2, 3]);
        expect(cart.update).toHaveBeenCalledWith({ totalAmount: 50 });
        expect(cart.Items.map((item) => item.ProductType)).toEqual(['Experience']);
        expect(res.json).toHaveBeenCalledWith(expect.objectContaining({ data: expect.objectContaining({ notice: expect.stringContaining('removed') }) }));
    });
});