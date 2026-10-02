import {
  cleanup,
  fireEvent,
  render,
  screen,
  waitFor,
  within
} from '@testing-library/react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { MemoryRouter, Route, Routes } from 'react-router-dom';
import type { Idea } from '../../../packages/contracts/src';
import { IdeaCentrePage } from './IdeaCentrePage';

const ideas: Idea[] = [
  {
    id: 'IDEA-2026-101',
    ticketCode: 'IDEA-2026-101',
    title: 'Solar-powered campus irrigation',
    tagline: 'Water gardens only when needed',
    description: 'A sensor network for efficient campus irrigation.',
    track: 'Sustainability',
    difficulty: 'Hard',
    status: 'Open',
    ownerId: 'mem-student-2',
    ownerName: 'Ananya Verma',
    assignedMentorId: null,
    assignedMentorName: null,
    seekingMentor: true,
    targetTeamSize: 4,
    memberIds: ['mem-student-2'],
    techStack: ['ESP32', 'TypeScript'],
    savedByCurrentUser: false,
    joinRequestStatus: null,
    comments: [
      {
        id: 'existing-comment',
        ideaId: 'IDEA-2026-101',
        authorId: 'mem-mentor-1',
        authorName: 'Dr. Priya Nair',
        content: 'Please include measurable water-saving targets.',
        createdAt: '2026-09-25T10:00:00.000Z'
      }
    ],
    createdAt: '2026-08-12T09:30:00.000Z'
  },
  {
    id: 'IDEA-2026-102',
    ticketCode: 'IDEA-2026-102',
    title: 'Accessible campus wayfinding',
    tagline: 'Step-free routes across campus',
    description: 'An accessibility-first map for every student.',
    track: 'Campus Experience',
    difficulty: 'Medium',
    status: 'In Progress',
    ownerId: 'mem-student-1',
    ownerName: 'Rahul Sharma',
    assignedMentorId: 'mem-mentor-1',
    assignedMentorName: 'Dr. Priya Nair',
    seekingMentor: false,
    targetTeamSize: 3,
    memberIds: ['mem-student-1'],
    techStack: ['React'],
    savedByCurrentUser: true,
    joinRequestStatus: null,
    comments: [],
    createdAt: '2026-08-25T11:15:00.000Z'
  }
];

const apiMock = vi.hoisted(() => ({
  getUserId: vi.fn(() => 'mem-student-1'),
  list: vi.fn(),
  create: vi.fn(),
  toggleSave: vi.fn(),
  requestJoin: vi.fn(),
  addComment: vi.fn()
}));

vi.mock('../../../packages/api-client/src', () => ({
  api: {
    getUserId: apiMock.getUserId,
    ideas: {
      list: apiMock.list,
      create: apiMock.create,
      toggleSave: apiMock.toggleSave,
      requestJoin: apiMock.requestJoin,
      addComment: apiMock.addComment
    }
  }
}));

function renderIdeaCentre(initialEntry = '/idea-centre') {
  return render(
    <MemoryRouter initialEntries={[initialEntry]}>
      <Routes>
        <Route path="/idea-centre" element={<IdeaCentrePage />} />
        <Route
          path="/idea-centre/ideas/:ideaId"
          element={<IdeaCentrePage />}
        />
      </Routes>
    </MemoryRouter>
  );
}

