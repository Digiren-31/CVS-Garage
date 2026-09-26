# Shared API Client Working Instructions

- Follow [../../CONTRIBUTING.md](../../CONTRIBUTING.md).
- Implement shared transport only after contracts and session behavior are agreed.
- Consume [../contracts/README.md](../contracts/README.md), not private service
  or portal implementation.
- Keep service presentation and business workflows out of the shared client.
- Never include server secrets or connect browser code directly to a database.
- Agree error handling and authentication behavior with the backend team rather
  than inventing token storage, endpoints, or retry policies in this phase.
- Coordinate changes with affected consumers and add validation when tooling exists.