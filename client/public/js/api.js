/* ============================================================
   KSP Crime Analytics — Unified API Client
   Aligned to Karnataka Police FIR System ERD (v2)
   
   Schema: CaseMaster · Accused · Victim · Complainant ·
           ArrestSurrender · Act · Section · CrimeHead ·
           CrimeSubHead · Unit · District · Employee · …
   ============================================================ */

import { SeededRandom, DISTRICT_COORDS, MONTHS } from './utils.js';
import { CRIME_RECORDS_DATA } from './crime_data.js';

// ─── Config ──────────────────────────────────────────────────
// Automatically use OnSlate backend URL when deployed, with fallback to simulation mode
const CATALYST_BASE_URL = (typeof window !== 'undefined' && window.location && window.location.origin && window.location.origin.includes('onslate.in'))
  ? 'https://ai-crime-analytics-jkgzcyyg.onslate.in/server'
  : '';
const DEMO_MODE = !CATALYST_BASE_URL;

async function request(path, params = {}) {
  if (DEMO_MODE) return null;
  try {
    const url = new URL(`${CATALYST_BASE_URL}${path}`);
    Object.entries(params).forEach(([k, v]) => v !== undefined && url.searchParams.set(k, v));
    const res = await fetch(url.toString(), { headers: { 'Content-Type': 'application/json' }, credentials: 'include' });
    if (!res.ok) throw new Error(`API error: ${res.status}`);
    const json = await res.json();
    const data = (json && json.data !== undefined) ? json.data : json;
    if (!data) return null;
    if (Array.isArray(data) && data.length === 0) return null;
    if (typeof data === 'object' && !Array.isArray(data)) {
      if (Object.keys(data).length === 0) return null;
      if (data.nodes !== undefined && Array.isArray(data.nodes) && data.nodes.length === 0) return null;
      if (data.total_incidents !== undefined && data.total_incidents === 0) return null;
      if (data.total_cases !== undefined && data.total_cases === 0 && data.fir_count === 0) return null;
    }
    return data;
  } catch (err) {
    console.warn(`[KSP API Client] Backend ${path} not reachable or unseeded (${err.message}). Using local CSV dataset fallback.`);
    return null;
  }
}


// ═══════════════════════════════════════════════════════════════
// REFERENCE DATA (matches ERD lookup tables)
// ═══════════════════════════════════════════════════════════════
const rng = new SeededRandom(1337);

// CaseCategory (FIR System)
export const CASE_CATEGORIES = [
  { CaseCategoryID: 1, LookupValue: 'FIR',      code: '1' },
  { CaseCategoryID: 2, LookupValue: 'UDR',      code: '3' },
  { CaseCategoryID: 3, LookupValue: 'PAR',       code: '4' },
  { CaseCategoryID: 4, LookupValue: 'Zero FIR',  code: '8' },
];

// GravityOffence
export const GRAVITY_OFFENCES = [
  { GravityOffenceID: 1, LookupValue: 'Heinous' },
  { GravityOffenceID: 2, LookupValue: 'Non-Heinous' },
  { GravityOffenceID: 3, LookupValue: 'Minor' },
];

// CaseStatusMaster
export const CASE_STATUSES = [
  { CaseStatusID: 1, CaseStatusName: 'Under Investigation' },
  { CaseStatusID: 2, CaseStatusName: 'Charge Sheeted' },
  { CaseStatusID: 3, CaseStatusName: 'Closed' },
  { CaseStatusID: 4, CaseStatusName: 'Final Report Filed' },
  { CaseStatusID: 5, CaseStatusName: 'Referred to Court' },
];

// CrimeHead (Major Categories)
export const CRIME_HEADS = [
  { CrimeHeadID: 1, CrimeGroupName: 'Crimes Against Body',   color: '#dc2626' },
  { CrimeHeadID: 2, CrimeGroupName: 'Crimes Against Property', color: '#3b82f6' },
  { CrimeHeadID: 3, CrimeGroupName: 'Crimes Against Women',  color: '#ec4899' },
  { CrimeHeadID: 4, CrimeGroupName: 'Cyber Crimes',          color: '#8b5cf6' },
  { CrimeHeadID: 5, CrimeGroupName: 'Narcotics',             color: '#f59e0b' },
  { CrimeHeadID: 6, CrimeGroupName: 'Economic Offences',     color: '#06b6d4' },
  { CrimeHeadID: 7, CrimeGroupName: 'Public Order',          color: '#f97316' },
  { CrimeHeadID: 8, CrimeGroupName: 'SC/ST Crimes',          color: '#a855f7' },
];

