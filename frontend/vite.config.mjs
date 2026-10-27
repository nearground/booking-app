import { defineConfig, transformWithEsbuild } from 'vite';
import react from '@vitejs/plugin-react';
import tsconfigPaths from 'vite-tsconfig-paths';
import { fileURLToPath, URL } from 'node:url';

export default defineConfig({
  plugins: [
    {
      name: 'treat-js-files-as-jsx',
      async transform(code, id) {
        if (!/src\/.*\.js$/.test(id)) {
          return null;
        }

        return transformWithEsbuild(code, id, {
          loader: 'jsx',
          jsx: 'automatic',
        });
      },
    },
    react(),
    tsconfigPaths(),
  ],
  optimizeDeps: {
    esbuildOptions: {
      loader: {
        '.js': 'jsx',
      },
    },
  },
  resolve: {
    alias: {
      assests: fileURLToPath(new URL('./src/assests', import.meta.url)),
      components: fileURLToPath(new URL('./src/components', import.meta.url)),
      contexts: fileURLToPath(new URL('./src/contexts', import.meta.url)),
      data: fileURLToPath(new URL('./src/data', import.meta.url)),
      hooks: fileURLToPath(new URL('./src/hooks', import.meta.url)),
      routes: fileURLToPath(new URL('./src/routes', import.meta.url)),
      services: fileURLToPath(new URL('./src/services', import.meta.url)),
      styles: fileURLToPath(new URL('./src/styles', import.meta.url)),
      utils: fileURLToPath(new URL('./src/utils', import.meta.url)),
    },
  },
  server: {
    allowedHosts: ['puertovallarta.today', '.puertovallarta.today'],
    host: '0.0.0.0',
    port: 3000,
    strictPort: true,
    proxy: {
      '/internal/docs/__internal': {
        target: process.env.DOCS_API_TARGET || 'http://localhost:3101',
        changeOrigin: true,
        rewrite: (requestPath) => requestPath.replace(/^\/internal\/docs\/__internal/, ''),
      },
      '/internal/docs': {
        target: process.env.DOCS_PROXY_TARGET || 'http://localhost:3100',
        changeOrigin: true,
        ws: true,
      },
      '/api': {
        target: process.env.API_PROXY_TARGET || 'http://localhost:4000',
        changeOrigin: true,
        configure(proxy) {
          proxy.on('proxyReq', (proxyReq) => {
            proxyReq.setHeader('origin', 'http://localhost:3000');
          });
        },
      },
    },
  },
  preview: {
    allowedHosts: ['puertovallarta.today', '.puertovallarta.today'],
    host: '0.0.0.0',
    port: 3000,
    strictPort: true,
  },
});
