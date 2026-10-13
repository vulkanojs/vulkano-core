module.exports = {

  /**
   * Parse the populate param into one entry per relation: `name` (trimmed,
   * lowercased) plus an optional `fields` list. Syntax: relations are
   * comma-separated; a relation can carry its own field list after a colon,
   * with `|` separating multiple fields — e.g.
   * `?populate=school:name|address,teacher` populates `school` (selecting
   * only name+address) and `teacher` (full doc). Kept as its own param
   * (not `?school=...`) so it can never collide with a real filter/field
   * query param that happens to share the relation's name.
   *
   * @param {Object} props (populate)
   * @returns {Array} [{ name, fields }]
   */
  _parsePopulateEntries(props) {

    return ((props || {}).populate || '')
      .split(',')
      .map((raw) => {

        const [rawName, rawFields] = raw.split(':');
        const name = (rawName || '').trim().toLowerCase();

        if (!name) {
          return null;
        }

        const fields = rawFields
          ? rawFields.split('|').map((item) => item.trim()).filter(Boolean)
          : null;

        return { name, fields };

      })
      .filter(Boolean);

  },

  /**
   * Sanitize populate param: trim + lowercase each relation name
   * (field-selection suffix, if any, is dropped — see _parsePopulateEntries)
   *
   * @param {Object} props (populate)
   * @returns {Array}
   */
  _getSanitizedPopulate(props) {

    return this._parsePopulateEntries(props).map((entry) => entry.name);

  },

  /**
   * Drop request field selections that would expose a `select: false` path
   * of this model (e.g. a password hash). `fields` comes from the request
   * (?fields=, ?populate=rel:fields), and Mongoose returns a `select: false`
   * path when it's named explicitly or prefixed with `+`. Those paths stay
   * reachable only through `.select('+field')` in model code.
   * Applied by Paginate.get and _buildPopulate.
   *
   * @param {Array} fields field names
   * @returns {Array} the fields safe to select
   */
  _sanitizeFields(fields) {

    const { schema } = this;

    return (fields || [])
      .map((f) => String(f).trim())
      .filter((f) => {

        if (!f || f.startsWith('+')) {
          return false;
        }

        // Check every prefix: `secret.part` is hidden when `secret` is
        const parts = f.replace(/^-/, '').split('.');

        return !parts.some((_part, i) => {
          const path = schema && schema.path(parts.slice(0, i + 1).join('.'));
          return path && path.options && path.options.select === false;
        });

      });

  },

  /**
   * Build populate array by auto-detecting the model's own relations that
   * were opted in — either via `autopopulate: true` on the attribute
   * definition, or via the `extra` allowlist passed here for a one-off call.
   * A ref field with neither is never populated, no matter what the caller
   * asks for. This is the security gate: a relation only becomes reachable
   * through ?populate= when its attribute or the calling code says so.
   *
   * @param {Object} props (populate — see _parsePopulateEntries for its syntax)
   * @param {Array} [extra] field names to allow even without autopopulate: true
   * @returns {Array}
   */
  _buildPopulate(props, extra) {

    const entries = this._parsePopulateEntries(props);

    if (entries.length === 0) {
      return [];
    }

    const extraLower = (Array.isArray(extra) ? extra : []).map((item) => item.toLowerCase());

    const { paths } = this.schema;

    const fieldByLowerName = {};
    Object.keys(paths).forEach((field) => {
      fieldByLowerName[field.toLowerCase()] = field;
    });

    return entries
      .map((entry) => {

        const field = fieldByLowerName[entry.name];

        if (!field) {
          return null;
        }

        const path = paths[field];
        const opts = path.options || {};
        const casterOpts = (path.caster && path.caster.options) || {};
        const ref = opts.ref || casterOpts.ref;
        const autopopulate = opts.autopopulate
          || casterOpts.autopopulate
          || extraLower.includes(entry.name);

        if (!ref || !autopopulate) {
          return null;
        }

        const populateProps = { path: field };

        // Request-supplied fields: never a `select: false` path of the ref
        // model; a ref model without _sanitizeFields gets no field selection
        const refModel = this.db && this.db.models ? this.db.models[ref] : null;
        const fields = refModel && typeof refModel._sanitizeFields === 'function'
          ? refModel._sanitizeFields(entry.fields)
          : [];

        if (fields.length > 0) {
          populateProps.select = fields.join(' ');
        }

        return populateProps;

      })
      .filter(Boolean);

  },

  /**
   * Method to get all records by page
   *
   * @param {Object} props (page, perPage, search, sort, populate)
   * @returns {Promise}
   */
  getAll(props) {

    // Props to Query
    const defaultProps = {
      sort: 'createdAt|DESC',
      searchBy: [],
      filter: {
        active: true // soft-delete
      },
    };

    const populate = this._buildPopulate(props);

    // Query to Run
    const query = Paginate.serializeQuery(defaultProps, props);

    // Pagination
    return Paginate.get(this, query, populate);

  },

  /**
   * Method to get a record by id
   *
   * @param {ObjectID} id
   * @param {Object} props (populate)
   * @returns {Promise}
   */
  getByField(value, field, props) {

    // This is to prevent error while run the findOne
    if (!(/^[a-fA-F0-9]{24}$/).test(value) && !field) {
      return VSError.reject('Invalid ID. Record not found.', 404);
    }

    const toSearch = { active: true };
    toSearch[field || '_id'] = value;

    const query = this.findOne(toSearch);

    this._buildPopulate(props).forEach((p) => query.populate(p));

    return query
      .then( (r) => {

        if (!r) {
          return VSError.notFound();
        }

        return r.toObject({ transform: true });

      });

  },

  /**
   * Method to create a new record
   *
   * @param {Promise} data
   */
  create(data) {

    const obj = new this(data);

    if (obj._id) {
      delete obj._id;
    }

    return obj.save();

  },

  /**
   * Method to update a record
   *
   * @param {ObjectID} id
   * @param {Object} data
   * @returns {Promise}
   */
  update(_id, data) {

    // Blocklist: these fields are never writable from outside
    const BLOCKED = ['_id', 'createdAt', '__v'];
    const sanitized = { ...data };
    BLOCKED.forEach((field) => delete sanitized[field]);

    // Allowlist: if fillable is defined and non-empty, only those fields pass through
    const { fillable } = this;
    let filtered = sanitized;
    if (Array.isArray(fillable) && fillable.length > 0) {
      filtered = {};
      fillable.forEach((field) => {
        if (sanitized[field] !== undefined) {
          filtered[field] = sanitized[field];
        }
      });
    }

    // Two queries by design: fetch the full document first so subdocument arrays
    // and nested fields are preserved in the write — a bare $set would drop
    // any subdoc entries not included in the incoming payload.
    return this.getByField(_id)
      .then( (record) => {

        const merged = {
          ...record,
          ...filtered,
          updatedAt: Date.now()
        };

        return this.findOneAndUpdate({ _id }, merged, { returnDocument: 'after' })
          .then( (r) => {

            const tmp = r.toObject({ transform: true });
            return tmp;

          });

      });

  },

  /**
   * Method to delete a record
   *
   * @param {ObjectID} id
   * @returns {Promise}
   */
  delete(id) {

    // Soft delete: set active=false instead of removing the document
    return this.update(id, { active: false });

  },

  /**
   * Method to get a single subdocument by id
   *
   * @param {String} key
   * @param {ObjectID} parent
   * @param {ObjectID} subdoc
   * @returns {Promise}
   */
  getSubdoc(key, parent, subdoc) {

    return this
      .findOne({ _id: parent })
      .then( (r) => {

        if (!r) {
          return VSError.reject('Invalid ID. Record not found.', 404);
        }

        const current = r[key] ? r[key].id(subdoc) : null;

        if (!current) {
          return VSError.reject('Invalid ID. Item not found.', 404);
        }

        return current;

      });

  },

  /**
   * Method to add a subdocument
   *
   * @param {String} key
   * @param {ObjectID} parent
   * @param {Object} data
   * @returns {Promise}
   */
  createSubdoc(key, parent, data) {

    return this
      .findOne({ _id: parent })
      .then( (r) => {

        if (!r) {
          return VSError.reject('Invalid ID. Record not found.', 404);
        }

        r[key].push(data);

        r.markModified(key);

        return r.save()
          .then( () => {
            return r[key][r[key].length - 1];
          });

      });

  },

  /**
   * Method to update a subdocument
   *
   * @param {String} key
   * @param {ObjectID} parent
   * @param {ObjectID} subdoc
   * @param {Object} data
   * @returns {Promise}
   */
  updateSubdoc(key, parent, subdoc, data) {

    return this
      .findOne({ _id: parent })
      .then( (r) => {

        if (!r) {
          return VSError.reject('Invalid ID. Record not found.', 404);
        }

        const current = r[key] ? r[key].id(subdoc) : null;

        if (!current) {
          return VSError.reject('Invalid ID. Item not found.', 404);
        }

        r[key].id(subdoc).set({ ...data, _id: subdoc });

        r.markModified(key);

        return r.save()
          .then( () => {
            return r[key].id(subdoc);
          });

      });

  },

  /**
   * Method to remove a subdocument
   *
   * @param {String} key
   * @param {ObjectID} parent
   * @param {ObjectID} subdoc
   * @returns {Promise}
   */
  removeSubdoc(key, parent, subdoc) {

    return this
      .findOne({ _id: parent })
      .then( (r) => {

        if (!r) {
          return VSError.reject('Invalid ID. Record not found.', 404);
        }

        const current = r[key] ? r[key].id(subdoc) : null;

        if (!current) {
          return VSError.reject('Invalid ID. Item not found.', 404);
        }

        r[key].id(subdoc).deleteOne();

        r.markModified(key);

        return r.save();

      });

  },

  /**
   * ALIAS: removeSubdoc
   *
   * @param {String} key
   * @param {ObjectID} parent
   * @param {ObjectID} subdoc
   * @returns {Promise}
   */
  deleteSubdoc(key, parent, subdoc) {
    return this.removeSubdoc(key, parent, subdoc);
  }

};
