module.exports = {

  // String reference to a controller action
  'GET /config/ping': 'TestController.get',

  // Inline function handler (definition pattern)
  'GET /explicit/inline': (req, res) => {
    res.json({ source: 'inline', success: true });
  },

  'POST /explicit/inline': (req, res) => {
    res.json({ source: 'inline-post', received: req.body });
  },

  // Custom initializer: registers routes directly via app.vulkano.get(), etc.
  custom() {
    app.vulkano.get('/explicit/custom', (req, res) => {
      res.json({ source: 'custom', success: true });
    });
    app.vulkano.post('/explicit/custom', (req, res) => {
      res.json({ source: 'custom-post', received: req.body });
    });
  }

};
