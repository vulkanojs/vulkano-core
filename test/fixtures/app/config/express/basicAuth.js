/**
 * Basic Auth Config
 */

const bcrypt = require('bcryptjs');

// TEST_ENABLE_SECURITY=1 switches the "secured" fixture server variant to
// actually enforce Basic Auth on /basic and /both — the default variant keeps
// it disabled. /both is also behind JWT, to prove both guards coexist.
const securityEnabled = process.env.TEST_ENABLE_SECURITY === '1';

module.exports = {

  // Enable Basic Auth
  enabled: securityEnabled,

  // Scope: '*' (all routes, default), a single path, or an array of paths
  path: ['/basic', '/both'],

  // Name shown by the browser's login prompt
  realm: 'Vulkano Test',

  // user: plain password or bcrypt hash
  users: {
    admin: 'pa:ss',
    hashed: bcrypt.hashSync('hashed-pass', 4)
  }

};
