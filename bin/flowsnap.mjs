#!/usr/bin/env node
/**
 * FlowSnap — Autonomous UI Action Recorder & Intelligent SOP Synthesizer.
 */

import fs from 'node:fs';
import path from 'node:path';
import readline from 'node:readline';
import { fileURLToPath } from 'node:url';
import { ConfigManager } from '../src/config.mjs';
import { BrowserManager } from '../src/browser.mjs';
import { ActionRecorder } from '../src/recorder.mjs';
import { GuideGenerator } from '../src/generator.mjs';
import { AIEnhancer } from '../src/ai_enhancer.mjs';

const configMgr = new ConfigManager();

function printHelp() {
  console.log(`
\x1b[1m\x1b[35mFLOWSNAP\x1b[0m — \x1b[1mAutonomous UI Action Recorder & Intelligent SOP Synthesizer\x1b[0m

\x1b[1mPenggunaan:\x1b[0m
  flowsnap <command> [options]

\x1b[1mCommands:\x1b[0m
  \x1b[33mstart\x1b[0m               Mulai sesi perekaman interaktif di browser
  \x1b[33mgenerate\x1b[0m            Re-generate Markdown & HTML dari steps.json
  \x1b[33mai-enhance\x1b[0m          Sempurnakan panduan dengan AI (Gemini / OpenAI / Ollama)
  \x1b[33mvalidate\x1b[0m            Jalankan pengujian diagnostik & validasi otomatis
  \x1b[33msetup-agent\x1b[0m         Install MCP Server & Skill otomatis ke Antigravity, Claude, Cursor
  \x1b[33mprofiles\x1b[0m            Daftar profil instance yang tersimpan
  \x1b[33mprofile add <name>\x1b[0m  Simpan profil instance baru

\x1b[1mOptions:\x1b[0m
  --url <url>         Target URL (default: dari profil aktif)
  --out, -o <dir>     Direktori penyimpanan screenshot & output (default: ./recordings)
  --profile, -p <p>   Pilih profil konfigurasi
  --title <text>      Judul dokumen panduan / SOP
  --target <client>   Target client untuk setup-agent (all | antigravity | claude | cursor | windsurf)
  --no-result         Hanya rekam aksi klik (nonaktifkan capture result)
  --ai                Langsung enhance panduan dengan AI setelah rekaman selesai
  --ai-key <key>      API Key untuk AI (Gemini / OpenAI)
  --provider <prov>   AI Provider: gemini | openai | ollama (default: gemini)
  --help, -h          Tampilkan bantuan ini

\x1b[1mContoh Penggunaan:\x1b[0m
  flowsnap start --url https://staging.example.com --out ./docs/stages
  flowsnap setup-agent --target all
  flowsnap start --profile production --title "Panduan Pembuatan Kontrak"
  flowsnap ai-enhance --out ./docs/stages --provider gemini
`);
}

function parseArgs(args) {
  let cmd = args[0] || 'start';
  if (cmd.startsWith('-')) cmd = 'help';

  const parsed = {
    command: cmd,
    params: {},
    raw: args
  };

  for (let i = 1; i < args.length; i++) {
    const arg = args[i];
    if (arg === '--url' && args[i + 1]) parsed.params.url = args[++i];
    else if ((arg === '--out' || arg === '-o') && args[i + 1]) parsed.params.outDir = args[++i];
    else if ((arg === '--profile' || arg === '-p') && args[i + 1]) parsed.params.profile = args[++i];
    else if (arg === '--title' && args[i + 1]) parsed.params.title = args[++i];
    else if (arg === '--target' && args[i + 1]) parsed.params.target = args[++i];
    else if (arg === '--ai-key' && args[i + 1]) parsed.params.aiKey = args[++i];
    else if (arg === '--provider' && args[i + 1]) parsed.params.provider = args[++i];
    else if (arg === '--no-result') parsed.params.noResult = true;
    else if (arg === '--ai') parsed.params.runAI = true;
    else if (arg === '--resume') parsed.params.resume = true;
    else if (arg === '--help' || arg === '-h') parsed.params.help = true;
  }

  return parsed;
}

