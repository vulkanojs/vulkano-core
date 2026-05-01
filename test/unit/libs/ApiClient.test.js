/**
 * ApiClient — unit tests
 * Focuses on option building (SSL config) without making real HTTP requests.
 */

const https = require('https');

// ApiClient uses VSError for error handling
global.app = { PRODUCTION: false };
global.VSError = class VSError extends Error {
  constructor(msg, code) { super(msg); this.statusCode = code; }
};

// Intercept axios to capture the options it receives
jest.mock('axios', () => {
  const fn = jest.fn().mockResolvedValue({ data: { ok: true } });
  return fn;
});

const axios = require('axios');
const ApiClient = require('../../../libs/ApiClient');

beforeEach(() => {
  axios.mockClear();
});

describe('ApiClient SSL configuration', () => {

  it('enables SSL verification by default (rejectUnauthorized: true)', async () => {
    await ApiClient.get('http://example.com/test');
    const opts = axios.mock.calls[0][0];
    expect(opts.httpsAgent).toBeInstanceOf(https.Agent);
    expect(opts.httpsAgent.options.rejectUnauthorized).toBe(true);
  });

  it('disables SSL verification when rejectUnauthorized: false is passed', async () => {
    await ApiClient.send({ url: 'https://example.com', method: 'GET', rejectUnauthorized: false });
    const opts = axios.mock.calls[0][0];
    expect(opts.httpsAgent.options.rejectUnauthorized).toBe(false);
  });

  it('enables SSL verification when rejectUnauthorized: true is explicitly passed', async () => {
    await ApiClient.send({ url: 'https://example.com', method: 'GET', rejectUnauthorized: true });
    const opts = axios.mock.calls[0][0];
    expect(opts.httpsAgent.options.rejectUnauthorized).toBe(true);
  });

});

describe('ApiClient request building', () => {

  it('sets Content-Type and Accept headers by default', async () => {
    await ApiClient.get('http://example.com/test');
    const opts = axios.mock.calls[0][0];
    expect(opts.headers['Content-Type']).toBe('application/json');
    expect(opts.headers['Accept']).toBe('application/json');
  });

  it('merges custom headers with defaults', async () => {
    await ApiClient.get('http://example.com/test', { headers: { 'X-Token': 'abc' } });
    const opts = axios.mock.calls[0][0];
    expect(opts.headers['X-Token']).toBe('abc');
    expect(opts.headers['Content-Type']).toBe('application/json');
  });

  it('attaches body as data for POST', async () => {
    await ApiClient.post('http://example.com/test', { name: 'vulkano' });
    const opts = axios.mock.calls[0][0];
    expect(opts.data).toEqual({ name: 'vulkano' });
    expect(opts.method).toBe('post');
  });

  it('sets responseType to json by default', async () => {
    await ApiClient.get('http://example.com/test');
    const opts = axios.mock.calls[0][0];
    expect(opts.responseType).toBe('json');
  });

  it('accepts a custom responseType', async () => {
    await ApiClient.send({ url: 'http://example.com/file', method: 'GET', responseType: 'arraybuffer' });
    const opts = axios.mock.calls[0][0];
    expect(opts.responseType).toBe('arraybuffer');
  });

});
