import test from 'node:test';
import assert from 'node:assert/strict';
import { mkdtempSync, rmSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { createPersistentStore } from '../src/lib/persistent-store.js';

test('persistent store writes atomically reloadable local state', () => {
  const dataDirectory = mkdtempSync(join(tmpdir(), 'cvs-garage-store-'));

  try {
    const first = createPersistentStore(
      'example',
      () => ({ count: 1 }),
      { dataDirectory, persistent: true }
    );
    first.state.count = 2;
    first.persist();

    const second = createPersistentStore(
      'example',
      () => ({ count: 1 }),
      { dataDirectory, persistent: true }
    );
    assert.equal(second.state.count, 2);

    second.reset();
    assert.equal(second.state.count, 1);
  } finally {
    rmSync(dataDirectory, { recursive: true, force: true });
  }
});
