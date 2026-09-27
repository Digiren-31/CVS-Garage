import assert from 'node:assert/strict';
import test, { beforeEach } from 'node:test';
import express from 'express';
import request from 'supertest';
import { ideaCentreService } from '../src/integrations/idea-centre.service.js';
import ideaCentreRouter from '../src/modules/idea-centre/idea.routes.js';
import { ideaStore } from '../src/modules/idea-centre/idea.store.js';

const app = express();
app.use(express.json());
app.use('/api/v1/idea-centre', ideaCentreRouter);

beforeEach(() => {
  ideaStore.reset();
});

test('Idea Centre API', async (t) => {
  await t.test('lists searchable, filterable ideas with per-user state', async () => {
    const response = await request(app)
      .get('/api/v1/idea-centre/ideas?q=accessibility&difficulty=Medium&status=Open')
      .set('x-user-id', 'mem-student-1')
      .expect(200);

    assert.equal(response.body.success, true);
    assert.equal(response.body.meta.total, 1);
    assert.equal(response.body.data[0].ticketCode, 'IDEA-2026-102');
    assert.equal(response.body.data[0].ownerName, 'Ananya Verma');
    assert.equal(response.body.data[0].savedByCurrentUser, true);
    assert.equal(response.body.data[0].joinRequestStatus, null);
    assert.ok(Array.isArray(response.body.data[0].comments));

    const track = await request(app)
      .get('/api/v1/idea-centre/ideas?track=Sustainability')
      .expect(200);
    assert.ok(track.body.data.every((idea) => idea.track === 'Sustainability'));
  });

  await t.test('validates idea submissions and makes the author the owner', async () => {
    const invalid = await request(app)
      .post('/api/v1/idea-centre/ideas')
      .set('x-user-id', 'mem-student-1')
      .send({ title: 'Incomplete idea' })
      .expect(400);
    assert.equal(invalid.body.error.code, 'VALIDATION_ERROR');

    const response = await request(app)
      .post('/api/v1/idea-centre/ideas')
      .set('x-user-id', 'mem-student-3')
      .send({
        title: 'Low-cost air quality stations',
        tagline: 'Map healthy study spaces across campus',
        description:
          'Build a network of calibrated particulate sensors and publish accessible live readings.',
        track: 'Sustainability',
        difficulty: 'Medium',
        targetTeamSize: 4,
        techStack: ['ESP32', 'TypeScript'],
        seekingMentor: true
      })
      .expect(201);

    assert.equal(response.body.data.ownerId, 'mem-student-3');
    assert.deepEqual(response.body.data.memberIds, ['mem-student-3']);
    assert.equal(response.body.data.status, 'Open');
    assert.equal(response.body.data.savedByCurrentUser, false);
  });

  await t.test('toggles saved state independently for each member', async () => {
    const first = await request(app)
      .post('/api/v1/idea-centre/ideas/IDEA-2026-101/save')
      .set('x-user-id', 'mem-student-3')
      .expect(200);
    assert.deepEqual(first.body.data, { ideaId: 'IDEA-2026-101', saved: true });

    const otherMember = await request(app)
      .get('/api/v1/idea-centre/ideas?q=solar')
      .set('x-user-id', 'mem-student-2')
      .expect(200);
    assert.equal(otherMember.body.data[0].savedByCurrentUser, false);

    const second = await request(app)
      .post('/api/v1/idea-centre/ideas/IDEA-2026-101/save')
      .set('x-user-id', 'mem-student-3')
      .expect(200);
    assert.equal(second.body.data.saved, false);
  });

  await t.test('enforces ownership, team capacity, and duplicate join requests', async () => {
    const owner = await request(app)
      .post('/api/v1/idea-centre/ideas/IDEA-2026-102/join-requests')
      .set('x-user-id', 'mem-student-2')
      .send({ message: 'I would like to join my own idea.' })
      .expect(409);
    assert.equal(owner.body.error.code, 'OWNER_CANNOT_JOIN');

    const full = await request(app)
      .post('/api/v1/idea-centre/ideas/IDEA-2026-103/join-requests')
      .set('x-user-id', 'mem-student-3')
      .send({ message: 'I can help with the product research.' })
      .expect(409);
    assert.equal(full.body.error.code, 'TEAM_FULL');

    const created = await request(app)
      .post('/api/v1/idea-centre/ideas/IDEA-2026-101/join-requests')
      .set('x-user-id', 'mem-student-3')
      .send({ message: 'I can build the telemetry dashboard.' })
      .expect(201);
    assert.equal(created.body.data.joinRequestStatus, 'Pending');

    const duplicate = await request(app)
      .post('/api/v1/idea-centre/ideas/IDEA-2026-101/join-requests')
      .set('x-user-id', 'mem-student-3')
      .send({ message: 'Sending the same request again.' })
      .expect(409);
    assert.equal(duplicate.body.error.code, 'DUPLICATE_JOIN_REQUEST');
  });

  await t.test('adds validated comments with the resolved member identity', async () => {
    const invalid = await request(app)
      .post('/api/v1/idea-centre/ideas/IDEA-2026-101/comments')
      .set('x-user-id', 'mem-student-1')
      .send({ content: '   ' })
      .expect(400);
    assert.equal(invalid.body.error.code, 'VALIDATION_ERROR');

    const response = await request(app)
      .post('/api/v1/idea-centre/ideas/IDEA-2026-101/comments')
      .set('x-user-id', 'mem-mentor-1')
      .send({ content: 'Please add a measurable energy-saving target.' })
      .expect(201);

    const comment = response.body.data.comments.at(-1);
    assert.equal(comment.authorId, 'mem-mentor-1');
    assert.equal(comment.authorName, 'Dr. Priya Nair');
  });

  await t.test('rejects unknown identities and missing ideas explicitly', async () => {
    const unauthorized = await request(app)
      .post('/api/v1/idea-centre/ideas/IDEA-2026-101/save')
      .set('x-user-id', 'not-a-member')
      .expect(401);
    assert.equal(unauthorized.body.error.code, 'UNAUTHORIZED');

    const missing = await request(app)
      .post('/api/v1/idea-centre/ideas/missing/save')
      .set('x-user-id', 'mem-student-1')
      .expect(404);
    assert.equal(missing.body.error.code, 'IDEA_NOT_FOUND');
  });

  await t.test('makes Forum exports visible once in the shared Idea Centre store', async () => {
    const payload = {
      sourceForumPostId: 'post-new-export',
      title: 'Campus repair café',
      problemStatement: 'Useful electronics are discarded for minor faults.',
      proposedSolution: 'Run student-led diagnostics and repair sessions every month.',
      expectedImpact: 'Reduce e-waste and teach practical repair skills.',
      authorMemberId: 'mem-student-1',
      department: 'Computer Science & Engineering',
      tags: ['Sustainability', 'Community']
    };

    const exported = await ideaCentreService.exportForumPostToIdea(payload);
    assert.equal(exported.success, true);

    const duplicate = await ideaCentreService.exportForumPostToIdea(payload);
    assert.equal(duplicate.success, false);
    assert.equal(duplicate.alreadyExported, true);
    assert.equal(duplicate.ideaId, exported.ideaId);

    const response = await request(app)
      .get('/api/v1/idea-centre/ideas?q=repair')
      .set('x-user-id', 'mem-student-1')
      .expect(200);
    assert.equal(response.body.data.length, 1);
    assert.equal(response.body.data[0].id, exported.ideaId);
    assert.equal(response.body.data[0].sourceForumPostId, 'post-new-export');
  });

  await t.test('serializes concurrent Forum exports by source post', async () => {
    const payload = {
      sourceForumPostId: 'post-concurrent-export',
      title: 'Shared tool library',
      problemStatement: 'Student teams repeatedly rebuild the same utilities.',
      proposedSolution: 'Curate reusable, reviewed campus project modules.',
      authorMemberId: 'mem-student-1',
      tags: ['Open source']
    };

    const [first, second] = await Promise.all([
      ideaCentreService.exportForumPostToIdea(payload),
      ideaCentreService.exportForumPostToIdea(payload)
    ]);

    assert.equal([first, second].filter((result) => result.success).length, 1);
    assert.equal([first, second].filter((result) => result.alreadyExported).length, 1);
    assert.equal(first.ideaId, second.ideaId);
    assert.equal(
      ideaStore.state.ideas.filter(
        (idea) => idea.sourceForumPostId === payload.sourceForumPostId
      ).length,
      1
    );
  });
});
