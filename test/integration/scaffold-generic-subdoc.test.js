/**
 * Generic, opt-in subdocument routes on ScaffoldController itself
 * (as opposed to test/integration/subdoc.test.js and scaffold-subdoc.test.js,
 * which are hand-wired per controller). SchoolController sets
 * `subdocs: ['grades']` and nothing else — ScaffoldController generates
 * POST/GET/PUT/DELETE /api/school/:id/:key/:subId? on its own.
 */

const http = require('./helpers/http')(`${process.env.TEST_SERVER_URL}/api/school`);

let parentId;

beforeAll(async () => {
  const { data } = await http.post('/', { name: 'Generic Subdoc School' });
  parentId = data.data._id;
});

describe('generic subdoc routes — :key restricted to the subdocs allowlist', () => {

  it('POST /:id/:key creates a subdocument under the allowed key', async () => {
    const { status, data } = await http.post(`/${parentId}/grades`, { label: 'Algebra', level: 2 });
    expect(status).toBe(201);
    expect(data.data.label).toBe('Algebra');
    expect(data.data._id).toBeDefined();
  });

  it('GET /:id/:key (no subId) lists every item under that key', async () => {
    await http.post(`/${parentId}/grades`, { label: 'Geometry', level: 3 });
    const { status, data } = await http.get(`/${parentId}/grades`);
    expect(status).toBe(200);
    expect(Array.isArray(data.data)).toBe(true);
    expect(data.data.length).toBeGreaterThanOrEqual(2);
  });

  it('GET /:id/:key/:subId finds exactly that one item', async () => {
    const { data: created } = await http.post(`/${parentId}/grades`, { label: 'Physics', level: 4 });
    const gradeId = created.data._id;

    const { status, data } = await http.get(`/${parentId}/grades/${gradeId}`);
    expect(status).toBe(200);
    expect(data.data._id).toBe(gradeId);
    expect(data.data.label).toBe('Physics');
  });

  it('PUT /:id/:key/:subId updates that one item', async () => {
    const { data: created } = await http.post(`/${parentId}/grades`, { label: 'Chemistry', level: 1 });
    const gradeId = created.data._id;

    const { status } = await http.put(`/${parentId}/grades/${gradeId}`, { label: 'Chemistry II', level: 2 });
    expect(status).toBe(202);

    const { data } = await http.get(`/${parentId}/grades/${gradeId}`);
    expect(data.data.label).toBe('Chemistry II');
    expect(data.data.level).toBe(2);
  });

  it('DELETE /:id/:key/:subId removes that one item', async () => {
    const { data: created } = await http.post(`/${parentId}/grades`, { label: 'To Delete', level: 1 });
    const gradeId = created.data._id;

    const { status } = await http.delete(`/${parentId}/grades/${gradeId}`);
    expect(status).toBe(204);

    const { status: getStatus } = await http.get(`/${parentId}/grades/${gradeId}`);
    expect(getStatus).toBe(404);
  });

  it('404s on a :key not in the subdocs allowlist', async () => {
    const { status } = await http.post(`/${parentId}/name`, { anything: true });
    expect(status).toBe(404);
  });

});
