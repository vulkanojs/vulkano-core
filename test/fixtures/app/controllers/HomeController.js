module.exports = {

  // GET /home/
  get(req, res) {
    res.render('home/index.html');
  },

  // GET /home/vars — render template with variables
  'get vars'(req, res) {
    res.render('home/vars.html', { title: 'Test Title', username: 'vulkano' });
  },

  // GET /home/throw — triggers the 500 exception view
  'get throw'(req, res) {
    throw new Error('Test crash 500');
  }

};
