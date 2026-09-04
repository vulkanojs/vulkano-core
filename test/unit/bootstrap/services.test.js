/**
 * bootstrap/services.js — unit tests
 * `include-all` scans CORE_PATH/libs + APP_PATH/services + APP_PATH/libs at
 * require time, so APP_PATH must be set and the module registry reset first.
 */

const path = require('node:path');
const { setupGlobals } = require('../helpers/globals');

function loadServices() {
  jest.resetModules();
  delete global.Greeter;
  delete global.Paginate;
  delete global.ActiveRecord;
  delete global.AppController;
  setupGlobals({ APP_PATH: path.join(__dirname, '../../fixtures/services-only/app') });
  const loadServicesApplication = require('../../../bootstrap/services');
  loadServicesApplication();
}

describe('loadServicesApplication', () => {

  it('injects a core lib as a global (e.g. VSError)', () => {
    loadServices();
    expect(typeof global.VSError).toBe('function');
  });

  it('injects a project service as a global', () => {
    loadServices();
    expect(global.Greeter.hello()).toBe('hi');
  });

  it('lets a project lib override a core lib of the same name', () => {
    loadServices();
    expect(global.Paginate.get()).toBe('overridden');
  });

  it('never exposes ActiveRecord as a global, even if a project defines one', () => {
    loadServices();
    expect(global.ActiveRecord).toBeUndefined();
  });

  it('never exposes AppController as a global, even if a project defines one', () => {
    loadServices();
    expect(global.AppController).toBeUndefined();
  });

});
