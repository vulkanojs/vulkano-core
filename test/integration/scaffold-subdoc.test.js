/**
 * Subdocument CRUD through a SCAFFOLD-generated controller
 * (as opposed to test/integration/subdoc.test.js's hand-written ItemController).
 * ExampleController has `scaffold: true` — the base get/post/put/delete for
 * the parent record come from ScaffoldController; the 'lines' subdoc routes
 * below are added on top, calling database/scaffold.js's getSubdoc (new)/
 * createSubdoc/updateSubdoc directly, same as ItemController does for
 * 'comments'.
 *
 * Tests: POST /api/example/:id/lines, GET /api/example/:id,
 * GET /api/example/:id/lines/:lineId, PUT /api/example/:id/lines/:lineId
 */

const http = require('./helpers/http')(`${process.env.TEST_SERVER_URL}/api/example`);

let parentId;

beforeAll(async () => {
  const { data } = await http.post('/', { name: 'Scaffold Subdoc Parent' });
  parentId = data.data._id;
});

describe('createSubdoc via scaffold — POST /api/example/:id/lines', () => {

  it('creates a line and returns it with 201', async () => {
    const { status, data } = await http.post(`/${parentId}/lines`, { description: 'Widget', qty: 3 });
    expect(status).toBe(201);
    expect(data.success).toBe(true);
    expect(data.data.description).toBe('Widget');
    expect(data.data.qty).toBe(3);
    expect(data.data._id).toBeDefined();
  });

  it('is visible in the parent record — GET /api/example/:id', async () => {
    const { status, data } = await http.get(`/${parentId}`);
    expect(status).toBe(200);
    expect(Array.isArray(data.data.lines)).toBe(true);
    expect(data.data.lines.some((l) => l.description === 'Widget')).toBe(true);
  });

  it('returns 404 when the parent id does not exist', async () => {
    const { status } = await http.post('/000000000000000000000000/lines', { description: 'Ghost' });
    expect(status).toBe(404);
  });

});

describe('getSubdoc via scaffold — GET /api/example/:id/lines/:lineId', () => {

  let lineId;

  beforeAll(async () => {
    const { data } = await http.post(`/${parentId}/lines`, { description: 'Gadget', qty: 5 });
    lineId = data.data._id;
  });

  it('finds exactly that one line, with 200', async () => {
    const { status, data } = await http.get(`/${parentId}/lines/${lineId}`);
    expect(status).toBe(200);
    expect(data.data._id).toBe(lineId);
    expect(data.data.description).toBe('Gadget');
    expect(data.data.qty).toBe(5);
  });

  it('returns 404 when the line id does not exist', async () => {
    const { status } = await http.get(`/${parentId}/lines/000000000000000000000000`);
    expect(status).toBe(404);
  });

  it('returns 404 when the parent id does not exist', async () => {
    const { status } = await http.get(`/000000000000000000000000/lines/${lineId}`);
    expect(status).toBe(404);
  });

});

describe('updateSubdoc via scaffold — PUT /api/example/:id/lines/:lineId', () => {

  let lineId;

  beforeAll(async () => {
    const { data } = await http.post(`/${parentId}/lines`, { description: 'Original', qty: 1 });
    lineId = data.data._id;
  });

  it('updates the line and returns 202', async () => {
    const { status, data } = await http.put(`/${parentId}/lines/${lineId}`, { description: 'Updated', qty: 9 });
    expect(status).toBe(202);
    expect(data.success).toBe(true);
  });

  it('persists the update — confirmed via GET one', async () => {
    const { data } = await http.get(`/${parentId}/lines/${lineId}`);
    expect(data.data.description).toBe('Updated');
    expect(data.data.qty).toBe(9);
  });

  it('returns 404 when the line id does not exist', async () => {
    const { status } = await http.put(`/${parentId}/lines/000000000000000000000000`, { description: 'Ghost' });
    expect(status).toBe(404);
  });

});
