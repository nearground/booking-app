import { describe, expect, jest, test } from '@jest/globals';
import {
    cleanupSeedGraph,
    generateSeedGraph,
    materializeSeedGraph,
    validateSeedGraph,
} from '../../server/seed-factory/index.js';
import {
    createMediaPipelineUploader,
    uploadAndAttachExperienceMedia,
} from '../../server/seed-factory/media.js';

const createMemoryStore = () => {
    const records = [];
    const seeds = new Map();
    let nextId = 1;
    return {
        records,
        seeds,
        transaction: (callback) => callback({}),
        findSeed: async (seedKey) => seeds.get(seedKey),
        deleteSeed: async (seedKey) => {
            const existing = seeds.get(seedKey);
            if (!existing) return false;
            const ids = new Set(existing.records.map((record) => record.id));
            for (let index = records.length - 1; index >= 0; index -= 1) {
                if (ids.has(records[index].id)) records.splice(index, 1);
            }
            seeds.delete(seedKey);
            return true;
        },
        insert: async (model, attributes, metadata) => {
            const row = { id: nextId++, model, attributes, ...metadata };
            records.push(row);
            return row;
        },
        saveSeed: async (seedKey, manifest) => seeds.set(seedKey, manifest),
    };
};

describe('correlated seed factory', () => {
    test('generates identical records for the same explicit seed', () => {
        expect(generateSeedGraph({ seed: 'repeatable-demo-seed' })).toEqual(
            generateSeedGraph({ seed: 'repeatable-demo-seed' })
        );
    });

    test('generates a graph with every schema reference resolving to the correct association type', () => {
        const graph = generateSeedGraph({ seed: 'association-check' });
        expect(validateSeedGraph(graph)).toBe(true);
        expect(graph.records.map(({ type }) => type)).toEqual(
            expect.arrayContaining([
                'organization',
                'members',
                'experiences',
                'schedules',
                'sessions',
                'ticketTiers',
                'orders',
                'comments',
            ])
        );
    });
    test('applies traits and per-run overrides to generated model attributes', () => {
        const graph = generateSeedGraph({
            seed: 'override-check',
            counts: {
                experiences: 1,
                sessionsPerExperience: 1,
                commentsPerExperience: 0,
            },
            traits: {
                experience: { capacity: 6, subtitle: 'Family friendly' },
            },
            overrides: {
                experience: { title: 'Pinned seed title', capacity: 8 },
            },
        });
        const experience = graph.records.find(
            ({ type }) => type === 'experiences'
        );
        expect(experience.attributes).toEqual(
            expect.objectContaining({
                title: 'Pinned seed title',
                subtitle: 'Family friendly',
                capacity: 8,
            })
        );
    });

    test('supports idempotent skip, replace, and targeted cleanup through the store contract', async () => {
        const graph = generateSeedGraph({
            seed: 'idempotency-check',
            counts: { experiences: 1 },
        });
        const store = createMemoryStore();
        const first = await materializeSeedGraph(graph, store);
        const skipped = await materializeSeedGraph(graph, store);
        expect(first.skipped).toBe(false);
        expect(skipped.skipped).toBe(true);
        expect(store.records).toHaveLength(graph.records.length);
        await materializeSeedGraph(graph, store, { mode: 'replace' });
        expect(store.records).toHaveLength(graph.records.length);
        await expect(cleanupSeedGraph(graph.seedKey, store)).resolves.toBe(
            true
        );
        expect(store.records).toHaveLength(0);
        await expect(cleanupSeedGraph(graph.seedKey, store)).resolves.toBe(
            false
        );
    });

    test('uploads through the media route adapter and stores a DB-backed Experience.images record', async () => {
        const fetchImpl = jest.fn().mockResolvedValue({
            ok: true,
            status: 201,
            json: async () => ({
                errors: [],
                data: {
                    objectKey: 'users/17/asset/demo.png',
                    url: '/api/media/object/users/17/asset/demo.png',
                    contentType: 'image/png',
                    size: 4,
                },
            }),
        });
        const upload = createMediaPipelineUploader({
            apiBaseUrl: 'http://localhost:3000',
            accessToken: 'test-token',
            fetchImpl,
        });
        const experience = {
            images: [],
            update: jest.fn(async function update(values) {
                this.images = values.images;
            }),
        };
        const mediaRecord = await uploadAndAttachExperienceMedia({
            upload,
            experience,
            ownerId: 17,
            bytes: Buffer.from('png!'),
            contentType: 'image/png',
        });
        expect(String(fetchImpl.mock.calls[0][0])).toContain(
            '/api/media/upload?'
        );
        expect(fetchImpl.mock.calls[0][1]).toEqual(
            expect.objectContaining({
                method: 'PUT',
                headers: expect.objectContaining({
                    Cookie: '_token=test-token',
                    'Content-Type': 'image/png',
                }),
            })
        );
        expect(experience.update).toHaveBeenCalledWith({
            images: ['users/17/asset/demo.png'],
        });
        expect(experience.images[0]).toBe('users/17/asset/demo.png');
        expect(mediaRecord.objectKey).toBe(experience.images[0]);
    });
});
