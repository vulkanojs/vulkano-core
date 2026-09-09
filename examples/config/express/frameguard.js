/**
 * Frameguard Config (X-Frame-Options header)
 *
 * https://www.npmjs.com/package/frameguard
 *
 * Accepts a single options object, or an array to send the header
 * with multiple rules.
 */

module.exports = {

  // 'deny', 'sameorigin', or 'allow-from'
  // @type String
  action: 'sameorigin'

};
