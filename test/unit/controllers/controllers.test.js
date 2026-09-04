/**
 * controllers.js — loadControllersApplication() unit tests
 * `include-all` scans APP_PATH/controllers at require time, so APP_PATH must
 * be set and the module registry reset before each require.
 */

const path = require('node:path');

describe('loadControllersApplication', () => {

  beforeEach(() => {
    jest.resetModules();
    global.app = { config: { settings: { database: { connection: 'MONGO_URI' } } } };
    // ScaffoldedController.js (in the controllers-only fixture) is scanned on
    // every loadControllersApplication() call, so its model must exist globally
    // whenever that fixture is used — even in tests not about scaffolding.
    global.FakeModel = { create: () => {}, update: () => {} };
  });

  afterEach(() => {
    delete global.FakeModel;
  });

  function loadWithFixture(dirName) {
    global.APP_PATH = path.join(__dirname, '../../fixtures', dirName, 'app');
    return require('../../../controllers/controllers');
  }

  it('builds a root route for a single-word controller name', () => {
    const loadControllersApplication = loadWithFixture('controllers-only');
    const routes = loadControllersApplication();
    expect(typeof routes['get /home/']).toBe('function');
  });

  it('builds a "method action" route (post save)', () => {
    const loadControllersApplication = loadWithFixture('controllers-only');
    const routes = loadControllersApplication();
    expect(typeof routes['post /home/save']).toBe('function');
  });

  it('builds a param route (get :id)', () => {
    const loadControllersApplication = loadWithFixture('controllers-only');
    const routes = loadControllersApplication();
    expect(typeof routes['get /home/:id']).toBe('function');
  });

  it('treats a key starting with "/" as an absolute route, unnamespaced', () => {
    const loadControllersApplication = loadWithFixture('controllers-only');
    const routes = loadControllersApplication();
    expect(typeof routes['get /absolute/path']).toBe('function');
  });

  it('defaults to GET and joins segments when the first token is not an HTTP method', () => {
    const loadControllersApplication = loadWithFixture('controllers-only');
    const routes = loadControllersApplication();
    expect(typeof routes['get /home/edit/:id']).toBe('function');
  });

  it('kebab-cases a multi-word PascalCase controller name', () => {
    const loadControllersApplication = loadWithFixture('controllers-only');
    const routes = loadControllersApplication();
    expect(typeof routes['get /my-account/']).toBe('function');
  });

  it('namespaces a controller under its module subfolder', () => {
    const loadControllersApplication = loadWithFixture('controllers-only');
    const routes = loadControllersApplication();
    expect(typeof routes['get /api/product/']).toBe('function');
  });

  it('namespaces a controller nested two module levels deep', () => {
    const loadControllersApplication = loadWithFixture('controllers-only');
    const routes = loadControllersApplication();
    expect(typeof routes['get /api/config/vat-types/']).toBe('function');
  });

  it('merges scaffold CRUD routes in without overriding a user-defined method', async () => {
    const loadControllersApplication = loadWithFixture('controllers-only');
    const routes = loadControllersApplication();

    // scaffold-generated route, no matching user override
    expect(typeof routes['post /scaffolded/']).toBe('function');
    expect(typeof routes['delete /scaffolded/:id']).toBe('function');

    // user-defined get() must win over the scaffold-generated one
    const res = { vsr: jest.fn() };
    routes['get /scaffolded/']({}, res);
    await expect(res.vsr.mock.calls[0][0]).resolves.toEqual({ overridden: true });
  });

  it('throws at load time when scaffold references a model missing from global scope', () => {
    expect(() => loadWithFixture('controllers-throws')()).toThrow(/MissingModel/);
  });

});
