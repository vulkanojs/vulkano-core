module.exports = {

  // GET /nunjucks/ — static text, no vars needed
  get(req, res) {
    res.render('home/index.html');
  },

  // GET /nunjucks/vars — render template with variables
  'get vars'(req, res) {
    res.render('home/vars.html', { title: 'Test Title', username: 'vulkano' });
  },

  // GET /nunjucks/three-vars — layout + view + partial each print one variable
  'get three-vars'(req, res) {
    res.render('home/three-vars.html', {
      pageTitle: 'My App',        // consumed by layout (default.html)
      heading: 'Welcome',         // consumed by the view (three-vars.html)
      footerText: 'Vulkano NJK'   // consumed by the partial (footer.html)
    });
  },

  // GET /nunjucks/throw — triggers the 500 exception view
  'get throw'(req, res) {
    throw new Error('Test crash 500');
  }

};
