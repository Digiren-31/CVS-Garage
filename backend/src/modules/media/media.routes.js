import { Router } from 'express';
import { asyncRoute, sendError, sendSuccess } from '../../lib/http.js';
import { MediaError, mediaService } from './media.service.js';

const router = Router();

function route(handler) {
  return asyncRoute(async (req, res) => {
    try {
      return await handler(req, res);
    } catch (error) {
      if (error instanceof MediaError) {
        return sendError(res, error.statusCode, error.code, error.message, error.details);
      }
      throw error;
    }
  });
}

router.post(
  '/upload-intents',
  route(async (req, res) => {
    const result = await mediaService.createUploadIntent(
      req.body,
      req.member,
      req.cvsAuthUser?.id
    );
    return sendSuccess(res, result, 201);
  })
);

router.post(
  '/:id/complete',
  route(async (req, res) =>
    sendSuccess(res, await mediaService.completeUpload(req.params.id, req.member))
  )
);

router.get(
  '/:id/url',
  route(async (req, res) =>
    sendSuccess(res, await mediaService.getUrl(req.params.id, req.member))
  )
);

router.delete(
  '/:id',
  route(async (req, res) =>
    sendSuccess(res, await mediaService.remove(req.params.id, req.member))
  )
);

export default router;
