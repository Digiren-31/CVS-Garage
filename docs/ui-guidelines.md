# UI and Theme Guidelines

These guidelines are the design contract for the central portal and every
service frontend. They define the shared visual language implemented by the
portal and shared UI package. The portal maintainer owns this document and
`packages/ui`, with changes reviewed by affected service teams.

## Design principles

- Keep interfaces minimal, calm, and task-focused. Prefer clear hierarchy and
  useful whitespace over decorative containers.
- Use consistent interaction patterns across the portal and services. An area
  theme changes identity, not behavior or information architecture.
- Make every state intentional: loading, empty, error, success, disabled,
  selected, hover, focus, and pressed.
- Use motion to explain change and preserve context. Never make motion a
  prerequisite for understanding or completing a task.
- Meet WCAG 2.2 AA as a baseline in both light and dark modes.

## Component system

Fluent UI React v9 (`@fluentui/react-components`) is the required component and
design-token system for all frontend areas. Do not mix Fluent UI generations.

- Start with a Fluent component before creating a custom equivalent.
- Compose or wrap Fluent primitives in `packages/ui` when behavior or styling is
  reused by multiple areas.
- Keep domain-specific compositions and screens in their owning app or service.
- Use Fluent icons through the package appropriate to the selected stack. Do not
  maintain hand-drawn copies of icons already available there.
- Use Fluent design tokens instead of component-level literal colors, shadows,
  radii, typography, or spacing.
- Do not override Fluent internals or depend on generated class names.

The dependency is owned by the portal workspace; service source is composed into
that build and must consume the shared UI primitives instead of installing a
parallel component system.

## Theme architecture

Every frontend uses the same neutral foundation and semantic token meanings.
Each area adds one distinct brand ramp for identity and emphasis.

Theme layers, from broadest to narrowest:

1. Fluent global tokens provide spacing, typography, shape, elevation, and
   neutral color foundations.
2. Repository semantic tokens describe intent, such as page background,
   navigation background, subtle border, success, warning, danger, and focus.
3. An area brand ramp supplies accent, selected, and primary-action colors.
4. Components consume semantic or Fluent alias tokens, never raw palette values.

The shared UI package owns theme creation, semantic tokens, typography, mode
handling, and shared primitives. The portal selects the area theme for the
active route; services must not redefine global token semantics locally.

### Area identities

The following colors are identity seeds, not ready-to-use text or background
colors. Generate complete Fluent-compatible light and dark ramps from each seed,
then validate every semantic token pairing for contrast.

| Area | Identity | Seed | Intended character |
| --- | --- | --- | --- |
| Central portal | Campus blue | `#0F6CBD` | dependable and unifying |
| Projects | Indigo | `#5B5FC7` | structured and inventive |
| Events | Magenta | `#C239B3` | energetic and social |
| Member Centre | Forest green | `#1E6B3F` | supportive and personal |
| Leaderboards | Gold | `#A15C00` | achievement and momentum |
| Idea Centre | Coral | `#D83B01` | creative and optimistic |
| Forum and Discussions | Cyan | `#007E8C` | conversational and open |

**Decision:** Member Centre uses Forest green with a neutral off-white light
surface. Forest green replaces the earlier Teal proposal and avoids conflicting
with Forum's cyan identity. The `#1E6B3F` seed carries a white-text contrast
ratio above 4.5:1 at its base; generated theme pairings still require automated
and visual contrast validation.

The off-white surface is an area-level preference and must be expressed through
the neutral background tokens described in the theme architecture above. It does
not redefine what those tokens mean, and other areas are unaffected.

Area accents should be visible in primary actions, active navigation, focus
details, small highlights, and selected states. Keep primary surfaces neutral;
do not tint an entire product into a one-color interface. Status colors retain
the same meaning in every area and never change to match an area's brand.

## Light and dark modes

Light and dark themes are equal product requirements, not a generated inversion.

- Default to the operating-system preference on first use.
- Provide an accessible user choice for light, dark, or system mode.
- Persist an explicit choice and apply it before first paint to avoid a theme
  flash once runtime implementation exists.
- Use a Fluent theme provider at each frontend root. Portals or embedded service
  boundaries must pass the resolved mode and area theme deliberately.
- Re-evaluate elevation, borders, illustrations, charts, images, and status
  colors in each mode; do not invert media indiscriminately.
