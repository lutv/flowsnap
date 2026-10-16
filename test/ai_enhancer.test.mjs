import { test, describe } from 'node:test';
import assert from 'node:assert/strict';
import { AIEnhancer } from '../src/ai_enhancer.mjs';

describe('AIEnhancer', () => {
  test('should provide sensible heuristic fallback when no API key provided', async () => {
    const enhancer = new AIEnhancer({ apiKey: '' });
    const rawSteps = [
      {
        step: 1,
        type: 'click',
        label: 'Create New Order',
        tag: 'button',
        url: 'https://example.com/orders'
      },
      {
        step: 2,
        type: 'submit_input',
        label: 'Customer Name',
        tag: 'input',
        url: 'https://example.com/orders/new'
      },
      {
        step: 3,
        type: 'click',
        label: 'Save Changes',
        tag: 'button',
        url: 'https://example.com/orders/new'
      }
    ];

    const enhanced = await enhancer.enhanceSteps(rawSteps, 'Panduan Sales Order');

    assert.strictEqual(enhanced.length, 3);
    assert.match(enhanced[0].aiTitle, /Buat Record Baru/i);
    assert.match(enhanced[1].aiTitle, /Pengisian Data Field/i);
    assert.match(enhanced[2].aiTitle, /Simpan Data/i);

    assert.ok(enhanced[0].aiDescription);
    assert.ok(enhanced[0].aiValidation);
  });

  test('should parse various JSON formats correctly', () => {
    const enhancer = new AIEnhancer();

    // 1. Direct array JSON
    const parsedArray = enhancer.parseAIResponse(
      JSON.stringify([{ step: 1, title: 'Step 1', description: 'Desc 1', validation: 'Valid 1' }])
    );
    assert.strictEqual(parsedArray?.length, 1);
    assert.strictEqual(parsedArray[0].title, 'Step 1');

    // 2. Markdown fenced JSON
    const markdownFenced = '```json\n[{"step": 1, "title": "Fenced Step"}]\n```';
    const parsedFenced = enhancer.parseAIResponse(markdownFenced);
    assert.strictEqual(parsedFenced?.length, 1);
    assert.strictEqual(parsedFenced[0].title, 'Fenced Step');

    // 3. Object with steps array
    const wrappedObject = JSON.stringify({
      steps: [{ step: 1, title: 'Wrapped Step' }]
    });
    const parsedWrapped = enhancer.parseAIResponse(wrappedObject);
    assert.strictEqual(parsedWrapped?.length, 1);
    assert.strictEqual(parsedWrapped[0].title, 'Wrapped Step');

    // 4. Invalid JSON returns null
    const invalid = enhancer.parseAIResponse('This is not json');
    assert.strictEqual(invalid, null);
  });
});
