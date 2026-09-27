# Shared API client

`src/index.ts` owns browser-to-backend requests for the central `/api/v1`
surface. It applies consistent envelope handling, exposes typed domain methods,
and sends the selected synthetic `x-user-id` during local development.

The client throws explicit `ApiClientError` values for network and API failures;
service pages must render those failures rather than silently treating them as
empty data.

This package never connects to persistence or performs authorization.
