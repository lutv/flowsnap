import fs from 'node:fs';
import path from 'node:path';
import { checkPlaywright } from './preflight.mjs';

export class BrowserManager {
  constructor(options = {}) {
    this.url = options.url || 'https://example.com';
    this.outDir = options.outDir;
    // Prioritize auth_state inside outDir, fallback to profile stateFile
    this.stateFile = (this.outDir ? path.join(this.outDir, '.auth_state.json') : null) || options.stateFile;
    this.login = options.login;
    this.password = options.password;
    this.headless = options.headless ?? false;
    this.browser = null;
    this.context = null;
    this.page = null;
  }

  async launch() {
    const playwright = await checkPlaywright();
    
    let launchErr = null;
    const channels = process.platform === 'darwin'
      ? [undefined, 'chrome', 'msedge', 'chromium']
      : [undefined, 'msedge', 'chrome', 'chromium'];
    for (const channel of channels) {
      try {
        const opts = {
          headless: this.headless,
          args: ['--start-maximized']
        };
        if (channel) opts.channel = channel;
        this.browser = await playwright.chromium.launch(opts);
        if (channel) {
          console.log(`\x1b[32m[Browser]\x1b[0m Berhasil menggunakan browser sistem: \x1b[1m${channel}\x1b[0m`);
        }
        launchErr = null;
        break;
      } catch (err) {
        launchErr = err;
      }
    }

    if (!this.browser && launchErr) {
      throw launchErr;
    }

    const contextOpts = { viewport: null };

    // Restore persistent session cookies & localStorage if available
    if (this.stateFile && fs.existsSync(this.stateFile)) {
      try {
        console.log(`\x1b[36m[Session State]\x1b[0m Memulihkan session cookies dari: \x1b[33m${path.basename(this.stateFile)}\x1b[0m`);
        contextOpts.storageState = this.stateFile;
      } catch (err) {
        console.error('Gagal membaca storageState tersimpan:', err.message);
      }
    }

    this.context = await this.browser.newContext(contextOpts);
    this.page = await this.context.newPage();

    // Auto-save storageState whenever user navigates or interacts
    this.page.on('close', async () => {
      await this.saveStorageState().catch(() => {});
    });

    console.log(`Membuka URL target: \x1b[34m${this.url}\x1b[0m...`);
    await this.page.goto(this.url).catch(() => {});
    await this.page.waitForTimeout(1500);

    // Odoo auto-login hook jika kredensial disediakan
    if (this.page.url().includes('/web/login') && this.login && this.password) {
      console.log(`Mendeteksi login page. Melakukan auto-login user: ${this.login}...`);
      await this.page.fill("input#login, input[name='login']", this.login).catch(() => {});
      await this.page.fill("input#password, input[name='password']", this.password).catch(() => {});
      await this.page.click("button[type='submit']").catch(() => {});
      await this.page.waitForLoadState('domcontentloaded').catch(() => {});
      await this.page.waitForTimeout(2000);
      await this.saveStorageState();
    }

    return { browser: this.browser, context: this.context, page: this.page };
  }

  async saveStorageState() {
    if (this.context && this.stateFile) {
      try {
        fs.mkdirSync(path.dirname(this.stateFile), { recursive: true });
        await this.context.storageState({ path: this.stateFile });
        console.log(`\x1b[32m[Session State]\x1b[0m Cookie & session kredensial tersimpan ke: \x1b[34m${path.basename(this.stateFile)}\x1b[0m`);
      } catch (err) {
        // Context might have already been destroyed on browser exit
      }
    }
  }

  async close() {
    await this.saveStorageState().catch(() => {});
    if (this.browser) {
      await this.browser.close().catch(() => {});
    }
  }
}
