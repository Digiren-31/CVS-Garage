# Member Centre — Role and Promotion Strategy

**Status:** proposed design. **Owner:** backend team.
**Related:** [schema](01-member-centre-schema.md) ·
[API architecture](03-member-centre-api.md) ·
[activity logging](04-member-centre-activity-log.md)

Role names and permissions must be agreed with the Member Centre team before
implementation, per that area's instructions. This document is the backend
proposal for that agreement.

## The four roles

| Role | How it is acquired | Assignable via API |
| --- | --- | --- |
| `admin` | Seeded directly into the database | No — `is_assignable = false` |
| `student` | Default grant on standard sign-up | Yes, implicitly |
| `mentor` | Admin promotion, or automatic eligibility | Yes |
| `organization` | Invitation with `principal_type = 'organization'` | Yes |

Roles are **additive**, not exclusive. A promoted mentor keeps the `student`
role. This matters: mentorship is a capability added on top of studenthood, not
a replacement for it, and a mentor whose promotion is later revoked must land
back as a normal student rather than a principal with no role at all.

`admin` being non-assignable through the API is a deliberate containment
boundary. A compromised admin session can suspend accounts and grant mentor, but
cannot mint another permanent admin — that requires database access.

## Permission model

Rather than checking role names at each endpoint, the design resolves roles to
**permissions** and checks those. Role-name checks scattered through handlers
are the thing that makes a fourth role expensive to add later.

| Permission | admin | student | mentor | organization |
| --- | --- | --- | --- | --- |
| `profile:read:self` | ✓ | ✓ | ✓ | ✓ |
| `profile:write:self` | ✓ | ✓ | ✓ | ✓ |
| `member:list` | ✓ | | | |
| `member:read:any` | ✓ | | | |
| `member:invite` | ✓ | | | |
| `member:status:write` | ✓ | | | |
| `role:grant` | ✓ | | | |
| `role:revoke` | ✓ | | | |
| `mentor:apply` | | ✓ | | |
| `mentor:review` | ✓ | | | |
| `activity:read:any` | ✓ | | | |
| `activity:read:self` | ✓ | ✓ | ✓ | ✓ |

The permission set is computed once per request from the account's active
`account_role` rows and cached for the request's lifetime. The mapping itself is
a static table in code, not database rows — it changes with deploys, not at
runtime, and keeping it in code means it is reviewed like code.

**Server-side enforcement is mandatory.** Both the repository instructions and
the Member Centre instructions state that hiding an admin control is not
security. Every endpoint in the [API document](03-member-centre-api.md) declares
its required permission, and the check runs in middleware before the handler.

## Student → Mentor promotion

### State machine

```
              ┌─────────┐
              │  draft  │  self-nomination started
              └────┬────┘
                   │ submit
                   ▼
   evaluate   ┌──────────┐   rules pass    ┌────────────────┐
  ──────────► │ eligible │ ──────────────► │ pending_review │
              └────┬─────┘                 └───────┬────────┘
                   │ rules fail                    │
                   │ (stays, with failed_criteria) │
                   ▼                       ┌───────┴────────┐
              ┌───────────┐                ▼                ▼
              │ withdrawn │          ┌──────────┐    ┌──────────┐
              └───────────┘          │ approved │    │ rejected │
                                     └────┬─────┘    └──────────┘
                                          │ grants mentor role
                                          ▼
                                   account_role row
```

Three entry points converge on the same machine:

1. **Self-nomination.** A student applies. The application enters `draft`, is
   evaluated on submit, and moves to `pending_review` only if the rules pass.
2. **Automatic rule.** A scheduled evaluation finds a student who now meets the
   criteria and creates an application with `origin = 'automatic_rule'`.
3. **Admin-initiated.** An admin promotes someone directly. This still creates an
   application row with `origin = 'admin_initiated'` and jumps to `approved`.

The third case is the important one: an admin's manual promotion produces the
*same* audit artifact as an automatic one. If manual promotions bypassed the
table, the "why is this person a mentor" question would have two different
answers depending on how it happened, and one of them would be "we don't know".

### Eligibility rules

Rules are declarative and versioned, held in a configuration document rather
than hard-coded conditionals:

```jsonc
{
  "ruleset_version": "2026.1",
  "mode": "review_required",   // or "auto_grant"
  "criteria": [
    { "key": "account_age_days",     "op": ">=", "value": 90 },
    { "key": "projects_completed",   "op": ">=", "value": 2 },
    { "key": "email_verified",       "op": "==", "value": true },
    { "key": "account_status",       "op": "==", "value": "active" },
    { "key": "no_active_sanctions",  "op": "==", "value": true }
  ]
}
```

