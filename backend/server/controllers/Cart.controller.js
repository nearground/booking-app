import { createRequire } from 'node:module';
const require = createRequire(import.meta.url);

const { Op } = require('sequelize');
const crypto = require('crypto');

import Cart from '../models/Cart.model.js';
import CartItem from '../models/CartItem.model.js';
import { sendError } from '../utils/http-response.js';

const CART_SESSION_COOKIE = '_cart_session';
const CART_SESSION_MAX_AGE = 30 * 24 * 60 * 60 * 1000; // 30 days

const getCartOwnerFilter = (req) => {
    if (req.user?.id) {
        return { CustomerId: req.user.id };
    }
    const sessionToken = req.cookies?.[CART_SESSION_COOKIE];
    if (sessionToken) {
        return { sessionToken };
    }
    return null;
};

const validateExperienceMetadata = (metadata, quantity) => {
    if (!metadata || typeof metadata !== 'object' || Array.isArray(metadata)) return 'Experience metadata is required';
    if (!Number.isInteger(Number(metadata.ScheduledExperienceId)) || Number(metadata.ScheduledExperienceId) < 1) {
        return 'metadata.ScheduledExperienceId is required for Experience items';
    }
    if (!Array.isArray(metadata.ticketSelections) || metadata.ticketSelections.length === 0) {
        return 'metadata.ticketSelections must be a non-empty array for Experience items';
    }
    let selectedQuantity = 0;
    for (const selection of metadata.ticketSelections) {
        if (!selection || !Number.isInteger(Number(selection.ticketTierId)) || Number(selection.ticketTierId) < 1 ||
            !Number.isInteger(Number(selection.quantity)) || Number(selection.quantity) < 1) {
            return 'Each ticketSelection must have ticketTierId and a positive quantity';
        }
        selectedQuantity += Number(selection.quantity);
    }
    if (selectedQuantity !== quantity) return 'quantity must match the selected ticket quantities';
    if (metadata.mainContact?.phone && !String(metadata.mainContact.phone).trim()) {
        return 'metadata.mainContact.phone is required';
    }
    return null;
};
const ensureSessionToken = (req, res) => {
    if (req.user?.id) return null;
    let sessionToken = req.cookies?.[CART_SESSION_COOKIE];
    if (!sessionToken) {
        sessionToken = crypto.randomUUID();
        res.cookie(CART_SESSION_COOKIE, sessionToken, {
            httpOnly: true,
            secure: process.env.NODE_ENV === 'production',
            sameSite: 'lax',
            maxAge: CART_SESSION_MAX_AGE,
        });
    }
    return sessionToken;
};

const getCart = async (req, res) => {
    try {
        const ownerFilter = getCartOwnerFilter(req);
        if (!ownerFilter) return res.status(200).json({ errors: [], data: { cart: null } });
        const cart = await Cart.findOne({
            where: { ...ownerFilter, status: { [Op.in]: ['active', 'checkout'] } },
            include: [{ model: CartItem, as: 'Items' }],
            order: [['createdAt', 'DESC']],
        });
        if (!cart) return res.status(200).json({ errors: [], data: { cart: null } });
        let notice;
        if (cart.status === 'active') {
            const legacyItems = (cart.Items || []).filter((item) => item.ProductType !== 'Experience');
            if (legacyItems.length > 0) {
                await CartItem.destroy({ where: { id: { [Op.in]: legacyItems.map((item) => item.id) }, CartId: cart.id } });
                const items = (cart.Items || []).filter((item) => item.ProductType === 'Experience');
                const totalAmount = Number(items.reduce((sum, item) => sum + Number(item.totalPrice || 0), 0).toFixed(2));
                await cart.update({ totalAmount });
                cart.setDataValue('Items', items);
                notice = 'Hotel and service items were removed because the cart now supports experience tickets only.';
            }
        }
        return res.status(200).json({ errors: [], data: { cart, ...(notice ? { notice } : {}) } });
    } catch (error) {
        return sendError(res, { status: 500, message: 'Failed to retrieve cart' });
    }
};

