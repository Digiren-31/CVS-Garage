-- ============================================================================
-- CVS Garage — Forum Realistic Seed Data
-- Module: Forum & Discussions
-- Populated with realistic college innovation projects, mentors & discussions
-- ============================================================================

-- 1. Forum Categories
INSERT INTO forum_categories (id, name, slug, description, icon, is_restricted, display_order) VALUES
('cat-1', 'Technical Questions', 'technical-questions', 'Ask doubts, debug stack traces, and get peer assistance', 'code', false, 1),
('cat-2', 'Architecture & System Design', 'architecture', 'Discuss high-level designs, database schemas, and microservice topologies', 'layers', false, 2),
('cat-3', 'Project Discussions', 'projects', 'Team updates, technical roadblocks, and feature brainstorming for campus projects', 'folder-git2', false, 3),
('cat-4', 'Idea Incubator', 'ideas', 'Early stage concepts ready for feedback before exporting to Idea Centre', 'lightbulb', false, 4),
('cat-5', 'Event & Hackathons', 'events', 'HackSprint 2026, team formation, mentor office hours, and judging criteria', 'calendar', false, 5),
('cat-6', 'Announcements', 'announcements', 'Official notifications from faculty, club leads, and moderators', 'megaphone', true, 6)
ON CONFLICT (id) DO NOTHING;

-- 2. Forum Tags
INSERT INTO forum_tags (id, name, slug, description, post_count) VALUES
('tag-react', 'React', 'react', 'Front-end JavaScript UI library', 12),
('tag-python', 'Python', 'python', 'Backend, scripting, and scientific computing', 18),
('tag-ai', 'AI & ML', 'ai-ml', 'Machine learning, deep learning, PyTorch, and NLP', 15),
('tag-arduino', 'IoT & Embedded', 'iot-embedded', 'ESP32, Arduino, sensors, and robotics', 9),
('tag-sysdesign', 'System Design', 'system-design', 'Scalability, microservices, caches, and database design', 8),
('tag-security', 'Cybersecurity', 'cybersecurity', 'CTFs, reverse engineering, web security, and auth', 6),
('tag-hackathon', 'Hackathon 2026', 'hackathon-2026', 'All discussions related to the upcoming HackSprint 2026', 14),
('tag-cloud', 'Cloud & DevOps', 'cloud-devops', 'Docker, Kubernetes, AWS, and CI/CD pipelines', 7)
ON CONFLICT (id) DO NOTHING;

-- 3. Communities
INSERT INTO forum_communities (id, name, slug, description, icon_url, banner_url, category, type, linked_project_id, linked_event_id, rules, member_count, post_count, created_by) VALUES
('comm-ai', 'AI & Machine Learning Guild', 'ai-ml-guild', 'For students and researchers exploring LLMs, computer vision, PyTorch, and autonomous agents.', 'brain', 'banner-ai.webp', 'Technical', 'public', NULL, NULL, '1. Share code via snippets.\n2. Attribute papers.\n3. Respect peer review.', 240, 48, 'mem-mentor-1'),
('comm-webdev', 'Full-Stack Web & Cloud', 'fullstack-web-cloud', 'Frontend engineering, distributed backend APIs, reactive architectures, and DevOps.', 'globe', 'banner-web.webp', 'Technical', 'public', NULL, NULL, '1. Constructive code reviews.\n2. No low-effort duplicate questions.', 315, 62, 'mem-student-2'),
('comm-robotics', 'Robotics & Hardware Lab', 'robotics-hardware', 'Embedded systems, PCB design, ROS2, autonomous navigation, and IoT mesh networks.', 'cpu', 'banner-robotics.webp', 'Technical', 'public', NULL, NULL, '1. Safety guidelines for lab battery testing.\n2. Link Gerber files when asking PCB reviews.', 128, 23, 'mem-mentor-2'),
('comm-project-nav', 'Smart Campus Navigation Team', 'smart-campus-nav', 'Dedicated technical community for Project #PRJ-101 (Indoor BLE beacon navigation).', 'navigation', 'banner-nav.webp', 'Projects', 'project_linked', 'PRJ-101', NULL, 'Open to core contributors and beta testers across campus.', 45, 16, 'mem-student-1'),
('comm-hack-2026', 'HackSprint 2026 Hub', 'hacksprint-2026', 'Official forum for teams participating in HackSprint 2026 36-hour hackathon.', 'zap', 'banner-hack.webp', 'Events', 'event_linked', NULL, 'EVT-2026-01', '1. Use team tags when recruiting teammates.\n2. Mentor hours announced in pinned posts.', 420, 89, 'mem-admin-1')
ON CONFLICT (id) DO NOTHING;

