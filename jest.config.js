module.exports = {
  verbose: true,
  forceExit: true,
  testTimeout: 30000,
  maxWorkers: 1,
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
    },
    {
      displayName: 'integration-hbs',
      testEnvironment: 'node',
      globalSetup: '<rootDir>/test/global-setup-hbs.js',
      globalTeardown: '<rootDir>/test/global-teardown-hbs.js',
      testMatch: ['<rootDir>/test/integration-hbs/**/*.test.js']
    }
  ]
};
