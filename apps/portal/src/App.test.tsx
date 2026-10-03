import { cleanup, fireEvent, render, screen, waitFor, within } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { App } from './App';
import type { DashboardSummary, Project } from '../../../packages/contracts/src';

const members = [
  {
    id: 'mem-student-1',
    name: 'Rahul Sharma',
    email: 'rahul@example.edu',
    department: 'Computer Science',
    role: 'Student' as const,
    roles: ['Student' as const],
    status: 'active' as const,
    isMentor: false,
    mentorExpertise: [],
    bio: 'Student builder',
    skills: ['React'],
    reputationScore: 100
  }
];

const apiMock = vi.hoisted(() => ({
  getUserId: vi.fn(() => 'mem-student-1'),
  setUserId: vi.fn(),
  setAuthenticatedUserId: vi.fn(),
  listMembers: vi.fn(),
  getDashboard: vi.fn(),
  authMode: vi.fn<() => 'demo' | 'supabase' | 'misconfigured'>(() => 'demo'),
  getSession: vi.fn(),
  currentMember: vi.fn(),
  signInWithGoogle: vi.fn(),
  signOut: vi.fn(),
  consumeReturnTo: vi.fn(() => '/'),
  onChange: vi.fn(() => () => undefined),
  subscribeToRealtime: vi.fn(() => () => undefined)
}));

vi.mock('../../../packages/api-client/src', () => ({
  api: {
    getUserId: apiMock.getUserId,
    setUserId: apiMock.setUserId,
    setAuthenticatedUserId: apiMock.setAuthenticatedUserId,
    auth: {
      mode: apiMock.authMode,
      getSession: apiMock.getSession,
      currentMember: apiMock.currentMember,
      signInWithGoogle: apiMock.signInWithGoogle,
      signOut: apiMock.signOut,
      consumeReturnTo: apiMock.consumeReturnTo,
      onChange: apiMock.onChange
    },
    subscribeToRealtime: apiMock.subscribeToRealtime,
    members: {
      list: apiMock.listMembers
    },
    dashboard: {
      get: apiMock.getDashboard
    }
  }
}));

const emptySummary: DashboardSummary = {
  memberCount: 1,
  activeProjectCount: 1,
  upcomingEventCount: 1,
  openIdeaCount: 1,
  discussionCount: 1,
  topContributor: null,
  featuredProjects: [],
  upcomingEvents: [],
  recentIdeas: []
};

async function openDemoIdentity() {
  fireEvent.click(screen.getByRole('button', { name: /Demo identity/ }));
  return screen.findByRole('dialog', { name: 'Demo identity' });
}

