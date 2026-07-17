class Batch {
  constructor(data) {
    this.id = data._id || data.id;
    this.name = data.name;
    this.description = data.description;
    this.thumbnail = data.thumbnail;
    this.subjects = data.subjects || [];
    this.createdAt = data.createdAt;
    this.isActive = data.isActive;
  }

  getSubjectById(subjectId) {
    return this.subjects.find(s => s.id === subjectId || s._id === subjectId);
  }

  getSubjectBySlug(slug) {
    return this.subjects.find(s => s.slug === slug);
  }
}

class Subject {
  constructor(data) {
    this.id = data._id || data.id;
    this.slug = data.slug;
    this.name = data.name;
    this.topics = data.topics || [];
    this.thumbnail = data.thumbnail;
    this.teacher = data.teacher;
  }

  getTopicById(topicId) {
    return this.topics.find(t => t.id === topicId || t._id === topicId);
  }

  getTopicBySlug(slug) {
    return this.topics.find(t => t.slug === slug);
  }
}

class Topic {
  constructor(data) {
    this.id = data._id || data.id;
    this.slug = data.slug;
    this.name = data.name;
    this.videos = data.videos || [];
    this.thumbnail = data.thumbnail;
    this.completed = data.completed || false;
    this.progress = data.progress || 0;
  }

  getVideoById(videoId) {
    return this.videos.find(v => v.id === videoId || v._id === videoId);
  }

  getCompletionPercentage() {
    if (!this.videos.length) return 0;
    const completed = this.videos.filter(v => v.watched).length;
    return Math.round((completed / this.videos.length) * 100);
  }
}

class Video {
  constructor(data) {
    this.id = data._id || data.id;
    this.title = data.title;
    this.description = data.description;
    this.thumbnail = data.thumbnail;
    this.duration = data.duration;
    this.videoUrl = data.videoUrl;
    this.mpdUrl = data.mpdUrl;
    this.watched = data.watched || false;
    this.watchedDuration = data.watchedDuration || 0;
    this.quality = data.quality || 'auto';
    this.drm = data.drm || false;
  }

  getProgress() {
    if (!this.duration) return 0;
    return Math.round((this.watchedDuration / this.duration) * 100);
  }

  isComplete() {
    return this.getProgress() >= 90;
  }
}

export { Batch, Subject, Topic, Video };