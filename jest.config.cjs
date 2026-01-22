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
    '<rootDir>/src/actions/auth/profile-sync.test.ts',
    '<rootDir>/src/app/api/clerk/webhook/route.test.ts',
    '<rootDir>/src/app/api/admin/analytics/route.test.ts',
    '<rootDir>/src/__tests__/security/tenant-isolation.test.ts',
    '<rootDir>/src/providers/ProfileCompletionProvider.test.tsx',
    '<rootDir>/src/components/features/chat/web/ModelDropdown/ModelDropdown.test.tsx',
    '<rootDir>/src/components/features/admin/management/UserTable/__tests__/UserTable.test.tsx',
    '<rootDir>/src/hooks/auth/__tests__/useUser.test.tsx',
    '<rootDir>/src/hooks/auth/__tests__/useUsers.test.tsx',
    '<rootDir>/src/components/features/chat/web/ChatBox/ChatBox.test.tsx',
  ],
  modulePathIgnorePatterns: [
    '<rootDir>/worktrees/',
  ],
  watchPathIgnorePatterns: [
    '<rootDir>/worktrees/',
  ],
  transformIgnorePatterns: [
    'node_modules/(?!(uuid|@clerk)/)',
  ],
}

module.exports = createJestConfig(customJestConfig)