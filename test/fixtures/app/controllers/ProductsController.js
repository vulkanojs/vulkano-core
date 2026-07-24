module.exports = {

  // GET /products/form
  form(req, res) {
    res.vsr(Promise.resolve({ action: 'form' }));
  },

  // GET /products/edit/:id — no method prefix needed, defaults to GET
  'edit :id': function onEdit(req, res) {
    const { id } = req.params;
    res.vsr(Promise.resolve({ id }));
  }

};
