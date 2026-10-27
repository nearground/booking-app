import { createRequire } from 'node:module';
const require = createRequire(import.meta.url);



const nodemailer = require('nodemailer');

const maskEmail = (email) => {
    const normalized = String(email || '').trim().toLowerCase();
    const [localPart = '', domainPart = ''] = normalized.split('@');

    if (!localPart || !domainPart) {
        return 'unknown';
    }

    const visibleLocal = localPart.slice(0, 2);
    return `${visibleLocal}${'*'.repeat(Math.max(0, localPart.length - 2))}@${domainPart}`;
};

const consoleProvider = async ({ template, to, payload }) => {
    // eslint-disable-next-line no-console
    console.log('[notifications][console]', {
        template,
        to: maskEmail(to),
        payload: template === 'email-verification' ? { expiresAt: payload?.expiresAt } : payload,
    });

    return {
        sent: true,
        provider: 'console',
    };
};

const disabledProvider = async () => ({
    sent: false,
    provider: 'disabled',
});

const smtpProvider = async ({ template, to, payload }) => {
    const smtpFrom = String(process.env.NOTIFICATIONS_FROM_EMAIL || '').trim();

    if (!smtpFrom) {
        // Log missing from address for diagnostics
        // eslint-disable-next-line no-console
        console.warn('[notifications][smtp] missing NOTIFICATIONS_FROM_EMAIL');
        return {
            sent: false,
            provider: 'smtp',
            reason: 'missing_from_email',
        };
    }

    const host = String(process.env.SPACEMAIL_HOST || '').trim();
    const port = Number(process.env.SPACEMAIL_PORT || 587);
    const secure = String(process.env.SPACEMAIL_SECURE || 'false').toLowerCase() === 'true';
    const user = String(process.env.SPACEMAIL_USER || '').trim();
    const pass = String(process.env.SPACEMAIL_PASS || '').trim();

    if (!host) {
        // Log missing host for diagnostics
        // eslint-disable-next-line no-console
        console.warn('[notifications][smtp] missing SPACEMAIL_HOST');
        return { sent: false, provider: 'smtp', reason: 'missing_host' };
    }

    const transporter = nodemailer.createTransport({
        host,
        port,
        secure,
        connectionTimeout: 10000,
        greetingTimeout: 10000,
        socketTimeout: 15000,
        ...(user ? { auth: { user, pass } } : {}),
    });

    // minimal plain-text templates
    let subject = 'Notification';
    let text = '';
    if (template === 'organizer-invite') {
        subject = `You're invited to join ${payload.organizationName}`;
        text = `You were invited to join ${payload.organizationName} as ${payload.role}.
Invite code: ${payload.inviteCode}
Invite link: ${payload.inviteUrl}
Expires: ${payload.expiresAt}
`;
    } else if (template === 'email-verification') {
        subject = 'Verify your email address';
        text = `Please verify your email address to access guest booking receipts.
Verification link: ${payload.verifyUrl}
This link expires at: ${payload.expiresAt}`;
    } else if (template === 'forgot-password') {
        subject = 'Password recovery instructions';
        text = `We received a request to reset your password.
Reset link: ${payload.resetUrl}
This link expires at: ${payload.expiresAt}

If you didn't request this, you can safely ignore this email.`;
    } else if (template === 'password-changed') {
        subject = 'Your password was changed';
        text = `Your account password was recently changed. If you didn't make this change, contact support immediately.`;
    } else if (template === 'booking-confirmation') {
        subject = `Booking Confirmation — ${payload.orderNumber || 'Your Order'}`;
        const items = Array.isArray(payload.items) ? payload.items : [];
        const itemLines = items.map((item) =>
            `  - ${item.description || 'Item'} (x${item.quantity || 1}) — $${Number(item.totalPrice || 0).toFixed(2)}${item.confirmationCode ? ` [${item.confirmationCode}]` : ''}`
        ).join('\n');

        text = `Hi ${payload.mainContactName || 'there'},

Your booking has been confirmed!

Order: ${payload.orderNumber || 'N/A'}
${itemLines ? `\nItems:\n${itemLines}\n` : ''}
Total: $${Number(payload.totalAmount || 0).toFixed(2)}

If you have any questions, please contact us.

Thank you for your booking!`;
    } else if (template === 'username-lookup') {
        subject = 'Your Username Lookup';
        const entries = Array.isArray(payload.usernames) ? payload.usernames : [];
        const lines = entries.map((entry) => {
            let line = `  - ${entry.username}`;
            if (entry.organizationUsername) {
                line += ` (organizer for ${entry.organizationUsername})`;
            }
            return line;
        }).join('\n');

        text = `Here are the usernames associated with this email:\n${lines}\n\nIf you did not request this, you can safely ignore this email.`;
    } else {
        subject = payload?.subject || 'Notification';
        text = payload?.text || JSON.stringify(payload || {});
    }

    try {
        await transporter.sendMail({
            from: smtpFrom,
            to,
            subject,
            text,
        });

        // eslint-disable-next-line no-console
        console.log('[notifications][smtp] sent', { to: maskEmail(to), subject });

        return { sent: true, provider: 'smtp' };
    } catch (err) {
        // eslint-disable-next-line no-console
        console.error('[notifications][smtp] send error', err && err.message ? err.message : err);
        return { sent: false, provider: 'smtp', reason: err.message || 'send_failed', to: maskEmail(to) };
    }
};

const resendProvider = async ({ to, payload }) => {
    const resendApiKey = String(process.env.RESEND_API_KEY || '').trim();

    if (!resendApiKey) {
        return {
            sent: false,
            provider: 'resend',
            reason: 'missing_api_key',
        };
    }

    return {
        sent: false,
        provider: 'resend',
        reason: 'not_implemented',
        to: maskEmail(to),
        metadata: {
            role: payload?.role,
        },
    };
};

const PROVIDERS = {
    console: consoleProvider,
    disabled: disabledProvider,
    smtp: smtpProvider,
    resend: resendProvider,
};

const resolveProvider = () => {
    const configuredProvider = String(process.env.NOTIFICATIONS_PROVIDER || 'console')
        .trim()
        .toLowerCase();

    if (!PROVIDERS[configuredProvider]) {
        return PROVIDERS.console;
    }

    return PROVIDERS[configuredProvider];
};

const sendNotification = async ({ template, to, payload }) => {
    const provider = resolveProvider();
    return provider({ template, to, payload });
};

const defaultExport = { sendNotification };

export { sendNotification };
export default defaultExport;
