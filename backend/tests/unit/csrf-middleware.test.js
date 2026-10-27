import {
  ensureCsrfCookie,
  validateCsrfForAuthenticatedWrites,
} from '../../server/middlewares/csrf.js';

const mockReq = (overrides = {}) => ({
  cookies: {},
  method: 'GET',
  get: jest.fn().mockReturnValue(undefined),
  ...overrides,
});

const mockRes = () => {
  const res = {};
  res.cookie = jest.fn();
  res.status = jest.fn().mockReturnValue(res);
  res.json = jest.fn().mockReturnValue(res);
  return res;
};

describe('ensureCsrfCookie', () => {
  test('calls next() without setting cookie when no auth token is present', () => {
    const req = mockReq({ cookies: {} });
    const res = mockRes();
    const next = jest.fn();
    ensureCsrfCookie(req, res, next);
    expect(next).toHaveBeenCalledTimes(1);
    expect(res.cookie).not.toHaveBeenCalled();
  });

  test('calls next() without setting cookie when csrf cookie already exists', () => {
    const req = mockReq({ cookies: { _token: 'jwt', _csrf_token: 'existing' } });
    const res = mockRes();
    const next = jest.fn();
    ensureCsrfCookie(req, res, next);
    expect(next).toHaveBeenCalledTimes(1);
    expect(res.cookie).not.toHaveBeenCalled();
  });

  test('sets a new csrf cookie and calls next() when auth token exists but csrf cookie does not', () => {
    const req = mockReq({ cookies: { _token: 'jwt' } });
    const res = mockRes();
    const next = jest.fn();
    ensureCsrfCookie(req, res, next);
    expect(res.cookie).toHaveBeenCalledTimes(1);
    expect(next).toHaveBeenCalledTimes(1);
    const [cookieName, token] = res.cookie.mock.calls[0];
    expect(cookieName).toBe('_csrf_token');
    expect(token).toMatch(/^[a-f0-9]{64}$/);
  });

  test('generated csrf token is a 64-character hex string', () => {
    const req = mockReq({ cookies: { _token: 'jwt' } });
    const res = mockRes();
    ensureCsrfCookie(req, res, jest.fn());
    const [, token] = res.cookie.mock.calls[0];
    expect(token).toMatch(/^[a-f0-9]{64}$/);
  });
});

describe('validateCsrfForAuthenticatedWrites', () => {
  test('safe method GET calls next() without checking CSRF', () => {
    const req = mockReq({ method: 'GET' });
    const res = mockRes();
    const next = jest.fn();
    validateCsrfForAuthenticatedWrites(req, res, next);
    expect(next).toHaveBeenCalledTimes(1);
    expect(res.status).not.toHaveBeenCalled();
  });

  test('safe method HEAD calls next()', () => {
    const req = mockReq({ method: 'HEAD' });
    const res = mockRes();
    const next = jest.fn();
    validateCsrfForAuthenticatedWrites(req, res, next);
    expect(next).toHaveBeenCalledTimes(1);
  });

  test('safe method OPTIONS calls next()', () => {
    const req = mockReq({ method: 'OPTIONS' });
    const res = mockRes();
    const next = jest.fn();
    validateCsrfForAuthenticatedWrites(req, res, next);
    expect(next).toHaveBeenCalledTimes(1);
  });

  test('POST without auth token calls next() (unauthenticated passthrough)', () => {
    const req = mockReq({ method: 'POST', cookies: {} });
    const res = mockRes();
    const next = jest.fn();
    validateCsrfForAuthenticatedWrites(req, res, next);
    expect(next).toHaveBeenCalledTimes(1);
    expect(res.status).not.toHaveBeenCalled();
  });

  test('POST with matching csrf cookie and header calls next()', () => {
    const req = mockReq({
      method: 'POST',
      cookies: { _token: 'jwt', _csrf_token: 'abc' },
      get: jest.fn().mockReturnValue('abc'),
    });
    const res = mockRes();
    const next = jest.fn();
    validateCsrfForAuthenticatedWrites(req, res, next);
    expect(next).toHaveBeenCalledTimes(1);
  });

  test('POST authenticated with no CSRF header returns 403', () => {
    const req = mockReq({
      method: 'POST',
      cookies: { _token: 'jwt', _csrf_token: 'abc' },
      get: jest.fn().mockReturnValue(undefined),
    });
    const res = mockRes();
    const next = jest.fn();
    validateCsrfForAuthenticatedWrites(req, res, next);
    expect(res.status).toHaveBeenCalledWith(403);
    expect(next).not.toHaveBeenCalled();
  });

  test('POST authenticated with mismatched csrf token returns 403', () => {
    const req = mockReq({
      method: 'POST',
      cookies: { _token: 'jwt', _csrf_token: 'abc' },
      get: jest.fn().mockReturnValue('xyz'),
    });
    const res = mockRes();
    const next = jest.fn();
    validateCsrfForAuthenticatedWrites(req, res, next);
    expect(res.status).toHaveBeenCalledWith(403);
  });

  test('DELETE authenticated with matching csrf token calls next()', () => {
    const req = mockReq({
      method: 'DELETE',
      cookies: { _token: 'jwt', _csrf_token: 'token99' },
      get: jest.fn().mockReturnValue('token99'),
    });
    const res = mockRes();
    const next = jest.fn();
    validateCsrfForAuthenticatedWrites(req, res, next);
    expect(next).toHaveBeenCalledTimes(1);
  });

  test('PATCH authenticated with no csrf cookie returns 403', () => {
    const req = mockReq({
      method: 'PATCH',
      cookies: { _token: 'jwt' },
      get: jest.fn().mockReturnValue('some-token'),
    });
    const res = mockRes();
    const next = jest.fn();
    validateCsrfForAuthenticatedWrites(req, res, next);
    expect(res.status).toHaveBeenCalledWith(403);
  });
});
