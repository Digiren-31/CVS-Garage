import { ideaInput, joinInput, commentInput } from '@cvs-garage/contracts/schema';
import { newId, now, iso, ensure, authenticated, hasRole, parse, transaction, audit, outbox, notify, pagination, page, safeLike } from './core.js';

export class IdeasRepository {
  constructor(db, members) { this.db = db; this.members = members; }

  row(id) {
    const row = this.db.prepare('SELECT * FROM ideas WHERE id = ? AND deleted_at IS NULL').get(id);
    ensure(row, 404, 'NOT_FOUND', 'This idea is no longer available.');
    return row;
  }

  project(row, ctx) {
    const teamCount = this.db.prepare('SELECT COUNT(*) total FROM idea_team_memberships WHERE idea_id = ? AND removed_at IS NULL').get(row.id).total;
    const isMember = ctx && this.db.prepare('SELECT 1 FROM idea_team_memberships WHERE idea_id = ? AND account_id = ? AND removed_at IS NULL').get(row.id, ctx.id);
    const pending = ctx && this.db.prepare("SELECT 1 FROM idea_join_requests WHERE idea_id = ? AND applicant_id = ? AND status = 'PENDING'").get(row.id, ctx.id);
    return {
      id: row.id, ticketCode: row.ticket_code, title: row.title, tagline: row.tagline, description: row.description,
      track: this.db.prepare('SELECT id, name FROM idea_tracks WHERE id = ?').get(row.track_id), difficulty: row.difficulty,
      status: row.status, targetTeamSize: row.target_team_size, owner: this.members.publicMember(row.owner_id) ?? { id: row.owner_id, displayName: 'Former member', roles: [], links: {}, skills: [] },
      mentor: row.assigned_mentor_id ? this.members.publicMember(row.assigned_mentor_id) : null,
      seekingMentor: Boolean(row.seeking_mentor), teamCount,
      viewerRelation: ctx?.id === row.owner_id ? 'owner' : isMember ? 'member' : pending ? 'pending' : 'none',
      isSaved: Boolean(ctx && this.db.prepare('SELECT 1 FROM idea_bookmarks WHERE account_id = ? AND idea_id = ?').get(ctx.id, row.id)),
      techStack: this.db.prepare('SELECT t.id, t.name FROM idea_tech_stack s JOIN idea_tech_tags t ON t.id = s.tag_id WHERE s.idea_id = ?').all(row.id),
      githubRepoUrl: row.github_repo_url, awardNote: row.award_note, usageStats: row.usage_stats, createdAt: iso(row.created_at),
    };
  }

  list(query = {}, ctx = null) {
    const { limit, offset } = pagination(query);
    if (query.mentorQueue === 'true') { authenticated(ctx); ensure(hasRole(ctx, 'mentor'), 403, 'FORBIDDEN', 'The mentorship queue is available to mentors.'); }
    if (query.saved === 'true') authenticated(ctx);
    const clauses = ['i.deleted_at IS NULL', "(i.title LIKE ? ESCAPE '\\' OR i.tagline LIKE ? ESCAPE '\\')"];
    const params = [safeLike(query.q), safeLike(query.q)];
    if (query.track) { clauses.push('i.track_id = ?'); params.push(query.track); }
    if (query.status) { clauses.push('i.status = ?'); params.push(query.status); }
    if (query.saved === 'true') { clauses.push('EXISTS (SELECT 1 FROM idea_bookmarks b WHERE b.idea_id = i.id AND b.account_id = ?)'); params.push(ctx.id); }
    if (query.mentorQueue === 'true') clauses.push("i.seeking_mentor = 1 AND i.status != 'COMPLETED'");
    const where = clauses.join(' AND ');
    const order = query.sort === 'trending' ? `(SELECT COUNT(*) FROM idea_comments c WHERE c.idea_id = i.id AND c.deleted_at IS NULL) + (SELECT COUNT(*) FROM idea_join_requests j WHERE j.idea_id = i.id) DESC, i.created_at DESC` : 'i.created_at DESC, i.id DESC';
    const items = this.db.prepare(`SELECT i.* FROM ideas i WHERE ${where} ORDER BY ${order} LIMIT ? OFFSET ?`).all(...params, limit, offset).map((r) => this.project(r, ctx));
    const total = this.db.prepare(`SELECT COUNT(*) total FROM ideas i WHERE ${where}`).get(...params).total;
    const counts = this.db.prepare(`SELECT COUNT(*) AS "all", COALESCE(SUM(status = 'OPEN'), 0) AS open,
      COALESCE(SUM(status = 'IN_PROGRESS'), 0) AS inProgress, COALESCE(SUM(status = 'COMPLETED'), 0) AS completed,
      COALESCE(SUM(seeking_mentor = 1 AND status != 'COMPLETED'), 0) AS seekingMentor FROM ideas WHERE deleted_at IS NULL`).get();
    const tracks = this.db.prepare('SELECT t.id, t.name, COUNT(i.id) count FROM idea_tracks t LEFT JOIN ideas i ON i.track_id = t.id AND i.deleted_at IS NULL GROUP BY t.id ORDER BY t.name').all();
    return { ...page(items, total, limit, offset), counts, tracks, techTags: this.db.prepare('SELECT id, name FROM idea_tech_tags ORDER BY name').all() };
  }

