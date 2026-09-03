module.exports = {

  get(req, res) {
    res.vsr(Promise.resolve({ module: true }));
  },

  'get :id': (req, res) => {
    res.vsr(Promise.resolve({ module: req.params.id }));
  },

  post(req, res) {
    res.vsr(Promise.resolve({ module: true }), 201);
  },

  'put :id': (req, res) => {
    res.vsr(Promise.resolve({ module: req.params.id }), 202);
  },

  'delete :id': (req, res) => {
    res.vsr(Promise.resolve({ module: req.params.id }), 204);
  }

};
