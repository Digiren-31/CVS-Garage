# College Project Management Module — Backend Architecture

> **Principal Architecture Engineer Document**
> Service Domain: `projects` · Color Identity: **Indigo** (`#5B5FC7`) · Monorepo: `cvs-garage`
> Status: Architecture & Schema Design · Stack: Technology-agnostic (backend team selects)

---

## Table of Contents

1. [Architectural Overview](#1-architectural-overview)
2. [Theme Token Strategy](#2-theme-token-strategy)
3. [Database Schema — Full Table Definitions](#3-database-schema)
4. [Entity-Relationship Overview](#4-entity-relationship-overview)
5. [State Machine Diagrams](#5-state-machine-diagrams)
6. [Role & Permission Matrix](#6-role--permission-matrix)
7. [API & Integration Contracts](#7-api--integration-contracts)
8. [Soft-Delete & Audit Log Strategy](#8-soft-delete--audit-log-strategy)
9. [Middleware & Permission Enforcement](#9-middleware--permission-enforcement)
10. [Architectural Notes & Assumptions](#10-architectural-notes--assumptions)

---

## 1. Architectural Overview

```
┌──────────────────────────────────────────────────────────────────────┐
│                        CVS Garage Monorepo                           │
│                                                                      │
│  ┌─────────────┐   ┌────────────────────────────────────────────┐   │
│  │  Central    │   │               Backend (Owned by Backend     │   │
│  │  Portal     │   │               Team — single deployable)     │   │
│  │  (App Shell)│   │                                             │   │
│  └──────┬──────┘   │  ┌──────────────────────────────────────┐  │   │
│         │          │  │     PROJECT MANAGEMENT DOMAIN        │  │   │
│  ┌──────▼──────┐   │  │                                      │  │   │
│  │  services/  │   │  │  ┌──────────┐  ┌──────────────────┐ │  │   │
│  │  projects/  │◄──┼──┼──│  Pitch   │  │ Project Lifecycle│ │  │   │
│  │  (frontend  │   │  │  │  Service │  │    Service       │ │  │   │
│  │   boundary) │   │  │  └──────────┘  └──────────────────┘ │  │   │
│  └─────────────┘   │  │  ┌──────────┐  ┌──────────────────┐ │  │   │
│                    │  │  │ Showcase │  │  Admin / Audit   │ │  │   │
│  ┌─────────────┐   │  │  │  Service │  │    Service       │ │  │   │
│  │ packages/   │   │  │  └──────────┘  └──────────────────┘ │  │   │
│  │ contracts/  │   │  └──────────────────────────────────────┘  │   │
│  │(API Schemas)│   │                                             │   │
│  └─────────────┘   │  External Service Clients (interfaces only) │   │
│                    │  ┌──────────────┐  ┌───────────────────┐   │   │
│                    │  │ MemberMgmt   │  │  IdeaCentre       │   │   │
│                    │  │ Client       │  │  EventBus Client  │   │   │
│                    │  └──────────────┘  └───────────────────┘   │   │
│                    └────────────────────────────────────────────┘   │
└──────────────────────────────────────────────────────────────────────┘
```

**Domain boundary:** The Projects domain lives entirely within `backend/src/` and surfaces its public contract through `packages/contracts/`. The `services/projects/` folder owns only the frontend view layer.

---

## 2. Theme Token Strategy

> **Note to backend team:** Backend responses do not embed UI colors. The following instructs the frontend (`services/projects/`) and `packages/ui` on how to register the Projects identity per `docs/ui-guidelines.md`.

Per the central UI guidelines, the Projects area uses **Indigo** (`#5B5FC7`) as
its assigned seed. This is the approved implementation identity.

### Token Registration Pattern (`packages/ui/themes/projects.ts`)

```
// Central config location: packages/ui/themes/projects.ts
// Pattern: Register one area brand ramp; never override global semantics.

PROJECT_THEME_TOKENS = {
  brand: {
    seed:            "#5B5FC7",   // approved indigo seed
    primary:         <generated indigo-70 from seed>,
    primaryHover:    <indigo-80>,
    primaryActive:   <indigo-90>,
    subtle:          <indigo-10>,
    subtleHover:     <indigo-20>,
    selected:        <indigo-60>,
    onPrimary:       "#FFFFFF",   // white for text on primary actions
  },
  // Neutral surfaces inherit from Fluent global tokens — no override.
  // Status tokens (success, warning, danger) are global — no override.
}
```

**Rule:** Components consume `brand.primary` (alias token), never `#038387` directly. Light and dark ramps must both pass WCAG 4.5:1 for normal text.

---

## 3. Database Schema

> **Assumptions:**
> - An existing `users` table and `auth` system exist. We reference `users.id` via FK.
> - An existing `departments` table exists for eligibility lookup.
> - The backend team selects PostgreSQL (recommended for JSONB, row-level security, and native UUID support). Adjust types for other databases.
> - All timestamps are UTC, stored as `TIMESTAMPTZ`.
> - All primary keys are `UUID` (v4).
> - Soft-delete is implemented via `deleted_at TIMESTAMPTZ NULL`. A non-null value means the row is deleted.

---

### 3.1 Core Reference Tables

#### `users` *(existing — reference only, do not redefine)*
```sql
-- Assumed existing table. Relevant columns:
-- id          UUID PRIMARY KEY
-- name        VARCHAR
-- email       VARCHAR UNIQUE
-- created_at  TIMESTAMPTZ
-- deleted_at  TIMESTAMPTZ
```

#### `project_roles`
```sql
CREATE TABLE project_roles (
  id          UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
  slug        VARCHAR(50) NOT NULL UNIQUE,
  -- Values: 'student', 'team_lead', 'team_member', 'mentor',
  --         'committee', 'admin'
  label       VARCHAR(100) NOT NULL,
  description TEXT,
  created_at  TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Seed data (insert at migration time):
-- ('student','Student','Enrolled student submitting pitches')
-- ('team_lead','Team Lead','Leads a project team')
-- ('team_member','Team Member','Active project contributor')
-- ('mentor','Mentor','Faculty/Industry advisor')
-- ('committee','Committee','Reviewing committee member')
-- ('admin','Admin','Platform administrator')
```

#### `user_project_roles`
```sql
-- Assigns a user to a role in the GLOBAL projects module context.
-- Project-level membership is in project_members (scoped).
CREATE TABLE user_project_roles (
  id         UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id    UUID        NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  role_id    UUID        NOT NULL REFERENCES project_roles(id),
  granted_by UUID        REFERENCES users(id),
  granted_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  revoked_at TIMESTAMPTZ,           -- NULL = currently active
  UNIQUE (user_id, role_id)
);

CREATE INDEX idx_upr_user_id   ON user_project_roles(user_id);
CREATE INDEX idx_upr_role_id   ON user_project_roles(role_id);
CREATE INDEX idx_upr_active    ON user_project_roles(user_id) WHERE revoked_at IS NULL;
```

---

### 3.2 Pitch Stage Tables

#### `pitches`
```sql
CREATE TABLE pitches (
  id                     UUID         PRIMARY KEY DEFAULT gen_random_uuid(),

  -- Ownership
  submitted_by           UUID         NOT NULL REFERENCES users(id),

  -- Content
  title                  VARCHAR(255) NOT NULL,
  category               VARCHAR(100) NOT NULL,
  domain                 VARCHAR(100),
  description            TEXT         NOT NULL,
  project_link           TEXT,                      -- optional external link
  is_final_submission    BOOLEAN      NOT NULL DEFAULT FALSE,

  -- State machine
  status                 VARCHAR(30)  NOT NULL DEFAULT 'pending',
  -- Values: 'pending' | 'needs_feedback' | 'approved' | 'rejected' | 'archived'

  -- Resubmission tracking
  resubmission_count     SMALLINT     NOT NULL DEFAULT 0,
  last_feedback_at       TIMESTAMPTZ,

  -- Cooldown enforcement (set on rejection)
  cooldown_until         TIMESTAMPTZ,

  -- Spawned project reference (set when approved)
  spawned_project_id     UUID         REFERENCES projects(id),

  -- Soft-delete
  deleted_at             TIMESTAMPTZ,
  deleted_by             UUID         REFERENCES users(id),

  -- Audit timestamps
  created_at             TIMESTAMPTZ  NOT NULL DEFAULT NOW(),
  updated_at             TIMESTAMPTZ  NOT NULL DEFAULT NOW(),

  -- Eligibility snapshot (cached at submission time from Member Mgmt service)
  submitter_dept         VARCHAR(100),
  submitter_enroll_status VARCHAR(20),  -- 'active' | 'inactive'

  CONSTRAINT chk_pitch_status CHECK (
    status IN ('pending','needs_feedback','approved','rejected','archived')
  )
);

CREATE INDEX idx_pitches_submitted_by ON pitches(submitted_by);
CREATE INDEX idx_pitches_status       ON pitches(status) WHERE deleted_at IS NULL;
CREATE INDEX idx_pitches_cooldown     ON pitches(submitted_by, cooldown_until)
  WHERE status = 'rejected';
```

#### `pitch_proposed_members`
```sql
-- Proposed team members listed in the pitch (before project exists)
CREATE TABLE pitch_proposed_members (
  id              UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
  pitch_id        UUID        NOT NULL REFERENCES pitches(id) ON DELETE CASCADE,
  user_id         UUID        REFERENCES users(id),   -- NULL = external/not-yet-registered
  name_freetext   VARCHAR(255),                       -- fallback if user_id is NULL
  proposed_role   VARCHAR(50) NOT NULL,
  -- e.g. 'team_lead', 'team_member', 'designer', etc.
  created_at      TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_ppm_pitch_id ON pitch_proposed_members(pitch_id);
```

#### `pitch_mentor_requests`
```sql
-- A pitch can request one or more mentors
CREATE TABLE pitch_mentor_requests (
  id              UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
  pitch_id        UUID        NOT NULL REFERENCES pitches(id) ON DELETE CASCADE,
  mentor_user_id  UUID        REFERENCES users(id),   -- specific mentor requested, or NULL = open
  expertise_tags  TEXT[],                              -- domain tags
  status          VARCHAR(20) NOT NULL DEFAULT 'open',
  -- Values: 'open' | 'claimed' | 'declined' | 'cancelled'
  claimed_by      UUID        REFERENCES users(id),
  claimed_at      TIMESTAMPTZ,
  created_at      TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at      TIMESTAMPTZ NOT NULL DEFAULT NOW(),

  CONSTRAINT chk_pmr_status CHECK (
    status IN ('open','claimed','declined','cancelled')
  )
);

CREATE INDEX idx_pmr_pitch_id ON pitch_mentor_requests(pitch_id);
CREATE INDEX idx_pmr_status   ON pitch_mentor_requests(status) WHERE status = 'open';
```

#### `pitch_team_requests`
```sql
-- Open role requests on a pitch visible in Idea Centre
CREATE TABLE pitch_team_requests (
  id              UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
  pitch_id        UUID        NOT NULL REFERENCES pitches(id) ON DELETE CASCADE,
  role_sought     VARCHAR(100) NOT NULL,             -- e.g. 'Backend Developer'
  description     TEXT,
  slots_available SMALLINT    NOT NULL DEFAULT 1,
  status          VARCHAR(20) NOT NULL DEFAULT 'open',
  -- Values: 'open' | 'filled' | 'cancelled'
  filled_by       UUID        REFERENCES users(id),
  filled_at       TIMESTAMPTZ,
  created_at      TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at      TIMESTAMPTZ NOT NULL DEFAULT NOW(),

  CONSTRAINT chk_ptr_status CHECK (status IN ('open','filled','cancelled'))
);

CREATE INDEX idx_ptr_pitch_id ON pitch_team_requests(pitch_id);
CREATE INDEX idx_ptr_open     ON pitch_team_requests(status) WHERE status = 'open';
```

#### `pitch_feedback`
```sql
-- Committee/Admin feedback linked to a pitch review cycle
CREATE TABLE pitch_feedback (
  id           UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
  pitch_id     UUID        NOT NULL REFERENCES pitches(id) ON DELETE CASCADE,
  reviewer_id  UUID        NOT NULL REFERENCES users(id),
  feedback     TEXT        NOT NULL,
  action_taken VARCHAR(30) NOT NULL,
  -- 'approved' | 'rejected' | 'needs_feedback'
  created_at   TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_pf_pitch_id ON pitch_feedback(pitch_id);
```

---

### 3.3 Project Lifecycle Tables

#### `projects`
```sql
CREATE TABLE projects (
  id                UUID        PRIMARY KEY DEFAULT gen_random_uuid(),

  -- Origin
  pitch_id          UUID        UNIQUE REFERENCES pitches(id),   -- always traced back

  -- Identity
  title             VARCHAR(255) NOT NULL,
  category          VARCHAR(100) NOT NULL,
  domain            VARCHAR(100),
  description       TEXT         NOT NULL,
  academic_year     VARCHAR(9)   NOT NULL,   -- e.g. '2025-2026'

  -- State machine
  status            VARCHAR(30)  NOT NULL DEFAULT 'active',
  -- Values: 'active' | 'on_hold' | 'blocked' | 'final_review_submitted'
  --         | 'completed' | 'discontinued'

  -- Sign-off tracking (for final submission gate)
  mentor_signed_off    BOOLEAN   NOT NULL DEFAULT FALSE,
  mentor_signoff_at    TIMESTAMPTZ,
  mentor_signoff_by    UUID      REFERENCES users(id),

  committee_signed_off BOOLEAN   NOT NULL DEFAULT FALSE,
  committee_signoff_at TIMESTAMPTZ,
  committee_signoff_by UUID      REFERENCES users(id),

  -- Hold/block reason
  hold_reason       TEXT,
  held_at           TIMESTAMPTZ,
  resumed_at        TIMESTAMPTZ,

  -- Discontinuation
  discontinued_reason TEXT,
  discontinued_at     TIMESTAMPTZ,
  discontinued_by     UUID      REFERENCES users(id),

  -- Soft-delete (admin only)
  deleted_at        TIMESTAMPTZ,
  deleted_by        UUID        REFERENCES users(id),

  -- Timestamps
  created_at        TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at        TIMESTAMPTZ NOT NULL DEFAULT NOW(),

  CONSTRAINT chk_project_status CHECK (
    status IN (
      'active','on_hold','blocked','final_review_submitted',
      'completed','discontinued'
    )
  )
);

CREATE INDEX idx_projects_status      ON projects(status) WHERE deleted_at IS NULL;
CREATE INDEX idx_projects_year        ON projects(academic_year);
CREATE INDEX idx_projects_pitch_id    ON projects(pitch_id);
```

#### `project_members`
```sql
-- Project-scoped team roster (authoritative source for visibility checks)
CREATE TABLE project_members (
  id          UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
  project_id  UUID        NOT NULL REFERENCES projects(id) ON DELETE CASCADE,
  user_id     UUID        NOT NULL REFERENCES users(id),
  role        VARCHAR(50) NOT NULL,
  -- Values: 'team_lead' | 'team_member' | 'mentor' | 'committee' | 'admin'

  -- Roster change tracking
  joined_at   TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  removed_at  TIMESTAMPTZ,   -- NULL = currently active
  removed_by  UUID        REFERENCES users(id),
  removal_reason TEXT,

  UNIQUE (project_id, user_id, removed_at)   -- allow re-join after removal
);

CREATE INDEX idx_pm_project_id  ON project_members(project_id);
CREATE INDEX idx_pm_user_id     ON project_members(user_id);
CREATE INDEX idx_pm_active      ON project_members(project_id)
  WHERE removed_at IS NULL;
```

#### `milestones`
```sql
CREATE TABLE milestones (
  id             UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
  project_id     UUID        NOT NULL REFERENCES projects(id) ON DELETE CASCADE,
  title          VARCHAR(255) NOT NULL,
  description    TEXT,
  sequence_order SMALLINT    NOT NULL,   -- 1-6; enforced in application layer
  due_date       DATE,

  status         VARCHAR(20) NOT NULL DEFAULT 'pending',
  -- Values: 'pending' | 'in_progress' | 'completed'

  completed_at   TIMESTAMPTZ,
  created_at     TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at     TIMESTAMPTZ NOT NULL DEFAULT NOW(),

  CONSTRAINT chk_milestone_status CHECK (
    status IN ('pending','in_progress','completed')
  ),
  CONSTRAINT chk_milestone_order CHECK (
    sequence_order BETWEEN 1 AND 6
  )
);

CREATE INDEX idx_milestones_project_id ON milestones(project_id);
CREATE UNIQUE INDEX idx_milestones_order ON milestones(project_id, sequence_order);
```

#### `project_updates`
```sql
-- Free-form activity feed per milestone (no approval required)
CREATE TABLE project_updates (
  id           UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
  milestone_id UUID        NOT NULL REFERENCES milestones(id) ON DELETE CASCADE,
  project_id   UUID        NOT NULL REFERENCES projects(id),  -- denormalized for fast queries
  author_id    UUID        NOT NULL REFERENCES users(id),
  body         TEXT        NOT NULL,
  attachments  JSONB,      -- [{url, type, name}]

  deleted_at   TIMESTAMPTZ,   -- soft-delete for admin removal
  deleted_by   UUID        REFERENCES users(id),

  created_at   TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at   TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_pu_milestone_id ON project_updates(milestone_id);
CREATE INDEX idx_pu_project_id   ON project_updates(project_id)
  WHERE deleted_at IS NULL;
```

#### `reviews`
```sql
-- Covers both: mentor advisory reviews AND checkpoint reviews
CREATE TABLE reviews (
  id              UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
  project_id      UUID        NOT NULL REFERENCES projects(id) ON DELETE CASCADE,
  milestone_id    UUID        REFERENCES milestones(id),  -- NULL = project-level review
  reviewer_id     UUID        NOT NULL REFERENCES users(id),

  review_type     VARCHAR(30) NOT NULL,
  -- Values: 'advisory' | 'checkpoint' | 'final'

  feedback        TEXT        NOT NULL,
  rating          SMALLINT,   -- optional 1-5 for checkpoint/final reviews

  -- Final review sign-off tracking (denormalized flag)
  is_final_signoff BOOLEAN    NOT NULL DEFAULT FALSE,

  created_at      TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at      TIMESTAMPTZ NOT NULL DEFAULT NOW(),

  CONSTRAINT chk_review_type CHECK (
    review_type IN ('advisory','checkpoint','final')
  ),
  CONSTRAINT chk_review_rating CHECK (rating BETWEEN 1 AND 5 OR rating IS NULL)
);

CREATE INDEX idx_reviews_project_id    ON reviews(project_id);
CREATE INDEX idx_reviews_reviewer_id   ON reviews(reviewer_id);
CREATE INDEX idx_reviews_type          ON reviews(project_id, review_type);
```

---

### 3.4 Approval Gates

#### `scope_change_requests`
```sql
-- Scope Change Gate: requires Committee approval
CREATE TABLE scope_change_requests (
  id              UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
  project_id      UUID        NOT NULL REFERENCES projects(id) ON DELETE CASCADE,
  requested_by    UUID        NOT NULL REFERENCES users(id),

  description     TEXT        NOT NULL,
  justification   TEXT        NOT NULL,

  status          VARCHAR(20) NOT NULL DEFAULT 'pending',
  -- Values: 'pending' | 'approved' | 'rejected'

  reviewed_by     UUID        REFERENCES users(id),
  reviewed_at     TIMESTAMPTZ,
  reviewer_note   TEXT,

  created_at      TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at      TIMESTAMPTZ NOT NULL DEFAULT NOW(),

  CONSTRAINT chk_scr_status CHECK (status IN ('pending','approved','rejected'))
);

CREATE INDEX idx_scr_project_id ON scope_change_requests(project_id);
CREATE INDEX idx_scr_pending    ON scope_change_requests(status)
  WHERE status = 'pending';
```

#### `roster_change_requests`
```sql
-- Roster Change Gate: Team Lead approves; Committee notified
CREATE TABLE roster_change_requests (
  id               UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
  project_id       UUID        NOT NULL REFERENCES projects(id) ON DELETE CASCADE,
  requested_by     UUID        NOT NULL REFERENCES users(id),

  change_type      VARCHAR(20) NOT NULL,
  -- Values: 'add' | 'remove' | 'role_change'
  target_user_id   UUID        NOT NULL REFERENCES users(id),
  new_role         VARCHAR(50),       -- for 'add' or 'role_change'
  reason           TEXT,

  status           VARCHAR(20) NOT NULL DEFAULT 'pending',
  -- Values: 'pending' | 'approved' | 'rejected'

  approved_by      UUID        REFERENCES users(id),  -- must be team_lead
  approved_at      TIMESTAMPTZ,
  committee_notified_at TIMESTAMPTZ,

  created_at       TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at       TIMESTAMPTZ NOT NULL DEFAULT NOW(),

  CONSTRAINT chk_rcr_change_type CHECK (
    change_type IN ('add','remove','role_change')
  ),
  CONSTRAINT chk_rcr_status CHECK (status IN ('pending','approved','rejected'))
);

CREATE INDEX idx_rcr_project_id ON roster_change_requests(project_id);
CREATE INDEX idx_rcr_pending    ON roster_change_requests(status)
  WHERE status = 'pending';
```

---

### 3.5 Showcase Stage

#### `showcase_entries`
```sql
CREATE TABLE showcase_entries (
  id                UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
  project_id        UUID        NOT NULL UNIQUE REFERENCES projects(id),

  -- Required fields
  readme_description TEXT       NOT NULL,
  github_url         TEXT       NOT NULL,

  -- Optional fields
  demo_video_url     TEXT,
  live_prototype_url TEXT,
  deck_url           TEXT,

  -- Searchable/filterable metadata
  tech_stack         TEXT[],            -- e.g. ['React','PostgreSQL','FastAPI']
  tags               TEXT[],
  academic_year      VARCHAR(9) NOT NULL,   -- denormalized from project
  category           VARCHAR(100) NOT NULL, -- denormalized from project

  -- Contact (privacy: only one email, no individual emails)
  contact_email      VARCHAR(255) NOT NULL,

  -- Events eligibility flag
  is_events_eligible BOOLEAN    NOT NULL DEFAULT FALSE,
  events_eligible_at TIMESTAMPTZ,

  -- Privacy: expose only names, not user IDs or personal emails
  -- Team member display list is generated via view/query at read time.

  -- Visibility
  is_published       BOOLEAN    NOT NULL DEFAULT FALSE,
  published_at       TIMESTAMPTZ,

  -- Soft-delete
  deleted_at         TIMESTAMPTZ,
  deleted_by         UUID       REFERENCES users(id),

  created_at         TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at         TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_showcase_year      ON showcase_entries(academic_year)
  WHERE deleted_at IS NULL AND is_published = TRUE;
CREATE INDEX idx_showcase_category  ON showcase_entries(category)
  WHERE deleted_at IS NULL AND is_published = TRUE;
CREATE INDEX idx_showcase_eligible  ON showcase_entries(is_events_eligible)
  WHERE is_events_eligible = TRUE AND deleted_at IS NULL;
-- Full-text search index
CREATE INDEX idx_showcase_fts ON showcase_entries
  USING GIN (to_tsvector('english',
    coalesce(readme_description,'') || ' ' ||
    coalesce(category,'') || ' ' ||
    array_to_string(tech_stack,' ') || ' ' ||
    array_to_string(tags,' ')
  ));
```

---

### 3.6 Admin Control Tables

#### `admin_warnings`
```sql
-- Private warnings logged against a student's profile (admin-only visibility)
CREATE TABLE admin_warnings (
  id          UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id     UUID        NOT NULL REFERENCES users(id),
  issued_by   UUID        NOT NULL REFERENCES users(id),
  reason      TEXT        NOT NULL,
  context_id  UUID,        -- optional FK to pitch_id or project_id
  context_type VARCHAR(20),-- 'pitch' | 'project' | 'general'

  -- Soft-undo
  revoked_at  TIMESTAMPTZ,
  revoked_by  UUID        REFERENCES users(id),
  revoke_reason TEXT,

  created_at  TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_aw_user_id   ON admin_warnings(user_id);
CREATE INDEX idx_aw_issued_by ON admin_warnings(issued_by);
-- Intentionally NO index on created_at to avoid accidental exposure
```

#### `action_logs`  *(Central Audit Trail)*
```sql
-- Immutable append-only audit log for all admin and state-change actions
CREATE TABLE action_logs (
  id              UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
  actor_id        UUID        NOT NULL REFERENCES users(id),
  action          VARCHAR(100) NOT NULL,
  -- e.g. 'pitch.approve', 'pitch.reject', 'project.soft_delete',
  --      'warning.issue', 'roster_change.approve', 'showcase.publish'

  target_type     VARCHAR(50) NOT NULL,
  -- e.g. 'pitch', 'project', 'milestone', 'showcase_entry', 'user'
  target_id       UUID        NOT NULL,

  reason          TEXT,
  metadata        JSONB,      -- additional context snapshot (old_status, new_status, etc.)

  -- Undo tracking
  is_undone       BOOLEAN     NOT NULL DEFAULT FALSE,
  undone_by       UUID        REFERENCES users(id),
  undone_at       TIMESTAMPTZ,
  undo_reason     TEXT,

  -- Undo is itself audited — chain reference
  undoes_log_id   UUID        REFERENCES action_logs(id),

  created_at      TIMESTAMPTZ NOT NULL DEFAULT NOW()
  -- NO updated_at: this table is append-only. Updates only touch is_undone/undone_by/undone_at.
);

CREATE INDEX idx_al_actor_id      ON action_logs(actor_id);
CREATE INDEX idx_al_target        ON action_logs(target_type, target_id);
CREATE INDEX idx_al_action        ON action_logs(action);
CREATE INDEX idx_al_created_at    ON action_logs(created_at DESC);
```

---

### 3.7 Checkpoint Review Scheduler

#### `review_checkpoints`
```sql
-- Scheduled checkpoint trigger records (every 2-3 weeks or milestone completion)
CREATE TABLE review_checkpoints (
  id             UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
  project_id     UUID        NOT NULL REFERENCES projects(id) ON DELETE CASCADE,
  milestone_id   UUID        REFERENCES milestones(id),  -- NULL = time-based

  trigger_type   VARCHAR(20) NOT NULL,
  -- Values: 'scheduled' | 'milestone_complete'

  scheduled_for  TIMESTAMPTZ NOT NULL,
  triggered_at   TIMESTAMPTZ,             -- set when the review request was sent
  review_id      UUID        REFERENCES reviews(id),    -- linked once submitted

  created_at     TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_rc_project_id    ON review_checkpoints(project_id);
CREATE INDEX idx_rc_scheduled_for ON review_checkpoints(scheduled_for)
  WHERE triggered_at IS NULL;
```

---

## 4. Entity-Relationship Overview

```
users ──────────────────────────────────────────────────────────────────┐
  │                                                                      │
  ├─(submitted_by)──► pitches ──────────────────────────────────────┐   │
  │                     │ (1:many)                                   │   │
  │                     ├──► pitch_proposed_members                  │   │
  │                     ├──► pitch_mentor_requests                   │   │
  │                     ├──► pitch_team_requests                     │   │
  │                     └──► pitch_feedback                          │   │
  │                     │                                            │   │
  │                     │ (1:1 on approval)                          │   │
  │                     └──► projects ◄───────────────────────────┘   │
  │                              │                                      │
  │                              ├──► project_members ◄─(user_id)─────┘
  │                              ├──► milestones                        │
  │                              │       └──► project_updates ◄─(author)┤
  │                              ├──► reviews ◄─(reviewer_id)──────────┤
  │                              ├──► scope_change_requests             │
  │                              ├──► roster_change_requests            │
  │                              ├──► review_checkpoints                │
  │                              └──► showcase_entries                  │
  │                                                                      │
  ├─(actor_id)──► action_logs (audit trail — all entities)              │
  └─(user_id)───► admin_warnings                                        │
                                                                         │
user_project_roles ◄─(user_id)──────────────────────────────────────────┘
```

---

## 5. State Machine Diagrams

### 5.1 Pitch State Machine

```
                    ┌─────────────────────────────────────────────┐
                    │             PITCH LIFECYCLE                 │
                    └─────────────────────────────────────────────┘

  [Student submits]
        │
        ▼
  ┌───────────┐
  │  PENDING  │◄────────────────────────────────────────────────┐
  └───────────┘                                                  │
       │                                                         │
       ├──[Admin/Committee: Approve]──────────────────────────►┌─────────┐
       │                                                        │APPROVED │──► spawns Project entity
       │                                                        └─────────┘
       │
       ├──[Admin/Committee: Needs Feedback]──────────────────►┌───────────────┐
       │                                                       │NEEDS_FEEDBACK │
       │                                                       └───────┬───────┘
       │                                                               │
       │                                  resubmission_count++         │
       │                                  [Student resubmits]──────────┘ (loops back to PENDING)
       │
       └──[Admin/Committee: Reject]────────────────────────►┌──────────┐
                                                             │REJECTED  │
                                                             └────┬─────┘
                                                                  │
                                                    cooldown_until = NOW() + 14 days
                                                                  │
                                                                  ▼
                                                             ┌──────────┐
                                                             │ARCHIVED  │  (after cooldown expires
                                                             └──────────┘   or admin archives)

  GUARD CONDITIONS:
  ─────────────────
  • Submit:        submitter must pass MemberMgmt eligibility check (active enrolled student)
  • Resubmit:      status == 'needs_feedback' AND submitter == original submitter
  • Cooldown:      status == 'rejected' → block new pitch submission until cooldown_until
  • Approve:       caller role ∈ {admin, committee}
  • Reject:        caller role ∈ {admin, committee}
  • Needs Feedback:caller role ∈ {admin, committee}
  • Archive:       caller role == admin, or automated job after cooldown
```

### 5.2 Project State Machine

```
                    ┌──────────────────────────────────────────────────┐
                    │              PROJECT LIFECYCLE                   │
                    └──────────────────────────────────────────────────┘

  [Pitch approved → auto-created]
        │
        ▼
  ┌─────────┐
  │ ACTIVE  │◄──────────────────────────────────────────────┐
  └────┬────┘                                                │
       │                                                     │
       ├──[Team self-service]────────────────►┌──────────┐  │
       │                                      │ ON_HOLD  │──┘ [resume]
       │                                      └──────────┘
       │
       ├──[Admin or Mentor flags]────────────►┌──────────┐
       │                                      │ BLOCKED  │──► [unblock → back to ACTIVE]
       │                                      └──────────┘
       │
       ├──[Team Lead submits final]──────────►┌────────────────────────┐
       │  [requires: mentor_signed_off=TRUE   │ FINAL_REVIEW_SUBMITTED │
       │   AND committee_signed_off=TRUE]     └───────────┬────────────┘
       │                                                   │
       │                                      [Committee final decision]
       │                                           │              │
       │                                     [Pass]          [Fail→back to ACTIVE
       │                                       │              with feedback]
       │                                       ▼
       │                                  ┌───────────┐
       │                                  │ COMPLETED │──► auto-triggers ShowcaseEntry creation
       │                                  └───────────┘
       │
       └──[Admin or Team Lead decision]──►┌──────────────┐
                                          │ DISCONTINUED │  (terminal, cannot resume)
                                          └──────────────┘

  GUARD CONDITIONS:
  ─────────────────
  • ON_HOLD ↔ ACTIVE:       caller must be project team_lead or admin
  • BLOCKED:                caller must be admin or mentor
  • UNBLOCK:                caller must be admin
  • FINAL_REVIEW_SUBMITTED: both mentor_signed_off AND committee_signed_off must be TRUE
  • COMPLETED:              caller must be committee (final approval action)
  • DISCONTINUED:           caller must be admin or team_lead (with admin confirmation)
  • Scope Change:           requires scope_change_request with status='approved' by committee
  • Roster Change:          requires roster_change_request approved by team_lead;
                            committee receives async notification

  APPROVAL GATE CHECKS (server-side middleware):
  ────────────────────────────────────────────
  1. Scope Change Request → Middleware: validateCommitteeApproval(projectId, 'scope_change')
  2. Roster Change → Middleware: validateTeamLeadApproval(projectId, userId)
                  → After approval: dispatchCommitteeNotification(projectId, changeId)
  3. Final Submission → Middleware: validateDualSignoff(projectId)
```

---

## 6. Role & Permission Matrix

```
                        │ Student │ Team Lead │ Team Member │ Mentor │ Committee │ Admin │
─────────────────────────┼─────────┼───────────┼─────────────┼────────┼───────────┼───────┤
Submit Pitch             │   ✓     │    ✓      │      ✓      │   ✗    │     ✗     │   ✗   │
Resubmit Pitch           │   ✓     │    ✓      │      ✓      │   ✗    │     ✗     │   ✗   │
Approve Pitch            │   ✗     │    ✗      │      ✗      │   ✗    │     ✓     │   ✓   │
Reject Pitch             │   ✗     │    ✗      │      ✗      │   ✗    │     ✓     │   ✓   │
Request Feedback (Pitch) │   ✗     │    ✗      │      ✗      │   ✗    │     ✓     │   ✓   │
View Own Pitch           │   ✓     │    ✓      │      ✓      │   ✗    │     ✗     │   ✓   │
View All Pitches         │   ✗     │    ✗      │      ✗      │   ✗    │     ✓     │   ✓   │
─────────────────────────┼─────────┼───────────┼─────────────┼────────┼───────────┼───────┤
View Project             │   ✗*    │    ✓      │      ✓      │   ✓    │     ✓     │   ✓   │
Post Update              │   ✗*    │    ✓      │      ✓      │   ✗    │     ✗     │   ✓   │
Post Advisory Review     │   ✗     │    ✗      │      ✗      │   ✓    │     ✗     │   ✗   │
Post Checkpoint Review   │   ✗     │    ✗      │      ✗      │   ✓    │     ✗     │   ✗   │
Scope Change Request     │   ✗     │    ✓      │      ✗      │   ✗    │     ✗     │   ✗   │
Approve Scope Change     │   ✗     │    ✗      │      ✗      │   ✗    │     ✓     │   ✓   │
Roster Change Request    │   ✗     │    ✓      │      ✗      │   ✗    │     ✗     │   ✗   │
Approve Roster Change    │   ✗     │    ✓      │      ✗      │   ✗    │     ✗     │   ✓   │
Hold/Resume Project      │   ✗     │    ✓      │      ✗      │   ✗    │     ✗     │   ✓   │
Block/Unblock Project    │   ✗     │    ✗      │      ✗      │   ✓    │     ✗     │   ✓   │
Sign-off (Mentor Gate)   │   ✗     │    ✗      │      ✗      │   ✓    │     ✗     │   ✗   │
Sign-off (Committee Gate)│   ✗     │    ✗      │      ✗      │   ✗    │     ✓     │   ✗   │
Submit Final             │   ✗     │    ✓      │      ✗      │   ✗    │     ✗     │   ✗   │
Soft-Delete Project      │   ✗     │    ✗      │      ✗      │   ✗    │     ✗     │   ✓   │
─────────────────────────┼─────────┼───────────┼─────────────┼────────┼───────────┼───────┤
Issue Warning            │   ✗     │    ✗      │      ✗      │   ✗    │     ✗     │   ✓   │
View Warnings            │   ✗     │    ✗      │      ✗      │   ✗    │     ✗     │   ✓   │
Undo Admin Action        │   ✗     │    ✗      │      ✗      │   ✗    │     ✗     │   ✓   │
View Audit Log           │   ✗     │    ✗      │      ✗      │   ✗    │     ✗     │   ✓   │
─────────────────────────┼─────────┼───────────┼─────────────┼────────┼───────────┼───────┤
Publish Showcase Entry   │   ✗     │    ✗      │      ✗      │   ✗    │     ✗     │   ✓   │
View Showcase Gallery    │   ✓     │    ✓      │      ✓      │   ✓    │     ✓     │   ✓   │
Flag Events-Eligible     │   ✗     │    ✗      │      ✗      │   ✗    │     ✓     │   ✓   │

* 'Student' as a raw role cannot view projects; must be a project_member (team_member role).
```

---

## 7. API & Integration Contracts

> All endpoints are prefixed `/api/v1/projects`. All requests require a valid session token. Permissions are enforced server-side via middleware described in §9.

### 7.1 Pitch Endpoints

```
POST   /pitches                    → Submit a new pitch
  Body: { title, category, domain, description, project_link?,
          is_final_submission, proposed_members[], mentor_requests[], team_requests[] }
  Guards: [isEnrolledStudent, noCooldownActive]
  Response 201: { pitch_id, status: 'pending' }

GET    /pitches                    → List pitches (admin/committee: all; student: own)
  Query: ?status=&page=&limit=
  Response 200: { data: Pitch[], pagination }

GET    /pitches/:id                → Get single pitch detail
  Guards: [isOwnerOrAdminOrCommittee]

PATCH  /pitches/:id/status         → Admin/Committee: change pitch status
  Body: { action: 'approve'|'reject'|'needs_feedback', reason?, feedback? }
  Guards: [isAdminOrCommittee]
  Side-effects:
    - 'approve'       → creates Project, emits IdeaCentre events for open requests
    - 'reject'        → sets cooldown_until = NOW() + 14d, writes action_log
    - 'needs_feedback'→ increments resubmission_count, writes action_log

POST   /pitches/:id/resubmit       → Student resubmits after needs_feedback
  Guards: [isOwner, pitchStatus == 'needs_feedback']
  Body: { title?, description?, ...updatable fields }

POST   /pitches/:id/warnings       → Admin: issue warning against submitter
  Guards: [isAdmin]
  Body: { reason }
```

### 7.2 Project Endpoints

```
GET    /projects                   → List projects
  Query: ?status=&year=&category=&page=&limit=
  Guards: [isAdminOrCommitteeOrProjectMember]

GET    /projects/:id               → Get project detail
  Guards: [isProjectMember | isAdminOrCommittee]

PATCH  /projects/:id/status        → Change project status
  Body: { action: 'hold'|'resume'|'block'|'unblock'|'discontinue', reason? }
  Guards: [roleGuard per action — see permission matrix]

POST   /projects/:id/milestones    → Create milestone
  Body: { title, description, sequence_order, due_date? }
  Guards: [isTeamLeadOrAdmin, milestoneCount < 6]

GET    /projects/:id/milestones    → List milestones
  Guards: [isProjectMember | isAdminOrCommittee]

PATCH  /projects/:id/milestones/:mid/status
  Body: { status: 'in_progress'|'completed' }
  Guards: [isTeamMemberOrLead]
  Side-effect: if 'completed' → triggers review_checkpoint creation

POST   /projects/:id/updates       → Post activity update
  Body: { milestone_id, body, attachments? }
  Guards: [isActiveTeamMember]

GET    /projects/:id/updates       → Feed of updates
  Guards: [isProjectMember | isAdminOrCommittee]

POST   /projects/:id/reviews       → Post review (mentor advisory / checkpoint)
  Body: { milestone_id?, review_type, feedback, rating? }
  Guards: [isMentorOnProject | isAdmin]

POST   /projects/:id/scope-changes → Request scope change
  Guards: [isTeamLead]
  Body: { description, justification }

PATCH  /projects/:id/scope-changes/:cid
  Body: { action: 'approve'|'reject', note? }
  Guards: [isCommitteeOrAdmin]

POST   /projects/:id/roster-changes → Request roster change
  Guards: [isTeamLead]
  Body: { change_type, target_user_id, new_role?, reason? }

PATCH  /projects/:id/roster-changes/:rid
  Body: { action: 'approve'|'reject' }
  Guards: [isTeamLead]
  Side-effect: if 'approve' → notify committee asynchronously

POST   /projects/:id/signoff       → Mentor or Committee sign-off
  Body: { role: 'mentor'|'committee' }
  Guards: [isMentorOnProject | isCommitteeOrAdmin]
  Side-effect: if both flags set → project eligible for final submission

POST   /projects/:id/submit-final  → Team Lead submits for final review
  Guards: [isTeamLead, validateDualSignoff]
  Side-effect: status → 'final_review_submitted'

DELETE /projects/:id               → Soft-delete project (admin only)
  Guards: [isAdmin]
  Body: { reason }
  Side-effect: writes action_log, sets deleted_at
```

### 7.3 Admin Endpoints

```
GET    /admin/audit-log            → Paginated audit trail
  Query: ?actor=&target_type=&action=&from=&to=&page=
  Guards: [isAdmin]

POST   /admin/audit-log/:log_id/undo → Undo an admin action
  Body: { reason }
  Guards: [isAdmin]
  Constraint: action must be undo-eligible (not all actions can be undone)

GET    /admin/warnings/:user_id    → View warnings for a user
  Guards: [isAdmin]

POST   /admin/warnings/:user_id/revoke/:warning_id
  Body: { reason }
  Guards: [isAdmin]
```

### 7.4 Showcase Endpoints

```
GET    /showcase                   → Public gallery view
  Query: ?category=&year=&tech=&search=&events_eligible=&page=&limit=
  Response: { data: ShowcaseEntry[], pagination }
  -- Returns only published, non-deleted entries with privacy-safe fields

GET    /showcase/:id               → Single showcase entry
POST   /showcase/:id/publish       → Admin: publish entry
  Guards: [isAdmin]
POST   /showcase/:id/flag-events   → Mark events-eligible
  Guards: [isCommitteeOrAdmin]
```

### 7.5 External Service Integration Contracts

#### A. Member Management — Eligibility Check
```
Interface: MemberManagementClient

Method: verifyStudent(userId: string): Promise<StudentVerification>

HTTP Call:
  GET <MEMBER_MGMT_BASE_URL>/verify-student
  Headers: { Authorization: Bearer <internal_service_token> }
  Query: ?userId=<uuid>

Response type StudentVerification {
  is_active:    boolean       // must be TRUE to submit pitch
  name:         string
  email:        string
  department:   string
  enrollment_id: string
}

Error handling:
  - 503 → treat as eligibility check failure; reject submission with 503
  - 404 → user not found in Member Management; reject with 403
  - Cache result for max 60 seconds (do NOT cache failures)
  - Snapshot { name, email, department, enroll_status } into pitches table
    at submission time for audit durability.
```

#### B. Idea Centre — Event Emissions (Webhook / Message Queue)
```
Interface: IdeaCentreEventBus

Events emitted by Projects domain:

1. pitch.mentor_request.opened
   Payload: {
     event:    'pitch.mentor_request.opened',
     pitch_id: uuid,
     request_id: uuid,
     expertise_tags: string[],
     requested_mentor_id: uuid | null,
     emitted_at: ISO8601
   }

2. pitch.team_request.opened
   Payload: {
     event:    'pitch.team_request.opened',
     pitch_id: uuid,
     request_id: uuid,
     role_sought: string,
     slots_available: number,
     emitted_at: ISO8601
   }

3. pitch.team_request.fulfilled
   Payload: {
     event:    'pitch.team_request.fulfilled',
     pitch_id: uuid,
     request_id: uuid,
     filled_by: uuid,
     emitted_at: ISO8601
   }

4. pitch.mentor_request.claimed
   Payload: {
     event:    'pitch.mentor_request.claimed',
     pitch_id: uuid,
     request_id: uuid,
     claimed_by: uuid,
     emitted_at: ISO8601
   }

Delivery: POST to IdeaCentre webhook endpoint OR publish to shared message queue topic
  'cvs.projects.events'. Include retry logic with exponential backoff (3 attempts).
```

#### C. Events Service — Downstream Shared Query View
```
Endpoint (provided BY Projects, consumed BY Events service):

GET /api/v1/projects/showcase/events-feed
  Query: ?year=&category=&from_date=&page=&limit=
  Auth: Internal service token (not user session)
  Guards: [isInternalServiceToken]

Response payload:
{
  "data": [
    {
      "showcase_id":     "uuid",
      "project_title":   "string",
      "category":        "string",
      "tech_stack":      ["string"],
      "academic_year":   "2025-2026",
      "github_url":      "string",
      "demo_video_url":  "string | null",
      "live_prototype_url": "string | null",
      "deck_url":        "string | null",
      "readme_summary":  "string",          // first 500 chars of readme_description
      "team_member_names": ["string"],       // display names only, no IDs/emails
      "contact_email":   "string",
      "is_events_eligible": true,
      "published_at":    "ISO8601"
    }
  ],
  "pagination": { "page": 1, "limit": 20, "total": 45 }
}

Privacy rule: team_member_names is populated via JOIN to project_members → users.name.
No user IDs, individual emails, or auth data are included in this response.
```

---

## 8. Soft-Delete & Audit Log Strategy

### 8.1 Soft-Delete Pattern

```
Rule: No project data is ever hard-deleted by administrative action.

Implementation:
  1. Every soft-deletable table has columns:
       deleted_at TIMESTAMPTZ  (NULL = alive)
       deleted_by UUID REFERENCES users(id)

  2. All application queries append:
       WHERE deleted_at IS NULL
     This is enforced via a repository/query-builder base class, never ad-hoc.

  3. Partial indexes (WHERE deleted_at IS NULL) are added to hot query paths.

  4. Admin "view deleted" requires explicit isAdmin guard and passes
     includeDeleted: true flag to bypass the base filter.

Undo (Restore) Pattern:
  - A soft-delete can be undone by setting deleted_at = NULL, deleted_by = NULL.
  - Every undo is recorded in action_logs with undoes_log_id pointing to the original.
  - Cooldown: undo is only available within 30 days of deletion. After 30 days,
    restoration requires a manual database procedure with dual-admin sign-off.
```

### 8.2 Action Log Write Pattern

```
Every state-changing server action calls writeAuditLog() BEFORE committing
the primary change. Both writes occur in the same database transaction:

transaction {
  UPDATE pitches SET status = 'approved' WHERE id = :pitch_id;
  INSERT INTO action_logs (actor_id, action, target_type, target_id,
    reason, metadata)
  VALUES (:admin_id, 'pitch.approve', 'pitch', :pitch_id, :reason,
    '{"old_status":"pending","new_status":"approved"}'::jsonb);
}

If the transaction rolls back, the log entry is also rolled back.
The action_log table is append-only: no UPDATE except for the undo fields
(is_undone, undone_by, undone_at, undo_reason).
```

### 8.3 Undo-Eligible Actions

| Action | Undo Effect | Window |
|--------|-------------|--------|
| `pitch.reject` | Restore pitch to `pending`, clear cooldown | 7 days |
| `project.soft_delete` | Restore project (set deleted_at = NULL) | 30 days |
| `warning.issue` | Revoke warning (set revoked_at) | 30 days |
| `pitch.approve` | **NOT undo-eligible** — project already spawned; use discontinue instead | — |
| `project.discontinue` | **NOT undo-eligible** — terminal state | — |

---

## 9. Middleware & Permission Enforcement

```
Request pipeline (pseudocode — technology-agnostic):

  1. authenticate(req)
     → Validates session token via auth system (existing infrastructure)
     → Attaches req.user = { id, global_roles[] }

  2. authorizeProjectDomain(req)
     → Loads user's global project_roles (from user_project_roles)
     → Attaches req.projectRoles = ['admin', 'committee', ...] etc.

  3. authorizeProjectScoped(projectId)(req)
     → Loads user's role in project_members for this project
     → Attaches req.memberRole = 'team_lead' | 'team_member' | 'mentor' | null
     → Used for project-specific endpoints

  4. policyGuard(policy)(req)
     → Applies named policy (see below)

NAMED POLICIES (server-side, not UI-side):
  isEnrolledStudent:       req.projectRoles.includes('student')
                           AND verifyStudent(req.user.id).is_active == true
  noCooldownActive:        pitches.cooldown_until < NOW() (query check)
  isAdminOrCommittee:      req.projectRoles intersects ['admin','committee']
  isProjectMember:         req.memberRole != null AND memberRow.removed_at IS NULL
  isTeamLead:              req.memberRole == 'team_lead'
  isActiveTeamMember:      req.memberRole IN ('team_lead','team_member')
  isMentorOnProject:       req.memberRole == 'mentor'
  isOwner:                 resource.submitted_by == req.user.id
  isOwnerOrAdminOrCommittee: isOwner OR isAdminOrCommittee
  validateDualSignoff:     project.mentor_signed_off AND project.committee_signed_off
  isInternalServiceToken:  req.headers['X-Service-Token'] == env.INTERNAL_SERVICE_SECRET
```

---

## 10. Architectural Notes & Assumptions

### Assumptions

1. **Existing `users` table** — We FK directly to `users(id)`. No user data is duplicated except snapshots (e.g., `submitter_dept` on pitches for audit durability).
2. **Existing auth system** — Session/JWT validation is pre-built. Our middleware consumes it, does not replace it.
3. **Single deployable backend** — Per `docs/architecture.md`, the six "services" are frontend ownership boundaries, not separate backend microservices. The Projects domain lives within one backend runtime.
4. **PostgreSQL recommended** — JSONB, GIN indexes for full-text search on showcase, and native UUID support make it the best fit. Schema uses standard SQL where possible.
5. **Runtime baseline selected** — The MVP uses the centralized Express backend.
   The production PostgreSQL ORM/migration adapter remains a backend-team decision.

### Why `pitches` and `projects` are Strictly Separated

A `Pitch` is a *proposal artifact* owned by the submitter. A `Project` is a *collaborative delivery entity* with its own lifecycle, team, and visibility rules. Merging them would:
- Pollute the project's audit trail with pitch review cycles.
- Make the `resubmission_count` and `cooldown` logic bleed into active project management.
- Break the clean 1:1 spawn relationship (one pitch can only ever produce one project).

### Visibility Enforcement Strategy

Project content (updates, reviews, milestones) is gated at the query layer, not just the route layer:

```
function getProjectOrThrow(projectId, requestUser) {
  const isMember = project_members.exists(projectId, requestUser.id, removed_at IS NULL)
  const isGlobal = requestUser.projectRoles.intersects(['admin','committee'])
  if (!isMember && !isGlobal) throw ForbiddenError
  return project
}
```

This pattern prevents information leakage even if a route guard is misconfigured.

### Checkpoint Review Scheduling

The backend must run a periodic background job (cron, every 24h) that:
1. Queries `projects` WHERE `status = 'active'`.
2. For each project, checks if the last `review_checkpoints.triggered_at` was > 14 days ago.
3. If so, inserts a new `review_checkpoints` row and notifies the assigned mentor.
4. Milestone completion triggers an immediate checkpoint (handled synchronously when milestone status → `completed`).

### Cascade Behavior on Pitch Soft-Delete

Pitches should **not** cascade-delete their proposed members, mentor requests, or team requests rows. These are audit records. Only the pitch itself gets `deleted_at` set. Child records remain for historical reference and are filtered out by the pitch's visibility rules.

### Theme Token Governance Note

Projects uses the approved Indigo (`#5B5FC7`) identity from
`docs/ui-guidelines.md`. Backend responses remain presentation-neutral.

---

*Document authored for `cvs-garage` monorepo · Projects domain · Backend Architecture Phase*
*Aligns with: `docs/architecture.md`, `docs/ui-guidelines.md`, `backend/INSTRUCTIONS.md`, `packages/contracts/`*
