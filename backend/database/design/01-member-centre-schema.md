# Member Centre — Database Schema Design

**Status:** proposed design. No database engine is selected and no migrations exist.
**Owner:** backend team. **Consumers:** Member Centre team, portal maintainer.
**Related:** [role strategy](02-member-centre-role-strategy.md) ·
[API architecture](03-member-centre-api.md) ·
[activity logging](04-member-centre-activity-log.md)

Per [architecture.md](../../../docs/architecture.md), authentication,
authorization, and database work belong to the backend team. This design lives
here rather than in `services/member-centre`, which owns the admin and profile
frontend that consumes the API in the companion document.

## Engine assumption

The design targets a **relational** engine (PostgreSQL-shaped) and is written so
it can be ported. It relies on: foreign keys, unique partial indexes, a JSON
column type, and transactional multi-table writes. The role transition and audit
requirements below depend on those last two, so a document store would need
explicit compensating design. The engine choice remains the backend team's, and
nothing here provisions one.

Conventions used throughout: surrogate `uuid` primary keys, `timestamptz` for all
instants stored in UTC, soft deletion via nullable `deleted_at`, and
`created_at`/`updated_at` on every mutable table.

## Entity overview

```
                        ┌──────────────┐
                        │   account    │  identity + credentials
                        └──────┬───────┘
                               │ 1
             ┌─────────────────┼──────────────────┐
             │ 0..1            │ 0..1             │ 0..n
     ┌───────▼───────┐ ┌───────▼────────┐ ┌───────▼────────┐
     │student_profile│ │  org_profile   │ │ account_role   │──n──┐
     └───────┬───────┘ └────────────────┘ └────────────────┘     │
             │ 1                                          ┌──────▼─────┐
             │ 0..n                                       │    role    │
     ┌───────▼────────────┐                               └────────────┘
     │ mentor_application │  promotion lifecycle
     └────────────────────┘
             ▲ 0..1
             │
     ┌───────┴─────────────┐   ┌──────────────────────┐
     │ eligibility_snapshot│   │     activity_log     │  append-only
     └─────────────────────┘   └──────────────────────┘

     ┌──────────────┐  ┌────────────────┐  ┌──────────────────┐
     │   session    │  │ auth_credential│  │ member_invitation│
     └──────────────┘  │    _token      │  └──────────────────┘
                       └────────────────┘
```

The central modelling choice is **separating identity from profile from role**.
`account` answers "can this person sign in"; the profile tables answer "who are
they"; `account_role` answers "what may they do". Collapsing these into one
`users` table with a `role` string is the common shortcut, and it breaks as soon
as a student is also a mentor, or an admin needs an audit trail of when a role
was granted and by whom. Both are explicit requirements here.

---

## Table: `account`

Identity and credentials. One row per sign-in-capable principal, whether that
principal is a person or an organization.

| Column | Type | Constraints | Notes |
| --- | --- | --- | --- |
| `id` | `uuid` | PK | |
| `email` | `citext` | not null | Case-insensitive. See unique index below. |
| `email_verified_at` | `timestamptz` | null | Null means unverified. |
| `password_hash` | `text` | null | Null for SSO-only accounts. Argon2id. |
| `password_updated_at` | `timestamptz` | null | Drives forced-rotation policy. |
| `principal_type` | `enum` | not null | `person` \| `organization`. Determines which profile table applies. |
| `status` | `enum` | not null, default `pending_verification` | See status model below. |
| `status_reason` | `text` | null | Admin-supplied note for `suspended`/`deactivated`. |
| `failed_login_count` | `int` | not null, default 0 | Reset on success. |
| `locked_until` | `timestamptz` | null | Set by lockout policy. |
| `last_login_at` | `timestamptz` | null | Surfaced in the admin detail drawer. |
| `created_at` | `timestamptz` | not null | |
| `updated_at` | `timestamptz` | not null | |
| `deleted_at` | `timestamptz` | null | Soft delete. |

**Indexes**

- `unique (email) where deleted_at is null` — a partial unique index, so a
  soft-deleted account does not permanently burn its email address.
