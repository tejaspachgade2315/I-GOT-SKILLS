const { createClient } = require('redis');
const redisUrl = process.env.REDIS_URL || 'redis://localhost:6379';

const client = createClient({ url: redisUrl });

client.on('error', (err) => {
  console.error('Redis Client Error', err);
});

async function connectRedis() {
  if (!client.isOpen) await client.connect();
}

module.exports = { client, connectRedis };
