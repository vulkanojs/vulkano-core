/**
 * File Upload — multer integration tests
 * Verifies that multipart/form-data uploads reach the controller via upload.any()
 */

const path = require('node:path');
require('dotenv').config({ path: path.join(__dirname, '../../.env.test'), quiet: !process.env.DOTENV_VERBOSE });

const BASE_URL = `${process.env.TEST_SERVER_URL}/test/upload`;

describe('File upload — multer via upload.any()', () => {

  it('uploads a single text file and receives metadata', async () => {
    const form = new FormData();
    form.append('document', new Blob(['hello world'], { type: 'text/plain' }), 'hello.txt');

    const res = await fetch(BASE_URL, { method: 'POST', body: form });
    const data = await res.json();

    expect(res.status).toBe(200);
    expect(data.success).toBe(true);
    expect(data.data.uploaded).toBe(1);
    expect(data.data.files[0].originalname).toBe('hello.txt');
    expect(data.data.files[0].mimetype).toBe('text/plain');
    expect(data.data.files[0].size).toBe(11);
  });

  it('uploads multiple files in one request', async () => {
    const form = new FormData();
    form.append('file1', new Blob(['aaa'], { type: 'text/plain' }), 'a.txt');
    form.append('file2', new Blob(['bbbb'], { type: 'text/plain' }), 'b.txt');

    const res = await fetch(BASE_URL, { method: 'POST', body: form });
    const data = await res.json();

    expect(res.status).toBe(200);
    expect(data.data.uploaded).toBe(2);
    expect(data.data.files.map((f) => f.originalname)).toEqual(['a.txt', 'b.txt']);
  });

  it('returns uploaded: 0 when no files are sent', async () => {
    const form = new FormData();
    form.append('name', 'just a field, no file');

    const res = await fetch(BASE_URL, { method: 'POST', body: form });
    const data = await res.json();

    expect(res.status).toBe(200);
    expect(data.data.uploaded).toBe(0);
    expect(data.data.files).toHaveLength(0);
  });

  it('preserves fieldname from the form', async () => {
    const form = new FormData();
    form.append('avatar', new Blob(['img'], { type: 'image/png' }), 'photo.png');

    const res = await fetch(BASE_URL, { method: 'POST', body: form });
    const data = await res.json();

    expect(data.data.files[0].fieldname).toBe('avatar');
    expect(data.data.files[0].mimetype).toBe('image/png');
  });

});
