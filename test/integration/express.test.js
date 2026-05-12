/**
 * Express middleware — security headers, CORS, trust proxy
 * Verifies that Helmet, Permission-Policy, and related middleware are wired correctly.
 */

const http = require('./helpers/http')(process.env.TEST_SERVER_URL);

describe('Express security headers', () => {

  let headers;

  beforeAll(async () => {
    const res = await fetch(`${process.env.TEST_SERVER_URL}/test`);
    // Convert Headers object to a plain lowercase-keyed object
    headers = {};
    res.headers.forEach((value, key) => { headers[key.toLowerCase()] = value; });
  });

  // ─────────────────────────────────────────────
  // X-Powered-By
  // ─────────────────────────────────────────────
  it('X-Powered-By header is absent (poweredBy: false)', () => {
    expect(headers['x-powered-by']).toBeUndefined();
  });

  // ─────────────────────────────────────────────
  // Helmet — basic headers
  // ─────────────────────────────────────────────
  it('X-Content-Type-Options: nosniff is set', () => {
    expect(headers['x-content-type-options']).toBe('nosniff');
  });

  it('X-DNS-Prefetch-Control is set', () => {
    expect(headers['x-dns-prefetch-control']).toBeDefined();
  });

  it('X-Download-Options is set', () => {
    expect(headers['x-download-options']).toBeDefined();
  });

  it('Referrer-Policy is strict-origin-when-cross-origin (from helmet.js fixture)', () => {
    expect(headers['referrer-policy']).toBe('strict-origin-when-cross-origin');
  });

  // ─────────────────────────────────────────────
  // Permission-Policy (configured in permissionPolicy.js fixture)
  // ─────────────────────────────────────────────
  it('Permissions-Policy header is present', () => {
    expect(headers['permissions-policy']).toBeDefined();
  });

  it('Permissions-Policy blocks camera', () => {
    expect(headers['permissions-policy']).toContain('camera=()');
  });

  it('Permissions-Policy blocks geolocation', () => {
    expect(headers['permissions-policy']).toContain('geolocation=()');
  });

  it('Permissions-Policy blocks microphone', () => {
    expect(headers['permissions-policy']).toContain('microphone=()');
  });

  // ─────────────────────────────────────────────
  // CORS — disabled in fixture (cors.enabled: false)
  // ─────────────────────────────────────────────
  it('Access-Control-Allow-Origin is absent when CORS is disabled', () => {
    expect(headers['access-control-allow-origin']).toBeUndefined();
  });

});

describe('Express JSON body parser', () => {

  it('parses application/json bodies', async () => {
    const { status, data } = await http.post('/test/save', { hello: 'world' });
    expect(status).toBe(200);
    expect(data.data.received.hello).toBe('world');
  });

  it('returns 400 for malformed JSON', async () => {
    const res = await fetch(`${process.env.TEST_SERVER_URL}/test/save`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: '{ bad json }'
    });
    expect(res.status).toBe(400);
  });

  it('parses application/csp-report as JSON (custom MIME)', async () => {
    const res = await fetch(`${process.env.TEST_SERVER_URL}/test/save`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/csp-report' },
      body: JSON.stringify({ csp: 'report' })
    });
    const data = await res.json();
    expect(res.status).toBe(200);
    expect(data.data.received.csp).toBe('report');
  });

});

describe('Express urlencoded body parser', () => {

  it('parses application/x-www-form-urlencoded bodies', async () => {
    const res = await fetch(`${process.env.TEST_SERVER_URL}/test/save`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
      body: 'name=vulkano&value=42'
    });
    const data = await res.json();
    expect(res.status).toBe(200);
    expect(data.data.received.name).toBe('vulkano');
    expect(data.data.received.value).toBe('42');
  });

});
