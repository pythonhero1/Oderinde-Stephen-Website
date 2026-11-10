import test from 'node:test';
import assert from 'node:assert/strict';
import { onRequestPost } from '../functions/api/translate.js';
import { textKey } from '../src/lib/translation.mjs';
import strings from '../.generated/translation-strings.json' with { type: 'json' };

test('translation only accepts published copy and supported languages', async () => {
  for (const body of [
    { language: 'fr', keys: ['private-enquiry-text'] },
    { language: 'xx', keys: [Object.keys(strings)[0]] },
  ]) {
    const response = await onRequestPost({
      request: new Request('https://example.com/api/translate', {
        method: 'POST',
        body: JSON.stringify(body),
      }),
      env: {},
    });
    assert.equal(response.status, 400);
  }
});
test('translation rejects cross-origin requests', async () => {
  const response = await onRequestPost({
    request: new Request('https://example.com/api/translate', {
      method: 'POST',
      headers: { Origin: 'https://other.example' },
      body: '{}',
    }),
    env: {},
  });
  assert.equal(response.status, 403);
});
test('published phrases use the requested language, and cached output skips AI', async () => {
  const store = new Map();
  globalThis.caches = {
    default: {
      match: async (key) => store.get(key.url)?.clone(),
      put: async (key, response) => {
        store.set(key.url, response);
      },
    },
  };
  const key = Object.keys(strings)[0];
  const jobs = [];
  let calls = 0;
  const env = {
    AI: {
      run: async (model, input) => {
        calls++;
        assert.equal(input.text, strings[key]);
        assert.equal(input.target_lang, 'french');
        return { translated_text: 'Bonjour' };
      },
    },
  };
  for (let i = 0; i < 2; i++) {
    const request = new Request('https://example.com/api/translate', {
      method: 'POST',
      body: JSON.stringify({ language: 'fr', keys: [key] }),
    });
    const response = await onRequestPost({ request, env, waitUntil: (job) => jobs.push(job) });
    assert.deepEqual(await response.json(), { translations: { [key]: 'Bonjour' } });
    await Promise.all(jobs);
  }
  assert.equal(calls, 1);
  assert.equal(textKey(' Hello  world '), textKey('Hello world'));
});

test('the build retains the language module loaded on demand', async () => {
  const { readdir, readFile, access } = await import('node:fs/promises');
  const { resolve } = await import('node:path');
  let imports = 0;
  for (const file of (await readdir('dist/_astro')).filter((name) => name.endsWith('.js'))) {
    const code = await readFile(`dist/_astro/${file}`, 'utf8');
    for (const match of code.matchAll(/import\(["'`]([^"'`]+)["'`]\)/g)) {
      imports++;
      await access(resolve('dist/_astro', match[1]));
    }
  }
  assert.ok(imports > 0, 'expected the on-demand language module');
});
