/**
 * database/mongodb.js — unit tests
 * Verifies an 'error' listener is attached before connect() is attempted,
 * so a post-connect DB error no longer crashes the whole process (Node
 * throws an uncaught exception on an EventEmitter 'error' with no listener).
 */

const { setupGlobals } = require('../helpers/globals');

setupGlobals({
  app: {
    config: {
      settings: {
        database: {
          connection: 'mongodb://127.0.0.1:1/does-not-exist',
          // Fails fast instead of mongoose's ~30s default, since this
          // connection is never expected to succeed.
          config: { serverSelectionTimeoutMS: 200 }
        }
      }
    }
  }
});

const mongoose = require('mongoose');
const loadDatabaseApplication = require('../../../database/mongodb');
const { toMongoose9PreHook } = require('../../../database/mongodb');

afterAll(async () => {
  await mongoose.disconnect();
});

describe('loadDatabaseApplication — connection error resilience', () => {

  it('registers error/disconnected listeners before connecting, and a subsequent call does not duplicate them', async () => {
    // The connect attempt fails (no real DB at that address) — that's expected.
    await loadDatabaseApplication().catch(() => {});

    expect(mongoose.connection.listenerCount('error')).toBe(1);
    expect(mongoose.connection.listenerCount('disconnected')).toBe(1);

    await loadDatabaseApplication().catch(() => {});

    // Same counts — the listenerCount guard prevented a second registration.
    expect(mongoose.connection.listenerCount('error')).toBe(1);
    expect(mongoose.connection.listenerCount('disconnected')).toBe(1);
  });

  it('emitting a connection error afterward does not crash the process', () => {
    // Before the fix, this line itself would throw (Node's default behavior
    // for an 'error' event with zero listeners) and crash the test process.
    expect(() => mongoose.connection.emit('error', new Error('simulated drop'))).not.toThrow();
  });

});

describe('toMongoose9PreHook — restores the callback-style next() convention', () => {

  it('a zero-arg (already Promise/async-style) function is returned unchanged', () => {
    const fn = async () => {};
    expect(toMongoose9PreHook(fn)).toBe(fn);
  });

  it('non-function input is returned unchanged', () => {
    expect(toMongoose9PreHook(undefined)).toBe(undefined);
    expect(toMongoose9PreHook(null)).toBe(null);
  });

  it('wraps a (next)-style function into one Mongoose 9 can await, ignoring whatever arg Mongoose 9 itself passes', async () => {
    let called = false;
    const legacyHook = function (next) {
      called = true;
      expect(typeof next).toBe('function');
      next();
    };

    const wrapped = toMongoose9PreHook(legacyHook);
    expect(wrapped.length).toBe(0); // must look like a modern hook to Mongoose

    // Mongoose 9 calls the wrapped hook with its own (unrelated) argument —
    // verified directly against the installed mongoose@9 that this argument
    // is not a callback. The wrapper must ignore it, not forward it as `next`.
    await wrapped.call({ some: 'doc' }, { notACallback: true });
    expect(called).toBe(true);
  });

  it('an async delay before calling next() is respected (the returned Promise resolves only then)', async () => {
    let resolvedAt = null;
    const legacyHook = function (next) {
      setTimeout(() => {
        resolvedAt = Date.now();
        next();
      }, 20);
    };

    const before = Date.now();
    await toMongoose9PreHook(legacyHook).call({});
    expect(resolvedAt).not.toBeNull();
    expect(resolvedAt - before).toBeGreaterThanOrEqual(15);
  });

  it('next(err) rejects the returned Promise with that error', async () => {
    const legacyHook = function (next) {
      next(new Error('validation failed on purpose'));
    };

    await expect(toMongoose9PreHook(legacyHook).call({})).rejects.toThrow('validation failed on purpose');
  });

  it('preserves `this` (the document/query Mongoose binds the hook to)', async () => {
    let seenThis = null;
    const legacyHook = function (next) {
      seenThis = this;
      next();
    };

    const doc = { name: 'test-doc' };
    await toMongoose9PreHook(legacyHook).call(doc);
    expect(seenThis).toBe(doc);
  });

});
