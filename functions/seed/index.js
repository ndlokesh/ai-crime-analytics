/**
 * KSP Crime Analytics — DataStore Seed Script
 * Run once to populate Catalyst DataStore with 600 synthetic Karnataka crime records.
 *
 * Usage:
 *   node functions/seed/index.js
 *
 * Requires:
 *   - CATALYST_PROJECT_KEY env var (get from Catalyst console > Project Settings)
 *   - CATALYST_AUTH_TOKEN env var (get from Catalyst console > User Management)
 */

'use strict';

const DISTRICTS = [
  { name: 'Bagalkot',         lat: 16.1833, lng: 75.7000, pop: 1890826, urban: 28.5, literacy: 67.8, unemployment: 8.2 },
  { name: 'Ballari',          lat: 15.1394, lng: 76.9214, pop: 2531592, urban: 45.2, literacy: 69.1, unemployment: 10.5 },
  { name: 'Belagavi',         lat: 15.8497, lng: 74.4977, pop: 4779661, urban: 32.8, literacy: 74.3, unemployment: 7.4 },
  { name: 'Bengaluru Rural',  lat: 13.2189, lng: 77.5733, pop: 987257,  urban: 22.1, literacy: 78.4, unemployment: 5.9 },
  { name: 'Bengaluru Urban',  lat: 12.9716, lng: 77.5946, pop: 9621551, urban: 91.5, literacy: 89.2, unemployment: 4.2 },
  { name: 'Bidar',            lat: 17.9104, lng: 76.9247, pop: 1726078, urban: 29.4, literacy: 69.4, unemployment: 12.1 },
  { name: 'Chamarajanagar',   lat: 11.9261, lng: 76.9451, pop: 1020791, urban: 18.7, literacy: 57.2, unemployment: 9.8 },
  { name: 'Chikkaballapura',  lat: 13.4355, lng: 77.7315, pop: 1254044, urban: 24.3, literacy: 75.1, unemployment: 7.6 },
  { name: 'Chikkamagaluru',   lat: 13.3161, lng: 75.7765, pop: 1137754, urban: 29.8, literacy: 79.8, unemployment: 5.4 },
  { name: 'Chitradurga',      lat: 14.2272, lng: 76.3975, pop: 1660378, urban: 27.9, literacy: 73.1, unemployment: 8.9 },
  { name: 'Dakshina Kannada', lat: 12.8703, lng: 75.3405, pop: 2089649, urban: 44.2, literacy: 88.6, unemployment: 5.1 },
  { name: 'Davangere',        lat: 14.4644, lng: 75.9218, pop: 1946905, urban: 37.4, literacy: 75.3, unemployment: 9.3 },
  { name: 'Dharwad',          lat: 15.4589, lng: 75.0078, pop: 1848408, urban: 54.2, literacy: 80.2, unemployment: 6.8 },
  { name: 'Gadag',            lat: 15.4166, lng: 75.6339, pop: 1065235, urban: 30.5, literacy: 73.8, unemployment: 9.1 },
  { name: 'Hassan',           lat: 13.0068, lng: 76.0996, pop: 1776421, urban: 22.4, literacy: 77.4, unemployment: 6.2 },
  { name: 'Haveri',           lat: 14.7957, lng: 75.4036, pop: 1598131, urban: 24.8, literacy: 72.6, unemployment: 8.4 },
  { name: 'Kalaburagi',       lat: 17.3297, lng: 76.8200, pop: 2566326, urban: 35.9, literacy: 63.1, unemployment: 14.2 },
  { name: 'Kodagu',           lat: 12.4217, lng: 75.7397, pop: 554762,  urban: 29.1, literacy: 82.6, unemployment: 4.8 },
  { name: 'Kolar',            lat: 13.1358, lng: 78.1294, pop: 1540596, urban: 26.2, literacy: 74.9, unemployment: 8.7 },
  { name: 'Koppal',           lat: 15.3534, lng: 76.1549, pop: 1388990, urban: 22.3, literacy: 64.7, unemployment: 11.8 },
  { name: 'Mandya',           lat: 12.5218, lng: 76.8951, pop: 1807318, urban: 20.4, literacy: 75.8, unemployment: 7.1 },
  { name: 'Mysuru',           lat: 12.2958, lng: 76.6394, pop: 3001127, urban: 50.3, literacy: 79.3, unemployment: 6.4 },
  { name: 'Raichur',          lat: 16.2120, lng: 77.3439, pop: 1924773, urban: 27.8, literacy: 60.8, unemployment: 13.5 },
  { name: 'Ramanagara',       lat: 12.7154, lng: 77.2869, pop: 1082636, urban: 23.4, literacy: 76.2, unemployment: 6.9 },
  { name: 'Shivamogga',       lat: 13.9299, lng: 75.5681, pop: 1754255, urban: 38.7, literacy: 82.1, unemployment: 5.7 },
  { name: 'Tumakuru',         lat: 13.3379, lng: 77.1173, pop: 2679005, urban: 29.6, literacy: 77.4, unemployment: 7.8 },
  { name: 'Udupi',            lat: 13.3409, lng: 74.7421, pop: 1177908, urban: 36.5, literacy: 86.2, unemployment: 4.3 },
  { name: 'Uttara Kannada',   lat: 14.7860, lng: 74.6875, pop: 1437169, urban: 26.3, literacy: 81.7, unemployment: 5.9 },
  { name: 'Vijayapura',       lat: 16.8302, lng: 75.7100, pop: 2175375, urban: 30.1, literacy: 65.4, unemployment: 11.4 },
  { name: 'Yadgir',           lat: 16.7630, lng: 77.1384, pop: 1172077, urban: 20.8, literacy: 58.3, unemployment: 15.8 },
];

