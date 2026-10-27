import { createRequire } from 'node:module';
const require = createRequire(import.meta.url);

const express = require('express');

import { getOrder, getOrderConfirmation, listOrders, handlePaymentWebhook } from '../controllers/Order.controller.js';
import { authUser } from '../middlewares/auth.js';

const router = express.Router();

router.get('/', authUser, listOrders);
router.get('/:orderNumber/confirmation', authUser, getOrderConfirmation);
router.get('/:orderNumber', authUser, getOrder);
router.post('/webhook', handlePaymentWebhook);

export default router;
