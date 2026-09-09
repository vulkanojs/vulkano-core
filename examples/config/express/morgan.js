/**
 * Morgan Config (HTTP request logger)
 *
 * https://www.npmjs.com/package/morgan
 */

module.exports = {

  // Log format: 'combined', 'common', 'dev', 'short', 'tiny'
  // @type String
  format: 'dev',

  // Skip logging for successful requests, log only 4xx/5xx
  // @type Function
  skip: (req, res) => res.statusCode < 400

};
