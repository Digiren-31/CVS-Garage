import { Router } from 'express';
import { asyncRoute, sendError, sendSuccess } from '../../lib/http.js';
import { memberService } from '../../integrations/member.service.js';
import { EventsError, eventsService } from './events.service.js';

function sendEventsError(res, error) {
  if (error instanceof EventsError) {
    return sendError(res, error.status, error.code, error.message, error.details);
  }
  throw error;
}

function readIdentity(req) {
  const header = req.headers['x-user-id'];
  return typeof header === 'string' ? header.trim() : '';
}

export function createEventsRouter({
  service = eventsService,
  findMember = (memberId) => memberService.getMemberById(memberId)
} = {}) {
  const router = Router();

  async function resolveMember(req, required) {
    const memberId = readIdentity(req);
    if (!memberId) {
      if (required) {
        throw new EventsError(
          401,
          'AUTHENTICATION_REQUIRED',
          'Select a development identity before changing an event registration.'
        );
      }
      return null;
    }

    const member = await findMember(memberId);
    if (!member) {
      throw new EventsError(
        401,
        'INVALID_IDENTITY',
        'The selected development identity is not available.'
      );
    }
    if (member.status !== 'active') {
      throw new EventsError(
        403,
        'ACCOUNT_NOT_ACTIVE',
        'Only active members can change event registrations.'
      );
    }
    return member;
  }

  router.get(
    '/',
    asyncRoute(async (req, res) => {
      try {
        const member = await resolveMember(req, false);
        const events = service.listEvents(
          {
            q: req.query.q,
            category: req.query.category,
            mode: req.query.mode,
            status: req.query.status
          },
          member?.id
        );
        return sendSuccess(res, events, 200, { total: events.length });
      } catch (error) {
        return sendEventsError(res, error);
      }
    })
  );

  router.get(
    '/:id',
    asyncRoute(async (req, res) => {
      try {
        const member = await resolveMember(req, false);
        const event = service.getEventById(req.params.id, member?.id);
        if (!event) {
          throw new EventsError(404, 'EVENT_NOT_FOUND', 'The requested event was not found.');
        }
        return sendSuccess(res, event);
      } catch (error) {
        return sendEventsError(res, error);
      }
    })
  );

  router.post(
    '/:id/registrations',
    asyncRoute(async (req, res) => {
      try {
        const member = await resolveMember(req, true);
        const result = service.register(req.params.id, member.id, req.body?.role);
        return sendSuccess(res, result.registration, result.created ? 201 : 200);
      } catch (error) {
        return sendEventsError(res, error);
      }
    })
  );

  router.delete(
    '/:id/registrations',
    asyncRoute(async (req, res) => {
      try {
        const member = await resolveMember(req, true);
        return sendSuccess(res, service.cancelRegistration(req.params.id, member.id));
      } catch (error) {
        return sendEventsError(res, error);
      }
    })
  );

  return router;
}

const router = createEventsRouter();

export default router;
