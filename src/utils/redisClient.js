const { createClient } = require('redis');

let client = null;
let redisAvailable = false;
let errorLogged = false;
function getRedisUrl() {
  return process.env.REDIS_URL && process.env.REDIS_URL.trim() !== ''
    ? process.env.REDIS_URL
    : null;
}

function makeClient(url) {
  return createClient({
    url,
    socket: {
      reconnectStrategy: (retries) => {
        if (retries >= 3) {
          return new Error('redis: stop reconnecting after 3 attempts');
        }
        return 50 * retries;
      }
    }
  });
}

async function connectRedis() {
  const url = getRedisUrl();
  if (!url) {
    if (!errorLogged) {
      console.warn('⚠️  Redis not configured (REDIS_URL not set). Skipping Redis connection.');
      errorLogged = true;
    }
    redisAvailable = false;
    return;
  }

  if (client && client.isOpen) {
    redisAvailable = true;
    return;
  }

  client = makeClient(url);

  client.on('error', (err) => {
    if (!errorLogged) {
      console.warn('⚠️  Redis Client Error:', err && err.message ? err.message : err);
      errorLogged = true;
    }
    redisAvailable = false;
  });

  try {
    await client.connect();
    redisAvailable = true;
    errorLogged = false;
    console.log('✅ Redis connected successfully');
  } catch (err) {
    redisAvailable = false;

    if (!errorLogged) {
      console.warn('⚠️  Redis connection failed; continuing without Redis cache.', err && err.message ? err.message : err);
      errorLogged = true;
    }
    try {
      if (client && client.isOpen) {
        await client.quit();
      }
    } catch (_) {
    }
  }
}

async function safeGet(key) {
  try {
    if (!redisAvailable || !client || !client.isOpen) return null;
    return await client.get(key);
  } catch (err) {
    if (!errorLogged) {
      console.warn('⚠️  Redis get error (suppressed):', err && err.message ? err.message : err);
      errorLogged = true;
    }
    return null;
  }
}

async function safeSet(key, value, options = {}) {
  try {
    if (!redisAvailable || !client || !client.isOpen) return;
    await client.set(key, value, options);
  } catch (err) {
    if (!errorLogged) {
      console.warn('⚠️  Redis set error (suppressed):', err && err.message ? err.message : err);
      errorLogged = true;
    }
  }
}

function isRedisAvailable() {
  return redisAvailable && client && client.isOpen;
}

module.exports = {
  get client() { return client; },
  connectRedis,
  safeGet,
  safeSet,
  isRedisAvailable
};