  get(id, ctx = null) {
    const row = this.row(id);
    const result = this.project(row, ctx);
    result.members = this.db.prepare('SELECT account_id FROM idea_team_memberships WHERE idea_id = ? AND removed_at IS NULL').all(id).map((r) => this.members.publicMember(r.account_id)).filter(Boolean);
    result.comments = this.db.prepare('SELECT * FROM idea_comments WHERE idea_id = ? AND deleted_at IS NULL ORDER BY created_at LIMIT 100').all(id).map((r) => ({ id: r.id, content: r.content, parentId: r.parent_id, author: this.members.publicMember(r.author_id) ?? { displayName: 'Former member' }, createdAt: iso(r.created_at) }));
    result.joinRequests = ctx?.id === row.owner_id ? this.db.prepare("SELECT * FROM idea_join_requests WHERE idea_id = ? AND status = 'PENDING' ORDER BY created_at LIMIT 50").all(id).map((r) => ({ id: r.id, applicant: this.members.publicMember(r.applicant_id), message: r.message, skills: r.skills, status: r.status })).filter((r) => r.applicant) : [];
    const request = this.db.prepare("SELECT * FROM idea_mentorship_requests WHERE idea_id = ? AND status = 'OPEN' LIMIT 1").get(id);
    result.mentorshipRequest = request ? { id: request.id, guidanceNeeded: request.guidance_needed, status: request.status } : null;
    return result;
  }

  create(body, ctx, sourceForumPostId = null) {
    authenticated(ctx);
    ensure(hasRole(ctx, 'student', 'mentor'), 403, 'FORBIDDEN', 'Ideas are submitted by students and mentors.');
    const data = parse(ideaInput, body);
    return transaction(this.db, () => {
      ensure(this.db.prepare('SELECT 1 FROM idea_tracks WHERE id = ?').get(data.trackId), 422, 'INVALID_TRACK', 'Choose an available track.');
      for (const id of data.techTagIds) ensure(this.db.prepare('SELECT 1 FROM idea_tech_tags WHERE id = ?').get(id), 422, 'INVALID_TAG', 'Choose an available technology.');
      const id = newId();
      const next = this.db.prepare('SELECT COUNT(*) total FROM ideas').get().total + 101;
      this.db.prepare(`INSERT INTO ideas (id, ticket_code, source_forum_post_id, title, tagline, description, track_id, difficulty, target_team_size, owner_id, seeking_mentor, github_repo_url, created_at, updated_at)
        VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`).run(id, `IDEA-${next}`, sourceForumPostId, data.title, data.tagline, data.description, data.trackId, data.difficulty, data.targetTeamSize, ctx.id, Number(data.seekingMentor), data.githubRepoUrl || null, now(), now());
      this.db.prepare('INSERT INTO idea_team_memberships (id, idea_id, account_id, joined_at) VALUES (?, ?, ?, ?)').run(newId(), id, ctx.id, now());
      for (const tag of new Set(data.techTagIds)) this.db.prepare('INSERT INTO idea_tech_stack (idea_id, tag_id) VALUES (?, ?)').run(id, tag);
      if (data.seekingMentor) this.db.prepare('INSERT INTO idea_mentorship_requests (id, idea_id, guidance_needed, created_at) VALUES (?, ?, ?, ?)').run(newId(), id, `Guidance on ${data.title}`, now());
      audit(this.db, ctx, 'ideas', 'idea.created', id);
      outbox(this.db, 'ideas', 'idea.created', id, { ideaId: id });
      return this.get(id, ctx);
    });
  }

  save(id, saved, ctx) {
    authenticated(ctx); this.row(id);
    transaction(this.db, () => {
      if (saved) this.db.prepare('INSERT INTO idea_bookmarks (account_id, idea_id, created_at) VALUES (?, ?, ?) ON CONFLICT DO NOTHING').run(ctx.id, id, now());
      else this.db.prepare('DELETE FROM idea_bookmarks WHERE account_id = ? AND idea_id = ?').run(ctx.id, id);
      audit(this.db, ctx, 'ideas', saved ? 'idea.saved' : 'idea.unsaved', id);
    });
    return { isSaved: saved };
  }

