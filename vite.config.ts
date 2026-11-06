/// <reference types="vitest/config" />
import { defineConfig, loadEnv, type Plugin } from 'vite';
import react from '@vitejs/plugin-react';
import { createApi, depsFromEnv } from './server/api.ts';

// Runs the API inside the dev server, so `npm run dev` is still one command. The key stays in this process.
function apiPlugin(mode: string): Plugin {
  const handler = () => createApi(depsFromEnv(loadEnv(mode, process.cwd(), '')));
  return {
    name: 'khowayk-api',
    configureServer(server) {
      server.middlewares.use(handler());
    },
    configurePreviewServer(server) {
      server.middlewares.use(handler());
    },
  };
}

// Port 8765 matches the prototype's preview, so existing `kw2` browser data carries over.
export default defineConfig(({ mode }) => ({
  plugins: [react(), apiPlugin(mode)],
  server: { port: 8765, strictPort: true },
  preview: { port: 8765, strictPort: true },
  test: { include: ['tests/**/*.test.ts'], environment: 'node' },
}));
