import {
  cleanup,
  fireEvent,
  render,
  screen,
  waitFor,
  within
} from '@testing-library/react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import type { LeaderboardResponse } from '../../../packages/contracts/src';
import { LeaderboardsPage } from './LeaderboardsPage';

const leaderboard: LeaderboardResponse = {
  generatedAt: '2026-09-27T12:00:00.000Z',
  scoringPolicyVersion: 'forum-contributions-v1',
  achievements: [
    {
      id: 'achievement-1',
      memberId: 'mem-student-2',
      memberName: 'Ananya Verma',
      title: 'HackSprint finalist',
      description: 'Built a standout credentials prototype.',
      achievedAt: '2026-09-20T10:00:00.000Z',
      eventId: 'EVT-1'
    }
  ],
  entries: [
    {
      rank: 1,
      memberId: 'mem-student-2',
      memberName: 'Ananya Verma',
      department: 'AI & Data Science',
      academicYear: '2026',
      score: 200,
      starRating: 5,
      eventIds: ['EVT-1'],
      contributionBreakdown: {
        posts: 50,
        replies: 50,
        acceptedAnswers: 100,
        upvotesReceived: 0
      }
    },
    {
      rank: 2,
      memberId: 'mem-mentor-1',
      memberName: 'Dr. Priya Nair',
      department: 'Computer Science & Engineering',
      academicYear: 'Faculty',
      score: 200,
      starRating: 5,
      eventIds: ['EVT-2'],
      contributionBreakdown: {
        posts: 0,
        replies: 75,
        acceptedAnswers: 125,
        upvotesReceived: 0
      }
    },
    {
      rank: 3,
      memberId: 'mem-student-1',
      memberName: 'Rahul Sharma',
      department: 'Computer Science & Engineering',
      academicYear: '2026',
      score: 180,
      starRating: 4,
      eventIds: ['EVT-1'],
      contributionBreakdown: {
        posts: 80,
        replies: 25,
        acceptedAnswers: 75,
        upvotesReceived: 0
      }
    }
  ],
  filters: {
    events: [
      { id: 'EVT-1', title: 'HackSprint' },
      { id: 'EVT-2', title: 'Innovation Fest' }
    ],
    departments: ['AI & Data Science', 'Computer Science & Engineering'],
    academicYears: ['2026', 'Faculty']
  }
};

const apiMock = vi.hoisted(() => ({
  get: vi.fn()
}));

vi.mock('../../../packages/api-client/src', () => ({
  api: {
    leaderboards: apiMock
  }
}));

describe('LeaderboardsPage', () => {
  afterEach(cleanup);

  beforeEach(() => {
    apiMock.get.mockReset().mockResolvedValue(leaderboard);
  });

  it('renders achievements, the podium, and backend-ranked table rows', async () => {
    render(<LeaderboardsPage />);

    expect(
      await screen.findByRole('heading', { name: 'Campus contributors' })
    ).toBeInTheDocument();
    expect(
      screen.getByRole('list', { name: 'Recent achievements' })
    ).toHaveTextContent('HackSprint finalist');
    expect(screen.getByRole('list', { name: 'Top contributors' })).toHaveTextContent(
      'Rank 1'
    );

    const table = screen.getByRole('table', { name: 'Leaderboard rankings' });
    expect(within(table).getByText('Ananya Verma')).toBeInTheDocument();
    expect(within(table).getByText('Dr. Priya Nair')).toBeInTheDocument();
    expect(within(table).getByText('Rahul Sharma')).toBeInTheDocument();
    expect(screen.getByText(/forum-contributions-v1/)).toBeInTheDocument();
  });

  it('filters already-ranked rows without changing their backend rank', async () => {
    render(<LeaderboardsPage />);
    await screen.findByRole('table', { name: 'Leaderboard rankings' });

    const table = () => screen.getByRole('table', { name: 'Leaderboard rankings' });

    fireEvent.change(screen.getByLabelText('Event'), { target: { value: 'EVT-2' } });
    expect(within(table()).getByText('Dr. Priya Nair')).toBeInTheDocument();
    expect(within(table()).queryByText('Ananya Verma')).not.toBeInTheDocument();
    expect(within(table()).getByText('2')).toHaveAccessibleName('Rank 2');

    fireEvent.click(screen.getByRole('button', { name: 'Reset filters' }));
    fireEvent.change(screen.getByLabelText('Department'), {
      target: { value: 'Computer Science & Engineering' }
    });
    fireEvent.change(screen.getByLabelText('Academic year'), {
      target: { value: '2026' }
    });
    expect(within(table()).getByText('Rahul Sharma')).toBeInTheDocument();
    expect(within(table()).queryByText('Dr. Priya Nair')).not.toBeInTheDocument();

    fireEvent.change(screen.getByLabelText('Minimum star rating'), {
      target: { value: '5' }
    });
    expect(screen.getByText('No rankings match these filters')).toBeInTheDocument();
  });

  it('shows loading and recoverable error states', async () => {
    let resolveRequest: ((value: LeaderboardResponse) => void) | undefined;
    apiMock.get.mockReturnValueOnce(
      new Promise<LeaderboardResponse>((resolve) => {
        resolveRequest = resolve;
      })
    );

    const { unmount } = render(<LeaderboardsPage />);
    expect(screen.getByText('Loading leaderboard')).toBeInTheDocument();
    resolveRequest?.(leaderboard);
    expect(await screen.findByText('HackSprint finalist')).toBeInTheDocument();
    unmount();

    apiMock.get
      .mockRejectedValueOnce(new Error('Leaderboard service unavailable'))
      .mockResolvedValueOnce(leaderboard);
    render(<LeaderboardsPage />);

    expect(await screen.findByRole('alert')).toHaveTextContent(
      'Leaderboard service unavailable'
    );
    fireEvent.click(screen.getByRole('button', { name: 'Try again' }));
    await waitFor(() => expect(apiMock.get).toHaveBeenCalledTimes(3));
    expect(await screen.findByText('HackSprint finalist')).toBeInTheDocument();
  });

  it('shows intentional empty states', async () => {
    apiMock.get.mockResolvedValueOnce({
      ...leaderboard,
      achievements: [],
      entries: []
    });

    render(<LeaderboardsPage />);

    expect(await screen.findByText('No rankings yet')).toBeInTheDocument();
    expect(screen.getByText('No recent achievements')).toBeInTheDocument();
  });
});
