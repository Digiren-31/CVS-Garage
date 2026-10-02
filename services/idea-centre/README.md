# Idea Centre

**Owner:** Idea Centre team. **Status:** integrated MVP.

The Idea Centre route supports idea discovery, search, submission, saving, team
join requests, comments, and visible mentorship/team state. Forum exports enter
the same backend domain with source-level duplicate prevention.

`/idea-centre` is the discovery page; `/idea-centre/ideas/:ideaId` is the
standalone idea page, with no discovery list appended to it. Search and filters
use the `q`, `track`, `difficulty`, and `status` query parameters and are retained
in item links and the return link. A direct idea page resolves the ID from an
unfiltered collection response, so an unrelated search cannot hide the item.
Loading, missing-item, and request-error pages all retain navigation back to ideas.

The frontend is composed by the central React portal through `src/index.ts`.
The centralized Express API is rooted at `/api/v1/idea-centre`, with synthetic
local state stored under `backend/data/`.

Read [INSTRUCTIONS.md](INSTRUCTIONS.md) for the selected architecture and
authorization rules.
