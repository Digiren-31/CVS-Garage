# CVS Garage — College Innovation Portal

CVS Garage is a modular college portal that brings Projects, Events, Member
Centre, Leaderboards, Idea Centre, and Forum & Discussions into one shared
workspace. The repository now contains a runnable full-stack MVP with synthetic
development data.

## Technology baseline

- **Portal:** React, TypeScript, Vite, React Router, and Fluent UI React v9.
- **Backend:** Express modular monolith with versioned REST endpoints.
- **Shared frontend:** typed contracts, a browser API client, and area-aware
  Fluent UI themes under `packages/`.
- **Local persistence:** ignored JSON state files under `backend/data/`.
- **Validation:** Node test runner, Supertest, Vitest, Testing Library, ESLint,
  TypeScript, and production builds.

The local persistence and development identity selector make the complete portal
easy to demonstrate without external services. They are not a substitute for
institutional SSO or the proposed PostgreSQL production schemas.

## Get started

Requirements: Node.js 22.12 or newer and npm 10 or newer.

```bash
npm install
npm run dev
```

Open `http://localhost:3000`. The Vite development server proxies `/api` to the
Express backend at `http://localhost:4000`.

The header contains a clearly labelled synthetic identity selector for testing
Student, Mentor, Moderator, and Admin behavior. Every protected backend action
still re-checks the selected identity and its permissions.

### Production-style local run

```bash
npm run build
npm start
```

The backend serves the built portal and API from `http://localhost:4000`.

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
| Central portal | [apps/portal](apps/portal/README.md) | Shell, dashboard, routing, theme and identity controls |
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
             ▼
      backend/data (local ignored JSON state)
```

See [docs/architecture.md](docs/architecture.md) for decisions and production
boundaries, [docs/api.md](docs/api.md) for the local endpoint surface, and
[docs/ui-guidelines.md](docs/ui-guidelines.md) for the shared design contract.

## Local data and reset

The backend creates synthetic state files in `backend/data/` on first use.
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
