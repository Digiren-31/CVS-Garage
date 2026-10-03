# Supabase pilot deployment

This runbook takes CVS Garage from the local JSON/demo-identity mode to the
hosted Supabase and Render pilot. It is intentionally ordered so schema,
authorization, data import, application deployment, OAuth, and first-admin
bootstrap can each be verified before the next boundary is opened.

## Selected pilot architecture

- **Application runtime:** one Render Node web service in Singapore. Express
  serves both the built React portal and `/api/v1`.
- **Data/Auth/Storage/Realtime:** Supabase project `cvs-garage-pilot` in South
  Asia (Mumbai), project reference `ycnghdqpzzhrrifcylnw`.
- **Authentication:** Google OAuth. Any verified Google account can sign in, but
  a new member remains `pending` until an Admin activates it.
- **First Admin:** the verified Google email in the server-only
  `BOOTSTRAP_ADMIN_EMAIL` setting. It is promoted once, and only while no real
  Admin exists.
- **Pilot size:** up to 50 users on free tiers. This is not an SLA-backed
  institutional production environment.

The browser never receives the Supabase secret key or database password. It
uses the publishable key for Auth, signed Storage uploads, and RLS-filtered
Realtime events. All domain API writes still pass through Express.

## Database model

The initial pilot migration creates:

- `member_profiles`: verified Auth links, approval status, additive roles,
  editable profile fields, and immutable demo-profile markers.
- `domain_state`: versioned PostgreSQL JSON aggregates for Projects, Events,
  Idea Centre, Leaderboards, and Forum.
- `audit_log`: append-only privileged member changes.
- `realtime_events`: sanitized refresh signals for Forum replies, event
  capacity, and project activity.
- `media_assets`: verified Storage metadata.
- `public-media` and `private-attachments` Storage buckets.

`domain_state` deliberately preserves the tested service aggregates while
making PostgreSQL the authoritative durable store. Each write uses optimistic
versioning. Browser roles have no direct access to this table. This avoids a
risky all-domain rewrite for the pilot; domain-by-domain normalization can
follow behind the unchanged REST contracts.

## 1. Prepare local secrets

Copy `.env.example` to `.env.local` if the ignored local file does not already
exist. Fill these values directly in VS Code:

- `SUPABASE_PUBLISHABLE_KEY` and `VITE_SUPABASE_PUBLISHABLE_KEY`: the same
  `sb_publishable_...` project key.
- `SUPABASE_SECRET_KEY`: the server-only `sb_secret_...` key.
- `SUPABASE_DB_PASSWORD`: the project database password.
- `BOOTSTRAP_ADMIN_EMAIL`: the Google address for the first real Admin.

Do not paste these values into chat, issues, logs, source files, or Render
Blueprint YAML. Validate presence without printing values:

```bash
npm run supabase:check-config
```

The local file is covered by the root `.gitignore`. Verify before proceeding:

```bash
git check-ignore .env.local
```

## 2. Link and migrate the empty hosted project

```bash
npm run supabase:push:dry-run
npm run supabase:push
npm run supabase:lint
```

The wrapper uses the Mumbai session pooler because its direct database endpoint
is IPv6-only. It scrubs the password and connection URL from CLI output.
`supabase:push` applies versioned files from `supabase/migrations`; do not paste
migrations into the SQL editor manually because history must remain
reproducible.

## 3. Import current synthetic state

The import uses the ignored files in `backend/data` when present, preserving
the current local milestone, save, registration, and Forum state. Code seeds
are used only when a local state file is absent.

```bash
npm run supabase:import
npm run supabase:verify
```

The importer creates six read-only, non-login demo profiles and five domain
states. It skips existing cloud domain state. Replacing existing cloud state
requires an explicit command and must not be used after real pilot activity:

```bash
npm run supabase:import -- --force
```

## 4. Create the Render service

In Render, choose **New > Blueprint**, select `Digiren-31/CVS-Garage`, and use
the root `render.yaml`.

The Blueprint selects:

- service name `cvs-garage-pilot`
- Node runtime
- Singapore region
- free plan
- `npm ci && npm run build`
- `npm start`
- `/health` health check

Render prompts for every `sync: false` value:

- `SUPABASE_PUBLISHABLE_KEY`
- `VITE_SUPABASE_PUBLISHABLE_KEY` (same publishable value)
- `SUPABASE_SECRET_KEY`
- `BOOTSTRAP_ADMIN_EMAIL`

Do not add the database password to Render; runtime access uses the secret API
key. After the first deploy, record the generated HTTPS hostname.

Expected health response:

```json
{
  "status": "healthy",
  "persistence": "supabase"
}
```

