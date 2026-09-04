/**
 * bootstrap/responses.js — unit tests
 * `include-all` scans CORE_PATH/responses + APP_PATH/responses at require
 * time, so APP_PATH must be set and the module registry reset first.
 */

const path = require('node:path');
const { setupGlobals } = require('../helpers/globals');

function loadResponsesMiddleware(appPath) {
  jest.resetModules();
  setupGlobals({ APP_PATH: appPath || path.join(__dirname, '../../fixtures/app') });
  return require('../../../bootstrap/responses');
}

describe('loadResponsesApplication (middleware)', () => {

  it('attaches the core vsr() response and calls next()', () => {
    const loadResponsesApplication = loadResponsesMiddleware();
    const req = {};
    const res = {};
    const next = jest.fn();

    loadResponsesApplication(req, res, next);

    expect(typeof res.vsr).toBe('function');
    expect(next).toHaveBeenCalledTimes(1);
  });

  it('attaches a project-level custom response alongside the core ones', () => {
    const loadResponsesApplication = loadResponsesMiddleware(
      path.join(__dirname, '../../fixtures/responses-only/app')
    );
    const req = {};
    const res = {};
    const next = jest.fn();

    loadResponsesApplication(req, res, next);

    expect(typeof res.vsr).toBe('function');
    expect(typeof res.custom).toBe('function');
  });

});
