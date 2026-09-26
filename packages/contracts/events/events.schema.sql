-- =============================================================================
-- EVENTS MANAGEMENT & DISCOVERY PLATFORM - CENTRAL BACKEND RELATIONAL SCHEMA
-- Database: PostgreSQL (or compatible SQL database)
-- Schema Isolation: Events Domain tables (prefixed with `events_`)
-- Note: Member/User entities are strictly referenced via external string IDs (`member_id`).
-- =============================================================================

CREATE SCHEMA IF NOT EXISTS events_domain;

-- -----------------------------------------------------------------------------
-- ENUMS
-- -----------------------------------------------------------------------------
CREATE TYPE events_domain.event_category AS ENUM (
  'Technical',
  'Cultural',
  'Sports',
  'Academic',
  'Social',
  'Competitions',
  'Workshops',
  'Seminars',
  'Other'
);

CREATE TYPE events_domain.event_mode AS ENUM (
  'Online',
  'Offline',
  'Hybrid'
);

CREATE TYPE events_domain.lifecycle_status AS ENUM (
  'Draft',
  'Submitted',
  'UnderReview',
  'ChangesRequested',
  'Published',
  'Ongoing',
  'Completed',
  'Archived',
  'Rejected'
);

CREATE TYPE events_domain.user_event_role AS ENUM (
  'Participant',
  'Judge',
  'Audience',
  'Organizer',
  'Admin'
);

CREATE TYPE events_domain.registration_status AS ENUM (
  'Registered',
  'PendingApproval',
  'Waitlisted',
  'Cancelled',
  'Attended'
);

-- -----------------------------------------------------------------------------
-- 1. MAIN EVENTS TABLE
-- -----------------------------------------------------------------------------
CREATE TABLE events_domain.events (
  id VARCHAR(64) PRIMARY KEY,
  title VARCHAR(255) NOT NULL,
  short_summary VARCHAR(500) NOT NULL,
  full_description TEXT NOT NULL,
  category events_domain.event_category NOT NULL,
  mode events_domain.event_mode NOT NULL,
  poster_url TEXT,
  
  -- Foreign key references to external service IDs (Members / Organization)
  organizer_id VARCHAR(64) NOT NULL,
  organizer_name VARCHAR(255) NOT NULL,
  
  status events_domain.lifecycle_status NOT NULL DEFAULT 'Draft',
  
  -- Timestamps
  registration_start_date TIMESTAMPTZ NOT NULL,
  registration_end_date TIMESTAMPTZ NOT NULL,
  event_start_date TIMESTAMPTZ NOT NULL,
  event_end_date TIMESTAMPTZ NOT NULL,
  
  -- Location JSONB Configuration (Online/Offline/Hybrid details)
  location_config JSONB NOT NULL DEFAULT '{}'::jsonb,
  
  -- Rules & Capacity
  rules_and_guidelines JSONB NOT NULL DEFAULT '[]'::jsonb,
  max_capacity INT,
  allow_audience BOOLEAN NOT NULL DEFAULT TRUE,
  allow_judge_applications BOOLEAN NOT NULL DEFAULT FALSE,
  custom_registration_questions JSONB DEFAULT '[]'::jsonb,
  
  -- Attendance Engine
  attendance_tracking_enabled BOOLEAN NOT NULL DEFAULT TRUE,
  
  created_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP
);

-- Indexes for performance
CREATE INDEX idx_events_category ON events_domain.events(category);
CREATE INDEX idx_events_mode ON events_domain.events(mode);
CREATE INDEX idx_events_status ON events_domain.events(status);
CREATE INDEX idx_events_organizer ON events_domain.events(organizer_id);
CREATE INDEX idx_events_dates ON events_domain.events(event_start_date, event_end_date);

