/**
 * Scaffold — fillable, soft delete and hidden paths
 * (database/scaffold.js create/update/delete, Member fixture: fillable ['name'],
 * `secret` select: false).
 */

const testHttp = require('./helpers/http')(process.env.TEST_SERVER_URL);
const http = require('./helpers/http')(`${process.env.TEST_SERVER_URL}/api/member`);

const SECRET = 'HIDDEN-SECRET-5678';

beforeAll(async () => {
  await testHttp.delete('/test/resetmembers');
}, 30000);

describe('POST /api/member', () => {

  it('response never includes a select: false path', async () => {
    const { status, data } = await http.post('/', { name: 'Ada', secret: SECRET });
    expect(status).toBe(201);
    expect(data.data.name).toBe('Ada');
    expect(data.data.secret).toBeUndefined();
    expect(JSON.stringify(data)).not.toContain(SECRET);
  });

});

describe('PUT /api/member/:id — fillable', () => {

  it('writes only fillable fields', async () => {
    const { data: created } = await http.post('/', { name: 'Bob' });
    const id = created.data._id;

    const { status, data } = await http.put(`/${id}`, { name: 'Bobby', role: 'admin', active: false });
    expect(status).toBe(202);
    expect(data.data.name).toBe('Bobby');
    expect(data.data.role).toBe('user');
    expect(data.data.active).toBe(true);
  });

});

describe('DELETE /api/member/:id — soft delete with fillable', () => {

  it('soft-deletes even though fillable leaves `active` out', async () => {
    const { data: created } = await http.post('/', { name: 'Cy' });
    const id = created.data._id;

    const del = await http.delete(`/${id}`);
    expect(del.status).toBe(204);

    const after = await http.get(`/${id}`);
    expect(after.status).toBe(404);
  });

  it('a missing record still 404s', async () => {
    const { status } = await http.delete('/0123456789abcdef01234567');
    expect(status).toBe(404);
  });

});
