-- ============================================================================
-- CVS Garage — Central Backend Database Schema
-- Domain Module: Forum & Discussions
-- Target Engine: PostgreSQL 14+ (Compatible with standard SQL / SQLite / MySQL)
-- ============================================================================

-- Ensure UUID generation extension if in PostgreSQL
-- CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- ----------------------------------------------------------------------------
-- 1. FORUM CATEGORIES
-- Core categorization (e.g., Technical Help, Architecture, Ideas, Announcements)
-- ----------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS forum_categories (
    id VARCHAR(36) PRIMARY KEY,
    name VARCHAR(100) NOT NULL,
    slug VARCHAR(120) NOT NULL UNIQUE,
    description TEXT,
    icon VARCHAR(50),
    is_restricted BOOLEAN DEFAULT FALSE, -- Only admins/moderators can post if true
    display_order INT DEFAULT 0,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX IF NOT EXISTS idx_forum_categories_slug ON forum_categories(slug);

-- ----------------------------------------------------------------------------
-- 2. FORUM COMMUNITIES / GROUPS
-- Specific interest groups, batch cohorts, or project/event-linked groups
-- ----------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS forum_communities (
    id VARCHAR(36) PRIMARY KEY,
    name VARCHAR(150) NOT NULL,
    slug VARCHAR(180) NOT NULL UNIQUE,
    description TEXT NOT NULL,
    icon_url TEXT,
    banner_url TEXT,
    category VARCHAR(100),
    type VARCHAR(30) NOT NULL DEFAULT 'public' 
        CHECK (type IN ('public', 'private', 'project_linked', 'event_linked', 'batch_based', 'topic_based')),
    linked_project_id VARCHAR(36), -- Reference to Project Management
    linked_event_id VARCHAR(36),   -- Reference to Event Management
    rules TEXT,
    member_count INT DEFAULT 0,
    post_count INT DEFAULT 0,
    created_by VARCHAR(36) NOT NULL, -- Reference to Member Management
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    deleted_at TIMESTAMP WITH TIME ZONE NULL
);

CREATE INDEX IF NOT EXISTS idx_forum_comm_slug ON forum_communities(slug);
CREATE INDEX IF NOT EXISTS idx_forum_comm_proj ON forum_communities(linked_project_id) WHERE linked_project_id IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_forum_comm_event ON forum_communities(linked_event_id) WHERE linked_event_id IS NOT NULL;

-- ----------------------------------------------------------------------------
-- 3. COMMUNITY MEMBERSHIPS & MODERATORS
-- ----------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS forum_community_members (
    id VARCHAR(36) PRIMARY KEY,
    community_id VARCHAR(36) NOT NULL REFERENCES forum_communities(id) ON DELETE CASCADE,
    user_id VARCHAR(36) NOT NULL, -- Reference to Member Management
    role VARCHAR(20) NOT NULL DEFAULT 'member' CHECK (role IN ('member', 'moderator', 'admin')),
    joined_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT uq_community_member UNIQUE (community_id, user_id)
);

CREATE INDEX IF NOT EXISTS idx_fcm_user ON forum_community_members(user_id);

-- ----------------------------------------------------------------------------
-- 4. FORUM POSTS / DISCUSSIONS
-- Central table for all discussion topics, questions, problems, ideas
-- ----------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS forum_posts (
    id VARCHAR(36) PRIMARY KEY,
    post_type VARCHAR(30) NOT NULL 
        CHECK (post_type IN ('question', 'problem', 'doubt', 'discussion', 'idea', 'announcement', 'project_discussion', 'event_discussion')),
    title VARCHAR(255) NOT NULL,
    content TEXT NOT NULL,
    author_id VARCHAR(36) NOT NULL, -- Reference to Member Management
    category_id VARCHAR(36) REFERENCES forum_categories(id) ON DELETE SET NULL,
    community_id VARCHAR(36) REFERENCES forum_communities(id) ON DELETE SET NULL,
    status VARCHAR(20) NOT NULL DEFAULT 'open'
        CHECK (status IN ('open', 'solved', 'closed', 'archived', 'under_review')),
    vote_score INT DEFAULT 0,
    upvotes_count INT DEFAULT 0,
    downvotes_count INT DEFAULT 0,
    reply_count INT DEFAULT 0,
    view_count INT DEFAULT 0,
    accepted_reply_id VARCHAR(36) NULL, -- Set when marked as accepted solution
    linked_project_id VARCHAR(36) NULL, -- External Reference to Project Management
    linked_event_id VARCHAR(36) NULL,   -- External Reference to Event Management
    is_pinned BOOLEAN DEFAULT FALSE,
    is_locked BOOLEAN DEFAULT FALSE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    deleted_at TIMESTAMP WITH TIME ZONE NULL
);

CREATE INDEX IF NOT EXISTS idx_forum_posts_author ON forum_posts(author_id);
CREATE INDEX IF NOT EXISTS idx_forum_posts_status ON forum_posts(status);
CREATE INDEX IF NOT EXISTS idx_forum_posts_comm ON forum_posts(community_id);
CREATE INDEX IF NOT EXISTS idx_forum_posts_created ON forum_posts(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_forum_posts_score ON forum_posts(vote_score DESC);
CREATE INDEX IF NOT EXISTS idx_forum_posts_proj ON forum_posts(linked_project_id) WHERE linked_project_id IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_forum_posts_event ON forum_posts(linked_event_id) WHERE linked_event_id IS NOT NULL;

-- ----------------------------------------------------------------------------
-- 5. FORUM REPLIES / ANSWERS
-- Threaded discussion with optional parent_reply_id (up to practical depth)
-- ----------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS forum_replies (
    id VARCHAR(36) PRIMARY KEY,
    post_id VARCHAR(36) NOT NULL REFERENCES forum_posts(id) ON DELETE CASCADE,
    parent_reply_id VARCHAR(36) NULL REFERENCES forum_replies(id) ON DELETE CASCADE,
    author_id VARCHAR(36) NOT NULL, -- Reference to Member Management
    content TEXT NOT NULL,
    vote_score INT DEFAULT 0,
    upvotes_count INT DEFAULT 0,
    downvotes_count INT DEFAULT 0,
    is_accepted_solution BOOLEAN DEFAULT FALSE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    deleted_at TIMESTAMP WITH TIME ZONE NULL
);

CREATE INDEX IF NOT EXISTS idx_forum_replies_post ON forum_replies(post_id);
CREATE INDEX IF NOT EXISTS idx_forum_replies_author ON forum_replies(author_id);
CREATE INDEX IF NOT EXISTS idx_forum_replies_parent ON forum_replies(parent_reply_id);

-- Foreign key link back from post.accepted_reply_id to forum_replies
-- ALTER TABLE forum_posts ADD CONSTRAINT fk_post_accepted_reply 
-- FOREIGN KEY (accepted_reply_id) REFERENCES forum_replies(id) ON DELETE SET NULL;

-- ----------------------------------------------------------------------------
-- 6. TAGS & POST_TAGS
-- Reusable technical and topical tags
-- ----------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS forum_tags (
    id VARCHAR(36) PRIMARY KEY,
    name VARCHAR(50) NOT NULL UNIQUE,
    slug VARCHAR(60) NOT NULL UNIQUE,
    description VARCHAR(255),
    post_count INT DEFAULT 0,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX IF NOT EXISTS idx_forum_tags_slug ON forum_tags(slug);

CREATE TABLE IF NOT EXISTS forum_post_tags (
    post_id VARCHAR(36) NOT NULL REFERENCES forum_posts(id) ON DELETE CASCADE,
    tag_id VARCHAR(36) NOT NULL REFERENCES forum_tags(id) ON DELETE CASCADE,
    PRIMARY KEY (post_id, tag_id)
);

CREATE INDEX IF NOT EXISTS idx_fpt_tag ON forum_post_tags(tag_id);

-- ----------------------------------------------------------------------------
-- 7. NORMALIZED VOTES
-- Guarantees 1 vote per user per item. No duplicate votes or race conditions.
-- ----------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS forum_votes (
    id VARCHAR(36) PRIMARY KEY,
    user_id VARCHAR(36) NOT NULL, -- Reference to Member Management
    target_type VARCHAR(10) NOT NULL CHECK (target_type IN ('post', 'reply')),
    target_id VARCHAR(36) NOT NULL,
    value SMALLINT NOT NULL CHECK (value IN (-1, 1)), -- 1 = upvote, -1 = downvote
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT uq_user_vote UNIQUE (user_id, target_type, target_id)
);

CREATE INDEX IF NOT EXISTS idx_forum_votes_target ON forum_votes(target_type, target_id);

-- ----------------------------------------------------------------------------
-- 8. BOOKMARKS
-- User-specific saved discussions
-- ----------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS forum_bookmarks (
    id VARCHAR(36) PRIMARY KEY,
    user_id VARCHAR(36) NOT NULL, -- Reference to Member Management
    post_id VARCHAR(36) NOT NULL REFERENCES forum_posts(id) ON DELETE CASCADE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT uq_user_bookmark UNIQUE (user_id, post_id)
);

CREATE INDEX IF NOT EXISTS idx_forum_bm_user ON forum_bookmarks(user_id);

-- ----------------------------------------------------------------------------
-- 9. USER FOLLOWS (Members, Topics/Tags, Communities)
-- ----------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS forum_user_follows (
    id VARCHAR(36) PRIMARY KEY,
    follower_id VARCHAR(36) NOT NULL, -- Reference to Member Management
    target_type VARCHAR(20) NOT NULL CHECK (target_type IN ('user', 'topic', 'community')),
    target_id VARCHAR(36) NOT NULL,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT uq_user_follow UNIQUE (follower_id, target_type, target_id)
);

CREATE INDEX IF NOT EXISTS idx_forum_follows ON forum_user_follows(follower_id);

-- ----------------------------------------------------------------------------
-- 10. IDEA CENTRE EXPORTS (CRITICAL INTEGRATION)
-- Strictly tracks 1-to-1 export of a forum post to an Idea Centre idea.
-- Prevents duplicate exports.
-- ----------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS forum_idea_exports (
    id VARCHAR(36) PRIMARY KEY,
    post_id VARCHAR(36) NOT NULL UNIQUE REFERENCES forum_posts(id) ON DELETE CASCADE,
    idea_id VARCHAR(50) NOT NULL, -- External ID returned by Idea Centre
    exported_by VARCHAR(36) NOT NULL, -- Reference to Member Management
    status VARCHAR(30) NOT NULL DEFAULT 'created'
        CHECK (status IN ('created', 'in_review', 'in_progress', 'converted_to_project', 'completed', 'rejected')),
    idea_url TEXT NOT NULL,
    metadata JSONB NULL,
    exported_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX IF NOT EXISTS idx_idea_exports_post ON forum_idea_exports(post_id);
CREATE INDEX IF NOT EXISTS idx_idea_exports_idea ON forum_idea_exports(idea_id);

-- ----------------------------------------------------------------------------
-- 11. LEADERBOARD CONTRIBUTION EVENTS (CRITICAL INTEGRATION)
-- Normalized audit log of gamification telemetry sent to Leaderboard.
-- Deduplication index prevents double-counting points.
-- ----------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS forum_contribution_events (
    id VARCHAR(36) PRIMARY KEY,
    event_id VARCHAR(64) NOT NULL UNIQUE, -- Idempotency key (e.g. SHA256 of params)
    member_id VARCHAR(36) NOT NULL, -- Reference to Member Management
    contribution_type VARCHAR(30) NOT NULL 
        CHECK (contribution_type IN ('post', 'reply', 'accepted_answer', 'upvote_received')),
    forum_post_id VARCHAR(36) NOT NULL REFERENCES forum_posts(id) ON DELETE CASCADE,
    forum_reply_id VARCHAR(36) NULL REFERENCES forum_replies(id) ON DELETE CASCADE,
    value INT DEFAULT 1,
    sync_status VARCHAR(20) NOT NULL DEFAULT 'synced' CHECK (sync_status IN ('pending', 'synced', 'failed')),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    synced_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT uq_contrib_event UNIQUE (member_id, contribution_type, forum_post_id, forum_reply_id)
);

CREATE INDEX IF NOT EXISTS idx_contrib_member ON forum_contribution_events(member_id);

-- ----------------------------------------------------------------------------
-- 12. REPORTS & MODERATION
-- Community safety, flag reasons, resolution logs
-- ----------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS forum_reports (
    id VARCHAR(36) PRIMARY KEY,
    reporter_id VARCHAR(36) NOT NULL, -- Reference to Member Management
    target_type VARCHAR(10) NOT NULL CHECK (target_type IN ('post', 'reply', 'user')),
    target_id VARCHAR(36) NOT NULL,
    reason VARCHAR(50) NOT NULL 
        CHECK (reason IN ('spam', 'harassment', 'offensive_content', 'misleading_information', 'inappropriate_content', 'other')),
    notes TEXT,
    status VARCHAR(20) NOT NULL DEFAULT 'pending'
        CHECK (status IN ('pending', 'under_review', 'resolved', 'dismissed')),
    reviewed_by VARCHAR(36) NULL, -- Reference to Member Management (Moderator/Admin)
    resolution_notes TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX IF NOT EXISTS idx_forum_reports_status ON forum_reports(status);
CREATE INDEX IF NOT EXISTS idx_forum_reports_target ON forum_reports(target_type, target_id);

CREATE TABLE IF NOT EXISTS forum_moderation_logs (
    id VARCHAR(36) PRIMARY KEY,
    moderator_id VARCHAR(36) NOT NULL,
    action VARCHAR(50) NOT NULL, -- 'hide_post', 'delete_reply', 'warn_user', 'resolve_report'
    target_type VARCHAR(10) NOT NULL,
    target_id VARCHAR(36) NOT NULL,
    reason TEXT NOT NULL,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- ----------------------------------------------------------------------------
-- 13. NOTIFICATIONS
-- Event-driven notifications for forum activity
-- ----------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS forum_notifications (
    id VARCHAR(36) PRIMARY KEY,
    recipient_id VARCHAR(36) NOT NULL,
    actor_id VARCHAR(36) NOT NULL,
    type VARCHAR(30) NOT NULL 
        CHECK (type IN ('reply_received', 'mention', 'answer_accepted', 'followed', 'upvoted', 'report_reviewed', 'idea_exported', 'project_linked')),
    entity_type VARCHAR(20) NOT NULL, -- 'post', 'reply', 'community'
    entity_id VARCHAR(36) NOT NULL,
    message VARCHAR(255) NOT NULL,
    is_read BOOLEAN DEFAULT FALSE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX IF NOT EXISTS idx_forum_notif_user ON forum_notifications(recipient_id, is_read);
