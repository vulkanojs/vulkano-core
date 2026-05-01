/* global Paginate */

module.exports = {

  attributes: {
    name:  { type: String, required: true },
    value: { type: Number, default: 0 },
    tags:  { type: [String], default: [] }
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
