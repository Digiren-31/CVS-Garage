# Contract Working Instructions

- Follow [../../CONTRIBUTING.md](../../CONTRIBUTING.md).
- Agree requests, responses, errors, access requirements, and compatibility
  expectations with the backend and affected frontend teams before implementation.
- Keep agreed specifications here as the source of truth; document the format
  and any generation/validation tooling when selected.
- Do not invent endpoints, role names, or backend behavior independently in each service.
- Coordinate breaking changes and document rollout plans for affected consumers.
- Request both backend and frontend reviews. Multiple CODEOWNERS on one path
  require only one owner's approval by default, not approval from every owner.
- Keep UI, database implementation, privileged credentials, and runtime domain
  logic out of this area.
