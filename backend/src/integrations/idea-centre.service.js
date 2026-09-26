/**
 * CVS Garage — Idea Centre Integration Adapter
 * Owns ideas, pitches, and innovation reviews.
 * Follows Rule 5: Idea Centre owns ideas.
 * Follows Rule 8: Forum can export useful discussions to Idea Centre.
 */

export class IdeaCentreService {
  constructor() {
    // In-memory registry representing Idea Centre storage
    this.exportedIdeas = new Map();

    // Pre-populate with seed exported idea
    this.exportedIdeas.set('post-2', {
      ideaId: 'IDEA-2026-88',
      ideaUrl: '/idea-centre/ideas/IDEA-2026-88',
      sourceForumPostId: 'post-2',
      status: 'in_review',
      title: 'Decentralized Campus Academic Credentials using Verifiable Credentials (W3C)',
      authorMemberId: 'mem-student-2',
      exportedAt: new Date(Date.now() - 36000000).toISOString()
    });
  }

  async exportForumPostToIdea(payload) {
    const { sourceForumPostId, title, problemStatement, proposedSolution, authorMemberId, tags } = payload;

    // Check if already exported to prevent duplicate creation
    if (this.exportedIdeas.has(sourceForumPostId)) {
      const existing = this.exportedIdeas.get(sourceForumPostId);
      return {
        success: false,
        alreadyExported: true,
        ideaId: existing.ideaId,
        ideaUrl: existing.ideaUrl,
        sourceForumPostId,
        status: existing.status,
        message: 'This discussion has already been exported to the Idea Centre.'
      };
    }

    // Generate unique Idea Centre identifier
    const ideaId = `IDEA-2026-${Math.floor(1000 + Math.random() * 9000)}`;
    const ideaUrl = `/idea-centre/ideas/${ideaId}`;

    const newIdeaRecord = {
      ideaId,
      ideaUrl,
      sourceForumPostId,
      status: 'created',
      title,
      problemStatement,
      proposedSolution,
      authorMemberId,
      tags: tags || [],
      exportedAt: new Date().toISOString()
    };

    this.exportedIdeas.set(sourceForumPostId, newIdeaRecord);

    return {
      success: true,
      alreadyExported: false,
      ideaId,
      ideaUrl,
      sourceForumPostId,
      status: 'created',
      message: 'Successfully exported discussion to Idea Centre.'
    };
  }

  async getIdeaByForumPostId(postId) {
    return this.exportedIdeas.get(postId) || null;
  }
}

export const ideaCentreService = new IdeaCentreService();
