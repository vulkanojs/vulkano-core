module.exports = {

  // GET /inventory/material-receptions/ — nested folder + multi-word controller name
  get(req, res) {
    res.vsr(Promise.resolve({ controller: 'MaterialReceptionsController' }));
  }

};
