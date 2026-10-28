const crypto = require('node:crypto');
const bcrypt = require('bcryptjs');

module.exports = {

  /**
   * Get the configured users, skipping entries without a password
   * (e.g. `process.env.BASIC_AUTH_PASS` not set)
   *
   * @param {Object} users { user: 'plain password' | 'bcrypt hash' }
   * @returns {Map}
   */
  getUsers(users) {

    const valid = new Map();

    Object.keys(users || {}).forEach((name) => {
      const password = users[name];
      if (name && typeof password === 'string' && password !== '') {
        valid.set(name, password);
      }
    });

    return valid;

  },

  /**
   * True when JWT reads its token from the Authorization header, the same
   * header Basic credentials travel in — both can't be satisfied at once
   *
   * @param {Object} jwtConfig app/config/express/jwt.js
   * @returns {Boolean}
   */
  conflictsWithJwt(jwtConfig) {

    const {
      enabled,
      header
    } = jwtConfig || {};

    return Boolean(enabled) && String(header || '').toLowerCase() === 'authorization';

  },

  /**
   * Get credentials from the Authorization header
   *
   * @param {Express} req
   * @returns {Object|null} { user, password }
   */
  parse(req) {

    const header = req.headers && req.headers.authorization;

    const match = typeof header === 'string' ? header.match(/^Basic\s+([A-Za-z0-9+/=]+)\s*$/i) : null;

    if (!match) {
      return null;
    }

    const decoded = Buffer.from(match[1], 'base64').toString('utf8');

    // The password can contain ':', the user can't (RFC 7617)
    const separator = decoded.indexOf(':');

    if (separator < 1) {
      return null;
    }

    return {
      user: decoded.slice(0, separator),
      password: decoded.slice(separator + 1)
    };

  },

  /**
   * Constant-time string comparison (hashing first so the length doesn't leak)
   *
   * @param {String} a
   * @param {String} b
   * @returns {Boolean}
   */
  safeEqual(a, b) {

    const hashA = crypto.createHash('sha256').update(String(a)).digest();
    const hashB = crypto.createHash('sha256').update(String(b)).digest();

    return crypto.timingSafeEqual(hashA, hashB);

  },

  /**
   * Check the credentials against the configured users
   *
   * @param {Map} users from getUsers()
   * @param {Object} credentials from parse()
   * @returns {Promise<Boolean>}
   */
  async verify(users, credentials) {

    if (!credentials) {
      return false;
    }

    const { user, password } = credentials;

    // Unknown user still runs a comparison, so it takes about as long as a wrong password
    const stored = users.has(user) ? users.get(user) : null;

    if (stored && /^\$2[aby]\$\d{2}\$/.test(stored)) {
      return bcrypt.compare(password, stored);
    }

    const matches = this.safeEqual(password, stored || crypto.randomUUID());

    return Boolean(stored) && matches;

  },

  /**
   * Init Basic Auth for Express
   *
   * @param {Object} opts { users, realm }
   * @returns {Function} middleware
   */
  init(opts) {

    const {
      users: rawUsers,
      realm
    } = opts || {};

    const users = this.getUsers(rawUsers);

    const challenge = `Basic realm="${String(realm || 'Vulkano').replace(/"/g, '')}", charset="UTF-8"`;

    return async (req, res, next) => {

      const credentials = this.parse(req);

      if (await this.verify(users, credentials)) {
        req.basicAuth = { user: credentials.user };
        next();
        return;
      }

      res.set('WWW-Authenticate', challenge);
      res.status(401).jsonp({ success: false, statusCode: 401, error: { detail: 'Unauthorized' } });

    };

  }

};