// CrimeSubHead (Minor Categories)
export const CRIME_SUBHEADS = [
  { CrimeSubHeadID: 1,  CrimeHeadID: 1, CrimeHeadName: 'Murder',              ActCode: 'IPC',   SectionCode: '302'  },
  { CrimeSubHeadID: 2,  CrimeHeadID: 1, CrimeHeadName: 'Attempt to Murder',   ActCode: 'IPC',   SectionCode: '307'  },
  { CrimeSubHeadID: 3,  CrimeHeadID: 1, CrimeHeadName: 'Grievous Hurt',       ActCode: 'IPC',   SectionCode: '326'  },
  { CrimeSubHeadID: 4,  CrimeHeadID: 1, CrimeHeadName: 'Kidnapping',          ActCode: 'IPC',   SectionCode: '363'  },
  { CrimeSubHeadID: 5,  CrimeHeadID: 2, CrimeHeadName: 'Theft',               ActCode: 'IPC',   SectionCode: '379'  },
  { CrimeSubHeadID: 6,  CrimeHeadID: 2, CrimeHeadName: 'Robbery',             ActCode: 'IPC',   SectionCode: '392'  },
  { CrimeSubHeadID: 7,  CrimeHeadID: 2, CrimeHeadName: 'Burglary',            ActCode: 'IPC',   SectionCode: '457'  },
  { CrimeSubHeadID: 8,  CrimeHeadID: 2, CrimeHeadName: 'Cheating',            ActCode: 'IPC',   SectionCode: '420'  },
  { CrimeSubHeadID: 9,  CrimeHeadID: 3, CrimeHeadName: 'Rape',                ActCode: 'IPC',   SectionCode: '376'  },
  { CrimeSubHeadID: 10, CrimeHeadID: 3, CrimeHeadName: 'Domestic Violence',   ActCode: 'IPC',   SectionCode: '498A' },
  { CrimeSubHeadID: 11, CrimeHeadID: 3, CrimeHeadName: 'Molestation',         ActCode: 'IPC',   SectionCode: '354'  },
  { CrimeSubHeadID: 12, CrimeHeadID: 4, CrimeHeadName: 'Cyber Fraud',         ActCode: 'ITA',   SectionCode: '66C'  },
  { CrimeSubHeadID: 13, CrimeHeadID: 4, CrimeHeadName: 'Online Cheating',     ActCode: 'ITA',   SectionCode: '66D'  },
  { CrimeSubHeadID: 14, CrimeHeadID: 5, CrimeHeadName: 'Drug Trafficking',    ActCode: 'NDPS',  SectionCode: '20'   },
  { CrimeSubHeadID: 15, CrimeHeadID: 5, CrimeHeadName: 'Drug Possession',     ActCode: 'NDPS',  SectionCode: '27'   },
  { CrimeSubHeadID: 16, CrimeHeadID: 6, CrimeHeadName: 'Bank Fraud',          ActCode: 'IPC',   SectionCode: '420'  },
  { CrimeSubHeadID: 17, CrimeHeadID: 7, CrimeHeadName: 'Rioting',             ActCode: 'IPC',   SectionCode: '147'  },
  { CrimeSubHeadID: 18, CrimeHeadID: 8, CrimeHeadName: 'SC/ST Atrocities',   ActCode: 'SCA',   SectionCode: '3(1)' },
];

// Acts
export const ACTS = [
  { ActCode: 'IPC',   ActDescription: 'Indian Penal Code',                              ShortName: 'IPC' },
  { ActCode: 'NDPS',  ActDescription: 'Narcotic Drugs and Psychotropic Substances Act', ShortName: 'NDPS' },
  { ActCode: 'ITA',   ActDescription: 'Information Technology Act',                     ShortName: 'IT Act' },
  { ActCode: 'POCSO', ActDescription: 'Protection of Children from Sexual Offences Act',ShortName: 'POCSO' },
  { ActCode: 'SCA',   ActDescription: 'Scheduled Castes & Scheduled Tribes Act',        ShortName: 'SC/ST Act' },
  { ActCode: 'MVA',   ActDescription: 'Motor Vehicles Act',                             ShortName: 'MVA' },
];

