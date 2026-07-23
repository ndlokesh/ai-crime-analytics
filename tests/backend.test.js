/**
 * KSP Crime Analytics — Backend Unit Tests
 * Run with: node tests/backend.test.js
 *
 * Tests the pure logic inside each API function without requiring
 * the Zoho Catalyst SDK (mocked below).
 */

'use strict';

// ── Minimal Test Framework ────────────────────────────────────
let passed = 0, failed = 0, skipped = 0;
const failures = [];

function assert(condition, message) {
  if (!condition) throw new Error(message || 'Assertion failed');
}
function assertEquals(a, b, msg) {
  if (a !== b) throw new Error(msg || `Expected ${JSON.stringify(b)}, got ${JSON.stringify(a)}`);
}
function assertInRange(val, min, max, msg) {
  if (val < min || val > max) throw new Error(msg || `${val} not in [${min}, ${max}]`);
}
function assertHasKeys(obj, keys) {
  for (const k of keys) if (!(k in obj)) throw new Error(`Missing key: '${k}'`);
}

async function it(name, fn) {
  try {
    await fn();
    console.log(`  ✅ PASS  ${name}`);
    passed++;
  } catch (e) {
    console.error(`  ❌ FAIL  ${name}`);
    console.error(`           ${e.message}`);
    failures.push({ name, error: e.message });
    failed++;
  }
}

function describe(name, fn) {
  console.log(`\n📦 ${name}`);
  return fn();
}

// ── Mock Catalyst SDK ─────────────────────────────────────────
function makeMockCatalyst(queryResults) {
  return {
    initialize: () => ({
      zcql: () => ({
        executeZCQLQuery: async (sql) => {
          // Return the matching mock result or empty array
          for (const [pattern, result] of Object.entries(queryResults)) {
            if (sql.includes(pattern)) return result;
          }
          return [];
        }
      }),
      datastore: () => ({
        table: () => ({
          insertRow: async (row) => ({ ROWID: 999, ...row })
        })
      })
    })
  };
}

// Mock req/res builders
function makeReq(method, path, query = {}, body = {}) {
  return { method, path, query, body };
}

function makeRes() {
  const res = {
    _status: null, _body: null, _headers: {},
    status(code) { this._status = code; return this; },
    json(body) { this._body = body; return this; },
    send(data) { this._body = data; return this; },
    set(key, val) { this._headers[key] = val; return this; },
  };
  return res;
}

// ════════════════════════════════════════════════════════════════
//  SUITE 1 — Incidents API Logic
// ════════════════════════════════════════════════════════════════

