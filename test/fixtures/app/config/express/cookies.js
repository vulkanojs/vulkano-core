/**
 * Cookies Config
 */

module.exports = {

  // Enable cookie parser middleware
  // @type Boolean
  enabled: false,

  // Secret key used to sign cookies — use https://api.wordpress.org/secret-key/1.1/salt/
  // @type String
  secret: process.env.COOKIES_SECRET_KEY || ''

};
