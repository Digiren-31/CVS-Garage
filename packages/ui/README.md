# Shared UI

`src/` contains the Fluent UI React v9 theme provider and reusable page, card,
metric, state, panel, and status primitives used by the portal and all service
frontends.

The provider applies the canonical area identity for the active route and
supports light, dark, and system modes. Domain-specific compositions remain in
their service folders.

`glassTokens` supplies the pure-white light and pitch-black dark canvas bases,
restrained warm/violet gradient overlays and pointer/card glow colors, neutral
surfaces, borders, and illustration treatments. The portal UI uses neutral
accents except for its multicolored logo; service area identity remains available for active
navigation and actions. The portal owns pointer tracking and turns off
decorative effects for reduced motion, reduced transparency, touch, and forced
colors.
`areaTokens(area)` supplies readable area-specific icon colors, subtle fills,
and solid brand fills for selected navigation pills. The provider also publishes these semantic
variables for Fluent's portalled menus, tooltips, and drawers.

Existing page/card/state APIs remain compatible; `MetricCard` additionally
accepts an optional decorative `icon`. Shared primitives consistently wrap
statuses and allow grid children to shrink without overflowing.

Typography follows the reference's light hierarchy: regular-weight page
headings/numbers, 500-weight labels, and 600-weight emphasis. Shared shape tokens
use 16-pixel controls, 24-pixel panels, and 32-pixel outer frames.

Theme tests enforce 4.5:1 text and primary-action contrast and 3:1 focus/control
boundaries for every area in both modes. System-theme changes are tested without
overriding an explicit light or dark choice.

Follow [INSTRUCTIONS.md](INSTRUCTIONS.md) and
[docs/ui-guidelines.md](../../docs/ui-guidelines.md). Validate affected portal
tests, type-check, and build after shared changes.
