# Projects Working Instructions

- Follow [../../CONTRIBUTING.md](../../CONTRIBUTING.md).
- Own the Projects frontend, its local tests, and service documentation.
- Confirm project-related features and data requirements before implementing them.
- Do not import another service's private source or central portal internals.
- Coordinate shared components and a public integration interface with the
  portal maintainer; global navigation and central publication are not team-owned.
- Agree APIs with the backend team through
  [../../packages/contracts/README.md](../../packages/contracts/README.md).
- Leave backend/database implementation and privileged operations to the backend team.
- Use branches such as `projects/feat/<description>` and pull requests into `main`.
- Add local setup and test instructions when tooling is selected. Until then,
  validate directory placement and documentation without adding application code.