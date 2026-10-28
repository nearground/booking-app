import { createRequire } from 'node:module';
const require = createRequire(import.meta.url);
const { Op, col, fn, where } = require('sequelize');

import modelRegistry from '../models/index.js';
import { generateNewToken, validateToken } from '../utils/auth-helpers.js';
import { BCRYPT_CONFIG } from '../utils/constants.js';
import { sendNotification } from './Notification.service.js';

const bcrypt = require('bcrypt');
const crypto = require('crypto');

const {
    User,
    PasswordReset,
    EmailVerificationToken,
    Order,
    OrderItem,
    ExperienceReservation,
    ExperienceReservationAnswer,
} = modelRegistry;

class UserService {
    async createUser(payload) {
        const hash = await bcrypt.hash(payload.password, BCRYPT_CONFIG.SALT_ROUNDS);
        const created = await User.create({
            firstName: payload.firstName,
            lastName: payload.lastName,
            username: payload.username,
            email: typeof payload.email === 'string' ? payload.email.trim().toLowerCase() : payload.email,
            password: hash,
            phoneNumber: payload.phoneNumber,
            country: payload.country,
            profilePicture: '',
        });
        return created;
    }

    async authenticateUser({ username, password, organizationUsername, existingToken = '' }) {
        const user = await User.findOne({ where: { username } });
        if (!user) {
            const err = new Error('User not found or invalid credentials');
            err.status = 404;
            throw err;
        }

        if (organizationUsername) {
            const org = await modelRegistry.Organization.findOne({
                where: { organizationUsername },
            });
            if (!org) {
                const err = new Error('Organization not found');
                err.status = 404;
                throw err;
            }

            const membership = await modelRegistry.OrganizationMembers.findOne({
                where: { UserId: user.id, OrganizationId: org.id },
            });
            if (!membership) {
                const err = new Error('User is not a member of this organization');
                err.status = 403;
                throw err;
            }
        }

        const isPasswordValid = await bcrypt.compare(password, user.password);
        if (!isPasswordValid) {
            const err = new Error('User not found or invalid credentials');
            err.status = 404;
            throw err;
        }

        const isTokenValid = existingToken ? validateToken(existingToken) : false;
        if (existingToken && isTokenValid) {
            return { token: existingToken, user };
        }

        const token = generateNewToken(user);
        return { token, user };
    }

    async claimGuestOrdersForUser(user, transaction) {
        const normalizedEmail = String(user.email || '').trim().toLowerCase();
        if (!normalizedEmail) return 0;
        const guestOrders = await Order.findAll({
            where: {
                CustomerId: null,
                [Op.and]: where(fn('LOWER', fn('TRIM', col('mainContactEmail'))), normalizedEmail),
            },
            transaction,
        });
        const claimableOrders = guestOrders.filter((order) => order.metadata?.saveBookingForLater !== false);
        for (const order of claimableOrders) {
            await order.update({ CustomerId: user.id }, { transaction });
        }

        const orderIds = guestOrders.map((order) => order.id).filter((id) => Number.isSafeInteger(Number(id)));
        if (orderIds.length > 0) {
            const orderItems = await OrderItem.findAll({
                where: {
                    OrderId: { [Op.in]: orderIds },
                    ProductType: 'Experience',
                    ExperienceReservationId: { [Op.ne]: null },
                },
                attributes: ['ExperienceReservationId'],
                transaction,
            });
            const reservationIds = [...new Set(orderItems.map((item) => item.ExperienceReservationId).filter(Boolean))];
            if (reservationIds.length > 0) {
                const consentedAnswers = await ExperienceReservationAnswer.findAll({
                    where: {
                        ExperienceReservationId: { [Op.in]: reservationIds },
                        questionKey: 'publicAttendance',
                        answerText: 'true',
                    },
                    attributes: ['ExperienceReservationId'],
                    transaction,
                });
                const consentedReservationIds = [...new Set(
                    consentedAnswers.map((answer) => answer.ExperienceReservationId).filter(Boolean)
                )];
                if (consentedReservationIds.length > 0) {
                    await ExperienceReservation.update(
                        { CustomerId: user.id },
                        {
                            where: { id: { [Op.in]: consentedReservationIds }, CustomerId: null },
                            transaction,
                        }
                    );
                }
            }
        }
        return claimableOrders.length;
    }

