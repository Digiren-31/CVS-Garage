import {
  cleanup,
  fireEvent,
  render,
  screen,
  waitFor
} from '@testing-library/react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import type {
  Event,
  ForumPost,
  ForumReply,
  Member,
  Project,
  TagSummary
} from '../../../packages/contracts/src';
import { ForumPage } from './ForumPage';

const currentUser: Member = {
  id: 'mem-student-1',
  name: 'Rahul Sharma',
  email: 'rahul@example.edu',
  department: 'Computer Science',
  batch: '2026',
  role: 'Student',
  roles: ['Student'],
  status: 'active',
  isMentor: false,
  mentorExpertise: [],
  bio: 'Student builder',
  skills: ['React'],
  reputationScore: 120
};

const project: Project = {
  id: 'PRJ-101',
  slug: 'campus-map',
  name: 'Campus Map',
  tagline: 'Accessible campus navigation',
  description: 'Indoor and outdoor campus navigation.',
  category: 'Accessibility',
  status: 'active',
  progress: 50,
  leaderId: currentUser.id,
  memberIds: [currentUser.id],
  tags: ['mapping'],
  milestones: [],
  createdAt: '2026-09-01T10:00:00.000Z'
};

const event: Event = {
  id: 'EVT-201',
  slug: 'build-night',
  title: 'Campus Build Night',
  summary: 'A collaborative build session.',
  description: 'Build and test student projects.',
  category: 'Workshop',
  mode: 'Hybrid',
  status: 'Published',
  startsAt: '2026-10-01T10:00:00.000Z',
  endsAt: '2026-10-01T14:00:00.000Z',
  registrationEndsAt: '2026-09-30T10:00:00.000Z',
  venue: 'Innovation Lab',
  organizerId: 'mem-mentor-1',
  organizerName: 'Dr Meera Rao',
  capacity: 80,
  registrationCount: 30,
  tags: ['builders'],
  schedule: [],
  currentUserRegistration: null
};

const tag: TagSummary = {
  id: 'tag-react',
  name: 'React',
  slug: 'react',
  postCount: 4
};

const post: ForumPost = {
  id: 'post-1',
  postType: 'question',
  title: 'How should we test accessible modal workflows?',
  content:
    'We are comparing keyboard focus strategies for a portal-integrated dialog.',
  authorId: currentUser.id,
  author: {
    id: currentUser.id,
    name: currentUser.name,
    department: currentUser.department,
    role: currentUser.role,
    isMentor: false
  },
  status: 'open',
  voteScore: 3,
  upvotesCount: 3,
  downvotesCount: 0,
  userVote: 0,
  replyCount: 1,
  viewCount: 8,
  isBookmarked: false,
  acceptedReplyId: null,
  acceptedReply: null,
  tags: [tag],
  linkedProjectId: project.id,
  linkedProject: {
    id: project.id,
    name: project.name,
    slug: project.slug,
    tagline: project.tagline,
    status: project.status
  },
  linkedEventId: event.id,
  linkedEvent: {
    id: event.id,
    title: event.title,
    slug: event.slug,
    type: event.category,
    startDate: event.startsAt,
    endDate: event.endsAt
  },
  ideaExport: null,
  isPinned: false,
  isLocked: false,
  createdAt: '2026-09-20T10:00:00.000Z',
  updatedAt: '2026-09-20T10:00:00.000Z'
};

const reply: ForumReply = {
  id: 'reply-1',
  postId: post.id,
  parentReplyId: null,
  authorId: 'mem-mentor-1',
  author: {
    id: 'mem-mentor-1',
    name: 'Dr Meera Rao',
    department: 'Computer Science',
    role: 'Mentor',
    isMentor: true
  },
  content: 'Use a focus trap and restore focus to the trigger on close.',
  voteScore: 5,
  upvotesCount: 5,
  downvotesCount: 0,
  userVote: 0,
  isAcceptedSolution: false,
  createdAt: '2026-09-21T10:00:00.000Z',
  updatedAt: '2026-09-21T10:00:00.000Z',
  children: []
};

const apiMock = vi.hoisted(() => ({
  forum: {
    context: vi.fn(),
    posts: vi.fn(),
    post: vi.fn(),
    replies: vi.fn(),
    createPost: vi.fn(),
    createReply: vi.fn(),
    vote: vi.fn(),
    bookmark: vi.fn(),
    acceptSolution: vi.fn(),
    exportIdea: vi.fn(),
    communities: vi.fn(),
    mentors: vi.fn()
  },
  projects: { list: vi.fn() },
  events: { list: vi.fn() },
  request: vi.fn()
}));

vi.mock('../../../packages/api-client/src', () => ({
  api: apiMock
}));

