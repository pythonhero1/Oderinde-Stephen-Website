import { readFile, writeFile, mkdir } from 'node:fs/promises';
import { existsSync } from 'node:fs';
import { loadEnvFile } from 'node:process';
import path from 'node:path';
import { CONTENT_MARKER, cleanMarkup, findElement, hasClass, replaceInner, normalizeUrls, fetchCollection } from '../src/lib/wordpress.mjs';

if (existsSync('.env')) loadEnvFile('.env');
const base = process.env.WORDPRESS_URL?.replace(/\/$/, '');
if (!base) throw new Error('Set WORDPRESS_URL in .env before syncing. See .env.example.');
const sourceRoot = process.env.WORDPRESS_PUBLIC_DIR ? path.resolve(process.env.WORDPRESS_PUBLIC_DIR) : null;
const existing = JSON.parse(await readFile('migration/layout-fallbacks.json', 'utf8'));
const previous = new Map(existing.map(page => [page.path, page.html]));
const records = [];
for (const endpoint of ['pages', 'posts', 'case-study']) {
  records.push(...await fetchCollection(base, endpoint));
}
console.log(`Discovered ${records.length} published WordPress records.`);
const notes = [], result = [];
for (const record of records) {
  const api = await fetch(`${base}/wp-json/wp/v2/${record.endpoint}/${record.id}`, { signal: AbortSignal.timeout(120_000) });
  if (!api.ok) throw new Error(`REST export failed for ${record.id}: ${api.status}`);
  const post = await api.json();
  if (post.status !== 'publish' || typeof post.content?.rendered !== 'string') throw new Error(`Invalid published post: ${record.id}`);
  const route = new URL(post.link).pathname.replace(/^\/|\/$/g, '');
  const rendered = await fetch(new URL(new URL(post.link).pathname, base), { signal: AbortSignal.timeout(120_000) });
  if (!rendered.ok) throw new Error(`Page view failed for ${route}: ${rendered.status}`);
  let template = await rendered.text();
  if (!template.includes('<html')) {
    template = previous.get(route);
    if (!template) throw new Error(`Empty WordPress page with no layout fallback: ${route}`);
    // Existing fallback was prepared from this post's REST content and shared header/footer.
    notes.push(`${route}: WordPress view was empty; retained its reconstructed article layout.`);
  }
  template = cleanMarkup(template, base);
  // Remove old preview status/handler before reapplying it once at render time.
  template = template.replace(/<p role="status">Preview: contact form delivery[\s\S]*?<\/p>/g, '')
    .replace(/<button disabled aria-disabled="true"/g, '<button');
  let contentSource = 'rest-api';
  const article = findElement(template, node => hasClass(node, 'migrated-article'));
  if (article) {
    template = replaceInner(template, article, `<h1>${post.title.rendered}</h1>${CONTENT_MARKER}`);
  } else {
    const postWrapper = findElement(template, node => hasClass(node, 'et-l--post'));
    if (postWrapper) {
      const wrapperHtml = template.slice(postWrapper.sourceCodeLocation.startOffset, postWrapper.sourceCodeLocation.endOffset);
      const inner = findElement(wrapperHtml, node => hasClass(node, 'et_builder_inner_content'));
      const replaced = replaceInner(wrapperHtml, inner, CONTENT_MARKER);
      template = template.slice(0, postWrapper.sourceCodeLocation.startOffset) + replaced + template.slice(postWrapper.sourceCodeLocation.endOffset);
    } else if (record.type === 'case-study') {
      // The existing Divi Theme Builder template replaces this CPT's content.
      // Refresh that public template from WordPress instead of displaying an unstyled hidden post body.
      contentSource = 'wordpress-theme-template';
      notes.push(`${route}: displayed body is managed by the WordPress Theme Builder, not content.rendered.`);
    } else throw new Error(`No content region in ${route}`);
  }
  result.push({ id: post.id, type: post.type, path: route, title: post.title.rendered,
    modified: post.modified, contentSource, content: cleanMarkup(post.content.rendered, base), template });
  console.log(`Synced ${record.type} ${post.id}: /${route}`);
}
if (new Set(result.map(x => x.path)).size !== result.length) throw new Error('Duplicate WordPress routes');
if (!result.some(x => x.path === '')) throw new Error('The WordPress export has no homepage');
// Include every referenced local asset plus CSS dependencies. Never copy PHP or private files.
const pending = new Set();
function collect(text) {
  const normalized = normalizeUrls(text, base);
  for (const match of normalized.matchAll(/\/(?:wp-content|wp-includes)\/[^\s"'<>()[\]{};,]+/g)) {
    try {
      const pathname = decodeURIComponent(new URL(match[0].replaceAll('&amp;', '&'), base).pathname);
      if (/\.(?:css|js|png|jpe?g|gif|webp|avif|svg|ico|woff2?|ttf|eot|otf|mp4|webm|pdf)$/i.test(pathname)) pending.add(pathname);
    } catch { /* Ignore malformed inline strings; the page validator checks asset references. */ }
  }
}
for (const page of result) collect(page.template + page.content);
const seen = new Set();
while (pending.size) {
  const asset = pending.values().next().value; pending.delete(asset);
  if (seen.has(asset)) continue;
  seen.add(asset);
  const relative = asset.replace(/^\//, '');
  const output = path.resolve('public', relative);
  if (!output.startsWith(path.resolve('public') + path.sep)) throw new Error(`Unsafe asset path: ${asset}`);
  await mkdir(path.dirname(output), { recursive: true });
  let bytes;
  const local = sourceRoot && path.resolve(sourceRoot, relative);
  if (local && local.startsWith(sourceRoot + path.sep) && existsSync(local)) bytes = await readFile(local);
  else {
    const response = await fetch(new URL(asset, base), { signal: AbortSignal.timeout(120_000) });
    if (!response.ok) throw new Error(`Asset unavailable ${asset}: ${response.status}`);
    bytes = Buffer.from(await response.arrayBuffer());
  }
  if (asset.endsWith('.css')) {
    const text = normalizeUrls(bytes.toString(), base);
    collect(text);
    for (const ref of text.matchAll(/url\(["']?([^)'"\s]+)/g)) {
      if (!/^(?:https?:|data:|\/\/)/.test(ref[1])) {
        const resolved = new URL(ref[1], base + asset).pathname;
        if (resolved.startsWith('/wp-content/') || resolved.startsWith('/wp-includes/')) pending.add(resolved);
      }
    }
    bytes = Buffer.from(text);
  }
  await writeFile(output, bytes);
}
await writeFile('src/data/wordpress.json', JSON.stringify(result));
await writeFile('migration/sync-report.json', JSON.stringify({ syncedAt: new Date().toISOString(), pages: result.length, assets: seen.size, notes }, null, 2) + '\n');
console.log(`Saved ${result.length} pages and ${seen.size} public assets. No WordPress changes were made.`);
