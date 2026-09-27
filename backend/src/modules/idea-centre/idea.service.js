import { randomUUID } from 'node:crypto';
import { memberService } from '../../integrations/member.service.js';
import { ideaStore } from './idea.store.js';

const DIFFICULTIES = new Set(['Easy', 'Medium', 'Hard']);

export class IdeaCentreError extends Error {
  constructor(statusCode, code, message, details) {
    super(message);
    this.name = 'IdeaCentreError';
    this.statusCode = statusCode;
    this.code = code;
    this.details = details;
  }
}

function requiredText(value, field, { min = 1, max = 5000 } = {}) {
  if (typeof value !== 'string' || value.trim().length < min || value.trim().length > max) {
    throw new IdeaCentreError(
      400,
      'VALIDATION_ERROR',
      `${field} must be between ${min} and ${max} characters.`
    );
  }
  return value.trim();
}

function stringList(value, field) {
  if (!Array.isArray(value) || value.length === 0 || value.length > 12) {
    throw new IdeaCentreError(
      400,
      'VALIDATION_ERROR',
      `${field} must contain between 1 and 12 values.`
    );
  }

  const values = [...new Set(value.map((item) => requiredText(item, field, { max: 60 })))];
  if (values.length === 0) {
    throw new IdeaCentreError(400, 'VALIDATION_ERROR', `${field} cannot be empty.`);
  }
  return values;
}

function normalizeFilter(value) {
  return typeof value === 'string' ? value.trim().toLocaleLowerCase() : '';
}

export class IdeaService {
  constructor(store = ideaStore) {
    this.store = store;
    this.store.exportQueue ||= Promise.resolve();
  }

  get state() {
    return this.store.state;
  }

  findIdea(ideaId) {
    const idea = this.state.ideas.find(
      (candidate) => candidate.id === ideaId || candidate.ticketCode === ideaId
    );
    if (!idea) {
      throw new IdeaCentreError(404, 'IDEA_NOT_FOUND', 'The requested idea was not found.');
    }
    return idea;
  }

  nextTicketCode() {
    let sequence = Number.isInteger(this.state.nextTicketNumber)
      ? this.state.nextTicketNumber
      : 100;
    let ticketCode = `IDEA-2026-${sequence}`;
    while (this.state.ideas.some((idea) => idea.id === ticketCode)) {
      sequence += 1;
      ticketCode = `IDEA-2026-${sequence}`;
    }
    this.state.nextTicketNumber = sequence + 1;
    return ticketCode;
  }

  async enrichIdea(idea, currentUserId = null) {
    const [owner, mentor] = await Promise.all([
      memberService.getMemberById(idea.ownerId),
      idea.assignedMentorId ? memberService.getMemberById(idea.assignedMentorId) : null
    ]);
    const comments = await Promise.all(
      this.state.comments
        .filter((comment) => comment.ideaId === idea.id)
        .sort((left, right) => new Date(left.createdAt) - new Date(right.createdAt))
        .map(async (comment) => {
          const author = await memberService.getMemberById(comment.authorId);
          return {
            ...comment,
            authorName: author?.name || 'College member'
          };
        })
    );
    const request = currentUserId
      ? this.state.joinRequests.find(
          (candidate) =>
            candidate.ideaId === idea.id && candidate.memberId === currentUserId
        )
      : null;

    return {
      id: idea.id,
      ticketCode: idea.ticketCode,
      title: idea.title,
      tagline: idea.tagline,
      description: idea.description,
      track: idea.track,
      difficulty: idea.difficulty,
      status: idea.status,
      ownerId: idea.ownerId,
      ownerName: owner?.name || idea.ownerName || 'College member',
      assignedMentorId: idea.assignedMentorId || null,
      assignedMentorName: mentor?.name || idea.assignedMentorName || null,
      seekingMentor: Boolean(idea.seekingMentor),
      targetTeamSize: idea.targetTeamSize,
      memberIds: [...idea.memberIds],
      techStack: [...idea.techStack],
      savedByCurrentUser: Boolean(
        currentUserId &&
          this.state.saves.some(
            (save) => save.ideaId === idea.id && save.memberId === currentUserId
          )
      ),
      joinRequestStatus: request?.status || null,
      comments,
      ...(idea.sourceForumPostId
        ? { sourceForumPostId: idea.sourceForumPostId }
        : {}),
      createdAt: idea.createdAt
    };
  }

