import { createRequire } from 'node:module';
import { z } from 'zod';
import { createFixedWindowRateLimiter } from '../middlewares/rate-limit.js';
import { replyToChat } from '../services/Chat.service.js';
import { sendError } from '../utils/http-response.js';

const require = createRequire(import.meta.url);
const express = require('express');
const router = express.Router();
const MAX_CONVERSATION_CHARACTERS = 6000;

const messageSchema = z.object({
    role: z.enum(['user', 'assistant']),
    content: z.string().trim().min(1).max(1200),
}).strict();

const requestSchema = z.object({
    messages: z.array(messageSchema).min(1).max(15),
}).strict().superRefine(({ messages }, context) => {
    if (messages[messages.length - 1]?.role !== 'user') {
        context.addIssue({
            code: 'custom',
            path: ['messages'],
            message: 'The latest message must be from the user',
        });
    }
    if (messages.some((message, index) => message.role !== (index % 2 === 0 ? 'user' : 'assistant'))) {
        context.addIssue({
            code: 'custom',
            path: ['messages'],
            message: 'Conversation messages must alternate between user and assistant',
        });
    }
    if (messages.reduce((total, message) => total + message.content.length, 0) > MAX_CONVERSATION_CHARACTERS) {
        context.addIssue({
            code: 'custom',
            path: ['messages'],
            message: 'The conversation is too long',
        });
    }
});

const chatRateLimiter = createFixedWindowRateLimiter({
    keyPrefix: 'public-chat',
    maxRequests: Number(process.env.CHAT_RATE_LIMIT_MAX || 20),
    windowMs: Number(process.env.CHAT_RATE_LIMIT_WINDOW_MS || 15 * 60 * 1000),
    keyResolver: (req) => String(req.ip || 'unknown-ip'),
    message: 'Too many chat requests. Please try again later.',
});

const postChat = async (req, res) => {
    const parsed = requestSchema.safeParse(req.body);
    if (!parsed.success) {
        return res.status(400).json({
            errors: [parsed.error.issues[0]?.message || 'Invalid chat request'],
            data: {},
        });
    }

    try {
        const message = await replyToChat(parsed.data.messages);
        return res.status(200).json({ errors: [], data: { message } });
    } catch (error) {
        if (error?.status === 503) {
            return sendError(res, {
                status: 503,
                message: 'Chat is not configured. Please try again later.',
                requestId: req.requestId,
            });
        }
        // eslint-disable-next-line no-console
        console.error('Chat request failed', {
            requestId: req.requestId,
            errorName: error?.name || 'Error',
        });
        return sendError(res, {
            status: 502,
            message: 'The chat assistant is temporarily unavailable.',
            requestId: req.requestId,
        });
    }
};

router.post('/', chatRateLimiter, postChat);

export { postChat, requestSchema };
export default router;
