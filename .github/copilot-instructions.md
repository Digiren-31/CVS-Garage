# CVS Garage — Repository Instructions

## Current scope

- This is a college portal monorepo with a modular Express backend, a local SQLite
  schema, a Forum implementation, and frontend areas at different maturity levels.
- Preserve the central portal, six service areas, backend/database handoff, and
  shared working areas listed in [../README.md](../README.md).
- Treat [../docs/ui-guidelines.md](../docs/ui-guidelines.md) as the design
  contract for every portal and service frontend.
- Add implementation only when a request starts that work and follow the affected
  area's current architecture and ownership instructions.

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
- Keep this repository as the project root; do not create nested Git repositories.
- Preserve placeholder files so source/test working directories survive Git clones.
- No GitHub team or protection is active merely because an instruction file
  exists. Follow [../docs/team-setup.md](../docs/team-setup.md) for owner setup.

## Validation

- Backend database changes run `npm run db:migrate`, `npm run db:check`, and
  affected tests from `backend`. Forum tests use `npm test` there.
- Frontend areas without selected tooling still use scaffold validation only.
- Report only checks actually run; do not add fake-success scripts.

## Initial setup checklist

- [x] Verify repository instructions — created and customized for this repository.
- [x] Clarify requirements — central portal, six services, and separate backend ownership.
- [x] Scaffold project — landing pages, local instructions, and working directories created.
- [x] Customize project — contribution rules, ownership template, and scoped editor instructions added.
- [x] Install required extensions — skipped; none required for a directory scaffold.
- [x] Compile project — backend schema validated with SQLite; no shared frontend build exists.
- [x] Create and run task — backend commands documented; frontend tasks remain area-specific.
- [x] Define UI direction — Fluent UI, area themes, typography, modes, motion,
  and accessibility documented; implementation remains deferred.
- [x] Launch project — backend launch documented; local Node installation is required.
- [x] Complete documentation — working folders, local links, instruction scopes, formatting, and diagnostics verified.
