/* global ExampleWithScaffold */
/*
 * This endpoint is protected by JWT, please disable it to test
 */

// Scaffold Controller is a controller that provides CRUD operations for a model.
// It is a generic controller that can be used to create, read, update, and delete records
// from a model. It is a good starting point for creating a
// RESTful API.

module.exports = {

  // Model to CRUD (create, read, update, and delete) records — must exist as global.ExampleWithScaffold
  scaffold: 'ExampleWithScaffold',

  // Allowed methods
  allowedMethods: ['get', 'post', 'put', 'delete'],

  // ─────────────────────────────────────────────
  // Subdocuments — CRUD on ExampleWithScaffold.lines (an embedded array,
  // not a separate model/collection). A scaffold controller can freely mix
  // its 5 auto-generated routes (above) with hand-written ones like these —
  // any key you add here that the scaffold doesn't already provide is just
  // a normal controller method. GET/PUT/DELETE on the parent record itself
  // (`get :id`, `put :id`, `delete :id`) already come from the scaffold, so
  // GET /api/example-with-scaffold/:id returns the `lines` array too.
  // ─────────────────────────────────────────────

  // POST /api/example-with-scaffold/:id/lines — add a line to the parent record
  'post :id/lines'(req, res) {
    res.vsr(ExampleWithScaffold.createSubdoc('lines', req.params.id, req.body), 201);
  },

  // GET /api/example-with-scaffold/:id/lines/:lineId — find a single line
  'get :id/lines/:lineId'(req, res) {
    res.vsr(ExampleWithScaffold.getSubdoc('lines', req.params.id, req.params.lineId));
  },

  // PUT /api/example-with-scaffold/:id/lines/:lineId — update a single line
  'put :id/lines/:lineId'(req, res) {
    res.vsr(ExampleWithScaffold.updateSubdoc('lines', req.params.id, req.params.lineId, req.body), 202);
  },

  // DELETE /api/example-with-scaffold/:id/lines/:lineId — remove a single line
  'delete :id/lines/:lineId'(req, res) {
    res.vsr(ExampleWithScaffold.removeSubdoc('lines', req.params.id, req.params.lineId), 204);
  }

};
