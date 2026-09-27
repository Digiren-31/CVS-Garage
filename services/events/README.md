# Events

**Owner:** Events team. **Status:** integrated MVP.

The Events frontend is available at `/events` in the central portal. Members can
discover and search events, inspect schedules, dates, capacity and venue, then
register or cancel their own registration.

The centralized backend exposes `/api/v1/events` and persists synthetic local
state in `backend/data/events.json`. The PostgreSQL schema proposal in
`backend/database/schema/events.sql` remains the production migration reference.

`src/index.ts` is the service's public frontend entry point. Run and validate
the project from the repository root.
