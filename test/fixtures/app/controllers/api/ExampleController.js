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
  },

  // POST /api/example/:id/lines — create a subdocument
  'post :id/lines'(req, res) {
    res.vsr(Example.createSubdoc('lines', req.params.id, req.body), 201);
  },

  // GET /api/example/:id/lines/:lineId — get a single subdocument
  'get :id/lines/:lineId'(req, res) {
    res.vsr(Example.getSubdoc('lines', req.params.id, req.params.lineId));
  },

  // PUT /api/example/:id/lines/:lineId — update a subdocument
  'put :id/lines/:lineId'(req, res) {
    res.vsr(Example.updateSubdoc('lines', req.params.id, req.params.lineId, req.body), 202);
  }

};
