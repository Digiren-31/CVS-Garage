# Member Centre — API Architecture

**Status:** proposed design. No endpoints are implemented.
**Owner:** backend team. Must be agreed with the Member Centre team through
[packages/contracts](../../../packages/contracts/README.md) before implementation.
**Related:** [schema](01-member-centre-schema.md) ·
[role strategy](02-member-centre-role-strategy.md) ·
[activity logging](04-member-centre-activity-log.md)

## REST, not GraphQL

The requirement set is a fixed admin table, a detail drawer, a stats row, and
profile editing. The client shapes are known and few, so GraphQL's main
advantage — clients composing arbitrary queries — buys little here, while adding
a schema layer, query-depth and cost limits, and per-field authorization. The
last point is the deciding one: this service's whole job is access control, and
per-field auth in GraphQL is materially easier to get subtly wrong than an
endpoint-level permission check.

REST with a small number of well-shaped endpoints, returning exactly what each
screen needs, is the recommendation.

## Conventions

- Base path `/api/v1/member-centre`. Versioned from the start.
- JSON request and response bodies; `snake_case` fields to match the schema.
- Every mutating endpoint accepts an `Idempotency-Key` header.
- Authentication by short-lived access token (≈15 min) plus a rotating refresh
  token in an `HttpOnly`, `Secure`, `SameSite=Lax` cookie. Access tokens are not
  stored in browser-accessible storage.
- Every endpoint below names the permission it requires; the check runs in
  middleware, before the handler, per the
  [role strategy](02-member-centre-role-strategy.md).

### Error shape

```json
{
  "error": {
    "code": "VALIDATION_FAILED",
    "message": "Human-readable summary.",
    "details": [{ "field": "email", "issue": "already_registered" }],
    "request_id": "01JA..."
  }
}
```

`request_id` correlates with the activity log and application logs. Error text
explains what happened and how to recover, without blame — the UI guidelines
require this of the surfaces that render it.

---

## Authentication

| Method | Path | Permission | Purpose |
| --- | --- | --- | --- |
| `POST` | `/auth/sign-up` | public | Create account, default `student` role |
| `POST` | `/auth/sign-in` | public | Issue access + refresh tokens |
| `POST` | `/auth/sign-out` | authenticated | Revoke the current session |
| `POST` | `/auth/sign-out-all` | authenticated | Revoke every session |
| `POST` | `/auth/refresh` | valid refresh cookie | Rotate the token pair |
| `POST` | `/auth/verify-email` | public + token | Consume verification token |
| `POST` | `/auth/resend-verification` | public | Rate-limited |
| `POST` | `/auth/forgot-password` | public | Always returns 202 |
| `POST` | `/auth/reset-password` | public + token | Consume reset token, revoke sessions |
| `GET` | `/auth/me` | authenticated | Current account, roles, permissions |

**`POST /auth/sign-up`** creates the `account`, the `student_profile`, the
default `student` `account_role`, and the verification token in one transaction.

**Response discipline on public endpoints.** Sign-in returns the same error and
takes comparable time whether the email is unknown or the password is wrong.
`forgot-password` returns 202 whether or not the address exists. Both prevent
the endpoint from being used to enumerate who has an account.

**Rate limiting** is per-IP and per-email on `sign-in`, `forgot-password`, and
`resend-verification`. Account lockout uses `failed_login_count` and
`locked_until`. These are not optional extras — they are the difference between
a login endpoint and a credential-stuffing oracle.

**`GET /auth/me`** returns the resolved permission list, not just roles. The
frontend uses it to decide which controls to render; the server still
authorizes every call independently. The UI uses it for affordance, never for
enforcement.

---

## Profile — self-service

| Method | Path | Permission | Purpose |
| --- | --- | --- | --- |
| `GET` | `/profile` | `profile:read:self` | Own profile, shaped by principal type |
| `PATCH` | `/profile` | `profile:write:self` | Partial update |
| `POST` | `/profile/avatar` | `profile:write:self` | Upload URL or direct upload |
| `PATCH` | `/profile/password` | `profile:write:self` | Requires current password |
| `GET` | `/profile/sessions` | `profile:read:self` | Active sessions |
| `DELETE` | `/profile/sessions/{id}` | `profile:write:self` | Revoke one session |

