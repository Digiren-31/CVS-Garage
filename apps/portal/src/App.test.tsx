import { render, screen, within } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { App } from './App';

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
  listMembers: vi.fn(),
  getDashboard: vi.fn()
}));

vi.mock('../../../packages/api-client/src', () => ({
  api: {
    getUserId: apiMock.getUserId,
    setUserId: apiMock.setUserId,
    members: {
      list: apiMock.listMembers
    },
    dashboard: {
      get: apiMock.getDashboard
    }
  }
}));

describe('App', () => {
  beforeEach(() => {
    apiMock.listMembers.mockResolvedValue(members);
    apiMock.getDashboard.mockResolvedValue({
      memberCount: 1,
      activeProjectCount: 1,
      upcomingEventCount: 1,
      openIdeaCount: 1,
      discussionCount: 1,
      topContributor: null,
      featuredProjects: [],
      upcomingEvents: [],
      recentIdeas: []
    });
  });

  it('renders the portal shell and dashboard', async () => {
    render(
      <MemoryRouter initialEntries={['/']}>
        <App />
      </MemoryRouter>
    );

    expect(screen.getByRole('navigation', { name: 'Primary navigation' })).toBeInTheDocument();
    expect(
      await screen.findByRole('heading', { name: 'Build, collaborate, and learn in one place' })
    ).toBeInTheDocument();
    expect(
      within(screen.getByRole('navigation', { name: 'Primary navigation' })).getByRole('link', {
        name: /Projects/
      })
    ).toHaveAttribute('href', '/projects');
  });
});
