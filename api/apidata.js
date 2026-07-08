move to api folder
import { kv } from '@vercel/kv';

export default async function handler(req, res) {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization');

  if (req.method === 'OPTIONS') return res.status(200).end();
  if (req.method !== 'GET') return res.status(405).json({ error: 'Method not allowed' });

  const token = req.headers.authorization?.replace('Bearer ', '');
  if (!token) return res.status(401).send('Unauthorized');

  const valid = await kv.get(`token:${token}`);
  if (!valid) return res.status(401).send('Expired');

  const csv = await kv.get('data:csv');
  const meta = await kv.get('data:meta');
  let updated = '未知';
  if (meta) {
    try { updated = JSON.parse(meta).updated; } catch (e) {}
  }
  if (!csv) return res.status(404).send('No data');

  res.setHeader('Content-Type', 'text/plain; charset=utf-8');
  res.setHeader('X-Data-Updated', updated);
  return res.status(200).send(csv);
}
