/**
 * Legacy API Compat
 *
 * Restores Express 4 behavior removed or changed in Express 5, so
 * controllers written against the old API keep working unchanged:
 * req.param(), req.body defaulting to {} when unparsed,
 * req.params[0] for glued-wildcard routes (Express 5 replaces it with a
 * named 'splat' array), the two-argument (status-first) forms of
 * res.send/res.json/res.jsonp, the (url, status) argument order of
 * res.redirect, res.redirect('back'), and res.location('back').
 *
 * This whole module is a temporary bridge, not a permanent API surface —
 * it will be removed in a future major version of @vulkano/core. See
 * README.md's "Express 5 — compatibility layer" section for the full
 * checklist of what to update in an app before that happens.
 */

// Printed once per server start (not per-request) so it's visible in the
// boot log without spamming every request.
function warnLegacyApiCompatActive() {
  console.warn(
    '\x1b[33m[vulkano] WARNING:\x1b[0m Express 4 legacy compatibility layer is active ' +
    '(bootstrap/legacyApiCompat.js). It exists so apps written against the old Express 4 API keep ' +
    'working unchanged, but it will be REMOVED in a future major version. Update your app ' +
    'when convenient:\n' +
    '  - req.param(name)              -> req.params.name / req.body.name / req.query.name\n' +
    '  - res.send(status, body)       -> res.status(status).send(body)\n' +
    '  - res.send(status)             -> res.sendStatus(status)\n' +
    '  - res.json(status, body)       -> res.status(status).json(body)\n' +
    '  - res.jsonp(status, body)      -> res.status(status).jsonp(body)\n' +
    '  - res.redirect(url, status)    -> res.redirect(status, url)\n' +
    "  - res.redirect('back')         -> res.redirect(req.get('Referrer') || '/')\n" +
    "  - res.location('back')         -> res.location(req.get('Referrer') || '/')\n" +
    "  - req.params[0] (wildcard tail) -> req.params.splat (array of segments)\n" +
    "  - '/admin*', '/admin/*', ':id?' route syntax -> '/admin{*splat}', '/user{/:id}' (path-to-regexp v8)\n" +
    '  See README.md for the complete list and why each one is safe to leave as-is for now.'
  );
}

function applyLegacyApiCompat(app) {

  warnLegacyApiCompatActive();

  app.use((req, res, next) => {

    req.param = function legacyParam(name, defaultValue) {
      if (this.params && this.params[name] !== undefined) {
        return this.params[name];
      }
      if (this.body && this.body[name] !== undefined) {
        return this.body[name];
      }
      if (this.query && this.query[name] !== undefined) {
        return this.query[name];
      }
      return defaultValue;
    };

    if (req.body === undefined) {
      req.body = {};
    }

    let currentParams = req.params;
    Object.defineProperty(req, 'params', {
      configurable: true,
      enumerable: true,
      get() {
        return currentParams;
      },
      set(value) {
        currentParams = value;
        if (currentParams && currentParams.splat !== undefined) {
          currentParams[0] = Array.isArray(currentParams.splat)
            ? currentParams.splat.join('/')
            : currentParams.splat;
        }
      }
    });

    const originalSend = res.send.bind(res);
    const originalSendStatus = res.sendStatus.bind(res);
    res.send = function legacySend(bodyOrStatus, maybeBody) {
      if (typeof bodyOrStatus === 'number' && maybeBody !== undefined) {
        res.status(bodyOrStatus);
        return originalSend(maybeBody);
      }
      // Legacy single-argument shorthand: res.send(404) set the status and
      // sent the default reason-phrase body — Express 5 instead sends the
      // literal number 404 as the body with status 200 unless res.sendStatus()
      // is used. Replicate the old (intentionally ambiguous) shorthand.
      if (typeof bodyOrStatus === 'number' && arguments.length === 1) {
        return originalSendStatus(bodyOrStatus);
      }
      return originalSend(bodyOrStatus);
    };

    const originalJson = res.json.bind(res);
    res.json = function legacyJson(bodyOrStatus, maybeBody) {
      if (typeof bodyOrStatus === 'number' && maybeBody !== undefined) {
        res.status(bodyOrStatus);
        return originalJson(maybeBody);
      }
      return originalJson(bodyOrStatus);
    };

    const originalJsonp = res.jsonp.bind(res);
    res.jsonp = function legacyJsonp(bodyOrStatus, maybeBody) {
      if (typeof bodyOrStatus === 'number' && maybeBody !== undefined) {
        res.status(bodyOrStatus);
        return originalJsonp(maybeBody);
      }
      return originalJsonp(bodyOrStatus);
    };

    const originalRedirect = res.redirect.bind(res);
    res.redirect = function legacyRedirect(a, b) {
      if (a === 'back') {
        return originalRedirect(req.get('Referrer') || '/');
      }
      if (typeof a === 'string' && typeof b === 'number') {
        return originalRedirect(b, a);
      }
      if (arguments.length >= 2) {
        return originalRedirect(a, b);
      }
      return originalRedirect(a);
    };

    const originalLocation = res.location.bind(res);
    res.location = function legacyLocation(url) {
      if (url === 'back') {
        return originalLocation(req.get('Referrer') || '/');
      }
      return originalLocation(url);
    };

    next();

  });

}

module.exports = { applyLegacyApiCompat };