- `(status)` — the Quick Stats cards aggregate on this.
- `(created_at desc)` — default sort for the member table.

**`status` values:** `pending_verification`, `active`, `suspended`,
`deactivated`. `suspended` is an admin action and is reversible; `deactivated`
is user-initiated departure. Keeping them distinct matters because the Quick
Stats cards and the member-table Status column need to tell an admin *why*
someone cannot sign in. Note this is deliberately **not** the same axis as role
— a suspended mentor is still a mentor, and restoring them must not silently
drop the role.

**Password hashing:** Argon2id, parameters stored alongside the hash so they can
be raised later without invalidating existing hashes. Never log or return this
column; exclude it at the query layer, not merely at serialization.

---

## Table: `student_profile`

Profile data for `principal_type = 'person'`. Separated from `account` so that
profile edits — the common, user-facing write — never touch the credential row.

| Column | Type | Constraints | Notes |
| --- | --- | --- | --- |
| `account_id` | `uuid` | PK, FK → `account.id` on delete cascade | Shared PK. |
| `full_name` | `text` | not null | The Name column in the admin table. |
| `display_name` | `text` | null | Falls back to `full_name`. |
| `avatar_url` | `text` | null | Storage reference, not a blob. |
| `headline` | `text` | null | Short one-line bio. |
| `bio` | `text` | null | Length-capped at the application layer. |
| `enrollment_year` | `int` | null | Feeds mentor eligibility. |
| `program` | `text` | null | Course or major. |
| `student_identifier` | `text` | null | College roll number. Unique when present. |
| `skills` | `text[]` | not null, default `{}` | Used for mentor matching. |
| `links` | `jsonb` | not null, default `{}` | `{github, linkedin, website}`. |
| `created_at` / `updated_at` | `timestamptz` | not null | |

**Indexes**

- `unique (student_identifier) where student_identifier is not null`
- A trigram or full-text index over `full_name` — the admin search box needs it.

`student_identifier` is real student data. It must not appear in fixtures; the
database README already forbids committing student records.

---

## Table: `org_profile`

Profile data for `principal_type = 'organization'`. A separate table rather than
nullable columns on a shared profile, because the fields genuinely differ and a
half-null wide table makes validation ambiguous.

| Column | Type | Constraints | Notes |
| --- | --- | --- | --- |
| `account_id` | `uuid` | PK, FK → `account.id` on delete cascade | |
| `org_name` | `text` | not null | |
| `org_type` | `enum` | not null | `club` \| `department` \| `external_partner`. |
| `description` | `text` | null | |
| `logo_url` | `text` | null | |
| `website_url` | `text` | null | |
| `contact_email` | `citext` | null | May differ from the sign-in email. |
| `verified_at` | `timestamptz` | null | Admin-verified organization badge. |
| `created_at` / `updated_at` | `timestamptz` | not null | |

A future `org_membership` join table (account ↔ org, with its own role) is the
natural extension when organizations need multiple human operators. It is out of
scope here, but the schema does not block it.

---

## Tables: `role` and `account_role`

Roles are rows, not an enum column, so that a grant can carry provenance —
who granted it, when, and why — which the audit requirement makes mandatory.

### `role`

| Column | Type | Constraints | Notes |
| --- | --- | --- | --- |
| `id` | `uuid` | PK | |
| `key` | `text` | unique, not null | `admin`, `student`, `mentor`, `organization`. |
| `name` | `text` | not null | Human label. |
| `description` | `text` | null | |
| `is_assignable` | `bool` | not null, default true | `admin` is false: seeded only. |
| `precedence` | `int` | not null | Higher wins when resolving a display role. |

Seeded rows, with `precedence`: `admin` (400), `mentor` (300),
`organization` (200), `student` (100). Precedence exists because the member
table shows one role chip per row while an account may hold several roles; the
UI displays the highest-precedence role and the drawer lists all of them.

### `account_role`

