import type {
  ApiResponse,
  CreateIdeaInput,
  CreateProjectInput,
  DashboardSummary,
  Event,
  EventRegistration,
  ForumPost,
  ForumReply,
  Idea,
  LeaderboardResponse,
  ManagedMemberRole,
  MediaAsset,
  MediaCategory,
  MediaUploadIntent,
  Member,
  MemberStats,
  Project,
  UpdateMemberProfileInput
} from '../../contracts/src';
import { createClient, type Session } from '@supabase/supabase-js';

type QueryValue = string | number | boolean | null | undefined;
type AuthMode = 'demo' | 'supabase' | 'misconfigured';
type RealtimeTopic = 'forum' | 'events' | 'projects';

interface RuntimeEnvironment {
  VITE_SUPABASE_URL?: string;
  VITE_SUPABASE_PUBLISHABLE_KEY?: string;
  PROD?: boolean;
  MODE?: string;
}

const runtimeEnvironment = (
  import.meta as ImportMeta & { readonly env?: RuntimeEnvironment }
).env;

function configuredSupabase() {
  if (runtimeEnvironment?.MODE === 'test') {
    return null;
  }
  const url = runtimeEnvironment?.VITE_SUPABASE_URL?.trim();
  const publishableKey = runtimeEnvironment?.VITE_SUPABASE_PUBLISHABLE_KEY?.trim();
  return url && publishableKey ? { url, publishableKey } : null;
}

export class ApiClientError extends Error {
  constructor(
    message: string,
    readonly status: number,
    readonly code: string,
    readonly details?: unknown
  ) {
    super(message);
    this.name = 'ApiClientError';
  }
}

function buildQuery(values: Record<string, QueryValue> = {}) {
  const query = new URLSearchParams();
  Object.entries(values).forEach(([key, value]) => {
    if (value !== undefined && value !== null && value !== '') {
      query.set(key, String(value));
    }
  });
  const serialized = query.toString();
  return serialized ? `?${serialized}` : '';
}

class CvsGarageApiClient {
  private currentUserId = this.readStoredUserId();
  private authenticatedUserId = '';
  private readonly supabaseConfig = configuredSupabase();
  private readonly authMode: AuthMode = this.supabaseConfig
    ? 'supabase'
    : runtimeEnvironment?.PROD
      ? 'misconfigured'
      : 'demo';
  private supabaseClient: ReturnType<typeof createClient> | null = null;

  private getSupabaseClient() {
    if (!this.supabaseConfig || typeof window === 'undefined') {
      return null;
    }
    this.supabaseClient ||= createClient(
      this.supabaseConfig.url,
      this.supabaseConfig.publishableKey,
      {
        auth: {
          autoRefreshToken: true,
          detectSessionInUrl: true,
          flowType: 'pkce',
          persistSession: true
        },
        global: {
          headers: {
            'X-Client-Info': 'cvs-garage-portal'
          }
        }
      }
    );
    return this.supabaseClient;
  }

  private readStoredUserId() {
    if (typeof window === 'undefined') {
      return 'mem-student-1';
    }
    try {
      return window.localStorage.getItem('cvs-garage-user-id') || 'mem-student-1';
    } catch {
      return 'mem-student-1';
    }
  }

  getUserId() {
    return this.authMode === 'supabase'
      ? this.authenticatedUserId
      : this.currentUserId;
  }

  setAuthenticatedUserId(userId: string | null) {
    this.authenticatedUserId = userId || '';
  }

  setUserId(userId: string) {
    this.currentUserId = userId;
    if (typeof window !== 'undefined') {
      try {
        window.localStorage.setItem('cvs-garage-user-id', userId);
      } catch {
        // Identity selection still applies for the current session.
      }
      window.dispatchEvent(new CustomEvent('cvs-garage-user-change', { detail: userId }));
    }
  }

