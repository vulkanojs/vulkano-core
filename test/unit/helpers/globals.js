/**
 * Shared global bootstrap for unit tests.
 *
 * Vulkano's core libs (`core/libs/*.js`) assume `global.app`, `global.VSError`,
 * `global.CORE_PATH`, `global.APP_PATH`, etc. already exist — normally set by
 * `bootstrap/services.js` at framework boot. Unit tests skip that boot entirely
 * to test a lib in isolation, so those globals have to be faked by hand first.
 *
 * Call `setupGlobals()` (and `setupEncrypter()` / `setupFilter()` if the lib
 * under test needs them) at the top of the file, before requiring the lib under
 * test, instead of hand-rolling yet another stand-in `VSError` class per file.
 */

const path = require('node:path');

const CORE_PATH = path.join(__dirname, '../../..');
const APP_PATH = path.join(__dirname, '../../fixtures/app');

// `overrides.app` replaces the whole `app` global (shallow) — pass a full
// `{ config: {...} }` shape when the lib under test reads app.config.*.
function setupGlobals(overrides = {}) {

  global.CORE_PATH = overrides.CORE_PATH || CORE_PATH;
  global.APP_PATH = overrides.APP_PATH || APP_PATH;

  global.app = {
    PRODUCTION: false,
    config: {},
    ...overrides.app
  };

  // The real VSError, not a per-file stand-in — keeps unit tests honest about
  // its actual behavior (app.PRODUCTION stack stripping, customProps, notFound).
  global.VSError = require('../../../libs/VSError');

  return global.app;

}

function setupEncrypter() {
  global.Encrypter = require('../../../libs/Encrypter');
  return global.Encrypter;
}

function setupFilter() {
  // Requires CORE_PATH/APP_PATH to already be set — call setupGlobals() first.
  global.Filter = require('../../../libs/Filter');
  return global.Filter;
}

module.exports = { setupGlobals, setupEncrypter, setupFilter };
