import { readFile, readdir, unlink, stat } from 'node:fs/promises';
import path from 'node:path';
import { parse } from 'parse5';

const output = path.resolve('dist');
const origin = 'https://oderindestephen.com';
const used = new Set();
const queue = [];

async function filesIn(directory) {
  const files = [];
  for (const entry of await readdir(directory, { withFileTypes: true })) {
    const file = path.join(directory, entry.name);
    if (entry.isDirectory()) files.push(...(await filesIn(file)));
    else files.push(file);
  }
  return files;
}

function reference(value, base = '/') {
  if (!value || /^(data:|mailto:|tel:|#)/i.test(value)) return;
  const url = new URL(value, origin + base);
  if (url.origin !== origin) return;
  const filename = path.resolve(output, '.' + decodeURIComponent(url.pathname));
  if (!filename.startsWith(output + path.sep) || used.has(filename)) return;
  used.add(filename);
  queue.push(filename);
}

function cssReferences(css, base) {
  for (const match of css.matchAll(/url\(\s*["']?([^)'"\s]+)/g)) reference(match[1], base);
}

const allFiles = await filesIn(output);
for (const file of allFiles.filter((file) => file.endsWith('.html'))) {
  const html = await readFile(file, 'utf8');
  const base = '/' + path.relative(output, file);
  function visit(node) {
    for (const attribute of node.attrs || []) {
      if (['src', 'href', 'poster'].includes(attribute.name)) reference(attribute.value, base);
      if (attribute.name === 'srcset')
        for (const item of attribute.value.split(',')) reference(item.trim().split(/\s+/)[0], base);
      if (attribute.name === 'style') cssReferences(attribute.value, base);
    }
    if (node.tagName === 'style')
      cssReferences(node.childNodes.map((child) => child.value || '').join(''), base);
    for (const child of node.childNodes || []) visit(child);
  }
  visit(parse(html));
}
while (queue.length) {
  const file = queue.shift();
  if (!/\.(css|js)$/.test(file)) continue;
  let content;
  try {
    content = await readFile(file, 'utf8');
  } catch {
    continue;
  }
  const base = '/' + path.relative(output, file);
  cssReferences(content, base);
  if (file.endsWith('.js'))
    for (const match of content.matchAll(/["'`]([^"'`]+\.(?:js|css))["'`]/g))
      reference(match[1], base);
}
let removed = 0,
  bytes = 0;
for (const file of allFiles.filter((file) =>
  file.startsWith(path.join(output, '_astro') + path.sep),
)) {
  if (used.has(file)) continue;
  bytes += (await stat(file)).size;
  await unlink(file);
  removed++;
}
console.log(`Removed ${removed} unreferenced build assets (${Math.round(bytes / 1024)} KB).`);
