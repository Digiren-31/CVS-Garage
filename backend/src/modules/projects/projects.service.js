import { randomUUID } from 'node:crypto';
import { projectsStore } from './projects.store.js';

const PROJECT_STATUSES = new Set(['planning', 'active', 'on_hold', 'completed', 'showcase']);
const MILESTONE_STATUSES = new Set(['planned', 'in_progress', 'completed']);

const CREATE_FIELDS = {
  name: { label: 'Name', minLength: 3, maxLength: 100 },
  tagline: { label: 'Tagline', minLength: 10, maxLength: 180 },
  description: { label: 'Description', minLength: 20, maxLength: 2000 },
  category: { label: 'Category', minLength: 2, maxLength: 60 }
};

function clone(value) {
  return structuredClone(value);
}

function normalizeSearchValue(value) {
  return typeof value === 'string' ? value.trim().toLocaleLowerCase() : '';
}

function includesTerm(value, term) {
  return typeof value === 'string' && value.toLocaleLowerCase().includes(term);
}

function slugify(value) {
  return value
    .normalize('NFKD')
    .replace(/[\u0300-\u036f]/g, '')
    .toLocaleLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '')
    .slice(0, 80);
}

function isAdministrator(member) {
  return Boolean(
    member &&
      member.status === 'active' &&
      (member.role === 'Admin' || member.roles?.includes('Admin'))
  );
}

function validateProjectInput(input) {
  if (!input || typeof input !== 'object' || Array.isArray(input)) {
    throw new ProjectsError(
      400,
      'VALIDATION_ERROR',
      'The request body must be a project object.',
      [{ field: 'body', message: 'Provide a JSON object.' }]
    );
  }

  const normalized = {};
  const details = [];

  for (const [field, rules] of Object.entries(CREATE_FIELDS)) {
    const value = input[field];
    if (typeof value !== 'string') {
      details.push({ field, message: `${rules.label} must be text.` });
      continue;
    }

    const trimmed = value.trim();
    if (trimmed.length < rules.minLength || trimmed.length > rules.maxLength) {
      details.push({
        field,
        message: `${rules.label} must contain between ${rules.minLength} and ${rules.maxLength} characters.`
      });
      continue;
    }
    normalized[field] = trimmed;
  }

  if (!Array.isArray(input.tags)) {
    details.push({ field: 'tags', message: 'Tags must be an array of text values.' });
  } else {
    const normalizedTags = input.tags
      .filter((tag) => typeof tag === 'string')
      .map((tag) => tag.trim());
    const uniqueTags = new Set(normalizedTags.map((tag) => tag.toLocaleLowerCase()));

    if (
      normalizedTags.length !== input.tags.length ||
      normalizedTags.some((tag) => tag.length < 1 || tag.length > 30)
    ) {
      details.push({
        field: 'tags',
        message: 'Every tag must contain between 1 and 30 characters.'
      });
    } else if (normalizedTags.length < 1 || normalizedTags.length > 8) {
      details.push({ field: 'tags', message: 'Provide between 1 and 8 tags.' });
    } else if (uniqueTags.size !== normalizedTags.length) {
      details.push({ field: 'tags', message: 'Tags must be unique.' });
    } else {
      normalized.tags = normalizedTags;
    }
  }

  if (details.length > 0) {
    throw new ProjectsError(
      400,
      'VALIDATION_ERROR',
      'Correct the highlighted project fields and try again.',
      details
    );
  }

  const slug = slugify(normalized.name);
  if (!slug) {
    throw new ProjectsError(
      400,
      'VALIDATION_ERROR',
      'Project name must include at least one letter or number.',
      [{ field: 'name', message: 'Use at least one Latin letter or number.' }]
    );
  }

  return { ...normalized, slug };
}

export class ProjectsError extends Error {
  constructor(statusCode, code, message, details) {
    super(message);
    this.name = 'ProjectsError';
    this.statusCode = statusCode;
    this.code = code;
    this.details = details;
  }
}

