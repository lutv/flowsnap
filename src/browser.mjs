import fs from 'node:fs';
import path from 'node:path';
import { checkPlaywright } from './preflight.mjs';

export class BrowserManager {
  constructor(options = {}) {
    this.url = options.url || 'https://example.com';
    this.stateFile = options.stateFile;
    this.login = options.login;
    this.password = options.password;
    this.headless = options.headless ?? false;
    this.browser = null;
    this.context = null;
    this.page = null;
  }

  async launch() {
    const playwright = await checkPlaywright();
    
    this.browser = await playwright.chromium.launch({
      headless: this.headless,
      args: ['--start-maximized']
    });

    const contextOpts = { viewport: null };
    if (this.stateFile && fs.existsSync(this.stateFile)) {
      contextOpts.storageState = this.stateFile;
    }

    this.context = await this.browser.newContext(contextOpts);
    this.page = await this.context.newPage();

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

      if (this.stateFile) {
        fs.mkdirSync(path.dirname(this.stateFile), { recursive: true });
        await this.context.storageState({ path: this.stateFile });
        console.log('Session state berhasil disimpan.');
      }
    }

    return { browser: this.browser, context: this.context, page: this.page };
  }

  async close() {
    if (this.browser) {
      await this.browser.close().catch(() => {});
    }
  }
}
