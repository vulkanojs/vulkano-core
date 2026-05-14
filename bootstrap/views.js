const path = require('path');

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

module.exports = {

  path: path.join(APP_PATH, 'views'),

  engine: 'nunjucks',

  ext: '.html',

  filters: [
    coreFilters || {},
    appFilters || {}
  ],

  helpers: [coreHelpers || {}, appHelpers || {}]

};
