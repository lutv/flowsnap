import readline from 'node:readline';
import path from 'node:path';
import fs from 'node:fs';
import { ConfigManager } from './config.mjs';
import { checkPlaywright } from './preflight.mjs';
import { GuideGenerator } from './generator.mjs';
import { AIEnhancer } from './ai_enhancer.mjs';
import { ActionRecorder } from './recorder.mjs';

export class FlowSnapMCPServer {
  constructor() {
    this.configMgr = new ConfigManager();
  }

  getToolDefinitions() {
    return [
      {
        name: 'flowsnap_validate',
        description: 'Jalankan pengujian diagnostik & validasi kesiapan sistem FlowSnap (Node, Playwright, Chromium, dsb).',
        inputSchema: {
          type: 'object',
          properties: {}
        }
      },
      {
        name: 'flowsnap_list_profiles',
        description: 'Daftar semua profil instance web app / Odoo yang tersimpan di FlowSnap.',
        inputSchema: {
          type: 'object',
          properties: {}
        }
      },
      {
        name: 'flowsnap_get_profile',
        description: 'Ambil rincian konfigurasi profil FlowSnap tertentu.',
        inputSchema: {
          type: 'object',
          properties: {
            name: { type: 'string', description: 'Nama profil (contoh: default, staging, prod)' }
          }
        }
      },
      {
        name: 'flowsnap_set_profile',
        description: 'Buat atau perbarui profil instance baru di FlowSnap.',
        inputSchema: {
          type: 'object',
          properties: {
            name: { type: 'string', description: 'Nama profil' },
            url: { type: 'string', description: 'Target URL profil' },
            outDir: { type: 'string', description: 'Direktori penyimpanan rekaman' },
            autoResult: { type: 'boolean', description: 'Aktifkan dual-capture aksi + hasil' }
          },
          required: ['name', 'url']
        }
      },
      {
        name: 'flowsnap_generate_sop',
        description: 'Re-generate dokumen Markdown SOP (GUIDE.md) dan Web Viewer interaktif (index.html) dari direktori rekaman.',
        inputSchema: {
          type: 'object',
          properties: {
            outDir: { type: 'string', description: 'Direktori penyimpanan rekaman (berisi steps.json)' },
            title: { type: 'string', description: 'Judul dokumen SOP' }
          },
          required: ['outDir']
        }
      },
      {
        name: 'flowsnap_ai_enhance',
        description: 'Sempurnakan narasi jejak klik pada steps.json menggunakan AI (Gemini, OpenAI, Ollama, atau Heuristic SOP).',
        inputSchema: {
          type: 'object',
          properties: {
            outDir: { type: 'string', description: 'Direktori rekaman (berisi steps.json)' },
            title: { type: 'string', description: 'Judul SOP' },
            provider: { type: 'string', enum: ['gemini', 'openai', 'ollama'], description: 'AI provider (default: gemini)' },
            apiKey: { type: 'string', description: 'API Key AI jika ada' },
            model: { type: 'string', description: 'Nama model AI spesifik' }
          },
          required: ['outDir']
        }
      },
      {
        name: 'flowsnap_record_automated',
        description: 'Jalankan perekaman alur kerja UI secara otomatis oleh AI Agent (Headless Playwright dengan dual-capture & auto-redaction) untuk menghasilkan dokumen SOP instan tanpa intervensi manual.',
        inputSchema: {
          type: 'object',
          properties: {
            url: { type: 'string', description: 'URL awal target web' },
            outDir: { type: 'string', description: 'Direktori penyimpanan hasil (default: ./recordings/agent-run)' },
            title: { type: 'string', description: 'Judul SOP' },
            headless: { type: 'boolean', description: 'Jalankan tanpa jendela browser (default: true)' },
            actions: {
              type: 'array',
              description: 'Urutan aksi UI yang akan dieksekusi',
              items: {
                type: 'object',
                properties: {
                  type: { type: 'string', enum: ['click', 'fill', 'snapshot', 'wait', 'press_key'], description: 'Jenis aksi' },
                  selector: { type: 'string', description: 'CSS selector elemen target (untuk click / fill)' },
                  value: { type: 'string', description: 'Teks isian (untuk fill)' },
                  pressEnter: { type: 'boolean', description: 'Tekan Enter setelah mengetik (untuk fill)' },
                  key: { type: 'string', description: 'Nama tombol (contoh: F8, Enter) untuk press_key' },
                  label: { type: 'string', description: 'Label deskripsi manual (opsional)' },
                  waitMs: { type: 'number', description: 'Waktu tunggu dalam milidetik (untuk wait)' }
                },
                required: ['type']
              }
            }
          },
          required: ['url', 'actions']
        }
      }
    ];
  }

