import { createRequire } from 'node:module';
const require = createRequire(import.meta.url);

import Experience from '../models/Experience.model.js';
import Location from '../models/Location.model.js';
import Organization from '../models/Organization.model.js';
import { syncExperienceSchedule } from '../services/Scheduler.service.js';
import Comment from '../models/Comment.model.js';
import User from '../models/User.model.js';
import Organizer from '../models/Organizer.model.js';
import ScheduledExperience from '../models/ScheduledExperience.model.js';
import TicketTier from '../models/TicketTier.model.js';
import ExperienceReservation from '../models/ExperienceReservation.model.js';
import ExperienceReservationAttendee from '../models/ExperienceReservationAttendee.model.js';
import ExperienceReservationAttendeeAnswer from '../models/ExperienceReservationAttendeeAnswer.model.js';
import ExperienceReservationAnswer from '../models/ExperienceReservationAnswer.model.js';
import { resolveMediaUrl } from '../utils/media-storage.js';
import { sendError } from '../utils/http-response.js';
import { DEFAULT_TIMEZONE, normalizeTimezone } from '../utils/timezone.js';
const debug = require('debug')('app:experience-controller');
import cache from '../utils/cache.js';

const { Op } = require('sequelize');
import ExperienceService from '../services/Experience.service.js';

const {
    transformExperience,
    getExperienceWithScheduleTimezone,
    parseDateOnlyInTimezone,
    parseMonthStartInTimezone,
    zonedDateTimeToUtc,
    formatDateKeyInTimezone,
    buildSocialHandle,
    normalizeAttendeePayload,
    normalizeMainContactPayload,
    isMainContactValid,
    normalizeTicketSelections,
    normalizeBillingPayload,
    isBillingPayloadValid,
    normalizeReservationAnswersPayload,
    generateConfirmationCode,
} = ExperienceService;

const mapCommentImages = (images) => {
    if (!Array.isArray(images) || images.length === 0) {
        return [];
    }

    return images
        .map((image) => {
            if (!image) return null;
            const imageValue = typeof image === 'string' ? image : image.imageUrl;
            const resolved = resolveMediaUrl(imageValue);
            if (!resolved) return null;

            return {
                imageUrl: resolved,
                accessibleText: typeof image === 'object' ? image.accessibleText : undefined,
            };
        })
        .filter(Boolean);
};

const getAllExperiences = async (req, res) => {
    try {
        const cacheKey = `experiences:list:${JSON.stringify(req.query || {})}`;
        const cached = await cache.get(cacheKey);
        if (cached) {
            return res.status(200).json(cached);
        }
        const {
            city,
            minPrice,
            maxPrice,
            ratings,
            sort,
            filters,
            advancedFilters,
            currentPage = 1,
        } = req.query;

        const whereClause = {};
        const locationWhere = {};

        let parsedFilters = {};
        let parsedAdvancedFilters = [];

        if (filters) {
            try {
                parsedFilters = JSON.parse(filters);
            } catch (error) {
                debug('Error parsing filters: %O', error);
            }
        }

        if (advancedFilters) {
            try {
                parsedAdvancedFilters = JSON.parse(advancedFilters);
            } catch (error) {
                debug('Error parsing advancedFilters: %O', error);
            }
        }

        const cityFilter = city || parsedFilters.city;
        if (cityFilter && cityFilter !== '') {
            locationWhere.city = cityFilter.toLowerCase();
        }

        const priceFilter = parsedFilters.priceFilter;
        const minPriceVal = minPrice || (priceFilter ? priceFilter.start : null);
        const maxPriceVal = maxPrice || (priceFilter ? priceFilter.end : null);

        if (minPriceVal || maxPriceVal) {
            whereClause.price = {};
            if (minPriceVal) whereClause.price[Op.gte] = parseFloat(minPriceVal);
            if (maxPriceVal) whereClause.price[Op.lte] = parseFloat(maxPriceVal);
        }

        const starRatings = parsedFilters.star_ratings;
        if (starRatings) {
            if (
                typeof starRatings === 'object' &&
                starRatings.min !== undefined &&
                starRatings.max !== undefined
            ) {
                whereClause.ratings = {
                    [Op.between]: [parseFloat(starRatings.min), parseFloat(starRatings.max)],
                };
            } else if (Array.isArray(starRatings) && starRatings.length > 0) {
                const ratingConditions = starRatings.map((rating) => {
                    const selected = parseFloat(rating);
                    return {
                        ratings: {
                            [Op.between]: [selected - 0.5, selected + 0.5],
                        },
                    };
                });
                whereClause[Op.or] = ratingConditions;
            }
        } else if (ratings) {
            whereClause.ratings = { [Op.gte]: parseFloat(ratings) };
        }

        let order = [['id', 'ASC']];
        const sortByFilter = parsedAdvancedFilters.find((filter) => filter.sortBy);
        const sortType = sortByFilter?.sortBy || sort;

        if (sortType === 'priceLowToHigh' || sortType === 'price_asc') {
            order = [['price', 'ASC']];
        } else if (sortType === 'priceHighToLow' || sortType === 'price_desc') {
            order = [['price', 'DESC']];
        } else if (sortType === 'rating_desc') {
            order = [['ratings', 'DESC']];
        }

        const pageSize = 6;
        const page = parseInt(currentPage) || 1;
        const offset = (page - 1) * pageSize;

        const { count, rows: experiences } = await Experience.findAndCountAll({
            where: whereClause,
            include: [
                {
                    model: Location,
                    attributes: ['city'],
                    where: locationWhere,
                    required: Object.keys(locationWhere).length > 0,
                },
                {
                    model: TicketTier,
                    attributes: ['id', 'title', 'description', 'minAge', 'maxAge', 'price', 'userQuestionnary'],
                    required: false,
                },
            ],
            order,
            limit: pageSize,
            offset,
            distinct: true,
        });

        const transformedExperiences = experiences.map((experience) => transformExperience(experience));

        const totalPages = Math.ceil(count / pageSize);

        res.status(200).json({
            errors: [],
            data: {
                elements: transformedExperiences,
            },
            metadata: {
                totalResults: count,
            },
            paging: {
                currentPage: page,
                totalPages,
                pageSize,
            },
        });
        // cache response (short TTL)
        try {
            await cache.set(cacheKey, {
                errors: [],
                data: { elements: transformedExperiences },
                metadata: { totalResults: count },
                paging: { currentPage: page, totalPages, pageSize },
            }, 60);
        } catch (e) {
            /* ignore cache errors */
        }
    } catch (error) {
        debug('Error fetching experiences: %O', error);
        return sendError(res, {
            status: 500,
            message: 'Error fetching experiences',
            requestId: req.requestId,
        });
    }
};

