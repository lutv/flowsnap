import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import tailwindcss from '@tailwindcss/vite';
import { spawn } from 'node:child_process';
import path from 'node:path';
import fs from 'node:fs';

let activeProcess = null;
let activeSessionData = null;

function flowsnapApiPlugin() {
  return {
    name: 'flowsnap-api',
    configureServer(server) {
      server.middlewares.use((req, res, next) => {
        const rootDir = path.resolve(process.cwd(), '..');

        // 1. Static file serving for /recordings/*
        if (req.url.startsWith('/recordings/')) {
          const cleanUrl = decodeURIComponent(req.url.split('?')[0]);
          let filePath = path.join(rootDir, cleanUrl);

          if (fs.existsSync(filePath) && fs.statSync(filePath).isDirectory()) {
            filePath = path.join(filePath, 'index.html');
          }

          if (fs.existsSync(filePath) && fs.statSync(filePath).isFile()) {
            const ext = path.extname(filePath).toLowerCase();
            const mimeTypes = {
              '.html': 'text/html; charset=utf-8',
              '.png': 'image/png',
              '.jpg': 'image/jpeg',
              '.jpeg': 'image/jpeg',
              '.json': 'application/json',
              '.md': 'text/markdown; charset=utf-8',
              '.css': 'text/css',
              '.js': 'application/javascript'
            };
            res.setHeader('Content-Type', mimeTypes[ext] || 'application/octet-stream');
            fs.createReadStream(filePath).pipe(res);
            return;
          }
        }

        // Helper: get latest recording folder
        const getLatestRecordingDir = () => {
          const recDir = path.join(rootDir, 'recordings');
          if (!fs.existsSync(recDir)) return null;
          const dirs = fs.readdirSync(recDir, { withFileTypes: true })
            .filter((d) => d.isDirectory())
            .map((d) => ({
              name: d.name,
              mtime: fs.statSync(path.join(recDir, d.name)).mtimeMs
            }))
            .sort((a, b) => b.mtime - a.mtime);
          return dirs.length > 0 ? dirs[0].name : null;
        };

        // 2. Active Session & Live Steps Polling
        if (req.url.startsWith('/api/active-session') && req.method === 'GET') {
          res.setHeader('Content-Type', 'application/json');

          let targetFolder = null;
          if (activeSessionData?.outDir) {
            targetFolder = path.basename(activeSessionData.outDir);
          } else {
            targetFolder = getLatestRecordingDir();
          }

          let steps = [];
          let hasHtml = false;
          let hasMd = false;

          if (targetFolder) {
            const targetOut = path.resolve(rootDir, 'recordings', targetFolder);
            const manifestPath = path.join(targetOut, 'steps.json');
            const htmlPath = path.join(targetOut, 'index.html');
            const mdPath = path.join(targetOut, 'GUIDE.md');

            hasHtml = fs.existsSync(htmlPath);
            hasMd = fs.existsSync(mdPath);

            if (fs.existsSync(manifestPath)) {
              try {
                steps = JSON.parse(fs.readFileSync(manifestPath, 'utf-8'));
              } catch {}
            }
          }

          res.end(JSON.stringify({
            isRecording: !!activeProcess,
            pid: activeProcess?.pid || null,
            folder: targetFolder,
            outDir: targetFolder ? `./recordings/${targetFolder}` : null,
            session: activeSessionData || (targetFolder ? { outDir: `./recordings/${targetFolder}`, title: targetFolder } : null),
            steps,
            totalSteps: steps.length,
            latestStep: steps.length > 0 ? steps[steps.length - 1] : null,
            hasHtml,
            hasMd,
            viewerUrl: targetFolder ? `/recordings/${targetFolder}/index.html` : null
          }));
          return;
        }

        // 3. Status Check
        if (req.url === '/api/status' && req.method === 'GET') {
          res.setHeader('Content-Type', 'application/json');
          res.end(JSON.stringify({
            isRecording: !!activeProcess,
            pid: activeProcess?.pid || null
          }));
          return;
        }

        // 4. Start Recording Session
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
              const binPath = path.join(rootDir, 'bin', 'flowsnap.mjs');
              const outDir = data.outDir || './recordings/default';

              activeSessionData = {
                url: data.url,
                title: data.title,
                outDir,
                startTime: new Date().toISOString()
              };

              const args = [binPath, 'start'];
              if (data.url) args.push('--url', data.url);
              if (data.title) args.push('--title', data.title);
              args.push('--out', outDir);
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
                activeSessionData = null;
              });

              res.setHeader('Content-Type', 'application/json');
              res.end(JSON.stringify({
                status: 'started',
                pid: activeProcess.pid,
                session: activeSessionData
              }));
            } catch (err) {
              res.statusCode = 500;
              res.end(JSON.stringify({ error: err.message }));
            }
          });
          return;
        }

        // 5. Stop Recording Session
        if (req.url === '/api/stop-recording' && req.method === 'POST') {
          if (activeProcess) {
            activeProcess.kill('SIGINT');
            activeProcess = null;
          }
          res.setHeader('Content-Type', 'application/json');
          res.end(JSON.stringify({ status: 'stopped', lastSession: activeSessionData }));
          return;
        }

        // 6. List Recordings from Disk
        if (req.url === '/api/recordings' && req.method === 'GET') {
          const recDir = path.join(rootDir, 'recordings');
          const list = [];

          if (fs.existsSync(recDir)) {
            const dirs = fs.readdirSync(recDir, { withFileTypes: true });
            for (const d of dirs) {
              if (d.isDirectory()) {
                const dirPath = path.join(recDir, d.name);
                const stepJson = path.join(dirPath, 'steps.json');
                const guideMd = path.join(dirPath, 'GUIDE.md');
                const guideHtml = path.join(dirPath, 'index.html');
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
                  hasHtml: fs.existsSync(guideHtml),
                  viewerUrl: `/recordings/${d.name}/index.html`,
                  steps: steps
                });
              }
            }
          }

          res.setHeader('Content-Type', 'application/json');
          res.end(JSON.stringify({ recordings: list.reverse() }));
          return;
        }

        // 7. Get Single Recording Detail with Markdown Content
        if (req.url.startsWith('/api/recording/') && req.method === 'GET') {
          const folderName = decodeURIComponent(req.url.replace('/api/recording/', '').split('?')[0]);
          const dirPath = path.join(rootDir, 'recordings', folderName);

          if (!fs.existsSync(dirPath)) {
            res.statusCode = 404;
            res.end(JSON.stringify({ error: 'Folder not found' }));
            return;
          }

          const stepJson = path.join(dirPath, 'steps.json');
          const guideMd = path.join(dirPath, 'GUIDE.md');
          const guideHtml = path.join(dirPath, 'index.html');

          let steps = [];
          if (fs.existsSync(stepJson)) {
            try { steps = JSON.parse(fs.readFileSync(stepJson, 'utf-8')); } catch {}
          }

          let markdown = '';
          if (fs.existsSync(guideMd)) {
            try { markdown = fs.readFileSync(guideMd, 'utf-8'); } catch {}
          }

          res.setHeader('Content-Type', 'application/json');
          res.end(JSON.stringify({
            id: folderName,
            steps,
            markdown,
            hasHtml: fs.existsSync(guideHtml),
            hasMd: fs.existsSync(guideMd),
            viewerUrl: `/recordings/${folderName}/index.html`
          }));
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
