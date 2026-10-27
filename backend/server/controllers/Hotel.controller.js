import { createRequire } from 'node:module';
const require = createRequire(import.meta.url);

import Hotel from '../models/Hotel.model.js';
import { resolveMediaUrl } from '../utils/media-storage.js';
import { sendError } from '../utils/http-response.js';
const debug = require('debug')('app:hotel-controller');
import cache from '../utils/cache.js';

const { Op } = require('sequelize');


const normalizeHotelImages = (images) => {
    if (!images) return [];
    if (!Array.isArray(images)) return [];

    return images
        .map((image) => resolveMediaUrl(image))
        .filter(Boolean);
};

const getAllHotels = async (req, res) => {
    try {
        const cacheKey = `hotels:list:${JSON.stringify(req.query || {})}`;
        const cached = await cache.get(cacheKey);
        if (cached) return res.status(200).json(cached);
        const { city, minPrice, maxPrice, ratings, sort, filters, advancedFilters, currentPage = 1 } = req.query;
        
        let whereClause = {};
        
        // Parse filters if they exist
        let parsedFilters = {};
        let parsedAdvancedFilters = [];
        
        if (filters) {
            try {
                parsedFilters = JSON.parse(filters);
            } catch (e) {
                debug('Error parsing filters: %O', e);
            }
        }
        
        if (advancedFilters) {
            try {
                parsedAdvancedFilters = JSON.parse(advancedFilters);
            } catch (e) {
                debug('Error parsing advancedFilters: %O', e);
            }
        }
        
        // Filter by city (from either direct param or filters object)
        const cityFilter = city || parsedFilters.city;
        if (cityFilter && cityFilter !== '') {
            whereClause.city = cityFilter.toLowerCase();
        }
        
        // Filter by price range (from either direct params or filters object)
        const priceFilter = parsedFilters.priceFilter;
        const minPriceVal = minPrice || (priceFilter ? priceFilter.start : null);
        const maxPriceVal = maxPrice || (priceFilter ? priceFilter.end : null);
        
        if (minPriceVal || maxPriceVal) {
            whereClause.price = {};
            if (minPriceVal) whereClause.price[Op.gte] = parseFloat(minPriceVal);
            if (maxPriceVal) whereClause.price[Op.lte] = parseFloat(maxPriceVal);
        }
        
        // Filter by ratings (from either direct param or filters object)
        const starRatings = parsedFilters.star_ratings;
        if (starRatings) {
            // Check if it's a range object (new format)
            if (typeof starRatings === 'object' && starRatings.min !== undefined && starRatings.max !== undefined) {
                whereClause.ratings = {
                    [Op.between]: [parseFloat(starRatings.min), parseFloat(starRatings.max)]
                };
            }
            // Legacy support: array of specific ratings
            else if (Array.isArray(starRatings) && starRatings.length > 0) {
                const ratingConditions = starRatings.map(rating => {
                    const selected = parseFloat(rating);
                    return {
                        ratings: {
                            [Op.between]: [selected - 0.5, selected + 0.5]
                        }
                    };
                });
                whereClause[Op.or] = ratingConditions;
            }
        } else if (ratings) {
            whereClause.ratings = { [Op.gte]: parseFloat(ratings) };
        }
        
        // Sorting
        let order = [['id', 'ASC']];
        
        // Check for sort in advancedFilters
        const sortByFilter = parsedAdvancedFilters.find(filter => filter.sortBy);
        const sortType = sortByFilter?.sortBy || sort;
        
        if (sortType === 'priceLowToHigh' || sortType === 'price_asc') {
            order = [['price', 'ASC']];
        } else if (sortType === 'priceHighToLow' || sortType === 'price_desc') {
            order = [['price', 'DESC']];
        } else if (sortType === 'rating_desc') {
            order = [['ratings', 'DESC']];
        }
        
        // Pagination
        const pageSize = 6;
        const page = parseInt(currentPage) || 1;
        const offset = (page - 1) * pageSize;
        
        const { count, rows: hotels } = await Hotel.findAndCountAll({
            where: whereClause,
            order: order,
            limit: pageSize,
            offset: offset,
        });
        
        // Transform hotels data to match frontend expectations
        const transformedHotels = hotels.map(hotel => {
            const hotelData = hotel.toJSON();
            
            // Ensure benefits is always an array
            if (!hotelData.benefits) {
                hotelData.benefits = [];
            }
            
            // Ensure images is always an array
            if (!hotelData.images) {
                hotelData.images = [];
            }
            hotelData.images = normalizeHotelImages(hotelData.images);
            
            // Convert price to string to match frontend expectations
            if (hotelData.price) {
                hotelData.price = hotelData.price.toString();
            }
            
            return hotelData;
        });
        
        const totalPages = Math.ceil(count / pageSize);
        
        res.status(200).json({
            errors: [],
            data: {
                elements: transformedHotels,
            },
            metadata: {
                totalResults: count,
            },
            paging: {
                currentPage: page,
                totalPages: totalPages,
                pageSize: pageSize,
            },
        });
        try {
            await cache.set(cacheKey, {
                errors: [],
                data: { elements: transformedHotels },
                metadata: { totalResults: count },
                paging: { currentPage: page, totalPages: totalPages, pageSize: pageSize },
            }, 60);
        } catch (e) {
            /* ignore cache errors */
        }
    } catch (error) {
        debug('Error fetching hotels: %O', error);
        return sendError(res, {
            status: 500,
            message: 'Error fetching hotels',
            requestId: req.requestId,
        });
    }
};

