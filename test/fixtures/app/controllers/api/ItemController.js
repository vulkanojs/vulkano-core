/* global Item */

module.exports = {
  scaffold: true,
  model: 'Item',
  allowedMethods: ['get', 'post', 'put', 'patch', 'delete'],

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