async function handleStart(params) {
  const prof = configMgr.getProfile(params.profile);
  let targetUrl = params.url || prof.url;
  const outDir = params.outDir || prof.outDir;
  let title = params.title || prof.markdown.title;
  const autoResult = params.noResult ? false : prof.autoResult;

  // Cek apakah mode resume aktif dan ada manifest sebelumnya
  const manifestPath = path.join(outDir, 'steps.json');
  if (params.resume && fs.existsSync(manifestPath)) {
    try {
      const existing = JSON.parse(fs.readFileSync(manifestPath, 'utf-8'));
      if (existing.length > 0) {
        const lastStep = existing[existing.length - 1];
        if (lastStep.url && lastStep.url.startsWith('http') && !params.url) {
          targetUrl = lastStep.url;
        }
        console.log(`\x1b[35m[FlowSnap Resume]\x1b[0m Melanjutkan sesi "${outDir}" (${existing.length} langkah sebelumnya)...`);
      }
    } catch {}
  }

  console.log('\x1b[35m%s\x1b[0m', '===========================================================');
  console.log('\x1b[1m\x1b[32m%s\x1b[0m', '   📸 FLOWSNAP — INTERACTIVE RECORDER & DUAL-CAPTURE      ');
  console.log('\x1b[35m%s\x1b[0m', '===========================================================');
  console.log(`• Target URL : \x1b[34m${targetUrl}\x1b[0m`);
  console.log(`• Output Dir : \x1b[34m${outDir}\x1b[0m`);
  console.log(`• Profile    : \x1b[33m${prof.name}\x1b[0m`);
  console.log(`• Auto Result: \x1b[1m${autoResult ? 'AKTIF (Dual)' : 'NONAKTIF'}\x1b[0m`);
  if (params.resume) console.log(`• Mode Sesi  : \x1b[1m\x1b[32mRESUME (Lanjutkan langkah sebelumnya)\x1b[0m`);
  console.log('-----------------------------------------------------------');

  const browserMgr = new BrowserManager({
    url: targetUrl,
    outDir: outDir,
    stateFile: prof.stateFile,
    headless: false
  });

  const { page, browser } = await browserMgr.launch();

  const generator = new GuideGenerator(outDir, { title });
  const recorder = new ActionRecorder(page, {
    outDir,
    autoResult,
    postWaitMs: prof.postWaitMs,
    redaction: prof.redaction,
    resume: params.resume,
    onStepCaptured: (step, allSteps) => {
      generator.generate(allSteps);
    }
  });

  await recorder.attach();

  console.log('\n\x1b[1m\x1b[32m%s\x1b[0m', '✅ BROWSER SIAP DIGUNAKAN!');
  console.log('- Klik elemen apa saja: Action + Result otomatis ter-capture.');
  console.log('- Tekan \x1b[1mF8\x1b[0m: Instant Screen Capture.');
  console.log('- Tekan \x1b[1mF9\x1b[0m: Active Modal Dialog Capture.');
  console.log('- Floating HUD widget di pojok kanan bawah siap digunakan.');
  console.log('\x1b[33mTekan Enter / Ctrl+C atau tutup jendela Chromium untuk mengakhiri rekaman.\x1b[0m\n');

  const rl = readline.createInterface({ input: process.stdin, output: process.stdout });
  await new Promise((resolve) => {
    rl.question('', () => resolve());
    browser.on('disconnected', () => resolve());
    page.on('close', () => resolve());
  });
  rl.close();

  console.log('\nMenyelesaikan antrean perekaman gambar...');
  await recorder.waitForIdle();

  console.log('Menyusun dokumen panduan akhir...');
  let finalSteps = recorder.recordedSteps;

  if (params.runAI) {
    const ai = new AIEnhancer({
      provider: params.provider || prof.ai.provider,
      apiKey: params.aiKey || prof.ai.apiKey,
      model: prof.ai.model
    });
    finalSteps = await ai.enhanceSteps(finalSteps, title);
  }

  const { mdPath, htmlPath } = generator.generate(finalSteps);
  console.log(`\n\x1b[32m[SUKSES REKAMAN SELESAI]\x1b[0m`);
  console.log(`• Markdown SOP : \x1b[34m${mdPath}\x1b[0m`);
  console.log(`• Web Viewer   : \x1b[34m${htmlPath}\x1b[0m`);

  await browserMgr.close();
  process.exit(0);
}

async function handleGenerate(params) {
  const prof = configMgr.getProfile(params.profile);
  const outDir = params.outDir || prof.outDir;
  const title = params.title || prof.markdown.title;

  console.log(`Generating panduan dari ${outDir}...`);
  const generator = new GuideGenerator(outDir, { title });
  const { mdPath, htmlPath } = generator.generate();
  console.log(`Update selesai:\n- ${mdPath}\n- ${htmlPath}`);
}

