PRAGMA foreign_keys = ON;
PRAGMA journal_mode = WAL;

BEGIN IMMEDIATE;

CREATE TABLE schema_migrations (
    version INTEGER PRIMARY KEY,
    name TEXT NOT NULL UNIQUE,
    applied_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP
) STRICT;

CREATE TABLE departments (
    id TEXT PRIMARY KEY,
    name TEXT NOT NULL UNIQUE,
    slug TEXT NOT NULL UNIQUE,
    created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP
) STRICT;

CREATE TABLE academic_years (
    id TEXT PRIMARY KEY,
    label TEXT NOT NULL UNIQUE,
    starts_on TEXT NOT NULL,
    ends_on TEXT NOT NULL,
    is_current INTEGER NOT NULL DEFAULT 0 CHECK (is_current IN (0, 1)),
    CHECK (starts_on < ends_on)
) STRICT;

CREATE UNIQUE INDEX uq_academic_year_current
    ON academic_years(is_current) WHERE is_current = 1;

CREATE TABLE accounts (
    id TEXT PRIMARY KEY,
    email TEXT NOT NULL COLLATE NOCASE,
    email_verified_at TEXT,
    password_hash TEXT,
    password_updated_at TEXT,
    principal_type TEXT NOT NULL DEFAULT 'person'
        CHECK (principal_type IN ('person', 'organization')),
    status TEXT NOT NULL DEFAULT 'pending_verification'
        CHECK (status IN ('pending_verification', 'active', 'suspended', 'deactivated')),
    status_reason TEXT,
    failed_login_count INTEGER NOT NULL DEFAULT 0 CHECK (failed_login_count >= 0),
    locked_until TEXT,
    last_login_at TEXT,
    created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
    deleted_at TEXT
) STRICT;

CREATE UNIQUE INDEX uq_accounts_active_email
    ON accounts(email) WHERE deleted_at IS NULL;
CREATE INDEX idx_accounts_status ON accounts(status, created_at DESC);

CREATE TABLE member_profiles (
    account_id TEXT PRIMARY KEY REFERENCES accounts(id) ON DELETE CASCADE,
    full_name TEXT NOT NULL,
    display_name TEXT NOT NULL,
    avatar_url TEXT,
    headline TEXT,
    bio TEXT,
    department_id TEXT REFERENCES departments(id) ON DELETE SET NULL,
    academic_year_id TEXT REFERENCES academic_years(id) ON DELETE SET NULL,
    enrollment_year INTEGER,
    program TEXT,
    student_identifier TEXT,
    skills_json TEXT NOT NULL DEFAULT '[]' CHECK (json_valid(skills_json)),
    links_json TEXT NOT NULL DEFAULT '{}' CHECK (json_valid(links_json)),
    created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP
) STRICT;

CREATE UNIQUE INDEX uq_member_profiles_student_identifier
    ON member_profiles(student_identifier) WHERE student_identifier IS NOT NULL;
CREATE INDEX idx_member_profiles_department_year
    ON member_profiles(department_id, academic_year_id);

CREATE TABLE organization_profiles (
    account_id TEXT PRIMARY KEY REFERENCES accounts(id) ON DELETE CASCADE,
    name TEXT NOT NULL,
    organization_type TEXT NOT NULL
        CHECK (organization_type IN ('club', 'department', 'external_partner')),
    description TEXT,
    logo_url TEXT,
    website_url TEXT,
    contact_email TEXT COLLATE NOCASE,
    verified_at TEXT,
    created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP
) STRICT;

CREATE TABLE roles (
    id TEXT PRIMARY KEY,
    role_key TEXT NOT NULL UNIQUE,
    name TEXT NOT NULL,
    description TEXT,
    is_assignable INTEGER NOT NULL DEFAULT 1 CHECK (is_assignable IN (0, 1)),
    precedence INTEGER NOT NULL CHECK (precedence >= 0),
    created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP
) STRICT;

CREATE TABLE permissions (
    permission_key TEXT PRIMARY KEY,
    description TEXT NOT NULL
) STRICT;

CREATE TABLE role_permissions (
    role_id TEXT NOT NULL REFERENCES roles(id) ON DELETE CASCADE,
    permission_key TEXT NOT NULL REFERENCES permissions(permission_key) ON DELETE CASCADE,
    PRIMARY KEY (role_id, permission_key)
) WITHOUT ROWID, STRICT;

CREATE TABLE account_roles (
    id TEXT PRIMARY KEY,
    account_id TEXT NOT NULL REFERENCES accounts(id) ON DELETE CASCADE,
    role_id TEXT NOT NULL REFERENCES roles(id) ON DELETE RESTRICT,
    granted_by TEXT REFERENCES accounts(id) ON DELETE SET NULL,
    grant_reason TEXT NOT NULL
        CHECK (grant_reason IN ('seed', 'signup_default', 'admin_manual', 'automatic_eligibility', 'migration')),
    granted_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
    revoked_at TEXT,
    revoked_by TEXT REFERENCES accounts(id) ON DELETE SET NULL,
    revoke_reason TEXT
) STRICT;

CREATE UNIQUE INDEX uq_account_roles_active
    ON account_roles(account_id, role_id) WHERE revoked_at IS NULL;
CREATE INDEX idx_account_roles_account ON account_roles(account_id, granted_at DESC);

CREATE TABLE auth_sessions (
    id TEXT PRIMARY KEY,
    account_id TEXT NOT NULL REFERENCES accounts(id) ON DELETE CASCADE,
    refresh_token_hash TEXT NOT NULL UNIQUE,
    ip_address TEXT,
    user_agent TEXT,
    created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
    expires_at TEXT NOT NULL,
    revoked_at TEXT
) STRICT;

CREATE INDEX idx_auth_sessions_account ON auth_sessions(account_id, created_at DESC);

CREATE TABLE auth_tokens (
    id TEXT PRIMARY KEY,
    account_id TEXT NOT NULL REFERENCES accounts(id) ON DELETE CASCADE,
    token_hash TEXT NOT NULL UNIQUE,
    token_type TEXT NOT NULL
        CHECK (token_type IN ('email_verification', 'password_reset', 'invitation')),
    expires_at TEXT NOT NULL,
    consumed_at TEXT,
    created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP
) STRICT;

