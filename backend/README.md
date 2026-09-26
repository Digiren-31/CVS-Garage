# Backend and Database

**Intended owner:** backend team; actual GitHub owners are not assigned yet.
**Status:** Express Forum backend present; common SQLite schema established.

This is one modular backend deployable. The backend team owns APIs, server-side
authentication/authorization, database work, and delivery. The six frontend
service areas are domain ownership boundaries, not six backend microservices.

## Start here

1. Read [INSTRUCTIONS.md](INSTRUCTIONS.md).
2. Read the [common data model](database/design/00-common-data-model.md).
3. Read [database/README.md](database/README.md) for migrations and recovery.
4. Install Node.js 22.13 or newer and run from this directory:

```powershell
npm install
Copy-Item .env.example .env
npm run db:migrate
npm run db:check
npm test
npm start
```

The API listens on `http://localhost:4000` by default. The local database file is
`.data/cvs-garage.sqlite` and must never be committed.

Agree frontend interfaces through
[../packages/contracts/README.md](../packages/contracts/README.md). Database rows
are internal models, not request or response DTOs.

The Forum module currently uses an in-memory store and mock adapters. Its API and
tests remain the behavioral baseline while database repositories and real Member
Centre authorization are implemented. Do not bypass that transition by querying
SQLite directly from controllers.

If the backend team later chooses a separate repository, retain this folder for
handoff documentation and agree how contracts stay synchronized. No external
repository or submodule has been configured.
