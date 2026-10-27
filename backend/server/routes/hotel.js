import { createRequire } from 'node:module';
const require = createRequire(import.meta.url);

const express = require('express');

import {
    getHotelByCode,
    getHotelBookingEnquiry,
    getHotelComments,
    addHotelComment,
} from '../controllers/Hotel.controller.js';

const router = express.Router();

router.put('/add-comment', addHotelComment);
router.get('/:hotelCode/booking/enquiry', getHotelBookingEnquiry);
router.get('/:hotelCode/comments', getHotelComments);
router.get('/:hotelCode', getHotelByCode);

export default router;
