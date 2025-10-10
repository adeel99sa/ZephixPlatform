/** @type {import('jest').Config} */
module.exports = {
  testEnvironment: 'node',
  roots: ['<rootDir>'],
  transform: { '^.+\\.tsx?$': 'ts-jest' },
  moduleFileExtensions: ['ts', 'tsx', 'js', 'json'],
  moduleNameMapper: { '^src/(.*)$': '<rootDir>/src/$1' }, // <-- fixed key
  testMatch: ['**/test/**/*.spec.ts', '**/test/**/*.test.ts'],
  collectCoverageFrom: ['src/**/*.(t|j)s'],
};
