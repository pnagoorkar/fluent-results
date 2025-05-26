// jest.config.ts

import { createDefaultPreset } from 'ts-jest';

const tsJestTransformCfg = createDefaultPreset().transform;

/** @type {import('jest').Config} */
export default {
  // ── core ──────────────────────────────────────────────
  preset: 'ts-jest',
  testEnvironment: 'node',
  testMatch: ['**/tests/**/*.test.ts'],
  transform: {
    ...tsJestTransformCfg,
  },

  // ── coverage ──────────────────────────────────────────
  collectCoverage: true,                 // turn instrumentation on
  collectCoverageFrom: [
    'src/**/*.{ts,tsx}',                 // cover *all* source files …
    '!src/**/*.spec.ts',                 // …but skip test files
    '!src/**/*.test.ts',
  ],
  coverageReporters: ['text', 'lcov', 'html'], // CLI, Codecov, and local HTML
  coverageDirectory: 'coverage',               // (default, explicit for clarity)

  // Fail the run if coverage drops below these thresholds
  coverageThreshold: {
    global: {
      lines: 90,
      statements: 90,
      branches: 80,
      functions: 90,
    },
  },
};
