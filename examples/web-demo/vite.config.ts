import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import { resolve } from 'path';

// https://vite.dev/config/
export default defineConfig({
  plugins: [react()],
  resolve: {
    alias: {
      '@spark-note-poc/sdk': resolve(__dirname, '../../bindings/javascript/dist'),
    },
  },
  optimizeDeps: {
    exclude: ['@spark-note-poc/sdk'],
  },
  server: {
    fs: {
      // Allow serving files from parent directories
      allow: ['..', '../..'],
    },
  },
});
