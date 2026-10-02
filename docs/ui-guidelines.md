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

## Liquid glass visual direction

The portal and all six services share a minimal monochrome workspace: a pure
white canvas in light mode and a pitch-black canvas in dark mode, with neutral
panels, fine borders, and clear area-colored functional accents. Subtle warm
and violet gradients may sit above those base colors as decoration; glass
treatments must not compromise contrast.

- Retain the supplied reference's horizontal pill navigation, lightweight
  headings, soft surfaces, and rounded panels without reproducing its density.
  Favor fewer, well-spaced sections over fitting every feature onto one page.
  The application itself fills the screen rather
  than reproducing the reference image's inset presentation frame. Do not bring
  back an oversized marketing hero or a permanent desktop sidebar.
- Keep the shell edge-to-edge, with no maximum-width cap, exterior gutters,
  rounded outer corners, or frame shadow. Its minimum height is the dynamic
  viewport height. Interior panels retain their spacing, rounded corners,
  light inset highlights, soft translucency, and minimal borders.
- Keep each service's assigned palette below for active navigation and actions.
  The portal uses neutral UI accents; its multicolored, circuit-inspired garage
  mark stays in the logo, not scattered through backgrounds or decorative effects.
- Shared glass values live in [glass.ts](../packages/ui/src/glass.ts).
  Use `glassTokens` for surfaces, blur, borders, shadows, gradients, and
  illustration treatments; use Fluent tokens for typography, spacing, shape,
  and controls.
- Theme-aware area icon colors and subtle fills come from `areaTokens(area)`.
  Identity seeds are not readable foreground colors in every mode.
- Keep content and controls crisp. Use blur on the background, not on text.
  Dense content, menus, and form controls retain strong, legible surfaces.
- The overview contains a short greeting, three campus counts, and at most two
  featured project and two upcoming event previews. Do not duplicate global
  navigation with a workspace section or add an oversized personal profile,
  mentor ring, or multiple activity boards. Project progress remains real API data.
- Discovery cards are previews, not embedded detail pages. Titles and view
  actions link to the individual record. Full descriptions, replies, membership
  controls, and administrative actions belong on the appropriate detail page.
- When backdrop filters are unavailable or reduced transparency is requested,
  use opaque surfaces. Forced-color mode removes decorative imagery and
  preserves system colors and control boundaries.
- Pointer-following glow is decorative only. Limit it to fine hover pointers,
  keep it behind content and non-interactive, and disable it for reduced motion,
  reduced transparency, touch, and forced colors.
- Scope full-page sizing and backgrounds to the application root. Fluent
  portal providers also inherit the provider class; tooltips and dialogs must
  never become full-screen opaque layers because of root styling.

## Component system

Fluent UI React v9 (`@fluentui/react-components`) is the required component and
design-token system for all frontend areas. Do not mix Fluent UI generations.

- Start with a Fluent component before creating a custom equivalent.
- Compose or wrap Fluent primitives in `packages/ui` when behavior or styling is
  reused by multiple areas.
- Keep domain-specific compositions and screens in their owning app or service.
- Keep the runtime's existing Lucide icon set consistent alongside Fluent
  components. Do not introduce a competing icon set or maintain hand-drawn
  copies of available icons.
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
Each identity has a complete brand ramp with distinct hover and pressed states.
Shared theme tests verify text, brand action, focus, and control-border contrast
in every area and mode.

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

The earlier Member Centre off-white canvas is superseded by the shared pure-white
light canvas; its forest-green identity remains in functional accents.

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

Use `#000000` for the dark page canvas and `#ffffff` for the light page canvas.
Panels and controls may use adjacent neutral shades to remain distinct. Restrained
warm/violet gradient overlays and hover glows may add depth, but never replace the
base colors, tint neutral surfaces blue, or obscure content. Reduced transparency
and forced-color modes remove the decorative canvas gradients.

## Typography

Google Sans is the product typeface. Define it once in the shared theme and use
Fluent typography tokens so scale, line height, and weight remain consistent.

Recommended family stack:

```css
"Google Sans", "Avenir Next", "Segoe UI", sans-serif
```

- Use Google Sans for interface text and display headings; use a monospace face
  only where content is genuinely code or fixed-width data.
