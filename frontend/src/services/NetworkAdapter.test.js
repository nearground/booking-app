import { networkAdapter } from 'services/NetworkAdapter';

const mockFetch = (status, body) => {
  global.fetch = vi.fn().mockResolvedValue({
    status,
    ok: status < 400,
    json: vi.fn().mockResolvedValue(body),
  });
};

beforeEach(() => {
  Object.defineProperty(document, 'cookie', {
    writable: true,
    value: '',
    configurable: true,
  });
});

describe('NetworkAdapter', () => {
  test('get() calls fetch with the correct full URL', async () => {
    mockFetch(200, { hotels: [] });
    const result = await networkAdapter.get('/api/hotels');
    expect(global.fetch).toHaveBeenCalledWith(
      'http://localhost:3000/api/hotels',
      expect.objectContaining({ method: 'GET' })
    );
    expect(result.status).toBe(200);
    expect(result.ok).toBe(true);
  });

  test('get() appends scalar query params to the URL', async () => {
    mockFetch(200, {});
    await networkAdapter.get('/api/hotels', { city: 'Mumbai' });
    const url = global.fetch.mock.calls[0][0];
    expect(url).toContain('city=Mumbai');
  });

  test('get() appends each item of an array param separately', async () => {
    mockFetch(200, {});
    await networkAdapter.get('/api/items', { ids: [1, 2] });
    const url = global.fetch.mock.calls[0][0];
    expect(url).toContain('ids=1');
    expect(url).toContain('ids=2');
  });

  test('get() omits null param values from the URL', async () => {
    mockFetch(200, {});
    await networkAdapter.get('/api/items', { nullable: null });
    const url = global.fetch.mock.calls[0][0];
    expect(url).not.toContain('nullable');
  });

  test('post() uses POST method with JSON body and Content-Type header', async () => {
    mockFetch(201, {});
    await networkAdapter.post('/api/users', { name: 'Test' });
    const [, options] = global.fetch.mock.calls[0];
    expect(options.method).toBe('POST');
    expect(options.body).toBe(JSON.stringify({ name: 'Test' }));
    expect(options.headers['Content-Type']).toBe('application/json');
  });

  test('post() includes X-CSRF-Token header when csrf cookie is set', async () => {
    Object.defineProperty(document, 'cookie', {
      writable: true,
      value: '_csrf_token=mytoken',
      configurable: true,
    });
    mockFetch(200, {});
    await networkAdapter.post('/api/data', {});
    const [, options] = global.fetch.mock.calls[0];
    expect(options.headers['X-CSRF-Token']).toBe('mytoken');
  });

  test('get() does not include X-CSRF-Token header even when csrf cookie is set', async () => {
    Object.defineProperty(document, 'cookie', {
      writable: true,
      value: '_csrf_token=mytoken',
      configurable: true,
    });
    mockFetch(200, {});
    await networkAdapter.get('/api/hotels');
    const [, options] = global.fetch.mock.calls[0];
    expect(options.headers?.['X-CSRF-Token']).toBeUndefined();
  });

  test('get() prepends slash to endpoint missing a leading slash', async () => {
    mockFetch(200, {});
    await networkAdapter.get('api/hotels');
    const url = global.fetch.mock.calls[0][0];
    expect(url).toBe('http://localhost:3000/api/hotels');
  });

  test('post() with absolute URL returns error without calling fetch', async () => {
    global.fetch = vi.fn();
    const result = await networkAdapter.post('http://evil.com/api/steal', {});
    expect(global.fetch).not.toHaveBeenCalled();
    expect(result.ok).toBe(false);
    expect(result.status).toBe(0);
    expect(result.errors).toContain('Absolute endpoint URLs are not allowed');
  });

  test('post() with path missing /api/ prefix returns error', async () => {
    global.fetch = vi.fn();
    const result = await networkAdapter.post('/no-api-prefix', {});
    expect(result.ok).toBe(false);
    expect(result.errors).toContain('Invalid API endpoint path');
  });

  test('network failure returns structured error object', async () => {
    global.fetch = vi.fn().mockRejectedValue(new Error('Network failure'));
    const result = await networkAdapter.get('/api/hotels');
    expect(result.ok).toBe(false);
    expect(result.status).toBe(0);
    expect(result.errors).toContain('Network failure');
  });

  test('json() parse failure does not crash and preserves status', async () => {
    global.fetch = vi.fn().mockResolvedValue({
      status: 200,
      ok: true,
      json: vi.fn().mockRejectedValue(new Error('JSON parse error')),
    });
    const result = await networkAdapter.get('/api/hotels');
    expect(result.status).toBe(200);
    expect(result.ok).toBe(true);
  });

  test('delete() uses DELETE method', async () => {
    mockFetch(200, {});
    await networkAdapter.delete('/api/resource/1');
    const [, options] = global.fetch.mock.calls[0];
    expect(options.method).toBe('DELETE');
  });

  test('patch() uses PATCH method with JSON body', async () => {
    mockFetch(200, {});
    await networkAdapter.patch('/api/users/1', { name: 'New' });
    const [, options] = global.fetch.mock.calls[0];
    expect(options.method).toBe('PATCH');
    expect(options.body).toContain('New');
  });
});