  async request<T>(path: string, init: RequestInit = {}): Promise<T> {
    if (this.authMode === 'misconfigured') {
      throw new ApiClientError(
        'Production authentication is not configured. Contact the portal administrator.',
        0,
        'AUTH_CONFIGURATION_ERROR'
      );
    }

    const headers = new Headers(init.headers);
    if (!headers.has('Content-Type') && init.body) {
      headers.set('Content-Type', 'application/json');
    }
    if (this.authMode === 'supabase') {
      const client = this.getSupabaseClient();
      if (!client) {
        throw new ApiClientError(
          'Supabase authentication is unavailable in this browser.',
          0,
          'AUTH_CONFIGURATION_ERROR'
        );
      }
      const { data, error } = await client.auth.getSession();
      if (error) {
        throw new ApiClientError(error.message, 0, 'AUTH_SESSION_ERROR');
      }
      if (data.session?.access_token) {
        headers.set('Authorization', `Bearer ${data.session.access_token}`);
      }
    } else {
      headers.set('x-user-id', this.currentUserId);
    }

    let response: Response;
    try {
      response = await fetch(`/api/v1${path}`, {
        ...init,
        headers
      });
    } catch (cause) {
      throw new ApiClientError(
        'The portal could not reach the backend. Check that the API server is running.',
        0,
        'NETWORK_ERROR',
        cause instanceof Error ? cause.message : undefined
      );
    }

    let envelope: ApiResponse<T>;
    try {
      envelope = (await response.json()) as ApiResponse<T>;
    } catch {
      throw new ApiClientError('The server returned an unreadable response.', response.status, 'INVALID_RESPONSE');
    }

    if (!response.ok || !envelope.success || envelope.data === null) {
      throw new ApiClientError(
        envelope.error?.message || `Request failed with status ${response.status}.`,
        response.status,
        envelope.error?.code || 'REQUEST_FAILED',
        envelope.error?.details
      );
    }

    return envelope.data;
  }

  auth = {
    mode: () => this.authMode,
    getSession: async (): Promise<Session | null> => {
      const client = this.getSupabaseClient();
      if (!client) {
        return null;
      }
      const { data, error } = await client.auth.getSession();
      if (error) {
        throw new ApiClientError(error.message, 0, 'AUTH_SESSION_ERROR');
      }
      return data.session;
    },
    currentMember: () => this.request<Member>('/auth/session'),
    signInWithGoogle: async () => {
      const client = this.getSupabaseClient();
      if (!client) {
        throw new ApiClientError(
          'Google sign-in is not configured for this build.',
          0,
          'AUTH_CONFIGURATION_ERROR'
        );
      }
      try {
        const returnTo =
          `${window.location.pathname}${window.location.search}${window.location.hash}`;
        if (returnTo !== '/auth/callback') {
          window.sessionStorage.setItem('cvs-garage-auth-return-to', returnTo);
        }
      } catch (error) {
        console.warn('The requested sign-in return path could not be saved.', error);
      }
      const { data, error } = await client.auth.signInWithOAuth({
        provider: 'google',
        options: {
          redirectTo: `${window.location.origin}/auth/callback`,
          scopes: 'openid email profile'
        }
      });
      if (error) {
        throw new ApiClientError(error.message, 0, 'AUTH_SIGN_IN_ERROR');
      }
      return data;
    },
    signOut: async () => {
      const client = this.getSupabaseClient();
      if (!client) {
        return;
      }
      const { error } = await client.auth.signOut();
      if (error) {
        throw new ApiClientError(error.message, 0, 'AUTH_SIGN_OUT_ERROR');
      }
      this.setAuthenticatedUserId(null);
    },
    consumeReturnTo: () => {
      if (typeof window === 'undefined') {
        return '/';
      }
      try {
        const stored = window.sessionStorage.getItem('cvs-garage-auth-return-to');
        window.sessionStorage.removeItem('cvs-garage-auth-return-to');
        if (!stored || !stored.startsWith('/') || stored.startsWith('//')) {
          return '/';
        }
        const target = new URL(stored, window.location.origin);
        return target.origin === window.location.origin
          ? `${target.pathname}${target.search}${target.hash}`
          : '/';
      } catch (error) {
        console.warn('The sign-in return path could not be restored.', error);
        return '/';
      }
    },
    onChange: (listener: (session: Session | null) => void) => {
      const client = this.getSupabaseClient();
      if (!client) {
        return () => undefined;
      }
      const { data } = client.auth.onAuthStateChange((_event, session) => {
        listener(session);
      });
      return () => data.subscription.unsubscribe();
    }
  };

