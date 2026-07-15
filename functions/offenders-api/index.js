/**
 * KSP Crime Analytics — Offenders API
 * Zoho Catalyst Advanced I/O Serverless Function (Node.js)
 */

'use strict';
const catalyst = require('zcatalyst-sdk-node');

module.exports = async (req, res) => {
  res.set('Access-Control-Allow-Origin', '*');
  res.set('Access-Control-Allow-Methods', 'GET, OPTIONS');
  res.set('Access-Control-Allow-Headers', 'Content-Type, Authorization');
  if (req.method === 'OPTIONS') { res.status(204).send(''); return; }

  try {
    const app = catalyst.initialize(req);
    const zcql = app.zcql();
    const path = req.path || '';

    // ── GET /offenders/network ────────────────────────────────
    if (path.includes('network')) {
      const [offRows, netRows] = await Promise.all([
        zcql.executeZCQLQuery(`SELECT * FROM Offenders LIMIT 80`),
        zcql.executeZCQLQuery(`SELECT * FROM OffenderNetwork LIMIT 200`)
      ]);
      const nodes = offRows.map(r => ({
        id: r.Offenders.offender_id,
        name: r.Offenders.name,
        type: 'suspect',
        district: r.Offenders.district,
        repeat_count: parseInt(r.Offenders.repeat_count || 0),
        mo: JSON.parse(r.Offenders.modus_operandi || '[]'),
        age: parseInt(r.Offenders.age || 0),
        active: r.Offenders.active === 'true'
      }));
      const links = netRows.map(r => ({
        source: r.OffenderNetwork.offender_a,
        target: r.OffenderNetwork.offender_b,
        strength: parseFloat(r.OffenderNetwork.strength || 0.5),
        type: r.OffenderNetwork.association_type
      }));
      res.status(200).json({ status: 'success', data: { nodes, links } });
      return;
    }

    // ── GET /offenders/:id ────────────────────────────────────
    const idMatch = path.match(/\/offenders\/([A-Z0-9\-]+)/);
    if (idMatch) {
      const id = idMatch[1];
      const rows = await zcql.executeZCQLQuery(
        `SELECT * FROM Offenders WHERE offender_id = '${id.replace(/'/g,"''")}'`
      );
      if (!rows.length) { res.status(404).json({ status: 'error', message: 'Offender not found' }); return; }
      res.status(200).json({ status: 'success', data: rows[0].Offenders });
      return;
    }

    // ── GET /offenders ────────────────────────────────────────
    const { search, district, mo } = req.query;
    let conditions = [];
    if (district) conditions.push(`district = '${district.replace(/'/g,"''")}'`);
    const where = conditions.length ? `WHERE ${conditions.join(' AND ')}` : '';
    const rows = await zcql.executeZCQLQuery(`SELECT * FROM Offenders ${where} LIMIT 200`);

    let offenders = rows.map(r => ({
      ...r.Offenders,
      modus_operandi: JSON.parse(r.Offenders.modus_operandi || '[]'),
      repeat_count: parseInt(r.Offenders.repeat_count || 0)
    }));

    if (search) {
      const s = search.toLowerCase();
      offenders = offenders.filter(o => o.name.toLowerCase().includes(s));
    }

    res.status(200).json({ status: 'success', count: offenders.length, data: offenders });

  } catch (err) {
    console.error('offenders-api error:', err);
    res.status(500).json({ status: 'error', message: err.message });
  }
};
