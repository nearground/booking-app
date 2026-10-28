import { createRequire } from 'node:module';
const require = createRequire(import.meta.url);

import { resolveMediaUrl } from '../utils/media-storage.js';
const crypto = require('crypto');
import { sendError } from '../utils/http-response.js';
import cache from '../utils/cache.js';
import {
    CONTENT_TYPE_TO_EXTENSION,
    buildEncodedObjectKey,
    getStorageBaseUrl,
    getStorageHeaders,
    StorageUploadError,
    uploadMediaObject,
} from '../services/media-upload.js';

const ALLOWED_KEY_PREFIXES = ['users/', 'orgs/', 'experiences/', 'hotels/'];
const ALLOWED_UPLOAD_OWNER_TYPES = new Set(['user']);
const ALLOWED_UPLOAD_KINDS = new Set([
    'asset',
    'profile',
    'experience-thumbnail',
    'experience-gallery',
    'organization-logo',
    'organization-cover',
    'review-image',
]);
const MEDIA_KIND_REGEX = /^[a-z0-9-]{1,40}$/;

const isValidObjectKey = (key) => {
    const normalizedKey = String(key || '').trim();

    if (!normalizedKey || normalizedKey.length > 512) {
        return false;
    }

    if (normalizedKey.includes('..') || normalizedKey.startsWith('/')) {
        return false;
    }

    if (!ALLOWED_KEY_PREFIXES.some((prefix) => normalizedKey.startsWith(prefix))) {
        return false;
    }

    return /^[a-zA-Z0-9._\-/]+$/.test(normalizedKey);
};

const uploadMedia = async (req, res) => {
    try {
        const { ownerType, ownerId, kind = 'asset' } = req.query;
        const normalizedOwnerType = String(ownerType || '').trim().toLowerCase();
        const normalizedKind = String(kind || '').trim().toLowerCase();
        const parsedOwnerId = Number(ownerId);

        if (!normalizedOwnerType || !Number.isInteger(parsedOwnerId) || parsedOwnerId <= 0) {
            return res.status(400).json({
                errors: ['ownerType and ownerId are required'],
                data: {},
            });
        }

        if (!ALLOWED_UPLOAD_OWNER_TYPES.has(normalizedOwnerType)) {
            return res.status(400).json({
                errors: ['Unsupported ownerType'],
                data: {
                    allowedOwnerTypes: Array.from(ALLOWED_UPLOAD_OWNER_TYPES),
                },
            });
        }

        if (
            !MEDIA_KIND_REGEX.test(normalizedKind) ||
            !ALLOWED_UPLOAD_KINDS.has(normalizedKind)
        ) {
            return res.status(400).json({
                errors: ['Unsupported media kind'],
                data: {
                    allowedKinds: Array.from(ALLOWED_UPLOAD_KINDS),
                },
            });
        }

        if (normalizedOwnerType === 'user' && parsedOwnerId !== req.user.id) {
            return res.status(403).json({
                errors: ['You can only upload assets for your own user account'],
                data: {},
            });
        }

        const contentType = String(req.headers['content-type'] || '')
            .split(';')[0]
            .trim()
            .toLowerCase();
        const extension = CONTENT_TYPE_TO_EXTENSION[contentType];

        if (!extension) {
            return res.status(415).json({
                errors: ['Unsupported media content type'],
                data: {
                    supportedTypes: Object.keys(CONTENT_TYPE_TO_EXTENSION),
                },
            });
        }

        if (!req.body || !Buffer.isBuffer(req.body) || req.body.length === 0) {
            return res.status(400).json({
                errors: ['Upload body is required'],
                data: {},
            });
        }

        const randomSuffix = crypto.randomBytes(3).toString('hex');
        const objectKey = `${normalizedOwnerType}s/${parsedOwnerId}/${normalizedKind}/${Date.now()}-${randomSuffix}.${extension}`;

        await uploadMediaObject({ objectKey, bytes: req.body, contentType });

        return res.status(201).json({
            errors: [],
            data: {
                objectKey,
                url: resolveMediaUrl(objectKey),
                contentType,
                size: req.body.length,
            },
        });
    } catch (_error) {
        if (_error instanceof StorageUploadError) {
            return sendError(res, {
                status: _error.status,
                message: _error.code === 'STORAGE_NOT_CONFIGURED'
                    ? 'Storage is temporarily unavailable' : _error.message,
                data: _error.data,
                requestId: req.requestId,
            });
        }
        return sendError(res, {
            status: 500,
            message: 'Error uploading media',
            requestId: req.requestId,
        });
    }
};

const getMediaObject = async (req, res) => {
    try {
        const objectKey = decodeURIComponent(req.params[0] || '');

        if (!isValidObjectKey(objectKey)) {
            return res.status(400).json({
                errors: ['Invalid media object key'],
                data: {},
            });
        }

        const storageHeaders = getStorageHeaders();
        if (!storageHeaders) {
            return sendError(res, {
                status: 500,
                message: 'Storage is temporarily unavailable',
                requestId: req.requestId,
            });
        }

        // quick negative cache: avoid hammering storage for non-existent objects
        const notFoundKey = `media:notfound:${objectKey}`;
        try {
            const nf = await cache.get(notFoundKey);
            if (nf) {
                return res.status(404).json({ errors: ['Media object not found'], data: {} });
            }
        } catch (e) {
            /* ignore cache errors */
        }

        const encodedObjectKey = buildEncodedObjectKey(objectKey);
        const readUrl = `${getStorageBaseUrl()}/objects/${encodedObjectKey}`;

        const r2Response = await fetch(readUrl, {
            method: 'GET',
            headers: storageHeaders,
        });

        if (r2Response.status === 404) {
            try { await cache.set(notFoundKey, true, 60); } catch (e) {
                /* ignore cache errors */
            }
            return res.status(404).json({
                errors: ['Media object not found'],
                data: {},
            });
        }

        if (!r2Response.ok) {
            return sendError(res, {
                status: 502,
                message: 'Failed to fetch media from storage',
                data: {
                    upstreamStatus: r2Response.status,
                },
                requestId: req.requestId,
            });
        }

        const contentType = r2Response.headers.get('content-type') || 'application/octet-stream';
        const etag = r2Response.headers.get('etag');
        const cacheControl = r2Response.headers.get('cache-control') || 'public, max-age=300';
        const arrayBuffer = await r2Response.arrayBuffer();

        if (etag) {
            res.setHeader('ETag', etag);
        }

        res.setHeader('Cache-Control', cacheControl);
        res.setHeader('Content-Type', contentType);
        return res.status(200).send(Buffer.from(arrayBuffer));
    } catch (_error) {
        return sendError(res, {
            status: 500,
            message: 'Error fetching media object',
            requestId: req.requestId,
        });
    }
};

const defaultExport = { uploadMedia, getMediaObject };

export { uploadMedia, getMediaObject };
export default defaultExport;
