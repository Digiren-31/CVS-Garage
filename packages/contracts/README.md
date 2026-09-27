# Frontend/backend contracts

`src/index.ts` defines the public TypeScript view models and API envelope shared
by the portal, service frontends, and browser client. Forum-specific contracts
remain under `src/forum/`.

The backend is JavaScript today, so Supertest coverage and runtime endpoint
probes enforce these shapes in addition to the frontend TypeScript compiler.
Breaking changes require coordinated backend and affected frontend review.

Database schemas are implementation artifacts, not browser contracts. The
Events PostgreSQL proposal therefore lives under `backend/database/schema/`.
