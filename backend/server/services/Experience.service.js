import { createRequire } from 'node:module';
const require = createRequire(import.meta.url);

import Experience from '../models/Experience.model.js';
import Location from '../models/Location.model.js';
import { resolveMediaUrl } from '../utils/media-storage.js';
import { DEFAULT_TIMEZONE, normalizeTimezone } from '../utils/timezone.js';

const { Op } = require('sequelize');

const timezoneFormatterCache = new Map();

export const getTimezoneFormatter = (timezone) => {
    const normalizedTimezone = normalizeTimezone(timezone, DEFAULT_TIMEZONE);

    if (!timezoneFormatterCache.has(normalizedTimezone)) {
        timezoneFormatterCache.set(
            normalizedTimezone,
            new Intl.DateTimeFormat('en-US', {
                timeZone: normalizedTimezone,
                year: 'numeric',
                month: '2-digit',
                day: '2-digit',
                hour: '2-digit',
                minute: '2-digit',
                second: '2-digit',
                hour12: false,
            })
        );
    }

    return timezoneFormatterCache.get(normalizedTimezone);
};

export const getTimezoneOffsetMs = (dateValue, timezone) => {
    const date = dateValue instanceof Date ? dateValue : new Date(dateValue);
    const formatter = getTimezoneFormatter(timezone);
    const parts = formatter.formatToParts(date);

    const year = Number(parts.find((part) => part.type === 'year')?.value);
    const month = Number(parts.find((part) => part.type === 'month')?.value);
    const day = Number(parts.find((part) => part.type === 'day')?.value);
    const hour = Number(parts.find((part) => part.type === 'hour')?.value);
    const minute = Number(parts.find((part) => part.type === 'minute')?.value);
    const second = Number(parts.find((part) => part.type === 'second')?.value);

    const asUtcTimestamp = Date.UTC(year, month - 1, day, hour, minute, second);
    return asUtcTimestamp - date.getTime();
};

export const zonedDateTimeToUtc = (
    { year, month, day, hour = 0, minute = 0, second = 0, millisecond = 0 },
    timezone
) => {
    let utcTimestamp = Date.UTC(year, month - 1, day, hour, minute, second, millisecond);

    for (let iteration = 0; iteration < 3; iteration += 1) {
        const offsetMs = getTimezoneOffsetMs(new Date(utcTimestamp), timezone);
        const nextUtcTimestamp =
            Date.UTC(year, month - 1, day, hour, minute, second, millisecond) - offsetMs;

        if (nextUtcTimestamp === utcTimestamp) {
            break;
        }

        utcTimestamp = nextUtcTimestamp;
    }

    return new Date(utcTimestamp);
};

export const parseDateOnlyInTimezone = (dateStringValue, timezone) => {
    if (typeof dateStringValue !== 'string' || !/^\d{4}-\d{2}-\d{2}$/.test(dateStringValue)) {
        return null;
    }

    const [yearString, monthString, dayString] = dateStringValue.split('-');
    const year = parseInt(yearString, 10);
    const month = parseInt(monthString, 10);
    const day = parseInt(dayString, 10);

    if (!year || !month || !day || month < 1 || month > 12 || day < 1 || day > 31) {
        return null;
    }

    return zonedDateTimeToUtc(
        { year, month, day, hour: 0, minute: 0, second: 0, millisecond: 0 },
        timezone
    );
};

export const parseMonthStartInTimezone = (monthQueryValue, timezone) => {
    const now = new Date();

    if (typeof monthQueryValue !== 'string' || !/^\d{4}-\d{2}$/.test(monthQueryValue)) {
        const currentYearInTimezone = Number(
            new Intl.DateTimeFormat('en-US', {
                timeZone: timezone,
                year: 'numeric',
            }).format(now)
        );
        const currentMonthInTimezone = Number(
            new Intl.DateTimeFormat('en-US', {
                timeZone: timezone,
                month: '2-digit',
            }).format(now)
        );

        return {
            monthLabel: `${currentYearInTimezone}-${String(currentMonthInTimezone).padStart(2, '0')}`,
            monthStartUtc: zonedDateTimeToUtc(
                {
                    year: currentYearInTimezone,
                    month: currentMonthInTimezone,
                    day: 1,
                    hour: 0,
                    minute: 0,
                    second: 0,
                    millisecond: 0,
                },
                timezone
            ),
        };
    }

    const [yearString, monthString] = monthQueryValue.split('-');
    const year = parseInt(yearString, 10);
    const month = parseInt(monthString, 10);

    if (!year || !month || month < 1 || month > 12) {
        return parseMonthStartInTimezone(null, timezone);
    }

    return {
        monthLabel: `${year}-${String(month).padStart(2, '0')}`,
        monthStartUtc: zonedDateTimeToUtc(
            { year, month, day: 1, hour: 0, minute: 0, second: 0, millisecond: 0 },
            timezone
        ),
    };
};

