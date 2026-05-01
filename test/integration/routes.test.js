/**
 * Routes
 * Tests: auto-routing by convention, explicit config routes,
 *        route params, query strings, 404 handling
 */

const axios = require('./helpers/http')(process.env.TEST_SERVER_URL);

describe('Routing', () => {

  describe('Convention-based auto-routing', () => {

    it('GET /test — resolves to TestController.get', async () => {
      const { status, data } = await axios.get('/test');
      expect(status).toBe(200);
      expect(data.data.message).toBe('hello');
    });

    it('POST /test/save — resolves to TestController["post save"]', async () => {
      const { status, data } = await axios.post('/test/save', { x: 1 });
      expect(status).toBe(200);
      expect(data.data.saved).toBe(true);
    });

    it('GET /api/item — resolves to scaffold ItemController.get', async () => {
      const { status, data } = await axios.get('/api/item');
      expect(status).toBe(200);
      expect(data.data).toHaveProperty('items');
    });

  });

  describe('Config-based explicit routes', () => {

    it('GET /config/ping — maps to TestController.get via routes.js', async () => {
      const { status, data } = await axios.get('/config/ping');
      expect(status).toBe(200);
      expect(data.success).toBe(true);
    });

  });

  describe('Route params', () => {

    it('GET /test/:id — receives the param value', async () => {
      const { status, data } = await axios.get('/test/abc123');
      expect(status).toBe(200);
      expect(data.data.id).toBe('abc123');
    });

    it('GET /test/:id — numeric param is passed as string', async () => {
      const { status, data } = await axios.get('/test/42');
      expect(status).toBe(200);
      expect(data.data.id).toBe('42');
    });

    it('GET /test/:id/detail/:section — receives both params', async () => {
      const { status, data } = await axios.get('/test/99/detail/info');
      expect(status).toBe(200);
      expect(data.data.id).toBe('99');
      expect(data.data.section).toBe('info');
    });

    it('GET /test/:id — params with special URL-encoded chars', async () => {
      const { status, data } = await axios.get('/test/hello%20world');
      expect(status).toBe(200);
      expect(data.data.id).toBe('hello world');
    });

  });

  describe('Query string params', () => {

    it('single query param is received', async () => {
      const { status, data } = await axios.get('/test/query?name=vulkano');
      expect(status).toBe(200);
      expect(data.data.query.name).toBe('vulkano');
    });

    it('multiple query params are all received', async () => {
      const { status, data } = await axios.get('/test/query?page=2&per_page=10&sort=name');
      expect(status).toBe(200);
      expect(data.data.query.page).toBe('2');
      expect(data.data.query.per_page).toBe('10');
      expect(data.data.query.sort).toBe('name');
    });

    it('query params with special characters are decoded', async () => {
      const { status, data } = await axios.get('/test/query?q=hello%20world');
      expect(status).toBe(200);
      expect(data.data.query.q).toBe('hello world');
    });

    it('empty query string returns empty object', async () => {
      const { status, data } = await axios.get('/test/query');
      expect(status).toBe(200);
      expect(data.data.query).toEqual({});
    });

    it('scaffold list accepts per_page and page via query', async () => {
      const { status, data } = await axios.get('/api/item?page=1&per_page=5');
      expect(status).toBe(200);
      expect(data.data.page).toBe(1);
      expect(data.data.perPage).toBe(5);
    });

    it('scaffold list accepts sort via query', async () => {
      const { status, data } = await axios.get('/api/item?sort=name|ASC');
      expect(status).toBe(200);
      expect(data.data).toHaveProperty('items');
    });

    it('scaffold list accepts search via query', async () => {
      const { status, data } = await axios.get('/api/item?search=test');
      expect(status).toBe(200);
      expect(data.data).toHaveProperty('items');
    });

  });

  describe('Explicit routes — inline function (definition pattern)', () => {

    it('GET with inline handler returns expected JSON', async () => {
      const { status, data } = await axios.get('/explicit/inline');
      expect(status).toBe(200);
      expect(data.source).toBe('inline');
      expect(data.success).toBe(true);
    });

    it('POST with inline handler receives req.body', async () => {
      const { status, data } = await axios.post('/explicit/inline', { key: 'value' });
      expect(status).toBe(200);
      expect(data.source).toBe('inline-post');
      expect(data.received.key).toBe('value');
    });

    it('inline handler bypasses VSR and responds directly with res.json', async () => {
      const { data } = await axios.get('/explicit/inline');
      // VSR wraps response in { success, statusCode, data }
      // Inline res.json skips that wrapper
      expect(data.statusCode).toBeUndefined();
    });

  });

  describe('Explicit routes — custom() initializer (advanced pattern)', () => {

    it('GET registered inside custom() is reachable', async () => {
      const { status, data } = await axios.get('/explicit/custom');
      expect(status).toBe(200);
      expect(data.source).toBe('custom');
      expect(data.success).toBe(true);
    });

    it('POST registered inside custom() is reachable', async () => {
      const { status, data } = await axios.post('/explicit/custom', { hello: 'world' });
      expect(status).toBe(200);
      expect(data.source).toBe('custom-post');
      expect(data.received.hello).toBe('world');
    });

    it('custom() route also responds directly with res.json (no VSR wrapper)', async () => {
      const { data } = await axios.get('/explicit/custom');
      expect(data.statusCode).toBeUndefined();
    });

  });

  describe('File upload — POST with multipart/form-data', () => {

    it('single file upload reaches controller via upload.any()', async () => {
      const form = new FormData();
      form.append('document', new Blob(['hello'], { type: 'text/plain' }), 'hello.txt');

      const res = await fetch(`${process.env.TEST_SERVER_URL}/test/upload`, { method: 'POST', body: form });
      const data = await res.json();

      expect(res.status).toBe(200);
      expect(data.data.uploaded).toBe(1);
      expect(data.data.files[0].originalname).toBe('hello.txt');
    });

    it('multiple files are all received', async () => {
      const form = new FormData();
      form.append('a', new Blob(['1'], { type: 'text/plain' }), 'a.txt');
      form.append('b', new Blob(['2'], { type: 'text/plain' }), 'b.txt');

      const res = await fetch(`${process.env.TEST_SERVER_URL}/test/upload`, { method: 'POST', body: form });
      const data = await res.json();

      expect(data.data.uploaded).toBe(2);
    });

    it('POST without files returns uploaded: 0', async () => {
      const form = new FormData();
      form.append('field', 'value');

      const res = await fetch(`${process.env.TEST_SERVER_URL}/test/upload`, { method: 'POST', body: form });
      const data = await res.json();

      expect(data.data.uploaded).toBe(0);
    });

  });

  describe('404 handling (bug fix: Filter guard)', () => {

    it('unknown controller returns 404', async () => {
      const { status } = await axios.get('/nonexistent-controller');
      expect(status).toBe(404);
    });

    it('path too deep for any registered pattern returns 404', async () => {
      // /test/:id matches 1 segment, /test/:id/detail/:section needs "detail" literal
      // /test/a/b/c/d has no matching pattern → 404
      const { status } = await axios.get('/test/a/b/c/d');
      expect(status).toBe(404);
    });

    it('wrong HTTP method returns 404', async () => {
      const { status } = await axios.delete('/test');
      expect(status).toBe(404);
    });

  });

});
