#!/usr/bin/env node
/**
 * FlowSnap Autonomous System Validation Suite
 * Runs end-to-end diagnostics and self-test without requiring manual user testing.
 */

import http from 'node:http';
import fs from 'node:fs';
import path from 'node:path';
import os from 'node:os';
import { ConfigManager } from '../src/config.mjs';
import { checkPlaywright } from '../src/preflight.mjs';
import { GuideGenerator } from '../src/generator.mjs';
import { AIEnhancer } from '../src/ai_enhancer.mjs';
import { ActionRecorder } from '../src/recorder.mjs';

const colors = {
  reset: '\x1b[0m',
  bold: '\x1b[1m',
  green: '\x1b[32m',
  red: '\x1b[31m',
  yellow: '\x1b[33m',
  blue: '\x1b[34m',
  magenta: '\x1b[35m',
  cyan: '\x1b[36m'
};

const checks = [];

function recordCheck(name, passed, detail = '') {
  checks.push({ name, passed, detail });
  const status = passed
    ? `${colors.green}${colors.bold}✔ PASS${colors.reset}`
    : `${colors.red}${colors.bold}✖ FAIL${colors.reset}`;
  console.log(`  ${status}  ${colors.bold}${name}${colors.reset} ${detail ? `(${detail})` : ''}`);
}

