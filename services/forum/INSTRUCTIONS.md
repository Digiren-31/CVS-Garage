# Forum and Discussions Working Instructions

- Follow [../../CONTRIBUTING.md](../../CONTRIBUTING.md).
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
- Add local setup and test instructions when tooling is selected. Until then,
  validate directory placement and documentation without adding application code.