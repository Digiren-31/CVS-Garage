# Shared API client

`src/index.ts` owns browser-to-backend requests for the central `/api/v1`
surface. It applies consistent envelope handling and exposes typed domain
methods.

Without Supabase Vite settings it sends the selected synthetic `x-user-id` for
local development. Configured builds use PKCE Google OAuth, bearer tokens,
signed Storage uploads, and RLS-filtered Realtime subscriptions. A production
build without Supabase settings fails visibly instead of falling back to a demo
identity.

The client throws explicit `ApiClientError` values for network and API failures;
service pages must render those failures rather than silently treating them as
empty data.

This package never connects to persistence or performs authorization.
