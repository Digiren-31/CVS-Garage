# Database Working Area

**Owner:** backend team. **Status:** documentation only.

This folder is reserved for the database schema, migration definitions, and
sanitized development fixtures when a database and migration tool are selected.
It is not a location for database binaries, backups, credentials, or student data.

## Design documents

[design/README.md](design/README.md) indexes the proposed Member Centre schema,
role strategy, API architecture, and activity-log design. These are
specifications awaiting review; they select no engine and add no migrations.

- Follow [../INSTRUCTIONS.md](../INSTRUCTIONS.md).
- Do not choose a database or create migrations during the structure-only phase.
- Keep schema changes compatible with agreed APIs, or document coordinated rollouts.
- Document validation and rollback/recovery procedures when migrations are added.
- Use synthetic data only in future fixtures.
