move to api folder
import { kv } from '@vercel/kv';

export default async function handler(req, res) {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization');

  if (req.method === 'OPTIONS') return res.status(200).end();
  if (req.method !== 'POST') return res.status(405).json({ error: 'Method not allowed' });

  const { path, referrer, screen, lang } = req.body || {};
  const ip = req.headers['x-forwarded-for']?.split(',')[0]?.trim() || 'unknown';
  const country = req.headers['x-vercel-ip-country'] || 'unknown';
  const ua = req.headers['user-agent'] || 'unknown';

  const entry = {
    timestamp: new Date().toISOString(),
    ip,
    country,
    ua,
    device: /Mobile|Android|iPhone|iPod/i.test(ua) ? 'Mobile' : (/iPad/i.test(ua) ? 'Tablet' : 'Desktop'),
    path: path || '/',
    referrer: referrer || '',
    screen: screen || '',
    lang: lang || '',
  };

  const today = new Date().toISOString().slice(0, 10);
  const key = `logs:${today}`;
  await kv.lpush(key, JSON.stringify(entry));
  await kv.expire(key, 7 * 24 * 60 * 60);
  return res.status(200).json({ ok: true });
}
