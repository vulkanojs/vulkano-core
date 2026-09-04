/**
 * bootstrap/engines/index.js — unit tests
 * Engine selection/dispatch logic. The actual nunjucks/handlebars wiring
 * modules are mocked out so this stays focused on setupViewEngine() itself.
 */

jest.mock('../../../../bootstrap/views', () => ({
  path: '/fake/views',
  ext: '.html'
}));

jest.mock('../../../../bootstrap/engines/nunjucks', () => jest.fn());
jest.mock('../../../../bootstrap/engines/handlebars', () => jest.fn());

const setupNunjucks = require('../../../../bootstrap/engines/nunjucks');
const setupHandlebars = require('../../../../bootstrap/engines/handlebars');
const setupViewEngine = require('../../../../bootstrap/engines/index');

describe('setupViewEngine', () => {

  let vulkano;

  beforeEach(() => {
    jest.clearAllMocks();
    vulkano = { set: jest.fn() };
    global.app = { PRODUCTION: false, server: {} };
  });

  it('defaults to the nunjucks engine when none is configured', () => {
    const engine = setupViewEngine(vulkano);
    expect(engine).toBe('nunjucks');
    expect(setupNunjucks).toHaveBeenCalledWith(vulkano, expect.objectContaining({ path: '/fake/views' }));
    expect(setupHandlebars).not.toHaveBeenCalled();
  });

  it('sets the express "views" path', () => {
    setupViewEngine(vulkano);
    expect(vulkano.set).toHaveBeenCalledWith('views', '/fake/views');
  });

  it('dispatches to handlebars when app.server.views.engine overrides it', () => {
    global.app.server.views = { engine: 'handlebars' };
    const engine = setupViewEngine(vulkano);
    expect(engine).toBe('handlebars');
    expect(setupHandlebars).toHaveBeenCalledWith(vulkano, expect.objectContaining({ engine: 'handlebars' }), '.html');
    expect(setupNunjucks).not.toHaveBeenCalled();
  });

  it('throws on an unsupported engine name', () => {
    global.app.server.views = { engine: 'pug' };
    expect(() => setupViewEngine(vulkano)).toThrow(/unsupported view engine "pug"/);
  });

});