CREATE TABLE member_invitations (
    id TEXT PRIMARY KEY,
    email TEXT NOT NULL COLLATE NOCASE,
    invited_by TEXT NOT NULL REFERENCES accounts(id) ON DELETE RESTRICT,
    principal_type TEXT NOT NULL CHECK (principal_type IN ('person', 'organization')),
    role_id TEXT REFERENCES roles(id) ON DELETE SET NULL,
    expires_at TEXT NOT NULL,
    accepted_at TEXT,
    accepted_by TEXT REFERENCES accounts(id) ON DELETE SET NULL,
    revoked_at TEXT,
    created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP
) STRICT;

CREATE UNIQUE INDEX uq_member_invitations_open
    ON member_invitations(email) WHERE accepted_at IS NULL AND revoked_at IS NULL;

CREATE TABLE mentor_applications (
    id TEXT PRIMARY KEY,
    account_id TEXT NOT NULL REFERENCES accounts(id) ON DELETE CASCADE,
    status TEXT NOT NULL DEFAULT 'draft'
        CHECK (status IN ('draft', 'eligible', 'pending_review', 'approved', 'rejected', 'withdrawn')),
    origin TEXT NOT NULL
        CHECK (origin IN ('self_nomination', 'automatic_rule', 'admin_initiated')),
    submitted_at TEXT,
    reviewed_by TEXT REFERENCES accounts(id) ON DELETE SET NULL,
    decision_at TEXT,
    reasons_json TEXT NOT NULL DEFAULT '[]' CHECK (json_valid(reasons_json)),
    created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP
) STRICT;

CREATE TABLE eligibility_snapshots (
    id TEXT PRIMARY KEY,
    mentor_application_id TEXT NOT NULL REFERENCES mentor_applications(id) ON DELETE CASCADE,
    ruleset_version TEXT NOT NULL,
    metric_values_json TEXT NOT NULL CHECK (json_valid(metric_values_json)),
    failed_criteria_json TEXT NOT NULL DEFAULT '[]' CHECK (json_valid(failed_criteria_json)),
    evaluated_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP
) STRICT;

CREATE TABLE media_assets (
    id TEXT PRIMARY KEY,
    storage_key TEXT NOT NULL UNIQUE,
    public_url TEXT,
    media_type TEXT NOT NULL CHECK (media_type IN ('image', 'video', 'document')),
    mime_type TEXT NOT NULL,
    byte_size INTEGER NOT NULL CHECK (byte_size >= 0),
    alt_text TEXT,
    uploaded_by TEXT REFERENCES accounts(id) ON DELETE SET NULL,
    created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
    deleted_at TEXT
) STRICT;

CREATE TABLE teams (
    id TEXT PRIMARY KEY,
    name TEXT NOT NULL,
    slug TEXT NOT NULL UNIQUE,
    created_by TEXT NOT NULL REFERENCES accounts(id) ON DELETE RESTRICT,
    created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
    archived_at TEXT
) STRICT;

CREATE TABLE team_memberships (
    id TEXT PRIMARY KEY,
    team_id TEXT NOT NULL REFERENCES teams(id) ON DELETE CASCADE,
    account_id TEXT NOT NULL REFERENCES accounts(id) ON DELETE RESTRICT,
    role TEXT NOT NULL CHECK (role IN ('lead', 'member', 'mentor')),
    joined_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
    removed_at TEXT,
    removed_by TEXT REFERENCES accounts(id) ON DELETE SET NULL,
    removal_reason TEXT
) STRICT;

CREATE UNIQUE INDEX uq_team_memberships_active
    ON team_memberships(team_id, account_id) WHERE removed_at IS NULL;
CREATE INDEX idx_team_memberships_account
    ON team_memberships(account_id, joined_at DESC);

CREATE TABLE project_pitches (
    id TEXT PRIMARY KEY,
    submitted_by TEXT NOT NULL REFERENCES accounts(id) ON DELETE RESTRICT,
    title TEXT NOT NULL,
    category TEXT NOT NULL,
    domain TEXT,
    description TEXT NOT NULL,
    project_url TEXT,
    status TEXT NOT NULL DEFAULT 'pending'
        CHECK (status IN ('pending', 'needs_feedback', 'approved', 'rejected', 'archived')),
    resubmission_count INTEGER NOT NULL DEFAULT 0 CHECK (resubmission_count >= 0),
    cooldown_until TEXT,
    submitter_snapshot_json TEXT NOT NULL DEFAULT '{}' CHECK (json_valid(submitter_snapshot_json)),
    created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
    deleted_at TEXT
) STRICT;

CREATE INDEX idx_project_pitches_owner_status
    ON project_pitches(submitted_by, status, created_at DESC) WHERE deleted_at IS NULL;

CREATE TABLE project_pitch_feedback (
    id TEXT PRIMARY KEY,
    pitch_id TEXT NOT NULL REFERENCES project_pitches(id) ON DELETE CASCADE,
    reviewer_id TEXT NOT NULL REFERENCES accounts(id) ON DELETE RESTRICT,
    action TEXT NOT NULL CHECK (action IN ('approved', 'rejected', 'needs_feedback')),
    feedback TEXT NOT NULL,
    created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP
) STRICT;

CREATE TABLE projects (
    id TEXT PRIMARY KEY,
    pitch_id TEXT UNIQUE REFERENCES project_pitches(id) ON DELETE SET NULL,
    team_id TEXT NOT NULL REFERENCES teams(id) ON DELETE RESTRICT,
    slug TEXT NOT NULL UNIQUE,
    title TEXT NOT NULL,
    category TEXT NOT NULL,
    domain TEXT,
    description TEXT NOT NULL,
    academic_year_id TEXT REFERENCES academic_years(id) ON DELETE SET NULL,
    status TEXT NOT NULL DEFAULT 'active'
        CHECK (status IN ('active', 'on_hold', 'blocked', 'final_review_submitted', 'completed', 'discontinued')),
    mentor_signed_off_at TEXT,
    mentor_signed_off_by TEXT REFERENCES accounts(id) ON DELETE SET NULL,
    committee_signed_off_at TEXT,
    committee_signed_off_by TEXT REFERENCES accounts(id) ON DELETE SET NULL,
    status_reason TEXT,
    cover_asset_id TEXT REFERENCES media_assets(id) ON DELETE SET NULL,
    public_url TEXT,
    created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
    deleted_at TEXT
) STRICT;

