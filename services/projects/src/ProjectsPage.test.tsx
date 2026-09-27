import { cleanup, fireEvent, render, screen, waitFor } from '@testing-library/react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import type { Member, Project } from '../../../packages/contracts/src';
import { ProjectsPage } from './ProjectsPage';

const leader: Member = {
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

const project: Project = {
  id: 'PRJ-101',
  slug: 'smart-campus-nav',
  name: 'Smart Campus Navigation',
  tagline: 'Accessible indoor navigation for every campus building.',
  description:
    'A mobile-first navigation platform using Bluetooth beacons and accessibility-aware routing.',
  category: 'Smart Campus',
  status: 'active',
  progress: 50,
  leaderId: leader.id,
  memberIds: [leader.id, 'mem-student-2'],
  tags: ['IoT', 'Accessibility'],
  repositoryUrl: 'https://github.com/cvs-garage/smart-campus-navigation',
  milestones: [
    {
      id: 'MS-101-1',
      title: 'Map the engineering block',
      status: 'in_progress',
      dueDate: '2026-10-15'
    },
    {
      id: 'MS-101-2',
      title: 'Pilot accessible routing',
      status: 'planned',
      dueDate: '2026-11-15'
    }
  ],
  createdAt: '2026-08-12T09:00:00.000Z'
};

const createdProject: Project = {
  ...project,
  id: 'PRJ-new',
  slug: 'campus-water-watch',
  name: 'Campus Water Watch',
  leaderId: leader.id,
  memberIds: [leader.id],
  status: 'planning',
  progress: 0,
  milestones: []
};

const apiMock = vi.hoisted(() => ({
  list: vi.fn(),
  get: vi.fn(),
  create: vi.fn(),
  updateMilestone: vi.fn(),
  current: vi.fn()
}));

vi.mock('../../../packages/api-client/src', () => ({
  api: {
    projects: {
      list: apiMock.list,
      get: apiMock.get,
      create: apiMock.create,
      updateMilestone: apiMock.updateMilestone
    },
    members: {
      current: apiMock.current
    }
  }
}));

describe('ProjectsPage', () => {
  afterEach(() => {
    cleanup();
  });

  beforeEach(() => {
    apiMock.list.mockReset().mockResolvedValue([project]);
    apiMock.get.mockReset().mockResolvedValue(project);
    apiMock.create.mockReset().mockResolvedValue(createdProject);
    apiMock.updateMilestone.mockReset().mockResolvedValue({
      ...project,
      progress: 100,
      milestones: project.milestones.map((milestone) => ({
        ...milestone,
        status: 'completed' as const
      }))
    });
    apiMock.current.mockReset().mockResolvedValue(leader);
  });

  it('renders project metrics, browse controls, and an explicit empty search state', async () => {
    render(<ProjectsPage />);

    expect(
      await screen.findByRole('heading', { name: 'Turn ideas into working projects' })
    ).toBeInTheDocument();
    expect(screen.getByText('Smart Campus Navigation')).toBeInTheDocument();
    expect(screen.getByText('Total projects')).toBeInTheDocument();
    expect(screen.getByRole('combobox', { name: 'Filter by status' })).toBeInTheDocument();

    apiMock.list.mockResolvedValueOnce([]);
    fireEvent.change(screen.getByRole('searchbox', { name: 'Search projects' }), {
      target: { value: 'missing' }
    });
    fireEvent.submit(screen.getByRole('search'));

    await waitFor(() => expect(apiMock.list).toHaveBeenLastCalledWith('missing'));
    expect(await screen.findByText('No projects match these filters')).toBeInTheDocument();
  });

  it('loads details and lets a project leader update a milestone', async () => {
    render(<ProjectsPage />);
    await screen.findByText('Smart Campus Navigation');

    fireEvent.click(screen.getByRole('button', { name: 'View Smart Campus Navigation details' }));
    expect(await screen.findByRole('heading', { name: 'Project details' })).toBeInTheDocument();
    expect(apiMock.get).toHaveBeenCalledWith('PRJ-101');
    expect(screen.getByText('Map the engineering block')).toBeInTheDocument();
    expect(screen.getAllByText('2 team members')).toHaveLength(2);

    fireEvent.change(screen.getByRole('combobox', { name: 'Status for Map the engineering block' }), {
      target: { value: 'completed' }
    });
    fireEvent.click(screen.getByRole('button', { name: 'Save Map the engineering block status' }));

    await waitFor(() =>
      expect(apiMock.updateMilestone).toHaveBeenCalledWith('PRJ-101', 'MS-101-1', 'completed')
    );
    expect(await screen.findByText('Milestone status updated.')).toBeInTheDocument();
  });

  it('submits a trimmed project proposal through the shared API client', async () => {
    render(<ProjectsPage />);
    await screen.findByText('Smart Campus Navigation');

    fireEvent.click(screen.getByRole('button', { name: 'Propose a project' }));
    fireEvent.change(await screen.findByRole('textbox', { name: 'Project name' }), {
      target: { value: '  Campus Water Watch  ' }
    });
    fireEvent.change(screen.getByRole('textbox', { name: 'Tagline' }), {
      target: { value: '  Make campus water usage visible to facilities teams.  ' }
    });
    fireEvent.change(screen.getByRole('textbox', { name: 'Description' }), {
      target: {
        value:
          '  A student-led monitoring dashboard that identifies unusual water use and supports quicker maintenance.  '
      }
    });
    fireEvent.change(screen.getByRole('textbox', { name: 'Category' }), {
      target: { value: '  Sustainability  ' }
    });
    fireEvent.change(screen.getByRole('textbox', { name: 'Tags' }), {
      target: { value: ' IoT, Analytics ' }
    });
    fireEvent.click(screen.getByRole('button', { name: 'Submit proposal' }));

    await waitFor(() =>
      expect(apiMock.create).toHaveBeenCalledWith({
        name: 'Campus Water Watch',
        tagline: 'Make campus water usage visible to facilities teams.',
        description:
          'A student-led monitoring dashboard that identifies unusual water use and supports quicker maintenance.',
        category: 'Sustainability',
        tags: ['IoT', 'Analytics']
      })
    );
    expect(await screen.findByText('Campus Water Watch was added as a project proposal.')).toBeInTheDocument();
  });

  it('shows an actionable error when projects cannot be loaded', async () => {
    apiMock.list.mockRejectedValueOnce(new Error('Projects service unavailable'));
    render(<ProjectsPage />);

    expect(await screen.findByRole('alert')).toHaveTextContent('Projects service unavailable');
    fireEvent.click(screen.getByRole('button', { name: 'Try again' }));
    await waitFor(() => expect(apiMock.list).toHaveBeenCalledTimes(2));
  });
});