describe('App', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    window.localStorage.clear();
    apiMock.getUserId.mockReturnValue('mem-student-1');
    apiMock.authMode.mockReturnValue('demo');
    apiMock.getSession.mockResolvedValue(null);
    apiMock.currentMember.mockReset();
    apiMock.signInWithGoogle.mockReset();
    apiMock.signOut.mockReset();
    apiMock.consumeReturnTo.mockReturnValue('/');
    apiMock.onChange.mockReturnValue(() => undefined);
    apiMock.subscribeToRealtime.mockReturnValue(() => undefined);
    apiMock.setUserId.mockImplementation((userId: string) => apiMock.getUserId.mockReturnValue(userId));
    apiMock.listMembers.mockResolvedValue(members);
    apiMock.getDashboard.mockResolvedValue(emptySummary);
  });

  afterEach(cleanup);

  it('renders the portal shell and dashboard', async () => {
    render(
      <MemoryRouter initialEntries={['/']}>
        <App />
      </MemoryRouter>
    );

    expect(screen.getByRole('navigation', { name: 'Primary navigation' })).toBeInTheDocument();
    expect(
      await screen.findByRole(
        'heading',
        { name: 'Welcome in, Rahul.' },
        { timeout: 5000 }
      )
    ).toBeInTheDocument();
    expect(
      within(screen.getByRole('navigation', { name: 'Primary navigation' })).getByRole('link', {
        name: /Projects/
      })
    ).toHaveAttribute('href', '/projects');
  });

  it('protects service routes with Google sign-in in Supabase mode', async () => {
    apiMock.authMode.mockReturnValue('supabase');
    apiMock.getSession.mockResolvedValue(null);

    render(
      <MemoryRouter initialEntries={['/projects']}>
        <App />
      </MemoryRouter>
    );

    expect(await screen.findByRole('heading', { name: 'Sign in to continue' })).toBeInTheDocument();
    fireEvent.click(screen.getByRole('button', { name: 'Continue with Google' }));
    expect(apiMock.signInWithGoogle).toHaveBeenCalledTimes(1);
  });

  it('shows the product landing page to signed-out Supabase visitors', async () => {
    apiMock.authMode.mockReturnValue('supabase');
    apiMock.getSession.mockResolvedValue(null);
    apiMock.getDashboard.mockResolvedValue({
      ...emptySummary,
      memberCount: 7,
      activeProjectCount: 2,
      upcomingEventCount: 3
    });

    render(
      <MemoryRouter initialEntries={['/']}>
        <App />
      </MemoryRouter>
    );

    expect(
      await screen.findByRole('heading', { name: 'Build what campus needs.' })
    ).toBeInTheDocument();
    expect(screen.queryByRole('navigation', { name: 'Primary navigation' })).not.toBeInTheDocument();
    const landingNavigation = screen.getByRole('navigation', { name: 'Landing navigation' });
    expect(within(landingNavigation).getByRole('link', { name: 'Workspaces' })).toHaveAttribute(
      'href',
      '/#workspaces'
    );
    await waitFor(() =>
      expect(screen.getByText('Community members').previousElementSibling).toHaveTextContent('7')
    );
    expect(
      screen.getByRole('img', { name: 'Students working together during an innovation event' })
    ).toBeInTheDocument();

    fireEvent.click(screen.getAllByRole('button', { name: 'Continue with Google' })[0]);
    expect(apiMock.signInWithGoogle).toHaveBeenCalledTimes(1);
  });

  it('keeps the workspace dashboard for approved Supabase members', async () => {
    apiMock.authMode.mockReturnValue('supabase');
    apiMock.getSession.mockResolvedValue({ access_token: 'token' });
    apiMock.currentMember.mockResolvedValue(members[0]);

    render(
      <MemoryRouter initialEntries={['/']}>
        <App />
      </MemoryRouter>
    );

    expect(
      await screen.findByRole('heading', { name: 'Welcome in, Rahul.' })
    ).toBeInTheDocument();
    expect(screen.queryByRole('heading', { name: 'Build what campus needs.' })).not.toBeInTheDocument();
    expect(screen.getByRole('navigation', { name: 'Primary navigation' })).toBeInTheDocument();
  });

  it('shows the approval state without loading protected services', async () => {
    apiMock.authMode.mockReturnValue('supabase');
    apiMock.getSession.mockResolvedValue({ access_token: 'token' });
    apiMock.currentMember.mockResolvedValue({ ...members[0], status: 'pending' });

    render(
      <MemoryRouter initialEntries={['/forum']}>
        <App />
      </MemoryRouter>
    );

    expect(await screen.findByRole('heading', { name: 'Approval is pending' })).toBeInTheDocument();
    expect(apiMock.listMembers).not.toHaveBeenCalled();
  });

  it('keeps the overview focused without repeated workspace or profile sections', async () => {
    render(<MemoryRouter><App /></MemoryRouter>);
    await screen.findByRole('heading', { name: 'Welcome in, Rahul.' });
    const links = within(screen.getByRole('navigation', { name: 'Primary navigation' })).getAllByRole('link');
    expect(links.map((link) => link.getAttribute('href'))).toEqual([
      '/', '/projects', '/events', '/member-centre', '/leaderboards', '/idea-centre', '/forum'
    ]);
    expect(screen.queryByRole('region', { name: 'Your workspaces' })).not.toBeInTheDocument();
    expect(screen.queryByRole('heading', { name: 'Rahul Sharma', level: 2 })).not.toBeInTheDocument();
    expect(screen.queryByRole('heading', { name: 'Find your people' })).not.toBeInTheDocument();
    expect(screen.queryByRole('heading', { name: 'Ideas in motion' })).not.toBeInTheDocument();
    expect(screen.getByText('No featured projects yet')).toBeInTheDocument();
    expect(screen.getByText('New campus events will appear here when they are published.')).toBeInTheDocument();
  });

  it('shows a dashboard failure explicitly and lets the user retry', async () => {
    apiMock.getDashboard.mockRejectedValueOnce(new Error('The campus API is unavailable.'));
    render(<MemoryRouter><App /></MemoryRouter>);
    expect(await screen.findByRole('alert')).toHaveTextContent('The campus API is unavailable.');
    fireEvent.click(screen.getByRole('button', { name: 'Try again' }));
    expect(await screen.findByRole('heading', { name: 'Welcome in, Rahul.' })).toBeInTheDocument();
  });

  it('persists an explicit theme choice and restores it on the next visit', async () => {
    const { unmount } = render(<MemoryRouter><App /></MemoryRouter>);
    await screen.findByRole('heading', { name: 'Welcome in, Rahul.' });
    fireEvent.click(screen.getByRole('button', { name: 'Theme: system. Switch to light.' }));
    expect(window.localStorage.getItem('cvs-garage-theme')).toBe('light');
    expect(document.documentElement).toHaveAttribute('data-theme', 'light');
    fireEvent.click(screen.getByRole('button', { name: 'Theme: light. Switch to dark.' }));
    expect(window.localStorage.getItem('cvs-garage-theme')).toBe('dark');
    expect(document.documentElement).toHaveAttribute('data-theme', 'dark');

    unmount();
    render(<MemoryRouter><App /></MemoryRouter>);
    await screen.findByRole('heading', { name: 'Welcome in, Rahul.' });
    fireEvent.click(screen.getByRole('button', { name: 'Theme: dark. Switch to system.' }));
    expect(window.localStorage.getItem('cvs-garage-theme')).toBe('system');
    expect(document.documentElement).toHaveAttribute('data-theme', 'light');
  });

  it('preserves the demo identity control and reloads identity-scoped content', async () => {
    apiMock.listMembers.mockResolvedValue([
      ...members,
      { ...members[0], id: 'mem-student-2', name: 'Ananya Verma' }
    ]);
    render(<MemoryRouter><App /></MemoryRouter>);
    await screen.findByRole('heading', { name: 'Welcome in, Rahul.' });
    await openDemoIdentity();
    fireEvent.change(screen.getByRole('combobox', { name: 'Development identity' }), {
      target: { value: 'mem-student-2' }
    });
    expect(apiMock.setUserId).toHaveBeenCalledWith('mem-student-2');
    await screen.findByRole('heading', { name: 'Welcome in, Ananya.' });
    expect(apiMock.getDashboard).toHaveBeenCalledTimes(2);
  });

  it('uses a first name rather than an honorific in the overview greeting', async () => {
    apiMock.listMembers.mockResolvedValue([
      { ...members[0], name: 'Dr. Priya Nair' }
    ]);
    render(<MemoryRouter><App /></MemoryRouter>);
    expect(await screen.findByRole('heading', { name: 'Welcome in, Priya.' })).toBeInTheDocument();
  });

  it('limits project previews and links directly to each project page', async () => {
    const project = (id: string, name: string, progress: number): Project => ({
      id, name, progress, slug: id, tagline: 'A campus project', description: '',
      category: 'Campus', status: 'active', leaderId: 'mem-student-1',
      memberIds: ['mem-student-1'], tags: [], milestones: [], createdAt: '2026-09-01'
    });
    apiMock.getDashboard.mockResolvedValue({
      ...emptySummary,
      featuredProjects: [
        project('alpha', 'Project Alpha', 60),
        project('beta', 'Project Beta', 20),
        project('gamma', 'Project Gamma', 10)
      ]
    });
    apiMock.listMembers.mockResolvedValue([
      ...members,
      { ...members[0], id: 'mentor', name: 'Priya Nair', isMentor: true }
    ]);
    render(<MemoryRouter><App /></MemoryRouter>);
    const projects = await screen.findByRole('region', { name: 'Featured projects' });
    expect(within(projects).getByRole('progressbar', { name: 'Project Alpha' })).toHaveAttribute('aria-valuenow', '0.6');
    expect(within(projects).getByRole('link', { name: 'Project Alpha' })).toHaveAttribute('href', '/projects/alpha');
    expect(within(projects).getByRole('link', { name: 'Project Beta' })).toHaveAttribute('href', '/projects/beta');
    expect(screen.queryByText('Project Gamma')).not.toBeInTheDocument();
  });

  it('does not invent progress or a member profile when their data is unavailable', async () => {
    apiMock.listMembers.mockRejectedValueOnce(new Error('The member directory is unavailable.'));
    render(<MemoryRouter><App /></MemoryRouter>);
    await screen.findByRole('heading', { name: 'Welcome in.' });
    expect(screen.getByRole('alert')).toHaveTextContent('The member directory is unavailable.');
    expect(within(screen.getByRole('region', { name: 'Featured projects' })).queryByRole('progressbar')).not.toBeInTheDocument();
    expect(screen.queryByRole('img', { name: /active members are mentors/ })).not.toBeInTheDocument();
  });
});
