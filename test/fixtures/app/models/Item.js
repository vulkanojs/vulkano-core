/* global Paginate */

module.exports = {

  // Fields
  attributes: {
    name:     { type: String, required: true },
    value:    { type: Number, default: 0 },
    tags:     { type: [String], default: [] },
    comments: [{
      text:   { type: String, trim: true },
      author: { type: String, trim: true }
    }]
  },

  // Override scaffold getAll to enable search by name
  getAll(props) {
    const defaultProps = {
      sort: 'createdAt|DESC,_id|ASC',
      searchBy: ['name'],
      filter: { active: true }
    };
    const query = Paginate.serializeQuery(defaultProps, props);
    return Paginate.get(this, query);
  }

};