export const formatDateKeyInTimezone = (dateObject, timezone) =>
    new Intl.DateTimeFormat('en-CA', {
        timeZone: timezone,
        year: 'numeric',
        month: '2-digit',
        day: '2-digit',
    }).format(dateObject);

export const getExperienceWithScheduleTimezone = async (experienceCode) => {
    const experience = await Experience.findByPk(experienceCode, {
        attributes: ['id', 'scheduling', 'duration', 'capacity', 'LocationId'],
        include: [
            {
                model: Location,
                attributes: ['timezone'],
                required: false,
            },
        ],
    });

    const timezone = normalizeTimezone(experience?.Location?.timezone, DEFAULT_TIMEZONE);

    return {
        experience,
        timezone,
    };
};

export const buildSocialHandle = (firstName = '', lastName = '') =>
    `${firstName}.${lastName}`
        .toLowerCase()
        .replace(/[^a-z0-9.]/g, '')
        .replace(/\.{2,}/g, '.')
        .replace(/^\.|\.$/g, '');

export const normalizeImages = (images) => {
    if (!images) return [];
    if (Array.isArray(images)) return images;

    if (typeof images === 'string') {
        try {
            const parsed = JSON.parse(images);
            return Array.isArray(parsed) ? parsed : [];
        } catch (_error) {
            return [];
        }
    }

    return [];
};

export const mapImagesToCards = (images, title) =>
    normalizeImages(images).map((imageUrl) => ({
        imageUrl: resolveMediaUrl(imageUrl),
        accessibleText: title || 'experience image',
    })).filter((image) => Boolean(image.imageUrl));

export const pickExperienceThumbnail = (thumbnail, images) => {
    if (typeof thumbnail === 'string' && thumbnail.trim() !== '') {
        return resolveMediaUrl(thumbnail.trim());
    }

    const normalizedImages = normalizeImages(images);
    return resolveMediaUrl(normalizedImages[0]) || null;
};

export const parseTierPrice = (priceValue) => {
    const parsedPrice = Number(priceValue);
    return Number.isFinite(parsedPrice) ? parsedPrice : null;
};

export const pickExperienceTilePriceFromTiers = (ticketTiers = []) => {
    if (!Array.isArray(ticketTiers) || ticketTiers.length === 0) {
        return null;
    }

    const adultTierPrices = ticketTiers
        .filter((tier) => (tier?.title || '').trim().toLowerCase() === 'adult')
        .map((tier) => parseTierPrice(tier.price))
        .filter((price) => price !== null);

    if (adultTierPrices.length > 0) {
        return Math.min(...adultTierPrices);
    }

    const allTierPrices = ticketTiers
        .map((tier) => parseTierPrice(tier.price))
        .filter((price) => price !== null);

    if (allTierPrices.length === 0) {
        return null;
    }

    return Math.max(...allTierPrices);
};

export const transformExperience = (experience) => {
    const experienceData = experience.toJSON();

    const ticketTierPrice = pickExperienceTilePriceFromTiers(experienceData.TicketTiers);

    if (ticketTierPrice !== null) {
        experienceData.price = ticketTierPrice.toFixed(2);
    } else if (experienceData.price) {
        experienceData.price = experienceData.price.toString();
    }

    experienceData.TicketTiers = experienceData.TicketTiers || [];
    experienceData.userQuestionnary = Array.isArray(experienceData.userQuestionnary)
        ? experienceData.userQuestionnary
        : [];

    if (experienceData.Location?.city) {
        experienceData.city = experienceData.Location.city;
    }

    experienceData.experienceCode = experienceData.id;
    experienceData.hotelCode = experienceData.id;
    experienceData.benefits = experienceData.benefits || [];
    experienceData.thumbnail = pickExperienceThumbnail(experienceData.thumbnail, experienceData.images);
    experienceData.images = mapImagesToCards(experienceData.images, experienceData.title);

    return experienceData;
};

export const generateConfirmationCode = (experienceId, scheduledExperienceId) => {
    const randomSuffix = Math.random().toString(36).slice(2, 8).toUpperCase();
    return `${experienceId}-${scheduledExperienceId}-${Date.now()}-${randomSuffix}`;
};

