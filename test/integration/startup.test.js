/**
 * startVulkano() resolves only once the server is listening and the project's
 * after-start callback (app/config/bootstrap.js) ran — callers such as a test
 * helper await it as the readiness signal.
 */

const { spawn } = require('node:child_process');
const path = require('node:path');

const PORT = process.env.TEST_PORT_STARTUP || 9887;

function runProbe() {
  return new Promise((resolve, reject) => {
    const child = spawn('node', [path.join(__dirname, '../fixtures/startup-probe.js')], {
      env: { ...process.env, NODE_ENV: 'test', PORT: String(PORT), TEST_PORT: String(PORT) },
      stdio: ['ignore', 'pipe', 'pipe']
    });

    let out = '';
    child.stdout.on('data', (chunk) => {
      out += String(chunk);
    });
    child.on('error', reject);
    child.on('exit', () => {
      const line = out.split('\n').find((l) => l.startsWith('PROBE '));
      resolve(line ? JSON.parse(line.slice(6)) : { output: out });
    });
  });
}

describe('startVulkano()', () => {

  test('resolves after the server listens and the after-start callback ran', async () => {
    const result = await runProbe();

    expect(result).toEqual({ afterStartRan: true, status: expect.any(Number), error: null });
  }, 30000);

});
