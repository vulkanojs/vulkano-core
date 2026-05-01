const { Agent } = require('undici');

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
      rejectUnauthorized
    } = typeof props === 'string'
      ? { url: props, method: 'GET' }
      : (props || {});

    // SSL verification is enabled by default; pass rejectUnauthorized: false to disable
    const sslVerify = rejectUnauthorized !== false;

    const optHeaders = {
      'Content-Type': 'application/json',
      Accept: 'application/json',
      ...(headers || {})
    };

    const options = {
      method: (method || 'GET').toUpperCase(),
      headers: optHeaders,
      dispatcher: new Agent({ connect: { rejectUnauthorized: sslVerify } })
    };

    if (body) {
      options.body = JSON.stringify(body);
    }

    const target = `${options.method} ${url}`;

    try {

      const response = await fetch(url, options);

      if (!response.ok) {

        let errorData = {};
        try { errorData = await response.json(); } catch (_) {}

        const { msg, message: errorMessage, error: errorMessage2 } = errorData || {};
        const message = msg || errorMessage || errorMessage2 || 'Unable to connect to the Request Service';

        console.log('');
        console.log('---------------------');
        console.log('ApiClient', target);
        console.log('---------------------');

        return VSError.reject(message, response.status || 500);

      }

      if (responseType === 'arraybuffer') return response.arrayBuffer();
      if (responseType === 'text') return response.text();
      if (responseType === 'stream') return response.body;

      const data = await response.json();
      return data || {};

    } catch (err) {

      console.log('');
      console.log('---------------------');
      console.log('ApiClient', target);
      console.log('---------------------');

      return VSError.reject(err.message || 'Unable to connect to the Request Service', 500);

    }

  }

};
