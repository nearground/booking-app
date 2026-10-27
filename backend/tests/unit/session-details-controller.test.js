/**
 * Unit tests for getSessionReservations and cancelSession controller handlers.
 *
 * We mock the OrganizerService module and verify the controller correctly
 * maps request params, delegates to the service, and formats responses.
 */

import { getSessionReservations, cancelSession } from '../../server/controllers/Organizer.controller.js';
import * as OrganizerService from '../../server/services/Organizer.service.js';

// ---------------------------------------------------------------------------
// Helpers – lightweight Express req/res stubs
// ---------------------------------------------------------------------------

const makeReq = (overrides = {}) => ({
    user: { id: 1 },
    params: {},
    query: {},
    body: {},
    cookies: {},
    requestId: 'test-request-id',
    ...overrides,
});

const makeRes = () => {
    const res = {
        statusCode: null,
        body: null,
        status(code) {
            res.statusCode = code;
            return res;
        },
        json(payload) {
            res.body = payload;
            return res;
        },
    };
    return res;
};

// ---------------------------------------------------------------------------
// getSessionReservations
// ---------------------------------------------------------------------------

describe('Organizer.controller.getSessionReservations', () => {
    afterEach(() => {
        jest.restoreAllMocks();
    });

    test('returns 200 with session and reservations on success', async () => {
        const serviceResult = {
            session: { id: 1, experienceTitle: 'Hike', status: 'scheduled' },
            reservations: [{ id: 10, billingName: 'John' }],
        };
        jest.spyOn(OrganizerService, 'getSessionReservationsService').mockResolvedValue(serviceResult);

        const req = makeReq({ params: { sessionId: '1' } });
        const res = makeRes();

        await getSessionReservations(req, res);

        expect(res.statusCode).toBe(200);
        expect(res.body.errors).toEqual([]);
        expect(res.body.data).toEqual(serviceResult);
    });

    test('passes userId from req.user and sessionId from req.params', async () => {
        const spy = jest.spyOn(OrganizerService, 'getSessionReservationsService').mockResolvedValue({
            session: {},
            reservations: [],
        });

        const req = makeReq({ user: { id: 42 }, params: { sessionId: '7' } });
        const res = makeRes();

        await getSessionReservations(req, res);

        expect(spy).toHaveBeenCalledWith({ userId: 42, sessionId: '7' });
    });

    test('returns structured error when service throws with status/errors', async () => {
        jest.spyOn(OrganizerService, 'getSessionReservationsService').mockRejectedValue({
            status: 404,
            errors: ['Session not found'],
        });

        const req = makeReq({ params: { sessionId: '999' } });
        const res = makeRes();

        await getSessionReservations(req, res);

        expect(res.statusCode).toBe(404);
        expect(res.body.errors).toEqual(['Session not found']);
    });

    test('returns 403 when service throws forbidden', async () => {
        jest.spyOn(OrganizerService, 'getSessionReservationsService').mockRejectedValue({
            status: 403,
            errors: ['You do not have access to this session'],
        });

        const req = makeReq({ params: { sessionId: '1' } });
        const res = makeRes();

        await getSessionReservations(req, res);

        expect(res.statusCode).toBe(403);
        expect(res.body.errors).toContain('You do not have access to this session');
    });

    test('returns 500 on unexpected error', async () => {
        jest.spyOn(OrganizerService, 'getSessionReservationsService').mockRejectedValue(
            new Error('Unexpected DB failure')
        );

        const req = makeReq({ params: { sessionId: '1' } });
        const res = makeRes();

        await getSessionReservations(req, res);

        expect(res.statusCode).toBe(500);
        expect(res.body.errors).toBeDefined();
    });
});

// ---------------------------------------------------------------------------
// cancelSession
// ---------------------------------------------------------------------------

describe('Organizer.controller.cancelSession', () => {
    afterEach(() => {
        jest.restoreAllMocks();
    });

    test('returns 200 with cancelled session on success', async () => {
        const serviceResult = {
            session: { id: 1, status: 'cancelled' },
        };
        jest.spyOn(OrganizerService, 'cancelSessionService').mockResolvedValue(serviceResult);

        const req = makeReq({ params: { sessionId: '1' } });
        const res = makeRes();

        await cancelSession(req, res);

        expect(res.statusCode).toBe(200);
        expect(res.body.errors).toEqual([]);
        expect(res.body.data.session).toEqual({ id: 1, status: 'cancelled' });
    });

    test('passes userId and sessionId to service', async () => {
        const spy = jest.spyOn(OrganizerService, 'cancelSessionService').mockResolvedValue({
            session: { id: 5 },
        });

        const req = makeReq({ user: { id: 42 }, params: { sessionId: '5' } });
        const res = makeRes();

        await cancelSession(req, res);

        expect(spy).toHaveBeenCalledWith({ userId: 42, sessionId: '5' });
    });

    test('returns structured error when service throws with status/errors', async () => {
        jest.spyOn(OrganizerService, 'cancelSessionService').mockRejectedValue({
            status: 400,
            errors: ['Session is already cancelled'],
        });

        const req = makeReq({ params: { sessionId: '1' } });
        const res = makeRes();

        await cancelSession(req, res);

        expect(res.statusCode).toBe(400);
        expect(res.body.errors).toEqual(['Session is already cancelled']);
    });

    test('returns 403 when non-admin tries to cancel', async () => {
        jest.spyOn(OrganizerService, 'cancelSessionService').mockRejectedValue({
            status: 403,
            errors: ['Only organization admins can cancel sessions'],
        });

        const req = makeReq({ params: { sessionId: '1' } });
        const res = makeRes();

        await cancelSession(req, res);

        expect(res.statusCode).toBe(403);
        expect(res.body.errors).toContain('Only organization admins can cancel sessions');
    });

    test('returns 500 on unexpected error', async () => {
        jest.spyOn(OrganizerService, 'cancelSessionService').mockRejectedValue(
            new Error('DB connection lost')
        );

        const req = makeReq({ params: { sessionId: '1' } });
        const res = makeRes();

        await cancelSession(req, res);

        expect(res.statusCode).toBe(500);
        expect(res.body.errors).toBeDefined();
    });
});