  async listIdeas(filters = {}, currentUserId = null) {
    const query = normalizeFilter(filters.q);
    const track = normalizeFilter(filters.track);
    const difficulty = normalizeFilter(filters.difficulty);
    const status = normalizeFilter(filters.status);
    const enriched = await Promise.all(
      this.state.ideas.map((idea) => this.enrichIdea(idea, currentUserId))
    );

    return enriched
      .filter((idea) => {
        const searchable = [
          idea.ticketCode,
          idea.title,
          idea.tagline,
          idea.description,
          idea.track,
          idea.ownerName,
          ...idea.techStack
        ]
          .join(' ')
          .toLocaleLowerCase();
        return (
          (!query || searchable.includes(query)) &&
          (!track || idea.track.toLocaleLowerCase() === track) &&
          (!difficulty || idea.difficulty.toLocaleLowerCase() === difficulty) &&
          (!status || idea.status.toLocaleLowerCase() === status)
        );
      })
      .sort((left, right) => new Date(right.createdAt) - new Date(left.createdAt));
  }

  validateCreateInput(input) {
    const difficulty = requiredText(input?.difficulty, 'difficulty', { max: 20 });
    if (!DIFFICULTIES.has(difficulty)) {
      throw new IdeaCentreError(
        400,
        'VALIDATION_ERROR',
        'difficulty must be Easy, Medium, or Hard.'
      );
    }
    if (
      !Number.isInteger(input?.targetTeamSize) ||
      input.targetTeamSize < 2 ||
      input.targetTeamSize > 12
    ) {
      throw new IdeaCentreError(
        400,
        'VALIDATION_ERROR',
        'targetTeamSize must be a whole number between 2 and 12.'
      );
    }
    if (typeof input?.seekingMentor !== 'boolean') {
      throw new IdeaCentreError(
        400,
        'VALIDATION_ERROR',
        'seekingMentor must be true or false.'
      );
    }

    return {
      title: requiredText(input.title, 'title', { min: 3, max: 120 }),
      tagline: requiredText(input.tagline, 'tagline', { min: 3, max: 180 }),
      description: requiredText(input.description, 'description', { min: 10, max: 5000 }),
      track: requiredText(input.track, 'track', { min: 2, max: 80 }),
      difficulty,
      targetTeamSize: input.targetTeamSize,
      techStack: stringList(input.techStack, 'techStack'),
      seekingMentor: input.seekingMentor
    };
  }

  async createIdea(input, owner) {
    const validated = this.validateCreateInput(input);
    const ticketCode = this.nextTicketCode();
    const idea = {
      id: ticketCode,
      ticketCode,
      ...validated,
      status: 'Open',
      ownerId: owner.id,
      assignedMentorId: null,
      memberIds: [owner.id],
      createdAt: new Date().toISOString()
    };
    this.state.ideas.push(idea);
    this.store.persist();
    return this.enrichIdea(idea, owner.id);
  }

  toggleSave(ideaId, memberId) {
    this.findIdea(ideaId);
    const index = this.state.saves.findIndex(
      (save) => save.ideaId === ideaId && save.memberId === memberId
    );
    let saved;
    if (index >= 0) {
      this.state.saves.splice(index, 1);
      saved = false;
    } else {
      this.state.saves.push({
        ideaId,
        memberId,
        createdAt: new Date().toISOString()
      });
      saved = true;
    }
    this.store.persist();
    return { ideaId, saved };
  }

  async requestJoin(ideaId, input, member) {
    const idea = this.findIdea(ideaId);
    const message = requiredText(input?.message, 'message', { min: 5, max: 500 });

    if (idea.ownerId === member.id) {
      throw new IdeaCentreError(
        409,
        'OWNER_CANNOT_JOIN',
        'The idea owner is already part of this team.'
      );
    }
    if (idea.memberIds.includes(member.id)) {
      throw new IdeaCentreError(409, 'ALREADY_A_MEMBER', 'You are already part of this team.');
    }
    if (idea.status !== 'Open') {
      throw new IdeaCentreError(
        409,
        'IDEA_NOT_OPEN',
        'Join requests are only accepted for open ideas.'
      );
    }
    if (idea.memberIds.length >= idea.targetTeamSize) {
      throw new IdeaCentreError(409, 'TEAM_FULL', 'This idea team is already at capacity.');
    }
    if (
      this.state.joinRequests.some(
        (request) => request.ideaId === idea.id && request.memberId === member.id
      )
    ) {
      throw new IdeaCentreError(
        409,
        'DUPLICATE_JOIN_REQUEST',
        'You have already requested to join this idea.'
      );
    }

    this.state.joinRequests.push({
      id: `join-${randomUUID()}`,
      ideaId: idea.id,
      memberId: member.id,
      message,
      status: 'Pending',
      createdAt: new Date().toISOString()
    });
    this.store.persist();
    return this.enrichIdea(idea, member.id);
  }

