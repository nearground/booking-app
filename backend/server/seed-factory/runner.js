import { readFile } from 'node:fs/promises';
import { randomBytes } from 'node:crypto';
import { buildScenario, scenarioSeedKey } from './scenarios.js';
import { materializeSeedGraph, cleanupSeedGraph } from './index.js';
import { createSequelizeSeedStore } from './store.js';
import { createMediaPipelineUploader } from './media.js';
import { prepareShowcaseMedia } from './showcase-media.js';
import { seedMediaKey } from '../utils/seed-media-key.js';

export async function drainSeedMedia(store, { env = process.env, fetchImpl = fetch } = {}) {
    const jobs = await store.Asset.findAll({ where: { state: 'delete' } });
    if (!jobs.length) return 0;
    if (!env.R2_WORKER_BASE_URL || !env.R2_DEV_TOKEN) throw new Error('Pending seed media cleanup requires storage URL/token');
    let deleted = 0;
    for (const job of jobs) {
        await store.transaction(async (transaction) => {
            await store.assertAssetsUnreferenced([job.objectKey], transaction);
            const path = job.objectKey.split('/').map(encodeURIComponent).join('/');
            const response = await fetchImpl(`${env.R2_WORKER_BASE_URL.replace(/\/+$/, '')}/objects/${path}`, {
                method: 'DELETE', headers: { 'X-R2-Dev-Token': env.R2_DEV_TOKEN },
                signal: AbortSignal.timeout(15000),
            });
            if (!response.ok && response.status !== 404) throw new Error(`Seed media cleanup failed (${response.status}); retry media-cleanup`);
            await response.arrayBuffer();
        });
        // Keep tombstones so a delayed upload can be reconciled by a later sweep.
        deleted += 1;
    }
    return deleted;
}

