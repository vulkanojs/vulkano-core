const { create: hbsCreate } = require('express-handlebars');

// Wraps a Nunjucks-style function so it works as a Handlebars helper:
//   Hash params  → {{{helper key=val}}}  calls fn({ key: val })
//   Positional   → {{helper value}}      calls fn(value)
//   String output is wrapped in SafeString to prevent double-escaping
function wrapHelper(hbs, fn) {
  return function hbsHelper(...args) {
    const hbsOpts = args[args.length - 1];
    const isHbsOptions = hbsOpts && typeof hbsOpts === 'object' && 'hash' in hbsOpts;
    let result;
    if (isHbsOptions) {
      const positional = args.slice(0, -1);
      result = positional.length === 0 ? fn(hbsOpts.hash) : fn(...positional);
    } else {
      result = fn(...args);
    }
    return typeof result === 'string' ? new hbs.handlebars.SafeString(result) : result;
  };
}

function registerGroup(hbs, groups, method) {
  (groups || []).forEach((group) => {
    Object.keys(group || {}).forEach((key) => {
      hbs.handlebars[method](key, wrapHelper(hbs, group[key]));
    });
  });
}

module.exports = function setupHandlebars(vulkano, views, viewsExt) {
  const hbs = hbsCreate({
    extname: viewsExt,
    defaultLayout: false,
    ...(views.settings || {})
  });

  registerGroup(hbs, views.filters, 'registerHelper');
  registerGroup(hbs, views.helpers, 'registerHelper');

  vulkano.use((req, res, next) => {
    (views.globals || []).forEach((group) => Object.assign(res.locals, group || {}));
    res.locals.app = app;
    next();
  });

  vulkano.engine(viewsExt, hbs.engine);
  vulkano.set('view engine', viewsExt);

  app.server.views._engine = hbs;
  app.handlebars = hbs;
};
