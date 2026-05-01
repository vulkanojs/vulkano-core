module.exports = {
  testEnvironment: 'node',
  globalSetup: './test/global-setup.js',
  globalTeardown: './test/global-teardown.js',
  testMatch: ['<rootDir>/test/integration/**/*.test.js'],
  testTimeout: 30000,
  verbose: true,
  forceExit: true
};
