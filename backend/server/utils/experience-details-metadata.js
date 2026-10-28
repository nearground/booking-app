export const EXPERIENCE_DETAILS_TEMPLATES = ['default', 'party', 'food-tour'];

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
    if (!EXPERIENCE_DETAILS_TEMPLATES.includes(value.template)) errors.push('detailsMetadata.template is unsupported');
    const overrides = value.overrides === undefined ? {} : value.overrides;
    if (!isRecord(overrides)) return { metadata: fallback, errors: [...errors, 'detailsMetadata.overrides must be an object'] };
    if (Object.keys(overrides).some((key) => !['heroVideoKey', 'heroPosterKey', 'pinnedCommentIds'].includes(key))) {
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
    return {
        metadata: errors.length ? fallback : { version: 1, template: value.template, overrides: safeOverrides },
        errors,
    };
};

export const validatePartyConfiguration = ({ templates = [], picks = [], tiers = [] }) => {
    const errors = [];
    if (templates.some((template) => template.ruleType !== 'datetime') || templates.length + picks.length !== 1) {
        errors.push('Party experiences require exactly one non-recurring event date');
    }
    if (!tiers.length || tiers.some((tier) => !Number.isFinite(Number(tier.price)) || Number(tier.price) !== 0)) {
        errors.push('Party experiences require free ticket tiers');
    }
    const occurrence = picks[0] || templates[0] || {};
    const dateTime = occurrence.dateTime || occurrence.ruleDateTime;
    if (!dateTime || !Number.isFinite(new Date(dateTime).getTime())) {
        errors.push('Party experiences require a valid event date');
    }
    return { errors, dateTime, endDateTime: occurrence.endDateTime, capacity: occurrence.capacity, durationMinutes: occurrence.durationMinutes };
};
