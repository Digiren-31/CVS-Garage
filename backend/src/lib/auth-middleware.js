import { sendError } from './http.js';
import { memberCentreService } from '../modules/member-centre/member.service.js';

export async function requireActiveMember(req, res, next) {
  try {
    const sessionMember = await memberCentreService.resolveSession(req);
    if (!sessionMember) {
      return sendError(
        res,
        401,
        'UNAUTHORIZED',
        'Sign in with an approved account to access this service.'
      );
    }
    if (sessionMember.status === 'pending') {
      return sendError(
        res,
        403,
        'ACCOUNT_PENDING',
        'Your account is waiting for administrator approval.'
      );
    }
    if (sessionMember.status === 'suspended') {
      return sendError(
        res,
        403,
        'ACCOUNT_SUSPENDED',
        'This account is suspended. Contact a portal administrator.'
      );
    }

    req.member = sessionMember;
    return next();
  } catch (error) {
    return next(error);
  }
}
