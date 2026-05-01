/**
 * VSR — Vulkano Standard Response
 * Tests: response shape, error handling, edge cases from bug fixes
 */

const axios = require('axios').create({
  baseURL: process.env.TEST_SERVER_URL,
  validateStatus: () => true  // never throw on any HTTP status
});

describe('VSR — Vulkano Standard Response', () => {

  describe('Success responses', () => {

    it('returns { success: true, statusCode: 200, data }', async () => {
      const { status, data } = await axios.get('/test');
      expect(status).toBe(200);
      expect(data.success).toBe(true);
      expect(data.statusCode).toBe(200);
      expect(data.data).toEqual({ message: 'hello' });
    });

    it('POST returns received body in data', async () => {
      const payload = { name: 'test', value: 1 };
      const { status, data } = await axios.post('/test/save', payload);
      expect(status).toBe(200);
      expect(data.success).toBe(true);
      expect(data.data.saved).toBe(true);
      expect(data.data.received).toMatchObject(payload);
    });

  });

  describe('Error responses', () => {

    it('VSError.reject — returns custom status and error shape', async () => {
      const { status, data } = await axios.get('/test/error');
      expect(status).toBe(422);
      expect(data.success).toBe(false);
      expect(data.statusCode).toBe(422);
      expect(data.error).toBeDefined();
      expect(data.error.detail).toBe('Custom error message');
    });

    it('VSError.notFound — returns 404 with error shape', async () => {
      const { status, data } = await axios.get('/test/notfound');
      expect(status).toBe(404);
      expect(data.success).toBe(false);
      expect(data.error.detail).toMatch(/Not Found/i);
    });

    it('plain Error rejection — returns error response', async () => {
      const { status, data } = await axios.get('/test/servererror');
      expect(status).toBeGreaterThanOrEqual(400);
      expect(data.success).toBe(false);
      expect(data.error).toBeDefined();
    });

    it('[bug fix] err.message as object — extracts statusCode correctly', async () => {
      const { status, data } = await axios.get('/test/objmessage');
      expect(status).toBe(418);
      expect(data.success).toBe(false);
      expect(data.statusCode).toBe(418);
    });

  });

  describe('Non-promise guard (bug fix)', () => {

    it('returns 500 with descriptive message when controller does not return a Promise', async () => {
      const { status, data } = await axios.get('/test/notpromise');
      expect(status).toBe(500);
      expect(data.success).toBe(false);
      expect(data.error.detail).toMatch(/Promise/i);
    });

  });

  describe('Headers-sent guard (bug fix)', () => {

    it('does not crash or double-send when headers are already sent before VSR resolves', async () => {
      // The controller calls res.json() then res.vsr() — without the guard
      // the second send would throw "Cannot set headers after they are sent"
      const { status, data } = await axios.get('/test/earlyresponse');
      expect(status).toBe(200);
      expect(data.early).toBe(true); // first response wins
    });

  });

});
