import type { Config } from '@jest/types';

const esModules = ["nanoid"].join("|");

const config: Config.InitialOptions = {
  preset: 'ts-jest',
  testEnvironment: 'jsdom',
  moduleNameMapper: {
    '^@/(.*)$': '<rootDir>/app/$1',
    "^nanoid(/(.*)|$)": "nanoid$1",
  },
  setupFilesAfterEnv: [
    '<rootDir>/jest.setup.ts',
  ],
  testMatch: [
    '**/__tests__/**/*.test.ts',
    '**/__tests__/**/*.test.tsx',
  ],
  transform: {
    '^.+\\.(ts|tsx)$': ['ts-jest', {
      tsconfig: 'tsconfig.json',
    }],
  },
  // Transform ESM modules like nanoid
  transformIgnorePatterns: [`/node_modules/(?!${esModules})`],
  // Additional settings for better test coverage and reporting
  collectCoverageFrom: [
    'app/**/*.{ts,tsx}',
    '!app/**/*.d.ts',
    '!app/**/*.stories.{ts,tsx}',
    '!app/**/_*.{ts,tsx}',
    '!app/**/types.ts',
  ],
  coverageThreshold: {
    global: {
      branches: 80,
      functions: 80,
      lines: 80,
      statements: 80,
    },
  },
  verbose: true,
  // Clear mocks between tests as per our test strategy
  clearMocks: true,
  resetMocks: false,
  restoreMocks: true,
}

export default config; 