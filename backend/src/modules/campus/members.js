import { createHash, randomBytes } from 'node:crypto';
import { verify, hash } from '@node-rs/argon2';
import { profileInput, signInInput, reasonInput } from '@cvs-garage/contracts/schema';
import { newId, now, json, iso, ensure, authenticated, permitted, parse, transaction, audit, notify, pagination, page, safeLike, slug } from './core.js';

export const tokenHash = (token) => createHash('sha256').update(token).digest('hex');
const cookieName = 'cvs_session';
export class MembersRepository {
  constructor(db) { this.db = db; }

  publicMember(id) {
    const row = this.db.prepare(`SELECT a.id, p.display_name, p.headline, p.bio, p.avatar_url,
      p.skills_json, p.links_json, d.name department, y.label academic_year
      FROM accounts a JOIN member_profiles p ON p.account_id = a.id
      LEFT JOIN departments d ON d.id = p.department_id
      LEFT JOIN academic_years y ON y.id = p.academic_year_id
      WHERE a.id = ? AND a.deleted_at IS NULL AND a.status = 'active'`).get(id);
    if (!row) return null;
    return {
      id: row.id, displayName: row.display_name, headline: row.headline ?? '', bio: row.bio ?? '',
      department: row.department ?? 'Campus community', academicYear: row.academic_year ?? '',
      avatarUrl: row.avatar_url, skills: json(row.skills_json, []), links: json(row.links_json, {}),
      roles: this.db.prepare(`SELECT r.role_key FROM account_roles ar JOIN roles r ON r.id = ar.role_id
        WHERE ar.account_id = ? AND ar.revoked_at IS NULL ORDER BY r.precedence DESC`).all(id).map((r) => r.role_key),
    };
  }

  context(req) {
    const raw = (req.headers.cookie ?? '').split(';').map((c) => c.trim()).find((c) => c.startsWith(`${cookieName}=`))?.slice(cookieName.length + 1);
    if (!raw || !/^[a-f0-9]{64}$/.test(raw)) return null;
    const session = this.db.prepare(`SELECT s.id, s.account_id FROM auth_sessions s JOIN accounts a ON a.id = s.account_id
      WHERE s.refresh_token_hash = ? AND s.revoked_at IS NULL AND s.expires_at > ? AND a.status = 'active' AND a.deleted_at IS NULL`).get(tokenHash(raw), now());
    if (!session) return null;
    const member = this.publicMember(session.account_id);
    if (!member) return null;
    const permissions = this.db.prepare(`SELECT DISTINCT rp.permission_key FROM account_roles ar
      JOIN role_permissions rp ON rp.role_id = ar.role_id WHERE ar.account_id = ? AND ar.revoked_at IS NULL`).all(member.id).map((r) => r.permission_key);
    return { id: member.id, member, roles: member.roles, permissions, sessionId: session.id, requestId: req.requestId };
  }

  createSession(accountId, req, res) {
    const token = randomBytes(32).toString('hex');
    const expiresAt = new Date(Date.now() + 8 * 60 * 60 * 1000).toISOString();
    transaction(this.db, () => {
      if (req.ctx) this.db.prepare('UPDATE auth_sessions SET revoked_at = ? WHERE id = ?').run(now(), req.ctx.sessionId);
      this.db.prepare(`INSERT INTO auth_sessions (id, account_id, refresh_token_hash, user_agent, created_at, expires_at)
        VALUES (?, ?, ?, ?, ?, ?)`).run(newId(), accountId, tokenHash(token), String(req.headers['user-agent'] ?? '').slice(0, 240), now(), expiresAt);
      this.db.prepare('UPDATE accounts SET last_login_at = ?, failed_login_count = 0, locked_until = NULL WHERE id = ?').run(now(), accountId);
      audit(this.db, { id: accountId, member: this.publicMember(accountId), roles: this.publicMember(accountId)?.roles }, 'auth', 'auth.sign_in', accountId);
    });
    res.cookie(cookieName, token, { httpOnly: true, sameSite: 'lax', secure: process.env.NODE_ENV === 'production', path: '/', maxAge: 8 * 60 * 60 * 1000 });
    return { signedIn: true };
  }

