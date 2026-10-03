import { cleanup, fireEvent, render, screen, waitFor, within } from '@testing-library/react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { MemoryRouter, Route, Routes, useLocation, useNavigate } from 'react-router-dom';
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
  setMentor: vi.fn(),
  setRole: vi.fn(),
  anonymize: vi.fn()
}));

vi.mock('../../../packages/api-client/src', () => ({
  api: {
    members: apiMock
  }
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

function renderMembers(entry = '/member-centre') {
  return render(
    <MemoryRouter initialEntries={[entry]}>
      <LocationControls />
      <Routes>
        <Route path="/member-centre" element={<MemberCentrePage />} />
        <Route path="/member-centre/members/:memberId" element={<MemberCentrePage />} />
      </Routes>
    </MemoryRouter>
  );
}

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
    apiMock.setRole.mockReset().mockResolvedValue({
      ...student,
      roles: ['Student', 'Community Moderator'],
      role: 'Community Moderator'
    });
    apiMock.anonymize.mockReset();
  });

  it('keeps directory previews compact and puts administrator actions on the profile page', async () => {
    renderMembers();

    expect(screen.getByText('Loading member profiles')).toBeInTheDocument();
    expect(await screen.findByRole('heading', { name: 'Find your people' })).toBeInTheDocument();
    const preview = within(screen.getByRole('article', { name: 'Rahul Sharma member profile' }));
    expect(preview.getByRole('heading', { name: 'Rahul Sharma', level: 3 })).toBeInTheDocument();
    expect(preview.queryByRole('link', { name: student.email })).not.toBeInTheDocument();
    expect(screen.queryByRole('button', { name: 'Suspend Rahul Sharma' })).not.toBeInTheDocument();
    expect(screen.getByText('Total members')).toBeInTheDocument();
    fireEvent.click(preview.getByRole('link', { name: 'View profile' }));
    await screen.findByRole('heading', { name: 'Rahul Sharma', level: 1 });
    expect(screen.queryByRole('search')).not.toBeInTheDocument();
    const profile = within(screen.getByRole('region', { name: 'Rahul Sharma profile details' }));
    expect(profile.getByRole('link', { name: student.email })).toHaveAttribute('href', `mailto:${student.email}`);

    fireEvent.click(screen.getByRole('button', { name: 'Suspend Rahul Sharma' }));
    await waitFor(() =>
      expect(apiMock.updateStatus).toHaveBeenCalledWith('mem-student-1', 'suspended')
    );
    expect(await screen.findByText('Rahul Sharma is now suspended.')).toBeInTheDocument();

    fireEvent.click(screen.getByRole('button', { name: 'Grant mentor role to Rahul Sharma' }));
    await waitFor(() => expect(apiMock.setMentor).toHaveBeenCalledWith('mem-student-1', true));
    fireEvent.click(screen.getByRole('button', { name: 'Grant moderator role to Rahul Sharma' }));
    await waitFor(() =>
      expect(apiMock.setRole).toHaveBeenCalledWith(
        'mem-student-1',
        'Community Moderator',
        true
      )
    );
  });

  it('searches through the shared API client and renders an empty state', async () => {
    apiMock.list.mockResolvedValueOnce([admin, student]).mockResolvedValueOnce([]);
    renderMembers();
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
    renderMembers();

    expect(await screen.findByRole('alert')).toHaveTextContent('Member service unavailable');
    fireEvent.click(screen.getByRole('button', { name: 'Try again' }));
    await waitFor(() => expect(apiMock.list).toHaveBeenCalledTimes(2));
  });

  it('loads direct profile URLs independently of search and preserves back navigation', async () => {
    renderMembers('/member-centre/members/mem-student-1?q=React');
    await screen.findByRole('heading', { name: 'Rahul Sharma', level: 1 });
    expect(apiMock.list).toHaveBeenLastCalledWith('');
    expect(apiMock.stats).not.toHaveBeenCalled();
    fireEvent.click(screen.getByRole('link', { name: 'Back to members' }));
    await screen.findByRole('heading', { name: 'Find your people' });
    expect(screen.getByRole('searchbox', { name: 'Search members' })).toHaveValue('React');
    expect(apiMock.list).toHaveBeenLastCalledWith('React');
    fireEvent.click(screen.getByRole('button', { name: 'Browser back' }));
    expect(await screen.findByRole('heading', { name: 'Rahul Sharma', level: 1 })).toBeInTheDocument();
    fireEvent.click(screen.getByRole('button', { name: 'Browser forward' }));
    expect(await screen.findByRole('heading', { name: 'Find your people' })).toBeInTheDocument();
  });

  it('handles missing profiles without showing the directory or administrator actions', async () => {
    renderMembers('/member-centre/members/missing');
    expect(await screen.findByRole('heading', { name: 'Member not found' })).toBeInTheDocument();
    expect(screen.getByRole('link', { name: 'Back to members' })).toHaveAttribute('href', '/member-centre');
    expect(screen.queryByRole('search')).not.toBeInTheDocument();
  });

  it('keeps non-administrators from seeing profile mutation controls', async () => {
    apiMock.current.mockResolvedValue(student);
    renderMembers('/member-centre/members/mem-admin-1');
    await screen.findByRole('heading', { name: 'Vikram Sen', level: 1 });
    expect(screen.queryByRole('button', { name: /Suspend|Grant mentor|Revoke mentor/ })).not.toBeInTheDocument();
  });

  it('allows recovery or return when a direct profile request fails', async () => {
    apiMock.list.mockRejectedValueOnce(new Error('Member service unavailable'));
    renderMembers('/member-centre/members/mem-student-1?q=React');
    expect(await screen.findByRole('alert')).toHaveTextContent('Member service unavailable');
    expect(screen.getByRole('link', { name: 'Back to members' })).toHaveAttribute('href', '/member-centre?q=React');
    fireEvent.click(screen.getByRole('button', { name: 'Try again' }));
    expect(await screen.findByRole('heading', { name: 'Rahul Sharma', level: 1 })).toBeInTheDocument();
  });
});
