const normalizeBaseUrl = (value) => {
    const url = String(value || '').trim();
    if (!url) return '';
    return url.replace(/\/+$/, '');
};

const MEDIA_PUBLIC_BASE_URL = normalizeBaseUrl(
    process.env.MEDIA_PUBLIC_BASE_URL || 'http://localhost:4000/api/media/object'
);

const isAbsoluteHttpUrl = (value) => /^https?:\/\//i.test(String(value || '').trim());

const buildMediaUrl = (objectKey) => {
    const key = String(objectKey || '').trim().replace(/^\/+/, '');
    if (!key) return null;
    if (!MEDIA_PUBLIC_BASE_URL) return key;

    const encodedKey = key
        .split('/')
        .map((segment) => encodeURIComponent(segment))
        .join('/');

    return `${MEDIA_PUBLIC_BASE_URL}/${encodedKey}`;
};

const stripConfiguredBase = (value) => {
    if (!MEDIA_PUBLIC_BASE_URL) {
        return null;
    }

    const normalizedValue = String(value || '').trim();
    const withSlash = `${MEDIA_PUBLIC_BASE_URL}/`;

    if (normalizedValue.startsWith(withSlash)) {
        return decodeURIComponent(normalizedValue.slice(withSlash.length));
    }

    if (normalizedValue === MEDIA_PUBLIC_BASE_URL) {
        return '';
    }

    return null;
};

const normalizeStoredMediaValue = (value) => {
    if (value === null || value === undefined) {
        return null;
    }

    const normalized = String(value).trim();
    if (!normalized) {
        return null;
    }

    const fromBase = stripConfiguredBase(normalized);
    if (fromBase !== null) {
        return fromBase || null;
    }

    if (normalized.startsWith('/objects/')) {
        return decodeURIComponent(normalized.replace('/objects/', ''));
    }

    if (normalized.startsWith('objects/')) {
        return decodeURIComponent(normalized.replace('objects/', ''));
    }

    return normalized;
};

// lightweight in-process cache for resolved media URLs (synchronous)
const _resolveCache = new Map();
const _RESOLVE_CACHE_TTL_MS = 1000 * 300; // 5 minutes

const resolveMediaUrl = (value) => {
    const normalized = normalizeStoredMediaValue(value);

    if (!normalized) {
        return null;
    }

    // If it's already an absolute URL or data path, return directly
    if (
        isAbsoluteHttpUrl(normalized) ||
        normalized.startsWith('/images/') ||
        normalized.startsWith('data:')
    ) {
        return normalized;
    }

    // Try in-memory cache first (synchronous)
    if (_resolveCache.has(normalized)) return _resolveCache.get(normalized);

    const built = buildMediaUrl(normalized);
    try {
        _resolveCache.set(normalized, built);
        setTimeout(() => _resolveCache.delete(normalized), _RESOLVE_CACHE_TTL_MS).unref();
    } catch (e) {
        /* ignore */
    }

    return built;
};

const normalizeMediaArray = (values) => {
    if (!Array.isArray(values)) {
        return [];
    }

    return values
        .map((value) => normalizeStoredMediaValue(value))
        .filter(Boolean);
};

const defaultExport = { MEDIA_PUBLIC_BASE_URL, normalizeStoredMediaValue, resolveMediaUrl, normalizeMediaArray };

export { MEDIA_PUBLIC_BASE_URL, normalizeStoredMediaValue, resolveMediaUrl, normalizeMediaArray };
export default defaultExport;
