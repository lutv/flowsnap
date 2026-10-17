import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import tailwindcss from '@tailwindcss/vite';
import path from 'node:path';
import { createFlowSnapServer } from '../src/server.mjs';

function flowsnapApiPlugin() {
  const rootDir = path.resolve(process.cwd(), '..');
  const engineServer = createFlowSnapServer({ rootDir });

  return {
    name: 'flowsnap-api',
    configureServer(server) {
      server.middlewares.use((req, res, next) => {
        if (req.url.startsWith('/api/') || req.url.startsWith('/recordings/')) {
          engineServer.emit('request', req, res);
        } else {
          next();
        }
      });
    }
  };
}

export default defineConfig({
  plugins: [
    react(),
    tailwindcss(),
    flowsnapApiPlugin()
  ],
  server: {
    port: 5173,
    strictPort: true
  }
});
