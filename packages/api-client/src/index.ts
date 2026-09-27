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
  Member,
  MemberStats,
  Project
} from '../../contracts/src';

type QueryValue = string | number | boolean | null | undefined;

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
    return this.currentUserId;
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
    const headers = new Headers(init.headers);
    if (!headers.has('Content-Type') && init.body) {
      headers.set('Content-Type', 'application/json');
    }
    headers.set('x-user-id', this.currentUserId);

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

  dashboard = {
    get: () => this.request<DashboardSummary>('/dashboard')
  };

  members = {
    list: (query = '') => this.request<Member[]>(`/member-centre/members${buildQuery({ q: query })}`),
    stats: () => this.request<MemberStats>('/member-centre/stats'),
    current: () => this.request<Member>('/member-centre/me'),
    updateStatus: (memberId: string, status: Member['status']) =>
      this.request<Member>(`/member-centre/members/${memberId}/status`, {
        method: 'PATCH',
        body: JSON.stringify({ status })
      }),
    setMentor: (memberId: string, enabled: boolean) =>
      this.request<Member>(`/member-centre/members/${memberId}/mentor`, {
        method: 'PATCH',
        body: JSON.stringify({ enabled })
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
}

export const api = new CvsGarageApiClient();