// Karnataka Districts with proper DistrictID codes (matching CrimeNo format)
export const KA_DISTRICTS = [
  { DistrictID: 4401, DistrictName: 'Bagalkot',         StateID: 29, lat: 16.1833, lng: 75.7000, pop: 1890826, urban: 28.5, literacy: 67.8, unemployment: 8.2 },
  { DistrictID: 4402, DistrictName: 'Ballari',          StateID: 29, lat: 15.1394, lng: 76.9214, pop: 2531592, urban: 45.2, literacy: 69.1, unemployment: 10.5 },
  { DistrictID: 4403, DistrictName: 'Belagavi',         StateID: 29, lat: 15.8497, lng: 74.4977, pop: 4779661, urban: 32.8, literacy: 74.3, unemployment: 7.4 },
  { DistrictID: 4404, DistrictName: 'Bengaluru Rural',  StateID: 29, lat: 13.2189, lng: 77.5733, pop: 987257,  urban: 22.1, literacy: 78.4, unemployment: 5.9 },
  { DistrictID: 4405, DistrictName: 'Bengaluru Urban',  StateID: 29, lat: 12.9716, lng: 77.5946, pop: 9621551, urban: 91.5, literacy: 89.2, unemployment: 4.2 },
  { DistrictID: 4406, DistrictName: 'Bidar',            StateID: 29, lat: 17.9104, lng: 76.9247, pop: 1726078, urban: 29.4, literacy: 69.4, unemployment: 12.1 },
  { DistrictID: 4407, DistrictName: 'Chamarajanagar',   StateID: 29, lat: 11.9261, lng: 76.9451, pop: 1020791, urban: 18.7, literacy: 57.2, unemployment: 9.8 },
  { DistrictID: 4408, DistrictName: 'Chikkaballapura',  StateID: 29, lat: 13.4355, lng: 77.7315, pop: 1254044, urban: 24.3, literacy: 75.1, unemployment: 7.6 },
  { DistrictID: 4409, DistrictName: 'Chikkamagaluru',   StateID: 29, lat: 13.3161, lng: 75.7765, pop: 1137754, urban: 29.8, literacy: 79.8, unemployment: 5.4 },
  { DistrictID: 4410, DistrictName: 'Chitradurga',      StateID: 29, lat: 14.2272, lng: 76.3975, pop: 1660378, urban: 27.9, literacy: 73.1, unemployment: 8.9 },
  { DistrictID: 4411, DistrictName: 'Dakshina Kannada', StateID: 29, lat: 12.8703, lng: 75.3405, pop: 2089649, urban: 44.2, literacy: 88.6, unemployment: 5.1 },
  { DistrictID: 4412, DistrictName: 'Davangere',        StateID: 29, lat: 14.4644, lng: 75.9218, pop: 1946905, urban: 37.4, literacy: 75.3, unemployment: 9.3 },
  { DistrictID: 4413, DistrictName: 'Dharwad',          StateID: 29, lat: 15.4589, lng: 75.0078, pop: 1848408, urban: 54.2, literacy: 80.2, unemployment: 6.8 },
  { DistrictID: 4414, DistrictName: 'Gadag',            StateID: 29, lat: 15.4166, lng: 75.6339, pop: 1065235, urban: 30.5, literacy: 73.8, unemployment: 9.1 },
  { DistrictID: 4415, DistrictName: 'Hassan',           StateID: 29, lat: 13.0068, lng: 76.0996, pop: 1776421, urban: 22.4, literacy: 77.4, unemployment: 6.2 },
  { DistrictID: 4416, DistrictName: 'Haveri',           StateID: 29, lat: 14.7957, lng: 75.4036, pop: 1598131, urban: 24.8, literacy: 72.6, unemployment: 8.4 },
  { DistrictID: 4417, DistrictName: 'Kalaburagi',       StateID: 29, lat: 17.3297, lng: 76.8200, pop: 2566326, urban: 35.9, literacy: 63.1, unemployment: 14.2 },
  { DistrictID: 4418, DistrictName: 'Kodagu',           StateID: 29, lat: 12.4217, lng: 75.7397, pop: 554762,  urban: 29.1, literacy: 82.6, unemployment: 4.8 },
  { DistrictID: 4419, DistrictName: 'Kolar',            StateID: 29, lat: 13.1358, lng: 78.1294, pop: 1540596, urban: 26.2, literacy: 74.9, unemployment: 8.7 },
  { DistrictID: 4420, DistrictName: 'Koppal',           StateID: 29, lat: 15.3534, lng: 76.1549, pop: 1388990, urban: 22.3, literacy: 64.7, unemployment: 11.8 },
  { DistrictID: 4421, DistrictName: 'Mandya',           StateID: 29, lat: 12.5218, lng: 76.8951, pop: 1807318, urban: 20.4, literacy: 75.8, unemployment: 7.1 },
  { DistrictID: 4422, DistrictName: 'Mysuru',           StateID: 29, lat: 12.2958, lng: 76.6394, pop: 3001127, urban: 50.3, literacy: 79.3, unemployment: 6.4 },
  { DistrictID: 4423, DistrictName: 'Raichur',          StateID: 29, lat: 16.2120, lng: 77.3439, pop: 1924773, urban: 27.8, literacy: 60.8, unemployment: 13.5 },
  { DistrictID: 4424, DistrictName: 'Ramanagara',       StateID: 29, lat: 12.7154, lng: 77.2869, pop: 1082636, urban: 23.4, literacy: 76.2, unemployment: 6.9 },
  { DistrictID: 4425, DistrictName: 'Shivamogga',       StateID: 29, lat: 13.9299, lng: 75.5681, pop: 1754255, urban: 38.7, literacy: 82.1, unemployment: 5.7 },
  { DistrictID: 4426, DistrictName: 'Tumakuru',         StateID: 29, lat: 13.3379, lng: 77.1173, pop: 2679005, urban: 29.6, literacy: 77.4, unemployment: 7.8 },
  { DistrictID: 4427, DistrictName: 'Udupi',            StateID: 29, lat: 13.3409, lng: 74.7421, pop: 1177908, urban: 36.5, literacy: 86.2, unemployment: 4.3 },
  { DistrictID: 4428, DistrictName: 'Uttara Kannada',   StateID: 29, lat: 14.7860, lng: 74.6875, pop: 1437169, urban: 26.3, literacy: 81.7, unemployment: 5.9 },
  { DistrictID: 4429, DistrictName: 'Vijayapura',       StateID: 29, lat: 16.8302, lng: 75.7100, pop: 2175375, urban: 30.1, literacy: 65.4, unemployment: 11.4 },
  { DistrictID: 4430, DistrictName: 'Yadgir',           StateID: 29, lat: 16.7630, lng: 77.1384, pop: 1172077, urban: 20.8, literacy: 58.3, unemployment: 15.8 },
];