export const normalizeAttendeePayload = (attendees = []) =>
    attendees.map((attendee) => ({
        ticketTierId: Number(attendee.ticketTierId),
        firstName: String(attendee.firstName || '').trim(),
        lastName: String(attendee.lastName || '').trim(),
        email: String(attendee.email || '').trim(),
        phone: attendee.phone ? String(attendee.phone).trim() : null,
        dateOfBirth: attendee.dateOfBirth || null,
        allergies: attendee.allergies ? String(attendee.allergies).trim() : null,
        dietaryRestrictions: attendee.dietaryRestrictions
            ? String(attendee.dietaryRestrictions).trim()
            : null,
        accessibilityNeeds: attendee.accessibilityNeeds
            ? String(attendee.accessibilityNeeds).trim()
            : null,
        answers: Array.isArray(attendee.answers) ? attendee.answers : null,
        customAnswers:
            attendee.customAnswers && typeof attendee.customAnswers === 'object'
                ? attendee.customAnswers
                : null,
    }));

export const normalizeMainContactPayload = (mainContact = {}) => ({
    fullName: String(mainContact.fullName || '').trim(),
    phone: String(mainContact.phone || '').trim(),
    email: String(mainContact.email || '').trim(),
});

export const isMainContactValid = (mainContact) => {
    return Boolean(mainContact.phone);
};

export const normalizeTicketSelections = (ticketSelections = []) =>
    ticketSelections
        .filter((selection) => selection && Number.isInteger(Number(selection.ticketTierId)) && Number(selection.quantity) > 0)
        .map((selection) => ({
            ticketTierId: Number(selection.ticketTierId),
            quantity: Number(selection.quantity),
        }));

export const normalizeBillingPayload = (billing = {}) => ({
    email: String(billing.email || '').trim(),
    name: String(billing.name || '').trim(),
    address: String(billing.address || '').trim(),
    city: String(billing.city || '').trim(),
    state: String(billing.state || '').trim(),
    postalCode: String(billing.postalCode || '').trim(),
});

export const isBillingPayloadValid = (billing) => {
    const hasRequiredValues =
        billing.email &&
        billing.name &&
        billing.address &&
        billing.city &&
        billing.state &&
        billing.postalCode;

    if (!hasRequiredValues) {
        return false;
    }

    return /\S+@\S+\.\S+/.test(billing.email);
};

export const normalizeReservationAnswersPayload = (answers, customAnswers) => {
    const normalizedByQuestionKey = new Map();

    if (Array.isArray(answers)) {
        answers.forEach((answer) => {
            if (!answer || !answer.questionKey) {
                return;
            }

            const questionKey = String(answer.questionKey).trim();
            if (!questionKey) {
                return;
            }

            normalizedByQuestionKey.set(questionKey, {
                questionKey,
                answerText:
                    typeof answer.answerText === 'string' ? String(answer.answerText).trim() : null,
                answerJson:
                    answer.answerJson && typeof answer.answerJson === 'object'
                        ? answer.answerJson
                        : null,
            });
        });
    }

    if (customAnswers && typeof customAnswers === 'object') {
        Object.entries(customAnswers).forEach(([questionKey, answerValue]) => {
            const normalizedQuestionKey = String(questionKey || '').trim();
            if (!normalizedQuestionKey) {
                return;
            }

            normalizedByQuestionKey.set(normalizedQuestionKey, {
                questionKey: normalizedQuestionKey,
                answerText:
                    typeof answerValue === 'string' ? String(answerValue).trim() : null,
                answerJson:
                    answerValue && typeof answerValue === 'object' ? answerValue : null,
            });
        });
    }

    return Array.from(normalizedByQuestionKey.values());
};

export default {
    getTimezoneFormatter,
    getTimezoneOffsetMs,
    zonedDateTimeToUtc,
    parseDateOnlyInTimezone,
    parseMonthStartInTimezone,
    formatDateKeyInTimezone,
    getExperienceWithScheduleTimezone,
    buildSocialHandle,
    normalizeImages,
    mapImagesToCards,
    pickExperienceThumbnail,
    parseTierPrice,
    pickExperienceTilePriceFromTiers,
    transformExperience,
    generateConfirmationCode,
    normalizeAttendeePayload,
    normalizeMainContactPayload,
    isMainContactValid,
    normalizeTicketSelections,
    normalizeBillingPayload,
    isBillingPayloadValid,
    normalizeReservationAnswersPayload,
};
