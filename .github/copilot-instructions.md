# CVS Garage — Repository Instructions

## Current scope

- This is a runnable college portal monorepo with a React/TypeScript/Vite portal,
  six service-owned frontend areas, and a centralized Express backend.
- Preserve the central portal, six service areas, backend/database handoff, and
  shared working areas listed in [../README.md](../README.md).
- Treat [../docs/ui-guidelines.md](../docs/ui-guidelines.md) as the design
  contract for every portal and service frontend.
- Preserve the public service entry points, shared contracts/client/UI packages,
  versioned API routes, and development-only identity boundary documented in
  [../docs/architecture.md](../docs/architecture.md).

## Working rules

- Read [../CONTRIBUTING.md](../CONTRIBUTING.md) and the affected area's local
  instructions before editing. Path-specific instructions link to each area.
- Keep teams' changes in their own area; coordinate shared interfaces and
  cross-area changes with the affected owners.
- The portal maintainer owns central navigation and publication. Service teams
  own domain frontends; the backend team owns APIs, access control, and databases.
- Use Fluent UI, the assigned area identity, Google Sans typography, and shared
  light/dark theme behavior for frontend implementation. Coordinate shared
  tokens and primitives through `packages/ui`.
- Do not import private code from other services or portal internals. Follow
  [../docs/architecture.md](../docs/architecture.md) for dependency direction.
- Never commit secrets or real student data, and never place privileged server
  operations or database access in browser code.
- Treat `x-user-id` as local development tooling only. Protected backend routes
  must still authorize the resolved synthetic identity.
- Keep local JSON runtime state under the ignored `backend/data` directory.
- Keep this repository as the project root; do not create nested Git repositories.
- Preserve placeholder files so source/test working directories survive Git clones.
- No GitHub team or protection is active merely because an instruction file
  exists. Follow [../docs/team-setup.md](../docs/team-setup.md) for owner setup.

## Validation

- Install dependencies with `npm install` (or `npm ci` in CI).
- Use `npm run dev` for the portal and API development servers.
- Run `npm run lint`, `npm run typecheck`, `npm test`, and `npm run build`
  before completing integrated changes; `npm run check` runs the full sequence.
- Backend route changes require Supertest coverage or an explicit runtime HTTP
  probe. Frontend workflows require component tests and representative browser
  checks.
- Never add fake-success scripts or silently convert failed API calls to empty data.
