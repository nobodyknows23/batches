/**
 * Main Application
 * PW Clone Study Platform
 */

import PWClient from './api/pwClient.js';
import { Batch, Subject, Topic, Video } from './models/DataModels.js';
import VideoPlayer from './players/VideoPlayer.js';
import { BatchList, SubjectList, TopicList, VideoPlayerUI } from './ui/Components.js';

class PWAapp {
  constructor() {
    this.client = new PWClient();
    this.currentBatch = null;
    this.currentSubject = null;
    this.currentTopic = null;
    this.currentVideo = null;
    this.player = null;
    
    // UI Containers
    this.container = document.getElementById('app');
    
    // Initialize
    this.init();
  }

  async init() {
    console.log('🚀 PW Clone App Initialized');
    
    // Load initial data
    await this.loadBatches();
    
    // Setup navigation
    this.setupNavigation();
  }

  async loadBatches() {
    try {
      // Get user's batches from localStorage or default
      const batchId = localStorage.getItem('currentBatch') || '693ffdb27560d3631722a576';
      this.client.setBatch(batchId);
      
      const data = await this.client.getBatchDetails(batchId);
      this.currentBatch = new Batch(data.data || data);
      
      this.renderBatches();
      return this.currentBatch;
    } catch (error) {
      console.error('Failed to load batches:', error);
      this.showError('Failed to load batches');
    }
  }

  renderBatches() {
    this.clearContainer();
    
    const batchList = new BatchList(this.container, [this.currentBatch]);
    batchList.render();
    
    if (this.currentBatch.subjects?.length) {
      const subjectList = new SubjectList(this.container, this.currentBatch.subjects);
      subjectList.render();
      subjectList.onSubjectClick((subjectId) => {
        this.loadSubject(subjectId);
      });
    }
  }

  async loadSubject(subjectId) {
    try {
      const subjectData = this.currentBatch.getSubjectById(subjectId);
      if (!subjectData) {
        throw new Error('Subject not found');
      }
      
      this.currentSubject = new Subject(subjectData);
      
      // Load topics
      const topicsData = await this.client.getTopics(
        this.currentBatch.id,
        subjectData.slug || subjectId
      );
      
      this.currentSubject.topics = topicsData.data || [];
      
      this.renderTopics();
    } catch (error) {
      console.error('Failed to load subject:', error);
      this.showError('Failed to load subject');
    }
  }

  renderTopics() {
    this.clearContainer();
    
    // Show subject header
    const header = document.createElement('h1');
    header.textContent = this.currentSubject.name;
    this.container.appendChild(header);
    
    if (this.currentSubject.topics?.length) {
      const topicList = new TopicList(this.container, this.currentSubject.topics);
      topicList.render();
      topicList.onTopicClick((topicId) => {
        this.loadTopic(topicId);
      });
    } else {
      this.showError('No topics found for this subject');
    }
  }

  async loadTopic(topicId) {
    try {
      const topicData = this.currentSubject.getTopicById(topicId);
      if (!topicData) {
        throw new Error('Topic not found');
      }
      
      this.currentTopic = new Topic(topicData);
      
      // Load video content
      const videoData = await this.client.getVideoContent(
        this.currentBatch.id,
        this.currentSubject.slug,
        this.currentTopic.slug
      );
      
      this.currentTopic.videos = videoData.data || [];
      
      this.renderVideos();
    } catch (error) {
      console.error('Failed to load topic:', error);
      this.showError('Failed to load topic');
    }
  }

  renderVideos() {
    this.clearContainer();
    
    // Show topic header
    const header = document.createElement('div');
    header.className = 'topic-header';
    header.innerHTML = `
      <h1>${this.currentTopic.name}</h1>
      <p>${this.currentTopic.videos.length} videos</p>
      <div class="topic-progress-bar">
        <div class="progress" style="width: ${this.currentTopic.getCompletionPercentage()}%"></div>
      </div>
    `;
    this.container.appendChild(header);
    
    if (this.currentTopic.videos.length) {
      // Show first video
      const firstVideo = this.currentTopic.videos[0];
      const videoUI = new VideoPlayerUI(this.container, {
        ...firstVideo,
        playlist: this.currentTopic.videos
      });
      videoUI.render();
      videoUI.onVideoSelect((videoId) => {
        this.playVideo(videoId);
      });
      
      // Initialize player
      this.player = videoUI.getPlayer();
    } else {
      this.showError('No videos available');
    }
  }

  async playVideo(videoId) {
    try {
      const videoData = this.currentTopic.getVideoById(videoId);
      if (!videoData) {
        throw new Error('Video not found');
      }
      
      this.currentVideo = new Video(videoData);
      
      // Update player source
      if (this.player) {
        this.player.src = this.currentVideo.videoUrl || this.currentVideo.mpdUrl;
        this.player.play();
      }
      
      // Mark video as watched
      this.markVideoWatched(videoId);
    } catch (error) {
      console.error('Failed to play video:', error);
      this.showError('Failed to play video');
    }
  }

  async markVideoWatched(videoId) {
    // Save progress to localStorage
    const progress = {
      batchId: this.currentBatch.id,
      subjectId: this.currentSubject.id,
      topicId: this.currentTopic.id,
      videoId: videoId,
      timestamp: Date.now()
    };
    
    const history = JSON.parse(localStorage.getItem('watchHistory') || '[]');
    history.push(progress);
    localStorage.setItem('watchHistory', JSON.stringify(history));
  }

  clearContainer() {
    this.container.innerHTML = '';
  }

  showError(message) {
    const errorDiv = document.createElement('div');
    errorDiv.className = 'error-message';
    errorDiv.innerHTML = `
      <p>❌ ${message}</p>
      <button onclick="location.reload()">Retry</button>
    `;
    this.container.appendChild(errorDiv);
  }

  setupNavigation() {
    // Setup back buttons
    document.addEventListener('click', (e) => {
      if (e.target.closest('.back-button')) {
        e.preventDefault();
        this.goBack();
      }
    });
    
    // Keyboard shortcuts
    document.addEventListener('keydown', (e) => {
      if (e.key === 'Escape') {
        this.goBack();
      }
    });
  }

  goBack() {
    if (this.currentTopic) {
      this.renderTopics();
    } else if (this.currentSubject) {
      this.renderBatches();
    }
  }
}

// Initialize app when DOM is ready
document.addEventListener('DOMContentLoaded', () => {
  window.app = new PWAapp();
});

export default PWAapp;