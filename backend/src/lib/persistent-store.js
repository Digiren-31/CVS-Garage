import { existsSync, mkdirSync, readFileSync, renameSync, writeFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

const backendRoot = fileURLToPath(new URL('../..', import.meta.url));

function clone(value) {
  return structuredClone(value);
}

export function createPersistentStore(name, createSeed, options = {}) {
  const dataDirectory =
    options.dataDirectory || process.env.CVS_DATA_DIR || join(backendRoot, 'data');
  const filePath = join(dataDirectory, `${name}.json`);
  const isPersistent = options.persistent ?? process.env.NODE_ENV !== 'test';

  let state = createSeed();

  if (isPersistent && existsSync(filePath)) {
    const raw = readFileSync(filePath, 'utf8');
    state = JSON.parse(raw);
  }

  function persist() {
    if (!isPersistent) {
      return;
    }

    mkdirSync(dirname(filePath), { recursive: true });
    const temporaryPath = `${filePath}.tmp`;
    writeFileSync(temporaryPath, `${JSON.stringify(state, null, 2)}\n`, 'utf8');
    renameSync(temporaryPath, filePath);
  }

  function reset() {
    state = createSeed();
    store.state = state;
    persist();
  }

  const store = {
    state,
    persist,
    reset,
    snapshot: () => clone(state)
  };

  return store;
}
