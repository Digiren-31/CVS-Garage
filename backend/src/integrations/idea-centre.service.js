import { ideaService } from '../modules/idea-centre/idea.service.js';

export class IdeaCentreService {
  constructor(service = ideaService) {
    this.service = service;
  }

  async getAllIdeas(currentUserId = null, filters = {}) {
    return this.service.listIdeas(filters, currentUserId);
  }

  async exportForumPostToIdea(payload) {
    return this.service.exportForumIdea(payload);
  }

  async getIdeaByForumPostId(postId) {
    return this.service.getForumIdea(postId);
  }
}

export const ideaCentreService = new IdeaCentreService();