-- 4. Realistic Posts
INSERT INTO forum_posts (
    id, post_type, title, content, author_id, category_id, community_id, status, vote_score, upvotes_count, downvotes_count, reply_count, view_count, accepted_reply_id, linked_project_id, linked_event_id, is_pinned, created_at
) VALUES
(
    'post-1',
    'question',
    'How should we structure BLE RSSI fingerprinting for indoor campus positioning?',
    'We are building **Smart Campus Navigation** (Project #PRJ-101). When testing ESP32 BLE beacons in the CS Department corridor, we noticed multipath interference causes raw RSSI to fluctuate by ±12 dBm, which completely ruins trilateration accuracy.\n\nHas anyone implemented a Kalman filter or Particle filter on ESP32 or client-side in React Native? What is the recommended sampling window without draining mobile battery?',
    'mem-student-1',
    'cat-1',
    'comm-project-nav',
    'solved',
    34, 35, 1, 3, 420,
    'reply-1-1',
    'PRJ-101',
    NULL,
    true,
    CURRENT_TIMESTAMP - INTERVAL '2 days'
),
(
    'post-2',
    'idea',
    'Decentralized Campus Academic Credentials using Verifiable Credentials (W3C)',
    '### Problem Statement\nCurrently, requesting transcripts, club certificates, and competition awards requires visiting the admin block and waiting 5-10 business days for manual signatures.\n\n### Proposed Solution\nIssue tamper-proof W3C Verifiable Credentials cryptographically signed by the College Registrar DID. Students store them in an open-source mobile identity wallet. Employers and hackathon judges can verify authenticity instantaneously without an outbound API call to the college database.\n\n### Expected Impact\nEliminates paper forgery, reduces administrative overhead by 90%, and showcases our college as an early adopter of digital sovereignty standards.\n\n### Tech Stack\nNode.js, DIDKit, React Native, IPFS metadata resolver.',
    'mem-student-2',
    'cat-4',
    'comm-webdev',
    'open',
    58, 60, 2, 7, 780,
    NULL,
    NULL,
    NULL,
    false,
    CURRENT_TIMESTAMP - INTERVAL '1 day'
),
(
    'post-3',
    'problem',
    'Memory leak during distributed model fine-tuning with LoRA on campus GPU cluster',
    'When launching a 7B parameter LLM fine-tuning job across node 04 and node 05 with PyTorch FSDP + HuggingFace PEFT, the VRAM consumption steadily creeps up by 200MB every 100 steps until we hit CUDA Out of Memory error at step 650.\n\nGarbage collection `gc.collect()` and `torch.cuda.empty_cache()` inside the training loop did not solve it. Suspecting optimizer state retention or DataLoader pin_memory leak. Any pointers from ML lab mentors?',
    'mem-student-3',
    'cat-1',
    'comm-ai',
    'open',
    22, 23, 1, 4, 310,
    NULL,
    NULL,
    NULL,
    false,
    CURRENT_TIMESTAMP - INTERVAL '18 hours'
),
(
    'post-4',
    'announcement',
    'HackSprint 2026: Mentor Office Hours & Technical Tracks Announced!',
    'Welcome participants to HackSprint 2026! We have finalized 4 technical tracks:\n\n1. **Autonomous Campus & Green Energy**\n2. **AI-Driven Healthcare & Accessibility**\n3. **Decentralized Finance & Governance**\n4. **Open Innovation & Civic Tech**\n\nMentors will be active in this forum community during the entire 36-hour sprint. Tag questions with `#hackathon-2026` for guaranteed mentor triage within 30 minutes!',
    'mem-mentor-1',
    'cat-5',
    'comm-hack-2026',
    'open',
    89, 90, 1, 12, 1240,
    NULL,
    NULL,
    'EVT-2026-01',
    true,
    CURRENT_TIMESTAMP - INTERVAL '12 hours'
),
(
    'post-5',
    'doubt',
    'Should we use PostgreSQL Row-Level Security (RLS) or application middleware for tenant isolation?',
    'In our college clubs platform, multiple student societies need strictly isolated workspaces. While RLS enforces security right at the database layer, our team is concerned about query optimization and connection pooling limitations when using PgBouncer in transaction mode. Would love insights on real-world tradeoffs.',
    'mem-student-4',
    'cat-2',
    'comm-webdev',
    'open',
    19, 20, 1, 2, 215,
    NULL,
    NULL,
    NULL,
    false,
    CURRENT_TIMESTAMP - INTERVAL '6 hours'
)
ON CONFLICT (id) DO NOTHING;

-- 5. Post Tag Mappings
INSERT INTO forum_post_tags (post_id, tag_id) VALUES
('post-1', 'tag-arduino'),
('post-1', 'tag-react'),
('post-2', 'tag-security'),
('post-2', 'tag-sysdesign'),
('post-3', 'tag-ai'),
('post-3', 'tag-python'),
('post-4', 'tag-hackathon'),
('post-5', 'tag-sysdesign')
ON CONFLICT (post_id, tag_id) DO NOTHING;

