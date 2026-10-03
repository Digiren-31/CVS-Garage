import { memberStore } from './member.store.js';
import { getSupabaseConfig, isSupabaseEnabled } from '../../lib/config.js';
import { getSupabaseAdminClient } from '../../lib/supabase.js';
import { supabaseMemberRepository } from './member.repository.js';

const ALLOWED_STATUSES = new Set(['active', 'pending', 'suspended']);

function profileText(value, field, minLength, maxLength, { optional = false } = {}) {
  if (optional && (value === undefined || value === null || value === '')) {
    return '';
  }
  if (typeof value !== 'string') {
    throw new MemberCentreError(400, 'VALIDATION_ERROR', `${field} must be text.`, {
      field
    });
  }
  const normalized = value.trim();
  if (normalized.length < minLength || normalized.length > maxLength) {
    throw new MemberCentreError(
      400,
      'VALIDATION_ERROR',
      `${field} must contain between ${minLength} and ${maxLength} characters.`,
      { field, minLength, maxLength }
    );
  }
  return normalized;
}

function validateProfileInput(input) {
  if (!input || typeof input !== 'object' || Array.isArray(input)) {
    throw new MemberCentreError(
      400,
      'VALIDATION_ERROR',
      'The profile update must be a JSON object.'
    );
  }
  if (!Array.isArray(input.skills) || input.skills.length > 20) {
    throw new MemberCentreError(
      400,
      'VALIDATION_ERROR',
      'Skills must contain no more than 20 values.',
      { field: 'skills', maxItems: 20 }
    );
  }
  const skills = [...new Set(input.skills.map((skill) =>
    profileText(skill, 'skills', 1, 50)
  ))];

  let avatarUrl;
  if (input.avatarUrl !== undefined && input.avatarUrl !== '') {
    const candidate = profileText(input.avatarUrl, 'avatarUrl', 10, 1000);
    const projectUrl = getSupabaseConfig()?.url;
    if (
      !projectUrl ||
      !candidate.startsWith(`${projectUrl}/storage/v1/object/public/public-media/`)
    ) {
      throw new MemberCentreError(
        400,
        'VALIDATION_ERROR',
        'Avatar URL must reference an uploaded CVS Garage image.',
        { field: 'avatarUrl' }
      );
    }
    avatarUrl = candidate;
  }

  return {
    name: profileText(input.name, 'name', 2, 100),
    department: profileText(input.department, 'department', 2, 120),
    batch: profileText(input.batch, 'batch', 0, 80, { optional: true }),
    bio: profileText(input.bio, 'bio', 0, 1000, { optional: true }),
    skills,
    ...(avatarUrl ? { avatarUrl } : {})
  };
}

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
    if (isSupabaseEnabled()) {
      return supabaseMemberRepository.byId(memberId);
    }
    const member = storedMembers().find((candidate) => candidate.id === memberId);
    return member ? clone(member) : null;
  }

  async getAllMembers() {
    if (isSupabaseEnabled()) {
      return supabaseMemberRepository.all();
    }
    return clone(storedMembers());
  }

  async searchMembers(query = '') {
    const term = query.trim().toLocaleLowerCase();
    const members = isSupabaseEnabled()
      ? await supabaseMemberRepository.all()
      : storedMembers();

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

    const members = isSupabaseEnabled()
      ? await supabaseMemberRepository.all()
      : storedMembers();
    return clone(
      members.filter(
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
    const members = isSupabaseEnabled()
      ? await supabaseMemberRepository.all()
      : storedMembers();
    return {
      totalMembers: members.length,
      activeMembers: members.filter((member) => member.status === 'active').length,
      mentors: members.filter((member) => member.isMentor).length,
      pendingMembers: members.filter((member) => member.status === 'pending').length,
      suspendedMembers: members.filter((member) => member.status === 'suspended').length
    };
  }

  async resolveSession(req) {
    if (isSupabaseEnabled()) {
      if (Object.hasOwn(req, 'cvsGarageSession')) {
        return req.cvsGarageSession;
      }

      const authorization = req?.headers?.authorization;
      if (
        typeof authorization !== 'string' ||
        !authorization.startsWith('Bearer ') ||
        !authorization.slice(7).trim()
      ) {
        req.cvsGarageSession = null;
        return null;
      }

      const client = getSupabaseAdminClient();
      const { data, error } = await client.auth.getUser(authorization.slice(7).trim());
      const user = data?.user;
      const providers = user?.app_metadata?.providers || [user?.app_metadata?.provider];
      if (
        error ||
        !user?.email ||
        !user.email_confirmed_at ||
        !providers.includes('google')
      ) {
        req.cvsGarageSession = null;
        return null;
      }

      req.cvsAuthUser = user;
      let member = await supabaseMemberRepository.ensureForAuthUser(user);
      const config = getSupabaseConfig();
      if (user.email.toLowerCase() === config.bootstrapAdminEmail) {
        await supabaseMemberRepository.bootstrapFirstAdmin(user.id, user.email);
        member = await supabaseMemberRepository.byAuthUserId(user.id);
      }
      req.cvsGarageSession = member;
      return member;
    }

    const header = req?.headers?.['x-user-id'];
    if (Array.isArray(header)) {
      return null;
    }

    const memberId =
      typeof header === 'string' && header.trim() ? header.trim() : 'mem-student-1';
    const member = storedMembers().find((candidate) => candidate.id === memberId);
    return member ? clone(member) : null;
  }

  async resolveIdentity(req) {
    const member = await this.resolveSession(req);
    return member?.status === 'active' ? member : null;
  }

  async updateStatus(memberId, status, actor) {
    this.assertAdministrator(actor);
    if (!ALLOWED_STATUSES.has(status)) {
      throw new MemberCentreError(400, 'VALIDATION_ERROR', 'Status must be active, pending, or suspended.', {
        field: 'status',
        allowedValues: [...ALLOWED_STATUSES]
      });
    }

    if (isSupabaseEnabled()) {
      try {
        return await supabaseMemberRepository.updateStatus(actor.id, memberId, status);
      } catch (error) {
        throw this.repositoryError(error);
      }
    }

    const target = this.findMutableMember(memberId);
    this.assertSafeTarget(target, actor, status);

    target.status = status;
    await memberStore.persist();
    return clone(target);
  }

  async setMentor(memberId, enabled, actor) {
    return this.setRole(memberId, 'Mentor', enabled, actor);
  }

  async updateOwnProfile(input, actor) {
    if (!actor || actor.status !== 'active') {
      throw new MemberCentreError(
        401,
        'UNAUTHORIZED',
        'Sign in with an active account to update your profile.'
      );
    }
    if (actor.isDemo) {
      throw new MemberCentreError(
        409,
        'DEMO_PROFILE_READ_ONLY',
        'Imported demo profiles are read-only.'
      );
    }
    const profile = validateProfileInput(input);
    if (isSupabaseEnabled()) {
      try {
        return await supabaseMemberRepository.updateProfile(actor.id, profile);
      } catch (error) {
        throw this.repositoryError(error);
      }
    }

    const target = this.findMutableMember(actor.id);
    Object.assign(target, profile);
    await memberStore.persist();
    return clone(target);
  }

  async setRole(memberId, role, enabled, actor) {
    this.assertAdministrator(actor);
    if (typeof enabled !== 'boolean') {
      throw new MemberCentreError(400, 'VALIDATION_ERROR', 'Enabled must be a boolean.', {
        field: 'enabled'
      });
    }

    if (!['Mentor', 'Community Moderator'].includes(role)) {
      throw new MemberCentreError(
        400,
        'VALIDATION_ERROR',
        'Role must be Mentor or Community Moderator.',
        { field: 'role' }
      );
    }

    if (isSupabaseEnabled()) {
      try {
        return await supabaseMemberRepository.updateRole(
          actor.id,
          memberId,
          role,
          enabled
        );
      } catch (error) {
        throw this.repositoryError(error);
      }
    }

    const target = this.findMutableMember(memberId);
    this.assertSafeTarget(target, actor);

    const roles = new Set(target.roles || [target.role]);
    if (enabled) {
      roles.add(role);
    } else {
      roles.delete(role);
      if (role === 'Mentor') {
        target.mentorExpertise = [];
      }
    }
    roles.add('Student');
    target.roles = [...roles];
    target.isMentor = roles.has('Mentor');
    target.role =
      ['Admin', 'Community Moderator', 'Mentor', 'Student'].find((item) => roles.has(item)) ||
      'Student';

    await memberStore.persist();
    return clone(target);
  }

  async anonymize(memberId, actor) {
    this.assertAdministrator(actor);
    if (!isSupabaseEnabled()) {
      throw new MemberCentreError(
        409,
        'PRODUCTION_FEATURE_REQUIRED',
        'Profile anonymization is available only with Supabase persistence.'
      );
    }
    try {
      return await supabaseMemberRepository.anonymize(actor.id, memberId);
    } catch (error) {
      throw this.repositoryError(error);
    }
  }

  repositoryError(error) {
    const conflict = error?.code === '23000' || error?.code === '23505';
    const forbidden = error?.code === '42501';
    return new MemberCentreError(
      forbidden ? 403 : conflict ? 409 : error?.code === 'P0002' ? 404 : 500,
      forbidden
        ? 'FORBIDDEN'
        : conflict
          ? 'MEMBER_CONFLICT'
          : error?.code === 'P0002'
            ? 'MEMBER_NOT_FOUND'
            : 'MEMBER_PERSISTENCE_ERROR',
      error instanceof Error ? error.message : 'The member change could not be saved.'
    );
  }

  assertAdministrator(actor) {
    if (!actor) {
      throw new MemberCentreError(
        401,
        'UNAUTHORIZED',
        'Sign in with a valid active account to continue.'
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
