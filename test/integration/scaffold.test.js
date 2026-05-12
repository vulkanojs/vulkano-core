/**
 * Scaffold Controller — CRUD + Pagination
 *
 * Setup: drops the collection, creates 30 records in parallel.
 * Pagination: per_page=15 → 2 full pages, the 3rd is empty.
 */

const mongoose = require('mongoose');
const path = require('path');

require('dotenv').config({ path: path.join(__dirname, '../../.env.test'), quiet: !process.env.DOTENV_VERBOSE });

const http = require('./helpers/http')(`${process.env.TEST_SERVER_URL}/api/item`);

const TOTAL    = 30;
const PER_PAGE = 15;

// ─────────────────────────────────────────────
// Setup: drop collection + create 30 records
// ─────────────────────────────────────────────
beforeAll(async () => {

  // Direct mongoose connection to drop the collection before tests start
  const conn = await mongoose.connect(process.env.TEST_DB_URI);
  await conn.connection.db.collection('item').drop().catch(() => {});
  await conn.connection.close();

  // Create 30 records in parallel via scaffold API
  const results = await Promise.all(
    Array.from({ length: TOTAL }, (_, i) =>
      http.post('/', { name: `Item ${String(i + 1).padStart(2, '0')}`, value: i + 1 })
    )
  );

  const failed = results.filter((r) => r.status !== 201);
  if (failed.length > 0) {
    throw new Error(`${failed.length} records were not created successfully`);
  }

}, 30000);

// ─────────────────────────────────────────────
// Pagination
// ─────────────────────────────────────────────
describe('Pagination — 30 records / 15 per page', () => {

  it('page 1: 15 items, next=2, prev=false', async () => {
    const { status, data } = await http.get(`/?per_page=${PER_PAGE}&page=1`);
    expect(status).toBe(200);
    expect(data.data.items).toHaveLength(PER_PAGE);
    expect(data.data.page).toBe(1);
    expect(data.data.perPage).toBe(PER_PAGE);
    expect(data.data.next).toBe(2);
    expect(data.data.prev).toBe(false);
  });

  it('page 2: 15 items, next=false, prev=1', async () => {
    const { status, data } = await http.get(`/?per_page=${PER_PAGE}&page=2`);
    expect(status).toBe(200);
    expect(data.data.items).toHaveLength(PER_PAGE);
    expect(data.data.page).toBe(2);
    expect(data.data.next).toBe(false);
    expect(data.data.prev).toBe(1);
  });

  it('page 3: empty (items=[]), next=false, prev=false', async () => {
    const { status, data } = await http.get(`/?per_page=${PER_PAGE}&page=3`);
    expect(status).toBe(200);
    expect(data.data.items).toHaveLength(0);
    expect(data.data.page).toBe(3);
    expect(data.data.next).toBe(false);
    expect(data.data.prev).toBe(false);
  });

  it('totalItems is 30 on all pages', async () => {
    const [p1, p2, p3] = await Promise.all([
      http.get(`/?per_page=${PER_PAGE}&page=1`),
      http.get(`/?per_page=${PER_PAGE}&page=2`),
      http.get(`/?per_page=${PER_PAGE}&page=3`)
    ]);
    expect(p1.data.data.totalItems).toBe(TOTAL);
    expect(p2.data.data.totalItems).toBe(TOTAL);
    expect(p3.data.data.totalItems).toBe(TOTAL);
  });

  it('totalPages is 2', async () => {
    const { data } = await http.get(`/?per_page=${PER_PAGE}`);
    expect(data.data.totalPages).toBe(TOTAL / PER_PAGE);
  });

  it('page=all returns all 30 records without pagination structure', async () => {
    const { data } = await http.get('/?page=all');
    expect(Array.isArray(data.data)).toBe(true);
    expect(data.data).toHaveLength(TOTAL);
  });

  it('items from page 1 and page 2 do not overlap', async () => {
    const [p1, p2] = await Promise.all([
      http.get(`/?per_page=${PER_PAGE}&page=1`),
      http.get(`/?per_page=${PER_PAGE}&page=2`)
    ]);
    const ids1 = new Set(p1.data.data.items.map((i) => i._id));
    const ids2 = p2.data.data.items.map((i) => i._id);
    ids2.forEach((id) => expect(ids1.has(id)).toBe(false));
  });

  it('cursor of page 1 is 1', async () => {
    const { data } = await http.get(`/?per_page=${PER_PAGE}&page=1`);
    expect(data.data.cursor).toBe(1);
  });

  it('cursor of page 2 is 16', async () => {
    const { data } = await http.get(`/?per_page=${PER_PAGE}&page=2`);
    expect(data.data.cursor).toBe(PER_PAGE + 1);
  });

});

