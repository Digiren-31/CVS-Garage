import { createPersistentStore } from '../../lib/persistent-store.js';

const contribution = ({
  eventId,
  memberId,
  contributionType,
  value,
  contextEventId,
  occurredAt,
  forumPostId = null,
  forumReplyId = null
}) => ({
  eventId,
  memberId,
  contributionType,
  forumPostId,
  forumReplyId,
  value,
  points: {
    post: 10,
    reply: 5,
    accepted_answer: 25,
    upvote_received: 2
  }[contributionType] * value,
  contextEventId,
  policyVersion: 'forum-contributions-v1',
  occurredAt,
  recordedAt: occurredAt
});

function createLeaderboardSeed() {
  return {
    contributionEvents: [
      contribution({
        eventId: 'hash-evt-post-1',
        memberId: 'mem-student-1',
        contributionType: 'post',
        value: 1,
        contextEventId: 'EVT-2026-01',
        occurredAt: '2026-08-12T09:30:00.000Z',
        forumPostId: 'post-1'
      }),
      contribution({
        eventId: 'seed-rahul-posts',
        memberId: 'mem-student-1',
        contributionType: 'post',
        value: 7,
        contextEventId: 'EVT-2026-01',
        occurredAt: '2026-08-13T09:30:00.000Z'
      }),
      contribution({
        eventId: 'seed-rahul-answers',
        memberId: 'mem-student-1',
        contributionType: 'accepted_answer',
        value: 3,
        contextEventId: 'EVT-2026-01',
        occurredAt: '2026-08-21T11:00:00.000Z'
      }),
      contribution({
        eventId: 'seed-rahul-replies',
        memberId: 'mem-student-1',
        contributionType: 'reply',
        value: 5,
        contextEventId: 'EVT-2026-01',
        occurredAt: '2026-09-01T08:15:00.000Z'
      }),
      contribution({
        eventId: 'hash-evt-ans-1',
        memberId: 'mem-mentor-2',
        contributionType: 'accepted_answer',
        value: 1,
        contextEventId: 'EVT-2026-01',
        occurredAt: '2026-08-14T14:20:00.000Z',
        forumPostId: 'post-1',
        forumReplyId: 'reply-1-1'
      }),
      contribution({
        eventId: 'seed-ananya-answers',
        memberId: 'mem-student-2',
        contributionType: 'accepted_answer',
        value: 4,
        contextEventId: 'EVT-2026-01',
        occurredAt: '2026-08-15T14:20:00.000Z'
      }),
      contribution({
        eventId: 'seed-ananya-replies',
        memberId: 'mem-student-2',
        contributionType: 'reply',
        value: 8,
        contextEventId: 'EVT-2026-02',
        occurredAt: '2026-08-30T12:45:00.000Z'
      }),
      contribution({
        eventId: 'seed-ananya-upvotes',
        memberId: 'mem-student-2',
        contributionType: 'upvote_received',
        value: 25,
        contextEventId: 'EVT-2026-01',
        occurredAt: '2026-09-10T16:05:00.000Z'
      }),
      contribution({
        eventId: 'hash-evt-post-2',
        memberId: 'mem-student-2',
        contributionType: 'post',
        value: 1,
        contextEventId: 'EVT-2026-02',
        occurredAt: '2026-08-16T10:10:00.000Z',
        forumPostId: 'post-2'
      }),
      contribution({
        eventId: 'seed-rohan-posts',
        memberId: 'mem-student-3',
        contributionType: 'post',
        value: 6,
        contextEventId: 'EVT-2026-02',
        occurredAt: '2026-08-17T10:10:00.000Z'
      }),
      contribution({
        eventId: 'seed-rohan-answers',
        memberId: 'mem-student-3',
        contributionType: 'accepted_answer',
        value: 4,
        contextEventId: 'EVT-2026-02',
        occurredAt: '2026-08-28T13:40:00.000Z'
      }),
      contribution({
        eventId: 'seed-rohan-replies',
        memberId: 'mem-student-3',
        contributionType: 'reply',
        value: 6,
        contextEventId: 'EVT-2026-02',
        occurredAt: '2026-09-02T07:50:00.000Z'
      }),
      contribution({
        eventId: 'seed-priya-answers',
        memberId: 'mem-mentor-1',
        contributionType: 'accepted_answer',
        value: 5,
        contextEventId: 'EVT-2026-01',
        occurredAt: '2026-08-18T15:30:00.000Z'
      }),
      contribution({
        eventId: 'seed-priya-replies',
        memberId: 'mem-mentor-1',
        contributionType: 'reply',
        value: 15,
        contextEventId: 'EVT-2026-02',
        occurredAt: '2026-09-05T17:00:00.000Z'
      }),
      contribution({
        eventId: 'seed-arvind-posts',
        memberId: 'mem-mentor-2',
        contributionType: 'post',
        value: 5,
        contextEventId: 'EVT-2026-02',
        occurredAt: '2026-08-19T09:00:00.000Z'
      }),
      contribution({
        eventId: 'seed-arvind-answers',
        memberId: 'mem-mentor-2',
        contributionType: 'accepted_answer',
        value: 3,
        contextEventId: 'EVT-2026-02',
        occurredAt: '2026-08-29T16:00:00.000Z'
      }),
      contribution({
        eventId: 'seed-arvind-replies',
        memberId: 'mem-mentor-2',
        contributionType: 'reply',
        value: 5,
        contextEventId: 'EVT-2026-01',
        occurredAt: '2026-09-04T10:30:00.000Z'
      })
    ],
    achievements: [
      {
        id: 'achievement-hacksprint-finalist',
        memberId: 'mem-student-2',
        title: 'HackSprint finalist',
        description: 'Recognised for a standout decentralized credentials prototype.',
        achievedAt: '2026-09-20T10:00:00.000Z',
        projectId: 'PRJ-103',
        eventId: 'EVT-2026-01'
      },
      {
        id: 'achievement-community-guide',
        memberId: 'mem-mentor-1',
        title: 'Community guide',
        description: 'Reached five accepted answers across student project discussions.',
        achievedAt: '2026-09-18T13:30:00.000Z',
        eventId: 'EVT-2026-02'
      },
      {
        id: 'achievement-campus-builder',
        memberId: 'mem-student-1',
        title: 'Campus builder',
        description: 'Shared eight project updates with the campus community.',
        achievedAt: '2026-09-12T08:45:00.000Z',
        projectId: 'PRJ-101'
      }
    ]
  };
}

export const leaderboardStore = createPersistentStore('leaderboards', createLeaderboardSeed);
