import { test } from 'node:test';
import assert from 'node:assert/strict';
import worker from './index.js';

test('authenticated MP4 upload retains the same ownership, size and MIME guards as images', async () => {
    const records = new Map();
    const env = {
        R2_DEV_TOKEN: 'isolated-worker-test',
        ASSETS_BUCKET: {
            put: async (key, bytes, metadata) => records.set(key, { bytes, metadata }),
            delete: async (key) => records.delete(key),
        },
    };
    const url = 'http://worker/objects/users/7/asset/seed-video.mp4';
    const request = (body, headers = {}) => new Request(url, {
        method: 'PUT', body, headers: { 'X-R2-Dev-Token': env.R2_DEV_TOKEN, 'Content-Type': 'video/mp4', ...headers },
    });
    assert.equal((await worker.fetch(request(Buffer.from('video fixture')), env)).status, 200);
    assert.equal(records.get('users/7/asset/seed-video.mp4').metadata.httpMetadata.contentType, 'video/mp4');
    assert.equal((await worker.fetch(request(Buffer.from('video'), { 'X-R2-Dev-Token': 'wrong' }), env)).status, 401);
    assert.equal((await worker.fetch(request(Buffer.from('video'), { Origin: 'http://browser' }), env)).status, 403);
    assert.equal((await worker.fetch(request(Buffer.alloc(6 * 1024 * 1024 + 1)), env)).status, 413);
    assert.equal((await worker.fetch(request(Buffer.from('text'), { 'Content-Type': 'text/html' }), env)).status, 415);
    assert.equal((await worker.fetch(new Request(url, { method: 'DELETE', headers: { 'X-R2-Dev-Token': env.R2_DEV_TOKEN } }), env)).status, 200);
    assert.equal(records.size, 0);
});
