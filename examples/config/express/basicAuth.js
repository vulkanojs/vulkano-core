/**
 * Basic Auth Config
 *
 * Credentials travel in the Authorization header. If JWT is enabled too, keep its
 * 'header' (config/express/jwt.js) on something else, e.g. 'x-token-auth' — the
 * server refuses to start when both use Authorization.
 */

module.exports = {

  // Enable Basic Auth
  enabled: false,

  // Scope: '*' (all routes, default), a single path, or an array of paths
  // path: '/admin',
  // path: ['/admin', '/docs'],

  // Name shown by the browser's login prompt
  realm: 'Vulkano',

  // user: plain password or bcrypt hash ($2a$/$2b$/$2y$)
  // Users without a password (e.g. an unset env var) are skipped
  users: {
    // admin: process.env.BASIC_AUTH_PASS
  }

};
