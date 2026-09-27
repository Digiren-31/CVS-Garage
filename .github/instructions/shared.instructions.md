---
description: "Use when working on shared UI, frontend API transport, or frontend/backend contracts."
applyTo: "packages/**"
---

# Shared Scope

- Find and read the area's instructions through the [shared area index](../../packages/README.md).
- For shared UI work, follow the repository
	[UI and theme guidelines](../../docs/ui-guidelines.md).
- Coordinate interface changes with affected consumers; shared code must not import portal or service internals.
- Keep contracts framework-neutral, transport behavior in `api-client`, and
  reusable Fluent presentation primitives in `ui`.
- Run affected portal tests, type-check, and build after shared changes.
