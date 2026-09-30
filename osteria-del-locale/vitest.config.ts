/// <reference types="vitest" />
import { defineConfig } from 'vite';

export default defineConfig({
  test: {
    environment: 'jsdom',
    globals: false,
    setupFiles: ['./src/test/setup.ts'],
    css: false,
    include: ['src/**/*.test.ts', 'src/**/*.test.tsx', 'spike/**/*.test.ts', 'tools/**/*.test.ts'],
    restoreMocks: true,
  },
});