// Police Ranks
export const RANKS = [
  { RankID: 1, RankName: 'Director General of Police',   Hierarchy: 1 },
  { RankID: 2, RankName: 'Additional DGP',               Hierarchy: 2 },
  { RankID: 3, RankName: 'Inspector General',            Hierarchy: 3 },
  { RankID: 4, RankName: 'Deputy Inspector General',     Hierarchy: 4 },
  { RankID: 5, RankName: 'Superintendent of Police',     Hierarchy: 5 },
  { RankID: 6, RankName: 'Deputy SP',                    Hierarchy: 6 },
  { RankID: 7, RankName: 'Inspector',                    Hierarchy: 7 },
  { RankID: 8, RankName: 'Sub-Inspector',                Hierarchy: 8 },
  { RankID: 9, RankName: 'Assistant Sub-Inspector',      Hierarchy: 9 },
  { RankID: 10, RankName: 'Head Constable',              Hierarchy: 10 },
  { RankID: 11, RankName: 'Constable',                   Hierarchy: 11 },
];

const FIRST_NAMES = ['Raju','Suresh','Venkat','Ramesh','Mahesh','Vijay','Kumar','Srinivas','Harish','Anand','Pradeep','Girish','Shankar','Santosh','Deepak','Kavya','Rekha','Suma','Lakshmi','Pavithra'];
const LAST_NAMES  = ['Gowda','Naik','Reddy','Patil','Rao','Hegde','Nayak','Sharma','Kumari','Verma','Murthy','Bhat','Kamath','Shetty','Joshi'];

// ── CrimeNo Generator (matches real format) ────────────────────
function genCrimeNo(categoryCode, districtID, stationID, year, serial) {
  return `${categoryCode}${String(districtID).padStart(4,'0')}${String(stationID).padStart(4,'0')}${year}${String(serial).padStart(5,'0')}`;
}

// ── Generate Police Units per District ────────────────────────
function genUnits() {
  const units = [];
  let unitID = 1;
  const stationNames = ['Central PS','East PS','West PS','North PS','South PS','Market PS','Rural PS','Highway PS','Town PS','City PS'];
  KA_DISTRICTS.forEach(d => {
    const count = rng.int(3, 8);
    for (let i = 0; i < count; i++) {
      units.push({
        UnitID: unitID++,
        UnitName: `${d.DistrictName} ${stationNames[i % stationNames.length]}`,
        TypeID: 1,
        StateID: 29,
        DistrictID: d.DistrictID,
        Active: true
      });
    }
  });
  return units;
}

// ── Generate Employees ────────────────────────────────────────
function genEmployees(units, count = 200) {
  const employees = [];
  for (let i = 0; i < count; i++) {
    const unit = rng.pick(units);
    const district = KA_DISTRICTS.find(d => d.DistrictID === unit.DistrictID);
    employees.push({
      EmployeeID: i + 1,
      DistrictID: unit.DistrictID,
      UnitID: unit.UnitID,
      RankID: rng.int(7, 11),
      DesignationID: rng.int(1, 5),
      KGID: `KA${String(2024000 + i).padStart(7, '0')}`,
      FirstName: `${rng.pick(FIRST_NAMES)} ${rng.pick(LAST_NAMES)}`,
      GenderID: rng.next() > 0.25 ? 1 : 2, // 75% M, 25% F
    });
  }
  return employees;
}

// ── Generate CaseMaster (FIR Records) ────────────────────────
function genCaseMaster(units, employees, count = 600) {
  const cases = [];
  const now = new Date();
  const serialByStation = {};

  for (let i = 0; i < count; i++) {
    const unit = rng.pick(units);
    const district = KA_DISTRICTS.find(d => d.DistrictID === unit.DistrictID);
    const employee = employees.find(e => e.UnitID === unit.UnitID) || employees[0];
    const category = rng.pick(CASE_CATEGORIES);
    const subhead = rng.pick(CRIME_SUBHEADS);
    const head = CRIME_HEADS.find(h => h.CrimeHeadID === subhead.CrimeHeadID);
    const status = rng.pick(CASE_STATUSES);
    const gravity = rng.pick(GRAVITY_OFFENCES);

    const daysAgo = rng.int(0, 365);
    const regDate = new Date(now - daysAgo * 864e5);
    const incidentDate = new Date(regDate - rng.int(0, 72) * 3600000);
    const year = regDate.getFullYear();

    const stKey = `${unit.UnitID}_${category.CaseCategoryID}_${year}`;
    serialByStation[stKey] = (serialByStation[stKey] || 0) + 1;
    const serial = serialByStation[stKey];

    const crimeNo = genCrimeNo(category.code, district.DistrictID, unit.UnitID, year, serial);
    const caseNo = `${year}${String(serial).padStart(5, '0')}`;

    cases.push({
      CaseMasterID: i + 1,
      CrimeNo: crimeNo,
      CaseNo: caseNo,
      CrimeRegisteredDate: regDate.toISOString().split('T')[0],
      PolicePersonID: employee.EmployeeID,
      PoliceStationID: unit.UnitID,
      CaseCategoryID: category.CaseCategoryID,
      CaseCategoryName: category.LookupValue,
      GravityOffenceID: gravity.GravityOffenceID,
      GravityOffenceName: gravity.LookupValue,
      CrimeMajorHeadID: head.CrimeHeadID,
      CrimeMajorHeadName: head.CrimeGroupName,
      CrimeMinorHeadID: subhead.CrimeSubHeadID,
      CrimeMinorHeadName: subhead.CrimeHeadName,
      CaseStatusID: status.CaseStatusID,
      CaseStatusName: status.CaseStatusName,
      IncidentFromDate: incidentDate.toISOString(),
      IncidentToDate: new Date(incidentDate.getTime() + rng.int(0, 5) * 3600000).toISOString(),
      InfoReceivedPSDate: new Date(incidentDate.getTime() + rng.int(0, 12) * 3600000).toISOString(),
      latitude:  district.lat + rng.float(-0.3, 0.3),
      longitude: district.lng + rng.float(-0.3, 0.3),
      BriefFacts: `Incident reported at ${unit.UnitName}. Case registered under ${subhead.ActCode} Section ${subhead.SectionCode}.`,
      // Denormalized for analytics (not in real DB, computed via JOIN)
      _DistrictID: district.DistrictID,
      _DistrictName: district.DistrictName,
      _UnitName: unit.UnitName,
      _ActCode: subhead.ActCode,
      _SectionCode: subhead.SectionCode,
    });
  }
  return cases;
}

