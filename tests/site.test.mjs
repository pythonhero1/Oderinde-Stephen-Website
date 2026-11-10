import test from 'node:test';
import assert from 'node:assert/strict';
import { readFile, mkdtemp, mkdir, readdir, rm, writeFile } from 'node:fs/promises';
import { createHash } from 'node:crypto';
import { execFile } from 'node:child_process';
import { promisify } from 'node:util';
import { tmpdir } from 'node:os';
import path from 'node:path';
import { parse } from 'parse5';

const pages = JSON.parse(await readFile('src/content/pages.json', 'utf8'));
const inventory = JSON.parse(await readFile('tests/fixtures/content-inventory.json', 'utf8'));
const site = JSON.parse(await readFile('src/config/site.json', 'utf8'));
const attribute = (node, name) => node.attrs?.find((item) => item.name === name)?.value;
const blockTags = new Set([
  'p',
  'div',
  'li',
  'ul',
  'ol',
  'article',
  'section',
  'h1',
  'h2',
  'h3',
  'h4',
  'h5',
  'h6',
  'form',
  'label',
  'button',
  'select',
  'option',
  'textarea',
  'table',
  'tr',
  'td',
  'th',
  'blockquote',
  'br',
  'span',
  'strong',
  'em',
]);
function text(node) {
  if (['script', 'style'].includes(node.tagName) || attribute(node, 'id') === 'project-count-value')
    return '';
  if (node.nodeName === '#text') return node.value;
  const body = (node.childNodes || []).map(text).join('');
  return blockTags.has(node.tagName) ? ` ${body} ` : body;
}
function find(node, predicate) {
  if (predicate(node)) return node;
  for (const child of node.childNodes || []) {
    const result = find(child, predicate);
    if (result) return result;
  }
}
const documentFor = async (slug) =>
  parse(await readFile(path.join('dist', slug, 'index.html'), 'utf8'));

test('the native page components preserve the existing authored content', async () => {
  for (const [slug, expected] of Object.entries(inventory)) {
    const document = await documentFor(slug);
    const main = find(document, (node) => attribute(node, 'id') === 'main-content');
    const words = (text(main).match(/[\p{L}\p{N}]+/gu) || []).join(' ');
    assert.equal(createHash('sha256').update(words).digest('hex'), expected.hash, slug || 'home');
  }
});

test('all native pages have public canonical URLs and review indexing protection', async () => {
  for (const page of pages) {
    const document = await documentFor(page.path);
    assert.equal(
      attribute(
        find(document, (node) => node.tagName === 'meta' && attribute(node, 'name') === 'robots'),
        'content',
      ),
      site.indexable ? 'index, follow' : 'noindex, follow',
    );
    assert.equal(
      attribute(
        find(document, (node) => node.tagName === 'link' && attribute(node, 'rel') === 'canonical'),
        'href',
      ),
      `${site.origin}/${page.path ? page.path + '/' : ''}`,
    );
  }
});

test('contact enquiries use native validation and the verified email endpoint', async () => {
  const form = find(await documentFor('contact'), (node) => node.tagName === 'form');
  assert.equal(attribute(form, 'action'), 'https://formspree.io/f/mnppkklg');
  assert.equal(attribute(form, 'method'), 'post');
  for (const name of ['name', 'email', 'service', 'message']) {
    const field = find(form, (node) => attribute(node, 'name') === name);
    assert.notEqual(attribute(field, 'required'), undefined);
    assert.ok(attribute(field, 'aria-label'));
  }
  for (const name of ['company', 'budget', 'timeline'])
    assert.equal(
      attribute(
        find(form, (node) => attribute(node, 'name') === name),
        'required',
      ),
      undefined,
    );
});

test('FAQ controls expose their state and content without a builder runtime', async () => {
  const document = await documentFor('');
  const accordion = find(document, (node) => attribute(node, 'data-accordion') !== undefined);
  const button = find(accordion, (node) => node.tagName === 'button');
  assert.equal(attribute(button, 'aria-expanded'), 'false');
  assert.ok(text(accordion).includes('project-specific quotations'));
});

test('the local Markdown article is rendered and listed in the sitemap', async () => {
  const slug = 'why-wordpress-is-still-a-game-changer-for-small-businesses-in-2026';
  const document = await documentFor(slug);
  assert.ok(text(document).includes('Choosing a website platform has become more complicated.'));
  assert.ok(!text(document).includes('[object Promise]'));
  assert.ok((await readFile('dist/sitemap.xml', 'utf8')).includes(`/${slug}/`));
});

test('new article drafts cannot overwrite an existing article', async () => {
  const directory = await mkdtemp(path.join(tmpdir(), 'astro-content-'));
  const run = promisify(execFile);
  const helper = path.resolve('scripts/new-post.mjs');
  try {
    await mkdir(path.join(directory, 'src/content'), { recursive: true });
    await writeFile(path.join(directory, 'src/content/pages.json'), '[]');
    await run(process.execPath, [helper, 'A practical website guide'], { cwd: directory });
    const files = await readdir(path.join(directory, 'src/content/blog'));
    assert.deepEqual(files, ['a-practical-website-guide.md']);
    const source = await readFile(path.join(directory, 'src/content/blog', files[0]), 'utf8');
    assert.match(source, /draft: true/);
    await assert.rejects(
      run(process.execPath, [helper, 'A practical website guide'], { cwd: directory }),
    );
  } finally {
    await rm(directory, { recursive: true, force: true });
  }
});

test('project count is rendered from real local projects without an animation library', async () => {
  const document = await documentFor('case-studies');
  const counter = find(document, (node) => attribute(node, 'id') === 'project-count-value');
  assert.equal(
    counter.childNodes.map((node) => node.value || '').join(''),
    String(pages.filter((page) => page.type === 'project').length),
  );
});
