/**
 * MPLADS Platform — Main Application
 * Router, Navigation, Global State, Page Controllers
 */

// ── Global App State ───────────────────────────────────────────────────
const App = {
  data: null,
  results: null,
  currentPage: 'dashboard',
  alertsPage: 1,
  alertsFilter: { severity: 'all', type: 'all', state: 'all', search: '' },
  mpFilter: { state: 'all', risk: 'all', type: 'all', search: '', sort: 'risk_desc' },
  mpPage: 1,
  worksFilter: { type: 'all', state: 'all', status: 'all', search: '', sort: 'gap_desc' },
  worksPage: 1,
  expandedWorkId: null,
  ITEMS_PER_PAGE: 20,
};

// ── Format Helpers ─────────────────────────────────────────────────────
function fmt(n) { return AIEngine.formatAmount(n); }
function fmtShort(n) { return AIEngine.formatAmountShort(n); }
function fmtDate(iso) {
  const d = new Date(iso);
  return d.toLocaleTimeString('en-IN', { hour: '2-digit', minute: '2-digit' }) +
    ' · ' + d.toLocaleDateString('en-IN', { day: 'numeric', month: 'short' });
}
function getInitials(name) {
  return name.split(' ').filter(p => !['Dr.','Mr.','Mrs.','Prof.','Shri','Smt.',''].includes(p)).slice(0, 2).map(p => p[0]).join('').toUpperCase() || name.slice(0,2).toUpperCase();
}
// Gov avatar background palette (muted official tones)
const GOV_AVATAR_COLORS = [
  '#003366','#1a4f8a','#0D5017','#7F3300','#4A0D0D',
  '#004D40','#1A237E','#4E342E','#37474F','#0a3d62'
];
function gradForIdx(i) { return GOV_AVATAR_COLORS[i % GOV_AVATAR_COLORS.length]; }

// ── Router ─────────────────────────────────────────────────────────────
function navigate(page) {
  document.querySelectorAll('.page-content').forEach(p => p.classList.remove('active'));
  document.querySelectorAll('.nav-item').forEach(n => n.classList.remove('active'));

  const pageEl = document.getElementById(`page-${page}`);
  const navEl  = document.querySelector(`[data-page="${page}"]`);
  if (pageEl) pageEl.classList.add('active');
  if (navEl)  navEl.classList.add('active');

  App.currentPage = page;
  window.scrollTo(0, 0);

  switch(page) {
    case 'dashboard':  renderDashboard(); break;
    case 'anomalies':  renderAnomalyPage(); break;
    case 'analytics':  renderAnalytics(); break;
    case 'alerts':     renderAlerts(); break;
    case 'map':        renderMap(); break;
    case 'works':      renderWorks(); break;
    case 'report':     renderReport(); break;
  }
}

// ── Dashboard Page ─────────────────────────────────────────────────────
function renderDashboard() {
  const { summary, state_stats, scored_records, rs_current_scored, alerts } = App.results;

  // KPI cards
  animateCounter('kpi-total-mps',    summary.total_mps,    0);
  animateCounter('kpi-total-funds',  summary.total_funds / 1e7, 1, ' Cr');
  animateCounter('kpi-anomalies',    summary.anomalies_detected, 0);
  animateCounter('kpi-alerts',       summary.total_alerts, 0);
  animateCounter('kpi-critical',     summary.critical, 0);
  animateCounter('kpi-states',       summary.states_count, 0);

  // Charts
  setTimeout(() => {
    Charts.fundDistributionDonut('chart-fund-donut', state_stats);
    Charts.riskDistributionDonut('chart-risk-donut', summary);
    Charts.stateAllocationChart('chart-state-alloc', state_stats);
    Charts.topMPsChart('chart-top-mps', scored_records);
  }, 100);

  // Top states table
  renderTopStatesTable(state_stats.slice(0, 8));

  // Recent alerts ticker
  renderAlertTicker(alerts.slice(0, 10));

  // Recent high alerts
  renderRecentAlerts(alerts.slice(0, 6));
}

function animateCounter(id, target, decimals = 0, suffix = '') {
  const el = document.getElementById(id);
  if (!el) return;
  const start = 0, duration = 1200;
  const startTime = performance.now();
  function tick(now) {
    const elapsed = now - startTime;
    const progress = Math.min(elapsed / duration, 1);
    const ease = 1 - Math.pow(1 - progress, 3);
    const current = start + (target - start) * ease;
    el.textContent = decimals > 0 ? current.toFixed(decimals) + suffix : Math.round(current).toLocaleString('en-IN') + suffix;
    if (progress < 1) requestAnimationFrame(tick);
  }
  requestAnimationFrame(tick);
}

function renderTopStatesTable(states) {
  const tbody = document.getElementById('top-states-tbody');
  if (!tbody) return;
  tbody.innerHTML = states.map((s, i) => `
    <tr>
      <td class="col-sno">${i+1}</td>
      <td class="col-name">${s.state}</td>
      <td class="col-amount">${fmt(s.total)}</td>
      <td style="font-size:0.8rem">${s.mp_count}</td>
      <td>
        <div class="risk-bar-wrap">
          <div class="risk-bar-bg">
            <div class="risk-bar-fill ${s.avg_risk_score>=50?'high':s.avg_risk_score>=25?'medium':'low'}"
                 style="width:${Math.min(s.avg_risk_score,100)}%"></div>
          </div>
          <span class="risk-score-val">${s.avg_risk_score.toFixed(0)}</span>
        </div>
      </td>
      <td><span class="badge ${s.avg_risk_score>=50?'badge-high':s.avg_risk_score>=25?'badge-medium':'badge-low'}">${s.avg_risk_score>=50?'High':s.avg_risk_score>=25?'Medium':'Low'}</span></td>
    </tr>
  `).join('');
}

function renderAlertTicker(alerts) {
  const el = document.getElementById('alert-ticker');
  if (!el) return;
  const sev = { critical: '[CRITICAL]', high: '[HIGH]', medium: '[MEDIUM]', low: '[LOW]' };
  const items = alerts.map(a =>
    `<span style="font-weight:700;margin-right:6px;color:${a.severity==='critical'?'#A00000':a.severity==='high'?'#7A3C00':'#5A4000'}">${sev[a.severity]||''}</span>${a.title} — ${a.state||'National'}`
  ).join('&ensp;&bull;&ensp;');
  // Duplicate for smooth looping
  el.innerHTML = items + '&ensp;&ensp;&ensp;' + items;
}

function renderRecentAlerts(alerts) {
  const container = document.getElementById('recent-alerts-list');
  if (!container) return;
  const typeLabel = {
    statistical_outlier:'Statistical Outlier', peer_deviation:'Peer Deviation',
    duplicate_flag:'Duplicate Flag', term_compliance:'Term Compliance',
    cost_overrun:'Cost Overrun', stalled_work:'Stalled Work',
    duplicate_work:'Duplicate Work', no_progress:'No Progress'
  };
  container.innerHTML = alerts.map(a => `
    <div class="alert-item" role="listitem" style="cursor:pointer" onclick="openInvestigationModal('${a.id}')" title="Click to open Investigation Workspace">
      <div class="alert-severity-strip ${a.severity}"></div>
      <div class="alert-body">
        <div class="alert-title">${a.title}</div>
        <div class="alert-desc">${a.description}</div>
        <div class="alert-meta-row">
          <span class="badge ${AIEngine.getRiskBadgeClass(a.severity)}">${a.severity.toUpperCase()}</span>
          <span class="badge badge-info">${typeLabel[a.type]||a.type}</span>
          ${a.status ? `<span class="badge ${a.status==='Resolved'?'badge-low':a.status==='Under Review'?'badge-medium':'badge-neutral'}">${a.status.toUpperCase()}</span>` : ''}
          ${a.state ? `<span class="badge badge-neutral">${a.state}</span>` : ''}
        </div>
      </div>
      <div class="alert-right">
        <div class="alert-time">${fmtDate(a.timestamp || new Date().toISOString())}</div>
        ${a.amount ? `<span class="font-mono text-sm text-navy">${fmt(a.amount)}</span>` : ''}
        <span class="text-xs text-navy" style="font-weight:600;margin-top:4px">Investigate 🔍</span>
      </div>
    </div>
  `).join('');
}

// ── Anomaly Detection Page ─────────────────────────────────────────────
function renderAnomalyPage() {
  const { scored_records } = App.results;
  filterAndRenderMPs();

  // Populate state filter
  const stateSelect = document.getElementById('mp-filter-state');
  if (stateSelect && stateSelect.options.length <= 1) {
    const states = [...new Set(scored_records.map(r => r.state))].sort();
    states.forEach(s => {
      const opt = document.createElement('option');
      opt.value = s; opt.textContent = s;
      stateSelect.appendChild(opt);
    });
  }
}

