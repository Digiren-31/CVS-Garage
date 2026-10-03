import assert from 'node:assert/strict';
import test from 'node:test';
import { MediaError, mediaService } from '../src/modules/media/media.service.js';

const member = {
  id: 'mem-student-1',
  roles: ['Student'],
  status: 'active'
};

function isMediaError(code) {
  return (error) => error instanceof MediaError && error.code === code;
}

test('media upload validation fails before any storage request', async (t) => {
  await t.test('blocks executable content', async () => {
    await assert.rejects(
      mediaService.createUploadIntent(
        {
          category: 'forum-attachment',
          originalName: 'run.exe',
          mimeType: 'application/x-msdownload',
          sizeBytes: 1024
        },
        member,
        '00000000-0000-0000-0000-000000000001'
      ),
      isMediaError('UNSUPPORTED_MEDIA_TYPE')
    );
  });

  await t.test('enforces the five megabyte image limit in attachment buckets', async () => {
    await assert.rejects(
      mediaService.createUploadIntent(
        {
          category: 'forum-attachment',
          originalName: 'large.png',
          mimeType: 'image/png',
          sizeBytes: 5 * 1024 * 1024 + 1
        },
        member,
        '00000000-0000-0000-0000-000000000001'
      ),
      isMediaError('FILE_TOO_LARGE')
    );
  });

  await t.test('rejects path-like original file names', async () => {
    await assert.rejects(
      mediaService.createUploadIntent(
        {
          category: 'avatar',
          originalName: '../avatar.png',
          mimeType: 'image/png',
          sizeBytes: 1024
        },
        member,
        '00000000-0000-0000-0000-000000000001'
      ),
      isMediaError('VALIDATION_ERROR')
    );
  });
});
