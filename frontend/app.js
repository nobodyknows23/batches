const LOCAL_BATCHES_URL = './batches.json';
const LIVE_API_URL = 'https://pwthor.live/api/AllBatches';
const DELTA_API_URL = 'https://apiserver.deltastudy.site/api/pw';
const PAGE_SIZE = 60;

const mainContent = document.getElementById('mainContent');
const connectionStatus = document.getElementById('connectionStatus');

let allBatches = [];
let visibleCount = PAGE_SIZE;
let activeQuery = '';
const enrolledBatchIds = new Set(JSON.parse(localStorage.getItem('enrolledBatchIds') || '[]'));

const escapeHtml = (value = '') => String(value).replace(/[&<>'"]/g, character => ({
  '&': '&amp;', '<': '&lt;', '>': '&gt;', "'": '&#039;', '"': '&quot;'
}[character]));

function normaliseBatch(batch) {
  return {
    id: batch._id || batch.batch_id || batch.id || '',
    name: batch.batchName || batch.name || 'Untitled batch',
    teacher: batch.byName || batch.description || '',
    image: batch.batchImage || batch.photo || '',
    startDate: batch.startDate || batch.start_date || '',
    status: batch.isExternal === false ? 'Available' : 'Active'
  };
}

function persistEnrolments() {
  localStorage.setItem('enrolledBatchIds', JSON.stringify([...enrolledBatchIds]));
}

function batchById(id) {
  return allBatches.find(batch => String(batch.id) === String(id));
}

function formatDate(date) {
  if (!date) return 'Date not available';
  const parsed = new Date(date);
  return Number.isNaN(parsed.valueOf()) ? 'Date not available' : parsed.toLocaleDateString();
}

function setStatus(text, state = '') {
  connectionStatus.textContent = text;
  connectionStatus.className = `status-badge ${state}`.trim();
}

function matchingBatches() {
  if (!activeQuery) return allBatches;
  return allBatches.filter(batch => `${batch.name} ${batch.teacher}`.toLowerCase().includes(activeQuery));
}

function renderCards(batches) {
  if (!batches.length) {
    return '<div class="empty-state"><span class="icon">📭</span><h3>No batches found</h3><p>Try another batch name, teacher, exam, or class.</p></div>';
  }

  return batches.slice(0, visibleCount).map(batch => {
    const image = escapeHtml(batch.image || 'https://via.placeholder.com/800x400/e2e8f0/718096?text=No+Image');
    const enrolled = enrolledBatchIds.has(String(batch.id));
    return `<article class="batch-card" tabindex="0" aria-label="${escapeHtml(batch.name)}">
      <img class="batch-card-image" src="${image}" alt="" onerror="this.src='https://via.placeholder.com/800x400/e2e8f0/718096?text=No+Image'">
      <div class="batch-card-body">
        <h2 class="batch-card-title">${escapeHtml(batch.name)}</h2>
        <p class="batch-card-subtitle">${escapeHtml(batch.teacher)}</p>
        <div class="batch-card-meta"><span>📅 ${formatDate(batch.startDate)}</span><span class="batch-status active">${batch.status}</span></div>
        <div class="batch-actions"><button class="enrol-button" type="button" data-action="enrol" data-batch-id="${escapeHtml(batch.id)}">${enrolled ? 'Enrolled' : 'Enroll'}</button><button class="study-button" type="button" data-action="study" data-batch-id="${escapeHtml(batch.id)}">Study</button></div>
      </div>
    </article>`;
  }).join('');
}

function updateList() {
  const matches = matchingBatches();
  const shown = Math.min(visibleCount, matches.length);
  document.getElementById('batchGrid').innerHTML = renderCards(matches);
  document.getElementById('batchSummary').textContent = activeQuery
    ? `${matches.length.toLocaleString()} matching batches · showing ${shown.toLocaleString()}`
    : `${allBatches.length.toLocaleString()} batches · showing ${shown.toLocaleString()}`;
  const loadMore = document.getElementById('loadMoreButton');
  loadMore.hidden = shown >= matches.length;
  loadMore.textContent = `Show ${Math.min(PAGE_SIZE, matches.length - shown).toLocaleString()} more batches`;
}

function setEnrolment(id) {
  const key = String(id);
  if (enrolledBatchIds.has(key)) enrolledBatchIds.delete(key);
  else enrolledBatchIds.add(key);
  persistEnrolments();
  updateList();
}

