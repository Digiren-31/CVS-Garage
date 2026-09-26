import { pitchInput, decisionInput } from '@cvs-garage/contracts/schema';
import { newId, now, json, iso, ensure, authenticated, permitted, parse, transaction, audit, outbox, pagination, page, safeLike, slug } from './core.js';

export class ProjectsRepository {
  constructor(db, members) { this.db = db; this.members = members; }
  membership(project, ctx) {
    if (!ctx) return null;
    if (ctx.permissions.includes('project:review')) return 'reviewer';
    return this.db.prepare('SELECT role FROM team_memberships WHERE team_id = ? AND account_id = ? AND removed_at IS NULL').get(project.team_id, ctx.id)?.role ?? null;
  }
  row(id) {
    const row = this.db.prepare('SELECT p.*, t.name team_name, y.label academic_year FROM projects p JOIN teams t ON t.id = p.team_id LEFT JOIN academic_years y ON y.id = p.academic_year_id WHERE p.id = ? AND p.deleted_at IS NULL').get(id);
    ensure(row, 404, 'NOT_FOUND', 'Project not found.'); return row;
  }
  project(row, ctx, details = false) {
    const viewerRole = this.membership(row, ctx);
    const showcase = this.db.prepare('SELECT * FROM project_showcases WHERE project_id = ? AND is_published = 1 AND deleted_at IS NULL').get(row.id);
    ensure(viewerRole || (showcase && row.status === 'completed'), 403, 'PROJECT_PRIVATE', 'This workspace is available to its team and reviewers.');
    const result = {
      id: row.id, title: row.title, description: showcase && !viewerRole ? showcase.readme_description : row.description,
      category: row.category, domain: row.domain ?? '', status: row.status, teamName: row.team_name,
      members: this.db.prepare('SELECT account_id FROM team_memberships WHERE team_id = ? AND removed_at IS NULL').all(row.team_id).map((r) => this.members.publicMember(r.account_id)).filter(Boolean).map((m) => ({ id: m.id, displayName: m.displayName, avatarUrl: m.avatarUrl })),
      milestones: viewerRole ? this.db.prepare('SELECT id, title, sequence_order sequence, status, due_date dueDate FROM project_milestones WHERE project_id = ? ORDER BY sequence_order').all(row.id) : [],
      academicYear: row.academic_year ?? '', updatedAt: iso(row.updated_at), viewerRole,
      mentorSignedOff: Boolean(row.mentor_signed_off_at), committeeSignedOff: Boolean(row.committee_signed_off_at),
      showcase: showcase ? { description: showcase.readme_description, githubUrl: showcase.github_url, prototypeUrl: showcase.live_prototype_url, techStack: json(showcase.tech_stack_json, []), eventsEligible: Boolean(showcase.is_events_eligible) } : null,
    };
    if (details) result.updates = viewerRole ? this.db.prepare('SELECT u.*, p.display_name FROM project_updates u JOIN member_profiles p ON p.account_id = u.author_id WHERE u.project_id = ? AND u.deleted_at IS NULL ORDER BY u.created_at DESC LIMIT 50').all(row.id).map((r) => ({ id: r.id, body: r.body, author: r.display_name, createdAt: iso(r.created_at) })) : [];
    return result;
  }
  list(query = {}, ctx = null) {
    const { limit, offset } = pagination(query);
    const clauses = ['p.deleted_at IS NULL', "(p.title LIKE ? ESCAPE '\\' OR p.description LIKE ? ESCAPE '\\')"];
    const params = [safeLike(query.q), safeLike(query.q)];
    if (query.scope === 'mine') {
      authenticated(ctx); clauses.push('EXISTS (SELECT 1 FROM team_memberships tm WHERE tm.team_id = p.team_id AND tm.account_id = ? AND tm.removed_at IS NULL)'); params.push(ctx.id);
    } else if (query.scope === 'review') { permitted(ctx, 'project:review'); }
    else clauses.push("p.status = 'completed' AND EXISTS (SELECT 1 FROM project_showcases s WHERE s.project_id = p.id AND s.is_published = 1 AND s.deleted_at IS NULL)");
    if (query.status) { clauses.push('p.status = ?'); params.push(query.status); }
    const where = clauses.join(' AND ');
    const total = this.db.prepare(`SELECT COUNT(*) total FROM projects p WHERE ${where}`).get(...params).total;
    const rows = this.db.prepare(`SELECT p.id FROM projects p WHERE ${where} ORDER BY p.updated_at DESC, p.id DESC LIMIT ? OFFSET ?`).all(...params, limit, offset);
    return page(rows.map((r) => this.project(this.row(r.id), ctx)), total, limit, offset);
  }
  get(id, ctx) { return this.project(this.row(id), ctx, true); }
  pitch(row) {
    return { id: row.id, title: row.title, description: row.description, category: row.category, domain: row.domain ?? '', status: row.status,
      author: this.members.publicMember(row.submitted_by)?.displayName ?? 'Member', createdAt: iso(row.created_at), cooldownUntil: iso(row.cooldown_until),
      feedback: this.db.prepare('SELECT id, feedback, action, created_at FROM project_pitch_feedback WHERE pitch_id = ? ORDER BY created_at DESC LIMIT 30').all(row.id).map((r) => ({ id: r.id, feedback: r.feedback, action: r.action, createdAt: iso(r.created_at) })),
    };
  }
  listPitches(query, ctx) {
    authenticated(ctx); const { limit, offset } = pagination(query);
    const reviewer = ctx.permissions.includes('project:review');
    const rows = this.db.prepare('SELECT * FROM project_pitches WHERE deleted_at IS NULL AND (? = 1 OR submitted_by = ?) ORDER BY created_at DESC, id DESC LIMIT ? OFFSET ?').all(Number(reviewer), ctx.id, limit, offset);
    const total = this.db.prepare('SELECT COUNT(*) total FROM project_pitches WHERE deleted_at IS NULL AND (? = 1 OR submitted_by = ?)').get(Number(reviewer), ctx.id).total;
    return page(rows.map((r) => this.pitch(r)), total, limit, offset);
  }
  createPitch(body, ctx) {
    authenticated(ctx); const data = parse(pitchInput, body);
    return transaction(this.db, () => {
      const verified = this.db.prepare('SELECT a.email_verified_at, p.program, p.enrollment_year FROM accounts a JOIN member_profiles p ON p.account_id = a.id WHERE a.id = ?').get(ctx.id);
      ensure(ctx.roles.includes('student') && verified?.email_verified_at && verified?.program && verified?.enrollment_year, 403, 'ELIGIBILITY_REQUIRED', 'Only verified, enrolled students can submit a pitch.');
      const cooldown = this.db.prepare("SELECT cooldown_until FROM project_pitches WHERE submitted_by = ? AND status = 'rejected' AND cooldown_until > ? ORDER BY cooldown_until DESC LIMIT 1").get(ctx.id, now());
      ensure(!cooldown, 409, 'PITCH_COOLDOWN', `You can submit another pitch after ${cooldown?.cooldown_until?.slice(0, 10)}.`);
      const id = newId();
      this.db.prepare(`INSERT INTO project_pitches (id, submitted_by, title, category, domain, description, project_url, submitter_snapshot_json, created_at, updated_at) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`)
        .run(id, ctx.id, data.title, data.category, data.domain, data.description, data.projectUrl || null, JSON.stringify({ department: ctx.member.department, enrollmentStatus: 'active' }), now(), now());
      audit(this.db, ctx, 'projects', 'pitch.submitted', id);
      outbox(this.db, 'projects', 'pitch.submitted', id, { pitchId: id });
      return this.pitch(this.db.prepare('SELECT * FROM project_pitches WHERE id = ?').get(id));
    });
  }
  reviewPitch(id, body, ctx) {
    permitted(ctx, 'project:review'); const data = parse(decisionInput, body);
    return transaction(this.db, () => {
      const pitch = this.db.prepare('SELECT * FROM project_pitches WHERE id = ? AND deleted_at IS NULL').get(id);
      ensure(pitch, 404, 'NOT_FOUND', 'Pitch not found.');
      ensure(pitch.submitted_by !== ctx.id, 403, 'SELF_REVIEW', 'You cannot review your own pitch.');
      ensure(pitch.status === 'pending', 409, 'ALREADY_REVIEWED', 'Only a pending pitch can be reviewed.');
      const status = { approve: 'approved', reject: 'rejected', needs_feedback: 'needs_feedback' }[data.action];
      this.db.prepare('UPDATE project_pitches SET status = ?, cooldown_until = ?, updated_at = ? WHERE id = ?').run(status, status === 'rejected' ? new Date(Date.now() + 14 * 86400000).toISOString() : null, now(), id);
      this.db.prepare('INSERT INTO project_pitch_feedback (id, pitch_id, reviewer_id, action, feedback, created_at) VALUES (?, ?, ?, ?, ?, ?)').run(newId(), id, ctx.id, status, data.reason, now());
      let projectId = null;
      if (status === 'approved') {
        const teamId = this.members.createTeam(pitch.title, pitch.submitted_by); projectId = newId();
        const year = this.db.prepare('SELECT id FROM academic_years WHERE is_current = 1').get()?.id ?? null;
        this.db.prepare('INSERT INTO projects (id, pitch_id, team_id, slug, title, category, domain, description, academic_year_id, created_at, updated_at) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)').run(projectId, id, teamId, slug(pitch.title), pitch.title, pitch.category, pitch.domain, pitch.description, year, now(), now());
        ['Discovery & scope', 'Research & design', 'First prototype', 'Build & iterate', 'Testing & feedback', 'Final presentation'].forEach((title, index) => this.db.prepare('INSERT INTO project_milestones (id, project_id, title, sequence_order, created_at, updated_at) VALUES (?, ?, ?, ?, ?, ?)').run(newId(), projectId, title, index + 1, now(), now()));
      }
      audit(this.db, ctx, 'projects', `pitch.${status}`, id, { status }, data.reason);
      outbox(this.db, 'projects', `pitch.${status}`, id, { pitchId: id, projectId });
      return { status, projectId };
    });
  }
  resubmitPitch(id, body, ctx) {
    authenticated(ctx); const data = parse(pitchInput, body);
    return transaction(this.db, () => {
      const row = this.db.prepare('SELECT * FROM project_pitches WHERE id = ? AND deleted_at IS NULL').get(id);
      ensure(row?.submitted_by === ctx.id, 403, 'FORBIDDEN', 'Only the submitter can revise this pitch.');
      ensure(row.status === 'needs_feedback', 409, 'INVALID_STATE', 'This pitch is not awaiting a revision.');
      this.db.prepare("UPDATE project_pitches SET title = ?, description = ?, category = ?, domain = ?, status = 'pending', resubmission_count = resubmission_count + 1, updated_at = ? WHERE id = ?").run(data.title, data.description, data.category, data.domain, now(), id);
      audit(this.db, ctx, 'projects', 'pitch.resubmitted', id); return { updated: true };
    });
  }
  changeStatus(id, body, ctx) {
    authenticated(ctx);
    return transaction(this.db, () => {
      const project = this.row(id); const role = this.membership(project, ctx); const admin = ctx.roles.includes('admin');
      const rules = { hold: ['active', 'on_hold', role === 'lead' || admin], resume: ['on_hold', 'active', role === 'lead' || admin], block: ['active', 'blocked', role === 'mentor' || admin], unblock: ['blocked', 'active', admin], discontinue: ['active', 'discontinued', admin] };
      const rule = rules[body.action];
      ensure(rule && rule[2], 403, 'FORBIDDEN', 'You cannot make this project transition.');
      ensure(project.status === rule[0], 409, 'INVALID_STATE', 'The project state has changed. Refresh and try again.');
      ensure(typeof body.reason === 'string' && body.reason.trim().length >= 5 && body.reason.length <= 2000, 422, 'REASON_REQUIRED', 'Add a reason for this change.');
      this.db.prepare('UPDATE projects SET status = ?, status_reason = ?, updated_at = ? WHERE id = ?').run(rule[1], body.reason.trim(), now(), id);
      audit(this.db, ctx, 'projects', `project.${body.action}`, id, { status: rule[1] }, body.reason); return this.get(id, ctx);
    });
  }
  updateMilestone(id, milestoneId, body, ctx) {
    authenticated(ctx);
    return transaction(this.db, () => {
      const project = this.row(id); const role = this.membership(project, ctx);
      ensure(['lead', 'member'].includes(role) && project.status === 'active', 403, 'FORBIDDEN', 'Only the active project team can update milestones.');
      const row = this.db.prepare('SELECT * FROM project_milestones WHERE id = ? AND project_id = ?').get(milestoneId, id);
      ensure(row, 404, 'NOT_FOUND', 'Milestone not found.');
      ensure((row.status === 'pending' && body.status === 'in_progress') || (row.status === 'in_progress' && body.status === 'completed'), 409, 'INVALID_STATE', 'Start a milestone before completing it.');
      this.db.prepare('UPDATE project_milestones SET status = ?, completed_at = ?, updated_at = ? WHERE id = ?').run(body.status, body.status === 'completed' ? now() : null, now(), milestoneId);
      audit(this.db, ctx, 'projects', 'milestone.updated', id, { milestoneId, status: body.status });
      if (body.status === 'completed') outbox(this.db, 'projects', 'project.checkpoint_requested', id, { milestoneId });
      return this.get(id, ctx);
    });
  }
  addUpdate(id, body, ctx) {
    authenticated(ctx);
    return transaction(this.db, () => {
      const project = this.row(id);
      ensure(['lead', 'member'].includes(this.membership(project, ctx)) && project.status === 'active', 403, 'FORBIDDEN', 'Only the active project team can post an update.');
      ensure(typeof body.body === 'string' && body.body.trim().length >= 5 && body.body.length <= 4000, 422, 'VALIDATION_ERROR', 'An update needs 5–4,000 characters.');
      this.db.prepare('INSERT INTO project_updates (id, project_id, author_id, body, created_at, updated_at) VALUES (?, ?, ?, ?, ?, ?)').run(newId(), id, ctx.id, body.body.trim(), now(), now());
      audit(this.db, ctx, 'projects', 'project.update_posted', id); return { created: true };
    });
  }
  signoff(id, body, ctx) {
    authenticated(ctx);
    return transaction(this.db, () => {
      const project = this.row(id);
      ensure(project.status === 'active', 409, 'INVALID_STATE', 'Only an active project can be signed off.');
      const mentor = body.role === 'mentor';
      ensure(mentor ? this.membership(project, ctx) === 'mentor' && ctx.roles.includes('mentor') : body.role === 'committee' && ctx.permissions.includes('project:review'), 403, 'FORBIDDEN', 'You do not hold this review responsibility.');
      ensure(ctx.id !== (mentor ? project.committee_signed_off_by : project.mentor_signed_off_by), 403, 'INDEPENDENT_REVIEW', 'Mentor and committee sign-offs need different reviewers.');
      const prefix = mentor ? 'mentor' : 'committee';
      this.db.prepare(`UPDATE projects SET ${prefix}_signed_off_at = ?, ${prefix}_signed_off_by = ?, updated_at = ? WHERE id = ?`).run(now(), ctx.id, now(), id);
      audit(this.db, ctx, 'projects', `project.${prefix}_signoff`, id); return this.get(id, ctx);
    });
  }
  submitFinal(id, ctx) {
    authenticated(ctx);
    return transaction(this.db, () => {
      const p = this.row(id);
      ensure(this.membership(p, ctx) === 'lead', 403, 'FORBIDDEN', 'Only the team lead can submit the final review.');
      const completed = this.db.prepare("SELECT COUNT(*) total FROM project_milestones WHERE project_id = ? AND status = 'completed'").get(id).total;
      ensure(p.status === 'active' && p.mentor_signed_off_at && p.committee_signed_off_at && completed === 6, 409, 'SIGNOFF_REQUIRED', 'Complete all six milestones and obtain both sign-offs first.');
      this.db.prepare("UPDATE projects SET status = 'final_review_submitted', updated_at = ? WHERE id = ?").run(now(), id);
      audit(this.db, ctx, 'projects', 'project.final_submitted', id); outbox(this.db, 'projects', 'project.final_submitted', id, { projectId: id }); return this.get(id, ctx);
    });
  }
  finalReview(id, body, ctx) {
    permitted(ctx, 'project:review');
    const data = parse(decisionInput, body); ensure(data.action !== 'needs_feedback', 422, 'INVALID_ACTION', 'Approve or return for revision.');
    return transaction(this.db, () => {
      const p = this.row(id); ensure(p.status === 'final_review_submitted', 409, 'INVALID_STATE', 'This project is not awaiting final review.');
      const status = data.action === 'approve' ? 'completed' : 'active';
      this.db.prepare('UPDATE projects SET status = ?, updated_at = ? WHERE id = ?').run(status, now(), id);
      this.db.prepare("INSERT INTO project_reviews (id, project_id, reviewer_id, review_type, feedback, created_at, updated_at) VALUES (?, ?, ?, 'final', ?, ?, ?)").run(newId(), id, ctx.id, data.reason, now(), now());
      audit(this.db, ctx, 'projects', 'project.final_reviewed', id, { status }, data.reason); outbox(this.db, 'projects', 'project.final_reviewed', id, { status }); return this.get(id, ctx);
    });
  }
}
