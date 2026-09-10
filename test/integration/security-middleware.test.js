/**
 * Security middleware — JWT, rate limiting, cookies + session.
 *
 * All disabled in the default fixture (matching a fresh app's defaults),
 * so exercised here against the "secured" fixture server variant
 * (TEST_ENABLE_SECURITY=1, see test/global-setup.js), which actually turns
 * them on. Proves each middleware still works end-to-end under Express 5,
 * not just that the wiring code reads correctly.
 */

const BASE = process.env.TEST_SERVER_SECURED_URL;

describe('JWT — /secure/* requires a valid token', () => {

  it('401s with no token', async () => {
    const res = await fetch(`${BASE}/secure/whoami`);
    expect(res.status).toBe(401);
  });

  it('401s with a garbage token', async () => {
    const res = await fetch(`${BASE}/secure/whoami`, {
      headers: { 'x-token-auth': 'not-a-real-token' }
    });
    expect(res.status).toBe(401);
  });

  it('200s with a real token issued by Jwt.encode()', async () => {
    // /test/sockettoken issues a real token via the shared Jwt lib —
    // not JWT-protected itself, since it lives outside the /secure path.
    const tokenRes = await fetch(`${BASE}/test/sockettoken`);
    const { data: { token } } = await tokenRes.json();

    const res = await fetch(`${BASE}/secure/whoami`, {
      headers: { 'x-token-auth': token }
    });
    expect(res.status).toBe(200);
    const body = await res.json();
    expect(body.ok).toBe(true);
  });

});

describe('Rate limiting — /limited/* trips 429 past the fixture limit (3/min)', () => {

  it('allows the first 3 requests, then 429s', async () => {
    const statuses = [];
    for (let i = 0; i < 4; i += 1) {
      // eslint-disable-next-line no-await-in-loop
      const res = await fetch(`${BASE}/limited/ping`);
      statuses.push(res.status);
    }
    expect(statuses).toEqual([200, 200, 200, 429]);
  });

});

describe('Cookies + session — persists a counter across requests via the session cookie', () => {

  it('increments req.session.views across requests carrying the same session cookie', async () => {
    const first = await fetch(`${BASE}/session-counter`);
    expect(first.status).toBe(200);
    const setCookie = first.headers.get('set-cookie');
    expect(setCookie).toBeTruthy();
    const firstBody = await first.json();
    expect(firstBody.views).toBe(1);

    const sessionCookie = setCookie.split(';')[0];

    const second = await fetch(`${BASE}/session-counter`, {
      headers: { Cookie: sessionCookie }
    });
    const secondBody = await second.json();
    expect(secondBody.views).toBe(2);
  });

  it('a request with no cookie starts a fresh session (views resets to 1)', async () => {
    const res = await fetch(`${BASE}/session-counter`);
    const body = await res.json();
    expect(body.views).toBe(1);
  });

});
