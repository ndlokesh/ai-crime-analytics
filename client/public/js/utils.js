/* ============================================================
   KSP Crime Analytics — Shared Utilities
   ============================================================ */

// ── Count-Up Animation ────────────────────────────────────────
export function animateCount(el, target, duration = 1500, prefix = '', suffix = '') {
  const start = performance.now();
  const isFloat = !Number.isInteger(target);

  function update(now) {
    const elapsed = now - start;
    const progress = Math.min(elapsed / duration, 1);
    const eased = 1 - Math.pow(1 - progress, 3); // ease-out cubic
    const current = eased * target;
    el.textContent = prefix + (isFloat ? current.toFixed(1) : Math.round(current).toLocaleString('en-IN')) + suffix;
    if (progress < 1) requestAnimationFrame(update);
  }
  requestAnimationFrame(update);
}

// ── Number Formatter ─────────────────────────────────────────
export function formatNumber(n) {
  if (n >= 1e6) return (n / 1e6).toFixed(1) + 'M';
  if (n >= 1e3) return (n / 1e3).toFixed(1) + 'K';
  return n.toLocaleString('en-IN');
}

// ── Date Formatter ────────────────────────────────────────────
export function formatDate(dateStr, opts = {}) {
  const d = new Date(dateStr);
  return d.toLocaleDateString('en-IN', {
    day: '2-digit', month: 'short', year: 'numeric', ...opts
  });
}

export function formatDateTime(dateStr) {
  const d = new Date(dateStr);
  return d.toLocaleString('en-IN', {
    day: '2-digit', month: 'short', year: 'numeric',
    hour: '2-digit', minute: '2-digit'
  });
}

// ── Risk Level ────────────────────────────────────────────────
export function getRiskLevel(score) {
  if (score >= 80) return { label: 'Critical', color: '#dc2626', badge: 'badge-red' };
  if (score >= 60) return { label: 'High',     color: '#f59e0b', badge: 'badge-amber' };
  if (score >= 40) return { label: 'Medium',   color: '#3b82f6', badge: 'badge-blue' };
  return                  { label: 'Low',      color: '#10b981', badge: 'badge-green' };
}

export function getRiskColor(score) {
  if (score >= 80) return '#dc2626';
  if (score >= 60) return '#f59e0b';
  if (score >= 40) return '#3b82f6';
  return '#10b981';
}

// ── CrimeHead Colors (aligned to ERD CrimeHead table) ────────
export const CRIME_HEAD_COLORS = {
  'Crimes Against Body':     '#dc2626',
  'Crimes Against Property': '#3b82f6',
  'Crimes Against Women':    '#ec4899',
  'Cyber Crimes':            '#8b5cf6',
  'Narcotics':               '#f59e0b',
  'Economic Offences':       '#06b6d4',
  'Public Order':            '#f97316',
  'SC/ST Crimes':            '#a855f7',
};

// ── CrimeSubHead Colors (minor heads mapped to parent) ────────
export const CRIME_SUBHEAD_COLORS = {
  'Murder':             '#991b1b',
  'Attempt to Murder':  '#dc2626',
  'Grievous Hurt':      '#ef4444',
  'Kidnapping':         '#f87171',
  'Theft':              '#3b82f6',
  'Robbery':            '#2563eb',
  'Burglary':           '#1d4ed8',
  'Cheating':           '#06b6d4',
  'Rape':               '#ec4899',
  'Domestic Violence':  '#db2777',
  'Molestation':        '#f472b6',
  'Cyber Fraud':        '#8b5cf6',
  'Online Cheating':    '#7c3aed',
  'Drug Trafficking':   '#f59e0b',
  'Drug Possession':    '#d97706',
  'Bank Fraud':         '#0891b2',
  'Rioting':            '#f97316',
  'SC/ST Atrocities':  '#a855f7',
};

export function crimeColor(type) {
  return CRIME_HEAD_COLORS[type] || CRIME_SUBHEAD_COLORS[type] || '#94a3b8';
}

