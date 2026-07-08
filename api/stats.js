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
  if (req.method !== 'GET') return res.status(405).json({error: 'Method not allowed'});
  
  const pwd = req.query.pwd || '';
  if (hash(pwd) !== hash(ADMIN_PASSWORD)) {
    return res.status(401).json({error: 'Unauthorized'});
  }

  const redis = await getRedis();
  const allLogs = [];
  for (let i = 0; i < 7; i++) {
    const d = new Date();
    d.setDate(d.getDate() - i);
    const key = `logs:${d.toISOString().slice(0, 10)}`;
    const logs = await redis.lRange(key, 0, -1);
    logs.forEach(l => {
      try {
        const entry = JSON.parse(l);
        entry.date = d.toISOString().slice(0, 10);
        allLogs.push(entry);
      } catch (e) {}
    });
  }

  const stats = {
    total: allLogs.length,
    uniqueIPs: new Set(allLogs.map(l => l.ip)).size,
    byCountry: {},
    byDevice: {},
    byDay: {},
    recent: allLogs.slice(0, 50),
  };
  allLogs.forEach(l => {
    stats.byCountry[l.country] = (stats.byCountry[l.country] || 0) + 1;
    stats.byDevice[l.device] = (stats.byDevice[l.device] || 0) + 1;
    stats.byDay[l.date] = (stats.byDay[l.date] || 0) + 1;
  });

  res.setHeader('Content-Type', 'application/json');
  return res.status(200).json(stats);
}
