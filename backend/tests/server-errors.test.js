import test from 'node:test';
import assert from 'node:assert/strict';
import request from 'supertest';
import app from '../src/server.js';
import { memberService } from '../src/integrations/member.service.js';
import { forumService } from '../src/modules/forum/forum.service.js';

test('server error contracts', async (t) => {
  await t.test('rejects malformed JSON with a stable error envelope', async () => {
    const response = await request(app)
      .post('/api/v1/forum/posts')
      .set('Content-Type', 'application/json')
      .send('{"title":')
      .expect(400);

    assert.equal(response.body.success, false);
    assert.equal(response.body.data, null);
    assert.equal(response.body.error.code, 'INVALID_JSON');
  });

  await t.test('rejects an unknown development identity on protected actions', async () => {
    const response = await request(app)
      .post('/api/v1/forum/posts')
      .set('x-user-id', 'missing-member')
      .send({
        postType: 'question',
        title: 'Can an unknown identity create this post?',
        content: 'The API should reject this request before domain mutation.'
      })
      .expect(401);

    assert.equal(response.body.success, false);
    assert.equal(response.body.error.code, 'UNAUTHORIZED');
  });

  await t.test('returns 404 for replies belonging to a deleted post', async () => {
    const member = await memberService.getMemberById('mem-student-1');
    const post = await forumService.createPost(
      {
        postType: 'question',
        title: 'Will deleted discussion replies return not found?',
        content: 'This request verifies the HTTP status for a soft-deleted thread.'
      },
      member
    );
    await forumService.deletePost(post.id, member);

    const response = await request(app)
      .get(`/api/v1/forum/posts/${post.id}/replies`)
      .set('x-user-id', member.id)
      .expect(404);

    assert.equal(response.body.error.code, 'NOT_FOUND');
  });
});
