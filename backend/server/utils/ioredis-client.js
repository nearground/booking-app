import { createRequire } from 'node:module';
const require = createRequire(import.meta.url);



const IORedis = require('ioredis');

let client = null;

function createClient() {
  const redisUrl = process.env.REDIS_URL;
  const host = process.env.REDIS_HOST || 'redis';
  const port = Number(process.env.REDIS_PORT || 6379);
  const password = process.env.REDIS_PASSWORD || undefined;

  if (redisUrl) {
    return new IORedis(redisUrl);
  }

  return new IORedis({ host, port, password });
}

function getRedisClient() {
  if (client) return client;
  client = createClient();

  client.on('error', (err) => {
    console.error('Redis client error:', err && err.message ? err.message : err);
  });

  client.on('connect', () => {
    console.info('Redis client connected');
  });

  return client;
}

export default getRedisClient();
