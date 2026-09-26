/**
 * CVS Garage — Forum API Controller
 * Handles HTTP requests, validations, RBAC authorization, and API envelopes.
 */

import { forumService } from './forum.service.js';
import { memberService } from '../../integrations/member.service.js';
import { projectService } from '../../integrations/project.service.js';
import { eventService } from '../../integrations/event.service.js';

export class ForumController {
  // Helper for standardized response
  static sendSuccess(res, data, meta = null, statusCode = 200) {
    return res.status(statusCode).json({
      success: true,
      data,
      error: null,
      meta: {
        timestamp: new Date().toISOString(),
        ...meta
      }
    });
  }

  static sendError(res, message, code = 'BAD_REQUEST', statusCode = 400, details = null) {
    return res.status(statusCode).json({
      success: false,
      data: null,
      error: { code, message, details },
      meta: { timestamp: new Date().toISOString() }
    });
  }

  // ==========================================
  // FEED & POSTS
  // ==========================================

  async getPosts(req, res) {
    try {
      const user = await memberService.verifyAuth(req);
      const {
        sort,
        type,
        tag,
        category,
        community,
        status,
        search,
        bookmarkedOnly,
        followingOnly,
        projectId,
        eventId
      } = req.query;

      const posts = await forumService.getPosts(
        {
          sort,
          type,
          tag,
          category,
          community,
          status,
          search,
          bookmarkedOnly: bookmarkedOnly === 'true',
          followingOnly: followingOnly === 'true',
          projectId,
          eventId
        },
        user?.id
      );

      return ForumController.sendSuccess(res, posts, { total: posts.length });
    } catch (err) {
      return ForumController.sendError(res, err.message, 'GET_POSTS_FAILED', 500);
    }
  }

  async getPostById(req, res) {
    try {
      const user = await memberService.verifyAuth(req);
      const { id } = req.params;
      const post = await forumService.getPostById(id, user?.id);

      if (!post) {
        return ForumController.sendError(res, 'Discussion post not found', 'NOT_FOUND', 404);
      }

      return ForumController.sendSuccess(res, post);
    } catch (err) {
      return ForumController.sendError(res, err.message, 'GET_POST_FAILED', 500);
    }
  }

  async createPost(req, res) {
    try {
      const user = await memberService.verifyAuth(req);
      if (!user) {
        return ForumController.sendError(res, 'Authentication required', 'UNAUTHORIZED', 401);
      }

      const post = await forumService.createPost(req.body, user);
      return ForumController.sendSuccess(res, post, null, 201);
    } catch (err) {
      return ForumController.sendError(res, err.message, 'CREATE_POST_FAILED', 400);
    }
  }

  async updatePost(req, res) {
    try {
      const user = await memberService.verifyAuth(req);
      const { id } = req.params;
      const updated = await forumService.updatePost(id, req.body, user);
      return ForumController.sendSuccess(res, updated);
    } catch (err) {
      return ForumController.sendError(res, err.message, 'UPDATE_POST_FAILED', 400);
    }
  }

  async deletePost(req, res) {
    try {
      const user = await memberService.verifyAuth(req);
      const { id } = req.params;
      const result = await forumService.deletePost(id, user);
      return ForumController.sendSuccess(res, result);
    } catch (err) {
      return ForumController.sendError(res, err.message, 'DELETE_POST_FAILED', 400);
    }
  }

  // ==========================================
  // REPLIES & ACCEPTED ANSWERS
  // ==========================================

  async getReplies(req, res) {
    try {
      const user = await memberService.verifyAuth(req);
      const { id } = req.params;
      const replies = await forumService.getReplies(id, user?.id);
      return ForumController.sendSuccess(res, replies, { total: replies.length });
    } catch (err) {
      return ForumController.sendError(res, err.message, 'GET_REPLIES_FAILED', 500);
    }
  }

  async createReply(req, res) {
    try {
      const user = await memberService.verifyAuth(req);
      if (!user) {
        return ForumController.sendError(res, 'Authentication required', 'UNAUTHORIZED', 401);
      }

      const { id } = req.params;
      const reply = await forumService.createReply(id, req.body, user);
      return ForumController.sendSuccess(res, reply, null, 201);
    } catch (err) {
      return ForumController.sendError(res, err.message, 'CREATE_REPLY_FAILED', 400);
    }
  }

  async markAcceptedSolution(req, res) {
    try {
      const user = await memberService.verifyAuth(req);
      const { id } = req.params;
      const { replyId } = req.body;

      if (!replyId) {
        return ForumController.sendError(res, 'replyId is required', 'VALIDATION_ERROR', 400);
      }

      const result = await forumService.markAcceptedSolution(id, replyId, user);
      return ForumController.sendSuccess(res, result);
    } catch (err) {
      return ForumController.sendError(res, err.message, 'ACCEPT_SOLUTION_FAILED', 403);
    }
  }

  // ==========================================
  // VOTING & BOOKMARKS
  // ==========================================

  async castVote(req, res) {
    try {
      const user = await memberService.verifyAuth(req);
      if (!user) {
        return ForumController.sendError(res, 'Authentication required', 'UNAUTHORIZED', 401);
      }

      const result = await forumService.castVote(req.body, user);
      return ForumController.sendSuccess(res, result);
    } catch (err) {
      return ForumController.sendError(res, err.message, 'CAST_VOTE_FAILED', 400);
    }
  }

