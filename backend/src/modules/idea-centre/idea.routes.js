import { Router } from 'express';
import { asyncRoute, sendError, sendSuccess } from '../../lib/http.js';
import { memberService } from '../../integrations/member.service.js';
import { IdeaCentreError, ideaService } from './idea.service.js';

const router = Router();

async function resolveMember(req) {
  const requestedId = req.headers['x-user-id'];
  if (
    typeof requestedId === 'string' &&
    !(await memberService.getMemberById(requestedId))
  ) {
    return null;
  }
  return memberService.verifyAuth(req);
}

function route(handler) {
  return asyncRoute(async (req, res) => {
    try {
      return await handler(req, res);
    } catch (error) {
      if (error instanceof IdeaCentreError) {
        return sendError(
          res,
          error.statusCode,
          error.code,
          error.message,
          error.details
        );
      }
      throw error;
    }
  });
}

async function requireMember(req, res) {
  const member = await resolveMember(req);
  if (!member) {
    sendError(
      res,
      401,
      'UNAUTHORIZED',
      'Sign in with an active account to use the Idea Centre.'
    );
    return null;
  }
  return member;
}

router.get(
  '/ideas',
  route(async (req, res) => {
    const member = await requireMember(req, res);
    if (!member) {
      return undefined;
    }
    const ideas = await ideaService.listIdeas(
      {
        q: req.query.q,
        track: req.query.track,
        difficulty: req.query.difficulty,
        status: req.query.status
      },
      member.id
    );
    return sendSuccess(res, ideas, 200, { total: ideas.length });
  })
);

router.post(
  '/ideas',
  route(async (req, res) => {
    const member = await requireMember(req, res);
    if (!member) {
      return undefined;
    }
    return sendSuccess(res, await ideaService.createIdea(req.body, member), 201);
  })
);

router.post(
  '/ideas/:id/save',
  route(async (req, res) => {
    const member = await requireMember(req, res);
    if (!member) {
      return undefined;
    }
    return sendSuccess(res, await ideaService.toggleSave(req.params.id, member.id));
  })
);

router.post(
  '/ideas/:id/join-requests',
  route(async (req, res) => {
    const member = await requireMember(req, res);
    if (!member) {
      return undefined;
    }
    return sendSuccess(
      res,
      await ideaService.requestJoin(req.params.id, req.body, member),
      201
    );
  })
);

router.post(
  '/ideas/:id/comments',
  route(async (req, res) => {
    const member = await requireMember(req, res);
    if (!member) {
      return undefined;
    }
    return sendSuccess(
      res,
      await ideaService.addComment(req.params.id, req.body, member),
      201
    );
  })
);

export default router;