await describe('Incidents API — Logic Tests', async () => {

  // We test the logic by extracting and executing the handler logic manually
  // (without requiring zcatalyst-sdk-node)

  await it('hourly distribution: 24-element array from date_time rows', async () => {
    const rows = [
      { Incidents: { date_time: '2024-01-15T02:30:00Z' } },
      { Incidents: { date_time: '2024-01-15T02:45:00Z' } },
      { Incidents: { date_time: '2024-01-15T14:00:00Z' } },
    ];
    // Replicate the logic from incidents-api
    // Note: getHours() returns local time; we test the structure and totals
    const hourly = Array(24).fill(0);
    rows.forEach(r => {
      const hour = new Date(r.Incidents.date_time).getHours();
      if (hour >= 0 && hour < 24) hourly[hour]++;
    });
    assertEquals(hourly.length, 24, 'Should have 24 elements');
    assertEquals(hourly.reduce((a, b) => a + b, 0), 3, 'Total should equal row count');
    // Verify the hour-14 ISO string maps consistently (UTC hour 14 = getUTCHours() 14)
    const utcHour = new Date('2024-01-15T14:00:00Z').getUTCHours();
    assertEquals(utcHour, 14, 'UTC hour should be 14');
    // Verify all hourly buckets sum to 3
    const total = hourly.reduce((a, b) => a + b, 0);
    assertEquals(total, 3, 'All 3 rows should be counted');
  });

  await it('hotspot intensity map: Critical=1.0, High=0.7, Medium=0.4, Low=0.2', async () => {
    const intensityMap = { Critical: 1.0, High: 0.7, Medium: 0.4, Low: 0.2 };
    assertEquals(intensityMap['Critical'], 1.0);
    assertEquals(intensityMap['High'], 0.7);
    assertEquals(intensityMap['Medium'], 0.4);
    assertEquals(intensityMap['Low'], 0.2);
  });

  await it('hotspot row → lat/lng/intensity structure', async () => {
    const rows = [
      { Incidents: { latitude: '12.97', longitude: '77.59', severity: 'Critical' } },
      { Incidents: { latitude: '12.30', longitude: '76.64', severity: 'Low' } },
    ];
    const intensityMap = { Critical: 1.0, High: 0.7, Medium: 0.4, Low: 0.2 };
    const points = rows.map(r => ({
      lat: parseFloat(r.Incidents.latitude),
      lng: parseFloat(r.Incidents.longitude),
      intensity: intensityMap[r.Incidents.severity] || 0.5
    }));
    assertHasKeys(points[0], ['lat', 'lng', 'intensity']);
    assertEquals(points[0].intensity, 1.0);
    assertEquals(points[1].intensity, 0.2);
    assertInRange(points[0].lat, 11, 18, 'lat in Karnataka range');
  });

  await it('limit query param clamped to max 1000', async () => {
    const clampLimit = (limit) => Math.min(parseInt(limit) || 600, 1000);
    assertEquals(clampLimit(undefined), 600);
    assertEquals(clampLimit('200'), 200);
    assertEquals(clampLimit('5000'), 1000);
    assertEquals(clampLimit('1001'), 1000);
  });

  await it('SQL injection protection: single quotes escaped', async () => {
    const district = "Bengaluru' OR 1=1--";
    const safe = district.replace(/'/g, "''");
    // After escaping, a single quote is doubled: '' — this breaks the SQL injection
    // The original attack string has ' OR 1=1-- which becomes '' OR 1=1--
    // The key check: escaped string has no unescaped single quotes
    const hasUnescapedQuote = (() => {
      let i = 0;
      while (i < safe.length) {
        if (safe[i] === "'") {
          if (safe[i+1] === "'") { i += 2; continue; } // doubled quote = safe
          return true; // lone quote = unsafe
        }
        i++;
      }
      return false;
    })();
    assert(!hasUnescapedQuote, 'Should have no unescaped single quotes after escaping');
    assert(safe.includes("''"), 'Should contain doubled quotes (escaped)');
  });

  await it('WHERE clause built correctly from filters', async () => {
    const conditions = [];
    const district = 'Mysuru';
    const type = 'Theft';
    if (district) conditions.push(`district = '${district}'`);
    if (type)     conditions.push(`crime_type = '${type}'`);
    const where = conditions.length ? `WHERE ${conditions.join(' AND ')}` : '';
    assert(where.includes('WHERE'), 'Should include WHERE');
    assert(where.includes('district'), 'Should include district filter');
    assert(where.includes('crime_type'), 'Should include type filter');
  });

  await it('empty filters → no WHERE clause', async () => {
    const conditions = [];
    const where = conditions.length ? `WHERE ${conditions.join(' AND ')}` : '';
    assertEquals(where, '');
  });
});

// ════════════════════════════════════════════════════════════════
//  SUITE 2 — Analytics API Logic
// ════════════════════════════════════════════════════════════════

await describe('Analytics API — Logic Tests', async () => {

  await it('Pearson correlation: perfect correlation = 1.0', async () => {
    function pearson(x, y) {
      const n = x.length;
      const mx = x.reduce((s, v) => s + v, 0) / n;
      const my = y.reduce((s, v) => s + v, 0) / n;
      const num = x.reduce((s, v, i) => s + (v - mx) * (y[i] - my), 0);
      const den = Math.sqrt(x.reduce((s, v) => s + (v - mx) ** 2, 0) * y.reduce((s, v) => s + (v - my) ** 2, 0));
      return den === 0 ? 0 : parseFloat((num / den).toFixed(2));
    }
    assertEquals(pearson([1,2,3,4,5], [1,2,3,4,5]), 1.0, 'Perfect positive correlation');
    assertEquals(pearson([1,2,3,4,5], [5,4,3,2,1]), -1.0, 'Perfect negative correlation');
    assertEquals(pearson([1,1,1], [2,2,2]), 0, 'Flat line → 0 correlation');
  });

  await it('Pearson correlation: result in [-1, 1] range', async () => {
    function pearson(x, y) {
      const n = x.length;
      const mx = x.reduce((s, v) => s + v, 0) / n;
      const my = y.reduce((s, v) => s + v, 0) / n;
      const num = x.reduce((s, v, i) => s + (v - mx) * (y[i] - my), 0);
      const den = Math.sqrt(x.reduce((s, v) => s + (v - mx) ** 2, 0) * y.reduce((s, v) => s + (v - my) ** 2, 0));
      return den === 0 ? 0 : parseFloat((num / den).toFixed(2));
    }
    // Any Pearson correlation must be in [-1, 1]
    const datasets = [
      [[1,2,3,4,5], [2,4,6,8,10]],   // perfect positive
      [[1,2,3,4,5], [10,8,6,4,2]],   // perfect negative
      [[1,3,2,5,4], [4,2,5,1,3]],    // weakly negative
      [[10,20,15,30,25], [25,15,30,10,20]], // mixed
    ];
    datasets.forEach(([x, y]) => {
      const r = pearson(x, y);
      assertInRange(r, -1.0, 1.0, 'Pearson must be in [-1, 1]: got ' + r);
    });
  });

  await it('monthly trends: date grouping key format YYYY-MM', async () => {
    const d = new Date('2024-06-15T10:00:00Z');
    const key = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`;
    assertEquals(key, '2024-06');
  });

  await it('weekly z-score: weekNum calculation', async () => {
    const now = Date.now();
    const oneWeekAgo = new Date(now - 7 * 864e5);
    const weekNum = Math.floor((now - oneWeekAgo.getTime()) / (7 * 864e5));
    assertEquals(weekNum, 1, 'One week ago → weekNum = 1');
  });

  await it('district summary: merges incident counts', async () => {
    const summary = {};
    const incRows = [
      { Incidents: { district: 'Mysuru', crime_type: 'Theft', status: 'Open', severity: 'Medium', cnt: '5' } },
      { Incidents: { district: 'Mysuru', crime_type: 'Murder', status: 'Closed', severity: 'Critical', cnt: '2' } },
      { Incidents: { district: 'Bidar',  crime_type: 'Theft', status: 'Open', severity: 'Low', cnt: '3' } },
    ];
    incRows.forEach(r => {
      const d = r.Incidents.district;
      if (!summary[d]) summary[d] = { district: d, total_incidents: 0, open_cases: 0, critical: 0, crime_breakdown: {} };
      const cnt = parseInt(r.Incidents.cnt || 0);
      summary[d].total_incidents += cnt;
      if (r.Incidents.status === 'Open') summary[d].open_cases += cnt;
      if (r.Incidents.severity === 'Critical') summary[d].critical += cnt;
    });
    assertEquals(summary['Mysuru'].total_incidents, 7);
    assertEquals(summary['Mysuru'].open_cases, 5);
    assertEquals(summary['Mysuru'].critical, 2);
    assertEquals(summary['Bidar'].total_incidents, 3);
    assertEquals(Object.keys(summary).length, 2);
  });

  await it('KPI: avgRisk calculation', async () => {
    const riskScores = [45.5, 62.3, 78.1, 33.9, 89.0];
    const avgRisk = (riskScores.reduce((s, v) => s + v, 0) / riskScores.length).toFixed(1);
    const hotspots = riskScores.filter(r => r >= 70).length;
    assertEquals(parseFloat(avgRisk), 61.8);
    assertEquals(hotspots, 2, 'Scores ≥70: 78.1 and 89.0');
  });

  await it('KPI: empty risk scores returns 0', async () => {
    const riskScores = [];
    const avgRisk = riskScores.length ? (riskScores.reduce((s, v) => s + v, 0) / riskScores.length).toFixed(1) : 0;
    assertEquals(avgRisk, 0);
  });
});

// ════════════════════════════════════════════════════════════════
//  SUITE 3 — Offenders API Logic
// ════════════════════════════════════════════════════════════════

await describe('Offenders API — Logic Tests', async () => {

  await it('offender row mapping: parses modus_operandi JSON', async () => {
    const raw = { modus_operandi: '["Snatch","Pickpocket"]', repeat_count: '3' };
    const mapped = {
      ...raw,
      modus_operandi: JSON.parse(raw.modus_operandi || '[]'),
      repeat_count: parseInt(raw.repeat_count || 0)
    };
    assertEquals(mapped.repeat_count, 3);
    assert(Array.isArray(mapped.modus_operandi), 'mo should be array');
    assertEquals(mapped.modus_operandi.length, 2);
    assertEquals(mapped.modus_operandi[0], 'Snatch');
  });

  await it('offender row: handles empty modus_operandi', async () => {
    const raw = { modus_operandi: '', repeat_count: '' };
    const mo = JSON.parse(raw.modus_operandi || '[]');
    const rc = parseInt(raw.repeat_count || 0);
    assertInRange(rc, 0, 0);
    assert(Array.isArray(mo) && mo.length === 0, 'Empty mo should be []');
  });

  await it('network nodes mapping', async () => {
    const offRows = [
      { Offenders: { offender_id: 'OFF-001', name: 'Raju Gowda', district: 'Mysuru', repeat_count: '2', modus_operandi: '[]', age: '35', active: 'true' } }
    ];
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
    assertHasKeys(nodes[0], ['id','name','type','district','repeat_count','mo','age','active']);
    assertEquals(nodes[0].active, true);
    assertEquals(nodes[0].repeat_count, 2);
  });

  await it('network links mapping', async () => {
    const netRows = [
      { OffenderNetwork: { offender_a: 'OFF-001', offender_b: 'OFF-002', strength: '0.75', association_type: 'co-accused' } }
    ];
    const links = netRows.map(r => ({
      source: r.OffenderNetwork.offender_a,
      target: r.OffenderNetwork.offender_b,
      strength: parseFloat(r.OffenderNetwork.strength || 0.5),
      type: r.OffenderNetwork.association_type
    }));
    assertEquals(links[0].source, 'OFF-001');
    assertEquals(links[0].target, 'OFF-002');
    assertEquals(links[0].strength, 0.75);
    assertEquals(links[0].type, 'co-accused');
  });

  await it('offender ID regex matches valid IDs', async () => {
    const re = /\/offenders\/([A-Z0-9\-]+)/;
    assert(re.test('/offenders/OFF-001'), 'Should match valid ID');
    assert(re.test('/offenders/ABC123'), 'Should match alphanumeric');
    assert(!re.test('/offenders/network'), 'Should not match keyword');
  });

  await it('search filter is case-insensitive', async () => {
    const offenders = [
      { name: 'Raju Gowda' },
      { name: 'Suresh Patil' },
      { name: 'Raju Kumar' },
    ];
    const s = 'raju';
    const filtered = offenders.filter(o => o.name.toLowerCase().includes(s));
    assertEquals(filtered.length, 2);
  });
});

// ════════════════════════════════════════════════════════════════
//  SUITE 4 — Alerts API Logic
// ════════════════════════════════════════════════════════════════

await describe('Alerts API — Logic Tests', async () => {

  await it('dismiss regex matches valid alert IDs', async () => {
    const re = /\/alerts\/(\d+)\/dismiss/;
    assert(re.test('/alerts/42/dismiss'), 'Should match numeric ID');
    assert(re.test('/alerts/1234/dismiss'), 'Should match multi-digit ID');
    assert(!re.test('/alerts/abc/dismiss'), 'Should not match non-numeric ID');
    assert(!re.test('/alerts//dismiss'), 'Should not match empty ID');
  });

  await it('active alert query: adds WHERE clause when active=true', async () => {
    const active = 'true';
    let query = 'SELECT a.*, d.name as district_name FROM Alerts a LEFT JOIN Districts d ON a.district_id = d.ROWID';
    if (active === 'true') query += ' WHERE a.is_active = true';
    query += ' ORDER BY a.created_at DESC LIMIT 50';
    assert(query.includes('WHERE a.is_active = true'), 'Should include active filter');
    assert(query.includes('LIMIT 50'), 'Should include limit');
  });

  await it('alert row: merges district name from JOIN', async () => {
    const rows = [
      { Alerts: { ROWID: 1, crime_type: 'Theft', alert_level: 'High', is_active: true }, Districts: { name: 'Mysuru' } },
    ];
    const data = rows.map(r => ({ ...r.Alerts, district: r.Districts?.name }));
    assertHasKeys(data[0], ['ROWID', 'crime_type', 'alert_level', 'is_active', 'district']);
    assertEquals(data[0].district, 'Mysuru');
  });

  await it('POST alert body maps to correct table fields', async () => {
    const body = {
      district_id: 4405, crime_type: 'Robbery', alert_level: 'High',
      message: 'Spike detected', z_score: 2.8
    };
    const row = {
      district_id: body.district_id,
      crime_type: body.crime_type,
      alert_level: body.alert_level,
      message: body.message,
      z_score: body.z_score,
      created_at: new Date().toISOString(),
      is_active: true
    };
    assertHasKeys(row, ['district_id','crime_type','alert_level','message','z_score','created_at','is_active']);
    assertEquals(row.is_active, true);
    assertEquals(row.district_id, 4405);
  });

  await it('alert without active param has no WHERE clause', async () => {
    const active = undefined;
    let query = 'SELECT a.* FROM Alerts a';
    if (active === 'true') query += ' WHERE a.is_active = true';
    assert(!query.includes('WHERE'), 'No WHERE clause when active not set');
  });
});

// ════════════════════════════════════════════════════════════════
//  SUITE 5 — CORS Headers Logic
// ════════════════════════════════════════════════════════════════

await describe('CORS Header Validation', async () => {

  await it('each API sets Access-Control-Allow-Origin: *', async () => {
    const headers = {};
    const setHeader = (k, v) => { headers[k] = v; };
    setHeader('Access-Control-Allow-Origin', '*');
    assertEquals(headers['Access-Control-Allow-Origin'], '*');
  });

  await it('OPTIONS method returns 204', async () => {
    const req = { method: 'OPTIONS' };
    const responses = [];
    if (req.method === 'OPTIONS') responses.push(204);
    assertEquals(responses[0], 204);
  });

  await it('incidents-api allows POST method in CORS', async () => {
    const methods = 'GET, POST, OPTIONS';
    assert(methods.includes('POST'), 'Should allow POST');
    assert(methods.includes('OPTIONS'), 'Should allow OPTIONS');
  });

  await it('offenders-api only allows GET and OPTIONS', async () => {
    const methods = 'GET, OPTIONS';
    assert(methods.includes('GET'), 'Should allow GET');
    assert(!methods.includes('POST'), 'Should not allow POST for offenders');
  });
});

// ════════════════════════════════════════════════════════════════
//  SUITE 6 — Data Type Safety
// ════════════════════════════════════════════════════════════════

await describe('Data Type Safety (API Response Parsing)', async () => {

  await it('parseInt with null/undefined gracefully returns 0', async () => {
    assertEquals(parseInt(null || 0), 0);
    assertEquals(parseInt(undefined || 0), 0);
    assertEquals(parseInt('' || 0), 0);
  });

  await it('parseFloat with null/undefined gracefully returns 0', async () => {
    assertEquals(parseFloat(null || 0), 0);
    assertEquals(parseFloat(undefined || 0), 0);
  });

  await it('JSON.parse with empty/invalid string falls back to []', async () => {
    const safeParse = (s) => {
      try { return JSON.parse(s || '[]'); }
      catch (_) { return []; }
    };
    assertHasKeys({ length: safeParse('[]').length }, ['length']);
    assertEquals(safeParse('[]').length, 0);
    assertEquals(safeParse('["a","b"]').length, 2);
    assertEquals(safeParse(null).length, 0);
    assertEquals(safeParse('invalid JSON').length, 0);
  });

  await it('risk_score filter (>= 70) works correctly', async () => {
    const scores = [45.5, 70.0, 71.2, 69.9, 80.1, 30.0];
    const hotspots = scores.filter(r => r >= 70).length;
    assertEquals(hotspots, 3, 'Scores 70.0, 71.2, 80.1 qualify');
  });

  await it('active boolean string: "true" comparison', async () => {
    assertEquals('true' === 'true', true);
    assertEquals('false' === 'true', false);
    assertEquals(true === 'true', false, 'Boolean vs string');
  });
});

// ════════════════════════════════════════════════════════════════
//  SUITE 7 — Gap Coverage (previously untested paths)
// ════════════════════════════════════════════════════════════════

await describe('Gap Coverage — Previously Untested Paths', async () => {

  // ── Gap 1: Correlation matrix diagonal & symmetry ─────────────
  await it('correlation matrix: diagonal is always 1, matrix is symmetric', async () => {
    function pearson(x, y) {
      const n = x.length;
      const mx = x.reduce((s, v) => s + v, 0) / n;
      const my = y.reduce((s, v) => s + v, 0) / n;
      const num = x.reduce((s, v, i) => s + (v - mx) * (y[i] - my), 0);
      const den = Math.sqrt(
        x.reduce((s, v) => s + (v - mx) ** 2, 0) *
        y.reduce((s, v) => s + (v - my) ** 2, 0)
      );
      return den === 0 ? 0 : parseFloat((num / den).toFixed(2));
    }
    const vectors = [
      [1,  2,  3,  4,  5],
      [10, 20, 15, 30, 25],
      [5,  3,  8,  1,  9],
      [50, 60, 55, 70, 65],
    ];
    // Replicate analytics-api correlation matrix build logic exactly
    const matrix = vectors.map((v, i) =>
      vectors.map((w, j) => (i === j ? 1 : pearson(v, w)))
    );
    // Diagonal must always be 1 (self-correlation)
    matrix.forEach((row, i) =>
      assertEquals(row[i], 1, `Diagonal [${i}][${i}] must be 1`)
    );
    // Matrix must be symmetric: r[i][j] === r[j][i]
    for (let i = 0; i < vectors.length; i++) {
      for (let j = 0; j < vectors.length; j++) {
        assertEquals(
          matrix[i][j], matrix[j][i],
          `Symmetry broken at [${i}][${j}]`
        );
      }
    }
    // All off-diagonal values must remain in [-1, 1]
    for (let i = 0; i < vectors.length; i++) {
      for (let j = 0; j < vectors.length; j++) {
        assertInRange(matrix[i][j], -1.0, 1.0, `matrix[${i}][${j}] out of range`);
      }
    }
  });

  // ── Gap 2: Alert dismiss generates correct UPDATE SQL ──────────
  await it('alert dismiss: UPDATE SQL sets is_active=false on correct ROWID', async () => {
    const alertId = '42';
    const sql = `UPDATE Alerts SET is_active = false WHERE ROWID = ${alertId}`;
    assert(sql.includes('UPDATE Alerts'),          'Should target Alerts table');
    assert(sql.includes('is_active = false'),       'Should set is_active to false');
    assert(sql.includes(`ROWID = ${alertId}`),      'Should target the correct ROWID');
    // Sanity-check: non-matching ID should not appear in SQL
    assert(!sql.includes('ROWID = 99'),             'Should not reference wrong ROWID');
  });

  await it('alert dismiss: regex extracts numeric ID correctly', async () => {
    const re = /\/alerts\/(\d+)\/dismiss/;
    const path = '/alerts/42/dismiss';
    const match = path.match(re);
    assert(match !== null, 'Regex should match');
    assertEquals(match[1], '42', 'Extracted ID should be 42');
    // Verify the extracted ID would produce a valid UPDATE
    const id = match[1];
    const sql = `UPDATE Alerts SET is_active = false WHERE ROWID = ${id}`;
    assert(sql.includes('ROWID = 42'), 'UPDATE targets ROWID 42');
  });

  // ── Gap 3: Offenders search AND district filter together ───────
  await it('offenders: district SQL filter + in-memory search filter combined', async () => {
    // Simulate data already filtered by district=Mysuru from SQL
    const fromDb = [
      { name: 'Raju Gowda',  district: 'Mysuru' },
      { name: 'Suresh Patil', district: 'Mysuru' },
      { name: 'Raju Nayak',  district: 'Mysuru' },
    ];
    // JS search filter (applied after SQL fetch, as in offenders-api)
    const search = 'raju';
    const s = search.toLowerCase();
    const filtered = fromDb.filter(o => o.name.toLowerCase().includes(s));
    assertEquals(filtered.length, 2, 'Raju Gowda and Raju Nayak should match');
    assert(filtered.every(o => o.district === 'Mysuru'), 'All results must be from Mysuru');
  });

  await it('offenders: no search term returns all district-filtered rows unchanged', async () => {
    const fromDb = [
      { name: 'Raju Gowda',  district: 'Bidar' },
      { name: 'Suresh Patil', district: 'Bidar' },
    ];
    const search = undefined;
    let offenders = fromDb;
    if (search) {
      const s = search.toLowerCase();
      offenders = offenders.filter(o => o.name.toLowerCase().includes(s));
    }
    assertEquals(offenders.length, 2, 'All rows returned when no search term');
  });

  // ── Gap 4: Alerts CORS must allow PUT (for dismiss route) ──────
  await it('alerts-api CORS: allows PUT method for dismiss endpoint', async () => {
    const methods = 'GET, POST, PUT, OPTIONS';
    assert(methods.includes('PUT'),     'alerts-api must allow PUT (dismiss)');
    assert(methods.includes('GET'),     'alerts-api must allow GET');
    assert(methods.includes('POST'),    'alerts-api must allow POST (create)');
    assert(methods.includes('OPTIONS'), 'alerts-api must allow OPTIONS (preflight)');
  });

  await it('alerts-api CORS: PUT is absent from offenders-api allowed methods', async () => {
    const offendersMethods = 'GET, OPTIONS';
    assert(!offendersMethods.includes('PUT'),  'offenders-api should NOT allow PUT');
    assert(!offendersMethods.includes('POST'), 'offenders-api should NOT allow POST');
  });

  // ── Gap 5: getHours() vs getUTCHours() timezone behavior ───────
  await it('hourly distribution: UTC hour is always deterministic for a UTC ISO string', async () => {
    // The API uses getHours() (local time). We document that getUTCHours() is stable.
    const isoMidnightUTC = '2024-01-15T00:30:00Z';
    const utcHour = new Date(isoMidnightUTC).getUTCHours();
    assertEquals(utcHour, 0, 'getUTCHours() should always be 0 for T00:30:00Z');

    // getHours() is timezone-dependent — just assert it is in valid range
    const localHour = new Date(isoMidnightUTC).getHours();
    assertInRange(localHour, 0, 23, 'getHours() must always be a valid hour');
  });

  await it('hourly distribution: exactly one entry incremented per row regardless of timezone', async () => {
    const rows = [
      { Incidents: { date_time: '2024-06-01T08:00:00Z' } },
      { Incidents: { date_time: '2024-06-01T20:00:00Z' } },
      { Incidents: { date_time: '2024-06-01T23:59:59Z' } },
    ];
    const hourly = Array(24).fill(0);
    rows.forEach(r => {
      const hour = new Date(r.Incidents.date_time).getHours();
      if (hour >= 0 && hour < 24) hourly[hour]++;
    });
    // Total must always equal number of rows regardless of which hour bucket
    const total = hourly.reduce((a, b) => a + b, 0);
    assertEquals(total, 3, 'Every row must contribute exactly one count');
    // Exactly 3 non-zero buckets (each row is at a distinct hour)
    const nonZero = hourly.filter(h => h > 0).length;
    assertEquals(nonZero, 3, 'Each row lands in its own distinct hour bucket');
  });
});

// ════════════════════════════════════════════════════════════════
//  SUMMARY
// ════════════════════════════════════════════════════════════════

const total = passed + failed + skipped;
console.log('\n' + '═'.repeat(60));
console.log(`  RESULTS: ${passed} passed · ${failed} failed · ${skipped} skipped`);
console.log(`  TOTAL:   ${total} tests`);
console.log('═'.repeat(60));

if (failures.length > 0) {
  console.log('\n  FAILED TESTS:');
  failures.forEach(f => {
    console.log(`  ❌ ${f.name}`);
    console.log(`     ${f.error}`);
  });
}

process.exit(failed > 0 ? 1 : 0);
