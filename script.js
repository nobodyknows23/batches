/**
 * ============================================================
 * CONFIGURATION
 * ============================================================ */
const CONFIG = {
    // Your batches.json URL
    BATCHES_URL: 'https://raw.githubusercontent.com/nobodyknows23/batches/main/batches.json',

    // ============================================================
    // ⚠️ IMPORTANT: Add your auth_token here
    // Get it from pwthor.live cookies (F12 → Application → Cookies)
    // ============================================================
    AUTH_TOKEN: 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJtb2JpbGUiOiI2MDA2OTE1OTMzIiwibmFtZSI6IldhcmlzIiwiaWF0IjoxNzc5NjEyMzE4LCJleHAiOjE3ODczODgzMTh9.ZzSV4768j7-YSNRETRZLJ_-ZExi_XnmyicIxTMKZksM',

    // CORS Proxy (use if you don't have your own backend)
    // Try one of these:
    // 'https://corsproxy.io/?'
    // 'https://api.allorigins.win/raw?url='
    PROXY_URL: 'https://corsproxy.io/?',

    // Video proxy (vidcloud.eu.org)
    VIDEO_PROXY: 'https://vidcloud.eu.org/play.php',
};

// ============================================================
// API HELPER (with CORS proxy)
// ============================================================
async function apiFetch(url) {
    const fullUrl = CONFIG.PROXY_URL + encodeURIComponent(url);
    console.log('📡 Fetching:', url);

    const response = await fetch(fullUrl, {
        headers: {
            'Authorization': `Bearer ${CONFIG.AUTH_TOKEN}`,
            'Referer': 'https://pwthor.live/',
            'Accept': 'application/json',
        }
    });

    if (!response.ok) {
        throw new Error(`API error: ${response.status} - ${response.statusText}`);
    }

    const data = await response.json();
    console.log('✅ Response:', data);
    return data;
}

// ============================================================
// STATE
// ============================================================
let allBatches = [];
let filteredBatches = [];

// ============================================================
// DOM REFS
// ============================================================
const batchListEl = document.getElementById('batchList');
const searchInput = document.getElementById('searchInput');
const refreshBtn = document.getElementById('refreshBtn');
const batchCountEl = document.getElementById('batchCount');

// ============================================================
// HELPERS
// ============================================================
function formatDate(dateStr) {
    if (!dateStr) return '—';
    try {
        const d = new Date(dateStr);
        return d.toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' });
    } catch {
        return dateStr;
    }
}

function getPrice(amount) {
    const price = parseInt(amount) || 0;
    if (price === 0) return { label: 'FREE', class: 'free' };
    return { label: `₹${price.toLocaleString()}`, class: 'paid' };
}

// ============================================================
// BUILD WATCH URL (uses pwthor.live/watch)
// ============================================================
function buildWatchUrl(batchId, subjectId, childId, isLocked) {
    return `https://pwthor.live/watch?batchId=${batchId}&SubjectId=${subjectId}&ChildId=${childId}&Type=penpencilvdo&VideoUrl=&isLocked=${isLocked}`;
}

// ============================================================
// FETCH BATCHES
// ============================================================
async function fetchBatches() {
    batchListEl.innerHTML = `
        <div class="loading-spinner">
            <div class="spinner"></div>
            <p>Loading batches...</p>
        </div>
    `;

    try {
        let url = CONFIG.BATCHES_URL;
        if (CONFIG.PROXY_URL) {
            url = CONFIG.PROXY_URL + encodeURIComponent(url);
        }

        const response = await fetch(url);
        if (!response.ok) throw new Error(`HTTP ${response.status}`);

        const data = await response.json();
        allBatches = data.data || data || [];
        filteredBatches = [...allBatches];

        batchCountEl.textContent = `${allBatches.length} batches`;
        renderBatches(filteredBatches);
    } catch (error) {
        console.error('Fetch error:', error);
        batchListEl.innerHTML = `
            <div class="error-container">
                <div class="error-icon">⚠️</div>
                <div class="error-title">Failed to Load Batches</div>
                <div class="error-msg">${error.message}</div>
                <button class="retry-btn" onclick="fetchBatches()">🔄 Try Again</button>
            </div>
        `;
    }
}

