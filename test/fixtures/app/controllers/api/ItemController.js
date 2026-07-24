/* global Item */

module.exports = {
  scaffold: true,
  model: 'Item',
  allowedMethods: ['get', 'post', 'put', 'patch', 'delete'],

  // GET /api/item/ — list (defined explicitly instead of relying on the
  // scaffold default, so the controller stays readable on its own)
  get(req, res) {
    res.vsr(Item.getAll(req.query || {}));
  },

  // POST /api/item/ — create
  post(req, res) {
    res.vsr(Item.create(req.body), 201);
  },

  // GET /api/item/hooklog — read the lifecycle hooks fired so far (test only)
  'get hooklog'(req, res) {
    res.vsr(Promise.resolve(Item.getHookLog()));
  },

  // DELETE /api/item/hooklog — reset the lifecycle hook log (test only)
  'delete hooklog'(req, res) {
    Item.resetHookLog();
    res.vsr(Promise.resolve({ reset: true }));
  },

  // GET /api/item/:id — single record (must come after the literal routes
  // above — "hooklog" would otherwise be shadowed as an :id value)
  'get :id'(req, res) {
    res.vsr(Item.getByField(req.params.id));
  },

  // PUT /api/item/updateone/:id — exercises the raw `doc.updateOne()` document
  // method directly (test only), bypassing the scaffold's findOneAndUpdate-based
  // update() so beforeUpdate/afterUpdate can be proven in isolation.
  'put updateone/:id'(req, res) {
    res.vsr(
      Item.findOne({ _id: req.params.id })
        .then((doc) => doc.updateOne(req.body, { runValidators: true }))
    );
  },

  // PUT /api/item/customupdate/:id — exercises Item.customUpdate(), which
  // mirrors examples/models/Example.js's own update(_id, data) pattern
  // (get + merge + Model.findOneAndUpdate()). Test only.
  'put customupdate/:id'(req, res) {
    res.vsr(Item.customUpdate(req.params.id, req.body));
  },

  // DELETE /api/item/rawremove/:id — exercises the raw `doc.deleteOne()`
  // document method directly (test only), a hard delete distinct from the
  // scaffold's soft-delete, so beforeRemove/afterRemove can be proven in isolation.
  // (Named "rawremove", not "deleteone": the route-path builder in
  // controllers.js strips any HTTP method name found as a substring of the
  // path — "deleteone" contains "delete" and got mangled to "one".)
  'delete rawremove/:id'(req, res) {
    res.vsr(
      Item.findOne({ _id: req.params.id })
        .then((doc) => doc.deleteOne())
    );
  },

  // POST /api/item/:id/comment
  'post :id/comment'(req, res) {
    res.vsr(Item.createSubdoc('comments', req.params.id, req.body), 201);
  },

  // PUT /api/item/:id/comment/:commentId
  'put :id/comment/:commentId'(req, res) {
    res.vsr(Item.updateSubdoc('comments', req.params.id, req.params.commentId, req.body), 202);
  },

  // DELETE /api/item/:id/comment/:commentId
  'delete :id/comment/:commentId'(req, res) {
    res.vsr(Item.removeSubdoc('comments', req.params.id, req.params.commentId), 204);
  }
};