  async executeTool(name, args = {}) {
    switch (name) {
      case 'flowsnap_validate': {
        const playwright = await checkPlaywright();
        const profiles = this.configMgr.listProfiles();
        return {
          status: 'success',
          message: 'FlowSnap Engine siap dan tervalidasi.',
          playwrightAvailable: !!playwright,
          profilesCount: profiles.length
        };
      }

      case 'flowsnap_list_profiles': {
        const list = this.configMgr.listProfiles();
        return { profiles: list };
      }

      case 'flowsnap_get_profile': {
        const prof = this.configMgr.getProfile(args.name);
        return { profile: prof };
      }

      case 'flowsnap_set_profile': {
        this.configMgr.setProfile(args.name, {
          url: args.url,
          outDir: args.outDir || `./recordings/${args.name}`,
          autoResult: args.autoResult !== false
        });
        return {
          status: 'success',
          message: `Profil '${args.name}' berhasil disimpan.`,
          profile: this.configMgr.getProfile(args.name)
        };
      }

      case 'flowsnap_generate_sop': {
        const targetDir = path.resolve(process.cwd(), args.outDir);
        const manifestPath = path.join(targetDir, 'steps.json');
        if (!fs.existsSync(manifestPath)) {
          throw new Error(`File steps.json tidak ditemukan di ${targetDir}`);
        }
        const generator = new GuideGenerator(targetDir, { title: args.title });
        const { mdPath, htmlPath } = generator.generate();
        return {
          status: 'success',
          message: 'SOP & Web Viewer berhasil dibuat.',
          markdownPath: mdPath,
          htmlViewerPath: htmlPath
        };
      }

      case 'flowsnap_ai_enhance': {
        const targetDir = path.resolve(process.cwd(), args.outDir);
        const manifestPath = path.join(targetDir, 'steps.json');
        if (!fs.existsSync(manifestPath)) {
          throw new Error(`File steps.json tidak ditemukan di ${targetDir}`);
        }
        const steps = JSON.parse(fs.readFileSync(manifestPath, 'utf-8'));
        const prof = this.configMgr.getProfile();
        const ai = new AIEnhancer({
          provider: args.provider || prof.ai?.provider || 'gemini',
          apiKey: args.apiKey || prof.ai?.apiKey,
          model: args.model || prof.ai?.model
        });
        const enhanced = await ai.enhanceSteps(steps, args.title || 'SOP Alur Kerja');
        fs.writeFileSync(manifestPath, JSON.stringify(enhanced, null, 2), 'utf-8');

        const generator = new GuideGenerator(targetDir, { title: args.title });
        const { mdPath, htmlPath } = generator.generate(enhanced);
        return {
          status: 'success',
          message: 'Langkah SOP berhasil disintesis dengan narasi AI.',
          enhancedStepsCount: enhanced.length,
          markdownPath: mdPath,
          htmlViewerPath: htmlPath
        };
      }

      case 'flowsnap_record_automated': {
        const playwright = await checkPlaywright();
        const outDir = path.resolve(process.cwd(), args.outDir || './recordings/agent-run');
        const title = args.title || 'SOP Otomatisasi AI Agent';
        const headless = args.headless !== false;

        const browser = await playwright.chromium.launch({ headless });
        const context = await browser.newContext({ viewport: { width: 1280, height: 800 } });
        const page = await context.newPage();

        const generator = new GuideGenerator(outDir, { title });
        const recorder = new ActionRecorder(page, {
          outDir,
          autoResult: true,
          postWaitMs: 300,
          onStepCaptured: (step, all) => generator.generate(all)
        });

        await recorder.attach();
        await page.goto(args.url, { waitUntil: 'domcontentloaded' }).catch(() => {});
        await page.waitForTimeout(600);

        for (const action of args.actions || []) {
          if (action.type === 'click' && action.selector) {
            await page.waitForSelector(action.selector, { timeout: 8000 }).catch(() => {});
            await page.click(action.selector).catch(() => {});
            await recorder.waitForIdle();
          } else if (action.type === 'fill' && action.selector) {
            await page.waitForSelector(action.selector, { timeout: 8000 }).catch(() => {});
            await page.fill(action.selector, action.value || '').catch(() => {});
            if (action.pressEnter) {
              await page.press(action.selector, 'Enter').catch(() => {});
              await page.waitForTimeout(250);
            }
            await recorder.waitForIdle();
          } else if (action.type === 'snapshot' || (action.type === 'press_key' && action.key === 'F8')) {
            await page.keyboard.press('F8');
            await page.waitForTimeout(50);
            await recorder.waitForIdle();
          } else if (action.type === 'wait') {
            await page.waitForTimeout(action.waitMs || 1000);
          }
        }

        await recorder.waitForIdle();
        const finalSteps = recorder.recordedSteps;
        const { mdPath, htmlPath } = generator.generate(finalSteps);

        await browser.close().catch(() => {});

        return {
          status: 'success',
          message: `Perekaman otomatis selesai. Berhasil mencatat ${finalSteps.length} langkah.`,
          totalSteps: finalSteps.length,
          outputDirectory: outDir,
          markdownPath: mdPath,
          htmlViewerPath: htmlPath
        };
      }

      default:
        throw new Error(`Tool '${name}' tidak dikenali oleh FlowSnap MCP Server.`);
    }
  }

