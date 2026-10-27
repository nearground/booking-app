import { createRequire } from 'node:module';
const require = createRequire(import.meta.url);
const crypto = require('crypto');

import Order from '../models/Order.model.js';
import OrderItem from '../models/OrderItem.model.js';
import ExperienceReservation from '../models/ExperienceReservation.model.js';
import ScheduledExperience from '../models/ScheduledExperience.model.js';
import Experience from '../models/Experience.model.js';
import Organization from '../models/Organization.model.js';
import ServiceReservation from '../models/ServiceReservation.model.js';
import HotelReservation from '../models/HotelReservation.model.js';
import { checkoutCart, confirmOrder, cancelOrder } from '../services/Checkout.service.js';
import { sendError } from '../utils/http-response.js';

const RESERVATION_INCLUDES = [
    {
        model: ExperienceReservation,
        as: 'ExperienceReservation',
        attributes: ['id', 'confirmationCode', 'status'],
        required: false,
        include: [
            {
                model: ScheduledExperience,
                attributes: ['id', 'ExperienceId'],
                include: [
                    {
                        model: Experience,
                        attributes: ['id', 'OrganizationId'],
                        include: [
                            {
                                model: Organization,
                                attributes: ['id', 'email'],
                            },
                        ],
                    },
                ],
            },
        ],
    },
    {
        model: ServiceReservation,
        as: 'ServiceReservation',
        attributes: ['id', 'confirmationCode', 'status'],
        required: false,
    },
    {
        model: HotelReservation,
        as: 'HotelReservation',
        attributes: ['id', 'confirmationCode', 'status'],
        required: false,
    },
];

const initiateCheckout = async (req, res) => {
    try {
        const { cartId, billingInfo, contact } = req.body;

        if (!cartId) {
            return sendError(res, { status: 400, message: 'cartId is required' });
        }

        if (!billingInfo || !billingInfo.email || !billingInfo.name || !billingInfo.address || !billingInfo.city || !billingInfo.state || !billingInfo.postalCode) {
            return sendError(res, { status: 400, message: 'Complete billing information is required (email, name, address, city, state, postalCode)' });
        }

        const isGuest = !req.user?.id;
        const sessionToken = isGuest ? req.cookies?._cart_session : null;
        if (isGuest && !sessionToken) {
            return sendError(res, { status: 401, message: 'Cart session not found' });
        }
        const guestReceiptToken = isGuest ? crypto.randomBytes(32).toString('base64url') : null;
        const guestReceipt = guestReceiptToken ? {
            tokenHash: crypto.createHash('sha256').update(guestReceiptToken).digest('hex'),
            expiresAt: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString(),
        } : null;
        const order = await checkoutCart(cartId, req.user?.id || null, billingInfo, contact || {}, sessionToken, guestReceipt);

        return res.status(201).json({
            errors: [],
            data: {
                orderId: order.id,
                orderNumber: order.orderNumber,
                status: order.status,
                totalAmount: order.totalAmount,
                mainContactName: order.mainContactName,
                mainContactPhone: order.mainContactPhone,
                mainContactEmail: order.mainContactEmail,
                confirmationEmail: order.metadata?.confirmationEmail || null,
                items: order.Items,
                ...(guestReceiptToken ? { guestReceiptToken } : {}),
            },
        });
    } catch (error) {
        if (error.message.includes('Cart not found') || error.message.includes('Cart is empty') || error.message.includes('Only Experience items') || error.message.includes('Invalid Experience ticket selections')) {
            return sendError(res, { status: 400, message: error.message });
        }
        if (error.message.includes('Not enough available spots')) {
            return sendError(res, { status: 409, message: error.message });
        }
        // Log unexpected checkout failures for debugging and diagnostics
        // Keep response generic to avoid leaking internal errors.
        // eslint-disable-next-line no-console
        console.error('Checkout processing error', {
            message: error?.message,
            stack: error?.stack,
        });
        return sendError(res, { status: 500, message: 'Checkout failed' });
    }
};