const getExperienceByCode = async (req, res) => {
    try {
        const { experienceCode } = req.params;
        const cacheKey = `experience:detail:${experienceCode}`;
        const cached = await cache.get(cacheKey);
        if (cached) return res.status(200).json(cached);

        const experience = await Experience.findOne({
            where: { id: parseInt(experienceCode) },
            include: [
                {
                    model: Organization,
                    attributes: ['name', 'slug'],
                    required: false,
                },
                {
                    model: Location,
                    attributes: ['name', 'city', 'country', 'state', 'street', 'zipCode', 'coordinates', 'timezone'],
                },
                {
                    model: User,
                    as: 'Organizers',
                    attributes: ['id', 'firstName', 'lastName', 'profilePicture', 'email', 'phoneNumber'],
                    through: { attributes: [] },
                },
                {
                    model: TicketTier,
                    attributes: ['id', 'title', 'description', 'minAge', 'maxAge', 'price', 'userQuestionnary'],
                    required: false,
                },
            ],
        });

        if (!experience) {
            return res.status(404).json({
                success: false,
                message: 'Experience not found',
            });
        }

        const experienceData = transformExperience(experience);

        const organizerUsers = experienceData.Organizers || [];
        const organizerUserIds = organizerUsers.map((organizer) => organizer.id);

        const organizerProfiles = organizerUserIds.length > 0
            ? await Organizer.findAll({
                where: {
                    UserId: {
                        [Op.in]: organizerUserIds,
                    },
                },
                attributes: ['id', 'UserId', 'description'],
            })
            : [];

        const organizerProfileByUserId = organizerProfiles.reduce((accumulator, organizerProfile) => {
            accumulator[organizerProfile.UserId] = {
                organizerProfileId: organizerProfile.id,
                description: organizerProfile.description || '',
            };
            return accumulator;
        }, {});

        const organizerProfileIds = organizerProfiles.map((organizerProfile) => organizerProfile.id);

        const organizerComments = organizerProfileIds.length > 0
            ? await Comment.findAll({
                where: {
                    CommentableType: 'Organizer',
                    CommentableId: {
                        [Op.in]: organizerProfileIds,
                    },
                },
                include: [
                    {
                        model: User,
                        attributes: ['firstName', 'city', 'country', 'profilePicture'],
                    },
                ],
                order: [['createdAt', 'DESC']],
                // Include ParentId so we can render replies under their parent
                attributes: ['id', 'CommentableId', 'ParentId', 'UserId', 'stars', 'title', 'comment', 'anonymity', 'createdAt', 'images'],
            })
            : [];

        const organizerCommentsByOrganizerId = organizerComments.reduce((accumulator, commentRecord) => {
            const mappedComment = {
                id: commentRecord.id,
                CommentableId: commentRecord.CommentableId,
                ParentId: commentRecord.ParentId || null,
                UserId: commentRecord.UserId || null,
                stars: commentRecord.stars,
                title: commentRecord.title,
                comment: commentRecord.comment,
                anonymity: commentRecord.anonymity,
                createdAt: commentRecord.createdAt,
                images: mapCommentImages(commentRecord.images),
                user: {
                    firstName: commentRecord.User?.firstName || '',
                    city: commentRecord.User?.city || '',
                    country: commentRecord.User?.country || '',
                    profilePicture: commentRecord.User?.profilePicture || '',
                },
            };

            if (!accumulator[commentRecord.CommentableId]) {
                accumulator[commentRecord.CommentableId] = [];
            }

            accumulator[commentRecord.CommentableId].push(mappedComment);
            return accumulator;
        }, {});

        const seenOrganizerIds = new Set();
        const organizerCards = [];

        organizerUsers.forEach((organizer) => {
            if (seenOrganizerIds.has(organizer.id)) {
                return;
            }

            seenOrganizerIds.add(organizer.id);

            const fullName = `${organizer.firstName || ''} ${organizer.lastName || ''}`.trim() || 'Organizer';
            const socialHandle = buildSocialHandle(organizer.firstName, organizer.lastName);
            const organizerProfile = organizerProfileByUserId[organizer.id] || {};
            const organizerProfileId = organizerProfile.organizerProfileId;
            const organizerCommentsForCard = organizerProfileId
                ? organizerCommentsByOrganizerId[organizerProfileId] || []
                : [];
            // Prefer top-level comments for display in organizer cards (exclude replies)
            const topLevelOrganizerComments = organizerCommentsForCard.filter((c) => !c.ParentId);
            const averageRating = organizerCommentsForCard.length > 0
                ? organizerCommentsForCard.reduce((sum, comment) => sum + Number(comment.stars || 0), 0) / organizerCommentsForCard.length
                : null;

            organizerCards.push({
                id: organizer.id,
                firstName: organizer.firstName || '',
                lastName: organizer.lastName || '',
                name: fullName,
                profilePicture: organizer.profilePicture || '',
                description: organizerProfile.description || '',
                socials: {
                    instagram: socialHandle ? `https://instagram.com/${socialHandle}` : '',
                    facebook: socialHandle ? `https://facebook.com/${socialHandle}` : '',
                    x: socialHandle ? `https://x.com/${socialHandle}` : '',
                },
                contact: {
                    email: organizer.email || '',
                    phoneNumber: organizer.phoneNumber || '',
                },
                organizerCommentCount: organizerCommentsForCard.length,
                organizerAverageRating: averageRating !== null ? Number(averageRating.toFixed(2)) : null,
                // Short list for the organizer card UI
                organizerComments: topLevelOrganizerComments.slice(0, 3),
                // Full comment list (including replies) for modals/details
                organizerAllComments: organizerCommentsForCard,
            });
        });

        const commentCount = await Comment.count({
            where: {
                CommentableId: experience.id,
                CommentableType: 'Experience',
            },
        });

        const comments = await Comment.findAll({
            where: {
                CommentableId: experience.id,
                CommentableType: 'Experience',
            },
            include: [
                {
                    model: User,
                    attributes: ['id', 'firstName', 'lastName', 'city', 'country', 'profilePicture'],
                },
            ],
            order: [['createdAt', 'DESC']],
            // include ParentId/UserId so frontend can group replies under parents
            attributes: ['id', 'stars', 'title', 'comment', 'anonymity', 'ParentId', 'UserId', 'createdAt', 'images', 'repliesCount'],
        });

        experienceData.organizers = organizerCards;
        experienceData.organizerNames = organizerCards.map((organizer) => organizer.name);
        experienceData.commentCount = commentCount;
        experienceData.comments = comments.map((comment) => {
            const commentData = comment.toJSON();
            const commenter = {
                id: commentData.User?.id || commentData.UserId || null,
                firstName: commentData.User?.firstName || '',
                lastName: commentData.User?.lastName || '',
                city: commentData.User?.city || '',
                country: commentData.User?.country || '',
                profilePicture: commentData.User?.profilePicture || '',
            };

            return {
                id: commentData.id,
                stars: commentData.stars,
                title: commentData.title,
                comment: commentData.comment,
                ParentId: commentData.ParentId || null,
                UserId: commentData.UserId || null,
                CommentableId: experience.id,
                CommentableType: 'Experience',
                anonymity: commentData.anonymity,
                createdAt: commentData.createdAt,
                repliesCount: commentData.repliesCount || 0,
                images: mapCommentImages(commentData.images),
                user: commenter,
                commenter,
                target: {
                    type: 'experience',
                    id: experience.id,
                    name: experienceData.title,
                },
            };
        });

        res.status(200).json({
            errors: [],
            data: experienceData,
        });
        // cache detail
        try {
            await cache.set(cacheKey, { errors: [], data: experienceData }, 60);
        } catch (e) {
            /* ignore */
        }
    } catch (error) {
        debug('Error fetching experience: %O', error);
        return sendError(res, {
            status: 500,
            message: 'Error fetching experience',
            requestId: req.requestId,
        });
    }
};

