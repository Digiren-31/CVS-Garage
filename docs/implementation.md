# Campus experience — first release

## Decisions

This implementation starts the previously deferred frontend work. It uses npm
workspaces, React, TypeScript, Vite, Fluent UI React v9 and TanStack Query. The
portal lazy-loads the six services through package public exports. Services own
their screens; shared packages own presentation, transport and contracts.

The accepted common SQLite migration and repository UI contract take precedence
over earlier service proposals. In particular, Idea Centre keeps its documented
join/mentor/comment workflows but does not introduce a second Next.js server,
Prisma database, identity system, Tailwind theme or navigation shell. Projects
uses the canonical indigo identity, not its unapproved teal proposal. Forum uses
cyan. Member Centre uses the documented forest-green identity. Google Sans is
named in the font stack; until licensed assets are supplied, Segoe UI is used.

The new portal API is additive under `/api/v1/campus`. Its request schemas and
public read models live in `packages/contracts`. The original mock Forum source
and tests are retained as a compatibility reference, not a production identity
provider. The default server does not expose the legacy mock-auth routes.

## Session and deployment boundary

The first release uses opaque, random, server-side sessions in `auth_sessions`,
stored as SHA-256 hashes. Only the HttpOnly, SameSite=Lax cookie reaches the
browser; no bearer token or role is stored in local storage. Production cookies
are Secure. Every request resolves current account status, active roles and
permissions from the canonical database. Mutations require the same-origin
custom request header, validated Origin and JSON content type.

`npm run dev` runs an explicit **local demo**, bound to loopback. Demo sign-in
creates a session for one synthetic student only; it cannot select an admin or
mentor role. Demo data must never be loaded into a real member database.
Production refuses demo mode. The sign-in route accepts provisioned accounts;
institutional SSO, verified registration, email delivery and password recovery
remain production integration work, not simulated success flows.

Mutations use prepared statements, short transactions and append-only audit
records. Cross-domain events are recorded in the transactional outbox. No worker
claims to deliver email or award production points. Published rankings use
server-authored snapshots; demo scores are explicitly labelled and are not an
approved college scoring policy.

## Scale without unnecessary infrastructure

One modular Express deployment and one SQLite database remain the local baseline.
Lists have bounded pages; sensitive project reads are membership-scoped. Route
chunks load on demand, requests are cached/deduplicated, stale requests are
cancelled and no image or remote font download blocks the first screen. Maintain
the existing PostgreSQL migration path; SQLite is not a multi-writer deployment.

Before a public launch: supply institutional identity and verified onboarding,
approve scoring/promotion rules, add a durable outbox worker, backup and restore
operations, an upload pipeline and production monitoring. Advanced event judging,
signed QR attendance and scheduled eligibility evaluation are not enabled by a
decorative or client-only control.
