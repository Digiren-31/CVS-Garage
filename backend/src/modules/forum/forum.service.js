/**
 * CVS Garage — Forum Core Business Service
 * Encapsulates all domain workflows, business rules, voting calculations,
 * accepted answer workflows, and integration side-effects.
 */

import { randomUUID } from 'node:crypto';
import { forumStore } from './forum.store.js';
import { memberService } from '../../integrations/member.service.js';
import { projectService } from '../../integrations/project.service.js';
import { eventService } from '../../integrations/event.service.js';
import { ideaCentreService } from '../../integrations/idea-centre.service.js';
import { leaderboardService } from '../../integrations/leaderboard.service.js';
import { mediaService } from '../media/media.service.js';

export class ForumService {
  constructor(store = forumStore) {
    this.store = store;
  }

  queueContribution(event, operation = 'record') {
    const existing = this.store.contributionEvents.find(
      (candidate) => candidate.eventId === event.eventId
    );
    const pending = {
      ...event,
      operation,
      syncStatus: 'pending',
      updatedAt: new Date().toISOString()
    };

    if (existing) {
      Object.assign(existing, pending);
      delete existing.revokedAt;
      return existing;
    }

    const queued = {
      id: `evt-${randomUUID()}`,
      ...pending,
      createdAt: event.createdAt || new Date().toISOString()
    };
    this.store.contributionEvents.push(queued);
    return queued;
  }

  async syncContributionOutbox() {
    let changed = false;
    const pending = this.store.contributionEvents.filter(
      (event) => event.syncStatus === 'pending'
    );

    for (const event of pending) {
      try {
        if (event.operation === 'revoke') {
          await leaderboardService.revokeContribution(event.eventId);
          event.syncStatus = 'revoked';
          event.revokedAt = new Date().toISOString();
        } else {
          await leaderboardService.recordContribution({
            eventId: event.eventId,
            memberId: event.memberId,
            contributionType: event.contributionType,
            forumPostId: event.forumPostId || null,
            forumReplyId: event.forumReplyId || null,
            value: event.value,
            contextEventId: event.contextEventId || null,
            timestamp: event.occurredAt || event.createdAt
          });
          event.syncStatus = 'synced';
          delete event.revokedAt;
        }
        event.updatedAt = new Date().toISOString();
        changed = true;
      } catch (error) {
        console.error(
          `Forum contribution ${event.eventId} remains pending after leaderboard sync failed:`,
          error
        );
      }
    }

    return changed;
  }

  async persistAndSync(context = {}) {
    await this.store.persist?.(context);
    if (!(await this.syncContributionOutbox())) {
      return;
    }

    try {
      await this.store.persist?.({ actorId: context.actorId || null });
    } catch (error) {
      console.error(
        'Leaderboard sync completed, but Forum outbox status persistence failed:',
        error
      );
    }
  }

  async reconcileContributions() {
    if (!(await this.syncContributionOutbox())) {
      return;
    }
    await this.store.persist?.();
  }

  moderatedCommunityIds(user) {
    if (!user) {
      return [];
    }
    return this.store.communityMembers
      .filter(
        (membership) =>
          membership.userId === user.id &&
          ['moderator', 'admin'].includes(membership.role)
      )
      .map((membership) => membership.communityId);
  }

  canModerateCommunity(user, communityId) {
    if (!user) {
      return false;
    }
    if (user.role === 'Admin') {
      return true;
    }
    return Boolean(
      communityId && this.moderatedCommunityIds(user).includes(communityId)
    );
  }

  canManagePost(user, post) {
    return Boolean(
      user &&
        post &&
        (post.authorId === user.id ||
          this.canModerateCommunity(user, post.communityId))
    );
  }

  reportTargetPost(report) {
    if (report.targetType === 'post') {
      return this.store.posts.find((post) => post.id === report.targetId) || null;
    }
    if (report.targetType === 'reply') {
      const reply = this.store.replies.find(
        (candidate) => candidate.id === report.targetId
      );
      return reply
        ? this.store.posts.find((post) => post.id === reply.postId) || null
        : null;
    }
    return null;
  }

  canModerateReport(user, report) {
    if (user?.role === 'Admin') {
      return true;
    }
    const post = this.reportTargetPost(report);
    return Boolean(post && this.canModerateCommunity(user, post.communityId));
  }

