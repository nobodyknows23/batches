/**
 * ============================================================
 * CONFIGURATION
 * ============================================================ */
const CONFIG = {
    // Your batches.json URL
    BATCHES_URL: 'https://raw.githubusercontent.com/nobodyknows23/batches/main/batches.json',

    // If you have a backend proxy, use it; otherwise, use direct fetch
    // For CORS issues, use a proxy like corsproxy.io
    PROXY_URL: '', // e.g., 'https://corsproxy.io/?'

    // Video proxy (vidcloud.eu.org)
    VIDEO_PROXY: 'https://vidcloud.eu.org/play.php',
};

// ============================================================
// STATE
// ============================================================
let allBatches = [];
let filteredBatches = [];
let currentBatchId = null;
let shakaPlayer = null;
let isShakaLoaded = false;

// ============================================================
// DOM REFS
// ============================================================
const batchListEl = document.getElementById('batchList');
const searchInput = document.getElementById('searchInput');
const refreshBtn = document.getElementById('refreshBtn');
const batchCountEl = document.getElementById('batchCount');
const videoModal = document.getElementById('videoModal');
const videoTitle = document.getElementById('videoTitle');
const closeModalBtn = document.getElementById('closeModal');
const videoPlayer = document.getElementById('videoPlayer');

// ============================================================
// SHOW/HIDE MODAL
// ============================================================
function openModal(title, videoUrl) {
    videoTitle.textContent = title || 'Loading...';
    videoModal.classList.add('active');
    document.body.style.overflow = 'hidden';

    // Load video
    loadVideo(videoUrl);
}

function closeModal() {
    videoModal.classList.remove('active');
    document.body.style.overflow = '';
    if (shakaPlayer) {
        shakaPlayer.destroy();
        shakaPlayer = null;
    }
    videoPlayer.removeAttribute('src');
    videoPlayer.load();
}

closeModalBtn.addEventListener('click', closeModal);
videoModal.addEventListener('click', (e) => {
    if (e.target === videoModal) closeModal();
});

document.addEventListener('keydown', (e) => {
    if (e.key === 'Escape') closeModal();
});

// ============================================================
// VIDEO LOADER (Shaka Player)
// ============================================================
function loadVideo(videoUrl) {
    if (!videoUrl) {
        alert('No video URL provided.');
        return;
    }

    // Check if Shaka is loaded
    if (typeof shaka === 'undefined') {
        alert('Shaka Player library not loaded. Please refresh.');
        return;
    }

    // Destroy existing player
    if (shakaPlayer) {
        shakaPlayer.destroy();
        shakaPlayer = null;
    }

    // Create new player
    shakaPlayer = new shaka.Player(videoPlayer);

    // Configure
    shakaPlayer.configure({
        streaming: {
            bufferingGoal: 60,
            retryParameters: {
                maxAttempts: 10,
                timeout: 30000,
            },
        },
        drm: {
            clearKeys: {},
        },
    });

    // Error handling
    shakaPlayer.addEventListener('error', (event) => {
        console.error('Shaka Player error:', event.detail);
        // Try fallback: use video element directly with the URL
        fallbackPlayVideo(videoUrl);
    });

    // Load the video
    shakaPlayer.load(videoUrl).catch((error) => {
        console.error('Error loading video:', error);
        fallbackPlayVideo(videoUrl);
    });
}

// ============================================================
// FALLBACK VIDEO PLAYER
// ============================================================
function fallbackPlayVideo(videoUrl) {
    console.log('Using fallback video player for:', videoUrl);
    videoPlayer.removeAttribute('src');
    videoPlayer.src = videoUrl;
    videoPlayer.load();
    videoPlayer.play().catch((e) => {
        console.error('Fallback play failed:', e);
        // If it's a DASH/MPD URL, try to open in new tab as last resort
        if (videoUrl.includes('.mpd') || videoUrl.includes('master.mpd')) {
            if (confirm('Video player failed. Open in new tab?')) {
                window.open(videoUrl, '_blank');
            }
        }
    });
}

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
// BUILD WATCH URL (using vidcloud.eu.org)
// ============================================================
function buildWatchUrl(batchId, subjectId, topicId, videoId, videoUrl, videoName, videoImg) {
    const params = new URLSearchParams({
        batch_id: batchId,
        subject_id: subjectId,
        topic_id: topicId,
        video_id: videoId,
        video_url: videoUrl,
        video_name: videoName || 'Lecture',
        video_img: videoImg || '',
        video_type: 'new',
        play_type: 'Lecture',
    });
    return `${CONFIG.VIDEO_PROXY}?${params.toString()}`;
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

    // Click on card to expand
    document.querySelectorAll('.batch-card').forEach((card) => {
        card.addEventListener('click', () => {
            const batchId = card.dataset.batchid;
            expandBatch(batchId);
        });
    });
}

// ============================================================
// EXPAND BATCH (Load Subjects)
// ============================================================
let expandedBatches = new Set();

