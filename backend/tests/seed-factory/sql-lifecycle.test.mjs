import { after, test } from 'node:test';
import assert from 'node:assert/strict';
import db from '../../server/models/index.js';
import { createSequelizeSeedStore } from '../../server/seed-factory/store.js';
import { generateSeedGraph, materializeSeedGraph, cleanupSeedGraph } from '../../server/seed-factory/index.js';
import { generateScenario } from '../../server/seed-factory/scenarios.js';
import redis from '../../server/utils/ioredis-client.js';
import { resetSeedTestDatabase } from '../../server/seed-factory/test-database.js';
import { runSeedScenario, drainSeedMedia } from '../../server/seed-factory/runner.js';
import express from 'express';
import cookieParser from 'cookie-parser';
import { mkdtemp, writeFile, rm } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import path from 'node:path';
import mediaRouter from '../../server/routes/media.js';
import { generateNewToken } from '../../server/utils/auth-helpers.js';
import { createRequire } from 'node:module';
const require = createRequire(import.meta.url);

if (process.env.NODE_ENV !== 'test' || !/^seed_factory_test_[a-z0-9_]+$/.test(db.sequelize.config.database || '')) {
    throw new Error('SQL lifecycle tests require an isolated seed_factory_test_* database and NODE_ENV=test');
}
db.sequelize.options.logging = false;
after(async () => {
    await db.sequelize.close();
    redis.disconnect();
});
const store = createSequelizeSeedStore(db);

