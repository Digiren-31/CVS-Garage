import { existsSync, mkdirSync, readFileSync, renameSync, writeFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { isSupabaseEnabled } from './config.js';
import { getSupabaseAdminClient } from './supabase.js';

const backendRoot = fileURLToPath(new URL('../..', import.meta.url));
const registeredStores = new Set();

function clone(value) {
  return structuredClone(value);
}

function replaceState(target, source) {
  for (const [key, value] of Object.entries(source)) {
    if (Array.isArray(target[key]) && Array.isArray(value)) {
      target[key].splice(0, target[key].length, ...clone(value));
    } else if (
      target[key] &&
      value &&
      typeof target[key] === 'object' &&
      typeof value === 'object' &&
      !Array.isArray(value)
    ) {
      replaceState(target[key], value);
    } else {
      target[key] = clone(value);
    }
  }
}

function readLocalState(filePath, fallback) {
  if (!existsSync(filePath)) {
    return fallback;
  }
  const raw = readFileSync(filePath, 'utf8');
  return JSON.parse(raw);
}

function createSupabaseStore(name, initialState) {
  const client = getSupabaseAdminClient();
  if (!client) {
    throw new Error('Supabase state store requested without Supabase configuration.');
  }

  let version = 0;
  let initialized = false;
  let queue = Promise.resolve();
  let committedState = clone(initialState);
  let generation = 0;
  const state = initialState;

  async function initialize() {
    if (initialized) {
      return;
    }

    const { data, error } = await client
      .from('domain_state')
      .select('state, version')
      .eq('domain', name)
      .maybeSingle();

    if (error) {
      throw new Error(`Could not load ${name} state from Supabase: ${error.message}`);
    }

    if (data) {
      replaceState(state, data.state);
      version = Number(data.version);
    } else {
      const { data: savedVersion, error: saveError } = await client.rpc('save_domain_state', {
        domain_name: name,
        expected_version: 0,
        next_state: clone(state)
      });
      if (saveError) {
        throw new Error(`Could not initialize ${name} state in Supabase: ${saveError.message}`);
      }
      version = Number(savedVersion);
    }
    committedState = clone(state);
    initialized = true;
  }

  async function save(snapshot, context) {
    await initialize();
    const { data: savedVersion, error } = await client.rpc('save_domain_state', {
      domain_name: name,
      expected_version: version,
      next_state: snapshot,
      actor_id: context.actorId || null,
      realtime_topic: context.realtimeTopic || null,
      realtime_event_type: context.eventType || null,
      realtime_record_id: context.recordId || null,
      realtime_payload: context.payload || {}
    });

    if (!error) {
      version = Number(savedVersion);
      return;
    }

    if (error.code === '40001') {
      initialized = false;
      await initialize();
      throw new Error(
        `The ${name} data changed during this request. Reload the page and try again.`
      );
    }
    throw new Error(`Could not save ${name} state to Supabase: ${error.message}`);
  }

  const store = {
    state,
    initialize,
    persist(context = {}) {
      const snapshot = clone(state);
      const operationGeneration = generation;
      const operation = queue.then(async () => {
        if (operationGeneration !== generation) {
          throw new Error(
            `The ${name} write was cancelled after an earlier persistence failure. Retry the request.`
          );
        }

        try {
          await save(snapshot, context);
          committedState = clone(snapshot);
        } catch (error) {
          generation += 1;
          replaceState(state, committedState);
          throw error;
        }
      });
      queue = operation.catch(() => undefined);
      return operation;
    },
    async reset() {
      throw new Error('Reset is disabled for Supabase-backed state.');
    },
    snapshot: () => clone(state)
  };

  registeredStores.add(store);
  return store;
}

export function createPersistentStore(name, createSeed, options = {}) {
  const dataDirectory =
    options.dataDirectory || process.env.CVS_DATA_DIR || join(backendRoot, 'data');
  const filePath = join(dataDirectory, `${name}.json`);
  const isPersistent = options.persistent ?? process.env.NODE_ENV !== 'test';

  let state = createSeed();

  if (isPersistent && existsSync(filePath)) {
    state = readLocalState(filePath, state);
  }

  if (isPersistent && isSupabaseEnabled() && name !== 'member-centre') {
    return createSupabaseStore(name, state);
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

export async function initializePersistentStores() {
  await Promise.all([...registeredStores].map((store) => store.initialize()));
}
