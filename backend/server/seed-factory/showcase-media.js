import { createHash } from 'node:crypto';
import { readFile, readdir } from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { uploadMediaObject } from '../services/media-upload.js';

const modulePath = import.meta.url.startsWith('file:')
    ? fileURLToPath(import.meta.url) : import.meta.url;
const defaultAssetsRoot = path.resolve(path.dirname(modulePath), '../../../frontend/public');
const imageContentTypes = { '.jpg': 'image/jpeg', '.jpeg': 'image/jpeg', '.png': 'image/png' };

export async function prepareShowcaseMedia({
    ownerId,
    ownerIds = {},
    keySuffix = '',
    beforeUpload,
    assetsRoot = process.env.SHOWCASE_MEDIA_ASSETS_DIR || defaultAssetsRoot,
    fetchImpl = fetch,
} = {}) {
    if (keySuffix && !/^[a-zA-Z0-9-]{1,48}$/.test(keySuffix)) {
        throw new TypeError('Showcase media keySuffix must be a short alphanumeric token');
    }
    if (beforeUpload !== undefined && typeof beforeUpload !== 'function') {
        throw new TypeError('Showcase media beforeUpload must be a function');
    }
    const owners = {
        eventImages: ownerIds.event ?? ownerId,
        foodImages: ownerIds.food ?? ownerId,
        defaultImages: ownerIds.default ?? ownerId,
        heroVideo: ownerIds.food ?? ownerId,
        heroPoster: ownerIds.food ?? ownerId,
    };
    if (Object.values(owners).some((id) => !Number.isSafeInteger(id) || id <= 0)) {
        throw new TypeError('prepareShowcaseMedia requires a registered user ownerId (positive integer)');
    }
    const assets = [];
    try {
        for (const [group, directory] of [
            ['eventImages', 'mixology'],
            ['foodImages', 'taco-tour'],
            ['defaultImages', 'sightseeing'],
        ]) {
            const folder = path.join('images', 'events', directory);
            const files = (await readdir(path.join(assetsRoot, folder)))
                .filter((name) => imageContentTypes[path.extname(name).toLowerCase()])
                .sort();
            if (!files.length) throw new Error(`No image fixtures in ${folder}`);
            for (const file of files) {
                assets.push({
                    group,
                    relativePath: path.join(folder, file),
                    contentType: imageContentTypes[path.extname(file).toLowerCase()],
                });
            }
        }
        assets.push(
            { group: 'heroVideo', relativePath: 'video/tacos-hero.mp4', contentType: 'video/mp4' },
            { group: 'heroPoster', relativePath: 'video/tacos-hero-poster.jpg', contentType: 'image/jpeg' }
        );
        // Validate every fixture before performing any storage writes.
        for (const asset of assets) {
            asset.bytes = await readFile(path.join(assetsRoot, asset.relativePath));
            if (!asset.bytes.length) throw new Error(`Empty fixture: ${asset.relativePath}`);
        }
    } catch (error) {
        throw new Error(
            `Showcase media assets unavailable at "${assetsRoot}": ${error.message}. ` +
            'Set SHOWCASE_MEDIA_ASSETS_DIR to a complete frontend/public directory ' +
            '(Docker development mounts it read-only at /demo-assets).',
            { cause: error }
        );
    }
    const media = { eventImages: [], foodImages: [], defaultImages: [], heroVideo: null, heroPoster: null };
    for (const asset of assets) {
        const digest = createHash('sha256')
            .update(asset.relativePath.split(path.sep).join('/'))
            .update(asset.bytes)
            .digest('hex');
        const extension = path.extname(asset.relativePath).toLowerCase();
        const objectKey = `users/${owners[asset.group]}/asset/showcase-${digest}${keySuffix ? `-${keySuffix}` : ''}${extension}`;
        try {
            if (beforeUpload) await beforeUpload({ objectKey, ...asset });
            await uploadMediaObject({
                objectKey,
                bytes: asset.bytes,
                contentType: asset.contentType,
                fetchImpl,
            });
        } catch (error) {
            throw new Error(
                `Showcase media upload failed for "${asset.relativePath}": ${error.message}. ` +
                'Check R2_WORKER_BASE_URL, R2_DEV_TOKEN, and R2 worker availability.',
                { cause: error }
            );
        }
        if (Array.isArray(media[asset.group])) media[asset.group].push(objectKey);
        else media[asset.group] = objectKey;
    }
    return media;
}
