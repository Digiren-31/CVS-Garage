# Projects

**Owner:** Projects team. **Status:** integrated MVP.

The Projects frontend is composed by the central portal at `/projects`. It
supports project discovery, search, progress and team visibility, proposal
creation, project details, and milestone status updates for authorized users.

## Directory and detail routes

- `/projects` is the searchable directory and proposal entry point.
- `/projects/:projectId` is a standalone project workspace with its description,
  tags, progress, team, repository link, and milestones. It does not render the
  directory, filters, or aggregate metric cards.
- The portal mounts the same public `ProjectsPage` at both routes. Detail URLs
  use the API's project ID, not its slug.

Discovery state is stored in the URL: `q` is the submitted search, `status` is
the project status, and `category` is the selected category. Omitted filters
mean all results. For example,
`/projects?q=campus&status=active&category=Smart+Campus` can be shared or refreshed.
View-detail and **Back to projects** links carry the search parameters, so
direct links and browser back/forward do not depend on an in-memory selection.

Detail routes fetch the requested project and current member directly. Missing
projects and failed requests show an explicit error, retry action, and directory
link. A successful proposal opens its new detail URL. Milestone changes remain
restricted to the project leader or an active administrator, with authorization
enforced by the backend. Returning to discovery reloads the current server data.

The centralized backend exposes the domain below `/api/v1/projects` and stores
synthetic local state in `backend/data/projects.json`.

## Public frontend boundary

`src/index.ts` exports `ProjectsPage`. The portal must import only that entry
point. Projects code may consume shared UI, API client, and contracts but must
not import another service's implementation.

Run and validate from the repository root using the commands in
[README.md](../../README.md). The detailed
[architecture proposal](projects_architecture.md) remains a production data and
workflow reference; the MVP intentionally implements its core vertical slice.

Run the focused routing and workflow tests with:

```bash
npm run test --workspace @cvs-garage/portal -- services/projects/src/ProjectsPage.test.tsx
```
