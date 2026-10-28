export const CONTENT_TYPE_TO_EXTENSION = {
    'image/jpeg': 'jpg',
    'image/png': 'png',
    'image/webp': 'webp',
    'image/gif': 'gif',
    'image/avif': 'avif',
    'video/mp4': 'mp4',
};

export const getStorageBaseUrl = () =>
    String(process.env.R2_WORKER_BASE_URL || 'http://host.docker.internal:8787')
        .replace(/\/+$/, '');

export const getStorageHeaders = () => {
    const token = String(process.env.R2_DEV_TOKEN || '').trim();
    return token ? { 'X-R2-Dev-Token': token } : null;
};

export const buildEncodedObjectKey = (objectKey) =>
    objectKey.split('/').map(encodeURIComponent).join('/');

export class StorageUploadError extends Error {
    constructor(message, { status = 500, data = {}, code } = {}) {
        super(message);
        this.name = 'StorageUploadError';
        this.status = status;
        this.data = data;
        this.code = code;
    }
}

// Shared storage transport; HTTP callers remain responsible for authorization.
export async function uploadMediaObject({
    objectKey,
    bytes,
    contentType,
    fetchImpl = fetch,
}) {
    if (
        !/^users\/[1-9]\d*\/[a-z0-9-]+\/[a-zA-Z0-9._/-]+$/.test(objectKey) ||
        objectKey.includes('..') ||
        objectKey.length > 512
    ) {
        throw new TypeError('Invalid upload object key');
    }
    if (!CONTENT_TYPE_TO_EXTENSION[contentType]) {
        throw new TypeError('Unsupported media content type');
    }
    if (!Buffer.isBuffer(bytes) || bytes.length === 0) {
        throw new TypeError('Upload body is required');
    }
    const headers = getStorageHeaders();
    if (!headers) {
        throw new StorageUploadError(
            'R2_DEV_TOKEN is required to upload media; configure it to match the R2 worker token',
            { code: 'STORAGE_NOT_CONFIGURED' }
        );
    }
    const response = await fetchImpl(
        `${getStorageBaseUrl()}/objects/${buildEncodedObjectKey(objectKey)}`,
        {
            method: 'PUT',
            headers: { ...headers, 'Content-Type': contentType },
            body: bytes,
        }
    );
    if (!response.ok) {
        let message = 'Failed to upload media to storage';
        try {
            const body = await response.json();
            if (body?.error) message = String(body.error);
            else if (body?.errors?.length) message = String(body.errors[0]);
        } catch (_error) {
            // The worker may return a non-JSON error.
        }
        throw new StorageUploadError(message, {
            status: Number.isInteger(response.status) && response.status >= 400
                ? response.status : 502,
            data: { upstreamStatus: response.status },
        });
    }
    return { objectKey, contentType, size: bytes.length };
}