`PATCH /profile` accepts only profile fields. Email changes go through a
verification flow, and `status`, roles, and `student_identifier` are not
writable here — a self-service profile endpoint that accepts a `role` field is a
privilege-escalation bug waiting for someone to try it. Field allowlisting is
explicit rather than "strip the dangerous ones".

---

## Admin — member management

All require `member:list` or narrower, and are the operations the Member Centre
instructions single out as needing server-enforced permissions.

### `GET /admin/members`

The member table. Query parameters:

| Parameter | Type | Notes |
| --- | --- | --- |
| `q` | string | Search across name, org name, email |
| `status` | enum[] | Repeatable |
| `role` | enum[] | Repeatable |
| `email_verified` | bool | |
| `created_after` / `created_before` | date | |
| `sort` | enum | `created_at`, `full_name`, `last_login_at` |
| `order` | enum | `asc` \| `desc`, default `desc` |
| `cursor` | string | Keyset cursor |
| `limit` | int | Default 25, max 100 |

```json
{
  "data": [
    {
      "account_id": "uuid",
      "email": "student@college.edu",
      "name": "Asha Rao",
      "principal_type": "person",
      "status": "active",
      "primary_role": "mentor",
      "roles": ["student", "mentor"],
      "email_verified": true,
      "created_at": "2026-01-14T09:20:00Z",
      "last_login_at": "2026-09-24T11:02:00Z"
    }
  ],
  "page": { "next_cursor": "...", "has_more": true }
}
```

`name` is resolved server-side from whichever profile table applies, so the
table renders one column without branching on principal type.

**Deliberately excluded:** counts. A `total_count` on a filtered admin list
costs a second full scan on every keystroke of the search box. The Quick Stats
endpoint below provides the numbers that are actually displayed.

### `GET /admin/members/stats`

The Quick Stats cards, in one request:

```json
{
  "total_members": 1284,
  "by_status": { "active": 1150, "pending_verification": 96, "suspended": 12, "deactivated": 26 },
  "by_role": { "student": 1201, "mentor": 64, "organization": 18, "admin": 3 },
  "pending_mentor_reviews": 7,
  "new_this_week": 43,
  "generated_at": "2026-09-26T08:00:00Z"
}
```

One grouped aggregate query, not one query per card. `generated_at` is included
so the UI can show staleness if this is later cached.

### `GET /admin/members/{id}`

The detail drawer. A single composed response, because the drawer opens on a row
click and three round-trips would show three separate loading states:

```json
{
  "account": { "id": "...", "email": "...", "status": "active", "status_reason": null,
                "email_verified_at": "...", "last_login_at": "...", "created_at": "..." },
  "profile":  { "type": "student", "full_name": "Asha Rao", "program": "CSE",
                "enrollment_year": 2024, "skills": ["python"], "links": {} },
  "roles": [
    { "role": "student", "granted_at": "...", "grant_reason": "signup_default", "granted_by": null },
    { "role": "mentor",  "granted_at": "...", "grant_reason": "admin_manual",
      "granted_by": { "id": "...", "name": "Admin User" } }
  ],
  "mentor_application": { "state": "approved", "origin": "self_nominated", "decided_at": "..." },
  "recent_activity": [ { "id": "...", "action": "member.status.changed", "occurred_at": "..." } ],
  "available_actions": ["suspend", "grant_mentor", "resend_verification"]
}
```

`available_actions` is computed server-side from the target's state *and* the
actor's permissions. The drawer renders buttons from this list rather than
deriving them client-side, which keeps the guardrails — last-admin, no
self-suspension — in one place instead of duplicated in the UI. The server
re-checks on the action call regardless.

### Member operations

