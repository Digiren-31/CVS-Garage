---
description: "Use when working on the central college portal, homepage, application shell, navigation, or portal integration."
applyTo: "apps/portal/**"
---

# Central Portal Scope

- Read [portal working instructions](../../apps/portal/INSTRUCTIONS.md) before editing.
- Follow the repository [UI and theme guidelines](../../docs/ui-guidelines.md)
	for all frontend design and implementation.
- Keep central navigation and publication maintainer-owned; service teams own domain implementation.
- Compose service frontends through their public `src/index.ts` entry points.
  Keep domain behavior out of the portal shell.
- Use the shared theme and API client. Validate responsive navigation, theme
  modes, route behavior, component tests, type-check, and production build.
