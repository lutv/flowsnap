import { test, describe, beforeEach, afterEach } from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import os from 'node:os';
import { ConfigManager } from '../src/config.mjs';

describe('ConfigManager', () => {
  let tempDir;
  let localConfigFile;

  beforeEach(() => {
    tempDir = fs.mkdtempSync(path.join(os.tmpdir(), 'flowsnap-config-test-'));
    localConfigFile = path.join(tempDir, 'flowsnap.json');
  });

  afterEach(() => {
    fs.rmSync(tempDir, { recursive: true, force: true });
  });

  test('should load default configuration when no local config exists', () => {
    const mgr = new ConfigManager(localConfigFile);
    const prof = mgr.getProfile('default');

    assert.ok(prof, 'Profile default should exist');
    assert.strictEqual(prof.name, 'default');
    assert.strictEqual(prof.autoResult, true);
    assert.ok(prof.url.length > 0);
    assert.ok(prof.ai);
  });

  test('should merge local config overrides', () => {
    const customConfig = {
      defaultProfile: 'staging',
      profiles: {
        staging: {
          url: 'https://staging.example.com',
          outDir: './recordings/staging-test',
          autoResult: false
        }
      }
    };
    fs.writeFileSync(localConfigFile, JSON.stringify(customConfig), 'utf-8');

    const mgr = new ConfigManager(localConfigFile);
    const prof = mgr.getProfile('staging');

    assert.strictEqual(prof.name, 'staging');
    assert.strictEqual(prof.url, 'https://staging.example.com');
    assert.strictEqual(prof.autoResult, false);
    assert.strictEqual(prof.outDir, './recordings/staging-test');
  });

  test('should dynamically create and list profiles', () => {
    const mgr = new ConfigManager(localConfigFile);
    mgr.setProfile('production', {
      url: 'https://prod.example.com',
      outDir: './recordings/prod'
    });

    const list = mgr.listProfiles();
    const prodProfile = list.find(p => p.name === 'production');

    assert.ok(prodProfile, 'Production profile should be listed');
    assert.strictEqual(prodProfile.url, 'https://prod.example.com');
  });
});
