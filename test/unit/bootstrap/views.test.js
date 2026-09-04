/**
 * bootstrap/views.js — unit tests
 * `include-all` scans CORE_PATH/views/{filters,helpers} + APP_PATH/config/
 * views/{filters,helpers} at require time, so APP_PATH must be set and the
 * module registry reset first.
 */

const path = require('node:path');
const { setupGlobals } = require('../helpers/globals');

function loadViewsConfig() {
  jest.resetModules();
  setupGlobals({ APP_PATH: path.join(__dirname, '../../fixtures/views-only/app') });
  return require('../../../bootstrap/views');
}

describe('views bootstrap config', () => {

  it('sets the views path under APP_PATH/views', () => {
    const config = loadViewsConfig();
    expect(config.path).toBe(path.join(__dirname, '../../fixtures/views-only/app/views'));
  });

  it('defaults engine to nunjucks and ext to .html', () => {
    const config = loadViewsConfig();
    expect(config.engine).toBe('nunjucks');
    expect(config.ext).toBe('.html');
  });

  it('lists core filters before project filters', () => {
    const config = loadViewsConfig();
    const [coreFilters, appFilters] = config.filters;
    expect(typeof coreFilters.vCamelCase).toBe('function');
    expect(typeof appFilters.upper).toBe('function');
  });

  it('lists core helpers before project helpers', () => {
    const config = loadViewsConfig();
    const [coreHelpers, appHelpers] = config.helpers;
    expect(typeof coreHelpers.t).toBe('function');
    expect(typeof appHelpers.greet).toBe('function');
  });

});
