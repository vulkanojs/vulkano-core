module.exports = {

  // GET /home/
  get(req, res) {
    res.render('home/index.html', {
      pageTitle: 'My App',       // consumed by layout (default.html)
      heading: 'Welcome',        // consumed by the view (home/index.html)
      footerText: 'Vulkano HBS'  // consumed by the partial (footer.html)
    });
  },

  // GET /home/layout — renders using the default layout automatically
  'get layout'(req, res) {
    res.render('home/layout-content.html', {
      pageTitle: 'Layout Test',
      message: 'Rendered inside layout'
    });
  },

  // GET /home/throw — triggers the 500 exception view
  'get throw'(req, res) {
    throw new Error('Test crash 500');
  }

};
