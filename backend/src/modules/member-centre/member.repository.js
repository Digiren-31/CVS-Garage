import { getSupabaseAdminClient } from '../../lib/supabase.js';

const ROLE_PRECEDENCE = ['Admin', 'Community Moderator', 'Mentor', 'Student'];

function primaryRole(roles) {
  return ROLE_PRECEDENCE.find((role) => roles.includes(role)) || 'Student';
}

export function toMember(row) {
  if (!row) {
    return null;
  }
  const roles = Array.isArray(row.roles) ? [...row.roles] : ['Student'];
  return {
    id: row.id,
    name: row.name,
    email: row.email,
    ...(row.avatar_url ? { avatarUrl: row.avatar_url } : {}),
    department: row.department,
    ...(row.batch ? { batch: row.batch } : {}),
    role: primaryRole(roles),
    roles,
    status: row.status,
    isMentor: roles.includes('Mentor'),
    mentorExpertise: row.mentor_expertise || [],
    bio: row.bio || '',
    skills: row.skills || [],
    stats: row.stats || {},
    reputationScore: row.reputation_score || 0,
    isDemo: Boolean(row.is_demo)
  };
}

function requireClient() {
  const client = getSupabaseAdminClient();
  if (!client) {
    throw new Error('Supabase member repository is unavailable.');
  }
  return client;
}

function throwRepositoryError(operation, error) {
  const failure = new Error(`${operation}: ${error.message}`);
  failure.code = error.code;
  failure.details = error.details;
  throw failure;
}

function rpcRow(data) {
  return Array.isArray(data) ? data[0] : data;
}

export class SupabaseMemberRepository {
  async all() {
    const { data, error } = await requireClient()
      .from('member_profiles')
      .select('*')
      .order('name', { ascending: true });
    if (error) {
      throwRepositoryError('Could not load member profiles', error);
    }
    return data.map(toMember);
  }

  async byId(memberId) {
    const { data, error } = await requireClient()
      .from('member_profiles')
      .select('*')
      .eq('id', memberId)
      .maybeSingle();
    if (error) {
      throwRepositoryError('Could not load the member profile', error);
    }
    return toMember(data);
  }

  async byAuthUserId(authUserId) {
    const { data, error } = await requireClient()
      .from('member_profiles')
      .select('*')
      .eq('auth_user_id', authUserId)
      .maybeSingle();
    if (error) {
      throwRepositoryError('Could not load the authenticated member profile', error);
    }
    return toMember(data);
  }

  async ensureForAuthUser(user) {
    const existing = await this.byAuthUserId(user.id);
    if (existing) {
      return existing;
    }

    const metadata = user.user_metadata || {};
    const name =
      String(metadata.full_name || metadata.name || '').trim() ||
      user.email?.split('@')[0] ||
      'New member';
    const { error } = await requireClient().from('member_profiles').upsert(
      {
        id: `mem-${user.id.replaceAll('-', '')}`,
        auth_user_id: user.id,
        email: user.email,
        name,
        avatar_url: metadata.avatar_url || metadata.picture || null,
        department: 'Not provided',
        status: 'pending',
        roles: ['Student'],
        is_demo: false
      },
      { onConflict: 'auth_user_id' }
    );
    if (error) {
      throwRepositoryError('Could not create the member profile', error);
    }
    return this.byAuthUserId(user.id);
  }

  async bootstrapFirstAdmin(authUserId, email) {
    const { data, error } = await requireClient().rpc('bootstrap_first_admin', {
      auth_user: authUserId,
      verified_email: email
    });
    if (error) {
      throwRepositoryError('Could not bootstrap the first administrator', error);
    }
    return Boolean(data);
  }

  async updateStatus(actorId, targetId, status) {
    const { data, error } = await requireClient().rpc('admin_set_member_status', {
      actor_id: actorId,
      target_id: targetId,
      next_status: status
    });
    if (error) {
      throwRepositoryError('Could not change the member status', error);
    }
    return toMember(rpcRow(data));
  }

  async updateRole(actorId, targetId, role, enabled) {
    const { data, error } = await requireClient().rpc('admin_set_member_role', {
      actor_id: actorId,
      target_id: targetId,
      role_name: role,
      enabled
    });
    if (error) {
      throwRepositoryError('Could not change the member role', error);
    }
    return toMember(rpcRow(data));
  }

  async updateProfile(memberId, profile) {
    const { data, error } = await requireClient()
      .from('member_profiles')
      .update({
        name: profile.name,
        department: profile.department,
        batch: profile.batch || null,
        bio: profile.bio,
        skills: profile.skills,
        ...(profile.avatarUrl ? { avatar_url: profile.avatarUrl } : {})
      })
      .eq('id', memberId)
      .eq('is_demo', false)
      .select('*')
      .single();
    if (error) {
      throwRepositoryError('Could not update the member profile', error);
    }
    return toMember(data);
  }

  async anonymize(actorId, targetId) {
    const { data, error } = await requireClient().rpc('admin_anonymize_member', {
      actor_id: actorId,
      target_id: targetId
    });
    if (error) {
      throwRepositoryError('Could not anonymize the member profile', error);
    }
    return toMember(rpcRow(data));
  }
}

export const supabaseMemberRepository = new SupabaseMemberRepository();
