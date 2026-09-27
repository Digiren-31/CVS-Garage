---
description: "Use when working on backend APIs, database work, migrations, authentication, authorization, or backend handoff."
applyTo: "backend/**"
---

# Backend Scope

- Read [backend working instructions](../../backend/INSTRUCTIONS.md) before editing.
- Extend the centralized Express modular monolith and use the shared response
  helpers and persistent-store boundary.
- Agree contracts with affected frontend teams. Never put database credentials or privileged operations in frontend code.
- Validate input and enforce identity, role, and ownership rules on every
  protected route. The development `x-user-id` header is not production auth.
- Add focused Node/Supertest coverage and keep `npm run build`, `npm test`, and
  `npm run lint` passing for backend changes.