describe('IdeaCentrePage', () => {
  afterEach(() => {
    cleanup();
  });

  beforeEach(() => {
    apiMock.getUserId.mockReturnValue('mem-student-1');
    apiMock.list.mockReset().mockResolvedValue(ideas);
    apiMock.create.mockReset();
    apiMock.toggleSave.mockReset().mockResolvedValue({
      ideaId: ideas[0].id,
      saved: true
    });
    apiMock.requestJoin.mockReset().mockResolvedValue({
      ...ideas[0],
      joinRequestStatus: 'Pending'
    });
    apiMock.addComment.mockReset().mockResolvedValue({
      ...ideas[0],
      comments: [
        ...ideas[0].comments,
        {
          id: 'comment-1',
          ideaId: ideas[0].id,
          authorId: 'mem-student-1',
          authorName: 'Rahul Sharma',
          content: 'I can help test the sensor network.',
          createdAt: '2026-09-27T10:00:00.000Z'
        }
      ]
    });
  });

  it('browses, searches, and filters ideas', async () => {
    renderIdeaCentre();

    expect(
      await screen.findByRole('heading', { name: 'Turn an idea into shared momentum' })
    ).toBeInTheDocument();
    const card = within(
      screen.getByRole('article', { name: 'Solar-powered campus irrigation. Open idea details' })
    );
    expect(card.getByRole('heading', { name: /Solar-powered campus irrigation/, level: 2 })).toBeInTheDocument();
    expect(card.getByRole('link', { name: 'Open Solar-powered campus irrigation' })).toBeInTheDocument();
    expect(screen.getByText('Mentored by Dr. Priya Nair')).toBeInTheDocument();
    expect(screen.getByRole('button', { name: '1 comment' })).toBeInTheDocument();
    expect(
      screen.queryByText('A sensor network for efficient campus irrigation.')
    ).not.toBeInTheDocument();
    expect(
      screen.queryByText('Please include measurable water-saving targets.')
    ).not.toBeInTheDocument();

    fireEvent.change(screen.getByRole('searchbox', { name: 'Search ideas' }), {
      target: { value: 'solar' }
    });
    fireEvent.submit(screen.getByRole('search'));
    await waitFor(() => expect(apiMock.list).toHaveBeenLastCalledWith('solar'));

    fireEvent.change(screen.getByRole('combobox', { name: 'Status' }), {
      target: { value: 'In Progress' }
    });
    expect(screen.queryByText('Solar-powered campus irrigation')).not.toBeInTheDocument();
    expect(screen.getByText('Accessible campus wayfinding')).toBeInTheDocument();
  });

  it('supports save, join-request, and comment workflows', async () => {
    renderIdeaCentre();
    await screen.findByText('Solar-powered campus irrigation');

    fireEvent.click(
      screen.getByRole('button', { name: 'Save Solar-powered campus irrigation' })
    );
    await waitFor(() =>
      expect(apiMock.toggleSave).toHaveBeenCalledWith('IDEA-2026-101')
    );

    fireEvent.click(screen.getByRole('button', { name: 'Request to join' }));
    fireEvent.change(screen.getByRole('textbox', { name: 'How would you contribute?' }), {
      target: { value: 'I can build and test the telemetry dashboard.' }
    });
    fireEvent.click(screen.getByRole('button', { name: 'Send request' }));
    await waitFor(() =>
      expect(apiMock.requestJoin).toHaveBeenCalledWith(
        'IDEA-2026-101',
        'I can build and test the telemetry dashboard.'
      )
    );

    fireEvent.click(
      screen.getByRole('link', { name: 'Open Solar-powered campus irrigation' })
    );
    expect(
      await screen.findByRole('heading', {
        name: 'Solar-powered campus irrigation',
        level: 1
      })
    ).toBeInTheDocument();
    expect(screen.queryByRole('dialog')).not.toBeInTheDocument();
    expect(screen.getByRole('link', { name: 'Back to ideas' })).toBeInTheDocument();
    expect(
      screen.getByText('A sensor network for efficient campus irrigation.')
    ).toBeInTheDocument();
    expect(
      screen.getByText('Please include measurable water-saving targets.')
    ).toBeInTheDocument();

    const comments = within(
      screen.getByRole('region', { name: 'Comments on Solar-powered campus irrigation' })
    );
    fireEvent.change(comments.getByRole('textbox', { name: 'Add a comment' }), {
      target: { value: 'I can help test the sensor network.' }
    });
    fireEvent.click(comments.getByRole('button', { name: 'Comment' }));
    await waitFor(() =>
      expect(apiMock.addComment).toHaveBeenCalledWith(
        'IDEA-2026-101',
        'I can help test the sensor network.'
      )
    );
    expect(await screen.findByText('Rahul Sharma')).toBeInTheDocument();
  });

  it('submits a complete idea and reports load failures', async () => {
    const created = {
      ...ideas[0],
      id: 'IDEA-2026-104',
      ticketCode: 'IDEA-2026-104',
      title: 'Low-cost air quality stations'
    };
    apiMock.create.mockResolvedValue(created);
    const { unmount } = renderIdeaCentre();
    await screen.findByText('Solar-powered campus irrigation');

    fireEvent.click(screen.getAllByRole('button', { name: 'Submit an idea' })[0]);
    fireEvent.change(screen.getByRole('textbox', { name: 'Title' }), {
      target: { value: 'Low-cost air quality stations' }
    });
    fireEvent.change(screen.getByRole('textbox', { name: 'Tagline' }), {
      target: { value: 'Find healthier places to study' }
    });
    fireEvent.change(screen.getByRole('textbox', { name: 'Description' }), {
      target: { value: 'Publish calibrated particulate readings across campus.' }
    });
    fireEvent.change(screen.getByRole('textbox', { name: 'Track' }), {
      target: { value: 'Sustainability' }
    });
    fireEvent.change(screen.getByRole('textbox', { name: 'Technology or skills' }), {
      target: { value: 'ESP32, TypeScript' }
    });
    fireEvent.click(screen.getAllByRole('button', { name: 'Submit idea' })[0]);

    await waitFor(() =>
      expect(apiMock.create).toHaveBeenCalledWith(
        expect.objectContaining({
          title: 'Low-cost air quality stations',
          techStack: ['ESP32', 'TypeScript']
        })
      )
    );
    expect(
      await screen.findByText('Low-cost air quality stations was submitted to the Idea Centre.')
    ).toBeInTheDocument();

    unmount();
    apiMock.list.mockRejectedValueOnce(new Error('Idea Centre unavailable'));
    renderIdeaCentre();
    expect(await screen.findByRole('alert')).toHaveTextContent('Idea Centre unavailable');
  });

  it('loads an idea detail page directly and returns to the ideas page', async () => {
    renderIdeaCentre('/idea-centre/ideas/IDEA-2026-101');

    expect(
      await screen.findByRole('heading', {
        name: 'Solar-powered campus irrigation',
        level: 1
      })
    ).toBeInTheDocument();
    expect(
      screen.getByText('Please include measurable water-saving targets.')
    ).toBeInTheDocument();
    expect(
      screen.getByRole('textbox', { name: 'Add a comment' })
    ).toBeInTheDocument();

    fireEvent.click(screen.getByRole('link', { name: 'Back to ideas' }));
    expect(
      await screen.findByRole('heading', {
        name: 'Turn an idea into shared momentum',
        level: 1
      })
    ).toBeInTheDocument();
  });

  it('keeps idea cards keyboard-accessible without activating nested actions', async () => {
    renderIdeaCentre();
    const card = await screen.findByRole('article', {
      name: 'Solar-powered campus irrigation. Open idea details'
    });
    fireEvent.keyDown(card, { key: 'Enter' });
    expect(
      await screen.findByRole('heading', { name: ideas[0].title, level: 1 })
    ).toBeInTheDocument();

    fireEvent.click(screen.getByRole('link', { name: 'Back to ideas' }));
    const restoredCard = await screen.findByRole('article', {
      name: 'Solar-powered campus irrigation. Open idea details'
    });

    fireEvent.click(within(restoredCard).getByRole('button', { name: `Save ${ideas[0].title}` }));
    await waitFor(() => expect(apiMock.toggleSave).toHaveBeenCalledWith(ideas[0].id));
    expect(screen.getByRole('article', { name: `${ideas[0].title}. Open idea details` })).toBeInTheDocument();

    fireEvent.keyDown(restoredCard, { key: ' ' });
    expect(
      await screen.findByRole('heading', { name: ideas[0].title, level: 1 })
    ).toBeInTheDocument();
  });

  it('opens a direct idea independently of discovery filters and restores them on return', async () => {
    renderIdeaCentre('/idea-centre/ideas/IDEA-2026-101?q=solar&status=Open&track=Sustainability');
    await screen.findByRole('heading', { name: ideas[0].title, level: 1 });
    expect(apiMock.list).toHaveBeenLastCalledWith('');
    expect(screen.queryByRole('search')).not.toBeInTheDocument();
    expect(screen.queryByRole('article')).not.toBeInTheDocument();
    fireEvent.click(screen.getByRole('link', { name: 'Back to ideas' }));
    await screen.findByRole('search');
    expect(apiMock.list).toHaveBeenLastCalledWith('solar');
    expect(screen.getByRole('searchbox', { name: 'Search ideas' })).toHaveValue('solar');
    expect(screen.getByRole('combobox', { name: 'Status' })).toHaveValue('Open');
    expect(screen.getByRole('combobox', { name: 'Track' })).toHaveValue('Sustainability');
  });

  it('offers a list link for missing ideas and failed direct loads', async () => {
    const { unmount } = renderIdeaCentre('/idea-centre/ideas/missing');
    expect(await screen.findByRole('heading', { name: 'Idea not found' })).toBeInTheDocument();
    expect(screen.getByRole('link', { name: 'Back to ideas' })).toBeInTheDocument();
    unmount();
    apiMock.list.mockRejectedValueOnce(new Error('Idea service unavailable'));
    renderIdeaCentre('/idea-centre/ideas/IDEA-2026-101');
    expect(await screen.findByRole('alert')).toHaveTextContent('Idea service unavailable');
    expect(screen.getByRole('link', { name: 'Back to ideas' })).toBeInTheDocument();
    fireEvent.click(screen.getByRole('button', { name: 'Try again' }));
    expect(await screen.findByRole('heading', { name: ideas[0].title, level: 1 })).toBeInTheDocument();
  });

  it('retains a selected track when returning to an empty search result', async () => {
    apiMock.list.mockImplementation(async (query: string) => query === 'unrelated' ? [] : ideas);
    renderIdeaCentre('/idea-centre/ideas/IDEA-2026-101?q=unrelated&track=Sustainability');
    await screen.findByRole('heading', { name: ideas[0].title, level: 1 });
    fireEvent.click(screen.getByRole('link', { name: 'Back to ideas' }));
    await screen.findByText('No ideas match these filters');
    expect(screen.getByRole('searchbox', { name: 'Search ideas' })).toHaveValue('unrelated');
    expect(screen.getByRole('combobox', { name: 'Track' })).toHaveValue('Sustainability');
  });
});