const CRIME_TYPES = ['Theft', 'Assault', 'Cybercrime', 'Narcotics', 'Murder', 'Fraud', 'Robbery', 'Kidnapping', 'Sexual Offence', 'Burglary'];
const IPC_MAP = {
  'Theft': '379 IPC', 'Assault': '323 IPC', 'Cybercrime': '66 IT Act',
  'Narcotics': '20 NDPS', 'Murder': '302 IPC', 'Fraud': '420 IPC',
  'Robbery': '392 IPC', 'Kidnapping': '363 IPC', 'Sexual Offence': '376 IPC', 'Burglary': '457 IPC'
};
const STATUS_LIST = ['Open', 'Under Investigation', 'Closed', 'Chargesheeted'];
const SEVERITY = ['Low', 'Medium', 'High', 'Critical'];
const STATIONS = ['Central PS', 'East PS', 'West PS', 'North PS', 'South PS', 'Market PS'];
const FIRST_NAMES = ['Raju','Suresh','Venkat','Ramesh','Mahesh','Vijay','Kumar','Srinivas','Harish','Anand','Pradeep','Girish'];
const LAST_NAMES  = ['Gowda','Naik','Reddy','Patil','Rao','Hegde','Nayak','Sharma','Kumari','Verma','Murthy','Bhat'];
const MO_TAGS = ['Snatch & Flee','Housebreaking','Online Scam','Drug Peddling','Gang Attack','ATM Fraud','Identity Theft','Vehicle Theft','Organized Network','Lone Offender'];

// Seeded random
let seed = 1337;
function rand() { seed = (seed * 1664525 + 1013904223) & 0xffffffff; return (seed >>> 0) / 4294967296; }
function randInt(min, max) { return Math.floor(rand() * (max - min + 1)) + min; }
function pick(arr) { return arr[randInt(0, arr.length - 1)]; }
function randFloat(min, max) { return rand() * (max - min) + min; }

// Generate seed data
function generateSeedData() {
  const incidents = [];
  const now = Date.now();

  for (let i = 0; i < 600; i++) {
    const district = pick(DISTRICTS);
    const crimeType = pick(CRIME_TYPES);
    const daysAgo = randInt(0, 365);
    const date = new Date(now - daysAgo * 864e5);
    date.setHours(randInt(0, 23));

    incidents.push({
      incident_id: `KSP-2024-${String(i + 1).padStart(5, '0')}`,
      district: district.name,
      police_station: `${district.name} ${pick(STATIONS)}`,
      ipc_section: IPC_MAP[crimeType],
      crime_type: crimeType,
      date_time: date.toISOString(),
      latitude: district.lat + randFloat(-0.3, 0.3),
      longitude: district.lng + randFloat(-0.3, 0.3),
      status: pick(STATUS_LIST),
      severity: pick(SEVERITY),
    });
  }

  const offenders = [];
  for (let i = 0; i < 120; i++) {
    const numMO = randInt(1, 4);
    const mos = [];
    for (let m = 0; m < numMO; m++) { const mo = pick(MO_TAGS); if (!mos.includes(mo)) mos.push(mo); }
    offenders.push({
      offender_id: `OFF-${String(i + 1).padStart(4, '0')}`,
      name: `${pick(FIRST_NAMES)} ${pick(LAST_NAMES)}`,
      age: randInt(18, 58),
      district: pick(DISTRICTS).name,
      modus_operandi: JSON.stringify(mos),
      repeat_count: randInt(0, 12),
      active: rand() > 0.3 ? 'true' : 'false',
    });
  }

  const network = [];
  for (let i = 0; i < 150; i++) {
    const a = offenders[randInt(0, offenders.length - 1)].offender_id;
    const b = offenders[randInt(0, offenders.length - 1)].offender_id;
    if (a !== b) {
      network.push({
        offender_a: a, offender_b: b,
        strength: randFloat(0.2, 1.0).toFixed(2),
        association_type: pick(['co-accused', 'associate', 'same-MO', 'suspect-victim'])
      });
    }
  }

  const districtsWithRisk = DISTRICTS.map(d => ({
    ...d,
    risk_score: Math.min(100, Math.round(d.unemployment * 5 + d.urban * 0.3 + randInt(10, 30)))
  }));

  return { incidents, offenders, network, districts: districtsWithRisk };
}

// ── Output seed data as JSON files (review before uploading to Catalyst) ─────
const fs = require('fs');
const path = require('path');

const { incidents, offenders, network, districts } = generateSeedData();

const outDir = path.join(__dirname, 'seed-data');
if (!fs.existsSync(outDir)) fs.mkdirSync(outDir, { recursive: true });

fs.writeFileSync(path.join(outDir, 'districts.json'),  JSON.stringify(districts, null, 2));
fs.writeFileSync(path.join(outDir, 'incidents.json'),  JSON.stringify(incidents, null, 2));
fs.writeFileSync(path.join(outDir, 'offenders.json'),  JSON.stringify(offenders, null, 2));
fs.writeFileSync(path.join(outDir, 'network.json'),    JSON.stringify(network, null, 2));

console.log(`✅ Seed data generated:`);
console.log(`  Districts: ${districts.length}`);
console.log(`  Incidents: ${incidents.length}`);
console.log(`  Offenders: ${offenders.length}`);
console.log(`  Network edges: ${network.length}`);
console.log(`\n📁 Files saved to: ${outDir}`);
console.log(`\nNext steps:`);
console.log(`  1. Open Catalyst Console > DataStore > Import each JSON file into matching table`);
console.log(`  2. Or use the Catalyst CLI: catalyst datastore:import --table Districts --file seed-data/districts.json`);
