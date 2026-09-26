# CVS Garage — Repository Instructions

## Current scope

- This is a framework-neutral college portal monorepo at the directory-only stage.
- Preserve the central portal, six service areas, backend/database handoff, and
  shared working areas listed in [../README.md](../README.md).
- Treat [../docs/ui-guidelines.md](../docs/ui-guidelines.md) as the design
  contract for every portal and service frontend.
- Do not add UI, routes, application logic, dependencies, or deployment setup
  unless a later request explicitly starts that implementation work.

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

- There are no install, build, test, debug, or launch commands yet.
- For scaffold edits, verify directory placement, local links, and instruction
  scopes. Never report application checks as passing when no application exists.
- Add actual setup/validation commands and update these instructions when the
  stack is selected. Do not add fake-success scripts or unnecessary extensions.

## Initial setup checklist

- [x] Verify repository instructions — created and customized for this repository.
- [x] Clarify requirements — central portal, six services, separate backend ownership; structure only.
- [x] Scaffold project — landing pages, local instructions, and working directories created.
- [x] Customize project — contribution rules, ownership template, and scoped editor instructions added.
- [x] Install required extensions — skipped; none required for a directory scaffold.
- [x] Compile project — skipped; no application code or dependencies exist.
- [x] Create and run task — skipped; no runnable application or build task exists.
- [x] Define UI direction — Fluent UI, area themes, typography, modes, motion,
  and accessibility documented; implementation remains deferred.
- [x] Launch project — skipped; application implementation belongs to a later phase.
- [x] Complete documentation — working folders, local links, instruction scopes, formatting, and diagnostics verified.
