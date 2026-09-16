const path = require('node:path');
const dotenv = require('dotenv');

dotenv.config({ path: path.join(__dirname, '.env.test'), quiet: true });

const projects = [
  {
    displayName: 'unit',
    testEnvironment: 'node',
    testMatch: ['<rootDir>/test/unit/**/*.test.js']
  }
];

// The integration project spins up a real MongoDB (drops/rebuilds the test
// database) via test/global-setup.js — it needs TEST_DB_URI. Without it,
// skip the project entirely instead of hard-failing the whole `npm test`
// run (unit tests don't touch a database and should always be runnable).
if (process.env.TEST_DB_URI) {
  projects.push({
    displayName: 'integration',
    testEnvironment: 'node',
    globalSetup: '<rootDir>/test/global-setup.js',
    globalTeardown: '<rootDir>/test/global-teardown.js',
    testMatch: ['<rootDir>/test/integration/**/*.test.js']
  });
} else {
  console.log(
    ' \x1b[33mWARNING\x1b[0m: TEST_DB_URI not set (check core/.env.test) — skipping integration tests.'
  );
}

module.exports = {
  verbose: true,
  forceExit: true,
  testTimeout: 30000,
  maxWorkers: 1,
  projects
};
