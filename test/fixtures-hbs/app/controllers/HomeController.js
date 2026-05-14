module.exports = {

  // GET /home/
  get(req, res) {
    res.render('home/index.html', { title: 'Handlebars Home', username: 'vulkano' });
  },

  // GET /home/throw — triggers the 500 exception view
  'get throw'(req, res) {
    throw new Error('Test crash 500');
  }

};
