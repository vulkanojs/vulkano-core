/**
 * Vite — unit tests
 * Uses a real temp directory as ABS_PATH so fs reads/writes are genuine.
 */

const fs = require('node:fs');
const os = require('node:os');
const path = require('node:path');

const Vite = require('../../../libs/Vite');

describe('Vite.init', () => {

  let tmpDir;
  let viteFolder;
  const originalNodeEnv = process.env.NODE_ENV;

  beforeEach(() => {
    tmpDir = fs.mkdtempSync(path.join(os.tmpdir(), 'vite-test-'));
    viteFolder = path.join(tmpDir, 'public/.vite');
    fs.mkdirSync(viteFolder, { recursive: true });
    global.ABS_PATH = tmpDir;
  });

  afterEach(() => {
    fs.rmSync(tmpDir, { recursive: true, force: true });
    process.env.NODE_ENV = originalNodeEnv;
  });

  it('returns empty inputs when no manifest file exists', () => {
    process.env.NODE_ENV = 'production';
    const result = Vite.init();
    expect(result).toEqual({ env: 'production', url: '', inputs: {} });
  });

  it('reads manifest.json in production and wraps it under inputs when it has no url', () => {
    process.env.NODE_ENV = 'production';
    fs.writeFileSync(
      path.join(viteFolder, 'manifest.json'),
      JSON.stringify({ 'app.js': { file: 'js/app.js', name: 'app', isEntry: true } })
    );

    const result = Vite.init();
    expect(result.env).toBe('production');
    expect(result.url).toBe('');
    expect(result.inputs['app.js'].file).toBe('js/app.js');
  });

  it('spreads the manifest as-is when it carries its own url (dev-server manifest)', () => {
    process.env.NODE_ENV = 'development';
    fs.writeFileSync(
      path.join(viteFolder, 'manifest.json'),
      JSON.stringify({ url: 'http://127.0.0.1:5173/', inputs: { app: 'frontend/app.js' } })
    );

    const result = Vite.init();
    expect(result).toEqual({
      env: 'development',
      url: 'http://127.0.0.1:5173/',
      inputs: { app: 'frontend/app.js' }
    });
  });

  it('prefers the env-specific manifest over the base one outside production', () => {
    process.env.NODE_ENV = 'development';
    fs.writeFileSync(path.join(viteFolder, 'manifest.json'), JSON.stringify({ 'base.js': {} }));
    fs.writeFileSync(path.join(viteFolder, 'manifest.development.json'), JSON.stringify({ 'dev.js': {} }));

    const result = Vite.init();
    expect(result.inputs).toEqual({ 'dev.js': {} });
  });

  it('accepts a custom buildPath', () => {
    process.env.NODE_ENV = 'production';
    const customFolder = path.join(tmpDir, 'dist/.vite');
    fs.mkdirSync(customFolder, { recursive: true });
    fs.writeFileSync(path.join(customFolder, 'manifest.json'), JSON.stringify({ 'app.js': {} }));

    const result = Vite.init('dist/.vite');
    expect(result.inputs).toEqual({ 'app.js': {} });
  });

});
