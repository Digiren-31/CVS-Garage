import test, { before, after } from 'node:test';
import assert from 'node:assert/strict';
import { DatabaseSync } from 'node:sqlite';
import { readFileSync } from 'node:fs';
import { randomBytes } from 'node:crypto';
import { createApp } from '../src/app.js';
import { seedDemo } from '../src/database/seed-demo.js';
import { tokenHash } from '../src/modules/campus/members.js';
import { newId, now } from '../src/modules/campus/core.js';

let db, server, base;
const cookies = {};
before(async () => {
  db = new DatabaseSync(':memory:');
  db.exec(readFileSync(new URL('../database/migrations/001_initial.sqlite.sql', import.meta.url), 'utf8'));
  seedDemo(db);
  for (const [role, id] of Object.entries({ student: 'demo-student', mentor: 'demo-neha', other: 'demo-riya', admin: 'demo-admin', organization: 'demo-club' })) {
    const token = randomBytes(32).toString('hex'); cookies[role] = `cvs_session=${token}`;
    db.prepare('INSERT INTO auth_sessions (id, account_id, refresh_token_hash, created_at, expires_at) VALUES (?, ?, ?, ?, ?)').run(newId(), id, tokenHash(token), now(), new Date(Date.now() + 3600000).toISOString());
  }
  server = createApp(db, { demo: true }).listen(0, '127.0.0.1');
  await new Promise((resolve) => server.once('listening', resolve));
  base = `http://127.0.0.1:${server.address().port}/api/v1/campus`;
});
after(async () => { await new Promise((resolve) => server.close(resolve)); db.close(); });
async function api(path, { method = 'GET', role, body, headers = {} } = {}) {
  const response = await fetch(`${base}${path}`, { method, headers: { ...(role ? { Cookie: cookies[role] } : {}), ...(method !== 'GET' ? { 'Content-Type': 'application/json', 'X-CVS-Request': '1' } : {}), ...headers }, body: method !== 'GET' ? JSON.stringify(body ?? {}) : undefined });
  const result = await response.json(); return { status: response.status, ...result };
}

