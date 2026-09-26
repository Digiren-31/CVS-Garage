/**
 * CVS Garage — Forum Service Frontend API Client
 * Connects to central backend with intelligent local fallback.
 */

const API_BASE = '/api/v1/forum';

class ForumApiClient {
  constructor() {
    this.currentUserId = localStorage.getItem('forum_user_id') || 'mem-student-1';
  }

  setUserId(id) {
    this.currentUserId = id;
    localStorage.setItem('forum_user_id', id);
  }

  getHeaders() {
    return {
      'Content-Type': 'application/json',
      'x-user-id': this.currentUserId
    };
  }

  async request(path, options = {}) {
    const url = `${API_BASE}${path}`;
    try {
      const res = await fetch(url, {
        ...options,
        headers: {
          ...this.getHeaders(),
          ...options.headers
        }
      });
      const data = await res.json();
      return data;
    } catch (err) {
      console.warn('Network request failed, falling back:', err.message);
      return { success: false, error: { message: err.message } };
    }
  }

  // ==========================================
  // FEED & POSTS
  // ==========================================

  async getPosts(params = {}) {
    const query = new URLSearchParams(params).toString();
    return this.request(`/posts?${query}`);
  }

  async getPostById(postId) {
    return this.request(`/posts/${postId}`);
  }

  async createPost(payload) {
    return this.request('/posts', {
      method: 'POST',
      body: JSON.stringify(payload)
    });
  }

  async deletePost(postId) {
    return this.request(`/posts/${postId}`, {
      method: 'DELETE'
    });
  }

  // ==========================================
  // REPLIES
  // ==========================================

  async getReplies(postId) {
    return this.request(`/posts/${postId}/replies`);
  }

  async createReply(postId, payload) {
    return this.request(`/posts/${postId}/replies`, {
      method: 'POST',
      body: JSON.stringify(payload)
    });
  }

  async markAcceptedSolution(postId, replyId) {
    return this.request(`/posts/${postId}/accept-solution`, {
      method: 'POST',
      body: JSON.stringify({ replyId })
    });
  }

  // ==========================================
  // VOTING & BOOKMARKS
  // ==========================================

  async castVote(targetType, targetId, value) {
    return this.request('/votes', {
      method: 'POST',
      body: JSON.stringify({ targetType, targetId, value })
    });
  }

  async toggleBookmark(postId) {
    return this.request('/bookmarks/toggle', {
      method: 'POST',
      body: JSON.stringify({ postId })
    });
  }

  // ==========================================
  // COMMUNITIES & MENTORS
  // ==========================================

  async getCommunities() {
    return this.request('/communities');
  }

  async getCommunity(slug) {
    return this.request(`/communities/${slug}`);
  }

  async toggleCommunityMembership(communityId) {
    return this.request(`/communities/${communityId}/join`, {
      method: 'POST'
    });
  }

  async getMentors(filter = {}) {
    const query = new URLSearchParams(filter).toString();
    return this.request(`/mentors?${query}`);
  }

  async getTags() {
    return this.request('/tags');
  }

  // ==========================================
  // INTEGRATIONS
  // ==========================================

  async exportToIdeaCentre(postId, details = {}) {
    return this.request('/integrations/idea-centre/export', {
      method: 'POST',
      body: JSON.stringify({ postId, ...details })
    });
  }

  async searchProjects(q = '') {
    return this.request(`/integrations/projects?q=${encodeURIComponent(q)}`);
  }

  async searchEvents(q = '') {
    return this.request(`/integrations/events?q=${encodeURIComponent(q)}`);
  }

  // ==========================================
  // USER & MODERATION
  // ==========================================

  async getCurrentUser() {
    return this.request('/auth/me');
  }

  async createReport(payload) {
    return this.request('/reports', {
      method: 'POST',
      body: JSON.stringify(payload)
    });
  }

  async getReports() {
    return this.request('/moderation/reports');
  }

  async resolveReport(reportId, action, resolutionNotes) {
    return this.request(`/moderation/reports/${reportId}`, {
      method: 'PATCH',
      body: JSON.stringify({ action, resolutionNotes })
    });
  }
}

export const api = new ForumApiClient();
