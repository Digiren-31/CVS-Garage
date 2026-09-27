# Backend working instructions

- Follow [../CONTRIBUTING.md](../CONTRIBUTING.md).
- Keep the server as one modular Express backend unless an architecture decision
  explicitly introduces a deployable boundary.
- Own authentication, authorization, persistence, migrations, and cross-domain
  orchestration. Do not implement portal presentation here.
- Use the common API envelope helpers in `src/lib/http.js`.
- Use `src/lib/persistent-store.js` for local MVP state. Do not commit generated
  files from `data/`, credentials, production exports, or real student records.
- Treat `x-user-id` as local development identity only. Validate the identity
  and enforce role plus resource ownership on every protected mutation.
- Keep integration adapters explicit; do not reach through another module's
  frontend or duplicate its canonical entities.
- Agree public request/response changes through
  [../packages/contracts](../packages/contracts/INSTRUCTIONS.md).
- Add focused Node/Supertest tests. Run backend build, lint, type-check, and test
  commands before completing a change.
- Document migration validation, compatibility, and rollback before replacing
  local persistence with PostgreSQL.
