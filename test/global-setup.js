const { spawn } = require('child_process');
const path = require('path');
const fs = require('fs');
const os = require('os');
const dotenv = require('dotenv');

dotenv.config({ path: path.join(__dirname, '../.env.test'), quiet: !process.env.DOTENV_VERBOSE });

const TEST_PORT = process.env.TEST_PORT || 9877;
const TEST_DB_URI = process.env.TEST_DB_URI;
const PID_FILE = path.join(os.tmpdir(), 'vulkano-test-server.pid');

module.exports = async function globalSetup() {

  if (!TEST_DB_URI) {
    throw new Error('TEST_DB_URI not set. Check core/.env.test');
  }

  // Drop test database for a clean state on every run
  const mongoose = require('mongoose');
  const conn = await mongoose.connect(TEST_DB_URI);
  await conn.connection.dropDatabase();
  await conn.connection.close();

  // Spawn fixture server as a child process
  await new Promise((resolve, reject) => {

    const server = spawn('node', [path.join(__dirname, 'fixtures/server.js')], {
      env: {
        ...process.env,
        NODE_ENV: 'test',
        TEST_PORT: String(TEST_PORT),
        TEST_DB_URI
      },
      stdio: ['ignore', 'pipe', 'pipe']
    });

    server.stdout.on('data', (chunk) => {
      const msg = String(chunk);
      if (msg.includes('VULKANO_TEST_READY')) {
        fs.writeFileSync(PID_FILE, String(server.pid));
        resolve();
      }
    });

    server.stderr.on('data', (chunk) => {
      // Uncomment to debug server startup: console.error('[Fixture]', String(chunk).trim());
    });

    server.on('error', reject);

    server.on('exit', (code) => {
      if (code !== 0 && code !== null) {
        reject(new Error(`Fixture server exited with code ${code}`));
      }
    });

    setTimeout(
      () => reject(new Error('Fixture server start timed out (20s)')),
      20000
    );

  });

  process.env.TEST_SERVER_URL = `http://localhost:${TEST_PORT}`;

};
