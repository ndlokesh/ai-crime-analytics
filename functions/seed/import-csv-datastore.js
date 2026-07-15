/**
 * KSP Crime Analytics — Import `crime_records.csv` into Catalyst DataStore
 * Run with: node functions/seed/import-csv-datastore.js
 * 
 * Prerequisites:
 *   1. Run `catalyst login` or set environment variables:
 *      - CATALYST_PROJECT_KEY
 *      - CATALYST_AUTH_TOKEN
 *   2. Ensure `Incidents` table exists in Catalyst DataStore with columns:
 *      incident_id, district, police_station, ipc_section, crime_type, date_time, latitude, longitude, status, severity
 */

'use strict';
const fs = require('fs');
const path = require('path');

// Try requiring zcatalyst-sdk-node
let catalyst;
try {
  catalyst = require('zcatalyst-sdk-node');
} catch (err) {
  console.error('❌ zcatalyst-sdk-node is not installed or accessible in this context.');
  console.error('Run: npm install zcatalyst-sdk-node');
  process.exit(1);
}

// Simple CSV Parser helper
function parseCSV(content) {
  const lines = content.trim().split('\n');
  if (lines.length < 2) return [];
  
  const headers = lines[0].split(',').map(h => h.trim().replace(/^"|"$/g, ''));
  const records = [];

  for (let i = 1; i < lines.length; i++) {
    const line = lines[i].trim();
    if (!line) continue;

    // Parse CSV handling quoted strings
    const values = [];
    let current = '';
    let inQuotes = false;
    for (let char of line) {
      if (char === '"' && inQuotes) {
        inQuotes = false;
      } else if (char === '"' && !inQuotes) {
        inQuotes = true;
      } else if (char === ',' && !inQuotes) {
        values.push(current.trim());
        current = '';
      } else {
        current += char;
      }
    }
    values.push(current.trim());

    const row = {};
    headers.forEach((header, index) => {
      let val = values[index] !== undefined ? values[index] : '';
      if (header === 'latitude' || header === 'longitude') {
        val = parseFloat(val) || 0;
      }
      row[header] = val;
    });
    records.push(row);
  }
  return records;
}

async function importCSVToDataStore() {
  const csvPath = path.join(__dirname, '../../crime_records.csv');
  if (!fs.existsSync(csvPath)) {
    console.error(`❌ File not found: ${csvPath}`);
    console.error(`Run 'node functions/seed/generate-csv.js' first.`);
    process.exit(1);
  }

  console.log(`📖 Reading CSV file: ${csvPath}...`);
  const csvContent = fs.readFileSync(csvPath, 'utf8');
  const records = parseCSV(csvContent);
  console.log(`📊 Parsed ${records.length} records from crime_records.csv`);

  try {
    // Initialize Catalyst app
    const app = catalyst.initialize();
    const table = app.datastore().table('Incidents');

    // Batch insert (Catalyst supports inserting chunks up to 100 rows per request)
    const BATCH_SIZE = 100;
    let insertedCount = 0;

    console.log(`🚀 Starting bulk insertion into Catalyst DataStore 'Incidents' table...`);

    for (let i = 0; i < records.length; i += BATCH_SIZE) {
      const batch = records.slice(i, i + BATCH_SIZE);
      console.log(`   Uploading batch ${Math.floor(i / BATCH_SIZE) + 1} (${batch.length} rows)...`);
      await table.insertRows(batch);
      insertedCount += batch.length;
    }

    console.log(`\n🎉 Successfully imported ${insertedCount} records into Catalyst DataStore 'Incidents' table!`);
  } catch (error) {
    console.error('\n❌ Error during insertion into DataStore:', error.message || error);
    console.log(`\n💡 Tip: You can also import 'crime_records.csv' directly via the Catalyst Web Console:`);
    console.log(`   1. Open Catalyst Console -> DataStore -> Incidents table`);
    console.log(`   2. Click 'Import' and select the generated 'crime_records.csv' file.`);
  }
}

importCSVToDataStore();