// ── Generate Accused ──────────────────────────────────────────
function genAccused(cases) {
  const accused = [];
  let id = 1;
  cases.forEach(c => {
    const count = rng.int(1, 4);
    for (let i = 0; i < count; i++) {
      accused.push({
        AccusedMasterID: id++,
        CaseMasterID: c.CaseMasterID,
        AccusedName: `${rng.pick(FIRST_NAMES)} ${rng.pick(LAST_NAMES)}`,
        AgeYear: rng.int(16, 65),
        GenderID: rng.next() > 0.15 ? 1 : 2,
        PersonID: `A${i + 1}`,
        _CrimeNo: c.CrimeNo,
        _DistrictName: c._DistrictName,
      });
    }
  });
  return accused;
}

// ── Generate Victims ──────────────────────────────────────────
function genVictims(cases) {
  const victims = [];
  let id = 1;
  cases.forEach(c => {
    const count = rng.int(0, 3);
    for (let i = 0; i < count; i++) {
      victims.push({
        VictimMasterID: id++,
        CaseMasterID: c.CaseMasterID,
        VictimName: `${rng.pick(FIRST_NAMES)} ${rng.pick(LAST_NAMES)}`,
        AgeYear: rng.int(5, 80),
        GenderID: rng.next() > 0.5 ? 1 : 2,
        VictimPolice: rng.next() > 0.95 ? '1' : '0',
        _CrimeNo: c.CrimeNo,
        _DistrictName: c._DistrictName,
      });
    }
  });
  return victims;
}

// ── Generate ArrestSurrender ──────────────────────────────────
function genArrestSurrender(accused, cases, units) {
  const events = [];
  let id = 1;
  // ~60% of accused get arrested
  accused.filter(() => rng.next() > 0.4).forEach(acc => {
    const c = cases.find(c => c.CaseMasterID === acc.CaseMasterID);
    if (!c) return;
    const unit = units.find(u => u.UnitID === c.PoliceStationID) || units[0];
    const district = KA_DISTRICTS.find(d => d.DistrictID === unit.DistrictID);
    events.push({
      ArrestSurrenderID: id++,
      CaseMasterID: acc.CaseMasterID,
      ArrestSurrenderTypeID: rng.next() > 0.85 ? 2 : 1, // 1=Arrest, 2=Surrender
      ArrestSurrenderDate: new Date(Date.parse(c.CrimeRegisteredDate) + rng.int(1, 30) * 864e5).toISOString().split('T')[0],
      ArrestSurrenderStateId: 29,
      ArrestSurrenderDistrictId: district.DistrictID,
      PoliceStationID: unit.UnitID,
      AccusedMasterID: acc.AccusedMasterID,
      IsAccused: true,
      IsComplainantAccused: rng.next() > 0.97,
      _AccusedName: acc.AccusedName,
      _DistrictName: district.DistrictName,
      _CrimeNo: c.CrimeNo,
    });
  });
  return events;
}

// ── Generate Chargesheet Details ──────────────────────────────
function genChargesheetDetails(cases) {
  return cases
    .filter(c => c.CaseStatusID === 2) // Charge Sheeted
    .map((c, i) => ({
      CSID: i + 1,
      CaseMasterID: c.CaseMasterID,
      csdate: new Date(Date.parse(c.CrimeRegisteredDate) + rng.int(30, 180) * 864e5).toISOString().split('T')[0],
      cstype: rng.next() > 0.15 ? 'A' : rng.next() > 0.5 ? 'B' : 'C', // A=CS, B=False, C=Undetected
      PolicePersonID: c.PolicePersonID,
    }));
}

