import { createRequire } from 'node:module';
const require = createRequire(import.meta.url);

const { Op } = require('sequelize');
const crypto = require('crypto');

import sequelize from '../models/database.js';
import Cart from '../models/Cart.model.js';
import CartItem from '../models/CartItem.model.js';
import Order from '../models/Order.model.js';
import OrderItem from '../models/OrderItem.model.js';
import ExperienceReservation from '../models/ExperienceReservation.model.js';
import ExperienceReservationAttendee from '../models/ExperienceReservationAttendee.model.js';
import ExperienceReservationAnswer from '../models/ExperienceReservationAnswer.model.js';
import ExperienceReservationAttendeeAnswer from '../models/ExperienceReservationAttendeeAnswer.model.js';
import TicketTier from '../models/TicketTier.model.js';
import ScheduledExperience from '../models/ScheduledExperience.model.js';
import ServiceReservation from '../models/ServiceReservation.model.js';
import HotelReservation from '../models/HotelReservation.model.js';
import { sendNotification } from './Notification.service.js';

const hasValidTicketSelections = (item) => {
    const selections = item.metadata?.ticketSelections;
    if (!Array.isArray(selections) || selections.length === 0) return false;
    let selectedQuantity = 0;
    for (const selection of selections) {
        if (!selection || !Number.isInteger(Number(selection.ticketTierId)) || Number(selection.ticketTierId) < 1 ||
            !Number.isInteger(Number(selection.quantity)) || Number(selection.quantity) < 1) return false;
        selectedQuantity += Number(selection.quantity);
    }
    return selectedQuantity === Number(item.quantity);
};
const generateConfirmationCode = (entityId, scheduledId) => {
    const randomSuffix = Math.random().toString(36).slice(2, 8).toUpperCase();
    return `${entityId}-${scheduledId}-${Date.now()}-${randomSuffix}`;
};

const generateOrderNumber = () => {
    const now = new Date();
    const datePart = now.toISOString().slice(0, 10).replace(/-/g, '');
    const randomSuffix = Math.random().toString(36).substring(2, 6).toUpperCase();
    return `ORD-${datePart}-${randomSuffix}`;
};

/**
 * Creates an Order from a Cart, creating all reservations atomically.
 * Returns the created Order with its OrderItems.
 */