// ============================================================
// RENDER BATCHES
// ============================================================
function renderBatches(batches) {
    if (!batches || batches.length === 0) {
        batchListEl.innerHTML = `
            <div class="no-results">
                <p>📭 No batches match your search.</p>
            </div>
        `;
        return;
    }

    let html = '<div class="batch-grid">';
    batches.forEach((batch, index) => {
        const price = getPrice(batch.amount);
        const exam = batch.exam ? (Array.isArray(batch.exam) ? batch.exam.join(', ') : batch.exam) : 'N/A';
        const image = batch.photo || batch.image || '';

        html += `
            <div class="batch-card" data-batchid="${batch.batch_id}" style="animation-delay: ${index * 0.04}s">
                <div class="card-image-wrapper">
                    <img class="card-image" src="${image}" alt="${batch.name}" 
                         onerror="this.src='data:image/svg+xml,<svg xmlns=%22http://www.w3.org/2000/svg%22 width=%22400%22 height=%22200%22><rect fill=%22%231a1a2e%22 width=%22400%22 height=%22200%22/><text fill=%22%236366f1%22 font-family=%22sans-serif%22 font-size=%2220%22 x=%2250%25%22 y=%2250%25%22 text-anchor=%22middle%22 dy=%22.3em%22>${batch.name}</text></svg>'">
                    <div class="card-image-overlay"></div>
                    <span class="language-badge">${batch.language || 'N/A'}</span>
                </div>
                <div class="card-body">
                    <div class="batch-name">${batch.name}</div>
                    <div class="batch-desc">${batch.byName || 'No description available'}</div>
                    <div class="card-meta">
                        <span class="meta-tag"><span class="icon">📅</span> ${formatDate(batch.start_date)}</span>
                        <span class="meta-tag"><span class="icon">🏁</span> ${formatDate(batch.end_date)}</span>
                        <span class="meta-tag"><span class="icon">📖</span> ${exam}</span>
                    </div>
                    <div class="card-footer">
                        <span class="price-tag ${price.class}">${price.label}</span>
                        <button class="btn-explore" data-batchid="${batch.batch_id}">Explore →</button>
                    </div>
                </div>
            </div>
        `;
    });
    html += '</div>';
    batchListEl.innerHTML = html;

    // Attach click events for "Explore" buttons
    document.querySelectorAll('.btn-explore').forEach((btn) => {
        btn.addEventListener('click', (e) => {
            e.stopPropagation();
            const batchId = btn.dataset.batchid;
            expandBatch(batchId);
        });
    });
}

// ============================================================
// EXPAND BATCH → Load Subjects using /api/BatchInfo
// ============================================================
async function expandBatch(batchId) {
    const card = document.querySelector(`.batch-card[data-batchid="${batchId}"]`);
    if (!card) return;

    // Check if already expanded
    let subjectsContainer = card.querySelector('.subjects-container');
    if (subjectsContainer) {
        subjectsContainer.classList.toggle('open');
        return;
    }

    // Create container
    subjectsContainer = document.createElement('div');
    subjectsContainer.className = 'subjects-container open';
    subjectsContainer.innerHTML = `
        <div class="loading-spinner" style="padding:20px;">
            <div class="spinner" style="width:24px;height:24px;"></div>
            <p style="font-size:14px;">Loading subjects...</p>
        </div>
    `;
    card.querySelector('.card-body').appendChild(subjectsContainer);

    try {
        // 1. Get subjects from /api/BatchInfo
        const url = `https://pwthor.live/api/BatchInfo?BatchId=${batchId}&Type=details`;
        const data = await apiFetch(url);

        const subjects = data.data?.subjects || [];
        if (subjects.length === 0) {
            subjectsContainer.innerHTML = `
                <div style="color:var(--text-secondary);padding:12px;text-align:center;">
                    No subjects found for this batch.
                </div>
            `;
            return;
        }

        let html = '';
        for (const subject of subjects) {
            const subjectId = subject.subjectId || subject._id;
            const subjectName = subject.subject || subject.name || 'Unnamed';

            html += `
                <div class="subject-item" data-subjectid="${subjectId}" data-batchid="${batchId}">
                    <div class="subject-header">
                        <span class="subject-name">${subjectName}</span>
                        <span class="subject-count">Loading topics...</span>
                    </div>
                    <div class="topics-container" data-loaded="false">
                        <div class="loading-spinner" style="padding:10px;">
                            <div class="spinner" style="width:20px;height:20px;"></div>
                            <p style="font-size:13px;">Loading topics...</p>
                        </div>
                    </div>
                </div>
            `;
        }
        subjectsContainer.innerHTML = html;

        // Attach click events for subjects → load topics
        subjectsContainer.querySelectorAll('.subject-item').forEach((item) => {
            item.addEventListener('click', async (e) => {
                e.stopPropagation();
                const topicsContainer = item.querySelector('.topics-container');
                const subjectId = item.dataset.subjectid;
                const batchId = item.dataset.batchid;

                if (topicsContainer.classList.contains('open')) {
                    topicsContainer.classList.remove('open');
                    return;
                }

                topicsContainer.classList.add('open');
                if (topicsContainer.dataset.loaded === 'false') {
                    await loadTopics(batchId, subjectId, topicsContainer, item);
                    topicsContainer.dataset.loaded = 'true';
                }
            });
        });

    } catch (error) {
        console.error('Error loading subjects:', error);
        subjectsContainer.innerHTML = `
            <div style="color:var(--danger);padding:12px;text-align:center;">
                Error: ${error.message}
            </div>
        `;
    }
}