// ── Generate District Summary ─────────────────────────────────
function genDistrictSummary(cases) {
  return KA_DISTRICTS.map(d => {
    const distCases = cases.filter(c => c._DistrictID === d.DistrictID || c._DistrictName === d.DistrictName || c._DistrictID === d.DistrictName || c.district === d.DistrictName);
    const statusBreakdown = {};
    CASE_STATUSES.forEach(s => { statusBreakdown[s.CaseStatusName] = 0; });
    ['Under Investigation', 'Closed', 'Chargesheeted', 'Open'].forEach(st => { if (statusBreakdown[st] === undefined) statusBreakdown[st] = 0; });

    const categoryBreakdown = {};
    CASE_CATEGORIES.forEach(c => { categoryBreakdown[c.LookupValue] = 0; });
    ['Murder', 'Robbery', 'Assault', 'Cybercrime', 'Burglary', 'Sexual Offence', 'Narcotics', 'Theft', 'Kidnapping', 'Fraud'].forEach(ct => { if (categoryBreakdown[ct] === undefined) categoryBreakdown[ct] = 0; });

    const headBreakdown = {};
    CRIME_HEADS.forEach(h => { headBreakdown[h.CrimeGroupName] = 0; });
    const gravityBreakdown = { Heinous: 0, 'Non-Heinous': 0, Minor: 0, Critical: 0, High: 0, Medium: 0, Low: 0 };

    distCases.forEach(c => {
      if (statusBreakdown[c.CaseStatusName] !== undefined) statusBreakdown[c.CaseStatusName]++;
      else statusBreakdown[c.CaseStatusName] = 1;

      if (categoryBreakdown[c.CaseCategoryName] !== undefined) categoryBreakdown[c.CaseCategoryName]++;
      else categoryBreakdown[c.CaseCategoryName] = 1;

      if (headBreakdown[c.CrimeMajorHeadName] !== undefined) headBreakdown[c.CrimeMajorHeadName]++;
      else headBreakdown[c.CrimeMajorHeadName] = 1;

      if (gravityBreakdown[c.GravityOffenceName] !== undefined) gravityBreakdown[c.GravityOffenceName]++;
      else gravityBreakdown[c.GravityOffenceName] = 1;
    });

    const underInv = distCases.filter(c => c.CaseStatusName === 'Under Investigation' || c.CaseStatusName === 'Open').length;
    const heinousCount = (gravityBreakdown['Heinous'] || 0) + (gravityBreakdown['Critical'] || 0) + (gravityBreakdown['High'] || 0);
    const riskScore = Math.min(100, Math.round(
      distCases.length * 1.5 + d.unemployment * 2 + d.urban * 0.15 + heinousCount * 2.5
    ));

    return {
      DistrictID: d.DistrictID,
      district: d.DistrictName,
      total_cases: distCases.length,
      total_incidents: distCases.length,
      fir_count: distCases.length,
      udr_count: categoryBreakdown['UDR'] || 0,
      par_count: categoryBreakdown['PAR'] || 0,
      zero_fir_count: categoryBreakdown['Zero FIR'] || 0,
      under_investigation: underInv,
      open_cases: underInv,
      heinous_cases: heinousCount,
      risk_score: riskScore,
      crime_head_breakdown: headBreakdown,
      status_breakdown: statusBreakdown,
      category_breakdown: categoryBreakdown,
      crime_breakdown: categoryBreakdown,
      gravity_breakdown: gravityBreakdown,
      coordinates: [d.lat, d.lng],
      population: d.pop,
      urbanization_pct: d.urban,
      literacy_pct: d.literacy,
      unemployment_pct: d.unemployment,
    };
  });
}

// ── Generate Monthly Trends ───────────────────────────────────
function genMonthlyTrends(cases) {
  const monthly = {};
  const now = new Date();
  for (let m = 11; m >= 0; m--) {
    const d = new Date(now.getFullYear(), now.getMonth() - m, 1);
    const key = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`;
    monthly[key] = {};
    CRIME_HEADS.forEach(h => { monthly[key][h.CrimeGroupName] = 0; });
  }
  cases.forEach(c => {
    const d = new Date(c.CrimeRegisteredDate);
    const key = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`;
    if (monthly[key] !== undefined) monthly[key][c.CrimeMajorHeadName] = (monthly[key][c.CrimeMajorHeadName] || 0) + 1;
  });
  return monthly;
}

// ── Generate Hourly ───────────────────────────────────────────
function genHourly(cases) {
  const hourly = Array(24).fill(0);
  cases.forEach(c => {
    const hour = new Date(c.IncidentFromDate || c.date_time || c.CrimeRegisteredDate).getHours();
    if (hour >= 0 && hour < 24) hourly[hour]++;
  });
  return hourly;
}

// ── Generate Section Frequency ────────────────────────────────
function genSectionFrequency(cases) {
  const freq = {};
  cases.forEach(c => {
    const key = c.ipc_section || `${c._ActCode || 'IPC'} §${c._SectionCode || '420'}`;
    freq[key] = (freq[key] || 0) + 1;
  });
  return Object.entries(freq).sort((a, b) => b[1] - a[1]).slice(0, 15).map(([section, count]) => ({ section, count }));
}

// ── Generate Network (Accused associations) ───────────────────
function genNetwork(accused, cases) {
  const caseAccused = {};
  accused.forEach(a => {
    if (!caseAccused[a.CaseMasterID]) caseAccused[a.CaseMasterID] = [];
    caseAccused[a.CaseMasterID].push(a);
  });

  const nodes = accused.slice(0, 100).map(a => ({
    id: String(a.AccusedMasterID),
    name: a.AccusedName,
    type: 'accused',
    district: a._DistrictName,
    repeat_count: 0,
    mo: [],
    age: a.AgeYear,
    active: true,
    personID: a.PersonID,
    gender: a.GenderID === 1 ? 'Male' : 'Female',
  }));

  const links = [];
  Object.values(caseAccused).forEach(group => {
    if (group.length > 1) {
      for (let i = 0; i < group.length && i < 5; i++) {
        for (let j = i + 1; j < group.length && j < 5; j++) {
          if (nodes.some(n => n.id === String(group[i].AccusedMasterID)) &&
              nodes.some(n => n.id === String(group[j].AccusedMasterID))) {
            links.push({
              source: String(group[i].AccusedMasterID),
              target: String(group[j].AccusedMasterID),
              strength: 0.8,
              type: 'co-accused'
            });
          }
        }
      }
    }
  });

  return { nodes, links };
}

