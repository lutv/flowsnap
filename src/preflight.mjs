import { execSync } from 'node:child_process';
import path from 'node:path';
import fs from 'node:fs';

export async function checkPlaywright() {
  console.log('\x1b[36m[Pre-flight]\x1b[0m Memeriksa dependensi Playwright...');

  let playwright = null;
  try {
    playwright = await import('playwright');
  } catch {
    // Coba global / user node_modules
    const altPath = path.join(process.env.HOME || '', '.node_modules', 'node_modules', 'playwright', 'index.js');
    if (fs.existsSync(altPath)) {
      const { createRequire } = await import('node:module');
      const require = createRequire(import.meta.url);
      playwright = require(altPath);
    }
  }

  if (!playwright) {
    console.error('\n\x1b[31m[ERROR] Playwright belum terpasang!\x1b[0m');
    console.log('FlowSnap membutuhkan library Playwright untuk merekam interaksi browser.');
    console.log('\nSilakan pasang dengan menjalankan:');
    console.log('\x1b[33m  npm install\x1b[0m  (atau: \x1b[33mnpm install playwright\x1b[0m)\n');
    process.exit(1);
  }

  // Cek apakah ada browser engine yang bisa dijalankan (Playwright Chromium, Edge, Chrome, atau Chromium sistem)
  const channels = process.platform === 'darwin'
    ? [undefined, 'chrome', 'msedge', 'chromium']
    : [undefined, 'msedge', 'chrome', 'chromium'];

  let ready = false;
  for (const channel of channels) {
    try {
      const opts = { headless: true };
      if (channel) opts.channel = channel;
      const browser = await playwright.chromium.launch(opts);
      await browser.close();
      ready = true;
      break;
    } catch {
      // Coba channel berikutnya
    }
  }

  if (!ready) {
    console.warn('\n\x1b[33m[PERINGATAN] Browser Chromium belum terpasang di sistem!\x1b[0m');
    console.log('Mencoba mengunduh Chromium via npx (hanya sekali)...');
    try {
      execSync('npx playwright install chromium', { stdio: 'inherit' });
      console.log('\x1b[32m[SUKSES] Chromium berhasil dipasang!\x1b[0m\n');
    } catch (installErr) {
      console.error('Gagal mengunduh Chromium secara otomatis:', installErr.message);
      console.log('Pastikan Google Chrome atau Microsoft Edge sudah terpasang di sistem.');
    }
  }

  return playwright;
}