const getExperienceBookingEnquiry = async (req, res) => {
    try {
        const { experienceCode } = req.params;

        const experience = await Experience.findOne({
            where: { id: parseInt(experienceCode) },
            attributes: ['title', 'price', 'capacity'],
        });

        if (!experience) {
            return res.status(404).json({
                success: false,
                message: 'Experience not found',
            });
        }

        res.status(200).json({
            errors: [],
            data: {
                name: experience.title,
                cancellationPolicy: 'Free cancellation up to 24 hours before experience start',
                checkInTime: '09:00 AM',
                checkOutTime: '12:00 PM',
                currentNightRate: experience.price,
                maxGuestsAllowed: experience.capacity,
                maxRoomsAllowedPerGuest: 1,
            },
        });
    } catch (error) {
        debug('Error fetching experience booking enquiry: %O', error);
        return sendError(res, {
            status: 500,
            message: 'Error fetching experience booking enquiry',
            requestId: req.requestId,
        });
    }
};

const getExperienceComments = async (req, res) => {
    try {
        const { experienceCode } = req.params;
        const { currentPage = 1 } = req.query;

        const experience = await Experience.findOne({
            where: { id: parseInt(experienceCode) },
            attributes: ['id'],
        });

        if (!experience) {
            return res.status(404).json({
                success: false,
                message: 'Experience not found',
            });
        }

        const commentsData = await Comment.findAll({
            where: {
                CommentableId: experience.id,
                CommentableType: 'Experience',
            },
            order: [['createdAt', 'DESC']],
            attributes: ['id', 'stars', 'title', 'comment', 'anonymity', 'createdAt', 'images'],
        });

        const totalRatings = commentsData.reduce((acc, comment) => acc + comment.stars, 0);
        const initialCounts = { 5: 0, 4: 0, 3: 0, 2: 0, 1: 0 };
        const starCounts = commentsData.reduce((acc, comment) => {
            const ratingKey = Math.floor(comment.stars).toString();
            if (Object.prototype.hasOwnProperty.call(acc, ratingKey)) {
                acc[ratingKey]++;
            }
            return acc;
        }, initialCounts);

        const metadata = {
            totalComments: commentsData.length,
            averageRating: commentsData.length > 0 ? (totalRatings / commentsData.length).toFixed(1) : '0',
            starCounts,
        };

        const pageSize = 5;
        const page = parseInt(currentPage);
        const paging = {
            currentPage: page,
            totalPages: Math.ceil(commentsData.length / pageSize),
            pageSize,
        };

        const data = commentsData
            .slice((paging.currentPage - 1) * pageSize, paging.currentPage * pageSize)
            .map((comment) => {
                const commentData = comment.toJSON();
                commentData.images = mapCommentImages(commentData.images);
                return commentData;
            });

        res.status(200).json({
            errors: [],
            data: {
                elements: data,
            },
            metadata,
            paging,
        });
    } catch (error) {
        debug('Error fetching experience comments: %O', error);
        return sendError(res, {
            status: 500,
            message: 'Error fetching experience comments',
            requestId: req.requestId,
        });
    }
};

