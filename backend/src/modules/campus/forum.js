import { postInput, commentInput } from '@cvs-garage/contracts/schema';
import { newId, now, iso, ensure, authenticated, parse, permitted, transaction, audit, outbox, notify, pagination, page, safeLike } from './core.js';

export class CampusForumRepository {
  constructor(db, members, ideas) { this.db = db; this.members = members; this.ideas = ideas; }
  row(id, ctx) {
    const row = this.db.prepare('SELECT * FROM forum_posts WHERE id = ? AND deleted_at IS NULL').get(id);
    ensure(row, 404, 'NOT_FOUND', 'Discussion not found.');
    if (row.community_id) this.checkCommunity(row.community_id, ctx);
    ensure(row.status !== 'under_review' || ctx?.permissions.includes('forum:moderate') || row.author_id === ctx?.id, 404, 'NOT_FOUND', 'Discussion not found.');
    return row;
  }
  checkCommunity(id, ctx) {
    const row = this.db.prepare('SELECT * FROM forum_communities WHERE id = ? AND deleted_at IS NULL').get(id);
    ensure(row, 404, 'NOT_FOUND', 'Community not found.');
    if (!['public', 'topic_based'].includes(row.community_type)) {
      ensure(ctx && (ctx.permissions.includes('forum:moderate') || this.db.prepare('SELECT 1 FROM forum_community_members WHERE community_id = ? AND account_id = ?').get(id, ctx.id)), 403, 'PRIVATE_COMMUNITY', 'This community is available to its members.');
    }
    return row;
  }
  post(row, ctx) {
    return { id: row.id, title: row.title, content: row.content, postType: row.post_type,
      author: this.members.publicMember(row.author_id) ?? { id: row.author_id, displayName: 'Former member', roles: [], links: {}, skills: [] },
      status: row.status, voteScore: row.vote_score, replyCount: row.reply_count,
      viewerVote: ctx ? this.db.prepare("SELECT value FROM forum_votes WHERE account_id = ? AND target_type = 'post' AND target_id = ?").get(ctx.id, row.id)?.value ?? 0 : 0,
      isBookmarked: Boolean(ctx && this.db.prepare('SELECT 1 FROM forum_bookmarks WHERE account_id = ? AND post_id = ?').get(ctx.id, row.id)), createdAt: iso(row.created_at),
      category: row.category_id ? this.db.prepare('SELECT id, name FROM forum_categories WHERE id = ?').get(row.category_id) : null,
      community: row.community_id ? this.db.prepare('SELECT id, name FROM forum_communities WHERE id = ?').get(row.community_id) : null,
      tags: this.db.prepare('SELECT t.name FROM forum_tags t JOIN forum_post_tags p ON p.tag_id = t.id WHERE p.post_id = ?').all(row.id).map((r) => r.name),
      acceptedReplyId: row.accepted_reply_id, isLocked: Boolean(row.is_locked),
      exportedIdeaId: this.db.prepare('SELECT idea_id FROM forum_idea_exports WHERE post_id = ?').get(row.id)?.idea_id ?? null,
    };
  }
  list(query = {}, ctx = null) {
    const { limit, offset } = pagination(query);
    const params = [safeLike(query.q), safeLike(query.q), ctx?.id ?? ''];
    const clauses = ["p.deleted_at IS NULL AND p.status != 'under_review'", "(p.title LIKE ? ESCAPE '\\' OR p.content LIKE ? ESCAPE '\\')",
      "(p.community_id IS NULL OR EXISTS (SELECT 1 FROM forum_communities c WHERE c.id = p.community_id AND c.deleted_at IS NULL AND (c.community_type IN ('public', 'topic_based') OR EXISTS (SELECT 1 FROM forum_community_members cm WHERE cm.community_id = c.id AND cm.account_id = ?))))"];
    if (query.type) { clauses.push('p.post_type = ?'); params.push(query.type); }
    if (query.community) { this.checkCommunity(query.community, ctx); clauses.push('p.community_id = ?'); params.push(query.community); }
    if (query.category) { clauses.push('p.category_id = ?'); params.push(query.category); }
    if (query.saved === 'true') { authenticated(ctx); clauses.push('EXISTS (SELECT 1 FROM forum_bookmarks b WHERE b.post_id = p.id AND b.account_id = ?)'); params.push(ctx.id); }
    if (query.unanswered === 'true') clauses.push("p.reply_count = 0 AND p.status = 'open'");
    const where = clauses.join(' AND ');
    const total = this.db.prepare(`SELECT COUNT(*) total FROM forum_posts p WHERE ${where}`).get(...params).total;
    const rows = this.db.prepare(`SELECT p.* FROM forum_posts p WHERE ${where} ORDER BY p.is_pinned DESC, ${query.sort === 'popular' ? 'p.vote_score DESC,' : ''} p.created_at DESC, p.id DESC LIMIT ? OFFSET ?`).all(...params, limit, offset);
    return { ...page(rows.map((r) => this.post(r, ctx)), total, limit, offset),
      categories: this.db.prepare('SELECT id, name FROM forum_categories WHERE is_restricted = 0 ORDER BY display_order').all(),
      communities: this.db.prepare("SELECT id, name, description, member_count FROM forum_communities WHERE deleted_at IS NULL AND community_type IN ('public', 'topic_based') ORDER BY name LIMIT 30").all().map((r) => ({ id: r.id, name: r.name, description: r.description, memberCount: r.member_count, isMember: Boolean(ctx && this.db.prepare('SELECT 1 FROM forum_community_members WHERE community_id = ? AND account_id = ?').get(r.id, ctx.id)) })),
    };
  }
  get(id, ctx) {
    const row = this.row(id, ctx);
    return { ...this.post(row, ctx), replies: this.db.prepare('SELECT * FROM forum_replies WHERE post_id = ? AND deleted_at IS NULL ORDER BY is_accepted_solution DESC, created_at LIMIT 100').all(id).map((r) => ({
      id: r.id, content: r.content, author: this.members.publicMember(r.author_id) ?? { id: r.author_id, displayName: 'Former member', roles: [], links: {}, skills: [] }, parentReplyId: r.parent_reply_id, isAcceptedSolution: Boolean(r.is_accepted_solution), createdAt: iso(r.created_at),
    })) };
  }
  create(body, ctx) {
    authenticated(ctx); const data = parse(postInput, body);
    return transaction(this.db, () => {
      if (data.postType === 'announcement') permitted(ctx, 'forum:moderate');
      if (data.communityId) this.checkCommunity(data.communityId, ctx);
      if (data.categoryId) {
        const category = this.db.prepare('SELECT * FROM forum_categories WHERE id = ?').get(data.categoryId);
        ensure(category && (!category.is_restricted || ctx.permissions.includes('forum:moderate')), 403, 'CATEGORY_UNAVAILABLE', 'This category is unavailable.');
      }
      const id = newId();
      this.db.prepare('INSERT INTO forum_posts (id, post_type, title, content, author_id, category_id, community_id, vote_score, upvotes_count, created_at, updated_at) VALUES (?, ?, ?, ?, ?, ?, ?, 1, 1, ?, ?)').run(id, data.postType, data.title, data.content, ctx.id, data.categoryId ?? null, data.communityId ?? null, now(), now());
      this.db.prepare("INSERT INTO forum_votes (id, account_id, target_type, target_id, value, created_at, updated_at) VALUES (?, ?, 'post', ?, 1, ?, ?)").run(newId(), ctx.id, id, now(), now());
      for (const tagName of new Set(data.tagNames)) {
        let tag = this.db.prepare('SELECT id FROM forum_tags WHERE name = ? COLLATE NOCASE').get(tagName);
        if (!tag) { tag = { id: newId() }; this.db.prepare('INSERT INTO forum_tags (id, name, slug, created_at) VALUES (?, ?, ?, ?)').run(tag.id, tagName, `${tagName.toLowerCase().replace(/[^a-z0-9]+/g, '-')}-${tag.id.slice(-8)}`, now()); }
        this.db.prepare('INSERT INTO forum_post_tags (post_id, tag_id) VALUES (?, ?)').run(id, tag.id);
        this.db.prepare('UPDATE forum_tags SET post_count = post_count + 1 WHERE id = ?').run(tag.id);
      }
      if (data.communityId) this.db.prepare('UPDATE forum_communities SET post_count = post_count + 1 WHERE id = ?').run(data.communityId);
      audit(this.db, ctx, 'forum', 'forum.post_created', id); outbox(this.db, 'forum', 'forum.contribution', id, { type: 'post', accountId: ctx.id }, `post:${id}`);
      return this.get(id, ctx);
    });
  }
  reply(id, body, ctx) {
    authenticated(ctx); const data = parse(commentInput, body);
    return transaction(this.db, () => {
      const post = this.row(id, ctx);
      ensure(!post.is_locked && !['closed', 'archived'].includes(post.status), 409, 'POST_LOCKED', 'This discussion is closed to new replies.');
      if (data.parentId) ensure(this.db.prepare('SELECT 1 FROM forum_replies WHERE id = ? AND post_id = ? AND deleted_at IS NULL').get(data.parentId, id), 422, 'INVALID_PARENT', 'The reply must belong to this discussion.');
      const replyId = newId();
      this.db.prepare('INSERT INTO forum_replies (id, post_id, parent_reply_id, author_id, content, created_at, updated_at) VALUES (?, ?, ?, ?, ?, ?, ?)').run(replyId, id, data.parentId ?? null, ctx.id, data.content, now(), now());
      this.db.prepare('UPDATE forum_posts SET reply_count = reply_count + 1, updated_at = ? WHERE id = ?').run(now(), id);
      audit(this.db, ctx, 'forum', 'forum.reply_created', id); notify(this.db, ctx, post.author_id, `${ctx.member.displayName} replied to ${post.title}.`, 'forum', id);
      outbox(this.db, 'forum', 'forum.contribution', id, { type: 'reply', accountId: ctx.id }, `reply:${replyId}`); return { id: replyId };
    });
  }
  vote(id, body, ctx) {
    authenticated(ctx); ensure([-1, 0, 1].includes(body.value), 422, 'INVALID_VOTE', 'Choose an upvote, downvote or remove your vote.');
    return transaction(this.db, () => {
      const post = this.row(id, ctx); ensure(!post.is_locked, 409, 'POST_LOCKED', 'Voting is closed for this discussion.');
      if (body.value === 0) this.db.prepare("DELETE FROM forum_votes WHERE account_id = ? AND target_type = 'post' AND target_id = ?").run(ctx.id, id);
      else this.db.prepare("INSERT INTO forum_votes (id, account_id, target_type, target_id, value, created_at, updated_at) VALUES (?, ?, 'post', ?, ?, ?, ?) ON CONFLICT(account_id, target_type, target_id) DO UPDATE SET value = excluded.value, updated_at = excluded.updated_at").run(newId(), ctx.id, id, body.value, now(), now());
      const votes = this.db.prepare("SELECT COALESCE(SUM(value), 0) score, COALESCE(SUM(value = 1), 0) upvotes, COALESCE(SUM(value = -1), 0) downvotes FROM forum_votes WHERE target_type = 'post' AND target_id = ?").get(id);
      this.db.prepare('UPDATE forum_posts SET vote_score = ?, upvotes_count = ?, downvotes_count = ? WHERE id = ?').run(votes.score, votes.upvotes, votes.downvotes, id);
      audit(this.db, ctx, 'forum', 'forum.vote_changed', id); return { score: votes.score };
    });
  }
  bookmark(id, saved, ctx) {
    authenticated(ctx); this.row(id, ctx);
    transaction(this.db, () => {
      if (saved) this.db.prepare('INSERT INTO forum_bookmarks (account_id, post_id, created_at) VALUES (?, ?, ?) ON CONFLICT DO NOTHING').run(ctx.id, id, now());
      else this.db.prepare('DELETE FROM forum_bookmarks WHERE account_id = ? AND post_id = ?').run(ctx.id, id);
      audit(this.db, ctx, 'forum', 'forum.bookmark_changed', id);
    }); return { isBookmarked: saved };
  }
  accept(id, body, ctx) {
    authenticated(ctx);
    return transaction(this.db, () => {
      const post = this.row(id, ctx);
      ensure(post.author_id === ctx.id || ctx.permissions.includes('forum:moderate'), 403, 'FORBIDDEN', 'Only the author or a moderator can accept an answer.');
      ensure(['question', 'problem', 'doubt'].includes(post.post_type) && !post.is_locked, 409, 'NOT_A_QUESTION', 'Only an open question can have an accepted answer.');
      const reply = this.db.prepare('SELECT * FROM forum_replies WHERE id = ? AND post_id = ? AND deleted_at IS NULL').get(body.replyId, id);
      ensure(reply, 422, 'INVALID_REPLY', 'Choose an answer from this discussion.');
      this.db.prepare('UPDATE forum_replies SET is_accepted_solution = 0 WHERE post_id = ?').run(id);
      this.db.prepare('UPDATE forum_replies SET is_accepted_solution = 1 WHERE id = ?').run(reply.id);
      this.db.prepare("UPDATE forum_posts SET accepted_reply_id = ?, status = 'solved', updated_at = ? WHERE id = ?").run(reply.id, now(), id);
      audit(this.db, ctx, 'forum', 'forum.answer_accepted', id); outbox(this.db, 'forum', 'forum.answer_accepted', id, { replyId: reply.id, accountId: reply.author_id }, `${id}:${reply.id}`);
      return { accepted: true };
    });
  }
  joinCommunity(id, ctx) {
    authenticated(ctx);
    return transaction(this.db, () => {
      const community = this.checkCommunity(id, ctx);
      ensure(['public', 'topic_based'].includes(community.community_type), 403, 'INVITATION_REQUIRED', 'This community requires an invitation.');
      const existing = this.db.prepare('SELECT id FROM forum_community_members WHERE community_id = ? AND account_id = ?').get(id, ctx.id);
      if (existing) this.db.prepare('DELETE FROM forum_community_members WHERE id = ?').run(existing.id);
      else this.db.prepare('INSERT INTO forum_community_members (id, community_id, account_id, joined_at) VALUES (?, ?, ?, ?)').run(newId(), id, ctx.id, now());
      this.db.prepare('UPDATE forum_communities SET member_count = (SELECT COUNT(*) FROM forum_community_members WHERE community_id = ?) WHERE id = ?').run(id, id);
      audit(this.db, ctx, 'forum', 'forum.membership_changed', id); return { joined: !existing };
    });
  }
  exportIdea(id, body, ctx) {
    authenticated(ctx);
    return transaction(this.db, () => {
      const post = this.row(id, ctx);
      ensure(post.author_id === ctx.id, 403, 'FORBIDDEN', 'Only the author can turn this discussion into an idea.');
      ensure(post.post_type === 'idea', 409, 'NOT_AN_IDEA', 'Choose an idea discussion to export.');
      const existing = this.db.prepare('SELECT idea_id FROM forum_idea_exports WHERE post_id = ?').get(id);
      if (existing) return { ideaId: existing.idea_id, alreadyExported: true };
      const idea = this.ideas.createFromForum(post, body, ctx);
      this.db.prepare('INSERT INTO forum_idea_exports (id, post_id, idea_id, exported_by, created_at) VALUES (?, ?, ?, ?, ?)').run(newId(), id, idea.id, ctx.id, now());
      audit(this.db, ctx, 'forum', 'forum.idea_exported', id); outbox(this.db, 'forum', 'forum.idea_exported', id, { ideaId: idea.id }, id);
      return { ideaId: idea.id, alreadyExported: false };
    });
  }
  report(id, body, ctx) {
    authenticated(ctx); this.row(id, ctx);
    ensure(['spam', 'misleading_information', 'inappropriate_content', 'other'].includes(body.reason), 422, 'INVALID_REASON', 'Choose a report reason.');
    return transaction(this.db, () => {
      const reportId = newId();
      this.db.prepare("INSERT INTO forum_reports (id, reporter_id, target_type, target_id, reason, notes, created_at, updated_at) VALUES (?, ?, 'post', ?, ?, ?, ?, ?)").run(reportId, ctx.id, id, body.reason, String(body.notes ?? '').slice(0, 2000), now(), now());
      audit(this.db, ctx, 'forum', 'forum.reported', id); return { id: reportId };
    });
  }
  reports(ctx) { permitted(ctx, 'forum:moderate'); return this.db.prepare("SELECT r.id, r.target_id postId, p.title, r.reason, r.notes, r.status FROM forum_reports r JOIN forum_posts p ON p.id = r.target_id WHERE r.status IN ('pending', 'under_review') ORDER BY r.created_at LIMIT 50").all(); }
  resolveReport(id, body, ctx) {
    permitted(ctx, 'forum:moderate');
    ensure(['dismiss', 'lock'].includes(body.action), 422, 'INVALID_ACTION', 'Choose dismiss or lock.');
    return transaction(this.db, () => {
      const r = this.db.prepare("SELECT * FROM forum_reports WHERE id = ? AND status IN ('pending', 'under_review')").get(id); ensure(r, 404, 'NOT_FOUND', 'Open report not found.');
      this.db.prepare('UPDATE forum_reports SET status = ?, reviewed_by = ?, updated_at = ? WHERE id = ?').run(body.action === 'dismiss' ? 'dismissed' : 'resolved', ctx.id, now(), id);
      if (body.action === 'lock') this.db.prepare('UPDATE forum_posts SET is_locked = 1 WHERE id = ?').run(r.target_id);
      audit(this.db, ctx, 'forum', 'forum.report_resolved', r.target_id, { action: body.action }); return { updated: true };
    });
  }
}
