import assert from 'node:assert/strict';
import test from 'node:test';
import express from 'express';
import request from 'supertest';
import { memberStore } from '../src/modules/member-centre/member.store.js';
import { projectService } from '../src/integrations/project.service.js';
import projectsRouter from '../src/modules/projects/projects.routes.js';
import { projectsService } from '../src/modules/projects/projects.service.js';
import { projectsStore } from '../src/modules/projects/projects.store.js';

function createApp() {
  const app = express();
  app.use(express.json());
  app.use('/api/v1/projects', projectsRouter);
  return app;
}

function resetStores() {
  memberStore.reset();
  projectsStore.reset();
}

const app = createApp();

test('Projects API and service', async (t) => {
  await t.test('lists, filters, searches, and returns project details', async () => {
    resetStores();

    const response = await request(app)
      .get('/api/v1/projects?q=accessibility&status=active&category=Smart%20Campus')
      .expect(200);

    assert.equal(response.body.success, true);
    assert.equal(response.body.meta.total, 1);
    assert.equal(response.body.data[0].id, 'PRJ-101');
    assert.ok(response.body.data[0].milestones.length > 0);
    assert.ok(response.body.data[0].memberIds.includes('mem-student-1'));

    const detail = await request(app).get('/api/v1/projects/PRJ-101').expect(200);
    assert.equal(detail.body.data.name, 'Smart Campus Navigation');

    const missing = await request(app).get('/api/v1/projects/missing').expect(404);
    assert.equal(missing.body.error.code, 'PROJECT_NOT_FOUND');
  });

  await t.test('validates list filters', async () => {
    resetStores();

    const invalidStatus = await request(app)
      .get('/api/v1/projects?status=unknown')
      .expect(400);
    assert.equal(invalidStatus.body.error.code, 'VALIDATION_ERROR');

    const repeatedSearch = await request(app)
      .get('/api/v1/projects?q=one&q=two')
      .expect(400);
    assert.equal(repeatedSearch.body.error.code, 'VALIDATION_ERROR');
  });

  await t.test('requires a valid active identity to create a project', async () => {
    resetStores();
    const input = {
      name: 'Campus Water Watch',
      tagline: 'Make campus water usage visible to every facilities team.',
      description:
        'A student-led monitoring dashboard that identifies unusual water use and supports quicker maintenance.',
      category: 'Sustainability',
      tags: ['IoT', 'Analytics']
    };

    const missingIdentity = await request(app)
      .post('/api/v1/projects')
      .send(input)
      .expect(401);
    assert.equal(missingIdentity.body.error.code, 'UNAUTHORIZED');

    const unknownIdentity = await request(app)
      .post('/api/v1/projects')
      .set('x-user-id', 'not-a-member')
      .send(input)
      .expect(401);
    assert.equal(unknownIdentity.body.error.code, 'UNAUTHORIZED');

    const invalid = await request(app)
      .post('/api/v1/projects')
      .set('x-user-id', 'mem-student-1')
      .send({ ...input, name: 'A', tags: ['IoT', 'iot'] })
      .expect(400);
    assert.equal(invalid.body.error.code, 'VALIDATION_ERROR');
    assert.ok(Array.isArray(invalid.body.error.details));
  });

  await t.test('creates a persisted proposal and exposes it through the Forum adapter', async () => {
    resetStores();
    const input = {
      name: 'Campus Water Watch',
      tagline: 'Make campus water usage visible to every facilities team.',
      description:
        'A student-led monitoring dashboard that identifies unusual water use and supports quicker maintenance.',
      category: 'Sustainability',
      tags: ['IoT', 'Analytics']
    };

    const response = await request(app)
      .post('/api/v1/projects')
      .set('x-user-id', 'mem-student-2')
      .send(input)
      .expect(201);

    assert.equal(response.body.data.status, 'planning');
    assert.equal(response.body.data.leaderId, 'mem-student-2');
    assert.deepEqual(response.body.data.memberIds, ['mem-student-2']);
    assert.equal(projectsStore.state.projects.length, 4);

    const integratedProject = await projectService.getProjectById(response.body.data.id);
    assert.equal(integratedProject.name, input.name);
    assert.ok(
      (await projectService.searchProjects('water usage')).some(
        (project) => project.id === response.body.data.id
      )
    );

    const duplicate = await request(app)
      .post('/api/v1/projects')
      .set('x-user-id', 'mem-student-2')
      .send(input)
      .expect(409);
    assert.equal(duplicate.body.error.code, 'PROJECT_CONFLICT');
  });

  await t.test('allows only project leaders and administrators to update milestones', async () => {
    resetStores();

    const unauthorized = await request(app)
      .patch('/api/v1/projects/PRJ-101/milestones/MS-101-1')
      .send({ status: 'completed' })
      .expect(401);
    assert.equal(unauthorized.body.error.code, 'UNAUTHORIZED');

    const forbidden = await request(app)
      .patch('/api/v1/projects/PRJ-101/milestones/MS-101-1')
      .set('x-user-id', 'mem-student-2')
      .send({ status: 'completed' })
      .expect(403);
    assert.equal(forbidden.body.error.code, 'FORBIDDEN');

    const leaderUpdate = await request(app)
      .patch('/api/v1/projects/PRJ-101/milestones/MS-101-1')
      .set('x-user-id', 'mem-student-1')
      .send({ status: 'completed' })
      .expect(200);
    assert.equal(
      leaderUpdate.body.data.milestones.find((milestone) => milestone.id === 'MS-101-1')
        .status,
      'completed'
    );
    assert.equal(leaderUpdate.body.data.progress, 67);

    const adminUpdate = await request(app)
      .patch('/api/v1/projects/PRJ-102/milestones/MS-102-2')
      .set('x-user-id', 'mem-admin-1')
      .send({ status: 'completed' })
      .expect(200);
    assert.equal(adminUpdate.body.data.progress, 100);
  });

  await t.test('validates milestone updates and distinguishes missing resources', async () => {
    resetStores();

    const invalid = await request(app)
      .patch('/api/v1/projects/PRJ-101/milestones/MS-101-1')
      .set('x-user-id', 'mem-student-1')
      .send({ status: 'done' })
      .expect(400);
    assert.equal(invalid.body.error.code, 'VALIDATION_ERROR');

    const missingProject = await request(app)
      .patch('/api/v1/projects/missing/milestones/MS-101-1')
      .set('x-user-id', 'mem-admin-1')
      .send({ status: 'completed' })
      .expect(404);
    assert.equal(missingProject.body.error.code, 'PROJECT_NOT_FOUND');

    const missingMilestone = await request(app)
      .patch('/api/v1/projects/PRJ-101/milestones/missing')
      .set('x-user-id', 'mem-admin-1')
      .send({ status: 'completed' })
      .expect(404);
    assert.equal(missingMilestone.body.error.code, 'MILESTONE_NOT_FOUND');
  });

  await t.test('service search is defensive and does not expose mutable store records', async () => {
    resetStores();
    const matches = await projectsService.searchProjects('web3');
    assert.deepEqual(matches.map((project) => project.id), ['PRJ-103']);

    matches[0].name = 'Mutated outside the service';
    assert.equal((await projectsService.getProjectById('PRJ-103')).name, 'Decentralized Student Credentials');
  });
});
