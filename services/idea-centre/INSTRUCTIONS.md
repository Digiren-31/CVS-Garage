# Idea Centre working instructions

- Follow [../../CONTRIBUTING.md](../../CONTRIBUTING.md).
- Follow [../../docs/ui-guidelines.md](../../docs/ui-guidelines.md), including
  the Idea Centre coral identity and shared light/dark/system behavior.
- The selected stack is the central React portal and Express modular backend.
  Do not introduce a separate Next.js application, Prisma runtime, or service
  deployment without an approved architecture change.
- Own the Idea Centre frontend, local tests, and service documentation.
- Export the route through `src/index.ts`; do not import portal internals or
  another service's private source.
- Consume shared UI, API client, and contracts. Keep authorization, team
  capacity, duplicate request prevention, and persistence server-side.
- Forum exports must be idempotent and appear in the same Idea Centre domain.
- Member identity is resolved by the backend; Idea Centre never mints or stores
  an independent session.
- Use synthetic development data only and never expose private member fields.
- Run affected portal and backend tests, type-check, lint, and build.
