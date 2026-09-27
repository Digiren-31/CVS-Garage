import assert from 'node:assert/strict';
import test, { beforeEach } from 'node:test';
import { leaderboardService } from '../src/integrations/leaderboard.service.js';
import { memberService } from '../src/integrations/member.service.js';
import { ForumService } from '../src/modules/forum/forum.service.js';
import { ForumStore } from '../src/modules/forum/forum.store.js';
import { ideaStore } from '../src/modules/idea-centre/idea.store.js';
import { leaderboardStore } from '../src/modules/leaderboards/leaderboard.store.js';

beforeEach(() => {
  ideaStore.reset();
  leaderboardStore.reset();
});

test('Forum integrity and cross-domain consistency', async (t) => {
  const store = new ForumStore();
  const service = new ForumService(store);
  const student = await memberService.getMemberById('mem-student-1');
  const webModerator = await memberService.getMemberById('mem-student-2');
  const mentor = await memberService.getMemberById('mem-mentor-2');

  await t.test('scopes community moderation to assigned communities', async () => {
    const managedPost = await service.createPost(
      {
        postType: 'discussion',
        title: 'Reviewing our shared web platform architecture',
        content: 'This thread belongs to the Full-Stack Web and Cloud community.',
        communityId: 'comm-webdev'
      },
      student
    );
    const unrelatedPost = await service.createPost(
      {
        postType: 'discussion',
        title: 'Reviewing an artificial intelligence experiment',
        content: 'This thread belongs to the AI and Machine Learning community.',
        communityId: 'comm-ai'
      },
      student
    );

    const permissions = await service.getViewerPermissions(webModerator, managedPost);
    assert.equal(permissions.canAccessModeration, true);
    assert.equal(permissions.canDelete, true);

    await assert.rejects(
      service.deletePost(unrelatedPost.id, webModerator),
      /Unauthorized/
    );
    await service.deletePost(managedPost.id, webModerator);
    assert.equal(await service.getPostById(managedPost.id), null);
  });

  await t.test('uses the same scoped permission for Forum exports', async () => {
    const managedPost = await service.createPost(
      {
        postType: 'idea',
        title: 'Community-owned reusable accessibility checklist',
        content: 'Create and maintain an accessibility checklist for campus web teams.',
        communityId: 'comm-webdev'
      },
      student
    );
    const unrelatedPost = await service.createPost(
      {
        postType: 'idea',
        title: 'Community-owned machine learning review guide',
        content: 'Create a review guide for experiments shared in the AI community.',
        communityId: 'comm-ai'
      },
      student
    );

    const exported = await service.exportPostToIdea(managedPost.id, webModerator);
    assert.equal(exported.success, true);

    await assert.rejects(
      service.exportPostToIdea(unrelatedPost.id, {
        id: 'unassigned-global-moderator',
        role: 'Community Moderator',
        department: 'General'
      }),
      /Only the discussion author, mentor, or moderator/
    );
  });

  await t.test('soft-deleted posts cannot be read, replied to, voted on, or bookmarked', async () => {
    const post = await service.createPost(
      {
        postType: 'question',
        title: 'How should a deleted thread behave?',
        content: 'The content and its replies must become inaccessible after deletion.'
      },
      student
    );
    const reply = await service.createReply(
      post.id,
      { content: 'This reply remains an audit record but cannot be accessed.' },
      mentor
    );

    await service.deletePost(post.id, student);

    assert.equal(await service.getPostById(post.id), null);
    assert.ok(store.posts.find((candidate) => candidate.id === post.id)?.deletedAt);
    assert.ok(store.replies.some((candidate) => candidate.id === reply.id));
    await assert.rejects(service.getReplies(post.id, student.id), /Post not found/);
    await assert.rejects(
      service.castVote(
        { targetType: 'reply', targetId: reply.id, value: 1 },
        student
      ),
      /post not found/
    );
    await assert.rejects(service.toggleBookmark(post.id, student), /Post not found/);
  });

  await t.test('removes terminal reports from the scoped moderation queue', async () => {
    const post = await service.createPost(
      {
        postType: 'discussion',
        title: 'A reportable community discussion',
        content: 'This synthetic thread verifies scoped report resolution.',
        communityId: 'comm-webdev'
      },
      student
    );
    const report = await service.createReport(
      {
        targetType: 'post',
        targetId: post.id,
        reason: 'spam',
        notes: 'Synthetic moderation test.'
      },
      student
    );

    assert.equal((await service.getReports(webModerator)).length, 1);
    await service.resolveReport(
      report.reportId,
      { action: 'resolve', resolutionNotes: 'Handled.' },
      webModerator
    );
    assert.equal((await service.getReports(webModerator)).length, 0);
    await assert.rejects(
      service.resolveReport(
        report.reportId,
        { action: 'dismiss', resolutionNotes: 'Duplicate transition.' },
        webModerator
      ),
      /already resolved/
    );
  });

  await t.test('revokes and reactivates leaderboard awards with Forum state', async () => {
    const post = await service.createPost(
      {
        postType: 'question',
        title: 'How do reversible contribution awards work?',
        content: 'Votes and accepted answers should mirror current Forum state.',
        linkedEventId: 'EVT-2026-01'
      },
      student
    );
    const firstReply = await service.createReply(
      post.id,
      { content: 'The first candidate answer for this consistency test.' },
      mentor
    );
    const secondReply = await service.createReply(
      post.id,
      { content: 'The second candidate answer for this consistency test.' },
      webModerator
    );

    await service.castVote(
      { targetType: 'post', targetId: post.id, value: 1 },
      mentor
    );
    const upvoteEventId = `contrib-upvote-post-${post.id}-${mentor.id}`;
    assert.equal(
      leaderboardStore.state.contributionEvents.find(
        (event) => event.eventId === upvoteEventId
      )?.contextEventId,
      'EVT-2026-01'
    );

    const scoreWithVote = (
      await leaderboardService.getLeaderboard()
    ).entries.find((entry) => entry.memberId === student.id).score;
    await service.castVote(
      { targetType: 'post', targetId: post.id, value: 0 },
      mentor
    );
    const scoreWithoutVote = (
      await leaderboardService.getLeaderboard()
    ).entries.find((entry) => entry.memberId === student.id).score;
    assert.equal(scoreWithoutVote, scoreWithVote - 2);

    await service.castVote(
      { targetType: 'post', targetId: post.id, value: 1 },
      mentor
    );
    assert.equal(
      leaderboardStore.state.contributionEvents.find(
        (event) => event.eventId === upvoteEventId
      )?.revokedAt,
      undefined
    );

    await service.markAcceptedSolution(post.id, firstReply.id, student);
    await service.markAcceptedSolution(post.id, secondReply.id, student);
    assert.ok(
      leaderboardStore.state.contributionEvents.find(
        (event) => event.eventId === `contrib-accepted-${firstReply.id}`
      )?.revokedAt
    );
    assert.equal(
      leaderboardStore.state.contributionEvents.find(
        (event) => event.eventId === `contrib-accepted-${secondReply.id}`
      )?.contextEventId,
      'EVT-2026-01'
    );

    const linkedEvents = leaderboardStore.state.contributionEvents
      .filter((event) => event.forumPostId === post.id)
      .map((event) => event.contextEventId);
    assert.ok(linkedEvents.length >= 5);
    assert.ok(linkedEvents.every((eventId) => eventId === 'EVT-2026-01'));
  });
});
