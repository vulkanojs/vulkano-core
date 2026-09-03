module.exports = {

  get(req, res) {
    res.vsr(Promise.resolve({ root: true }));
  },

  'get :id': (req, res) => {
    res.vsr(Promise.resolve({ root: req.params.id }));
  },

  post(req, res) {
    res.vsr(Promise.resolve({ root: true }), 201);
  },

  'put :id': (req, res) => {
    res.vsr(Promise.resolve({ root: req.params.id }), 202);
  },

  'delete :id': (req, res) => {
    res.vsr(Promise.resolve({ root: req.params.id }), 204);
  }

};