export const checkoutCart = async (cartId, customerId, billingInfo, contactInfo = {}, sessionToken = null, guestReceipt = null) => {
    const transaction = await sequelize.transaction();

    try {
        const ownerFilter = customerId ? { CustomerId: customerId } : sessionToken ? { sessionToken } : null;
        if (!ownerFilter) throw new Error('Cart not found or not in a valid state for checkout');

        const cart = await Cart.findOne({
            where: { id: cartId, ...ownerFilter, status: { [Op.in]: ['active', 'checkout'] } },
            include: [{ model: CartItem, as: 'Items' }],
            transaction,
        });

        if (!cart) {
            await transaction.rollback();
            throw new Error('Cart not found or not in a valid state for checkout');
        }

        if (!cart.Items || cart.Items.length === 0) {
            await transaction.rollback();
            throw new Error('Cart is empty');
        }

        const orderTotal = Number(cart.totalAmount) - Number(cart.discountAmount);
        const isFreeOrder = orderTotal === 0;

        // Create draft order
        const order = await Order.create({
            CustomerId: customerId,
            CartId: cart.id,
            status: 'draft',
            orderNumber: generateOrderNumber(),
            currency: cart.currency,
            subtotalAmount: cart.totalAmount,
            taxAmount: 0.00,
            discountAmount: cart.discountAmount,
            totalAmount: orderTotal,
            mainContactName: contactInfo.fullName || null,
            mainContactPhone: contactInfo.phone || null,
            mainContactEmail: contactInfo.email || null,
            metadata: guestReceipt ? {
                guestReceiptTokenHash: guestReceipt.tokenHash,
                guestReceiptExpiresAt: guestReceipt.expiresAt,
                saveBookingForLater: guestReceipt.saveBookingForLater !== false,
            } : null,
        }, { transaction });

        await cart.update({ status: 'checkout' }, { transaction });

        // Process each supported cart item into a reservation + order item
        for (const item of cart.Items) {
            if (item.ProductType !== 'Experience') {
                throw new Error('Only Experience items can be checked out');
            }
            const reservationFks = {
                ExperienceReservationId: null,
                ServiceReservationId: null,
                HotelReservationId: null,
            };

            const metadata = item.metadata || {};
            if (!Number.isInteger(Number(metadata.ScheduledExperienceId)) || Number(metadata.ScheduledExperienceId) < 1 || !hasValidTicketSelections(item)) {
                throw new Error('Invalid Experience ticket selections');
            }

            if (isFreeOrder) {
                const session = await ScheduledExperience.findOne({
                    where: { id: metadata.ScheduledExperienceId, ExperienceId: item.ProductId },
                    attributes: ['id', 'dateTime', 'endDateTime', 'status'],
                    transaction,
                });
                if (!session) throw new Error('Invalid Experience session');
                const registrationDeadline = new Date(session.endDateTime || session.dateTime).getTime();
                if (!['scheduled', 'in-progress'].includes(session.status) || !(registrationDeadline > Date.now())) {
                    throw new Error('Registration is closed for this Experience session');
                }
                const tierIds = [...new Set(metadata.ticketSelections.map((selection) => Number(selection.ticketTierId)))];
                const tiers = await TicketTier.findAll({
                    where: { ExperienceId: item.ProductId, id: tierIds },
                    attributes: ['id', 'price'],
                    transaction,
                });
                if (tiers.length !== tierIds.length || tiers.some((tier) => tier.price == null || Number(tier.price) !== 0)) {
                    throw new Error('Free registration requires free ticket tiers');
                }
            }

            if (item.ProductType === 'Experience') {
                const reservation = await ExperienceReservation.create({
                    confirmationCode: generateConfirmationCode(item.ProductId, metadata.ScheduledExperienceId),
                    numberOfAttendees: Number(item.quantity),
                    totalPrice: Number(item.totalPrice),
                    // Confirm reservations until online payment processing is available.
                    status: 'confirmed',
                    specialRequests: metadata.specialRequests || null,
                    dayOfPhone: metadata.mainContact?.phone ? String(metadata.mainContact.phone).trim() : null,
                    billingEmail: billingInfo.email,
                    billingName: billingInfo.name,
                    billingAddress: billingInfo.address,
                    billingCity: billingInfo.city,
                    billingState: billingInfo.state,
                    billingPostalCode: billingInfo.postalCode,
                    hotelName: metadata.hotelName ? String(metadata.hotelName).trim() : null,
                    comments: metadata.comments ? String(metadata.comments).trim() : null,
                    ScheduledExperienceId: metadata.ScheduledExperienceId,
                    CustomerId: customerId,
                }, { transaction });

                // Create attendee rows from ticketSelections (one row per ticket)
                if (Array.isArray(metadata.ticketSelections)) {
                    const allAttendeeAnswers = [];
                    for (const selection of metadata.ticketSelections) {
                        if (!selection.ticketTierId || !Number(selection.quantity)) continue;
                        const attendeeRows = await ExperienceReservationAttendee.bulkCreate(
                            Array.from({ length: Number(selection.quantity) }, () => ({
                                ExperienceReservationId: reservation.id,
                                TicketTierId: selection.ticketTierId,
                                status: 'active',
                            })),
                            { transaction }
                        );
                        const tierAnswers = (metadata.questionnaireAnswers || [])
                            .filter(a => String(a.tierKey) === String(selection.ticketTierId));
                        attendeeRows.forEach(row => {
                            tierAnswers.forEach(a => {
                                if (!a.questionKey) return;
                                allAttendeeAnswers.push({
                                    ExperienceReservationAttendeeId: row.id,
                                    questionKey: String(a.questionKey),
                                    answerText: typeof a.answerText === 'string' ? a.answerText : null,
                                });
                            });
                        });
                    }
                    if (allAttendeeAnswers.length > 0) {
                        await ExperienceReservationAttendeeAnswer.bulkCreate(allAttendeeAnswers, { transaction });
                    }
                }

                // Create reservation-level answers if provided
                if (Array.isArray(metadata.reservationAnswers)) {
                    const reservationAnswers = metadata.reservationAnswers
                        .filter(a => a && a.questionKey)
                        .map(answer => ({
                            ExperienceReservationId: reservation.id,
                            questionKey: String(answer.questionKey),
                            answerText: typeof answer.answerText === 'string' ? answer.answerText : null,
                            answerJson: answer.answerJson && typeof answer.answerJson === 'object' ? answer.answerJson : null,
                        }));
                    if (reservationAnswers.length > 0) {
                        await ExperienceReservationAnswer.bulkCreate(reservationAnswers, { transaction });
                    }
                }

                reservationFks.ExperienceReservationId = reservation.id;
                reservationFks._confirmationCode = reservation.confirmationCode;

            } else if (item.ProductType === 'Service') {
                const reservation = await ServiceReservation.create({
                    confirmationCode: generateConfirmationCode(item.ProductId, metadata.ScheduledServiceId),
                    numberOfAttendees: Number(item.quantity),
                    totalPrice: Number(item.totalPrice),
                    status: 'pending',
                    specialRequests: metadata.specialRequests || null,
                    attendeeNames: Array.isArray(metadata.attendeeNames) ? metadata.attendeeNames : null,
                    billingEmail: billingInfo.email,
                    billingName: billingInfo.name,
                    billingAddress: billingInfo.address,
                    billingCity: billingInfo.city,
                    billingState: billingInfo.state,
                    billingPostalCode: billingInfo.postalCode,
                    ScheduledServiceId: metadata.ScheduledServiceId,
                    CustomerId: customerId,
                }, { transaction });

                reservationFks.ServiceReservationId = reservation.id;
                reservationFks._confirmationCode = reservation.confirmationCode;

            } else if (item.ProductType === 'Hotel') {
                const reservation = await HotelReservation.create({
                    confirmationCode: generateConfirmationCode(item.ProductId, metadata.HotelId),
                    checkInDate: metadata.checkInDate,
                    checkOutDate: metadata.checkOutDate,
                    numberOfGuests: metadata.numberOfGuests || 1,
                    numberOfRooms: metadata.numberOfRooms || 1,
                    totalPrice: Number(item.totalPrice),
                    status: 'pending',
                    specialRequests: metadata.specialRequests || null,
                    guestNames: Array.isArray(metadata.guestNames) ? metadata.guestNames : null,
                    HotelId: metadata.HotelId,
                    CustomerId: customerId,
                }, { transaction });

                reservationFks.HotelReservationId = reservation.id;
                reservationFks._confirmationCode = reservation.confirmationCode;
            }

            const { _confirmationCode, ...itemReservationFks } = reservationFks;

            await OrderItem.create({
                OrderId: order.id,
                ProductType: item.ProductType,
                ProductId: item.ProductId,
                ...itemReservationFks,
                description: item.description,
                unitPrice: item.unitPrice,
                quantity: item.quantity,
                totalPrice: item.totalPrice,
                metadata: { ...(item.metadata || {}), confirmationCode: _confirmationCode || null },
            }, { transaction });
        }

        await order.update({ status: isFreeOrder ? 'paid' : 'pending' }, { transaction });

        // Finalize the old cart and start a fresh active cart for the same user/session.
        const cartSessionToken = cart.sessionToken;
        await cart.update({ status: 'converted', sessionToken: null }, { transaction });
        await Cart.create({
            CustomerId: cart.CustomerId,
            sessionToken: cartSessionToken,
            status: 'active',
            currency: cart.currency,
            totalAmount: 0.00,
            discountAmount: 0.00,
        }, { transaction });

        await transaction.commit();

        // Reload with items
        const result = await Order.findByPk(order.id, {
            include: [{ model: OrderItem, as: 'Items' }],
        });

        // The booking is committed before email is attempted; a mail failure must not
        // turn a completed purchase into an error that encourages duplicate checkout.
        let emailStatus = 'failed';
        if (result && result.mainContactEmail) {
            const items = Array.isArray(result.Items) ? result.Items : [];
            const publicAttendanceOptIn = items.some((item) =>
                item.ProductType === 'Experience' &&
                Array.isArray(item.metadata?.reservationAnswers) &&
                item.metadata.reservationAnswers.some((answer) =>
                    answer?.questionKey === 'publicAttendance' && answer.answerText === 'true'
                )
            );
            try {
                const notification = await sendNotification({
                    template: 'booking-confirmation',
                    to: result.mainContactEmail,
                    payload: {
                        mainContactName: result.mainContactName || '',
                        orderNumber: result.orderNumber,
                        totalAmount: result.totalAmount,
                        items: items.map((i) => ({
                            description: i.description,
                            quantity: i.quantity,
                            totalPrice: i.totalPrice,
                            confirmationCode: i.metadata?.confirmationCode || null,
                        })),
                        isGuest: !customerId,
                        publicAttendanceOptIn,
                        ...(guestReceipt && publicAttendanceOptIn ? {
                            loginUrl: `${String(process.env.FRONTEND_BASE_URL || process.env.FRONTEND_URL || 'http://localhost:8080').trim().replace(/\/+$/, '')}/login`,
                            registerUrl: `${String(process.env.FRONTEND_BASE_URL || process.env.FRONTEND_URL || 'http://localhost:8080').trim().replace(/\/+$/, '')}/register`,
                        } : {}),
                    },
                });
                if (notification.sent && !['console', 'disabled'].includes(notification.provider)) {
                    emailStatus = 'sent';
                } else {
                    // eslint-disable-next-line no-console
                    console.error('[checkout] booking confirmation email not sent', {
                        orderId: order.id,
                        provider: notification.provider,
                    });
                }
            } catch (error) {
                // eslint-disable-next-line no-console
                console.error('[checkout] booking confirmation email failed', { orderId: order.id, message: error.message });
            }
        } else {
            // eslint-disable-next-line no-console
            console.error('[checkout] booking confirmation recipient missing', { orderId: order.id });
        }

        if (result) {
            const metadata = {
                ...result.metadata,
                confirmationEmail: { status: emailStatus, attemptedAt: new Date().toISOString() },
            };
            result.setDataValue('metadata', metadata);
            try {
                await result.update({ metadata });
            } catch (error) {
                // eslint-disable-next-line no-console
                console.error('[checkout] could not persist confirmation email status', { orderId: order.id, message: error.message });
            }
        }

        return result;
    } catch (error) {
        if (!transaction.finished) {
            await transaction.rollback();
        }
        throw error;
    }
};