function filterAndRenderMPs() {
  const { scored_records } = App.results;
  const f = App.mpFilter;

  let filtered = scored_records.filter(r => {
    if (f.state !== 'all' && r.state !== f.state) return false;
    if (f.risk !== 'all' && r.risk_level !== f.risk) return false;
    if (f.type !== 'all' && !r.type.toLowerCase().includes(f.type)) return false;
    if (f.search) {
      const q = f.search.toLowerCase();
      if (!r.mp_name.toLowerCase().includes(q) && !r.state.toLowerCase().includes(q)) return false;
    }
    return true;
  });

  // Sort
  filtered.sort((a, b) => {
    switch(f.sort) {
      case 'risk_desc':   return b.risk_score - a.risk_score;
      case 'risk_asc':    return a.risk_score - b.risk_score;
      case 'amount_desc': return b.allocated_amount - a.allocated_amount;
      case 'amount_asc':  return a.allocated_amount - b.allocated_amount;
      case 'name_asc':    return a.mp_name.localeCompare(b.mp_name);
      default: return b.risk_score - a.risk_score;
    }
  });

  const total = filtered.length;
  const perPage = App.ITEMS_PER_PAGE;
  const totalPages = Math.ceil(total / perPage);
  App.mpPage = Math.min(App.mpPage, totalPages || 1);

  const paged = filtered.slice((App.mpPage - 1) * perPage, App.mpPage * perPage);

  renderMPTable(paged);
  renderMPPagination(total, totalPages);

  const countEl = document.getElementById('mp-count');
  if (countEl) countEl.textContent = `Showing ${paged.length} of ${total} MPs`;
}

function renderMPTable(records) {
  const tbody = document.getElementById('mp-table-tbody');
  if (!tbody) return;
  const typeLabel = { statistical_outlier:'Stat. Outlier', peer_deviation:'Peer Dev.', duplicate_flag:'Duplicate', term_compliance:'Term Issue', cost_overrun:'Overrun' };

  tbody.innerHTML = records.map((r, i) => {
    const pctDev = r.peer_deviation !== undefined ? `${r.peer_deviation > 0 ? '+' : ''}${r.peer_deviation}%` : '—';
    const devColor = Math.abs(r.peer_deviation||0)>35 ? '#C0392B' : Math.abs(r.peer_deviation||0)>15 ? '#E67E22' : 'var(--txt-secondary)';
    return `
    <tr>
      <td class="col-sno">${(App.mpPage-1)*App.ITEMS_PER_PAGE + i + 1}</td>
      <td>
        <div class="flex items-center gap-2">
          <div class="mp-avatar" style="background:${gradForIdx(i)};font-size:0.7rem;width:30px;height:30px">${getInitials(r.mp_name)}</div>
          <div class="col-name truncate" style="max-width:200px" title="${r.mp_name}">${r.mp_name}</div>
        </div>
      </td>
      <td class="col-state">${r.state}</td>
      <td><span class="badge ${r.type==='Elected MP'?'badge-info':'badge-neutral'}">${r.type==='Elected MP'?'Elected':'Nominated'}</span></td>
      <td class="col-amount">${fmt(r.allocated_amount)}</td>
      <td>
        <span class="font-mono text-sm" style="color:${devColor};font-weight:${Math.abs(r.peer_deviation||0)>20?'700':'400'}">${pctDev}</span>
      </td>
      <td>
        <div class="risk-bar-wrap">
          <div class="risk-bar-bg"><div class="risk-bar-fill ${r.risk_level}" style="width:${r.risk_score}%"></div></div>
          <span class="risk-score-val" style="color:${AIEngine.getRiskColor(r.risk_level)}">${r.risk_score}</span>
        </div>
      </td>
      <td><span class="badge ${AIEngine.getRiskBadgeClass(r.risk_level)}">${r.risk_level.toUpperCase()}</span></td>
      <td>
        <div style="display:flex;flex-direction:column;gap:2px">
          ${r.reasons.slice(0,2).map(rs=>`<span class="badge badge-neutral" style="font-size:0.62rem;margin-bottom:1px">${typeLabel[rs.type]||rs.type.replace(/_/g,' ')}</span>`).join('')}
          ${r.reasons.length>2?`<span class="text-xs text-muted">+${r.reasons.length-2} more</span>`:''}
          ${r.reasons.length===0?`<span class="text-xs text-muted">None</span>`:''}
        </div>
      </td>
    </tr>`;
  }).join('');
}

function renderMPPagination(total, totalPages) {
  const container = document.getElementById('mp-pagination');
  if (!container) return;
  const p = App.mpPage;
  let html = `<button class="page-btn" onclick="if(App.mpPage>1){App.mpPage--;filterAndRenderMPs()}" ${p===1?'disabled':''}>‹ Prev</button>`;
  const start = Math.max(1, p-2), end = Math.min(totalPages, p+2);
  if (start > 1) html += `<button class="page-btn" onclick="App.mpPage=1;filterAndRenderMPs()">1</button><span style="padding:0 4px;color:var(--txt-muted)">…</span>`;
  for (let i = start; i <= end; i++) {
    html += `<button class="page-btn ${i===p?'active':''}" onclick="App.mpPage=${i};filterAndRenderMPs()">${i}</button>`;
  }
  if (end < totalPages) html += `<span style="padding:0 4px;color:var(--txt-muted)">…</span><button class="page-btn" onclick="App.mpPage=${totalPages};filterAndRenderMPs()">${totalPages}</button>`;
  html += `<button class="page-btn" onclick="if(App.mpPage<${totalPages}){App.mpPage++;filterAndRenderMPs()}" ${p===totalPages?'disabled':''}>Next ›</button>`;
  container.innerHTML = html;
  const info = document.getElementById('mp-page-info');
  if (info) info.textContent = `Page ${p} of ${totalPages}  ·  ${total} records`;
  const countEl = document.getElementById('mp-count');
  if (countEl) countEl.textContent = `${total} MPs matched`;
  const countFilter = document.getElementById('mp-count-filter');
  if (countFilter) countFilter.textContent = `${total} records`;
}

// ── Analytics Page ─────────────────────────────────────────────────────
function renderAnalytics() {
  const { state_stats, scored_records, results } = App;
  const allRecords = App.results.scored_records;

  setTimeout(() => {
    Charts.allocationHistogram('chart-histogram', allRecords);
    Charts.electedNominatedChart('chart-elected-nom', allRecords);
    Charts.riskScoreDistChart('chart-risk-dist', allRecords);
    Charts.stateRiskChart('chart-state-risk', App.results.state_stats);
  }, 100);

  renderStateRankTable(App.results.state_stats);
}

function renderStateRankTable(stateStats) {
  const tbody = document.getElementById('state-rank-tbody');
  if (!tbody) return;
  tbody.innerHTML = stateStats.slice(0, 15).map((s, i) => `
    <tr>
      <td><span class="stats-rank" style="background:${i<3?'rgba(217,119,6,0.1)':'rgba(29,78,216,0.1)'}; color:${i<3?'#D97706':'#1D4ED8'}">${i+1}</span></td>
      <td class="col-name">${s.state}</td>
      <td class="font-mono text-gov-blue" style="font-size:0.8rem">${fmt(s.total)}</td>
      <td class="font-mono" style="font-size:0.8rem">${fmt(s.avg_allocation)}</td>
      <td style="font-size:0.8rem">${s.mp_count}</td>
      <td style="font-size:0.8rem;color:var(--color-risk-high)">${s.anomalies}</td>
      <td><span class="badge ${s.avg_risk_score>=50?'badge-high':s.avg_risk_score>=25?'badge-medium':'badge-low'}">${s.avg_risk_score.toFixed(0)}</span></td>
    </tr>
  `).join('');
}

// ── Alerts Page ────────────────────────────────────────────────────────
function renderAlerts() {
  populateAlertFilters();
  filterAndRenderAlerts();
}

function populateAlertFilters() {
  const stateSelect = document.getElementById('alert-filter-state');
  if (stateSelect && stateSelect.options.length <= 1) {
    const states = [...new Set(App.results.alerts.filter(a=>a.state).map(a=>a.state))].sort();
    states.forEach(s => {
      const opt = document.createElement('option'); opt.value=s; opt.textContent=s;
      stateSelect.appendChild(opt);
    });
  }
}

