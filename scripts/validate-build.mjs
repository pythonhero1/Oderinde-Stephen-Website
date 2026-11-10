import { readFile, stat, writeFile } from 'node:fs/promises';
import { existsSync } from 'node:fs';
import path from 'node:path';
import { parse } from 'parse5';
import { getContentPages } from '../src/lib/content.mjs';
const pages = await getContentPages();
const routes = new Set(pages.map(page => '/' + (page.path ? page.path + '/' : '')));
const missingAssets = new Set(), missingLinks = new Set(), brokenFragments = new Set();
const pageIds = new Map();
for (const page of pages) {
  const root = parse(await readFile(path.join('dist', page.path, 'index.html'), 'utf8'));
  const ids = new Set();
  const visit = node => { for (const attr of node.attrs || []) if (attr.name === 'id') ids.add(attr.value); for (const child of node.childNodes || []) visit(child); };
  visit(root);
  pageIds.set('/' + (page.path ? page.path + '/' : ''), ids);
}
let checkedAssets = 0;
for (const page of pages) {
  const file = path.join('dist', page.path, 'index.html');
  const html = await readFile(file, 'utf8');
  if (!html.includes('<html') || html.includes('[object Promise]') || /<!-- SITE_(?:CONTENT|HEADER|FOOTER) -->/.test(html)) throw new Error(`Invalid generated page: ${file}`);
  if (/https?:\/\/oderindestephen\.local/.test(html)) throw new Error(`Local backend URL leaked into ${file}`);
  const visit = node => {
    for (const attr of node.attrs || []) {
      const values = attr.name === 'srcset' ? attr.value.split(',').map(item => item.trim().split(/\s+/)[0])
        : ['src', 'href', 'poster'].includes(attr.name) ? [attr.value] : [];
      for (const value of values) {
        if (!value || /^(?:data:|mailto:|tel:|#|javascript:)/i.test(value)) continue;
        const url = new URL(value, 'https://oderindestephen.com/' + page.path + '/');
        if (url.hostname !== 'oderindestephen.com') continue;
        const pathname = decodeURIComponent(url.pathname);
        if (pathname.startsWith('/assets/') || /\.(?:css|js|avif|gif|png|jpe?g|svg|woff2?|ttf)$/.test(pathname)) {
          checkedAssets++;
          if (!existsSync(path.join('dist', pathname))) missingAssets.add(pathname);
        } else if (attr.name === 'href') {
          if (!routes.has(pathname) && !existsSync(path.join('dist', pathname))) missingLinks.add(pathname);
          if (url.hash && pageIds.has(pathname) && !pageIds.get(pathname).has(decodeURIComponent(url.hash.slice(1)))) brokenFragments.add(pathname + url.hash);
        }
      }
    }
    for (const child of node.childNodes || []) visit(child);
  };
  visit(parse(html));
}
const report = { pages: pages.length, checkedAssetReferences: checkedAssets,
  missingAssets: [...missingAssets].sort(), unresolvedOriginalLinks: [...missingLinks].sort(), brokenFragments: [...brokenFragments].sort() };
await writeFile('reports/link-audit.json', JSON.stringify(report, null, 2) + '\n');
console.log(JSON.stringify(report, null, 2));
if (missingAssets.size || missingLinks.size || brokenFragments.size) process.exitCode = 1;
