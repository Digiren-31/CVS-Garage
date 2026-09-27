# Member Centre — Design Documents

**Status:** proposed design, pending backend-team and Member Centre-team review.
**Owner:** backend team.

Production-hardening documents for the Member Centre domain. The runnable MVP
uses a seeded local repository, so these remain specifications rather than
executed migrations.

| Document | Covers |
| --- | --- |
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

## Before implementation begins

1. Agree any remaining API shape changes through
   [packages/contracts](../../../packages/contracts/README.md). The contracts
   instructions require that endpoints and role names are not invented
   independently per service.
2. Agree role names and permissions with the Member Centre team, as that area's
   instructions require.
3. Select the PostgreSQL migration/ORM tooling, then document validation and
   rollback procedures per [database/README.md](../README.md).
4. Settle the open questions listed at the end of each document. The largest is
   the source of mentor eligibility metrics, which crosses into the Projects,
   Events, and Leaderboards areas.

## Decisions taken outside these documents

The Member Centre area identity changed from the Teal seed `#038387` to an
off-white surface with a Forest Green primary action, recorded in
[docs/ui-guidelines.md](../../../docs/ui-guidelines.md). That document's
governance section requires portal-maintainer review for identity changes;
**that review has not happened yet** and the change is marked pending there.
Nothing in these four documents depends on it — schema and API carry no color.
