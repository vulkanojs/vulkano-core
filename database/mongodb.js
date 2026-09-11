/**
 * Database connection
 */

const mongoose = require('mongoose');
const paginate = require('mongoose-paginate-v2');
const merge = require('../libs/Merge');

global.mongoose = mongoose;
global.Virtual = 'Virtual';
global.Mixed = mongoose.Schema.Types.Mixed;

const AllModels = require('./models')();

// Mongoose 9 no longer calls pre-middleware with a `next` callback (it now
// expects a synchronous function or one returning a Promise). Vulkano's own
// hook convention — every beforeSave/beforeUpdate/beforeFindOneAndUpdate/
// beforeRemove/beforeValidate — is written as `(next) => { ...; next(); }`,
// so wrap any such function into a Promise-returning one Mongoose 9 accepts,
// preserving the exact old calling convention (including `next(err)` to
// reject) for every existing model, in this framework and in consuming apps.
// A hook already written with zero parameters (already Promise/async-style)
// is passed through unchanged. Post-hooks are unaffected — Mongoose 9 still
// calls them with `(doc, cb)` exactly as before, verified directly against
// the installed mongoose@9, so no wrapping is needed there.
function toMongoose9PreHook(fn) {

  if (typeof fn !== 'function' || fn.length === 0) {
    return fn;
  }

  return function legacyPreHook() {
    return new Promise((resolve, reject) => {
      fn.call(this, (err) => (err ? reject(err) : resolve()));
    });
  };

}

