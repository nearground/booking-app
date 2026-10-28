export const EXPERIENCE_DETAILS_TEMPLATES = ['default', 'event', 'food-tour'];

const isRecord = (value) => value !== null && typeof value === 'object' && !Array.isArray(value);
const isMediaKey = (value, extensions) =>
    typeof value === 'string' && value.length <= 512 &&
    /^users\/[1-9]\d*\/[a-z0-9-]{1,40}\/[a-zA-Z0-9_-]+\.[a-z0-9]+$/.test(value) &&
    extensions.includes(value.split('.').pop());

export const normalizeDetailsMetadata = (value) => {
    const fallback = { version: 1, template: 'default', overrides: {} };
    if (value === undefined || value === null) return { metadata: fallback, errors: [] };
    const errors = [];
    if (!isRecord(value)) return { metadata: fallback, errors: ['detailsMetadata must be an object'] };
    if (Object.keys(value).some((key) => !['version', 'template', 'overrides'].includes(key))) {
        errors.push('detailsMetadata contains unsupported fields');
    }
    if (value.version !== 1) errors.push('detailsMetadata.version must be 1');
    const template = value.template === 'party' ? 'event' : value.template;
    if (!EXPERIENCE_DETAILS_TEMPLATES.includes(template)) errors.push('detailsMetadata.template is unsupported');
    const overrides = value.overrides === undefined ? {} : value.overrides;
    if (!isRecord(overrides)) return { metadata: fallback, errors: [...errors, 'detailsMetadata.overrides must be an object'] };
    if (Object.keys(overrides).some((key) => !['heroVideoKey', 'heroPosterKey', 'pinnedCommentIds', 'copy'].includes(key))) {
        errors.push('detailsMetadata.overrides contains unsupported fields');
    }
    const safeOverrides = {};
    for (const [field, extensions] of [['heroVideoKey', ['mp4']], ['heroPosterKey', ['jpg', 'jpeg', 'png', 'webp', 'avif']]]) {
        if (overrides[field] === undefined) continue;
        if (!isMediaKey(overrides[field], extensions)) errors.push(`detailsMetadata.overrides.${field} must be an uploaded media key`);
        else safeOverrides[field] = overrides[field];
    }
    if (overrides.pinnedCommentIds !== undefined) {
        const ids = overrides.pinnedCommentIds;
        if (!Array.isArray(ids) || ids.length > 3 || ids.some((id) => !Number.isSafeInteger(id) || id <= 0) || new Set(ids).size !== ids.length) {
            errors.push('detailsMetadata.overrides.pinnedCommentIds must contain at most three unique positive integer ids');
        } else safeOverrides.pinnedCommentIds = [...ids];
    }
    if (overrides.copy !== undefined) {
        const copyFields = new Set([
            'galleryLabel', 'descriptionHeading', 'descriptionFallback', 'meetingHeading', 'locationFallback',
            'mapLoading', 'mapSlow', 'hostedBy', 'organizerFallback', 'reviewsButton', 'reviewThanks', 'noComments',
            'freeBadge', 'paidBadge', 'storyEyebrow', 'storyHeading', 'venueHeading', 'arrivalInstructions',
            'registrationEyebrow', 'freeRegistrationHeading', 'paidRegistrationHeading',
            'freeRegistrationDescription', 'paidRegistrationDescription', 'freeRegisterButton', 'paidRegisterButton', 'freePaymentNotice',
            'privacyNotice', 'attendanceEyebrow', 'attendanceHeading', 'attendanceDescription', 'emptyAttendance',
            'pinnedReviewsEyebrow', 'pinnedReviewsHeading',
            'heroEyebrow', 'playVideo', 'pauseVideo', 'galleryButton', 'hostsHeading', 'locationHeading',
            'bookingLabel', 'reviewsEyebrow', 'reviewsHeading', 'pinnedReviewLabel',
        ]);
        if (!isRecord(overrides.copy)) {
            errors.push('detailsMetadata.overrides.copy must be an object');
        } else if (Object.entries(overrides.copy).some(([key, text]) =>
            !copyFields.has(key) || typeof text !== 'string' || text.length > 500
        )) {
            errors.push('detailsMetadata.overrides.copy contains unsupported fields or text longer than 500 characters');
        } else {
            safeOverrides.copy = { ...overrides.copy };
        }
    }
    return {
        metadata: errors.length ? fallback : { version: 1, template, overrides: safeOverrides },
        errors,
    };
};

export const validateEventConfiguration = ({ templates = [], picks = [], tiers = [] }) => {
    const errors = [];
    if (templates.some((template) => template.ruleType !== 'datetime') || templates.length + picks.length !== 1) {
        errors.push('Event experiences require exactly one non-recurring event date');
    }
    if (!tiers.length || tiers.some((tier) => !Number.isFinite(Number(tier.price)) || Number(tier.price) < 0)) {
        errors.push('Event experiences require valid ticket tiers');
    }
    const occurrence = picks[0] || templates[0] || {};
    const dateTime = occurrence.dateTime || occurrence.ruleDateTime;
    if (!dateTime || !Number.isFinite(new Date(dateTime).getTime())) {
        errors.push('Event experiences require a valid event date');
    }
    return { errors, dateTime, endDateTime: occurrence.endDateTime, capacity: occurrence.capacity, durationMinutes: occurrence.durationMinutes };
};
