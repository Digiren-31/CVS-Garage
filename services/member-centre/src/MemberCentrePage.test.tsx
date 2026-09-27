import { cleanup, fireEvent, render, screen, waitFor } from '@testing-library/react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import type { Member, MemberStats } from '../../../packages/contracts/src';
import { MemberCentrePage } from './MemberCentrePage';

const admin: Member = {
  id: 'mem-admin-1',
  name: 'Vikram Sen',
  email: 'admin@college.edu',
  department: 'Student Affairs',
  batch: 'Administration',
  role: 'Admin',
  roles: ['Admin'],
  status: 'active',
  isMentor: false,
  mentorExpertise: [],
  bio: 'Platform administrator',
  skills: [],
  reputationScore: 900
};

const student: Member = {
  id: 'mem-student-1',
  name: 'Rahul Sharma',
  email: 'rahul@college.edu',
  department: 'Computer Science',
  batch: 'Batch 2026',
  role: 'Student',
  roles: ['Student'],
  status: 'active',
  isMentor: false,
  mentorExpertise: [],
  bio: 'Student builder',
  skills: ['React'],
  reputationScore: 245
};

const stats: MemberStats = {
  totalMembers: 2,
  activeMembers: 2,
  mentors: 0,
  pendingMembers: 0,
  suspendedMembers: 0
};

const apiMock = vi.hoisted(() => ({
  list: vi.fn(),
  stats: vi.fn(),
  current: vi.fn(),
  updateStatus: vi.fn(),
  setMentor: vi.fn()
}));

vi.mock('../../../packages/api-client/src', () => ({
  api: {
    members: apiMock
  }
}));

describe('MemberCentrePage', () => {
  afterEach(cleanup);

  beforeEach(() => {
    apiMock.list.mockReset().mockResolvedValue([admin, student]);
    apiMock.stats.mockReset().mockResolvedValue(stats);
    apiMock.current.mockReset().mockResolvedValue(admin);
    apiMock.updateStatus.mockReset().mockResolvedValue({ ...student, status: 'suspended' });
    apiMock.setMentor.mockReset().mockResolvedValue({
      ...student,
      role: 'Mentor',
      roles: ['Student', 'Mentor'],
      isMentor: true
    });
  });

  it('renders stats, profiles, and administrator actions', async () => {
    render(<MemberCentrePage />);

    expect(screen.getByText('Loading member profiles')).toBeInTheDocument();
    expect(await screen.findByRole('heading', { name: 'Find your people' })).toBeInTheDocument();
    expect(screen.getByText('Rahul Sharma')).toBeInTheDocument();
    expect(screen.getByText('Total members')).toBeInTheDocument();

    fireEvent.click(screen.getByRole('button', { name: 'Suspend Rahul Sharma' }));
    await waitFor(() =>
      expect(apiMock.updateStatus).toHaveBeenCalledWith('mem-student-1', 'suspended')
    );
    expect(await screen.findByText('Rahul Sharma is now suspended.')).toBeInTheDocument();

    fireEvent.click(screen.getByRole('button', { name: 'Grant mentor role to Rahul Sharma' }));
    await waitFor(() => expect(apiMock.setMentor).toHaveBeenCalledWith('mem-student-1', true));
  });

  it('searches through the shared API client and renders an empty state', async () => {
    apiMock.list.mockResolvedValueOnce([admin, student]).mockResolvedValueOnce([]);
    render(<MemberCentrePage />);
    await screen.findByText('Rahul Sharma');

    fireEvent.change(screen.getByRole('searchbox', { name: 'Search members' }), {
      target: { value: 'nobody' }
    });
    fireEvent.submit(screen.getByRole('search'));

    await waitFor(() => expect(apiMock.list).toHaveBeenLastCalledWith('nobody'));
    expect(await screen.findByText('No members match your search')).toBeInTheDocument();
  });

  it('shows an actionable error when the directory cannot be loaded', async () => {
    apiMock.list.mockRejectedValueOnce(new Error('Member service unavailable'));
    render(<MemberCentrePage />);

    expect(await screen.findByRole('alert')).toHaveTextContent('Member service unavailable');
    fireEvent.click(screen.getByRole('button', { name: 'Try again' }));
    await waitFor(() => expect(apiMock.list).toHaveBeenCalledTimes(2));
  });
});
