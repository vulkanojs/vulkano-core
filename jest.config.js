module.exports = {
  verbose: true,
  forceExit: true,
  testTimeout: 30000,
  projects: [
    {
      displayName: 'unit',
      testEnvironment: 'node',
      testMatch: ['<rootDir>/test/unit/**/*.test.js']
    },
    {
      displayName: 'integration',
      testEnvironment: 'node',
      globalSetup: '<rootDir>/test/global-setup.js',
      globalTeardown: '<rootDir>/test/global-teardown.js',
      testMatch: ['<rootDir>/test/integration/**/*.test.js']
    }
  ]
};
