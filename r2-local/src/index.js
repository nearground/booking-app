const jsonResponse = (status, body) =>
  new Response(JSON.stringify(body), {
    status,
    headers: {
      'content-type': 'application/json; charset=utf-8',
    },
  });

const ALLOWED_KEY_PREFIXES = ['users/', 'orgs/', 'experiences/', 'hotels/'];
const ALLOWED_UPLOAD_CONTENT_TYPES = new Set([
  'image/jpeg',
  'image/png',
  'image/webp',
  'image/gif',
  'image/avif',
]);
const MAX_UPLOAD_BYTES = 6 * 1024 * 1024;

const extractKey = (pathname) => {
  if (!pathname.startsWith('/objects/')) {
    return '';
  }

  return decodeURIComponent(pathname.replace('/objects/', ''));
};

const isValidObjectKey = (key) => {
  if (!key || key.length > 512) {
    return false;
  }

  if (key.includes('..') || key.startsWith('/')) {
    return false;
  }

  if (!ALLOWED_KEY_PREFIXES.some((prefix) => key.startsWith(prefix))) {
    return false;
  }

  return /^[a-zA-Z0-9._\-/]+$/.test(key);
};

const getRequestOrigin = (request) => request.headers.get('Origin');

const isAuthorizedRequest = (request, env) => {
  const configuredToken = String(env.R2_DEV_TOKEN || '').trim();
  if (!configuredToken) {
    return false;
  }

  const tokenFromRequest = request.headers.get('X-R2-Dev-Token') || '';
  return tokenFromRequest === configuredToken;
};

const isBrowserOriginRequest = (request) => {
  const origin = getRequestOrigin(request);
  return Boolean(origin);
};

const getAuthFailureResponse = (env) => {
  const configuredToken = String(env.R2_DEV_TOKEN || '').trim();

  if (!configuredToken) {
    return jsonResponse(500, {
      error: 'R2 worker is missing required R2_DEV_TOKEN configuration',
    });
  }

  return jsonResponse(401, {
    error: 'Unauthorized request',
  });
};

export default {
  async fetch(request, env) {
    const url = new URL(request.url);
    const { pathname } = url;

    if (request.method === 'OPTIONS') {
      return jsonResponse(403, { error: 'CORS preflight is not supported' });
    }

    if (pathname === '/health' && request.method === 'GET') {
      return jsonResponse(200, { ok: true, bucket: 'pv-today-local' });
    }

    if (pathname.startsWith('/objects')) {
      if (isBrowserOriginRequest(request)) {
        return jsonResponse(403, { error: 'Browser-origin access denied' });
      }

      if (!isAuthorizedRequest(request, env)) {
        return getAuthFailureResponse(env);
      }
    }

    if (pathname === '/objects' && request.method === 'GET') {

      const prefix = url.searchParams.get('prefix') || undefined;
      const listResult = await env.ASSETS_BUCKET.list({ prefix });

      return jsonResponse(200, {
        objects: listResult.objects.map((entry) => ({
          key: entry.key,
          size: entry.size,
          uploaded: entry.uploaded,
          etag: entry.httpEtag,
        })),
        truncated: listResult.truncated,
        cursor: listResult.cursor || null,
      });
    }

    const objectKey = extractKey(pathname);

    if (!objectKey) {
      return jsonResponse(404, { error: 'Not found' });
    }

    if (!isValidObjectKey(objectKey)) {
      return jsonResponse(400, { error: 'Invalid object key format' });
    }

    if (request.method === 'PUT') {
      const contentType = request.headers.get('content-type') || '';
      if (!ALLOWED_UPLOAD_CONTENT_TYPES.has(contentType.toLowerCase())) {
        return jsonResponse(415, {
          error: 'Unsupported content type',
          allowed: Array.from(ALLOWED_UPLOAD_CONTENT_TYPES),
        });
      }

      const body = await request.arrayBuffer();
      if (!body || body.byteLength === 0) {
        return jsonResponse(400, { error: 'Upload body is required' });
      }

      if (body.byteLength > MAX_UPLOAD_BYTES) {
        return jsonResponse(413, {
          error: 'File too large',
          maxBytes: MAX_UPLOAD_BYTES,
        });
      }

      const uploadBody = body instanceof ArrayBuffer ? new Uint8Array(body) : body;
      const metadata = {
        contentType,
      };

      try {
        await env.ASSETS_BUCKET.put(objectKey, uploadBody, {
          httpMetadata: metadata,
        });
      } catch (error) {
        console.error('R2 upload failed', error);
        return jsonResponse(500, {
          error: error?.message || 'Upload failed',
          details: error?.stack ? String(error.stack) : undefined,
        });
      }

      return jsonResponse(200, { ok: true, key: objectKey });
    }

    if (request.method === 'GET') {
      const object = await env.ASSETS_BUCKET.get(objectKey);

      if (!object) {
        return jsonResponse(404, { error: 'Object not found', key: objectKey });
      }

      const headers = new Headers();
      object.writeHttpMetadata(headers);
      headers.set('etag', object.httpEtag);

      return new Response(object.body, {
        status: 200,
        headers,
      });
    }

    if (request.method === 'DELETE') {
      await env.ASSETS_BUCKET.delete(objectKey);
      return jsonResponse(200, { ok: true, key: objectKey });
    }

    return jsonResponse(405, { error: 'Method not allowed' });
  },
};
