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
  coverageReporters: ['text', 'lcov', 'json-summary'],
  collectCoverageFrom: [
    'src/**/*.ts',
    '!src/servidor.ts',
    '!src/utils/registrador.ts',
    '!src/banco/conexao.ts',
    '!src/eventos/tipos.ts',
  ],
};