-- -----------------------------------------------------------------------------
-- 2. SUB-TRACKS / COMPETITIONS
-- -----------------------------------------------------------------------------
CREATE TABLE events_domain.event_subtracks (
  id VARCHAR(64) PRIMARY KEY,
  event_id VARCHAR(64) NOT NULL REFERENCES events_domain.events(id) ON DELETE CASCADE,
  title VARCHAR(255) NOT NULL,
  description TEXT,
  max_participants INT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX idx_subtracks_event ON events_domain.event_subtracks(event_id);

-- -----------------------------------------------------------------------------
-- 3. SCHEDULE / AGENDA TIMELINE
-- -----------------------------------------------------------------------------
CREATE TABLE events_domain.event_schedules (
  id VARCHAR(64) PRIMARY KEY,
  event_id VARCHAR(64) NOT NULL REFERENCES events_domain.events(id) ON DELETE CASCADE,
  title VARCHAR(255) NOT NULL,
  start_time TIMESTAMPTZ NOT NULL,
  end_time TIMESTAMPTZ NOT NULL,
  description TEXT,
  speaker_or_host VARCHAR(255),
  sort_order INT NOT NULL DEFAULT 0
);

CREATE INDEX idx_schedules_event ON events_domain.event_schedules(event_id);

-- -----------------------------------------------------------------------------
-- 4. PRIZES & REWARDS BREAKDOWN
-- -----------------------------------------------------------------------------
CREATE TABLE events_domain.event_prizes (
  id VARCHAR(64) PRIMARY KEY,
  event_id VARCHAR(64) NOT NULL REFERENCES events_domain.events(id) ON DELETE CASCADE,
  position VARCHAR(32) NOT NULL, -- '1st', '2nd', '3rd', etc.
  title VARCHAR(255) NOT NULL,
  reward_amount VARCHAR(255),
  description TEXT
);

CREATE INDEX idx_prizes_event ON events_domain.event_prizes(event_id);

-- -----------------------------------------------------------------------------
-- 5. EVENT JUDGES
-- -----------------------------------------------------------------------------
CREATE TABLE events_domain.event_judges (
  id VARCHAR(64) PRIMARY KEY,
  event_id VARCHAR(64) NOT NULL REFERENCES events_domain.events(id) ON DELETE CASCADE,
  judge_member_id VARCHAR(64) NOT NULL, -- Reference to external Member entity
  designation VARCHAR(255) NOT NULL,
  bio TEXT,
  portfolio_url TEXT,
  is_appointed BOOLEAN NOT NULL DEFAULT TRUE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT unique_event_judge UNIQUE(event_id, judge_member_id)
);

CREATE INDEX idx_judges_event ON events_domain.event_judges(event_id);

-- -----------------------------------------------------------------------------
-- 6. UNIFIED REGISTRATION SYSTEM
-- -----------------------------------------------------------------------------
CREATE TABLE events_domain.event_registrations (
  id VARCHAR(64) PRIMARY KEY,
  event_id VARCHAR(64) NOT NULL REFERENCES events_domain.events(id) ON DELETE CASCADE,
  member_id VARCHAR(64) NOT NULL, -- External user/member ID
  role events_domain.user_event_role NOT NULL,
  status events_domain.registration_status NOT NULL DEFAULT 'Registered',
  payload JSONB DEFAULT '{}'::jsonb, -- Includes team name, experience level, custom answers
  registered_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT unique_user_event_role UNIQUE(event_id, member_id, role)
);

CREATE INDEX idx_registrations_event ON events_domain.event_registrations(event_id);
CREATE INDEX idx_registrations_member ON events_domain.event_registrations(member_id);
CREATE INDEX idx_registrations_status ON events_domain.event_registrations(status);

-- -----------------------------------------------------------------------------
-- 7. QR ATTENDANCE SCAN LOGS
-- -----------------------------------------------------------------------------
CREATE TABLE events_domain.event_checkins (
  id VARCHAR(64) PRIMARY KEY,
  event_id VARCHAR(64) NOT NULL REFERENCES events_domain.events(id) ON DELETE CASCADE,
  registration_id VARCHAR(64) NOT NULL REFERENCES events_domain.event_registrations(id) ON DELETE CASCADE,
  member_id VARCHAR(64) NOT NULL,
  scanned_by_member_id VARCHAR(64) NOT NULL, -- Organizer/Staff who scanned
  check_in_timestamp TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
  session_token_hash VARCHAR(255) NOT NULL,
  CONSTRAINT unique_event_member_checkin UNIQUE(event_id, member_id)
);

CREATE INDEX idx_checkins_event ON events_domain.event_checkins(event_id);
CREATE INDEX idx_checkins_member ON events_domain.event_checkins(member_id);