| Method | Path | Permission | Purpose |
| --- | --- | --- | --- |
| `POST` | `/admin/members/invitations` | `member:invite` | "Add Member" button |
| `GET` | `/admin/members/invitations` | `member:invite` | List pending invitations |
| `DELETE` | `/admin/members/invitations/{id}` | `member:invite` | Revoke |
| `POST` | `/admin/members/invitations/{id}/resend` | `member:invite` | Re-send |
| `POST` | `/invitations/accept` | public + token | Invitee sets their password |
| `PATCH` | `/admin/members/{id}/status` | `member:status:write` | Suspend / restore |
| `POST` | `/admin/members/{id}/roles` | `role:grant` | Grant a role |
| `DELETE` | `/admin/members/{id}/roles/{key}` | `role:revoke` | Revoke a role |
| `POST` | `/admin/members/{id}/resend-verification` | `member:invite` | |
| `DELETE` | `/admin/members/{id}` | `member:status:write` | Soft delete |

**`POST /admin/members/invitations`** takes `{ email, intended_role, message? }`.
It creates an invitation, not an account — the admin never sets or sees the
invitee's password.

**`PATCH /admin/members/{id}/status`** takes `{ status, reason }`. `reason` is
required when suspending; an audit trail of suspensions with no stated cause is
not much of an audit trail. Suspension revokes all sessions in the same
transaction.

**`POST /admin/members/{id}/roles`** takes `{ role, reason }` and returns 403 for
`admin`, which `is_assignable = false` forbids.

---

## Mentor promotion

| Method | Path | Permission | Purpose |
| --- | --- | --- | --- |
| `GET` | `/mentor/eligibility` | `mentor:apply` | Current standing + unmet criteria |
| `POST` | `/mentor/applications` | `mentor:apply` | Submit |
| `GET` | `/mentor/applications/mine` | `mentor:apply` | Own application state |
| `DELETE` | `/mentor/applications/mine` | `mentor:apply` | Withdraw |
| `GET` | `/admin/mentor/applications` | `mentor:review` | Review queue |
| `POST` | `/admin/mentor/applications/{id}/approve` | `mentor:review` | Approve + grant |
| `POST` | `/admin/mentor/applications/{id}/reject` | `mentor:review` | Reject with note |

**`GET /mentor/eligibility`** returns each criterion with its actual value, its
target, and whether it passed — so the student sees "2 of 3 criteria met" with
the specific gap, not an opaque verdict.

Approve and reject are `POST` sub-resources rather than a `PATCH` on `state`,
because each is a distinct operation with its own permission, side effects, and
audit entry. Exposing raw state transitions would let a client drive the machine
into states the workflow does not allow.

---

## Activity log

| Method | Path | Permission | Purpose |
| --- | --- | --- | --- |
| `GET` | `/admin/activity` | `activity:read:any` | System-wide log |
| `GET` | `/profile/activity` | `activity:read:self` | Own activity |
| `GET` | `/admin/members/{id}/activity` | `activity:read:any` | One member's history |
| `GET` | `/admin/activity/export` | `activity:read:any` | CSV/JSON export |

Filters: `actor_id`, `target_id`, `action`, `category`, `outcome`, date range,
keyset cursor. Detailed in the
[activity logging design](04-member-centre-activity-log.md).

---

## Cross-cutting

**Contract ownership.** These shapes belong in `packages/contracts` as the
agreed source of truth before either side implements against them. The contracts
instructions are explicit that endpoints must not be invented independently per
service.

**Transactional writes.** Any operation touching more than one table — sign-up,
promotion, suspension, invitation acceptance — runs in a single transaction that
includes its activity-log write.

**Idempotency.** `Idempotency-Key` is honoured on invitation creation, role
grants, and status changes: a double-clicked "Add Member" button should not
produce two invitations.

**Pagination.** Keyset everywhere. No endpoint returns an unbounded collection.

**Output encoding.** Profile free-text (`bio`, `headline`, org `description`) is
stored raw and escaped at render. The admin table displays user-controlled
strings to the highest-privilege user in the system, which makes it the most
attractive stored-XSS target in the service.

**What this service does not own.** Notification delivery, file storage
internals, and the metric sources behind mentor eligibility all sit outside this
boundary and should be consumed through interfaces.