const getHotelByCode = async (req, res) => {
    try {
        const { hotelCode } = req.params;
        const cacheKey = `hotel:detail:${hotelCode}`;
        const cached = await cache.get(cacheKey);
        if (cached) return res.status(200).json(cached);
        
        const hotel = await Hotel.findOne({
            where: { hotelCode: parseInt(hotelCode) }
        });
        
        if (!hotel) {
            return res.status(404).json({
                success: false,
                message: 'Hotel not found',
            });
        }
        
        // Add description for the hotel detail page
        const description = [
            'A serene stay awaits at our plush hotel, offering a blend of luxury and comfort with top-notch amenities.',
            'Experience the pinnacle of elegance in our beautifully designed rooms with stunning cityscape views.',
            'Indulge in gastronomic delights at our in-house restaurants, featuring local and international cuisines.',
            'Unwind in our state-of-the-art spa and wellness center, a perfect retreat for the senses.',
            'Located in the heart of the city, our hotel is the ideal base for both leisure and business travelers.',
        ];
        
        const hotelData = hotel.toJSON();
        hotelData.description = description;
        
        // Ensure benefits is always an array
        if (!hotelData.benefits) {
            hotelData.benefits = [];
        }
        
        // Ensure images is always an array
        if (!hotelData.images) {
            hotelData.images = [];
        }
        hotelData.images = normalizeHotelImages(hotelData.images);
        
        // Convert price to string to match frontend expectations
        if (hotelData.price) {
            hotelData.price = hotelData.price.toString();
        }
        
        res.status(200).json({
            errors: [],
            data: hotelData,
        });
        try {
            await cache.set(cacheKey, { errors: [], data: hotelData }, 60);
        } catch (e) { /* ignore cache errors */ }
    } catch (error) {
        debug('Error fetching hotel: %O', error);
        return sendError(res, {
            status: 500,
            message: 'Error fetching hotel',
            requestId: req.requestId,
        });
    }
};

