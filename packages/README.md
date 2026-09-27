# Shared working areas

These folders provide the public frontend foundations used by the portal and
service pages.

| Area | Responsibility |
| --- | --- |
| [ui](ui/README.md) | Fluent themes, area identities, and reusable presentation primitives |
| [api-client](api-client/README.md) | Typed browser-to-backend transport and local development identity context |
| [contracts](contracts/README.md) | Shared request/response and view-model types |

Shared packages must not import portal or service implementation. Domain rules,
authorization, and persistence remain in the centralized backend.
