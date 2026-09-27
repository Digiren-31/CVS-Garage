# Database Working Area

**Owner:** backend team. **Status:** production migration designs.

This folder contains production-oriented schema and migration designs. The
runnable MVP currently uses ignored JSON state through the backend repository
boundary; these documents guide the later PostgreSQL migration.

## Design documents

[design/README.md](design/README.md) indexes the proposed Member Centre schema,
role strategy, API architecture, and activity-log design. These are
PostgreSQL-targeted specifications awaiting migration-tool selection and do not
yet add executable migrations.

- Follow [../INSTRUCTIONS.md](../INSTRUCTIONS.md).
- Keep production schema work coordinated with the runtime repositories and
  shared API contracts.
- Keep schema changes compatible with agreed APIs, or document coordinated rollouts.
- Document validation and rollback/recovery procedures when migrations are added.
- Use synthetic data only in future fixtures.
