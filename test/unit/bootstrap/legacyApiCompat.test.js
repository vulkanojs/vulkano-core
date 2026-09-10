const express = require('express');
const request = require('supertest');
const { applyLegacyApiCompat } = require('../../../bootstrap/legacyApiCompat');

function buildApp() {
  const app = express();
  applyLegacyApiCompat(app);
  return app;
}

describe('legacyApiCompat', () => {

  let warnSpy;

  beforeEach(() => {
    warnSpy = jest.spyOn(console, 'warn').mockImplementation(() => {});
  });

  afterEach(() => {
    warnSpy.mockRestore();
  });

  test('logs a deprecation warning once per applyLegacyApiCompat() call, naming what to update', () => {
    buildApp();
    expect(warnSpy).toHaveBeenCalledTimes(1);
    const message = warnSpy.mock.calls[0][0];
    expect(message).toMatch(/removed in a future major version/i);
    expect(message).toContain('req.param(name)');
    expect(message).toContain('res.redirect(url, status)');
  });

  test('req.param(name) reads params, then body, then query', async () => {
    const app = buildApp();
    app.use(express.json());
    app.get('/echo/:id', (req, res) => {
      res.json({ id: req.param('id'), q: req.param('q') });
    });

    const res = await request(app).get('/echo/42?q=hello');
    expect(res.body).toEqual({ id: '42', q: 'hello' });
  });

  test('req.body defaults to {} instead of undefined when nothing parses it', async () => {
    const app = buildApp();
    // No express.json()/urlencoded() registered — req.body would be
    // undefined in bare Express 5 without this shim.
    app.get('/no-body-parser', (req, res) => {
      res.json({ isObject: typeof req.body === 'object' && req.body !== null, keys: Object.keys(req.body) });
    });

    const res = await request(app).get('/no-body-parser');
    expect(res.body).toEqual({ isObject: true, keys: [] });
  });

  test("req.params[0] is restored from Express 5's req.params.splat for a glued wildcard route", async () => {
    const app = buildApp();
    app.get('/admin{*splat}', (req, res) => res.json({ zero: req.params[0] }));
    const res = await request(app).get('/admin/sub/path');
    expect(res.body.zero).toBe('/sub/path');
  });

  test('res.send(status) single-arg shorthand sets the status (not a 200 with the number as body)', async () => {
    const app = buildApp();
    app.get('/legacy-send-status-only', (req, res) => {
      res.send(404);
    });

    const res = await request(app).get('/legacy-send-status-only');
    expect(res.status).toBe(404);
  });

  test('res.send(status, body) legacy two-arg order still works', async () => {
    const app = buildApp();
    app.get('/legacy-send', (req, res) => {
      res.send(201, 'created');
    });

    const res = await request(app).get('/legacy-send');
    expect(res.status).toBe(201);
    expect(res.text).toBe('created');
  });

  test('res.json(status, body) legacy two-arg order still works', async () => {
    const app = buildApp();
    app.get('/legacy-json', (req, res) => {
      res.json(201, { ok: true });
    });

    const res = await request(app).get('/legacy-json');
    expect(res.status).toBe(201);
    expect(res.body).toEqual({ ok: true });
  });

  test('res.jsonp(status, body) legacy two-arg order still works', async () => {
    const app = buildApp();
    app.get('/legacy-jsonp', (req, res) => {
      res.jsonp(201, { ok: true });
    });

    const res = await request(app).get('/legacy-jsonp');
    expect(res.status).toBe(201);
    expect(res.body).toEqual({ ok: true });
  });

  test('res.redirect(url, status) legacy order still works', async () => {
    const app = buildApp();
    app.get('/legacy-redirect', (req, res) => {
      res.redirect('/target', 301);
    });

    const res = await request(app).get('/legacy-redirect').redirects(0);
    expect(res.status).toBe(301);
    expect(res.headers.location).toBe('/target');
  });

  test("res.redirect('back') redirects to the Referrer header", async () => {
    const app = buildApp();
    app.get('/legacy-redirect-back', (req, res) => {
      res.redirect('back');
    });

    const res = await request(app)
      .get('/legacy-redirect-back')
      .set('Referrer', '/where-i-came-from')
      .redirects(0);
    expect(res.status).toBe(302);
    expect(res.headers.location).toBe('/where-i-came-from');
  });

  test("res.location('back') sets Location to the Referrer header", async () => {
    const app = buildApp();
    app.get('/legacy-location-back', (req, res) => {
      res.location('back');
      res.status(200).send('ok');
    });

    const res = await request(app)
      .get('/legacy-location-back')
      .set('Referrer', '/where-i-came-from');
    expect(res.headers.location).toBe('/where-i-came-from');
  });

  test('res.redirect(url) single-arg call still works (modern signature unaffected)', async () => {
    const app = buildApp();
    app.get('/legacy-redirect-single', (req, res) => {
      res.redirect('/target');
    });

    const res = await request(app).get('/legacy-redirect-single').redirects(0);
    expect(res.status).toBe(302);
    expect(res.headers.location).toBe('/target');
  });

  test('modern call signatures are unaffected', async () => {
    const app = buildApp();
    app.get('/modern', (req, res) => {
      res.status(202).json({ ok: true });
    });

    const res = await request(app).get('/modern');
    expect(res.status).toBe(202);
    expect(res.body).toEqual({ ok: true });
  });

});
