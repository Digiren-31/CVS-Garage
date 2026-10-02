# Events

**Owner:** Events team. **Status:** integrated MVP.

The Events frontend is available at `/events` in the central portal. Members can
discover and search events, inspect schedules, dates, capacity and venue, then
register or cancel their own registration.

## Directory and detail routes

- `/events` contains discovery, search, category, and format filters.
- `/events/:eventId` contains only the requested event's information, schedule,
  capacity, and current-member registration controls.
- The portal mounts the same public `EventsPage` at both routes. Detail URLs
  use the event ID from the API, not its slug.

Discovery filters are shareable URL parameters: `q` for submitted search,
`category` for category, and `mode` for `Online`, `Offline`, or `Hybrid`.
Omitted filters mean all results. For example,
`/events?q=design&category=Workshops&mode=Hybrid` restores the same directory
after refresh. View-detail and **Back to events** links retain those parameters;
browser back/forward and direct detail links work without a prior list visit.

Detail pages fetch the selected event directly and show explicit missing/error
states with retry and back navigation. Registration and cancellation still use
the centralized API and refresh that event's authoritative data. Returning to
the directory reloads the list without losing its filters. If refreshing after
a mutation fails, **Refresh event details** retries the read without repeating
the registration or cancellation.

The centralized backend exposes `/api/v1/events` and persists synthetic local
state in `backend/data/events.json`. The PostgreSQL schema proposal in
`backend/database/schema/events.sql` remains the production migration reference.

`src/index.ts` is the service's public frontend entry point. Run and validate
the project from the repository root.

Run the focused routing and workflow tests with:

```bash
npm run test --workspace @cvs-garage/portal -- services/events/src/EventsPage.test.tsx
```
