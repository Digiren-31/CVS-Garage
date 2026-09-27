# Forum and Discussions

**Owner:** Forum team. **Status:** integrated MVP.

Forum is the platform's discussion and knowledge-sharing area. The React route
inside the portal supports:

- searchable and filterable discussion feeds;
- questions, discussions, ideas, announcements, and linked Project/Event posts;
- threaded replies, voting, bookmarks, and accepted solutions;
- communities and mentor discovery;
- reporting and moderator review;
- one-time export to Idea Centre; and
- idempotent contribution events for Leaderboards.

The backend module is rooted at `/api/v1/forum`. Its local runtime uses seeded
JSON-backed state; the SQL schema and
[architecture document](../../docs/forum-architecture-and-schema.md) remain the
production persistence reference.

`src/index.ts` exports the portal-integrated `ForumPage`. The original
zero-dependency demo files remain temporarily available for historical
comparison but are no longer the canonical portal frontend.

Run and validate the integrated project from the repository root.
