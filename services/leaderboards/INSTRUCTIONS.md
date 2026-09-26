# Leaderboards Working Instructions

- Follow [../../CONTRIBUTING.md](../../CONTRIBUTING.md).
- Own the Leaderboards frontend, local tests, and service documentation.
- Agree ranking criteria, scoring rules, and data sources with stakeholders and
  the backend team; do not invent authoritative scores in the browser.
- Do not import another service's private source or central portal internals.
- Coordinate shared components and a public integration interface with the
  portal maintainer; global navigation and central publication are not team-owned.
- Agree APIs through [../../packages/contracts/README.md](../../packages/contracts/README.md).
- Leave backend/database implementation and privileged operations to the backend team.
- Use branches such as `leaderboards/feat/<description>` and pull requests into `main`.
- Add local setup and test instructions when tooling is selected. Until then,
  validate directory placement and documentation without adding application code.