-- 6. Forum Replies with Accepted Solution
INSERT INTO forum_replies (id, post_id, parent_reply_id, author_id, content, vote_score, upvotes_count, downvotes_count, is_accepted_solution, created_at) VALUES
(
    'reply-1-1',
    'post-1',
    NULL,
    'mem-mentor-2',
    'Great question! We faced the exact multipath issue in the Robotics lab last semester. Two critical recommendations:\n\n1. **1D Kalman Filter on RSSI:** Do not run trilateration on raw RSSI. Apply a lightweight 1D Kalman filter with process variance Q = 0.008 and measurement variance R = 4.0. This dampens momentary reflections without introducing perceptible lag.\n2. **K-Nearest Neighbors (KNN) Fingerprinting:** Traditional Euclidean trilateration fails indoors due to concrete wall reflections. Instead, pre-survey 20 reference points (grid of 2m x 2m) and store the RSSI vector. At runtime, perform weighted KNN (k=3) between measured RSSI vector and the offline radio map. We achieved 1.2m median accuracy with this approach!',
    28, 28, 0,
    true,
    CURRENT_TIMESTAMP - INTERVAL '1 day 18 hours'
),
(
    'reply-1-2',
    'post-1',
    'reply-1-1',
    'mem-student-1',
    'Thank you Dr. Arvind! We just ported your Kalman parameters to our ESP32 C++ firmware and the RSSI variance dropped from ±12 dBm down to ±2.5 dBm. Marking this as the accepted solution!',
    12, 12, 0,
    false,
    CURRENT_TIMESTAMP - INTERVAL '1 day 12 hours'
),
(
    'reply-2-1',
    'post-2',
    NULL,
    'mem-mentor-1',
    'This is a phenomenal concept and aligns directly with our college innovation incubation mandate. Please use the **"Export to Idea Centre"** button on this post so the Dean of Academic Affairs and the incubation jury can review your technical specifications for campus grant funding.',
    15, 15, 0,
    false,
    CURRENT_TIMESTAMP - INTERVAL '20 hours'
)
ON CONFLICT (id) DO NOTHING;

-- Update post-1 with accepted_reply_id
UPDATE forum_posts SET accepted_reply_id = 'reply-1-1', status = 'solved' WHERE id = 'post-1';

-- 7. Normalized Votes
INSERT INTO forum_votes (id, user_id, target_type, target_id, value) VALUES
('vote-1', 'mem-student-2', 'post', 'post-1', 1),
('vote-2', 'mem-mentor-1', 'post', 'post-1', 1),
('vote-3', 'mem-student-1', 'post', 'post-2', 1),
('vote-4', 'mem-mentor-1', 'reply', 'reply-1-1', 1)
ON CONFLICT (user_id, target_type, target_id) DO NOTHING;

-- 8. Bookmarks
INSERT INTO forum_bookmarks (id, user_id, post_id) VALUES
('bm-1', 'mem-student-1', 'post-2'),
('bm-2', 'mem-student-2', 'post-1')
ON CONFLICT (user_id, post_id) DO NOTHING;

-- 9. Follows
INSERT INTO forum_user_follows (id, follower_id, target_type, target_id) VALUES
('fol-1', 'mem-student-1', 'user', 'mem-mentor-1'),
('fol-2', 'mem-student-1', 'community', 'comm-project-nav'),
('fol-3', 'mem-student-2', 'topic', 'tag-security')
ON CONFLICT (follower_id, target_type, target_id) DO NOTHING;

-- 10. Idea Centre Export Record
INSERT INTO forum_idea_exports (id, post_id, idea_id, exported_by, status, idea_url, metadata, exported_at) VALUES
(
    'exp-1',
    'post-2',
    'IDEA-2026-88',
    'mem-student-2',
    'in_review',
    '/idea-centre/ideas/IDEA-2026-88',
    '{"juryReviewDate": "2026-10-05", "category": "EdTech & Governance", "mentorAssigned": "mem-mentor-1"}',
    CURRENT_TIMESTAMP - INTERVAL '10 hours'
)
ON CONFLICT (post_id) DO NOTHING;

-- 11. Leaderboard Contribution Events
INSERT INTO forum_contribution_events (id, event_id, member_id, contribution_type, forum_post_id, forum_reply_id, value, sync_status) VALUES
('contrib-1', 'hash-evt-post-1', 'mem-student-1', 'post', 'post-1', NULL, 1, 'synced'),
('contrib-2', 'hash-evt-ans-1', 'mem-mentor-2', 'accepted_answer', 'post-1', 'reply-1-1', 1, 'synced'),
('contrib-3', 'hash-evt-post-2', 'mem-student-2', 'post', 'post-2', NULL, 1, 'synced')
ON CONFLICT (member_id, contribution_type, forum_post_id, forum_reply_id) DO NOTHING;
