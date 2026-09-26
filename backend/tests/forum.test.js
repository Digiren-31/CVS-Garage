/**
 * CVS Garage — Forum Critical Path Unit & Integration Tests
 * Runs with Node native test runner: node tests/forum.test.js
 */

import test from 'node:test';
import assert from 'node:assert/strict';
import { ForumService } from '../src/modules/forum/forum.service.js';
import { ForumStore } from '../src/modules/forum/forum.store.js';
import { memberService } from '../src/integrations/member.service.js';
import { ideaCentreService } from '../src/integrations/idea-centre.service.js';
import { leaderboardService } from '../src/integrations/leaderboard.service.js';

test('Forum Critical Path Integration Tests', async (t) => {
  // Fresh isolated store for testing
  const store = new ForumStore();
  const forumService = new ForumService(store);

  const studentUser = await memberService.getMemberById('mem-student-1');
  const mentorUser = await memberService.getMemberById('mem-mentor-2');
  const adminUser = await memberService.getMemberById('mem-admin-1');

  await t.test('1. Posts: Create, Retrieve, and Filter Posts', async () => {
    const post = await forumService.createPost(
      {
        postType: 'question',
        title: 'How to implement BLE mesh networking with ESP32?',
        content: 'We need ESP32 BLE mesh for our smart building lighting project.',
        categoryId: 'cat-1',
        tagNames: ['IoT & Embedded', 'ESP32'],
        linkedProjectId: 'PRJ-101'
      },
      studentUser
    );

    assert.ok(post.id, 'Post should have an ID');
    assert.equal(post.title, 'How to implement BLE mesh networking with ESP32?');
    assert.equal(post.status, 'open', 'New question should have status open');
    assert.equal(post.voteScore, 1, 'Author should receive initial auto-upvote');

    // Retrieve via getPosts
    const posts = await forumService.getPosts({ search: 'BLE mesh' }, studentUser.id);
    assert.equal(posts.length, 1);
    assert.equal(posts[0].id, post.id);
  });

  await t.test('2. Replies & Accepted Solution Workflow', async () => {
    // 1. Create a question post
    const qPost = await forumService.createPost(
      {
        postType: 'question',
        title: 'Kalman filter question for robotics',
        content: 'Need help smoothing noisy IMU readings.',
        categoryId: 'cat-1'
      },
      studentUser
    );

    // 2. Mentor posts an answer
    const reply = await forumService.createReply(
      qPost.id,
      { content: 'Use a discrete 6-DOF Kalman filter with quaternion representation.' },
      mentorUser
    );

    assert.ok(reply.id, 'Reply should be created');
    assert.equal(reply.isAcceptedSolution, false);

    // 3. Unauthorized user cannot mark answer as accepted
    const stranger = await memberService.getMemberById('mem-student-3');
    await assert.rejects(
      async () => {
        await forumService.markAcceptedSolution(qPost.id, reply.id, stranger);
      },
      /Only the post author or a moderator can mark an answer as the accepted solution/
    );

    // 4. Post author marks answer as accepted solution
    const acceptResult = await forumService.markAcceptedSolution(qPost.id, reply.id, studentUser);
    assert.equal(acceptResult.success, true);
    assert.equal(acceptResult.postStatus, 'solved');

    // 5. Verify post is now solved and accepted reply is marked
    const updatedPost = await forumService.getPostById(qPost.id, studentUser.id);
    assert.equal(updatedPost.status, 'solved');
    assert.equal(updatedPost.acceptedReplyId, reply.id);
  });

  await t.test('3. Normalized Voting & Score Calculations', async () => {
    const post = await forumService.createPost(
      {
        postType: 'discussion',
        title: 'Microservices vs Monolith for campus portal',
        content: 'Evaluating modular monolith vs microservices.'
      },
      studentUser
    );

    // Post score starts at 1 (author upvote)
    assert.equal(post.voteScore, 1);

    // Mentor upvotes post (+1) -> score becomes 2
    const upvoteResult = await forumService.castVote(
      { targetType: 'post', targetId: post.id, value: 1 },
      mentorUser
    );
    assert.equal(upvoteResult.newScore, 2);

    // Mentor switches vote to downvote (-1) -> score drops by 2 -> becomes 0
    const downvoteResult = await forumService.castVote(
      { targetType: 'post', targetId: post.id, value: -1 },
      mentorUser
    );
    assert.equal(downvoteResult.newScore, 0);

    // Mentor clicks downvote again -> removes vote (toggles to 0) -> score increases by 1 -> becomes 1
    const unvoteResult = await forumService.castVote(
      { targetType: 'post', targetId: post.id, value: 0 },
      mentorUser
    );
    assert.equal(unvoteResult.newScore, 1);
  });

  await t.test('4. Bookmarks Toggle', async () => {
    const post = store.posts[0];
    const res1 = await forumService.toggleBookmark(post.id, studentUser);
    assert.equal(res1.isBookmarked, true);

    const res2 = await forumService.toggleBookmark(post.id, studentUser);
    assert.equal(res2.isBookmarked, false);
  });

  await t.test('5. Idea Centre Export & Duplicate Prevention (Critical Integration)', async () => {
    // Create an innovative post
    const ideaPost = await forumService.createPost(
      {
        postType: 'idea',
        title: 'Smart Waste Management IoT Bins',
        content: 'Ultrasonic sensors reporting trash levels over LoRaWAN.'
      },
      studentUser
    );

    // Export to Idea Centre
    const exportResult = await forumService.exportPostToIdea(ideaPost.id, studentUser, {
      problemStatement: 'Overflowing bins on campus grounds during fests.',
      proposedSolution: 'Solar-powered LoRaWAN ultrasonic sensor nodes.'
    });

    assert.equal(exportResult.success, true);
    assert.ok(exportResult.ideaId.startsWith('IDEA-2026-'));
    assert.ok(exportResult.ideaUrl);

    // Try exporting AGAIN -> MUST FAIL with alreadyExported: true
    const duplicateExportResult = await forumService.exportPostToIdea(ideaPost.id, studentUser);
    assert.equal(duplicateExportResult.success, false);
    assert.equal(duplicateExportResult.alreadyExported, true);
  });

  await t.test('6. Leaderboard Contribution Idempotency (Critical Integration)', async () => {
    const eventId = 'test-unique-event-id-999';

    // First recording
    const rec1 = await leaderboardService.recordContribution({
      eventId,
      memberId: 'mem-student-1',
      contributionType: 'post',
      forumPostId: 'post-1',
      value: 1
    });
    assert.equal(rec1.success, true);
    assert.equal(rec1.duplicate, false);

    // Second recording with same eventId -> duplicate prevented!
    const rec2 = await leaderboardService.recordContribution({
      eventId,
      memberId: 'mem-student-1',
      contributionType: 'post',
      forumPostId: 'post-1',
      value: 1
    });
    assert.equal(rec2.success, true);
    assert.equal(rec2.duplicate, true, 'Leaderboard must reject duplicate contribution events');
  });

  await t.test('7. Moderation: Reporting & Resolution', async () => {
    const post = store.posts[0];

    // Student flags content
    const reportRes = await forumService.createReport(
      {
        targetType: 'post',
        targetId: post.id,
        reason: 'spam',
        notes: 'Promotional spam link observed.'
      },
      studentUser
    );
    assert.ok(reportRes.reportId);

    // Admin views moderation queue
    const reports = await forumService.getReports(adminUser);
    const targetReport = reports.find((r) => r.id === reportRes.reportId);
    assert.ok(targetReport);
    assert.equal(targetReport.status, 'pending');

    // Admin resolves report
    const resolveRes = await forumService.resolveReport(
      targetReport.id,
      { action: 'resolve', resolutionNotes: 'Reviewed and confirmed benign.' },
      adminUser
    );
    assert.equal(resolveRes.report.status, 'resolved');
  });
});
