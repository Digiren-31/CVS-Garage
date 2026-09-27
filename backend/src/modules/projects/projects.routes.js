import { Router } from 'express';
import { asyncRoute, sendError, sendSuccess } from '../../lib/http.js';
import { memberService } from '../../integrations/member.service.js';
import { ProjectsError, projectsService } from './projects.service.js';

const router = Router();

function validationError(res, message, details) {
  return sendError(res, 400, 'VALIDATION_ERROR', message, details);
}

function getSingleQueryValue(req, res, name, maxLength) {
  const value = req.query[name];
  if (value === undefined) {
    return '';
  }
  if (typeof value !== 'string' || value.length > maxLength) {
    validationError(res, `${name} must be a single text value no longer than ${maxLength} characters.`, {
      field: name,
      maxLength
    });
    return null;
  }
  return value.trim();
}

function validatePathIdentifier(res, value, field) {
  if (typeof value !== 'string' || value.length < 1 || value.length > 100) {
    validationError(res, `${field} must be a valid identifier.`, { field });
    return false;
  }
  return true;
}

async function getRequiredActor(req, res, action) {
  const userId = req.headers['x-user-id'];
  const actor = await memberService.verifyAuth(req);
  if (typeof userId !== 'string' || !userId.trim() || !actor) {
    sendError(
      res,
      401,
      'UNAUTHORIZED',
      `Choose a valid active development identity to ${action}.`
    );
    return null;
  }
  return actor;
}

router.get(
  '/',
  asyncRoute(async (req, res) => {
    const query = getSingleQueryValue(req, res, 'q', 100);
    if (query === null) {
      return undefined;
    }
    const status = getSingleQueryValue(req, res, 'status', 30);
    if (status === null) {
      return undefined;
    }
    const category = getSingleQueryValue(req, res, 'category', 60);
    if (category === null) {
      return undefined;
    }
    if (status && !projectsService.isAllowedProjectStatus(status)) {
      return validationError(res, 'Status is not a supported project status.', {
        field: 'status',
        allowedValues: ['planning', 'active', 'on_hold', 'completed', 'showcase']
      });
    }

    const projects = await projectsService.listProjects({ query, status, category });
    return sendSuccess(res, projects, 200, { total: projects.length });
  })
);

router.get(
  '/:id',
  asyncRoute(async (req, res) => {
    if (!validatePathIdentifier(res, req.params.id, 'id')) {
      return undefined;
    }

    const project = await projectsService.getProjectById(req.params.id);
    if (!project) {
      return sendError(
        res,
        404,
        'PROJECT_NOT_FOUND',
        'The requested project was not found.'
      );
    }
    return sendSuccess(res, project);
  })
);

router.post(
  '/',
  asyncRoute(async (req, res) => {
    const actor = await getRequiredActor(req, res, 'propose a project');
    if (!actor) {
      return undefined;
    }

    const project = await projectsService.createProject(req.body, actor);
    return sendSuccess(res, project, 201);
  })
);

router.patch(
  '/:id/milestones/:milestoneId',
  asyncRoute(async (req, res) => {
    if (
      !validatePathIdentifier(res, req.params.id, 'id') ||
      !validatePathIdentifier(res, req.params.milestoneId, 'milestoneId')
    ) {
      return undefined;
    }

    const actor = await getRequiredActor(req, res, 'update a milestone');
    if (!actor) {
      return undefined;
    }

    const project = await projectsService.updateMilestone(
      req.params.id,
      req.params.milestoneId,
      req.body?.status,
      actor
    );
    return sendSuccess(res, project);
  })
);

router.use((error, _req, res, next) => {
  if (error instanceof ProjectsError) {
    return sendError(res, error.statusCode, error.code, error.message, error.details);
  }
  return next(error);
});

export default router;
