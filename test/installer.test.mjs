import { describe, it } from 'node:test';
import assert from 'node:assert';
import fs from 'node:fs';
import path from 'node:path';
import os from 'node:os';
import { AgentInstaller } from '../src/installer.mjs';

describe('AgentInstaller', () => {
  const tmpDir = path.join(os.tmpdir(), `flowsnap-installer-test-${Date.now()}`);

  it('should resolve client config paths across platforms', () => {
    const installer = new AgentInstaller({ rootDir: process.cwd() });
    const paths = installer.getClientConfigPaths();

    assert.ok(paths.antigravity.mcpConfig, 'antigravity mcpConfig path should exist');
    assert.ok(paths.antigravity.mcpSchemasDir, 'antigravity mcpSchemasDir path should exist');
    assert.ok(Array.isArray(paths.antigravity.skillDirs), 'skillDirs should be an array');
    assert.ok(paths.claude.mcpConfig, 'claude mcpConfig path should exist');
    assert.ok(paths.cursor.mcpConfig, 'cursor mcpConfig path should exist');
    assert.ok(paths.windsurf.mcpConfig, 'windsurf mcpConfig path should exist');
  });

  it('should install skill into target directories', () => {
    const installer = new AgentInstaller({ rootDir: process.cwd() });
    const testSkillDir = path.join(tmpDir, 'test-skills');
    
    const installed = installer.installSkill([testSkillDir]);
    assert.ok(installed.length > 0, 'Should return installed skill paths');
    assert.ok(fs.existsSync(path.join(testSkillDir, 'SKILL.md')), 'SKILL.md should be copied to target directory');
    
    const content = fs.readFileSync(path.join(testSkillDir, 'SKILL.md'), 'utf-8');
    assert.match(content, /name:\s*flowsnap/, 'Skill should contain flowsnap metadata');
  });

  it('should export lazy tool schemas for Antigravity', () => {
    const installer = new AgentInstaller({ rootDir: process.cwd() });
    const testSchemaDir = path.join(tmpDir, 'test-schemas');

    const installed = installer.installAntigravitySchemas(testSchemaDir);
    assert.strictEqual(installed.length, 7, 'Should install all 7 MCP tool schemas');
    assert.ok(fs.existsSync(path.join(testSchemaDir, 'flowsnap_record_automated.json')));
    assert.ok(fs.existsSync(path.join(testSchemaDir, 'flowsnap_validate.json')));
  });

  it('should update mcp config file without corrupting existing servers', () => {
    const installer = new AgentInstaller({ rootDir: process.cwd() });
    const testConfigFile = path.join(tmpDir, 'test-config', 'mcp_config.json');

    // Pre-populate with another dummy server
    fs.mkdirSync(path.dirname(testConfigFile), { recursive: true });
    fs.writeFileSync(testConfigFile, JSON.stringify({
      mcpServers: {
        'existing-server': { command: 'echo', args: ['hello'] }
      }
    }), 'utf-8');

    installer.updateConfigFile(testConfigFile);

    const updated = JSON.parse(fs.readFileSync(testConfigFile, 'utf-8'));
    assert.ok(updated.mcpServers['existing-server'], 'Existing server should be preserved');
    assert.ok(updated.mcpServers['flowsnap'], 'flowsnap server should be registered');
    assert.match(updated.mcpServers['flowsnap'].args[0], /flowsnap-mcp\.mjs$/, 'Argument should point to flowsnap-mcp.mjs');

    // Clean up tmp test dir
    fs.rmSync(tmpDir, { recursive: true, force: true });
  });
});
