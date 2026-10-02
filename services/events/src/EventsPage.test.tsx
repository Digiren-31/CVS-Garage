import { act, cleanup, fireEvent, render, screen, waitFor, within } from '@testing-library/react';
import { MemoryRouter, Route, Routes, useLocation, useNavigate } from 'react-router-dom';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import type { Event, EventRegistration } from '../../../packages/contracts/src';
import { EventsPage } from './EventsPage';

const registration: EventRegistration = {
  id: 'registration-1',
  eventId: 'event-1',
  memberId: 'mem-student-1',
  role: 'Participant',
  status: 'Registered',
  registeredAt: '2026-09-27T12:00:00.000Z'
};

const event: Event = {
  id: 'event-1',
  slug: 'future-design-workshop',
  title: 'Future Design Workshop',
  summary: 'Practice research and rapid prototyping.',
  description: 'A detailed, collaborative design workshop for student teams.',
  category: 'Workshops',
  mode: 'Hybrid',
  status: 'Published',
  startsAt: '2099-10-14T09:00:00.000Z',
  endsAt: '2099-10-14T17:00:00.000Z',
  registrationEndsAt: '2099-10-10T23:59:59.000Z',
  venue: 'Innovation Hub',
  organizerId: 'org-design',
  organizerName: 'Design Guild',
  capacity: 40,
  registrationCount: 12,
  tags: ['Design', 'Research'],
  schedule: [
    {
      id: 'schedule-1',
      title: 'Research framing',
      startsAt: '2099-10-14T09:00:00.000Z',
      endsAt: '2099-10-14T10:00:00.000Z'
    }
  ],
  currentUserRegistration: null
};

const apiMock = vi.hoisted(() => ({
  list: vi.fn(),
  get: vi.fn(),
  register: vi.fn(),
  cancelRegistration: vi.fn()
}));