CREATE INDEX idx_projects_team ON projects(team_id, status);
CREATE INDEX idx_projects_status_year ON projects(status, academic_year_id) WHERE deleted_at IS NULL;

CREATE TABLE project_milestones (
    id TEXT PRIMARY KEY,
    project_id TEXT NOT NULL REFERENCES projects(id) ON DELETE CASCADE,
    title TEXT NOT NULL,
    description TEXT,
    sequence_order INTEGER NOT NULL CHECK (sequence_order BETWEEN 1 AND 6),
    due_date TEXT,
    status TEXT NOT NULL DEFAULT 'pending'
        CHECK (status IN ('pending', 'in_progress', 'completed')),
    completed_at TEXT,
    created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
    UNIQUE (project_id, sequence_order)
) STRICT;

CREATE TABLE project_updates (
    id TEXT PRIMARY KEY,
    project_id TEXT NOT NULL REFERENCES projects(id) ON DELETE CASCADE,
    milestone_id TEXT REFERENCES project_milestones(id) ON DELETE SET NULL,
    author_id TEXT NOT NULL REFERENCES accounts(id) ON DELETE RESTRICT,
    body TEXT NOT NULL,
    attachments_json TEXT NOT NULL DEFAULT '[]' CHECK (json_valid(attachments_json)),
    created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
    deleted_at TEXT
) STRICT;

CREATE INDEX idx_project_updates_project ON project_updates(project_id, created_at DESC);

CREATE TABLE project_reviews (
    id TEXT PRIMARY KEY,
    project_id TEXT NOT NULL REFERENCES projects(id) ON DELETE CASCADE,
    milestone_id TEXT REFERENCES project_milestones(id) ON DELETE SET NULL,
    reviewer_id TEXT NOT NULL REFERENCES accounts(id) ON DELETE RESTRICT,
    review_type TEXT NOT NULL CHECK (review_type IN ('advisory', 'checkpoint', 'final')),
    feedback TEXT NOT NULL,
    rating INTEGER CHECK (rating BETWEEN 1 AND 5),
    is_final_signoff INTEGER NOT NULL DEFAULT 0 CHECK (is_final_signoff IN (0, 1)),
    created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP
) STRICT;

CREATE INDEX idx_project_reviews_project ON project_reviews(project_id, review_type, created_at DESC);

CREATE TABLE project_change_requests (
    id TEXT PRIMARY KEY,
    project_id TEXT NOT NULL REFERENCES projects(id) ON DELETE CASCADE,
    requested_by TEXT NOT NULL REFERENCES accounts(id) ON DELETE RESTRICT,
    change_type TEXT NOT NULL CHECK (change_type IN ('scope', 'roster_add', 'roster_remove', 'roster_role')),
    target_account_id TEXT REFERENCES accounts(id) ON DELETE SET NULL,
    requested_role TEXT,
    description TEXT NOT NULL,
    justification TEXT,
    status TEXT NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'approved', 'rejected')),
    reviewed_by TEXT REFERENCES accounts(id) ON DELETE SET NULL,
    reviewed_at TEXT,
    reviewer_note TEXT,
    created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP
) STRICT;

CREATE INDEX idx_project_change_requests_pending
    ON project_change_requests(project_id, created_at) WHERE status = 'pending';

CREATE TABLE project_showcases (
    id TEXT PRIMARY KEY,
    project_id TEXT NOT NULL UNIQUE REFERENCES projects(id) ON DELETE RESTRICT,
    readme_description TEXT NOT NULL,
    github_url TEXT NOT NULL,
    demo_video_url TEXT,
    live_prototype_url TEXT,
    deck_url TEXT,
    tech_stack_json TEXT NOT NULL DEFAULT '[]' CHECK (json_valid(tech_stack_json)),
    tags_json TEXT NOT NULL DEFAULT '[]' CHECK (json_valid(tags_json)),
    contact_email TEXT NOT NULL COLLATE NOCASE,
    is_events_eligible INTEGER NOT NULL DEFAULT 0 CHECK (is_events_eligible IN (0, 1)),
    is_published INTEGER NOT NULL DEFAULT 0 CHECK (is_published IN (0, 1)),
    published_at TEXT,
    created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
    deleted_at TEXT
) STRICT;

CREATE INDEX idx_project_showcases_public
    ON project_showcases(is_events_eligible, published_at DESC)
    WHERE is_published = 1 AND deleted_at IS NULL;

CREATE TABLE events (
    id TEXT PRIMARY KEY,
    slug TEXT NOT NULL UNIQUE,
    title TEXT NOT NULL,
    short_summary TEXT NOT NULL,
    full_description TEXT NOT NULL,
    category TEXT NOT NULL
        CHECK (category IN ('Technical', 'Cultural', 'Sports', 'Academic', 'Social', 'Competitions', 'Workshops', 'Seminars', 'Other')),
    mode TEXT NOT NULL CHECK (mode IN ('Online', 'Offline', 'Hybrid')),
    organizer_id TEXT NOT NULL REFERENCES accounts(id) ON DELETE RESTRICT,
    poster_asset_id TEXT REFERENCES media_assets(id) ON DELETE SET NULL,
    status TEXT NOT NULL DEFAULT 'Draft'
        CHECK (status IN ('Draft', 'Submitted', 'UnderReview', 'ChangesRequested', 'Published', 'Ongoing', 'Completed', 'Archived', 'Rejected')),
    registration_starts_at TEXT NOT NULL,
    registration_ends_at TEXT NOT NULL,
    starts_at TEXT NOT NULL,
    ends_at TEXT NOT NULL,
    location_json TEXT NOT NULL DEFAULT '{}' CHECK (json_valid(location_json)),
    rules_json TEXT NOT NULL DEFAULT '[]' CHECK (json_valid(rules_json)),
    max_capacity INTEGER CHECK (max_capacity IS NULL OR max_capacity > 0),
    allow_audience INTEGER NOT NULL DEFAULT 1 CHECK (allow_audience IN (0, 1)),
    allow_judge_applications INTEGER NOT NULL DEFAULT 0 CHECK (allow_judge_applications IN (0, 1)),
    registration_questions_json TEXT NOT NULL DEFAULT '[]' CHECK (json_valid(registration_questions_json)),
    attendance_tracking_enabled INTEGER NOT NULL DEFAULT 1 CHECK (attendance_tracking_enabled IN (0, 1)),
    public_url TEXT,
    created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
    archived_at TEXT,
    CHECK (registration_starts_at <= registration_ends_at),
    CHECK (registration_ends_at <= ends_at),
    CHECK (starts_at < ends_at)
) STRICT;

