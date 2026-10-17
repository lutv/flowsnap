#!/usr/bin/env node
/**
 * FlowSnap Standalone Engine & API Server
 * Provides full REST API, live recording orchestration, telemetry, and in-memory log buffer.
 */

import http from 'node:http';
import fs from 'node:fs';
import path from 'node:path';
import os from 'node:os';
import { fileURLToPath } from 'node:url';
import { spawn, exec } from 'node:child_process';
import { ConfigManager } from './config.mjs';
import { AgentInstaller } from './installer.mjs';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const DEFAULT_ROOT_DIR = path.resolve(__dirname, '..');

// -----------------------------------------------------------------------------
// USER DATA DIRECTORY RESOLVER
// Ensures data (recordings, configs, logs) is always written to user-writable
// directories (~/flowsnap) rather than read-only system paths (/usr/lib, Program Files).
// -----------------------------------------------------------------------------
export function resolveDataDir(appDir = DEFAULT_ROOT_DIR) {
  if (process.env.FLOWSNAP_DATA_DIR) {
    const custom = path.resolve(process.env.FLOWSNAP_DATA_DIR);
    try {
      if (!fs.existsSync(custom)) fs.mkdirSync(custom, { recursive: true });
      return custom;
    } catch {}
  }

  const isSystemPath =
    appDir.startsWith('/usr') ||
    appDir.startsWith('/opt') ||
    appDir.startsWith('/Library') ||
    appDir.includes('/Applications') ||
    appDir.includes('Contents/Resources') ||
    appDir.toLowerCase().includes('program files') ||
    appDir.toLowerCase().includes('windows');

  if (isSystemPath) {
    const userDir = path.join(os.homedir(), 'flowsnap');
    try {
      if (!fs.existsSync(userDir)) fs.mkdirSync(userDir, { recursive: true });
      return userDir;
    } catch {}
  }

  try {
    const testFile = path.join(appDir, '.write_perm_test_' + Date.now());
    fs.writeFileSync(testFile, '1');
    fs.unlinkSync(testFile);
    return appDir;
  } catch {
    const userDir = path.join(os.homedir(), 'flowsnap');
    try {
      if (!fs.existsSync(userDir)) fs.mkdirSync(userDir, { recursive: true });
      return userDir;
    } catch {}
    return appDir;
  }
}

// -----------------------------------------------------------------------------
// IN-MEMORY & FILE LOG BUFFER
// -----------------------------------------------------------------------------
const MAX_LOGS = 1000;
const logBuffer = [];

export function logMessage(level, message, meta = null) {
  const entry = {
    id: Date.now() + '-' + Math.random().toString(36).slice(2, 7),
    timestamp: new Date().toISOString(),
    level: level.toUpperCase(), // 'INFO' | 'WARN' | 'ERROR' | 'ACTION' | 'DEBUG'
    message: String(message),
    meta: meta || null
  };

  logBuffer.push(entry);
  if (logBuffer.length > MAX_LOGS) {
    logBuffer.shift();
  }

  // Terminal output
  const colors = {
    INFO: '\x1b[36m',
    WARN: '\x1b[33m',
    ERROR: '\x1b[31m',
    ACTION: '\x1b[32m',
    DEBUG: '\x1b[90m',
    RESET: '\x1b[0m'
  };
  const color = colors[entry.level] || colors.INFO;
  console.log(`${color}[${entry.level}] ${new Date().toLocaleTimeString()} ${entry.message}${colors.RESET}`);

  // Append to disk log file in user data dir (e.g. ~/flowsnap/recordings/flowsnap.log)
  try {
    const logDir = path.join(resolveDataDir(DEFAULT_ROOT_DIR), 'recordings');
    if (!fs.existsSync(logDir)) fs.mkdirSync(logDir, { recursive: true });
    const logLine = `[${entry.timestamp}] [${entry.level}] ${entry.message} ${meta ? JSON.stringify(meta) : ''}\n`;
    fs.appendFileSync(path.join(logDir, 'flowsnap.log'), logLine, 'utf-8');
  } catch {}

  return entry;
}

