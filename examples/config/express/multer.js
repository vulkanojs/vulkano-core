/**
 * Multer Config
 *
 * File upload destination and limits.
 */

module.exports = {

  // Upload destination folder
  // @type String
  dest: 'public/files',

  limits: {
    // Prevents DoS via deeply nested field names (e.g. a[b][c][d]...)
    // @type Number
    fieldNestingDepth: 5,

    // Max upload size in bytes
    // @type Number
    fileSize: 25 * 1024 * 1024 // 25MB
  }

};
