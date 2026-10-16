import { test, describe } from 'node:test';
import assert from 'node:assert/strict';
import { FlowSnapMCPServer } from '../src/mcp_server.mjs';

describe('FlowSnapMCPServer', () => {
  test('should expose complete MCP tool definitions', () => {
    const server = new FlowSnapMCPServer();
    const tools = server.getToolDefinitions();

    assert.ok(Array.isArray(tools));
    assert.ok(tools.length >= 6);

    const toolNames = tools.map(t => t.name);
    assert.ok(toolNames.includes('flowsnap_validate'));
    assert.ok(toolNames.includes('flowsnap_list_profiles'));
    assert.ok(toolNames.includes('flowsnap_get_profile'));
    assert.ok(toolNames.includes('flowsnap_set_profile'));
    assert.ok(toolNames.includes('flowsnap_generate_sop'));
    assert.ok(toolNames.includes('flowsnap_ai_enhance'));
    assert.ok(toolNames.includes('flowsnap_record_automated'));

    // Check input schema format
    for (const tool of tools) {
      assert.strictEqual(tool.inputSchema.type, 'object');
      assert.ok(tool.inputSchema.properties);
    }
  });

  test('should execute flowsnap_list_profiles successfully', async () => {
    const server = new FlowSnapMCPServer();
    const res = await server.executeTool('flowsnap_list_profiles');
    assert.ok(res.profiles);
    assert.ok(Array.isArray(res.profiles));
    assert.ok(res.profiles.length > 0);
  });

  test('should execute flowsnap_validate successfully', async () => {
    const server = new FlowSnapMCPServer();
    const res = await server.executeTool('flowsnap_validate');
    assert.strictEqual(res.status, 'success');
    assert.strictEqual(res.playwrightAvailable, true);
  });
});
