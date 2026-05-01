/**
 * VULKANO STANDARD RESPONSE (VSR)
 */

const Promise = require('bluebird');

module.exports = function VSRPromise(promiseToRun, httpStatusCode) {

  const {
    req
  } = this;

  const {
    res,
    path
  } = req;

  let code = httpStatusCode || 200;
  const output = {
    success: true,
    statusCode: code
  };

  if (!promiseToRun || typeof promiseToRun.then !== 'function') {

    console.error('[VSR] The response is not a Promise. Got:', typeof promiseToRun);
    return res.status(500).jsonp({
      success: false,
      statusCode: 500,
      error: {
        detail: 'Internal error: controller must return a Promise.'
      }
    });

  }

  // Executing promise
  promiseToRun
    .then( (r) => {

      if ( (r.statusCode && r.statusCode >= 400) || output.statusCode >= 400) {

        if (r.statusCode && r.statusCode !== 402) {
          return Promise.reject(r);
        }

        if ( output.statusCode >= 400 && output.statusCode !== 402 ) {
          return Promise.reject(r);
        }

        output.statusCode = r.statusCode;
        code = r.statusCode;

      }

      output.data = r;

      return true;

    })
    .catch( (e) => {

      if (path) {
        console.log('ERROR PATH', path);
      }

      if (!app.PRODUCTION) {
        console.log(e);
      }

      const message = (e.message !== undefined && typeof e.message !== 'object') ? e : (e.message || e);
      code = e.statusCode || message.statusCode || 400;

      // Output
      output.success = false;
      output.statusCode = code;
      output.error = {
        errorCode: message.code || '001',
        errorName: message.name || 'BadRequest',
        detail: message.message || message.error || message.invalidAttributes || message.toString(),
        output: message
      };

    })
    .finally( () => res.status(code).jsonp(output) );

};
