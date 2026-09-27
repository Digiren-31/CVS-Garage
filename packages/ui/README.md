# Shared UI

`src/` contains the Fluent UI React v9 theme provider and reusable page, card,
metric, state, panel, and status primitives used by the portal and all service
frontends.

The provider applies the canonical area identity for the active route and
supports light, dark, and system modes. Domain-specific compositions remain in
their service folders.

Follow [INSTRUCTIONS.md](INSTRUCTIONS.md) and
[docs/ui-guidelines.md](../../docs/ui-guidelines.md). Validate affected portal
tests, type-check, and build after shared changes.
