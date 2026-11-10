import { readFile, stat, writeFile } from 'node:fs/promises';
import { existsSync } from 'node:fs';
import path from 'node:path';
import { parse } from 'parse5';
import { readdir } from 'node:fs/promises';
async function htmlPages(directory = 'dist') {
  const result = [];
  for (const entry of await readdir(directory, { withFileTypes: true })) {
    const file = path.join(directory, entry.name);
    if (entry.isDirectory()) result.push(...(await htmlPages(file)));
    else if (entry.name === 'index.html') result.push({ path: path.relative('dist', directory) });
  }
  return result;
}
const pages = await htmlPages();
const routes = new Set(pages.map((page) => '/' + (page.path ? page.path + '/' : '')));
const missingAssets = new Set(),
  missingLinks = new Set(),
  brokenFragments = new Set();
const pageIds = new Map();
for (const page of pages) {
  const root = parse(await readFile(path.join('dist', page.path, 'index.html'), 'utf8'));
  const ids = new Set();
  const visit = (node) => {
    for (const attr of node.attrs || []) if (attr.name === 'id') ids.add(attr.value);
    for (const child of node.childNodes || []) visit(child);
  };
  visit(root);
  pageIds.set('/' + (page.path ? page.path + '/' : ''), ids);
}
let checkedAssets = 0;
const stylesheets = new Set();
for (const page of pages) {
  const file = path.join('dist', page.path, 'index.html');
  const html = await readFile(file, 'utf8');
  if (
    !html.includes('<html') ||
    html.includes('[object Promise]') ||
    /<!-- SITE_(?:CONTENT|HEADER|FOOTER) -->/.test(html)
  )
    throw new Error(`Invalid generated page: ${file}`);
  if (/https?:\/\/oderindestephen\.local/.test(html))
    throw new Error(`Local backend URL leaked into ${file}`);
  const visit = (node) => {
    for (const attr of node.attrs || []) {
      if (
        /wp-content|wp-includes|wp-json|wp-admin|et_pb_|et_builder_|jquery|et_frontend_|themes\/Divi/i.test(
          attr.value,
        )
      )
        throw new Error(`Legacy dependency in ${file}: ${attr.name}`);
      const values =
        attr.name === 'srcset'
          ? attr.value.split(',').map((item) => item.trim().split(/\s+/)[0])
          : ['src', 'href', 'poster'].includes(attr.name)
            ? [attr.value]
            : [];
      for (const value of values) {
        if (!value || value === '#' || /^(?:data:|mailto:|tel:|javascript:)/i.test(value)) continue;
        const url = new URL(
          value,
          'https://oderindestephen.com/' + (page.path ? page.path + '/' : ''),
        );
        if (url.hostname !== 'oderindestephen.com') continue;
        const pathname = decodeURIComponent(url.pathname);
        if (
          pathname.startsWith('/_astro/') ||
          pathname.startsWith('/fonts/') ||
          pathname.startsWith('/images/') ||
          /\.(?:css|js|avif|gif|png|jpe?g|svg|woff2?|ttf)$/.test(pathname)
        ) {
          checkedAssets++;
          if (pathname.endsWith('.css')) stylesheets.add(pathname);
          if (!existsSync(path.join('dist', pathname))) missingAssets.add(pathname);
        } else if (attr.name === 'href') {
          if (!routes.has(pathname) && !existsSync(path.join('dist', pathname)))
            missingLinks.add(pathname);
          if (
            url.hash &&
            pageIds.has(pathname) &&
            !pageIds.get(pathname).has(decodeURIComponent(url.hash.slice(1)))
          )
            brokenFragments.add(pathname + url.hash);
        }
      }
    }
    for (const child of node.childNodes || []) visit(child);
  };
  visit(parse(html));
}
for (const stylesheet of stylesheets) {
  const file = path.join('dist', stylesheet);
  if (!existsSync(file)) continue;
  const css = await readFile(file, 'utf8');
  for (const match of css.matchAll(/url\(\s*["']?([^)'"\s]+)/g)) {
    if (/^(data:|#)/.test(match[1])) continue;
    const url = new URL(match[1], `https://oderindestephen.com${stylesheet}`);
    if (url.hostname !== 'oderindestephen.com')
      throw new Error(`Unexpected remote stylesheet asset: ${url.hostname}`);
    const asset = decodeURIComponent(url.pathname);
    checkedAssets++;
    if (!existsSync(path.join('dist', asset))) missingAssets.add(asset);
  }
}
const report = {
  pages: pages.length,
  checkedAssetReferences: checkedAssets,
  missingAssets: [...missingAssets].sort(),
  unresolvedOriginalLinks: [...missingLinks].sort(),
  brokenFragments: [...brokenFragments].sort(),
};
await writeFile('reports/link-audit.json', JSON.stringify(report, null, 2) + '\n');
console.log(JSON.stringify(report, null, 2));
if (missingAssets.size || missingLinks.size || brokenFragments.size) process.exitCode = 1;
