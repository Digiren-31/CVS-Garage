# Shared API Client Working Instructions

- Follow [../../CONTRIBUTING.md](../../CONTRIBUTING.md).
- Consume [../contracts/README.md](../contracts/README.md), not private service
  or portal implementation.
- Keep service presentation and business workflows out of the shared client.
- Never include server secrets or connect browser code directly to a database.
- Preserve explicit `ApiClientError` behavior and the development-only identity
  header until production authentication replaces it.
- Coordinate changes with affected consumers and run portal tests/type-check.
