/* global Example */

/**
 * Example.js
 */

// This is an example for a simple model that provides CRUD operations.
// Provide a flexible way to implement business logic in the model, which is a good practice
// to keep the controller thin and focused on handling requests and responses.

module.exports = {

  /**
   * Fields
   */
  attributes: {
    name: {
      type: String,
      required: true
    },
    school: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'School',
      // Opts this relation into ?populate=school — a ref field without this
      // flag is never populated, no matter what the caller asks for
      autopopulate: true
    },
    age: {
      type: Number,
      required: false,
      validate: {
        validator: (value) => {
          const isValid = (value >= 21) ? true : false;
          return isValid;
        },
        message: 'Invalid Age: Must be +21.',
      }
    }
    // the fields:
    // active, createdAt, updatedAt
    // was created automatically
  },

  // Custom Index
  indexes: [
    {
      name: 'text'
    }
  ],

  /**
   * Method to get all records by page
   *
   * @param {Object} props (page, perPage, search, sort, populate — see _buildPopulate below)
   * @returns {Promise}
   */
  getAll(props) {

    // Props to Query
    const defaultProps = {
      sort: 'createdAt|DESC',
      searchBy: ['name'],
      fields: ['name', 'school', 'age', 'active', 'createdAt', 'updatedAt'],
      filter: {
        active: true
      },
    };

    // Populate: only relations opted in via `autopopulate: true` on the
    // attribute (see `school` above) ever get expanded, and only when asked
    // for through ?populate=. Syntax (see database/scaffold.js#_buildPopulate):
    //   ?populate=school                → full School doc
    //   ?populate=school:name           → only { _id, name }
    //   ?populate=school:name|address   → only { _id, name, address }
    // A relation NOT marked autopopulate can still be opened for one call by
    // passing it as a second arg: this._buildPopulate(props, ['someRef'])
    const populate = this._buildPopulate(props);

    // Query to Run
    const query = Paginate.serializeQuery(defaultProps, props);

    // Pagination
    return Paginate.get(Example, query, populate);

  },

  /**
   * Method to get a record by id
   *
   * @param {ObjectID} id
   * @param {Object} _props (populate — see getAll above for the ?populate= syntax)
   * @returns {Promise}
   */
  getExample(_id, _props) {

    // This is to prevent error while run the findOne
    if (!(/^[a-fA-F0-9]{24}$/).test(_id)) {
      return VSError.reject('Invalid ID. Record not found', 404);
    }

    const query = Example.findOne({ _id });

    // Populate (only relations marked autopopulate: true in attributes)
    this._buildPopulate(_props).forEach((p) => query.populate(p));

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
   * @param {Promise} data
   */
  create(data) {

    const obj = new Example(data);
    return obj.save();

  },

  /**
   * Method to update a record
   * @param {ObjectID} id
   * @param {Object} data
   * @returns {Promise}
   */
  update(_id, data) {

    return Example.getExample(_id)
      .then( (record) => {

        // Merge current info with incoming values
        const merged = { ...record, ...data };

        return Example
          .findOneAndUpdate({ _id }, merged, { returnDocument: 'after' })
          .then( (r) => {

            const tmp = r.toObject({ transform: true });
            return tmp;

          });

      });

  },

  /**
   * Method to delete a record
   * @param {ObjectID} id
   * @returns {Promise}
   */
  delete(id) {

    // Soft delete
    return this.update(id, { active: false });

  },

  /**
   * Before validate callback — runs before beforeSave, as part of obj.save()
   * (create() above). Does NOT run for update()/delete(): Mongoose's update
   * validators (runValidators) validate each changed path directly and never
   * go through this callback, even when a validator rejects the value.
   * @param {Callback} cb
   */
  beforeValidate(cb) {

    console.log('Running callback before validate');

    // All good!
    cb();

  },

  /**
   * Callback after validate
   * @param {Callback} cb
   */
  afterValidate(cb) {

    console.log('Running callback after validate');

    // All good!
    cb();

  },

  /**
   * Before save callback
   * @param {Callback} cb
   */
  beforeSave(cb) {

    const doc = this;

    console.log('Running callback before save');
    console.log(doc);

    // All good!
    cb();

  },

  /**
   * Callback after save
   * @param {Callback} cb
   */
  afterSave(doc, cb) {

    console.log('Running callback after save');
    console.log(doc);

    // All good!
    cb();

  },

  /**
   * Before findOneAndUpdate callback — runs on update() and delete() above,
   * since both call Example.findOneAndUpdate() directly. `this` is the Query,
   * not the document.
   * @param {Callback} cb
   */
  beforeFindOneAndUpdate(cb) {

    console.log('Running callback before findOneAndUpdate');

    // All good!
    cb();

  },

  /**
   * Callback after findOneAndUpdate
   * @param {Object} doc Updated document
   * @param {Callback} cb
   */
  afterFindOneAndUpdate(doc, cb) {

    console.log('Running callback after findOneAndUpdate');
    console.log(doc);

    // All good!
    cb();

  },

};