// ── CaseCategory Badge ────────────────────────────────────────
export function categoryBadge(cat) {
  const map = { 'FIR': 'badge-red', 'UDR': 'badge-amber', 'PAR': 'badge-blue', 'Zero FIR': 'badge-purple' };
  return map[cat] || 'badge-gray';
}

// ── GravityOffence Badge ──────────────────────────────────────
export function gravityBadge(gravity) {
  if (gravity === 'Heinous')     return { cls: 'badge-red',   icon: '🔴' };
  if (gravity === 'Non-Heinous') return { cls: 'badge-amber', icon: '🟡' };
  return                                { cls: 'badge-green', icon: '🟢' };
}

// ── CaseStatus Color ──────────────────────────────────────────
export function statusColor(status) {
  const map = {
    'Under Investigation': '#f59e0b',
    'Charge Sheeted':      '#3b82f6',
    'Closed':              '#10b981',
    'Final Report Filed':  '#6b7280',
    'Referred to Court':   '#8b5cf6',
  };
  return map[status] || '#94a3b8';
}

// ── CrimeNo Parser (real KSP format) ─────────────────────────
// Format: CategoryCode(1) + DistrictID(4) + StationID(4) + Year(4) + Serial(5)
export function parseCrimeNo(crimeNo) {
  if (!crimeNo || crimeNo.length < 18) return null;
  const catMap = { '1': 'FIR', '3': 'UDR', '4': 'PAR', '8': 'Zero FIR' };
  return {
    category:   catMap[crimeNo[0]] || crimeNo[0],
    districtID: crimeNo.slice(1, 5),
    stationID:  crimeNo.slice(5, 9),
    year:       crimeNo.slice(9, 13),
    serial:     crimeNo.slice(13),
  };
}

// ── Chargesheet Type Label ────────────────────────────────────
export function csTypeLabel(cstype) {
  return { A: 'Chargesheet Filed', B: 'False Case', C: 'Undetected' }[cstype] || cstype;
}

// ── Act+Section display ───────────────────────────────────────
export function formatSection(actCode, sectionCode) {
  return `${actCode} §${sectionCode}`;
}

// ── Chart.js Default Config ───────────────────────────────────
export const CHART_DEFAULTS = {
  responsive: true,
  maintainAspectRatio: false,
  plugins: {
    legend: {
      labels: {
        color: '#94a3b8',
        font: { family: 'Inter', size: 12 },
        boxWidth: 10, boxHeight: 10, padding: 16
      }
    },
    tooltip: {
      backgroundColor: 'rgba(2,8,24,0.95)',
      borderColor: 'rgba(255,255,255,0.08)',
      borderWidth: 1,
      titleColor: '#f1f5f9',
      bodyColor: '#94a3b8',
      titleFont: { family: 'Inter', size: 13, weight: '700' },
      bodyFont: { family: 'Inter', size: 12 },
      padding: 12,
      cornerRadius: 8
    }
  },
  scales: {
    x: {
      ticks: { color: '#475569', font: { family: 'Inter', size: 11 } },
      grid: { color: 'rgba(255,255,255,0.04)' },
      border: { color: 'rgba(255,255,255,0.06)' }
    },
    y: {
      ticks: { color: '#475569', font: { family: 'Inter', size: 11 } },
      grid: { color: 'rgba(255,255,255,0.04)' },
      border: { color: 'rgba(255,255,255,0.06)' }
    }
  }
};

// ── Gradient Helper for Chart.js ──────────────────────────────
export function makeGradient(ctx, colorStart, colorEnd) {
  const grad = ctx.createLinearGradient(0, 0, 0, ctx.canvas.height);
  grad.addColorStop(0, colorStart);
  grad.addColorStop(1, colorEnd);
  return grad;
}

