// VIEW_ENGINE=hbs switches the fixture server to the Handlebars views tree
// (app/views-hbs) instead of the default Nunjucks one (app/views) — set by
// test/global-setup-hbs.js so both engines share one fixture app/server.
const isHbs = process.env.VIEW_ENGINE === 'hbs';

module.exports = {
  path: `${APP_PATH}/${isHbs ? 'views-hbs' : 'views'}`,
  ...(isHbs ? { engine: 'handlebars', ext: '.html' } : {})
};
