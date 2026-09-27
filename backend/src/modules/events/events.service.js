import { randomUUID } from 'node:crypto';
import { eventsStore } from './events.store.js';

const ACTIVE_REGISTRATION_STATUSES = new Set(['Registered', 'Waitlisted', 'Attended']);
const REGISTRATION_ROLES = new Set(['Participant', 'Audience', 'Judge']);

function clone(value) {
  return structuredClone(value);
}

function normalize(value) {
  return String(value || '').trim().toLowerCase();
}

export class EventsError extends Error {
  constructor(status, code, message, details) {
    super(message);
    this.name = 'EventsError';
    this.status = status;
    this.code = code;
    this.details = details;
  }
}

export class EventsService {
  constructor(store = eventsStore, options = {}) {
    this.store = store;
    this.now = options.now || (() => new Date());
  }

  listEvents(filters = {}, currentMemberId = null) {
    const query = normalize(filters.q);
    const category = normalize(filters.category);
    const mode = normalize(filters.mode);
    const status = normalize(filters.status);

    return this.store.state.events
      .filter((event) => {
        const searchable = [
          event.title,
          event.summary,
          event.description,
          event.category,
          event.mode,
          event.venue,
          event.organizerName,
          ...event.tags
        ]
          .map(normalize)
          .join(' ');

        return (
          (!query || searchable.includes(query)) &&
          (!category || normalize(event.category) === category) &&
          (!mode || normalize(event.mode) === mode) &&
          (!status || normalize(event.status) === status)
        );
      })
      .sort((left, right) => new Date(left.startsAt).getTime() - new Date(right.startsAt).getTime())
      .map((event) => this.enrichEvent(event, currentMemberId));
  }

  getEventById(eventId, currentMemberId = null) {
    const event = this.store.state.events.find((candidate) => candidate.id === eventId);
    return event ? this.enrichEvent(event, currentMemberId) : null;
  }

  register(eventId, memberId, requestedRole = 'Participant') {
    const event = this.requireEvent(eventId);
    const role = typeof requestedRole === 'string' ? requestedRole.trim() : '';
    if (!REGISTRATION_ROLES.has(role)) {
      throw new EventsError(
        400,
        'INVALID_REGISTRATION_ROLE',
        'Role must be Participant, Audience, or Judge.'
      );
    }
    const existing = this.store.state.registrations.find(
      (registration) =>
        registration.eventId === eventId &&
        registration.memberId === memberId &&
        ACTIVE_REGISTRATION_STATUSES.has(registration.status)
    );
    if (existing) {
      return { registration: clone(existing), created: false };
    }

    this.validateRegistrationWindow(event);

    if (!event.allowedRoles.includes(role)) {
      throw new EventsError(
        409,
        'REGISTRATION_ROLE_UNAVAILABLE',
        `${role} registration is not available for this event.`
      );
    }

    const registrationCount = this.activeRegistrationsFor(eventId).length;
    if (registrationCount >= event.capacity) {
      throw new EventsError(
        409,
        'EVENT_CAPACITY_REACHED',
        'This event has reached its registration capacity.'
      );
    }

    const registeredAt = this.currentDate().toISOString();
    const cancelledRegistration = this.store.state.registrations.find(
      (registration) =>
        registration.eventId === eventId &&
        registration.memberId === memberId &&
        registration.status === 'Cancelled'
    );

    if (cancelledRegistration) {
      cancelledRegistration.role = role;
      cancelledRegistration.status = 'Registered';
      cancelledRegistration.registeredAt = registeredAt;
      delete cancelledRegistration.cancelledAt;
      this.store.persist();
      return { registration: clone(cancelledRegistration), created: true };
    }

    const registration = {
      id: `EVT-REG-${randomUUID()}`,
      eventId,
      memberId,
      role,
      status: 'Registered',
      registeredAt
    };
    this.store.state.registrations.push(registration);
    this.store.persist();
    return { registration: clone(registration), created: true };
  }

  cancelRegistration(eventId, memberId) {
    this.requireEvent(eventId);
    const registration = this.store.state.registrations.find(
      (candidate) =>
        candidate.eventId === eventId &&
        candidate.memberId === memberId &&
        ACTIVE_REGISTRATION_STATUSES.has(candidate.status)
    );

    if (!registration) {
      throw new EventsError(
        404,
        'REGISTRATION_NOT_FOUND',
        'You do not have an active registration for this event.'
      );
    }

    registration.status = 'Cancelled';
    registration.cancelledAt = this.currentDate().toISOString();
    this.store.persist();
    return { eventId, cancelled: true };
  }

  enrichEvent(event, currentMemberId) {
    const registrations = this.activeRegistrationsFor(event.id);
    const currentUserRegistration = currentMemberId
      ? registrations.find((registration) => registration.memberId === currentMemberId) || null
      : null;

    return {
      ...clone(event),
      registrationCount: registrations.length,
      currentUserRegistration: currentUserRegistration ? clone(currentUserRegistration) : null
    };
  }

  activeRegistrationsFor(eventId) {
    return this.store.state.registrations.filter(
      (registration) =>
        registration.eventId === eventId &&
        ACTIVE_REGISTRATION_STATUSES.has(registration.status)
    );
  }

  validateRegistrationWindow(event) {
    const now = this.currentDate().getTime();
    const opensAt = new Date(event.registrationStartsAt).getTime();
    const closesAt = new Date(event.registrationEndsAt).getTime();
    const startsAt = new Date(event.startsAt).getTime();
    if (
      event.status !== 'Published' ||
      now < opensAt ||
      now > closesAt ||
      now >= startsAt
    ) {
      throw new EventsError(
        409,
        'REGISTRATION_CLOSED',
        'Registration is not currently open for this event.'
      );
    }
  }

  currentDate() {
    const value = this.now();
    return value instanceof Date ? new Date(value.getTime()) : new Date(value);
  }

  requireEvent(eventId) {
    const event = this.store.state.events.find((candidate) => candidate.id === eventId);
    if (!event) {
      throw new EventsError(404, 'EVENT_NOT_FOUND', 'The requested event was not found.');
    }
    return event;
  }
}

export const eventsService = new EventsService();
