/**
 * KSP Crime Analytics — Alerts API
 * Zoho Catalyst Advanced I/O Serverless Function (Node.js)
 */

'use strict';
const catalyst = require('zcatalyst-sdk-node');

module.exports = async (req, res) => {
  res.set('Access-Control-Allow-Origin', '*');
  res.set('Access-Control-Allow-Methods', 'GET, POST, PUT, OPTIONS');
  res.set('Access-Control-Allow-Headers', 'Content-Type, Authorization');
  if (req.method === 'OPTIONS') { res.status(204).send(''); return; }

  try {
    const app = catalyst.initialize(req);
    const zcql = app.zcql();
    const path = req.path || '';

    // ── PUT /alerts/:id/dismiss ───────────────────────────────
    const dismissMatch = path.match(/\/alerts\/(\d+)\/dismiss/);
    if (dismissMatch && req.method === 'PUT') {
      const id = dismissMatch[1];
      await zcql.executeZCQLQuery(`UPDATE Alerts SET is_active = false WHERE ROWID = ${id}`);
      res.status(200).json({ status: 'success', message: 'Alert dismissed' });
      return;
    }

    // ── POST /alerts ──────────────────────────────────────────
    if (req.method === 'POST') {
      const body = req.body;
      const table = app.datastore().table('Alerts');
      await table.insertRow({
        district_id: body.district_id,
        crime_type: body.crime_type,
        alert_level: body.alert_level,
        message: body.message,
        z_score: body.z_score,
        created_at: new Date().toISOString(),
        is_active: true
      });
      res.status(201).json({ status: 'success', message: 'Alert created' });
      return;
    }

    // ── GET /alerts ───────────────────────────────────────────
    const { active } = req.query;
    let query = `SELECT a.*, d.name as district_name FROM Alerts a LEFT JOIN Districts d ON a.district_id = d.ROWID`;
    if (active === 'true') query += ` WHERE a.is_active = true`;
    query += ` ORDER BY a.created_at DESC LIMIT 50`;

    const rows = await zcql.executeZCQLQuery(query);
    const data = rows.map(r => ({ ...r.Alerts, district: r.Districts?.name }));
    res.status(200).json({ status: 'success', count: data.length, data });

  } catch (err) {
    console.error('alerts-api error:', err);
    res.status(500).json({ status: 'error', message: err.message });
  }
};
