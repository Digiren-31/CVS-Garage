# Database Working Area

**Owner:** backend team. **Status:** SQLite baseline selected and versioned.

The local database is SQLite and the future managed target is PostgreSQL. This
folder contains schema migrations, design records, and synthetic fixtures only.
Database files, backups, credentials, and real student data do not belong here.

## Source of truth

- [Common data model](design/00-common-data-model.md): ownership, invariants,
	transaction boundaries, local operation, and managed-service migration.
- [Initial SQLite migration](migrations/001_initial.sqlite.sql): executable schema
	for Member Centre, Projects, Events, Idea Centre, Forum, Leaderboards, shared
	teams, notifications, auditing, and integration outbox.
- [Legacy Forum schema](schema/forum.sql): retained as historical design input;
	it is not applied by the migration runner.

Run migrations from `backend` with `npm run db:migrate`; validate with
`npm run db:check`. The runner uses `DATABASE_PATH` or defaults to
`.data/cvs-garage.sqlite`.

## Design documents

[design/README.md](design/README.md) indexes the accepted common model and the
earlier Member Centre requirement documents.

- Follow [../INSTRUCTIONS.md](../INSTRUCTIONS.md).
- Keep schema changes compatible with agreed APIs, or document coordinated rollouts.
- Never modify a migration after it has been shared. Add a new numbered migration.
- Back up before non-development migrations and validate restore procedures.
- Use synthetic data only in fixtures.
