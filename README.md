# CVS Garage — College Innovation Portal

CVS Garage is a modular college portal that brings Projects, Events, Member
Centre, Leaderboards, Idea Centre, and Forum & Discussions into one shared
workspace. The repository now contains a runnable full-stack MVP with synthetic
development data.

**Live pilot:** [https://cvs-garage-pilot.onrender.com](https://cvs-garage-pilot.onrender.com)

## Technology baseline

- **Portal:** React, TypeScript, Vite, React Router, Fluent UI React v9, and
  route-scoped Framer Motion landing animations.
- **Backend:** Express modular monolith with versioned REST endpoints.
- **Shared frontend:** typed contracts, a browser API client, and area-aware
  Fluent UI themes under `packages/`.
- **Persistence:** ignored JSON state files for zero-service local development,
  plus a versioned Supabase Postgres/Auth/Storage/Realtime production adapter.
- **Validation:** Node test runner, Supertest, Vitest, Testing Library, ESLint,
  TypeScript, and production builds.

The local persistence and development identity selector keep the complete portal
easy to demonstrate without external services. Configured builds use Google
OAuth, Admin approval, Supabase persistence, RLS, Storage, and selected Realtime
refresh signals.

## Get started

Requirements: Node.js 22.12 or newer and npm 10 or newer.

```bash
npm install
npm run dev
```

Open `http://localhost:3000`. The Vite development server proxies `/api` to the
Express backend at `http://localhost:4000`.

The header's **Demo identity** avatar opens a clearly labelled synthetic identity selector for testing
Student, Mentor, Moderator, and Admin behavior. Every protected backend action
still re-checks the selected identity and its permissions.

When `SUPABASE_ENABLED=true`, the demo identity header is disabled. The portal
uses Supabase Google OAuth access tokens, and service routes require an active
Admin-approved profile. Signed-out visitors receive a product landing page whose
only live data is the public aggregate campus totals.

The shared workspace uses a full-width pure-white or pitch-black dashboard
canvas, lightweight typography, and each service's assigned functional accent.
Collapse the horizontal
desktop navigation from pill labels into icon tabs with the header toggle;
mobile uses a modal drawer. Light, dark, system, motion, and transparency
preferences are respected without removing functionality.

### Production-style local run

```bash
npm run build
npm start
```

The backend serves the built portal and API from `http://localhost:4000`.

The hosted pilot runs on Render Singapore with Supabase Mumbai. For deployment,
recovery, and operational checks, follow
[docs/supabase-deployment.md](docs/supabase-deployment.md). Never paste
Supabase secret keys, the database password, or OAuth credentials into source
files or chat.

### Validation

```bash
npm run lint
npm run typecheck
npm test
npm run build
npm run smoke

# Or run the full sequence
npm run check
```

## Working areas

Read the relevant landing page and local instructions before changing an area.
The owners below describe responsibilities; GitHub teams are not yet provisioned.

| Area | Working folder | Current MVP capability |
| --- | --- | --- |
| Central portal | [apps/portal](apps/portal/README.md) | Visitor landing, shell, dashboard, routing, theme and identity controls |
| Projects | [services/projects](services/projects/README.md) | Project discovery, creation, milestones, teams, progress |
| Events | [services/events](services/events/README.md) | Discovery, schedules, capacity, registration and cancellation |
| Member Centre | [services/member-centre](services/member-centre/README.md) | Member directory, profiles, stats, admin status and mentor controls |
| Leaderboards | [services/leaderboards](services/leaderboards/README.md) | Achievements, server-ranked results, cohort and event filters |
| Idea Centre | [services/idea-centre](services/idea-centre/README.md) | Idea submission, saving, team requests, comments and mentorship state |
| Forum and Discussions | [services/forum](services/forum/README.md) | Posts, replies, votes, accepted solutions, communities and integrations |
| Backend and database | [backend](backend/README.md) | Central APIs, authorization checks, seeded local persistence |

## Architecture at a glance

The central portal composes service-owned public React entry points. Those
frontends consume `packages/api-client`, which calls the centralized backend.
No service imports another service's private source, and browser code never
accesses persistence directly.

```text
apps/portal
  └── public service entry points
      ├── services/projects
      ├── services/events
      ├── services/member-centre
      ├── services/leaderboards
      ├── services/idea-centre
      └── services/forum
             │
             ▼
      packages/api-client
             │
             ▼
      backend/src/modules
             │
             ├── backend/data (local ignored JSON state)
             └── Supabase (hosted pilot persistence, identity, media, realtime)
```

See [docs/architecture.md](docs/architecture.md) for decisions and production
boundaries, [docs/api.md](docs/api.md) for the local endpoint surface, and
[docs/ui-guidelines.md](docs/ui-guidelines.md) for the shared design contract.

## Local data and reset

With Supabase disabled, the backend creates synthetic state files in
`backend/data/` on first use.
Delete the individual JSON files while the backend is stopped to reset that
domain to its seed data. The directory is ignored by Git.

Never use real student information in local seeds or commits. Environment files,
credentials, production exports, and local state must remain untracked.

## Collaboration

Teams work in their own areas on short-lived branches and integrate through
public contracts. The portal maintainer owns the shared shell and publication;
the backend team owns server behavior, authorization, and persistence.

- [CONTRIBUTING.md](CONTRIBUTING.md) — workflow and required checks.
- [docs/team-setup.md](docs/team-setup.md) — owner and protection setup.
- [.github/CODEOWNERS](.github/CODEOWNERS) — inactive template awaiting real owners.

Folder ownership is a review boundary, not a GitHub write restriction.
