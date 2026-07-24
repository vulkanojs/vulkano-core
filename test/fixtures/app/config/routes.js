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

  // Inline function handler — custom absolute path (definition pattern)
  '/product/my-custom-path/': (req, res) => {
    res.json({ message: 'Hello, world!' });
  },

  // Custom initializer: registers routes directly via app.vulkano.get(), etc.
  custom() {
    app.vulkano.get('/explicit/custom', (req, res) => {
      res.json({ source: 'custom', success: true });
    });
    app.vulkano.post('/explicit/custom', (req, res) => {
      res.json({ source: 'custom-post', received: req.body });
    });

    // More advanced — `app` is the global Vulkano object; the Express instance lives at `app.vulkano`
    app.vulkano.get('/custom-method', (req, res) => {
      res.json({ hello: 'world' });
    });
  }

};
