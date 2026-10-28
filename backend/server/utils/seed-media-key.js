const extensions = {
    'image/jpeg': 'jpg', 'image/png': 'png', 'image/webp': 'webp',
    'image/gif': 'gif', 'image/avif': 'avif', 'video/mp4': 'mp4',
};

export function seedMediaKey({ uploadId, ownerId, kind = 'asset', contentType }) {
    if (!/^[a-f0-9]{32}$/.test(uploadId) || !Number.isSafeInteger(Number(ownerId)) || Number(ownerId) < 1 ||
        kind !== 'asset' || !extensions[contentType]) {
        throw new Error('Invalid seed media upload identity');
    }
    return `users/${Number(ownerId)}/asset/seed-${uploadId}.${extensions[contentType]}`;
}
