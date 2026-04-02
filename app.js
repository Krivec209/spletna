'use strict';

/* ── Config ──────────────────────────────────────────────────────── */
const BASE = 'https://api.terraquakeapi.com/v1/earthquakes';

/* ── State ───────────────────────────────────────────────────────── */
let currentPage = 1;
let currentParams = {};       // last successful query params (without page)
let currentEndpoint = '';     // last successful endpoint path

/* ── DOM references ──────────────────────────────────────────────── */
const sel         = (id) => document.getElementById(id);
const endpointSel = sel('endpoint-select');
const btnSearch   = sel('btn-search');
const btnPrev     = sel('btn-prev');
const btnNext     = sel('btn-next');
const pageInfo    = sel('page-info');
const loading     = sel('loading');
const errorBox    = sel('error-box');
const statusBar   = sel('status-bar');
const tableWrap   = sel('table-wrapper');
const tbody       = sel('eq-tbody');
const pagination  = sel('pagination');
const eventDetail = sel('event-detail');

/* ── Conditional groups ───────────────────────────────────────────── */
const groups = {
  month:    sel('group-month'),
  'range-time': sel('group-range'),
  location: sel('group-location'),
  region:   sel('group-region'),
  depth:    sel('group-depth'),
  eventId:  sel('group-eventid'),
};

/* ── Toggle visible param groups ────────────────────────────────── */
function showGroup(selected) {
  Object.entries(groups).forEach(([key, el]) => {
    el.hidden = (key !== selected);
  });
  sel('group-pagination').hidden = (selected === 'eventId');
}

endpointSel.addEventListener('change', () => showGroup(endpointSel.value));

/* ── Build URL ───────────────────────────────────────────────────── */
function buildUrl(endpoint, params) {
  const url = new URL(`${BASE}/${endpoint}`);
  Object.entries(params).forEach(([k, v]) => {
    if (v !== '' && v !== null && v !== undefined) url.searchParams.set(k, v);
  });
  return url.toString();
}

/* ── Collect form values ─────────────────────────────────────────── */
function collectParams() {
  const ep    = endpointSel.value;
  const limit = sel('input-limit').value;
  const params = {};

  switch (ep) {
    case 'recent':
    case 'today':
    case 'last-week':
      break;

    case 'month':
      params.year  = sel('input-year').value.trim();
      params.month = sel('input-month').value.trim();
      if (!params.year || !params.month) throw new Error('Year and month are required.');
      break;

    case 'range-time':
      params.startdate = sel('input-startdate').value;
      params.enddate   = sel('input-enddate').value;
      if (!params.startdate || !params.enddate) throw new Error('Start date and end date are required.');
      break;

    case 'location':
      params.latitude  = sel('input-lat').value.trim();
      params.longitude = sel('input-lon').value.trim();
      if (!params.latitude || !params.longitude) throw new Error('Latitude and longitude are required.');
      if (sel('input-radius').value) params.radius = sel('input-radius').value;
      break;

    case 'region':
      params.region = sel('input-region').value.trim();
      if (!params.region) throw new Error('Region is required.');
      break;

    case 'depth':
      params.depth = sel('input-depth').value.trim();
      if (!params.depth) throw new Error('Depth is required.');
      break;

    case 'eventId':
      params.eventId = sel('input-eventid').value.trim();
      if (!params.eventId) throw new Error('Event ID is required.');
      return { ep, params, limit: null };   // no pagination for eventId

    default:
      break;
  }

  return { ep, params, limit };
}

/* ── Fetch ───────────────────────────────────────────────────────── */
async function fetchEarthquakes(endpoint, params, page, limit) {
  const query = { ...params };
  if (page  !== null) query.page  = page;
  if (limit !== null) query.limit = limit;
  const url = buildUrl(endpoint, query);

  showLoading(true);
  hideError();

  const res = await fetch(url);
  if (!res.ok) {
    const text = await res.text().catch(() => '');
    throw new Error(`API error ${res.status}: ${text || res.statusText}`);
  }
  return res.json();
}

/* ── Render table ────────────────────────────────────────────────── */
function renderTable(earthquakes) {
  tbody.innerHTML = '';

  if (!earthquakes || earthquakes.length === 0) {
    tbody.innerHTML = '<tr><td colspan="6" style="text-align:center;color:var(--text-dim);padding:2rem">No earthquakes found.</td></tr>';
    tableWrap.hidden = false;
    return;
  }

  earthquakes.forEach((eq) => {
    const tr = document.createElement('tr');

    const mag   = parseFloat(eq.magnitude ?? eq.mag ?? 0);
    const magClass = magBadgeClass(mag);

    const datetime = formatDateTime(eq.time ?? eq.datetime ?? eq.date ?? '');
    const location = eq.location ?? eq.place ?? eq.region ?? '—';
    const lat      = eq.latitude  ?? eq.lat ?? '—';
    const lon      = eq.longitude ?? eq.lon ?? '—';
    const depth    = eq.depth ?? '—';
    const eventId  = eq.eventId ?? eq.id ?? eq.event_id ?? '—';

    tr.innerHTML = `
      <td><span class="id-cell">${escHtml(String(eventId))}</span></td>
      <td>${escHtml(datetime)}</td>
      <td><span class="mag-badge ${magClass}">${isNaN(mag) ? '—' : mag.toFixed(1)}</span></td>
      <td>${escHtml(String(depth))}</td>
      <td>${escHtml(String(location))}</td>
      <td>${escHtml(String(lat))}, ${escHtml(String(lon))}</td>
    `;
    tbody.appendChild(tr);
  });

  tableWrap.hidden = false;
}

