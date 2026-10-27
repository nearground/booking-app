import { createRequire } from 'node:module';
const require = createRequire(import.meta.url);

const express = require('express');

import {
    getAllHotels,
    getHotelByCode,
    getCities,
    getVerticalFilters,
    getHotelBookingEnquiry,
    getHotelComments,
    addHotelComment,
    getNearbyHotels,
} from '../controllers/Hotel.controller.js';

const router = express.Router();

// Get all hotels with optional filters
router.get('/', getAllHotels);

// Get vertical filters (price range, ratings)
router.get('/verticalFilters', getVerticalFilters);

// Get available cities
router.get('/availableCities', getCities);

// Get nearby hotels
router.get('/nearbyHotels', getNearbyHotels);

// Get hotel by code
router.get('/:hotelCode', getHotelByCode);

// Get hotel booking enquiry
router.get('/:hotelCode/booking/enquiry', getHotelBookingEnquiry);

// Get hotel comments
router.get('/:hotelCode/comments', getHotelComments);

// Add hotel comment
router.put('/add-comment', addHotelComment);

export default router;