async function expandBatch(batchId) {
    const card = document.querySelector(`.batch-card[data-batchid="${batchId}"]`);
    if (!card) return;

    // Check if already expanded
    let subjectsContainer = card.querySelector('.subjects-container');
    if (subjectsContainer) {
        // Toggle
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
        // Use the batch ID to fetch subjects (via the PW API)
        // Since we don't have direct API access, we'll simulate with sample data
        // In production, you'd call your proxy API here
        const subjects = await fetchSubjects(batchId);

        if (!subjects || subjects.length === 0) {
            subjectsContainer.innerHTML = `
                <div style="color:var(--text-secondary);padding:12px;text-align:center;">
                    No subjects found for this batch.
                </div>
            `;
            return;
        }

        let html = '';
        subjects.forEach((subject) => {
            html += `
                <div class="subject-item" data-subjectid="${subject.id}" data-batchid="${batchId}">
                    <div class="subject-header">
                        <span class="subject-name">${subject.name}</span>
                        <span class="subject-count">${subject.topics ? subject.topics.length : 0} topics</span>
                    </div>
                    <div class="topics-container">
                        ${subject.topics ? subject.topics.map(topic => `
                            <div class="topic-item" data-topicid="${topic.id}" data-batchid="${batchId}" data-subjectid="${subject.id}">
                                <div class="topic-header">
                                    <span class="topic-name">${topic.name}</span>
                                    <span class="topic-lecture-count">${topic.lectures ? topic.lectures.length : 0} lectures</span>
                                </div>
                                <div class="lectures-container">
                                    ${topic.lectures ? topic.lectures.map(lecture => `
                                        <div class="lecture-item">
                                            <span class="lecture-name">${lecture.name}</span>
                                            <div class="lecture-actions">
                                                <button class="btn-watch" 
                                                    data-batchid="${batchId}"
                                                    data-subjectid="${subject.id}"
                                                    data-topicid="${topic.id}"
                                                    data-videoid="${lecture.video_id || lecture.id}"
                                                    data-videourl="${lecture.video_url || ''}"
                                                    data-videoname="${lecture.name}">
                                                    ▶ Watch
                                                </button>
                                            </div>
                                        </div>
                                    `).join('') : ''}
                                </div>
                            </div>
                        `).join('') : ''}
                    </div>
                </div>
            `;
        });
        subjectsContainer.innerHTML = html;

        // Attach click events for topics (to toggle lectures)
        subjectsContainer.querySelectorAll('.topic-item').forEach((item) => {
            item.addEventListener('click', (e) => {
                e.stopPropagation();
                const lecContainer = item.querySelector('.lectures-container');
                if (lecContainer) {
                    lecContainer.classList.toggle('open');
                }
            });
        });

        // Attach watch events
        subjectsContainer.querySelectorAll('.btn-watch').forEach((btn) => {
            btn.addEventListener('click', (e) => {
                e.stopPropagation();
                const batchId = btn.dataset.batchid;
                const subjectId = btn.dataset.subjectid;
                const topicId = btn.dataset.topicid;
                const videoId = btn.dataset.videoid;
                const videoUrl = btn.dataset.videourl;
                const videoName = btn.dataset.videoname;

                // If videoUrl is empty, try to get it from a proxy or use a fallback
                if (!videoUrl) {
                    alert('Video URL not available for this lecture.');
                    return;
                }

                // Build the play.php URL
                const watchUrl = buildWatchUrl(
                    batchId,
                    subjectId,
                    topicId,
                    videoId,
                    videoUrl,
                    videoName,
                    ''
                );

                // Instead of playing directly, open the vidcloud page
                // or extract the signed URL from it.
                // For now, we'll open it in a new tab.
                window.open(watchUrl, '_blank');
            });
        });

        // Toggle subjects on click
        subjectsContainer.querySelectorAll('.subject-item').forEach((item) => {
            item.addEventListener('click', (e) => {
                e.stopPropagation();
                const topicsContainer = item.querySelector('.topics-container');
                if (topicsContainer) {
                    topicsContainer.classList.toggle('open');
                }
            });
        });

    } catch (error) {
        console.error('Error loading subjects:', error);
        subjectsContainer.innerHTML = `
            <div style="color:var(--danger);padding:12px;text-align:center;">
                Error loading subjects: ${error.message}
            </div>
        `;
    }
}

// ============================================================
// FETCH SUBJECTS (Simulated / Replace with your API)
// ============================================================
async function fetchSubjects(batchId) {
    // This is sample data – in production, you'd call your proxy API
    // For now, we'll use the data from your logs
    const sampleSubjects = {
        '6779346f920e596fe7f0e247': [
            {
                id: '69bebebd0f88909eec54104a',
                name: 'Zoology By Samapti Sinha Ma\'am',
                topics: [
                    {
                        id: '69ccc6b5a01f2569524bfa89',
                        name: 'Reproductive Health',
                        lectures: [
                            {
                                id: '6a0ec3173aa0cd64d08f52e4',
                                name: 'Reproductive Health 06',
                                video_url: 'https://d1d34p8vz63oiq.cloudfront.net/ad90c7c7-d43a-44ea-9c0a-6f1271468d9e/master.mpd'
                            }
                        ]
                    }
                ]
            }
        ],
        '69047c05fc3bb2dd64711bd8': [
            {
                id: 'physics-145369',
                name: 'Physics',
                topics: [
                    {
                        id: 'basic-mathematics-894431',
                        name: 'Basic Mathematics',
                        lectures: [
                            {
                                id: '695214ad40b8c215c300685f',
                                name: 'Basic Mathematics 01',
                                video_url: 'https://d1d34p8vz63oiq.cloudfront.net/3c022c52-c8e9-4054-9f82-57b72d583162/master.mpd'
                            }
                        ]
                    }
                ]
            }
        ]
    };

    // Simulate API delay
    await new Promise(resolve => setTimeout(resolve, 600));

    // Return sample data if available, otherwise empty
    return sampleSubjects[batchId] || [];
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

// Make functions globally accessible for inline onclick
window.fetchBatches = fetchBatches;
window.expandBatch = expandBatch;
window.buildWatchUrl = buildWatchUrl;
window.openModal = openModal;
window.closeModal = closeModal;