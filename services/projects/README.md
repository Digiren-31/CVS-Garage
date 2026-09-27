# Projects

**Owner:** Projects team. **Status:** integrated MVP.

The Projects frontend is composed by the central portal at `/projects`. It
supports project discovery, search, progress and team visibility, proposal
creation, project details, and milestone status updates for authorized users.

The centralized backend exposes the domain below `/api/v1/projects` and stores
synthetic local state in `backend/data/projects.json`.

## Public frontend boundary

`src/index.ts` exports `ProjectsPage`. The portal must import only that entry
point. Projects code may consume shared UI, API client, and contracts but must
not import another service's implementation.

Run and validate from the repository root using the commands in
[README.md](../../README.md). The detailed
[architecture proposal](projects_architecture.md) remains a production data and
workflow reference; the MVP intentionally implements its core vertical slice.
