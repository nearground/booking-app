import { createRequire } from 'node:module';
const require = createRequire(import.meta.url);
const { Op } = require('sequelize');

import sequelize from '../models/database.js';
import Cart from '../models/Cart.model.js';
import CartItem from '../models/CartItem.model.js';

const sumItems = (items) => Number(items.reduce((sum, item) => sum + Number(item.totalPrice || 0), 0).toFixed(2));

const getSelectionKey = (item) => {
    if (item.ProductType !== 'Experience' || !Number.isInteger(Number(item.ProductId)) || Number(item.ProductId) < 1) return null;
    const metadata = item.metadata || {};
    if (!Array.isArray(metadata.ticketSelections) || metadata.ticketSelections.length === 0) return null;
    if (metadata.ticketSelections.some((selection) => !selection || typeof selection !== 'object')) return null;

    const ticketSelections = metadata.ticketSelections
        .map(({ quantity, ...selection }) => selection)
        .sort((left, right) => Number(left.ticketTierId) - Number(right.ticketTierId));
    const normalizedMetadata = { ...metadata, ticketSelections };
    delete normalizedMetadata.numberOfAttendees;
    return JSON.stringify([item.ProductType, Number(item.ProductId), normalizedMetadata]);
};

const consolidateDuplicateSelections = async (items, transaction) => {
    const groups = new Map();
    for (const item of items) {
        const key = getSelectionKey(item);
        if (!key) continue;
        if (!groups.has(key)) groups.set(key, []);
        groups.get(key).push(item);
    }

    for (const group of groups.values()) {
        if (group.length < 2) continue;
        const target = group[0];
        const selectionsByTier = new Map();
        for (const item of group) {
            for (const selection of item.metadata.ticketSelections) {
                const tierId = Number(selection.ticketTierId);
                const existing = selectionsByTier.get(tierId);
                if (existing) existing.quantity += Number(selection.quantity);
                else selectionsByTier.set(tierId, { ...selection, ticketTierId: tierId, quantity: Number(selection.quantity) });
            }
        }
        const quantity = group.reduce((sum, item) => sum + Number(item.quantity), 0);
        const totalPrice = Number(group.reduce((sum, item) => sum + Number(item.totalPrice || 0), 0).toFixed(2));
        const duplicateIds = group.slice(1).map((item) => item.id);
        await CartItem.update({
            quantity,
            unitPrice: Number((totalPrice / quantity).toFixed(2)),
            totalPrice,
            metadata: {
                ...target.metadata,
                numberOfAttendees: quantity,
                ticketSelections: [...selectionsByTier.values()].sort((left, right) => left.ticketTierId - right.ticketTierId),
            },
        }, { where: { id: target.id }, transaction });
        await CartItem.destroy({ where: { id: { [Op.in]: duplicateIds } }, transaction });
    }
};

export const mergeGuestCart = async ({ sessionToken, customerId }) => {
    if (!sessionToken || !customerId) return false;

    const transaction = await sequelize.transaction();
    try {
        const guestCart = await Cart.findOne({
            where: { sessionToken, status: 'active' },
            include: [{ model: CartItem, as: 'Items' }],
            transaction,
            lock: true,
        });
        if (!guestCart) {
            await transaction.commit();
            return false;
        }

        const accountCart = await Cart.findOne({
            where: { CustomerId: customerId, status: 'active' },
            transaction,
            lock: true,
        });

        let destinationCart = guestCart;
        if (accountCart) {
            destinationCart = accountCart;
            const guestItems = await CartItem.findAll({ where: { CartId: guestCart.id }, transaction });
            if (guestItems.length > 0) {
                await CartItem.update(
                    { CartId: accountCart.id },
                    { where: { CartId: guestCart.id }, transaction }
                );
            }
            await guestCart.update({ status: 'converted', sessionToken: null, totalAmount: 0 }, { transaction });
        } else {
            await guestCart.update({ CustomerId: customerId, sessionToken: null }, { transaction });
        }

        const destinationItems = await CartItem.findAll({ where: { CartId: destinationCart.id }, transaction });
        await consolidateDuplicateSelections(destinationItems, transaction);
        await destinationCart.update({ totalAmount: sumItems(destinationItems) }, { transaction });
        await transaction.commit();
        return true;
    } catch (error) {
        if (!transaction.finished) await transaction.rollback();
        throw error;
    }
};

export default { mergeGuestCart };
