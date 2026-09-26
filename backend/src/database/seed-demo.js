import { newId, now, transaction, audit } from '../modules/campus/core.js';

// Intentionally synthetic fixtures. Never seed a database containing real accounts.
export function seedDemo(db) {
  if (db.prepare("SELECT 1 FROM activity_log WHERE action = 'demo.seeded'").get()) return;
  if (db.prepare('SELECT COUNT(*) total FROM accounts').get().total !== 0) throw new Error('Demo fixtures require an empty, separate database.');
  const stamp = now();
  const date = (days, hours = 10) => { const d = new Date(); d.setUTCDate(d.getUTCDate() + days); d.setUTCHours(hours, 0, 0, 0); return d.toISOString(); };
  transaction(db, () => {
    for (const [id, name] of [['computing', 'Computer Science'], ['design', 'Design & Media'], ['commerce', 'Commerce'], ['electronics', 'Electronics']]) {
      db.prepare('INSERT INTO departments (id, name, slug, created_at) VALUES (?, ?, ?, ?)').run(`demo-${id}`, name, id, stamp);
    }
    const year = new Date().getUTCFullYear();
    db.prepare('INSERT INTO academic_years (id, label, starts_on, ends_on, is_current) VALUES (?, ?, ?, ?, 1)').run('demo-year', `${year}–${year + 1}`, `${year}-07-01`, `${year + 1}-06-30`);
    const people = [
      ['demo-student', 'Aarya Shah', 'computing', 'student', 'Making useful things for everyday campus life.', ['React', 'Product design', 'TypeScript']],
      ['demo-riya', 'Riya Sen', 'design', 'student', 'Designing for the spaces between people.', ['Figma', 'Research', 'Accessibility']],
      ['demo-kabir', 'Kabir Rao', 'electronics', 'student', 'Small circuits. Interesting possibilities.', ['Python', 'IoT', 'Arduino']],
      ['demo-neha', 'Neha Kapoor', 'computing', 'mentor', 'Helping thoughtful ideas find their first prototype.', ['Web development', 'Systems', 'Mentoring']],
      ['demo-omar', 'Omar Ali', 'commerce', 'student', 'Interested in community-led, sustainable businesses.', ['Strategy', 'Research', 'Storytelling']],
      ['demo-mira', 'Mira Das', 'design', 'mentor', 'Design research, inclusive interfaces, good questions.', ['Design', 'Accessibility', 'Research']],
      ['demo-club', 'The Garage Collective', 'computing', 'organization', 'Student-led workshops, open studios and good company.', ['Community', 'Events']],
      ['demo-admin', 'Campus coordinator', 'commerce', 'admin', 'Supporting the campus community.', ['Coordination']],
    ];
    for (const [id, name, dept, role, headline, skills] of people) {
      db.prepare("INSERT INTO accounts (id, email, email_verified_at, status, principal_type, created_at, updated_at) VALUES (?, ?, ?, 'active', ?, ?, ?)")
        .run(id, `${id}@example.invalid`, stamp, role === 'organization' ? 'organization' : 'person', date(-140), stamp);
      db.prepare('INSERT INTO member_profiles (account_id, full_name, display_name, headline, bio, department_id, academic_year_id, enrollment_year, program, skills_json, created_at, updated_at) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)')
        .run(id, name, name, headline, 'This is a fictional profile in the CVS Garage local demo. No real student information is used.', `demo-${dept}`, 'demo-year', year - 1, 'Undergraduate', JSON.stringify(skills), stamp, stamp);
      db.prepare("INSERT INTO account_roles (id, account_id, role_id, grant_reason, granted_at) VALUES (?, ?, ?, 'seed', ?)").run(newId(), id, `role-${role}`, stamp);
      if (role === 'mentor') db.prepare("INSERT INTO account_roles (id, account_id, role_id, grant_reason, granted_at) VALUES (?, ?, 'role-student', 'seed', ?)").run(newId(), id, stamp);
    }
    const projects = [
      ['demo-campus-map', 'The accessible campus map', 'A step-free guide to campus, made with the people who use it. Real routes, quieter spaces and fewer wrong turns.', 'Accessibility', 'Web', 'demo-student', 'active'],
      ['demo-repair', 'Repair, don’t replace', 'A peer-to-peer repair directory giving everyday objects a longer life.', 'Sustainability', 'Community', 'demo-riya', 'completed'],
      ['demo-air', 'A breath of fresh data', 'Low-cost air quality sensors that make our shared environment a little more visible.', 'IoT', 'Hardware', 'demo-kabir', 'completed'],
      ['demo-library', 'The living library', 'An open collection of student-made reading guides, with a focus on finding your own way into a subject.', 'Education', 'Web', 'demo-omar', 'completed'],
      ['demo-canteen', 'Less food, less waste', 'Understanding canteen demand through simple, privacy-conscious daily counts.', 'Sustainability', 'Data', 'demo-student', 'active'],
    ];
    for (const [id, title, description, category, domain, owner, status] of projects) {
      const teamId = `${id}-team`;
      db.prepare('INSERT INTO teams (id, name, slug, created_by, created_at, updated_at) VALUES (?, ?, ?, ?, ?, ?)').run(teamId, title, teamId, owner, stamp, stamp);
      db.prepare("INSERT INTO team_memberships (id, team_id, account_id, role, joined_at) VALUES (?, ?, ?, 'lead', ?)").run(newId(), teamId, owner, stamp);
      if (owner !== 'demo-riya') db.prepare("INSERT INTO team_memberships (id, team_id, account_id, role, joined_at) VALUES (?, ?, 'demo-riya', 'member', ?)").run(newId(), teamId, stamp);
      db.prepare("INSERT INTO team_memberships (id, team_id, account_id, role, joined_at) VALUES (?, ?, 'demo-neha', 'mentor', ?)").run(newId(), teamId, stamp);
      db.prepare('INSERT INTO projects (id, team_id, slug, title, category, domain, description, academic_year_id, status, created_at, updated_at) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)').run(id, teamId, id, title, category, domain, description, 'demo-year', status, date(-20), date(-1));
      ['Discovery & scope', 'Research & design', 'First prototype', 'Build & iterate', 'Testing & feedback', 'Final presentation'].forEach((title, i) => {
        db.prepare('INSERT INTO project_milestones (id, project_id, title, sequence_order, due_date, status, created_at, updated_at) VALUES (?, ?, ?, ?, ?, ?, ?, ?)').run(`${id}-m${i + 1}`, id, title, i + 1, date(i * 7 + 2).slice(0, 10), status === 'completed' || i < 2 ? 'completed' : i === 2 ? 'in_progress' : 'pending', stamp, stamp);
      });
      if (status === 'completed') db.prepare('INSERT INTO project_showcases (id, project_id, readme_description, github_url, tech_stack_json, contact_email, is_events_eligible, is_published, published_at, created_at, updated_at) VALUES (?, ?, ?, ?, ?, ?, 1, 1, ?, ?, ?)')
        .run(`${id}-showcase`, id, description, 'https://github.com/topics/student-project', JSON.stringify(domain === 'Hardware' ? ['Python', 'ESP32', 'MQTT'] : ['React', 'TypeScript', 'SQLite']), 'showcase@example.invalid', stamp, stamp, stamp);
      else db.prepare('INSERT INTO project_updates (id, project_id, author_id, body, created_at, updated_at) VALUES (?, ?, ?, ?, ?, ?)').run(newId(), id, owner, 'Discovery is complete. We have collected feedback from the first walkthrough and are now testing a smaller prototype with the team.', date(-1), date(-1));
    }
    const events = [
      ['demo-build-night', 'Build night, together.', 'Bring a half-finished idea. Leave with a little more progress.', 'Workshops', 'Offline', 4, 'Design studio · Block B', 60],
      ['demo-open-mic', 'A mic. A moment. Your story.', 'Poetry, music and stories from across campus. First-timers very welcome.', 'Cultural', 'Offline', 7, 'The amphitheatre', 180],
      ['demo-hacksprint', 'HackSprint 2026', 'Two days to explore a real problem, find your people and make something useful.', 'Technical', 'Hybrid', 12, 'Innovation lab', 120],
      ['demo-design', 'Designing for everyone', 'An open conversation about accessible products and the assumptions we bring to them.', 'Seminars', 'Online', 9, 'Microsoft Teams', 80],
      ['demo-showcase', 'Small ideas, real impact', 'A look back at the projects shaped by this semester’s student teams.', 'Academic', 'Offline', -8, 'The commons', 100],
    ];
    for (const [id, title, summary, category, mode, days, venue, capacity] of events) {
      const completed = days < 0;
      db.prepare(`INSERT INTO events (id, slug, title, short_summary, full_description, category, mode, organizer_id, status, registration_starts_at, registration_ends_at, starts_at, ends_at, location_json, rules_json, max_capacity, allow_audience, allow_judge_applications, created_at, updated_at)
        VALUES (?, ?, ?, ?, ?, ?, ?, 'demo-club', ?, ?, ?, ?, ?, ?, ?, ?, 1, ?, ?, ?)`).run(id, id, title, summary, `${summary}\n\nAn easy-going space to learn from each other, ask questions and try something new. You don't need a finished project or previous experience. Bring your curiosity; we'll make room for it.`, category, mode, completed ? 'Completed' : 'Published', date(-30), date(days, 8), date(days, 10), date(days, 16), JSON.stringify(mode === 'Online' ? { platformName: venue, meetingUrl: 'https://teams.microsoft.com/' } : { venue, roomOrHall: 'Ground floor' }), JSON.stringify(['Be thoughtful and respectful of everyone in the room.', 'All experience levels are welcome.', 'Please cancel if your plans change, so someone else can join.']), capacity, Number(category === 'Technical'), stamp, stamp);
      db.prepare('INSERT INTO event_schedule_items (id, event_id, title, starts_at, ends_at, speaker_or_host) VALUES (?, ?, ?, ?, ?, ?)').run(newId(), id, 'Welcome & getting to know the room', date(days, 10), date(days, 11), 'The Garage Collective');
      db.prepare('INSERT INTO event_schedule_items (id, event_id, title, starts_at, ends_at, speaker_or_host) VALUES (?, ?, ?, ?, ?, ?)').run(newId(), id, 'Make, share & reflect', date(days, 11), date(days, 16), 'Campus community');
      ['demo-riya', 'demo-kabir', 'demo-omar'].forEach((memberId) => db.prepare('INSERT INTO event_registrations (id, event_id, account_id, participant_role, status, registered_at, updated_at) VALUES (?, ?, ?, ?, ?, ?, ?)').run(newId(), id, memberId, 'Participant', completed ? 'Attended' : 'Registered', stamp, stamp));
    }
    db.prepare("INSERT INTO event_prizes (id, event_id, position, title, reward_description) VALUES (?, 'demo-hacksprint', 1, 'Thoughtful impact', 'Recognition for a useful, considered solution.')").run(newId());
    for (const [id, name] of [['campus', 'Campus life'], ['climate', 'Climate & community'], ['learning', 'Learning'], ['creative', 'Creative tools']]) db.prepare('INSERT INTO idea_tracks (id, name, slug) VALUES (?, ?, ?)').run(`demo-track-${id}`, name, id);
    for (const tag of ['React', 'Python', 'Figma', 'Arduino', 'TypeScript', 'Open data']) db.prepare('INSERT INTO idea_tech_tags (id, name, slug) VALUES (?, ?, ?)').run(`demo-tech-${tag.toLowerCase().replaceAll(' ', '-')}`, tag, tag.toLowerCase().replaceAll(' ', '-'));
    const ideas = [
      ['demo-swap', 'The campus swap shelf', 'A second life for the things you no longer need.', 'campus', 'EASY', 'demo-riya', true, 'OPEN', ['React', 'Figma']],
      ['demo-quiet', 'Find your quiet corner', 'Help students discover calmer places to study, rest or just be.', 'campus', 'MEDIUM', 'demo-student', false, 'OPEN', ['TypeScript', 'Open data']],
      ['demo-water', 'Every drop counts', 'A friendly way to spot water waste before it becomes a bigger problem.', 'climate', 'HARD', 'demo-kabir', true, 'OPEN', ['Arduino', 'Python']],
      ['demo-notes', 'Notes worth sharing', 'Turn good lecture notes into a useful, accessible learning resource.', 'learning', 'EASY', 'demo-omar', true, 'OPEN', ['React', 'Figma']],
      ['demo-zine', 'A campus in 100 stories', 'An independent digital zine made from the little things we notice.', 'creative', 'MEDIUM', 'demo-mira', false, 'IN_PROGRESS', ['Figma', 'TypeScript']],
      ['demo-read', 'Reading, without barriers', 'Simple reading tools that let more people into the conversation.', 'learning', 'MEDIUM', 'demo-neha', false, 'COMPLETED', ['React', 'TypeScript']],
    ];
    ideas.forEach(([id, title, tagline, track, difficulty, owner, seeking, status, tags], i) => {
      db.prepare(`INSERT INTO ideas (id, ticket_code, title, tagline, description, track_id, difficulty, status, target_team_size, owner_id, seeking_mentor, usage_stats, created_at, updated_at)
        VALUES (?, ?, ?, ?, ?, ?, ?, ?, 4, ?, ?, ?, ?, ?)`).run(id, `IDEA-${101 + i}`, title, tagline, `${tagline}\n\nWe’re looking for a small team who care about the problem, not just the technology. Start by talking to a few people on campus, test a simple version and let their feedback shape what comes next.\n\nA designer, someone who enjoys building, and a fresh perspective would be a lovely start.`, `demo-track-${track}`, difficulty, status, owner, Number(seeking), status === 'COMPLETED' ? 'A working prototype, shared with the campus community.' : null, date(-i - 1), stamp);
      db.prepare('INSERT INTO idea_team_memberships (id, idea_id, account_id, joined_at) VALUES (?, ?, ?, ?)').run(newId(), id, owner, stamp);
      for (const tag of tags) db.prepare('INSERT INTO idea_tech_stack (idea_id, tag_id) VALUES (?, ?)').run(id, `demo-tech-${tag.toLowerCase().replaceAll(' ', '-')}`);
      if (seeking) db.prepare('INSERT INTO idea_mentorship_requests (id, idea_id, guidance_needed, created_at) VALUES (?, ?, ?, ?)').run(newId(), id, 'We would appreciate guidance on scope, research and a realistic first prototype.', stamp);
    });
    db.prepare("INSERT INTO forum_categories (id, name, slug, display_order) VALUES ('demo-general', 'Around campus', 'around-campus', 1), ('demo-help', 'Questions & help', 'questions-help', 2), ('demo-making', 'Making things', 'making-things', 3)").run();
    for (const [id, name, description] of [['makers', 'The makers’ room', 'Share what you’re building, and what you’re learning.'], ['designers', 'Design, in practice', 'Thoughtful interfaces, useful feedback, fresh perspectives.'], ['campus', 'Campus commons', 'The everyday conversations that bring us together.']]) db.prepare("INSERT INTO forum_communities (id, name, slug, description, created_by, created_at, updated_at) VALUES (?, ?, ?, ?, 'demo-club', ?, ?)").run(`demo-community-${id}`, name, id, description, stamp, stamp);
    const posts = [
      ['demo-first-project', 'What do you wish you knew before your first project?', 'It’s easy to get caught up in choosing the perfect stack. What actually made the biggest difference when you started building with a team? I’d love to collect a few honest lessons for first-years.', 'discussion', 'demo-neha', 'demo-general', 'makers'],
      ['demo-accessible', 'How do we test a campus map for accessibility?', 'We’re prototyping step-free routes and would really value advice from people who navigate campus differently. Beyond automated checks, what should we test with real users?', 'question', 'demo-student', 'demo-help', 'designers'],
      ['demo-open-data', 'Could our campus have an open data noticeboard?', 'Imagine a small public board of campus sustainability data: energy use, water consumption and things we can improve together. No personal data, just shared context. Is anyone interested in exploring this?', 'idea', 'demo-kabir', 'demo-making', 'campus'],
      ['demo-weekend', 'A small win from this week', 'Our first prototype worked with keyboard navigation from end to end. It’s a small thing, but building access in from the beginning felt good. What was your small win?', 'discussion', 'demo-riya', 'demo-general', 'makers'],
    ];
    posts.forEach(([id, title, content, type, author, category, community], index) => {
      db.prepare('INSERT INTO forum_posts (id, post_type, title, content, author_id, category_id, community_id, vote_score, upvotes_count, created_at, updated_at) VALUES (?, ?, ?, ?, ?, ?, ?, 1, 1, ?, ?)').run(id, type, title, content, author, category, `demo-community-${community}`, date(-index - 1), stamp);
      db.prepare("INSERT INTO forum_votes (id, account_id, target_type, target_id, value, created_at, updated_at) VALUES (?, ?, 'post', ?, 1, ?, ?)").run(newId(), author, id, stamp, stamp);
    });
    db.prepare("INSERT INTO forum_replies (id, post_id, author_id, content, created_at, updated_at) VALUES (?, 'demo-first-project', 'demo-omar', ?, ?, ?)").run('demo-first-reply', 'Start with a smaller problem than you think. A working thing that helps five people is a better first milestone than a pitch that promises to help everyone.', date(-1), stamp);
    db.prepare("UPDATE forum_posts SET reply_count = 1 WHERE id = 'demo-first-project'").run();
    db.prepare('UPDATE forum_communities SET post_count = (SELECT COUNT(*) FROM forum_posts WHERE community_id = forum_communities.id)').run();
    db.prepare("INSERT INTO scoring_policies (id, version, status, rule_definition_json, effective_from) VALUES ('demo-policy', 'demo-2026.1', 'draft', ?, ?)").run(JSON.stringify({ fixture: true, note: 'Synthetic display scores only. No production scoring policy is approved.' }), stamp);
    db.prepare("INSERT INTO leaderboard_snapshots (id, scope, filter_hash, filter_definition_json, policy_id, source_watermark, generated_at, expires_at) VALUES ('demo-snapshot', 'all-time', 'demo', '{}', 'demo-policy', 'demo-v1', ?, ?)").run(stamp, date(365));
    [['demo-riya', 840, 5], ['demo-kabir', 760, 5], ['demo-neha', 690, 4], ['demo-student', 580, 4], ['demo-omar', 450, 3], ['demo-mira', 420, 3]].forEach(([id, score, stars], i) => {
      db.prepare("INSERT INTO leaderboard_snapshot_entries (snapshot_id, member_id, rank, achievement_score, star_rating) VALUES ('demo-snapshot', ?, ?, ?, ?)").run(id, i + 1, score, stars);
      db.prepare("INSERT INTO score_ledger_entries (id, source_key, member_id, event_id, policy_id, contribution_type, points, occurred_at) VALUES (?, ?, ?, 'demo-showcase', 'demo-policy', 'demo-fixture', ?, ?)").run(newId(), `demo-score-${id}`, id, score, stamp);
    });
    db.prepare("INSERT INTO achievements (id, team_id, event_id, project_id, position, title, message, achieved_at, published_at) VALUES (?, 'demo-repair-team', 'demo-showcase', 'demo-repair', 1, ?, ?, ?, ?)").run('demo-achievement', 'Good work deserves a little recognition.', 'Repair, don’t replace was recognised for thoughtful community impact at the campus showcase.', date(-8), stamp);
    db.prepare("INSERT INTO notifications (id, recipient_id, notification_type, message, entity_type, entity_id, created_at) VALUES (?, 'demo-student', 'welcome', ?, 'projects', 'demo-campus-map', ?)").run(newId(), 'Welcome to your demo workspace. Your campus map project is ready to explore.', stamp);
    audit(db, null, 'system', 'demo.seeded', 'demo', { synthetic: true });
  });
}