  acceptedContributionEventId(replyId) {
    return (
      this.store.contributionEvents.find(
        (event) =>
          event.contributionType === 'accepted_answer' &&
          event.forumReplyId === replyId
      )?.eventId || `contrib-accepted-${replyId}`
    );
  }

  async getViewerPermissions(user, post = null) {
    const moderatedCommunityIds = this.moderatedCommunityIds(user);
    return {
      canAccessModeration:
        user?.role === 'Admin' || moderatedCommunityIds.length > 0,
      moderatedCommunityIds,
      ...(post
        ? {
            canEdit: this.canManagePost(user, post),
            canDelete: this.canManagePost(user, post),
            canAcceptSolution: this.canManagePost(user, post),
            canExport:
              Boolean(user) &&
              (post.authorId === user.id ||
                user.role === 'Mentor' ||
                this.canModerateCommunity(user, post.communityId))
          }
        : {})
    };
  }

  // ==========================================
  // POSTS & FEED
  // ==========================================

  async getPosts(filters = {}, currentUserId = null) {
    let posts = this.store.posts.filter((post) => !post.deletedAt);

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
      const community = this.store.communities.find(
        (item) => item.id === filters.community || item.slug === filters.community
      );
      posts = posts.filter((post) => post.communityId === (community?.id || filters.community));
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
    const post = this.store.posts.find((p) => p.id === postId && !p.deletedAt);
    if (!post) return null;

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
      attachmentIds = [],
      structuredIdea
    } = payload;

    if (typeof title !== 'string' || typeof content !== 'string' || !title.trim() || !content.trim()) {
      throw new Error('Title and content are required.');
    }
    if (title.trim().length < 8 || title.trim().length > 180) {
      throw new Error('Title must be between 8 and 180 characters.');
    }
    if (content.trim().length < 10 || content.trim().length > 20000) {
      throw new Error('Content must be between 10 and 20000 characters.');
    }
    if (!['question', 'problem', 'doubt', 'discussion', 'idea', 'announcement', 'project_discussion', 'event_discussion'].includes(postType)) {
      throw new Error('Unsupported discussion type.');
    }
    if (!Array.isArray(tagNames) || tagNames.length > 8) {
      throw new Error('Provide no more than 8 tags.');
    }
    await mediaService.validateOwnedAttachments(attachmentIds, authorUser);

    const category = this.store.categories.find((item) => item.id === (categoryId || 'cat-1'));
    if (!category) {
      throw new Error('Category not found.');
    }
    if (category.isRestricted && !['Mentor', 'Admin', 'Community Moderator'].includes(authorUser.role)) {
      throw new Error('This category is restricted to mentors and moderators.');
    }
    if (communityId && !this.store.communities.some((community) => community.id === communityId)) {
      throw new Error('Community not found.');
    }
    if (linkedProjectId && !(await projectService.getProjectById(linkedProjectId))) {
      throw new Error('Linked project not found.');
    }
    if (linkedEventId && !(await eventService.getEventById(linkedEventId))) {
      throw new Error('Linked event not found.');
    }

    // Announcements are a trusted publishing surface.
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

    const postId = `post-${randomUUID()}`;
    const newPost = {
      id: postId,
      postType,
      title: title.trim(),
      content: finalContent.trim(),
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
      attachmentIds: [...attachmentIds],
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString()
    };

    this.store.posts.unshift(newPost);

