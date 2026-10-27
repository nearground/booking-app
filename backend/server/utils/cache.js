import redis from './ioredis-client.js';

const DEFAULT_TTL_SECONDS = 60; // default 60s for hot-read caching

const serialize = (value) => {
  try {
    return JSON.stringify(value);
  } catch (e) {
    return null;
  }
};

const deserialize = (str) => {
  try {
    return JSON.parse(str);
  } catch (e) {
    return null;
  }
};

async function get(key) {
  if (!redis) return null;
  try {
    const v = await redis.get(key);
    return v ? deserialize(v) : null;
  } catch (e) {
    // fail-open
    console.warn('Cache get error', e && e.message ? e.message : e);
    return null;
  }
}

async function set(key, value, ttlSeconds = DEFAULT_TTL_SECONDS) {
  if (!redis) return false;
  const body = serialize(value);
  if (body === null) return false;
  try {
    await redis.set(key, body, 'EX', Number(ttlSeconds));
    return true;
  } catch (e) {
    console.warn('Cache set error', e && e.message ? e.message : e);
    return false;
  }
}

async function del(key) {
  if (!redis) return false;
  try {
    await redis.del(key);
    return true;
  } catch (e) {
    console.warn('Cache del error', e && e.message ? e.message : e);
    return false;
  }
}

// Delete keys by prefix (uses SCAN to avoid blocking Redis in production)
async function delByPrefix(prefix) {
  if (!redis) return false;
  try {
    const stream = redis.scanStream({ match: `${prefix}*`, count: 100 });
    const keys = [];
    for await (const resultKeys of stream) {
      if (resultKeys.length) keys.push(...resultKeys);
    }
    if (keys.length === 0) return true;
    // split into batches to avoid very large del calls
    const batchSize = 1000;
    for (let i = 0; i < keys.length; i += batchSize) {
      const batch = keys.slice(i, i + batchSize);
      await redis.del(...batch);
    }
    return true;
  } catch (e) {
    console.warn('Cache delByPrefix error', e && e.message ? e.message : e);
    return false;
  }
}

const defaultExport = { get, set, del, DEFAULT_TTL_SECONDS, delByPrefix };

export { get, set, del, DEFAULT_TTL_SECONDS, delByPrefix };
export default defaultExport;
