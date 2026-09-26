import { v7 as uuid } from 'uuid';

export const newId = () => uuid();
export const now = () => new Date().toISOString();
export const json = (value, fallback = null) => {
  if (value === null || value === undefined) return fallback;
  try { return JSON.parse(value); } catch { return fallback; }
};
export const iso = (value) => value ? (value.endsWith('Z') || value.includes('+') ? value : `${value.replace(' ', 'T')}Z`) : null;
export class HttpError extends Error {
  constructor(status, code, message) { super(message); this.status = status; this.code = code; }
}
export function ensure(condition, status = 400, code = 'INVALID_REQUEST', message = 'This request is not valid.') {
  if (!condition) throw new HttpError(status, code, message);
}
export function authenticated(ctx) {
  ensure(ctx?.id, 401, 'SIGN_IN_REQUIRED', 'Sign in to continue.');
  return ctx;
}
export function permitted(ctx, permission) {
  authenticated(ctx);
  ensure(ctx.permissions.includes(permission), 403, 'FORBIDDEN', 'Your account does not have permission to do this.');
}
export function hasRole(ctx, ...roles) { return Boolean(ctx?.roles?.some((role) => roles.includes(role))); }
export function parse(schema, body) {
  const result = schema.safeParse(body);
  ensure(result.success, 422, 'VALIDATION_ERROR', result.success ? '' : result.error.issues.map((issue) => `${issue.path.join('.') || 'Input'}: ${issue.message}`).join(' '));
  return result.data;
}
export function pagination(query = {}) {
  const limit = Number(query.limit ?? 24);
  const offset = Number(query.cursor ?? 0);
  ensure(Number.isInteger(limit) && limit >= 1 && limit <= 50 && Number.isInteger(offset) && offset >= 0 && offset <= 10000,
    400, 'INVALID_PAGINATION', 'Use a page size from 1 to 50 and a valid cursor.');
  return { limit, offset };
}
export function page(items, total, limit, offset) {
  return { items, total, hasMore: offset + items.length < total, nextCursor: offset + items.length < total ? String(offset + items.length) : null };
}
export function transaction(db, operation) {
  // Service commands can compose while keeping one outer atomic transaction.
  if (db.isTransaction) return operation();
  db.exec('BEGIN IMMEDIATE');
  try { const result = operation(); db.exec('COMMIT'); return result; }
  catch (error) { db.exec('ROLLBACK'); throw error; }
}
export function audit(db, ctx, category, action, targetId, changes = null, reason = null) {
  db.prepare(`INSERT INTO activity_log
    (id, occurred_at, action, category, outcome, actor_id, actor_type, actor_label, actor_roles_json,
      target_type, target_id, changes_json, reason, request_id)
    VALUES (?, ?, ?, ?, 'success', ?, ?, ?, ?, ?, ?, ?, ?, ?)`).run(
    newId(), now(), action, category, ctx?.id ?? null, ctx?.id ? 'account' : 'system',
    ctx?.member?.displayName ?? 'Campus system', JSON.stringify(ctx?.roles ?? []), category,
    targetId, changes ? JSON.stringify(changes) : null, reason, ctx?.requestId ?? null,
  );
}
export function outbox(db, domain, eventType, aggregateId, payload, sourceKey = newId()) {
  db.prepare(`INSERT INTO integration_outbox
    (id, source_domain, event_type, aggregate_type, aggregate_id, idempotency_key, payload_json, occurred_at)
    VALUES (?, ?, ?, ?, ?, ?, ?, ?) ON CONFLICT(idempotency_key) DO NOTHING`).run(
    newId(), domain, eventType, domain, aggregateId, `${eventType}:${sourceKey}`, JSON.stringify(payload), now(),
  );
}
export function notify(db, ctx, recipientId, message, entityType, entityId) {
  if (recipientId === ctx?.id) return;
  db.prepare(`INSERT INTO notifications
    (id, recipient_id, actor_id, notification_type, entity_type, entity_id, message, created_at)
    VALUES (?, ?, ?, ?, ?, ?, ?, ?)`).run(newId(), recipientId, ctx?.id ?? null, `${entityType}.updated`, entityType, entityId, message, now());
}
export function safeLike(input = '') { return `%${String(input).slice(0, 160).replace(/[\\%_]/g, '\\$&')}%`; }
export function slug(title) { return `${title.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '').slice(0, 80)}-${newId().slice(-8)}`; }
