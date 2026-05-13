/**
 * Express server settings
 */

module.exports = {

  // Show "X-Powered-By" header
  // @type Boolean
  poweredBy: false,

  // Request timeout in milliseconds
  // @type Number
  timeout: process.env.TEST_TIMEOUT ? parseInt(process.env.TEST_TIMEOUT, 10) : 120000,

  // Folder to upload files
  // @type String
  uploadPath: 'public/files',

  // Number of proxy hops to trust for X-Forwarded-* headers.
  // Use 1 when behind a single load balancer, true to trust all (less secure).
  // See https://expressjs.com/en/guide/behind-proxies.html
  // @type Number | Boolean
  trustProxy: 1

};
