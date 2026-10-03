import { Router } from 'express';
import { asyncRoute, sendError, sendSuccess } from '../../lib/http.js';
import { memberService } from '../../integrations/member.service.js';
import {
  isAdministrator,
  MemberCentreError,
  memberCentreService
} from './member.service.js';

const router = Router();
const ALLOWED_STATUSES = new Set(['active', 'pending', 'suspended']);

function validationError(res, message, details) {
  return sendError(res, 400, 'VALIDATION_ERROR', message, details);
}

async function getMutationActor(req, res) {
  const actor = req.member || await memberService.verifyAuth(req);
  if (!actor) {
    sendError(
      res,
      401,
      'UNAUTHORIZED',
      'Sign in with an active account to continue.'
    );
    return null;
  }
  if (!isAdministrator(actor)) {
    sendError(
      res,
      403,
      'FORBIDDEN',
      'Administrator access is required for this member action.'
    );
    return null;
  }
  return actor;
}

router.get(
  '/members',
  asyncRoute(async (req, res) => {
    if (Array.isArray(req.query.q) || (req.query.q !== undefined && typeof req.query.q !== 'string')) {
      return validationError(res, 'Search must be a single text value.', { field: 'q' });
    }

    const query = req.query.q?.trim() || '';
    if (query.length > 100) {
      return validationError(res, 'Search must contain 100 characters or fewer.', {
        field: 'q',
        maxLength: 100
      });
    }

    const actor = req.member || await memberService.verifyAuth(req);
    const members = await memberCentreService.searchMembers(query);
    const visibleMembers = isAdministrator(actor)
      ? members
      : members.filter((member) => member.status === 'active');
    return sendSuccess(res, visibleMembers, 200, { total: visibleMembers.length });
  })
);

router.get(
  '/stats',
  asyncRoute(async (_req, res) => sendSuccess(res, await memberCentreService.getStats()))
);

router.get(
  '/me',
  asyncRoute(async (req, res) => {
    const member = await memberService.verifyAuth(req);
    if (!member) {
      return sendError(
        res,
        401,
        'UNAUTHORIZED',
        'Sign in with an active account to continue.'
      );
    }
    return sendSuccess(res, member);
  })
);

router.patch(
  '/me',
  asyncRoute(async (req, res) => {
    const actor = req.member || await memberService.verifyAuth(req);
    if (!actor) {
      return sendError(res, 401, 'UNAUTHORIZED', 'Sign in to update your profile.');
    }
    return sendSuccess(res, await memberCentreService.updateOwnProfile(req.body, actor));
  })
);

router.patch(
  '/members/:id/status',
  asyncRoute(async (req, res) => {
    const actor = await getMutationActor(req, res);
    if (!actor) {
      return undefined;
    }

    const status = req.body?.status;
    if (typeof status !== 'string' || !ALLOWED_STATUSES.has(status)) {
      return validationError(res, 'Status must be active, pending, or suspended.', {
        field: 'status',
        allowedValues: [...ALLOWED_STATUSES]
      });
    }

    const member = await memberCentreService.updateStatus(req.params.id, status, actor);
    return sendSuccess(res, member);
  })
);

router.patch(
  '/members/:id/mentor',
  asyncRoute(async (req, res) => {
    const actor = await getMutationActor(req, res);
    if (!actor) {
      return undefined;
    }

    if (typeof req.body?.enabled !== 'boolean') {
      return validationError(res, 'Enabled must be a boolean.', { field: 'enabled' });
    }

    const member = await memberCentreService.setMentor(req.params.id, req.body.enabled, actor);
    return sendSuccess(res, member);
  })
);

router.patch(
  '/members/:id/role',
  asyncRoute(async (req, res) => {
    const actor = await getMutationActor(req, res);
    if (!actor) {
      return undefined;
    }

    const { role, enabled } = req.body || {};
    if (!['Mentor', 'Community Moderator'].includes(role)) {
      return validationError(res, 'Role must be Mentor or Community Moderator.', {
        field: 'role',
        allowedValues: ['Mentor', 'Community Moderator']
      });
    }
    if (typeof enabled !== 'boolean') {
      return validationError(res, 'Enabled must be a boolean.', { field: 'enabled' });
    }

    const member = await memberCentreService.setRole(
      req.params.id,
      role,
      enabled,
      actor
    );
    return sendSuccess(res, member);
  })
);

router.delete(
  '/members/:id/personal-data',
  asyncRoute(async (req, res) => {
    const actor = await getMutationActor(req, res);
    if (!actor) {
      return undefined;
    }
    return sendSuccess(res, await memberCentreService.anonymize(req.params.id, actor));
  })
);

router.use((error, _req, res, next) => {
  if (error instanceof MemberCentreError) {
    return sendError(res, error.statusCode, error.code, error.message, error.details);
  }
  return next(error);
});

export default router;