  join(id, body, ctx) {
    authenticated(ctx); const data = parse(joinInput, body);
    return transaction(this.db, () => {
      const row = this.row(id); const idea = this.project(row, ctx);
      ensure(row.status === 'OPEN', 409, 'IDEA_NOT_OPEN', 'This idea is no longer accepting teammates.');
      ensure(idea.viewerRelation === 'none', 409, 'ALREADY_CONNECTED', 'You already own, joined or requested to join this idea.');
      ensure(idea.teamCount < row.target_team_size, 409, 'TEAM_FULL', 'This team is full.');
      const requestId = newId();
      this.db.prepare('INSERT INTO idea_join_requests (id, idea_id, applicant_id, message, skills, created_at) VALUES (?, ?, ?, ?, ?, ?)').run(requestId, id, ctx.id, data.message, data.skills, now());
      audit(this.db, ctx, 'ideas', 'idea.join_requested', id);
      notify(this.db, ctx, row.owner_id, `${ctx.member.displayName} would like to join ${row.title}.`, 'ideas', id);
      return { id: requestId, status: 'PENDING' };
    });
  }

  decideJoin(id, body, ctx) {
    authenticated(ctx); ensure(['accept', 'decline'].includes(body.action), 422, 'INVALID_ACTION', 'Choose accept or decline.');
    return transaction(this.db, () => {
      const request = this.db.prepare('SELECT * FROM idea_join_requests WHERE id = ?').get(id);
      ensure(request, 404, 'NOT_FOUND', 'Join request not found.');
      const idea = this.row(request.idea_id);
      ensure(idea.owner_id === ctx.id, 403, 'FORBIDDEN', 'Only the idea owner can decide a join request.');
      ensure(request.status === 'PENDING', 409, 'ALREADY_DECIDED', 'This request has already been decided.');
      if (body.action === 'accept') {
        ensure(idea.status === 'OPEN' && this.project(idea, ctx).teamCount < idea.target_team_size, 409, 'TEAM_UNAVAILABLE', 'This team is full or no longer open.');
        ensure(this.members.publicMember(request.applicant_id), 409, 'MEMBER_UNAVAILABLE', 'This member is no longer active.');
        this.db.prepare('INSERT INTO idea_team_memberships (id, idea_id, account_id, joined_at) VALUES (?, ?, ?, ?)').run(newId(), idea.id, request.applicant_id, now());
      }
      this.db.prepare('UPDATE idea_join_requests SET status = ?, decided_by = ?, decided_at = ? WHERE id = ?').run(body.action === 'accept' ? 'ACCEPTED' : 'DECLINED', ctx.id, now(), id);
      audit(this.db, ctx, 'ideas', `idea.join_${body.action}ed`, idea.id);
      notify(this.db, ctx, request.applicant_id, `Your request to join ${idea.title} was ${body.action === 'accept' ? 'accepted' : 'declined'}.`, 'ideas', idea.id);
      return { updated: true };
    });
  }

  requestMentor(id, body, ctx) {
    authenticated(ctx);
    ensure(typeof body.guidanceNeeded === 'string' && body.guidanceNeeded.trim().length >= 10 && body.guidanceNeeded.length <= 2000, 422, 'VALIDATION_ERROR', 'Describe the guidance you need in 10–2,000 characters.');
    return transaction(this.db, () => {
      const row = this.row(id); const idea = this.project(row, ctx);
      ensure(['owner', 'member'].includes(idea.viewerRelation), 403, 'FORBIDDEN', 'Only the team can request a mentor.');
      ensure(row.status !== 'COMPLETED' && !row.assigned_mentor_id && !row.seeking_mentor, 409, 'MENTOR_REQUEST_EXISTS', 'A mentor is already assigned or has been requested.');
      const requestId = newId();
      this.db.prepare('INSERT INTO idea_mentorship_requests (id, idea_id, guidance_needed, created_at) VALUES (?, ?, ?, ?)').run(requestId, id, body.guidanceNeeded.trim(), now());
      this.db.prepare('UPDATE ideas SET seeking_mentor = 1, updated_at = ? WHERE id = ?').run(now(), id);
      audit(this.db, ctx, 'ideas', 'idea.mentor_requested', id);
      return { id: requestId };
    });
  }

