import { test, describe, beforeEach, afterEach } from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import os from 'node:os';
import { GuideGenerator } from '../src/generator.mjs';

describe('GuideGenerator', () => {
  let tempDir;

  beforeEach(() => {
    tempDir = fs.mkdtempSync(path.join(os.tmpdir(), 'flowsnap-generator-test-'));
  });

  afterEach(() => {
    fs.rmSync(tempDir, { recursive: true, force: true });
  });

  test('should generate GUIDE.md and index.html for recorded steps', () => {
    const generator = new GuideGenerator(tempDir, { title: 'Test Flow Guide' });
    const mockSteps = [
      {
        step: 1,
        type: 'click',
        label: 'Create Invoice',
        tag: 'button',
        url: 'https://example.com/invoices',
        actionFile: 'step_001_01_action_create_invoice.png',
        resultFile: 'step_001_02_result_create_invoice.png',
        timestamp: new Date().toISOString()
      },
      {
        step: 2,
        type: 'submit_input',
        label: 'Partner Name',
        tag: 'input',
        url: 'https://example.com/invoices/new',
        actionFile: 'step_002_01_action_partner_name.png',
        resultFile: null,
        timestamp: new Date().toISOString()
      }
    ];

    const { mdPath, htmlPath } = generator.generate(mockSteps);

    assert.ok(fs.existsSync(mdPath), 'GUIDE.md should exist');
    assert.ok(fs.existsSync(htmlPath), 'index.html should exist');

    const mdContent = fs.readFileSync(mdPath, 'utf-8');
    assert.match(mdContent, /# Test Flow Guide/);
    assert.match(mdContent, /step_001_01_action_create_invoice\.png/);
    assert.match(mdContent, /step_001_02_result_create_invoice\.png/);
    assert.match(mdContent, /step_002_01_action_partner_name\.png/);

    const htmlContent = fs.readFileSync(htmlPath, 'utf-8');
    assert.match(htmlContent, /<title>Test Flow Guide<\/title>/);
    assert.match(htmlContent, /Create Invoice/);
    assert.match(htmlContent, /TARGET AKSI/);
    assert.match(htmlContent, /HASIL SETELAH AKSI/);
  });

  test('should read steps from steps.json if no steps passed to generate()', () => {
    const manifestPath = path.join(tempDir, 'steps.json');
    const mockSteps = [
      {
        step: 1,
        type: 'manual_screen',
        label: 'current_screen_view',
        tag: 'window',
        url: 'https://example.com/dashboard',
        actionFile: 'step_001_01_action_current_screen_view.png',
        resultFile: null,
        timestamp: new Date().toISOString()
      }
    ];
    fs.writeFileSync(manifestPath, JSON.stringify(mockSteps), 'utf-8');

    const generator = new GuideGenerator(tempDir, { title: 'Manifest Test' });
    const { mdPath } = generator.generate();

    const mdContent = fs.readFileSync(mdPath, 'utf-8');
    assert.match(mdContent, /Manifest Test/);
    assert.match(mdContent, /Tinjau Halaman Aktif/);
  });
});
