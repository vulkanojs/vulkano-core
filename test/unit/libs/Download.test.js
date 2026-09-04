/**
 * Download — unit tests
 * Spins up a local HTTP server so no real network call is made.
 */

const http = require('node:http');
const fs = require('node:fs');
const os = require('node:os');
const path = require('node:path');

const Download = require('../../../libs/Download');

describe('Download', () => {

  let server;
  let baseUrl;
  let tmpDir;

  beforeAll((done) => {
    server = http.createServer((req, res) => {
      if (req.url === '/fail') {
        req.socket.destroy();
        return;
      }
      res.writeHead(200, { 'Content-Type': 'text/plain' });
      res.end('file contents');
    });
    server.listen(0, '127.0.0.1', () => {
      baseUrl = `http://127.0.0.1:${server.address().port}`;
      done();
    });
  });

  afterAll((done) => {
    server.close(done);
  });

  beforeEach(() => {
    tmpDir = fs.mkdtempSync(path.join(os.tmpdir(), 'download-test-'));
  });

  afterEach(() => {
    fs.rmSync(tmpDir, { recursive: true, force: true });
  });

  it('downloads the URL contents to the destination file', async () => {
    const dest = path.join(tmpDir, 'out.txt');

    await Download(`${baseUrl}/file.txt`, dest);

    expect(fs.readFileSync(dest, 'utf8')).toBe('file contents');
  });

  it('rejects when the connection is destroyed mid-download', async () => {
    const dest = path.join(tmpDir, 'fail.txt');

    await expect(Download(`${baseUrl}/fail`, dest)).rejects.toBeDefined();
  });

});
