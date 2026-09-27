# Forum and Discussions Working Instructions

- Follow [../../CONTRIBUTING.md](../../CONTRIBUTING.md).
- Follow [../../docs/ui-guidelines.md](../../docs/ui-guidelines.md), including
  the Forum and Discussions color identity and shared theme behavior.
- Own the discussion frontend, its local tests, and service documentation.
- Confirm discussion workflows and data requirements before implementation.
- Treat user-generated content as untrusted; rendering and server-side access
  rules must be agreed when the feature is implemented.
- Do not import another service's private source or central portal internals.
- Coordinate the public integration interface with the portal maintainer;
  global navigation and central publication remain maintainer-owned.
- Agree APIs through [../../packages/contracts/README.md](../../packages/contracts/README.md).
- Leave backend/database implementation and privileged operations to the backend team.
- Use branches such as `forum/feat/<description>` and pull requests into `main`.
- Preserve the implemented Forum workflows while using the shared Fluent UI,
  API client, contracts, and canonical cyan identity in the portal route.
- Export the route through `src/index.ts` and run portal plus backend validation.
