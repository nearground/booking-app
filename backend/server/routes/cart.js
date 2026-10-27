import { createRequire } from 'node:module';
const require = createRequire(import.meta.url);

const express = require('express');

import { getCart, addItem, updateItem, removeItem, clearCart } from '../controllers/Cart.controller.js';
import { initiateCheckout } from '../controllers/Order.controller.js';
import { authUser } from '../middlewares/auth.js';
import { validateToken } from '../utils/auth-helpers.js';

// Middleware that attaches user if authenticated but does not block unauthenticated requests
const optionalAuth = (req, res, next) => {
    const token = req.cookies?._token ?? '';
    if (token) {
        const decoded = validateToken(token);
        if (decoded) {
            req.user = { id: decoded.id };
        }
    }
    return next();
};

const router = express.Router();

router.get('/', optionalAuth, getCart);
router.post('/items', optionalAuth, addItem);
router.patch('/items/:id', optionalAuth, updateItem);
router.delete('/items/:id', optionalAuth, removeItem);
router.delete('/', optionalAuth, clearCart);
router.post('/checkout', authUser, initiateCheckout);

export default router;