  async signIn(body, req, res) {
    const data = parse(signInInput, body);
    const account = this.db.prepare('SELECT * FROM accounts WHERE email = ? AND deleted_at IS NULL').get(data.email);
    // A fixed-cost dummy hash prevents a fast path that reveals whether an email exists.
    this.dummyHash ??= hash(randomBytes(32).toString('hex'), { memoryCost: 19456, timeCost: 2, parallelism: 1 });
    let correct = false;
    try { correct = await verify(account?.password_hash ?? await this.dummyHash, data.password); } catch { /* Treat malformed hashes as failed sign-in. */ }
    const locked = account?.locked_until && account.locked_until > now();
    if (!account || !correct || locked || account.status !== 'active') {
      if (account && !locked) transaction(this.db, () => {
        this.db.prepare(`UPDATE accounts SET failed_login_count = failed_login_count + 1,
          locked_until = CASE WHEN failed_login_count >= 4 THEN ? ELSE locked_until END WHERE id = ?`).run(new Date(Date.now() + 15 * 60000).toISOString(), account.id);
      });
      ensure(false, 401, 'SIGN_IN_FAILED', 'Unable to sign in. Check your details or contact your campus administrator.');
    }
    return this.createSession(account.id, req, res);
  }

  signOut(ctx, res) {
    if (ctx) transaction(this.db, () => {
      this.db.prepare('UPDATE auth_sessions SET revoked_at = ? WHERE id = ?').run(now(), ctx.sessionId);
      audit(this.db, ctx, 'auth', 'auth.sign_out', ctx.id);
    });
    res.clearCookie(cookieName, { httpOnly: true, sameSite: 'lax', secure: process.env.NODE_ENV === 'production', path: '/' });
    return { signedOut: true };
  }

  profile(ctx) {
    authenticated(ctx);
    const activity = this.db.prepare(`SELECT id, action, category, occurred_at FROM activity_log WHERE actor_id = ? ORDER BY occurred_at DESC LIMIT 20`).all(ctx.id)
      .map((r) => ({ id: r.id, action: r.action, category: r.category, occurredAt: iso(r.occurred_at) }));
    const sessions = this.db.prepare(`SELECT id, user_agent, created_at, expires_at FROM auth_sessions
      WHERE account_id = ? AND revoked_at IS NULL AND expires_at > ? ORDER BY created_at DESC LIMIT 20`).all(ctx.id, now())
      .map((r) => ({ id: r.id, userAgent: r.user_agent, createdAt: iso(r.created_at), expiresAt: iso(r.expires_at), current: r.id === ctx.sessionId }));
    return { member: this.publicMember(ctx.id), activity, sessions };
  }

  updateProfile(body, ctx) {
    permitted(ctx, 'profile:write:self');
    const data = parse(profileInput, body);
    transaction(this.db, () => {
      this.db.prepare(`UPDATE member_profiles SET display_name = ?, headline = ?, bio = ?, skills_json = ?, links_json = ?, updated_at = ? WHERE account_id = ?`)
        .run(data.displayName, data.headline, data.bio, JSON.stringify(data.skills), JSON.stringify(data.links), now(), ctx.id);
      audit(this.db, ctx, 'profile', 'profile.updated', ctx.id);
    });
    return this.publicMember(ctx.id);
  }

  revokeSession(id, ctx) {
    authenticated(ctx);
    transaction(this.db, () => {
      const result = this.db.prepare('UPDATE auth_sessions SET revoked_at = ? WHERE id = ? AND account_id = ? AND revoked_at IS NULL').run(now(), id, ctx.id);
      ensure(result.changes, 404, 'NOT_FOUND', 'This session is no longer active.');
      audit(this.db, ctx, 'auth', 'auth.session_revoked', id);
    });
    return { revoked: true };
  }