  dashboard = {
    get: () => this.request<DashboardSummary>('/dashboard')
  };

  members = {
    list: (query = '') => this.request<Member[]>(`/member-centre/members${buildQuery({ q: query })}`),
    stats: () => this.request<MemberStats>('/member-centre/stats'),
    current: () => this.request<Member>('/member-centre/me'),
    updateProfile: (input: UpdateMemberProfileInput) =>
      this.request<Member>('/member-centre/me', {
        method: 'PATCH',
        body: JSON.stringify(input)
      }),
    updateStatus: (memberId: string, status: Member['status']) =>
      this.request<Member>(`/member-centre/members/${memberId}/status`, {
        method: 'PATCH',
        body: JSON.stringify({ status })
      }),
    setMentor: (memberId: string, enabled: boolean) =>
      this.request<Member>(`/member-centre/members/${memberId}/mentor`, {
        method: 'PATCH',
        body: JSON.stringify({ enabled })
      }),
    setRole: (memberId: string, role: ManagedMemberRole, enabled: boolean) =>
      this.request<Member>(`/member-centre/members/${memberId}/role`, {
        method: 'PATCH',
        body: JSON.stringify({ role, enabled })
      }),
    anonymize: (memberId: string) =>
      this.request<Member>(`/member-centre/members/${memberId}/personal-data`, {
        method: 'DELETE'
      })
  };

  projects = {
    list: (query = '') => this.request<Project[]>(`/projects${buildQuery({ q: query })}`),
    get: (projectId: string) => this.request<Project>(`/projects/${projectId}`),
    create: (input: CreateProjectInput) =>
      this.request<Project>('/projects', { method: 'POST', body: JSON.stringify(input) }),
    updateMilestone: (projectId: string, milestoneId: string, status: Project['milestones'][number]['status']) =>
      this.request<Project>(`/projects/${projectId}/milestones/${milestoneId}`, {
        method: 'PATCH',
        body: JSON.stringify({ status })
      })
  };

  events = {
    list: (query = '') => this.request<Event[]>(`/events${buildQuery({ q: query })}`),
    get: (eventId: string) => this.request<Event>(`/events/${eventId}`),
    register: (eventId: string, role: EventRegistration['role'] = 'Participant') =>
      this.request<EventRegistration>(`/events/${eventId}/registrations`, {
        method: 'POST',
        body: JSON.stringify({ role })
      }),
    cancelRegistration: (eventId: string) =>
      this.request<{ eventId: string; cancelled: boolean }>(`/events/${eventId}/registrations`, {
        method: 'DELETE'
      })
  };

  ideas = {
    list: (query = '') => this.request<Idea[]>(`/idea-centre/ideas${buildQuery({ q: query })}`),
    create: (input: CreateIdeaInput) =>
      this.request<Idea>('/idea-centre/ideas', { method: 'POST', body: JSON.stringify(input) }),
    toggleSave: (ideaId: string) =>
      this.request<{ ideaId: string; saved: boolean }>(`/idea-centre/ideas/${ideaId}/save`, {
        method: 'POST'
      }),
    requestJoin: (ideaId: string, message: string) =>
      this.request<Idea>(`/idea-centre/ideas/${ideaId}/join-requests`, {
        method: 'POST',
        body: JSON.stringify({ message })
      }),
    addComment: (ideaId: string, content: string) =>
      this.request<Idea>(`/idea-centre/ideas/${ideaId}/comments`, {
        method: 'POST',
        body: JSON.stringify({ content })
      })
  };

