# Backend Working Instructions

- Follow [../CONTRIBUTING.md](../CONTRIBUTING.md).
- Own server implementation, authentication, authorization, database changes,
  and backend deployment. Do not implement central portal UI here.
- Use the modular Express backend and the local SQLite database selected here.
  Node.js 22.13 or newer is required for the built-in `node:sqlite` API.
- Treat [database/migrations](database/migrations) as the executable schema source
  of truth and [the common data model](database/design/00-common-data-model.md) as
  its design contract. Do not create a service-local database or duplicate
  accounts, teams, projects, or events.
- Agree request/response shapes, errors, session behavior, and permissions with
  affected frontend teams through
  [../packages/contracts/INSTRUCTIONS.md](../packages/contracts/INSTRUCTIONS.md).
- Enforce permissions server-side, especially Member Centre admin operations.
- Access tables through domain repositories. A domain may not mutate another
  domain's tables; use a service command and transactional outbox event.
- Wrap state changes, audit entries, notifications, and outbox records in one
  transaction. Use prepared statements and keep transactions free of network IO.
- Generate opaque UUIDv7 IDs in application code and emit UTC RFC 3339 timestamps.
- Never edit an applied migration. Add a numbered migration, register it in
  `schema_migrations`, validate a backup, and document recovery and compatibility.
- Keep credentials out of Git and all frontend areas. Use placeholders in
  environment examples; do not commit production data or real student records.
- Document migrations, compatibility, validation, and rollback/recovery plans
  when database changes are introduced.
- Use branches such as `backend/feat/<description>` and pull requests into `main`.
- Run `npm run db:migrate`, `npm run db:check`, and affected backend tests for
  database changes. The current Forum runtime remains mock-backed until its
  repository migration is implemented and behavior-tested.