// ============================================================
// LOAD TOPICS → /api/SubjectInfo
// ============================================================
async function loadTopics(batchId, subjectId, container, subjectItem) {
    try {
        const url = `https://pwthor.live/api/SubjectInfo?BatchId=${batchId}&SubjectId=${subjectId}&page=1`;
        const data = await apiFetch(url);

        const topics = data.data || [];
        const countEl = subjectItem.querySelector('.subject-count');
        if (countEl) countEl.textContent = `${topics.length} topics`;

        if (topics.length === 0) {
            container.innerHTML = `
                <div style="color:var(--text-secondary);padding:8px;font-size:13px;">
                    No topics found.
                </div>
            `;
            return;
        }

        let html = '';
        for (const topic of topics) {
            const topicId = topic._id || topic.tagId || topic.slug;
            const topicName = topic.name || 'Unnamed';
            const vidCount = topic.videos || topic.lectureVideos || 0;

            html += `
                <div class="topic-item" data-topicid="${topicId}" data-batchid="${batchId}" data-subjectid="${subjectId}">
                    <div class="topic-header">
                        <span class="topic-name">${topicName}</span>
                        <span class="topic-lecture-count">${vidCount} videos</span>
                    </div>
                    <div class="lectures-container" data-loaded="false">
                        <div class="loading-spinner" style="padding:8px;">
                            <div class="spinner" style="width:16px;height:16px;"></div>
                            <p style="font-size:12px;">Loading lectures...</p>
                        </div>
                    </div>
                </div>
            `;
        }
        container.innerHTML = html;

        // Attach click events for topics → load lectures
        container.querySelectorAll('.topic-item').forEach((item) => {
            item.addEventListener('click', async (e) => {
                e.stopPropagation();
                const lecContainer = item.querySelector('.lectures-container');
                const topicId = item.dataset.topicid;
                const batchId = item.dataset.batchid;
                const subjectId = item.dataset.subjectid;

                if (lecContainer.classList.contains('open')) {
                    lecContainer.classList.remove('open');
                    return;
                }

                lecContainer.classList.add('open');
                if (lecContainer.dataset.loaded === 'false') {
                    await loadLectures(batchId, subjectId, topicId, lecContainer);
                    lecContainer.dataset.loaded = 'true';
                }
            });
        });

    } catch (error) {
        console.error('Error loading topics:', error);
        container.innerHTML = `
            <div style="color:var(--danger);padding:8px;font-size:13px;">
                Error: ${error.message}
            </div>
        `;
    }
}

// ============================================================
// LOAD LECTURES → /api/TopicInfo (gets ChildId)
// ============================================================
async function loadLectures(batchId, subjectId, topicId, container) {
    try {
        const url = `https://pwthor.live/api/TopicInfo?BatchId=${batchId}&SubjectId=${subjectId}&TopicId=${topicId}&ContentType=videos&page=1`;
        const data = await apiFetch(url);

        const lectures = data.data || [];

        if (lectures.length === 0) {
            container.innerHTML = `
                <div style="color:var(--text-secondary);padding:6px;font-size:13px;">
                    No lectures found.
                </div>
            `;
            return;
        }

        let html = '';
        lectures.forEach((lec) => {
            const childId = lec._id || lec.ChildId;
            const name = lec.topic || lec.name || 'Lecture';
            const isLocked = lec.isLocked !== undefined ? lec.isLocked : false;

            const watchUrl = buildWatchUrl(batchId, subjectId, childId, isLocked);

            html += `
                <div class="lecture-item">
                    <span class="lecture-name">
                        ${name}
                        ${isLocked ? '🔒' : ''}
                    </span>
                    <div class="lecture-actions">
                        <button class="btn-watch" onclick="window.open('${watchUrl}', '_blank')">
                            ▶ Watch
                        </button>
                    </div>
                </div>
            `;
        });
        container.innerHTML = html;

    } catch (error) {
        console.error('Error loading lectures:', error);
        container.innerHTML = `
            <div style="color:var(--danger);padding:6px;font-size:13px;">
                Error: ${error.message}
            </div>
        `;
    }
}

// ============================================================
// SEARCH
// ============================================================
searchInput.addEventListener('input', function() {
    const query = this.value.toLowerCase().trim();
    if (!query) {
        filteredBatches = [...allBatches];
    } else {
        filteredBatches = allBatches.filter(b =>
            b.name.toLowerCase().includes(query) ||
            (b.byName && b.byName.toLowerCase().includes(query)) ||
            (b.exam && (Array.isArray(b.exam) ? b.exam.join(' ').toLowerCase() : b.exam.toLowerCase()).includes(query))
        );
    }
    renderBatches(filteredBatches);
});

// ============================================================
// REFRESH
// ============================================================
refreshBtn.addEventListener('click', () => {
    fetchBatches();
});

// ============================================================
// INIT
// ============================================================
document.addEventListener('DOMContentLoaded', () => {
    fetchBatches();
});

// Make functions globally accessible
window.fetchBatches = fetchBatches;
window.expandBatch = expandBatch;
window.loadTopics = loadTopics;
window.loadLectures = loadLectures;
window.buildWatchUrl = buildWatchUrl;