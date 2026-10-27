import { defineConfig, mergeConfig } from 'vitest/config';
import viteConfig from './vite.config.mjs';

export default mergeConfig(
  viteConfig,
  defineConfig({
    test: {
      environment: 'jsdom',
      globals: true,
      setupFiles: ['./src/setupTests.js'],
      coverage: {
        provider: 'v8',
        reporter: ['text', 'lcov'],
        exclude: ['src/setupTests.js', 'src/test-utils/**', 'cypress/**'],
      },
    },
  })
);
