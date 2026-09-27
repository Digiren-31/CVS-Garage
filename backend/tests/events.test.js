import assert from 'node:assert/strict';
import test from 'node:test';
import express from 'express';
import request from 'supertest';
import { EventService } from '../src/integrations/event.service.js';
import { sendError } from '../src/lib/http.js';
import { createEventsRouter } from '../src/modules/events/events.routes.js';
import { EventsService } from '../src/modules/events/events.service.js';
import { createEventsStore } from '../src/modules/events/events.store.js';

const now = () => new Date('2026-09-27T12:00:00.000Z');

function createTestApp() {
  const store = createEventsStore({ persistent: false });
  const service = new EventsService(store, { now });
  const router = createEventsRouter({
    service,
    findMember: async (memberId) => {
      if (!memberId || memberId === 'missing-member') {
        return null;
      }
      return {
        id: memberId,
        status: memberId === 'pending-member' ? 'pending' : 'active'
      };
    }
  });
  const app = express();
  app.use(express.json());
  app.use('/api/v1/events', router);
  app.use((error, req, res, next) => {
    void req;
    void next;
    return sendError(res, 500, 'INTERNAL_SERVER_ERROR', error.message);
  });
  return { app, store };
}

test('Forum event integration preserves legacy date aliases', async () => {
  const service = new EventsService(createEventsStore({ persistent: false }), { now });
  const adapter = new EventService(service);

  const detail = await adapter.getEventById('EVT-2026-01');
  assert.equal(detail.startsAt, '2026-10-14T09:00:00.000Z');
  assert.equal(detail.endsAt, '2026-10-15T21:00:00.000Z');
  assert.equal(detail.startDate, detail.startsAt);
  assert.equal(detail.endDate, detail.endsAt);
  assert.equal(detail.type, detail.category);

  const results = await adapter.searchEvents('hacksprint');
  assert.equal(results.length, 1);
  assert.equal(results[0].startDate, results[0].startsAt);
  assert.equal(results[0].endDate, results[0].endsAt);
});

