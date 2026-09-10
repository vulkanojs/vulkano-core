/* global Paginate */

module.exports = {

  // Fields
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
      required: false
    },
    // Real relation, deliberately left WITHOUT autopopulate — proves the
    // scaffold refuses it even though it's a real ref field in the schema
    secret: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'School'
    },
    // Subdocument array — exercises the scaffold's getSubdoc/createSubdoc/
    // updateSubdoc/removeSubdoc through a scaffold-generated controller
    // (as opposed to Item.js's comments, wired through a hand-written one).
    lines: [{
      description: { type: String, trim: true },
      qty: { type: Number, default: 1 }
    }]
  },

  // Override scaffold getAll to select just name/school/age — populate
  // (school) is auto-detected from the schema's `autopopulate: true` flag
  // by the scaffold's own _buildPopulate(), see database/scaffold.js.
  // Field selection on the populated doc: ?populate=school:name|address
  getAll(props) {
    const defaultProps = {
      sort: 'createdAt|DESC',
      searchBy: ['name'],
      fields: ['name', 'school', 'age'],
      filter: { active: true }
    };
    const populate = this._buildPopulate(props);
    const query = Paginate.serializeQuery(defaultProps, props);
    return Paginate.get(this, query, populate);
  },

  // Override scaffold getByField to also support populate=school
  getByField(value, field, props) {

    if (!(/^[a-fA-F0-9]{24}$/).test(value) && !field) {
      return VSError.reject('Invalid ID. Record not found.', 404);
    }

    const toSearch = { active: true };
    toSearch[field || '_id'] = value;

    const query = this.findOne(toSearch);

    this._buildPopulate(props).forEach((p) => query.populate(p));

    return query.then((r) => {

      if (!r) {
        return VSError.notFound();
      }

      return r.toObject({ transform: true });

    });

  }

};