function renderPage() {
  mainContent.innerHTML = `<section aria-labelledby="batchesHeading">
    <div class="nav-header"><div><h2 id="batchesHeading" class="nav-title">My Batches</h2><p id="batchSummary" class="nav-subtitle"></p></div></div>
    <label class="search-field" for="searchInput"><span>Search batches</span><input id="searchInput" type="search" placeholder="Search batches or teachers" autocomplete="off"></label>
    <div id="batchGrid" class="batch-grid"></div>
    <div class="load-more-wrap"><button id="loadMoreButton" class="load-more-button" type="button">Show more batches</button></div>
  </section>`;

  document.getElementById('searchInput').addEventListener('input', event => {
    activeQuery = event.target.value.trim().toLowerCase();
    visibleCount = PAGE_SIZE;
    updateList();
  });
  document.getElementById('loadMoreButton').addEventListener('click', () => {
    visibleCount += PAGE_SIZE;
    updateList();
  });
  document.getElementById('batchGrid').addEventListener('click', event => {
    const button = event.target.closest('button[data-action]');
    if (!button) return;
    if (button.dataset.action === 'enrol') setEnrolment(button.dataset.batchId);
    if (button.dataset.action === 'study') loadSubjects(button.dataset.batchId);
  });
  updateList();
}

async function loadLocalBatches() {
  const response = await fetch(LOCAL_BATCHES_URL, { cache: 'no-cache' });
  if (!response.ok) throw new Error(`Local batch data returned ${response.status}.`);
  const payload = await response.json();
  const batches = Array.isArray(payload) ? payload : payload.data;
  if (!Array.isArray(batches) || !batches.length) throw new Error('Local batch data is empty.');
  return batches;
}

async function loadLiveBatches() {
  const response = await fetch(`${LIVE_API_URL}?page=1&limit=1000`);
  if (!response.ok) throw new Error(`Live API returned ${response.status}.`);
  const payload = await response.json();
  return payload.data || [];
}

async function requestJson(url) {
  const response = await fetch(url, { headers: { Accept: 'application/json' } });
  if (!response.ok) throw new Error(`The study API returned ${response.status} for this batch.`);
  const payload = await response.json();
  if (payload.success === false) throw new Error(payload.message || 'The study API returned an error.');
  return payload;
}

async function requestDeltaBatchDetails(batchId) {
  const response = await fetch(`${DELTA_API_URL}/batchdetails`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', Accept: 'application/json' },
    body: JSON.stringify({ searchParams: { BatchId: batchId } })
  });
  let payload;
  try { payload = await response.json(); } catch { throw new Error(`DeltaStudy returned ${response.status}.`); }
  if (!response.ok || payload.success === false) throw new Error(payload.message || `DeltaStudy returned ${response.status}.`);
  return payload;
}

async function requestLocalBatchInfo(batchId) {
  const response = await fetch(`/api/study/batch/${encodeURIComponent(batchId)}`, { headers: { Accept: 'application/json' } });
  let payload;
  try { payload = await response.json(); } catch { throw new Error(`Local study server returned ${response.status}.`); }
  if (!response.ok || payload.success === false) throw new Error(payload.message || `Local study server returned ${response.status}.`);
  return payload;
}

function extractSubjects(payload) {
  const queue = [payload];
  const visited = new Set();
  while (queue.length) {
    const value = queue.shift();
    if (!value || typeof value !== 'object' || visited.has(value)) continue;
    visited.add(value);
    if (Array.isArray(value)) {
      const first = value[0];
      if (first && typeof first === 'object' && ('subjectName' in first || 'subjectId' in first || 'subjectSlug' in first)) return value;
      queue.push(...value);
      continue;
    }
    for (const [key, child] of Object.entries(value)) {
      if (Array.isArray(child) && /subjects?/i.test(key)) return child;
      if (child && typeof child === 'object') queue.push(child);
    }
  }
  return [];
}

function normaliseSubject(subject) {
  return {
    id: subject.subjectId || subject.subjectSlug || subject.slug || subject._id || subject.id || '',
    name: subject.subjectName || subject.name || subject.title || 'Untitled subject',
    image: subject.image || subject.subjectImage || subject.thumbnail || '',
    teacher: subject.teacher || subject.byName || subject.teacherName || subject.description || ''
  };
}

function renderSubjects(batch, subjects) {
  const cards = subjects.length ? subjects.map(subject => `<article class="subject-card"><img class="subject-image" src="${escapeHtml(subject.image || 'https://via.placeholder.com/400x220/e2e8f0/718096?text=Subject')}" alt="" onerror="this.style.display='none'"><h3>${escapeHtml(subject.name)}</h3><p>${escapeHtml(subject.teacher)}</p><button class="study-button" type="button" data-subject-id="${escapeHtml(subject.id)}">Open subject</button></article>`).join('') : '<div class="empty-state"><span class="icon">📚</span><h3>No subjects available</h3><p>This batch has no subject data yet.</p></div>';
  mainContent.innerHTML = `<section aria-labelledby="subjectsHeading"><div class="nav-header"><button class="back-button" id="backToBatches" type="button">← All batches</button><div><h2 id="subjectsHeading" class="nav-title">${escapeHtml(batch.name)}</h2><p class="nav-subtitle">${subjects.length} subjects</p></div></div><div class="subject-grid" id="subjectGrid">${cards}</div></section>`;
  document.getElementById('backToBatches').addEventListener('click', renderPage);
  document.getElementById('subjectGrid').addEventListener('click', event => {
    const button = event.target.closest('[data-subject-id]');
    if (button) loadSubjectContent(batch, subjects.find(subject => String(subject.id) === button.dataset.subjectId));
  });
}

