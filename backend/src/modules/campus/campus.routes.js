import { Router } from 'express';
import { rateLimit } from 'express-rate-limit';
import { MembersRepository } from './members.js';
import { ProjectsRepository } from './projects.js';
import { EventsRepository } from './events.js';
import { IdeasRepository } from './ideas.js';
import { CampusForumRepository } from './forum.js';
import { RankingsRepository } from './rankings.js';
import { ensure, now } from './core.js';

export function createCampusRouter(db, { demo = false } = {}) {
  const router = Router();
  const members = new MembersRepository(db);
  const projects = new ProjectsRepository(db, members);
  const events = new EventsRepository(db, members);
  const ideas = new IdeasRepository(db, members);
  const forum = new CampusForumRepository(db, members, ideas);
  const rankings = new RankingsRepository(db, members);
  const route = (method, path, handler) => router[method](path, (req, res, next) => {
    Promise.resolve().then(() => handler(req, res)).then((data) => {
      if (!res.headersSent) res.json({ success: true, data, meta: { timestamp: now() } });
    }).catch(next);
  });
  router.use((req, res, next) => { req.ctx = members.context(req); res.set('Cache-Control', 'no-store'); next(); });
  const authLimiter = rateLimit({ windowMs: 15 * 60 * 1000, limit: demo ? 100 : 10, standardHeaders: 'draft-8', legacyHeaders: false,
    handler: (_req, res) => res.status(429).json({ success: false, error: { code: 'RATE_LIMIT', message: 'Too many sign-in attempts. Please try again later.' } }) });
  router.use('/session/sign-in', authLimiter);
  router.use('/session/demo', authLimiter);
  route('get', '/session', (req) => ({ member: req.ctx?.member ?? null, permissions: req.ctx?.permissions ?? [], demo, demoAvailable: demo }));
  route('post', '/session/demo', (req, res) => { ensure(demo && process.env.NODE_ENV !== 'production', 404, 'NOT_FOUND', 'This endpoint is not available.'); return members.createSession('demo-student', req, res); });
  route('post', '/session/sign-in', (req, res) => members.signIn(req.body, req, res));
  route('post', '/session/sign-out', (req, res) => members.signOut(req.ctx, res));
  route('get', '/members', (req) => members.directory(req.query));
  route('get', '/members/profile', (req) => members.profile(req.ctx));
  route('patch', '/members/profile', (req) => members.updateProfile(req.body, req.ctx));
  route('delete', '/members/sessions/:id', (req) => members.revokeSession(req.params.id, req.ctx));
  route('get', '/members/admin', (req) => members.listAdmin(req.query, req.ctx));
  route('patch', '/members/:id/status', (req) => members.changeStatus(req.params.id, req.body, req.ctx));
  route('patch', '/members/:id/mentor', (req) => members.mentorRole(req.params.id, req.body, req.ctx));
  route('get', '/notifications', (req) => members.notifications(req.ctx));
  route('patch', '/notifications/:id/read', (req) => members.readNotification(req.params.id, req.ctx));
  route('get', '/projects', (req) => projects.list(req.query, req.ctx));
  route('get', '/projects/pitches', (req) => projects.listPitches(req.query, req.ctx));
  route('post', '/projects/pitches', (req) => projects.createPitch(req.body, req.ctx));
  route('patch', '/projects/pitches/:id/review', (req) => projects.reviewPitch(req.params.id, req.body, req.ctx));
  route('post', '/projects/pitches/:id/resubmit', (req) => projects.resubmitPitch(req.params.id, req.body, req.ctx));
  route('get', '/projects/:id', (req) => projects.get(req.params.id, req.ctx));
  route('patch', '/projects/:id/status', (req) => projects.changeStatus(req.params.id, req.body, req.ctx));
  route('patch', '/projects/:id/milestones/:milestoneId', (req) => projects.updateMilestone(req.params.id, req.params.milestoneId, req.body, req.ctx));
  route('post', '/projects/:id/updates', (req) => projects.addUpdate(req.params.id, req.body, req.ctx));
  route('post', '/projects/:id/signoff', (req) => projects.signoff(req.params.id, req.body, req.ctx));
  route('post', '/projects/:id/submit-final', (req) => projects.submitFinal(req.params.id, req.ctx));
  route('post', '/projects/:id/final-review', (req) => projects.finalReview(req.params.id, req.body, req.ctx));
  route('get', '/events', (req) => events.list(req.query, req.ctx));
  route('post', '/events', (req) => events.create(req.body, req.ctx));
  route('get', '/events/:id', (req) => events.get(req.params.id, req.ctx));
  route('patch', '/events/:id/status', (req) => events.transition(req.params.id, req.body, req.ctx));
  route('post', '/events/:id/registration', (req) => events.register(req.params.id, req.body, req.ctx));
  route('delete', '/events/:id/registration', (req) => events.cancelRegistration(req.params.id, req.ctx));
  route('get', '/ideas', (req) => ideas.list(req.query, req.ctx));
  route('post', '/ideas', (req) => ideas.create(req.body, req.ctx));
  route('get', '/ideas/:id', (req) => ideas.get(req.params.id, req.ctx));
  route('put', '/ideas/:id/save', (req) => ideas.save(req.params.id, true, req.ctx));
  route('delete', '/ideas/:id/save', (req) => ideas.save(req.params.id, false, req.ctx));
  route('post', '/ideas/:id/join-requests', (req) => ideas.join(req.params.id, req.body, req.ctx));
  route('patch', '/idea-join-requests/:id', (req) => ideas.decideJoin(req.params.id, req.body, req.ctx));
  route('post', '/ideas/:id/mentorship-requests', (req) => ideas.requestMentor(req.params.id, req.body, req.ctx));
  route('post', '/idea-mentorship-requests/:id/claim', (req) => ideas.claim(req.params.id, req.ctx));
  route('post', '/ideas/:id/step-down', (req) => ideas.stepDown(req.params.id, req.ctx));
  route('patch', '/ideas/:id/status', (req) => ideas.setStatus(req.params.id, req.body, req.ctx));
  route('post', '/ideas/:id/comments', (req) => ideas.comment(req.params.id, req.body, req.ctx));
  route('get', '/forum', (req) => forum.list(req.query, req.ctx));
  route('post', '/forum', (req) => forum.create(req.body, req.ctx));
  route('get', '/forum/reports', (req) => forum.reports(req.ctx));
  route('patch', '/forum/reports/:id', (req) => forum.resolveReport(req.params.id, req.body, req.ctx));
  route('get', '/forum/:id', (req) => forum.get(req.params.id, req.ctx));
  route('post', '/forum/:id/replies', (req) => forum.reply(req.params.id, req.body, req.ctx));
  route('put', '/forum/:id/vote', (req) => forum.vote(req.params.id, req.body, req.ctx));
  route('put', '/forum/:id/bookmark', (req) => forum.bookmark(req.params.id, true, req.ctx));
  route('delete', '/forum/:id/bookmark', (req) => forum.bookmark(req.params.id, false, req.ctx));
  route('post', '/forum/:id/accept', (req) => forum.accept(req.params.id, req.body, req.ctx));
  route('post', '/forum/:id/export', (req) => forum.exportIdea(req.params.id, req.body, req.ctx));
  route('post', '/forum/:id/report', (req) => forum.report(req.params.id, req.body, req.ctx));
  route('post', '/communities/:id/join', (req) => forum.joinCommunity(req.params.id, req.ctx));
  route('get', '/rankings', (req) => rankings.list(req.query));
  route('get', '/achievements', () => rankings.listAchievements());
  route('get', '/overview', (req) => ({
    counts: {
      projects: projects.list({ limit: 1 }, req.ctx).total,
      events: events.list({ time: 'upcoming', limit: 1 }, req.ctx).total,
      ideas: ideas.list({ status: 'OPEN', limit: 1 }, req.ctx).total,
      members: members.directory({ limit: 1 }).total,
    },
    events: events.list({ time: 'upcoming', limit: 3 }, req.ctx).items,
    ideas: ideas.list({ status: 'OPEN', limit: 3 }, req.ctx).items,
    discussions: forum.list({ limit: 3 }, req.ctx).items,
    projects: projects.list({ limit: 3, scope: req.ctx ? 'mine' : 'showcase' }, req.ctx).items, demo,
  }));
  route('get', '/search', (req) => {
    const q = String(req.query.q ?? '').trim().slice(0, 100);
    if (q.length < 2) return [];
    const result = [];
    for (const [items, area, path] of [[projects.list({ q, limit: 5 }, req.ctx).items, 'projects', 'projects'], [events.list({ q, limit: 5 }, req.ctx).items, 'events', 'events'], [ideas.list({ q, limit: 5 }, req.ctx).items, 'idea-centre', 'ideas'], [forum.list({ q, limit: 5 }, req.ctx).items, 'forum', 'forum']]) {
      for (const item of items) result.push({ id: item.id, title: item.title, description: item.tagline ?? item.shortSummary ?? item.description?.slice(0, 120) ?? item.content?.slice(0, 120), area, href: `/${path}/${item.id}` });
    }
    return result;
  });
  return router;
}
