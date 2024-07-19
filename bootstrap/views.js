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
const appHelpers = require('include-all')({
  dirname: path.join(APP_PATH, 'config/views/helpers'),
  filter: /(.+)\.js$/,
  optional: true
});

module.exports = {

  path: path.join(APP_PATH, 'views'),

  engine: 'nunjucks',

  filters: [
    coreFilters || {},
    appFilters || {}
  ],

  helpers: [appHelpers || {}]

};
