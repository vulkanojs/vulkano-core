const { Agent, fetch } = require('undici');

/**
 * Shared dispatchers
 *
 * One undici Agent per SSL verification + keep-alive combination, reused by
 * every request. Each Agent keeps its own connection pool per origin, so the
 * TCP + TLS connections are reused (keep-alive) instead of opening a new one
 * on every call.
 *
 * With keepAlive = false the dispatcher uses pipelining: 0, which makes undici
 * close the connection after each response.
 */
const apiClientDispatchers = {};

module.exports = {

  /**
   * Method to make a GET request
   *
   * @param {String} url
   * @param {Object} props { headers }
   * @returns {Promise}
   */
  get(url, props) {
    return this.send({ url, ...props, method: 'GET' });
  },

  /**
   * Method to make a POST request
   *
   * @param {String} url
   * @param {Object} body
   * @param {Object} props { headers }
   * @returns {Promise}
   */
  post(url, body, props) {
    return this.send({ url, body, ...props, method: 'POST' });
  },

  /**
   * Method to make a PUT request
   *
   * @param {String} url
   * @param {Object} body
   * @param {Object} props { headers }
   * @returns {Promise}
   */
  put(url, body, props) {
    return this.send({ url, body, ...props, method: 'PUT' });
  },

  /**
   * Method to make a DELETE request
   *
   * @param {String} url
   * @param {Object} props { headers }
   * @returns {Promise}
   */
  delete(url, props) {
    return this.send({ url, ...props, method: 'DELETE' });
  },

  /**
   * Method to get a shared dispatcher by SSL verification and keep-alive
   *
   * @param {Boolean} sslVerify
   * @param {Boolean} keepAlive
   * @returns {Agent}
   */
  _getDispatcher(sslVerify, keepAlive) {

    const key = `${sslVerify ? 'verify' : 'noverify'}:${keepAlive ? 'keepalive' : 'close'}`;

    if (!apiClientDispatchers[key]) {
      apiClientDispatchers[key] = new Agent({
        connect: { rejectUnauthorized: sslVerify },
        pipelining: keepAlive ? 1 : 0
      });
    }

    return apiClientDispatchers[key];

  },

  /**
   * Close and remove the shared dispatchers
   *
   * @returns {Promise}
   */
  async closeDispatchers() {

    const current = Object.keys(apiClientDispatchers).map((key) => {
      const dispatcher = apiClientDispatchers[key];
      delete apiClientDispatchers[key];
      return dispatcher;
    });

    await Promise.all(current.map((dispatcher) => (dispatcher.close ? dispatcher.close() : null)));

  },

  /**
   * Method to send a request
   *
   * @param {Object} props
   * @returns {Promise}
   */
  async send(props) {

    const {
      url,
      body,
      method,
      responseType,
      headers,
      rejectUnauthorized,
      keepAlive
    } = typeof props === 'string'
      ? { url: props, method: 'GET' }
      : (props || {});

    // SSL verification is enabled by default (secure). It can be turned off globally via
    // API_CLIENT_REJECT_UNAUTHORIZED=false in .env (e.g. internal calls to other services on
    // the same server using self-signed certs) — a per-call `rejectUnauthorized` always wins
    // over the env default, in either direction.
    const envDefault = process.env.API_CLIENT_REJECT_UNAUTHORIZED !== 'false';
    const sslVerify = rejectUnauthorized !== undefined ? rejectUnauthorized !== false : envDefault;

    // Keep-alive is enabled by default. It can be turned off globally via
    // API_CLIENT_KEEP_ALIVE=false in .env — a per-call `keepAlive` always wins.
    const envKeepAlive = process.env.API_CLIENT_KEEP_ALIVE !== 'false';
    const useKeepAlive = keepAlive !== undefined ? keepAlive !== false : envKeepAlive;

    const optHeaders = {
      'Content-Type': 'application/json',
      Accept: 'application/json',
      ...headers
    };

    const options = {
      method: (method || 'GET').toUpperCase(),
      headers: optHeaders,
      dispatcher: this._getDispatcher(sslVerify, useKeepAlive)
    };

    if (body) {
      options.body = JSON.stringify(body);
    }

    const target = `${options.method} ${url}`;

    try {

      const response = await fetch(url, options);

      if (!response.ok) {

        let errorData = {};
        try { errorData = await response.json(); } catch {}

        const { msg, message: errorMessage, error: errorMessage2 } = errorData || {};
        const message = msg || errorMessage || errorMessage2 || 'Unable to connect to the Request Service';

        console.log('');
        console.log('---------------------');
        console.log('ApiClient', target);
        console.log('---------------------');

        return VSError.reject(message, response.status || 500);

      }

      if (responseType === 'arraybuffer') {
        return response.arrayBuffer();
      }
      if (responseType === 'text') {
        return response.text();
      }
      if (responseType === 'stream') {
        return response.body;
      }

      // Empty bodies (e.g. 204) resolve to {}
      const text = await response.text();
      return text ? (JSON.parse(text) || {}) : {};

    } catch (err) {

      console.log('');
      console.log('---------------------');
      console.log('ApiClient', target);
      console.log('---------------------');

      return VSError.reject(err.message || 'Unable to connect to the Request Service', 500);

    }

  }

};
