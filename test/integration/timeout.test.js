/**
 * Request timeout — server responds 503 when a request exceeds the configured limit
 */

const { spawn } = require('node:child_process');
const path = require('node:path');
const dotenv = require('dotenv');

dotenv.config({ path: path.join(__dirname, '../../.env.test'), quiet: true });

const TIMEOUT_PORT = 9878;
const SLOW_TIMEOUT = 300; // ms — server kills the request after 300ms
const SERVER_URL   = `http://localhost:${TIMEOUT_PORT}`;

let serverProcess;

beforeAll(async () => {
  await new Promise((resolve, reject) => {
    serverProcess = spawn('node', [path.join(__dirname, '../fixtures/server.js')], {
      env: {
        ...process.env,
        NODE_ENV: 'test',
        TEST_PORT: String(TIMEOUT_PORT),
        TEST_DB_URI: process.env.TEST_DB_URI,
        TEST_TIMEOUT: String(SLOW_TIMEOUT)
      },
      stdio: ['ignore', 'pipe', 'pipe']
    });

    serverProcess.stdout.on('data', (chunk) => {
      if (String(chunk).includes('VULKANO_TEST_READY')) resolve();
    });

    serverProcess.on('error', reject);
    serverProcess.on('exit', (code) => {
      if (code !== 0 && code !== null) reject(new Error(`Server exited with code ${code}`));
    });

    setTimeout(() => reject(new Error('Timeout server start timed out')), 15000);
  });
}, 20000);

afterAll(async () => {
  if (!serverProcess) return;
  await new Promise((resolve) => {
    serverProcess.on('exit', resolve);
    serverProcess.kill();
  });
});

describe('Request timeout', () => {

  it('slow endpoint returns 503 after timeout', async () => {
    const res = await fetch(`${SERVER_URL}/test/slow`, {
      signal: AbortSignal.timeout(SLOW_TIMEOUT + 2000)
    });
    expect(res.status).toBe(503);
  });

  it('503 body has the standard error shape', async () => {
    const res = await fetch(`${SERVER_URL}/test/slow`, {
      signal: AbortSignal.timeout(SLOW_TIMEOUT + 2000)
    });
    const data = await res.json();
    expect(data.success).toBe(false);
    expect(data.statusCode).toBe(503);
    expect(data.error.detail).toBe('Request timeout');
  });

  it('fast endpoints still resolve normally', async () => {
    const res = await fetch(`${SERVER_URL}/test`);
    expect(res.status).toBe(200);
  });

});