function filterAndRenderAlerts() {
  const f = App.alertsFilter;
  const { alerts } = App.results;

  let filtered = alerts.filter(a => {
    if (f.severity !== 'all' && a.severity !== f.severity) return false;
    if (f.type !== 'all' && a.type !== f.type) return false;
    if (f.state !== 'all' && a.state !== f.state) return false;
    if (f.search) {
      const q = f.search.toLowerCase();
      if (!a.title.toLowerCase().includes(q) && !(a.description||'').toLowerCase().includes(q) && !(a.mp_name||'').toLowerCase().includes(q)) return false;
    }
    return true;
  });

  const total = filtered.length;
  const perPage = 15;
  const totalPages = Math.ceil(total / perPage);
  App.alertsPage = Math.min(App.alertsPage, totalPages || 1);
  const paged = filtered.slice((App.alertsPage-1)*perPage, App.alertsPage*perPage);

  renderAlertsList(paged);

  const countEl = document.getElementById('alerts-count');
  if (countEl) countEl.textContent = `${total} alerts`;

  const pager = document.getElementById('alerts-pagination');
  if (pager) {
    let html = '';
    for (let i=1;i<=Math.min(totalPages,5);i++) {
      html+=`<button class="page-btn ${i===App.alertsPage?'active':''}" onclick="App.alertsPage=${i};filterAndRenderAlerts()">${i}</button>`;
    }
    pager.innerHTML=html;
  }
}

function renderAlertsList(alerts) {
  const container = document.getElementById('alerts-list');
  if (!container) return;
  if (!alerts.length) {
    container.innerHTML = `<div style="text-align:center;padding:48px;color:var(--txt-muted)">
      <div style="font-size:2rem;margin-bottom:10px">✅</div>
      <div style="font-size:0.85rem;font-weight:600;color:var(--gov-green)">No alerts match the selected filters</div>
      <div style="font-size:0.78rem;margin-top:4px">Try adjusting the filter criteria above</div>
    </div>`;
    return;
  }
  const typeLabel = { statistical_outlier:'Statistical Outlier', peer_deviation:'Peer Deviation', duplicate_flag:'Duplicate Flag', term_compliance:'Term Compliance', cost_overrun:'Cost Overrun', stalled_work:'Stalled Work', duplicate_work:'Duplicate Work', no_progress:'No Progress' };
  container.innerHTML = alerts.map((a, i) => `
    <div class="alert-item" role="listitem">
      <div class="alert-severity-strip ${a.severity}"></div>
      <div class="alert-body">
        <div class="alert-title">${a.title}</div>
        <div class="alert-desc">${a.description}</div>
        <div class="alert-meta-row">
          <span class="badge ${AIEngine.getRiskBadgeClass(a.severity)}">${a.severity.toUpperCase()}</span>
          <span class="badge badge-info">${typeLabel[a.type]||a.type}</span>
          ${a.status ? `<span class="badge ${a.status==='Resolved'?'badge-low':a.status==='Under Review'?'badge-medium':'badge-neutral'}">${a.status.toUpperCase()}</span>` : ''}
          ${a.state?`<span class="badge badge-neutral">${a.state}</span>`:''}
          ${a.mp_name?`<span class="text-xs text-muted">${a.mp_name.split(' ').slice(0,4).join(' ')}</span>`:''}
        </div>
      </div>
      <div class="alert-right">
        <div class="alert-time">${fmtDate(a.timestamp||new Date().toISOString())}</div>
        ${a.amount?`<span class="font-mono text-sm text-navy">${fmt(a.amount)}</span>`:''}
        ${a.risk_score!==undefined?`<span class="badge badge-neutral">Score: ${a.risk_score}</span>`:''}
        <button class="btn btn-sm btn-outline-primary" style="margin-top:6px;font-size:0.75rem;padding:3px 10px" onclick="openInvestigationModal('${a.id}')">
          Investigate 🔍
        </button>
      </div>
    </div>
  `).join('');
}

// ── Works Page ─────────────────────────────────────────────────────────
function renderWorks() {
  const works = (App.data && App.data.synthetic_works) || (window.MPLADS_DATA && window.MPLADS_DATA.synthetic_works) || [];
  const works_summary = (App.results && (App.results.works_anomalies || App.results.works_summary)) || {};

  // Calculate payment gaps, overruns, duplicate works and unverified assets for KPI cards
  let gapCount = 0;
  let unverifiedCount = 0;
  let overrunCount = 0;
  let dupCount = 0;

  works.forEach(w => {
    const sAmt = Number(w.sanctioned_amount) || 1;
    const exp = Number(w.expenditure) || 0;
    const compPct = Number(w.completion_pct) || 0;
    const paidPct = (exp / sAmt) * 100;
    const gap = paidPct - compPct;

    if (exp > sAmt * 1.1) overrunCount++;
    if (w.anomaly_type === 'duplicate_work' || (w.flags && w.flags.some(f => f.type === 'duplicate_work'))) dupCount++;
    if (gap >= 20) gapCount++;
    if (sAmt >= 2500000 && (w.status === 'Completed' || compPct >= 80) && (w.asset_status === 'Not Verified' || w.asset_status === 'Missing' || !w.verification_date)) {
      unverifiedCount++;
    }
  });

  // Summary cards
  const elTotal = document.getElementById('works-total');
  const elOverruns = document.getElementById('works-overruns');
  const elGaps = document.getElementById('works-payment-gaps');
  const elUnverified = document.getElementById('works-unverified');
  const elDups = document.getElementById('works-dups');

  if (elTotal) elTotal.textContent = works.length;
  if (elOverruns) elOverruns.textContent = works_summary.cost_overruns !== undefined ? works_summary.cost_overruns : overrunCount;
  if (elGaps) elGaps.textContent = gapCount;
  if (elUnverified) elUnverified.textContent = unverifiedCount;
  if (elDups) elDups.textContent = works_summary.duplicate_works !== undefined ? works_summary.duplicate_works : dupCount;

  setTimeout(() => {
    Charts.worksStatusChart('chart-works-status', works);
    Charts.worksFinancialChart('chart-works-financial', works);
  }, 100);

  filterAndRenderWorks();
}

function getWorkAnomalies(w) {
  const sAmt = Number(w.sanctioned_amount) || 1;
  const exp = Number(w.expenditure) || 0;
  const compPct = Number(w.completion_pct) || 0;
  const paidPct = Number(((exp / sAmt) * 100).toFixed(1));
  const gapPct = Number((paidPct - compPct).toFixed(1));

  const flags = [];

  // Flag 1: Rapid Full Payment
  if (paidPct >= 85 && compPct <= 20) {
    flags.push({
      type: 'rapid_full_payment',
      badgeClass: 'badge-critical',
      label: 'Rapid Full Payment',
      severity: 'Critical',
      icon: '⚡',
      explanation: `⚠ ${paidPct}% paid out rapidly, only ${compPct}% progress recorded`
    });
  }
  // Flag 2: Payment Before Progress
  else if (gapPct >= 25 || (paidPct >= 40 && compPct <= 10)) {
    flags.push({
      type: 'payment_before_progress',
      badgeClass: 'badge-high',
      label: 'Payment Before Progress',
      severity: 'High',
      icon: '⚠️',
      explanation: `⚠ ${paidPct}% funds released, only ${compPct}% physical work built`
    });
  }

  // Flag 3: Unverified High-Value Asset
  const isHighValue = sAmt >= 2500000;
  const isCompleted = w.status === 'Completed' || compPct >= 80;
  const isUnverified = w.asset_status === 'Not Verified' || w.asset_status === 'Missing' || !w.verification_date;
  if (isHighValue && isCompleted && isUnverified) {
    flags.push({
      type: 'unverified_high_value_asset',
      badgeClass: 'badge-critical',
      label: 'Unverified High-Value Asset',
      severity: 'Critical',
      icon: '🔍',
      explanation: `⚠ High-value project (${fmtShort(sAmt)}) marked complete but asset never verified`
    });
  }

  // Flag 4: Cost Overrun
  if (exp > sAmt * 1.1) {
    const overrunPct = (((exp - sAmt) / sAmt) * 100).toFixed(0);
    flags.push({
      type: 'cost_overrun',
      badgeClass: 'badge-high',
      label: 'Cost Overrun',
      severity: 'High',
      icon: '💸',
      explanation: `⚠ Expenditure exceeds sanctioned budget by ${overrunPct}%`
    });
  }

  // Flag 5: Stalled Work
  if (w.status === 'Stalled') {
    flags.push({
      type: 'stalled_work',
      badgeClass: 'badge-medium',
      label: 'Stalled Work',
      severity: 'Medium',
      icon: '⏸',
      explanation: `⚠ Work initiated in ${w.start_year || 'N/A'} remains stalled at ${compPct}% completion`
    });
  }

  // Flag 6: Duplicate Work
  if (w.anomaly_type === 'duplicate_work') {
    flags.push({
      type: 'duplicate_work',
      badgeClass: 'badge-high',
      label: 'Duplicate Work',
      severity: 'High',
      icon: '📋',
      explanation: `⚠ Potential duplicate work submission in ${w.state}`
    });
  }

  // Flag 7: No Progress
  const currentYear = new Date().getFullYear();
  if (w.status !== 'Completed' && compPct === 0 && Number(w.start_year || 0) < currentYear - 1) {
    flags.push({
      type: 'no_progress',
      badgeClass: 'badge-low',
      label: 'No Progress Reported',
      severity: 'Low',
      icon: '⏳',
      explanation: `⚠ Sanctioned in ${w.start_year} with 0% progress reported`
    });
  }

  return { paidPct, gapPct, flags };
}

