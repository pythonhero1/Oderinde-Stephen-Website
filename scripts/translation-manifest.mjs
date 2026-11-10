import { readdir, readFile, mkdir, writeFile } from 'node:fs/promises';
import { parse } from 'parse5';
import { normalize, textKey, skipTranslation } from '../src/lib/translation.mjs';
const strings = {};
function remember(raw) {
  const text = normalize(raw);
  if (!/[a-zA-Z]/.test(text) || skipTranslation.test(text) || text.length > 1800) return;
  const key = textKey(text);
  if (strings[key] && strings[key] !== text) throw new Error('Translation key collision');
  strings[key] = text;
}
function walk(node) {
  if (['script', 'style', 'svg', 'code', 'pre', 'noscript'].includes(node.tagName)) return;
  if (
    node.attrs?.some(
      ({ name, value }) => name === 'data-no-translate' || (name === 'translate' && value === 'no'),
    )
  )
    return;
  if (node.nodeName === '#text') remember(node.value);
  for (const attr of node.attrs || [])
    if (['placeholder', 'alt'].includes(attr.name)) remember(attr.value);
  if (node.tagName === 'textarea') return;
  for (const child of node.childNodes || []) walk(child);
}
async function scan(dir) {
  for (const entry of await readdir(dir, { withFileTypes: true })) {
    const path = `${dir}/${entry.name}`;
    if (entry.isDirectory()) await scan(path);
    else if (path.endsWith('.html')) walk(parse(await readFile(path, 'utf8')));
  }
}
await scan('dist');
await mkdir('.generated', { recursive: true });
await writeFile('.generated/translation-strings.json', JSON.stringify(strings));
console.log(`Prepared ${Object.keys(strings).length} public translation strings`);
