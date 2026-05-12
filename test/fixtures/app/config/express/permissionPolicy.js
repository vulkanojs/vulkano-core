/**
 * Permission Policy Config
 */

module.exports = {

  // Enable Permission Policy header
  // @type Boolean
  enabled: true,

  // Browser features to restrict — empty list means blocked for all origins
  // @type Array
  permissions: [
    'accelerometer=()',
    'camera=()',
    'geolocation=()',
    'gyroscope=()',
    'magnetometer=()',
    'microphone=()',
    'payment=()',
    'usb=()'
  ]

};
