import { memberStore } from './member.store.js';

const ALLOWED_STATUSES = new Set(['active', 'pending', 'suspended']);

function clone(value) {
  return structuredClone(value);
}

function storedMembers() {
  return memberStore.state.members;
}

function includesTerm(value, term) {
  return typeof value === 'string' && value.toLocaleLowerCase().includes(term);
}

export function isAdministrator(member) {
  return Boolean(
    member &&
      member.status === 'active' &&
      (member.role === 'Admin' || member.roles?.includes('Admin'))
  );
}

export class MemberCentreError extends Error {
  constructor(statusCode, code, message, details) {
    super(message);
    this.name = 'MemberCentreError';
    this.statusCode = statusCode;
    this.code = code;
    this.details = details;
  }
}

export class MemberCentreService {
  async getMemberById(memberId) {
    const member = storedMembers().find((candidate) => candidate.id === memberId);
    return member ? clone(member) : null;
  }

  async getAllMembers() {
    return clone(storedMembers());
  }

  async searchMembers(query = '') {
    const term = query.trim().toLocaleLowerCase();
    const members = storedMembers();

    if (!term) {
      return clone(members);
    }

    return clone(
      members.filter((member) =>
        [
          member.name,
          member.email,
          member.department,
          member.batch,
          member.role,
          member.bio,
          ...(member.roles || []),
          ...(member.skills || []),
          ...(member.mentorExpertise || [])
        ].some((value) => includesTerm(value, term))
      )
    );
  }

  async getMentors(filter = {}) {
    const expertise =
      typeof filter.expertise === 'string' ? filter.expertise.trim().toLocaleLowerCase() : '';
    const department =
      typeof filter.department === 'string' ? filter.department.trim().toLocaleLowerCase() : '';

    return clone(
      storedMembers().filter(
        (member) =>
          member.status === 'active' &&
          member.isMentor &&
          (!expertise ||
            member.mentorExpertise?.some((item) => item.toLocaleLowerCase().includes(expertise))) &&
          (!department || member.department.toLocaleLowerCase().includes(department))
      )
    );
  }

  async getStats() {
    const members = storedMembers();
    return {
      totalMembers: members.length,
      activeMembers: members.filter((member) => member.status === 'active').length,
      mentors: members.filter((member) => member.isMentor).length,
      pendingMembers: members.filter((member) => member.status === 'pending').length,
      suspendedMembers: members.filter((member) => member.status === 'suspended').length
    };
  }

  async resolveIdentity(req) {
    const header = req?.headers?.['x-user-id'];
    if (Array.isArray(header)) {
      return null;
    }

    const memberId =
      typeof header === 'string' && header.trim() ? header.trim() : 'mem-student-1';
    const member = storedMembers().find((candidate) => candidate.id === memberId);
    return member?.status === 'active' ? clone(member) : null;
  }

  async updateStatus(memberId, status, actor) {
    this.assertAdministrator(actor);
    if (!ALLOWED_STATUSES.has(status)) {
      throw new MemberCentreError(400, 'VALIDATION_ERROR', 'Status must be active, pending, or suspended.', {
        field: 'status',
        allowedValues: [...ALLOWED_STATUSES]
      });
    }

    const target = this.findMutableMember(memberId);
    this.assertSafeTarget(target, actor, status);

    target.status = status;
    memberStore.persist();
    return clone(target);
  }

  async setMentor(memberId, enabled, actor) {
    this.assertAdministrator(actor);
    if (typeof enabled !== 'boolean') {
      throw new MemberCentreError(400, 'VALIDATION_ERROR', 'Enabled must be a boolean.', {
        field: 'enabled'
      });
    }

    const target = this.findMutableMember(memberId);
    this.assertSafeTarget(target, actor);

    const roles = new Set(target.roles || [target.role]);
    if (enabled) {
      roles.add('Mentor');
      target.isMentor = true;
      target.role = 'Mentor';
    } else {
      roles.delete('Mentor');
      target.isMentor = false;
      target.mentorExpertise = [];
      target.role = [...roles][0] || 'Student';
      roles.add(target.role);
    }
    target.roles = [...roles];

    memberStore.persist();
    return clone(target);
  }

  assertAdministrator(actor) {
    if (!actor) {
      throw new MemberCentreError(
        401,
        'UNAUTHORIZED',
        'Choose a valid active development identity to continue.'
      );
    }
    if (!isAdministrator(actor)) {
      throw new MemberCentreError(
        403,
        'FORBIDDEN',
        'Administrator access is required for this member action.'
      );
    }
  }

  findMutableMember(memberId) {
    const target = storedMembers().find((member) => member.id === memberId);
    if (!target) {
      throw new MemberCentreError(404, 'MEMBER_NOT_FOUND', 'The requested member was not found.');
    }
    return target;
  }

  assertSafeTarget(target, actor, nextStatus) {
    if (target.id === actor.id) {
      throw new MemberCentreError(
        409,
        'SELF_MUTATION_NOT_ALLOWED',
        'Administrators cannot change their own account status or roles.'
      );
    }

    const targetIsAdmin = target.role === 'Admin' || target.roles?.includes('Admin');
    if (!targetIsAdmin) {
      return;
    }

    const activeAdminCount = storedMembers().filter(isAdministrator).length;
    if (nextStatus && nextStatus !== 'active' && target.status === 'active' && activeAdminCount <= 1) {
      throw new MemberCentreError(
        409,
        'LAST_ADMIN_REQUIRED',
        'At least one active administrator must remain.'
      );
    }

    throw new MemberCentreError(
      409,
      'ADMIN_TARGET_PROTECTED',
      'Administrator accounts cannot be changed through Member Centre actions.'
    );
  }
}

export const memberCentreService = new MemberCentreService();
