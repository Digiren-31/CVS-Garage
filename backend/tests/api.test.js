import test from 'node:test';
import assert from 'node:assert/strict';
import request from 'supertest';
import app from '../src/server.js';

test('central API composition', async (t) => {
  await t.test('reports health and every integrated module', async () => {
    const response = await request(app).get('/health').expect(200);

    assert.equal(response.body.status, 'healthy');
    assert.deepEqual(response.body.modules, [
      'dashboard',
      'projects',
      'events',
      'member-centre',
      'leaderboards',
      'idea-centre',
      'forum',
      'media'
    ]);
  });

  await t.test('returns the portal dashboard read model', async () => {
    const response = await request(app)
      .get('/api/v1/dashboard')
      .set('x-user-id', 'mem-student-1')
      .expect(200);

    assert.equal(response.body.success, true);
    assert.ok(response.body.data.memberCount > 0);
    assert.ok(Array.isArray(response.body.data.featuredProjects));
    assert.ok(Array.isArray(response.body.data.upcomingEvents));
  });

  await t.test('serves every service collection endpoint', async () => {
    const endpoints = [
      '/api/v1/projects',
      '/api/v1/events',
      '/api/v1/member-centre/members',
      '/api/v1/leaderboards',
      '/api/v1/idea-centre/ideas',
      '/api/v1/forum/posts'
    ];

    for (const endpoint of endpoints) {
      const response = await request(app)
        .get(endpoint)
        .set('x-user-id', 'mem-student-1')
        .expect(200);
      assert.equal(response.body.success, true, endpoint);
      assert.notEqual(response.body.data, null, endpoint);
    }
  });

  await t.test('uses the standard error envelope for unknown API routes', async () => {
    const response = await request(app).get('/api/v1/not-a-route').expect(404);

    assert.equal(response.body.success, false);
    assert.equal(response.body.data, null);
    assert.equal(response.body.error.code, 'ROUTE_NOT_FOUND');
    assert.ok(response.body.meta.timestamp);
  });
});
