import assert from 'node:assert/strict';
import test, { beforeEach } from 'node:test';
import express from 'express';
import request from 'supertest';
import { leaderboardService } from '../src/integrations/leaderboard.service.js';
import { LEADERBOARD_ORDER } from '../src/modules/leaderboards/leaderboard.service.js';
import { leaderboardStore } from '../src/modules/leaderboards/leaderboard.store.js';
import leaderboardsRouter from '../src/modules/leaderboards/leaderboard.routes.js';
import { memberStore } from '../src/modules/member-centre/member.store.js';

const app = express();
app.use(express.json());
app.use('/api/v1/leaderboards', leaderboardsRouter);

beforeEach(() => {
  leaderboardStore.reset();
  memberStore.reset();
});

test('Leaderboards API', async (t) => {
  await t.test('returns the public aggregate contract in the standard envelope', async () => {
    const response = await request(app).get('/api/v1/leaderboards').expect(200);

    assert.equal(response.body.success, true);
    assert.equal(response.body.error, null);
    assert.ok(response.body.meta.timestamp);

    const leaderboard = response.body.data;
    assert.match(leaderboard.generatedAt, /^\d{4}-\d{2}-\d{2}T/);
    assert.equal(leaderboard.scoringPolicyVersion, 'forum-contributions-v1');
    assert.ok(leaderboard.entries.length >= 3);
    assert.ok(leaderboard.achievements.length >= 1);
    assert.ok(leaderboard.filters.events.every((event) => event.id && event.title));
    assert.ok(leaderboard.filters.departments.includes('AI & Data Science'));
    assert.ok(leaderboard.filters.academicYears.includes('2026'));

    const entry = leaderboard.entries[0];
    assert.deepEqual(
      Object.keys(entry).sort(),
      [
        'academicYear',
        'avatarUrl',
        'contributionBreakdown',
        'department',
        'eventIds',
        'memberId',
        'memberName',
        'rank',
        'score',
        'starRating'
      ].sort()
    );
    assert.equal('email' in entry, false);
  });

  await t.test('uses a deterministic backend-owned tie-breaker', async () => {
    const response = await request(app).get('/api/v1/leaderboards').expect(200);
    const entries = response.body.data.entries;

    assert.deepEqual(LEADERBOARD_ORDER, [
      'score-descending',
      'contribution-count-descending',
      'member-name-ascending',
      'member-id-ascending'
    ]);
    assert.deepEqual(
      entries.map((entry) => entry.rank),
      entries.map((_entry, index) => index + 1)
    );

    const tiedEntries = entries.filter((entry) => entry.score === 200);
    assert.deepEqual(
      tiedEntries.map((entry) => entry.memberName),
      ['Ananya Verma', 'Dr. Priya Nair']
    );
  });

  await t.test('records Forum contributions once and persists their source details', async () => {
    const event = {
      eventId: 'test-forum-contribution-1',
      memberId: 'mem-student-1',
      contributionType: 'post',
      forumPostId: 'post-1',
      value: 2,
      timestamp: '2026-09-27T12:00:00.000Z'
    };

    const before = await leaderboardService.getLeaderboard();
    const scoreBefore = before.entries.find((entry) => entry.memberId === event.memberId).score;

    const first = await leaderboardService.recordContribution(event);
    const duplicate = await leaderboardService.recordContribution(event);

    assert.equal(first.success, true);
    assert.equal(first.duplicate, false);
    assert.equal(duplicate.success, true);
    assert.equal(duplicate.duplicate, true);

    const stored = leaderboardStore.state.contributionEvents.filter(
      (candidate) => candidate.eventId === event.eventId
    );
    assert.equal(stored.length, 1);
    assert.equal(stored[0].forumPostId, event.forumPostId);
    assert.equal(stored[0].forumReplyId, null);
    assert.equal(stored[0].points, 20);

    const after = await leaderboardService.getLeaderboard();
    const scoreAfter = after.entries.find((entry) => entry.memberId === event.memberId).score;
    assert.equal(scoreAfter, scoreBefore + 20);
  });

  await t.test('keeps the pre-seeded Forum idempotency keys', async () => {
    const result = await leaderboardService.recordContribution({
      eventId: 'hash-evt-post-1',
      memberId: 'mem-student-1',
      contributionType: 'post',
      forumPostId: 'seed-post',
      value: 1
    });

    assert.equal(result.success, true);
    assert.equal(result.duplicate, true);
  });
});