const addExperienceComment = async (req, res) => {
    try {
        res.status(200).json({
            errors: [],
            data: {
                status: 'Comment added successfully',
            },
        });
    } catch (error) {
        debug('Error adding experience comment: %O', error);
        return sendError(res, {
            status: 500,
            message: 'Error adding experience comment',
            requestId: req.requestId,
        });
    }
};

const getNearbyExperiences = async (req, res) => {
    try {
        const { city = 'Puerto Vallarta' } = req.query;
        const cacheKey = `experiences:nearby:${String(city || '').toLowerCase()}`;
        const cached = await cache.get(cacheKey);
        if (cached) return res.status(200).json(cached);

        const experiences = await Experience.findAll({
            include: [
                {
                    model: Location,
                    attributes: ['city'],
                    where: { city: city.toLowerCase() },
                },
                {
                    model: TicketTier,
                    attributes: ['id', 'title', 'description', 'price', 'userQuestionnary'],
                    required: false,
                },
            ],
            order: [['id', 'ASC']],
        });

        const transformedExperiences = experiences.map((experience) => transformExperience(experience));

        res.status(200).json({
            errors: [],
            data: {
                elements: transformedExperiences,
            },
        });
        try {
            await cache.set(cacheKey, { errors: [], data: { elements: transformedExperiences } }, 60);
        } catch (e) {}
    } catch (error) {
        debug('Error fetching nearby experiences: %O', error);
        return sendError(res, {
            status: 500,
            message: 'Error fetching nearby experiences',
            requestId: req.requestId,
        });
    }
};

