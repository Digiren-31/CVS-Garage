# Member Centre

**Owner:** Member Centre team. **Status:** integrated MVP.

The Member Centre route provides a searchable member and mentor directory with
aggregate stats. Synthetic Admin identities can suspend/restore non-admin
accounts and grant/revoke Mentor capability; the backend enforces every action.

The centralized API is rooted at `/api/v1/member-centre`, and local synthetic
state is stored in `backend/data/member-centre.json`.

The detailed schema, session, role, promotion, API, and audit proposals in
[backend/database/design](../../backend/database/design/README.md) remain the
production-hardening reference. The local identity selector is development
tooling, not institutional authentication.

`src/index.ts` exports the public `MemberCentrePage`.
