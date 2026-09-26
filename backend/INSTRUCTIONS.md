# Backend Working Instructions

- Follow [../CONTRIBUTING.md](../CONTRIBUTING.md).
- Own server implementation, authentication, authorization, database changes,
  and backend deployment. Do not implement central portal UI here.
- Select the backend stack and database with the team before adding dependencies.
- Agree request/response shapes, errors, session behavior, and permissions with
  affected frontend teams through
  [../packages/contracts/INSTRUCTIONS.md](../packages/contracts/INSTRUCTIONS.md).
- Enforce permissions server-side, especially Member Centre admin operations.
- Keep credentials out of Git and all frontend areas. Use placeholders in
  environment examples; do not commit production data or real student records.
- Document migrations, compatibility, validation, and rollback/recovery plans
  when database changes are introduced.
- Use branches such as `backend/feat/<description>` and pull requests into `main`.
- Add stack-specific setup and test instructions when implementation starts;
  this scaffold does not provision or connect to a database.
