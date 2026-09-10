/**
 * ScaffoldController — unit tests
 * Generates CRUD route handlers for a controller with `scaffold: 'ModelName'`.
 */

const scaffoldController = require('../../../controllers/ScaffoldController');

global.VSError = require('../../../libs/VSError');

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

    describe('subdocs (opt-in via the `subdocs` array)', () => {

      it('generates no subdoc routes when subdocs is omitted', () => {
        const routes = scaffoldController('Product');
        expect(routes['post :id/:key']).toBeUndefined();
        expect(routes['get :id/:key/:subId?']).toBeUndefined();
        expect(routes['put :id/:key/:subId']).toBeUndefined();
        expect(routes['delete :id/:key/:subId']).toBeUndefined();
      });

      it('generates no subdoc routes when subdocs is an empty array', () => {
        const routes = scaffoldController('Product', undefined, []);
        expect(routes['post :id/:key']).toBeUndefined();
      });

      it('generates the 4 subdoc routes when subdocs has at least one key', () => {
        const routes = scaffoldController('Product', undefined, ['reviews']);
        expect(routes['post :id/:key']).toBeInstanceOf(Function);
        expect(routes['get :id/:key/:subId?']).toBeInstanceOf(Function);
        expect(routes['put :id/:key/:subId']).toBeInstanceOf(Function);
        expect(routes['delete :id/:key/:subId']).toBeInstanceOf(Function);
      });

      it('"post :id/:key" delegates to Model.createSubdoc(key, id, body) with status 201', () => {
        global.Product.createSubdoc = jest.fn().mockResolvedValue({ id: 'r1' });
        const routes = scaffoldController('Product', undefined, ['reviews']);
        routes['post :id/:key']({ ...req, params: { id: '1', key: 'reviews' } }, res);
        expect(global.Product.createSubdoc).toHaveBeenCalledWith('reviews', '1', { name: 'x' });
        expect(res.vsr).toHaveBeenCalledWith(expect.any(Promise), 201);
      });

      it('"get :id/:key/:subId?" with a subId delegates to Model.getSubdoc(key, id, subId)', () => {
        global.Product.getSubdoc = jest.fn().mockResolvedValue({ id: 'r1' });
        const routes = scaffoldController('Product', undefined, ['reviews']);
        routes['get :id/:key/:subId?']({ params: { id: '1', key: 'reviews', subId: 'r1' } }, res);
        expect(global.Product.getSubdoc).toHaveBeenCalledWith('reviews', '1', 'r1');
      });

      it('"get :id/:key/:subId?" without a subId lists the whole array via getByField', () => {
        global.Product.getByField = jest.fn().mockResolvedValue({ reviews: [{ id: 'r1' }] });
        const routes = scaffoldController('Product', undefined, ['reviews']);
        routes['get :id/:key/:subId?']({ params: { id: '1', key: 'reviews' } }, res);
        expect(global.Product.getByField).toHaveBeenCalledWith('1');
      });

      it('"put :id/:key/:subId" delegates to Model.updateSubdoc(key, id, subId, body)', () => {
        global.Product.updateSubdoc = jest.fn().mockResolvedValue({ id: 'r1' });
        const routes = scaffoldController('Product', undefined, ['reviews']);
        routes['put :id/:key/:subId']({ ...req, params: { id: '1', key: 'reviews', subId: 'r1' } }, res);
        expect(global.Product.updateSubdoc).toHaveBeenCalledWith('reviews', '1', 'r1', { name: 'x' });
        expect(res.vsr).toHaveBeenCalledWith(expect.any(Promise), 202);
      });

      it('"delete :id/:key/:subId" delegates to Model.removeSubdoc(key, id, subId)', () => {
        global.Product.removeSubdoc = jest.fn().mockResolvedValue(true);
        const routes = scaffoldController('Product', undefined, ['reviews']);
        routes['delete :id/:key/:subId']({ params: { id: '1', key: 'reviews', subId: 'r1' } }, res);
        expect(global.Product.removeSubdoc).toHaveBeenCalledWith('reviews', '1', 'r1');
        expect(res.vsr).toHaveBeenCalledWith(expect.any(Promise), 204);
      });

      it('rejects with 404 when :key is not in the subdocs allowlist', async () => {
        global.Product.createSubdoc = jest.fn().mockResolvedValue({});
        const routes = scaffoldController('Product', undefined, ['reviews']);
        routes['post :id/:key']({ ...req, params: { id: '1', key: 'notAllowed' } }, res);
        expect(global.Product.createSubdoc).not.toHaveBeenCalled();
        expect(res.vsr).toHaveBeenCalledWith(expect.any(Promise));
        const rejectedPromise = res.vsr.mock.calls[0][0];
        await expect(rejectedPromise).rejects.toMatchObject({ statusCode: 404 });
      });

      describe('per-key method restriction (`{ key: [\'GET\', \'POST\'] }`)', () => {

        it('a plain string entry keeps all methods allowed', () => {
          global.Product.createSubdoc = jest.fn().mockResolvedValue({});
          const routes = scaffoldController('Product', undefined, ['reviews']);
          routes['post :id/:key']({ ...req, params: { id: '1', key: 'reviews' } }, res);
          expect(global.Product.createSubdoc).toHaveBeenCalled();
        });

        it('mixes plain string entries and restricted entries in the same array', () => {
          const routes = scaffoldController('Product', undefined, ['lines', { reviews: ['GET'] }]);
          expect(routes['post :id/:key']).toBeInstanceOf(Function);
          expect(routes['get :id/:key/:subId?']).toBeInstanceOf(Function);
        });

        it('allows a method listed for the key', () => {
          global.Product.getSubdoc = jest.fn().mockResolvedValue({ id: 'r1' });
          const routes = scaffoldController('Product', undefined, [{ reviews: ['GET'] }]);
          routes['get :id/:key/:subId?']({ params: { id: '1', key: 'reviews', subId: 'r1' } }, res);
          expect(global.Product.getSubdoc).toHaveBeenCalledWith('reviews', '1', 'r1');
        });

        it('rejects with 405 when the method is not listed for the key', async () => {
          global.Product.createSubdoc = jest.fn().mockResolvedValue({});
          const routes = scaffoldController('Product', undefined, [{ reviews: ['GET'] }]);
          routes['post :id/:key']({ ...req, params: { id: '1', key: 'reviews' } }, res);
          expect(global.Product.createSubdoc).not.toHaveBeenCalled();
          const rejectedPromise = res.vsr.mock.calls[0][0];
          await expect(rejectedPromise).rejects.toMatchObject({ statusCode: 405 });
        });

        it('method names in the allowlist are case-insensitive', () => {
          global.Product.createSubdoc = jest.fn().mockResolvedValue({});
          const routes = scaffoldController('Product', undefined, [{ reviews: ['get', 'post'] }]);
          routes['post :id/:key']({ ...req, params: { id: '1', key: 'reviews' } }, res);
          expect(global.Product.createSubdoc).toHaveBeenCalled();
        });

        it('restriction applies independently per key', async () => {
          global.Product.createSubdoc = jest.fn().mockResolvedValue({});
          const routes = scaffoldController('Product', undefined, ['lines', { reviews: ['GET'] }]);

          routes['post :id/:key']({ ...req, params: { id: '1', key: 'lines' } }, res);
          expect(global.Product.createSubdoc).toHaveBeenCalledWith('lines', '1', { name: 'x' });

          global.Product.createSubdoc.mockClear();
          routes['post :id/:key']({ ...req, params: { id: '1', key: 'reviews' } }, res);
          expect(global.Product.createSubdoc).not.toHaveBeenCalled();
          const rejectedPromise = res.vsr.mock.calls[res.vsr.mock.calls.length - 1][0];
          await expect(rejectedPromise).rejects.toMatchObject({ statusCode: 405 });
        });

      });

    });

  });

});
