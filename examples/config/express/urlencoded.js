/**
 * URL-encoded Body Parser Config
 *
 * Options passed to native express.urlencoded().
 */

module.exports = {

  // Allow rich objects/arrays via the qs library (true) vs querystring (false)
  // @type Boolean
  extended: true,

  // Max request body size
  // @type String
  limit: '1mb'

};
