const defaultApiPath = '/api/media/upload';

export function createMediaPipelineUploader({
    apiBaseUrl,
    accessToken,
    fetchImpl = fetch,
}) {
    if (!apiBaseUrl) throw new TypeError('apiBaseUrl is required');
    if (!accessToken)
        throw new TypeError(
            'accessToken is required for the authenticated media route'
        );
    return async function uploadMedia({
        ownerId,
        bytes,
        contentType = 'image/png',
        kind = 'asset',
    }) {
        const url = new URL(defaultApiPath, apiBaseUrl);
        url.searchParams.set('ownerType', 'user');
        url.searchParams.set('ownerId', String(ownerId));
        url.searchParams.set('kind', kind);
        const response = await fetchImpl(url, {
            method: 'PUT',
            headers: {
                Cookie: `_token=${encodeURIComponent(accessToken)}`,
                'Content-Type': contentType,
            },
            body: bytes,
        });
        const body = await response.json();
        if (!response.ok || body.errors?.length || !body.data?.objectKey) {
            throw new Error(
                body.errors?.[0] ||
                    `Media pipeline upload failed (${response.status})`
            );
        }
        return body.data;
    };
}

export async function uploadAndAttachExperienceMedia({
    upload,
    experience,
    ownerId,
    bytes,
    contentType,
}) {
    if (typeof upload !== 'function')
        throw new TypeError('upload adapter is required');
    if (!experience || typeof experience.update !== 'function') {
        throw new TypeError(
            'experience must be a persisted Experience model instance'
        );
    }
    const uploaded = await upload({
        ownerId,
        bytes,
        contentType,
        kind: 'asset',
    });
    const currentImages = Array.isArray(experience.images)
        ? experience.images
        : [];
    const mediaRecord = {
        objectKey: uploaded.objectKey,
        url: uploaded.url,
        contentType: uploaded.contentType || contentType,
        size: uploaded.size ?? bytes.length,
    };
    const images = [...currentImages, mediaRecord.objectKey];
    await experience.update({ images });
    experience.images = images;
    return mediaRecord;
}