CREATE INDEX idx_events_discovery ON events(status, starts_at, category, mode);
CREATE INDEX idx_events_organizer ON events(organizer_id, created_at DESC);

CREATE TABLE event_subtracks (
    id TEXT PRIMARY KEY,
    event_id TEXT NOT NULL REFERENCES events(id) ON DELETE CASCADE,
    title TEXT NOT NULL,
    description TEXT,
    max_participants INTEGER CHECK (max_participants IS NULL OR max_participants > 0),
    created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP
) STRICT;

CREATE TABLE event_schedule_items (
    id TEXT PRIMARY KEY,
    event_id TEXT NOT NULL REFERENCES events(id) ON DELETE CASCADE,
    title TEXT NOT NULL,
    starts_at TEXT NOT NULL,
    ends_at TEXT NOT NULL,
    description TEXT,
    speaker_or_host TEXT,
    sort_order INTEGER NOT NULL DEFAULT 0,
    CHECK (starts_at < ends_at)
) STRICT;

CREATE INDEX idx_event_schedule ON event_schedule_items(event_id, starts_at, sort_order);

CREATE TABLE event_prizes (
    id TEXT PRIMARY KEY,
    event_id TEXT NOT NULL REFERENCES events(id) ON DELETE CASCADE,
    position INTEGER NOT NULL CHECK (position > 0),
    title TEXT NOT NULL,
    reward_description TEXT,
    UNIQUE (event_id, position)
) STRICT;

CREATE TABLE event_judges (
    id TEXT PRIMARY KEY,
    event_id TEXT NOT NULL REFERENCES events(id) ON DELETE CASCADE,
    judge_account_id TEXT NOT NULL REFERENCES accounts(id) ON DELETE RESTRICT,
    designation TEXT NOT NULL,
    bio TEXT,
    portfolio_url TEXT,
    appointed_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
    UNIQUE (event_id, judge_account_id)
) STRICT;

CREATE TABLE event_registrations (
    id TEXT PRIMARY KEY,
    event_id TEXT NOT NULL REFERENCES events(id) ON DELETE CASCADE,
    account_id TEXT NOT NULL REFERENCES accounts(id) ON DELETE RESTRICT,
    participant_role TEXT NOT NULL
        CHECK (participant_role IN ('Participant', 'Judge', 'Audience', 'Organizer', 'Admin')),
    status TEXT NOT NULL DEFAULT 'Registered'
        CHECK (status IN ('Registered', 'PendingApproval', 'Waitlisted', 'Cancelled', 'Attended')),
    answers_json TEXT NOT NULL DEFAULT '{}' CHECK (json_valid(answers_json)),
    registered_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
    UNIQUE (event_id, account_id, participant_role)
) STRICT;

CREATE INDEX idx_event_registrations_event_status ON event_registrations(event_id, status);
CREATE INDEX idx_event_registrations_account ON event_registrations(account_id, registered_at DESC);

CREATE TABLE event_teams (
    event_id TEXT NOT NULL REFERENCES events(id) ON DELETE CASCADE,
    team_id TEXT NOT NULL REFERENCES teams(id) ON DELETE RESTRICT,
    registration_status TEXT NOT NULL DEFAULT 'Registered'
        CHECK (registration_status IN ('Registered', 'PendingApproval', 'Waitlisted', 'Cancelled', 'Attended')),
    registered_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
    PRIMARY KEY (event_id, team_id)
) WITHOUT ROWID, STRICT;

CREATE TABLE event_checkins (
    id TEXT PRIMARY KEY,
    event_id TEXT NOT NULL REFERENCES events(id) ON DELETE CASCADE,
    registration_id TEXT NOT NULL REFERENCES event_registrations(id) ON DELETE CASCADE,
    account_id TEXT NOT NULL REFERENCES accounts(id) ON DELETE RESTRICT,
    scanned_by TEXT NOT NULL REFERENCES accounts(id) ON DELETE RESTRICT,
    session_token_hash TEXT NOT NULL,
    checked_in_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
    UNIQUE (event_id, account_id)
) STRICT;

CREATE TABLE event_placements (
    id TEXT PRIMARY KEY,
    event_id TEXT NOT NULL REFERENCES events(id) ON DELETE RESTRICT,
    team_id TEXT NOT NULL REFERENCES teams(id) ON DELETE RESTRICT,
    position INTEGER NOT NULL CHECK (position > 0),
    score REAL,
    finalized_at TEXT NOT NULL,
    finalized_by TEXT NOT NULL REFERENCES accounts(id) ON DELETE RESTRICT,
    UNIQUE (event_id, team_id),
    UNIQUE (event_id, position)
) STRICT;

CREATE TABLE idea_tracks (
    id TEXT PRIMARY KEY,
    name TEXT NOT NULL UNIQUE,
    slug TEXT NOT NULL UNIQUE,
    description TEXT,
    created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP
) STRICT;

