/**
 * Jwt — unit tests
 * Tests encode/decode/decrypt/getToken without spinning up a server.
 */

// Globals required by Jwt.js before requiring it
global.app = {
  config: {
    jwt: {
      key: 'test-jwt-secret-key-32chars!!!!!',
      algorithms: ['HS256'],
      expiration: false,
      header: 'authorization',
      queryParameter: 'token',
      cookieName: 'jwt'
    }
  }
};

global.VSError = class VSError extends Error {
  constructor(msg, code) { super(msg); this.statusCode = code; }
  static reject(msg, code) { return Promise.reject(new VSError(msg, code)); }
};

global.Encrypter = require('../../../libs/Encrypter');

const Jwt = require('../../../libs/Jwt');

// ─────────────────────────────────────────────
// encode / decode round-trip
// ─────────────────────────────────────────────
describe('Jwt.encode / Jwt.decode', () => {

  it('encodes a payload and decodes it back to the original object', () => {
    const payload = { userId: '123', role: 'admin' };
    const token = Jwt.encode(payload);
    const result = Jwt.decode(token);
    expect(result).toMatchObject(payload);
  });

  it('returns null when decoding null', () => {
    expect(Jwt.decode(null)).toBeNull();
  });

  it('returns null for an empty string token', () => {
    expect(Jwt.decode('')).toBeNull();
  });

  it('returns null for a tampered token string', () => {
    expect(Jwt.decode('invalid.token.here')).toBeNull();
  });

  it('encodes different payloads to different tokens', () => {
    const t1 = Jwt.encode({ userId: '1' });
    const t2 = Jwt.encode({ userId: '2' });
    expect(t1).not.toBe(t2);
  });

  it('two separate encodes of the same payload produce different ciphertexts (random IV)', () => {
    const payload = { userId: '42' };
    const t1 = Jwt.encode(payload);
    const t2 = Jwt.encode(payload);
    expect(t1).not.toBe(t2);
    expect(Jwt.decode(t1)).toMatchObject(payload);
    expect(Jwt.decode(t2)).toMatchObject(payload);
  });

  it('token encoded with one key cannot be decoded with a different key', () => {
    const token = Jwt.encode({ userId: '99' });

    // Temporarily swap the key
    const original = global.app.config.jwt.key;
    global.app.config.jwt.key = 'completely-different-key-xxxxxxxx';
    const result = Jwt.decode(token);
    global.app.config.jwt.key = original;

    expect(result).toBeNull();
  });

});

// ─────────────────────────────────────────────
// expiration handling
// ─────────────────────────────────────────────
describe('Jwt.decode — expiration', () => {

  it('decodes payload that includes a future expiration', () => {
    const future = String(Date.now() + 3600_000); // 1 hour from now
    const token = Jwt.encode({ userId: 'exp-ok', expiration: future });

    // Need to turn expiration checking back on temporarily
    global.app.config.jwt.expiration = undefined;
    const result = Jwt.decode(token);
    global.app.config.jwt.expiration = false;

    expect(result).not.toBeNull();
    expect(result.userId).toBe('exp-ok');
  });

  it('returns null for an expired token', () => {
    const past = String(Date.now() - 1000); // 1 second ago
    const token = Jwt.encode({ userId: 'expired', expiration: past });

    global.app.config.jwt.expiration = undefined;
    const result = Jwt.decode(token);
    global.app.config.jwt.expiration = false;

    expect(result).toBeNull();
  });

  it('returns null when expiration field is missing and expiration check is enabled', () => {
    const token = Jwt.encode({ userId: 'no-exp' });

    global.app.config.jwt.expiration = undefined;
    const result = Jwt.decode(token);
    global.app.config.jwt.expiration = false;

    expect(result).toBeNull();
  });

  it('ignores missing expiration field when config.jwt.expiration === false', () => {
    // expiration: false is already set in global.app.config.jwt
    const token = Jwt.encode({ userId: 'no-exp-allowed' });
    const result = Jwt.decode(token);
    expect(result).not.toBeNull();
    expect(result.userId).toBe('no-exp-allowed');
  });

});

// ─────────────────────────────────────────────
// getToken — extracts token from request object
// ─────────────────────────────────────────────
describe('Jwt.getToken', () => {

  function makeReq(overrides = {}) {
    return {
      headers: {},
      cookies: {},
      query: {},
      ...overrides
    };
  }

  it('returns null when no token is present anywhere', () => {
    expect(Jwt.getToken(makeReq())).toBeNull();
  });

  it('extracts a valid token from the configured header', () => {
    const token = Jwt.encode({ userId: 'hdr' });
    const req = makeReq({ headers: { authorization: token } });
    expect(Jwt.getToken(req)).toBe(token);
  });

  it('extracts a valid token from the query parameter', () => {
    const token = Jwt.encode({ userId: 'qry' });
    const req = makeReq({ query: { token } });
    expect(Jwt.getToken(req)).toBe(token);
  });

  it('extracts a valid token from a cookie', () => {
    const token = Jwt.encode({ userId: 'cookie' });
    const req = makeReq({ cookies: { jwt: token } });
    expect(Jwt.getToken(req)).toBe(token);
  });

  it('returns null for an invalid token in the header', () => {
    const req = makeReq({ headers: { authorization: 'not.a.valid.token' } });
    expect(Jwt.getToken(req)).toBeNull();
  });

  it('header takes priority over query param', () => {
    const t1 = Jwt.encode({ userId: 'header' });
    const t2 = Jwt.encode({ userId: 'query' });
    const req = makeReq({ headers: { authorization: t1 }, query: { token: t2 } });
    expect(Jwt.getToken(req)).toBe(t1);
  });

});

// ─────────────────────────────────────────────
// decrypt
// ─────────────────────────────────────────────
describe('Jwt.decrypt', () => {

  it('returns null for garbage input', () => {
    expect(Jwt.decrypt('notvalidbase64')).toBeNull();
  });

  it('returns null for empty string', () => {
    expect(Jwt.decrypt('')).toBeNull();
  });

});
