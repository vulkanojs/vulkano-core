module.exports = {

  // GET /handlebars/ — consumes pageTitle/heading/footerText across layout+view+partial,
  // plus the {{upper heading}} filter-style helper
  get(req, res) {
    res.render('home/index.html', {
      pageTitle: 'My App',       // consumed by layout (default.html)
      heading: 'Welcome',        // consumed by the view (home/index.html)
      footerText: 'Vulkano HBS'  // consumed by the partial (footer.html)
    });
  },

  // GET /handlebars/layout — renders using the default layout automatically
  'get layout'(req, res) {
    res.render('home/layout-content.html', {
      pageTitle: 'Layout Test',
      message: 'Rendered inside layout'
    });
  },

  // GET /handlebars/throw — triggers the 500 exception view
  'get throw'(req, res) {
    throw new Error('Test crash 500');
  },

  // GET /handlebars/view-lib — render via the global View lib, outside res.render()
  'get view-lib'(req, res) {
    View.render('home/index.html', {
      pageTitle: 'View Lib HBS',
      heading: 'ViaGlobal',
      footerText: 'Vulkano HBS Lib'
    })
      .then((html) => res.send(html))
      .catch((err) => res.status(500).send(err.message));
  }

};