/**
 * Confirms an order after successful payment.
 * Transitions Order → paid, Cart → converted, all reservations → confirmed.
 */
export const confirmOrder = async (orderId, paymentReference) => {
    const transaction = await sequelize.transaction();

    try {
        const order = await Order.findOne({
            where: { id: orderId, status: 'pending' },
            include: [{ model: OrderItem, as: 'Items' }],
            transaction,
        });

        if (!order) {
            await transaction.rollback();
            throw new Error('Order not found or not in pending state');
        }

        // Idempotency check
        if (order.paymentReference === paymentReference && order.status === 'paid') {
            await transaction.rollback();
            return order;
        }

        await order.update({
            status: 'paid',
            paymentReference,
        }, { transaction });

        // Update cart
        if (order.CartId) {
            await Cart.update(
                { status: 'converted' },
                { where: { id: order.CartId }, transaction }
            );
        }

        // Confirm all linked reservations
        for (const item of order.Items) {
            if (item.ExperienceReservationId) {
                await ExperienceReservation.update(
                    { status: 'confirmed' },
                    { where: { id: item.ExperienceReservationId }, transaction }
                );
            }
            if (item.ServiceReservationId) {
                await ServiceReservation.update(
                    { status: 'confirmed' },
                    { where: { id: item.ServiceReservationId }, transaction }
                );
            }
            if (item.HotelReservationId) {
                await HotelReservation.update(
                    { status: 'confirmed' },
                    { where: { id: item.HotelReservationId }, transaction }
                );
            }
        }

        await transaction.commit();
        return order.reload({ include: [{ model: OrderItem, as: 'Items' }] });
    } catch (error) {
        if (!transaction.finished) {
            await transaction.rollback();
        }
        throw error;
    }
};