    // Auto-upvote by author
    this.store.votes.push({
      id: `vote-${randomUUID()}`,
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

    const eventId = `contrib-post-${postId}`;
    this.queueContribution({
      eventId,
      memberId: authorUser.id,
      contributionType: 'post',
      forumPostId: postId,
      forumReplyId: null,
      value: 1,
      contextEventId: linkedEventId || null,
      occurredAt: new Date().toISOString()
    });

    await this.persistAndSync({ actorId: authorUser.id });
    return this._enrichPostDetail(newPost, authorUser.id);
  }

  async updatePost(postId, payload, user) {
    const post = this.store.posts.find((p) => p.id === postId && !p.deletedAt);
    if (!post) throw new Error('Post not found');

    const canEdit = this.canManagePost(user, post);
    if (!canEdit) throw new Error('Unauthorized to edit this post');

    if (payload.title) post.title = payload.title;
    if (payload.content) post.content = payload.content;
    if (payload.status) post.status = payload.status;
    post.updatedAt = new Date().toISOString();

    await this.store.persist?.({ actorId: user.id });
    return this.getPostById(postId, user.id);
  }

  async deletePost(postId, user) {
    const post = this.store.posts.find((candidate) => candidate.id === postId && !candidate.deletedAt);
    if (!post) throw new Error('Post not found');

    const canDelete = this.canManagePost(user, post);
    if (!canDelete) throw new Error('Unauthorized to delete this post');

    post.deletedAt = new Date().toISOString();
    post.status = 'archived';
    post.updatedAt = post.deletedAt;
    if (post.communityId) {
      const community = this.store.communities.find(
        (candidate) => candidate.id === post.communityId
      );
      if (community) {
        community.postCount = Math.max(0, (community.postCount || 0) - 1);
      }
    }
    await this.store.persist?.({ actorId: user.id });
    return { success: true, deletedPostId: postId };
  }

  // ==========================================
  // REPLIES & ACCEPTED SOLUTIONS
  // ==========================================

  async getReplies(postId, currentUserId = null) {
    const post = this.store.posts.find(
      (candidate) => candidate.id === postId && !candidate.deletedAt
    );
    if (!post) throw new Error('Post not found');

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
    const post = this.store.posts.find((p) => p.id === postId && !p.deletedAt);
    if (!post) throw new Error('Post not found');
    if (post.isLocked) throw new Error('This discussion is locked.');

    if (typeof payload.content !== 'string' || payload.content.trim().length === 0) {
      throw new Error('Reply content cannot be empty.');
    }
    if (payload.content.trim().length > 10000) {
      throw new Error('Reply content cannot exceed 10000 characters.');
    }
    if (payload.parentReplyId) {
      const parent = this.store.replies.find(
        (reply) => reply.id === payload.parentReplyId && reply.postId === postId
      );
      if (!parent) {
        throw new Error('Parent reply not found on this post.');
      }
      if (parent.parentReplyId) {
        const grandparent = this.store.replies.find((reply) => reply.id === parent.parentReplyId);
        if (grandparent?.parentReplyId) {
          throw new Error('Reply nesting is limited to three levels.');
        }
      }
    }

    const replyId = `reply-${randomUUID()}`;
    const newReply = {
      id: replyId,
      postId,
      parentReplyId: payload.parentReplyId || null,
      authorId: authorUser.id,
      content: payload.content.trim(),
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

    const eventId = `contrib-reply-${replyId}`;
    this.queueContribution({
      eventId,
      memberId: authorUser.id,
      contributionType: 'reply',
      forumPostId: postId,
      forumReplyId: replyId,
      value: 1,
      contextEventId: post.linkedEventId || null,
      occurredAt: new Date().toISOString()
    });

    // Create notification for post author if different
    if (post.authorId !== authorUser.id) {
      this.store.notifications.push({
        id: `notif-${randomUUID()}`,
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
    await this.persistAndSync({
      actorId: authorUser.id,
      realtimeTopic: 'forum',
      eventType: 'reply.created',
      recordId: replyId,
      payload: { postId, replyId }
    });
    return {
      ...newReply,
      author,
      userVote: 0,
      children: []
    };
  }

  async markAcceptedSolution(postId, replyId, user) {
    const post = this.store.posts.find((p) => p.id === postId && !p.deletedAt);
    if (!post) throw new Error('Post not found');

    const reply = this.store.replies.find((r) => r.id === replyId && r.postId === postId);
    if (!reply) throw new Error('Reply not found on this post');

    // Rule: Only post author, or moderator/admin can mark accepted solution
    const canAccept = this.canManagePost(user, post);
    if (!canAccept) {
      throw new Error('Only the post author or a moderator can mark an answer as the accepted solution.');
    }

    const previousAcceptedReplyId = post.acceptedReplyId;
    if (previousAcceptedReplyId && previousAcceptedReplyId !== reply.id) {
      const previousEvent = this.store.contributionEvents.find(
        (event) =>
          event.contributionType === 'accepted_answer' &&
          event.forumReplyId === previousAcceptedReplyId
      );
      if (previousEvent) {
        this.queueContribution(previousEvent, 'revoke');
      } else {
        this.queueContribution(
          { eventId: this.acceptedContributionEventId(previousAcceptedReplyId) },
          'revoke'
        );
      }
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

    const eventId = this.acceptedContributionEventId(reply.id);
    this.queueContribution({
      eventId,
      memberId: reply.authorId,
      contributionType: 'accepted_answer',
      forumPostId: postId,
      forumReplyId: reply.id,
      value: 1,
      contextEventId: post.linkedEventId || null,
      occurredAt: new Date().toISOString()
    });

    // Send notification to the helpful answer author
    if (reply.authorId !== user.id) {
      this.store.notifications.push({
        id: `notif-${randomUUID()}`,
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

    await this.persistAndSync({
      actorId: user.id,
      realtimeTopic: 'forum',
      eventType: 'reply.accepted',
      recordId: reply.id,
      payload: { postId, replyId: reply.id }
    });
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
        ? this.store.posts.find((p) => p.id === targetId && !p.deletedAt)
        : this.store.replies.find((r) => r.id === targetId);

    if (!target) throw new Error(`${targetType} not found`);
    const targetPost =
      targetType === 'post'
        ? target
        : this.store.posts.find(
            (post) => post.id === target.postId && !post.deletedAt
          );
    if (!targetPost) throw new Error('post not found');

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
        id: `vote-${randomUUID()}`,
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

      const eventId = `contrib-upvote-${targetType}-${targetId}-${user.id}`;
      this.queueContribution({
        eventId,
        memberId: target.authorId,
        contributionType: 'upvote_received',
        forumPostId: targetType === 'post' ? target.id : target.postId,
        forumReplyId: targetType === 'reply' ? target.id : null,
        value: 1,
        contextEventId: targetPost.linkedEventId || null,
        occurredAt: new Date().toISOString()
      });
    } else if (value === -1 && previousValue !== -1) {
      target.downvotesCount = (target.downvotesCount || 0) + 1;
      if (previousValue === 1) target.upvotesCount = Math.max(0, (target.upvotesCount || 0) - 1);
    } else if (value === 0) {
      if (previousValue === 1) target.upvotesCount = Math.max(0, (target.upvotesCount || 0) - 1);
      if (previousValue === -1) target.downvotesCount = Math.max(0, (target.downvotesCount || 0) - 1);
    }
    if (previousValue === 1 && value !== 1) {
      this.queueContribution(
        { eventId: `contrib-upvote-${targetType}-${targetId}-${user.id}` },
        'revoke'
      );
    }

    await this.persistAndSync({ actorId: user.id });
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
    if (!this.store.posts.some((post) => post.id === postId && !post.deletedAt)) {
      throw new Error('Post not found');
    }

    const existingIndex = this.store.bookmarks.findIndex(
      (b) => b.userId === user.id && b.postId === postId
    );

    let isBookmarked = false;
    if (existingIndex !== -1) {
      this.store.bookmarks.splice(existingIndex, 1);
      isBookmarked = false;
    } else {
      this.store.bookmarks.push({
        id: `bm-${randomUUID()}`,
        userId: user.id,
        postId,
        createdAt: new Date().toISOString()
      });
      isBookmarked = true;
    }

    await this.store.persist?.({ actorId: user.id });
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
        id: `cm-${randomUUID()}`,
        communityId,
        userId: user.id,
        role: 'member',
        joinedAt: new Date().toISOString()
      });
      comm.memberCount = (comm.memberCount || 0) + 1;
      isMember = true;
    }

    await this.store.persist?.({ actorId: user.id });
    return { success: true, communityId, isMember, memberCount: comm.memberCount };
  }

  // ==========================================
  // IDEA CENTRE EXPORT (CRITICAL INTEGRATION)
  // ==========================================

  async exportPostToIdea(postId, user, customDetails = {}) {
    const post = this.store.posts.find((p) => p.id === postId && !p.deletedAt);
    if (!post) throw new Error('Discussion post not found');

    const canExport =
      post.authorId === user.id ||
      user.role === 'Mentor' ||
      this.canModerateCommunity(user, post.communityId);
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
        id: `exp-${randomUUID()}`,
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
        id: `notif-${randomUUID()}`,
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

    await this.store.persist?.({ actorId: user.id });
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
    if (!['spam', 'harassment', 'offensive_content', 'misleading_information', 'inappropriate_content', 'other'].includes(reason)) {
      throw new Error('Invalid report reason');
    }
    if (typeof targetId !== 'string' || !targetId) {
      throw new Error('Report target is required');
    }
    const targetExists =
      targetType === 'post'
        ? this.store.posts.some((post) => post.id === targetId && !post.deletedAt)
        : targetType === 'reply'
          ? this.store.replies.some(
              (reply) =>
                reply.id === targetId &&
                this.store.posts.some(
                  (post) => post.id === reply.postId && !post.deletedAt
                )
            )
          : Boolean(await memberService.getMemberById(targetId));
    if (!targetExists) {
      throw new Error('Report target not found');
    }

    const report = {
      id: `rep-${randomUUID()}`,
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
    await this.store.persist?.({ actorId: reporterUser.id });
    return { success: true, reportId: report.id };
  }

  async getReports(user) {
    const moderatedCommunityIds = this.moderatedCommunityIds(user);
    if (user.role !== 'Admin' && moderatedCommunityIds.length === 0) {
      throw new Error('Access denied to moderation queue');
    }

    const visibleReports = this.store.reports.filter(
      (report) =>
        ['pending', 'under_review'].includes(report.status) &&
        this.canModerateReport(user, report)
    );
    const enriched = await Promise.all(
      visibleReports.map(async (r) => {
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
    const report = this.store.reports.find((r) => r.id === reportId);
    if (!report) throw new Error('Report not found');
    if (!this.canModerateReport(moderatorUser, report)) {
      throw new Error('Access denied to resolve reports');
    }
    if (['resolved', 'dismissed'].includes(report.status)) {
      throw new Error('Report is already resolved');
    }
    if (!['resolve', 'dismiss'].includes(action)) {
      throw new Error('Action must be resolve or dismiss');
    }

    report.status = action === 'dismiss' ? 'dismissed' : 'resolved';
    report.reviewedBy = moderatorUser.id;
    report.resolutionNotes = resolutionNotes || '';
    report.updatedAt = new Date().toISOString();

    // Log moderation action
    this.store.moderationLogs.push({
      id: `modlog-${randomUUID()}`,
      moderatorId: moderatorUser.id,
      action: action || 'resolve',
      targetType: report.targetType,
      targetId: report.targetId,
      reason: resolutionNotes || 'Moderator action taken',
      createdAt: new Date().toISOString()
    });

    await this.store.persist?.({ actorId: moderatorUser.id });
    return { success: true, report };
  }

  // ==========================================
  // FOLLOWS
  // ==========================================

  async toggleFollow(targetType, targetId, user) {
    if (!['user', 'topic', 'community'].includes(targetType)) {
      throw new Error('Invalid follow target type');
    }

    const existingIndex = this.store.follows.findIndex(
      (f) => f.followerId === user.id && f.targetType === targetType && f.targetId === targetId
    );

    let isFollowing = false;
    if (existingIndex !== -1) {
      this.store.follows.splice(existingIndex, 1);
      isFollowing = false;
    } else {
      this.store.follows.push({
        id: `fol-${randomUUID()}`,
        followerId: user.id,
        targetType,
        targetId,
        createdAt: new Date().toISOString()
      });
      isFollowing = true;
    }

    await this.store.persist?.({ actorId: user.id });
    return { success: true, targetType, targetId, isFollowing };
  }

  // ==========================================
  // HELPER ENRICHMENT METHODS
  // ==========================================

  async _enrichPostSummary(post, currentUserId) {
    const author = await memberService.getMemberById(post.authorId);
    const currentUser = currentUserId
      ? await memberService.getMemberById(currentUserId)
      : null;
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
      linkedEvent,
      viewerPermissions: await this.getViewerPermissions(currentUser, post)
    };
  }

  async _enrichPostDetail(post, currentUserId) {
    const summary = await this._enrichPostSummary(post, currentUserId);
    const currentUser = currentUserId
      ? await memberService.getMemberById(currentUserId)
      : null;
    const attachments = currentUser
      ? await Promise.all(
          (post.attachmentIds || []).map(async (assetId) => {
            const asset = await mediaService.getUrl(assetId, currentUser);
            return {
              id: asset.id,
              originalName: asset.originalName,
              mimeType: asset.mimeType,
              sizeBytes: asset.sizeBytes,
              url: asset.url
            };
          })
        )
      : [];

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
      acceptedReply,
      attachments
    };
  }
}

export const forumService = new ForumService();