  directory(query = {}) {
    const { limit, offset } = pagination(query);
    const params = [safeLike(query.q), query.role === 'mentor' ? 'mentor' : ''];
    const where = `a.status = 'active' AND a.deleted_at IS NULL AND (p.display_name LIKE ? ESCAPE '\\')
      AND (? = '' OR EXISTS (SELECT 1 FROM account_roles ar JOIN roles r ON r.id = ar.role_id WHERE ar.account_id = a.id AND ar.revoked_at IS NULL AND r.role_key = 'mentor'))`;
    const rows = this.db.prepare(`SELECT a.id FROM accounts a JOIN member_profiles p ON p.account_id = a.id WHERE ${where} ORDER BY p.display_name, a.id LIMIT ? OFFSET ?`).all(...params, limit, offset);
    const total = this.db.prepare(`SELECT COUNT(*) total FROM accounts a JOIN member_profiles p ON p.account_id = a.id WHERE ${where}`).get(...params).total;
    return page(rows.map((r) => this.publicMember(r.id)), total, limit, offset);
  }

  listAdmin(query, ctx) {
    permitted(ctx, 'member:list');
    const { limit, offset } = pagination(query);
    const rows = this.db.prepare(`SELECT a.id, a.email, a.status, p.display_name FROM accounts a JOIN member_profiles p ON p.account_id = a.id
      WHERE a.deleted_at IS NULL AND (p.display_name LIKE ? ESCAPE '\\' OR a.email LIKE ? ESCAPE '\\') AND (? = '' OR a.status = ?)
      ORDER BY a.created_at DESC, a.id DESC LIMIT ? OFFSET ?`).all(safeLike(query.q), safeLike(query.q), query.status ?? '', query.status ?? '', limit, offset);
    const total = this.db.prepare(`SELECT COUNT(*) total FROM accounts a JOIN member_profiles p ON p.account_id = a.id
      WHERE a.deleted_at IS NULL AND (p.display_name LIKE ? ESCAPE '\\' OR a.email LIKE ? ESCAPE '\\') AND (? = '' OR a.status = ?)`)
      .get(safeLike(query.q), safeLike(query.q), query.status ?? '', query.status ?? '').total;
    const stats = this.db.prepare('SELECT status, COUNT(*) total FROM accounts WHERE deleted_at IS NULL GROUP BY status').all();
    return { ...page(rows.map((r) => ({ id: r.id, displayName: r.display_name, email: r.email, status: r.status,
      roles: this.db.prepare(`SELECT r.role_key FROM account_roles ar JOIN roles r ON r.id = ar.role_id WHERE ar.account_id = ? AND ar.revoked_at IS NULL`).all(r.id).map((v) => v.role_key) })), total, limit, offset), stats };
  }

  changeStatus(id, body, ctx) {
    permitted(ctx, 'member:status:write');
    const { reason } = parse(reasonInput, { reason: body.reason });
    ensure(['active', 'suspended'].includes(body.status), 422, 'INVALID_STATUS', 'Choose active or suspended.');
    ensure(id !== ctx.id, 403, 'SELF_MODIFICATION', 'You cannot change your own account status.');
    transaction(this.db, () => {
      const account = this.db.prepare('SELECT id, status FROM accounts WHERE id = ? AND deleted_at IS NULL').get(id);
      ensure(account, 404, 'NOT_FOUND', 'Member not found.');
      ensure(['active', 'suspended'].includes(account.status), 409, 'INVALID_TRANSITION', 'This account needs the verification or recovery workflow.');
      this.db.prepare('UPDATE accounts SET status = ?, status_reason = ?, updated_at = ? WHERE id = ?').run(body.status, reason, now(), id);
      if (body.status === 'suspended') this.db.prepare('UPDATE auth_sessions SET revoked_at = ? WHERE account_id = ? AND revoked_at IS NULL').run(now(), id);
      audit(this.db, ctx, 'admin', 'member.status_changed', id, { status: { from: account.status, to: body.status } }, reason);
    });
    return { updated: true };
  }

