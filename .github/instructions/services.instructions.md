---
description: "Use when working on Projects, Events, Member Centre, Leaderboards, Idea Centre, or Forum and Discussions service areas."
applyTo: "services/**"
---

# Service Scope

- Find the area's instructions in the [service index](../../services/README.md) and read them before editing.
- Follow the repository [UI and theme guidelines](../../docs/ui-guidelines.md),
  including the service's assigned color identity.
- Keep changes within that service unless cross-team work is explicitly agreed.
- Never import another service's private source or portal internals.
- Export the service page through `src/index.ts`; the portal consumes only that
  public entry point.
- Consume `packages/ui`, `packages/api-client`, and `packages/contracts` rather
  than creating local transport or design systems.
- Add focused tests and validate the portal type-check/build after service changes.