const getCities = async (req, res) => {
    try {
        const cacheKey = 'experiences:cities';
        const cached = await cache.get(cacheKey);
        if (cached) return res.status(200).json(cached);
        const cities = await Location.findAll({
            attributes: [[Location.sequelize.fn('DISTINCT', Location.sequelize.col('city')), 'city']],
            include: [
                {
                    model: Experience,
                    as: 'Experiences',
                    attributes: [],
                    required: true,
                },
            ],
            raw: true,
        });

        res.status(200).json({
            errors: [],
            data: {
                elements: cities.map((city) => city.city),
            },
        });
        try {
            await cache.set(cacheKey, { errors: [], data: { elements: cities.map((city) => city.city) } }, 300);
        } catch (e) {}
    } catch (error) {
        debug('Error fetching experience cities: %O', error);
        return sendError(res, {
            status: 500,
            message: 'Error fetching experience cities',
            requestId: req.requestId,
        });
    }
};

const getVerticalFilters = async (req, res) => {
    try {
        const { city } = req.query;

        const includeLocation = {
            model: Location,
            attributes: [],
            required: !!city,
            where: city ? { city: city.toLowerCase() } : undefined,
        };

        const experiences = await Experience.findAll({
            include: [includeLocation],
            attributes: ['ratings'],
        });

        let minRating = 5;
        let maxRating = 0;

        experiences.forEach((experience) => {
            if (experience.ratings) {
                const rating = parseFloat(experience.ratings);
                if (rating < minRating) minRating = rating;
                if (rating > maxRating) maxRating = rating;
            }
        });

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
                ],
            },
        });
    } catch (error) {
        debug('Error fetching experience vertical filters: %O', error);
        return sendError(res, {
            status: 500,
            message: 'Error fetching experience vertical filters',
            requestId: req.requestId,
        });
    }
};

async function syncSchedule(req, res) {
    try {
        const { experienceCode } = req.params;
        const experience = await Experience.findByPk(experienceCode);
        
        if (!experience) {
            return res.status(404).json({ message: 'Experience not found' });
        }

        const scheduledExperiences = await syncExperienceSchedule(experience);
        return res.status(200).json({
            message: 'Experience schedule synced successfully',
            count: scheduledExperiences.length,
            scheduledExperiences,
        });
    } catch (error) {
        // eslint-disable-next-line no-console
        debug('Error syncing schedule: %O', error);
        return sendError(res, {
            status: 500,
            message: 'Error syncing schedule',
            requestId: req.requestId,
        });
    }
}

const getScheduledExperiences = async (req, res) => {
    try {
        const { experienceCode } = req.params;
        const { currentPage = 1, pageSize = 6, startDate } = req.query;
        const { experience, timezone: scheduleTimezone } = await getExperienceWithScheduleTimezone(experienceCode);

        const parsedPageSize = Math.max(1, parseInt(pageSize, 10) || 6);
        const parsedCurrentPage = Math.max(1, parseInt(currentPage, 10) || 1);
        const offset = (parsedCurrentPage - 1) * parsedPageSize;

        let rangeStartDate = new Date();
        const parsedStartDate = parseDateOnlyInTimezone(startDate, scheduleTimezone);
        if (parsedStartDate) {
            rangeStartDate = parsedStartDate;
        }

        let { count, rows: experiences } = await ScheduledExperience.findAndCountAll({
            where: {
            ExperienceId: experienceCode,
                status: 'scheduled',
                dateTime: {
                    [Op.gte]: rangeStartDate,
                },
            },
            limit: parsedPageSize,
            offset,
            order: [['dateTime', 'ASC']],
        });

        if (count === 0 && experience) {
            await syncExperienceSchedule(experience);

            const refreshedResult = await ScheduledExperience.findAndCountAll({
                where: {
                    ExperienceId: experienceCode,
                    status: 'scheduled',
                    dateTime: {
                        [Op.gte]: rangeStartDate,
                    },
                },
                limit: parsedPageSize,
                offset,
                order: [['dateTime', 'ASC']],
            });

            count = refreshedResult.count;
            experiences = refreshedResult.rows;
        }

        const totalPages = Math.max(1, Math.ceil(count / parsedPageSize));

        res.json({
            elements: experiences,
            paging: {
                currentPage: parsedCurrentPage,
                totalPages,
                pageSize: parsedPageSize,
            },
            metadata: {
                totalResults: count,
                timezone: scheduleTimezone,
            },
        });
    } catch (error) {
        debug('Error fetching scheduled experiences: %O', error);
        return sendError(res, {
            status: 500,
            message: 'Error fetching scheduled experiences',
            requestId: req.requestId,
        });
    }
};

