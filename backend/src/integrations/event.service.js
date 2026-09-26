/**
 * CVS Garage — Event Management Integration Adapter
 * Owns events, hackathons, workshops, and dates.
 * Follows Rule 4: Event Management owns events.
 */

export const MOCK_EVENTS = [
  {
    id: 'EVT-2026-01',
    title: 'HackSprint 2026 (36h Campus Hackathon)',
    slug: 'hacksprint-2026',
    type: 'hackathon',
    startDate: '2026-10-14T09:00:00Z',
    endDate: '2026-10-15T21:00:00Z',
    status: 'upcoming',
    description: 'Annual flagship college hackathon focused on sustainable smart campus and AI solutions.'
  },
  {
    id: 'EVT-2026-02',
    title: 'Annual Tech Innovation Fest 2026',
    slug: 'tech-fest-2026',
    type: 'tech_fest',
    startDate: '2026-11-02T10:00:00Z',
    endDate: '2026-11-04T18:00:00Z',
    status: 'upcoming',
    description: 'Hardware exhibits, startup pitch competitions, and paper presentations.'
  }
];

export class EventService {
  async getEventById(eventId) {
    return MOCK_EVENTS.find((e) => e.id === eventId) || null;
  }

  async getAllEvents() {
    return MOCK_EVENTS;
  }

  async searchEvents(query = '') {
    const q = query.toLowerCase();
    return MOCK_EVENTS.filter(
      (e) =>
        e.title.toLowerCase().includes(q) ||
        e.type.toLowerCase().includes(q)
    );
  }
}

export const eventService = new EventService();
