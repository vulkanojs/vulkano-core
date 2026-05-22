/**
 * Subdocument CRUD
 * Tests createSubdoc / updateSubdoc / removeSubdoc / deleteSubdoc (alias)
 * via custom routes on ItemController: POST/PUT/DELETE /api/item/:id/comment
 */

const http = require('./helpers/http')(`${process.env.TEST_SERVER_URL}/api/item`);

let parentId;

beforeAll(async () => {
  const { data } = await http.post('/', { name: 'Subdoc Parent', value: 0 });
  parentId = data.data._id;
});

// ─────────────────────────────────────────────
// createSubdoc
// ─────────────────────────────────────────────
describe('createSubdoc — POST /api/item/:id/comment', () => {

  let commentId;

  it('creates a subdocument and returns it with 201', async () => {
    const { status, data } = await http.post(`/${parentId}/comment`, { text: 'Hello', author: 'Alice' });
    expect(status).toBe(201);
    expect(data.success).toBe(true);
    expect(data.data.text).toBe('Hello');
    expect(data.data.author).toBe('Alice');
    expect(data.data._id).toBeDefined();
    commentId = data.data._id;
  });

  it('subdocument is persisted and visible in the parent record', async () => {
    const { data } = await http.get(`/${parentId}`);
    const found = data.data.comments.find((c) => c._id === commentId);
    expect(found).toBeDefined();
    expect(found.text).toBe('Hello');
  });

  it('multiple subdocuments can be added to the same parent', async () => {
    await http.post(`/${parentId}/comment`, { text: 'Second', author: 'Bob' });
    const { data } = await http.get(`/${parentId}`);
    expect(data.data.comments.length).toBeGreaterThanOrEqual(2);
  });

  it('returns 404 when the parent id does not exist', async () => {
    const { status } = await http.post('/000000000000000000000000/comment', { text: 'Ghost' });
    expect(status).toBe(404);
  });

});

// ─────────────────────────────────────────────
// updateSubdoc
// ─────────────────────────────────────────────
describe('updateSubdoc — PUT /api/item/:id/comment/:commentId', () => {

  let commentId;

  beforeAll(async () => {
    const { data } = await http.post(`/${parentId}/comment`, { text: 'Original', author: 'Carol' });
    commentId = data.data._id;
  });

  it('updates the subdocument text and returns 202', async () => {
    const { status, data } = await http.put(`/${parentId}/comment/${commentId}`, { text: 'Updated' });
    expect(status).toBe(202);
    expect(data.success).toBe(true);
  });

  it('persists the update in the parent record', async () => {
    const { data } = await http.get(`/${parentId}`);
    const found = data.data.comments.find((c) => c._id === commentId);
    expect(found.text).toBe('Updated');
  });

  it('returns 404 when the subdocument id does not exist', async () => {
    const { status } = await http.put(`/${parentId}/comment/000000000000000000000000`, { text: 'Ghost' });
    expect(status).toBe(404);
  });

  it('returns 404 when the parent id does not exist', async () => {
    const { status } = await http.put(`/000000000000000000000000/comment/${commentId}`, { text: 'Ghost' });
    expect(status).toBe(404);
  });

});

// ─────────────────────────────────────────────
// removeSubdoc / deleteSubdoc alias
// ─────────────────────────────────────────────
describe('removeSubdoc — DELETE /api/item/:id/comment/:commentId', () => {

  let commentId;

  beforeAll(async () => {
    const { data } = await http.post(`/${parentId}/comment`, { text: 'To Remove', author: 'Dave' });
    commentId = data.data._id;
  });

  it('removes the subdocument and returns 204', async () => {
    const { status } = await http.delete(`/${parentId}/comment/${commentId}`);
    expect(status).toBe(204);
  });

  it('subdocument is gone from the parent record after removal', async () => {
    const { data } = await http.get(`/${parentId}`);
    const found = (data.data.comments || []).find((c) => c._id === commentId);
    expect(found).toBeUndefined();
  });

  it('returns 404 when the subdocument was already removed', async () => {
    const { status } = await http.delete(`/${parentId}/comment/${commentId}`);
    expect(status).toBe(404);
  });

  it('returns 404 when parent id does not exist', async () => {
    const { status } = await http.delete(`/000000000000000000000000/comment/${commentId}`);
    expect(status).toBe(404);
  });

});
