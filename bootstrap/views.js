const path = require('node:path');

// Include all filters
const coreFilters = require('include-all')({
  dirname: path.join(CORE_PATH, 'views/filters'),
  filter: /(.+)\.js$/,
  optional: true
});

// Include all filters
const appFilters = require('include-all')({
  dirname: path.join(APP_PATH, 'config/views/filters'),
  filter: /(.+)\.js$/,
  optional: true
});

// Include all helpers
const coreHelpers = require('include-all')({
  dirname: path.join(CORE_PATH, 'views/helpers'),
  filter: /(.+)\.js$/,
  optional: true
});

const appHelpers = require('include-all')({
  dirname: path.join(APP_PATH, 'config/views/helpers'),
  filter: /(.+)\.js$/,
  optional: true
});

// Project engine settings. include-all maps both `config/views.js` and
// `config/views/config.js` to `app.config.views`: the file gives the settings
// directly, the folder nests them under `config`. When both exist, the file wins.
const { views: appViews } = (typeof app !== 'undefined' && app.config) || {};
const appSettings = appViews?.config || (appViews?.engine || appViews?.ext ? appViews : {});

module.exports = {
  path: path.join(APP_PATH, 'views'),

  engine: appSettings.engine || 'nunjucks',

  ext: appSettings.ext || '.html',

  filters: [coreFilters || {}, appFilters || {}],

  helpers: [coreHelpers || {}, appHelpers || {}]
};
