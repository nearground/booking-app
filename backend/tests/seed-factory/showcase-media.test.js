import { afterEach, beforeEach, describe, expect, jest, test } from '@jest/globals';
import { prepareShowcaseMedia } from '../../server/seed-factory/showcase-media.js';

describe('showcase media materialization', () => {
    let originalEnv;

    beforeEach(() => {
        originalEnv = { ...process.env };
        process.env.R2_DEV_TOKEN = 'fixture-worker-token';
        process.env.R2_WORKER_BASE_URL = 'http://worker.example/';
        delete process.env.SHOWCASE_MEDIA_ASSETS_DIR;
    });

    afterEach(() => {
        process.env = originalEnv;
    });

    test('uploads all real fixtures using shared storage PUTs and stable owner-scoped keys', async () => {
        const fetchImpl = jest.fn().mockResolvedValue({ ok: true });
        const first = await prepareShowcaseMedia({ ownerId: 42, fetchImpl });
        expect(first.partyImages).toHaveLength(3);
        expect(first.foodImages).toHaveLength(3);
        expect(first.defaultImages).toHaveLength(8);
        expect(first.heroVideo).toMatch(/^users\/42\/asset\/showcase-[a-f0-9]{64}\.mp4$/);
        expect(first.heroPoster).toMatch(/\.jpg$/);
        const keys = [...first.partyImages, ...first.foodImages, ...first.defaultImages,
            first.heroVideo, first.heroPoster];
        expect(fetchImpl).toHaveBeenCalledTimes(keys.length);
        for (const [index, [url, options]] of fetchImpl.mock.calls.entries()) {
            expect(url).toBe(`http://worker.example/objects/${keys[index]}`);
            expect(options.method).toBe('PUT');
            expect(options.headers['X-R2-Dev-Token']).toBe('fixture-worker-token');
            expect(Buffer.isBuffer(options.body)).toBe(true);
            expect(options.body.length).toBeGreaterThan(0);
            expect(options.headers['Content-Type']).toBe(
                keys[index].endsWith('.mp4') ? 'video/mp4'
                    : keys[index].endsWith('.png') ? 'image/png' : 'image/jpeg'
            );
        }
        expect(await prepareShowcaseMedia({ ownerId: 42, fetchImpl })).toEqual(first);
        const otherOwner = await prepareShowcaseMedia({ ownerId: 43, fetchImpl });
        expect(otherOwner.heroVideo).toBe(first.heroVideo.replace('users/42/', 'users/43/'));
    });

    test.each([undefined, 0, -1, 1.1, '42'])('rejects invalid owner %p before uploading', async (ownerId) => {
        const fetchImpl = jest.fn();
        await expect(prepareShowcaseMedia({ ownerId, fetchImpl })).rejects.toThrow('registered user ownerId');
        expect(fetchImpl).not.toHaveBeenCalled();
    });

    test('supports organization-specific member owners and food-owned hero assets', async () => {
        const fetchImpl = jest.fn().mockResolvedValue({ ok: true });
        const media = await prepareShowcaseMedia({
            ownerId: 42,
            ownerIds: { party: 51, food: 52, default: 53 },
            fetchImpl,
        });
        expect(media.partyImages.every((key) => key.startsWith('users/51/asset/'))).toBe(true);
        expect(media.foodImages.every((key) => key.startsWith('users/52/asset/'))).toBe(true);
        expect(media.defaultImages.every((key) => key.startsWith('users/53/asset/'))).toBe(true);
        expect(media.heroVideo).toMatch(/^users\/52\/asset\/[a-zA-Z0-9-]+\.mp4$/);
        expect(media.heroPoster).toMatch(/^users\/52\/asset\/[a-zA-Z0-9-]+\.jpg$/);
    });

    test('allows all ownerIds without a fallback ownerId and falls back for partial mappings', async () => {
        const fetchImpl = jest.fn().mockResolvedValue({ ok: true });
        const complete = await prepareShowcaseMedia({
            ownerIds: { party: 51, food: 52, default: 53 }, fetchImpl,
        });
        expect(complete.heroVideo).toMatch(/^users\/52\//);
        const partial = await prepareShowcaseMedia({
            ownerId: 42, ownerIds: { food: 52 }, fetchImpl,
        });
        expect(partial.partyImages[0]).toMatch(/^users\/42\//);
        expect(partial.defaultImages[0]).toMatch(/^users\/42\//);
        expect(partial.heroPoster).toMatch(/^users\/52\//);
    });

    test('validates every supplied owner before uploading', async () => {
        const fetchImpl = jest.fn();
        await expect(prepareShowcaseMedia({
            ownerId: 42, ownerIds: { food: -1 }, fetchImpl,
        })).rejects.toThrow('registered user ownerId');
        expect(fetchImpl).not.toHaveBeenCalled();
    });

    test('fails with actionable asset configuration instead of inventing object keys', async () => {
        const fetchImpl = jest.fn();
        process.env.SHOWCASE_MEDIA_ASSETS_DIR = '/missing-showcase-assets';
        await expect(prepareShowcaseMedia({ ownerId: 42, fetchImpl }))
            .rejects.toThrow('Set SHOWCASE_MEDIA_ASSETS_DIR');
        expect(fetchImpl).not.toHaveBeenCalled();
    });

    test('fails clearly when the worker token is missing', async () => {
        delete process.env.R2_DEV_TOKEN;
        const fetchImpl = jest.fn();
        await expect(prepareShowcaseMedia({ ownerId: 42, fetchImpl }))
            .rejects.toThrow('R2_DEV_TOKEN is required');
        expect(fetchImpl).not.toHaveBeenCalled();
    });

    test.each([
        { ok: false, status: 403, json: async () => ({ error: 'Forbidden' }) },
        { ok: false, status: 503, json: async () => { throw new Error('not JSON'); } },
    ])('fails without returning keys on a worker rejection ($status)', async (response) => {
        const fetchImpl = jest.fn().mockResolvedValue(response);
        await expect(prepareShowcaseMedia({ ownerId: 42, fetchImpl }))
            .rejects.toThrow('Check R2_WORKER_BASE_URL, R2_DEV_TOKEN');
        expect(fetchImpl).toHaveBeenCalledTimes(1);
    });

    test('explains connection failures', async () => {
        const fetchImpl = jest.fn().mockRejectedValue(new Error('connection refused'));
        await expect(prepareShowcaseMedia({ ownerId: 42, fetchImpl }))
            .rejects.toThrow('connection refused');
    });
});
