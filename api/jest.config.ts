import type { Config } from 'jest';

const config: Config = {
  preset: 'ts-jest',
  testEnvironment: 'node',
  roots: ['<rootDir>/src/tests'],
  setupFiles: ['<rootDir>/src/tests/setup-env.ts'],
  collectCoverageFrom: [
    '<rootDir>/src/modules/risks/risk.service.ts',
    '<rootDir>/src/modules/receptions/reception.service.ts'
  ],
  moduleNameMapper: {
    '^@core/(.*)$': '<rootDir>/src/core/$1',
    '^@modules/(.*)$': '<rootDir>/src/modules/$1',
    '^(\\.{1,2}/.*)\\.js$': '$1'
  }
};

export default config;
