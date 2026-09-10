/**
 * Route Compat
 *
 * Translates legacy Express 4 route syntax into path-to-regexp v8 syntax
 * used by Express 5, for the patterns Vulkano's own conventions and its
 * consuming apps' `app/config/routes.js` / controller keys can carry:
 *
 * - A trailing bare '*' wildcard, either alone ('*'/'/*', matching every
 *   path including root) or glued/slash-separated onto a literal prefix
 *   ('/admin*', '/admin/*', Vulkano's documented SPA catch-all convention,
 *   see README.md).
 * - An optional named param ('/user/:id?') — a downstream app's existing
 *   controller can carry this even though Vulkano's own code never
 *   generates it, and Express 5 crashes at BOOT time (not request time) on
 *   the raw '?' syntax, so this can't be left undone without breaking any
 *   such app on upgrade.
 *
 * Deliberately NOT handled (genuinely unshimmable, not an oversight — see
 * README's residual-cases list): a wildcard placed before another route
 * segment (e.g. a literal "/api/", a wildcard, then "/edit") and raw regex
 * characters in a route string ('/a(b)c') both require the developer to
 * restructure the route, not a mechanical text substitution.
 *
 * IMPORTANT: '/*splat' (no braces) does NOT match the bare root path '/' in
 * path-to-regexp v8 — only the braced optional form '{*splat}' does.
 *
 * Also accepts an array of paths (rateLimit.path / jwt.path can be
 * configured as an array), normalizing each element independently.
 */

function toExpress5Path(rawPath) {

  if (Array.isArray(rawPath)) {
    return rawPath.map(toExpress5Path);
  }

  if (typeof rawPath !== 'string') {
    return rawPath;
  }

  // Optional named segment '/:name?' -> optional group '{/:name}'
  const withOptionalParams = rawPath.replace(/\/:([A-Za-z0-9_]+)\?/g, '{/:$1}');

  if (!withOptionalParams.endsWith('*')) {
    return withOptionalParams;
  }

  const prefix = withOptionalParams.slice(0, -1);

  return (prefix === '' || prefix === '/') ? '/{*splat}' : `${prefix}{*splat}`;

}

module.exports = { toExpress5Path };