If startup reports missing configuration or cannot load domain state, treat the
deploy as failed. Do not switch back to local JSON in production.

## 5. Configure Supabase redirect URLs

In Supabase **Authentication > URL Configuration**:

1. Set **Site URL** to the generated Render origin, for example
   `https://your-render-host`.
2. Add `https://your-render-host/auth/callback` to allowed redirect URLs.
3. Keep `http://localhost:3000/auth/callback` for local testing.
4. Remove obsolete or wildcard redirects before broad release.

In **Authentication > Providers**, keep Email sign-in disabled. The pilot is
Google OAuth only.

## 6. Create the Google OAuth client

Use Google Cloud project `CVS Garage Auth Pilot`
(`cvs-garage-auth-pilot`).

1. In **Google Auth Platform > Branding**, set the application name and support
   contact. Add privacy/terms links from the deployed site when Google requires
   them.
2. In **Audience**, select External so any Google account can authenticate.
3. In **Data Access**, request only:
   - `openid`
   - `.../auth/userinfo.email`
   - `.../auth/userinfo.profile`
4. Create a **Web application** OAuth client.
5. Add authorized JavaScript origins:
   - `http://localhost:3000`
   - the generated Render origin
6. Add this exact authorized redirect URI:

   ```text
   https://ycnghdqpzzhrrifcylnw.supabase.co/auth/v1/callback
   ```

7. Copy the Google client ID and client secret directly into Supabase
   **Authentication > Providers > Google**, then enable Google.

The Google client secret belongs in Supabase, not `.env.local`, Render, or the
repository. Use production audience mode before inviting general pilot users;
Google test mode requires each tester to be listed manually.

## 7. Bootstrap and verify the first Admin

1. Open the Render URL and choose **Sign in with Google** using the exact
   `BOOTSTRAP_ADMIN_EMAIL`.
2. The backend verifies the Supabase token and atomically promotes this account
   only if no real Admin exists.
3. Open Member Centre and confirm the account is active with `Student` and
   `Admin` roles.
4. Edit the Admin profile and provide department, batch/year where applicable,
   bio, skills, and an optional uploaded avatar.

Imported demo profiles remain visible for attribution but cannot sign in or be
edited.

## 8. Verify the approval workflow

Use a second Google account:

1. Sign in.
2. Confirm only the public dashboard and approval-pending screen are visible.
3. As Admin, open Member Centre and activate the pending profile.
4. Sign in again or refresh the second session.
5. Confirm all service routes load.
6. Grant and revoke Mentor and Community Moderator independently.
7. Suspend the account and confirm the existing session immediately loses
   service access.

Role and status changes must appear in `audit_log`.

## 9. Pilot smoke tests

Run these with approved accounts:

- Create a Project with an optional cover image and change a milestone.
- Register/cancel an Event in two browsers and confirm capacity refresh.
- Create an Idea with an optional cover image, save it, comment, and request to
  join.
- Create a Forum post with image/PDF/text attachment, reply in another browser,
  vote, and accept a solution.
- Confirm Forum replies, event capacity, and project activity refresh without a
  full-page reload.
- Confirm executable/archive uploads are rejected; images over 5 MB and
  documents over 25 MB are rejected.
- Confirm private attachment URLs expire and require an approved session.
- Check Render logs, Supabase Auth logs, Postgres logs, and Storage logs for
  errors without exposing tokens.

## Free-tier operating limits

- Render free services can sleep and have cold starts.
- Supabase free projects have database, egress, Storage, Realtime, and activity
  limits; limits can change.
- Backup and point-in-time recovery capabilities depend on the current plan.
- Use only synthetic or low-risk pilot data until paid tiers, backup recovery,
  retention, and institutional privacy review are approved.

Upgrade before broad college rollout or any uptime commitment.

## Rollback and recovery

Application rollback:

1. Disable Render auto-deploy if a release is unhealthy.
2. Roll back to the previous successful Render deploy.
3. Keep database migrations backward-compatible for at least one application
   release.

Data rollback:

1. Never run `supabase:import -- --force` after real users begin activity.
2. Before every later schema migration, create and verify a database dump or
   plan-supported backup.
3. Export the five `domain_state` rows before aggregate-shape migrations.
4. Test restore procedures before calling the pilot production-ready.
5. Prefer a forward corrective migration; do not edit migration history that
   has already reached the hosted project.

Incident containment:

- Suspend affected member profiles to block valid sessions immediately.
- Rotate the Supabase secret key if exposed, then update Render.
- Rotate Google OAuth credentials in Google and Supabase if exposed.
- Review `audit_log`, Render request logs, and Supabase Auth/Postgres/Storage
  logs with timestamps and request context.
