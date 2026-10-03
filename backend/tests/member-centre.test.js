import assert from 'node:assert/strict';
import test, { beforeEach } from 'node:test';
import express from 'express';
import request from 'supertest';
import { memberService } from '../src/integrations/member.service.js';
import memberCentreRouter from '../src/modules/member-centre/member.routes.js';
import { memberStore } from '../src/modules/member-centre/member.store.js';

const app = express();
app.use(express.json());
app.use('/api/v1/member-centre', memberCentreRouter);

beforeEach(() => {
  memberStore.reset();
});

test('Member Centre API', async (t) => {
  await t.test('lists and searches complete member profiles', async () => {
    const response = await request(app).get('/api/v1/member-centre/members?q=robotics').expect(200);

    assert.equal(response.body.success, true);
    assert.equal(response.body.meta.total, 1);
    assert.equal(response.body.data[0].id, 'mem-mentor-2');
    assert.deepEqual(response.body.data[0].roles, ['Mentor']);
    assert.equal(response.body.data[0].status, 'active');
    assert.ok(Array.isArray(response.body.data[0].skills));
  });

  await t.test('returns aggregate statistics and the current development identity', async () => {
    const stats = await request(app).get('/api/v1/member-centre/stats').expect(200);
    assert.deepEqual(stats.body.data, {
      totalMembers: 6,
      activeMembers: 6,
      mentors: 2,
      pendingMembers: 0,
      suspendedMembers: 0
    });

    const current = await request(app)
      .get('/api/v1/member-centre/me')
      .set('x-user-id', 'mem-student-1')
      .expect(200);
    assert.equal(current.body.data.id, 'mem-student-1');
  });

  await t.test('does not impersonate a seeded user for an unknown identity', async () => {
    const response = await request(app)
      .get('/api/v1/member-centre/me')
      .set('x-user-id', 'not-a-member')
      .expect(401);

    assert.equal(response.body.error.code, 'UNAUTHORIZED');
    assert.equal(
      await memberService.verifyAuth({ headers: { 'x-user-id': 'not-a-member' } }),
      null
    );
  });

  await t.test('requires an active administrator for member mutations', async () => {
    const forbidden = await request(app)
      .patch('/api/v1/member-centre/members/mem-student-2/status')
      .set('x-user-id', 'mem-student-1')
      .send({ status: 'suspended' })
      .expect(403);
    assert.equal(forbidden.body.error.code, 'FORBIDDEN');

    await request(app)
      .patch('/api/v1/member-centre/members/mem-student-1/status')
      .set('x-user-id', 'not-a-member')
      .send({ status: 'suspended' })
      .expect(401);
  });

  await t.test('validates mutation payloads and target identities', async () => {
    const status = await request(app)
      .patch('/api/v1/member-centre/members/mem-student-1/status')
      .set('x-user-id', 'mem-admin-1')
      .send({ status: 'deleted' })
      .expect(400);
    assert.equal(status.body.error.code, 'VALIDATION_ERROR');

    const mentor = await request(app)
      .patch('/api/v1/member-centre/members/mem-student-1/mentor')
      .set('x-user-id', 'mem-admin-1')
      .send({ enabled: 'true' })
      .expect(400);
    assert.equal(mentor.body.error.code, 'VALIDATION_ERROR');

    const missing = await request(app)
      .patch('/api/v1/member-centre/members/missing/status')
      .set('x-user-id', 'mem-admin-1')
      .send({ status: 'suspended' })
      .expect(404);
    assert.equal(missing.body.error.code, 'MEMBER_NOT_FOUND');
  });

  await t.test('persists status changes and rejects suspended identities', async () => {
    const updated = await request(app)
      .patch('/api/v1/member-centre/members/mem-student-1/status')
      .set('x-user-id', 'mem-admin-1')
      .send({ status: 'suspended' })
      .expect(200);

    assert.equal(updated.body.data.status, 'suspended');
    assert.equal(await memberService.verifyAuth({ headers: { 'x-user-id': 'mem-student-1' } }), null);

    const members = await request(app)
      .get('/api/v1/member-centre/members')
      .set('x-user-id', 'mem-admin-1')
      .expect(200);
    assert.equal(
      members.body.data.find((member) => member.id === 'mem-student-1').status,
      'suspended'
    );

    const stats = await request(app)
      .get('/api/v1/member-centre/stats')
      .set('x-user-id', 'mem-admin-1')
      .expect(200);
    assert.equal(stats.body.data.activeMembers, 5);
    assert.equal(stats.body.data.suspendedMembers, 1);
  });

  await t.test('grants and revokes mentor capability without dropping the base role', async () => {
    const granted = await request(app)
      .patch('/api/v1/member-centre/members/mem-student-2/mentor')
      .set('x-user-id', 'mem-admin-1')
      .send({ enabled: true })
      .expect(200);

    assert.equal(granted.body.data.isMentor, true);
    assert.equal(granted.body.data.role, 'Mentor');
    assert.deepEqual(granted.body.data.roles, ['Student', 'Mentor']);

    const revoked = await request(app)
      .patch('/api/v1/member-centre/members/mem-student-2/mentor')
      .set('x-user-id', 'mem-admin-1')
      .send({ enabled: false })
      .expect(200);

    assert.equal(revoked.body.data.isMentor, false);
    assert.equal(revoked.body.data.role, 'Student');
    assert.deepEqual(revoked.body.data.roles, ['Student']);
  });

  await t.test('grants moderator access and lets members update only profile fields', async () => {
    const moderator = await request(app)
      .patch('/api/v1/member-centre/members/mem-student-2/role')
      .set('x-user-id', 'mem-admin-1')
      .send({ role: 'Community Moderator', enabled: true })
      .expect(200);

    assert.equal(moderator.body.data.roles.includes('Community Moderator'), true);
    assert.equal(moderator.body.data.role, 'Community Moderator');

    const profile = await request(app)
      .patch('/api/v1/member-centre/me')
      .set('x-user-id', 'mem-student-1')
      .send({
        name: 'Rahul Sharma',
        department: 'Computer Science',
        batch: 'Batch 2026',
        bio: 'Building accessible campus tools.',
        skills: ['React', 'Accessibility']
      })
      .expect(200);

    assert.equal(profile.body.data.department, 'Computer Science');
    assert.deepEqual(profile.body.data.skills, ['React', 'Accessibility']);
    assert.deepEqual(profile.body.data.roles, ['Student']);
  });

  await t.test('rejects unsupported managed roles and read-only demo profile changes', async () => {
    const role = await request(app)
      .patch('/api/v1/member-centre/members/mem-student-2/role')
      .set('x-user-id', 'mem-admin-1')
      .send({ role: 'Admin', enabled: true })
      .expect(400);
    assert.equal(role.body.error.code, 'VALIDATION_ERROR');

    memberStore.state.members[0].isDemo = true;
    const profile = await request(app)
      .patch('/api/v1/member-centre/me')
      .set('x-user-id', 'mem-student-1')
      .send({
        name: 'Changed Name',
        department: 'Computer Science',
        batch: '',
        bio: '',
        skills: []
      })
      .expect(409);
    assert.equal(profile.body.error.code, 'DEMO_PROFILE_READ_ONLY');
  });

  await t.test('protects administrators from self and role mutations', async () => {
    const self = await request(app)
      .patch('/api/v1/member-centre/members/mem-admin-1/status')
      .set('x-user-id', 'mem-admin-1')
      .send({ status: 'suspended' })
      .expect(409);
    assert.equal(self.body.error.code, 'SELF_MUTATION_NOT_ALLOWED');

    const role = await request(app)
      .patch('/api/v1/member-centre/members/mem-admin-1/mentor')
      .set('x-user-id', 'mem-admin-1')
      .send({ enabled: true })
      .expect(409);
    assert.equal(role.body.error.code, 'SELF_MUTATION_NOT_ALLOWED');
  });
});
