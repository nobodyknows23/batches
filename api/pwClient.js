class PWClient {
  constructor() {
    this.baseURL = 'https://apiserver.deltastudy.site/api/pw';
    this.batchId = null;
  }

  setBatch(batchId) {
    this.batchId = batchId;
  }

  async getBatchDetails(batchId = this.batchId) {
    const response = await fetch(`${this.baseURL}/batchdetails`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ searchParams: { BatchId: batchId } })
    });
    return response.json();
  }

  async getTopics(batchId, subjectId) {
    const response = await fetch(
      `${this.baseURL}/topics?BatchId=${batchId}&SubjectId=${subjectId}`
    );
    return response.json();
  }

  async getVideoContent(batchId, subjectSlug, topicSlug) {
    const response = await fetch(
      `${this.baseURL}/datacontent?batchId=${batchId}&subjectSlug=${subjectSlug}&topicSlug=${topicSlug}&contentType=videos`
    );
    return response.json();
  }

  async getLiveSchedule(batchId = this.batchId) {
    const response = await fetch(`${this.baseURL}/live`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ batchId })
    });
    return response.json();
  }

  async getMetadata(batchId, subjectId, childId) {
    const response = await fetch(
      `${this.baseURL}/metpro?batchId=${batchId}&subjectId=${subjectId}&childId=${childId}`
    );
    return response.json();
  }

  async getDRMKey(mpdUrl) {
    const response = await fetch(
      `${this.baseURL}/kid?mpdUrl=${encodeURIComponent(mpdUrl)}`
    );
    return response.json();
  }

  async getOTP(kid) {
    const response = await fetch(`${this.baseURL}/otp?kid=${kid}`);
    return response.json();
  }

  async getFullTopic(batchId, subjectSlug, topicSlug) {
    const videos = await this.getVideoContent(batchId, subjectSlug, topicSlug);
    const enrichedVideos = await Promise.all(
      videos?.data?.map(async (video) => {
        const meta = await this.getMetadata(batchId, subjectSlug, video._id);
        return { ...video, metadata: meta };
      }) || []
    );
    return { ...videos, data: enrichedVideos };
  }
}

export default PWClient;