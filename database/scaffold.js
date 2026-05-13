module.exports = {

  /**
   * Method to get all records by page
   *
   * @param {Object} props (page, perPage, search, sort)
   * @returns {Promise}
   */
  getAll(props) {

    // Props to Query
    const defaultProps = {
      sort: 'createdAt|DESC',
      searchBy: [],
      filter: {
        active: true
      },
    };

    // Query to Run
    const query = Paginate.serializeQuery(defaultProps, props);

    // Pagination
    return Paginate.get(this, query);

  },

  /**
   * Method to get a record by id
   *
   * @param {ObjectID} id
   * @returns {Promise}
   */
  getByField(value, field) {

    // This is to prevent error while run the findOne
    if (!(/^[a-fA-F0-9]{24}$/).test(value) && !field) {
      return VSError.reject('Invalid ID. Record not found.', 404);
    }

    const toSearch = { active: true };
    toSearch[field || '_id'] = value;

    return this.findOne(toSearch)
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

        return this.findOneAndUpdate({ _id }, merged, { new: true })
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
