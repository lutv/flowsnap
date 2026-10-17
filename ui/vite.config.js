import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import tailwindcss from '@tailwindcss/vite';
import { spawn } from 'node:child_process';
import path from 'node:path';
import fs from 'node:fs';

let activeProcess = null;

function flowsnapApiPlugin() {
  return {
    name: 'flowsnap-api',
    configureServer(server) {
      server.middlewares.use((req, res, next) => {
        // 1. Status Check
        if (req.url === '/api/status' && req.method === 'GET') {
          res.setHeader('Content-Type', 'application/json');
          res.end(JSON.stringify({
            isRecording: !!activeProcess,
            pid: activeProcess?.pid || null
          }));
          return;
        }

        // 2. Start Recording Session
        if (req.url === '/api/start-recording' && req.method === 'POST') {
          let body = '';
          req.on('data', (chunk) => { body += chunk; });
          req.on('end', () => {
            try {
              if (activeProcess) {
                res.statusCode = 400;
                res.end(JSON.stringify({ error: 'Sesi perekaman sedang berjalan!' }));
                return;
              }

              const data = JSON.parse(body || '{}');
              const rootDir = path.resolve(process.cwd(), '..');
              const binPath = path.join(rootDir, 'bin', 'flowsnap.mjs');

              const args = [binPath, 'start'];
              if (data.url) args.push('--url', data.url);
              if (data.title) args.push('--title', data.title);
              if (data.outDir) args.push('--out', data.outDir);
              if (data.profile) args.push('--profile', data.profile);
              if (!data.autoResult) args.push('--no-result');
              if (data.aiEnhance) args.push('--ai');

              activeProcess = spawn('node', args, {
                cwd: rootDir,
                stdio: 'inherit',
                env: { ...process.env, DISPLAY: process.env.DISPLAY || ':0' }
              });

              activeProcess.on('exit', () => {
                activeProcess = null;
              });

              activeProcess.on('error', (err) => {
                console.error('[FlowSnap Server] Error spawning process:', err);
                activeProcess = null;
              });

              res.setHeader('Content-Type', 'application/json');
              res.end(JSON.stringify({ status: 'started', pid: activeProcess.pid }));
            } catch (err) {
              res.statusCode = 500;
              res.end(JSON.stringify({ error: err.message }));
            }
          });
          return;
        }

        // 3. Stop Recording Session
        if (req.url === '/api/stop-recording' && req.method === 'POST') {
          if (activeProcess) {
            activeProcess.kill('SIGINT');
            activeProcess = null;
          }
          res.setHeader('Content-Type', 'application/json');
          res.end(JSON.stringify({ status: 'stopped' }));
          return;
        }

        // 4. List Recordings from Disk
        if (req.url === '/api/recordings' && req.method === 'GET') {
          const rootDir = path.resolve(process.cwd(), '..');
          const recDir = path.join(rootDir, 'recordings');
          const list = [];

          if (fs.existsSync(recDir)) {
            const dirs = fs.readdirSync(recDir, { withFileTypes: true });
            for (const d of dirs) {
              if (d.isDirectory()) {
                const dirPath = path.join(recDir, d.name);
                const stepJson = path.join(dirPath, 'steps.json');
                const guideMd = path.join(dirPath, 'GUIDE.md');
                let count = 0;
                let steps = [];
                let mtime = fs.statSync(dirPath).mtime.toISOString();

                if (fs.existsSync(stepJson)) {
                  try {
                    steps = JSON.parse(fs.readFileSync(stepJson, 'utf-8'));
                    count = steps.length;
                  } catch {}
                }

                list.push({
                  id: d.name,
                  title: d.name,
                  stepsCount: count,
                  updatedAt: mtime,
                  outDir: `./recordings/${d.name}`,
                  hasGuide: fs.existsSync(guideMd),
                  steps: steps.slice(0, 4)
                });
              }
            }
          }

          res.setHeader('Content-Type', 'application/json');
          res.end(JSON.stringify({ recordings: list.reverse() }));
          return;
        }

        next();
      });
    }
  };
}

export default defineConfig({
  plugins: [react(), tailwindcss(), flowsnapApiPlugin()],
  server: {
    port: 5173,
    strictPort: true
  }
});