/**
 * Cancels an order.
 * Transitions Order → cancelled, Cart → abandoned, all reservations → cancelled.
 */
export const cancelOrder = async (orderId) => {
    const transaction = await sequelize.transaction();

    try {
        const order = await Order.findOne({
            where: { id: orderId, status: { [Op.in]: ['draft', 'pending'] } },
            include: [{ model: OrderItem, as: 'Items' }],
            transaction,
        });

        if (!order) {
            await transaction.rollback();
            throw new Error('Order not found or not in a cancellable state');
        }

        await order.update({ status: 'cancelled' }, { transaction });

        // Update cart
        if (order.CartId) {
            await Cart.update(
                { status: 'abandoned' },
                { where: { id: order.CartId }, transaction }
            );
        }

        // Cancel all linked reservations (model hooks restore availableSpots)
        for (const item of order.Items) {
            if (item.ExperienceReservationId) {
                const reservation = await ExperienceReservation.findByPk(item.ExperienceReservationId, { transaction });
                if (reservation && reservation.status !== 'cancelled') {
                    await reservation.update({ status: 'cancelled' }, { transaction });
                }
            }
            if (item.ServiceReservationId) {
                const reservation = await ServiceReservation.findByPk(item.ServiceReservationId, { transaction });
                if (reservation && reservation.status !== 'cancelled') {
                    await reservation.update({ status: 'cancelled' }, { transaction });
                }
            }
            if (item.HotelReservationId) {
                await HotelReservation.update(
                    { status: 'cancelled' },
                    { where: { id: item.HotelReservationId }, transaction }
                );
            }
        }

        await transaction.commit();
        return order.reload({ include: [{ model: OrderItem, as: 'Items' }] });
    } catch (error) {
        if (!transaction.finished) {
            await transaction.rollback();
        }
        throw error;
    }
};

const defaultExport = { checkoutCart, confirmOrder, cancelOrder };
export default defaultExport;
