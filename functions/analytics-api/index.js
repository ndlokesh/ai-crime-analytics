/**
 * KSP Crime Analytics — Analytics API
 * Zoho Catalyst Advanced I/O Serverless Function (Node.js)
 *
 * Routes:
 *  GET /analytics/district-summary  → Aggregated district stats
 *  GET /analytics/trends            → Monthly breakdown
 *  GET /analytics/zscore            → Weekly Z-score data
 *  GET /analytics/kpi               → State-wide KPI totals
 *  GET /analytics/correlation       → Correlation matrix
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

    // ── GET /analytics/district-summary ──────────────────────
    if (path.includes('district-summary')) {
      const [incRows, distRows] = await Promise.all([
        zcql.executeZCQLQuery(`SELECT district, crime_type, status, severity, COUNT(ROWID) as cnt FROM Incidents GROUP BY district, crime_type, status, severity`),
        zcql.executeZCQLQuery(`SELECT * FROM Districts`)
      ]);

      const districtMap = {};
      distRows.forEach(r => { districtMap[r.Districts.ROWID] = r.Districts; });

      const summary = {};
      incRows.forEach(r => {
        const d = r.Incidents.district;
        if (!summary[d]) summary[d] = { district: d, total_incidents: 0, open_cases: 0, critical: 0, crime_breakdown: {} };
        const cnt = parseInt(r.Incidents.cnt || 0);
        summary[d].total_incidents += cnt;
        if (r.Incidents.status === 'Open') summary[d].open_cases += cnt;
        if (r.Incidents.severity === 'Critical') summary[d].critical += cnt;
        if (r.Incidents.crime_type) summary[d].crime_breakdown[r.Incidents.crime_type] = (summary[d].crime_breakdown[r.Incidents.crime_type] || 0) + cnt;
      });

      // Merge district socio-economic data
      Object.values(districtMap).forEach(d => {
        if (summary[d.name]) {
          summary[d.name].coordinates = [parseFloat(d.latitude), parseFloat(d.longitude)];
          summary[d.name].population = parseInt(d.population || 0);
          summary[d.name].urbanization_pct = parseFloat(d.urbanization_pct || 0);
          summary[d.name].literacy_pct = parseFloat(d.literacy_pct || 0);
          summary[d.name].unemployment_pct = parseFloat(d.unemployment_pct || 0);
          summary[d.name].risk_score = parseFloat(d.risk_score || 0);
        }
      });

      res.status(200).json({ status: 'success', data: Object.values(summary) });
      return;
    }

    // ── GET /analytics/kpi ────────────────────────────────────
    if (path.includes('kpi')) {
      const [totalRows, alertRows, openRows] = await Promise.all([
        zcql.executeZCQLQuery(`SELECT COUNT(ROWID) as cnt FROM Incidents`),
        zcql.executeZCQLQuery(`SELECT COUNT(ROWID) as cnt FROM Alerts WHERE is_active = true`),
        zcql.executeZCQLQuery(`SELECT COUNT(ROWID) as cnt FROM Incidents WHERE status = 'Open'`),
      ]);
      const distRows = await zcql.executeZCQLQuery(`SELECT risk_score FROM Districts`);
      const riskScores = distRows.map(r => parseFloat(r.Districts.risk_score || 0));
      const avgRisk = riskScores.length ? (riskScores.reduce((s, v) => s + v, 0) / riskScores.length).toFixed(1) : 0;
      const hotspots = riskScores.filter(r => r >= 70).length;

      res.status(200).json({
        status: 'success',
        data: {
          total_incidents:   parseInt(totalRows[0]?.Incidents?.cnt || 0),
          active_alerts:     parseInt(alertRows[0]?.Alerts?.cnt || 0),
          hotspot_districts: hotspots,
          avg_risk_score:    parseFloat(avgRisk),
          open_cases:        parseInt(openRows[0]?.Incidents?.cnt || 0),
        }
      });
      return;
    }

    // ── GET /analytics/trends ─────────────────────────────────
    if (path.includes('trends')) {
      const rows = await zcql.executeZCQLQuery(
        `SELECT crime_type, date_time FROM Incidents WHERE date_time >= '${new Date(Date.now() - 365 * 864e5).toISOString()}'`
      );
      const monthly = {};
      rows.forEach(r => {
        const d = new Date(r.Incidents.date_time);
        const key = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`;
        if (!monthly[key]) monthly[key] = {};
        const t = r.Incidents.crime_type;
        monthly[key][t] = (monthly[key][t] || 0) + 1;
      });
      res.status(200).json({ status: 'success', data: monthly });
      return;
    }

    // ── GET /analytics/zscore ─────────────────────────────────
    if (path.includes('zscore')) {
      const rows = await zcql.executeZCQLQuery(
        `SELECT crime_type, date_time FROM Incidents WHERE date_time >= '${new Date(Date.now() - 365 * 864e5).toISOString()}'`
      );
      const weekly = {};
      rows.forEach(r => {
        const d = new Date(r.Incidents.date_time);
        const weekNum = Math.floor((Date.now() - d.getTime()) / (7 * 864e5));
        const t = r.Incidents.crime_type;
        if (!weekly[t]) weekly[t] = Array(52).fill(0);
        if (weekNum >= 0 && weekNum < 52) weekly[t][weekNum]++;
      });
      res.status(200).json({ status: 'success', data: weekly });
      return;
    }

    // ── GET /analytics/correlation ────────────────────────────
    if (path.includes('correlation')) {
      // Pearson correlation computed server-side from Districts table
      const rows = await zcql.executeZCQLQuery(`SELECT unemployment_pct, urbanization_pct, literacy_pct, risk_score FROM Districts`);
      const vars = ['unemployment_pct', 'urbanization_pct', 'literacy_pct', 'risk_score'];
      const labels = ['Unemployment %', 'Urbanization %', 'Literacy %', 'Risk Score'];
      const vectors = vars.map(v => rows.map(r => parseFloat(r.Districts[v] || 0)));

      function pearson(x, y) {
        const n = x.length;
        const mx = x.reduce((s, v) => s + v, 0) / n;
        const my = y.reduce((s, v) => s + v, 0) / n;
        const num = x.reduce((s, v, i) => s + (v - mx) * (y[i] - my), 0);
        const den = Math.sqrt(x.reduce((s, v) => s + (v - mx) ** 2, 0) * y.reduce((s, v) => s + (v - my) ** 2, 0));
        return den === 0 ? 0 : parseFloat((num / den).toFixed(2));
      }

      const matrix = vectors.map((v, i) => vectors.map((w, j) => i === j ? 1 : pearson(v, w)));
      res.status(200).json({ status: 'success', data: { variables: labels, matrix } });
      return;
    }

    res.status(404).json({ status: 'error', message: 'Route not found' });

  } catch (err) {
    console.error('analytics-api error:', err);
    res.status(500).json({ status: 'error', message: err.message });
  }
};
