# Central portal working instructions

- Follow [../../CONTRIBUTING.md](../../CONTRIBUTING.md).
- Follow [../../docs/ui-guidelines.md](../../docs/ui-guidelines.md) for Fluent UI,
  area identities, typography, modes, motion, and accessibility.
- Own only the homepage, app shell, global navigation, route composition, and
  publication. Keep domain workflows in the corresponding service.
- Import services through their public `src/index.ts`, never private modules.
- Reuse `packages/ui`, `packages/api-client`, and `packages/contracts`.
- Keep database access, server secrets, and authorization out of browser code.
- Preserve responsive navigation, keyboard access, visible focus, loading/error
  states, and light/dark/system behavior.
- Run portal tests, lint, type-check, and production build before completion.
- Central hosting credentials and release approval stay with the portal maintainer.
