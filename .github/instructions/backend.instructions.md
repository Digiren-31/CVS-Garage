---
description: "Use when working on backend APIs, database work, migrations, authentication, authorization, or backend handoff."
applyTo: "backend/**"
---

# Backend Scope

- Read [backend working instructions](../../backend/INSTRUCTIONS.md) before editing.
- Use the selected modular Express backend with Node.js 22.13+ and local SQLite.
- Treat versioned migrations and the common data model in `backend/database` as
	authoritative. Do not create service-local identity or database copies.
- Agree contracts with affected frontend teams. Never put database credentials or privileged operations in frontend code.