// ── Generate Alerts ───────────────────────────────────────────
function genAlerts(districtSummary) {
  const alerts = [];
  districtSummary.forEach(d => {
    if (d.risk_score >= 70) {
      alerts.push({
        alert_id: `ALT-${d.DistrictID}-1`,
        district: d.district,
        alert_type: 'High Heinous Crime Density',
        severity: d.risk_score >= 85 ? 'Critical' : 'High',
        message: `${d.district} has recorded ${d.heinous_cases} heinous cases with a Risk Score of ${d.risk_score}/100. Immediate deployment recommended.`,
        created_at: new Date().toISOString(),
        status: 'Active',
      });
    }
    if (d.under_investigation > 30) {
      alerts.push({
        alert_id: `ALT-${d.DistrictID}-2`,
        district: d.district,
        alert_type: 'Investigation Backlog',
        severity: 'Medium',
        message: `${d.district} currently has ${d.under_investigation} cases Under Investigation exceeding benchmark threshold.`,
        created_at: new Date(Date.now() - 3600000).toISOString(),
        status: 'Active',
      });
    }
  });
  return alerts;
}

// ── Generate Weekly Z-Scores ──────────────────────────────────
function genWeeklyZScores(cases) {
  const weeklyData = {};
  CRIME_HEADS.forEach(h => {
    const weeks = [];
    for (let w = 51; w >= 0; w--) {
      const base = rng.int(3, 18);
      weeks.push(base + (w < 6 ? rng.int(5, 25) : 0));
    }
    weeklyData[h.CrimeGroupName] = weeks;
  });
  return weeklyData;
}

// ─── Initialize Mock Data ─────────────────────────────────────
let _units = null, _employees = null, _cases = null;
let _accused = null, _victims = null, _arrests = null, _chargesheets = null;
let _districtSummary = null, _network = null;

function initMockData() {
  if (_cases) return;
  _units       = genUnits();
  _employees   = genEmployees(_units, 200);
  const rawCases = (CRIME_RECORDS_DATA && CRIME_RECORDS_DATA.length > 0) ? CRIME_RECORDS_DATA : ((typeof window !== 'undefined' && window.CRIME_RECORDS_DATA && window.CRIME_RECORDS_DATA.length > 0) ? window.CRIME_RECORDS_DATA : genCaseMaster(_units, _employees, 600));
  _cases = rawCases.map(c => ({
    ...c,
    incident_id: c.CrimeNo || c.CaseNo || c.incident_id,
    district: c._DistrictName || c.district || c._DistrictID,
    crime_type: c.CaseCategoryName || c.crime_type || c.CrimeMajorHeadName,
    ipc_section: c.ipc_section || `${c._SectionCode || '420'} ${c._ActCode || 'IPC'}`.trim(),
    date_time: c.date_time || c.IncidentFromDate || c.CrimeRegisteredDate,
    severity: c.severity || c.GravityOffenceName || 'Medium',
    status: c.status || c.CaseStatusName || 'Under Investigation',
    _DistrictName: c._DistrictName || c.district || c._DistrictID,
    CaseCategoryName: c.CaseCategoryName || c.crime_type || c.CrimeMajorHeadName,
    GravityOffenceName: c.GravityOffenceName || c.severity || 'Medium',
    CaseStatusName: c.CaseStatusName || c.status || 'Under Investigation',
  }));
  _accused     = genAccused(_cases);
  _victims     = genVictims(_cases);
  _arrests     = genArrestSurrender(_accused, _cases, _units);
  _chargesheets = genChargesheetDetails(_cases);
  _districtSummary = genDistrictSummary(_cases);
  _network     = genNetwork(_accused, _cases);
}


