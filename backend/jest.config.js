module.exports = {
  testEnvironment: 'node',
  testMatch: ['**/tests/**/*.test.js'],
  collectCoverageFrom: [
    'controllers/**/*.js',
    'services/**/*.js',
    'middleware/**/*.js',
    'models/**/*.js',
    '!**/node_modules/**',
  ],
  coverageThreshold: {
    global: { branches: 30, functions: 40, lines: 40, statements: 40 },
  },
  testTimeout: 30000,
  setupFilesAfterFramework: [],
  verbose: true,
};
