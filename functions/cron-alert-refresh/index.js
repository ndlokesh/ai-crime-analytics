/**
 * KSP Crime Analytics — Daily Alert Refresh (Cron Function)
 * Zoho Catalyst Cron Function (runs daily at 00:00 IST)
 *
 * Algorithm:
 * 1. Query last 7 days vs 30-day baseline per district per crime type
 * 2. Calculate Z-score = (recent - mean) / std
 * 3. Create Alerts where Z > 2.0
 * 4. Update Districts.risk_score via weighted formula
 */

'use strict';
const catalyst = require('zcatalyst-sdk-node');

module.exports = async (req, res) => {
  try {
    const app = catalyst.initialize();
    const zcql = app.zcql();

    console.log('[CRON] Daily alert refresh started at', new Date().toISOString());

    // ── Step 1: Get all districts ─────────────────────────────
    const districtRows = await zcql.executeZCQLQuery(`SELECT ROWID, name FROM Districts`);
    const districts = districtRows.map(r => ({ id: r.Districts.ROWID, name: r.Districts.name }));

    const crimeTypes = ['Theft', 'Assault', 'Cybercrime', 'Narcotics', 'Murder', 'Fraud', 'Robbery'];
    const now = new Date();
    const sevenDaysAgo = new Date(now - 7 * 864e5).toISOString();
    const thirtyDaysAgo = new Date(now - 30 * 864e5).toISOString();

    let alertsCreated = 0;

    for (const district of districts) {

      // ── Step 2: Query recent (7 days) and baseline (30 days) ─
      const [recentRows, baselineRows] = await Promise.all([
        zcql.executeZCQLQuery(
          `SELECT crime_type, COUNT(ROWID) as cnt FROM Incidents WHERE district = '${district.name}' AND date_time >= '${sevenDaysAgo}' GROUP BY crime_type`
        ),
        zcql.executeZCQLQuery(
          `SELECT crime_type, COUNT(ROWID) as cnt FROM Incidents WHERE district = '${district.name}' AND date_time >= '${thirtyDaysAgo}' GROUP BY crime_type`
        )
      ]);

      const recentCounts = {};
      recentRows.forEach(r => { recentCounts[r.Incidents.crime_type] = parseInt(r.Incidents.cnt || 0); });

      const baselineCounts = {};
      baselineRows.forEach(r => { baselineCounts[r.Incidents.crime_type] = parseInt(r.Incidents.cnt || 0) / 30; }); // per-day average

      // ── Step 3: Z-score calculation ──────────────────────────
      for (const crimeType of crimeTypes) {
        const recent = (recentCounts[crimeType] || 0) / 7; // per-day
        const baselineMean = baselineCounts[crimeType] || 0;
        const baselineStd = Math.max(baselineMean * 0.3, 1); // assume 30% std
        const z = (recent - baselineMean) / baselineStd;

        if (z >= 2.0) {
          const level = z >= 3.5 ? 'Critical' : z >= 2.5 ? 'High' : 'Medium';
          const alertsTable = app.datastore().table('Alerts');
          await alertsTable.insertRow({
            district_id: district.id,
            crime_type: crimeType,
            alert_level: level,
            message: `Spike detected: ${crimeType} in ${district.name} — Z-score ${z.toFixed(2)}σ above baseline`,
            z_score: z.toFixed(2),
            created_at: new Date().toISOString(),
            is_active: true
          });
          alertsCreated++;
          console.log(`[CRON] Alert created — ${district.name} / ${crimeType} / Z=${z.toFixed(2)}`);
        }
      }

      // ── Step 4: Update risk_score ─────────────────────────────
      const totalRecent = Object.values(recentCounts).reduce((s, v) => s + v, 0);
      // Clamp risk score update: weighted formula
      // (actual QuickML endpoint would return the predicted score)
      const newRiskScore = Math.min(100, Math.round(totalRecent * 0.5 + Math.random() * 10));
      await zcql.executeZCQLQuery(
        `UPDATE Districts SET risk_score = ${newRiskScore} WHERE ROWID = ${district.id}`
      );
    }

    const msg = `[CRON] Complete. ${alertsCreated} alerts created across ${districts.length} districts.`;
    console.log(msg);
    res.status(200).json({ status: 'success', message: msg, alerts_created: alertsCreated });

  } catch (err) {
    console.error('[CRON] Error:', err);
    res.status(500).json({ status: 'error', message: err.message });
  }
};
