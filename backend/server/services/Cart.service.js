import { createRequire } from 'node:module';
const require = createRequire(import.meta.url);
const { Op } = require('sequelize');

import sequelize from '../models/database.js';
import Cart from '../models/Cart.model.js';
import CartItem from '../models/CartItem.model.js';

const sumItems = (items) => Number(items.reduce((sum, item) => sum + Number(item.totalPrice || 0), 0).toFixed(2));

export const mergeGuestCart = async ({ sessionToken, customerId }) => {
    if (!sessionToken || !customerId) return false;

    const transaction = await sequelize.transaction();
    try {
        const guestCart = await Cart.findOne({
            where: { sessionToken, status: 'active' },
            include: [{ model: CartItem, as: 'Items' }],
            transaction,
            lock: transaction.LOCK?.UPDATE,
        });
        if (!guestCart) {
            await transaction.commit();
            return false;
        }

        const accountCart = await Cart.findOne({
            where: { CustomerId: customerId, status: { [Op.in]: ['active', 'checkout'] } },
            transaction,
            lock: transaction.LOCK?.UPDATE,
        });

        if (!accountCart) {
            await guestCart.update({ CustomerId: customerId, sessionToken: null }, { transaction });
            await transaction.commit();
            return true;
        }

        const guestItems = await CartItem.findAll({ where: { CartId: guestCart.id }, transaction });
        if (guestItems.length > 0) {
            await CartItem.update(
                { CartId: accountCart.id },
                { where: { CartId: guestCart.id }, transaction }
            );
        }

        const accountItems = await CartItem.findAll({ where: { CartId: accountCart.id }, transaction });
        await accountCart.update({ totalAmount: sumItems(accountItems) }, { transaction });
        await guestCart.update({ status: 'converted', sessionToken: null, totalAmount: 0 }, { transaction });
        await transaction.commit();
        return true;
    } catch (error) {
        if (!transaction.finished) await transaction.rollback();
        throw error;
    }
};

export default { mergeGuestCart };
