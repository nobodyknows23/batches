/**
 * Video Player with DRM Support
 */

class VideoPlayer {
  constructor(config) {
    this.config = {
      container: config.container || '#video-container',
      autoPlay: config.autoPlay || false,
      quality: config.quality || 'auto',
      ...config
    };
    this.player = null;
    this.currentVideo = null;
  }

  async initialize() {
    // Load Shaka Player for DRM support
    if (typeof shaka === 'undefined') {
      await this.loadShakaPlayer();
    }
    
    this.player = new shaka.Player(this.getContainer());
    this.player.configure({
      drm: {
        servers: {
          'com.widevine.alpha': 'https://widevine-proxy.appspot.com/proxy'
        }
      }
    });
    return this.player;
  }

  getContainer() {
    const container = document.querySelector(this.config.container);
    if (!container) {
      throw new Error(`Container ${this.config.container} not found`);
    }
    return container;
  }

  async loadVideo(videoData) {
    if (!this.player) await this.initialize();
    
    this.currentVideo = videoData;
    const source = videoData.mpdUrl || videoData.videoUrl;
    
    if (videoData.drm) {
      // Load with DRM
      await this.loadDRMContent(source);
    } else {
      // Load directly
      await this.player.load(source);
    }
    
    if (this.config.autoPlay) {
      this.play();
    }
    
    return this.player;
  }

  async loadDRMContent(source) {
    // Get DRM key from API
    const response = await fetch(
      `/api/pw/kid?mpdUrl=${encodeURIComponent(source)}`
    );
    const { kid } = await response.json();
    
    if (kid) {
      // Configure DRM
      this.player.configure({
        drm: {
          servers: {
            'com.widevine.alpha': `https://license.deltastudy.site/?kid=${kid}`
          }
        }
      });
    }
    
    await this.player.load(source);
  }

  play() {
    if (this.player) this.player.play();
  }

  pause() {
    if (this.player) this.player.pause();
  }

  seek(time) {
    if (this.player) this.player.seek(time);
  }

  setQuality(quality) {
    if (this.player) {
      this.player.configure({ preferredTextLanguage: quality });
    }
  }

  async loadShakaPlayer() {
    return new Promise((resolve) => {
      const script = document.createElement('script');
      script.src = 'https://cdnjs.cloudflare.com/ajax/libs/shaka-player/4.7.9/shaka-player.compiled.js';
      script.onload = resolve;
      document.head.appendChild(script);
    });
  }

  destroy() {
    if (this.player) {
      this.player.destroy();
      this.player = null;
    }
  }

  // Event listeners
  on(event, callback) {
    if (this.player) {
      this.player.addEventListener(event, callback);
    }
  }

  getCurrentTime() {
    return this.player ? this.player.getCurrentTime() : 0;
  }

  getDuration() {
    return this.player ? this.player.getDuration() : 0;
  }

  isPaused() {
    return this.player ? this.player.isPaused() : true;
  }
}

export default VideoPlayer;