async function handleAIEnhance(params) {
  const prof = configMgr.getProfile(params.profile);
  const outDir = params.outDir || prof.outDir;
  const title = params.title || prof.markdown.title;
  const manifestPath = path.join(path.resolve(process.cwd(), outDir), 'steps.json');

  if (!fs.existsSync(manifestPath)) {
    console.error(`Error: File steps.json tidak ditemukan di ${outDir}`);
    process.exit(1);
  }

  const steps = JSON.parse(fs.readFileSync(manifestPath, 'utf-8'));
  const ai = new AIEnhancer({
    provider: params.provider || prof.ai.provider,
    apiKey: params.aiKey || prof.ai.apiKey,
    model: prof.ai.model
  });

  const enhanced = await ai.enhanceSteps(steps, title);
  fs.writeFileSync(manifestPath, JSON.stringify(enhanced, null, 2), 'utf-8');

  const generator = new GuideGenerator(outDir, { title });
  generator.generate(enhanced);
  console.log(`\x1b[32m[SUKSES]\x1b[0m Panduan di ${outDir} berhasil disintesis dengan narasi AI!`);
}

async function handleProfiles(rawArgs) {
  const sub = rawArgs[1];
  if (sub === 'add' && rawArgs[2]) {
    const pName = rawArgs[2];
    const url = rawArgs[3] || 'https://example.com';
    configMgr.setProfile(pName, { url, outDir: `./recordings/${pName}` });
    console.log(`Profil '${pName}' berhasil disimpan (URL: ${url}).`);
    return;
  }

  console.log('\x1b[1mDaftar Profil Instance Tersimpan:\x1b[0m');
  const list = configMgr.listProfiles();
  list.forEach((p) => {
    console.log(`• \x1b[33m${p.name}\x1b[0m ${p.isDefault ? '(default)' : ''}`);
    console.log(`  URL    : ${p.url}`);
    console.log(`  Output : ${p.outDir}`);
  });
}

async function handleSetupAgent(params) {
  const { AgentInstaller } = await import('../src/installer.mjs');
  const installer = new AgentInstaller();
  const target = params.target || 'all';

  console.log('\x1b[35m%s\x1b[0m', '===========================================================');
  console.log('\x1b[1m\x1b[36m[FlowSnap Setup]\x1b[0m Menginstal MCP Server & AI Agent Skill...');
  console.log('\x1b[35m%s\x1b[0m', '===========================================================');

  const results = installer.installAll({ target });

  if (results.mcpServers.length > 0) {
    console.log('\n\x1b[1m\x1b[32m✔ MCP Servers Registered:\x1b[0m');
    for (const s of results.mcpServers) {
      console.log(`  • \x1b[33m${s.client}\x1b[0m -> ${s.path}`);
    }
  }

  if (results.schemas.length > 0) {
    console.log('\n\x1b[1m\x1b[32m✔ Antigravity Lazy Schemas Generated:\x1b[0m');
    for (const sc of results.schemas) {
      console.log(`  • ${sc.count} tool schemas di: ${sc.dir}`);
    }
  }

  if (results.skills.length > 0) {
    console.log('\n\x1b[1m\x1b[32m✔ FlowSnap Agent Skill Installed:\x1b[0m');
    for (const sk of results.skills) {
      console.log(`  • ${sk}`);
    }
  }

  if (results.errors.length > 0) {
    console.log('\n\x1b[1m\x1b[31m⚠ Beberapa target dilewati:\x1b[0m');
    for (const err of results.errors) {
      console.log(`  • [${err.client}] ${err.error}`);
    }
  }

  console.log('\n\x1b[32m✔ Instalasi selesai!\x1b[0m AI Coding Agent Anda sekarang siap menggunakan FlowSnap.');
  console.log('  Uji kesiapan dengan tool MCP: \x1b[36mflowsnap_validate\x1b[0m\n');
}

async function main() {
  const args = process.argv.slice(2);
  const parsed = parseArgs(args);

  if (parsed.params.help || args.length === 0 || parsed.command === 'help') {
    printHelp();
    return;
  }

  if (parsed.command === 'start') {
    await handleStart(parsed.params);
  } else if (parsed.command === 'generate') {
    await handleGenerate(parsed.params);
  } else if (parsed.command === 'ai-enhance') {
    await handleAIEnhance(parsed.params);
  } else if (parsed.command === 'validate' || parsed.command === 'test') {
    const validateScript = path.resolve(fileURLToPath(import.meta.url), '../../scripts/validate.mjs');
    const { fork } = await import('node:child_process');
    const child = fork(validateScript);
    child.on('exit', (code) => process.exit(code || 0));
  } else if (parsed.command === 'setup-agent' || parsed.command === 'install-mcp' || parsed.command === 'setup') {
    await handleSetupAgent(parsed.params);
  } else if (parsed.command === 'profiles' || parsed.command === 'profile') {
    await handleProfiles(args);
  } else {
    console.log(`Command '${parsed.command}' tidak dikenal.`);
    printHelp();
  }
}

main().catch((err) => {
  console.error('Fatal CLI Error:', err);
  process.exit(1);
});
