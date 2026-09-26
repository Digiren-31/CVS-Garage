/**
 * CVS Garage — Forum Core Business Service
 * Encapsulates all domain workflows, business rules, voting calculations,
 * accepted answer workflows, and integration side-effects.
 */

import { forumStore } from './forum.store.js';
import { memberService } from '../../integrations/member.service.js';
import { projectService } from '../../integrations/project.service.js';
import { eventService } from '../../integrations/event.service.js';
import { ideaCentreService } from '../../integrations/idea-centre.service.js';
import { leaderboardService } from '../../integrations/leaderboard.service.js';

export class ForumService {
  constructor(store = forumStore) {
    this.store = store;
  }

  // ==========================================
  // POSTS & FEED
  // ==========================================

  async getPosts(filters = {}, currentUserId = null) {
    let posts = [...this.store.posts];

    // Filter by type
    if (filters.type && filters.type !== 'all') {
      posts = posts.filter((p) => p.postType === filters.type);
    }

    // Filter by category
    if (filters.category) {
      posts = posts.filter((p) => p.categoryId === filters.category);
    }

    // Filter by community
    if (filters.community) {
      posts = posts.filter(
        (p) => p.communityId === filters.community || p.communitySlug === filters.community
      );
    }

    // Filter by tag
    if (filters.tag) {
      const tagSlug = filters.tag.toLowerCase();
      posts = posts.filter((p) =>
        p.tagSlugs?.some((t) => t.toLowerCase() === tagSlug)
      );
    }

    // Filter by status (solved vs open)
    if (filters.status) {
      posts = posts.filter((p) => p.status === filters.status);
    }

    // Filter by linked project
    if (filters.projectId) {
      posts = posts.filter((p) => p.linkedProjectId === filters.projectId);
    }

    // Filter by linked event
    if (filters.eventId) {
      posts = posts.filter((p) => p.linkedEventId === filters.eventId);
    }

    // Bookmarked only
    if (filters.bookmarkedOnly && currentUserId) {
      const bookmarkedPostIds = new Set(
        this.store.bookmarks
          .filter((b) => b.userId === currentUserId)
          .map((b) => b.postId)
      );
      posts = posts.filter((p) => bookmarkedPostIds.has(p.id));
    }

    // Following only
    if (filters.followingOnly && currentUserId) {
      const followedUsers = new Set(
        this.store.follows
          .filter((f) => f.followerId === currentUserId && f.targetType === 'user')
          .map((f) => f.targetId)
      );
      const followedCommunities = new Set(
        this.store.follows
          .filter((f) => f.followerId === currentUserId && f.targetType === 'community')
          .map((f) => f.targetId)
      );
      posts = posts.filter(
        (p) => followedUsers.has(p.authorId) || followedCommunities.has(p.communityId)
      );
    }

    // Search query
    if (filters.search) {
      const q = filters.search.toLowerCase();
      posts = posts.filter(
        (p) =>
          p.title.toLowerCase().includes(q) ||
          p.content.toLowerCase().includes(q) ||
          p.tagSlugs?.some((t) => t.toLowerCase().includes(q))
      );
    }

    // Sort order
    if (filters.sort === 'trending' || filters.sort === 'top') {
      posts.sort((a, b) => b.voteScore - a.voteScore);
    } else if (filters.sort === 'unanswered') {
      posts = posts.filter((p) => p.replyCount === 0);
      posts.sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt));
    } else if (filters.sort === 'solved') {
      posts = posts.filter((p) => p.status === 'solved');
      posts.sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt));
    } else {
      // Default: newest first
      posts.sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt));
    }

    // Enrich with author, category, community, user vote, bookmarks, external links
    const enriched = await Promise.all(
      posts.map((post) => this._enrichPostSummary(post, currentUserId))
    );

    return enriched;
  }

  async getPostById(postId, currentUserId = null) {
    const post = this.store.posts.find((p) => p.id === postId);
    if (!post) return null;

    // Increment view count
    post.viewCount = (post.viewCount || 0) + 1;

    return this._enrichPostDetail(post, currentUserId);
  }

  async createPost(payload, authorUser) {
    const {
      postType = 'question',
      title,
      content,
      categoryId,
      communityId,
      tagNames = [],
      linkedProjectId,
      linkedEventId,
      structuredIdea
    } = payload;

    if (!title || !content) {
      throw new Error('Title and content are required.');
    }

    // Check announcement permission: Only Mentors or Admors can create announcements
    if (postType === 'announcement' && !['Mentor', 'Admin', 'Community Moderator'].includes(authorUser.role)) {
      throw new Error('Only mentors, moderators, and admins may post platform announcements.');
    }

    // Process and register new tags if necessary
    const tagSlugs = [];
    for (const tagName of tagNames) {
      const slug = tagName.toLowerCase().replace(/[^a-z0-9]/g, '-').replace(/-+/g, '-');
      let existingTag = this.store.tags.find((t) => t.slug === slug);
      if (!existingTag) {
        existingTag = {
          id: `tag-${slug}`,
          name: tagName,
          slug,
          postCount: 1,
          createdAt: new Date().toISOString()
        };
        this.store.tags.push(existingTag);
      } else {
        existingTag.postCount = (existingTag.postCount || 0) + 1;
      }
      tagSlugs.push(slug);
    }

    // Format content if structured idea was provided
    let finalContent = content;
    if (postType === 'idea' && structuredIdea) {
      finalContent = `### Problem Statement\n${structuredIdea.problemStatement}\n\n### Proposed Solution\n${structuredIdea.proposedSolution}\n\n### Expected Impact\n${structuredIdea.expectedImpact || 'N/A'}\n\n### Tech Stack\n${(structuredIdea.techStack || []).join(', ') || 'N/A'}`;
    }

    const postId = `post-${Date.now()}`;
    const newPost = {
      id: postId,
      postType,
      title,
      content: finalContent,
      authorId: authorUser.id,
      categoryId: categoryId || 'cat-1',
      communityId: communityId || null,
      status: 'open',
      voteScore: 1,
      upvotesCount: 1,
      downvotesCount: 0,
      replyCount: 0,
      viewCount: 1,
      acceptedReplyId: null,
      linkedProjectId: linkedProjectId || null,
      linkedEventId: linkedEventId || null,
      tagSlugs,
      isPinned: false,
      isLocked: false,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString()
    };

    this.store.posts.unshift(newPost);

    // Auto-upvote by author
    this.store.votes.push({
      id: `vote-${Date.now()}`,
      userId: authorUser.id,
      targetType: 'post',
      targetId: postId,
      value: 1
    });

    // Update community post count if applicable
    if (communityId) {
      const comm = this.store.communities.find((c) => c.id === communityId);
      if (comm) comm.postCount = (comm.postCount || 0) + 1;
    }

    // Dispatch Leaderboard Contribution Event
    const eventId = `contrib-post-${postId}`;
    await leaderboardService.recordContribution({
      eventId,
      memberId: authorUser.id,
      contributionType: 'post',
      forumPostId: postId,
      value: 1,
      timestamp: new Date().toISOString()
    });

    this.store.contributionEvents.push({
      id: `evt-${Date.now()}`,
      eventId,
      memberId: authorUser.id,
      contributionType: 'post',
      forumPostId: postId,
      forumReplyId: null,
      value: 1,
      syncStatus: 'synced',
      createdAt: new Date().toISOString()
    });

    return this.getPostById(postId, authorUser.id);
  }

  async updatePost(postId, payload, user) {
    const post = this.store.posts.find((p) => p.id === postId);
    if (!post) throw new Error('Post not found');

    const canEdit = post.authorId === user.id || ['Admin', 'Community Moderator'].includes(user.role);
    if (!canEdit) throw new Error('Unauthorized to edit this post');

    if (payload.title) post.title = payload.title;
    if (payload.content) post.content = payload.content;
    if (payload.status) post.status = payload.status;
    post.updatedAt = new Date().toISOString();

    return this.getPostById(postId, user.id);
  }

  async deletePost(postId, user) {
    const postIndex = this.store.posts.findIndex((p) => p.id === postId);
    if (postIndex === -1) throw new Error('Post not found');

    const post = this.store.posts[postIndex];
    const canDelete = post.authorId === user.id || ['Admin', 'Community Moderator'].includes(user.role);
    if (!canDelete) throw new Error('Unauthorized to delete this post');

    this.store.posts.splice(postIndex, 1);
    return { success: true, deletedPostId: postId };
  }

  // ==========================================
  // REPLIES & ACCEPTED SOLUTIONS
  // ==========================================

  async getReplies(postId, currentUserId = null) {
    const replies = this.store.replies.filter((r) => r.postId === postId);

    const enrichedReplies = await Promise.all(
      replies.map(async (reply) => {
        const author = await memberService.getMemberById(reply.authorId);
        const userVoteRecord = currentUserId
          ? this.store.votes.find(
              (v) => v.userId === currentUserId && v.targetType === 'reply' && v.targetId === reply.id
            )
          : null;

        return {
          ...reply,
          author,
          userVote: userVoteRecord ? userVoteRecord.value : 0
        };
      })
    );

    // Build hierarchical tree up to depth 3
    const replyMap = new Map();
    const rootReplies = [];

    enrichedReplies.forEach((r) => {
      replyMap.set(r.id, { ...r, children: [] });
    });

    enrichedReplies.forEach((r) => {
      const node = replyMap.get(r.id);
      if (r.parentReplyId && replyMap.has(r.parentReplyId)) {
        replyMap.get(r.parentReplyId).children.push(node);
      } else {
        rootReplies.push(node);
      }
    });

    // Sort: accepted answer always on top, followed by vote score, then date
    rootReplies.sort((a, b) => {
      if (a.isAcceptedSolution) return -1;
      if (b.isAcceptedSolution) return 1;
      return b.voteScore - a.voteScore;
    });

    return rootReplies;
  }

  async createReply(postId, payload, authorUser) {
    const post = this.store.posts.find((p) => p.id === postId);
    if (!post) throw new Error('Post not found');

    if (!payload.content || payload.content.trim().length === 0) {
      throw new Error('Reply content cannot be empty.');
    }

    const replyId = `reply-${Date.now()}`;
    const newReply = {
      id: replyId,
      postId,
      parentReplyId: payload.parentReplyId || null,
      authorId: authorUser.id,
      content: payload.content,
      voteScore: 0,
      upvotesCount: 0,
      downvotesCount: 0,
      isAcceptedSolution: false,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString()
    };

    this.store.replies.push(newReply);
    post.replyCount = (post.replyCount || 0) + 1;
    post.updatedAt = new Date().toISOString();

    // Dispatch Leaderboard Contribution Event
    const eventId = `contrib-reply-${replyId}`;
    await leaderboardService.recordContribution({
      eventId,
      memberId: authorUser.id,
      contributionType: 'reply',
      forumPostId: postId,
      forumReplyId: replyId,
      value: 1,
      timestamp: new Date().toISOString()
    });

    // Create notification for post author if different
    if (post.authorId !== authorUser.id) {
      this.store.notifications.push({
        id: `notif-${Date.now()}`,
        recipientId: post.authorId,
        actorId: authorUser.id,
        type: 'reply_received',
        entityType: 'post',
        entityId: postId,
        message: `${authorUser.name} replied to your post: "${post.title.substring(0, 40)}..."`,
        isRead: false,
        createdAt: new Date().toISOString()
      });
    }

    const author = await memberService.getMemberById(authorUser.id);
    return {
      ...newReply,
      author,
      userVote: 0,
      children: []
    };
  }

  async markAcceptedSolution(postId, replyId, user) {
    const post = this.store.posts.find((p) => p.id === postId);
    if (!post) throw new Error('Post not found');

    const reply = this.store.replies.find((r) => r.id === replyId && r.postId === postId);
    if (!reply) throw new Error('Reply not found on this post');

    // Rule: Only post author, or moderator/admin can mark accepted solution
    const canAccept = post.authorId === user.id || ['Admin', 'Community Moderator'].includes(user.role);
    if (!canAccept) {
      throw new Error('Only the post author or a moderator can mark an answer as the accepted solution.');
    }

    // Reset any previously accepted answer on this post
    this.store.replies.forEach((r) => {
      if (r.postId === postId) {
        r.isAcceptedSolution = false;
      }
    });

    // Mark new solution
    reply.isAcceptedSolution = true;
    post.acceptedReplyId = reply.id;
    post.status = 'solved';
    post.updatedAt = new Date().toISOString();

    // Trigger Leaderboard contribution for the accepted answer author
    const eventId = `contrib-accepted-${reply.id}`;
    await leaderboardService.recordContribution({
      eventId,
      memberId: reply.authorId,
      contributionType: 'accepted_answer',
      forumPostId: postId,
      forumReplyId: reply.id,
      value: 1,
      timestamp: new Date().toISOString()
    });

    // Send notification to the helpful answer author
    if (reply.authorId !== user.id) {
      this.store.notifications.push({
        id: `notif-${Date.now()}`,
        recipientId: reply.authorId,
        actorId: user.id,
        type: 'answer_accepted',
        entityType: 'post',
        entityId: postId,
        message: `Your answer on "${post.title.substring(0, 40)}..." was marked as the Accepted Solution!`,
        isRead: false,
        createdAt: new Date().toISOString()
      });
    }

    return {
      success: true,
      postId,
      acceptedReplyId: reply.id,
      postStatus: post.status
    };
  }

  // ==========================================
  // NORMALIZED VOTING SYSTEM
  // ==========================================

  async castVote({ targetType, targetId, value }, user) {
    if (!['post', 'reply'].includes(targetType)) {
      throw new Error('Invalid vote target type');
    }
    if (![-1, 0, 1].includes(value)) {
      throw new Error('Vote value must be -1, 0, or 1');
    }

    const target =
      targetType === 'post'
        ? this.store.posts.find((p) => p.id === targetId)
        : this.store.replies.find((r) => r.id === targetId);

    if (!target) throw new Error(`${targetType} not found`);

    // Look for existing vote record by this user
    const existingIndex = this.store.votes.findIndex(
      (v) => v.userId === user.id && v.targetType === targetType && v.targetId === targetId
    );

    let previousValue = 0;
    if (existingIndex !== -1) {
      previousValue = this.store.votes[existingIndex].value;
      if (value === 0 || value === previousValue) {
        // Toggle off vote
        this.store.votes.splice(existingIndex, 1);
        value = 0;
      } else {
        // Update vote direction
        this.store.votes[existingIndex].value = value;
      }
    } else if (value !== 0) {
      // Insert new vote
      this.store.votes.push({
        id: `vote-${Date.now()}`,
        userId: user.id,
        targetType,
        targetId,
        value
      });
    }

    // Calculate score delta
    const delta = value - previousValue;
    target.voteScore = (target.voteScore || 0) + delta;

    if (value === 1 && previousValue !== 1) {
      target.upvotesCount = (target.upvotesCount || 0) + 1;
      if (previousValue === -1) target.downvotesCount = Math.max(0, (target.downvotesCount || 0) - 1);

      // Leaderboard upvote received reward
      const eventId = `contrib-upvote-${targetType}-${targetId}-${user.id}`;
      await leaderboardService.recordContribution({
        eventId,
        memberId: target.authorId,
        contributionType: 'upvote_received',
        forumPostId: targetType === 'post' ? target.id : target.postId,
        forumReplyId: targetType === 'reply' ? target.id : null,
        value: 1,
        timestamp: new Date().toISOString()
      });
    } else if (value === -1 && previousValue !== -1) {
      target.downvotesCount = (target.downvotesCount || 0) + 1;
      if (previousValue === 1) target.upvotesCount = Math.max(0, (target.upvotesCount || 0) - 1);
    } else if (value === 0) {
      if (previousValue === 1) target.upvotesCount = Math.max(0, (target.upvotesCount || 0) - 1);
      if (previousValue === -1) target.downvotesCount = Math.max(0, (target.downvotesCount || 0) - 1);
    }

    return {
      success: true,
      targetType,
      targetId,
      newScore: target.voteScore,
      userVote: value
    };
  }

  // ==========================================
  // BOOKMARKS
  // ==========================================

  async toggleBookmark(postId, user) {
    const existingIndex = this.store.bookmarks.findIndex(
      (b) => b.userId === user.id && b.postId === postId
    );

    let isBookmarked = false;
    if (existingIndex !== -1) {
      this.store.bookmarks.splice(existingIndex, 1);
      isBookmarked = false;
    } else {
      this.store.bookmarks.push({
        id: `bm-${Date.now()}`,
        userId: user.id,
        postId,
        createdAt: new Date().toISOString()
      });
      isBookmarked = true;
    }

    return { success: true, postId, isBookmarked };
  }

  // ==========================================
  // COMMUNITIES & MEMBERSHIP
  // ==========================================

  async getCommunities() {
    return this.store.communities.map((c) => ({
      ...c
    }));
  }

  async getCommunityBySlug(slug, currentUserId = null) {
    const comm = this.store.communities.find((c) => c.slug === slug || c.id === slug);
    if (!comm) return null;

    let isMember = false;
    let userRole = null;
    if (currentUserId) {
      const membership = this.store.communityMembers.find(
        (cm) => cm.communityId === comm.id && cm.userId === currentUserId
      );
      if (membership) {
        isMember = true;
        userRole = membership.role;
      }
    }

    // Get moderators
    const modMembers = this.store.communityMembers.filter(
      (cm) => cm.communityId === comm.id && ['moderator', 'admin'].includes(cm.role)
    );
    const moderators = await Promise.all(
      modMembers.map((m) => memberService.getMemberById(m.userId))
    );

    // Get linked project / event if any
    let linkedProject = null;
    if (comm.linkedProjectId) {
      linkedProject = await projectService.getProjectById(comm.linkedProjectId);
    }

    let linkedEvent = null;
    if (comm.linkedEventId) {
      linkedEvent = await eventService.getEventById(comm.linkedEventId);
    }

    return {
      ...comm,
      isMember,
      userRole,
      moderators: moderators.filter(Boolean),
      linkedProject,
      linkedEvent
    };
  }

  async toggleCommunityMembership(communityId, user) {
    const comm = this.store.communities.find((c) => c.id === communityId);
    if (!comm) throw new Error('Community not found');

    const index = this.store.communityMembers.findIndex(
      (cm) => cm.communityId === communityId && cm.userId === user.id
    );

    let isMember = false;
    if (index !== -1) {
      this.store.communityMembers.splice(index, 1);
      comm.memberCount = Math.max(0, (comm.memberCount || 0) - 1);
      isMember = false;
    } else {
      this.store.communityMembers.push({
        id: `cm-${Date.now()}`,
        communityId,
        userId: user.id,
        role: 'member',
        joinedAt: new Date().toISOString()
      });
      comm.memberCount = (comm.memberCount || 0) + 1;
      isMember = true;
    }

    return { success: true, communityId, isMember, memberCount: comm.memberCount };
  }

  // ==========================================
  // IDEA CENTRE EXPORT (CRITICAL INTEGRATION)
  // ==========================================

  async exportPostToIdea(postId, user, customDetails = {}) {
    const post = this.store.posts.find((p) => p.id === postId);
    if (!post) throw new Error('Discussion post not found');

    // Rule: Author or Moderator can export to Idea Centre
    const canExport = post.authorId === user.id || ['Admin', 'Community Moderator', 'Mentor'].includes(user.role);
    if (!canExport) {
      throw new Error('Only the discussion author, mentor, or moderator can export this to Idea Centre.');
    }

    // Check if already exported in local tracking table to prevent duplicate exports
    const existingExport = this.store.ideaExports.find((e) => e.postId === postId);
    if (existingExport) {
      return {
        success: false,
        alreadyExported: true,
        ideaId: existingExport.ideaId,
        ideaUrl: existingExport.ideaUrl,
        status: existingExport.status,
        message: 'This post is already exported to the Idea Centre.'
      };
    }

    // Prepare payload for external Idea Centre Service
    const payload = {
      sourceForumPostId: post.id,
      title: post.title,
      problemStatement: customDetails.problemStatement || post.content.substring(0, 500),
      proposedSolution: customDetails.proposedSolution || post.content,
      expectedImpact: customDetails.expectedImpact || 'Derived from Forum Community Brainstorming',
      authorMemberId: post.authorId,
      department: user.department || 'General',
      tags: post.tagSlugs || [],
      createdAt: new Date().toISOString()
    };

    // Call Idea Centre adapter
    const result = await ideaCentreService.exportForumPostToIdea(payload);

    if (result.success) {
      // Record export in local tracking table
      const exportRecord = {
        id: `exp-${Date.now()}`,
        postId: post.id,
        ideaId: result.ideaId,
        exportedBy: user.id,
        status: result.status,
        ideaUrl: result.ideaUrl,
        metadata: { notes: customDetails.notes || '' },
        exportedAt: new Date().toISOString(),
        updatedAt: new Date().toISOString()
      };
      this.store.ideaExports.push(exportRecord);

      // Create notification
      this.store.notifications.push({
        id: `notif-${Date.now()}`,
        recipientId: post.authorId,
        actorId: user.id,
        type: 'idea_exported',
        entityType: 'post',
        entityId: postId,
        message: `Your discussion was successfully exported to Idea Centre as Idea #${result.ideaId}!`,
        isRead: false,
        createdAt: new Date().toISOString()
      });
    }

    return result;
  }

  // ==========================================
  // REPORTS & MODERATION
  // ==========================================

  async createReport(payload, reporterUser) {
    const { targetType, targetId, reason, notes } = payload;
    if (!['post', 'reply', 'user'].includes(targetType)) {
      throw new Error('Invalid report target type');
    }

    const report = {
      id: `rep-${Date.now()}`,
      reporterId: reporterUser.id,
      targetType,
      targetId,
      reason,
      notes: notes || '',
      status: 'pending',
      reviewedBy: null,
      resolutionNotes: null,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString()
    };

    this.store.reports.push(report);
    return { success: true, reportId: report.id };
  }

  async getReports(user) {
    if (!['Admin', 'Community Moderator'].includes(user.role)) {
      throw new Error('Access denied to moderation queue');
    }

    const enriched = await Promise.all(
      this.store.reports.map(async (r) => {
        const reporter = await memberService.getMemberById(r.reporterId);
        let targetContent = null;
        if (r.targetType === 'post') {
          targetContent = this.store.posts.find((p) => p.id === r.targetId);
        } else if (r.targetType === 'reply') {
          targetContent = this.store.replies.find((rep) => rep.id === r.targetId);
        }
        return {
          ...r,
          reporter,
          targetContent
        };
      })
    );

    return enriched;
  }

  async resolveReport(reportId, { action, resolutionNotes }, moderatorUser) {
    if (!['Admin', 'Community Moderator'].includes(moderatorUser.role)) {
      throw new Error('Access denied to resolve reports');
    }

    const report = this.store.reports.find((r) => r.id === reportId);
    if (!report) throw new Error('Report not found');

    report.status = action === 'dismiss' ? 'dismissed' : 'resolved';
    report.reviewedBy = moderatorUser.id;
    report.resolutionNotes = resolutionNotes || '';
    report.updatedAt = new Date().toISOString();

    // Log moderation action
    this.store.moderationLogs.push({
      id: `modlog-${Date.now()}`,
      moderatorId: moderatorUser.id,
      action: action || 'resolve',
      targetType: report.targetType,
      targetId: report.targetId,
      reason: resolutionNotes || 'Moderator action taken',
      createdAt: new Date().toISOString()
    });

    return { success: true, report };
  }

  // ==========================================
  // FOLLOWS
  // ==========================================

  async toggleFollow(targetType, targetId, user) {
    const existingIndex = this.store.follows.findIndex(
      (f) => f.followerId === user.id && f.targetType === targetType && f.targetId === targetId
    );

    let isFollowing = false;
    if (existingIndex !== -1) {
      this.store.follows.splice(existingIndex, 1);
      isFollowing = false;
    } else {
      this.store.follows.push({
        id: `fol-${Date.now()}`,
        followerId: user.id,
        targetType,
        targetId,
        createdAt: new Date().toISOString()
      });
      isFollowing = true;
    }

    return { success: true, targetType, targetId, isFollowing };
  }

  // ==========================================
  // HELPER ENRICHMENT METHODS
  // ==========================================

  async _enrichPostSummary(post, currentUserId) {
    const author = await memberService.getMemberById(post.authorId);
    const category = this.store.categories.find((c) => c.id === post.categoryId);
    const community = post.communityId
      ? this.store.communities.find((c) => c.id === post.communityId)
      : null;

    let userVote = 0;
    let isBookmarked = false;
    if (currentUserId) {
      const v = this.store.votes.find(
        (vote) => vote.userId === currentUserId && vote.targetType === 'post' && vote.targetId === post.id
      );
      if (v) userVote = v.value;

      isBookmarked = this.store.bookmarks.some(
        (b) => b.userId === currentUserId && b.postId === post.id
      );
    }

    const tags = (post.tagSlugs || []).map((slug) => {
      const t = this.store.tags.find((tag) => tag.slug === slug);
      return t || { id: `tag-${slug}`, name: slug, slug, postCount: 1 };
    });

    const ideaExport = this.store.ideaExports.find((e) => e.postId === post.id) || null;

    let linkedProject = null;
    if (post.linkedProjectId) {
      linkedProject = await projectService.getProjectById(post.linkedProjectId);
    }

    let linkedEvent = null;
    if (post.linkedEventId) {
      linkedEvent = await eventService.getEventById(post.linkedEventId);
    }

    return {
      ...post,
      author,
      category,
      community,
      tags,
      userVote,
      isBookmarked,
      ideaExport,
      linkedProject,
      linkedEvent
    };
  }

  async _enrichPostDetail(post, currentUserId) {
    const summary = await this._enrichPostSummary(post, currentUserId);

    // Get accepted reply if present
    let acceptedReply = null;
    if (post.acceptedReplyId) {
      const reply = this.store.replies.find((r) => r.id === post.acceptedReplyId);
      if (reply) {
        const replyAuthor = await memberService.getMemberById(reply.authorId);
        acceptedReply = { ...reply, author: replyAuthor };
      }
    }

    return {
      ...summary,
      acceptedReply
    };
  }
}

export const forumService = new ForumService();
