/// <reference types="vitest/config" />
import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';

// Port 8765 matches the prototype's preview, so existing `kw2` browser data carries over.
export default defineConfig({
  plugins: [react()],
  server: { port: 8765, strictPort: true },
  preview: { port: 8765, strictPort: true },
  test: { include: ['tests/**/*.test.ts'], environment: 'node' },
});
