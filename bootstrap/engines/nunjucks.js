const nunjucks = require('nunjucks');

module.exports = function setupNunjucks(vulkano, views) {
  const settings = {
    autoescape: true,
    watch: !app.PRODUCTION,
    ...(views.settings || {}),
    express: vulkano
  };

  const env = nunjucks.configure([views.path, CORE_PATH], settings);

  env.addGlobal('app', app);

  (views.globals || []).forEach((group) => {
    Object.keys(group || {}).forEach((key) => env.addGlobal(key, group[key]));
  });

  (views.helpers || []).forEach((group) => {
    Object.keys(group || {}).forEach((key) => env.addGlobal(key, group[key]));
  });

  (views.filters || []).forEach((group) => {
    Object.keys(group || {}).forEach((key) => env.addFilter(key, group[key]));
  });

  (views.extensions || []).forEach((group) => {
    Object.keys(group || {}).forEach((key) => env.addExtension(key, group[key]));
  });

  app.server.views._engine = env;
  app.nunjucks = nunjucks;
};
