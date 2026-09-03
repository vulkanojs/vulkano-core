module.exports = {

  // GET /my-account/ — multi-word PascalCase controller name -> kebab-case URL
  get(req, res) {
    res.vsr(Promise.resolve({ controller: 'MyAccountController' }));
  }

};
