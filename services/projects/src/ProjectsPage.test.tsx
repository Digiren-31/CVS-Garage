import { act, cleanup, fireEvent, render, screen, waitFor, within } from '@testing-library/react';
import { MemoryRouter, Route, Routes, useLocation, useNavigate } from 'react-router-dom';
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

function RouteControls() {
  const location = useLocation();
  const navigate = useNavigate();
  return (
    <>
      <span data-testid="location">{location.pathname}{location.search}</span>
      <button onClick={() => navigate(-1)}>Browser back</button>
      <button onClick={() => navigate(1)}>Browser forward</button>
    </>
  );
}

function renderProjects(initialEntries = ['/projects']) {
  return render(
    <MemoryRouter initialEntries={initialEntries}>
      <RouteControls />
      <Routes>
        <Route path="/projects" element={<ProjectsPage />} />
        <Route path="/projects/:projectId" element={<ProjectsPage />} />
      </Routes>
    </MemoryRouter>
  );
}

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
    renderProjects();

    expect(
      await screen.findByRole('heading', { name: 'Turn ideas into working projects' })
    ).toBeInTheDocument();
    expect(screen.getByRole('heading', { name: 'Project directory', level: 2 })).toBeInTheDocument();
    const card = within(screen.getByRole('article', { name: project.name }));
    expect(card.getByRole('heading', { name: project.name, level: 3 })).toBeInTheDocument();
    expect(card.getByRole('link', { name: `View ${project.name} details` })).toHaveAttribute('href', '/projects/PRJ-101');
    expect(screen.getByText('Total projects')).toBeInTheDocument();
    expect(screen.getByRole('combobox', { name: 'Filter by status' })).toBeInTheDocument();

    apiMock.list.mockResolvedValueOnce([]);
    fireEvent.change(screen.getByRole('searchbox', { name: 'Search projects' }), {
      target: { value: 'missing' }
    });
    fireEvent.submit(screen.getByRole('search'));

    await waitFor(() => expect(apiMock.list).toHaveBeenLastCalledWith('missing'));
    expect(await screen.findByText('No projects match these filters')).toBeInTheDocument();
    expect(screen.getByTestId('location')).toHaveTextContent('/projects?q=missing');
  });

  it('loads details and lets a project leader update a milestone', async () => {
    renderProjects(['/projects/PRJ-101']);

    expect(await screen.findByRole('heading', { name: project.name, level: 1 })).toBeInTheDocument();
    expect(apiMock.get).toHaveBeenCalledWith('PRJ-101');
    expect(screen.getByText('Map the engineering block')).toBeInTheDocument();
    expect(screen.getByText('2 team members')).toBeInTheDocument();
    expect(apiMock.list).not.toHaveBeenCalled();
    expect(screen.queryByRole('search')).not.toBeInTheDocument();
    expect(screen.queryByText('Total projects')).not.toBeInTheDocument();

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
    apiMock.get.mockResolvedValue(createdProject);
    renderProjects(['/projects?q=campus']);
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
    expect(await screen.findByRole('heading', { name: createdProject.name, level: 1 })).toBeInTheDocument();
    expect(screen.getByTestId('location')).toHaveTextContent('/projects/PRJ-new?q=campus');
    expect(screen.queryByRole('search')).not.toBeInTheDocument();
  });

  it('shows an actionable error when projects cannot be loaded', async () => {
    apiMock.list.mockRejectedValueOnce(new Error('Projects service unavailable'));
    renderProjects();

    expect(await screen.findByRole('alert')).toHaveTextContent('Projects service unavailable');
    fireEvent.click(screen.getByRole('button', { name: 'Try again' }));
    await waitFor(() => expect(apiMock.list).toHaveBeenCalledTimes(2));
  });

  it('navigates list to detail and back with all filters encoded in links', async () => {
    const query = '?q=campus&status=active&category=Smart+Campus';
    renderProjects([`/projects${query}`]);
    const link = await screen.findByRole('link', { name: `View ${project.name} details` });
    expect(apiMock.list).toHaveBeenLastCalledWith('campus');
    expect(link).toHaveAttribute('href', `/projects/PRJ-101${query}`);
    fireEvent.click(link);

    expect(await screen.findByRole('heading', { name: project.name, level: 1 })).toBeInTheDocument();
    expect(screen.queryByRole('heading', { name: 'Project directory' })).not.toBeInTheDocument();
    expect(screen.queryByRole('searchbox')).not.toBeInTheDocument();
    const back = screen.getByRole('link', { name: 'Back to projects' });
    expect(back).toHaveAttribute('href', `/projects${query}`);
    fireEvent.click(back);

    expect(await screen.findByRole('heading', { name: 'Project directory' })).toBeInTheDocument();
    expect(screen.getByRole('searchbox', { name: 'Search projects' })).toHaveValue('campus');
    expect(screen.getByRole('combobox', { name: 'Filter by status' })).toHaveValue('active');
    expect(screen.getByRole('combobox', { name: 'Filter by category' })).toHaveValue('Smart Campus');
  });

  it('uses browser history to restore filters and refetch the requested detail', async () => {
    renderProjects(['/projects?q=campus']);
    await screen.findByRole('heading', { name: 'Project directory' });
    fireEvent.change(screen.getByRole('combobox', { name: 'Filter by status' }), {
      target: { value: 'active' }
    });
    expect(screen.getByTestId('location')).toHaveTextContent('status=active');
    fireEvent.click(screen.getByRole('link', { name: `View ${project.name} details` }));
    await screen.findByRole('heading', { name: project.name, level: 1 });

    fireEvent.click(screen.getByRole('button', { name: 'Browser back' }));
    await screen.findByRole('heading', { name: 'Project directory' });
    expect(screen.getByRole('combobox', { name: 'Filter by status' })).toHaveValue('active');
    fireEvent.click(screen.getByRole('button', { name: 'Browser forward' }));
    expect(await screen.findByRole('heading', { name: project.name, level: 1 })).toBeInTheDocument();
    expect(apiMock.get).toHaveBeenCalledTimes(2);
  });

  it('loads different project IDs when moving through detail history', async () => {
    apiMock.get.mockImplementation(async (id: string) => id === createdProject.id ? createdProject : project);
    renderProjects(['/projects/PRJ-101', '/projects/PRJ-new']);
    await screen.findByRole('heading', { name: createdProject.name, level: 1 });
    fireEvent.click(screen.getByRole('button', { name: 'Browser back' }));
    expect(await screen.findByRole('heading', { name: project.name, level: 1 })).toBeInTheDocument();
    expect(screen.queryByRole('heading', { name: createdProject.name })).not.toBeInTheDocument();
    expect(apiMock.list).not.toHaveBeenCalled();
  });

  it('renders a missing-project state without falling back to the directory', async () => {
    apiMock.get.mockRejectedValueOnce(Object.assign(new Error('Project does not exist.'), { status: 404 }));
    renderProjects(['/projects/missing?q=campus']);
    const error = await screen.findByRole('alert');
    expect(error).toHaveTextContent('Project not found');
    expect(error).toHaveTextContent('Project does not exist.');
    expect(apiMock.get).toHaveBeenCalledWith('missing');
    expect(apiMock.list).not.toHaveBeenCalled();
    expect(screen.getByRole('link', { name: 'Back to projects' })).toHaveAttribute('href', '/projects?q=campus');
  });

  it('retries a direct detail fetch and preserves read-only milestone permissions', async () => {
    apiMock.current.mockResolvedValue({ ...leader, id: 'another-student' });
    apiMock.get.mockRejectedValueOnce(new Error('Project details are offline.'));
    renderProjects(['/projects/PRJ-101']);
    expect(await screen.findByRole('alert')).toHaveTextContent('Project details are offline.');
    fireEvent.click(screen.getByRole('button', { name: 'Try again' }));
    await screen.findByRole('heading', { name: project.name, level: 1 });
    expect(apiMock.get).toHaveBeenCalledTimes(2);
    expect(screen.queryByRole('button', { name: 'Save Map the engineering block status' })).not.toBeInTheDocument();
    expect(screen.getByText('Milestone changes are available to the project leader and administrators.')).toBeInTheDocument();
  });

  it('keeps milestone failures visible on the detail page', async () => {
    apiMock.updateMilestone.mockRejectedValueOnce(new Error('Milestone update denied.'));
    renderProjects(['/projects/PRJ-101']);
    fireEvent.click(await screen.findByRole('button', { name: 'Save Map the engineering block status' }));
    expect(await screen.findByRole('alert')).toHaveTextContent('Milestone update denied.');
    expect(screen.getByRole('heading', { name: project.name, level: 1 })).toBeInTheDocument();
    expect(screen.queryByRole('search')).not.toBeInTheDocument();
  });

  it('allows an active administrator to edit milestones on a direct detail URL', async () => {
    apiMock.current.mockResolvedValue({
      ...leader,
      id: 'admin',
      role: 'Admin',
      roles: ['Admin']
    });
    renderProjects(['/projects/PRJ-101']);
    expect(await screen.findByRole('button', { name: 'Save Map the engineering block status' })).toBeInTheDocument();
  });

  it('can leave a loading detail without a late response reopening it', async () => {
    let resolveDetail!: (value: Project) => void;
    apiMock.get.mockReturnValueOnce(new Promise<Project>((resolve) => { resolveDetail = resolve; }));
    renderProjects(['/projects/PRJ-101?q=campus']);
    expect(screen.getByText('Loading project details')).toBeInTheDocument();
    fireEvent.click(screen.getByRole('link', { name: 'Back to projects' }));
    await screen.findByRole('heading', { name: 'Project directory' });
    await act(async () => { resolveDetail(project); });
    expect(screen.getByRole('heading', { name: 'Project directory' })).toBeInTheDocument();
    expect(screen.queryByRole('heading', { name: project.name, level: 1 })).not.toBeInTheDocument();
  });
});