const getHotelBookingEnquiry = async (req, res) => {
    try {
        const { hotelCode } = req.params;
        const cacheKey = `hotel:booking-enquiry:${hotelCode}`;
        const cached = await cache.get(cacheKey);
        if (cached) return res.status(200).json(cached);
        
        const hotel = await Hotel.findOne({
            where: { hotelCode: parseInt(hotelCode) },
            attributes: ['title', 'price']
        });
        
        if (!hotel) {
            return res.status(404).json({
                success: false,
                message: 'Hotel not found',
            });
        }
        
        res.status(200).json({
            errors: [],
            data: {
                name: hotel.title,
                cancellationPolicy: 'Free cancellation 1 day prior to stay',
                checkInTime: '12:00 PM',
                checkOutTime: '10:00 AM',
                currentNightRate: hotel.price,
                maxGuestsAllowed: 5,
                maxRoomsAllowedPerGuest: 3,
            },
        });
        try { await cache.set(cacheKey, { errors: [], data: { name: hotel.title, cancellationPolicy: 'Free cancellation 1 day prior to stay', checkInTime: '12:00 PM', checkOutTime: '10:00 AM', currentNightRate: hotel.price, maxGuestsAllowed: 5, maxRoomsAllowedPerGuest: 3 } }, 60); } catch (e) {}
    } catch (error) {
        debug('Error fetching hotel booking enquiry: %O', error);
        return sendError(res, {
            status: 500,
            message: 'Error fetching hotel booking enquiry',
            requestId: req.requestId,
        });
    }
};

const getHotelComments = async (req, res) => {
    try {
        const { hotelCode } = req.params;
        const { currentPage = 1 } = req.query;
        
        const hotel = await Hotel.findOne({
            where: { hotelCode: parseInt(hotelCode) },
            attributes: ['comments']
        });
        
        if (!hotel || !hotel.comments) {
            return res.status(404).json({
                success: false,
                message: 'Hotel not found or no comments available',
            });
        }
        
        const commentsData = hotel.comments.data || [];
        
        // Calculate metadata
        const totalRatings = commentsData.reduce((acc, comment) => acc + comment.rating, 0);
        const initialCounts = { 5: 0, 4: 0, 3: 0, 2: 0, 1: 0 };
        const starCounts = commentsData.reduce((acc, comment) => {
            const ratingKey = Math.floor(comment.rating).toString();
            if (Object.prototype.hasOwnProperty.call(acc, ratingKey)) {
                acc[ratingKey]++;
            }
            return acc;
        }, initialCounts);
        
        const metadata = {
            totalComments: commentsData.length,
            averageRating: commentsData.length > 0 
                ? (totalRatings / commentsData.length).toFixed(1) 
                : '0',
            starCounts,
        };
        
        // Paging
        const pageSize = 5;
        const page = parseInt(currentPage);
        const paging = {
            currentPage: page,
            totalPages: Math.ceil(commentsData.length / pageSize),
            pageSize,
        };
        
        // Paginated data
        const data = commentsData.slice(
            (paging.currentPage - 1) * pageSize,
            paging.currentPage * pageSize
        );
        
        res.status(200).json({
            errors: [],
            data: {
                elements: data,
            },
            metadata,
            paging,
        });
    } catch (error) {
        debug('Error fetching hotel comments: %O', error);
        return sendError(res, {
            status: 500,
            message: 'Error fetching hotel comments',
            requestId: req.requestId,
        });
    }
};

const addHotelComment = async (req, res) => {
    try {
        // For now, just return success
        // In a real app, this would add the comment to the database
        res.status(200).json({
            errors: [],
            data: {
                status: 'Comment added successfully',
            },
        });
    } catch (error) {
        debug('Error adding hotel comment: %O', error);
        return sendError(res, {
            status: 500,
            message: 'Error adding hotel comment',
            requestId: req.requestId,
        });
    }
};

const getNearbyHotels = async (req, res) => {
    try {
        const cacheKey = `hotels:nearby:${JSON.stringify(req.query || {})}`;
        const cached = await cache.get(cacheKey);
        if (cached) return res.status(200).json(cached);
        const hotels = await Hotel.findAll({
            where: { city: 'pune' },
        });
        
        // Transform hotels data to match frontend expectations
        const transformedHotels = hotels.map(hotel => {
            const hotelData = hotel.toJSON();
            
            // Ensure benefits is always an array
            if (!hotelData.benefits) {
                hotelData.benefits = [];
            }
            
            // Ensure images is always an array
            if (!hotelData.images) {
                hotelData.images = [];
            }
            
            // Convert price to string to match frontend expectations
            if (hotelData.price) {
                hotelData.price = hotelData.price.toString();
            }
            
            return hotelData;
        });
        
        res.status(200).json({
            errors: [],
            data: {
                elements: transformedHotels,
            },
        });
        try { await cache.set(cacheKey, { errors: [], data: { elements: transformedHotels } }, 60); } catch (e) {}
    } catch (error) {
        debug('Error fetching nearby hotels: %O', error);
        return sendError(res, {
            status: 500,
            message: 'Error fetching nearby hotels',
            requestId: req.requestId,
        });
    }
};

