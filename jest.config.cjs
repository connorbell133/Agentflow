const nextJest = require('next/jest')

const createJestConfig = nextJest({
  dir: './',
})

const customJestConfig = {
  setupFilesAfterEnv: ['<rootDir>/jest.setup.js'],
  testEnvironment: 'jest-environment-jsdom',
  moduleNameMapper: {
    '^@/(.*)$': '<rootDir>/src/$1',
  },
  testPathIgnorePatterns: [
    '<rootDir>/node_modules/',
    '<rootDir>/.next/',
    '<rootDir>/worktrees/',
    '<rootDir>/tests/e2e/',
  ],
  modulePathIgnorePatterns: [
    '<rootDir>/worktrees/',
  ],
  watchPathIgnorePatterns: [
    '<rootDir>/worktrees/',
  ],
  transformIgnorePatterns: [
    'node_modules/(?!(uuid)/)',
  ],
}

module.exports = createJestConfig(customJestConfig)