export class ProjectsService {
  constructor(store = projectsStore) {
    this.store = store;
  }

  async getAllProjects() {
    return clone(this.store.state.projects);
  }

  async getProjectById(projectId) {
    if (typeof projectId !== 'string') {
      return null;
    }
    const project = this.store.state.projects.find((candidate) => candidate.id === projectId);
    return project ? clone(project) : null;
  }

  async searchProjects(query = '') {
    const term = normalizeSearchValue(query);
    if (!term) {
      return this.getAllProjects();
    }

    return clone(
      this.store.state.projects.filter((project) =>
        [
          project.id,
          project.name,
          project.tagline,
          project.description,
          project.category,
          project.status,
          ...project.tags
        ].some((value) => includesTerm(value, term))
      )
    );
  }

  async listProjects({ query = '', status = '', category = '' } = {}) {
    const projects = await this.searchProjects(query);
    const normalizedCategory = normalizeSearchValue(category);

    return projects.filter(
      (project) =>
        (!status || project.status === status) &&
        (!normalizedCategory ||
          project.category.toLocaleLowerCase() === normalizedCategory)
    );
  }

  async createProject(input, actor) {
    if (!actor || actor.status !== 'active') {
      throw new ProjectsError(
        401,
        'UNAUTHORIZED',
        'Choose a valid active development identity to propose a project.'
      );
    }

    const projectInput = validateProjectInput(input);
    const duplicate = this.store.state.projects.some(
      (project) =>
        project.slug === projectInput.slug ||
        project.name.toLocaleLowerCase() === projectInput.name.toLocaleLowerCase()
    );
    if (duplicate) {
      throw new ProjectsError(
        409,
        'PROJECT_CONFLICT',
        'A project with this name already exists.'
      );
    }

    const project = {
      id: `PRJ-${randomUUID()}`,
      slug: projectInput.slug,
      name: projectInput.name,
      tagline: projectInput.tagline,
      description: projectInput.description,
      category: projectInput.category,
      status: 'planning',
      progress: 0,
      leaderId: actor.id,
      memberIds: [actor.id],
      membersCount: 1,
      tags: projectInput.tags,
      milestones: [],
      createdAt: new Date().toISOString()
    };

    this.store.state.projects.unshift(project);
    this.store.persist();
    return clone(project);
  }

  async updateMilestone(projectId, milestoneId, status, actor) {
    if (!actor || actor.status !== 'active') {
      throw new ProjectsError(
        401,
        'UNAUTHORIZED',
        'Choose a valid active development identity to update a milestone.'
      );
    }
    if (!MILESTONE_STATUSES.has(status)) {
      throw new ProjectsError(
        400,
        'VALIDATION_ERROR',
        'Milestone status must be planned, in_progress, or completed.',
        {
          field: 'status',
          allowedValues: [...MILESTONE_STATUSES]
        }
      );
    }

    const project = this.store.state.projects.find((candidate) => candidate.id === projectId);
    if (!project) {
      throw new ProjectsError(404, 'PROJECT_NOT_FOUND', 'The requested project was not found.');
    }
    if (project.leaderId !== actor.id && !isAdministrator(actor)) {
      throw new ProjectsError(
        403,
        'FORBIDDEN',
        'Only the project leader or an administrator can update milestones.'
      );
    }

    const milestone = project.milestones.find((candidate) => candidate.id === milestoneId);
    if (!milestone) {
      throw new ProjectsError(
        404,
        'MILESTONE_NOT_FOUND',
        'The requested milestone was not found.'
      );
    }

    milestone.status = status;
    const completedCount = project.milestones.filter(
      (candidate) => candidate.status === 'completed'
    ).length;
    project.progress =
      project.milestones.length === 0
        ? 0
        : Math.round((completedCount / project.milestones.length) * 100);
    this.store.persist();
    return clone(project);
  }

  isAllowedProjectStatus(status) {
    return PROJECT_STATUSES.has(status);
  }
}

export const projectsService = new ProjectsService();
