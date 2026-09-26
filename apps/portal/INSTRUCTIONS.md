# Central Portal Working Instructions

- Follow [../../CONTRIBUTING.md](../../CONTRIBUTING.md).
- Own the homepage, application shell, global navigation, and central publication
  when implementation is requested. Do not implement these in the structure phase.
- Coordinate the frontend stack and service integration interfaces before adding
  runtime dependencies or mounting service frontends.
- Consume services through agreed public interfaces, not their private source.
- Keep domain-specific logic in the corresponding service area.
- Coordinate shared UI and API transport changes with affected teams.
- Keep database access, server secrets, and privileged operations out of browser code.
- Use branches such as `portal/feat/<description>` and pull requests into `main`.
- Add documented setup and validation commands when application tooling exists;
  for now, validate folder placement and documentation only.
- Central hosting credentials and release approval stay with the portal maintainer.