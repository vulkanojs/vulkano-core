/**
 * BasicAuth — unit tests
 * Tests parse/verify/conflictsWithJwt and the middleware without spinning up a server.
 */

const bcrypt = require('bcryptjs');
const { setupGlobals } = require('../helpers/globals');

setupGlobals();

const BasicAuth = require('../../../libs/BasicAuth');

const header = (value) => ({ headers: { authorization: value } });
const basic = (credentials) => `Basic ${Buffer.from(credentials).toString('base64')}`;

// ─────────────────────────────────────────────
// parse
// ─────────────────────────────────────────────
describe('BasicAuth.parse', () => {

  it('splits user and password at the first ":"', () => {
    expect(BasicAuth.parse(header(basic('admin:pa:ss')))).toEqual({ user: 'admin', password: 'pa:ss' });
  });

  it('accepts an empty password and a lowercase scheme', () => {
    expect(BasicAuth.parse(header(`basic ${Buffer.from('admin:').toString('base64')}`)))
      .toEqual({ user: 'admin', password: '' });
  });

  it.each([
    ['no header', undefined],
    ['a Bearer token', 'Bearer abc.def.ghi'],
    ['no ":"', basic('admin')],
    ['an empty user', basic(':secret')],
    ['garbage after the scheme', 'Basic not base64!']
  ])('returns null for %s', (label, value) => {
    expect(BasicAuth.parse(header(value))).toBeNull();
  });

});

// ─────────────────────────────────────────────
// getUsers / verify
// ─────────────────────────────────────────────
describe('BasicAuth.getUsers / BasicAuth.verify', () => {

  const users = BasicAuth.getUsers({
    admin: 'secret',
    hashed: bcrypt.hashSync('hashed-pass', 4),
    missing: undefined,
    empty: ''
  });

  it('skips users without a password', () => {
    expect([...users.keys()]).toEqual(['admin', 'hashed']);
  });

  it('accepts a plain password', async () => {
    await expect(BasicAuth.verify(users, { user: 'admin', password: 'secret' })).resolves.toBe(true);
  });

  it('accepts a bcrypt-hashed password', async () => {
    await expect(BasicAuth.verify(users, { user: 'hashed', password: 'hashed-pass' })).resolves.toBe(true);
  });

  it.each([
    ['a wrong plain password', { user: 'admin', password: 'nope' }],
    ['a wrong bcrypt password', { user: 'hashed', password: 'nope' }],
    ['an unknown user', { user: 'ghost', password: 'secret' }],
    ['a user without password', { user: 'empty', password: '' }],
    ['an inherited property name', { user: '__proto__', password: '' }],
    ['no credentials', null]
  ])('rejects %s', async (label, credentials) => {
    await expect(BasicAuth.verify(users, credentials)).resolves.toBe(false);
  });

});

// ─────────────────────────────────────────────
// conflictsWithJwt
// ─────────────────────────────────────────────
describe('BasicAuth.conflictsWithJwt', () => {

  it.each([
    [{ enabled: true, header: 'authorization' }, true],
    [{ enabled: true, header: 'Authorization' }, true],
    [{ enabled: true, header: 'x-token-auth' }, false],
    [{ enabled: false, header: 'authorization' }, false],
    [undefined, false]
  ])('%j → %s', (jwtConfig, expected) => {
    expect(BasicAuth.conflictsWithJwt(jwtConfig)).toBe(expected);
  });

});

// ─────────────────────────────────────────────
// init (middleware)
// ─────────────────────────────────────────────
describe('BasicAuth.init', () => {

  const mockRes = () => {
    const res = { headers: {} };
    res.set = jest.fn((key, value) => { res.headers[key] = value; return res; });
    res.status = jest.fn(() => res);
    res.jsonp = jest.fn(() => res);
    return res;
  };

  const middleware = BasicAuth.init({ users: { admin: 'secret' }, realm: 'My "App"' });

  it('calls next() and sets req.basicAuth on valid credentials', async () => {
    const req = header(basic('admin:secret'));
    const res = mockRes();
    const next = jest.fn();
    await middleware(req, res, next);
    expect(next).toHaveBeenCalledWith();
    expect(req.basicAuth).toEqual({ user: 'admin' });
    expect(res.status).not.toHaveBeenCalled();
  });

  it('answers 401 with the challenge (quotes stripped from the realm) otherwise', async () => {
    const res = mockRes();
    const next = jest.fn();
    await middleware(header(basic('admin:nope')), res, next);
    expect(next).not.toHaveBeenCalled();
    expect(res.status).toHaveBeenCalledWith(401);
    expect(res.headers['WWW-Authenticate']).toBe('Basic realm="My App", charset="UTF-8"');
    expect(res.jsonp).toHaveBeenCalledWith({ success: false, statusCode: 401, error: { detail: 'Unauthorized' } });
  });

});
