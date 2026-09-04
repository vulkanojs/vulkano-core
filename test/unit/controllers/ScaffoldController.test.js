/**
 * ScaffoldController — unit tests
 * Generates CRUD route handlers for a controller with `scaffold: 'ModelName'`.
 */

const scaffoldController = require('../../../controllers/ScaffoldController');

describe('ScaffoldController', () => {

  const originalMongoUri = process.env.MONGO_URI;

  beforeEach(() => {
    delete process.env.MONGO_URI;
    global.app = { config: { settings: { database: { connection: 'MONGO_URI' } } } };
  });

  afterEach(() => {
    if (originalMongoUri === undefined) {
      delete process.env.MONGO_URI;
    } else {
      process.env.MONGO_URI = originalMongoUri;
    }
    delete global.Product;
  });

  it('returns {} when there is no database connection configured', () => {
    global.app.config.settings.database.connection = undefined;
    global.Product = { create: () => {}, update: () => {} };

    expect(scaffoldController('Product')).toEqual({});
  });

  it('falls back to process.env.MONGO_URI when no connection is configured', () => {
    global.app.config.settings.database.connection = undefined;
    process.env.MONGO_URI = 'mongodb://localhost/test';
    global.Product = { create: () => {}, update: () => {} };

    expect(Object.keys(scaffoldController('Product')).length).toBeGreaterThan(0);
  });

  it('returns {} when no modelName is given', () => {
    expect(scaffoldController()).toEqual({});
  });

  it('returns {} when the model is missing create/update methods', () => {
    global.Product = {};
    expect(scaffoldController('Product')).toEqual({});
  });

  describe('with a valid model', () => {

    let req;
    let res;

    beforeEach(() => {
      global.Product = {
        create: jest.fn().mockResolvedValue({ id: 1 }),
        update: jest.fn().mockResolvedValue({ id: 1 }),
        getAllProduct: jest.fn().mockResolvedValue([]),
        getProduct: jest.fn().mockResolvedValue({ id: 1 }),
        delete: jest.fn().mockResolvedValue(true)
      };
      req = { query: {}, params: { id: '1' }, body: { name: 'x' } };
      res = { vsr: jest.fn() };
    });

    it('generates all 6 CRUD routes', () => {
      const routes = scaffoldController('Product');
      expect(Object.keys(routes).sort()).toEqual(
        ['delete :id', 'get', 'get :id', 'patch :id', 'post', 'put :id'].sort()
      );
    });

    it('get() delegates to Model.getAllModelName(req.query)', () => {
      const routes = scaffoldController('Product');
      routes.get(req, res);
      expect(global.Product.getAllProduct).toHaveBeenCalledWith({});
      expect(res.vsr).toHaveBeenCalledWith(expect.any(Promise));
    });

    it('"get :id" delegates to Model.getModelName(id)', () => {
      const routes = scaffoldController('Product');
      routes['get :id'](req, res);
      expect(global.Product.getProduct).toHaveBeenCalledWith('1');
    });

    it('post() delegates to Model.create(body) with status 201', () => {
      const routes = scaffoldController('Product');
      routes.post(req, res);
      expect(global.Product.create).toHaveBeenCalledWith({ name: 'x' });
      expect(res.vsr).toHaveBeenCalledWith(expect.any(Promise), 201);
    });

    it('"put :id" delegates to Model.update(id, body) with status 202', () => {
      const routes = scaffoldController('Product');
      routes['put :id'](req, res);
      expect(global.Product.update).toHaveBeenCalledWith('1', { name: 'x' });
      expect(res.vsr).toHaveBeenCalledWith(expect.any(Promise), 202);
    });

    it('"delete :id" delegates to Model.delete(id) with status 204', () => {
      const routes = scaffoldController('Product');
      routes['delete :id'](req, res);
      expect(global.Product.delete).toHaveBeenCalledWith('1');
      expect(res.vsr).toHaveBeenCalledWith(expect.any(Promise), 204);
    });

    it('restricts routes when allowedMethods is an array', () => {
      const routes = scaffoldController('Product', ['get', 'post']);
      expect(Object.keys(routes).sort()).toEqual(['get', 'get :id', 'post'].sort());
    });

    it('restricts routes when allowedMethods is a comma-separated string', () => {
      const routes = scaffoldController('Product', 'put, delete');
      expect(Object.keys(routes).sort()).toEqual(['delete :id', 'put :id'].sort());
    });

  });

});
