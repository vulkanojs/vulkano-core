/* global Auth, Jwt */

/**
 * AuthController.js
 */

module.exports = {

  'get current': (req, res) => {

    const {
      auth
    } = req || {};

    res.vsr(Auth.getCurrent(auth));

  },

  'post login': (req, res) => {

    Auth.login(req.body)
      .then(({ user, token }) => {

        const {
          cookieName
        } = Jwt.getConfig();

        res.cookie(cookieName || 'token', token, {
          httpOnly: true,
          // secure: app.PRODUCTION,
          // sameSite: 'lax',
          maxAge: Auth.SESSION_MS,
        });

        res.vsr(Promise.resolve(user));

      })
      .catch((err) => {
        res.vsr(Promise.reject(err));
      });

  },

  'post logout': (req, res) => {

    const {
      cookieName
    } = Jwt.getConfig();

    res.clearCookie(cookieName || 'token');

    res.vsr(Promise.resolve({ success: true }));

  }

};
