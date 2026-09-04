module.exports = {

  // GET /api/config/vat-types/ — two levels of nested module namespace
  get(req, res) { res.vsr(Promise.resolve({ vatTypes: true })); }

};
