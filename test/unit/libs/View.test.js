/**
 * View — unit tests
 */

const View = require('../../../libs/View');

describe('View.render', () => {

  beforeEach(() => {
    global.app = { vulkano: { render: jest.fn() } };
  });

  it('resolves with the rendered HTML on success', async () => {
    global.app.vulkano.render.mockImplementation((view, data, cb) => cb(null, '<h1>ok</h1>'));

    await expect(View.render('home', { title: 'ok' })).resolves.toBe('<h1>ok</h1>');
    expect(global.app.vulkano.render).toHaveBeenCalledWith('home', { title: 'ok' }, expect.any(Function));
  });

  it('rejects with the error when rendering fails', async () => {
    const renderError = new Error('template not found');
    global.app.vulkano.render.mockImplementation((view, data, cb) => cb(renderError));

    await expect(View.render('missing', {})).rejects.toBe(renderError);
  });

});