| Column | Type | Constraints | Notes |
| --- | --- | --- | --- |
| `id` | `uuid` | PK | |
| `account_id` | `uuid` | FK → `account.id` on delete cascade, not null | |
| `role_id` | `uuid` | FK → `role.id`, not null | |
| `granted_by` | `uuid` | FK → `account.id`, null | Null for system or automatic grants. |
| `grant_reason` | `enum` | not null | `seed` \| `signup_default` \| `admin_manual` \| `automatic_eligibility` \| `migration`. |
| `granted_at` | `timestamptz` | not null | |
| `revoked_at` | `timestamptz` | null | Soft revocation preserves history. |
| `revoked_by` | `uuid` | FK → `account.id`, null | |
| `revoke_reason` | `text` | null | |

**Indexes**

- `unique (account_id, role_id) where revoked_at is null` — prevents a duplicate
  active grant while allowing a full grant/revoke/re-grant history.
- `(account_id) where revoked_at is null` — the authorization hot path.

Revocation is soft for the same reason grants carry provenance: "when did this
person stop being a mentor, and who decided that" is an audit question, and a
hard delete destroys the answer.

---

## Table: `mentor_application`

The Student → Mentor promotion lifecycle. Behaviour is detailed in the
[role strategy](02-member-centre-role-strategy.md); the storage shape is here.

| Column | Type | Constraints | Notes |
| --- | --- | --- | --- |
| `id` | `uuid` | PK | |
| `account_id` | `uuid` | FK → `account.id`, not null | |
| `state` | `enum` | not null | `draft` \| `eligible` \| `pending_review` \| `approved` \| `rejected` \| `withdrawn`. |
| `origin` | `enum` | not null | `self_nominated` \| `automatic_rule` \| `admin_initiated`. |
| `snapshot_id` | `uuid` | FK → `eligibility_snapshot.id`, null | Evidence at decision time. |
| `decided_by` | `uuid` | FK → `account.id`, null | |
| `decided_at` | `timestamptz` | null | |
| `decision_note` | `text` | null | Shown to the applicant on rejection. |
| `created_at` / `updated_at` | `timestamptz` | not null | |

**Index:** `unique (account_id) where state in ('draft','eligible','pending_review')`
— one open application per account at a time.

## Table: `eligibility_snapshot`

An immutable record of the metrics that justified a promotion decision.

| Column | Type | Constraints | Notes |
| --- | --- | --- | --- |
| `id` | `uuid` | PK | |
| `account_id` | `uuid` | FK → `account.id`, not null | |
| `ruleset_version` | `text` | not null | Which rule version was evaluated. |
| `metrics` | `jsonb` | not null | Raw inputs, e.g. `{"projects_completed": 3}`. |
| `outcome` | `enum` | not null | `pass` \| `fail`. |
| `failed_criteria` | `jsonb` | not null, default `[]` | Which rules failed, and by how much. |
| `evaluated_at` | `timestamptz` | not null | |

Snapshots are never updated. Storing the *evidence* rather than recomputing it
means a decision stays explicable after the rules change — otherwise an admin
reviewing a year-old promotion sees today's thresholds against today's metrics
and cannot reconstruct why the decision was made.

---

## Table: `session`

Server-side session records, so that an admin suspending an account can
terminate active access immediately. A pure stateless-JWT design cannot do that,
which is why sessions are stored rather than inferred.

| Column | Type | Constraints | Notes |
| --- | --- | --- | --- |
| `id` | `uuid` | PK | |
| `account_id` | `uuid` | FK → `account.id` on delete cascade, not null | |
| `refresh_token_hash` | `text` | unique, not null | Hash only; never the raw token. |
| `issued_at` | `timestamptz` | not null | |
| `expires_at` | `timestamptz` | not null | |
| `revoked_at` | `timestamptz` | null | |
| `ip_address` | `inet` | null | Retained per the privacy note below. |
| `user_agent` | `text` | null | |
| `last_seen_at` | `timestamptz` | null | |

**Indexes:** `(account_id) where revoked_at is null`, and `(expires_at)` for sweeps.

## Table: `auth_credential_token`

Single-use tokens for email verification and password reset. Separate from
`session` because the lifecycle, TTL, and blast radius all differ.