const getScheduledExperiencesCalendarSummary = async (req, res) => {
    try {
        const { experienceCode } = req.params;
        const { month } = req.query;
        const { experience, timezone: scheduleTimezone } = await getExperienceWithScheduleTimezone(experienceCode);

        const { monthLabel, monthStartUtc } = parseMonthStartInTimezone(month, scheduleTimezone);
        const [yearString, monthString] = monthLabel.split('-');
        const year = parseInt(yearString, 10);
        const monthNumber = parseInt(monthString, 10);
        const nextMonthYear = monthNumber === 12 ? year + 1 : year;
        const nextMonth = monthNumber === 12 ? 1 : monthNumber + 1;
        const nextMonthStartUtc = zonedDateTimeToUtc(
            {
                year: nextMonthYear,
                month: nextMonth,
                day: 1,
                hour: 0,
                minute: 0,
                second: 0,
                millisecond: 0,
            },
            scheduleTimezone
        );
        const monthEnd = new Date(nextMonthStartUtc.getTime() - 1);
        const now = new Date();
        const rangeStart = monthStartUtc > now ? monthStartUtc : now;

        let experiences = await ScheduledExperience.findAll({
            where: {
            ExperienceId: experienceCode,
                status: 'scheduled',
                dateTime: {
                    [Op.between]: [rangeStart, monthEnd],
                },
            },
            attributes: ['dateTime', 'availableSpots'],
            order: [['dateTime', 'ASC']],
        });

        if (experiences.length === 0 && experience) {
            await syncExperienceSchedule(experience);
            experiences = await ScheduledExperience.findAll({
                where: {
                    ExperienceId: experienceCode,
                    status: 'scheduled',
                    dateTime: {
                        [Op.between]: [rangeStart, monthEnd],
                    },
                },
                attributes: ['dateTime', 'availableSpots'],
                order: [['dateTime', 'ASC']],
            });
        }

        const dayStatusMap = new Map();

        experiences.forEach((scheduledExperience) => {
            const dateKey = formatDateKeyInTimezone(new Date(scheduledExperience.dateTime), scheduleTimezone);
            const hasOpenSpots = Number(scheduledExperience.availableSpots) > 0;

            if (!dayStatusMap.has(dateKey)) {
                dayStatusMap.set(dateKey, { hasOpenSpots: false });
            }

            if (hasOpenSpots) {
                dayStatusMap.get(dateKey).hasOpenSpots = true;
            }
        });

        const elements = Array.from(dayStatusMap.entries()).map(([date, value]) => ({
            date,
            status: value.hasOpenSpots ? 'open' : 'full',
        }));

        res.json({
            elements,
            metadata: {
                month: monthLabel,
                timezone: scheduleTimezone,
                totalDays: elements.length,
            },
        });
    } catch (error) {
        debug('Error fetching scheduled experiences calendar summary: %O', error);
        return sendError(res, {
            status: 500,
            message: 'Error fetching scheduled experiences calendar summary',
            requestId: req.requestId,
        });
    }
};

// Helper functions moved to `../services/Experience.service.js`