CREATE TABLE idea_tech_tags (
    id TEXT PRIMARY KEY,
    name TEXT NOT NULL UNIQUE,
    slug TEXT NOT NULL UNIQUE,
    created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP
) STRICT;

CREATE TABLE ideas (
    id TEXT PRIMARY KEY,
    ticket_code TEXT NOT NULL UNIQUE,
    source_forum_post_id TEXT,
    title TEXT NOT NULL,
    tagline TEXT NOT NULL,
    description TEXT NOT NULL,
    track_id TEXT NOT NULL REFERENCES idea_tracks(id) ON DELETE RESTRICT,
    difficulty TEXT NOT NULL CHECK (difficulty IN ('EASY', 'MEDIUM', 'HARD')),
    status TEXT NOT NULL DEFAULT 'OPEN' CHECK (status IN ('OPEN', 'IN_PROGRESS', 'COMPLETED')),
    target_team_size INTEGER NOT NULL CHECK (target_team_size > 0),
    owner_id TEXT NOT NULL REFERENCES accounts(id) ON DELETE RESTRICT,
    assigned_mentor_id TEXT REFERENCES accounts(id) ON DELETE SET NULL,
    seeking_mentor INTEGER NOT NULL DEFAULT 0 CHECK (seeking_mentor IN (0, 1)),
    github_repo_url TEXT,
    award_note TEXT,
    usage_stats TEXT,
    created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
    deleted_at TEXT
) STRICT;

CREATE UNIQUE INDEX uq_ideas_source_forum_post
    ON ideas(source_forum_post_id) WHERE source_forum_post_id IS NOT NULL;
CREATE INDEX idx_ideas_discovery ON ideas(status, track_id, seeking_mentor, created_at DESC)
    WHERE deleted_at IS NULL;

CREATE TABLE idea_tech_stack (
    idea_id TEXT NOT NULL REFERENCES ideas(id) ON DELETE CASCADE,
    tag_id TEXT NOT NULL REFERENCES idea_tech_tags(id) ON DELETE RESTRICT,
    PRIMARY KEY (idea_id, tag_id)
) WITHOUT ROWID, STRICT;

CREATE TABLE idea_team_memberships (
    id TEXT PRIMARY KEY,
    idea_id TEXT NOT NULL REFERENCES ideas(id) ON DELETE CASCADE,
    account_id TEXT NOT NULL REFERENCES accounts(id) ON DELETE RESTRICT,
    joined_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
    removed_at TEXT
) STRICT;

CREATE UNIQUE INDEX uq_idea_team_memberships_active
    ON idea_team_memberships(idea_id, account_id) WHERE removed_at IS NULL;

CREATE TABLE idea_join_requests (
    id TEXT PRIMARY KEY,
    idea_id TEXT NOT NULL REFERENCES ideas(id) ON DELETE CASCADE,
    applicant_id TEXT NOT NULL REFERENCES accounts(id) ON DELETE RESTRICT,
    message TEXT NOT NULL,
    skills TEXT,
    status TEXT NOT NULL DEFAULT 'PENDING'
        CHECK (status IN ('PENDING', 'ACCEPTED', 'DECLINED', 'WITHDRAWN')),
    decided_by TEXT REFERENCES accounts(id) ON DELETE SET NULL,
    decision_note TEXT,
    created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
    decided_at TEXT
) STRICT;

CREATE UNIQUE INDEX uq_idea_join_requests_pending
    ON idea_join_requests(idea_id, applicant_id) WHERE status = 'PENDING';

CREATE TABLE idea_mentorship_requests (
    id TEXT PRIMARY KEY,
    idea_id TEXT NOT NULL REFERENCES ideas(id) ON DELETE CASCADE,
    guidance_needed TEXT NOT NULL,
    preferred_domain TEXT,
    status TEXT NOT NULL DEFAULT 'OPEN' CHECK (status IN ('OPEN', 'CLAIMED', 'CANCELLED')),
    claimed_by TEXT REFERENCES accounts(id) ON DELETE SET NULL,
    created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
    claimed_at TEXT
) STRICT;

CREATE UNIQUE INDEX uq_idea_mentorship_open
    ON idea_mentorship_requests(idea_id) WHERE status = 'OPEN';

CREATE TABLE idea_comments (
    id TEXT PRIMARY KEY,
    idea_id TEXT NOT NULL REFERENCES ideas(id) ON DELETE CASCADE,
    author_id TEXT NOT NULL REFERENCES accounts(id) ON DELETE RESTRICT,
    parent_id TEXT REFERENCES idea_comments(id) ON DELETE CASCADE,
    content TEXT NOT NULL,
    created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
    deleted_at TEXT
) STRICT;

CREATE INDEX idx_idea_comments_idea ON idea_comments(idea_id, created_at);

CREATE TABLE idea_bookmarks (
    account_id TEXT NOT NULL REFERENCES accounts(id) ON DELETE CASCADE,
    idea_id TEXT NOT NULL REFERENCES ideas(id) ON DELETE CASCADE,
    created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
    PRIMARY KEY (account_id, idea_id)
) WITHOUT ROWID, STRICT;

CREATE TABLE forum_categories (
    id TEXT PRIMARY KEY,
    name TEXT NOT NULL,
    slug TEXT NOT NULL UNIQUE,
    description TEXT,
    icon TEXT,
    is_restricted INTEGER NOT NULL DEFAULT 0 CHECK (is_restricted IN (0, 1)),
    display_order INTEGER NOT NULL DEFAULT 0,
    created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP
) STRICT;

CREATE TABLE forum_communities (
    id TEXT PRIMARY KEY,
    name TEXT NOT NULL,
    slug TEXT NOT NULL UNIQUE,
    description TEXT NOT NULL,
    icon_url TEXT,
    banner_url TEXT,
    category TEXT,
    community_type TEXT NOT NULL DEFAULT 'public'
        CHECK (community_type IN ('public', 'private', 'project_linked', 'event_linked', 'batch_based', 'topic_based')),
    linked_project_id TEXT REFERENCES projects(id) ON DELETE SET NULL,
    linked_event_id TEXT REFERENCES events(id) ON DELETE SET NULL,
    rules TEXT,
    member_count INTEGER NOT NULL DEFAULT 0 CHECK (member_count >= 0),
    post_count INTEGER NOT NULL DEFAULT 0 CHECK (post_count >= 0),
    created_by TEXT NOT NULL REFERENCES accounts(id) ON DELETE RESTRICT,
    created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
    deleted_at TEXT
) STRICT;