test('real MySQL graph lifecycle, rollback, safety and concurrent serialization', async (t) => {
    await resetSeedTestDatabase(db, { ...process.env, SEED_TEST_RESET: 'true' });
    await store.initialize();
    const graph = generateSeedGraph({ seed: 'sql-lifecycle', counts: { experiences: 1, orders: 1 } });
    let first;
    await t.test('fresh graph resolves IDs and persists a durable manifest', async () => {
        first = await materializeSeedGraph(graph, store);
        assert.equal(first.records.length, graph.records.length);
        assert.equal(await db.Order.count(), 1);
        assert.equal((await db.Order.findOne()).orderNumber, graph.records.find(({ model }) => model === 'Order').attributes.orderNumber);
        assert.equal(await db.ScheduledExperience.count(), 2);
    });
    await t.test('skip survives store recreation and concurrent calls do not duplicate records', async () => {
        const other = createSequelizeSeedStore(db);
        const results = await Promise.all([materializeSeedGraph(graph, other), materializeSeedGraph(graph, store)]);
        assert.ok(results.every(({ skipped }) => skipped));
        assert.equal(await db.Organization.count(), 1);
    });
    await t.test('concurrent first writers create only one complete graph', async () => {
        const concurrent = generateSeedGraph({ seed: 'sql-concurrent', counts: { experiences: 0, orders: 0 } });
        const results = await Promise.all([materializeSeedGraph(concurrent, store), materializeSeedGraph(concurrent, store)]);
        assert.equal(results.filter(({ skipped }) => !skipped).length, 1);
        await cleanupSeedGraph(concurrent.seedKey, store);
    });
    await t.test('failure halfway through replacement restores original IDs and manifest', async () => {
        const broken = structuredClone(graph);
        broken.records.find(({ model }) => model === 'Experience').attributes.capacity = null;
        await assert.rejects(materializeSeedGraph(broken, store, { mode: 'replace' }));
        assert.equal((await db.Organization.findOne()).id, first.records[0].id);
        const { skipped, ...manifest } = first;
        assert.equal(skipped, false);
        assert.deepEqual((await store.Run.findByPk(graph.seedKey)).manifest, JSON.parse(JSON.stringify(manifest)));
    });
    await t.test('modified owned rows stop cleanup without deleting anything', async () => {
        const experience = await db.Experience.findOne();
        const title = experience.title;
        await experience.update({ title: 'User edited title' }, { hooks: false, silent: true });
        await assert.rejects(cleanupSeedGraph(graph.seedKey, store), /changed or is missing/);
        assert.equal(await db.Organization.count(), 1);
        await experience.update({ title }, { hooks: false, silent: true });
    });
    await t.test('external FK and polymorphic references stop cleanup', async () => {
        const experience = await db.Experience.findOne();
        const user = await db.User.findOne();
        const comment = await db.Comment.create({
            CommentableId: experience.id, CommentableType: 'Experience', UserId: user.id,
            comment: 'User-owned feedback must never be deleted by a seed cleanup.', images: [],
        });
        await assert.rejects(cleanupSeedGraph(graph.seedKey, store), /External reference/);
        await comment.destroy();
        const cart = await db.Cart.create({ CustomerId: user.id });
        await assert.rejects(cleanupSeedGraph(graph.seedKey, store), /External reference/);
        await cart.destroy();
    });
    await t.test('replace then cleanup delete only exact owned rows', async () => {
        const unrelated = await db.User.create({ username: 'unrelated', email: 'unrelated@example.invalid' });
        const replaced = await materializeSeedGraph(graph, store, { mode: 'replace' });
        assert.notEqual(replaced.records[0].id, first.records[0].id);
        assert.equal(await db.User.count(), 4);
        await cleanupSeedGraph(graph.seedKey, store);
        assert.equal(await db.User.count(), 1);
        assert.equal((await db.User.findOne()).id, unrelated.id);
        await assert.rejects(cleanupSeedGraph(graph.seedKey, store), /Unknown seed manifest/);
        await unrelated.destroy();
    });
    await t.test('demo and startup preserve branding, memberships, organizers and explicit schedule sources', async () => {
        const common = { clock: '2026-10-27', passwordHash: '$2b$10$mrRYiTpW5hXrqqd0Pds9Wu7YtfBpN7ZukE.AkuZscpKqX5BBuEu.a' };
        const startup = generateScenario({ ...common, scenario: 'startup', adminEmail: 'admin@example.invalid' });
        const demo = generateScenario({ ...common, scenario: 'demo' });
        await materializeSeedGraph(startup, store);
        await materializeSeedGraph(demo, store);
        assert.equal(await db.Organization.count(), 4);
        assert.equal(await db.User.count(), 26);
        assert.equal(await db.Organizer.count(), 23);
        assert.equal(await db.TicketTier.count(), 16);
        assert.equal(await db.Comment.count(), 602);
        assert.equal(await db.sequelize.models.ExperienceOrganizers.count(), 8);
        const org = await db.Organization.findOne({ where: { slug: 'testcompany1' } });
        assert.equal((await db.Location.findByPk(org.LocationId)).OrganizationId, org.id);
        await cleanupSeedGraph(demo.seedKey, store);
        await cleanupSeedGraph(startup.seedKey, store);
        assert.equal(await db.Organization.count(), 0);
    });
    await t.test('legacy Sequelize CLI entry points use the factory and exit cleanly', async () => {
        const startup = require('../../server/seeders/20260212222654-startup-org-and-admin.js');
        const demo = require('../../server/seeders/20260214193720-demo-experiences.js');
        await startup.up(db.sequelize.getQueryInterface());
        await demo.up(db.sequelize.getQueryInterface());
        await demo.up(db.sequelize.getQueryInterface());
        assert.equal(await db.User.count(), 26);
        assert.equal(await db.Organization.count(), 4);
        assert.equal(await db.Experience.count(), 4);
        const showcase = generateScenario({
            scenario: 'showcase', clock: '2026-10-28',
            passwordHash: '$2b$10$mrRYiTpW5hXrqqd0Pds9Wu7YtfBpN7ZukE.AkuZscpKqX5BBuEu.a',
        });
        const showcaseSeeder = require('../../server/seeders/20261028020000-showcase-experience-details.js');
        await showcaseSeeder.up(db.sequelize.getQueryInterface());
        await showcaseSeeder.up(db.sequelize.getQueryInterface());
        assert.equal(await db.Organization.count(), 7);
        assert.equal(await db.Experience.count(), 8);
        assert.equal(await db.ExperienceReservation.count(), 6);
        const showcaseManifest = (await store.Run.findByPk(showcase.seedKey)).manifest;
        assert.equal(showcaseManifest.media.length, 16);
        const foodOrganization = await db.Organization.findOne({ where: { slug: 'food-tours' } });
        const food = await db.Experience.findOne({
            where: { title: 'Old Town Taco Tour', OrganizationId: foodOrganization.id },
        });
        assert.ok(food.detailsMetadata, 'Showcase metadata is persisted on the food-tour experience');
        assert.equal(food.detailsMetadata.template, 'food-tour');
        assert.deepEqual(food.detailsMetadata.overrides.pinnedCommentIds, (await db.Comment.findAll({
            where: { CommentableType: 'Experience', CommentableId: food.id },
            attributes: ['id'], order: [['id', 'ASC']],
        })).map(({ id }) => id));
        assert.equal(food.detailsMetadata.overrides.heroVideoKey, showcaseManifest.media.find((key) => key.endsWith('.mp4')));
        assert.ok(showcaseManifest.media.includes(food.detailsMetadata.overrides.heroPosterKey));
        assert.ok(food.detailsMetadata.overrides.heroPosterKey.endsWith('.jpg'));
        assert.equal(food.detailsMetadata.overrides.copy.heroEyebrow, 'A taste of old town Vallarta');
        await showcaseSeeder.down(db.sequelize.getQueryInterface());
        assert.equal(await db.Experience.count(), 4);
        assert.equal(await store.Run.findByPk(showcase.seedKey), null);
        await demo.down(db.sequelize.getQueryInterface());
        await startup.down(db.sequelize.getQueryInterface());
        assert.equal(await db.User.count(), 0);
    });
    await t.test('real authenticated image/video uploads, rollback journal and retryable object cleanup', async (t) => {
        assert.ok(process.env.SEED_TEST_VIDEO_FILE, 'Mount the local hero MP4 and set SEED_TEST_VIDEO_FILE');
        const owner = await db.User.create({ username: 'media-owner', email: 'media-owner@example.invalid' });
        const app = express();
        app.use(cookieParser());
        app.use('/api/media', mediaRouter);
        const server = app.listen(0, '127.0.0.1');
        await new Promise((resolve) => server.once('listening', resolve));
        const directory = await mkdtemp(path.join(tmpdir(), 'pv-seed-media-'));
        const file = path.join(directory, 'fixture.png');
        await writeFile(file, Buffer.from('iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mP8/x8AAwMCAO+a0u8AAAAASUVORK5CYII=', 'base64'));
        const env = {
            ...process.env, SEED_MEDIA_API_URL: `http://127.0.0.1:${server.address().port}`,
            SEED_MEDIA_ACCESS_TOKEN: generateNewToken(owner), SEED_DEMO_PASSWORD: 'isolated-test-password',
        };
        const media = [
            { recordKey: 'experience-0', ownerId: owner.id, file, contentType: 'image/png' },
            { recordKey: 'experience-3', ownerId: owner.id, file: process.env.SEED_TEST_VIDEO_FILE, contentType: 'video/mp4' },
        ];
        const storageGet = async (key) => {
            const response = await fetch(`${env.R2_WORKER_BASE_URL}/objects/${key}`, { headers: { 'X-R2-Dev-Token': env.R2_DEV_TOKEN } });
            const bytes = await response.arrayBuffer();
            return { status: response.status, arrayBuffer: async () => bytes };
        };
        try {
            await t.test('upload bytes through the real route, persist keys, protect external references and clean storage', async () => {
                const result = await runSeedScenario(db, { scenario: 'demo', seed: 'sql-media-demo', env, media });
                const manifest = (await store.Run.findByPk(result.seedKey)).manifest;
                assert.equal(manifest.media.length, 2);
                for (const key of manifest.media) {
                    const response = await storageGet(key);
                    assert.equal(response.status, 200);
                    assert.ok((await response.arrayBuffer()).byteLength > 0);
                }
                assert.ok((await db.Experience.findOne({ where: { title: 'Old Town Taco Tour' } })).images.includes(manifest.media[1]));
                const external = await db.User.create({ username: 'external-media', email: 'external-media@example.invalid', profilePicture: manifest.media[0] });
                await assert.rejects(runSeedScenario(db, { scenario: 'demo', seed: 'sql-media-demo', action: 'cleanup', env }), /External media reference/);
                await external.destroy();
                await runSeedScenario(db, { scenario: 'demo', seed: 'sql-media-demo', action: 'cleanup', env });
                for (const key of manifest.media) assert.equal((await storageGet(key)).status, 404);
                assert.equal(await db.Experience.count(), 0);
            });
            await t.test('lost upload response rolls back SQL and removes every pre-journaled object', async () => {
                const assetCountBefore = await store.Asset.count();
                let uploads = 0;
                const transport = async (url, options) => {
                    const response = await fetch(url, options);
                    if (options.method === 'PUT' && ++uploads === 2) throw new Error('Simulated lost upload response');
                    return response;
                };
                await assert.rejects(runSeedScenario(db, { scenario: 'demo', seed: 'sql-media-failure', env, media, fetchImpl: transport }), /lost upload response/);
                assert.equal(await db.Experience.count(), 0);
                const assets = await store.Asset.findAll();
                assert.equal(assets.length, assetCountBefore + 2);
                for (const asset of assets) {
                    assert.equal(asset.state, 'delete');
                    assert.equal((await storageGet(asset.objectKey)).status, 404);
                }
            });
            await t.test('storage deletion failure remains explicit and can be retried', async () => {
                const transport = (url, options) => options.method === 'DELETE'
                    ? Promise.resolve({ ok: false, status: 503 }) : fetch(url, options);
                await assert.rejects(runSeedScenario(db, {
                    scenario: 'demo', seed: 'sql-media-retry', env,
                    media: [media[0], { ...media[1], file: path.join(directory, 'missing.mp4') }], fetchImpl: transport,
                }), /cleanup is pending/);
                assert.equal(await db.Experience.count(), 0);
                await drainSeedMedia(store, { env });
                for (const asset of await store.Asset.findAll()) assert.equal((await storageGet(asset.objectKey)).status, 404);
            });
            await t.test('production refuses deterministic seed upload keys', async () => {
                const previous = process.env.NODE_ENV;
                process.env.NODE_ENV = 'production';
                try {
                    const response = await fetch(`${env.SEED_MEDIA_API_URL}/api/media/upload?ownerType=user&ownerId=${owner.id}&kind=asset`, {
                        method: 'PUT', headers: { Cookie: `_token=${env.SEED_MEDIA_ACCESS_TOKEN}`, 'Content-Type': 'image/png', 'X-Seed-Upload-Id': 'a'.repeat(32) },
                        body: Buffer.from('image'),
                    });
                    assert.equal(response.status, 403);
                    await response.arrayBuffer();
                } finally { process.env.NODE_ENV = previous; }
            });
        } finally {
            server.closeAllConnections();
            await new Promise((resolve, reject) => server.close((error) => error ? reject(error) : resolve()));
            await rm(directory, { recursive: true });
            await owner.destroy();
        }
    });
});
