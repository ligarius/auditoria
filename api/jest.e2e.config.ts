import type { Config } from 'jest';

const config: Config = {
  preset: 'ts-jest',
  testEnvironment: 'node',
  roots: ['<rootDir>/src/tests/e2e'],
  testMatch: ['**/*.e2e-spec.ts'],
  globalSetup: '<rootDir>/src/tests/e2e/setup.ts',
  globalTeardown: '<rootDir>/src/tests/e2e/teardown.ts',
  globals: {
    'ts-jest': {
      diagnostics: false
    }
  },
  moduleNameMapper: {
    '^@core/(.*)$': '<rootDir>/src/core/$1',
    '^@modules/(.*)$': '<rootDir>/src/modules/$1',
    '^(\\.{1,2}/.*)\\.js$': '$1'
  }
};

export default config;
