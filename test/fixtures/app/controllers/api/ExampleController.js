/* global Example */

module.exports = {
  scaffold: true,
  model: 'Example',
  allowedMethods: ['get', 'post', 'put', 'delete'],

  // GET /api/example/?populate=school
  get(req, res) {
    res.vsr(Example.getAll(req.query || {}));
  },

  // GET /api/example/:id?populate=school
  'get :id'(req, res) {
    res.vsr(Example.getByField(req.params.id, null, req.query || {}));
  },

  // POST /api/example/
  post(req, res) {
    res.vsr(Example.create(req.body), 201);
  }

};
