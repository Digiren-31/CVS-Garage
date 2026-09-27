import test from 'node:test';
import assert from 'node:assert/strict';
import { ForumService } from '../src/modules/forum/forum.service.js';
import { ForumStore } from '../src/modules/forum/forum.store.js';
import { memberService } from '../src/integrations/member.service.js';

test('Forum validation and authorization rules', async (t) => {
  const store = new ForumStore();
  const service = new ForumService(store);
  const student = await memberService.getMemberById('mem-student-1');

  await t.test('rejects unsupported or incomplete posts', async () => {
    await assert.rejects(
      service.createPost(
        {
          postType: 'unsupported',
          title: 'A sufficiently clear title',
          content: 'A sufficiently detailed discussion body.'
        },
        student
      ),
      /Unsupported discussion type/
    );

    await assert.rejects(
      service.createPost(
        {
          postType: 'question',
          title: 'Short',
          content: 'A sufficiently detailed discussion body.'
        },
        student
      ),
      /between 8 and 180/
    );
  });

  await t.test('rejects links to unknown domain records', async () => {
    await assert.rejects(
      service.createPost(
        {
          postType: 'question',
          title: 'Can this be connected to a missing project?',
          content: 'The backend should reject an unknown cross-domain reference.',
          linkedProjectId: 'missing-project'
        },
        student
      ),
      /Linked project not found/
    );
  });

  await t.test('rejects replies on locked discussions', async () => {
    const post = store.posts[0];
    post.isLocked = true;

    await assert.rejects(
      service.createReply(post.id, { content: 'This reply should not be accepted.' }, student),
      /discussion is locked/
    );
  });

  await t.test('rejects reports for missing targets', async () => {
    await assert.rejects(
      service.createReport(
        {
          targetType: 'post',
          targetId: 'missing-post',
          reason: 'spam'
        },
        student
      ),
      /Report target not found/
    );
  });
});
