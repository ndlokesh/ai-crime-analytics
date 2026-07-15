/**
 * KSP Crime Analytics — Incidents API
 * Zoho Catalyst Advanced I/O Serverless Function (Node.js)
 *
 * Routes:
 *  GET /incidents          → List incidents (filterable)
 *  GET /incidents/hotspots → Heatmap coordinates
 *  GET /incidents/hourly   → Hourly distribution for Crime Clock
 */

'use strict';
const catalyst = require('zcatalyst-sdk-node');

module.exports = async (req, res) => {
  // CORS
  res.set('Access-Control-Allow-Origin', '*');
  res.set('Access-Control-Allow-Methods', 'GET, POST, OPTIONS');
  res.set('Access-Control-Allow-Headers', 'Content-Type, Authorization');

  if (req.method === 'OPTIONS') { res.status(204).send(''); return; }

  try {
    const app = catalyst.initialize(req);
    const zcql = app.zcql();
    const path = req.path || '';

    // ── GET /incidents/hotspots ───────────────────────────────
    if (path.includes('hotspots')) {
      const query = `SELECT latitude, longitude, severity FROM Incidents LIMIT 1000`;
      const rows = await zcql.executeZCQLQuery(query);
      const intensityMap = { Critical: 1.0, High: 0.7, Medium: 0.4, Low: 0.2 };
      const points = rows.map(r => ({
        lat: parseFloat(r.Incidents.latitude),
        lng: parseFloat(r.Incidents.longitude),
        intensity: intensityMap[r.Incidents.severity] || 0.5
      }));
      res.status(200).json({ status: 'success', data: points });
      return;
    }

    // ── GET /incidents/hourly ─────────────────────────────────
    if (path.includes('hourly')) {
      const query = `SELECT date_time FROM Incidents`;
      const rows = await zcql.executeZCQLQuery(query);
      const hourly = Array(24).fill(0);
      rows.forEach(r => {
        const hour = new Date(r.Incidents.date_time).getHours();
        if (hour >= 0 && hour < 24) hourly[hour]++;
      });
      res.status(200).json({ status: 'success', data: hourly });
      return;
    }

    // ── GET /incidents ────────────────────────────────────────
    const { district, type, from, to, limit = 600 } = req.query;
    let conditions = [];
    if (district)  conditions.push(`district = '${district.replace(/'/g,"''")}'`);
    if (type)      conditions.push(`crime_type = '${type.replace(/'/g,"''")}'`);
    if (from)      conditions.push(`date_time >= '${from}'`);
    if (to)        conditions.push(`date_time <= '${to}'`);

    const where = conditions.length ? `WHERE ${conditions.join(' AND ')}` : '';
    const query = `SELECT * FROM Incidents ${where} ORDER BY date_time DESC LIMIT ${Math.min(parseInt(limit) || 600, 1000)}`;
    const rows = await zcql.executeZCQLQuery(query);
    const data = rows.map(r => r.Incidents);

    res.status(200).json({ status: 'success', count: data.length, data });

  } catch (err) {
    console.error('incidents-api error:', err);
    res.status(500).json({ status: 'error', message: err.message });
  }
};
