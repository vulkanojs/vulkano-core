module.exports = (modelName, allowedMethods, subdocs) => {

  const {
    config
  } = app;

  const {
    settings
  } = config;

  const {
    database
  } = settings;

  const {
    connection
  } = database || {};

  if (!connection && !process.env.MONGO_URI) {
    return {};
  }

  if (!modelName) {
    console.log(`Invalid Model name ${modelName} to the Scaffold Controller`);
    return {};
  }

  const {
    create,
    update
  } = global[modelName] || {};

  const getAllModelName = `getAll${modelName}`;
  const getModelName = `get${modelName}`;

  if (!create || !update) {

    const invalid = [];

    if (!create) {
      invalid.push('create');
    }

    if (!update) {
      invalid.push('update');
    }

    console.log(`Invalid Model method(s) ${invalid.join(', ')} to the model ${modelName} to the Scaffold Controller. Please verify the connection and try again.`);

    return {};

  }

  const allMethods = {

    get(req, res) {

      res.vsr(global[modelName][getAllModelName](req.query || {}));

    },

    'get :id': function onGetRecord(req, res) {

      const {
        id
      } = req.params || {};

      res.vsr(global[modelName][getModelName](id) );

    },

    post: function onCreateRecord(req, res) {

      const {
        body
      } = req || {};

      res.vsr(global[modelName].create(body), 201);

    },

    'put :id': function onPutRecord(req, res) {

      const {
        id
      } = req.params || {};

      const {
        body
      } = req || {};

      res.vsr(global[modelName].update(id, body), 202);

    },

    'patch :id': function onPatchRecord(req, res) {

      const {
        id
      } = req.params || {};

      const {
        body
      } = req || {};

      res.vsr(global[modelName].update(id, body), 202);

    },

    'delete :id': function onDeleteRecord(req, res) {

      const {
        id
      } = req.params || {};

      res.vsr(global[modelName].delete(id), 204);

    }

  };

  // ─────────────────────────────────────────────
  // Subdocuments — opt-in via the `subdocs` array on the controller
  // (`scaffold: 'Product', subdocs: ['reviews']`). Absent or empty = off,
  // same on/off convention as `allowedMethods`. `:key` is restricted to the
  // names in that list — a request for a key not in it 404s, rather than
  // accepting any field name and letting a non-array field (e.g. a plain
  // String attribute) blow up in Model.createSubdoc()'s `r[key].push(...)`.
  //
  // Entries can be a plain string (`'lines'`, no per-key method restriction)
  // or `{ key: ['GET', 'POST'] }` to restrict that key's subdoc routes to
  // specific HTTP methods (`subdocs: ['lines', { reviews: ['GET', 'POST'] }]`).
  // ─────────────────────────────────────────────
  const subdocKeys = [];
  const subdocMethods = {};

  (Array.isArray(subdocs) ? subdocs : []).forEach((entry) => {

    if (typeof entry === 'string') {
      subdocKeys.push(entry);
      return;
    }

    const [key] = Object.keys(entry || {});

    if (!key) {
      return;
    }

    subdocKeys.push(key);

    if (Array.isArray(entry[key])) {
      subdocMethods[key] = entry[key].map((m) => m.toUpperCase());
    }

  });

  if (subdocKeys.length > 0) {

    const invalidSubdocKey = (key) => !subdocKeys.includes(key);

    const methodNotAllowed = (key, method) => (
      subdocMethods[key] && !subdocMethods[key].includes(method)
    );

    allMethods['post :id/:key'] = function onCreateSubdoc(req, res) {

      const { id, key } = req.params || {};

      if (invalidSubdocKey(key)) {
        return res.vsr(VSError.reject(`Unknown subdocument key "${key}".`, 404));
      }

      if (methodNotAllowed(key, 'POST')) {
        return res.vsr(VSError.reject(`Method POST not allowed for subdocument key "${key}".`, 405));
      }

      res.vsr(global[modelName].createSubdoc(key, id, req.body), 201);

    };

    allMethods['get :id/:key/:subId?'] = function onGetSubdoc(req, res) {

      const { id, key, subId } = req.params || {};

      if (invalidSubdocKey(key)) {
        return res.vsr(VSError.reject(`Unknown subdocument key "${key}".`, 404));
      }

      if (methodNotAllowed(key, 'GET')) {
        return res.vsr(VSError.reject(`Method GET not allowed for subdocument key "${key}".`, 405));
      }

      if (subId) {
        res.vsr(global[modelName].getSubdoc(key, id, subId));
        return;
      }

      // No subId — list every item under this key on the parent record.
      res.vsr(global[modelName].getByField(id).then((r) => r[key]));

    };

    allMethods['put :id/:key/:subId'] = function onUpdateSubdoc(req, res) {

      const { id, key, subId } = req.params || {};

      if (invalidSubdocKey(key)) {
        return res.vsr(VSError.reject(`Unknown subdocument key "${key}".`, 404));
      }

      if (methodNotAllowed(key, 'PUT')) {
        return res.vsr(VSError.reject(`Method PUT not allowed for subdocument key "${key}".`, 405));
      }

      res.vsr(global[modelName].updateSubdoc(key, id, subId, req.body), 202);

    };

    allMethods['delete :id/:key/:subId'] = function onDeleteSubdoc(req, res) {

      const { id, key, subId } = req.params || {};

      if (invalidSubdocKey(key)) {
        return res.vsr(VSError.reject(`Unknown subdocument key "${key}".`, 404));
      }

      if (methodNotAllowed(key, 'DELETE')) {
        return res.vsr(VSError.reject(`Method DELETE not allowed for subdocument key "${key}".`, 405));
      }

      res.vsr(global[modelName].removeSubdoc(key, id, subId), 204);

    };

  }

  if (allowedMethods) {

    const tempAllowedMethods = Array.isArray(allowedMethods)
      ? allowedMethods.map( (m) => m.toLowerCase() )
      : allowedMethods.split(',').map( (m) => m.trim().toLowerCase() );

    if (!tempAllowedMethods.includes('post')) {
      delete allMethods.post;
    }

    if (!tempAllowedMethods.includes('get')) {
      delete allMethods.get;
      delete allMethods['get :id'];
    }

    if (!tempAllowedMethods.includes('put')) {
      delete allMethods['put :id'];
    }

    if (!tempAllowedMethods.includes('patch')) {
      delete allMethods['patch :id'];
    }

    if (!tempAllowedMethods.includes('delete')) {
      delete allMethods['delete :id'];
    }

  }

  return allMethods;

};