    async claimGuestOrders(user) {
        const transaction = await modelRegistry.sequelize.transaction();
        try {
            const claimedOrderCount = await this.claimGuestOrdersForUser(user, transaction);
            await transaction.commit();
            return claimedOrderCount;
        } catch (error) {
            if (!transaction.finished) await transaction.rollback();
            throw error;
        }
    }

    async getUserById(userId) {
        return User.findByPk(userId, {
            include: [
                {
                    model: modelRegistry.Organizer,
                    required: false,
                    attributes: ['id', 'description'],
                },
                {
                    model: modelRegistry.Organization,
                    as: 'Organizations',
                    required: false,
                    attributes: ['id', 'name', 'organizationUsername', 'email'],
                    through: { attributes: ['isAdmin'] },
                },
            ],
        });
    }

    async updateUser(userId, updatePayload) {
        const user = await User.findByPk(userId);
        if (!user) {
            const err = new Error('User not found');
            err.status = 404;
            throw err;
        }
        const updated = await user.update(updatePayload);
        return updated;
    }

    async updatePassword(userId, currentPassword, newPassword) {
        const user = await User.findByPk(userId);
        if (!user) {
            const err = new Error('User not found');
            err.status = 404;
            throw err;
        }

        const isCurrentValid = await bcrypt.compare(currentPassword, user.password);
        if (!isCurrentValid) {
            const err = new Error('Current password is incorrect');
            err.status = 401;
            throw err;
        }

        const isSameAsCurrent = await bcrypt.compare(newPassword, user.password);
        if (isSameAsCurrent) {
            const err = new Error('New password must be different from current password');
            err.status = 400;
            throw err;
        }

        const hashed = await bcrypt.hash(newPassword, BCRYPT_CONFIG.SALT_ROUNDS);
        const updatedUser = await user.update({ password: hashed });
        const token = generateNewToken(updatedUser);
        return { updatedUser, token };
    }

    async startEmailVerification(email) {
        const emailAddress = String(email || '').trim().toLowerCase();
        if (!emailAddress) return { sent: true };
        const user = await User.findOne({ where: { email: emailAddress } });
        if (!user || user.isEmailVerified) return { sent: true };

        const token = crypto.randomBytes(32).toString('hex');
        const tokenHash = crypto.createHash('sha256').update(token).digest('hex');
        const expiresAt = new Date(Date.now() + 24 * 60 * 60 * 1000);
        await EmailVerificationToken.create({ email: user.email, tokenHash, expiresAt });

        const frontendUrl = String(process.env.FRONTEND_BASE_URL || process.env.FRONTEND_URL || 'http://localhost:8080').trim().replace(/\/+$/, '');
        const verifyUrl = `${frontendUrl}/verify-email?token=${encodeURIComponent(token)}`;
        try {
            await sendNotification({
                template: 'email-verification',
                to: user.email,
                payload: { verifyUrl, expiresAt: expiresAt.toISOString() },
            });
        } catch (_error) {
            // Keep registration successful if the mail provider is unavailable.
        }
        return { sent: true };
    }