  forum = {
    context: () =>
      this.request<{ currentUser: Member | null; availableProfiles: Member[] }>(
        '/forum/auth/me'
      ),
    posts: (filters: Record<string, QueryValue> = {}) =>
      this.request<ForumPost[]>(`/forum/posts${buildQuery(filters)}`),
    post: (postId: string) => this.request<ForumPost>(`/forum/posts/${postId}`),
    replies: (postId: string) => this.request<ForumReply[]>(`/forum/posts/${postId}/replies`),
    createPost: (input: Record<string, unknown>) =>
      this.request<ForumPost>('/forum/posts', { method: 'POST', body: JSON.stringify(input) }),
    createReply: (postId: string, content: string) =>
      this.request<ForumReply>(`/forum/posts/${postId}/replies`, {
        method: 'POST',
        body: JSON.stringify({ content })
      }),
    vote: (targetType: 'post' | 'reply', targetId: string, value: -1 | 0 | 1) =>
      this.request<{ newScore: number; userVote: number }>('/forum/votes', {
        method: 'POST',
        body: JSON.stringify({ targetType, targetId, value })
      }),
    bookmark: (postId: string) =>
      this.request<{ postId: string; isBookmarked: boolean }>('/forum/bookmarks/toggle', {
        method: 'POST',
        body: JSON.stringify({ postId })
      }),
    acceptSolution: (postId: string, replyId: string) =>
      this.request<{ postId: string; acceptedReplyId: string; postStatus: string }>(
        `/forum/posts/${postId}/accept-solution`,
        { method: 'POST', body: JSON.stringify({ replyId }) }
      ),
    exportIdea: (postId: string, details: Record<string, string>) =>
      this.request<Record<string, unknown>>('/forum/integrations/idea-centre/export', {
        method: 'POST',
        body: JSON.stringify({ postId, ...details })
      }),
    communities: () => this.request<Array<{ id: string; name: string; slug: string; description: string }>>('/forum/communities'),
    mentors: () => this.request<Member[]>('/forum/mentors')
  };

  leaderboards = {
    get: () => this.request<LeaderboardResponse>('/leaderboards')
  };

  media = {
    upload: async (file: File, category: MediaCategory): Promise<MediaAsset> => {
      const client = this.getSupabaseClient();
      if (!client) {
        throw new ApiClientError(
          'File uploads require Supabase authentication.',
          0,
          'AUTH_CONFIGURATION_ERROR'
        );
      }
      const intent = await this.request<MediaUploadIntent>('/media/upload-intents', {
        method: 'POST',
        body: JSON.stringify({
          category,
          originalName: file.name,
          mimeType: file.type,
          sizeBytes: file.size
        })
      });
      const { error } = await client.storage
        .from(intent.asset.bucketId)
        .uploadToSignedUrl(intent.upload.path, intent.upload.token, file, {
          contentType: file.type,
          cacheControl: '3600'
        });
      if (error) {
        try {
          await this.request(`/media/${intent.asset.id}`, { method: 'DELETE' });
        } catch (cleanupError) {
          console.error('The failed upload metadata could not be cleaned up.', cleanupError);
        }
        throw new ApiClientError(error.message, 0, 'MEDIA_UPLOAD_FAILED');
      }
      try {
        return await this.request<MediaAsset>(`/media/${intent.asset.id}/complete`, {
          method: 'POST'
        });
      } catch (completionError) {
        try {
          await this.request(`/media/${intent.asset.id}`, { method: 'DELETE' });
        } catch (cleanupError) {
          console.error('The incomplete upload could not be cleaned up.', cleanupError);
        }
        throw completionError;
      }
    },
    url: (assetId: string) => this.request<MediaAsset>(`/media/${assetId}/url`),
    remove: (assetId: string) =>
      this.request<{ id: string; deleted: boolean }>(`/media/${assetId}`, {
        method: 'DELETE'
      })
  };

  subscribeToRealtime(
    topics: RealtimeTopic[],
    listener: (event: {
      topic: RealtimeTopic;
      eventType: string;
      recordId: string | null;
      payload: Record<string, unknown>;
    }) => void
  ) {
    const client = this.getSupabaseClient();
    if (!client || topics.length === 0) {
      return () => undefined;
    }

    const channel = client.channel(`cvs-garage-${topics.join('-')}`);
    topics.forEach((topic) => {
      channel.on(
        'postgres_changes',
        {
          event: 'INSERT',
          schema: 'public',
          table: 'realtime_events',
          filter: `topic=eq.${topic}`
        },
        (change) => {
          const row = change.new as {
            topic: RealtimeTopic;
            event_type: string;
            record_id: string | null;
            payload: Record<string, unknown>;
          };
          listener({
            topic: row.topic,
            eventType: row.event_type,
            recordId: row.record_id,
            payload: row.payload || {}
          });
        }
      );
    });
    channel.subscribe();
    return () => {
      void client.removeChannel(channel);
    };
  }
}

export const api = new CvsGarageApiClient();