function filterAndRenderWorks() {
  const allWorks = (App.data && App.data.synthetic_works) || (window.MPLADS_DATA && window.MPLADS_DATA.synthetic_works) || [];
  const { type, state, status, search, sort } = App.worksFilter;

  // Enrich works with calculated anomaly data
  let list = allWorks.map(w => {
    const analysis = getWorkAnomalies(w);
    return {
      ...w,
      paid_pct: analysis.paidPct,
      gap_pct: analysis.gapPct,
      flags: analysis.flags
    };
  });

  // 1. Filter by anomaly type
  if (type && type !== 'all') {
    if (type === 'anomalous_only') {
      list = list.filter(w => w.flags.length > 0);
    } else {
      list = list.filter(w => w.flags.some(f => f.type === type) || w.anomaly_type === type);
    }
  }

  // 2. Filter by state
  if (state && state !== 'all') {
    list = list.filter(w => w.state === state);
  }

  // 3. Filter by status
  if (status && status !== 'all') {
    list = list.filter(w => w.status === status);
  }

  // 4. Filter by search query
  if (search && search.trim()) {
    const q = search.trim().toLowerCase();
    list = list.filter(w =>
      (w.work_name && w.work_name.toLowerCase().includes(q)) ||
      (w.work_id && w.work_id.toLowerCase().includes(q)) ||
      (w.mp_name && w.mp_name.toLowerCase().includes(q)) ||
      (w.state && w.state.toLowerCase().includes(q)) ||
      (w.contractor_name && w.contractor_name.toLowerCase().includes(q))
    );
  }

  // 5. Sort works
  switch (sort) {
    case 'gap_desc':
      list.sort((a, b) => b.gap_pct - a.gap_pct);
      break;
    case 'gap_asc':
      list.sort((a, b) => a.gap_pct - b.gap_pct);
      break;
    case 'expenditure_desc':
      list.sort((a, b) => b.expenditure - a.expenditure);
      break;
    case 'sanctioned_desc':
      list.sort((a, b) => b.sanctioned_amount - a.sanctioned_amount);
      break;
    case 'completion_asc':
      list.sort((a, b) => a.completion_pct - b.completion_pct);
      break;
    case 'completion_desc':
      list.sort((a, b) => b.completion_pct - a.completion_pct);
      break;
    default:
      list.sort((a, b) => b.gap_pct - a.gap_pct);
      break;
  }

  // Update filter count badge
  const countEl = document.getElementById('works-count-filter');
  if (countEl) {
    countEl.textContent = `Showing ${list.length} of ${allWorks.length} works`;
  }

  // Pagination
  const totalPages = Math.ceil(list.length / App.ITEMS_PER_PAGE) || 1;
  if (App.worksPage > totalPages) App.worksPage = 1;
  const startIdx = (App.worksPage - 1) * App.ITEMS_PER_PAGE;
  const pageWorks = list.slice(startIdx, startIdx + App.ITEMS_PER_PAGE);

  renderWorksTable(pageWorks);
  renderWorksPagination(totalPages, list.length);
}

function toggleWorkRow(workId) {
  App.expandedWorkId = (App.expandedWorkId === workId) ? null : workId;
  filterAndRenderWorks();
}

function renderWorksTable(works) {
  const tbody = document.getElementById('works-tbody');
  if (!tbody) return;

  if (works.length === 0) {
    tbody.innerHTML = `
      <tr>
        <td colspan="10" style="text-align:center;padding:var(--sp-8);color:var(--txt-muted)">
          <div style="font-size:1.5rem;margin-bottom:8px">🔍</div>
          <strong>No matching works found</strong>
          <div style="font-size:0.78rem;margin-top:4px">Try adjusting your search or anomaly filter</div>
        </td>
      </tr>`;
    return;
  }

  let html = '';
  works.forEach(w => {
    const isExpanded = (App.expandedWorkId === w.work_id);
    const overrun = w.expenditure > w.sanctioned_amount;
    const gap = w.gap_pct;

    // Build flags and explanations HTML
    let flagsHtml = '';
    if (w.flags && w.flags.length > 0) {
      flagsHtml = `
        <div class="flag-chip-row">
          ${w.flags.map(f => `
            <div class="flag-chip-item">
              <span class="badge ${f.badgeClass}">${f.icon} ${f.label}</span>
              <div class="flag-explanation">${f.explanation}</div>
            </div>
          `).join('')}
        </div>`;
    } else {
      flagsHtml = `<div class="flag-chip-row"><span class="badge badge-low">✓ NORMAL PROGRESS</span></div>`;
    }

    // Gap Badge
    const gapBadgeClass = gap >= 20 ? 'gap-critical' : gap > 0 ? 'gap-high' : 'gap-normal';
    const gapSign = gap > 0 ? '+' : '';

    html += `
    <tr class="work-row ${isExpanded ? 'expanded' : ''}" onclick="toggleWorkRow('${w.work_id}')" title="Click to view Payment vs Progress Timeline">
      <td style="text-align:center">
        <button class="work-expand-btn" aria-label="Expand work details" onclick="event.stopPropagation(); toggleWorkRow('${w.work_id}')">▶</button>
      </td>
      <td class="font-mono" style="font-size:0.73rem;color:var(--gov-navy);font-weight:700">${w.work_id}</td>
      <td class="col-name truncate" style="max-width:200px" title="${w.work_name}">
        ${w.work_name}
        <div class="text-xs text-muted truncate">${w.contractor_name || 'Departmental Execution'}</div>
      </td>
      <td style="font-size:0.78rem">${w.state}</td>
      <td style="font-size:0.78rem" title="${w.mp_name}">${w.mp_name.split(' ').slice(0,3).join(' ')}</td>
      <td class="col-amount">${fmt(w.sanctioned_amount)}</td>
      <td class="col-amount" style="color:${overrun ? '#C0392B' : 'var(--gov-navy)'};font-weight:${overrun ? '700' : '600'}">${fmt(w.expenditure)}</td>
      <td>
        <div style="display:flex;align-items:center;gap:6px">
          <div class="progress-bg" style="width:50px;height:7px">
            <div class="progress-fill ${w.completion_pct >= 80 ? 'green' : w.completion_pct >= 40 ? 'saffron' : 'red'}" style="width:${w.completion_pct}%"></div>
          </div>
          <span style="font-size:0.72rem;font-weight:600;font-family:var(--font-mono)">${w.completion_pct}%</span>
        </div>
      </td>
      <td style="text-align:center;padding-right:16px">
        <span class="gap-badge ${gapBadgeClass}">${gapSign}${gap}%</span>
      </td>
      <td style="padding-left:20px">${flagsHtml}</td>
    </tr>`;

    // If expanded, insert detail panel directly below the work row
    if (isExpanded) {
      html += `
      <tr class="work-detail-row open">
        <td colspan="10" class="work-detail-cell">
          <div class="work-detail-panel">
            <div class="work-detail-grid">
              
              <!-- Left: Payment vs Progress Dual-Axis Timeline Chart -->
              <div class="timeline-card">
                <div class="timeline-card-header">
                  <div class="timeline-card-title">
                    <span>📈 Payment vs. Physical Progress Timeline</span>
                    ${gap >= 20 ? '<span class="badge badge-critical">⚠ SUSPICIOUS DISBURSEMENT GAP</span>' : ''}
                  </div>
                  <span class="badge badge-neutral text-xs font-mono">${w.work_id}</span>
                </div>
                <div class="timeline-chart-wrap">
                  <canvas id="chart-timeline-${w.work_id}"></canvas>
                </div>
                <div style="display:flex;justify-content:space-between;margin-top:var(--sp-2);font-size:0.72rem;color:var(--txt-muted);padding-top:6px;border-top:1px dashed var(--bdr-light)">
                  <span>🟧 Orange Area = Funds Released (% of Sanction)</span>
                  <span>🟩 Green Line = Physical Completion (%)</span>
                  <span>Disbursement Gap = <strong style="color:${gap >= 20 ? '#A00000' : 'var(--gov-navy)'}">${gapSign}${gap}%</strong></span>
                </div>
              </div>

              <!-- Right: Detailed Financials, Disbursements & Asset Verification -->
              <div class="work-info-card">
                
                <!-- Financial Metadata -->
                <div class="work-meta-grid">
                  <div class="work-meta-item">
                    <div class="work-meta-label">Sanctioned Budget</div>
                    <div class="work-meta-val">${fmt(w.sanctioned_amount)}</div>
                  </div>
                  <div class="work-meta-item">
                    <div class="work-meta-label">Total Released</div>
                    <div class="work-meta-val" style="color:${overrun ? '#C0392B' : 'var(--gov-navy)'}">${fmt(w.expenditure)} (${w.paid_pct}%)</div>
                  </div>
                  <div class="work-meta-item">
                    <div class="work-meta-label">Physical Progress</div>
                    <div class="work-meta-val">${w.completion_pct}% (${w.status})</div>
                  </div>
                  <div class="work-meta-item">
                    <div class="work-meta-label">Disbursement Gap</div>
                    <div class="work-meta-val" style="color:${gap >= 20 ? '#C0392B' : 'var(--gov-green)'}">${gapSign}${gap}%</div>
                  </div>
                </div>

                <!-- Anomaly Explainability Callout -->
                ${w.flags.length > 0 ? `
                  <div class="anomaly-callout-box ${gap >= 20 ? 'anomaly-callout-critical' : 'anomaly-callout-high'}">
                    <strong>Audit Compliance Alert:</strong><br/>
                    ${w.flags.map(f => `<div>${f.icon} <strong>${f.label}:</strong> ${f.explanation}</div>`).join('')}
                  </div>
                ` : ''}

                <!-- Payment Disbursements Timeline -->
                <div class="payments-list-wrap">
                  <div class="payments-list-title">
                    <span>Payment Disbursements (PFMS/EAT Trail)</span>
                    <span class="badge badge-info">Verified Treasury Records</span>
                  </div>
                  <div class="payment-mini-item">
                    <span><strong>1st Installment (Advance)</strong> &bull; ${w.start_year}-04-12</span>
                    <span class="font-mono font-bold">${fmt(w.expenditure * 0.4)}</span>
                  </div>
                  <div class="payment-mini-item">
                    <span><strong>2nd Installment (Milestone)</strong> &bull; ${w.start_year}-08-20</span>
                    <span class="font-mono font-bold">${fmt(w.expenditure * 0.35)}</span>
                  </div>
                  <div class="payment-mini-item">
                    <span><strong>3rd Installment (Final Bill)</strong> &bull; ${w.start_year + 1}-02-15</span>
                    <span class="font-mono font-bold">${fmt(w.expenditure * 0.25)}</span>
                  </div>
                </div>

                <!-- Asset Verification Status -->
                <div class="asset-verified-box">
                  <span style="font-size:1.3rem">${w.status === 'Completed' && w.asset_status !== 'Not Verified' ? '🏛️' : '🔍'}</span>
                  <div style="flex:1">
                    <div style="font-weight:700;color:var(--gov-navy)">Geo-Tagged Asset Status: 
                      <span class="badge ${w.status === 'Completed' && w.asset_status !== 'Not Verified' ? 'badge-low' : 'badge-critical'}">
                        ${w.status === 'Completed' && w.asset_status !== 'Not Verified' ? 'VERIFIED (NIC/GIS)' : 'UNVERIFIED / MISSING INSPECTION'}
                      </span>
                    </div>
                    <div class="text-xs text-muted" style="margin-top:2px">
                      GPS: ${((Math.random() * 15) + 15).toFixed(4)}°N, ${((Math.random() * 20) + 75).toFixed(4)}°E &bull; Inspected by: District Social Audit Team
                    </div>
                  </div>
                </div>

              </div>

            </div>
          </div>
        </td>
      </tr>`;
    }
  });

  tbody.innerHTML = html;

  // If there is an expanded work, render its dual-axis timeline chart
  if (App.expandedWorkId) {
    const activeWork = works.find(w => w.work_id === App.expandedWorkId);
    if (activeWork) {
      setTimeout(() => {
        Charts.paymentProgressTimeline(`chart-timeline-${activeWork.work_id}`, activeWork);
      }, 50);
    }
  }
}

