import { eventsService } from '../modules/events/events.service.js';
import { createEventsSeed } from '../modules/events/events.store.js';

function toIntegrationEvent(event) {
  if (!event) {
    return null;
  }
  return {
    ...event,
    type: event.type || event.category,
    startDate: event.startDate || event.startsAt,
    endDate: event.endDate || event.endsAt
  };
}

export const MOCK_EVENTS = createEventsSeed().events.map(toIntegrationEvent);

export class EventService {
  constructor(service = eventsService) {
    this.service = service;
  }

  async getEventById(eventId) {
    return toIntegrationEvent(await this.service.getEventById(eventId));
  }

  async getAllEvents() {
    const events = await this.service.listEvents();
    return events.map(toIntegrationEvent);
  }

  async searchEvents(query = '') {
    const events = await this.service.listEvents({ q: query });
    return events.map(toIntegrationEvent);
  }
}

export const eventService = new EventService();