async function loadSubjects(id) {
  const batch = batchById(id);
  if (!batch) return;
  mainContent.innerHTML = '<div class="loading-container"><div class="loading-spinner"></div><p class="loading-text">Loading subjects…</p></div>';
  setStatus('Loading subjects…', 'loading');
  try {
    const batchId = String(batch.id);
    if (!batchId) throw new Error('This batch does not include an API batch ID.');
    const sources = [
      { name: 'local Node server', load: () => requestLocalBatchInfo(batchId) },
      { name: 'DeltaStudy', load: () => requestDeltaBatchDetails(batchId) },
      { name: 'PW Thor', load: () => requestJson(`${LIVE_API_URL.replace('/AllBatches', '/BatchInfo')}?BatchId=${encodeURIComponent(batchId)}&Type=details`) }
    ];
    const failures = [];
    let subjects = [];
    let loadedFrom = '';
    for (const source of sources) {
      try {
        const payload = await source.load();
        subjects = extractSubjects(payload).map(normaliseSubject).filter(subject => subject.id);
        if (subjects.length) { loadedFrom = source.name; break; }
        failures.push(`${source.name}: no subjects were returned`);
      } catch (sourceError) {
        failures.push(`${source.name}: ${sourceError.message}`);
      }
    }
    if (!subjects.length) throw new Error(failures.join(' · '));
    renderSubjects(batch, subjects);
    setStatus(`${subjects.length} subjects loaded`);
    console.info(`Subjects loaded from ${loadedFrom}.`);
  } catch (error) {
    mainContent.innerHTML = `<div class="error-container"><span class="icon">⚠️</span><h2>Could not load subjects</h2><p>${escapeHtml(error.message)}</p><p class="error-hint">Both configured services rejected this browser request. An approved API key, backend proxy, or exported subject JSON is required for live subjects.</p><button class="retry-btn" id="backToBatches" type="button">Back to batches</button></div>`;
    document.getElementById('backToBatches').addEventListener('click', renderPage);
    setStatus('Subjects unavailable', 'error');
  }
}

async function loadSubjectContent(batch, subject) {
  if (!subject) return;
  setStatus('Opening subject…', 'loading');
  try {
    const payload = await requestJson(`${LIVE_API_URL.replace('/AllBatches', '/SubjectInfo')}?BatchId=${encodeURIComponent(batch.id)}&SubjectId=${encodeURIComponent(subject.id)}&page=1`);
    const content = payload.data || payload;
    const itemCount = Array.isArray(content) ? content.length : Object.keys(content || {}).length;
    alert(`${subject.name} opened. Subject API returned ${itemCount} content item${itemCount === 1 ? '' : 's'}.`);
    setStatus('Subject loaded');
  } catch (error) {
    alert(`Could not open ${subject.name}: ${error.message}`);
    setStatus('Subject unavailable', 'error');
  }
}

async function loadBatches() {
  setStatus('Loading…', 'loading');
  mainContent.innerHTML = '<div class="loading-container"><div class="loading-spinner"></div><p class="loading-text">Loading all available batches…</p></div>';
  try {
    let source = 'saved batch list';
    try {
      allBatches = (await loadLocalBatches()).map(normaliseBatch);
    } catch (localError) {
      console.warn('Local batch list unavailable:', localError);
      allBatches = (await loadLiveBatches()).map(normaliseBatch);
      source = 'live API';
    }
    allBatches = allBatches.filter(batch => batch.name).sort((a, b) => a.name.localeCompare(b.name));
    renderPage();
    setStatus(`${allBatches.length.toLocaleString()} loaded`);
    console.info(`Loaded ${allBatches.length} batches from ${source}.`);
  } catch (error) {
    console.error('Batch load failed:', error);
    mainContent.innerHTML = `<div class="error-container"><span class="icon">⚠️</span><h2>Could not load batches</h2><p>The local batch list and the live service are unavailable. ${escapeHtml(error.message)}</p><button class="retry-btn" id="retryButton">Try again</button></div>`;
    document.getElementById('retryButton').addEventListener('click', loadBatches);
    setStatus('Connection error', 'error');
  }
}

loadBatches();