  mentorRole(id, body, ctx) {
    permitted(ctx, body.grant ? 'role:grant' : 'role:revoke');
    const { reason } = parse(reasonInput, { reason: body.reason });
    ensure(typeof body.grant === 'boolean', 422, 'INVALID_INPUT', 'Specify whether to grant or revoke mentorship.');
    ensure(id !== ctx.id, 403, 'SELF_MODIFICATION', 'You cannot review your own mentorship.');
    transaction(this.db, () => {
      ensure(this.publicMember(id), 404, 'NOT_FOUND', 'Active member not found.');
      if (body.grant) {
        const existing = this.db.prepare(`SELECT id FROM account_roles WHERE account_id = ? AND role_id = 'role-mentor' AND revoked_at IS NULL`).get(id);
        if (existing) return;
        this.db.prepare(`INSERT INTO mentor_applications (id, account_id, status, origin, reviewed_by, decision_at, reasons_json, created_at, updated_at)
          VALUES (?, ?, 'approved', 'admin_initiated', ?, ?, ?, ?, ?)`).run(newId(), id, ctx.id, now(), JSON.stringify([reason]), now(), now());
        this.db.prepare(`INSERT INTO account_roles (id, account_id, role_id, granted_by, grant_reason, granted_at)
          VALUES (?, ?, 'role-mentor', ?, 'admin_manual', ?)`).run(newId(), id, ctx.id, now());
      } else this.db.prepare(`UPDATE account_roles SET revoked_at = ?, revoked_by = ?, revoke_reason = ? WHERE account_id = ? AND role_id = 'role-mentor' AND revoked_at IS NULL`).run(now(), ctx.id, reason, id);
      audit(this.db, ctx, 'role', body.grant ? 'mentor.granted' : 'mentor.revoked', id, null, reason);
      notify(this.db, ctx, id, body.grant ? 'Your mentor role has been approved.' : 'Your mentor role has been updated.', 'member-centre', id);
    });
    return { updated: true };
  }

  createTeam(title, ownerId) {
    const id = newId();
    this.db.prepare('INSERT INTO teams (id, name, slug, created_by, created_at, updated_at) VALUES (?, ?, ?, ?, ?, ?)').run(id, title, slug(title), ownerId, now(), now());
    this.db.prepare(`INSERT INTO team_memberships (id, team_id, account_id, role, joined_at) VALUES (?, ?, ?, 'lead', ?)`).run(newId(), id, ownerId, now());
    return id;
  }

  notifications(ctx) {
    authenticated(ctx);
    return this.db.prepare('SELECT * FROM notifications WHERE recipient_id = ? ORDER BY created_at DESC LIMIT 30').all(ctx.id).map((r) => ({
      id: r.id, message: r.message, createdAt: iso(r.created_at), readAt: iso(r.read_at),
      href: r.entity_type === 'ideas' ? `/ideas/${r.entity_id}` : r.entity_type === 'events' ? `/events/${r.entity_id}` : r.entity_type === 'forum' ? `/forum/${r.entity_id}` : r.entity_type === 'projects' ? `/projects/${r.entity_id}` : '/members',
    }));
  }

  readNotification(id, ctx) {
    authenticated(ctx);
    transaction(this.db, () => {
      const result = this.db.prepare('UPDATE notifications SET read_at = COALESCE(read_at, ?) WHERE id = ? AND recipient_id = ?').run(now(), id, ctx.id);
      ensure(result.changes, 404, 'NOT_FOUND', 'Notification not found.');
    });
    return { read: true };
  }
}
