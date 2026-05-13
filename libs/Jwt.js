const { expressjwt: JWT } = require('express-jwt');
const jwtSimple = require('jwt-simple');

module.exports = {

  /**
   * Get JWT config
   *
   * @returns {Object}
   */
  getConfig() {

    const {
      jwt,
      // Express config folder in app/config/express
      express
    } = app.config || {};

    const {
      jwt: expressJwt,
    } = express || {};

    return jwt || expressJwt || {};

  },

  /**
   * Init JWT for Express
   *
   * @param {Object} opts
   * @returns
   */
  init(opts) {

    const {
      key,
      algorithms
    } = this.getConfig();

    const config = {

      algorithms: algorithms || ['HS256'],

      secret: key,

      getToken: (req) => this.getToken(req)

    };

    return JWT({ ...config, ...opts });

  },

  /**
   * Get token from request
   *
   * @param {Express} req
   * @returns {String}
   */
  getToken(req) {

    const {
      header,
      queryParameter,
      cookieName
    } = this.getConfig();

    // Get Token via HTTP header
    const headerToken = req.headers[header] || req.headers[header.toUpperCase()] || null;

    // Get Token via Cookie
    const cookieToken = req.cookies && req.cookies[cookieName]
      ? req.cookies[cookieName]
      : null;

    // Get Token via Cookie RAW
    const cookieTokenRaw = req.headers.cookie && this.getCookieRAW(req, cookieName)
      ? this.getCookieRAW(req, cookieName)
      : null;

    // Get Token via Query Parameter
    const queryToken = req.query && req.query[queryParameter]
      ? req.query[queryParameter]
      : null;

    // Current Token
    const token = headerToken || cookieToken || cookieTokenRaw || queryToken || null;

    // Decode Token
    const hasData = this.decode(token);

    // Return only if token is valid
    return hasData ? token : null;

  },

  /**
   * Encode token
   *
   * @param {String} data
   * @returns {Object}
   */
  encode(data) {

    const {
      key
    } = this.getConfig();

    const Encrypt = new Encrypter(`${key}-JWT`);
    const payload = Encrypt.encrypt(JSON.stringify({ data }));

    return jwtSimple.encode(payload, key);

  },

  /**
   * Decode token
   *
   * @param {String} token
   * @param {String} customKey Optional Key
   * @returns {Object}
   */
  decode(token, customKey) {

    if (!token) {
      return null;
    }

    const {
      key,
      expiration: allowExpiration
    } = this.getConfig();

    let data = null;

    try {

      const payload = jwtSimple.decode(token, customKey || key);
      data = this.decrypt(payload);

    } catch (e) {
      // invalid token
    }

    if (!data) {
      return null;
    }

    const {
      expiration
    } = data;

    const now = String(Date.now());

    // Token expired
    if (expiration && ( Number(now) > Number(expiration) )) {
      return null;
    }

    // Ignore expiration requirement
    if (allowExpiration === false) {
      return data;
    }

    // Expiration field is required
    if (!expiration) {
      return null;
    }

    return data;

  },

  /**
   * Decrypt token payload
   *
   * @param {String} str
   * @returns {String}
   */
  decrypt(str) {

    const {
      key
    } = this.getConfig();

    const Encrypt = new Encrypter(`${key}-JWT`);

    let data = null;

    try {

      const r = JSON.parse(Encrypt.dencrypt(str));

      const {
        data: result
      } = r || {};

      data = result;

    } catch (e) {
      data = null;
    }

    return data;

  },

  /**
   * Decode token from SocketIO
   *
   * @param {Socket} socket
   * @returns {Object}
   */
  socket(socket) {

    let {
      token
    } = socket.handshake.auth || {};

    if (token === null || typeof token === 'undefined' || !token) {
      token = this.getToken(socket.handshake);
      if (!token) {
        return null;
      }
    }

    // Decode Token
    const data = this.decode(token);

    // Return only if token is valid
    return data ? data : null;

  },

  /**
   * Read cookie RAW
   *
   * @param {Socket} socket
   * @returns String
   */
  getCookieRAW(req, cookieName) {

    const {
      cookie
    } = req.headers || {};

    const name = `${cookieName}=`;
    const cDecoded = decodeURIComponent(cookie || '');
    const cArr = cDecoded.split(';');

    let res;

    cArr.forEach((val) => {
      if (String(val).trim().indexOf(name) === 0) {
        res = String(val).trim().substring(name.length);
      }
    });

    return res;

  }

};
