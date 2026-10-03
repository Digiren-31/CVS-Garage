import { existsSync, readFileSync } from 'node:fs';
import { join } from 'node:path';
import { fileURLToPath } from 'node:url';

process.env.NODE_ENV = 'test';

const backendRoot = fileURLToPath(new URL('..', import.meta.url));
const dataDirectory = process.env.CVS_DATA_DIR || join(backendRoot, 'data');
const force = process.argv.includes('--force');

function readState(name, fallback) {
  const path = join(dataDirectory, `${name}.json`);
  return existsSync(path) ? JSON.parse(readFileSync(path, 'utf8')) : fallback;
}

function forumSeed(store) {
  return Object.fromEntries(
    [
      'categories',
      'tags',
      'communities',
      'communityMembers',
      'posts',
      'replies',
      'votes',
      'bookmarks',
      'follows',
      'ideaExports',
      'contributionEvents',
      'reports',
      'moderationLogs',
      'notifications'
    ].map((key) => [key, structuredClone(store[key])])
  );
}

const [
  { getSupabaseAdminClient },
  { MOCK_MEMBERS },
  { PROJECT_SEEDS },
  { createEventsSeed },
  { createIdeaSeed },
  { createLeaderboardSeed },
  { ForumStore }
] = await Promise.all([
  import('../src/lib/supabase.js'),
  import('../src/modules/member-centre/member.store.js'),
  import('../src/modules/projects/projects.store.js'),
  import('../src/modules/events/events.store.js'),
  import('../src/modules/idea-centre/idea.store.js'),
  import('../src/modules/leaderboards/leaderboard.store.js'),
  import('../src/modules/forum/forum.store.js')
]);

const client = getSupabaseAdminClient();
if (!client) {
  throw new Error('Set SUPABASE_ENABLED=true and provide the Supabase server settings first.');
}

const demoRows = MOCK_MEMBERS.map((member) => ({
  id: member.id,
  auth_user_id: null,
  email: member.email,
  name: member.name,
  avatar_url: member.avatarUrl || null,
  department: member.department,
  batch: member.batch || null,
  bio: member.bio || '',
  skills: member.skills || [],
  mentor_expertise: member.mentorExpertise || [],
  reputation_score: member.reputationScore || 0,
  stats: member.stats || {},
  status: member.status,
  roles: member.roles || [member.role],
  is_demo: true
}));

const { error: memberError } = await client
  .from('member_profiles')
  .upsert(demoRows, { onConflict: 'id' });
if (memberError) {
  throw new Error(`Could not import demo member profiles: ${memberError.message}`);
}

const domainStates = {
  projects: readState('projects', { projects: structuredClone(PROJECT_SEEDS) }),
  events: readState('events', createEventsSeed()),
  'idea-centre': readState('idea-centre', createIdeaSeed()),
  leaderboards: readState('leaderboards', createLeaderboardSeed()),
  forum: readState('forum', forumSeed(new ForumStore({ persistent: false })))
};

for (const [domain, state] of Object.entries(domainStates)) {
  const { data: existing, error: loadError } = await client
    .from('domain_state')
    .select('version')
    .eq('domain', domain)
    .maybeSingle();
  if (loadError) {
    throw new Error(`Could not inspect ${domain} state: ${loadError.message}`);
  }
  if (existing && !force) {
    console.log(`Skipped ${domain}; cloud state already exists. Use --force to replace it.`);
    continue;
  }

  const { error: saveError } = await client.rpc('save_domain_state', {
    domain_name: domain,
    expected_version: existing ? Number(existing.version) : 0,
    next_state: state
  });
  if (saveError) {
    throw new Error(`Could not import ${domain} state: ${saveError.message}`);
  }

  const { error: sourceError } = await client
    .from('domain_state')
    .update({ seed_source: existsSync(join(dataDirectory, `${domain}.json`)) ? 'local-json-import' : 'code-seed' })
    .eq('domain', domain);
  if (sourceError) {
    throw new Error(`Could not record ${domain} import source: ${sourceError.message}`);
  }
  console.log(`Imported ${domain} state.`);
}

console.log(`Imported ${demoRows.length} read-only demo member profiles.`);