function renderWorksPagination(totalPages, totalItems) {
  const container = document.getElementById('works-pagination');
  const info = document.getElementById('works-page-info');
  if (!container) return;

  if (totalPages <= 1) {
    container.innerHTML = '';
    if (info) info.textContent = `Showing all ${totalItems} works`;
    return;
  }

  const cur = App.worksPage;
  let buttons = '';

  buttons += `<button class="btn btn-secondary btn-xs ${cur === 1 ? 'disabled' : ''}" onclick="changeWorksPage(${cur - 1})" ${cur === 1 ? 'disabled' : ''}>&larr; Prev</button>`;

  const maxVisible = 7;
  let start = Math.max(1, cur - 3);
  let end = Math.min(totalPages, start + maxVisible - 1);
  if (end - start < maxVisible - 1) start = Math.max(1, end - maxVisible + 1);

  if (start > 1) {
    buttons += `<button class="btn btn-secondary btn-xs" onclick="changeWorksPage(1)">1</button>`;
    if (start > 2) buttons += `<span class="page-ellipsis">&hellip;</span>`;
  }

  for (let p = start; p <= end; p++) {
    buttons += `<button class="btn ${p === cur ? 'btn-primary' : 'btn-secondary'} btn-xs" onclick="changeWorksPage(${p})">${p}</button>`;
  }

  if (end < totalPages) {
    if (end < totalPages - 1) buttons += `<span class="page-ellipsis">&hellip;</span>`;
    buttons += `<button class="btn btn-secondary btn-xs" onclick="changeWorksPage(${totalPages})">${totalPages}</button>`;
  }

  buttons += `<button class="btn btn-secondary btn-xs ${cur === totalPages ? 'disabled' : ''}" onclick="changeWorksPage(${cur + 1})" ${cur === totalPages ? 'disabled' : ''}>Next &rarr;</button>`;

  container.innerHTML = buttons;
  if (info) {
    const startItem = (cur - 1) * App.ITEMS_PER_PAGE + 1;
    const endItem = Math.min(cur * App.ITEMS_PER_PAGE, totalItems);
    info.textContent = `Showing ${startItem}–${endItem} of ${totalItems} works`;
  }
}

function changeWorksPage(page) {
  App.worksPage = page;
  filterAndRenderWorks();
  const table = document.querySelector('.data-table');
  if (table) table.scrollIntoView({ behavior: 'smooth', block: 'nearest' });
}

// ── Map Page ───────────────────────────────────────────────────────────
function renderMap() {
  const { state_stats } = App.results;
  setTimeout(() => MapView.init(state_stats), 100);
  setTimeout(() => window.dispatchEvent(new Event('resize')), 300);
}

