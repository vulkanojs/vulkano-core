/**
 * Scaffold Controller — CRUD + Pagination
 *
 * Setup: drops the collection, crea 30 registros en paralelo.
 * Pagination: per_page=15 → 2 páginas completas, la 3ra vacía.
 */

const mongoose = require('mongoose');
const path = require('path');

require('dotenv').config({ path: path.join(__dirname, '../../.env.test') });

const http = require('axios').create({
  baseURL: `${process.env.TEST_SERVER_URL}/api/item`,
  validateStatus: () => true
});

const TOTAL    = 30;
const PER_PAGE = 15;

// ─────────────────────────────────────────────
// Setup: limpia colección + crea 30 registros
// ─────────────────────────────────────────────
beforeAll(async () => {

  // Conexión directa para limpiar la colección antes de empezar
  const conn = await mongoose.connect(process.env.TEST_DB_URI);
  await conn.connection.db.collection('item').drop().catch(() => {});
  await conn.connection.close();

  // Crea 30 registros en paralelo via scaffold API
  const results = await Promise.all(
    Array.from({ length: TOTAL }, (_, i) =>
      http.post('/', { name: `Item ${String(i + 1).padStart(2, '0')}`, value: i + 1 })
    )
  );

  const failed = results.filter((r) => r.status !== 201);
  if (failed.length > 0) {
    throw new Error(`${failed.length} registros no se crearon correctamente`);
  }

}, 30000);

// ─────────────────────────────────────────────
// Paginación
// ─────────────────────────────────────────────
describe('Paginación — 30 registros / 15 por página', () => {

  it('página 1: 15 items, next=2, prev=false', async () => {
    const { status, data } = await http.get(`/?per_page=${PER_PAGE}&page=1`);
    expect(status).toBe(200);
    expect(data.data.items).toHaveLength(PER_PAGE);
    expect(data.data.page).toBe(1);
    expect(data.data.perPage).toBe(PER_PAGE);
    expect(data.data.next).toBe(2);
    expect(data.data.prev).toBe(false);
  });

  it('página 2: 15 items, next=false, prev=1', async () => {
    const { status, data } = await http.get(`/?per_page=${PER_PAGE}&page=2`);
    expect(status).toBe(200);
    expect(data.data.items).toHaveLength(PER_PAGE);
    expect(data.data.page).toBe(2);
    expect(data.data.next).toBe(false);
    expect(data.data.prev).toBe(1);
  });

  it('página 3: vacía (items=[]), next=false, prev=false', async () => {
    const { status, data } = await http.get(`/?per_page=${PER_PAGE}&page=3`);
    expect(status).toBe(200);
    expect(data.data.items).toHaveLength(0);
    expect(data.data.page).toBe(3);
    expect(data.data.next).toBe(false);
    expect(data.data.prev).toBe(false);
  });

  it('totalItems es 30 en todas las páginas', async () => {
    const [p1, p2, p3] = await Promise.all([
      http.get(`/?per_page=${PER_PAGE}&page=1`),
      http.get(`/?per_page=${PER_PAGE}&page=2`),
      http.get(`/?per_page=${PER_PAGE}&page=3`)
    ]);
    expect(p1.data.data.totalItems).toBe(TOTAL);
    expect(p2.data.data.totalItems).toBe(TOTAL);
    expect(p3.data.data.totalItems).toBe(TOTAL);
  });

  it('totalPages es 2', async () => {
    const { data } = await http.get(`/?per_page=${PER_PAGE}`);
    expect(data.data.totalPages).toBe(TOTAL / PER_PAGE);
  });

  it('page=all devuelve los 30 registros sin estructura de paginación', async () => {
    const { data } = await http.get('/?page=all');
    expect(Array.isArray(data.data)).toBe(true);
    expect(data.data).toHaveLength(TOTAL);
  });

  it('los items de página 1 y página 2 no se solapan', async () => {
    const [p1, p2] = await Promise.all([
      http.get(`/?per_page=${PER_PAGE}&page=1`),
      http.get(`/?per_page=${PER_PAGE}&page=2`)
    ]);
    const ids1 = new Set(p1.data.data.items.map((i) => i._id));
    const ids2 = p2.data.data.items.map((i) => i._id);
    ids2.forEach((id) => expect(ids1.has(id)).toBe(false));
  });

  it('cursor de página 1 es 1', async () => {
    const { data } = await http.get(`/?per_page=${PER_PAGE}&page=1`);
    expect(data.data.cursor).toBe(1);
  });

  it('cursor de página 2 es 16', async () => {
    const { data } = await http.get(`/?per_page=${PER_PAGE}&page=2`);
    expect(data.data.cursor).toBe(PER_PAGE + 1);
  });

});

