const viewsConfig = require('../views');

const SUPPORTED_ENGINES = ['nunjucks', 'handlebars'];

module.exports = function setupViewEngine(vulkano) {
  const views = {
    ext: '.html',
    ...viewsConfig,
    ...(app.server.views || {})
  };

  const engine = views.engine || 'nunjucks';
  const ext = views.ext || '.html';

  if (!SUPPORTED_ENGINES.includes(engine)) {
    throw new Error(
      `Vulkano: unsupported view engine "${engine}". Supported engines: ${SUPPORTED_ENGINES.join(', ')}.`
    );
  }

  vulkano.set('views', views.path);

  if (engine === 'handlebars') {
    require('./handlebars')(vulkano, views, ext);
  } else {
    require('./nunjucks')(vulkano, views);
  }

  // Error view subfolder depends on engine (core dev-mode error templates)
  return engine;
};