const getCities = async (req, res) => {
    try {
        const cacheKey = 'hotels:cities';
        const cached = await cache.get(cacheKey);
        if (cached) return res.status(200).json(cached);
        const cities = await Hotel.findAll({
            attributes: [[Hotel.sequelize.fn('DISTINCT', Hotel.sequelize.col('city')), 'city']],
            raw: true,
        });
        
        res.status(200).json({
            errors: [],
            data: {
                elements: cities.map(c => c.city),
            },
        });
        try { await cache.set(cacheKey, { errors: [], data: { elements: cities.map(c => c.city) } }, 300); } catch (e) {}
    } catch (error) {
        debug('Error fetching cities: %O', error);
        return sendError(res, {
            status: 500,
            message: 'Error fetching cities',
            requestId: req.requestId,
        });
    }
};

const getVerticalFilters = async (req, res) => {
    try {
        const cacheKey = `hotels:vertical-filters:${JSON.stringify(req.query || {})}`;
        const cached = await cache.get(cacheKey);
        if (cached) return res.status(200).json(cached);
        const { city } = req.query;
        
        let whereClause = {};
        if (city) {
            whereClause.city = city.toLowerCase();
        }
        
        const hotels = await Hotel.findAll({
            where: whereClause,
            attributes: ['ratings'],
        });
        
        // Get min and max ratings
        let minRating = 5;
        let maxRating = 0;
        
        hotels.forEach(h => {
            if (h.ratings) {
                const rating = parseFloat(h.ratings);
                if (rating < minRating) minRating = rating;
                if (rating > maxRating) maxRating = rating;
            }
        });
        
        // If no hotels found, use defaults
        if (minRating > maxRating) {
            minRating = 0;
            maxRating = 5;
        }
        
        res.status(200).json({
            errors: [],
            data: {
                elements: [
                    {
                        filterId: 'star_ratings',
                        title: 'Star ratings',
                        type: 'range',
                        min: 0,
                        max: 5,
                        minValue: minRating,
                        maxValue: maxRating,
                        step: 0.5,
                    },
                    {
                        filterId: 'propety_type',
                        title: 'Property type',
                        type: 'checkbox',
                        filters: [
                            {
                                id: 'prop_type_hotel',
                                title: 'Hotel',
                            },
                            {
                                id: 'prop_type_apartment',
                                title: 'Apartment',
                            },
                            {
                                id: 'prop_type_villa',
                                title: 'Villa',
                            },
                        ],
                    },
                ],
            },
        });
        try { await cache.set(cacheKey, { errors: [], data: { elements: [ { filterId: 'star_ratings', title: 'Star ratings', type: 'range', min: 0, max: 5, minValue: minRating, maxValue: maxRating, step: 0.5 }, { filterId: 'propety_type', title: 'Property type', type: 'checkbox', filters: [ { id: 'prop_type_hotel', title: 'Hotel' }, { id: 'prop_type_apartment', title: 'Apartment' }, { id: 'prop_type_villa', title: 'Villa' }, ], }, ] } }, 300); } catch (e) {}
    } catch (error) {
        debug('Error fetching vertical filters: %O', error);
        return sendError(res, {
            status: 500,
            message: 'Error fetching vertical filters',
            requestId: req.requestId,
        });
    }
};

const defaultExport = { getAllHotels, getHotelByCode, getHotelBookingEnquiry, getHotelComments, addHotelComment, getNearbyHotels, getCities, getVerticalFilters };

export { getAllHotels, getHotelByCode, getHotelBookingEnquiry, getHotelComments, addHotelComment, getNearbyHotels, getCities, getVerticalFilters };
export default defaultExport;
