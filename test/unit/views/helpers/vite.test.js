/**
 * vite() helper — unit tests
 */

const viteHelper = require('../../../../views/helpers/vite');

describe('vite() helper', () => {

  beforeEach(() => {
    global.app = {
      config: { vite: { enabled: true } },
      pkg: { version: '1.0.0' }
    };
  });

  it('production: resolves exact entry by name, ignores substring collisions', () => {
    global.app.vite = {
      url: '',
      inputs: {
        'frontend/admin/app.js': { file: 'js/admin.js', name: 'admin', isEntry: true, css: ['css/admin.css'] },
        'frontend/website/app.js': { file: 'js/app.js', name: 'app', isEntry: true, css: ['css/app.css'] }
      }
    };

    const script = viteHelper({ entry: 'app', type: 'script' });
    expect(script).toContain('js/app.js');
    expect(script).not.toContain('admin.js');
  });

  it('production: resolves admin entry correctly too', () => {
    global.app.vite = {
      url: '',
      inputs: {
        'frontend/admin/app.js': { file: 'js/admin.js', name: 'admin', isEntry: true, css: ['css/admin.css'] },
        'frontend/website/app.js': { file: 'js/app.js', name: 'app', isEntry: true, css: ['css/app.css'] }
      }
    };

    const script = viteHelper({ entry: 'admin', type: 'script' });
    expect(script).toContain('js/admin.js');
  });

  it('dev: resolves exact short-key entry', () => {
    global.app.vite = {
      url: 'http://127.0.0.1:5173/',
      inputs: {
        app: 'frontend/website/app.js',
        admin: 'frontend/admin/app.js'
      }
    };

    const script = viteHelper({ entry: 'app', type: 'script' });
    expect(script).toContain('frontend/website/app.js');
    expect(script).not.toContain('admin');
  });

  it('ignores non-entry chunks sharing the same name', () => {
    global.app.vite = {
      url: '',
      inputs: {
        'frontend/website/app.js': { file: 'js/app.js', name: 'app', isEntry: true, css: [] },
        'chunks/vendor.js': { file: 'js/vendor.js', name: 'app', isEntry: false, css: [] }
      }
    };

    const script = viteHelper({ entry: 'app', type: 'script' });
    expect(script).toContain('js/app.js');
    expect(script).not.toContain('vendor.js');
  });

  it('returns invalid-entry comment when nothing matches', () => {
    global.app.vite = { url: '', inputs: {} };
    const script = viteHelper({ entry: 'missing', type: 'script' });
    expect(script).toContain('Invalid Entry missing');
  });

});