/* ── Render single event ─────────────────────────────────────────── */
function renderEvent(eq) {
  const fields = [
    ['Event ID',   eq.eventId ?? eq.id ?? eq.event_id],
    ['Date / Time', formatDateTime(eq.time ?? eq.datetime ?? eq.date ?? '')],
    ['Magnitude',  eq.magnitude ?? eq.mag],
    ['Depth (km)', eq.depth],
    ['Latitude',   eq.latitude  ?? eq.lat],
    ['Longitude',  eq.longitude ?? eq.lon],
    ['Location',   eq.location  ?? eq.place ?? eq.region],
    ['Type',       eq.type],
    ['Source',     eq.source],
  ];

  const items = fields
    .filter(([, v]) => v !== undefined && v !== null && v !== '')
    .map(([label, val]) => `
      <div class="detail-item">
        <div class="di-label">${escHtml(label)}</div>
        <div class="di-value">${escHtml(String(val))}</div>
      </div>`)
    .join('');

  eventDetail.innerHTML = `<h3>🔎 Event Detail</h3><div class="detail-grid">${items}</div>`;
  eventDetail.hidden = false;
}

/* ── Main search handler ─────────────────────────────────────────── */
async function doSearch(page = 1) {
  hideAll();

  let collected;
  try {
    collected = collectParams();
  } catch (err) {
    showError(err.message);
    return;
  }

  const { ep, params, limit } = collected;

  try {
    const data = await fetchEarthquakes(ep, params, page, limit);

    currentEndpoint = ep;
    currentParams   = params;
    currentPage     = page;

    showLoading(false);

    if (ep === 'eventId') {
      // API may return an object or a single-element array
      const eq = Array.isArray(data) ? data[0] : (data.data ?? data);
      if (!eq) { showError('Event not found.'); return; }
      renderEvent(eq);
      showStatus('Single event loaded.');
      return;
    }

    // List response: try common envelope shapes
    const list = Array.isArray(data)
      ? data
      : (data.data ?? data.earthquakes ?? data.results ?? data.items ?? []);

    renderTable(list);

    // Pagination info
    const total     = data.total ?? data.totalCount ?? data.count ?? null;
    const totalPages = data.totalPages ?? data.pages ?? (total !== null ? Math.ceil(total / limit) : null);

    updatePagination(page, totalPages, list.length, total, limit);

    const shown = list.length;
    const ofStr = total !== null ? ` of ${total}` : '';
    showStatus(`Page ${page}${totalPages ? '/' + totalPages : ''} — showing ${shown}${ofStr} earthquakes.`);

  } catch (err) {
    showLoading(false);
    showError(err.message);
  }
}

/* ── Pagination update ───────────────────────────────────────────── */
function updatePagination(page, totalPages, shown, total, limit) {
  const hasMore = totalPages ? page < totalPages : shown >= parseInt(limit, 10);

  btnPrev.disabled = (page <= 1);
  btnNext.disabled = !hasMore;
  pageInfo.textContent = totalPages ? `Page ${page} / ${totalPages}` : `Page ${page}`;
  pagination.hidden = false;
}

/* ── Helpers ─────────────────────────────────────────────────────── */
function magBadgeClass(mag) {
  if (mag < 2)   return 'mag-minor';
  if (mag < 4)   return 'mag-light';
  if (mag < 5)   return 'mag-moderate';
  if (mag < 6.5) return 'mag-strong';
  return 'mag-major';
}

function formatDateTime(raw) {
  if (!raw) return '—';
  const d = new Date(raw);
  if (isNaN(d.getTime())) return String(raw);
  return d.toISOString().replace('T', ' ').slice(0, 19);
}

function escHtml(str) {
  return str
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;');
}

function showLoading(on) {
  loading.hidden = !on;
}

function showError(msg) {
  errorBox.textContent = `⚠ ${msg}`;
  errorBox.hidden = false;
}

function hideError() {
  errorBox.hidden = true;
}

function showStatus(msg) {
  statusBar.textContent = msg;
  statusBar.hidden = false;
}

function hideAll() {
  tableWrap.hidden   = true;
  eventDetail.hidden = true;
  pagination.hidden  = true;
  statusBar.hidden   = true;
  errorBox.hidden    = true;
  tbody.innerHTML    = '';
  eventDetail.innerHTML = '';
}

/* ── Button listeners ────────────────────────────────────────────── */
btnSearch.addEventListener('click', () => doSearch(1));

btnPrev.addEventListener('click', () => {
  if (currentPage > 1) doSearch(currentPage - 1);
});

btnNext.addEventListener('click', () => {
  doSearch(currentPage + 1);
});

/* ── Keyboard shortcut ───────────────────────────────────────────── */
document.addEventListener('keydown', (e) => {
  const tag = document.activeElement && document.activeElement.tagName;
  const isFormField = tag === 'INPUT' || tag === 'SELECT' || tag === 'TEXTAREA';
  if (e.key === 'Enter' && !isFormField) {
    doSearch(1);
  }
});

/* ── Init ────────────────────────────────────────────────────────── */
showGroup(endpointSel.value);
