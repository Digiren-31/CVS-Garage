# Backend and database

**Owner:** backend team. **Status:** runnable local MVP and Supabase pilot adapter.

The backend is an Express modular monolith. It exposes versioned APIs for the
portal and all six service areas, owns authorization checks and cross-service
orchestration, and persists local synthetic state as JSON under the ignored `data/` directory.
Configured production runs use Supabase for verified identity, member/role
records, versioned domain state, audit logs, Storage, and Realtime signals.

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
- `../supabase/` — executable hosted pilot migrations and local CLI config.
- `tests/` — Node and Supertest tests.

## Local versus production

Local JSON persistence remains intentional for zero-service development and
tests. Production fails closed unless `SUPABASE_ENABLED=true` and all server
settings are valid. The hosted adapter uses optimistic aggregate writes to
preserve current service behavior while moving authority to PostgreSQL.

Run and operate the pilot through
[the Supabase deployment runbook](../docs/supabase-deployment.md).

Read [INSTRUCTIONS.md](INSTRUCTIONS.md) before changing backend behavior and
coordinate contract changes through
[packages/contracts](../packages/contracts/README.md).
