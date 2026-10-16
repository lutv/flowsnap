import fs from 'node:fs';
import path from 'node:path';
import os from 'node:os';

const GLOBAL_CONFIG_DIR = path.join(os.homedir(), '.flowsnap');
const GLOBAL_CONFIG_FILE = path.join(GLOBAL_CONFIG_DIR, 'config.json');

export class ConfigManager {
  constructor(localConfigPath = null) {
    this.localConfigPath = localConfigPath || path.resolve(process.cwd(), 'flowsnap.json');
    this.ensureDirs();
    this.config = this.loadConfig();
  }

  ensureDirs() {
    fs.mkdirSync(GLOBAL_CONFIG_DIR, { recursive: true });
    fs.mkdirSync(path.join(GLOBAL_CONFIG_DIR, 'sessions'), { recursive: true });
  }

  loadConfig() {
    let base = {
      defaultProfile: 'default',
      profiles: {
        default: {
          url: 'https://development-legal.odoo.com',
          outDir: './recordings/default',
          stateFile: path.join(GLOBAL_CONFIG_DIR, 'sessions', 'default.json'),
          autoResult: true,
          postWaitMs: 800,
          ai: {
            provider: 'gemini',
            model: 'gemini-1.5-flash',
            apiKey: process.env.GEMINI_API_KEY || process.env.OPENAI_API_KEY || '',
            endpoint: 'http://localhost:11434'
          },
          markdown: {
            title: 'SOP & Panduan Alur Kerja',
            includeResult: true,
            format: 'detailed'
          }
        }
      }
    };

    if (fs.existsSync(GLOBAL_CONFIG_FILE)) {
      try {
        const loaded = JSON.parse(fs.readFileSync(GLOBAL_CONFIG_FILE, 'utf-8'));
        base = { ...base, ...loaded, profiles: { ...base.profiles, ...(loaded.profiles || {}) } };
      } catch (err) {
        console.warn('Gagal membaca config global:', err.message);
      }
    }

    if (fs.existsSync(this.localConfigPath)) {
      try {
        const local = JSON.parse(fs.readFileSync(this.localConfigPath, 'utf-8'));
        base = { ...base, ...local, profiles: { ...base.profiles, ...(local.profiles || {}) } };
      } catch (err) {
        console.warn('Gagal membaca flowsnap.json:', err.message);
      }
    }

    return base;
  }

  saveGlobal() {
    fs.writeFileSync(GLOBAL_CONFIG_FILE, JSON.stringify(this.config, null, 2), 'utf-8');
  }

  getProfile(name = null) {
    const pName = name || this.config.defaultProfile || 'default';
    if (!this.config.profiles[pName]) {
      this.config.profiles[pName] = {
        url: 'https://example.com',
        outDir: `./recordings/${pName}`,
        stateFile: path.join(GLOBAL_CONFIG_DIR, 'sessions', `${pName}.json`),
        autoResult: true,
        postWaitMs: 800,
        ai: { provider: 'gemini', model: 'gemini-1.5-flash', apiKey: '' },
        markdown: { title: `Panduan Alur (${pName})`, includeResult: true, format: 'detailed' }
      };
      this.saveGlobal();
    }

    const prof = this.config.profiles[pName];
    fs.mkdirSync(path.dirname(prof.stateFile), { recursive: true });
    return { name: pName, ...prof };
  }

  setProfile(name, data) {
    this.config.profiles[name] = {
      ...(this.config.profiles[name] || {}),
      ...data
    };
    this.saveGlobal();
  }

  listProfiles() {
    return Object.keys(this.config.profiles).map((name) => ({
      name,
      url: this.config.profiles[name].url,
      outDir: this.config.profiles[name].outDir,
      isDefault: name === (this.config.defaultProfile || 'default')
    }));
  }
}
