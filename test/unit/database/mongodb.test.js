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
