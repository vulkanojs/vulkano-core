/**
 * Upload lib — validates, moves and returns the local path of an uploaded file
 * Endpoint under test: POST /test/uploadfile (test/fixtures/app/controllers/TestController.js)
 */

const path = require('node:path');
const fs = require('node:fs');
require('dotenv').config({ path: path.join(__dirname, '../../.env.test'), quiet: !process.env.DOTENV_VERBOSE });

const BASE_URL = `${process.env.TEST_SERVER_URL}/test/uploadfile`;
const MULTI_URL = `${process.env.TEST_SERVER_URL}/test/uploadfiles`;

// Fixed filenames this suite expects to land under a clean name — remove
// any leftovers from a previous run so collision assertions stay accurate.
const FILES_DIR = path.join(__dirname, '../fixtures/public/files');
const FIXED_NAMES = ['my-report__final_.png', 'my-custom-name.png', 'collide.png'];

describe('Upload lib', () => {

  beforeAll(() => {
    FIXED_NAMES.forEach((name) => {
      fs.rmSync(path.join(FILES_DIR, name), { force: true });
    });
  });

  it('saves an allowed file and returns its local name and path', async () => {
    const form = new FormData();
    form.append('file', new Blob(['fake-png-bytes'], { type: 'image/png' }), 'photo.png');

    const res = await fetch(BASE_URL, { method: 'POST', body: form });
    const data = await res.json();

    expect(res.status).toBe(200);
    expect(data.success).toBe(true);
    expect(data.data.name).toMatch(/\.png$/);
    expect(data.data.path).toContain('files');
  });

  it('rejects a disallowed extension with 400', async () => {
    const form = new FormData();
    form.append('file', new Blob(['zip-bytes'], { type: 'application/zip' }), 'archive.zip');

    const res = await fetch(BASE_URL, { method: 'POST', body: form });
    const data = await res.json();

    expect(res.status).toBe(400);
    expect(data.success).toBe(false);
    expect(data.error.detail).toMatch(/extension file is not allowed/i);
  });

  it('rejects an invalid mimetype with 400', async () => {
    const form = new FormData();
    form.append('file', new Blob(['bin'], { type: 'application/x-msdownload' }), 'app.exe');

    const res = await fetch(BASE_URL, { method: 'POST', body: form });
    const data = await res.json();

    expect(res.status).toBe(400);
    expect(data.error.detail).toMatch(/MIME type/i);
  });

  it('rejects a file exceeding maxSize with 400', async () => {
    const form = new FormData();
    form.append('file', new Blob(['0123456789'], { type: 'image/png' }), 'big.png');

    const res = await fetch(`${BASE_URL}?maxSize=5`, { method: 'POST', body: form });
    const data = await res.json();

    expect(res.status).toBe(400);
    expect(data.error.detail).toMatch(/maximum allowed size/i);
  });

  it('translates the error message when lang=es is passed', async () => {
    const form = new FormData();
    form.append('file', new Blob(['zip-bytes'], { type: 'application/zip' }), 'archive.zip');

    const res = await fetch(`${BASE_URL}?lang=es`, { method: 'POST', body: form });
    const data = await res.json();

    expect(res.status).toBe(400);
    expect(data.error.detail).toMatch(/extensión del archivo no está permitida/i);
  });

  it('strips <script> and inline event handlers from an uploaded SVG', async () => {
    const svg = '<svg onload="alert(1)"><script>alert(2)</script><circle r="5"/></svg>';
    const form = new FormData();
    form.append('file', new Blob([svg], { type: 'image/svg+xml' }), 'icon.svg');

    const res = await fetch(BASE_URL, { method: 'POST', body: form });
    const data = await res.json();

    expect(res.status).toBe(200);
    expect(data.data.name).toMatch(/\.svg$/);

    const saved = await require('node:fs').promises.readFile(data.data.path, 'utf8');
    expect(saved).not.toMatch(/<script/i);
    expect(saved).not.toMatch(/onload/i);
    expect(saved).toMatch(/<circle/);
  });

  describe('rename strategies', () => {

    it('keeps the sanitized original name when rename is not set', async () => {
      const form = new FormData();
      form.append('file', new Blob(['x'], { type: 'image/png' }), 'my-report (final).png');

      const res = await fetch(BASE_URL, { method: 'POST', body: form });
      const data = await res.json();

      expect(res.status).toBe(200);
      expect(data.data.name).toBe('my-report__final_.png');
    });

    it('uses a uuid name when rename=true', async () => {
      const form = new FormData();
      form.append('file', new Blob(['x'], { type: 'image/png' }), 'photo.png');

      const res = await fetch(`${BASE_URL}?rename=uuid`, { method: 'POST', body: form });
      const data = await res.json();

      expect(res.status).toBe(200);
      expect(data.data.name).toMatch(/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}\.png$/);
    });

    it('uses the custom name from a rename function', async () => {
      const form = new FormData();
      form.append('file', new Blob(['x'], { type: 'image/png' }), 'photo.png');

      const res = await fetch(`${BASE_URL}?rename=custom`, { method: 'POST', body: form });
      const data = await res.json();

      expect(res.status).toBe(200);
      expect(data.data.name).toBe('my-custom-name.png');
    });

    it('appends a suffix instead of overwriting when the sanitized name already exists', async () => {
      const upload = () => {
        const form = new FormData();
        form.append('file', new Blob(['x'], { type: 'image/png' }), 'collide.png');
        return fetch(BASE_URL, { method: 'POST', body: form }).then((r) => r.json());
      };

      const first = await upload();
      const second = await upload();

      expect(first.data.name).toBe('collide.png');
      expect(second.data.name).not.toBe('collide.png');
      expect(second.data.name).toMatch(/^collide_[0-9a-f]{6}\.png$/);
    });

  });

  it('returns 400 when no file is sent', async () => {
    const form = new FormData();
    form.append('name', 'no file here');

    const res = await fetch(BASE_URL, { method: 'POST', body: form });
    const data = await res.json();

    expect(res.status).toBe(400);
    expect(data.error.detail).toMatch(/could not be uploaded/i);
  });

  describe('multiple upload — Upload.files()', () => {

    it('saves every file sent and returns one entry per file', async () => {
      const form = new FormData();
      form.append('file', new Blob(['aaa'], { type: 'image/png' }), 'a.png');
      form.append('file', new Blob(['bbbb'], { type: 'image/webp' }), 'b.webp');

      const res = await fetch(MULTI_URL, { method: 'POST', body: form });
      const data = await res.json();

      expect(res.status).toBe(200);
      expect(data.data).toHaveLength(2);
      expect(data.data[0].name).toMatch(/\.png$/);
      expect(data.data[1].name).toMatch(/\.webp$/);
    });

    it('rejects the whole batch if one file is invalid', async () => {
      const form = new FormData();
      form.append('file', new Blob(['aaa'], { type: 'image/png' }), 'a.png');
      form.append('file', new Blob(['bbb'], { type: 'application/zip' }), 'b.zip');

      const res = await fetch(MULTI_URL, { method: 'POST', body: form });
      const data = await res.json();

      expect(res.status).toBe(400);
      expect(data.error.detail).toMatch(/extension file is not allowed/i);
    });

    it('returns 400 when no files are sent', async () => {
      const form = new FormData();
      form.append('name', 'no file here');

      const res = await fetch(MULTI_URL, { method: 'POST', body: form });
      const data = await res.json();

      expect(res.status).toBe(400);
      expect(data.error.detail).toMatch(/could not be uploaded/i);
    });

  });

});
