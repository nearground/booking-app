import { API_BASE_URL } from 'utils/env';

// Usage: import { networkAdapter } from 'path/to/NetworkAdapter.js';
// Usage: const response = await networkAdapter.get('/api/hotel/123');
// Usage: const response = await networkAdapter.post('/api/hotel', { name: 'Hotel Name' });
class NetworkAdapter {
  static #API_URL = API_BASE_URL;
  static #API_PATH_PREFIX = '/api/';
  static #CSRF_COOKIE_NAME = '_csrf_token';
  static #CSRF_HEADER_NAME = 'X-CSRF-Token';

  static async #parseResponse(response) {
    let payload = {};

    try {
      payload = await response.json();
    } catch (_error) {
      payload = {};
    }

    return {
      ...payload,
      status: response.status,
      ok: response.ok,
    };
  }

  async get(endpoint, params = {}) {
    return this.#request(endpoint, { method: 'GET', params });
  }

  async post(endpoint, data = {}) {
    return this.#request(endpoint, { method: 'POST', data });
  }

  async put(endpoint, data = {}) {
    return this.#request(endpoint, { method: 'PUT', data });
  }

  async delete(endpoint) {
    return this.#request(endpoint, { method: 'DELETE' });
  }

  async patch(endpoint, data = {}) {
    return this.#request(endpoint, { method: 'PATCH', data });
  }

  async upload(endpoint, body, { method = 'PUT', params = {}, headers = {} } = {}) {
    return this.#request(endpoint, {
      method,
      params,
      body,
      headers,
      isRawBody: true,
    });
  }

  async #request(endpoint, { method, data, params, body, headers, isRawBody } = {}) {
    try {
      const baseUrl = new URL(NetworkAdapter.#API_URL, window.location.origin);
      if (!['http:', 'https:'].includes(baseUrl.protocol)) {
        throw new Error('Invalid API base URL protocol');
      }

      const endpointPath = this.#normalizeEndpoint(endpoint);
      const url = new URL(endpointPath, baseUrl);

      if (url.origin !== baseUrl.origin) {
        throw new Error('Cross-origin endpoint is not allowed');
      }

      if (!url.pathname.startsWith(NetworkAdapter.#API_PATH_PREFIX)) {
        throw new Error('Invalid API endpoint path');
      }

      Object.entries(params || {}).forEach(([key, value]) => {
        if (value === undefined || value === null) {
          return;
        }

        if (Array.isArray(value)) {
          value.forEach((item) => {
            if (item !== undefined && item !== null) {
              url.searchParams.append(key, String(item));
            }
          });
          return;
        }

        url.searchParams.append(key, String(value));
      });

      const requestOptions = {
        method,
        credentials: 'include',
      };

      if (headers && typeof headers === 'object') {
        requestOptions.headers = { ...headers };
      }

      if (isRawBody) {
        requestOptions.body = body;
      }

      if (!isRawBody && data !== undefined) {
        requestOptions.headers = {
          ...(requestOptions.headers || {}),
          'Content-Type': 'application/json',
        };
        requestOptions.body = JSON.stringify(data);
      }

      const normalizedMethod = String(method || 'GET').toUpperCase();
      const isSafeMethod = ['GET', 'HEAD', 'OPTIONS'].includes(normalizedMethod);

      if (!isSafeMethod) {
        const csrfToken = this.#getCookieValue(NetworkAdapter.#CSRF_COOKIE_NAME);
        if (csrfToken) {
          requestOptions.headers = {
            ...(requestOptions.headers || {}),
            [NetworkAdapter.#CSRF_HEADER_NAME]: csrfToken,
          };
        }
      }

      const response = await fetch(url.toString(), {
        ...requestOptions,
      });

      return await NetworkAdapter.#parseResponse(response);
    } catch (error) {
      return {
        data: {},
        errors: [error.message],
        status: 0,
        ok: false,
      };
    }
  }

  #normalizeEndpoint(endpoint) {
    if (typeof endpoint !== 'string') {
      throw new Error('Endpoint must be a string');
    }

    const trimmedEndpoint = endpoint.trim();
    if (!trimmedEndpoint) {
      throw new Error('Endpoint is required');
    }

    if (/^[a-zA-Z][a-zA-Z\d+.-]*:/.test(trimmedEndpoint) || trimmedEndpoint.startsWith('//')) {
      throw new Error('Absolute endpoint URLs are not allowed');
    }

    return trimmedEndpoint.startsWith('/') ? trimmedEndpoint : `/${trimmedEndpoint}`;
  }

  #getCookieValue(cookieName) {
    const encodedName = `${encodeURIComponent(cookieName)}=`;
    const cookies = String(document.cookie || '').split(';');

    for (const cookieSegment of cookies) {
      const trimmedSegment = cookieSegment.trim();
      if (trimmedSegment.startsWith(encodedName)) {
        return decodeURIComponent(trimmedSegment.slice(encodedName.length));
      }
    }

    return '';
  }
}

export const networkAdapter = new NetworkAdapter();