- Use token-based transitions only after the initial theme is resolved.

Do not use pure black as the default dark surface or pure white for every light
surface. Fluent neutral tokens should provide layered, readable surfaces without
turning page sections into stacks of floating cards.

## Typography

Google Sans is the product typeface. Define it once in the shared theme and use
Fluent typography tokens so scale, line height, and weight remain consistent.

Recommended family stack:

```css
"Google Sans", "Segoe UI", sans-serif
```

- Use Google Sans for interface text and display headings; use a monospace face
  only where content is genuinely code or fixed-width data.
- Keep body text at least 16 CSS pixels by default and preserve comfortable line
  height. Compact data-dense controls may use the supported Fluent body-small
  token where readability remains strong.
- Use no negative letter spacing and do not scale type directly with viewport
  width.
- Use sentence case for headings, labels, actions, and navigation.
- Keep heading levels semantic and sequential; appearance comes from tokens, not
  from choosing the wrong HTML element.
- Prevent layout shift by loading approved font assets deliberately and using an
  appropriate fallback strategy.

Google Sans font files must be supplied through an approved, licensed source
before implementation. Do not commit unlicensed font files or assume a public
Google Fonts URL exists. Until approved assets are available, the fallback stack
is the expected rendering rather than a copied substitute.

## Layout and visual treatment

- Use a shared spacing scale based on Fluent tokens; avoid one-off spacing values.
- Prefer full-width page regions and unframed layouts. Reserve cards for repeated
  items, dialogs, and genuinely bounded tools; never nest cards for decoration.
- Keep card corner radii at 8 CSS pixels or less unless a Fluent component's
  standard token requires otherwise.
- Maintain stable control, toolbar, grid, and media dimensions so loading or
  interaction states do not shift the layout.
- Design mobile and desktop layouts together. Navigation, tables, forms, and
  dialogs must remain usable without clipped or overlapping text.
- Use icons for familiar compact actions and pair unfamiliar icons with an
  accessible name and tooltip. Use text or icon-plus-text for important commands.
- Avoid decorative gradients, glowing blobs, and excessive shadows. Photography,
  illustrations, and other assets must clarify real content or identity.

## Interaction and motion

Use a small motion vocabulary throughout the repository:

| Purpose | Typical duration | Guidance |
| --- | --- | --- |
| Immediate feedback | 80-120 ms | hover, press, focus, toggle feedback |
| Component transition | 160-220 ms | menus, dialogs, selection, content reveal |
| Page-level transition | 240-320 ms | route or major layout change only |

- Prefer Fluent motion tokens and standard easing when available.
- Animate opacity and transforms where practical; avoid layout-thrashing effects.
- Do not animate every surface. Motion should communicate cause, hierarchy, or
  continuity.
- Honor `prefers-reduced-motion`. Remove nonessential movement and use immediate
  state changes or brief fades without losing information.
- Never delay input, navigation, or task completion to finish an animation.

## Accessibility and content

- Meet a contrast ratio of at least 4.5:1 for normal text, 3:1 for large text,
  and 3:1 for meaningful interface graphics and control boundaries.
- Ensure complete keyboard operation, logical focus order, visible focus, and
  correctly restored focus after dialogs or route changes.
- Do not communicate state using color alone. Pair color with text, iconography,
  shape, or another programmatic cue.
- Use native semantics first and Fluent's accessibility behavior second; add ARIA
  only where native semantics are insufficient.
- Keep labels concise and specific. Error text explains what happened and how to
  recover without blame.
- Support browser zoom, text resizing, high-contrast/forced-color modes, and
  touch targets of at least 24 by 24 CSS pixels, with 44 by 44 preferred for
  primary touch actions.

## Governance and validation

Changes to shared tokens, theme contracts, typography, or reusable primitives
require portal-maintainer review and consultation with affected service teams.
Service-owned screens may compose shared primitives freely but must not fork the
theme or duplicate common components to bypass shared review.

A frontend change is complete only when it:

- uses the correct area theme through the shared provider;
- has been checked in light, dark, and system modes;
- supports keyboard-only and reduced-motion use;
- passes automated accessibility and relevant component tests;
- has been inspected at representative mobile and desktop widths; and
- introduces no raw visual values where an approved token exists.

Run the portal component tests, type-check, lint, and production build for
frontend changes, then inspect representative mobile and desktop routes in the
supported theme modes.