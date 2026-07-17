class Component {
  constructor(parent) {
    this.parent = parent;
    this.element = null;
  }

  render() {
    throw new Error('Render method must be implemented');
  }
}

class BatchList extends Component {
  constructor(parent, batches) {
    super(parent);
    this.batches = batches || [];
  }

  render() {
    this.element = document.createElement('div');
    this.element.className = 'batch-list';
    this.element.innerHTML = `
      <button class="back-button" onclick="window.app?.goBack()">← Back</button>
      <h2>My Batches</h2>
      <div class="batch-grid">
        ${this.batches.map(batch => `
          <div class="batch-card" data-batch-id="${batch.id}">
            <img src="${batch.thumbnail || '/default-thumb.jpg'}" alt="${batch.name}">
            <div class="batch-info">
              <h3>${batch.name}</h3>
              <p>${batch.description || ''}</p>
              <span class="batch-status ${batch.isActive ? 'active' : 'inactive'}">
                ${batch.isActive ? 'Active' : 'Inactive'}
              </span>
            </div>
          </div>
        `).join('')}
      </div>
    `;
    this.parent.appendChild(this.element);
    return this.element;
  }

  onBatchClick(callback) {
    this.element.addEventListener('click', (e) => {
      const card = e.target.closest('.batch-card');
      if (card) {
        const batchId = card.dataset.batchId;
        callback(batchId);
      }
    });
  }
}

class SubjectList extends Component {
  constructor(parent, subjects) {
    super(parent);
    this.subjects = subjects || [];
  }

  render() {
    this.element = document.createElement('div');
    this.element.className = 'subject-list';
    this.element.innerHTML = `
      <button class="back-button" onclick="window.app?.goBack()">← Back</button>
      <h2>Subjects</h2>
      <div class="subject-grid">
        ${this.subjects.map(subject => `
          <div class="subject-card" data-subject-id="${subject.id}">
            <img src="${subject.thumbnail || '/default-subject.jpg'}" alt="${subject.name}">
            <div class="subject-info">
              <h3>${subject.name}</h3>
              <p>${subject.teacher || ''}</p>
              <span class="topic-count">${subject.topics?.length || 0} Topics</span>
            </div>
          </div>
        `).join('')}
      </div>
    `;
    this.parent.appendChild(this.element);
    return this.element;
  }

  onSubjectClick(callback) {
    this.element.addEventListener('click', (e) => {
      const card = e.target.closest('.subject-card');
      if (card) {
        const subjectId = card.dataset.subjectId;
        callback(subjectId);
      }
    });
  }
}

class TopicList extends Component {
  constructor(parent, topics) {
    super(parent);
    this.topics = topics || [];
  }

  render() {
    this.element = document.createElement('div');
    this.element.className = 'topic-list';
    this.element.innerHTML = `
      <button class="back-button" onclick="window.app?.goBack()">← Back</button>
      <h2>Topics</h2>
      <div class="topic-grid">
        ${this.topics.map(topic => `
          <div class="topic-card" data-topic-id="${topic.id}">
            <div class="topic-progress ${topic.completed ? 'completed' : ''}">
              <svg viewBox="0 0 36 36">
                <circle cx="18" cy="18" r="16" fill="none" class="progress-bg"/>
                <circle cx="18" cy="18" r="16" fill="none" 
                  class="progress-fill" 
                  stroke-dasharray="${topic.progress || 0}, 100"/>
              </svg>
              <span>${topic.progress || 0}%</span>
            </div>
            <div class="topic-info">
              <h3>${topic.name}</h3>
              <span class="video-count">${topic.videos?.length || 0} videos</span>
            </div>
          </div>
        `).join('')}
      </div>
    `;
    this.parent.appendChild(this.element);
    return this.element;
  }

  onTopicClick(callback) {
    this.element.addEventListener('click', (e) => {
      const card = e.target.closest('.topic-card');
      if (card) {
        const topicId = card.dataset.topicId;
        callback(topicId);
      }
    });
  }
}

class VideoPlayerUI extends Component {
  constructor(parent, video) {
    super(parent);
    this.video = video;
    this.player = null;
  }

  render() {
    this.element = document.createElement('div');
    this.element.className = 'video-player-container';
    this.element.innerHTML = `
      <button class="back-button" onclick="window.app?.goBack()">← Back</button>
      <div class="video-wrapper">
        <video id="video-player" controls autoplay>
          <source src="${this.video.videoUrl || ''}" type="video/mp4">
          Your browser does not support the video tag.
        </video>
        <div class="video-controls">
          <div class="video-info">
            <h3>${this.video.title}</h3>
            <p>${this.video.description || ''}</p>
          </div>
          <div class="video-progress-bar">
            <div class="progress" style="width: ${this.video.watched ? '100%' : '0%'}"></div>
          </div>
        </div>
      </div>
      <div class="video-sidebar">
        <div class="playlist">
          <h4>Playlist</h4>
          <ul class="video-list">
            ${this.video.playlist?.map(v => `
              <li class="${v.id === this.video.id ? 'active' : ''}">
                <a href="#" data-video-id="${v.id}">
                  <span class="video-title">${v.title}</span>
                  <span class="video-duration">${v.duration || '0:00'}</span>
                </a>
              </li>
            `).join('') || '<li>No videos in playlist</li>'}
          </ul>
        </div>
      </div>
    `;
    this.parent.appendChild(this.element);
    
    this.player = document.getElementById('video-player');
    return this.element;
  }

  onVideoSelect(callback) {
    this.element.addEventListener('click', (e) => {
      const link = e.target.closest('[data-video-id]');
      if (link) {
        e.preventDefault();
        const videoId = link.dataset.videoId;
        callback(videoId);
      }
    });
  }

  getPlayer() {
    return this.player;
  }

  updateProgress(progress) {
    const bar = this.element.querySelector('.video-progress-bar .progress');
    if (bar) {
      bar.style.width = `${Math.min(progress, 100)}%`;
    }
  }
}

export { BatchList, SubjectList, TopicList, VideoPlayerUI };