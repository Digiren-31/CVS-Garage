import { cleanup, fireEvent, render, screen, waitFor } from '@testing-library/react';
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
    render(<EventsPage />);

    expect(await screen.findByRole('heading', { name: 'Discover campus events' })).toBeInTheDocument();
    expect(screen.getByText('Future Design Workshop')).toBeInTheDocument();

    fireEvent.click(screen.getByRole('button', { name: 'View details for Future Design Workshop' }));
    expect(await screen.findByRole('heading', { name: 'Future Design Workshop' })).toBeInTheDocument();
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
    render(<EventsPage />);

    await screen.findByText('Future Design Workshop');
    fireEvent.click(screen.getByRole('button', { name: 'View details for Future Design Workshop' }));
    fireEvent.click(await screen.findByRole('button', { name: 'Cancel registration' }));

    await waitFor(() => expect(apiMock.cancelRegistration).toHaveBeenCalledWith('event-1'));
    expect(
      await screen.findByText('Your registration for Future Design Workshop was cancelled.')
    ).toBeInTheDocument();
  });

  it('searches through the shared API client and shows an empty result', async () => {
    apiMock.list.mockResolvedValueOnce([event]).mockResolvedValueOnce([]);
    render(<EventsPage />);
    await screen.findByText('Future Design Workshop');

    fireEvent.change(screen.getByRole('searchbox', { name: 'Search events' }), {
      target: { value: 'no matches' }
    });
    fireEvent.submit(screen.getByRole('search'));

    await waitFor(() => expect(apiMock.list).toHaveBeenLastCalledWith('no matches'));
    expect(await screen.findByText('No events match these filters')).toBeInTheDocument();
  });

  it('shows an actionable error when discovery fails', async () => {
    apiMock.list.mockRejectedValueOnce(new Error('Event service unavailable'));
    render(<EventsPage />);

    expect(await screen.findByRole('alert')).toHaveTextContent('Event service unavailable');
    fireEvent.click(screen.getByRole('button', { name: 'Try again' }));
    expect(await screen.findByText('Future Design Workshop')).toBeInTheDocument();
  });
});
