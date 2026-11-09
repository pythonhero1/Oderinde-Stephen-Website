import { readFile, stat, writeFile } from 'node:fs/promises';
import { existsSync } from 'node:fs';
import path from 'node:path';
import { parse } from 'parse5';
const pages = JSON.parse(await readFile('src/data/wordpress.json', 'utf8'));
const routes = new Set(pages.map(page => '/' + (page.path ? page.path + '/' : '')));
const missingAssets = new Set(), missingLinks = new Set();
let checkedAssets = 0;
for (const page of pages) {
  const file = path.join('dist', page.path, 'index.html');
  const html = await readFile(file, 'utf8');
  if (!html.includes('<html') || html.includes('<!-- ASTRO_WORDPRESS_CONTENT -->')) throw new Error(`Invalid generated page: ${file}`);
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
        if (pathname.startsWith('/wp-content/') || pathname.startsWith('/wp-includes/')) {
          checkedAssets++;
          if (!existsSync(path.join('dist', pathname))) missingAssets.add(pathname);
        } else if (attr.name === 'href' && !routes.has(pathname) && !existsSync(path.join('dist', pathname))) missingLinks.add(pathname);
      }
    }
    for (const child of node.childNodes || []) visit(child);
  };
  visit(parse(html));
}
const report = { pages: pages.length, checkedAssetReferences: checkedAssets,
  missingAssets: [...missingAssets].sort(), unresolvedOriginalLinks: [...missingLinks].sort() };
await writeFile('migration/link-audit.json', JSON.stringify(report, null, 2) + '\n');
console.log(JSON.stringify(report, null, 2));
if (missingAssets.size) process.exitCode = 1;
