/**
 * Helmet Config
 * See https://helmetjs.github.io/ for all available options
 */

module.exports = {

  // Referrer policy header
  referrerPolicy: {
    policy: 'strict-origin-when-cross-origin'
  },

  // Disable built-in CSP — managed separately via csp.js
  contentSecurityPolicy: false,

  // Disable COEP to allow embedding cross-origin resources
  crossOriginEmbedderPolicy: false

};
