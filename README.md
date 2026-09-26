# CVS Garage — College Portal

A framework-neutral monorepo for one central college portal and six service
teams. **Current stage: folders and instructions only.** There is no application
code, UI, navigation, backend, database, or deployment yet.

## Working folders

Start in the appropriate area's README, then read its local instructions.
The owners below describe responsibilities; GitHub teams are not provisioned.

| Area | Team landing page | Working instructions | Intended owner |
| --- | --- | --- | --- |
| Central portal | [apps/portal/README.md](apps/portal/README.md) | [apps/portal/INSTRUCTIONS.md](apps/portal/INSTRUCTIONS.md) | Portal maintainer |
| Projects | [services/projects/README.md](services/projects/README.md) | [services/projects/INSTRUCTIONS.md](services/projects/INSTRUCTIONS.md) | Projects team |
| Events | [services/events/README.md](services/events/README.md) | [services/events/INSTRUCTIONS.md](services/events/INSTRUCTIONS.md) | Events team |
| Member Centre | [services/member-centre/README.md](services/member-centre/README.md) | [services/member-centre/INSTRUCTIONS.md](services/member-centre/INSTRUCTIONS.md) | Member Centre team |
| Leaderboards | [services/leaderboards/README.md](services/leaderboards/README.md) | [services/leaderboards/INSTRUCTIONS.md](services/leaderboards/INSTRUCTIONS.md) | Leaderboards team |
| Idea Centre | [services/idea-centre/README.md](services/idea-centre/README.md) | [services/idea-centre/INSTRUCTIONS.md](services/idea-centre/INSTRUCTIONS.md) | Idea Centre team |
| Forum and Discussions | [services/forum/README.md](services/forum/README.md) | [services/forum/INSTRUCTIONS.md](services/forum/INSTRUCTIONS.md) | Forum team |
| Backend and database | [backend/README.md](backend/README.md) | [backend/INSTRUCTIONS.md](backend/INSTRUCTIONS.md) | Backend team |

Every application/service working folder has source and test directories kept
in Git by placeholder files. No framework or package manager has been selected.

## Shared areas

- [packages/ui/README.md](packages/ui/README.md): future shared UI primitives.
- [packages/api-client/README.md](packages/api-client/README.md): future shared API transport.
- [packages/contracts/README.md](packages/contracts/README.md): frontend/backend interface agreements.

## Collaboration

Teams work in their area on short-lived branches and open pull requests into
`main`. The portal maintainer owns the central portal and its eventual publication;
the backend team owns backend and database delivery.

- [CONTRIBUTING.md](CONTRIBUTING.md): contribution workflow.
- [docs/architecture.md](docs/architecture.md): boundaries and deferred decisions.
- [docs/team-setup.md](docs/team-setup.md): GitHub owner and protection setup.
- [.github/CODEOWNERS](.github/CODEOWNERS): inactive ownership template awaiting real users/teams.

**Folder ownership is not a push restriction.** GitHub write access is
repository-wide. CODEOWNERS plus required reviews protects integration into
`main`, not individual working folders. Use separate repositories if strict
per-team write or visibility isolation is required.

## Run and build status

There is nothing to install, run, debug, build, or deploy in this phase. Runtime
commands and CI will be documented when the stack is chosen. UI/UX, homepage,
and navigation remain future work.
