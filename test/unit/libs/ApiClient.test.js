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
  text: () => Promise.resolve(body === null || body === undefined ? '' : JSON.stringify(body)),
  body: null
});

const ApiClient = require('../../../libs/ApiClient');

beforeEach(async () => {
  await ApiClient.closeDispatchers();
  fetch.mockClear();
  Agent.mockClear();
  fetch.mockResolvedValue(mockResponse());
});

describe('ApiClient SSL configuration', () => {

  it('enables SSL verification by default', async () => {
    await ApiClient.get('https://example.com/test');
    expect(Agent).toHaveBeenCalledWith({ connect: { rejectUnauthorized: true }, pipelining: 1 });
  });

  it('disables SSL verification when rejectUnauthorized: false is passed', async () => {
    await ApiClient.send({ url: 'https://example.com', method: 'GET', rejectUnauthorized: false });
    expect(Agent).toHaveBeenCalledWith({ connect: { rejectUnauthorized: false }, pipelining: 1 });
  });

  it('enables SSL verification when rejectUnauthorized: true is explicitly passed', async () => {
    await ApiClient.send({ url: 'https://example.com', method: 'GET', rejectUnauthorized: true });
    expect(Agent).toHaveBeenCalledWith({ connect: { rejectUnauthorized: true }, pipelining: 1 });
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
      expect(Agent).toHaveBeenCalledWith({ connect: { rejectUnauthorized: false }, pipelining: 1 });
    });

    it('a per-call rejectUnauthorized: true still forces verification even with the env off', async () => {
      process.env.API_CLIENT_REJECT_UNAUTHORIZED = 'false';
      await ApiClient.send({ url: 'https://example.com', method: 'GET', rejectUnauthorized: true });
      expect(Agent).toHaveBeenCalledWith({ connect: { rejectUnauthorized: true }, pipelining: 1 });
    });

    it('a per-call rejectUnauthorized: false still disables verification even with the env unset (secure default)', async () => {
      delete process.env.API_CLIENT_REJECT_UNAUTHORIZED;
      await ApiClient.send({ url: 'https://example.com', method: 'GET', rejectUnauthorized: false });
      expect(Agent).toHaveBeenCalledWith({ connect: { rejectUnauthorized: false }, pipelining: 1 });
    });

    it('any value other than the string "false" keeps SSL verification enabled', async () => {
      process.env.API_CLIENT_REJECT_UNAUTHORIZED = 'nope';
      await ApiClient.get('https://example.com/test');
      expect(Agent).toHaveBeenCalledWith({ connect: { rejectUnauthorized: true }, pipelining: 1 });
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

describe('ApiClient shared dispatchers', () => {

  const ORIGINAL_ENV = process.env.API_CLIENT_KEEP_ALIVE;

  afterEach(() => {
    if (ORIGINAL_ENV === undefined) {
      delete process.env.API_CLIENT_KEEP_ALIVE;
    } else {
      process.env.API_CLIENT_KEEP_ALIVE = ORIGINAL_ENV;
    }
  });

  it('reuses the same dispatcher across requests', async () => {
    await ApiClient.get('https://example.com/a');
    await ApiClient.get('https://example.com/b');
    await ApiClient.post('https://other.example.com/c', { a: 1 });
    expect(Agent).toHaveBeenCalledTimes(1);
    const [[, opts1], [, opts2], [, opts3]] = fetch.mock.calls;
    expect(opts1.dispatcher).toBe(opts2.dispatcher);
    expect(opts2.dispatcher).toBe(opts3.dispatcher);
  });

  it('uses a separate dispatcher per SSL verification setting', async () => {
    await ApiClient.get('https://example.com/a');
    await ApiClient.send({ url: 'https://example.com/b', method: 'GET', rejectUnauthorized: false });
    expect(Agent).toHaveBeenCalledTimes(2);
    const [[, opts1], [, opts2]] = fetch.mock.calls;
    expect(opts1.dispatcher).not.toBe(opts2.dispatcher);
  });

  it('disables keep-alive (pipelining: 0) when keepAlive: false is passed', async () => {
    await ApiClient.get('https://example.com/test', { keepAlive: false });
    expect(Agent).toHaveBeenCalledWith({ connect: { rejectUnauthorized: true }, pipelining: 0 });
  });

  it('disables keep-alive by default when API_CLIENT_KEEP_ALIVE=false', async () => {
    process.env.API_CLIENT_KEEP_ALIVE = 'false';
    await ApiClient.get('https://example.com/test');
    expect(Agent).toHaveBeenCalledWith({ connect: { rejectUnauthorized: true }, pipelining: 0 });
  });

  it('a per-call keepAlive: true wins over API_CLIENT_KEEP_ALIVE=false', async () => {
    process.env.API_CLIENT_KEEP_ALIVE = 'false';
    await ApiClient.get('https://example.com/test', { keepAlive: true });
    expect(Agent).toHaveBeenCalledWith({ connect: { rejectUnauthorized: true }, pipelining: 1 });
  });

  it('closeDispatchers forces a new dispatcher on the next request', async () => {
    await ApiClient.get('https://example.com/a');
    await ApiClient.closeDispatchers();
    await ApiClient.get('https://example.com/b');
    expect(Agent).toHaveBeenCalledTimes(2);
  });

});

describe('ApiClient empty responses', () => {

  it('resolves to {} when the response body is empty (e.g. 204)', async () => {
    fetch.mockResolvedValue(mockResponse(null, 204));
    const data = await ApiClient.delete('https://example.com/item/1');
    expect(data).toEqual({});
  });

});
