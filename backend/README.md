# Backend and database

**Owner:** backend team. **Status:** runnable centralized MVP.

The backend is an Express modular monolith. It exposes versioned APIs for the
portal and all six service areas, owns authorization checks and cross-service
orchestration, and persists local synthetic state as JSON under the ignored
`data/` directory.

## Commands

From the repository root:

```bash
npm run dev
npm test --workspace @cvs-garage/backend
npm run build --workspace @cvs-garage/backend
npm run start --workspace @cvs-garage/backend
```

The API listens on `http://localhost:4000` by default. `GET /health` reports
module availability. Public APIs are rooted at `/api/v1`.

## Structure

- `src/modules/` — route and domain modules.
- `src/integrations/` — explicit cross-domain service interfaces.
- `src/lib/` — response and persistence foundations.
- `database/` — production-oriented schema proposals and design documents.
- `tests/` — Node and Supertest tests.

## Local versus production

Local JSON persistence is intentional for a zero-service development experience.
It uses synthetic data and atomic file replacement, but it is not a production
database. Before deployment, implement the reviewed PostgreSQL migrations,
transactional repositories, institutional authentication, rate limiting,
observability, backups, and recovery procedures without changing public API
contracts unexpectedly.

Read [INSTRUCTIONS.md](INSTRUCTIONS.md) before changing backend behavior and
coordinate contract changes through
[packages/contracts](../packages/contracts/README.md).
