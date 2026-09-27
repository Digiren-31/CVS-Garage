# Leaderboards

**Owner:** Leaderboards team. **Status:** integrated MVP.

The Leaderboards route displays backend-authoritative rankings, recent
achievements, contribution breakdowns, and filters for event, department,
academic year, and minimum star rating.

Forum contribution events are recorded idempotently by the backend adapter.
Ranking and tie-breaking remain server-owned; the browser only filters already
ranked rows.

`src/index.ts` exports `LeaderboardsPage`. The detailed
[architecture proposal](ARCHITECTURE.md) documents the production ledger,
snapshot, caching, and publication model.
