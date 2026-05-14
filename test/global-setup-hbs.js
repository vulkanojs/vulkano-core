const { spawn } = require('node:child_process');
const path = require('node:path');
const fs = require('node:fs');
const os = require('node:os');
const dotenv = require('dotenv');

dotenv.config({ path: path.join(__dirname, '.env.test'), quiet: !process.env.DOTENV_VERBOSE });

const TEST_PORT_HBS = process.env.TEST_PORT_HBS || 9879;
const PID_FILE = path.join(os.tmpdir(), 'vulkano-test-server-hbs.pid');

module.exports = async function globalSetupHbs() {

  await new Promise((resolve, reject) => {

    const server = spawn('node', [path.join(__dirname, 'fixtures-hbs/server.js')], {
      env: {
        ...process.env,
        NODE_ENV: 'test',
        TEST_PORT_HBS: String(TEST_PORT_HBS)
      },
      stdio: ['ignore', 'pipe', 'pipe']
    });

    server.stdout.on('data', (chunk) => {
      if (String(chunk).includes('VULKANO_TEST_READY')) {
        fs.writeFileSync(PID_FILE, String(server.pid));
        resolve();
      }
    });

    server.stderr.on('data', (chunk) => {
      // Uncomment to debug: console.error('[HBS Fixture]', String(chunk).trim());
    });

    server.on('error', reject);

    server.on('exit', (code) => {
      if (code !== 0 && code !== null) {
        reject(new Error(`HBS fixture server exited with code ${code}`));
      }
    });

    setTimeout(
      () => reject(new Error('HBS fixture server start timed out (20s)')),
      20000
    );

  });

  process.env.TEST_SERVER_HBS_URL = `http://localhost:${TEST_PORT_HBS}`;

};
