# Local API reference

The centralized Express API is rooted at `/api/v1`. Except for `/health`, every
response uses this envelope:

```json
{
  "success": true,
  "data": {},
  "error": null,
  "meta": {
    "timestamp": "2026-09-27T00:00:00.000Z"
  }
}
```

Errors set `success: false`, `data: null`, an explicit `error.code` and recovery
message, and an appropriate HTTP status.

## Development identity

Local requests may include `x-user-id` with one of the seeded member IDs. The
portal manages this header through `packages/api-client`. Unknown or suspended
identities cannot perform protected mutations.

This header must be replaced by verified institutional identity before
production; see [architecture.md](architecture.md).

## Routes

### Portal

| Method | Path | Purpose |
| --- | --- | --- |
| `GET` | `/health` | Process and module health |
| `GET` | `/api/v1` | Discover top-level API resources |
| `GET` | `/api/v1/dashboard` | Cross-service portal summary |

### Member Centre

| Method | Path | Purpose |
| --- | --- | --- |
| `GET` | `/api/v1/member-centre/me` | Current synthetic member |
| `GET` | `/api/v1/member-centre/members` | Searchable public member directory |
| `GET` | `/api/v1/member-centre/stats` | Aggregate member counts |
| `PATCH` | `/api/v1/member-centre/members/:id/status` | Admin status change |
| `PATCH` | `/api/v1/member-centre/members/:id/mentor` | Admin mentor grant/revoke |

### Projects

| Method | Path | Purpose |
| --- | --- | --- |
| `GET` | `/api/v1/projects` | Searchable project list |
| `GET` | `/api/v1/projects/:id` | Project detail |
| `POST` | `/api/v1/projects` | Create a project proposal |
| `PATCH` | `/api/v1/projects/:id/milestones/:milestoneId` | Update milestone status |

### Events

| Method | Path | Purpose |
| --- | --- | --- |
| `GET` | `/api/v1/events` | Searchable event list |
| `GET` | `/api/v1/events/:id` | Event detail and current registration |
| `POST` | `/api/v1/events/:id/registrations` | Register current member |
| `DELETE` | `/api/v1/events/:id/registrations` | Cancel current registration |

### Idea Centre

| Method | Path | Purpose |
| --- | --- | --- |
| `GET` | `/api/v1/idea-centre/ideas` | Searchable idea list |
| `POST` | `/api/v1/idea-centre/ideas` | Submit an idea |
| `POST` | `/api/v1/idea-centre/ideas/:id/save` | Toggle saved state |
| `POST` | `/api/v1/idea-centre/ideas/:id/join-requests` | Request team membership |
| `POST` | `/api/v1/idea-centre/ideas/:id/comments` | Add a comment |

### Leaderboards

| Method | Path | Purpose |
| --- | --- | --- |
| `GET` | `/api/v1/leaderboards` | Ranked entries, achievements, and filter metadata |

### Forum

Forum endpoints are documented in
[forum-architecture-and-schema.md](forum-architecture-and-schema.md). The
implemented surface includes posts, replies, votes, bookmarks, communities,
mentors, follows, reports/moderation, Project/Event lookup, and Idea Centre
export.