const addItem = async (req, res) => {
    try {
        const { ProductType, ProductId, description, unitPrice, quantity = 1, metadata } = req.body;

        if (!ProductType || !description || unitPrice == null) {
            return sendError(res, { status: 400, message: 'ProductType, description, and unitPrice are required' });
        }

        if (ProductType !== 'Experience') {
            return sendError(res, { status: 400, message: 'Only Experience items can be added to the cart' });
        }

        const parsedUnitPrice = Number(unitPrice);
        if (!Number.isFinite(parsedUnitPrice) || parsedUnitPrice < 0) {
            return sendError(res, { status: 400, message: 'unitPrice must be a non-negative number' });
        }

        const parsedQuantity = Number(quantity);
        if (!Number.isInteger(parsedQuantity) || parsedQuantity < 1) {
            return sendError(res, { status: 400, message: 'quantity must be a positive integer' });
        }

        const metadataError = validateExperienceMetadata(metadata, parsedQuantity);
        if (metadataError) return sendError(res, { status: 400, message: metadataError });

        // Find or create active cart for user or guest
        const ownerFilter = getCartOwnerFilter(req);
        let cart = null;

        if (ownerFilter) {
            cart = await Cart.findOne({
                where: { ...ownerFilter, status: 'active' },
            });
        }

        if (!cart) {
            const sessionToken = ensureSessionToken(req, res);
            cart = await Cart.create({
                CustomerId: req.user?.id || null,
                sessionToken: sessionToken || null,
                status: 'active',
                currency: 'USD',
                totalAmount: 0.00,
                discountAmount: 0.00,
            });
        }

        const totalPrice = Number((parsedUnitPrice * parsedQuantity).toFixed(2));

        const item = await CartItem.create({
            CartId: cart.id,
            ProductType,
            ProductId: ProductId || null,
            description: String(description).trim(),
            unitPrice: parsedUnitPrice,
            quantity: parsedQuantity,
            totalPrice,
            metadata: metadata || null,
        });

        // Recompute cart total
        const items = await CartItem.findAll({ where: { CartId: cart.id } });
        const newTotal = items.reduce((sum, i) => sum + Number(i.totalPrice), 0);
        await cart.update({ totalAmount: Number(newTotal.toFixed(2)) });

        return res.status(201).json({ errors: [], data: { item, cartTotal: cart.totalAmount } });
    } catch (error) {
        return sendError(res, { status: 500, message: 'Failed to add item to cart' });
    }
};

const updateItem = async (req, res) => {
    try {
        const { id } = req.params;
        const { quantity, metadata } = req.body;

        const ownerFilter = getCartOwnerFilter(req);
        if (!ownerFilter) {
            return sendError(res, { status: 401, message: 'Cart session not found' });
        }

        const cart = await Cart.findOne({
            where: { ...ownerFilter, status: 'active' },
        });

        if (!cart) {
            return sendError(res, { status: 404, message: 'Active cart not found' });
        }

        const item = await CartItem.findOne({
            where: { id, CartId: cart.id },
        });

        if (!item) {
            return sendError(res, { status: 404, message: 'Cart item not found' });
        }

        if (item.ProductType !== 'Experience') {
            return sendError(res, { status: 400, message: 'Only Experience items can be updated in the cart' });
        }

        const parsedQuantity = quantity != null ? Number(quantity) : Number(item.quantity);
        if (!Number.isInteger(parsedQuantity) || parsedQuantity < 1) {
            return sendError(res, { status: 400, message: 'quantity must be a positive integer' });
        }
        const nextMetadata = metadata !== undefined ? metadata : item.metadata;
        const metadataError = validateExperienceMetadata(nextMetadata, parsedQuantity);
        if (metadataError) return sendError(res, { status: 400, message: metadataError });

        const updates = {
            quantity: parsedQuantity,
            totalPrice: Number((Number(item.unitPrice) * parsedQuantity).toFixed(2)),
            metadata: nextMetadata,
        };

        await item.update(updates);

        // Recompute cart total
        const items = await CartItem.findAll({ where: { CartId: cart.id } });
        const newTotal = items.reduce((sum, i) => sum + Number(i.totalPrice), 0);
        await cart.update({ totalAmount: Number(newTotal.toFixed(2)) });

        return res.status(200).json({ errors: [], data: { item } });
    } catch (error) {
        return sendError(res, { status: 500, message: 'Failed to update cart item' });
    }
};

const removeItem = async (req, res) => {
    try {
        const { id } = req.params;

        const ownerFilter = getCartOwnerFilter(req);
        if (!ownerFilter) {
            return sendError(res, { status: 401, message: 'Cart session not found' });
        }

        const cart = await Cart.findOne({
            where: { ...ownerFilter, status: 'active' },
        });

        if (!cart) {
            return sendError(res, { status: 404, message: 'Active cart not found' });
        }

        const item = await CartItem.findOne({
            where: { id, CartId: cart.id },
        });

        if (!item) {
            return sendError(res, { status: 404, message: 'Cart item not found' });
        }

        await item.destroy();

        // Recompute cart total
        const items = await CartItem.findAll({ where: { CartId: cart.id } });
        const newTotal = items.reduce((sum, i) => sum + Number(i.totalPrice), 0);
        await cart.update({ totalAmount: Number(newTotal.toFixed(2)) });

        return res.status(200).json({ errors: [], data: { message: 'Item removed' } });
    } catch (error) {
        return sendError(res, { status: 500, message: 'Failed to remove cart item' });
    }
};

const clearCart = async (req, res) => {
    try {
        const ownerFilter = getCartOwnerFilter(req);
        if (!ownerFilter) {
            return sendError(res, { status: 401, message: 'Cart session not found' });
        }

        const cart = await Cart.findOne({
            where: { ...ownerFilter, status: 'active' },
        });

        if (!cart) {
            return sendError(res, { status: 404, message: 'Active cart not found' });
        }

        await CartItem.destroy({ where: { CartId: cart.id } });
        await cart.update({ totalAmount: 0.00 });

        return res.status(200).json({ errors: [], data: { message: 'Cart cleared' } });
    } catch (error) {
        return sendError(res, { status: 500, message: 'Failed to clear cart' });
    }
};

const defaultExport = { getCart, addItem, updateItem, removeItem, clearCart };

export { getCart, addItem, updateItem, removeItem, clearCart };
export default defaultExport;
