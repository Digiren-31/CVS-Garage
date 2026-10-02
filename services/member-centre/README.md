# Member Centre

**Owner:** Member Centre team. **Status:** integrated MVP.

`/member-centre` provides a searchable directory with concise profile previews
and aggregate stats. `/member-centre/members/:memberId` displays a single
profile, including contact information, skills, and expertise. Synthetic Admin
identities can suspend/restore non-admin accounts and grant/revoke Mentor
capability on the individual page; the backend enforces every action.

Search lives in the `q` query parameter and is preserved when opening and
returning from a profile. Direct profile URLs resolve the member from the
unfiltered directory API, independent of discovery filters. Missing profiles
and request failures include a return link; request failures can be retried.

The centralized API is rooted at `/api/v1/member-centre`, and local synthetic
state is stored in `backend/data/member-centre.json`.

The detailed schema, session, role, promotion, API, and audit proposals in
[backend/database/design](../../backend/database/design/README.md) remain the
production-hardening reference. The local identity selector is development
tooling, not institutional authentication.

`src/index.ts` exports the public `MemberCentrePage`.