  async toggleBookmark(req, res) {
    try {
      const user = await memberService.verifyAuth(req);
      if (!user) {
        return ForumController.sendError(res, 'Authentication required', 'UNAUTHORIZED', 401);
      }

      const { postId } = req.body;
      const result = await forumService.toggleBookmark(postId, user);
      return ForumController.sendSuccess(res, result);
    } catch (err) {
      return ForumController.sendError(res, err.message, 'TOGGLE_BOOKMARK_FAILED', 400);
    }
  }

  // ==========================================
  // COMMUNITIES & MENTORS
  // ==========================================

  async getCommunities(req, res) {
    try {
      const communities = await forumService.getCommunities();
      return ForumController.sendSuccess(res, communities);
    } catch (err) {
      return ForumController.sendError(res, err.message, 'GET_COMMUNITIES_FAILED', 500);
    }
  }

  async getCommunityBySlug(req, res) {
    try {
      const user = await memberService.verifyAuth(req);
      const { slug } = req.params;
      const community = await forumService.getCommunityBySlug(slug, user?.id);

      if (!community) {
        return ForumController.sendError(res, 'Community not found', 'NOT_FOUND', 404);
      }

      return ForumController.sendSuccess(res, community);
    } catch (err) {
      return ForumController.sendError(res, err.message, 'GET_COMMUNITY_FAILED', 500);
    }
  }

  async toggleCommunityMembership(req, res) {
    try {
      const user = await memberService.verifyAuth(req);
      const { id } = req.params;
      const result = await forumService.toggleCommunityMembership(id, user);
      return ForumController.sendSuccess(res, result);
    } catch (err) {
      return ForumController.sendError(res, err.message, 'MEMBERSHIP_FAILED', 400);
    }
  }

  async getMentors(req, res) {
    try {
      const mentors = await memberService.getMentors(req.query);
      return ForumController.sendSuccess(res, mentors);
    } catch (err) {
      return ForumController.sendError(res, err.message, 'GET_MENTORS_FAILED', 500);
    }
  }

  async getTags(req, res) {
    try {
      return ForumController.sendSuccess(res, forumService.store.tags);
    } catch (err) {
      return ForumController.sendError(res, err.message, 'GET_TAGS_FAILED', 500);
    }
  }

  async toggleFollow(req, res) {
    try {
      const user = await memberService.verifyAuth(req);
      const { targetType, targetId } = req.body;
      const result = await forumService.toggleFollow(targetType, targetId, user);
      return ForumController.sendSuccess(res, result);
    } catch (err) {
      return ForumController.sendError(res, err.message, 'TOGGLE_FOLLOW_FAILED', 400);
    }
  }

  // ==========================================
  // CROSS-MODULE INTEGRATIONS
  // ==========================================

  async exportToIdeaCentre(req, res) {
    try {
      const user = await memberService.verifyAuth(req);
      const { postId, problemStatement, proposedSolution, expectedImpact, notes } = req.body;

      if (!postId) {
        return ForumController.sendError(res, 'postId is required', 'VALIDATION_ERROR', 400);
      }

      const result = await forumService.exportPostToIdea(postId, user, {
        problemStatement,
        proposedSolution,
        expectedImpact,
        notes
      });

      if (!result.success && result.alreadyExported) {
        return ForumController.sendError(
          res,
          result.message,
          'ALREADY_EXPORTED',
          409,
          { ideaId: result.ideaId, ideaUrl: result.ideaUrl }
        );
      }

      return ForumController.sendSuccess(res, result);
    } catch (err) {
      return ForumController.sendError(res, err.message, 'EXPORT_FAILED', 400);
    }
  }

  async searchProjects(req, res) {
    try {
      const { q } = req.query;
      const projects = await projectService.searchProjects(q || '');
      return ForumController.sendSuccess(res, projects);
    } catch (err) {
      return ForumController.sendError(res, err.message, 'SEARCH_PROJECTS_FAILED', 500);
    }
  }

  async searchEvents(req, res) {
    try {
      const { q } = req.query;
      const events = await eventService.searchEvents(q || '');
      return ForumController.sendSuccess(res, events);
    } catch (err) {
      return ForumController.sendError(res, err.message, 'SEARCH_EVENTS_FAILED', 500);
    }
  }

  // ==========================================
  // MODERATION
  // ==========================================

  async createReport(req, res) {
    try {
      const user = await memberService.verifyAuth(req);
      const result = await forumService.createReport(req.body, user);
      return ForumController.sendSuccess(res, result, null, 201);
    } catch (err) {
      return ForumController.sendError(res, err.message, 'CREATE_REPORT_FAILED', 400);
    }
  }

  async getReports(req, res) {
    try {
      const user = await memberService.verifyAuth(req);
      const reports = await forumService.getReports(user);
      return ForumController.sendSuccess(res, reports);
    } catch (err) {
      return ForumController.sendError(res, err.message, 'GET_REPORTS_FAILED', 403);
    }
  }

  async resolveReport(req, res) {
    try {
      const user = await memberService.verifyAuth(req);
      const { id } = req.params;
      const result = await forumService.resolveReport(id, req.body, user);
      return ForumController.sendSuccess(res, result);
    } catch (err) {
      return ForumController.sendError(res, err.message, 'RESOLVE_REPORT_FAILED', 400);
    }
  }

  // ==========================================
  // IDENTITY & CURRENT USER CONTEXT
  // ==========================================

  async getCurrentUser(req, res) {
    try {
      const user = await memberService.verifyAuth(req);
      const allMembers = await memberService.getAllMembers();
      return ForumController.sendSuccess(res, {
        currentUser: user,
        availableProfiles: allMembers
      });
    } catch (err) {
      return ForumController.sendError(res, err.message, 'AUTH_CHECK_FAILED', 500);
    }
  }
}

export const forumController = new ForumController();
