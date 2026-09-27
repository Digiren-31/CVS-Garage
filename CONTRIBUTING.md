# Contributing

## Pick a working area

Find the team landing page in [README.md](README.md), then read its local
instructions. Each service owns its public frontend entry point and local tests.
The portal maintainer owns central navigation and publication; the backend team
owns APIs, authorization, persistence, and database evolution.

The selected implementation baseline is React + TypeScript + Vite + Fluent UI
for the portal and Express for the centralized backend. Do not introduce a
second frontend framework, private cross-service imports, or a separate backend
runtime without an agreed architecture change.

## Local setup

```bash
npm install
npm run dev
```

Use synthetic data only. The development identity selector sends `x-user-id`
to the local API so role-specific workflows can be exercised; it is not a
production authentication mechanism.

## Branch and pull request workflow

1. Start from the latest `main` and create a short-lived branch named
   `<area>/<type>/<description>`, for example `projects/feat/milestone-filters`.
2. Work in the owning folder. Coordinate root configuration, shared packages,
   contracts, backend interfaces, or another team's area before changing them.
3. Push the branch and open a pull request into `main`. Contributors without
   repository write access can contribute through a fork.
4. Complete the pull request template, report the commands actually run, and
   request affected owners' review. Request reviews manually until CODEOWNERS
   is configured with real owners.
5. Merge only after approvals and configured checks pass. Do not push directly
   to `main`; delete the feature branch after merging.

Do not create permanent branches per service or nested Git repositories.

## Architectural boundaries

- Import a service only through its public `src/index.ts` entry point.
- Do not import another service's private source or portal internals.
- Agree API changes through `packages/contracts`; keep transport behavior in
  `packages/api-client`.
- Keep reusable Fluent UI primitives, semantic tokens, and theme behavior in
  `packages/ui`. Domain screens remain in their service.
- Leave ranking formulas, authorization, data mutation, and persistence on the
  backend. Frontend visibility is not security.
- Keep production credentials, real student data, local JSON state, and
  environment files out of Git.
- Preserve explicit error states. Do not turn backend failures into empty or
  successful-looking results.

See [docs/architecture.md](docs/architecture.md) for the selected runtime
architecture and [docs/ui-guidelines.md](docs/ui-guidelines.md) for UI rules.

## Required validation

Run the smallest relevant checks while developing. Before requesting review for
an integrated change, run:

```bash
npm run lint
npm run typecheck
npm test
npm run build
```

Changes to backend routes must also be exercised at runtime or covered with
Supertest. Frontend changes must include appropriate component behavior tests
and be inspected in light, dark, and system modes at mobile and desktop widths.

Do not add placeholder scripts that report success without performing a check.

## Repository administrator setup

Follow [docs/team-setup.md](docs/team-setup.md) before onboarding teams. Local
instruction files do not grant GitHub access or activate branch protection.
