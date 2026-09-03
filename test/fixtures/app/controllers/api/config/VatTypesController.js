module.exports = {

  get(req, res) {
    res.vsr(Promise.resolve({ submodule: true }));
  },

  'get :id': (req, res) => {
    res.vsr(Promise.resolve({ submodule: req.params.id }));
  },

  post(req, res) {
    res.vsr(Promise.resolve({ submodule: true }), 201);
  },

  'put :id': (req, res) => {
    res.vsr(Promise.resolve({ submodule: req.params.id }), 202);
  },

  'delete :id': (req, res) => {
    res.vsr(Promise.resolve({ submodule: req.params.id }), 204);
  }

};
