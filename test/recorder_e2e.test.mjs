import { test, describe, before, after } from 'node:test';
import assert from 'node:assert/strict';
import http from 'node:http';
import fs from 'node:fs';
import path from 'node:path';
import os from 'node:os';
import playwright from 'playwright';
import { ActionRecorder } from '../src/recorder.mjs';
import { GuideGenerator } from '../src/generator.mjs';

describe('ActionRecorder E2E Headless Test', () => {
  let server;
  let serverUrl;
  let tempDir;
  let browser;
  let context;
  let page;
  let recorder;

  before(async () => {
    // 1. Create temporary directory for recording outputs
    tempDir = fs.mkdtempSync(path.join(os.tmpdir(), 'flowsnap-e2e-'));

    // 2. Start mock HTTP server
    server = http.createServer((req, res) => {
      res.writeHead(200, { 'Content-Type': 'text/html; charset=utf-8' });
      res.end(`<!DOCTYPE html>
<html>
<head>
  <title>FlowSnap Test App</title>
  <style>
    body { font-family: sans-serif; padding: 40px; background: #f1f5f9; }
    button { padding: 10px 20px; font-size: 16px; cursor: pointer; background: #3b82f6; color: white; border: none; border-radius: 6px; }
    input { padding: 10px; font-size: 16px; border: 1px solid #cbd5e1; border-radius: 6px; width: 300px; }
    .card { background: white; padding: 24px; border-radius: 8px; margin-bottom: 20px; box-shadow: 0 2px 8px rgba(0,0,0,0.1); }
  </style>
</head>
<body>
  <div class="card">
    <h1>FlowSnap Mock Application</h1>
    <p>Simulating enterprise UI actions for automated validation.</p>
    <button id="btn-create" onclick="document.getElementById('status-msg').textContent = 'Item Created Successfully!'">
      Create New Record
    </button>
    <div id="status-msg" style="margin-top: 12px; font-weight: bold; color: #16a34a;"></div>
  </div>

  <div class="card">
    <label for="search-box">Search Database:</label><br><br>
    <input id="search-box" name="search" placeholder="Type query and press Enter..." />
  </div>

  <div class="card">
    <label for="password-box">Account Password:</label><br><br>
    <input id="password-box" type="password" name="password" placeholder="Enter secret password..." />
  </div>
</body>
</html>`);
    });

    await new Promise((resolve) => {
      server.listen(0, '127.0.0.1', () => {
        const port = server.address().port;
        serverUrl = `http://127.0.0.1:${port}`;
        resolve();
      });
    });

    // 3. Launch headless chromium
    browser = await playwright.chromium.launch({ headless: true });
    context = await browser.newContext({ viewport: { width: 1280, height: 800 } });
    page = await context.newPage();

    // 4. Setup ActionRecorder with fast postWaitMs for test speed
    recorder = new ActionRecorder(page, {
      outDir: tempDir,
      autoResult: true,
      postWaitMs: 150
    });

    await recorder.attach();
    await page.goto(serverUrl);
    await page.waitForLoadState('networkidle');
  });

  after(async () => {
    if (browser) await browser.close();
    if (server) await new Promise((resolve) => server.close(resolve));
    fs.rmSync(tempDir, { recursive: true, force: true });
  });

  test('should record button click with dual-capture (action + result)', async () => {
    // Click the button in the page
    await page.click('#btn-create');

    // Wait for recorder queue to be completely idle
    await recorder.waitForIdle();

    const manifestPath = path.join(tempDir, 'steps.json');
    assert.ok(fs.existsSync(manifestPath), 'steps.json must be created');

    const steps = JSON.parse(fs.readFileSync(manifestPath, 'utf-8'));
    assert.strictEqual(steps.length, 1);

    const step1 = steps[0];
    assert.strictEqual(step1.step, 1);
    assert.strictEqual(step1.type, 'click');
    assert.match(step1.label, /Create New Record/);
    assert.ok(step1.actionFile);
    assert.ok(step1.resultFile);

    // Verify screenshot files physically exist and have non-zero size
    const actionPath = path.join(tempDir, step1.actionFile);
    const resultPath = path.join(tempDir, step1.resultFile);

    assert.ok(fs.existsSync(actionPath), `Action screenshot ${actionPath} must exist`);
    assert.ok(fs.statSync(actionPath).size > 1000, 'Action screenshot must not be empty');

    assert.ok(fs.existsSync(resultPath), `Result screenshot ${resultPath} must exist`);
    assert.ok(fs.statSync(resultPath).size > 1000, 'Result screenshot must not be empty');
  });

  test('should record input submit on Enter key', async () => {
    await page.fill('#search-box', 'Invoice #2026-99');
    await page.press('#search-box', 'Enter');

    // Wait for the browser's 200ms setTimeout before event is pushed to Node
    await page.waitForTimeout(250);
    await recorder.waitForIdle();

    const manifestPath = path.join(tempDir, 'steps.json');
    const steps = JSON.parse(fs.readFileSync(manifestPath, 'utf-8'));
    assert.strictEqual(steps.length, 2);

    const step2 = steps[1];
    assert.strictEqual(step2.step, 2);
    assert.strictEqual(step2.type, 'submit_input');
    assert.ok(fs.existsSync(path.join(tempDir, step2.actionFile)));
  });

  test('should record manual screen snapshot on F8 hotkey', async () => {
    await page.keyboard.press('F8');
    await page.waitForTimeout(50);
    await recorder.waitForIdle();

    const manifestPath = path.join(tempDir, 'steps.json');
    const steps = JSON.parse(fs.readFileSync(manifestPath, 'utf-8'));
    assert.strictEqual(steps.length, 3);

    const step3 = steps[2];
    assert.strictEqual(step3.step, 3);
    assert.strictEqual(step3.type, 'manual_screen');
    assert.strictEqual(step3.resultFile, null, 'manual_screen should not capture result');
    assert.ok(fs.existsSync(path.join(tempDir, step3.actionFile)));
  });

  test('should automatically redact sensitive password fields on enter', async () => {
    await page.fill('#password-box', 'SuperSecretPass123!');
    await page.press('#password-box', 'Enter');
    await page.waitForTimeout(250);
    await recorder.waitForIdle();

    const manifestPath = path.join(tempDir, 'steps.json');
    const steps = JSON.parse(fs.readFileSync(manifestPath, 'utf-8'));
    assert.strictEqual(steps.length, 4);

    const step4 = steps[3];
    assert.strictEqual(step4.step, 4);
    assert.strictEqual(step4.type, 'submit_input');
    assert.strictEqual(step4.isRedacted, true);
    assert.ok(!step4.label.includes('SuperSecretPass123!'), 'Plain password must NOT be in label');
    assert.match(step4.label, /••••••••/);
  });

  test('should generate complete documentation with valid assets', () => {
    const generator = new GuideGenerator(tempDir, { title: 'FlowSnap Test SOP' });
    const { mdPath, htmlPath } = generator.generate();

    assert.ok(fs.existsSync(mdPath), 'GUIDE.md must exist');
    assert.ok(fs.existsSync(htmlPath), 'index.html must exist');

    const mdContent = fs.readFileSync(mdPath, 'utf-8');
    const htmlContent = fs.readFileSync(htmlPath, 'utf-8');

    assert.match(mdContent, /Total Langkah: 4/);
    assert.match(htmlContent, /Total: 4 Langkah/);
  });
});
