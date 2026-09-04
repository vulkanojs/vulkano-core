module.exports = {

  // GET /api/product/ — one level of module namespace
  get(req, res) { res.vsr(Promise.resolve({ product: true })); }

};
