/**
 * Security middleware — JWT, Basic Auth, rate limiting, cookies + session.
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

const basic = (user, password) => `Basic ${Buffer.from(`${user}:${password}`).toString('base64')}`;

describe('Basic Auth — /basic/* requires valid credentials', () => {

  it('401s with no credentials and sends the WWW-Authenticate challenge', async () => {
    const res = await fetch(`${BASE}/basic/whoami`);
    expect(res.status).toBe(401);
    expect(res.headers.get('www-authenticate')).toBe('Basic realm="Vulkano Test", charset="UTF-8"');
    const body = await res.json();
    expect(body.success).toBe(false);
  });

  it('401s with a wrong password', async () => {
    const res = await fetch(`${BASE}/basic/whoami`, {
      headers: { Authorization: basic('admin', 'nope') }
    });
    expect(res.status).toBe(401);
  });

  it('401s with an unknown user', async () => {
    const res = await fetch(`${BASE}/basic/whoami`, {
      headers: { Authorization: basic('ghost', 'pa:ss') }
    });
    expect(res.status).toBe(401);
  });

  it('200s with a plain password containing ":" and sets req.basicAuth', async () => {
    const res = await fetch(`${BASE}/basic/whoami`, {
      headers: { Authorization: basic('admin', 'pa:ss') }
    });
    expect(res.status).toBe(200);
    expect(await res.json()).toEqual({ user: 'admin' });
  });

  it('200s with a bcrypt-hashed password', async () => {
    const res = await fetch(`${BASE}/basic/whoami`, {
      headers: { Authorization: basic('hashed', 'hashed-pass') }
    });
    expect(res.status).toBe(200);
    expect(await res.json()).toEqual({ user: 'hashed' });
  });

  it('leaves paths outside its scope alone', async () => {
    const res = await fetch(`${BASE}/session-counter`);
    expect(res.status).toBe(200);
  });

});

describe('Basic Auth + JWT on the same path — no collision (/both/*)', () => {

  const getToken = async () => {
    const tokenRes = await fetch(`${BASE}/test/sockettoken`);
    const { data: { token } } = await tokenRes.json();
    return token;
  };

  it('401s with only the JWT token (Basic Auth runs first)', async () => {
    const res = await fetch(`${BASE}/both/whoami`, {
      headers: { 'x-token-auth': await getToken() }
    });
    expect(res.status).toBe(401);
    expect(res.headers.get('www-authenticate')).toMatch(/^Basic /);
  });

  it('401s with only Basic credentials (JWT still required)', async () => {
    const res = await fetch(`${BASE}/both/whoami`, {
      headers: { Authorization: basic('admin', 'pa:ss') }
    });
    expect(res.status).toBe(401);
    expect(res.headers.get('www-authenticate')).toBeNull();
  });

  it('200s with Basic credentials in Authorization and the token in x-token-auth', async () => {
    const res = await fetch(`${BASE}/both/whoami`, {
      headers: {
        Authorization: basic('admin', 'pa:ss'),
        'x-token-auth': await getToken()
      }
    });
    expect(res.status).toBe(200);
    expect(await res.json()).toEqual({ user: 'admin' });
  });

});
