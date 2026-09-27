import assert from 'node:assert/strict';

process.env.NODE_ENV = 'test';

const { default: app } = await import('../backend/src/server.js');
const server = app.listen(0, '127.0.0.1');

await new Promise((resolve, reject) => {
  server.once('listening', resolve);
  server.once('error', reject);
});

const address = server.address();
if (!address || typeof address === 'string') {
  server.close();
  throw new Error('Smoke server did not expose a TCP address.');
}

const baseUrl = `http://127.0.0.1:${address.port}`;
const endpoints = [
  '/health',
  '/api/v1',
  '/api/v1/dashboard',
  '/api/v1/projects',
  '/api/v1/events',
  '/api/v1/member-centre/members',
  '/api/v1/leaderboards',
  '/api/v1/idea-centre/ideas',
  '/api/v1/forum/posts'
];

try {
  for (const endpoint of endpoints) {
    const response = await fetch(`${baseUrl}${endpoint}`, {
      headers: {
        'x-user-id': 'mem-student-1'
      }
    });
    assert.equal(response.status, 200, `${endpoint} returned ${response.status}`);
    const body = await response.json();
    if (endpoint !== '/health') {
      assert.equal(body.success, true, `${endpoint} did not return a success envelope`);
      assert.notEqual(body.data, null, `${endpoint} returned no data`);
    }
    console.log(`PASS GET ${endpoint}`);
  }

  const portalResponse = await fetch(baseUrl);
  assert.equal(portalResponse.status, 200, `Portal returned ${portalResponse.status}`);
  assert.match(await portalResponse.text(), /<div id="root"><\/div>/);
  console.log('PASS GET /');
} finally {
  await new Promise((resolve, reject) => {
    server.close((error) => (error ? reject(error) : resolve()));
  });
}