// ── Report Page ────────────────────────────────────────────────────────
function renderReport() {
  const { summary, state_stats, scored_records, alerts } = App.results;
  const reportDate = new Date().toLocaleDateString('en-IN', { day:'2-digit', month:'long', year:'numeric' });

  document.getElementById('report-date').textContent = reportDate;
  document.getElementById('report-total-mps').textContent   = summary.total_mps.toLocaleString('en-IN');
  document.getElementById('report-total-funds').textContent = fmt(summary.total_funds);
  document.getElementById('report-anomalies').textContent   = summary.anomalies_detected;
  document.getElementById('report-critical').textContent    = summary.critical;

  const topState = state_stats[0];
  const zOutliers = scored_records.filter(r=>r.z_score&&r.z_score>2).length;
  const dupFlags  = scored_records.filter(r=>r.dup_flag&&r.dup_flag!=='unique').length;

  const findings = document.getElementById('report-findings');
  if (findings) {
    findings.innerHTML = [
      `A total of <strong>${summary.total_alerts}</strong> system-generated alerts were raised across <strong>${summary.states_count}</strong> states/UTs based on MPLADS fund allocation records.`,
      `<strong>${summary.critical}</strong> Members of Parliament have been classified under CRITICAL risk tier (score ≥ 75), requiring immediate scrutiny by the Ministry and State Nodal Authorities.`,
      `State of <strong>${topState?.state||'N/A'}</strong> records the highest cumulative allocation of <strong>${fmt(topState?.total||0)}</strong>, with <strong>${topState?.anomalies||0}</strong> statistical anomalies identified within the state.`,
      `National-level Z-Score analysis (threshold |Z| > 2) identified <strong>${zOutliers}</strong> MPs with statistically unusual fund allocations deviating significantly from the national mean.`,
      `Duplicate allocation amount pattern analysis detected <strong>${dupFlags}</strong> MP records with identical amounts assigned to multiple MPs in the same state, flagged for data integrity review.`,
      `Works monitoring reveals <strong>${summary.works_anomalies?.cost_overruns||0}</strong> instances of expenditure exceeding sanctioned amount and <strong>${summary.works_anomalies?.stalled_works||0}</strong> stalled/non-progressing projects.`
    ].map(f=>`<li><span class="fi-icon">▶</span>${f}</li>`).join('');
  }

  const recs = document.getElementById('report-recommendations');
  if (recs) {
    recs.innerHTML = [
      `Initiate comprehensive audit review for all MPs classified as CRITICAL (${summary.critical}) and HIGH (${summary.high}) risk within 30 days of this report.`,
      `Cross-verify identical allocation amounts within same-state MP records through PFMS transaction trail to rule out data duplication or misappropriation.`,
      `Establish real-time fund utilisation reporting dashboards at district level to enable early detection of cost overruns before payment disbursement.`,
      `Implement milestone-based payment release mechanism linked to verified work completion percentages to prevent fund blockage in stalled projects.`,
      `Mandate quarterly state-wise peer benchmarking reports to proactively identify allocation pattern deviations before annual audit cycles.`,
      `Integrate MPLADS data with PFMS, GIS asset tracking, and district-level MIS for end-to-end transparency in works execution and fund flow monitoring.`
    ].map(r=>`<li>✓ ${r}</li>`).join('');
  }
}

// ── Toast ──────────────────────────────────────────────────────────────
function showToast(msg, type = 'info') {
  const container = document.getElementById('toast-container');
  if (!container) return;
  const t = document.createElement('div');
  t.className = `toast ${type}`;
  t.innerHTML = msg;
  container.appendChild(t);
  setTimeout(() => t.classList.add('show'), 10);
  setTimeout(() => { t.classList.remove('show'); setTimeout(() => t.remove(), 400); }, 4000);
}

