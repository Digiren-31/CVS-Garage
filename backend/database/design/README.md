# Backend data design documents

**Status:** common model accepted; detailed Member Centre documents remain inputs.
**Owner:** backend team.

The common model reconciles requirements from all six service areas into the
versioned local SQLite schema. Detailed Member Centre documents preserve the
requirements and rationale used to build that model.

| Document | Covers |
| --- | --- |
| [00 — Common data model](00-common-data-model.md) | Accepted cross-application model, ownership, invariants, operations, migration path |
| [01 — Database schema](01-member-centre-schema.md) | Entities, fields, types, relations, indexes |
| [02 — Role strategy](02-member-centre-role-strategy.md) | RBAC model, Student → Mentor promotion, eligibility rules |
| [03 — API architecture](03-member-centre-api.md) | REST surface for auth, profile, admin portal, promotion |
| [04 — Activity logging](04-member-centre-activity-log.md) | Audit log storage, taxonomy, write/read paths, retention |

## Why these live here

Per [docs/architecture.md](../../../docs/architecture.md), "service" in this
repository means a frontend and product ownership area, not a deployed
microservice. Authentication, authorization, database work, and server-side
access control are owned by the backend team, and the ownership table lists
"service business logic or database access" under what service areas must *not*
own.

The Member Centre service area at
[services/member-centre](../../../services/member-centre/README.md) owns the
admin portal and profile frontends that consume the API in document 03.

## Implementation order

1. Apply and validate the SQLite migrations from `backend`.
2. Agree the API shapes through
   [packages/contracts](../../../packages/contracts/README.md). The contracts
   instructions require that endpoints and role names are not invented
   independently per service.
3. Implement Member Centre identity and authorization repositories first.
4. Migrate Forum behind repositories while preserving its existing tests.
5. Implement Projects, Events, Idea Centre, and Leaderboards through their
   domain repositories and transactional integration events.
6. Settle the open questions listed at the end of each detailed document. The largest is
   the source of mentor eligibility metrics, which crosses into the Projects,
   Events, and Leaderboards areas.

## Decisions taken outside these documents

The Member Centre area identity changed from the Teal seed `#038387` to an
off-white surface with a Forest Green primary action, recorded in
[docs/ui-guidelines.md](../../../docs/ui-guidelines.md). That document's
governance section requires portal-maintainer review for identity changes;
**that review has not happened yet** and the change is marked pending there.
Nothing in these four documents depends on it — schema and API carry no color.
