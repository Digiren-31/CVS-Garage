import { eventInput, registrationInput } from '@cvs-garage/contracts/schema';
import { newId, now, iso, json, ensure, authenticated, parse, transaction, audit, outbox, pagination, page, safeLike, slug } from './core.js';

const published = ['Published', 'Ongoing', 'Completed'];
export class EventsRepository {
  constructor(db, members) { this.db = db; this.members = members; }
  canManage(row, ctx) { return Boolean(ctx && (ctx.id === row.organizer_id || ctx.permissions.includes('event:review'))); }
  row(id) { const row = this.db.prepare('SELECT * FROM events WHERE id = ?').get(id); ensure(row, 404, 'NOT_FOUND', 'Event not found.'); return row; }
  event(row, ctx) {
    const canManage = this.canManage(row, ctx);
    ensure(published.includes(row.status) || canManage, 404, 'NOT_FOUND', 'Event not found.');
    const reg = ctx ? this.db.prepare("SELECT * FROM event_registrations WHERE event_id = ? AND account_id = ? AND status != 'Cancelled' ORDER BY registered_at DESC LIMIT 1").get(row.id, ctx.id) : null;
    const count = this.db.prepare("SELECT COUNT(*) total FROM event_registrations WHERE event_id = ? AND status IN ('Registered', 'Attended') AND participant_role IN ('Participant', 'Audience')").get(row.id).total;
    const location = json(row.location_json, {});
    if (!canManage && (!reg || !['Registered', 'Attended'].includes(reg.status))) delete location.meetingUrl;
    const current = now();
    const registrationState = !['Published', 'Ongoing'].includes(row.status) || current > iso(row.registration_ends_at) ? 'closed' : current < iso(row.registration_starts_at) ? 'not_started' : row.max_capacity && count >= row.max_capacity ? 'full' : 'open';
    return {
      id: row.id, title: row.title, shortSummary: row.short_summary, fullDescription: row.full_description,
      category: row.category, mode: row.mode, status: row.status, organizerName: this.members.publicMember(row.organizer_id)?.displayName ?? 'Campus organization', organizerId: row.organizer_id,
      startsAt: iso(row.starts_at), endsAt: iso(row.ends_at), registrationStartsAt: iso(row.registration_starts_at), registrationEndsAt: iso(row.registration_ends_at), location,
      maxCapacity: row.max_capacity, registrationCount: count, allowAudience: Boolean(row.allow_audience), allowJudgeApplications: Boolean(row.allow_judge_applications),
      registration: reg ? { id: reg.id, role: reg.participant_role, status: reg.status } : null, registrationState,
      rules: json(row.rules_json, []), questions: json(row.registration_questions_json, []), canManage,
      schedule: this.db.prepare('SELECT id, title, starts_at, ends_at, speaker_or_host FROM event_schedule_items WHERE event_id = ? ORDER BY starts_at LIMIT 60').all(row.id).map((r) => ({ id: r.id, title: r.title, startsAt: iso(r.starts_at), endsAt: iso(r.ends_at), speaker: r.speaker_or_host })),
      prizes: this.db.prepare('SELECT position, title, reward_description description FROM event_prizes WHERE event_id = ? ORDER BY position').all(row.id),
      subtracks: this.db.prepare('SELECT id, title, description FROM event_subtracks WHERE event_id = ?').all(row.id),
    };
  }
  get(id, ctx) { return this.event(this.row(id), ctx); }
  list(query = {}, ctx = null) {
    const { limit, offset } = pagination(query); const params = [safeLike(query.q)]; const clauses = ["e.title LIKE ? ESCAPE '\\'"];
    if (query.scope === 'manage') { authenticated(ctx); clauses.push('(? = 1 OR e.organizer_id = ?)'); params.push(Number(ctx.permissions.includes('event:review')), ctx.id); }
    else clauses.push("e.status IN ('Published', 'Ongoing', 'Completed')");
    if (query.scope === 'mine') { authenticated(ctx); clauses.push("EXISTS (SELECT 1 FROM event_registrations r WHERE r.event_id = e.id AND r.account_id = ? AND r.status != 'Cancelled')"); params.push(ctx.id); }
    if (query.category) { clauses.push('e.category = ?'); params.push(query.category); }
    if (query.mode) { clauses.push('e.mode = ?'); params.push(query.mode); }
    if (query.time === 'upcoming') { clauses.push('e.ends_at > ?'); params.push(now()); }
    if (query.time === 'past') { clauses.push('e.ends_at <= ?'); params.push(now()); }
    const where = clauses.join(' AND ');
    const total = this.db.prepare(`SELECT COUNT(*) total FROM events e WHERE ${where}`).get(...params).total;
    const rows = this.db.prepare(`SELECT e.* FROM events e WHERE ${where} ORDER BY e.starts_at, e.id LIMIT ? OFFSET ?`).all(...params, limit, offset);
    return page(rows.map((r) => this.event(r, ctx)), total, limit, offset);
  }
  create(body, ctx) {
    authenticated(ctx); ensure(ctx.roles.includes('organization') || ctx.roles.includes('admin'), 403, 'FORBIDDEN', 'Event creation is available to organizations and administrators.');
    const data = parse(eventInput, body);
    ensure(data.startsAt > now() && data.registrationEndsAt > now(), 422, 'INVALID_DATES', 'Choose future event and registration dates.');
    return transaction(this.db, () => {
      const id = newId();
      this.db.prepare(`INSERT INTO events (id, slug, title, short_summary, full_description, category, mode, organizer_id, registration_starts_at, registration_ends_at, starts_at, ends_at, location_json, max_capacity, allow_audience, allow_judge_applications, created_at, updated_at)
        VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`).run(id, slug(data.title), data.title, data.shortSummary, data.fullDescription, data.category, data.mode, ctx.id, now(), data.registrationEndsAt, data.startsAt, data.endsAt, JSON.stringify(data.mode === 'Online' ? { platformName: data.venue } : { venue: data.venue }), data.maxCapacity, Number(data.allowAudience), Number(data.allowJudgeApplications), now(), now());
      audit(this.db, ctx, 'events', 'event.created', id); return this.get(id, ctx);
    });
  }
  transition(id, body, ctx) {
    authenticated(ctx);
    return transaction(this.db, () => {
      const event = this.row(id); const review = ctx.permissions.includes('event:review'); const owner = ctx.id === event.organizer_id;
      const rules = { submit: [['Draft', 'ChangesRequested'], 'Submitted', owner], publish: [['Submitted', 'UnderReview'], 'Published', review], request_changes: [['Submitted', 'UnderReview'], 'ChangesRequested', review], reject: [['Submitted', 'UnderReview'], 'Rejected', review], start: [['Published'], 'Ongoing', owner || review], complete: [['Ongoing'], 'Completed', owner || review], archive: [['Completed', 'Rejected'], 'Archived', owner || review] };
      const rule = rules[body.action]; ensure(rule && rule[2], 403, 'FORBIDDEN', 'You cannot make this event transition.');
      ensure(rule[0].includes(event.status), 409, 'INVALID_STATE', 'The event is not in the required state.');
      if (body.action === 'start') ensure(iso(event.starts_at) <= now(), 409, 'TOO_EARLY', 'The event has not started yet.');
      if (body.action === 'complete') ensure(iso(event.ends_at) <= now(), 409, 'TOO_EARLY', 'The event has not ended yet.');
      this.db.prepare('UPDATE events SET status = ?, updated_at = ? WHERE id = ?').run(rule[1], now(), id);
      audit(this.db, ctx, 'events', `event.${body.action}`, id, { status: rule[1] }); outbox(this.db, 'events', 'event.status_changed', id, { status: rule[1] }); return this.get(id, ctx);
    });
  }
  register(id, body, ctx) {
    authenticated(ctx); const data = parse(registrationInput, body);
    return transaction(this.db, () => {
      const row = this.row(id); const event = this.event(row, ctx);
      ensure(event.registrationState === 'open' || event.registrationState === 'full', 409, 'REGISTRATION_CLOSED', 'Registration is not open for this event.');
      ensure(!event.registration, 409, 'ALREADY_REGISTERED', 'You already have a registration for this event.');
      ensure(data.role !== 'Audience' || row.allow_audience, 403, 'ROLE_UNAVAILABLE', 'Audience registration is not available.');
      ensure(data.role !== 'Judge' || row.allow_judge_applications, 403, 'ROLE_UNAVAILABLE', 'Judge applications are not available.');
      ensure(data.role === 'Judge' || event.registrationState !== 'full', 409, 'EVENT_FULL', 'This event has reached capacity.');
      for (const q of event.questions) if (q.required) ensure(data.answers[q.id]?.trim(), 422, 'ANSWER_REQUIRED', `Please answer: ${q.question}`);
      const status = data.role === 'Judge' ? 'PendingApproval' : 'Registered';
      const registrationId = newId();
      this.db.prepare(`INSERT INTO event_registrations (id, event_id, account_id, participant_role, status, answers_json, registered_at, updated_at)
        VALUES (?, ?, ?, ?, ?, ?, ?, ?) ON CONFLICT(event_id, account_id, participant_role) DO UPDATE SET status = excluded.status, answers_json = excluded.answers_json, registered_at = excluded.registered_at, updated_at = excluded.updated_at`).run(registrationId, id, ctx.id, data.role, status, JSON.stringify(data.answers), now(), now());
      audit(this.db, ctx, 'events', 'event.registered', id, { role: data.role, status }); outbox(this.db, 'events', 'event.registered', id, { accountId: ctx.id, role: data.role }); return this.get(id, ctx);
    });
  }
  cancelRegistration(id, ctx) {
    authenticated(ctx);
    return transaction(this.db, () => {
      const event = this.row(id); ensure(!['Completed', 'Archived'].includes(event.status), 409, 'EVENT_ENDED', 'A completed event registration cannot be cancelled.');
      const result = this.db.prepare("UPDATE event_registrations SET status = 'Cancelled', updated_at = ? WHERE event_id = ? AND account_id = ? AND status IN ('Registered', 'PendingApproval', 'Waitlisted')").run(now(), id, ctx.id);
      ensure(result.changes, 404, 'NOT_FOUND', 'No cancellable registration was found.');
      audit(this.db, ctx, 'events', 'event.registration_cancelled', id); return this.get(id, ctx);
    });
  }
}