  startStdio() {
    const rl = readline.createInterface({
      input: process.stdin,
      output: process.stdout,
      terminal: false
    });

    rl.on('line', async (line) => {
      const trimmed = line.trim();
      if (!trimmed) return;

      let msg;
      try {
        msg = JSON.parse(trimmed);
      } catch {
        return;
      }

      const id = msg.id;

      try {
        if (msg.method === 'initialize') {
          this.sendResponse(id, {
            protocolVersion: '2024-11-05',
            capabilities: { tools: {} },
            serverInfo: {
              name: 'flowsnap-mcp',
              version: '1.0.0'
            }
          });
        } else if (msg.method === 'notifications/initialized') {
          // No response needed for notification
        } else if (msg.method === 'ping') {
          this.sendResponse(id, {});
        } else if (msg.method === 'tools/list') {
          this.sendResponse(id, {
            tools: this.getToolDefinitions()
          });
        } else if (msg.method === 'tools/call') {
          const { name, arguments: toolArgs } = msg.params || {};
          const result = await this.executeTool(name, toolArgs || {});
          this.sendResponse(id, {
            content: [
              {
                type: 'text',
                text: JSON.stringify(result, null, 2)
              }
            ]
          });
        } else {
          if (id !== undefined) {
            this.sendError(id, -32601, `Method '${msg.method}' tidak didukung.`);
          }
        }
      } catch (err) {
        if (id !== undefined) {
          this.sendError(id, -32603, err.message);
        }
      }
    });

    // Suppress console logs during stdio so JSON-RPC channel is pure
    process.stderr.write('[FlowSnap MCP] Server ready on stdio transport.\n');
  }

  sendResponse(id, result) {
    const payload = JSON.stringify({
      jsonrpc: '2.0',
      id,
      result
    });
    process.stdout.write(payload + '\n');
  }

  sendError(id, code, message) {
    const payload = JSON.stringify({
      jsonrpc: '2.0',
      id,
      error: { code, message }
    });
    process.stdout.write(payload + '\n');
  }
}
