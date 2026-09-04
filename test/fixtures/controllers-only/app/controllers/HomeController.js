module.exports = {

  // GET /home/
  get(req, res) { res.vsr(Promise.resolve({ home: true })); },

  // POST /home/save
  'post save'(req, res) { res.vsr(Promise.resolve({ saved: true }), 201); },

  // GET /home/:id
  'get :id'(req, res) { res.vsr(Promise.resolve({ id: req.params.id })); },

  // GET /absolute/path — no namespace
  '/absolute/path'(req, res) { res.vsr(Promise.resolve({ absolute: true })); },

  // GET /home/edit/:id — method-prefix fallback (first token not a valid HTTP method)
  'edit :id'(req, res) { res.vsr(Promise.resolve({ edit: req.params.id })); }

};