- Use regular-weight page headings and numeric summaries. The shared hierarchy
  uses 400 for regular text, 500 for semibold labels, and 600 for stronger
  emphasis. Avoid broad use of heavy display weights.
- Desktop page headings use the 32-pixel/42-pixel token pair, with smaller
  headings on narrow screens. The platform-provided Avenir Next fallback keeps
  a rounded, geometric feel on macOS without adding or downloading font assets.
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
- Prefer simple page regions. Reserve glass cards for repeated items, the
  landing composition, dialogs, and genuinely bounded tools; never nest cards
  for decoration.
- Use the shared shape tokens: 16-pixel controls, 24-pixel cards, and 32-pixel
  large feature panels. Navigation pills and small tags use the circular token. Do not hard-code
  competing radii in individual services.
- Maintain stable control, toolbar, grid, and media dimensions so loading or
  interaction states do not shift the layout.
- Design mobile and desktop layouts together. Navigation, tables, forms, and
  dialogs must remain usable without clipped or overlapping text.
- Give grid and flex children a zero minimum width where they must shrink.
  Wrap filters, tags, statuses, and actions; use deliberate internal scrollers
  for wide tables instead of making the document overflow.
- Use a relaxed two-column overview at desktop widths and stack its sections
  at 1000 pixels and below. Shared discovery cards target a minimum width of
  360 pixels where available and reflow to one column on small screens.
  Keep useful whitespace; do not add widgets simply to fill the viewport.
- Align card footers and action rows, preserve readable long titles, and use a
  consistent tinted status treatment. A status badge must not squeeze a title
  into a narrow column.
- Use icons for familiar compact actions and pair unfamiliar icons with an
  accessible name and tooltip. Use text or icon-plus-text for important commands.
- Keep the approved canvas gradients and hover glows subtle. Avoid excessive
  shadows, distracting glowing blobs, or continuous decorative motion.
  Illustrations and other assets must clarify content or product identity.

## Workspace navigation

- Desktop navigation is a horizontal group of pill-shaped route links in the
  header. Each link retains its area's color accent; the selected pill uses the
  area's solid brand color and readable on-brand text. These are navigation
  links, not an ARIA tablist.
- The header toggle collapses labels into a compact horizontal icon strip.
  Preserve all seven destinations, the current-page state, accessible names,
  and descriptive tooltips in both states.
- Persist the explicit desktop choice in `cvs-garage-sidebar`. If storage is
  unavailable, log the failure and keep navigation working for the session.
  The legacy key is retained so existing preferences survive the redesign.
- At mobile widths, use a labelled Fluent modal drawer with focus containment,
  Escape and backdrop dismissal, and a visible close action. Desktop collapse
  preferences must not truncate the mobile drawer.
- Close the drawer when navigating. Restore focus to the toggle on dismissal
  and move focus to the main content when a route changes.
- Keep a single header button that cycles System → Light → Dark → System, with
  an accessible name identifying the current and next mode. The synthetic
  identity selector lives behind the Demo avatar at every width; its popover
  supports keyboard focus and dismissal. Label it and the application footer
  as demo tooling, not authentication.
- Do not move focus into the main content on initial load. Route changes and
  the skip link still focus the main content deliberately. New route paths
  start at the top of the page rather than retaining a scrolled list position.

## Collection and detail pages

- Give projects, events, ideas, member profiles, and Forum discussions their
  own addressable pages. Do not append selected details below the discovery list.
- Detail pages have an item-specific heading and a clear return link, including
  during loading, errors, or missing-item states. Do not show unrelated search
  controls, directory cards, aggregate statistics, or discovery sidebars there.
- Keep list search/filter choices in query parameters and retain them in item
  links and return links. Direct URLs, refresh, and browser history must work.
- Fetch a requested item independently of a narrowed list. When a domain's
  existing API only exposes a collection, resolve the ID from an unfiltered
  response, not the current search results.
- Ignore stale responses after navigation; never display one item's details
  under another item's URL. Preserve all mutation permissions and explicit
  action feedback when moving controls from a list to a detail page.

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
- The overview uses Framer Motion for a short 240 ms entrance. It does not loop.
  Reduced-motion mode removes
  entrances and transforms without hiding content.
- Load the landing page and its animation code as a route chunk so service-only
  visits do not download the landing animation implementation.

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