  claim(id, ctx) {
    authenticated(ctx); ensure(hasRole(ctx, 'mentor'), 403, 'FORBIDDEN', 'Only an active mentor can claim a request.');
    return transaction(this.db, () => {
      const request = this.db.prepare("SELECT * FROM idea_mentorship_requests WHERE id = ? AND status = 'OPEN'").get(id);
      ensure(request, 409, 'REQUEST_UNAVAILABLE', 'This request is no longer open.');
      const idea = this.row(request.idea_id);
      ensure(!idea.assigned_mentor_id && idea.status !== 'COMPLETED' && idea.owner_id !== ctx.id, 409, 'MENTOR_UNAVAILABLE', 'This idea cannot be assigned to you.');
      this.db.prepare("UPDATE idea_mentorship_requests SET status = 'CLAIMED', claimed_by = ?, claimed_at = ? WHERE id = ?").run(ctx.id, now(), id);
      this.db.prepare('UPDATE ideas SET assigned_mentor_id = ?, seeking_mentor = 0, updated_at = ? WHERE id = ?').run(ctx.id, now(), idea.id);
      audit(this.db, ctx, 'ideas', 'idea.mentor_assigned', idea.id);
      notify(this.db, ctx, idea.owner_id, `${ctx.member.displayName} is now mentoring ${idea.title}.`, 'ideas', idea.id);
      return { updated: true };
    });
  }

  stepDown(id, ctx) {
    authenticated(ctx);
    return transaction(this.db, () => {
      const idea = this.row(id);
      ensure(idea.assigned_mentor_id === ctx.id, 403, 'FORBIDDEN', 'Only the assigned mentor can step down.');
      ensure(idea.status !== 'COMPLETED', 409, 'COMPLETED', 'Completed ideas are archived.');
      this.db.prepare("UPDATE idea_mentorship_requests SET status = 'CANCELLED' WHERE idea_id = ? AND status = 'CLAIMED'").run(id);
      this.db.prepare('UPDATE ideas SET assigned_mentor_id = NULL, seeking_mentor = 1, updated_at = ? WHERE id = ?').run(now(), id);
      this.db.prepare('INSERT INTO idea_mentorship_requests (id, idea_id, guidance_needed, created_at) VALUES (?, ?, ?, ?)').run(newId(), id, `Continuing guidance for ${idea.title}`, now());
      audit(this.db, ctx, 'ideas', 'idea.mentor_stepped_down', id);
      notify(this.db, ctx, idea.owner_id, `${idea.title} is looking for a new mentor.`, 'ideas', id);
      return { updated: true };
    });
  }

  setStatus(id, body, ctx) {
    authenticated(ctx); ensure(['IN_PROGRESS', 'COMPLETED'].includes(body.status), 422, 'INVALID_STATUS', 'Choose in progress or completed.');
    return transaction(this.db, () => {
      const idea = this.row(id);
      ensure(idea.owner_id === ctx.id || (idea.assigned_mentor_id === ctx.id && hasRole(ctx, 'mentor')), 403, 'FORBIDDEN', 'Only the owner or assigned mentor can update the idea.');
      ensure(idea.status !== 'COMPLETED', 409, 'COMPLETED', 'Completed ideas are archived.');
      this.db.prepare('UPDATE ideas SET status = ?, seeking_mentor = CASE WHEN ? = \'COMPLETED\' THEN 0 ELSE seeking_mentor END, updated_at = ? WHERE id = ?').run(body.status, body.status, now(), id);
      if (body.status === 'COMPLETED') this.db.prepare("UPDATE idea_mentorship_requests SET status = 'CANCELLED' WHERE idea_id = ? AND status = 'OPEN'").run(id);
      audit(this.db, ctx, 'ideas', 'idea.status_changed', id, { status: body.status });
      outbox(this.db, 'ideas', 'idea.status_changed', id, { status: body.status });
      return this.get(id, ctx);
    });
  }

  comment(id, body, ctx) {
    authenticated(ctx); const data = parse(commentInput, body);
    return transaction(this.db, () => {
      const idea = this.row(id);
      if (data.parentId) {
        const parent = this.db.prepare('SELECT * FROM idea_comments WHERE id = ? AND idea_id = ? AND deleted_at IS NULL').get(data.parentId, id);
        ensure(parent && !parent.parent_id, 422, 'COMMENT_DEPTH', 'Replies can be one level deep and must belong to this idea.');
      }
      const commentId = newId();
      this.db.prepare('INSERT INTO idea_comments (id, idea_id, author_id, parent_id, content, created_at, updated_at) VALUES (?, ?, ?, ?, ?, ?, ?)').run(commentId, id, ctx.id, data.parentId ?? null, data.content, now(), now());
      audit(this.db, ctx, 'ideas', 'idea.commented', id);
      notify(this.db, ctx, idea.owner_id, `${ctx.member.displayName} commented on ${idea.title}.`, 'ideas', id);
      return { id: commentId };
    });
  }

  createFromForum(post, body, ctx) {
    const track = body.trackId ?? this.db.prepare('SELECT id FROM idea_tracks ORDER BY name LIMIT 1').get()?.id;
    return this.create({ title: post.title.slice(0, 120), tagline: post.content.slice(0, 200), description: post.content, trackId: track, difficulty: 'MEDIUM', targetTeamSize: 4, techTagIds: [], seekingMentor: true }, ctx, post.id);
  }
}
