# Member Centre — Activity Logging Design

**Status:** proposed design. **Owner:** backend team.
**Related:** [schema](01-member-centre-schema.md) ·
[role strategy](02-member-centre-role-strategy.md) ·
[API architecture](03-member-centre-api.md)

## What this log is for

The requirement is a system-wide activity log tracking admin and user actions.
That single sentence covers two audiences with different needs, and the design
is clearer once they are named:

- **Accountability.** Who suspended this account, when, and why. Read by admins
  through the portal, and by whoever investigates a dispute months later.
- **Transparency.** A member seeing their own history — sign-ins, profile
  changes, role changes applied to them.

It is explicitly **not** application logging. Stack traces, performance traces,
and debug output go to the runtime log stream, not here. Mixing them produces a
table too noisy to audit and too structured to debug with. The distinguishing
test: if a non-engineer would ever need to read the row, it belongs here.

## Storage approach

**One append-only relational table, in the primary database, written inside the
same transaction as the change it records.**

The alternatives and why they lose for this service:

| Approach | Why not |
| --- | --- |
| Log shipping to an external store | The admin portal must query, filter, and paginate this data as a first-class screen. A round-trip to an external system for a UI table adds a failure mode and an availability dependency to a core screen. |
| Fire-and-forget async writes | A suspension that succeeds while its audit row is silently dropped is precisely the case the log exists for. |
| Per-table history/shadow tables | Captures *what rows changed*, not *what a person did*. "Admin approved a mentor application" spans three tables and is not recoverable from any one of them. |
| Event sourcing the domain | Genuinely rigorous, disproportionate here. This service has modest write volume and a conventional CRUD shape. |

The transactional guarantee is the load-bearing property: **if the action
committed, the log row committed**. That is worth accepting a small write cost
on every mutation, and it is the property that makes the log admissible as
evidence rather than as a hint.

If volume later outgrows the primary database, the migration path is to keep
recent rows here for the UI and archive older partitions to cold storage —
without changing the write path.

---

## Table: `activity_log`

| Column | Type | Constraints | Notes |
| --- | --- | --- | --- |
| `id` | `uuid` | PK | Time-sortable (UUIDv7 or ULID) — see note below. |
| `occurred_at` | `timestamptz` | not null | Set by the application, not `now()`. |
| `action` | `text` | not null | Dotted verb, e.g. `member.status.changed`. |
| `category` | `enum` | not null | `auth` \| `profile` \| `membership` \| `role` \| `admin` \| `system`. |
| `severity` | `enum` | not null, default `info` | `info` \| `notice` \| `warning` \| `critical`. |
| `outcome` | `enum` | not null | `success` \| `failure` \| `denied`. |
| `actor_id` | `uuid` | FK → `account.id`, null | Null for system and anonymous actors. |
| `actor_type` | `enum` | not null | `account` \| `system` \| `anonymous`. |
| `actor_label` | `text` | null | Denormalized name/email at write time. |
| `actor_roles` | `text[]` | not null, default `{}` | Roles held *at the time of the action*. |
| `target_type` | `text` | null | `account`, `mentor_application`, `invitation`. |
| `target_id` | `uuid` | null | Not a FK — see below. |
| `target_label` | `text` | null | Denormalized. |
| `changes` | `jsonb` | null | `{field: {from, to}}`. |
| `metadata` | `jsonb` | not null, default `{}` | Action-specific context. |
| `reason` | `text` | null | Actor-supplied justification. |
| `ip_address` | `inet` | null | Retention-limited. |
| `user_agent` | `text` | null | Retention-limited. |
| `request_id` | `text` | null | Correlates with API errors and runtime logs. |
| `session_id` | `uuid` | null | Which session performed it. |

### Three decisions worth defending

**`actor_label`, `target_label`, and `actor_roles` are denormalized on purpose.**
Normally duplicating data invites drift. Here drift is the point: the log must
record the world as it was. If an admin is later renamed or deleted, a joined
query would rewrite history, and "Admin User suspended this account" would
silently become "(deleted) suspended this account" — or vanish. Recording who
someone *was*, and what roles they *held*, at the moment they acted is what
makes the entry mean anything a year later.

**`target_id` is deliberately not a foreign key.** Targets span several tables,
and some — an invitation revoked and cleaned up, a hard-deleted record — may no
longer exist. A foreign key would either block the parent's deletion or cascade
the audit row away with it. Neither is acceptable for an append-only log. The
cost is that referential integrity is the application's responsibility, which is
the right trade here.

**IDs are time-sortable.** UUIDv7 or ULID gives chronological ordering without a
separate sequence, makes keyset pagination on `(occurred_at, id)` stable when
several rows share a timestamp, and keeps index locality good for an
append-heavy table. Random UUIDv4 primary keys scatter writes across the index.

### Indexes

```
(occurred_at desc, id desc)              -- default feed + keyset pagination
(actor_id, occurred_at desc)             -- "what did this admin do"
(target_id, occurred_at desc)            -- drawer: "what happened to this member"
(category, occurred_at desc)             -- category filter
(action, occurred_at desc)               -- specific action filter
GIN (metadata)                           -- only if metadata search is needed
```

`(target_id, occurred_at desc)` directly serves the `recent_activity` block in
the member detail drawer.

### Append-only enforcement

Enforce at the database level, not by convention:

- `REVOKE UPDATE, DELETE` on the table from the application role.
- Deletion happens only through a separate retention job with its own
  credentials, and only for rows past the retention window.
- A `BEFORE UPDATE OR DELETE` trigger that raises, as a second line of defence.