describe('ForumPage', () => {
  afterEach(() => {
    cleanup();
  });

  beforeEach(() => {
    vi.clearAllMocks();
    apiMock.forum.posts.mockResolvedValue([post]);
    apiMock.forum.context.mockResolvedValue({
      currentUser,
      availableProfiles: [currentUser]
    });
    apiMock.forum.post.mockResolvedValue(post);
    apiMock.forum.replies.mockResolvedValue([reply]);
    apiMock.forum.createPost.mockResolvedValue(post);
    apiMock.forum.createReply.mockResolvedValue(reply);
    apiMock.forum.vote.mockResolvedValue({ newScore: 4, userVote: 1 });
    apiMock.forum.bookmark.mockResolvedValue({
      postId: post.id,
      isBookmarked: true
    });
    apiMock.forum.acceptSolution.mockResolvedValue({
      postId: post.id,
      acceptedReplyId: reply.id,
      postStatus: 'solved'
    });
    apiMock.forum.exportIdea.mockResolvedValue({ ideaId: 'IDEA-2026-1' });
    apiMock.forum.communities.mockResolvedValue([
      {
        id: 'community-1',
        name: 'Accessible Web Guild',
        slug: 'accessible-web',
        description: 'Build inclusive campus experiences.'
      }
    ]);
    apiMock.forum.mentors.mockResolvedValue([]);
    apiMock.projects.list.mockResolvedValue([project]);
    apiMock.events.list.mockResolvedValue([event]);
    apiMock.request.mockImplementation((path: string) => {
      if (path === '/forum/tags') {
        return Promise.resolve([tag]);
      }
      return Promise.resolve([]);
    });
  });

  it('loads the feed and sends search, sort, status, and saved filters through the shared client', async () => {
    render(<ForumPage />);

    expect(
      await screen.findByRole('button', { name: post.title })
    ).not.toBeNull();

    fireEvent.change(
      screen.getByRole('searchbox', { name: 'Search discussions' }),
      { target: { value: 'accessibility' } }
    );
    fireEvent.submit(screen.getByRole('search'));
    await waitFor(() =>
      expect(apiMock.forum.posts).toHaveBeenLastCalledWith(
        expect.objectContaining({ search: 'accessibility' })
      )
    );

    fireEvent.change(screen.getByLabelText('Sort discussions'), {
      target: { value: 'trending' }
    });
    fireEvent.change(screen.getByLabelText('Filter discussions by status'), {
      target: { value: 'solved' }
    });
    fireEvent.click(screen.getByRole('button', { name: 'Saved' }));

    await waitFor(() =>
      expect(apiMock.forum.posts).toHaveBeenLastCalledWith(
        expect.objectContaining({
          search: 'accessibility',
          sort: 'trending',
          status: 'solved',
          bookmarkedOnly: true
        })
      )
    );
  });

  it('opens a post, renders replies, and offers accepted-solution control to the author', async () => {
    render(<ForumPage />);

    fireEvent.click(
      await screen.findByRole('button', { name: post.title })
    );

    expect(
      await screen.findByRole('heading', { name: post.title })
    ).not.toBeNull();
    expect(screen.getByText(reply.content)).not.toBeNull();

    fireEvent.click(
      screen.getByRole('button', { name: 'Accept as solution' })
    );
    await waitFor(() =>
      expect(apiMock.forum.acceptSolution).toHaveBeenCalledWith(
        post.id,
        reply.id
      )
    );
  });

  it('creates a discussion with Project and Event links from an accessible dialog', async () => {
    render(<ForumPage />);
    await screen.findByRole('button', { name: post.title });

    fireEvent.click(
      screen.getByRole('button', { name: 'Start a discussion' })
    );
    expect(
      screen.getByRole('dialog', { name: 'Start a Forum discussion' })
    ).not.toBeNull();

    fireEvent.change(screen.getByLabelText(/^Title/), {
      target: { value: 'How can we improve campus wayfinding?' }
    });
    fireEvent.change(screen.getByLabelText(/^Discussion context/), {
      target: {
        value:
          'We need to compare accessible navigation patterns before the build night.'
      }
    });
    fireEvent.change(screen.getByLabelText('Link to a Project'), {
      target: { value: project.id }
    });
    fireEvent.change(screen.getByLabelText('Link to an Event'), {
      target: { value: event.id }
    });
    fireEvent.click(
      screen.getByRole('button', { name: 'Publish discussion' })
    );

    await waitFor(() =>
      expect(apiMock.forum.createPost).toHaveBeenCalledWith(
        expect.objectContaining({
          linkedProjectId: project.id,
          linkedEventId: event.id
        })
      )
    );
  });
});