| Column | Type | Constraints | Notes |
| --- | --- | --- | --- |
| `id` | `uuid` | PK | |
| `account_id` | `uuid` | FK → `account.id` on delete cascade, not null | |
| `purpose` | `enum` | not null | `email_verification` \| `password_reset`. |
| `token_hash` | `text` | unique, not null | Hash only. |
| `expires_at` | `timestamptz` | not null | |
| `consumed_at` | `timestamptz` | null | Enforces single use. |
| `created_at` | `timestamptz` | not null | |

## Table: `member_invitation`

Backs the admin "Add Member" button. An admin creates an invitation rather than
an account with a password the admin knows — that keeps the credential solely in
the invitee's control and keeps the admin out of the credential path entirely.

| Column | Type | Constraints | Notes |
| --- | --- | --- | --- |
| `id` | `uuid` | PK | |
| `email` | `citext` | not null | |
| `intended_role_id` | `uuid` | FK → `role.id`, not null | |
| `invited_by` | `uuid` | FK → `account.id`, not null | |
| `token_hash` | `text` | unique, not null | |
| `state` | `enum` | not null | `pending` \| `accepted` \| `expired` \| `revoked`. |
| `expires_at` | `timestamptz` | not null | |
| `accepted_account_id` | `uuid` | FK → `account.id`, null | |
| `created_at` / `updated_at` | `timestamptz` | not null | |

**Index:** `unique (email) where state = 'pending'`.

---

## Supporting the admin portal

Mapping each stated requirement to the schema:

| Requirement | Source |
| --- | --- |
| Email column | `account.email` |
| Name column | `student_profile.full_name` or `org_profile.org_name` |
| Status column | `account.status` plus highest-precedence active `account_role` |
| Actions column | Derived from status, roles, and the actor's own permissions |
| Quick Stats cards | Aggregates over `account.status` and active `account_role` |
| Detail drawer | Account, profile, role history, and recent `activity_log` rows |
| Filter | `status`, `role.key`, `created_at` range, `email_verified_at is null` |
| Search | Trigram or full-text over `full_name`, `org_name`, `email` |

**Quick Stats** should not be computed with a `count(*)` per card on every page
load. At small scale that is fine; the design intent is a single grouped
aggregate query, moved behind a short-TTL cache or a materialized view if the
member count grows. The API document returns all cards from one endpoint for
this reason.

**Sorting and pagination:** keyset pagination on `(created_at desc, id desc)`
rather than `OFFSET`. Offset pagination shifts rows under the admin when someone
signs up mid-browse, and it degrades on deep pages.

---

## Cross-cutting notes

**Soft delete.** `deleted_at` is set rather than rows removed, so the activity
log's references stay resolvable. Every query path must filter it; this is worth
enforcing with a repository-layer default rather than by remembering.

**Time zones.** All instants are UTC `timestamptz`. Display conversion belongs to
the frontend.

**Privacy.** `ip_address`, `user_agent`, and `student_identifier` are personal
data. Define a retention window before launch and document it in
[database/README.md](../README.md) — the existing instructions already forbid
committing real student records, and this design adds fields that make a
retention policy necessary rather than optional.

**Seeding.** The admin account is seeded per the requirement: one `account` row
with `principal_type = 'person'` and `status = 'active'`, plus one `account_role`
with `grant_reason = 'seed'`. The seed must take its password from an environment
variable with no committed default, and must be idempotent. `role.is_assignable
= false` for `admin` means the API cannot grant it — a second admin is created by
another seeded run, deliberately.

## Open questions for the backend team

1. Engine choice, which settles `citext`, `text[]`, `jsonb`, and `inet`. Each has
   a portable fallback; none is load-bearing except `jsonb`.
2. Whether SSO (a college identity provider) is in scope. `password_hash` is
   already nullable for it, but it changes the sign-up flow.
3. Retention windows for session metadata and resolved activity-log rows.
4. Whether mentor eligibility metrics are owned here or read from the Projects,
   Events, and Leaderboards areas. This is the largest open dependency; see the
   [role strategy](02-member-centre-role-strategy.md).
