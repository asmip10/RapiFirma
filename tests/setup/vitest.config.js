// tests/setup/vitest.config.js
import { defineConfig } from 'vitest/config';

export default defineConfig({
  testEnvironment: 'jsdom',
  setupFiles: ['./vitest.setup.js'],
  globals: true,
  coverage: {
    provider: 'v8',
    reporter: ['text', 'html', 'json'],
    exclude: [
      'node_modules/',
      'tests/',
      '**/*.config.js',
      '**/*.spec.js',
      '**/dist/',
      'coverage/'
    ],
    include: [
      'src/**/*.{js,vue}',
    ],
    thresholds: {
      global: {
        branches: 80,
        functions: 80,
        lines: 80,
        statements: 80
      }
    }
  }
});