  async addComment(ideaId, input, member) {
    const idea = this.findIdea(ideaId);
    const content = requiredText(input?.content, 'content', { max: 1000 });
    this.state.comments.push({
      id: `idea-comment-${randomUUID()}`,
      ideaId: idea.id,
      authorId: member.id,
      content,
      createdAt: new Date().toISOString()
    });
    this.store.persist();
    return this.enrichIdea(idea, member.id);
  }

  async exportForumIdea(payload) {
    const operation = this.store.exportQueue.then(() =>
      this.performForumExport(payload)
    );
    this.store.exportQueue = operation.then(
      () => undefined,
      () => undefined
    );
    return operation;
  }

  async performForumExport(payload) {
    const sourceForumPostId = requiredText(
      payload?.sourceForumPostId,
      'sourceForumPostId',
      { max: 120 }
    );
    const existing = this.state.ideas.find(
      (idea) => idea.sourceForumPostId === sourceForumPostId
    );
    if (existing) {
      return this.toForumExport(existing, {
        success: false,
        alreadyExported: true,
        message: 'This discussion has already been exported to the Idea Centre.'
      });
    }

    const owner = await memberService.getMemberById(payload.authorMemberId);
    if (!owner) {
      throw new IdeaCentreError(
        400,
        'INVALID_AUTHOR',
        'The Forum export author is not a recognized member.'
      );
    }

    const problem = requiredText(payload.problemStatement, 'problemStatement', {
      min: 3,
      max: 5000
    });
    const solution = requiredText(payload.proposedSolution, 'proposedSolution', {
      min: 3,
      max: 5000
    });
    const expectedImpact =
      typeof payload.expectedImpact === 'string' && payload.expectedImpact.trim()
        ? payload.expectedImpact.trim().slice(0, 180)
        : 'Community discussion ready for incubation';
    const tags = Array.isArray(payload.tags)
      ? [
          ...new Set(
            payload.tags
              .filter((tag) => typeof tag === 'string' && tag.trim())
              .map((tag) => tag.trim().slice(0, 60))
          )
        ].slice(0, 12)
      : [];
    const title = requiredText(payload.title, 'title', { min: 3, max: 120 });
    const ticketCode = this.nextTicketCode();
    const idea = {
      id: ticketCode,
      ticketCode,
      title,
      tagline: expectedImpact,
      description: `${problem}\n\nProposed solution\n\n${solution}`,
      track: 'Community Innovation',
      difficulty: 'Medium',
      status: 'Open',
      ownerId: owner.id,
      assignedMentorId: null,
      seekingMentor: true,
      targetTeamSize: 5,
      memberIds: [owner.id],
      techStack: tags.length > 0 ? tags : ['Community proposal'],
      sourceForumPostId,
      exportStatus: 'created',
      createdAt: payload.createdAt || new Date().toISOString()
    };
    this.state.ideas.push(idea);
    this.store.persist();
    return this.toForumExport(idea, {
      success: true,
      alreadyExported: false,
      message: 'Successfully exported discussion to Idea Centre.'
    });
  }

  getForumIdea(sourceForumPostId) {
    const idea = this.state.ideas.find(
      (candidate) => candidate.sourceForumPostId === sourceForumPostId
    );
    return idea ? this.toForumExport(idea) : null;
  }

  toForumExport(idea, extra = {}) {
    return {
      ...extra,
      ideaId: idea.id,
      ideaUrl: `/idea-centre/ideas/${idea.id}`,
      sourceForumPostId: idea.sourceForumPostId,
      status: idea.exportStatus || idea.status.toLocaleLowerCase().replaceAll(' ', '_'),
      title: idea.title,
      authorMemberId: idea.ownerId,
      exportedAt: idea.createdAt
    };
  }
}

export const ideaService = new IdeaService();
