module.exports = {
  testEnvironment: 'node',
  transform: { '^.+\\.m?js$': 'babel-jest' },
  transformIgnorePatterns: ['/node_modules/'],
  testMatch: ['<rootDir>/tests/**/*.test.js'],
  setupFilesAfterEnv: ['<rootDir>/tests/setup.js'],
  moduleNameMapper: {
    'ioredis-client\\.js$': '<rootDir>/tests/__mocks__/ioredis-client.js',
  },
  coveragePathIgnorePatterns: ['/node_modules/', '/tests/'],
};
