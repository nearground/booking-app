const DEFAULT_TIMEZONE = 'UTC';

const isValidIanaTimezone = (timezone) => {
    if (!timezone || typeof timezone !== 'string') {
        return false;
    }

    try {
        Intl.DateTimeFormat('en-US', { timeZone: timezone });
        return true;
    } catch (_error) {
        return false;
    }
};

const normalizeTimezone = (timezone, fallbackTimezone = DEFAULT_TIMEZONE) => {
    const normalizedInput = String(timezone || '').trim();
    if (isValidIanaTimezone(normalizedInput)) {
        return normalizedInput;
    }

    const normalizedFallback = String(fallbackTimezone || DEFAULT_TIMEZONE).trim();
    if (isValidIanaTimezone(normalizedFallback)) {
        return normalizedFallback;
    }

    return DEFAULT_TIMEZONE;
};

const defaultExport = { DEFAULT_TIMEZONE, isValidIanaTimezone, normalizeTimezone };

export { DEFAULT_TIMEZONE, isValidIanaTimezone, normalizeTimezone };
export default defaultExport;
