import {
  act,
  cleanup,
  fireEvent,
  render,
  screen,
  waitFor,
  within
} from '@testing-library/react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { MemoryRouter, Route, Routes, useLocation, useNavigate } from 'react-router-dom';
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

function LocationControls() {
  const location = useLocation();
  const navigate = useNavigate();
  return <>
    <output aria-label="Current URL">{location.pathname}{location.search}</output>
    <button onClick={() => navigate(-1)}>Browser back</button>
    <button onClick={() => navigate(1)}>Browser forward</button>
  </>;
}

function renderForum(entry = '/forum') {
  return render(
    <MemoryRouter initialEntries={[entry]}>
      <LocationControls />
      <Routes>
        <Route path="/forum" element={<ForumPage />} />
        <Route path="/forum/posts/:postId" element={<ForumPage />} />
        <Route path="/forum/:section" element={<ForumPage />} />
      </Routes>
    </MemoryRouter>
  );
}

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
    renderForum();

    expect(
      await screen.findByRole('link', { name: post.title })
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
    renderForum();

    fireEvent.click(
      await screen.findByRole('link', { name: post.title })
    );

    expect(
      await screen.findByRole('heading', { name: post.title })
    ).not.toBeNull();
    expect(screen.getByLabelText('Current URL')).toHaveTextContent(`/forum/posts/${post.id}`);
    expect(screen.queryByRole('searchbox')).not.toBeInTheDocument();
    expect(screen.queryByRole('navigation', { name: 'Forum sections' })).not.toBeInTheDocument();
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
    renderForum();
    await screen.findByRole('link', { name: post.title });

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

  it('preserves tag-chip filtering and exposes community card headings', async () => {
    renderForum();
    const card = await screen.findByRole('article', { name: post.title });
    fireEvent.click(within(card).getByRole('button', { name: '#React' }));
    expect(await screen.findByText('Showing tag: #react')).toBeInTheDocument();

    fireEvent.click(screen.getByRole('button', { name: 'Communities' }));
    expect(screen.getByRole('heading', { name: 'Communities and guilds', level: 2 })).toBeInTheDocument();
    expect(screen.getByRole('heading', { name: 'Accessible Web Guild', level: 3 })).toBeInTheDocument();
    fireEvent.click(screen.getByRole('button', { name: 'View community feed' }));
    expect(await screen.findByText('Showing community: Accessible Web Guild')).toBeInTheDocument();
    expect(await screen.findByRole('article', { name: post.title })).toBeInTheDocument();
  });

  it('opens a discussion from a direct URL and returns to the filtered feed', async () => {
    renderForum('/forum/posts/post-1?search=accessibility&sort=trending');
    expect(await screen.findByRole('heading', { name: post.title, level: 1 })).toBeInTheDocument();
    expect(apiMock.forum.post).toHaveBeenCalledWith('post-1');
    expect(screen.getByRole('link', { name: project.name })).toHaveAttribute('href', '/projects/PRJ-101');
    expect(screen.getByRole('link', { name: event.title })).toHaveAttribute('href', '/events/EVT-201');
    fireEvent.click(screen.getByRole('link', { name: 'Back to discussion feed' }));
    await screen.findByRole('article', { name: post.title });
    expect(screen.getByLabelText('Current URL')).toHaveTextContent('/forum?search=accessibility&sort=trending');
    await waitFor(() => expect(apiMock.forum.posts).toHaveBeenLastCalledWith(expect.objectContaining({ search: 'accessibility', sort: 'trending' })));
    fireEvent.click(screen.getByRole('button', { name: 'Browser back' }));
    expect(await screen.findByRole('heading', { name: post.title, level: 1 })).toBeInTheDocument();
    fireEvent.click(screen.getByRole('button', { name: 'Browser forward' }));
    expect(await screen.findByRole('article', { name: post.title })).toBeInTheDocument();
  });

  it('keeps a return link and retry when a direct discussion cannot be loaded', async () => {
    apiMock.forum.post.mockRejectedValueOnce(new Error('Discussion not found'));
    renderForum('/forum/posts/missing');
    expect(await screen.findByRole('alert')).toHaveTextContent('Discussion not found');
    expect(screen.getByRole('link', { name: 'Back to discussion feed' })).toHaveAttribute('href', '/forum');
    expect(screen.queryByRole('article', { name: post.title })).not.toBeInTheDocument();
  });

  it('ignores a detail response that finishes after returning to the feed', async () => {
    let complete: ((value: ForumPost) => void) | undefined;
    apiMock.forum.post.mockReturnValueOnce(new Promise<ForumPost>((resolve) => { complete = resolve; }));
    renderForum('/forum/posts/post-1');
    await screen.findByText('Loading discussion and replies');
    fireEvent.click(screen.getByRole('link', { name: 'Back to discussion feed' }));
    await screen.findByRole('article', { name: post.title });
    await act(async () => {
      if (!complete) throw new Error('The pending discussion request was not created');
      complete(post);
    });
    expect(screen.getByLabelText('Current URL')).toHaveTextContent('/forum');
    expect(screen.queryByRole('heading', { name: post.title, level: 1 })).not.toBeInTheDocument();
    expect(screen.getByRole('article', { name: post.title })).toBeInTheDocument();
  });
});
