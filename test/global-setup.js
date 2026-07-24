const { spawn } = require('node:child_process');
const path = require('node:path');
const fs = require('node:fs');
const os = require('node:os');
const dotenv = require('dotenv');

dotenv.config({ path: path.join(__dirname, '../.env.test'), quiet: !process.env.DOTENV_VERBOSE });

const TEST_PORT = process.env.TEST_PORT || 9877;
const TEST_PORT_HBS = process.env.TEST_PORT_HBS || 9879;
const TEST_DB_URI = process.env.TEST_DB_URI;

function pidFile(name) {
  return path.join(os.tmpdir(), `vulkano-test-server-${name}.pid`);
}

// Spawns a fixture server instance (test/fixtures/server.js) as a child
// process and resolves once it prints its ready marker.
function spawnFixtureServer(name, extraEnv) {

  return new Promise((resolve, reject) => {

    const server = spawn('node', [path.join(__dirname, 'fixtures/server.js')], {
      env: {
        ...process.env,
        NODE_ENV: 'test',
        TEST_DB_URI,
        ...extraEnv
      },
      stdio: ['ignore', 'pipe', 'pipe']
    });

    server.stdout.on('data', (chunk) => {
      if (String(chunk).includes('VULKANO_TEST_READY')) {
        fs.writeFileSync(pidFile(name), String(server.pid));
        resolve();
      }
    });

    server.stderr.on('data', (chunk) => {
      // Uncomment to debug server startup: console.error(`[Fixture:${name}]`, String(chunk).trim());
    });

    server.on('error', reject);

    server.on('exit', (code) => {
      if (code !== 0 && code !== null) {
        reject(new Error(`Fixture server "${name}" exited with code ${code}`));
      }
    });

    setTimeout(
      () => reject(new Error(`Fixture server "${name}" start timed out (20s)`)),
      20000
    );

  });

}

module.exports = async function globalSetup() {

  if (!TEST_DB_URI) {
    throw new Error('TEST_DB_URI not set. Check core/.env.test');
  }

  // Drop test database for a clean state on every run
  const mongoose = require('mongoose');
  const conn = await mongoose.connect(TEST_DB_URI);
  await conn.connection.dropDatabase();
  await conn.connection.close();

  // Nunjucks fixture (default engine) + Handlebars fixture (VIEW_ENGINE=hbs)
  // — same app/server.js, see app/config/views/config.js
  await Promise.all([
    spawnFixtureServer('default', { TEST_PORT: String(TEST_PORT) }),
    spawnFixtureServer('hbs', { VIEW_ENGINE: 'hbs', TEST_PORT: String(TEST_PORT_HBS) })
  ]);

  process.env.TEST_SERVER_URL = `http://localhost:${TEST_PORT}`;
  process.env.TEST_SERVER_HBS_URL = `http://localhost:${TEST_PORT_HBS}`;

};
