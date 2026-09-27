# Member Centre Working Instructions

- Follow [../../CONTRIBUTING.md](../../CONTRIBUTING.md).
- Follow [../../docs/ui-guidelines.md](../../docs/ui-guidelines.md), including
  the Member Centre color identity and shared theme behavior.
- Own the Member Centre and admin UI, local tests, and service documentation.
- Agree member workflows, role names, and permissions before implementation.
- Authentication and authorization belong to the backend team. Hiding an admin
  control is not security: the server must authorize every protected operation.
- Never store privileged credentials or database connections in frontend code.
- Do not import another service's private source or central portal internals.
- Coordinate the public integration interface with the portal maintainer;
  global navigation and central publication remain maintainer-owned.
- Agree APIs through [../../packages/contracts/README.md](../../packages/contracts/README.md).
- Use branches such as `member-centre/feat/<description>` and pull requests into `main`.
- Export the route through `src/index.ts`, use shared Fluent UI/API contracts,
  and run portal tests, type-check, and build after changes.