test('public overview returns actual counts and safe public projections', async () => {
  const result = await api('/overview'); assert.equal(result.status, 200); assert.equal(result.data.counts.members, 8); assert.equal(result.data.projects.length, 3);
  assert.equal(JSON.stringify(result.data).includes('@example.invalid'), false); assert.equal(JSON.stringify(result.data).includes('password_hash'), false);
});
test('demo seed is idempotent and database integrity passes', () => {
  seedDemo(db); assert.equal(db.prepare('SELECT COUNT(*) total FROM accounts').get().total, 8);
  assert.deepEqual(db.prepare('PRAGMA foreign_key_check').all(), []);
  assert.equal(db.prepare('PRAGMA integrity_check').get().integrity_check, 'ok');
});
test('sessions do not accept x-user-id or client roles', async () => {
  const result = await api('/session', { headers: { 'x-user-id': 'demo-admin', 'x-role': 'admin' } }); assert.equal(result.data.member, null);
  assert.equal((await api('/members/admin')).status, 401);
  assert.equal((await api('/members/admin', { role: 'student' })).status, 403);
});
test('unsafe origins and missing CSRF headers are rejected', async () => {
  const result = await api('/session/demo', { method: 'POST', headers: { Origin: 'https://untrusted.example' } }); assert.equal(result.status, 403);
  const response = await fetch(`${base}/session/demo`, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: '{}' }); assert.equal(response.status, 403);
});
test('demo sign-in sets an HttpOnly SameSite cookie and always selects student', async () => {
  const response = await fetch(`${base}/session/demo`, { method: 'POST', headers: { 'Content-Type': 'application/json', 'X-CVS-Request': '1' }, body: JSON.stringify({ role: 'admin' }) });
  assert.equal(response.status, 200); const cookie = response.headers.get('set-cookie'); assert.match(cookie, /HttpOnly/); assert.match(cookie, /SameSite=Lax/);
  const session = await api('/session', { headers: { Cookie: cookie.split(';')[0] } }); assert.deepEqual(session.data.member.roles, ['student']);
});
test('private projects are not exposed to visitors or non-members', async () => {
  assert.equal((await api('/projects/demo-campus-map')).status, 403);
  assert.equal((await api('/projects/demo-campus-map', { role: 'student' })).status, 200);
  const pub = await api('/projects/demo-repair'); assert.equal(pub.status, 200); assert.equal(pub.data.milestones.length, 0); assert.equal(pub.data.updates.length, 0);
});
test('pitch validation, review permissions and duplicate approval guard', async () => {
  assert.equal((await api('/projects/pitches', { method: 'POST', role: 'student', body: { title: 'x' } })).status, 422);
  const result = await api('/projects/pitches', { method: 'POST', role: 'student', body: { title: 'A better bike rack', description: 'Research a safer and more accessible bicycle parking area with campus commuters.', category: 'Campus', domain: 'Design' } });
  assert.equal(result.status, 200); const id = result.data.id;
  assert.equal((await api(`/projects/pitches/${id}/review`, { method: 'PATCH', role: 'student', body: { action: 'approve', reason: 'Looks ready to begin.' } })).status, 403);
  const approved = await api(`/projects/pitches/${id}/review`, { method: 'PATCH', role: 'admin', body: { action: 'approve', reason: 'Clear problem and achievable scope.' } }); assert.equal(approved.status, 200);
  const project = await api(`/projects/${approved.data.projectId}`, { role: 'student' }); assert.equal(project.data.milestones.length, 6);
  assert.equal((await api(`/projects/pitches/${id}/review`, { method: 'PATCH', role: 'admin', body: { action: 'approve', reason: 'Second approval attempt.' } })).status, 409);
});
test('final project submission requires both independent signoffs', async () => {
  const result = await api('/projects/demo-campus-map/submit-final', { method: 'POST', role: 'student' }); assert.equal(result.status, 409);
  assert.equal((await api('/projects/demo-campus-map/signoff', { method: 'POST', role: 'student', body: { role: 'committee' } })).status, 403);
});
test('event registration persists, rejects duplicate roles and can be cancelled', async () => {
  const result = await api('/events/demo-build-night/registration', { method: 'POST', role: 'student', body: { role: 'Participant' } }); assert.equal(result.status, 200); assert.equal(result.data.registration.status, 'Registered');
  assert.equal((await api('/events/demo-build-night/registration', { method: 'POST', role: 'student', body: { role: 'Audience' } })).status, 409);
  assert.equal((await api('/events/demo-build-night/registration', { method: 'DELETE', role: 'student' })).status, 200);
});
test('event capacity is checked transactionally', async () => {
  db.prepare("UPDATE events SET max_capacity = 3 WHERE id = 'demo-build-night'").run();
  const result = await api('/events/demo-build-night/registration', { method: 'POST', role: 'student', body: { role: 'Participant' } }); assert.equal(result.status, 409);
  db.prepare("UPDATE events SET max_capacity = 60 WHERE id = 'demo-build-night'").run();
});
test('online meeting links require a confirmed registration', async () => {
  assert.equal((await api('/events/demo-design')).data.location.meetingUrl, undefined);
  await api('/events/demo-design/registration', { method: 'POST', role: 'student', body: { role: 'Participant' } });
  assert.match((await api('/events/demo-design', { role: 'student' })).data.location.meetingUrl, /^https:/);
});
test('judge applications never self-appoint and past events reject registrations', async () => {
  const judge = await api('/events/demo-hacksprint/registration', { method: 'POST', role: 'student', body: { role: 'Judge' } }); assert.equal(judge.data.registration.status, 'PendingApproval');
  assert.equal(db.prepare("SELECT COUNT(*) total FROM event_judges WHERE judge_account_id = 'demo-student'").get().total, 0);
  assert.equal((await api('/events/demo-showcase/registration', { method: 'POST', role: 'student', body: { role: 'Participant' } })).status, 409);
});
test('idea join requests are unique, owner-decided and create memberships', async () => {
  const joined = await api('/ideas/demo-swap/join-requests', { method: 'POST', role: 'student', body: { message: 'I would love to build the first prototype and help with accessibility.', skills: 'React, TypeScript' } }); assert.equal(joined.status, 200);
  assert.equal((await api('/ideas/demo-swap/join-requests', { method: 'POST', role: 'student', body: { message: 'Here is another request to join this project.', skills: 'React' } })).status, 409);
  assert.equal((await api(`/idea-join-requests/${joined.data.id}`, { method: 'PATCH', role: 'student', body: { action: 'accept' } })).status, 403);
  assert.equal((await api(`/idea-join-requests/${joined.data.id}`, { method: 'PATCH', role: 'other', body: { action: 'accept' } })).status, 200);
  assert.equal((await api('/ideas/demo-swap', { role: 'student' })).data.viewerRelation, 'member');
});
test('mentor queue and claims enforce current server roles', async () => {
  assert.equal((await api('/ideas?mentorQueue=true', { role: 'student' })).status, 403);
  const idea = (await api('/ideas/demo-water')).data;
  assert.equal((await api(`/idea-mentorship-requests/${idea.mentorshipRequest.id}/claim`, { method: 'POST', role: 'student' })).status, 403);
  assert.equal((await api(`/idea-mentorship-requests/${idea.mentorshipRequest.id}/claim`, { method: 'POST', role: 'mentor' })).status, 200);
  assert.equal((await api(`/idea-mentorship-requests/${idea.mentorshipRequest.id}/claim`, { method: 'POST', role: 'mentor' })).status, 409);
  assert.equal((await api('/ideas/demo-water/step-down', { method: 'POST', role: 'mentor' })).status, 200);
});
test('idea comments are one level deep and cannot reference another idea', async () => {
  const a = await api('/ideas/demo-quiet/comments', { method: 'POST', role: 'student', body: { content: 'This is a useful starting point.' } });
  const b = await api('/ideas/demo-quiet/comments', { method: 'POST', role: 'other', body: { content: 'Agreed. Let us test it.', parentId: a.data.id } });
  assert.equal(b.status, 200);
  assert.equal((await api('/ideas/demo-quiet/comments', { method: 'POST', role: 'student', body: { content: 'Too deeply nested', parentId: b.data.id } })).status, 422);
  assert.equal((await api('/ideas/demo-swap/comments', { method: 'POST', role: 'student', body: { content: 'Wrong idea', parentId: a.data.id } })).status, 422);
});
test('save operations are idempotent and scoped to the signed-in member', async () => {
  await api('/ideas/demo-swap/save', { method: 'PUT', role: 'student' }); await api('/ideas/demo-swap/save', { method: 'PUT', role: 'student' });
  assert.equal(db.prepare("SELECT COUNT(*) total FROM idea_bookmarks WHERE idea_id = 'demo-swap' AND account_id = 'demo-student'").get().total, 1);
  assert.equal((await api('/ideas/demo-swap', { role: 'other' })).data.isSaved, false);
});
test('forum voting remains normalized across replacements', async () => {
  let r = await api('/forum/demo-first-project/vote', { method: 'PUT', role: 'student', body: { value: 1 } }); assert.equal(r.data.score, 2);
  r = await api('/forum/demo-first-project/vote', { method: 'PUT', role: 'student', body: { value: -1 } }); assert.equal(r.data.score, 0);
  r = await api('/forum/demo-first-project/vote', { method: 'PUT', role: 'student', body: { value: 0 } }); assert.equal(r.data.score, 1);
});
test('only the author can accept an answer from the same question', async () => {
  const reply = await api('/forum/demo-accessible/replies', { method: 'POST', role: 'mentor', body: { content: 'Walk the routes with students using different mobility aids and compare the recorded paths.' } });
  assert.equal((await api('/forum/demo-accessible/accept', { method: 'POST', role: 'other', body: { replyId: reply.data.id } })).status, 403);
  assert.equal((await api('/forum/demo-accessible/accept', { method: 'POST', role: 'student', body: { replyId: 'demo-first-reply' } })).status, 422);
  assert.equal((await api('/forum/demo-accessible/accept', { method: 'POST', role: 'student', body: { replyId: reply.data.id } })).status, 200);
});
test('forum to idea export is one-to-one and audited', async () => {
  const post = await api('/forum', { method: 'POST', role: 'student', body: { title: 'A campus tool library', content: 'Create a small lending library of tools for students working on creative and hardware projects.', postType: 'idea' } });
  assert.equal(post.status, 200);
  const a = await api(`/forum/${post.data.id}/export`, { method: 'POST', role: 'student' }); const b = await api(`/forum/${post.data.id}/export`, { method: 'POST', role: 'student' });
  assert.equal(a.status, 200); assert.equal(b.data.alreadyExported, true); assert.equal(a.data.ideaId, b.data.ideaId);
});
test('rank filters preserve authoritative global ranks and label fixture policy', async () => {
  const all = await api('/rankings'); const filtered = await api('/rankings?department=Computer%20Science'); assert.equal(all.data.isDemo, true);
  const row = filtered.data.items.find((r) => r.member.id === 'demo-student'); assert.equal(row.rank, 4);
});
test('hot mentor grants and revocation take effect without a new session', async () => {
  await api('/members/demo-student/mentor', { method: 'PATCH', role: 'admin', body: { grant: true, reason: 'Reviewed for this isolated test.' } });
  assert.equal((await api('/ideas?mentorQueue=true', { role: 'student' })).status, 200);
  await api('/members/demo-student/mentor', { method: 'PATCH', role: 'admin', body: { grant: false, reason: 'The isolated test is complete.' } });
  assert.equal((await api('/ideas?mentorQueue=true', { role: 'student' })).status, 403);
});
test('admin self-suspension is blocked and suspension revokes sessions atomically', async () => {
  assert.equal((await api('/members/demo-admin/status', { method: 'PATCH', role: 'admin', body: { status: 'suspended', reason: 'Invalid self change.' } })).status, 403);
  assert.equal((await api('/members/demo-riya/status', { method: 'PATCH', role: 'admin', body: { status: 'suspended', reason: 'Testing immediate revocation.' } })).status, 200);
  assert.equal((await api('/session', { role: 'other' })).data.member, null);
});
test('audit entries are append-only; malformed pagination is rejected', async () => {
  assert.throws(() => db.prepare("UPDATE activity_log SET action = 'changed'").run(), /append-only/);
  assert.equal((await api('/ideas?limit=5000')).status, 400);
  assert.deepEqual(db.prepare('PRAGMA foreign_key_check').all(), []);
});
