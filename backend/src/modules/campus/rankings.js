import { json, iso } from './core.js';

export class RankingsRepository {
  constructor(db, members) { this.db = db; this.members = members; }
  list(query = {}) {
    const snapshot = this.db.prepare(`SELECT s.*, p.version FROM leaderboard_snapshots s JOIN scoring_policies p ON p.id = s.policy_id ORDER BY s.generated_at DESC LIMIT 1`).get();
    const options = {
      events: this.db.prepare("SELECT id, title FROM events WHERE status = 'Completed' ORDER BY title").all(),
      departments: this.db.prepare('SELECT name FROM departments ORDER BY name').all().map((r) => r.name),
      academicYears: this.db.prepare('SELECT label FROM academic_years ORDER BY starts_on DESC').all().map((r) => r.label),
    };
    if (!snapshot) return { items: [], asOf: null, policyVersion: null, isDemo: false, options };
    const rows = this.db.prepare(`SELECT e.* FROM leaderboard_snapshot_entries e JOIN member_profiles p ON p.account_id = e.member_id
      LEFT JOIN departments d ON d.id = p.department_id LEFT JOIN academic_years y ON y.id = p.academic_year_id
      JOIN accounts a ON a.id = e.member_id WHERE e.snapshot_id = ? AND a.status = 'active' AND a.deleted_at IS NULL
      AND (? = '' OR d.name = ?) AND (? = '' OR y.label = ?) AND e.star_rating >= ?
      AND (? = '' OR EXISTS (SELECT 1 FROM score_ledger_entries l WHERE l.member_id = e.member_id AND l.event_id = ? AND l.revoked_at IS NULL))
      ORDER BY e.rank, e.member_id LIMIT 50`).all(snapshot.id, query.department ?? '', query.department ?? '', query.year ?? '', query.year ?? '', Math.max(0, Math.min(5, Number(query.stars) || 0)), query.event ?? '', query.event ?? '');
    return { items: rows.map((r) => ({ rank: r.rank, member: this.members.publicMember(r.member_id), score: r.achievement_score, stars: r.star_rating,
      teamNames: this.db.prepare('SELECT t.name FROM teams t JOIN team_memberships m ON m.team_id = t.id WHERE m.account_id = ? AND m.removed_at IS NULL').all(r.member_id).map((v) => v.name),
      eventIds: this.db.prepare('SELECT DISTINCT event_id FROM score_ledger_entries WHERE member_id = ? AND event_id IS NOT NULL AND revoked_at IS NULL').all(r.member_id).map((v) => v.event_id),
    })), asOf: iso(snapshot.generated_at), policyVersion: snapshot.version, isDemo: snapshot.version.startsWith('demo-'), options };
  }
  listAchievements() {
    return this.db.prepare(`SELECT a.*, e.title event_title, e.status event_status, p.title project_title, t.name team_name
      FROM achievements a JOIN events e ON e.id = a.event_id LEFT JOIN projects p ON p.id = a.project_id LEFT JOIN teams t ON t.id = a.team_id
      WHERE a.published_at IS NOT NULL AND e.status IN ('Published', 'Ongoing', 'Completed') ORDER BY a.achieved_at DESC LIMIT 12`).all().map((r) => ({
      id: r.id, title: r.title, message: r.message, subjectName: r.team_name ?? this.members.publicMember(r.member_id)?.displayName ?? 'Campus member', position: r.position,
      event: { id: r.event_id, title: r.event_title },
      project: r.project_id && this.db.prepare('SELECT 1 FROM project_showcases WHERE project_id = ? AND is_published = 1 AND deleted_at IS NULL').get(r.project_id) ? { id: r.project_id, title: r.project_title } : null,
      achievedAt: iso(r.achieved_at),
    }));
  }
}
