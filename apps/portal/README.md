# Central portal

**Owner:** portal maintainer. **Status:** runnable integrated application.

The portal provides the shared application shell, dashboard, responsive
navigation, development identity selector, light/dark/system mode control, and
routes for all six service-owned frontends.

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

Read [INSTRUCTIONS.md](INSTRUCTIONS.md) and the repository
[UI guidelines](../../docs/ui-guidelines.md) before editing.