vi.mock('../../../packages/api-client/src', () => ({
  api: {
    events: apiMock
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

function renderEvents(initialEntries = ['/events']) {
  return render(
    <MemoryRouter initialEntries={initialEntries}>
      <RouteControls />
      <Routes>
        <Route path="/events" element={<EventsPage />} />
        <Route path="/events/:eventId" element={<EventsPage />} />
      </Routes>
    </MemoryRouter>
  );
}

describe('EventsPage', () => {
  afterEach(cleanup);

  beforeEach(() => {
    apiMock.list.mockReset().mockResolvedValue([event]);
    apiMock.get.mockReset().mockResolvedValue(event);
    apiMock.register.mockReset().mockResolvedValue(registration);
    apiMock.cancelRegistration.mockReset().mockResolvedValue({
      eventId: event.id,
      cancelled: true
    });
  });

  it('discovers an event, presents its schedule, and registers the current member', async () => {
    apiMock.get
      .mockResolvedValueOnce(event)
      .mockResolvedValueOnce({
        ...event,
        registrationCount: 13,
        currentUserRegistration: registration
      });
    renderEvents();

    expect(await screen.findByRole('heading', { name: 'Discover campus events' })).toBeInTheDocument();
    expect(screen.getByRole('heading', { name: 'Event directory', level: 2 })).toBeInTheDocument();
    const card = within(screen.getByRole('article', { name: event.title }));
    expect(card.getByRole('heading', { name: event.title, level: 3 })).toBeInTheDocument();
    expect(card.getByText('Published')).toBeInTheDocument();

    fireEvent.click(screen.getByRole('link', { name: 'View details for Future Design Workshop' }));
    expect(await screen.findByRole('heading', { name: 'Future Design Workshop', level: 1 })).toBeInTheDocument();
    expect(screen.getByTestId('location')).toHaveTextContent('/events/event-1');
    expect(screen.queryByRole('search')).not.toBeInTheDocument();
    expect(screen.queryByText('Events found')).not.toBeInTheDocument();
    expect(screen.getByText('Research framing')).toBeInTheDocument();
    expect(screen.getByText('12 of 40 places reserved')).toBeInTheDocument();

    fireEvent.click(screen.getByRole('button', { name: 'Register' }));
    await waitFor(() => expect(apiMock.register).toHaveBeenCalledWith('event-1'));
    expect(
      await screen.findByText('You are registered for Future Design Workshop.')
    ).toBeInTheDocument();
  });

  it('cancels only the displayed current-user registration', async () => {
    const registeredEvent = {
      ...event,
      registrationCount: 13,
      currentUserRegistration: registration
    };
    apiMock.list.mockResolvedValue([registeredEvent]);
    apiMock.get.mockResolvedValueOnce(registeredEvent).mockResolvedValueOnce(event);
    renderEvents(['/events/event-1']);
    fireEvent.click(await screen.findByRole('button', { name: 'Cancel registration' }));

    await waitFor(() => expect(apiMock.cancelRegistration).toHaveBeenCalledWith('event-1'));
    expect(
      await screen.findByText('Your registration for Future Design Workshop was cancelled.')
    ).toBeInTheDocument();
    expect(apiMock.list).not.toHaveBeenCalled();
  });

  it('searches through the shared API client and shows an empty result', async () => {
    apiMock.list.mockResolvedValueOnce([event]).mockResolvedValueOnce([]);
    renderEvents();
    await screen.findByText('Future Design Workshop');

    fireEvent.change(screen.getByRole('searchbox', { name: 'Search events' }), {
      target: { value: 'no matches' }
    });
    fireEvent.submit(screen.getByRole('search'));

    await waitFor(() => expect(apiMock.list).toHaveBeenLastCalledWith('no matches'));
    expect(await screen.findByText('No events match these filters')).toBeInTheDocument();
    expect(screen.getByTestId('location')).toHaveTextContent('/events?q=no+matches');
  });

  it('shows an actionable error when discovery fails', async () => {
    apiMock.list.mockRejectedValueOnce(new Error('Event service unavailable'));
    renderEvents();

    expect(await screen.findByRole('alert')).toHaveTextContent('Event service unavailable');
    fireEvent.click(screen.getByRole('button', { name: 'Try again' }));
    expect(await screen.findByText('Future Design Workshop')).toBeInTheDocument();
  });

  it('keeps search, category, and format in detail and back links', async () => {
    const query = '?q=design&category=Workshops&mode=Hybrid';
    renderEvents([`/events${query}`]);
    const link = await screen.findByRole('link', { name: `View details for ${event.title}` });
    expect(apiMock.list).toHaveBeenLastCalledWith('design');
    expect(link).toHaveAttribute('href', `/events/event-1${query}`);
    fireEvent.click(link);
    await screen.findByRole('heading', { name: event.title, level: 1 });
    expect(screen.queryByRole('heading', { name: 'Event directory' })).not.toBeInTheDocument();

    const back = screen.getByRole('link', { name: 'Back to events' });
    expect(back).toHaveAttribute('href', `/events${query}`);
    fireEvent.click(back);
    await screen.findByRole('heading', { name: 'Event directory' });
    expect(screen.getByRole('searchbox', { name: 'Search events' })).toHaveValue('design');
    expect(screen.getByRole('combobox', { name: 'Filter events by category' })).toHaveTextContent('Workshops');
    expect(screen.getByRole('combobox', { name: 'Filter events by format' })).toHaveTextContent('Hybrid');
  });

  it('loads a direct detail URL without fetching the discovery list', async () => {
    renderEvents(['/events/event-1?q=design&mode=Hybrid']);
    expect(await screen.findByRole('heading', { name: event.title, level: 1 })).toBeInTheDocument();
    expect(apiMock.get).toHaveBeenCalledWith('event-1');
    expect(apiMock.list).not.toHaveBeenCalled();
    expect(screen.getByText('Research framing')).toBeInTheDocument();
    expect(screen.getByRole('link', { name: 'Back to events' })).toHaveAttribute('href', '/events?q=design&mode=Hybrid');
  });

  it('restores directory filters and the detail URL with browser back and forward', async () => {
    renderEvents(['/events?q=design&mode=Hybrid']);
    fireEvent.click(await screen.findByRole('link', { name: `View details for ${event.title}` }));
    await screen.findByRole('heading', { name: event.title, level: 1 });
    fireEvent.click(screen.getByRole('button', { name: 'Browser back' }));
    await screen.findByRole('heading', { name: 'Event directory' });
    expect(screen.getByRole('searchbox', { name: 'Search events' })).toHaveValue('design');
    expect(screen.getByRole('combobox', { name: 'Filter events by format' })).toHaveTextContent('Hybrid');
    fireEvent.click(screen.getByRole('button', { name: 'Browser forward' }));
    expect(await screen.findByRole('heading', { name: event.title, level: 1 })).toBeInTheDocument();
    expect(apiMock.get).toHaveBeenCalledTimes(2);
  });

  it('fetches the correct item when history changes the event ID', async () => {
    const nextEvent = { ...event, id: 'event-2', title: 'Campus Build Night' };
    apiMock.get.mockImplementation(async (id: string) => id === nextEvent.id ? nextEvent : event);
    renderEvents(['/events/event-1', '/events/event-2']);
    await screen.findByRole('heading', { name: nextEvent.title, level: 1 });
    fireEvent.click(screen.getByRole('button', { name: 'Browser back' }));
    expect(await screen.findByRole('heading', { name: event.title, level: 1 })).toBeInTheDocument();
    expect(screen.queryByRole('heading', { name: nextEvent.title })).not.toBeInTheDocument();
    expect(apiMock.list).not.toHaveBeenCalled();
  });

  it('shows an unknown-event state with an escape back to the filtered directory', async () => {
    apiMock.get.mockRejectedValueOnce(Object.assign(new Error('Event does not exist.'), { status: 404 }));
    renderEvents(['/events/missing?category=Workshops']);
    const error = await screen.findByRole('alert');
    expect(error).toHaveTextContent('Event not found');
    expect(error).toHaveTextContent('Event does not exist.');
    expect(apiMock.get).toHaveBeenCalledWith('missing');
    expect(apiMock.list).not.toHaveBeenCalled();
    expect(screen.getByRole('link', { name: 'Back to events' })).toHaveAttribute('href', '/events?category=Workshops');
  });

  it('retries a failed direct detail fetch without resetting the URL', async () => {
    apiMock.get.mockRejectedValueOnce(new Error('Event details are offline.'));
    renderEvents(['/events/event-1?q=design']);
    expect(await screen.findByRole('alert')).toHaveTextContent('Event details are offline.');
    fireEvent.click(screen.getByRole('button', { name: 'Try again' }));
    expect(await screen.findByRole('heading', { name: event.title, level: 1 })).toBeInTheDocument();
    expect(apiMock.get).toHaveBeenCalledTimes(2);
    expect(screen.getByTestId('location')).toHaveTextContent('/events/event-1?q=design');
  });

  it('keeps registration failures visible without navigating away', async () => {
    apiMock.register.mockRejectedValueOnce(new Error('Registration is closed.'));
    renderEvents(['/events/event-1']);
    fireEvent.click(await screen.findByRole('button', { name: 'Register' }));
    expect(await screen.findByRole('alert')).toHaveTextContent('Registration is closed.');
    expect(screen.getByRole('heading', { name: event.title, level: 1 })).toBeInTheDocument();
    expect(screen.queryByRole('search')).not.toBeInTheDocument();
  });

  it('retries a failed post-registration refresh without repeating the mutation', async () => {
    apiMock.get
      .mockResolvedValueOnce(event)
      .mockRejectedValueOnce(new Error('The updated event could not be loaded.'))
      .mockResolvedValueOnce({ ...event, currentUserRegistration: registration });
    renderEvents(['/events/event-1?q=design']);
    fireEvent.click(await screen.findByRole('button', { name: 'Register' }));
    expect(await screen.findByRole('alert')).toHaveTextContent('The updated event could not be loaded.');
    expect(screen.queryByText(`You are registered for ${event.title}.`)).not.toBeInTheDocument();
    fireEvent.click(screen.getByRole('button', { name: 'Refresh event details' }));
    expect(await screen.findByRole('button', { name: 'Cancel registration' })).toBeInTheDocument();
    expect(apiMock.register).toHaveBeenCalledTimes(1);
    expect(apiMock.get).toHaveBeenCalledTimes(3);
    expect(apiMock.list).not.toHaveBeenCalled();
    expect(screen.getByTestId('location')).toHaveTextContent('/events/event-1?q=design');
  });

  it('retains the registration when cancellation fails', async () => {
    apiMock.get.mockResolvedValue({ ...event, currentUserRegistration: registration });
    apiMock.cancelRegistration.mockRejectedValueOnce(new Error('Cancellation could not be completed.'));
    renderEvents(['/events/event-1']);
    fireEvent.click(await screen.findByRole('button', { name: 'Cancel registration' }));
    expect(await screen.findByRole('alert')).toHaveTextContent('Cancellation could not be completed.');
    expect(screen.getByRole('button', { name: 'Cancel registration' })).toBeEnabled();
    expect(screen.queryByRole('button', { name: 'Register' })).not.toBeInTheDocument();
  });

  it('ignores a late detail response after returning to the directory', async () => {
    let resolveDetail!: (value: Event) => void;
    apiMock.get.mockReturnValueOnce(new Promise<Event>((resolve) => { resolveDetail = resolve; }));
    renderEvents(['/events/event-1']);
    expect(screen.getByText('Loading event details')).toBeInTheDocument();
    fireEvent.click(screen.getByRole('link', { name: 'Back to events' }));
    await screen.findByRole('heading', { name: 'Event directory' });
    await act(async () => { resolveDetail(event); });
    expect(screen.getByRole('heading', { name: 'Event directory' })).toBeInTheDocument();
    expect(screen.queryByRole('heading', { name: event.title, level: 1 })).not.toBeInTheDocument();
  });
});