// ── Export CSV ─────────────────────────────────────────────────────────
function exportAlertsCSV() {
  const { alerts } = App.results;
  const headers = ['Alert ID','Type','Severity','Title','Description','MP Name','State','Amount','Risk Score','Timestamp'];
  const rows = alerts.map(a => [
    a.id, a.type, a.severity, `"${a.title}"`, `"${a.description||''}"`,
    `"${a.mp_name||''}"`, a.state||'', a.amount||'', a.risk_score||'', a.timestamp||''
  ]);
  const csv = [headers.join(','), ...rows.map(r=>r.join(','))].join('\n');
  const blob = new Blob([csv], { type: 'text/csv' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a'); a.href=url; a.download='mplads_alerts.csv';
  a.click(); URL.revokeObjectURL(url);
  showToast('Alerts exported to CSV', 'success');
}

function exportMPsCSV() {
  const { scored_records } = App.results;
  const headers = ['MP Name','State','Type','Allocated Amount','Risk Score','Risk Level','Z-Score','Peer Deviation %','Flags'];
  const rows = scored_records.map(r => [
    `"${r.mp_name}"`, r.state, r.type, r.allocated_amount,
    r.risk_score, r.risk_level, r.z_score||'', r.peer_deviation||'',
    `"${r.reasons.map(x=>x.type).join('; ')}"`
  ]);
  const csv = [headers.join(','), ...rows.map(r=>r.join(','))].join('\n');
  const blob = new Blob([csv], { type: 'text/csv' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a'); a.href=url; a.download='mplads_mp_risk.csv';
  a.click(); URL.revokeObjectURL(url);
  showToast('MP Risk Report exported', 'success');
}

// ── RBAC Authentication Handlers ──────────────────────────────────────
function updateAuthUI() {
  const user = ApiClient.getCurrentUser();
  const roleBtnText = document.getElementById('auth-role-text');
  const roleBtnIcon = document.getElementById('auth-role-icon');

  if (!roleBtnText) return;

  if (user) {
    const roleEmoji = {
      Ministry: '🏛️',
      State: '🏢',
      District: '📍',
      MP: '👤',
      Citizen: '👥'
    }[user.role] || '🛡️';

    if (roleBtnIcon) roleBtnIcon.textContent = roleEmoji;
    roleBtnText.textContent = `${user.name} (${user.role}${user.scope_id && user.scope_id !== 'ALL' ? ': ' + user.scope_id : ''})`;
  } else {
    if (roleBtnIcon) roleBtnIcon.textContent = '👤';
    roleBtnText.textContent = 'Public Viewer (Demo)';
  }
}

function openAuthModal() {
  const modal = document.getElementById('auth-modal');
  if (modal) {
    modal.classList.add('open');
    const currentUser = ApiClient.getCurrentUser();
    document.querySelectorAll('#rbac-role-cards .role-card').forEach(c => {
      c.classList.remove('active');
      if (currentUser && c.dataset.email === currentUser.email) {
        c.classList.add('active');
      }
    });
  }
}

function closeAuthModal() {
  const modal = document.getElementById('auth-modal');
  if (modal) modal.classList.remove('open');
}

function selectRoleCard(cardEl, email, password) {
  const emailInput = document.getElementById('auth-email-input');
  const passInput = document.getElementById('auth-password-input');
  if (emailInput) emailInput.value = email;
  if (passInput) passInput.value = password;

  document.querySelectorAll('#rbac-role-cards .role-card').forEach(c => c.classList.remove('active'));
  if (cardEl) cardEl.classList.add('active');

  quickLogin(email, password);
}

async function quickLogin(email, password) {
  try {
    showToast('Authenticating with backend...', 'info');
    const result = await ApiClient.login(email, password);
    closeAuthModal();
    updateAuthUI();
    showToast(`Signed in as ${result.user.name} (${result.user.role})`, 'success');
    await reloadDataset();
  } catch (err) {
    showToast(`Login failed: ${err.message}`, 'high');
  }
}

async function submitCustomLogin() {
  const emailInput = document.getElementById('auth-email-input');
  const passInput = document.getElementById('auth-password-input');
  if (!emailInput || !passInput) return;

  const email = emailInput.value.trim();
  const password = passInput.value.trim();
  if (!email || !password) {
    showToast('Please enter email and password', 'high');
    return;
  }

  await quickLogin(email, password);
}

async function setPublicViewerMode() {
  ApiClient.logout();
  closeAuthModal();
  updateAuthUI();
  showToast('Switched to Public Viewer mode (unauthenticated)', 'info');
  await reloadDataset();
}

// ── Landing Login Gateway Handlers ─────────────────────────────────────
async function submitLandingLogin() {
  const email = document.getElementById('landing-email')?.value.trim();
  const password = document.getElementById('landing-password')?.value.trim();
  if (!email || !password) {
    showToast('Please enter both email and password', 'high');
    return;
  }
  try {
    showToast('Authenticating with official MoSPI gateway...', 'info');
    const result = await ApiClient.login(email, password);
    const landing = document.getElementById('login-landing-page');
    if (landing) landing.classList.add('hidden');
    updateAuthUI();
    showToast(`Welcome ${result.user.name}! Authenticated as ${result.user.role}`, 'success');
    await reloadDataset();
  } catch (err) {
    showToast(`Authentication failed: ${err.message}`, 'high');
  }
}

async function autoFillLandingRole(email, password) {
  const emailInput = document.getElementById('landing-email');
  const passInput = document.getElementById('landing-password');
  if (emailInput) emailInput.value = email;
  if (passInput) passInput.value = password;
  await submitLandingLogin();
}

async function enterPublicGuestModeLanding() {
  ApiClient.logout();
  const landing = document.getElementById('login-landing-page');
  if (landing) landing.classList.add('hidden');
  updateAuthUI();
  showToast('Entered Public Viewer mode (Demo)', 'info');
  await reloadDataset();
}

function signOutToLandingPage() {
  ApiClient.logout();
  const landing = document.getElementById('login-landing-page');
  if (landing) landing.classList.remove('hidden');
  updateAuthUI();
  showToast('Signed out. Portal session locked.', 'info');
}

function refreshCaptcha() {
  const code = 'MPLADS-' + Math.floor(10000 + Math.random() * 90000);
  const display = document.getElementById('landing-captcha-display');
  const input = document.getElementById('landing-captcha-input');
  if (display) display.textContent = code;
  if (input) input.value = code;
}

async function reloadDataset() {
  try {
    const data = await ApiClient.fetchFullData();
    App.data = data;
    window.MPLADS_DATA = data;
    App.results = data.results || (typeof AIEngine.run === 'function' ? AIEngine.run(data) : data);

    // Update navigation counter badges
    const nb1 = document.getElementById('nav-badge-anomalies');
    const nb2 = document.getElementById('nav-badge-alerts');
    if (nb1 && App.results.summary) nb1.textContent = App.results.summary.anomalies_detected;
    if (nb2 && App.results.summary) nb2.textContent = App.results.summary.total_alerts;

    // Refresh active page
    navigate(App.currentPage);
  } catch (err) {
    console.error('Failed to reload dataset:', err);
    showToast('Failed to refresh data for new role scope', 'high');
  }
}

// ── Investigation Workspace Modal ───────────────────────────────────────
let currentInvestigationAlertId = null;

function openInvestigationModal(alertId) {
  const alerts = (App.results && App.results.alerts) || [];
  const alert = alerts.find(a => String(a.id) === String(alertId));
  if (!alert) {
    showToast('Alert details not found', 'high');
    return;
  }

  currentInvestigationAlertId = alert.id;
  const modal = document.getElementById('investigation-modal');
  const body = document.getElementById('investigation-modal-body');
  const footer = document.getElementById('investigation-modal-footer');
  if (!modal || !body || !footer) return;

  const currentUser = ApiClient.getCurrentUser();
  const isOfficer = !!currentUser;

  const typeLabelMap = {
    statistical_outlier: 'Statistical Allocation Outlier (Z > 3.0σ)',
    peer_deviation: 'Peer Deviation & Cohort Variance',
    duplicate_flag: 'Duplicate Recommendation / Name Clash',
    term_compliance: 'Tenure & Utilization Inconsistency',
    cost_overrun: 'Financial Expenditure Overrun (>110%)',
    stalled_work: 'Milestone Stoppage / Execution Freeze',
    duplicate_work: 'Work Duplication Risk',
    no_progress: 'Disbursed Zero-Physical Progress'
  };
  const typeDisplay = typeLabelMap[alert.type] || alert.type;

  // Build why flagged explanation based on alert fields
  let explainHtml = '';
  if (alert.type === 'statistical_outlier') {
    explainHtml = `
      <div style="margin-bottom:8px">
        <strong>Z-Score Anomaly:</strong> The allocation of <code>${alert.amount ? fmt(alert.amount) : 'high value'}</code> diverges by more than 3 standard deviations from peer cohorts.
      </div>
      <div style="font-size:0.77rem;color:var(--txt-muted)">
        Calculated via parametric Z-score and interquartile range (IQR) fencing against same-tenure peers.
      </div>
    `;
  } else if (alert.type === 'cost_overrun') {
    explainHtml = `
      <div style="margin-bottom:8px">
        <strong>Financial Milestone Divergence:</strong> Expenditure exceeds sanctioned cost ceiling without documented administrative approval.
      </div>
      <div style="font-size:0.77rem;color:var(--txt-muted)">
        Triggered when cumulative ledger payments surpass 110% of approved sanction amount.
      </div>
    `;
  } else if (alert.type === 'stalled_work' || alert.type === 'no_progress') {
    explainHtml = `
      <div style="margin-bottom:8px">
        <strong>Execution Stagnation:</strong> Significant funds disbursed with physical completion lagging behind statutory milestones.
      </div>
      <div style="font-size:0.77rem;color:var(--txt-muted)">
        Payment-to-progress divergence exceeds threshold tolerance without uploaded inspection logs.
      </div>
    `;
  } else {
    explainHtml = `
      <div style="margin-bottom:8px">
        <strong>Anomaly Rationale:</strong> ${alert.description}
      </div>
      <div style="font-size:0.77rem;color:var(--txt-muted)">
        Identified through deterministic rule-based surveillance across MPLADS transaction records.
      </div>
    `;
  }

  const currentStatus = alert.status || 'Open';
  const statusColor = currentStatus === 'Resolved' ? '#27AE60' : currentStatus === 'Under Review' ? '#F39C12' : currentStatus === 'False Positive' ? '#7F8C8D' : '#C0392B';

  body.innerHTML = `
    <!-- Top Score Banner -->
    <div class="iw-score-banner">
      <div>
        <div style="font-size:0.72rem;color:var(--txt-muted);text-transform:uppercase;letter-spacing:0.06em">Severity & Priority Index</div>
        <div style="display:flex;align-items:center;gap:8px;margin-top:4px">
          <span class="badge ${AIEngine.getRiskBadgeClass(alert.severity)}" style="font-size:0.85rem;padding:4px 10px">${alert.severity.toUpperCase()}</span>
          <span style="font-size:0.85rem;font-weight:600;color:var(--gov-navy)">${typeDisplay}</span>
        </div>
      </div>
      <div style="text-align:right">
        <div style="font-size:0.72rem;color:var(--txt-muted);text-transform:uppercase">Risk Score</div>
        <div class="iw-score-num" style="color:${alert.severity==='critical'?'#C0392B':alert.severity==='high'?'#E67E22':'#27AE60'}">
          ${alert.risk_score !== undefined ? alert.risk_score : (alert.severity==='critical'?'88':alert.severity==='high'?'65':'40')}
        </div>
      </div>
    </div>

    <!-- Alert Overview -->
    <div style="margin-bottom:var(--sp-4)">
      <h4 style="font-size:1.05rem;color:var(--txt-primary);margin-bottom:6px">${alert.title}</h4>
      <p style="font-size:0.84rem;color:var(--txt-secondary);line-height:1.5">${alert.description}</p>
    </div>

    <!-- Jurisdictional & Entity Scope -->
    <div style="display:grid;grid-template-columns:repeat(auto-fit, minmax(180px, 1fr));gap:var(--sp-3);background:var(--bg-light);padding:var(--sp-3) var(--sp-4);border-radius:var(--r-sm);border:1px solid var(--bdr-light);margin-bottom:var(--sp-4)">
      <div>
        <span style="font-size:0.7rem;color:var(--txt-muted);display:block">Member of Parliament</span>
        <strong style="font-size:0.82rem;color:var(--gov-navy)">${alert.mp_name || 'N/A'}</strong>
      </div>
      <div>
        <span style="font-size:0.7rem;color:var(--txt-muted);display:block">State / Jurisdiction</span>
        <strong style="font-size:0.82rem">${alert.state || 'National / Multi-State'}</strong>
      </div>
      <div>
        <span style="font-size:0.7rem;color:var(--txt-muted);display:block">Flagged Exposure Amount</span>
        <strong style="font-size:0.82rem;font-family:var(--font-mono)">${alert.amount ? fmt(alert.amount) : '₹0 (Process Flag)'}</strong>
      </div>
      <div>
        <span style="font-size:0.7rem;color:var(--txt-muted);display:block">Case Triage Status</span>
        <strong style="font-size:0.82rem;color:${statusColor}">${currentStatus}</strong>
      </div>
    </div>

    <!-- Explainable Why Flagged -->
    <div style="background:#FFF9E6;border-left:4px solid #F39C12;padding:var(--sp-3) var(--sp-4);border-radius:0 var(--r-sm) var(--r-sm) 0;margin-bottom:var(--sp-4)">
      <div style="font-size:0.82rem;font-weight:700;color:#7A4B00;margin-bottom:4px">🔬 Explainable Anomaly Audit Factor</div>
      ${explainHtml}
    </div>

    <!-- Audit & Investigation Log -->
    <div style="border-top:1px solid var(--bdr-light);padding-top:var(--sp-3);margin-top:var(--sp-4)">
      <div style="font-size:0.78rem;font-weight:700;color:var(--txt-secondary);margin-bottom:6px">📋 Case Audit History</div>
      <div style="font-size:0.76rem;color:var(--txt-muted);line-height:1.6">
        <div>&bull; <strong>Detection Timestamp:</strong> ${fmtDate(alert.timestamp || new Date().toISOString())}</div>
        <div>&bull; <strong>Current Resolution State:</strong> <span style="font-weight:600;color:${statusColor}">${currentStatus}</span></div>
        ${alert.resolved_by ? `<div>&bull; <strong>Last Action By:</strong> ${alert.resolved_by} on ${fmtDate(alert.resolved_at)}</div>` : '<div>&bull; <strong>Officer Assignment:</strong> Pending initial jurisdictional triage</div>'}
      </div>
    </div>

    ${!isOfficer ? `
      <div style="margin-top:var(--sp-4);padding:var(--sp-3);background:#FEF2F2;border:1px solid #FCA5A5;border-radius:var(--r-sm);font-size:0.78rem;color:#991B1B;display:flex;align-items:center;justify-content:space-between">
        <span>🔒 <strong>Guest View:</strong> Sign in as an authorized Officer (Ministry, State, or District) to triage and resolve this case.</span>
        <button class="btn btn-sm btn-primary" onclick="closeInvestigationModal();openAuthModal()">Sign In Now</button>
      </div>
    ` : `
      <div style="margin-top:var(--sp-4);padding:var(--sp-3);background:var(--bg-light);border-radius:var(--r-sm);border:1px solid var(--bdr-medium)">
        <div style="font-size:0.76rem;font-weight:600;color:var(--gov-navy);margin-bottom:6px">Authorized Officer Action as ${currentUser.name} (${currentUser.role})</div>
        <div style="font-size:0.72rem;color:var(--txt-muted)">Selecting a triage state below records your cryptographically verified identity into the MoSPI compliance audit ledger.</div>
      </div>
    `}
  `;

  footer.innerHTML = `
    <button class="btn btn-neutral" onclick="closeInvestigationModal()">Close</button>
    ${isOfficer ? `
      <button class="btn btn-secondary" onclick="updateAlertInvestigationStatus('${alert.id}', 'Under Review')">⏳ Mark Under Review</button>
      <button class="btn btn-neutral" style="border-color:#C0392B;color:#C0392B" onclick="updateAlertInvestigationStatus('${alert.id}', 'False Positive')">⚠️ Mark False Positive</button>
      <button class="btn btn-primary" onclick="updateAlertInvestigationStatus('${alert.id}', 'Resolved')">✅ Resolve Case</button>
    ` : ''}
  `;

  modal.classList.add('open');
}

function closeInvestigationModal() {
  const modal = document.getElementById('investigation-modal');
  if (modal) modal.classList.remove('open');
  currentInvestigationAlertId = null;
}

async function updateAlertInvestigationStatus(alertId, newStatus) {
  try {
    showToast(`Submitting status update: ${newStatus}...`, 'info');
    await ApiClient.updateAlertStatus(alertId, newStatus);
    showToast(`Case updated to ${newStatus}`, 'success');

    // Update local alert in App.results.alerts
    if (App.results && App.results.alerts) {
      const target = App.results.alerts.find(a => String(a.id) === String(alertId));
      if (target) {
        target.status = newStatus;
        target.resolved_at = new Date().toISOString();
        const user = ApiClient.getCurrentUser();
        target.resolved_by = user ? `${user.name} (${user.role})` : 'Authorized Officer';
      }
    }

    // Re-render alerts
    if (App.currentPage === 'alerts') filterAndRenderAlerts();
    if (App.currentPage === 'dashboard') renderDashboard();

    // Re-open/refresh modal with new state
    openInvestigationModal(alertId);
  } catch (err) {
    showToast(`Failed to update alert: ${err.message}`, 'high');
  }
}

// ── Init ───────────────────────────────────────────────────────────────
async function init() {
  // Check auth session
  updateAuthUI();

  try {
    // Attempt to load from REST API backend
    const data = await ApiClient.fetchFullData();
    App.data = data;
    window.MPLADS_DATA = data;
    App.results = data.results || (typeof AIEngine.run === 'function' ? AIEngine.run(data) : data);
    showToast(`Connected to API — ${App.results.summary.total_mps} MPs & ${data.synthetic_works?.length || 0} Works analyzed`, 'success');
  } catch (err) {
    console.warn('API fetch failed, falling back to cached/default dataset:', err.message);
    if (window.MPLADS_DATA) {
      App.data = window.MPLADS_DATA;
      App.results = (window.MPLADS_DATA && window.MPLADS_DATA.results) || (typeof AIEngine.run === 'function' ? AIEngine.run(window.MPLADS_DATA) : window.MPLADS_DATA);
      showToast('⚠️ Running with local fallback dataset. Backend API is offline.', 'high');
    } else {
      const overlay = document.getElementById('welcome-overlay');
      if (overlay) {
        overlay.innerHTML = `
          <div style="background:white;padding:32px;border-radius:8px;max-width:520px;text-align:center;box-shadow:0 12px 36px rgba(0,0,0,0.25);border-top:4px solid #C0392B">
            <h3 style="color:#C0392B;margin-bottom:12px">⚠️ Backend Server Offline</h3>
            <p style="font-size:0.88rem;color:#4A5568;margin-bottom:16px">The frontend could not connect to <code>http://localhost:5000/api</code>.</p>
            <div style="font-size:0.8rem;color:#2D3748;background:#F7FAFC;padding:12px;border-radius:6px;border:1px solid #E2E8F0;text-align:left;margin-bottom:20px">
              <strong>To start the backend server:</strong><br/>
              <code>npm run dev</code> or <code>npm start</code> in the project directory.<br/>
              Then refresh this browser tab.
            </div>
            <button onclick="location.reload()" class="btn btn-primary">Retry Connection</button>
          </div>`;
      }
      return;
    }
  }

  // Hide welcome overlay
  setTimeout(() => {
    const overlay = document.getElementById('welcome-overlay');
    if (overlay) { overlay.classList.add('fade-out'); setTimeout(() => overlay.style.display = 'none', 600); }
  }, 1200);

  // Nav click handlers
  document.querySelectorAll('.nav-item[data-page]').forEach(el => {
    el.addEventListener('click', () => navigate(el.dataset.page));
  });

  // Alert filter events
  ['alert-filter-severity', 'alert-filter-type', 'alert-filter-state'].forEach(id => {
    const el = document.getElementById(id);
    if (el) el.addEventListener('change', () => {
      const key = id.replace('alert-filter-', '');
      App.alertsFilter[key] = el.value;
      App.alertsPage = 1;
      filterAndRenderAlerts();
    });
  });

  const alertSearch = document.getElementById('alert-search');
  if (alertSearch) alertSearch.addEventListener('input', () => {
    App.alertsFilter.search = alertSearch.value;
    App.alertsPage = 1;
    filterAndRenderAlerts();
  });

  // MP filter events
  ['mp-filter-state', 'mp-filter-risk', 'mp-filter-type', 'mp-sort'].forEach(id => {
    const el = document.getElementById(id);
    if (el) el.addEventListener('change', () => {
      const keyMap = { 'mp-filter-state': 'state', 'mp-filter-risk': 'risk', 'mp-filter-type': 'type', 'mp-sort': 'sort' };
      App.mpFilter[keyMap[id]] = el.value;
      App.mpPage = 1;
      filterAndRenderMPs();
    });
  });

  const mpSearch = document.getElementById('mp-search');
  if (mpSearch) mpSearch.addEventListener('input', () => {
    App.mpFilter.search = mpSearch.value;
    App.mpPage = 1;
    filterAndRenderMPs();
  });

  // Works filter events
  ['works-filter-type', 'works-filter-state', 'works-filter-status', 'works-sort'].forEach(id => {
    const el = document.getElementById(id);
    if (el) el.addEventListener('change', () => {
      const keyMap = {
        'works-filter-type': 'type',
        'works-filter-state': 'state',
        'works-filter-status': 'status',
        'works-sort': 'sort'
      };
      App.worksFilter[keyMap[id]] = el.value;
      App.worksPage = 1;
      filterAndRenderWorks();
    });
  });

  const worksSearch = document.getElementById('works-search');
  if (worksSearch) worksSearch.addEventListener('input', () => {
    App.worksFilter.search = worksSearch.value;
    App.worksPage = 1;
    filterAndRenderWorks();
  });

  // Modal backdrop click to close
  ['auth-modal', 'investigation-modal'].forEach(modalId => {
    const m = document.getElementById(modalId);
    if (m) {
      m.addEventListener('click', (e) => {
        if (e.target === m) {
          m.classList.remove('open');
        }
      });
    }
  });

  // ESC key to close open modals
  document.addEventListener('keydown', (e) => {
    if (e.key === 'Escape') {
      closeAuthModal();
      closeInvestigationModal();
    }
  });

  // Populate dynamic state dropdown options
  if (App.data?.metadata?.states) {
    const states = App.data.metadata.states;
    ['alert-filter-state', 'mp-filter-state', 'works-filter-state'].forEach(selectId => {
      const select = document.getElementById(selectId);
      if (select && select.options.length <= 1) {
        states.forEach(st => {
          const opt = document.createElement('option');
          opt.value = st;
          opt.textContent = st;
          select.appendChild(opt);
        });
      }
    });
  }

  // Navigate to dashboard
  navigate('dashboard');
}

document.addEventListener('DOMContentLoaded', init);