const createExperienceReservation = async (req, res) => {
    const transaction = await Experience.sequelize.transaction();

    try {
        const experienceId = parseInt(req.params.experienceCode, 10);
        const {
            scheduledExperienceId,
            mainContact,
            ticketSelections,
            hotelName,
            comments,
            attendeeEmails,
            billing,
            totalPrice,
            specialRequests,
            reservationAnswers,
            customReservationAnswers,
            questionnaireAnswers,
            // Legacy support
            attendees,
            mainContactIndex,
        } = req.body;

        if (!Number.isInteger(experienceId)) {
            await transaction.rollback();
            return res.status(400).json({ errors: ['Invalid experience code'], data: {} });
        }

        const parsedScheduledExperienceId = Number(scheduledExperienceId);
        if (!Number.isInteger(parsedScheduledExperienceId)) {
            await transaction.rollback();
            return res.status(400).json({ errors: ['scheduledExperienceId is required'], data: {} });
        }

        // Determine if using new main-contact flow or legacy attendee flow
        const useMainContactFlow = mainContact && ticketSelections;

        if (!useMainContactFlow) {
            // Legacy flow: require attendees array
            if (!Array.isArray(attendees) || attendees.length === 0) {
                await transaction.rollback();
                return res.status(400).json({ errors: ['At least one attendee is required'], data: {} });
            }

            const parsedMainContactIndex = Number(mainContactIndex);
            if (
                !Number.isInteger(parsedMainContactIndex) ||
                parsedMainContactIndex < 0 ||
                parsedMainContactIndex >= attendees.length
            ) {
                await transaction.rollback();
                return res.status(400).json({
                    errors: ['mainContactIndex must reference a valid attendee'],
                    data: {},
                });
            }
        }

        // Validate main contact for new flow
        let normalizedMainContact = null;
        if (useMainContactFlow) {
            normalizedMainContact = normalizeMainContactPayload(mainContact);
            if (!isMainContactValid(normalizedMainContact)) {
                await transaction.rollback();
                return res.status(400).json({
                    errors: ['mainContact must include a valid phone number'],
                    data: {},
                });
            }
        }

        const normalizedBilling = normalizeBillingPayload(billing);
        if (!isBillingPayloadValid(normalizedBilling)) {
            await transaction.rollback();
            return res.status(400).json({
                errors: ['billing must include valid email, name, and full address details'],
                data: {},
            });
        }

        const experience = await Experience.findByPk(experienceId, { transaction });
        if (!experience) {
            await transaction.rollback();
            return res.status(404).json({ errors: ['Experience not found'], data: {} });
        }

        const scheduledExperience = await ScheduledExperience.findOne({
            where: {
                id: parsedScheduledExperienceId,
                ExperienceId: experienceId,
            },
            transaction,
        });

        if (!scheduledExperience) {
            await transaction.rollback();
            return res.status(404).json({ errors: ['Scheduled experience not found for this experience'], data: {} });
        }

        let computedTotalPrice;
        let totalAttendees;
        let ticketBreakdown;

        if (useMainContactFlow) {
            // New flow: ticket selections + main contact
            const normalizedSelections = normalizeTicketSelections(ticketSelections);
            if (normalizedSelections.length === 0) {
                await transaction.rollback();
                return res.status(400).json({ errors: ['At least one ticket selection is required'], data: {} });
            }

            const ticketTierIds = [...new Set(normalizedSelections.map((s) => s.ticketTierId))];

            const ticketTiers = await TicketTier.findAll({
                where: {
                    id: { [Op.in]: ticketTierIds },
                    ExperienceId: experienceId,
                },
                transaction,
            });

            if (ticketTiers.length !== ticketTierIds.length) {
                await transaction.rollback();
                return res.status(400).json({ errors: ['One or more ticket tiers are invalid for this experience'], data: {} });
            }

            const priceByTierId = ticketTiers.reduce((acc, tier) => {
                acc[tier.id] = Number(tier.price);
                return acc;
            }, {});

            const titleByTierId = ticketTiers.reduce((acc, tier) => {
                acc[tier.id] = tier.title || 'Ticket';
                return acc;
            }, {});

            totalAttendees = normalizedSelections.reduce((sum, s) => sum + s.quantity, 0);
            computedTotalPrice = normalizedSelections.reduce(
                (sum, s) => sum + (priceByTierId[s.ticketTierId] || 0) * s.quantity,
                0
            );

            ticketBreakdown = normalizedSelections.map((s) => ({
                ticketTierId: s.ticketTierId,
                tierTitle: titleByTierId[s.ticketTierId] || 'Ticket',
                quantity: s.quantity,
                unitPrice: Number((priceByTierId[s.ticketTierId] || 0).toFixed(2)),
                amount: Number(((priceByTierId[s.ticketTierId] || 0) * s.quantity).toFixed(2)),
            }));

        } else {
            // Legacy flow
            const normalizedAttendees = normalizeAttendeePayload(attendees);
            const invalidAttendee = normalizedAttendees.find(
                (attendee) =>
                    !attendee.firstName ||
                    !attendee.lastName ||
                    !attendee.email ||
                    !Number.isInteger(attendee.ticketTierId)
            );

            if (invalidAttendee) {
                await transaction.rollback();
                return res.status(400).json({
                    errors: ['Each attendee must include firstName, lastName, email, and ticketTierId'],
                    data: {},
                });
            }

            const ticketTierIds = [...new Set(normalizedAttendees.map((a) => a.ticketTierId))];

            const ticketTiers = await TicketTier.findAll({
                where: {
                    id: { [Op.in]: ticketTierIds },
                    ExperienceId: experienceId,
                },
                transaction,
            });

            if (ticketTiers.length !== ticketTierIds.length) {
                await transaction.rollback();
                return res.status(400).json({ errors: ['One or more ticket tiers are invalid for this experience'], data: {} });
            }

            const priceByTierId = ticketTiers.reduce((acc, tier) => {
                acc[tier.id] = Number(tier.price);
                return acc;
            }, {});

            const titleByTierId = ticketTiers.reduce((acc, tier) => {
                acc[tier.id] = tier.title || 'Ticket';
                return acc;
            }, {});

            totalAttendees = normalizedAttendees.length;
            computedTotalPrice = normalizedAttendees.reduce(
                (sum, a) => sum + (priceByTierId[a.ticketTierId] || 0),
                0
            );

            const ticketTierSummaryMap = normalizedAttendees.reduce((acc, a) => {
                const tierId = a.ticketTierId;
                const current = acc[tierId] || {
                    ticketTierId: tierId,
                    tierTitle: titleByTierId[tierId] || 'Ticket',
                    quantity: 0,
                    unitPrice: Number((priceByTierId[tierId] || 0).toFixed(2)),
                    amount: 0,
                };
                current.quantity += 1;
                current.amount = Number((current.quantity * (priceByTierId[tierId] || 0)).toFixed(2));
                acc[tierId] = current;
                return acc;
            }, {});

            ticketBreakdown = Object.values(ticketTierSummaryMap);

            // Legacy: create attendee rows
            req._legacyNormalizedAttendees = normalizedAttendees;
        }

        const requestedTotalPrice = Number(totalPrice);
        if (
            Number.isFinite(requestedTotalPrice) &&
            Math.abs(requestedTotalPrice - computedTotalPrice) > 0.01
        ) {
            await transaction.rollback();
            return res.status(400).json({
                errors: ['Total price mismatch with selected ticket tiers'],
                data: { expectedTotalPrice: Number(computedTotalPrice.toFixed(2)) },
            });
        }

        const reservation = await ExperienceReservation.create(
            {
                confirmationCode: generateConfirmationCode(experienceId, scheduledExperience.id),
                numberOfAttendees: totalAttendees,
                totalPrice: Number(computedTotalPrice.toFixed(2)),
                status: 'pending',
                specialRequests: specialRequests ? String(specialRequests).trim() : null,
                dayOfPhone: normalizedMainContact?.phone ? String(normalizedMainContact.phone).trim() : null,
                billingEmail: normalizedBilling.email,
                billingName: normalizedBilling.name,
                billingAddress: normalizedBilling.address,
                billingCity: normalizedBilling.city,
                billingState: normalizedBilling.state,
                billingPostalCode: normalizedBilling.postalCode,
                hotelName: hotelName ? String(hotelName).trim() : null,
                comments: comments ? String(comments).trim() : null,
                ScheduledExperienceId: scheduledExperience.id,
                ...(req.user?.id ? { CustomerId: req.user.id } : {}),
            },
            { transaction }
        );

        if (useMainContactFlow) {
            // Create attendee rows from ticketSelections (one row per ticket)
            const allAttendeeAnswers = [];
            const normalizedSelections = normalizeTicketSelections(ticketSelections);
            for (const selection of normalizedSelections) {
                if (!selection.ticketTierId || !Number(selection.quantity)) continue;
                const attendeeRows = await ExperienceReservationAttendee.bulkCreate(
                    Array.from({ length: Number(selection.quantity) }, () => ({
                        ExperienceReservationId: reservation.id,
                        TicketTierId: selection.ticketTierId,
                        status: 'active',
                    })),
                    { transaction }
                );
                const tierAnswers = (questionnaireAnswers || [])
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
        } else {
            // Legacy flow: create attendee rows (one per attendee ticket)
            const normalizedAttendees = req._legacyNormalizedAttendees;

            await ExperienceReservationAttendee.bulkCreate(
                normalizedAttendees.map((attendee) => ({
                    ExperienceReservationId: reservation.id,
                    TicketTierId: attendee.ticketTierId || null,
                    status: 'active',
                })),
                { transaction }
            );
        }

        // Create reservation-level answers
        const reservationAnswerRows = normalizeReservationAnswersPayload(
            reservationAnswers,
            customReservationAnswers
        ).map((answer) => ({
            ExperienceReservationId: reservation.id,
            questionKey: answer.questionKey,
            answerText: answer.answerText,
            answerJson: answer.answerJson,
        }));

        if (reservationAnswerRows.length > 0) {
            await ExperienceReservationAnswer.bulkCreate(reservationAnswerRows, { transaction });
        }

        await transaction.commit();

        return res.status(201).json({
            errors: [],
            data: {
                reservationId: reservation.id,
                confirmationCode: reservation.confirmationCode,
                status: reservation.status,
                numberOfAttendees: reservation.numberOfAttendees,
                totalPrice: Number(reservation.totalPrice),
                scheduledExperienceId: scheduledExperience.id,
                bookingDate: reservation.createdAt,
                experienceName: experience.title,
                ticketBreakdown,
            },
        });
    } catch (error) {
        await transaction.rollback();
        return sendError(res, {
            status: 500,
            message: 'Error creating experience reservation',
            requestId: req.requestId,
        });
    }
};

const defaultExport = { getAllExperiences, getExperienceByCode, getExperienceBookingEnquiry, getExperienceComments, addExperienceComment, getNearbyExperiences, getScheduledExperiences, getScheduledExperiencesCalendarSummary, createExperienceReservation, getCities, getVerticalFilters, syncSchedule };

export { getAllExperiences, getExperienceByCode, getExperienceBookingEnquiry, getExperienceComments, addExperienceComment, getNearbyExperiences, getScheduledExperiences, getScheduledExperiencesCalendarSummary, createExperienceReservation, getCities, getVerticalFilters, syncSchedule };
export default defaultExport;
