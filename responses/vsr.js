/**
 * VULKANO STANDARD RESPONSE (VSR)
 */

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

  // Accept an async (or plain) function as an alternative to a Promise —
  // lets an async/await controller skip the try/catch VSR's own .catch()
  // already provides: res.vsr(async () => { ... await ...; return x; }).
  // A synchronous throw inside the function is caught the same way an
  // async rejection would be, since it runs inside a .then() callback.
  const workingPromise = (typeof promiseToRun === 'function')
    ? Promise.resolve().then(() => promiseToRun())
    : promiseToRun;

  if (!workingPromise || typeof workingPromise.then !== 'function') {

    console.error('[VSR] The response is not a Promise or a function. Got:', typeof promiseToRun);
    return res.status(500).jsonp({
      success: false,
      statusCode: 500,
      error: {
        detail: 'Internal error: controller must return a Promise or a function.'
      }
    });

  }

  // Executing promise
  workingPromise
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
        ...(app.PRODUCTION ? {} : { output: message })
      };

    })
    .finally( () => {
      if (!res.headersSent) {
        res.status(code).jsonp(output);
      }
    });

};
