import { getRedis } from './_redis.js';

function hash(str) {
  let h = 0;
  for (let i = 0; i < str.length; i++) {
    h = ((h << 5) - h) + str.charCodeAt(i);
    h |= 0;
  }
  return h;
}

const AUTH_PASSWORD = process.env.AUTH_PASSWORD || 'VALUE2027';

export default async function handler(req, res) {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');

  if (req.method === 'OPTIONS') return res.status(200).end();
  if (req.method !== 'POST') return res.status(405).json({ error: 'Method not allowed' });

  const { password } = req.body || {};
  if (hash(password) !== hash(AUTH_PASSWORD)) {
    return res.status(401).json({ error: '密码错误' });
  }

  const token = Math.random().toString(36).substring(2) + Date.now().toString(36);
  const redis = await getRedis();
  await redis.setEx(`token:${token}`, 28800, Date.now().toString());
  return res.status(200).json({ token });
}