// ─────────────────────────────────────────────
// Modelo — campos y validaciones
// ─────────────────────────────────────────────
describe('Modelo Item — campos y validaciones', () => {

  let itemId;

  it('crea un registro con todos los campos', async () => {
    const { status, data } = await http.post('/', { name: 'Full Item', value: 99, tags: ['a', 'b'] });
    expect(status).toBe(201);
    expect(data.data.name).toBe('Full Item');
    expect(data.data.value).toBe(99);
    expect(data.data.tags).toEqual(['a', 'b']);
    itemId = data.data._id;
  });

  it('active es true por defecto', async () => {
    const { data } = await http.get(`/${itemId}`);
    expect(data.data.active).toBe(true);
  });

  it('createdAt es una fecha válida', async () => {
    const { data } = await http.get(`/${itemId}`);
    expect(new Date(data.data.createdAt).toString()).not.toBe('Invalid Date');
  });

  it('value tiene 0 como valor por defecto', async () => {
    const { data } = await http.post('/', { name: 'No Value' });
    expect(data.data.value).toBe(0);
  });

  it('rechaza creación sin name (campo requerido)', async () => {
    const { status, data } = await http.post('/', { value: 10 });
    expect(status).toBeGreaterThanOrEqual(400);
    expect(data.success).toBe(false);
  });

  it('actualiza updatedAt al hacer PUT', async () => {
    const before = (await http.get(`/${itemId}`)).data.data.updatedAt;
    await http.put(`/${itemId}`, { name: 'Updated' });
    const after = (await http.get(`/${itemId}`)).data.data.updatedAt;
    expect(after).not.toBe(before);
  });

  it('soft-delete excluye el registro de los listados', async () => {
    await http.delete(`/${itemId}`);
    const { data } = await http.get(`/${itemId}`);
    expect(data.success).toBe(false);
  });

});

// ─────────────────────────────────────────────
// CRUD secuencial
// ─────────────────────────────────────────────
describe('CRUD secuencial', () => {

  let id;

  it('POST crea y devuelve 201', async () => {
    const { status, data } = await http.post('/', { name: 'CRUD Test', value: 42 });
    expect(status).toBe(201);
    expect(data.data._id).toBeDefined();
    id = data.data._id;
  });

  it('GET /:id devuelve el registro creado', async () => {
    const { status, data } = await http.get(`/${id}`);
    expect(status).toBe(200);
    expect(data.data._id).toBe(id);
    expect(data.data.name).toBe('CRUD Test');
  });

  it('PUT /:id actualiza y devuelve 202', async () => {
    const { status, data } = await http.put(`/${id}`, { name: 'CRUD Updated', value: 99 });
    expect(status).toBe(202);
    expect(data.data.name).toBe('CRUD Updated');
    expect(data.data.value).toBe(99);
  });

  it('PUT /:id merge no borra campos no enviados', async () => {
    const { data } = await http.put(`/${id}`, { value: 1 });
    expect(data.data.name).toBe('CRUD Updated');
  });

  it('GET con id inexistente devuelve 404', async () => {
    const { status } = await http.get('/000000000000000000000000');
    expect(status).toBe(404);
  });

  it('GET con id con formato inválido devuelve 400', async () => {
    const { status } = await http.get('/not-an-id');
    expect(status).toBeGreaterThanOrEqual(400);
  });

  it('DELETE /:id soft-delete devuelve 204', async () => {
    const { status } = await http.delete(`/${id}`);
    expect(status).toBe(204);
  });

  it('GET /:id después de eliminar devuelve 404', async () => {
    const { status } = await http.get(`/${id}`);
    expect(status).toBe(404);
  });

});

// ─────────────────────────────────────────────
// Búsqueda — ReDoS (bug fix)
// ─────────────────────────────────────────────
describe('Búsqueda — protección ReDoS', () => {

  it('caracteres especiales de regex no crashean el servidor', async () => {
    const { status } = await http.get('/?search=(((');
    expect(status).toBe(200);
  });

  it('backslash en búsqueda no crashea', async () => {
    const { status } = await http.get('/?search=test\\value');
    expect(status).toBe(200);
  });

  it('corchetes y puntos en búsqueda no crashean', async () => {
    const { status } = await http.get('/?search=user[0].name');
    expect(status).toBe(200);
  });

  it('búsqueda por texto existente devuelve resultados', async () => {
    const { data } = await http.get('/?search=Item 01');
    expect(data.data.items.length).toBeGreaterThanOrEqual(1);
  });

  it('búsqueda por texto inexistente devuelve lista vacía', async () => {
    const { data } = await http.get('/?search=ZZZNORESULTS999');
    expect(data.data.items).toHaveLength(0);
  });

});
