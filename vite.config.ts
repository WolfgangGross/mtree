import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import { mtree } from './engine/vite/plugin.ts';

export default defineConfig({
  plugins: [react(), mtree()],
  server: { port: 5199 },
  preview: { port: 5198 },
  // React, KaTeX and marked together are ~650 kB; fine for a personal site.
  build: { chunkSizeWarningLimit: 1000 },
});
