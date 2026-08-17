/* global User, Auth, VSError */

const bcrypt = require('bcryptjs');

module.exports = {

  SESSION_MS: 1000 * 60 * 60 * 24 * 365 * 10,

  /**
   * Verify a plain-text password against a stored hash.
   * @param {String} plain
   * @param {String} hash
   * @returns {Boolean}
   */
  verifyPassword(plain, hash) {
    return bcrypt.compareSync(`${process.env.SALT_KEY || ''}-${plain}`, hash);
  },

  /**
   * Look up a user by email and verify their password. The only place in
   * the model that explicitly loads the password hash.
   * @param {String} email
   * @param {String} password
   * @returns {Promise<Object>} the authenticated User document
   */
  login({ email, password }) {

    const normalizedEmail = String(email || '')
      .toLowerCase()
      .trim();

    return User.findOne({ email: normalizedEmail, active: true })
      .select('+password')
      .then((user) => {

        if (!user || !Auth.verifyPassword(password || '', user.password)) {
          return VSError.reject('Invalid credentials', 401);
        }

        return Auth.setToken(user);
      });

  },

  /**
   *  Generate token
   * @param {Object} props
   * @returns {Object}
   */
  setToken(u) {

    const {
      _id
    } = u || {};

    if (!_id) {
      return VSError.reject('The user and/or password are incorrect', 400);
    }

    return Promise.resolve({

      user: {
        _id: u._id || '',
        name: u.name || ''
      },

      token: Jwt.encode({
        _id: u._id || '',
        name: u.name || '',
        email: u.email,
        role: u.role || '',
        expiration: Auth.SESSION_MS + Date.now()
      })

    });
  },

  /**
   * Get current user logged
   *
   * @param {Object} auth
   * @returns Promise
   */
  getCurrent(auth) {

    const {
      _id
    } = auth || {};

    if (!_id) {
      return VSError.reject('Invalid token', 401);
    }

    return User
      .getUser(_id)
      .then( (u) => {

        const {
          active
        } = u || {};

        if (String(active || '') !== 'true' || !_id) {
          return VSError.reject('Invalid ID. User not found', 401);
        }

        return u;

      });

  }
};
