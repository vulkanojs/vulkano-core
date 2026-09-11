/**
 * ApiClient — unit tests
 * Focuses on option building (SSL config, headers, body) without making real HTTP requests.
 */

const { setupGlobals } = require('../helpers/globals');
setupGlobals();

// Mock undici's Agent and fetch — ApiClient destructures both directly from
// 'undici' (not the Node global fetch), so the mock must provide both.
jest.mock('undici', () => ({
  Agent: jest.fn().mockImplementation((opts) => ({ _opts: opts })),
  fetch: jest.fn()
}));

const { Agent, fetch } = require('undici');

const mockResponse = (body = { ok: true }, status = 200, ok = true) => ({
  ok,
  status,
  json: () => Promise.resolve(body),
  arrayBuffer: () => Promise.resolve(new ArrayBuffer(0)),
  text: () => Promise.resolve(''),
  body: null
});

const ApiClient = require('../../../libs/ApiClient');

beforeEach(() => {
  fetch.mockClear();
  Agent.mockClear();
  fetch.mockResolvedValue(mockResponse());
});

describe('ApiClient SSL configuration', () => {

  it('enables SSL verification by default', async () => {
    await ApiClient.get('https://example.com/test');
    expect(Agent).toHaveBeenCalledWith({ connect: { rejectUnauthorized: true } });
  });

  it('disables SSL verification when rejectUnauthorized: false is passed', async () => {
    await ApiClient.send({ url: 'https://example.com', method: 'GET', rejectUnauthorized: false });
    expect(Agent).toHaveBeenCalledWith({ connect: { rejectUnauthorized: false } });
  });

  it('enables SSL verification when rejectUnauthorized: true is explicitly passed', async () => {
    await ApiClient.send({ url: 'https://example.com', method: 'GET', rejectUnauthorized: true });
    expect(Agent).toHaveBeenCalledWith({ connect: { rejectUnauthorized: true } });
  });

  describe('API_CLIENT_REJECT_UNAUTHORIZED env override', () => {

    const ORIGINAL_ENV = process.env.API_CLIENT_REJECT_UNAUTHORIZED;

    afterEach(() => {
      if (ORIGINAL_ENV === undefined) {
        delete process.env.API_CLIENT_REJECT_UNAUTHORIZED;
      } else {
        process.env.API_CLIENT_REJECT_UNAUTHORIZED = ORIGINAL_ENV;
      }
    });

    it('disables SSL verification by default when API_CLIENT_REJECT_UNAUTHORIZED=false', async () => {
      process.env.API_CLIENT_REJECT_UNAUTHORIZED = 'false';
      await ApiClient.get('https://example.com/test');
      expect(Agent).toHaveBeenCalledWith({ connect: { rejectUnauthorized: false } });
    });

    it('a per-call rejectUnauthorized: true still forces verification even with the env off', async () => {
      process.env.API_CLIENT_REJECT_UNAUTHORIZED = 'false';
      await ApiClient.send({ url: 'https://example.com', method: 'GET', rejectUnauthorized: true });
      expect(Agent).toHaveBeenCalledWith({ connect: { rejectUnauthorized: true } });
    });

    it('a per-call rejectUnauthorized: false still disables verification even with the env unset (secure default)', async () => {
      delete process.env.API_CLIENT_REJECT_UNAUTHORIZED;
      await ApiClient.send({ url: 'https://example.com', method: 'GET', rejectUnauthorized: false });
      expect(Agent).toHaveBeenCalledWith({ connect: { rejectUnauthorized: false } });
    });

    it('any value other than the string "false" keeps SSL verification enabled', async () => {
      process.env.API_CLIENT_REJECT_UNAUTHORIZED = 'nope';
      await ApiClient.get('https://example.com/test');
      expect(Agent).toHaveBeenCalledWith({ connect: { rejectUnauthorized: true } });
    });

  });

});

describe('ApiClient request building', () => {

  it('sets Content-Type and Accept headers by default', async () => {
    await ApiClient.get('https://example.com/test');
    const [, opts] = fetch.mock.calls[0];
    expect(opts.headers['Content-Type']).toBe('application/json');
    expect(opts.headers['Accept']).toBe('application/json');
  });

  it('merges custom headers with defaults', async () => {
    await ApiClient.get('https://example.com/test', { headers: { 'X-Token': 'abc' } });
    const [, opts] = fetch.mock.calls[0];
    expect(opts.headers['X-Token']).toBe('abc');
    expect(opts.headers['Content-Type']).toBe('application/json');
  });

  it('serializes body as JSON string for POST', async () => {
    await ApiClient.post('https://example.com/test', { name: 'vulkano' });
    const [, opts] = fetch.mock.calls[0];
    expect(opts.body).toBe(JSON.stringify({ name: 'vulkano' }));
    expect(opts.method).toBe('POST');
  });

  it('returns parsed JSON data on success', async () => {
    fetch.mockResolvedValue(mockResponse({ result: 'ok' }));
    const data = await ApiClient.get('https://example.com/test');
    expect(data).toEqual({ result: 'ok' });
  });

  it('returns arrayBuffer when responseType is arraybuffer', async () => {
    await ApiClient.send({ url: 'https://example.com/file', method: 'GET', responseType: 'arraybuffer' });
    // fetch was called and arrayBuffer() would be invoked on response
    expect(fetch).toHaveBeenCalledTimes(1);
  });

  it('rejects with VSError on non-ok response', async () => {
    fetch.mockResolvedValue(mockResponse({ message: 'Not found' }, 404, false));
    await expect(ApiClient.get('https://example.com/missing')).rejects.toMatchObject({ statusCode: 404 });
  });

});
