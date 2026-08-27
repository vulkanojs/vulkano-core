/* global VSError, i18n */

const path = require('node:path');
const fs = require('node:fs');
const crypto = require('node:crypto');

const { rename, readFile, writeFile, unlink } = fs.promises;

// Strips executable content from an SVG (a text/XML format) before it's
// served as an "image" — <script>, inline event handlers and javascript:
// URIs would otherwise run in the browser of anyone who opens the file.
function sanitizeSvg(content) {

  return content
    .replace(/<script[\s\S]*?<\/script>/gi, '')
    .replace(/\son\w+\s*=\s*"[^"]*"/gi, '')
    .replace(/\son\w+\s*=\s*'[^']*'/gi, '')
    .replace(/((?:xlink:)?href)\s*=\s*"\s*javascript:[^"]*"/gi, '$1=""')
    .replace(/((?:xlink:)?href)\s*=\s*'\s*javascript:[^']*'/gi, '$1=\'\'');

}

const IMAGE_MIME_TYPES = ['image/jpeg', 'image/jpg', 'image/pjpeg', 'image/gif', 'image/png', 'image/webp', 'image/svg+xml', 'image/heic', 'image/heif'];
const DOCUMENT_MIME_TYPES = ['application/pdf', 'application/x-pdf', 'application/msword', 'application/vnd.openxmlformats-officedocument.wordprocessingml.document', 'application/vnd.ms-excel', 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet', 'application/vnd.ms-powerpoint', 'application/vnd.openxmlformats-officedocument.presentationml.presentation', 'text/csv', 'application/vnd.ms-excel.sheet.binary.macroenabled.12'];
const ARCHIVE_MIME_TYPES = ['application/zip', 'application/x-rar', 'application/gzip', 'text/plain', 'application/x-zip-compressed'];
const VIDEO_MIME_TYPES = ['video/quicktime', 'video/ogg', 'video/webm', 'video/mp4', 'video/x-mp4', 'video/3gp', 'video/x-3gp', 'video/mov', 'video/x-mov', 'video/m4v', 'video/x-m4v', 'video/avi', 'video/x-avi', 'video/mpg', 'video/x-mpg'];

const VALID_MIME_TYPES = [...IMAGE_MIME_TYPES, ...DOCUMENT_MIME_TYPES, ...ARCHIVE_MIME_TYPES, ...VIDEO_MIME_TYPES];

// Fallback when originalname has no usable extension (e.g. a blob)
const MIME_EXTENSION_MAP = {
  'image/jpeg': 'jpg',
  'image/jpg': 'jpg',
  'image/pjpeg': 'jpg',
  'image/gif': 'gif',
  'image/png': 'png',
  'image/webp': 'webp',
  'image/svg+xml': 'svg',
  'image/heic': 'heic',
  'image/heif': 'heif',
  'application/pdf': 'pdf',
  'application/x-pdf': 'pdf',
  'application/msword': 'doc',
  'application/vnd.openxmlformats-officedocument.wordprocessingml.document': 'docx',
  'application/vnd.ms-excel': 'xls',
  'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet': 'xlsx',
  'application/vnd.ms-powerpoint': 'ppt',
  'application/vnd.openxmlformats-officedocument.presentationml.presentation': 'pptx',
  'text/csv': 'csv',
  'application/vnd.ms-excel.sheet.binary.macroenabled.12': 'xlsb',
  'application/zip': 'zip',
  'application/x-zip-compressed': 'zip',
  'application/x-rar': 'rar',
  'application/gzip': 'gz',
  'text/plain': 'txt',
  'video/quicktime': 'mov',
  'video/mov': 'mov',
  'video/x-mov': 'mov',
  'video/ogg': 'ogv',
  'video/webm': 'webm',
  'video/mp4': 'mp4',
  'video/x-mp4': 'mp4',
  'video/3gp': '3gp',
  'video/x-3gp': '3gp',
  'video/m4v': 'm4v',
  'video/x-m4v': 'm4v',
  'video/avi': 'avi',
  'video/x-avi': 'avi',
  'video/mpg': 'mpg',
  'video/x-mpg': 'mpg'
};

const DEFAULT_MAX_SIZE = 10 * 1024 * 1024;

module.exports = {

  /**
   * Validate a single multer file object and move it into its final public
   * location. Internal helper shared by Upload.file() and Upload.files().
   *
   * @param {Object} file
   * @param {Object} props - { allowed, maxSize, lang, rename }
   * @returns {Promise<{name: string, path: string}>}
   */
  _saveFile(file, props) {

    const {
      allowed,
      mimeTypes,
      extensionMap,
      maxSize,
      lang
    } = props;

    const t = (key, vars) => i18n.t(key, { lng: lang || 'en', ...vars });

    return Promise
      .resolve()
      .then(() => {

        const publicDir = path.join(PUBLIC_PATH, 'files');
        if (!Upload.isWritable(publicDir)) {
          throw new VSError(t('upload.noPermission'), 500);
        }

        if (!Upload.isValidMimeType(file, mimeTypes)) {
          throw new VSError(t('upload.invalidMimeType', { mimetype: file.mimetype }), 400);
        }

        const ext = Upload.getExtension(file, extensionMap);

        if (allowed && Array.isArray(allowed) && !allowed.includes(ext)) {
          throw new VSError(t('upload.extensionNotAllowed', { ext }), 400);
        }

        const limit = maxSize || DEFAULT_MAX_SIZE;
        if (file.size > limit) {
          throw new VSError(t('upload.maxSizeExceeded', { size: Math.floor(limit / (1024 * 1024)) }), 400);
        }

        return { ext, publicDir };

      })
      .then(({ ext, publicDir }) => {

        const safeName = Upload.buildSafeName(file, ext, props, publicDir);

        file.originalname = safeName;

        const filePath = path.normalize(file.path);
        const filePublic = path.join(publicDir, safeName);

        const save = ext === 'svg'
          ? readFile(filePath, 'utf8')
            .then((content) => writeFile(filePublic, sanitizeSvg(content)))
            .then(() => unlink(filePath))
          : rename(filePath, filePublic);

        return save.then(() => ({
          name: file.originalname,
          path: filePublic
        }));

      });

  },

  /**
   * Validate a single uploaded file and move it from multer's temp path to
   * its final public location. Never uploads to any cloud provider -
   * callers needing that should chain a separate service off the returned
   * path.
   *
   * @param {Array} files - req.files array from multer
   * @param {Object} opts - { allowed, maxSize, name, lang, rename }
   * @returns {Promise<{name: string, path: string}>}
   */
  file(files, opts) {

    const uploadConfig = app.config && app.config.upload;
    const props = { ...uploadConfig, ...opts };

    const file = Upload.isUploaded(files, props.name);
    const t = (key, vars) => i18n.t(key, { lng: props.lang || 'en', ...vars });

    if (!file) {
      return Promise.reject(new VSError(t('upload.notUploaded'), 400));
    }

    return Upload._saveFile(file, props);

  },

  /**
   * Same as Upload.file() but validates and saves every matching file.
   * Rejects on the first invalid file (same as Promise.all).
   *
   * @param {Array} files - req.files array from multer
   * @param {Object} opts - { allowed, maxSize, name, lang, rename }
   * @returns {Promise<Array<{name: string, path: string}>>}
   */
  files(files, opts) {

    const uploadConfig = app.config && app.config.upload;
    const props = { ...uploadConfig, ...opts };

    const matched = Upload.isUploadedMany(files, props.name);
    const t = (key, vars) => i18n.t(key, { lng: props.lang || 'en', ...vars });

    if (!matched.length) {
      return Promise.reject(new VSError(t('upload.notUploaded'), 400));
    }

    return Promise.all(matched.map((file) => Upload._saveFile(file, props)));

  },

  /**
   * Check if a file was uploaded for the expected field.
   *
   * @param {Array} file - req.files array from multer
   * @param {string} fieldname
   * @returns {Object|false}
   */
  isUploaded(file, fieldname) {

    const tmp = (file && file[0]) || null;
    if (!tmp) {
      return false;
    }
    return (!fieldname || tmp.fieldname === fieldname) ? tmp : false;

  },

  /**
   * Same as isUploaded() but returns every matching file instead of just
   * the first one.
   *
   * @param {Array} files - req.files array from multer
   * @param {string} fieldname
   * @returns {Array}
   */
  isUploadedMany(files, fieldname) {

    if (!Array.isArray(files)) {
      return [];
    }
    return fieldname ? files.filter((f) => f.fieldname === fieldname) : files;

  },

  /**
   * Check if a directory is writable.
   *
   * @param {string} dir
   * @returns {boolean}
   */
  isWritable(dir) {

    try {
      fs.accessSync(dir, fs.constants.W_OK);
      return true;
    } catch (err) {
      return false;
    }

  },

  /**
   * Get the lowercased file extension, falling back to mimetype lookup.
   *
   * `extensionMap` (from `props.extensionMap`) lets a caller extend the
   * built-in mimetype→extension fallback with types the core doesn't know
   * about yet - needed for a nameless upload (e.g. a blob) whose extension
   * can only be derived from its mimetype, such as
   * `extensionMap: { 'image/heic': 'heic' }`.
   *
   * @param {Object} file
   * @param {Object} [extensionMap] - extra mimetype→extension entries, checked before the built-in map
   * @returns {string}
   */
  getExtension(file, extensionMap) {

    let ext = (file.originalname || '').split('.').pop();

    if (!ext || ext === 'blob' || ext === file.originalname) {
      ext = (extensionMap && extensionMap[file.mimetype]) || MIME_EXTENSION_MAP[file.mimetype] || '';
    }

    return ext.toLowerCase();

  },

  /**
   * Check if the file's mimetype is in the allowed list.
   *
   * `mimeTypes` (from `props.mimeTypes`) lets a caller extend the built-in
   * whitelist with mimetypes the core doesn't know about yet, without
   * having to fork this file - e.g. `mimeTypes: ['image/heic']`.
   *
   * @param {Object} file
   * @param {Array} [mimeTypes] - extra mimetypes to accept, in addition to VALID_MIME_TYPES
   * @returns {boolean}
   */
  isValidMimeType(file, mimeTypes) {

    const extra = Array.isArray(mimeTypes) ? mimeTypes : [];
    return VALID_MIME_TYPES.includes(file.mimetype) || extra.includes(file.mimetype);

  },

  /**
   * Build the destination filename.
   *
   * - `props.rename === true`      → random uuid (extension kept)
   * - `props.rename` is a function → `props.rename(file)` picks the base
   *   name (still sanitized here - never trust it as-is, it can carry `../`)
   * - otherwise                    → sanitized original name, unchanged
   *
   * In every case except the uuid one, a short suffix is appended only if
   * the resulting name already exists in `publicDir`, so a normal upload
   * keeps a clean name and only collisions get disambiguated.
   *
   * @param {Object} file
   * @param {string} ext
   * @param {Object} props - { rename }
   * @param {string} publicDir
   * @returns {string}
   */
  buildSafeName(file, ext, props, publicDir) {

    const { rename: renameOpt } = props || {};

    if (renameOpt === true) {
      return `${crypto.randomUUID()}.${ext}`;
    }

    const source = typeof renameOpt === 'function'
      ? renameOpt(file)
      : path.basename(file.originalname || 'file', path.extname(file.originalname || ''));

    const base = Upload.sanitizeBaseName(source);

    return Upload.ensureUniqueName(publicDir, base, ext);

  },

  /**
   * Strip anything that isn't alphanumeric/underscore/dash - originalname
   * (and any custom name from `rename`) must never be trusted directly,
   * it can carry `../` path segments.
   *
   * @param {string} name
   * @returns {string}
   */
  sanitizeBaseName(name) {

    return String(name || '')
      .replace(/[^a-zA-Z0-9_-]/g, '_')
      .slice(0, 100) || 'file';

  },

  /**
   * Append a short random suffix only if `base.ext` already exists in dir,
   * so an upload without a rename strategy doesn't silently overwrite an
   * existing file.
   *
   * @param {string} dir
   * @param {string} base
   * @param {string} ext
   * @returns {string}
   */
  ensureUniqueName(dir, base, ext) {

    let candidate = `${base}.${ext}`;

    while (fs.existsSync(path.join(dir, candidate))) {
      candidate = `${base}_${crypto.randomBytes(3).toString('hex')}.${ext}`;
    }

    return candidate;

  }

};
