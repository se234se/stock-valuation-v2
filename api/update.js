import { getRedis } from './_redis.js';

const ADMIN_PASSWORD = process.env.ADMIN_PASSWORD || 'VALUE2027';

function hash(str) {
  let h = 0;
  for (let i = 0; i < str.length; i++) {
    h = ((h << 5) - h) + str.charCodeAt(i);
    h |= 0;
  }
  return h;
}

export default async function handler(req, res) {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');

  if (req.method === 'OPTIONS') return res.status(200).end();
  if (req.method !== 'POST') return res.status(405).json({ error: 'Method not allowed' });

  const pwd = req.query.pwd || '';
  if (hash(pwd) !== hash(ADMIN_PASSWORD)) {
    return res.status(401).send('Unauthorized');
  }

  const csv = await req.text();
  const redis = await getRedis();
  await redis.set('data:csv', csv);
  await redis.set('data:meta', JSON.stringify({ updated: new Date().toLocaleString('zh-CN') }));
  return res.status(200).json({ ok: true, size: csv.length });
}
