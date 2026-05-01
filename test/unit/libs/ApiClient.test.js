/**
 * ApiClient — unit tests
 * Focuses on option building (SSL config, headers, body) without making real HTTP requests.
 */

global.app = { PRODUCTION: false };
global.VSError = class VSError extends Error {
  constructor(msg, code) { super(msg); this.statusCode = code; }
  static reject(msg, code) { return Promise.reject(new VSError(msg, code)); }
};

// Mock undici Agent to capture the connect options passed to it
jest.mock('undici', () => ({
  Agent: jest.fn().mockImplementation((opts) => ({ _opts: opts }))
}));

const { Agent } = require('undici');

// Mock global fetch
const mockResponse = (body = { ok: true }, status = 200, ok = true) => ({
  ok,
  status,
  json: () => Promise.resolve(body),
  arrayBuffer: () => Promise.resolve(new ArrayBuffer(0)),
  text: () => Promise.resolve(''),
  body: null
});

global.fetch = jest.fn().mockResolvedValue(mockResponse());

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
