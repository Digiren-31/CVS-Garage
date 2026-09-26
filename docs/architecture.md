# Architecture

## Decision: framework-neutral, modular monorepo

Use one repository with a central portal and six domain/team working areas.
Directory separation allows teams to contribute independently while keeping
shared decisions visible. This scaffold selects no runtime, build system,
frontend framework, database, or hosting provider.

Here, **service** means a frontend/product ownership area, not a deployed
microservice. The backend team is free to choose backend service boundaries.

## Ownership boundaries

| Area | Owns | Must not own |
| --- | --- | --- |
| Central portal | Future homepage, app shell, navigation, central publication | Service business logic or database access |
| Each service | Its future frontend, local tests, service-specific documentation | Other services' internals, global navigation, central release credentials |
| Shared UI | Future common presentation primitives and design tokens | API transport or domain rules |
| Shared API client | Future common browser-to-backend transport | Database connections, server authorization, service presentation |
| Shared contracts | Agreed API/schema/interface definitions | Database implementation or UI |
| Backend | Server runtime, access control, database, migrations, backend delivery | Central portal presentation |

Landing pages and local instructions are indexed in [../README.md](../README.md).

## Future dependency direction

If a shared-build frontend is selected:

- The portal consumes services through agreed public interfaces.
- Services can consume shared UI, API transport, and contracts.
- Shared API transport can consume contracts.
- Shared packages must not depend on private portal or service code.
- Services must not depend on each other's private implementation.

These are conventions, not automated import restrictions. Runtime public entry
points and import checks will be added with the stack, not as empty exports now.

If separate service deployments are needed later, agree URL, authentication,
interface, and release contracts before selecting that integration model. No
route or loading strategy is assumed by the current folders.

## Decision: shared UI foundation

All portal and service frontends follow the central
[UI and theme guidelines](ui-guidelines.md). Fluent UI is the shared component
and token system, while `packages/ui` will own repository semantic tokens, theme
creation, typography, and reusable presentation primitives. Each frontend owns
its screens and selects its assigned area identity without changing shared token
meanings.

This decision does not add a runtime or settle the frontend framework. Fluent
package selection, versions, font assets, theme code, and visual test tooling are
added only when frontend implementation begins.

## Backend collaboration

The backend team owns [../backend/README.md](../backend/README.md). Backend and
affected frontend teams agree interfaces through
[../packages/contracts/README.md](../packages/contracts/README.md).

No endpoints, role names, session strategy, or database schema have been chosen.
Browser code must not directly access databases or contain privileged secrets.
Member Centre admin controls require server-enforced permissions, not just hidden UI.

## Development independence versus deployment

Teams own their service areas and can work on separate feature branches. The
portal maintainer builds and publishes the central portal without implementing
each team's service internals. Backend/database delivery belongs to the backend team.

Directory separation alone does not create independently deployable applications.
With a shared frontend build, service changes ship in a portal release. Confirm
the intended integration model when implementation starts. No deployment or
GitHub permission settings are configured by these folders.

## Deferred decisions

- Frontend language, framework, package manager, and workspace tooling.
- UI implementation details, homepage, routes, navigation, and service
  integration/loading. The repository-wide visual direction is already defined.
- Features beyond the six named areas.
- Backend/database technology, APIs, identity, and access rules.
- Test tooling, CI, hosting, and release controls.

No install, run, debug, build, or deployment commands exist in this phase.