CREATE TABLE forum_community_members (
    id TEXT PRIMARY KEY,
    community_id TEXT NOT NULL REFERENCES forum_communities(id) ON DELETE CASCADE,
    account_id TEXT NOT NULL REFERENCES accounts(id) ON DELETE RESTRICT,
    role TEXT NOT NULL DEFAULT 'member' CHECK (role IN ('member', 'moderator', 'admin')),
    joined_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
    UNIQUE (community_id, account_id)
) STRICT;

CREATE TABLE forum_posts (
    id TEXT PRIMARY KEY,
    post_type TEXT NOT NULL
        CHECK (post_type IN ('question', 'problem', 'doubt', 'discussion', 'idea', 'announcement', 'project_discussion', 'event_discussion')),
    title TEXT NOT NULL,
    content TEXT NOT NULL,
    author_id TEXT NOT NULL REFERENCES accounts(id) ON DELETE RESTRICT,
    category_id TEXT REFERENCES forum_categories(id) ON DELETE SET NULL,
    community_id TEXT REFERENCES forum_communities(id) ON DELETE SET NULL,
    status TEXT NOT NULL DEFAULT 'open'
        CHECK (status IN ('open', 'solved', 'closed', 'archived', 'under_review')),
    vote_score INTEGER NOT NULL DEFAULT 0,
    upvotes_count INTEGER NOT NULL DEFAULT 0 CHECK (upvotes_count >= 0),
    downvotes_count INTEGER NOT NULL DEFAULT 0 CHECK (downvotes_count >= 0),
    reply_count INTEGER NOT NULL DEFAULT 0 CHECK (reply_count >= 0),
    view_count INTEGER NOT NULL DEFAULT 0 CHECK (view_count >= 0),
    accepted_reply_id TEXT,
    linked_project_id TEXT REFERENCES projects(id) ON DELETE SET NULL,
    linked_event_id TEXT REFERENCES events(id) ON DELETE SET NULL,
    is_pinned INTEGER NOT NULL DEFAULT 0 CHECK (is_pinned IN (0, 1)),
    is_locked INTEGER NOT NULL DEFAULT 0 CHECK (is_locked IN (0, 1)),
    created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
    deleted_at TEXT
) STRICT;

CREATE INDEX idx_forum_posts_feed ON forum_posts(status, created_at DESC, vote_score DESC)
    WHERE deleted_at IS NULL;
CREATE INDEX idx_forum_posts_author ON forum_posts(author_id, created_at DESC);
CREATE INDEX idx_forum_posts_community ON forum_posts(community_id, created_at DESC);

CREATE TABLE forum_replies (
    id TEXT PRIMARY KEY,
    post_id TEXT NOT NULL REFERENCES forum_posts(id) ON DELETE CASCADE,
    parent_reply_id TEXT REFERENCES forum_replies(id) ON DELETE CASCADE,
    author_id TEXT NOT NULL REFERENCES accounts(id) ON DELETE RESTRICT,
    content TEXT NOT NULL,
    vote_score INTEGER NOT NULL DEFAULT 0,
    upvotes_count INTEGER NOT NULL DEFAULT 0 CHECK (upvotes_count >= 0),
    downvotes_count INTEGER NOT NULL DEFAULT 0 CHECK (downvotes_count >= 0),
    is_accepted_solution INTEGER NOT NULL DEFAULT 0 CHECK (is_accepted_solution IN (0, 1)),
    created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
    deleted_at TEXT
) STRICT;

CREATE INDEX idx_forum_replies_post ON forum_replies(post_id, created_at);

CREATE TABLE forum_tags (
    id TEXT PRIMARY KEY,
    name TEXT NOT NULL UNIQUE,
    slug TEXT NOT NULL UNIQUE,
    description TEXT,
    post_count INTEGER NOT NULL DEFAULT 0 CHECK (post_count >= 0),
    created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP
) STRICT;

CREATE TABLE forum_post_tags (
    post_id TEXT NOT NULL REFERENCES forum_posts(id) ON DELETE CASCADE,
    tag_id TEXT NOT NULL REFERENCES forum_tags(id) ON DELETE CASCADE,
    PRIMARY KEY (post_id, tag_id)
) WITHOUT ROWID, STRICT;

CREATE TABLE forum_votes (
    id TEXT PRIMARY KEY,
    account_id TEXT NOT NULL REFERENCES accounts(id) ON DELETE CASCADE,
    target_type TEXT NOT NULL CHECK (target_type IN ('post', 'reply')),
    target_id TEXT NOT NULL,
    value INTEGER NOT NULL CHECK (value IN (-1, 1)),
    created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
    UNIQUE (account_id, target_type, target_id)
) STRICT;

CREATE INDEX idx_forum_votes_target ON forum_votes(target_type, target_id);

CREATE TABLE forum_bookmarks (
    account_id TEXT NOT NULL REFERENCES accounts(id) ON DELETE CASCADE,
    post_id TEXT NOT NULL REFERENCES forum_posts(id) ON DELETE CASCADE,
    created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
    PRIMARY KEY (account_id, post_id)
) WITHOUT ROWID, STRICT;

CREATE TABLE forum_follows (
    id TEXT PRIMARY KEY,
    follower_id TEXT NOT NULL REFERENCES accounts(id) ON DELETE CASCADE,
    target_type TEXT NOT NULL CHECK (target_type IN ('user', 'topic', 'community')),
    target_id TEXT NOT NULL,
    created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
    UNIQUE (follower_id, target_type, target_id)
) STRICT;

