/**
 * KSP Crime Analytics — Generate crime_records.csv for Catalyst DataStore
 * Run with: node functions/seed/generate-csv.js
 * 
 * Outputs `crime_records.csv` directly into the project root and functions/seed/seed-data/
 * formatted explicitly for importing into the Zoho Catalyst DataStore `Incidents` table.
 */

'use strict';
const fs = require('fs');
const path = require('path');

const DISTRICTS = [
  { name: 'Bagalkot',         lat: 16.1833, lng: 75.7000 },
  { name: 'Ballari',          lat: 15.1394, lng: 76.9214 },
  { name: 'Belagavi',         lat: 15.8497, lng: 74.4977 },
  { name: 'Bengaluru Rural',  lat: 13.2189, lng: 77.5733 },
  { name: 'Bengaluru Urban',  lat: 12.9716, lng: 77.5946 },
  { name: 'Bidar',            lat: 17.9104, lng: 76.9247 },
  { name: 'Chamarajanagar',   lat: 11.9261, lng: 76.9451 },
  { name: 'Chikkaballapura',  lat: 13.4355, lng: 77.7315 },
  { name: 'Chikkamagaluru',   lat: 13.3161, lng: 75.7765 },
  { name: 'Chitradurga',      lat: 14.2272, lng: 76.3975 },
  { name: 'Dakshina Kannada', lat: 12.8703, lng: 75.3405 },
  { name: 'Davangere',        lat: 14.4644, lng: 75.9218 },
  { name: 'Dharwad',          lat: 15.4589, lng: 75.0078 },
  { name: 'Gadag',            lat: 15.4166, lng: 75.6339 },
  { name: 'Hassan',           lat: 13.0068, lng: 76.0996 },
  { name: 'Haveri',           lat: 14.7957, lng: 75.4036 },
  { name: 'Kalaburagi',       lat: 17.3297, lng: 76.8200 },
  { name: 'Kodagu',           lat: 12.4217, lng: 75.7397 },
  { name: 'Kolar',            lat: 13.1358, lng: 78.1294 },
  { name: 'Koppal',           lat: 15.3534, lng: 76.1549 },
  { name: 'Mandya',           lat: 12.5218, lng: 76.8951 },
  { name: 'Mysuru',           lat: 12.2958, lng: 76.6394 },
  { name: 'Raichur',          lat: 16.2120, lng: 77.3439 },
  { name: 'Ramanagara',       lat: 12.7154, lng: 77.2869 },
  { name: 'Shivamogga',       lat: 13.9299, lng: 75.5681 },
  { name: 'Tumakuru',         lat: 13.3379, lng: 77.1173 },
  { name: 'Udupi',            lat: 13.3409, lng: 74.7421 },
  { name: 'Uttara Kannada',   lat: 14.7860, lng: 74.6875 },
  { name: 'Vijayapura',       lat: 16.8302, lng: 75.7100 },
  { name: 'Yadgir',           lat: 16.7630, lng: 77.1384 },
];

const CRIME_TYPES = ['Theft', 'Assault', 'Cybercrime', 'Narcotics', 'Murder', 'Fraud', 'Robbery', 'Kidnapping', 'Sexual Offence', 'Burglary'];
const IPC_MAP = {
  'Theft': '379 IPC', 'Assault': '323 IPC', 'Cybercrime': '66 IT Act',
  'Narcotics': '20 NDPS', 'Murder': '302 IPC', 'Fraud': '420 IPC',
  'Robbery': '392 IPC', 'Kidnapping': '363 IPC', 'Sexual Offence': '376 IPC', 'Burglary': '457 IPC'
};
const STATUS_LIST = ['Open', 'Under Investigation', 'Closed', 'Chargesheeted'];
const SEVERITY = ['Low', 'Medium', 'High', 'Critical'];
const STATIONS = ['Central PS', 'East PS', 'West PS', 'North PS', 'South PS', 'Market PS', 'Cyber Crime PS', 'Traffic PS'];

// Seeded random
let seed = 1337;
function rand() { seed = (seed * 1664525 + 1013904223) & 0xffffffff; return (seed >>> 0) / 4294967296; }
function randInt(min, max) { return Math.floor(rand() * (max - min + 1)) + min; }
function pick(arr) { return arr[randInt(0, arr.length - 1)]; }
function randFloat(min, max) { return rand() * (max - min) + min; }

function escapeCsv(str) {
  if (str === null || str === undefined) return '';
  const s = String(str);
  if (s.includes(',') || s.includes('"') || s.includes('\n')) {
    return `"${s.replace(/"/g, '""')}"`;
  }
  return s;
}

function generateCsvRecords(count = 600) {
  const headers = [
    'incident_id',
    'district',
    'police_station',
    'ipc_section',
    'crime_type',
    'date_time',
    'latitude',
    'longitude',
    'status',
    'severity'
  ];

  const rows = [headers.join(',')];
  const now = Date.now();

  for (let i = 0; i < count; i++) {
    const district = pick(DISTRICTS);
    const crimeType = pick(CRIME_TYPES);
    const daysAgo = randInt(0, 365);
    const date = new Date(now - daysAgo * 864e5);
    date.setHours(randInt(0, 23), randInt(0, 59), randInt(0, 59));

    const record = [
      `KSP-2024-${String(i + 1).padStart(5, '0')}`,
      district.name,
      `${district.name} ${pick(STATIONS)}`,
      IPC_MAP[crimeType],
      crimeType,
      date.toISOString(),
      (district.lat + randFloat(-0.3, 0.3)).toFixed(6),
      (district.lng + randFloat(-0.3, 0.3)).toFixed(6),
      pick(STATUS_LIST),
      pick(SEVERITY)
    ];

    rows.push(record.map(escapeCsv).join(','));
  }

  return rows.join('\n');
}

// Generate & save
const csvContent = generateCsvRecords(600);

// Save in root directory
const rootCsvPath = path.join(__dirname, '../../crime_records.csv');
fs.writeFileSync(rootCsvPath, csvContent, 'utf8');
console.log(`✅ Generated root file: ${rootCsvPath} (${csvContent.split('\n').length - 1} records)`);

// Save in seed-data directory
const seedDir = path.join(__dirname, 'seed-data');
if (!fs.existsSync(seedDir)) fs.mkdirSync(seedDir, { recursive: true });
const seedCsvPath = path.join(seedDir, 'crime_records.csv');
fs.writeFileSync(seedCsvPath, csvContent, 'utf8');
console.log(`✅ Saved copy to: ${seedCsvPath}`);
