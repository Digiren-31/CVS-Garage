# CVS Garage architecture

## Runtime shape

CVS Garage is a modular monorepo delivered as two runtime processes:

1. A React portal that owns the application shell and composes six
   service-owned frontend entry points.
2. A centralized Express modular monolith that owns APIs, authorization, local
   persistence, and cross-domain orchestration.

The six service directories are product and frontend ownership boundaries, not
independently deployed microservices. This keeps local development and
transactions straightforward while preserving seams that can be separated
later if scale or team autonomy requires it.

## Selected stack

| Concern | Decision |
| --- | --- |
| Frontend | React, TypeScript, Vite, React Router |
| Component system | Fluent UI React v9 plus repository primitives in `packages/ui` |
| Backend | Node.js and Express using ES modules |
| Contracts | TypeScript view models in `packages/contracts` |
| Browser transport | Centralized fetch wrapper in `packages/api-client` |
| Local persistence | Atomic JSON files in ignored `backend/data/` |
| Tests | Node test runner, Supertest, Vitest, Testing Library |

The production data target remains PostgreSQL. Existing SQL and detailed domain
documents are design inputs for that migration, not migrations that the local
runtime claims to execute.

## Ownership boundaries

| Area | Owns | Must not own |
| --- | --- | --- |
| Central portal | Homepage, app shell, navigation, route composition, publication | Service business logic or persistence |
| Each service | Domain frontend, local presentation state, service tests and docs | Other services' internals or global navigation |
| Shared UI | Fluent themes, semantic presentation primitives | API transport or domain rules |
| Shared API client | Browser-to-backend transport and development identity header | Server authorization or database access |
| Shared contracts | Public frontend/backend shapes | Database implementation or UI |
| Backend | Domain rules, validation, permissions, persistence and orchestration | Portal presentation |

## Dependency direction

- The portal imports each service through `services/<area>/src/index.ts`.
- Services consume shared UI, the API client, and contracts.
- The API client consumes contracts.
- Shared packages never import portal or service implementation.
- Service frontends never import another service.
- Backend modules coordinate through explicit integration services rather than
  reaching into another frontend or duplicating its entities.

These rules are now represented by the folder structure and TypeScript build,
but repository-wide import linting remains future hardening.

## API and identity

All public routes are versioned below `/api/v1`. Successful and failed responses
use a common JSON envelope with a timestamp and explicit error code.

The local portal exposes a synthetic identity selector. The API receives the
selection through `x-user-id` and independently enforces role and ownership
rules for every protected mutation. Unknown or suspended identities are
rejected. This mechanism is deliberately labelled as development-only.

Production identity requires the Member Centre design to be implemented with
institutional SSO or short-lived access tokens, rotating HttpOnly refresh
cookies, server-side session revocation, password recovery, and rate limiting.
No local identity header may be trusted in production.

## Persistence boundary

Each backend domain owns one local JSON store created through
`backend/src/lib/persistent-store.js`. Writes use a temporary file followed by
an atomic rename. Tests use isolated seeded state and do not mutate checked-in
files.

Before production, replace these repositories with migrations and PostgreSQL
adapters while preserving the service methods and HTTP contracts. The SQL and
schema proposals under `backend/database` and the service architecture
documents provide the starting data model.

## Cross-domain flows

- Forum discussions can link Projects and Events.
- Eligible Forum posts can be exported to Idea Centre once.
- Forum posts, replies, accepted answers, and received upvotes emit idempotent
  Leaderboards contribution events.
- The portal dashboard composes read models from every backend module.
- Member identity is resolved centrally and reused by all domain modules.

## UI architecture

The portal applies one shared neutral Fluent theme and switches the area brand
identity by route. Light, dark, and system modes are persisted locally and
resolved before each service screen renders. Service pages use shared state,
metric, card, status, and page primitives without owning a competing theme.

The canonical identities and accessibility requirements remain in
[ui-guidelines.md](ui-guidelines.md).

## Deployment boundary

`npm run build` emits the portal bundle. `npm start` runs Express, which serves
both `/api/v1` and the built single-page application. No cloud environment,
CI/CD pipeline, secrets, production database, email provider, queue, or object
store is provisioned by this repository.

Those operational decisions must include environment-specific configuration,
managed secret storage, PostgreSQL migrations and backups, HTTPS, observability,
rate limiting, content moderation operations, and rollback procedures.
