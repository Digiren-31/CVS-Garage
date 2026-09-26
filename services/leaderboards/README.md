# Leaderboards

**Intended owner:** Leaderboards team; actual GitHub owners are not assigned yet.
**Status:** architecture and frontend boilerplate proposed; runtime integration is pending.

This is the Leaderboards team's landing and working folder for the college
portal. Ranking criteria, scoring rules, and APIs require agreement with the
backend, Events, Projects, and Member Centre owners before implementation.

## Start here

1. Read [INSTRUCTIONS.md](INSTRUCTIONS.md).
2. Review the proposed [architecture and data contract](ARCHITECTURE.md).
3. Use [src/models.ts](src/models.ts) as the service-owned frontend model.
4. Integrate [src/CustomLeaderboard.tsx](src/CustomLeaderboard.tsx) after the
	repository React, Tailwind CSS, Fluent UI, and shared theme setup is agreed.
5. Use the test directory, reserved by [tests/.gitkeep](tests/.gitkeep), for future tests.

No package manifest, route, API implementation, or run/build/test command is
defined yet. The code in `src` is integration-ready boilerplate, not a runnable
standalone application.