const getGuestOrder = async (req, res) => {
    try {
        const { orderNumber, receiptToken } = req.body || {};
        if (!orderNumber || !receiptToken || typeof receiptToken !== 'string') {
            return sendError(res, { status: 400, message: 'orderNumber and receiptToken are required' });
        }
        const order = await Order.findOne({
            where: { orderNumber, CustomerId: null },
            include: [{ model: OrderItem, as: 'Items', include: RESERVATION_INCLUDES }],
        });
        const tokenHash = crypto.createHash('sha256').update(receiptToken).digest('hex');
        const storedHash = order?.metadata?.guestReceiptTokenHash;
        const tokenMatches = typeof storedHash === 'string' && /^[a-f0-9]{64}$/i.test(storedHash) &&
            crypto.timingSafeEqual(Buffer.from(tokenHash, 'hex'), Buffer.from(storedHash, 'hex'));
        if (!order || !tokenMatches || !order.metadata?.guestReceiptExpiresAt ||
            new Date(order.metadata.guestReceiptExpiresAt).getTime() <= Date.now()) {
            return sendError(res, { status: 404, message: 'Receipt not found' });
        }
        order.setDataValue('confirmationEmail', order.metadata?.confirmationEmail || null);
        order.setDataValue('metadata', null);
        return res.status(200).json({ errors: [], data: { order } });
    } catch (error) {
        return sendError(res, { status: 500, message: 'Failed to retrieve receipt' });
    }
};
const getOrder = async (req, res) => {
    try {
        const { orderNumber } = req.params;

        const order = await Order.findOne({
            where: { orderNumber, CustomerId: req.user.id },
            include: [{ model: OrderItem, as: 'Items', include: RESERVATION_INCLUDES }],
        });

        if (!order) {
            return sendError(res, { status: 404, message: 'Order not found' });
        }

        return res.status(200).json({ errors: [], data: { order } });
    } catch (error) {
        return sendError(res, { status: 500, message: 'Failed to retrieve order' });
    }
};

const getOrderConfirmation = async (req, res) => {
    try {
        const { orderNumber } = req.params;

        const order = await Order.findOne({
            where: { orderNumber, CustomerId: req.user.id },
            include: [{ model: OrderItem, as: 'Items', include: RESERVATION_INCLUDES }],
        });

        if (!order) {
            return sendError(res, { status: 404, message: 'Order not found' });
        }

        return res.status(200).json({
            errors: [],
            data: {
                orderId: order.id,
                orderNumber: order.orderNumber,
                status: order.status,
                totalAmount: order.totalAmount,
                mainContactName: order.mainContactName,
                mainContactPhone: order.mainContactPhone,
                mainContactEmail: order.mainContactEmail,
                confirmationEmail: order.metadata?.confirmationEmail || null,
                items: order.Items,
            },
        });
    } catch (error) {
        return sendError(res, { status: 500, message: 'Failed to retrieve order confirmation' });
    }
};

const listOrders = async (req, res) => {
    try {
        const page = Math.max(1, parseInt(req.query.page, 10) || 1);
        const limit = Math.min(50, Math.max(1, parseInt(req.query.limit, 10) || 10));
        const offset = (page - 1) * limit;

        const { count, rows: orders } = await Order.findAndCountAll({
            where: { CustomerId: req.user.id },
            include: [{ model: OrderItem, as: 'Items', include: RESERVATION_INCLUDES }],
            order: [['createdAt', 'DESC']],
            limit,
            offset,
        });

        return res.status(200).json({
            errors: [],
            data: {
                orders,
                pagination: {
                    page,
                    limit,
                    totalItems: count,
                    totalPages: Math.ceil(count / limit),
                },
            },
        });
    } catch (error) {
        return sendError(res, { status: 500, message: 'Failed to list orders' });
    }
};

const handlePaymentWebhook = async (req, res) => {
    try {
        const { orderId, paymentReference, event } = req.body;

        if (!orderId || !paymentReference || !event) {
            return sendError(res, { status: 400, message: 'orderId, paymentReference, and event are required' });
        }

        // Idempotency check: if order already has this paymentReference and is in a terminal state, return 200
        const existingOrder = await Order.findByPk(orderId);
        if (!existingOrder) {
            return sendError(res, { status: 404, message: 'Order not found' });
        }

        if (existingOrder.paymentReference === paymentReference && (existingOrder.status === 'paid' || existingOrder.status === 'cancelled')) {
            return res.status(200).json({ errors: [], data: { message: 'Already processed', status: existingOrder.status } });
        }

        if (event === 'payment_success') {
            const order = await confirmOrder(orderId, paymentReference);
            return res.status(200).json({
                errors: [],
                data: { orderId: order.id, orderNumber: order.orderNumber, status: order.status },
            });
        } else if (event === 'payment_failed' || event === 'payment_cancelled') {
            const order = await cancelOrder(orderId);
            return res.status(200).json({
                errors: [],
                data: { orderId: order.id, orderNumber: order.orderNumber, status: order.status },
            });
        }

        return sendError(res, { status: 400, message: `Unknown event type: ${event}` });
    } catch (error) {
        if (error.message.includes('not found') || error.message.includes('not in')) {
            return sendError(res, { status: 400, message: error.message });
        }
        return sendError(res, { status: 500, message: 'Webhook processing failed' });
    }
};

const defaultExport = { initiateCheckout, getGuestOrder, getOrder, getOrderConfirmation, listOrders, handlePaymentWebhook };

export { initiateCheckout, getGuestOrder, getOrder, getOrderConfirmation, listOrders, handlePaymentWebhook };
export default defaultExport;