A log the application can rewrite is not an audit log. The application role
should be able to `INSERT` and `SELECT`, and nothing else.

### Partitioning

Range-partition monthly on `occurred_at` once volume justifies it. It keeps the
active index small, makes retention a partition drop rather than a mass
`DELETE`, and matches the access pattern — almost every read is recent-first.
Not needed on day one; the schema should not have to change to adopt it, so
`occurred_at` belongs in the primary key from the start if the engine requires
it for partitioning.

---

## Action taxonomy

Namespaced `subject.object.verb`, past tense. A closed vocabulary defined as
constants in code — free-text action strings become unfilterable within weeks,
because nothing stops two handlers writing `member.suspend` and
`member.suspended`.

| Category | Actions |
| --- | --- |
| `auth` | `auth.signed_up`, `auth.signed_in`, `auth.sign_in.failed`, `auth.signed_out`, `auth.password.reset_requested`, `auth.password.reset`, `auth.email.verified`, `auth.account.locked` |
| `profile` | `profile.updated`, `profile.avatar.updated`, `profile.password.changed`, `profile.session.revoked` |
| `membership` | `member.invited`, `member.invitation.accepted`, `member.invitation.revoked`, `member.status.changed`, `member.deleted` |
| `role` | `role.granted`, `role.revoked` |
| `admin` | `admin.member.viewed`, `admin.activity.exported`, `admin.permission.denied` |
| `system` | `system.eligibility.evaluated`, `system.mentor.auto_promoted`, `system.retention.purged` |

### Log failures and denials, not just successes

`outcome` carries `failure` and `denied` because the security-relevant signal is
usually there. Repeated `auth.sign_in.failed` for one email is a credential
attack; `admin.permission.denied` is someone probing an endpoint they should not
reach. A log containing only successful operations is blind to exactly the
events worth alerting on.

### What must never be written

- Passwords, password hashes, raw or hashed tokens, session secrets.
- Full profile snapshots in `changes` — record the changed fields only.
- `bio` and other free text in `changes` beyond a truncated marker; otherwise a
  single edit can write kilobytes per row.
- `student_identifier` in `metadata`.

`changes` should be built from an explicit allowlist of auditable fields per
entity, rather than by diffing whole objects and hoping nothing sensitive is in
the delta. The diff-everything approach is how credentials end up in audit logs.

---

## Write path

A single `ActivityRecorder` interface, called by domain services inside their
existing transaction. Not a generic ORM hook: automatic hooks capture row
changes without intent, so a row rewritten by a migration and a row changed by
an admin look identical. The action name, the reason, and the actor are context
the domain layer has and a persistence hook does not.

```
recordActivity(tx, {
  action: 'member.status.changed',
  category: 'membership',
  outcome: 'success',
  actor,                       // resolved from the request context
  target: { type: 'account', id, label },
  changes: { status: { from: 'active', to: 'suspended' } },
  reason: input.reason,        // required for this action
  request,                     // ip, user_agent, request_id, session_id
})
```

The recorder should be the only writer, so redaction and vocabulary validation
live in one place. Actions where `reason` is mandatory — suspension, role
revocation, rejection — should fail validation without it rather than writing a
row with a null reason.

**Two cases sit outside the transaction.** Failed sign-ins have no successful
transaction to join, and denied-permission events abort before the domain layer.
Both are written in their own short transaction from middleware. This is the one
place the transactional guarantee genuinely does not apply, and it is worth
noting rather than pretending otherwise.

---

## Read path

Serves four surfaces, all keyset-paginated:

1. **System-wide feed** — `GET /admin/activity`, filterable by actor, target,
   action, category, outcome, severity, and date range.
2. **Member drawer** — `GET /admin/members/{id}/activity`, the recent slice for
   one target.
3. **Self-service** — `GET /profile/activity`, restricted to rows where the
   caller is the actor *or* the target, and projected to a reduced field set.
   The member sees that an admin changed their status; they do not see the
   admin's IP address or internal metadata.
4. **Export** — `GET /admin/activity/export`, streamed rather than buffered, and
   itself logged as `admin.activity.exported`. Exporting the audit log is an
   audited event; a log that does not record who read it has a gap where
   exfiltration would appear.

Rows are rendered from their own denormalized labels. Resolving `actor_id` to a
current name at read time would reintroduce exactly the history-rewriting
problem the denormalization avoids.

---

## Retention

| Data | Retention | Rationale |
| --- | --- | --- |
| `auth` success events | 12 months | Routine, high volume. |
| `auth` failure/lockout | 24 months | Security investigation value. |
| `role`, `membership`, `admin` | Indefinite, or per institutional policy | The accountability core. |
| `ip_address`, `user_agent` | 90 days, then nulled in place | Personal data with a short useful life. |

Nulling the network fields while keeping the row preserves the audit trail
without retaining personal data longer than it is needed. The retention job runs
on its own credentials and logs its own activity as `system.retention.purged`.

This policy needs institutional sign-off before launch, and belongs in
[database/README.md](../README.md) alongside the other privacy commitments —
the existing instructions require documenting validation and recovery
procedures when database changes are introduced.

---

## Open questions

1. Whether `admin.member.viewed` should be logged. It gives complete read
   visibility, which some audit regimes require, but on a busy admin portal it
   will dominate the table. The recommendation is to log the detail-drawer open
   and not the list view, and to revisit once real volume is known.
2. Whether members may see their own activity at launch, or whether that ships
   after the admin surfaces.
3. Institutional retention requirements, which may override the table above.
4. Whether `critical` severity events (admin role changes, bulk operations)
   should trigger notification. The severity column exists so that hook has
   somewhere to attach.
