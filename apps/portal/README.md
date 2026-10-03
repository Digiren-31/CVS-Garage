# Central portal

**Owner:** portal maintainer. **Status:** runnable integrated application.

The portal provides the shared application shell, dashboard, responsive
navigation, light/dark/system mode control, and routes for all six
service-owned frontends. Local builds retain the development identity selector;
configured builds use Supabase Google OAuth and approval-aware route gates.

## Workspace experience

- Pure-white light and pitch-black dark canvas bases use the shared neutral UI
  tokens, with subtle warm/violet gradient overlays and equal support for live
  system color mode. Service identities remain on functional navigation and
  actions rather than in canvas washes.
- A decorative pointer highlight follows fine hover pointers across the canvas
  and marked cards. Touch, reduced motion, reduced transparency, and forced
  colors omit the pointer effect; reduced transparency and forced colors also
  remove the canvas gradients.
- The multicolored, circuit-inspired garage mark appears in the home link and browser tab;
  the overview pairs a compact campus-connection illustration with the existing
  greeting, counts, project previews, and event previews.
- An edge-to-edge application canvas, horizontal colored pill navigation, lighter
  typography, and generously spaced content preserve the shared visual direction.
- The shell fills the viewport width and at least its height, without a fixed
  maximum width or exterior margins. Spacing and rounded corners belong to the
  content and cards, not an inset outer frame.
- The overview is deliberately limited to a short greeting, three campus
  counts, and at most two project and two event previews. There is no repeated
  workspace menu, profile illustration, mentor chart, or full activity board.
- Project, event, idea, member, and discussion details have dedicated URLs and
  back-to-list navigation. Discovery filters are preserved in the URL.
- Short Framer Motion entrances respect reduced motion.
  The overview remains code-split from service-only visits.
- Use the header navigation toggle to switch between labelled pills and compact
  icon tabs. That choice is saved locally. Mobile uses a keyboard-accessible
  modal drawer rather than inheriting the desktop collapsed state.
- Filters, tags, cards, tables, and controls adapt to narrow layouts. Opaque
  surfaces and system colors are used where glass effects are not appropriate.
- Use the header theme button to cycle System → Light → Dark → System. In local
  demo mode the avatar opens the synthetic identity selector. In the hosted
  pilot the header starts Google sign-in and exposes account sign-out.

## Item routes

| Area | Collection | Individual page |
| --- | --- | --- |
| Projects | `/projects` | `/projects/:projectId` |
| Events | `/events` | `/events/:eventId` |
| Idea Centre | `/idea-centre` | `/idea-centre/ideas/:ideaId` |
| Member Centre | `/member-centre` | `/member-centre/members/:memberId` |
| Forum | `/forum` | `/forum/posts/:postId` |

Forum discovery sections also have `/forum/communities`, `/forum/mentors`,
and `/forum/moderation` URLs. These are portal routes, not new backend API
endpoints. Detail routes support direct entry, refresh, browser back/forward,
loading, retry, and missing-item states without displaying the collection below.

## Run

From the repository root:

```bash
npm install
npm run dev
```

Open `http://localhost:3000`. For a production-style local bundle, run
`npm run build && npm start` and open `http://localhost:4000`.

## Boundaries

- Service pages are imported only from each service's public `src/index.ts`.
- Domain behavior remains in its service and backend module.
- Shared presentation comes from `packages/ui`; browser transport comes from
  `packages/api-client`.
- The identity selector is synthetic development tooling, not authentication.
It is disabled when Supabase is enabled. Production service routes require an
active member profile; pending and suspended users receive explicit gates.

Read [INSTRUCTIONS.md](INSTRUCTIONS.md) and the repository
[UI guidelines](../../docs/ui-guidelines.md) before editing.
