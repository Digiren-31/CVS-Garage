import { Router } from 'express';
import { asyncRoute, sendError, sendSuccess } from '../../lib/http.js';
import { memberCentreService } from '../member-centre/member.service.js';

const router = Router();

router.get(
  '/session',
  asyncRoute(async (req, res) => {
    const member = await memberCentreService.resolveSession(req);
    if (!member) {
      return sendError(res, 401, 'UNAUTHORIZED', 'No valid Supabase session was provided.');
    }
    return sendSuccess(res, member);
  })
);

export default router;
