# Contributing

## Pick a working area

Find the team's landing page in [README.md](README.md), then read its local
instructions. Every application/service team owns its own source, tests, and
documentation. The portal maintainer owns central portal publication; the
backend team owns backend and database delivery.

Implementation maturity differs by area. Follow the affected area's README and
instructions; do not introduce a new framework, package manager, database, or
deployment model without an explicit task and owner coordination.

## Branch and pull request workflow

1. Start from the latest `main` and create a short-lived branch named
   `<area>/<type>/<description>`, for example `projects/docs/onboarding`.
2. Work in the team's folder. Coordinate root configuration, shared packages,
   contracts, or another team's area with their owners before changing them.
3. Push the branch and open a pull request into `main`. Contributors without
   repository write access can contribute through a fork instead.
4. Complete the pull request template, describe the validation actually done,
   and request affected owners' review. Request reviews manually until
   [.github/CODEOWNERS](.github/CODEOWNERS) is configured with real owners.
5. Merge after required approvals and any configured checks pass. Do not push
   directly to `main`; delete the feature branch after merging.

Do not create permanent branches per service or nested Git repositories. Folder
boundaries and frequent integration keep teams separated without long-lived
branch divergence. Branch names do not enforce path-based permissions.

## Architectural boundaries

- Do not import another service's private source or portal internals.
- Agree a public interface before integrating a service into the portal.
- Coordinate shared UI/transport changes with affected consumers; domain logic
  stays with its service rather than moving into shared packages.
- Follow [docs/ui-guidelines.md](docs/ui-guidelines.md) for all portal and service
  UI. Coordinate shared themes, tokens, and reusable primitives through
  `packages/ui` rather than creating incompatible local design systems.
- Agree API changes with the backend team through
  [packages/contracts/INSTRUCTIONS.md](packages/contracts/INSTRUCTIONS.md).
- Leave database access and privileged logic on the backend. Frontend visibility
  controls are not authorization.
- Never commit credentials, production environment files, or real student data.
  Environment examples must contain placeholders only.
- Central release credentials and publishing approval belong to the portal maintainer.

See [docs/architecture.md](docs/architecture.md) for rationale and deferred decisions.

## Validation

For scaffold-only areas, check folder placement, documentation links, and
instruction scopes. For implemented areas, run the commands in the local README.
Backend database changes require migration, integrity, and affected test checks.
Validate shared changes against affected consumers and do not introduce scripts
that report success without performing a real check.

## Repository administrator setup

Follow [docs/team-setup.md](docs/team-setup.md) before onboarding teams. Local
instruction files do not grant GitHub access or activate branch protection.
