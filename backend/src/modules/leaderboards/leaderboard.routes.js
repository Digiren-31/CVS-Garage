import { Router } from 'express';
import { leaderboardService } from '../../integrations/leaderboard.service.js';
import { asyncRoute, sendSuccess } from '../../lib/http.js';

const router = Router();

router.get(
  '/',
  asyncRoute(async (_req, res) => {
    return sendSuccess(res, await leaderboardService.getLeaderboard());
  })
);

export default router;