Every criterion must pass. The evaluator writes an
`eligibility_snapshot` recording each metric's actual value and, on failure,
which criteria failed and by how much — so a student can be told "you need 2
completed projects, you have 1" instead of a bare "not eligible".

**`mode` is the key operational control.** `review_required` routes passing
candidates to `pending_review` for an admin decision; `auto_grant` grants the
role immediately. Start in `review_required`. Automatic promotion on rules
nobody has yet watched in production is how a misconfigured threshold promotes
the entire cohort overnight. Move to `auto_grant` once the rule outputs have
been observed against real data.

**Versioning.** `ruleset_version` is stamped onto every snapshot. Changing a
threshold means publishing a new version, never editing the old one — otherwise
past decisions become unexplainable, which defeats the snapshot's purpose.

### Where the metrics come from

This is the design's largest external dependency and it is **not yet
resolvable**. `projects_completed`, event participation, and leaderboard
standing are owned by the Projects, Events, and Leaderboards areas. Member
Centre does not own that data and, per the architecture's dependency rules, must
not reach into another area's internals to get it.

Three options, for the backend team to settle:

| Option | Trade-off |
| --- | --- |
| **Read models published by each area** | Cleanest boundary. Each area publishes an agreed contract; Member Centre reads it. Needs cross-team agreement in `packages/contracts`. |
| **A metrics facade in the backend** | Backend owns a query that joins across its own tables. Simple if all areas share one database; couples the schemas if they later split. |
| **Event-driven projection** | Areas emit events, Member Centre maintains its own materialized metric table. Most decoupled, most machinery, eventual consistency. |

The recommendation is the **facade** for the first release — the backend team
owns all the tables initially, so the boundary is a code-level interface rather
than a network one, and it can be swapped for events later without changing the
rule evaluator. What matters is that the evaluator depends on a
`MetricsProvider` interface, not on other areas' tables directly.

Until those areas exist, the evaluator should ship with the metrics it *can*
compute locally — `account_age_days`, `email_verified`, `account_status` — and
treat unavailable metrics as failing closed, with the snapshot recording
`"unavailable"` rather than a false zero. A metric that silently reads zero
looks identical to a genuine zero, and quietly blocks every promotion.

### Evaluation timing

- **On demand** when a student opens the mentor-application page, so they see
  current standing without waiting for a batch.
- **On submit**, authoritative — the snapshot written here is the one attached
  to the decision.
- **Scheduled**, a periodic sweep of students without an open application, to
  catch newly eligible candidates. Batched and rate-limited; this is the job
  most likely to generate a flood of notifications if it runs unbounded on
  first deployment.

### Revocation

An admin may revoke `mentor`. This sets `revoked_at`, `revoked_by`, and
`revoke_reason` on the `account_role` row; it does not delete it. The student
role is untouched. A revoked mentor may be re-promoted later, producing a new
grant row — so the history reads as a sequence of grants and revocations rather
than a single mutable flag.

**Re-application cooldown:** after a rejection or revocation, block a new
application for a configurable window (default 30 days). Without it, a rejected
student can resubmit immediately and repeatedly.

## Account status versus role

These are orthogonal axes and the implementation must keep them so:

| | `active` | `suspended` |
| --- | --- | --- |
| **student** | Normal access | Cannot sign in; role retained |
| **mentor** | Mentor capabilities | Cannot sign in; role retained |

Suspension is enforced at authentication, not by stripping roles. When an
account is suspended, all its `session` rows are revoked in the same transaction
— otherwise the suspension does not take effect until existing tokens expire,
which is the difference between "suspended" and "suspended in about an hour".

## Guardrails

- **Self-modification.** An admin cannot revoke their own `admin` role, suspend
  their own account, or approve their own mentor application. Enforced server-side.
- **Last admin.** Reject any operation that would leave zero active admins.
- **Idempotent grants.** Granting a role the account already holds is a no-op
  returning success, not a duplicate row — the unique partial index enforces this
  at the database level too.
- **Transactional promotion.** The `account_role` insert, the
  `mentor_application` state change, and the `activity_log` write happen in one
  transaction. A promotion that is half-recorded is worse than one that failed.

## Open questions

1. Final eligibility thresholds — the values above are placeholders for the
   Member Centre team to set.
2. Whether mentors need capabilities beyond profile visibility (assignment to
   mentees, project review rights). That expands the permission table.
3. Whether organizations self-register or are invite-only. The schema supports
   both; the design above assumes invite-only.
4. Notification delivery on promotion and rejection — out of scope here, but the
   state machine is where those hooks belong.
