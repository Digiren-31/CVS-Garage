# Idea Centre

**Owner:** Idea Centre team. **Status:** integrated MVP.

The Idea Centre route supports idea discovery, search, submission, saving, team
join requests, comments, and visible mentorship/team state. Forum exports enter
the same backend domain with source-level duplicate prevention.

The frontend is composed by the central React portal through `src/index.ts`.
The centralized Express API is rooted at `/api/v1/idea-centre`, with synthetic
local state stored under `backend/data/`.

Read [INSTRUCTIONS.md](INSTRUCTIONS.md) for the selected architecture and
authorization rules.