    async confirmEmailVerification(token) {
        if (typeof token !== 'string' || token.length < 32 || token.length > 256) return { valid: false };
        const tokenHash = crypto.createHash('sha256').update(token).digest('hex');
        const transaction = await modelRegistry.sequelize.transaction();
        try {
            const record = await EmailVerificationToken.findOne({
                where: { tokenHash, usedAt: null },
                transaction,
                lock: true,
            });
            if (!record || new Date(record.expiresAt).getTime() <= Date.now()) {
                await transaction.rollback();
                return { valid: false };
            }
            const user = await User.findOne({ where: { email: record.email }, transaction, lock: true });
            if (!user) {
                await transaction.rollback();
                return { valid: false };
            }
            await user.update({ isEmailVerified: true }, { transaction });
            const claimedOrderCount = await this.claimGuestOrdersForUser(user, transaction);
            await EmailVerificationToken.update(
                { usedAt: new Date() },
                { where: { email: record.email, usedAt: null }, transaction }
            );
            await transaction.commit();
            return { valid: true, claimedOrderCount };
        } catch (error) {
            if (!transaction.finished) await transaction.rollback();
            throw error;
        }
    }
    async forgotPassword(email) {
        email = String(email || '').trim().toLowerCase();
        // Anti-enumeration: always return success regardless of whether user exists
        const user = await User.findOne({ where: { email } });
        if (!user) return { sent: true };

        const token = crypto.randomBytes(32).toString('hex');
        const expiresAt = new Date(Date.now() + 3600000); // 1 hour

        await PasswordReset.create({ email, token, expiresAt });

        const frontendUrl = String(process.env.FRONTEND_BASE_URL || process.env.FRONTEND_URL || 'http://localhost:8080').trim().replace(/\/+$/, '');
        const resetUrl = `${frontendUrl}/reset-password?token=${token}`;

        try {
            await sendNotification({
                template: 'forgot-password',
                to: email,
                payload: { resetUrl, expiresAt: expiresAt.toISOString() },
            });
        } catch (e) {
            // ignore notification errors — token is still created
        }

        return { sent: true };
    }

    async validateResetToken(token) {
        const record = await PasswordReset.findOne({ where: { token } });
        if (!record) return { valid: false, reason: 'not-found' };
        if (record.usedAt) return { valid: false, reason: 'used' };
        if (new Date(record.expiresAt).getTime() <= Date.now()) return { valid: false, reason: 'expired' };
        return { valid: true };
    }

    async completePasswordReset(token, email, newPassword) {
        const whereClause = { token, usedAt: null };
        if (email) whereClause.email = String(email).trim().toLowerCase();
        const record = await PasswordReset.findOne({ where: whereClause });
        if (!record || new Date(record.expiresAt).getTime() <= Date.now()) {
            const err = new Error('Invalid or expired token');
            err.status = 400;
            throw err;
        }

        const resetEmail = record.email;
        const user = await User.findOne({ where: { email: resetEmail } });
        if (!user) {
            const err = new Error('User not found');
            err.status = 404;
            throw err;
        }

        const hashed = await bcrypt.hash(newPassword, BCRYPT_CONFIG.SALT_ROUNDS);
        await user.update({ password: hashed });
        await record.update({ usedAt: new Date() });

        // Invalidate all other active tokens for the same email
        await PasswordReset.update(
            { usedAt: new Date() },
            { where: { email: resetEmail, usedAt: null } }
        );

        try {
            await sendNotification({ template: 'password-changed', to: resetEmail, payload: {} });
        } catch (e) {
            // ignore notification errors
        }

        return true;
    }

    async lookupUsernameByEmail(email) {
        email = String(email || '').trim().toLowerCase();
        const users = await User.findAll({
            where: { email },
            include: [
                {
                    model: modelRegistry.Organization,
                    as: 'Organizations',
                    required: false,
                    attributes: ['organizationUsername'],
                    through: { attributes: [] },
                },
            ],
            attributes: ['username'],
        });

        return users.map((u) => ({
            username: u.username,
            organizationUsername: u.Organizations?.[0]?.organizationUsername || null,
        }));
    }

    async sendUsernameLookupEmail(email, usernames) {
        if (!usernames || usernames.length === 0) return;

        try {
            await sendNotification({
                template: 'username-lookup',
                to: email,
                payload: { usernames },
            });
        } catch (e) {
            // fire-and-forget — ignore notification errors
        }
    }
}

const defaultExport = new UserService();
export { UserService };
export default defaultExport;
