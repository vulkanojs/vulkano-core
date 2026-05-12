/**
 * Content Security Policy
 *
 * Requires an endpoint to receive CSP violation reports.
 */

module.exports = {

  // Enable CSP
  enabled: false,

  // Reporting endpoint
  report: {
    group: 'csp-endpoint',
    max_age: '10886400',
    endpoints: [
      {
        // Replace with your domain
        url: 'https://yourdomain.com/__cspreport__'
      }
    ]
  },

  // CSP rules
  rules: {

    'default-src': ["'self'"],

    'form-action': ["'self'"],

    'font-src': [
      "'self'",
      'data:',
      // 'fonts.googleapis.com',
      // 'fonts.gstatic.com',
    ],

    'img-src': [
      "'self'",
      'data:',
      // '*.google-analytics.com',
    ],

    'script-src': [
      "'self'",
      // "'unsafe-inline'",
      // "'unsafe-eval'",
    ],

    'style-src': [
      "'self'",
      "'unsafe-inline'",
      'cdnjs.cloudflare.com'
    ],

    'style-src-elem': [
      "'self'",
      // 'fonts.googleapis.com',
    ],

    'frame-src': ["'self'"],

    'frame-ancestors': ["'self'"],

    'connect-src': [
      "'self'",
      // '*.google-analytics.com',
    ],

    'report-to': ['csp-endpoint']

  }

};
