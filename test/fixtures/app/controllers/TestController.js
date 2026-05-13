/* global VSError */

module.exports = {

  // GET /test/
  get(req, res) {
    res.vsr(Promise.resolve({ message: 'hello' }));
  },

  // POST /test/save
  'post save': function onSave(req, res) {
    res.vsr(Promise.resolve({ saved: true, received: req.body }));
  },

  // GET /test/query — query string (MUST be before :id to avoid shadowing)
  'get query': function onQuery(req, res) {
    res.vsr(Promise.resolve({ query: req.query }));
  },

  // GET /test/error  — VSError.reject with custom status
  'get error': function onError(req, res) {
    res.vsr(VSError.reject('Custom error message', 422));
  },

  // GET /test/notfound — VSError.notFound
  'get notfound': function onNotFound(req, res) {
    res.vsr(VSError.notFound('Item'));
  },

  // GET /test/notpromise — passes a string instead of a Promise
  'get notpromise': function onNotPromise(req, res) {
    res.vsr('this is not a promise');
  },

  // GET /test/servererror — rejects with a plain Error
  'get servererror': function onServerError(req, res) {
    res.vsr(Promise.reject(new Error('Something went wrong')));
  },

  // GET /test/objmessage — rejects with err.message as object (bug regression)
  'get objmessage': function onObjMessage(req, res) {
    const err = new Error();
    err.message = { nested: 'error detail' };
    err.statusCode = 418;
    res.vsr(Promise.reject(err));
  },

  // GET /test/earlyresponse — sends headers manually before calling res.vsr()
  // used to verify the headers-sent guard in VSR
  'get earlyresponse': function onEarlyResponse(req, res) {
    res.status(200).json({ early: true });
    res.vsr(Promise.resolve({ late: true }));
  },

  // POST /test/upload — file upload via multipart/form-data (upload.any() middleware)
  'post upload': function onUpload(req, res) {
    const files = (req.files || []).map((f) => ({
      fieldname: f.fieldname,
      originalname: f.originalname,
      mimetype: f.mimetype,
      size: f.size
    }));
    res.vsr(Promise.resolve({ uploaded: files.length, files }));
  },

  // GET /test/slow — never resolves, used to trigger request timeout
  'get slow': function onSlow(req, res) {
    res.vsr(new Promise(() => {}));
  },

  // GET /test/:id — single route param (after specific routes to avoid shadowing)
  'get :id': function onGetById(req, res) {
    const { id } = req.params;
    res.vsr(Promise.resolve({ id }));
  },

  // GET /test/:id/detail/:section — multiple route params
  'get :id/detail/:section': function onGetDetail(req, res) {
    const { id, section } = req.params;
    res.vsr(Promise.resolve({ id, section }));
  }

};
