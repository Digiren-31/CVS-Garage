import { createClient } from '@supabase/supabase-js';

const url = process.env.SUPABASE_URL;
const secretKey = process.env.SUPABASE_SECRET_KEY;
if (!url || !secretKey) {
  throw new Error('SUPABASE_URL and SUPABASE_SECRET_KEY are required.');
}

const client = createClient(url, secretKey, {
  auth: {
    autoRefreshToken: false,
    detectSessionInUrl: false,
    persistSession: false
  }
});

const [
  { data: domains, error: domainError },
  { count: demoCount, error: memberError },
  { data: buckets, error: bucketError }
] = await Promise.all([
  client.from('domain_state').select('domain, version').order('domain'),
  client
    .from('member_profiles')
    .select('id', { count: 'exact', head: true })
    .eq('is_demo', true),
  client.storage.listBuckets()
]);

if (domainError) {
  throw new Error(`Domain-state verification failed: ${domainError.message}`);
}
if (memberError) {
  throw new Error(`Member-profile verification failed: ${memberError.message}`);
}
if (bucketError) {
  throw new Error(`Storage verification failed: ${bucketError.message}`);
}

const expectedDomains = ['events', 'forum', 'idea-centre', 'leaderboards', 'projects'];
const actualDomains = domains.map(({ domain }) => domain).sort();
if (JSON.stringify(actualDomains) !== JSON.stringify(expectedDomains)) {
  throw new Error(`Expected five imported domains; found: ${actualDomains.join(', ') || 'none'}.`);
}
if (demoCount !== 6) {
  throw new Error(`Expected six read-only demo profiles; found ${demoCount ?? 0}.`);
}

const bucketIds = new Set(buckets.map(({ id }) => id));
for (const expectedBucket of ['public-media', 'private-attachments']) {
  if (!bucketIds.has(expectedBucket)) {
    throw new Error(`Missing Storage bucket: ${expectedBucket}`);
  }
}

console.log('Verified 5 domain states, 6 demo profiles, and 2 Storage buckets.');
