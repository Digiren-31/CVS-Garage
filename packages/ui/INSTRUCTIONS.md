# Shared UI Working Instructions

- Follow [../../CONTRIBUTING.md](../../CONTRIBUTING.md).
- Follow [../../docs/ui-guidelines.md](../../docs/ui-guidelines.md) as the
	canonical contract for Fluent UI, tokens, typography, modes, and motion.
- Keep reusable presentation primitives framework-consistent with Fluent UI
  React v9 and preserve the area-aware theme provider.
- Keep API calls, domain rules, and service-specific screens out of shared UI.
- Do not import portal or service implementation.
- Coordinate changes with affected consumers and document compatibility.
- Add or update tests for shared behavior and run the portal type-check/build.
