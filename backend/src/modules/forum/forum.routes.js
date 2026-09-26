/**
 * CVS Garage — Forum Router
 * Maps REST paths to ForumController actions.
 */

import { Router } from 'express';
import { forumController } from './forum.controller.js';

const router = Router();

// Auth & User Context
router.get('/auth/me', (req, res) => forumController.getCurrentUser(req, res));

// Posts & Feed
router.get('/posts', (req, res) => forumController.getPosts(req, res));
router.get('/posts/:id', (req, res) => forumController.getPostById(req, res));
router.post('/posts', (req, res) => forumController.createPost(req, res));
router.patch('/posts/:id', (req, res) => forumController.updatePost(req, res));
router.delete('/posts/:id', (req, res) => forumController.deletePost(req, res));
router.post('/posts/:id/accept-solution', (req, res) => forumController.markAcceptedSolution(req, res));

// Replies
router.get('/posts/:id/replies', (req, res) => forumController.getReplies(req, res));
router.post('/posts/:id/replies', (req, res) => forumController.createReply(req, res));

// Voting & Bookmarks
router.post('/votes', (req, res) => forumController.castVote(req, res));
router.post('/bookmarks/toggle', (req, res) => forumController.toggleBookmark(req, res));

// Communities
router.get('/communities', (req, res) => forumController.getCommunities(req, res));
router.get('/communities/:slug', (req, res) => forumController.getCommunityBySlug(req, res));
router.post('/communities/:id/join', (req, res) => forumController.toggleCommunityMembership(req, res));

// Mentors, Tags, Follows
router.get('/mentors', (req, res) => forumController.getMentors(req, res));
router.get('/tags', (req, res) => forumController.getTags(req, res));
router.post('/follows/toggle', (req, res) => forumController.toggleFollow(req, res));

// Moderation
router.post('/reports', (req, res) => forumController.createReport(req, res));
router.get('/moderation/reports', (req, res) => forumController.getReports(req, res));
router.patch('/moderation/reports/:id', (req, res) => forumController.resolveReport(req, res));

// Integrations
router.post('/integrations/idea-centre/export', (req, res) => forumController.exportToIdeaCentre(req, res));
router.get('/integrations/projects', (req, res) => forumController.searchProjects(req, res));
router.get('/integrations/events', (req, res) => forumController.searchEvents(req, res));

export default router;
