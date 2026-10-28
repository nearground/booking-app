import { afterEach, beforeEach, describe, expect, jest, test } from '@jest/globals';

jest.mock('../../server/utils/media-storage.js', () => ({
    resolveMediaUrl: (key) => `/api/media/object/${key}`,
}));
jest.mock('../../server/utils/cache.js', () => ({
    __esModule: true,
    default: { get: jest.fn().mockResolvedValue(null), set: jest.fn() },
}));

import { uploadMedia, getMediaObject } from '../../server/controllers/Media.controller.js';

describe('media controller shared storage transport', () => {
    let req;
    let res;
    let originalFetch;
    let originalEnv;

    beforeEach(() => {
        originalEnv = { ...process.env };
        originalFetch = global.fetch;
        process.env.R2_DEV_TOKEN = 'fixture-worker-token';
        process.env.R2_WORKER_BASE_URL = 'http://worker.example/';
        global.fetch = jest.fn().mockResolvedValue({ ok: true });
        req = {
            query: { ownerType: 'user', ownerId: '42', kind: 'asset' },
            user: { id: 42 },
            headers: { 'content-type': 'image/jpeg; charset=binary' },
            body: Buffer.from('image bytes'),
            requestId: 'media-test',
        };
        res = {
            status: jest.fn().mockReturnThis(),
            json: jest.fn().mockReturnThis(),
            send: jest.fn().mockReturnThis(),
            setHeader: jest.fn(),
        };
    });

    afterEach(() => {
        global.fetch = originalFetch;
        process.env = originalEnv;
    });

    test('uploads validated bytes to the worker and returns the same API response shape', async () => {
        await uploadMedia(req, res);
        expect(res.status).toHaveBeenCalledWith(201);
        const data = res.json.mock.calls[0][0].data;
        expect(data).toEqual({
            objectKey: expect.stringMatching(/^users\/42\/asset\/\d+-[a-f0-9]{6}\.jpg$/),
            url: `/api/media/object/${data.objectKey}`,
            contentType: 'image/jpeg',
            size: req.body.length,
        });
        expect(global.fetch).toHaveBeenCalledWith(`http://worker.example/objects/${data.objectKey}`, {
            method: 'PUT',
            headers: { 'X-R2-Dev-Token': 'fixture-worker-token', 'Content-Type': 'image/jpeg' },
            body: req.body,
        });
    });

    test.each([
        [{ ownerId: '43' }, 403],
        [{ ownerType: 'organization' }, 400],
        [{ kind: 'unknown' }, 400],
        [{ ownerId: '-1' }, 400],
    ])('retains route ownership and query validation (%p)', async (query, status) => {
        req.query = { ...req.query, ...query };
        await uploadMedia(req, res);
        expect(res.status).toHaveBeenCalledWith(status);
        expect(global.fetch).not.toHaveBeenCalled();
    });

    test.each([
        ['text/html', Buffer.from('bad'), 415],
        ['image/jpeg', Buffer.alloc(0), 400],
        ['image/jpeg', 'not a buffer', 400],
    ])('retains content type/body validation (%s)', async (contentType, body, status) => {
        req.headers['content-type'] = contentType;
        req.body = body;
        await uploadMedia(req, res);
        expect(res.status).toHaveBeenCalledWith(status);
        expect(global.fetch).not.toHaveBeenCalled();
    });

    test('does not expose configuration errors to HTTP callers', async () => {
        delete process.env.R2_DEV_TOKEN;
        await uploadMedia(req, res);
        expect(res.status).toHaveBeenCalledWith(500);
        expect(res.json).toHaveBeenCalledWith({
            errors: ['Storage is temporarily unavailable'],
            data: { requestId: 'media-test' },
        });
        expect(global.fetch).not.toHaveBeenCalled();
    });

    test.each([
        [{ error: 'Storage rejected upload' }, 'Storage rejected upload'],
        [{ errors: ['Upload denied'] }, 'Upload denied'],
    ])('preserves upstream error status and envelope', async (body, message) => {
        global.fetch.mockResolvedValue({ ok: false, status: 403, json: async () => body });
        await uploadMedia(req, res);
        expect(res.status).toHaveBeenCalledWith(403);
        expect(res.json).toHaveBeenCalledWith({
            errors: [message], data: { upstreamStatus: 403, requestId: 'media-test' },
        });
    });

    test('retains fallback error for a non-JSON worker response', async () => {
        global.fetch.mockResolvedValue({
            ok: false, status: 503, json: async () => { throw new Error('not JSON'); },
        });
        await uploadMedia(req, res);
        expect(res.status).toHaveBeenCalledWith(503);
        expect(res.json.mock.calls[0][0].errors).toEqual(['Failed to upload media to storage']);
    });

    test('retains generic network failure response', async () => {
        global.fetch.mockRejectedValue(new Error('connection refused'));
        await uploadMedia(req, res);
        expect(res.status).toHaveBeenCalledWith(500);
        expect(res.json.mock.calls[0][0].errors).toEqual(['Error uploading media']);
    });

    test('object reads retain worker authentication and headers', async () => {
        req.params = { 0: 'users/42/asset/fixture.jpg' };
        const bytes = Buffer.from('stored image');
        global.fetch.mockResolvedValue({
            ok: true,
            status: 200,
            headers: new Map([['content-type', 'image/jpeg'], ['etag', 'fixture-etag']]),
            arrayBuffer: async () => bytes,
        });
        await getMediaObject(req, res);
        expect(global.fetch).toHaveBeenCalledWith(
            'http://worker.example/objects/users/42/asset/fixture.jpg',
            { method: 'GET', headers: { 'X-R2-Dev-Token': 'fixture-worker-token' } }
        );
        expect(res.status).toHaveBeenCalledWith(200);
        expect(res.setHeader).toHaveBeenCalledWith('ETag', 'fixture-etag');
        expect(res.send).toHaveBeenCalledWith(bytes);
    });
});
