import { createClient } from 'redis';

let client = null;

export async function getRedis() {
  if (!client) {
    client = createClient({ url: process.env.REDIS_URL });
    client.on('error', () => {});
    await client.connect();
  }
  return client;
}