test('Events API discovery and registration workflows', async (t) => {
  await t.test('searches and filters rich event discovery results', async () => {
    const { app } = createTestApp();
    const response = await request(app)
      .get('/api/v1/events')
      .query({ q: 'design', category: 'Workshops', mode: 'Online' })
      .set('x-user-id', 'mem-student-1')
      .expect(200);

    assert.equal(response.body.success, true);
    assert.equal(response.body.data.length, 1);
    assert.equal(response.body.data[0].id, 'EVT-2026-03');
    assert.ok(response.body.data[0].schedule.length > 0);
    assert.equal(response.body.data[0].capacity, 1);
    assert.equal(response.body.data[0].registrationCount, 1);
    assert.equal(response.body.data[0].currentUserRegistration, null);
    assert.equal(response.body.meta.total, 1);
  });

  await t.test('enriches list and detail results with only the current user registration', async () => {
    const { app } = createTestApp();
    const list = await request(app)
      .get('/api/v1/events')
      .set('x-user-id', 'mem-student-1')
      .expect(200);
    const registeredEvent = list.body.data.find((event) => event.id === 'EVT-2026-02');

    assert.equal(registeredEvent.currentUserRegistration.memberId, 'mem-student-1');
    assert.equal(registeredEvent.currentUserRegistration.status, 'Registered');

    const detail = await request(app)
      .get('/api/v1/events/EVT-2026-02')
      .set('x-user-id', 'mem-student-2')
      .expect(200);

    assert.equal(detail.body.data.currentUserRegistration, null);
    assert.equal(detail.body.data.registrationCount, 1);
  });

  await t.test('returns a not-found envelope for an unknown event', async () => {
    const { app } = createTestApp();
    const response = await request(app).get('/api/v1/events/not-real').expect(404);

    assert.equal(response.body.error.code, 'EVENT_NOT_FOUND');
  });

  await t.test('requires a known development identity for registration mutations', async () => {
    const { app } = createTestApp();
    const missing = await request(app)
      .post('/api/v1/events/EVT-2026-01/registrations')
      .send({ role: 'Participant' })
      .expect(401);
    assert.equal(missing.body.error.code, 'AUTHENTICATION_REQUIRED');

    const unknown = await request(app)
      .post('/api/v1/events/EVT-2026-01/registrations')
      .set('x-user-id', 'missing-member')
      .send({ role: 'Participant' })
      .expect(401);
    assert.equal(unknown.body.error.code, 'INVALID_IDENTITY');

    const pending = await request(app)
      .post('/api/v1/events/EVT-2026-01/registrations')
      .set('x-user-id', 'pending-member')
      .send({ role: 'Participant' })
      .expect(403);
    assert.equal(pending.body.error.code, 'ACCOUNT_NOT_ACTIVE');
  });

  await t.test('creates an idempotent registration and enriches the event afterwards', async () => {
    const { app, store } = createTestApp();
    const first = await request(app)
      .post('/api/v1/events/EVT-2026-01/registrations')
      .set('x-user-id', 'mem-student-1')
      .send({ role: 'Participant' })
      .expect(201);
    const repeated = await request(app)
      .post('/api/v1/events/EVT-2026-01/registrations')
      .set('x-user-id', 'mem-student-1')
      .send({ role: 'Participant' })
      .expect(200);

    assert.equal(first.body.data.id, repeated.body.data.id);
    assert.equal(
      store.state.registrations.filter(
        (registration) =>
          registration.eventId === 'EVT-2026-01' &&
          registration.memberId === 'mem-student-1' &&
          registration.status !== 'Cancelled'
      ).length,
      1
    );

    const detail = await request(app)
      .get('/api/v1/events/EVT-2026-01')
      .set('x-user-id', 'mem-student-1')
      .expect(200);
    assert.equal(detail.body.data.registrationCount, 2);
    assert.equal(detail.body.data.currentUserRegistration.id, first.body.data.id);
  });

  await t.test('validates registration roles, windows, and event capacity', async () => {
    const { app } = createTestApp();
    const invalidRole = await request(app)
      .post('/api/v1/events/EVT-2026-01/registrations')
      .set('x-user-id', 'mem-student-1')
      .send({ role: 'Organizer' })
      .expect(400);
    assert.equal(invalidRole.body.error.code, 'INVALID_REGISTRATION_ROLE');

    const closed = await request(app)
      .post('/api/v1/events/EVT-2026-04/registrations')
      .set('x-user-id', 'mem-student-1')
      .send({ role: 'Participant' })
      .expect(409);
    assert.equal(closed.body.error.code, 'REGISTRATION_CLOSED');

    const full = await request(app)
      .post('/api/v1/events/EVT-2026-03/registrations')
      .set('x-user-id', 'mem-student-1')
      .send({ role: 'Participant' })
      .expect(409);
    assert.equal(full.body.error.code, 'EVENT_CAPACITY_REACHED');
  });

  await t.test('cancels only the authenticated member registration', async () => {
    const { app } = createTestApp();
    const otherMember = await request(app)
      .delete('/api/v1/events/EVT-2026-01/registrations')
      .set('x-user-id', 'mem-student-1')
      .expect(404);
    assert.equal(otherMember.body.error.code, 'REGISTRATION_NOT_FOUND');

    const cancelled = await request(app)
      .delete('/api/v1/events/EVT-2026-02/registrations')
      .set('x-user-id', 'mem-student-1')
      .expect(200);
    assert.deepEqual(cancelled.body.data, {
      eventId: 'EVT-2026-02',
      cancelled: true
    });

    const detail = await request(app)
      .get('/api/v1/events/EVT-2026-02')
      .set('x-user-id', 'mem-student-1')
      .expect(200);
    assert.equal(detail.body.data.currentUserRegistration, null);
    assert.equal(detail.body.data.registrationCount, 0);
  });
});
