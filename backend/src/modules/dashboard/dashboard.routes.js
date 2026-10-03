import { Router } from 'express';
import { asyncRoute, sendSuccess } from '../../lib/http.js';
import { eventService } from '../../integrations/event.service.js';
import { ideaCentreService } from '../../integrations/idea-centre.service.js';
import { leaderboardService } from '../../integrations/leaderboard.service.js';
import { memberService } from '../../integrations/member.service.js';
import { projectService } from '../../integrations/project.service.js';
import { forumStore } from '../forum/forum.store.js';

const router = Router();

router.get(
  '/',
  asyncRoute(async (req, res) => {
    const currentUser = await memberService.verifyAuth(req);
    const [members, projects, events, ideas, leaderboards] = await Promise.all([
      memberService.getAllMembers(),
      projectService.getAllProjects(),
      eventService.getAllEvents(),
      ideaCentreService.getAllIdeas(currentUser?.id),
      leaderboardService.getLeaderboard()
    ]);

    const now = Date.now();
    const upcomingEvents = events
      .filter((event) => new Date(event.endsAt || event.endDate).getTime() >= now)
      .sort(
        (left, right) =>
          new Date(left.startsAt || left.startDate).getTime() -
          new Date(right.startsAt || right.startDate).getTime()
      )
      .slice(0, 3);

    const featuredProjects = projects
      .filter((project) => ['active', 'in_progress', 'showcase'].includes(project.status))
      .sort((left, right) => (right.progress || 0) - (left.progress || 0))
      .slice(0, 3);

    const recentIdeas = [...ideas]
      .sort((left, right) => new Date(right.createdAt).getTime() - new Date(left.createdAt).getTime())
      .slice(0, 3);

    const summary = {
      memberCount: members.length,
      activeProjectCount: projects.filter((project) =>
        ['active', 'in_progress'].includes(project.status)
      ).length,
      upcomingEventCount: events.filter(
        (event) => new Date(event.endsAt || event.endDate).getTime() >= now
      ).length,
      openIdeaCount: ideas.filter((idea) => ['Open', 'open'].includes(idea.status)).length,
      discussionCount: forumStore.posts.filter((post) => !post.deletedAt).length,
      topContributor: currentUser ? leaderboards.entries[0] || null : null,
      featuredProjects: currentUser ? featuredProjects : [],
      upcomingEvents: currentUser ? upcomingEvents : [],
      recentIdeas: currentUser ? recentIdeas : []
    };

    return sendSuccess(res, summary);
  })
);

export default router;