async function runValidation() {
  console.log(`\n${colors.magenta}${colors.bold}==============================================================${colors.reset}`);
  console.log(`${colors.cyan}${colors.bold}      📸 FLOWSNAP — COMPREHENSIVE VALIDATION SUITE            ${colors.reset}`);
  console.log(`${colors.magenta}${colors.bold}==============================================================${colors.reset}\n`);

  const tempDir = fs.mkdtempSync(path.join(os.tmpdir(), 'flowsnap-val-'));

  try {
    // 1. ENVIRONMENT & NODE RUNTIME
    console.log(`${colors.yellow}1. Memeriksa Lingkungan Runtime & Node.js...${colors.reset}`);
    const nodeVer = process.version;
    const majorVer = parseInt(nodeVer.slice(1).split('.')[0], 10);
    recordCheck('Node.js Version (>= 18 required)', majorVer >= 18, nodeVer);

    // 2. CONFIG & PROFILE MANAGER
    console.log(`\n${colors.yellow}2. Memeriksa Konfigurasi & Profile Engine...${colors.reset}`);
    const configMgr = new ConfigManager(path.join(tempDir, 'test-config.json'));
    const defProf = configMgr.getProfile('default');
    const hasDefault = defProf && defProf.url && defProf.outDir;
    recordCheck('Default Profile Creation', !!hasDefault, defProf.url);

    configMgr.setProfile('test-stage', { url: 'https://staging.test.local' });
    const stageProf = configMgr.getProfile('test-stage');
    recordCheck('Custom Profile Persistence', stageProf.url === 'https://staging.test.local');

    // 3. PLAYWRIGHT & CHROMIUM
    console.log(`\n${colors.yellow}3. Memeriksa Kesiapan Playwright & Chromium Browser...${colors.reset}`);
    let playwright = null;
    try {
      playwright = await checkPlaywright();
      recordCheck('Playwright Engine', !!playwright);
    } catch (err) {
      recordCheck('Playwright Engine', false, err.message);
      throw err;
    }

    // 4. GENERATOR ENGINE (Markdown & HTML)
    console.log(`\n${colors.yellow}4. Memeriksa Guide Generator (Markdown + Web Viewer)...${colors.reset}`);
    const genDir = path.join(tempDir, 'guide-test');
    const generator = new GuideGenerator(genDir, { title: 'Validation SOP' });
    const dummySteps = [
      {
        step: 1,
        type: 'click',
        label: 'Tombol Validasi',
        tag: 'button',
        url: 'http://localhost/test',
        actionFile: 'step_001_01_action_test.png',
        resultFile: 'step_001_02_result_test.png'
      }
    ];
    const { mdPath, htmlPath } = generator.generate(dummySteps);
    const mdOk = fs.existsSync(mdPath) && fs.readFileSync(mdPath, 'utf-8').includes('Validation SOP');
    const htmlOk = fs.existsSync(htmlPath) && fs.readFileSync(htmlPath, 'utf-8').includes('Validation SOP');
    recordCheck('Markdown SOP Generator (GUIDE.md)', mdOk);
    recordCheck('Web Viewer Generator (index.html)', htmlOk);

    // 5. AI SYNTHESIS & HEURISTICS
    console.log(`\n${colors.yellow}5. Memeriksa AI SOP Synthesizer & Natural Language Heuristics...${colors.reset}`);
    const ai = new AIEnhancer();
    const heuristicRes = ai.fallbackHeuristic(dummySteps);
    recordCheck('AI Heuristic Engine Fallback', !!heuristicRes[0]?.aiTitle);

    const jsonParseOk = ai.parseAIResponse('```json\n[{"step":1,"title":"OK"}]\n```');
    recordCheck('AI JSON Markdown Sanitizer', jsonParseOk?.[0]?.title === 'OK');

    // 6. HEADLESS BROWSER ACTION RECORDING E2E
    console.log(`\n${colors.yellow}6. Menjalankan Simulasi Perekaman Browser Headless Otomatis...${colors.reset}`);
    const server = http.createServer((req, res) => {
      res.writeHead(200, { 'Content-Type': 'text/html; charset=utf-8' });
      res.end(`<!DOCTYPE html>
<html>
<body>
  <h1>FlowSnap Validation Test Page</h1>
  <button id="test-btn" onclick="document.body.appendChild(document.createElement('div')).textContent = 'Success!'">Klik Validasi</button>
  <input id="test-input" placeholder="Ketik disini..." />
</body>
</html>`);
    });

    let port;
    await new Promise((resolve) => {
      server.listen(0, '127.0.0.1', () => {
        port = server.address().port;
        resolve();
      });
    });

    const browser = await playwright.chromium.launch({ headless: true });
    const page = await browser.newPage();
    const e2eOut = path.join(tempDir, 'e2e-out');

    const recorder = new ActionRecorder(page, {
      outDir: e2eOut,
      autoResult: true,
      postWaitMs: 150
    });

    await recorder.attach();
    await page.goto(`http://127.0.0.1:${port}`);

    // Trigger 1: Click
    await page.click('#test-btn');
    await recorder.waitForIdle();

    // Trigger 2: Enter Input
    await page.fill('#test-input', 'Data Test #101');
    await page.press('#test-input', 'Enter');
    await page.waitForTimeout(250);
    await recorder.waitForIdle();

    // Trigger 3: F8 Manual Screen
    await page.keyboard.press('F8');
    await page.waitForTimeout(50);
    await recorder.waitForIdle();

    await browser.close();
    server.close();

    const manifestPath = path.join(e2eOut, 'steps.json');
    const hasManifest = fs.existsSync(manifestPath);
    recordCheck('Live Event Recording (steps.json)', hasManifest);

    if (hasManifest) {
      const recorded = JSON.parse(fs.readFileSync(manifestPath, 'utf-8'));
      recordCheck('Dual-Capture Sequence (3 actions recorded)', recorded.length === 3);

      const allFilesExist = recorded.every((s) => {
        const aExists = s.actionFile && fs.existsSync(path.join(e2eOut, s.actionFile));
        const rExists = !s.resultFile || fs.existsSync(path.join(e2eOut, s.resultFile));
        return aExists && rExists;
      });
      recordCheck('Screenshot Storage & Physical Integrity', allFilesExist);
    }

  } finally {
    fs.rmSync(tempDir, { recursive: true, force: true });
  }

  // SUMMARY REPORT
  const total = checks.length;
  const passedCount = checks.filter(c => c.passed).length;
  const failedCount = total - passedCount;

  console.log(`\n${colors.magenta}--------------------------------------------------------------${colors.reset}`);
  if (failedCount === 0) {
    console.log(`${colors.green}${colors.bold}🎉 SEMUA VALIDASI BERHASIL! (${passedCount}/${total} LOLOS)${colors.reset}`);
    console.log(`${colors.green}Aplikasi FlowSnap siap digunakan secara stabil tanpa kendala.${colors.reset}\n`);
    process.exit(0);
  } else {
    console.log(`${colors.red}${colors.bold}⚠️ DITEMUKAN ${failedCount} KEGAGALAN DARI ${total} PENGECEKAN!${colors.reset}\n`);
    process.exit(1);
  }
}

runValidation().catch((err) => {
  console.error('\nFatal Validation Error:', err);
  process.exit(1);
});
