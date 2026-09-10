/* global Paginate */

// In-memory log of lifecycle hooks actually invoked by mongodb.js, in call
// order. Read/reset via ItemController's "hooklog" routes — used by
// test/integration/hooks.test.js to prove which callbacks really fire.
const hookLog = [];

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
  },

  // Test instrumentation — exposed as model statics (see ItemController)
  getHookLog() {
    return hookLog;
  },

  resetHookLog() {
    hookLog.length = 0;
  },

  // Mirrors examples/models/Example.js's own update(_id, data): fetch the
  // current record, merge the incoming payload over it, then findOneAndUpdate
  // with the merged result (so the whole record is written back, not just
  // the fields that came in). Kept separate from the scaffold's own update()
  // (used by PUT /:id, which sanitizes fields — see scaffold.test.js) so this
  // stays a pure hook-firing check for the per-model custom `update()` pattern.
  customUpdate(_id, data) {
    return this.getByField(_id)
      .then((record) => {
        const merged = { ...record, ...data };
        return this.findOneAndUpdate({ _id }, merged, { returnDocument: 'after' })
          .then((r) => r.toObject({ transform: true }));
      });
  },

  // ─────────────────────────────────────────────
  // Lifecycle hooks (database/mongodb.js)
  // ─────────────────────────────────────────────

  beforeValidate(next) {
    hookLog.push('beforeValidate');
    next();
  },

  afterValidate() {
    hookLog.push('afterValidate');
  },

  beforeSave(next) {
    hookLog.push('beforeSave');
    next();
  },

  afterSave() {
    hookLog.push('afterSave');
  },

  beforeUpdate(next) {
    hookLog.push('beforeUpdate');
    next();
  },

  afterUpdate() {
    hookLog.push('afterUpdate');
  },

  beforeFindOneAndUpdate(next) {
    hookLog.push('beforeFindOneAndUpdate');
    next();
  },

  afterFindOneAndUpdate() {
    hookLog.push('afterFindOneAndUpdate');
  },

  beforeRemove(next) {
    hookLog.push('beforeRemove');
    next();
  },

  afterRemove() {
    hookLog.push('afterRemove');
  }

};