// ═══════════════════════════════════════════════════════════════
// PUBLIC API
// ═══════════════════════════════════════════════════════════════
export const api = {

  // ── Cases (CaseMaster) ────────────────────────────────────
  async getCases({ district, crimeHead, category, status, limit = 600 } = {}) {
    if (!DEMO_MODE) { const res = await request('/incidents-api/', { district, crimeHead, category, status, limit: 600 }); if (res !== null) return res; }
    initMockData();
    let result = _cases;
    if (district)   result = result.filter(c => c._DistrictName === district);
    if (crimeHead)  result = result.filter(c => c.CrimeMajorHeadName === crimeHead);
    if (category)   result = result.filter(c => c.CaseCategoryName === category);
    if (status)     result = result.filter(c => c.CaseStatusName === status);
    return result.slice(0, limit);
  },

  async getIncidents(params = {}) {
    return this.getCases({ ...params, limit: params.limit || 600 });
  },


  async getHotspots() {
    if (!DEMO_MODE) { const res = await request('/incidents-api/hotspots'); if (res !== null) return res; }
    initMockData();
    return _cases.map(c => ({
      lat: c.latitude, lng: c.longitude,
      intensity: (c.GravityOffenceName === 'Critical' || c.GravityOffenceName === 'Heinous') ? 1.0 : (c.GravityOffenceName === 'High') ? 0.8 : (c.GravityOffenceName === 'Medium' || c.GravityOffenceName === 'Non-Heinous') ? 0.5 : 0.3
    }));
  },

  async getHourlyDistribution() {
    if (!DEMO_MODE) { const res = await request('/incidents-api/hourly'); if (res !== null) return res; }
    initMockData();
    return genHourly(_cases);
  },

  // ── District Analytics ─────────────────────────────────────
  async getDistrictSummary() {
    if (!DEMO_MODE) { const res = await request('/analytics-api/district-summary'); if (res !== null) return res; }
    initMockData();
    return _districtSummary;
  },

  async getMonthlyTrends() {
    if (!DEMO_MODE) { const res = await request('/analytics-api/trends'); if (res !== null) return res; }
    initMockData();
    return genMonthlyTrends(_cases);
  },

  async getWeeklyZScores() {
    if (!DEMO_MODE) { const res = await request('/analytics-api/zscore'); if (res !== null) return res; }
    initMockData();
    return genWeeklyZScores(_cases);
  },

  async getSectionFrequency() {
    if (!DEMO_MODE) { const res = await request('/analytics-api/sections'); if (res !== null) return res; }
    initMockData();
    return genSectionFrequency(_cases);
  },

  async getCorrelationMatrix() {
    if (!DEMO_MODE) { const res = await request('/analytics-api/correlation'); if (res !== null) return res; }
    const vars = ['Unemployment %', 'Urbanization %', 'Literacy %', 'FIR Rate', 'Heinous Rate'];
    const rng2 = new SeededRandom(77);
    const matrix = vars.map((_, i) => vars.map((__, j) => {
      if (i === j) return 1.0;
      return parseFloat((rng2.float(-0.9, 0.9)).toFixed(2));
    }));
    return { variables: vars, matrix };
  },

  // ── KPI Summary ─────────────────────────────────────────────
  async getKpiSummary() {
    if (!DEMO_MODE) { const res = await request('/analytics-api/kpi'); if (res !== null) return res; }
    initMockData();
    const distSummary = _districtSummary;
    const hotspots = distSummary.filter(d => d.risk_score >= 70).length;
    const avgRisk = (distSummary.reduce((s, d) => s + d.risk_score, 0) / distSummary.length).toFixed(1);
    const alerts = genAlerts(distSummary);
    return {
      total_cases:          _cases.length,
      fir_count:            _cases.filter(c => c.CaseCategoryName === 'FIR' || c.CrimeNo.startsWith('KSP')).length,
      under_investigation:  _cases.filter(c => c.CaseStatusName === 'Under Investigation').length,
      heinous_cases:        _cases.filter(c => ['Heinous', 'Critical', 'High'].includes(c.GravityOffenceName)).length,
      chargesheeted:        _cases.filter(c => c.CaseStatusName === 'Chargesheeted').length,
      total_accused:        _accused.length,
      total_victims:        _victims.length,
      total_arrests:        _arrests.length,
      active_alerts:        alerts.length,
      hotspot_districts:    hotspots,
      avg_risk_score:       parseFloat(avgRisk),
    };
  },

  // ── Accused & Network ─────────────────────────────────────
  async getAccused({ search, district } = {}) {
    if (!DEMO_MODE) { const res = await request('/offenders-api/', { search, district }); if (res !== null) return res; }
    initMockData();
    let result = _accused;
    if (district) result = result.filter(a => a._DistrictName === district);
    if (search)   result = result.filter(a => a.AccusedName.toLowerCase().includes(search.toLowerCase()));
    return result;
  },

  async getNetwork() {
    if (!DEMO_MODE) { const res = await request('/offenders-api/network'); if (res !== null) return res; }
    initMockData();
    return _network;
  },

  // ── Alerts ────────────────────────────────────────────────
  async getAlerts() {
    if (!DEMO_MODE) { const res = await request('/alerts-api/', { active: true }); if (res !== null) return res; }
    initMockData();
    return genAlerts(_districtSummary);
  },

  // ── Reference Data ────────────────────────────────────────
  getCrimeHeads:      () => CRIME_HEADS,
  getCrimeSubHeads:   () => CRIME_SUBHEADS,
  getCaseCategories:  () => CASE_CATEGORIES,
  getGravityOffences: () => GRAVITY_OFFENCES,
  getCaseStatuses:    () => CASE_STATUSES,
  getActs:            () => ACTS,
  getDistricts:       () => KA_DISTRICTS,
  getRanks:           () => RANKS,

  // ── Chargesheet ───────────────────────────────────────────
  async getChargesheets() {
    initMockData();
    return _chargesheets;
  },

  // ── Victims ───────────────────────────────────────────────
  async getVictims({ district } = {}) {
    initMockData();
    let result = _victims;
    if (district) result = result.filter(v => v._DistrictName === district);
    return result;
  },

  // ── Arrests ───────────────────────────────────────────────
  async getArrestSurrender({ district } = {}) {
    initMockData();
    let result = _arrests;
    if (district) result = result.filter(a => a._DistrictName === district);
    return result;
  },
};

export default api;
