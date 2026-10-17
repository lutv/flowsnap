import fs from 'node:fs';
import path from 'node:path';
import os from 'node:os';
import { fileURLToPath } from 'node:url';
import { FlowSnapMCPServer } from './mcp_server.mjs';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const ROOT_DIR = path.resolve(__dirname, '..');

export class AgentInstaller {
  constructor(options = {}) {
    this.rootDir = options.rootDir || ROOT_DIR;
    this.mcpEntrypoint = path.join(this.rootDir, 'bin', 'flowsnap-mcp.mjs');
    this.skillSource = path.join(this.rootDir, '.agents', 'skills', 'flowsnap', 'SKILL.md');
    this.homeDir = os.homedir();
  }

  getClientConfigPaths() {
    const isWin = process.platform === 'win32';
    const isMac = process.platform === 'darwin';

    // 1. Antigravity / Gemini CLI
    const antigravityConfig = path.join(this.homeDir, '.gemini', 'config', 'mcp_config.json');
    const antigravityMcpDir = path.join(this.homeDir, '.gemini', 'antigravity-cli', 'mcp', 'flowsnap');
    const antigravitySkillDir = path.join(this.homeDir, '.gemini', 'antigravity-cli', 'builtin', 'skills', 'flowsnap');
    const geminiGlobalSkillDir = path.join(this.homeDir, '.gemini', 'config', 'skills', 'flowsnap');

    // 2. Claude Desktop
    let claudeConfig;
    if (isMac) {
      claudeConfig = path.join(this.homeDir, 'Library', 'Application Support', 'Claude', 'claude_desktop_config.json');
    } else if (isWin) {
      claudeConfig = path.join(process.env.APPDATA || path.join(this.homeDir, 'AppData', 'Roaming'), 'Claude', 'claude_desktop_config.json');
    } else {
      claudeConfig = path.join(this.homeDir, '.config', 'Claude', 'claude_desktop_config.json');
    }

    // 3. Cursor
    const cursorConfig = path.join(this.homeDir, '.cursor', 'mcp.json');

    // 4. Windsurf
    const windsurfConfig = path.join(this.homeDir, '.codeium', 'windsurf', 'mcp_config.json');

    return {
      antigravity: {
        mcpConfig: antigravityConfig,
        mcpSchemasDir: antigravityMcpDir,
        skillDirs: [antigravitySkillDir, geminiGlobalSkillDir]
      },
      claude: {
        mcpConfig: claudeConfig
      },
      cursor: {
        mcpConfig: cursorConfig
      },
      windsurf: {
        mcpConfig: windsurfConfig
      }
    };
  }

  installSkill(targetDirs = []) {
    if (!fs.existsSync(this.skillSource)) {
      throw new Error(`Skill source file not found at: ${this.skillSource}`);
    }

    const skillContent = fs.readFileSync(this.skillSource, 'utf-8');
    const installed = [];

    // Also include project workspace skill if in a project directory
    const workspaceSkillDir = path.join(process.cwd(), '.agents', 'skills', 'flowsnap');
    const allTargets = new Set([...targetDirs, workspaceSkillDir]);

    for (const targetDir of allTargets) {
      try {
        if (!fs.existsSync(targetDir)) {
          fs.mkdirSync(targetDir, { recursive: true });
        }
        const targetFile = path.join(targetDir, 'SKILL.md');
        fs.writeFileSync(targetFile, skillContent, 'utf-8');
        installed.push(targetFile);
      } catch (err) {
        // Continue to other targets even if one fails
      }
    }

    return installed;
  }

  installAntigravitySchemas(targetDir) {
    if (!fs.existsSync(targetDir)) {
      fs.mkdirSync(targetDir, { recursive: true });
    }

    const server = new FlowSnapMCPServer();
    const tools = server.getToolDefinitions();
    const installed = [];

    for (const tool of tools) {
      const filePath = path.join(targetDir, `${tool.name}.json`);
      fs.writeFileSync(filePath, JSON.stringify(tool, null, 2), 'utf-8');
      installed.push(filePath);
    }

    return installed;
  }

  updateConfigFile(configPath, keyName = 'mcpServers') {
    let config = { [keyName]: {} };

    if (fs.existsSync(configPath)) {
      try {
        const raw = fs.readFileSync(configPath, 'utf-8');
        config = JSON.parse(raw);
        if (!config[keyName]) {
          config[keyName] = {};
        }
      } catch {
        config = { [keyName]: {} };
      }
    } else {
      const parentDir = path.dirname(configPath);
      if (!fs.existsSync(parentDir)) {
        fs.mkdirSync(parentDir, { recursive: true });
      }
    }

    // Register flowsnap
    config[keyName]['flowsnap'] = {
      command: 'node',
      args: [this.mcpEntrypoint],
      env: {}
    };

    fs.writeFileSync(configPath, JSON.stringify(config, null, 2), 'utf-8');
    return configPath;
  }

  installAll(options = {}) {
    const clients = this.getClientConfigPaths();
    const results = {
      skills: [],
      mcpServers: [],
      schemas: [],
      errors: []
    };

    const target = options.target || 'all';

    // 1. Antigravity / Gemini CLI
    if (target === 'all' || target === 'antigravity') {
      try {
        // Install MCP config
        this.updateConfigFile(clients.antigravity.mcpConfig);
        results.mcpServers.push({ client: 'Antigravity / Gemini', path: clients.antigravity.mcpConfig });

        // Install Lazy Schemas
        const schemas = this.installAntigravitySchemas(clients.antigravity.mcpSchemasDir);
        results.schemas.push({ dir: clients.antigravity.mcpSchemasDir, count: schemas.length });

        // Install Skills
        const skills = this.installSkill(clients.antigravity.skillDirs);
        results.skills.push(...skills);
      } catch (err) {
        results.errors.push({ client: 'antigravity', error: err.message });
      }
    }

    // 2. Claude Desktop
    if (target === 'all' || target === 'claude') {
      try {
        this.updateConfigFile(clients.claude.mcpConfig);
        results.mcpServers.push({ client: 'Claude Desktop', path: clients.claude.mcpConfig });
      } catch (err) {
        results.errors.push({ client: 'claude', error: err.message });
      }
    }

    // 3. Cursor
    if (target === 'all' || target === 'cursor') {
      try {
        this.updateConfigFile(clients.cursor.mcpConfig);
        results.mcpServers.push({ client: 'Cursor', path: clients.cursor.mcpConfig });
      } catch (err) {
        results.errors.push({ client: 'cursor', error: err.message });
      }
    }

    // 4. Windsurf
    if (target === 'all' || target === 'windsurf') {
      try {
        this.updateConfigFile(clients.windsurf.mcpConfig);
        results.mcpServers.push({ client: 'Windsurf', path: clients.windsurf.mcpConfig });
      } catch (err) {
        results.errors.push({ client: 'windsurf', error: err.message });
      }
    }

    return results;
  }
}