// ── Karnataka District Coordinates ───────────────────────────
export const DISTRICT_COORDS = {
  'Bagalkot':         [16.1833, 75.7000],
  'Ballari':          [15.1394, 76.9214],
  'Belagavi':         [15.8497, 74.4977],
  'Bengaluru Rural':  [13.2189, 77.5733],
  'Bengaluru Urban':  [12.9716, 77.5946],
  'Bidar':            [17.9104, 76.9247],
  'Chamarajanagar':   [11.9261, 76.9451],
  'Chikkaballapura':  [13.4355, 77.7315],
  'Chikkamagaluru':   [13.3161, 75.7765],
  'Chitradurga':      [14.2272, 76.3975],
  'Dakshina Kannada': [12.8703, 75.3405],
  'Davangere':        [14.4644, 75.9218],
  'Dharwad':          [15.4589, 75.0078],
  'Gadag':            [15.4166, 75.6339],
  'Hassan':           [13.0068, 76.0996],
  'Haveri':           [14.7957, 75.4036],
  'Kalaburagi':       [17.3297, 76.8200],
  'Kodagu':           [12.4217, 75.7397],
  'Kolar':            [13.1358, 78.1294],
  'Koppal':           [15.3534, 76.1549],
  'Mandya':           [12.5218, 76.8951],
  'Mysuru':           [12.2958, 76.6394],
  'Raichur':          [16.2120, 77.3439],
  'Ramanagara':       [12.7154, 77.2869],
  'Shivamogga':       [13.9299, 75.5681],
  'Tumakuru':         [13.3379, 77.1173],
  'Udupi':            [13.3409, 74.7421],
  'Uttara Kannada':   [14.7860, 74.6875],
  'Vijayapura':       [16.8302, 75.7100],
  'Yadgir':           [16.7630, 77.1384],
};

// ── Z-Score Calculator ────────────────────────────────────────
export function zScore(values) {
  const n = values.length;
  const mean = values.reduce((a, b) => a + b, 0) / n;
  const variance = values.reduce((a, v) => a + Math.pow(v - mean, 2), 0) / n;
  const std = Math.sqrt(variance);
  return values.map(v => std === 0 ? 0 : (v - mean) / std);
}

// ── Debounce ─────────────────────────────────────────────────
export function debounce(fn, delay = 300) {
  let timer;
  return (...args) => {
    clearTimeout(timer);
    timer = setTimeout(() => fn(...args), delay);
  };
}

// ── DOM helpers ───────────────────────────────────────────────
export const $ = (sel, parent = document) => parent.querySelector(sel);
export const $$ = (sel, parent = document) => [...parent.querySelectorAll(sel)];

export function createElement(tag, cls, html = '') {
  const el = document.createElement(tag);
  if (cls) el.className = cls;
  if (html) el.innerHTML = html;
  return el;
}

// ── Month Labels ──────────────────────────────────────────────
export const MONTHS = ['Jan','Feb','Mar','Apr','May','Jun','Jul','Aug','Sep','Oct','Nov','Dec'];

// ── Seeded Random (deterministic) ────────────────────────────
export class SeededRandom {
  constructor(seed = 42) { this.seed = seed; }
  next() {
    this.seed = (this.seed * 1664525 + 1013904223) & 0xffffffff;
    return (this.seed >>> 0) / 4294967296;
  }
  int(min, max) { return Math.floor(this.next() * (max - min + 1)) + min; }
  pick(arr) { return arr[this.int(0, arr.length - 1)]; }
  float(min, max) { return this.next() * (max - min) + min; }
}

// ── Show Notification Toast ───────────────────────────────────
export function showToast(message, type = 'info', duration = 3500) {
  const colors = { info: '#3b82f6', success: '#10b981', error: '#dc2626', warning: '#f59e0b' };
  const toast = document.createElement('div');
  toast.style.cssText = `
    position: fixed; bottom: 24px; right: 24px; z-index: 99999;
    background: rgba(6,15,36,0.98); border: 1px solid ${colors[type]}40;
    border-left: 3px solid ${colors[type]}; border-radius: 10px;
    padding: 14px 20px; max-width: 360px;
    color: #f1f5f9; font-size: 13px; font-family: Inter, sans-serif;
    box-shadow: 0 8px 30px rgba(0,0,0,0.5);
    animation: slideInRight 0.3s ease; backdrop-filter: blur(20px);
  `;
  toast.textContent = message;
  document.body.appendChild(toast);
  setTimeout(() => { toast.style.opacity = '0'; toast.style.transition = 'opacity 0.3s ease'; setTimeout(() => toast.remove(), 300); }, duration);
}