// ─────────────────────────────────────────────
// Model — fields and validations
// ─────────────────────────────────────────────
describe('Item model — fields and validations', () => {

  let itemId;

  it('creates a record with all fields', async () => {
    const { status, data } = await http.post('/', { name: 'Full Item', value: 99, tags: ['a', 'b'] });
    expect(status).toBe(201);
    expect(data.data.name).toBe('Full Item');
    expect(data.data.value).toBe(99);
    expect(data.data.tags).toEqual(['a', 'b']);
    itemId = data.data._id;
  });

  it('active defaults to true', async () => {
    const { data } = await http.get(`/${itemId}`);
    expect(data.data.active).toBe(true);
  });

  it('createdAt is a valid date', async () => {
    const { data } = await http.get(`/${itemId}`);
    expect(new Date(data.data.createdAt).toString()).not.toBe('Invalid Date');
  });

  it('value defaults to 0', async () => {
    const { data } = await http.post('/', { name: 'No Value' });
    expect(data.data.value).toBe(0);
  });

  it('rejects creation without name (required field)', async () => {
    const { status, data } = await http.post('/', { value: 10 });
    expect(status).toBeGreaterThanOrEqual(400);
    expect(data.success).toBe(false);
  });

  it('updates updatedAt on PUT', async () => {
    const before = (await http.get(`/${itemId}`)).data.data.updatedAt;
    await http.put(`/${itemId}`, { name: 'Updated' });
    const after = (await http.get(`/${itemId}`)).data.data.updatedAt;
    expect(after).not.toBe(before);
  });

  it('soft-delete excludes the record from listings', async () => {
    await http.delete(`/${itemId}`);
    const { data } = await http.get(`/${itemId}`);
    expect(data.success).toBe(false);
  });

});

// ─────────────────────────────────────────────
// Sequential CRUD
// ─────────────────────────────────────────────
describe('Sequential CRUD', () => {

  let id;

  it('POST creates and returns 201', async () => {
    const { status, data } = await http.post('/', { name: 'CRUD Test', value: 42 });
    expect(status).toBe(201);
    expect(data.data._id).toBeDefined();
    id = data.data._id;
  });

  it('GET /:id returns the created record', async () => {
    const { status, data } = await http.get(`/${id}`);
    expect(status).toBe(200);
    expect(data.data._id).toBe(id);
    expect(data.data.name).toBe('CRUD Test');
  });

  it('PUT /:id updates and returns 202', async () => {
    const { status, data } = await http.put(`/${id}`, { name: 'CRUD Updated', value: 99 });
    expect(status).toBe(202);
    expect(data.data.name).toBe('CRUD Updated');
    expect(data.data.value).toBe(99);
  });

  it('PUT /:id merge does not erase fields not sent', async () => {
    const { data } = await http.put(`/${id}`, { value: 1 });
    expect(data.data.name).toBe('CRUD Updated');
  });

  it('PATCH /:id partially updates and returns 202', async () => {
    const { status, data } = await http.patch(`/${id}`, { value: 55 });
    expect(status).toBe(202);
    expect(data.data.value).toBe(55);
    expect(data.data.name).toBe('CRUD Updated');
  });

  it('GET with non-existent id returns 404', async () => {
    const { status } = await http.get('/000000000000000000000000');
    expect(status).toBe(404);
  });

  it('GET with invalid id format returns 400', async () => {
    const { status } = await http.get('/not-an-id');
    expect(status).toBeGreaterThanOrEqual(400);
  });

  it('DELETE /:id soft-delete returns 204', async () => {
    const { status } = await http.delete(`/${id}`);
    expect(status).toBe(204);
  });

  it('GET /:id after deletion returns 404', async () => {
    const { status } = await http.get(`/${id}`);
    expect(status).toBe(404);
  });

});

// ─────────────────────────────────────────────
// Mass-assignment protection
// ─────────────────────────────────────────────
describe('Mass-assignment protection', () => {

  let id;

  beforeAll(async () => {
    const { data } = await http.post('/', { name: 'MassAssign Test', value: 10 });
    id = data.data._id;
  });

  it('PUT cannot overwrite _id', async () => {
    const fakeId = '000000000000000000000099';
    const { data } = await http.put(`/${id}`, { _id: fakeId, name: 'Hack' });
    expect(data.data._id).toBe(id);
  });

  it('PUT cannot overwrite createdAt', async () => {
    const original = (await http.get(`/${id}`)).data.data.createdAt;
    const pastDate = '2000-01-01T00:00:00.000Z';
    await http.put(`/${id}`, { createdAt: pastDate, name: 'Hack2' });
    const { data } = await http.get(`/${id}`);
    expect(data.data.createdAt).toBe(original);
  });

  it('PUT cannot overwrite __v', async () => {
    const original = (await http.get(`/${id}`)).data.data.__v;
    await http.put(`/${id}`, { __v: 999, name: 'Hack3' });
    const { data } = await http.get(`/${id}`);
    expect(data.data.__v).toBe(original);
  });

});

// ─────────────────────────────────────────────
// Search — ReDoS protection (bug fix)
// ─────────────────────────────────────────────
describe('Search — ReDoS protection', () => {

  it('special regex characters do not crash the server', async () => {
    const { status } = await http.get('/?search=(((');
    expect(status).toBe(200);
  });

  it('backslash in search does not crash', async () => {
    const { status } = await http.get('/?search=test\\value');
    expect(status).toBe(200);
  });

  it('brackets and dots in search do not crash', async () => {
    const { status } = await http.get('/?search=user[0].name');
    expect(status).toBe(200);
  });

  it('search by existing text returns results', async () => {
    const { data } = await http.get('/?search=Item 01');
    expect(data.data.items.length).toBeGreaterThanOrEqual(1);
  });

  it('search by non-existent text returns empty list', async () => {
    const { data } = await http.get('/?search=ZZZNORESULTS999');
    expect(data.data.items).toHaveLength(0);
  });

});
