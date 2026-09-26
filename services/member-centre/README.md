# Member Centre

**Intended owner:** Member Centre team; actual GitHub owners are not assigned yet.
**Status:** structure only.

This is the Member Centre team's landing and working folder, including future
admin controls. Member features, role definitions, and APIs are not specified yet.

## Start here

1. Read [INSTRUCTIONS.md](INSTRUCTIONS.md).
2. Use the source directory, reserved by [src/.gitkeep](src/.gitkeep), for future implementation.
3. Use the test directory, reserved by [tests/.gitkeep](tests/.gitkeep), for future tests.

No framework, UI, routes, API calls, or run/build/test commands are defined yet.

## Proposed backend design

The backend team has drafted the member management schema, role strategy, API
surface, and activity-log design in
[backend/database/design](../../backend/database/design/README.md). The API
document describes the endpoints this frontend would consume for the admin
portal, profile editing, and mentor promotion.

These are proposals under review, not agreed contracts. Review them and raise
disagreements before they are promoted into
[packages/contracts](../../packages/contracts/README.md), which remains the
source of truth for anything either side implements against.
