/** @type {import('jest').Config} */
module.exports = {
  preset: 'ts-jest',
  testEnvironment: 'node',
  roots: ['<rootDir>/testes'],
  testMatch: ['**/*.test.ts'],
  setupFiles: ['<rootDir>/testes/setup.ts'],
  transform: {
    '^.+\\.ts$': ['ts-jest', { tsconfig: '<rootDir>/tsconfig.test.json' }],
  },
  coverageDirectory: '<rootDir>/cobertura',
  collectCoverageFrom: ['src/**/*.ts', '!src/servidor.ts'],
};
