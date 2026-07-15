# 🔰 KSP Crime Intelligence & Analytical Platform
### Karnataka State Police — State Crime Records Bureau (SCRB)
**Built on Zoho Catalyst 2.0**

---

## 🏗️ Architecture

```
Browser (Catalyst Web Hosting)
  └── 7 HTML pages (Chart.js · D3.js · Leaflet.js)
        │ fetch() API calls
        ▼
Catalyst Serverless Functions (Node.js Advanced I/O)
  ├── incidents-api    → Crime incident records
  ├── offenders-api    → Offender profiles + network
  ├── analytics-api    → Aggregations, KPIs, trends, Z-scores
  ├── alerts-api       → Intelligence alerts CRUD
  └── cron-alert-refresh → Daily Z-score spike detection (Cron)
        │
        ▼
Catalyst DataStore (Relational RDBMS + ZCQL)
  Tables: Districts · Incidents · Offenders · OffenderNetwork · Alerts
        │
        ▼
Catalyst QuickML (AI/ML)
  ├── District Risk Scorer (Regression)
  └── Anomaly Detector (Unsupervised)
```

---

## 📁 Project Structure

```
ai-driven crime analytic/
├── catalyst-config.json          ← Catalyst project config
├── client/public/
│   ├── index.html                ← Login gate (Catalyst Auth)
│   ├── dashboard.html            ← Command overview
│   ├── geospatial.html           ← Spatiotemporal hotspot map
│   ├── network.html              ← D3 criminal network graph
│   ├── predictive.html           ← AI predictive dashboard
│   ├── trends.html               ← Pattern & trend discovery
│   ├── reports.html              ← Intelligence reports
│   ├── css/styles.css            ← Design system
│   └── js/
│       ├── api.js                ← API client (+ mock data fallback)
│       └── utils.js              ← Shared utilities
└── functions/
    ├── incidents-api/index.js
    ├── analytics-api/index.js
    ├── offenders-api/index.js
    ├── alerts-api/index.js
    ├── cron-alert-refresh/index.js
    └── seed/index.js             ← Data seeder
```

---

## 🚀 Setup Guide

### Step 1 — Prerequisites

```powershell
# Install Catalyst CLI globally
npm install -g zcatalyst-cli

# Verify
catalyst --version
```

### Step 2 — Create Catalyst Project (Web Console)

1. Go to [catalyst.zoho.com](https://catalyst.zoho.com)
2. Create a new project: **KSP Crime Intelligence**
3. Note your **Project ID** from Project Settings

### Step 3 — Link Project Locally

```powershell
cd "c:\Users\Lokesh\OneDrive\Desktop\ai-driven crime analytic"

# Login to your Zoho account
catalyst login

# Initialize the project (select your project from list)
catalyst init
# ✅ Select: Functions + Client
# ✅ Function stack: Node.js
```

### Step 4 — Create DataStore Tables

In the Catalyst Console → DataStore → Create these tables:

| Table | Required Columns |
|---|---|
| `Districts` | name, latitude, longitude, population, urbanization_pct, literacy_pct, unemployment_pct, risk_score |
| `Incidents` | incident_id, district, police_station, ipc_section, crime_type, date_time, latitude, longitude, status, severity |
| `Offenders` | offender_id, name, age, district, modus_operandi, repeat_count, active |
| `OffenderNetwork` | offender_a, offender_b, strength, association_type |
| `Alerts` | district_id, crime_type, alert_level, message, z_score, created_at, is_active |

### Step 5 — Seed the Database

```powershell
# Generate seed data JSON files
node functions/seed/index.js

# Files will be in: functions/seed/seed-data/
# Import via Catalyst Console: DataStore → Import → select each .json file
```

### Step 6 — Configure API URL

Edit `client/public/js/api.js`:
```javascript
const CATALYST_BASE_URL = 'https://YOUR-PROJECT.catalystserverless.com/server';
```
Set to empty string `''` to use built-in mock data (demo mode).

### Step 7 — Set Up QuickML Models

1. Catalyst Console → QuickML → Create Pipeline
2. **Risk Scorer**: Type = Regression, Target = `risk_score`, Features = `unemployment_pct`, `urbanization_pct`, `population`
3. **Anomaly Detector**: Type = Anomaly Detection, Data = weekly incident counts per district
4. Deploy both models → copy REST API endpoints
5. Add endpoints to `analytics-api/index.js`

### Step 8 — Set Up Cron Function

1. Catalyst Console → Cron → Create Cron Job
2. Function: `cron-alert-refresh`
3. Schedule: `0 0 * * *` (daily at midnight IST)

### Step 9 — Deploy

```powershell
# Test locally first
catalyst serve

# Deploy everything
catalyst deploy
```

---

## 🌐 Pages

| URL | Description |
|---|---|
| `/index.html` | Login gate (Catalyst Auth) |
| `/dashboard.html` | Command overview — KPIs, trends, incidents |
| `/geospatial.html` | Leaflet choropleth + heatmap + time slider |
| `/network.html` | D3 force-directed criminal network |
| `/predictive.html` | QuickML risk scores + anomaly detection |
| `/trends.html` | Z-score spikes + crime clock + seasonal |
| `/reports.html` | Printable district intelligence briefs |

---

## 🔐 Demo Login

| Field | Value |
|---|---|
| Badge Number | `KSP-DEMO-001` |
| Password | `admin123` |

> Any `KSP-XXXX-XXX` badge with 6+ character password also works in demo mode.

---

## 📊 Features

- ✅ **7 pages** with full navigation and auth guard
- ✅ **Dark glassmorphism** design with Inter font
- ✅ **Leaflet.js** choropleth + heatmap + time-of-day slider
- ✅ **D3.js** force-directed criminal network graph
- ✅ **Chart.js** — 15+ charts (line, bar, donut, polar, radar, scatter)
- ✅ **Z-score spike detector** with 2σ threshold alerting
- ✅ **Crime Clock** (24-hour polar area chart)
- ✅ **Correlation matrix** heatmap
- ✅ **AI insight cards** with QuickML-ready endpoints
- ✅ **Printable intelligence reports** per district
- ✅ **Live alert ticker** with pulsing red-zone animations
- ✅ **Demo mode** — works fully offline with synthetic Karnataka data
- ✅ **Catalyst DataStore** ZCQL queries in all 4 serverless functions
- ✅ **Daily cron** Z-score recalculation

---

## 🛠️ Tech Stack

| Layer | Technology |
|---|---|
| Frontend | HTML5, Vanilla CSS, ES Modules |
| Visualization | Chart.js 4.4, D3.js v7, Leaflet.js 1.9 |
| Icons | Lucide Icons |
| Backend | Zoho Catalyst Serverless (Node.js) |
| Database | Catalyst DataStore (Relational + ZCQL) |
| AI/ML | Catalyst QuickML (Regression + Anomaly Detection) |
| Auth | Catalyst Auth |
| Hosting | Catalyst Web Hosting (Client) |
| Scheduling | Catalyst Cron Functions |

---

*Karnataka State Police — SCRB Intelligence Platform v1.0*
*Powered by Zoho Catalyst 2.0*