export async function runSeedScenario(db, {
    scenario, action = 'apply', mode = 'skip', seed,
    clock = new Date().toISOString().slice(0, 10),
    env = process.env, media = [], fetchImpl = fetch, onCleanupPlan,
} = {}) {
    const store = createSequelizeSeedStore(db, { env, onCleanupPlan });
    await store.initialize();
    if (action === 'init') {
        const tables = await db.sequelize.getQueryInterface().showAllTables();
        if (tables.some((table) => !['SeedRuns', 'SeedAssets'].includes(table))) {
            throw new Error('Schema initialization requires an empty application database');
        }
        await db.sequelize.sync();
        return { initialized: db.sequelize.config.database };
    }
    if (action === 'media-cleanup') {
        await store.transaction(async (transaction) => {
            // Owning the seed lock means no live materialization can still be uploading.
            await store.Asset.update({ state: 'delete' }, { where: { state: 'staged' }, transaction });
        });
        return { deletedAssets: await drainSeedMedia(store, { env, fetchImpl }) };
    }
    if (!['apply', 'preview', 'cleanup', 'cleanup-preview'].includes(action)) throw new Error(`Unknown seed action: ${action}`);
    const seedKey = scenarioSeedKey(scenario, seed);
    if (action === 'cleanup-preview') {
        return store.transaction(async (transaction) => {
            const manifest = await store.inspectCleanup(seedKey, transaction);
            return { seedKey, records: manifest.records.map(({ model, where }) => ({ model, where })), media: manifest.media || [] };
        });
    }
    if (action === 'cleanup') {
        await cleanupSeedGraph(seedKey, store);
        await drainSeedMedia(store, { env, fetchImpl });
        return { seedKey, cleaned: true };
    }
    const graph = await buildScenario({ scenario, clock, seed, env });
    const counts = graph.records.reduce((result, record) => {
        result[record.model] = (result[record.model] || 0) + 1;
        return result;
    }, {});
    if (action === 'preview') return { scenario, seedKey, clock: graph.generatedAt, counts };
    const stagedKeys = [];
    let committed = false;
    try {
        const result = await materializeSeedGraph(graph, store, {
            mode,
            prepare: async (persisted, transaction) => {
                const assets = [];
                if (scenario === 'showcase') {
                    if (!env.R2_WORKER_BASE_URL || !env.R2_DEV_TOKEN) throw new Error('Showcase media seeding requires storage cleanup configuration');
                    const ownerIds = {
                        party: persisted.get('showcase-user-party').id,
                        food: persisted.get('showcase-user-food').id,
                        default: persisted.get('showcase-user-default').id,
                    };
                    const showcaseMedia = await prepareShowcaseMedia({
                        ownerIds,
                        keySuffix: randomBytes(8).toString('hex'),
                        fetchImpl,
                        beforeUpload: async ({ objectKey }) => {
                            await store.Asset.create({ seedKey: graph.seedKey, objectKey, state: 'staged' });
                            stagedKeys.push(objectKey);
                        },
                    });
                    assets.push(
                        ...showcaseMedia.partyImages,
                        ...showcaseMedia.foodImages,
                        ...showcaseMedia.defaultImages,
                        showcaseMedia.heroVideo,
                        showcaseMedia.heroPoster,
                    );
                    const updates = [
                        ['showcase-experience-party-0', showcaseMedia.partyImages, {}],
                        ['showcase-experience-party-1', showcaseMedia.partyImages, {}],
                        ['showcase-experience-food', showcaseMedia.foodImages, {
                            heroVideoKey: showcaseMedia.heroVideo,
                            heroPosterKey: showcaseMedia.heroPoster,
                            pinnedCommentIds: [0, 1, 2].map((index) => persisted.get(`showcase-review-2-${index}`).id),
                        }],
                        ['showcase-experience-default', showcaseMedia.defaultImages, {}],
                    ];
                    for (const [recordKey, images, overrides] of updates) {
                        const record = persisted.get(recordKey);
                        const detailsMetadata = graph.records.find(({ key }) => key === recordKey).attributes.detailsMetadata;
                        await store.update(record, {
                            images,
                            thumbnail: images[0],
                            detailsMetadata: {
                                ...detailsMetadata,
                                overrides: { ...detailsMetadata.overrides, ...overrides },
                            },
                        }, transaction);
                    }
                }
                if (!media.length) return assets;
                const upload = createMediaPipelineUploader({
                    apiBaseUrl: env.SEED_MEDIA_API_URL,
                    accessToken: env.SEED_MEDIA_ACCESS_TOKEN, fetchImpl,
                });
                if (!env.R2_WORKER_BASE_URL || !env.R2_DEV_TOKEN) throw new Error('Media seeding requires storage cleanup configuration');
                for (const item of media) {
                    const record = persisted.get(item.recordKey);
                    if (!record || record.model !== 'Experience') throw new Error(`Media target must be an owned Experience: ${item.recordKey}`);
                    const bytes = await readFile(item.file);
                    if (!bytes.length || bytes.length > 6 * 1024 * 1024) throw new Error('Seed media must contain 1 byte to 6 MiB');
                    const uploadId = randomBytes(16).toString('hex');
                    const objectKey = seedMediaKey({ uploadId, ownerId: item.ownerId, contentType: item.contentType });
                    // Journal the known key before transport, including timeout/crash cases.
                    await store.Asset.create({ seedKey: graph.seedKey, objectKey, state: 'staged' });
                    stagedKeys.push(objectKey);
                    const uploaded = await upload({ ownerId: item.ownerId, bytes, contentType: item.contentType, uploadId });
                    if (uploaded.objectKey !== objectKey) throw new Error('Media API returned an unexpected seed object key');
                    const experience = await db.Experience.findOne({ where: record.where, transaction });
                    await store.update(record, { images: [...(experience.images || []), uploaded.objectKey] }, transaction);
                    assets.push(uploaded.objectKey);
                }
                return assets;
            },
        });
        committed = true;
        await drainSeedMedia(store, { env, fetchImpl });
        return { seedKey: result.seedKey, skipped: result.skipped, clock: result.generatedAt, counts };
    } catch (error) {
        if (committed) throw new Error('Seed database changes committed; media cleanup is pending. Run media-cleanup.', { cause: error });
        if (stagedKeys.length) {
            await store.Asset.update({ state: 'delete' }, { where: { objectKey: stagedKeys, state: 'staged' } });
            try {
                await drainSeedMedia(store, { env, fetchImpl });
            } catch (cleanupError) {
                throw new AggregateError([error, cleanupError], 'Seeding failed; media cleanup is pending. Run media-cleanup after fixing storage access.');
            }
        }
        throw error;
    }
}