module.exports = async function loadDatabaseApplication() {

  const {
    config
  } = app;

  const {
    connections,
    settings
  } = config || {};

  const {
    database
  } = settings || {};

  const {
    connection,
    settings: dbSettings
  } = database || {};

  // Connecting to MongoDB is optional — a project without database.connection
  // configured still needs its models registered as globals below (plain
  // attribute-less models don't even use Mongoose; schema-based ones just
  // fail at query time instead of at boot, same as any other missing config).
  if (connection) {

    const toConnect = (connections && connection in connections)
      ? connections[connection]
      : (connection || null);

    if (!toConnect) {
      throw new Error(`Invalid connection to MongoDB with source "${connection}"`);
    }

    // Build connection props from user config; family defaults to 4 (IPv4)
    // unless explicitly set to another value in database.config
    const connectionProps = merge.all([
      { family: 4 },
      (database ? database.config || {} : {})
    ]);

    if (dbSettings) {
      Object.keys(dbSettings).forEach( (s) => {
        mongoose.set(s, dbSettings[s]);
      });
    }

    // Node throws an uncaught exception on an EventEmitter's 'error' event when
    // nothing is listening for it — without this, a connection drop after the
    // initial connect (network blip, MongoDB restart) crashes the whole
    // process instead of just failing the queries in flight. Attached before
    // connect() so it also catches errors emitted during the initial attempt.
    if (!mongoose.connection.listenerCount('error')) {
      mongoose.connection.on('error', (err) => {
        console.log(` \x1b[41mERROR\x1b[0m: MongoDB connection error: ${err.message}`);
      });
    }

    if (!mongoose.connection.listenerCount('disconnected')) {
      mongoose.connection.on('disconnected', () => {
        console.log(' \x1b[33mWARNING\x1b[0m: MongoDB disconnected.');
      });
    }

    if (!mongoose.connection.readyState) {
      await mongoose.connect(toConnect, connectionProps);
    }

  }

  const db = mongoose.connection;

  // Each Model
  Object.keys(AllModels).forEach((model) => {

    const current = AllModels[model];
    if (!current.attributes) {
      global[model] = current;
    } else if (connection) {

      // Allow trim all attributes
      const attributes = {};
      const virtuals = {};

      Object.keys(current.attributes).forEach( (attr) => {

        const currentAttr = current.attributes[attr];
        const type = currentAttr.type || '';

        if ( type !== Boolean) {
          if (currentAttr.trim !== false) {
            currentAttr.trim = true;
          }
        }

        if ( String(type).toLowerCase() === 'virtual' ) {
          virtuals[attr] = currentAttr;
          delete attributes[attr];
        } else {
          attributes[attr] = currentAttr;
        }

      });

      if (!attributes.active) {
        attributes.active = {
          type: Boolean,
          default: true
        };
      }

      if (!attributes.createdAt) {
        attributes.createdAt = {
          type: Date,
          default: Date.now
        };
      }

      if (!attributes.updatedAt) {
        attributes.updatedAt = {
          type: Date
        };
      }

      const schema = mongoose.Schema(attributes);

      Object.keys(virtuals).forEach( (v) => {

        const currentVirtual = virtuals[v];

        const {
          get: getVirtual
        } = currentVirtual || {};

        if (getVirtual) {
          schema.virtual(v, currentVirtual).get(getVirtual);
        } else {
          schema.virtual(v, currentVirtual);
        }

      });

      schema.set('toObject', { virtuals: true, getters: true, setters: true });
      schema.set('toJSON', { virtuals: true, getters: true, setters: true });

      delete current.attributes;
      schema.statics = { ...current };
      schema.plugin(paginate);

      // Indexes
      if (current.indexes !== undefined) {
        if (Array.isArray(current.indexes)) {
          const tmp = current.indexes;
          Object.keys(tmp).forEach( (index) => schema.index(tmp[index]));
        } else if (typeof current.indexes === 'object') {
          schema.index(current.indexes);
        }
      }

      // Plugins
      if (current.plugins !== undefined) {
        if (Array.isArray(current.plugins)) {
          const tmp = current.plugins;
          Object.keys(tmp).forEach( (plugin) => schema.plugin(tmp[plugin]));
        } else if (typeof current.plugins === 'object') {
          schema.plugin(current.plugins);
        }
      }

      //
      // Callbacks
      //

      // Save
      if (current.beforeSave) {
        schema.pre('save', toMongoose9PreHook(current.beforeSave));
        delete schema.statics.beforeSave;
      }
      if (current.afterSave) {
        schema.post('save', current.afterSave);
        delete schema.statics.afterSave;
      }

      // Update
      // Bound to "updateOne" (the Mongoose 8 document method) rather than the
      // legacy "update" hook name: Mongoose no longer fires "update" middleware,
      // and that name collides with the scaffold's own `Model.update()` static
      // (schema.statics.update), which Mongoose auto-wraps with any hook whose
      // name matches an existing static method.
      if (current.beforeUpdate) {
        schema.pre('updateOne', { document: true, query: false }, toMongoose9PreHook(current.beforeUpdate));
        delete schema.statics.beforeUpdate;
      }
      if (current.afterUpdate) {
        schema.post('updateOne', { document: true, query: false }, current.afterUpdate);
        delete schema.statics.afterUpdate;
      }

      // findOneAndUpdate
      if (current.beforeFindOneAndUpdate) {
        schema.pre('findOneAndUpdate', toMongoose9PreHook(current.beforeFindOneAndUpdate));
        delete schema.statics.beforeFindOneAndUpdate;
      }
      if (current.afterFindOneAndUpdate) {
        schema.post('findOneAndUpdate', current.afterFindOneAndUpdate);
        delete schema.statics.afterFindOneAndUpdate;
      }

      // Remove
      // Bound to "deleteOne" (the Mongoose 8 document method): `doc.remove()`
      // and the legacy "remove" hook name were both removed upstream.
      if (current.beforeRemove) {
        schema.pre('deleteOne', { document: true, query: false }, toMongoose9PreHook(current.beforeRemove));
        delete schema.statics.beforeRemove;
      }
      if (current.afterRemove) {
        schema.post('deleteOne', { document: true, query: false }, current.afterRemove);
        delete schema.statics.afterRemove;
      }

      // Validation
      if (current.beforeValidate) {
        schema.pre('validate', toMongoose9PreHook(current.beforeValidate));
        delete schema.statics.beforeValidate;
      }
      if (current.afterValidate) {
        schema.post('validate', current.afterValidate);
        delete schema.statics.afterValidate;
      }

      global[model] = db.model(model, schema, model.toLowerCase());
      global[model].attributes = attributes;

    } else {
      // No database connection: expose the raw model definition as-is,
      // skip schema compilation, indexes, plugins and lifecycle callbacks —
      // none of it is usable without a real Mongoose connection anyway.
      global[model] = current;
    }

  });

};

module.exports.toMongoose9PreHook = toMongoose9PreHook;
