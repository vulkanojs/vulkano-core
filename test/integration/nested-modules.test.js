/**
 * Nested module routing
 * Tests: same controller name (VatTypesController) at 3 nesting depths
 *        resolves to 3 distinct route namespaces — root, module, submodule.
 */

const axios = require('./helpers/http')(process.env.TEST_SERVER_URL);

describe('Nested module routing (VatTypesController at multiple depths)', () => {

  describe('CRUD /vat-types/ — root level', () => {

    it('GET / responds { root: true }', async () => {
      const { status, data } = await axios.get('/vat-types/');
      expect(status).toBe(200);
      expect(data.data.root).toBe(true);
    });

    it('GET /:id responds { root: id }', async () => {
      const { status, data } = await axios.get('/vat-types/abc123');
      expect(status).toBe(200);
      expect(data.data.root).toBe('abc123');
    });

    it('POST / responds { root: true } with 201', async () => {
      const { status, data } = await axios.post('/vat-types/', {});
      expect(status).toBe(201);
      expect(data.data.root).toBe(true);
    });

    it('PUT /:id responds { root: id } with 202', async () => {
      const { status, data } = await axios.put('/vat-types/abc123', {});
      expect(status).toBe(202);
      expect(data.data.root).toBe('abc123');
    });

    it('DELETE /:id responds 204', async () => {
      const { status } = await axios.delete('/vat-types/abc123');
      expect(status).toBe(204);
    });

  });

  describe('CRUD /api/vat-types/ — module level', () => {

    it('GET / responds { module: true }', async () => {
      const { status, data } = await axios.get('/api/vat-types/');
      expect(status).toBe(200);
      expect(data.data.module).toBe(true);
    });

    it('GET /:id responds { module: id }', async () => {
      const { status, data } = await axios.get('/api/vat-types/abc123');
      expect(status).toBe(200);
      expect(data.data.module).toBe('abc123');
    });

    it('POST / responds { module: true } with 201', async () => {
      const { status, data } = await axios.post('/api/vat-types/', {});
      expect(status).toBe(201);
      expect(data.data.module).toBe(true);
    });

    it('PUT /:id responds { module: id } with 202', async () => {
      const { status, data } = await axios.put('/api/vat-types/abc123', {});
      expect(status).toBe(202);
      expect(data.data.module).toBe('abc123');
    });

    it('DELETE /:id responds 204', async () => {
      const { status } = await axios.delete('/api/vat-types/abc123');
      expect(status).toBe(204);
    });

  });

  describe('CRUD /api/config/vat-types/ — submodule level', () => {

    it('GET / responds { submodule: true }', async () => {
      const { status, data } = await axios.get('/api/config/vat-types/');
      expect(status).toBe(200);
      expect(data.data.submodule).toBe(true);
    });

    it('GET /:id responds { submodule: id }', async () => {
      const { status, data } = await axios.get('/api/config/vat-types/abc123');
      expect(status).toBe(200);
      expect(data.data.submodule).toBe('abc123');
    });

    it('POST / responds { submodule: true } with 201', async () => {
      const { status, data } = await axios.post('/api/config/vat-types/', {});
      expect(status).toBe(201);
      expect(data.data.submodule).toBe(true);
    });

    it('PUT /:id responds { submodule: id } with 202', async () => {
      const { status, data } = await axios.put('/api/config/vat-types/abc123', {});
      expect(status).toBe(202);
      expect(data.data.submodule).toBe('abc123');
    });

    it('DELETE /:id responds 204', async () => {
      const { status } = await axios.delete('/api/config/vat-types/abc123');
      expect(status).toBe(204);
    });

  });

  describe('Route isolation — the three levels do not shadow each other', () => {

    it('root, module and submodule are independently reachable in the same run', async () => {
      const [root, module_, submodule] = await Promise.all([
        axios.get('/vat-types/'),
        axios.get('/api/vat-types/'),
        axios.get('/api/config/vat-types/')
      ]);

      expect(root.data.data.root).toBe(true);
      expect(module_.data.data.module).toBe(true);
      expect(submodule.data.data.submodule).toBe(true);
    });

  });

});