// -----------------------------------------------------------------------------
// CROSS-PLATFORM SYSTEM FOLDER OPENER
// -----------------------------------------------------------------------------
function openFolderInExplorer(folderPath) {
  const resolved = path.resolve(folderPath);
  if (process.platform === 'win32') {
    exec(`explorer.exe "${resolved}"`);
  } else if (process.platform === 'darwin') {
    exec(`open "${resolved}"`);
  } else {
    exec(`xdg-open "${resolved}"`);
  }
}

// -----------------------------------------------------------------------------
// ENGINE SERVER
// -----------------------------------------------------------------------------
export function createFlowSnapServer(options = {}) {
  const rootDir = options.rootDir || DEFAULT_ROOT_DIR;
  const dataDir = options.dataDir || resolveDataDir(rootDir);
  const recDir = path.join(dataDir, 'recordings');
  try {
    if (!fs.existsSync(recDir)) fs.mkdirSync(recDir, { recursive: true });
  } catch {}

  const configMgr = new ConfigManager(path.join(dataDir, 'flowsnap.config.json'));
  let activeProcess = null;
  let activeSessionData = null;

  logMessage('INFO', `FlowSnap Engine initializing (App: ${rootDir}, Data: ${dataDir})`);

  const server = http.createServer(async (req, res) => {
    // Enable CORS for desktop webviews and external callers
    res.setHeader('Access-Control-Allow-Origin', '*');
    res.setHeader('Access-Control-Allow-Methods', 'GET, POST, PUT, DELETE, OPTIONS');
    res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization, X-Requested-With');

    if (req.method === 'OPTIONS') {
      res.statusCode = 204;
      res.end();
      return;
    }

    const parsedUrl = new URL(req.url, `http://${req.headers.host || '127.0.0.1'}`);
    const pathname = decodeURIComponent(parsedUrl.pathname);

    // 1. Static file serving for /recordings/* (Checks dataDir first, then rootDir fallback)
    if (pathname.startsWith('/recordings/')) {
      let filePath = path.join(dataDir, pathname);
      if (!fs.existsSync(filePath)) {
        filePath = path.join(rootDir, pathname);
      }

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

    // 2. Health & Status Check
    if (pathname === '/api/status' && req.method === 'GET') {
      res.setHeader('Content-Type', 'application/json');
      if (activeProcess) {
        try {
          process.kill(activeProcess.pid, 0);
        } catch {
          activeProcess = null;
          activeSessionData = null;
        }
      }
      res.end(JSON.stringify({
        status: 'online',
        isRecording: !!activeProcess,
        pid: activeProcess?.pid || null,
        serverTime: new Date().toISOString(),
        dataDir,
        appDir: rootDir
      }));
      return;
    }

    // 3. Active Session & Live Steps Polling
    if (pathname === '/api/active-session' && req.method === 'GET') {
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
        const targetOut = path.resolve(recDir, targetFolder);
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
        absolutePath: targetFolder ? path.resolve(recDir, targetFolder) : null,
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

    // 4. Log Buffer Endpoint (Fetch logs or submit client logs)
    if (pathname === '/api/logs' && req.method === 'GET') {
      res.setHeader('Content-Type', 'application/json');
      const limit = parseInt(parsedUrl.searchParams.get('limit') || '200', 10);
      const since = parsedUrl.searchParams.get('since');
      let logs = logBuffer;
      if (since) {
        logs = logs.filter(l => l.timestamp > since);
      }
      res.end(JSON.stringify({
        logs: logs.slice(-limit),
        total: logBuffer.length,
        engineStatus: 'ONLINE',
        dataDir
      }));
      return;
    }

    if (pathname === '/api/logs' && req.method === 'POST') {
      let body = '';
      req.on('data', chunk => { body += chunk; });
      req.on('end', () => {
        try {
          const data = JSON.parse(body || '{}');
          logMessage(data.level || 'INFO', `[CLIENT] ${data.message}`, data.meta);
          res.setHeader('Content-Type', 'application/json');
          res.end(JSON.stringify({ ok: true }));
        } catch (err) {
          res.statusCode = 400;
          res.end(JSON.stringify({ error: err.message }));
        }
      });
      return;
    }

    // 5. System & Process Telemetry
    if (pathname === '/api/telemetry' && req.method === 'GET') {
      res.setHeader('Content-Type', 'application/json');
      const mem = process.memoryUsage();
      res.end(JSON.stringify({
        rssMb: Number((mem.rss / 1024 / 1024).toFixed(1)),
        heapUsedMb: Number((mem.heapUsed / 1024 / 1024).toFixed(1)),
        heapTotalMb: Number((mem.heapTotal / 1024 / 1024).toFixed(1)),
        externalMb: Number((mem.external / 1024 / 1024).toFixed(1)),
        uptimeSec: Math.round(process.uptime()),
        pid: process.pid,
        platform: process.platform,
        nodeVersion: process.version,
        dataDir
      }));
      return;
    }

    // 6. Profiles List
    if (pathname === '/api/profiles' && req.method === 'GET') {
      res.setHeader('Content-Type', 'application/json');
      res.end(JSON.stringify({ profiles: configMgr.listProfiles() }));
      return;
    }

    // 7. Start Recording Session
    if (pathname === '/api/start-recording' && req.method === 'POST') {
      let body = '';
      req.on('data', chunk => { body += chunk; });
      req.on('end', () => {
        try {
          if (activeProcess) {
            try {
              process.kill(activeProcess.pid, 0);
              res.statusCode = 400;
              res.end(JSON.stringify({ error: 'Sesi perekaman sedang aktif berjalan!' }));
              return;
            } catch {
              activeProcess = null;
            }
          }

          const data = JSON.parse(body || '{}');
          const binPath = path.join(rootDir, 'bin', 'flowsnap.mjs');
          const targetFolder = data.folder || (data.outDir ? path.basename(data.outDir) : 'default');
          const resolvedOutDir = path.resolve(recDir, targetFolder);

          activeSessionData = {
            url: data.url,
            title: data.title,
            outDir: resolvedOutDir,
            isResume: !!data.resume,
            startTime: new Date().toISOString()
          };

          const args = [binPath, 'start'];
          if (data.url) args.push('--url', data.url);
          if (data.title) args.push('--title', data.title);
          args.push('--out', resolvedOutDir);
          if (data.profile) args.push('--profile', data.profile);
          if (!data.autoResult) args.push('--no-result');
          if (data.aiEnhance) args.push('--ai');
          if (data.resume) args.push('--resume');

          logMessage('ACTION', `Starting recording session for: ${data.url || 'default'} (Target: ${resolvedOutDir})`);

          activeProcess = spawn(process.execPath, args, {
            cwd: rootDir,
            stdio: ['pipe', 'pipe', 'pipe'],
            env: {
              ...process.env,
              FLOWSNAP_DATA_DIR: dataDir,
              DISPLAY: process.env.DISPLAY || ':0'
            }
          });

          activeProcess.stdout.on('data', (d) => {
            const str = d.toString().trim();
            if (str) logMessage('DEBUG', `[Recorder] ${str}`);
          });

          activeProcess.stderr.on('data', (d) => {
            const str = d.toString().trim();
            if (str) logMessage('WARN', `[Recorder STDERR] ${str}`);
          });

          activeProcess.on('exit', (code) => {
            logMessage('INFO', `Recording process exited with code ${code}`);
            activeProcess = null;
          });

          activeProcess.on('error', (err) => {
            logMessage('ERROR', `Process spawn error: ${err.message}`);
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
          logMessage('ERROR', `Failed to start recording: ${err.message}`);
          res.statusCode = 500;
          res.end(JSON.stringify({ error: err.message }));
        }
      });
      return;
    }

    // 8. Stop Recording Session
    if (pathname === '/api/stop-recording' && req.method === 'POST') {
      if (activeProcess) {
        logMessage('ACTION', `Stopping active recording process (PID: ${activeProcess.pid})`);
        try {
          activeProcess.kill('SIGINT');
        } catch {}
        activeProcess = null;
      }
      res.setHeader('Content-Type', 'application/json');
      res.end(JSON.stringify({ status: 'stopped', lastSession: activeSessionData }));
      return;
    }

    // 9. Recordings Explorer & Detail
    if (pathname === '/api/recordings' && req.method === 'GET') {
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
              absolutePath: dirPath,
              hasGuide: fs.existsSync(guideMd),
              hasHtml: fs.existsSync(guideHtml),
              viewerUrl: `/recordings/${d.name}/index.html`,
              steps
            });
          }
        }
      }
      res.setHeader('Content-Type', 'application/json');
      res.end(JSON.stringify({ recordings: list.reverse() }));
      return;
    }

    if (pathname.startsWith('/api/recording/') && req.method === 'GET') {
      const folderName = pathname.replace('/api/recording/', '');
      const dirPath = path.join(recDir, folderName);
      if (!fs.existsSync(dirPath)) {
        res.statusCode = 404;
        res.end(JSON.stringify({ error: 'Folder rekaman tidak ditemukan' }));
        return;
      }

      const stepJson = path.join(dirPath, 'steps.json');
      const guideMd = path.join(dirPath, 'GUIDE.md');
      const guideHtml = path.join(dirPath, 'index.html');

      let steps = [];
      let markdownContent = '';
      if (fs.existsSync(stepJson)) {
        try { steps = JSON.parse(fs.readFileSync(stepJson, 'utf-8')); } catch {}
      }
      if (fs.existsSync(guideMd)) {
        markdownContent = fs.readFileSync(guideMd, 'utf-8');
      }

      const files = fs.readdirSync(dirPath)
        .filter(f => /\.(png|jpg|jpeg|md|html|json)$/i.test(f))
        .map(f => {
          const fPath = path.join(dirPath, f);
          const stat = fs.statSync(fPath);
          return {
            name: f,
            sizeKb: Math.round(stat.size / 1024),
            url: `/recordings/${folderName}/${f}`,
            mtime: stat.mtime.toISOString(),
            isImage: /\.(png|jpg|jpeg)$/i.test(f),
            isMarkdown: /\.md$/i.test(f),
            isHtml: /\.html$/i.test(f)
          };
        });

      res.setHeader('Content-Type', 'application/json');
      res.end(JSON.stringify({
        id: folderName,
        title: folderName,
        outDir: `./recordings/${folderName}`,
        absolutePath: dirPath,
        stepsCount: steps.length,
        hasGuide: fs.existsSync(guideMd),
        hasHtml: fs.existsSync(guideHtml),
        markdownContent,
        viewerUrl: `/recordings/${folderName}/index.html`,
        steps,
        files
      }));
      return;
    }

    // 10. Open Folder in Native Explorer
    if (pathname === '/api/open-folder' && req.method === 'GET') {
      const folder = parsedUrl.searchParams.get('folder') || '';
      let targetPath = dataDir;
      if (folder) {
        targetPath = path.isAbsolute(folder) ? folder : path.join(dataDir, folder);
      }
      try {
        if (!fs.existsSync(targetPath)) fs.mkdirSync(targetPath, { recursive: true });
        openFolderInExplorer(targetPath);
        logMessage('ACTION', `Opened folder in file explorer: ${targetPath}`);
        res.setHeader('Content-Type', 'application/json');
        res.end(JSON.stringify({ success: true, openedPath: targetPath }));
      } catch (err) {
        logMessage('ERROR', `Failed to open folder: ${err.message}`);
        res.statusCode = 500;
        res.end(JSON.stringify({ error: err.message }));
      }
      return;
    }

    // 11. Save Markdown Edit
    if (pathname === '/api/save-markdown' && req.method === 'POST') {
      let body = '';
      req.on('data', chunk => { body += chunk; });
      req.on('end', () => {
        try {
          const { folder, content } = JSON.parse(body || '{}');
          if (!folder || typeof content !== 'string') {
            res.statusCode = 400;
            res.end(JSON.stringify({ error: 'Folder dan content wajib disertakan' }));
            return;
          }
          const mdPath = path.join(recDir, folder, 'GUIDE.md');
          fs.writeFileSync(mdPath, content, 'utf-8');
          logMessage('ACTION', `Updated GUIDE.md for session: ${folder}`);
          res.setHeader('Content-Type', 'application/json');
          res.end(JSON.stringify({ success: true, path: mdPath }));
        } catch (err) {
          res.statusCode = 500;
          res.end(JSON.stringify({ error: err.message }));
        }
      });
      return;
    }

    // 12. Setup Agent Integration (MCP & Skills)
    if (pathname === '/api/setup-agent' && req.method === 'POST') {
      try {
        logMessage('ACTION', 'Running AI Agent Setup (MCP Server & Skill registration)...');
        const installer = new AgentInstaller(rootDir);
        const results = installer.installAll();
        logMessage('INFO', 'AI Agent Setup completed', results);
        res.setHeader('Content-Type', 'application/json');
        res.end(JSON.stringify({ success: true, results }));
      } catch (err) {
        logMessage('ERROR', `AI Agent Setup failed: ${err.message}`);
        res.statusCode = 500;
        res.end(JSON.stringify({ error: err.message }));
      }
      return;
    }

    // 13. Serve Static Studio UI (from ui/dist if present)
    const uiDistDir = path.join(rootDir, 'ui', 'dist');
    if (fs.existsSync(uiDistDir)) {
      let localPath = path.join(uiDistDir, pathname);
      if (fs.existsSync(localPath) && fs.statSync(localPath).isFile()) {
        const ext = path.extname(localPath).toLowerCase();
        const mimeTypes = {
          '.html': 'text/html; charset=utf-8',
          '.png': 'image/png',
          '.jpg': 'image/jpeg',
          '.svg': 'image/svg+xml',
          '.json': 'application/json',
          '.css': 'text/css',
          '.js': 'application/javascript',
          '.ico': 'image/x-icon'
        };
        res.setHeader('Content-Type', mimeTypes[ext] || 'application/octet-stream');
        fs.createReadStream(localPath).pipe(res);
        return;
      }

      // SPA Fallback for HTML
      const indexPath = path.join(uiDistDir, 'index.html');
      if (fs.existsSync(indexPath)) {
        res.setHeader('Content-Type', 'text/html; charset=utf-8');
        fs.createReadStream(indexPath).pipe(res);
        return;
      }
    }

    // 404
    res.statusCode = 404;
    res.setHeader('Content-Type', 'application/json');
    res.end(JSON.stringify({ error: 'Endpoint tidak ditemukan', path: pathname }));
  });

  return server;
}

// -----------------------------------------------------------------------------
// CLI EXECUTION
// -----------------------------------------------------------------------------
if (process.argv[1] && path.resolve(process.argv[1]) === path.resolve(__filename)) {
  let port = 3456;
  const portArg = process.argv.indexOf('--port');
  if (portArg !== -1 && process.argv[portArg + 1]) {
    port = parseInt(process.argv[portArg + 1], 10);
  } else if (process.env.FLOWSNAP_PORT) {
    port = parseInt(process.env.FLOWSNAP_PORT, 10);
  }

  const server = createFlowSnapServer();
  server.listen(port, '0.0.0.0', () => {
    console.log(`\n\x1b[35m===============================================================\x1b[0m`);
    console.log(`\x1b[1m\x1b[32m  📸 FLOWSNAP ENGINE SERVER RUNNING ON: http://127.0.0.1:${port}\x1b[0m`);
    console.log(`\x1b[35m===============================================================\x1b[0m\n`);
  });
}