CREATE TABLE forum_idea_exports (
    id TEXT PRIMARY KEY,
    post_id TEXT NOT NULL UNIQUE REFERENCES forum_posts(id) ON DELETE RESTRICT,
    idea_id TEXT NOT NULL UNIQUE REFERENCES ideas(id) ON DELETE RESTRICT,
    exported_by TEXT NOT NULL REFERENCES accounts(id) ON DELETE RESTRICT,
    created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP
) STRICT;

CREATE TABLE forum_reports (
    id TEXT PRIMARY KEY,
    reporter_id TEXT NOT NULL REFERENCES accounts(id) ON DELETE RESTRICT,
    target_type TEXT NOT NULL CHECK (target_type IN ('post', 'reply', 'user')),
    target_id TEXT NOT NULL,
    reason TEXT NOT NULL
        CHECK (reason IN ('spam', 'harassment', 'offensive_content', 'misleading_information', 'inappropriate_content', 'other')),
    notes TEXT,
    status TEXT NOT NULL DEFAULT 'pending'
        CHECK (status IN ('pending', 'under_review', 'resolved', 'dismissed')),
    reviewed_by TEXT REFERENCES accounts(id) ON DELETE SET NULL,
    resolution_notes TEXT,
    created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP
) STRICT;

CREATE INDEX idx_forum_reports_queue ON forum_reports(status, created_at);

CREATE TABLE forum_moderation_logs (
    id TEXT PRIMARY KEY,
    moderator_id TEXT NOT NULL REFERENCES accounts(id) ON DELETE RESTRICT,
    action TEXT NOT NULL,
    target_type TEXT NOT NULL CHECK (target_type IN ('post', 'reply', 'user', 'report')),
    target_id TEXT NOT NULL,
    reason TEXT NOT NULL,
    created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP
) STRICT;

CREATE TABLE scoring_policies (
    id TEXT PRIMARY KEY,
    version TEXT NOT NULL UNIQUE,
    status TEXT NOT NULL CHECK (status IN ('draft', 'active', 'archived')),
    rule_definition_json TEXT NOT NULL CHECK (json_valid(rule_definition_json)),
    effective_from TEXT NOT NULL,
    effective_to TEXT,
    created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CHECK (effective_to IS NULL OR effective_from < effective_to)
) STRICT;

CREATE UNIQUE INDEX uq_scoring_policy_active
    ON scoring_policies(status) WHERE status = 'active';

CREATE TABLE score_ledger_entries (
    id TEXT PRIMARY KEY,
    source_key TEXT NOT NULL UNIQUE,
    member_id TEXT REFERENCES accounts(id) ON DELETE RESTRICT,
    team_id TEXT REFERENCES teams(id) ON DELETE RESTRICT,
    event_id TEXT REFERENCES events(id) ON DELETE RESTRICT,
    project_id TEXT REFERENCES projects(id) ON DELETE RESTRICT,
    policy_id TEXT NOT NULL REFERENCES scoring_policies(id) ON DELETE RESTRICT,
    contribution_type TEXT NOT NULL,
    points INTEGER NOT NULL,
    occurred_at TEXT NOT NULL,
    revoked_at TEXT,
    created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CHECK ((member_id IS NOT NULL) <> (team_id IS NOT NULL))
) STRICT;

CREATE INDEX idx_score_ledger_member ON score_ledger_entries(member_id, occurred_at DESC)
    WHERE member_id IS NOT NULL AND revoked_at IS NULL;
CREATE INDEX idx_score_ledger_team ON score_ledger_entries(team_id, occurred_at DESC)
    WHERE team_id IS NOT NULL AND revoked_at IS NULL;
CREATE INDEX idx_score_ledger_event ON score_ledger_entries(event_id, occurred_at DESC);

CREATE TABLE achievements (
    id TEXT PRIMARY KEY,
    member_id TEXT REFERENCES accounts(id) ON DELETE RESTRICT,
    team_id TEXT REFERENCES teams(id) ON DELETE RESTRICT,
    event_id TEXT NOT NULL REFERENCES events(id) ON DELETE RESTRICT,
    project_id TEXT REFERENCES projects(id) ON DELETE RESTRICT,
    position INTEGER CHECK (position IS NULL OR position > 0),
    title TEXT NOT NULL,
    message TEXT NOT NULL,
    image_asset_id TEXT REFERENCES media_assets(id) ON DELETE SET NULL,
    achieved_at TEXT NOT NULL,
    published_at TEXT,
    created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CHECK ((member_id IS NOT NULL) <> (team_id IS NOT NULL))
) STRICT;

CREATE INDEX idx_achievements_published ON achievements(published_at DESC)
    WHERE published_at IS NOT NULL;

CREATE TABLE leaderboard_snapshots (
    id TEXT PRIMARY KEY,
    scope TEXT NOT NULL,
    filter_hash TEXT NOT NULL,
    filter_definition_json TEXT NOT NULL CHECK (json_valid(filter_definition_json)),
    policy_id TEXT NOT NULL REFERENCES scoring_policies(id) ON DELETE RESTRICT,
    source_watermark TEXT NOT NULL,
    generated_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
    expires_at TEXT NOT NULL,
    UNIQUE (scope, filter_hash, source_watermark)
) STRICT;

CREATE TABLE leaderboard_snapshot_entries (
    snapshot_id TEXT NOT NULL REFERENCES leaderboard_snapshots(id) ON DELETE CASCADE,
    member_id TEXT NOT NULL REFERENCES accounts(id) ON DELETE RESTRICT,
    rank INTEGER NOT NULL CHECK (rank > 0),
    achievement_score INTEGER NOT NULL CHECK (achievement_score >= 0),
    star_rating INTEGER NOT NULL CHECK (star_rating BETWEEN 0 AND 5),
    PRIMARY KEY (snapshot_id, member_id),
    UNIQUE (snapshot_id, rank, member_id)
) WITHOUT ROWID, STRICT;

CREATE INDEX idx_leaderboard_snapshot_rank
    ON leaderboard_snapshot_entries(snapshot_id, rank);

CREATE TABLE notifications (
    id TEXT PRIMARY KEY,
    recipient_id TEXT NOT NULL REFERENCES accounts(id) ON DELETE CASCADE,
    actor_id TEXT REFERENCES accounts(id) ON DELETE SET NULL,
    notification_type TEXT NOT NULL,
    entity_type TEXT,
    entity_id TEXT,
    message TEXT NOT NULL,
    payload_json TEXT NOT NULL DEFAULT '{}' CHECK (json_valid(payload_json)),
    read_at TEXT,
    created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP
) STRICT;

CREATE INDEX idx_notifications_unread
    ON notifications(recipient_id, created_at DESC) WHERE read_at IS NULL;

CREATE TABLE activity_log (
    id TEXT PRIMARY KEY,
    occurred_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
    action TEXT NOT NULL,
    category TEXT NOT NULL
        CHECK (category IN ('auth', 'profile', 'membership', 'role', 'admin', 'projects', 'events', 'ideas', 'forum', 'leaderboard', 'system')),
    severity TEXT NOT NULL DEFAULT 'info'
        CHECK (severity IN ('info', 'notice', 'warning', 'critical')),
    outcome TEXT NOT NULL CHECK (outcome IN ('success', 'failure', 'denied')),
    actor_id TEXT REFERENCES accounts(id) ON DELETE SET NULL,
    actor_type TEXT NOT NULL CHECK (actor_type IN ('account', 'system', 'anonymous')),
    actor_label TEXT,
    actor_roles_json TEXT NOT NULL DEFAULT '[]' CHECK (json_valid(actor_roles_json)),
    target_type TEXT,
    target_id TEXT,
    target_label TEXT,
    changes_json TEXT CHECK (changes_json IS NULL OR json_valid(changes_json)),
    metadata_json TEXT NOT NULL DEFAULT '{}' CHECK (json_valid(metadata_json)),
    reason TEXT,
    request_id TEXT,
    session_id TEXT REFERENCES auth_sessions(id) ON DELETE SET NULL
) STRICT;

CREATE INDEX idx_activity_log_time ON activity_log(occurred_at DESC, id DESC);
CREATE INDEX idx_activity_log_actor ON activity_log(actor_id, occurred_at DESC);
CREATE INDEX idx_activity_log_target ON activity_log(target_type, target_id, occurred_at DESC);

CREATE TRIGGER activity_log_no_update
BEFORE UPDATE ON activity_log
BEGIN
    SELECT RAISE(ABORT, 'activity_log is append-only');
END;

CREATE TRIGGER activity_log_no_delete
BEFORE DELETE ON activity_log
BEGIN
    SELECT RAISE(ABORT, 'activity_log is append-only');
END;

CREATE TABLE integration_outbox (
    id TEXT PRIMARY KEY,
    source_domain TEXT NOT NULL,
    event_type TEXT NOT NULL,
    aggregate_type TEXT NOT NULL,
    aggregate_id TEXT NOT NULL,
    idempotency_key TEXT NOT NULL UNIQUE,
    payload_json TEXT NOT NULL CHECK (json_valid(payload_json)),
    occurred_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
    published_at TEXT,
    attempt_count INTEGER NOT NULL DEFAULT 0 CHECK (attempt_count >= 0),
    last_error TEXT
) STRICT;

CREATE INDEX idx_integration_outbox_pending
    ON integration_outbox(occurred_at) WHERE published_at IS NULL;

INSERT INTO roles (id, role_key, name, description, is_assignable, precedence) VALUES
    ('role-student', 'student', 'Student', 'Default member role', 1, 100),
    ('role-organization', 'organization', 'Organization', 'Verified organization principal', 1, 200),
    ('role-mentor', 'mentor', 'Mentor', 'Approved mentor role', 1, 300),
    ('role-committee', 'committee', 'Committee', 'Project and event review role', 1, 350),
    ('role-admin', 'admin', 'Administrator', 'Platform administration role', 0, 400);

INSERT INTO permissions (permission_key, description) VALUES
    ('profile:read:self', 'Read own profile'),
    ('profile:write:self', 'Update own profile'),
    ('member:list', 'List member accounts'),
    ('member:read:any', 'Read any member account'),
    ('member:invite', 'Invite a member or organization'),
    ('member:status:write', 'Change account status'),
    ('role:grant', 'Grant assignable roles'),
    ('role:revoke', 'Revoke assignable roles'),
    ('mentor:apply', 'Apply for mentor eligibility'),
    ('mentor:review', 'Review mentor applications'),
    ('activity:read:self', 'Read own activity'),
    ('activity:read:any', 'Read all activity'),
    ('project:review', 'Review pitches and projects'),
    ('event:review', 'Review and publish events'),
    ('forum:moderate', 'Moderate forum content'),
    ('leaderboard:manage', 'Manage scoring policies and corrections');

INSERT INTO role_permissions (role_id, permission_key) VALUES
    ('role-student', 'profile:read:self'),
    ('role-student', 'profile:write:self'),
    ('role-student', 'mentor:apply'),
    ('role-student', 'activity:read:self'),
    ('role-organization', 'profile:read:self'),
    ('role-organization', 'profile:write:self'),
    ('role-organization', 'activity:read:self'),
    ('role-mentor', 'profile:read:self'),
    ('role-mentor', 'profile:write:self'),
    ('role-mentor', 'activity:read:self'),
    ('role-committee', 'profile:read:self'),
    ('role-committee', 'project:review'),
    ('role-committee', 'event:review'),
    ('role-admin', 'profile:read:self'),
    ('role-admin', 'profile:write:self'),
    ('role-admin', 'member:list'),
    ('role-admin', 'member:read:any'),
    ('role-admin', 'member:invite'),
    ('role-admin', 'member:status:write'),
    ('role-admin', 'role:grant'),
    ('role-admin', 'role:revoke'),
    ('role-admin', 'mentor:review'),
    ('role-admin', 'activity:read:self'),
    ('role-admin', 'activity:read:any'),
    ('role-admin', 'project:review'),
    ('role-admin', 'event:review'),
    ('role-admin', 'forum:moderate'),
    ('role-admin', 'leaderboard:manage');

INSERT INTO schema_migrations (version, name) VALUES (1, 'initial');

COMMIT;