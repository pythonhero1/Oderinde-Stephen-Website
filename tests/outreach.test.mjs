import test from 'node:test';
import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import { parse } from 'parse5';
import { renderWordPressPage } from '../src/lib/wordpress.mjs';
import { getSitePages } from '../src/lib/site-pages.mjs';
const pages = JSON.parse(await readFile(new URL('../src/data/wordpress.json', import.meta.url), 'utf8'));
const all = getSitePages(pages);
const attribute = (n, name) => n.attrs?.find(a => a.name === name)?.value;
function find(n, fn) { if (fn(n)) return n; for (const c of n.childNodes || []) { const found = find(c, fn); if (found) return found; } }
function text(n) { return n.nodeName === '#text' ? n.value : (n.childNodes || []).map(text).join(''); }

test('each case study displays its own authored project instead of the shared Pipe Patch template', () => {
  for (const page of pages.filter(p => p.type === 'case-study')) {
    const html = renderWordPressPage(page, '', pages);
    const main = find(parse(html), n => attribute(n, 'id') === 'main-content');
    const heading = find(main, n => n.tagName === 'h1');
    assert.equal(text(heading), text(parse(page.title)));
    if (!page.path.includes('pipe-patch')) assert.ok(!text(main).includes('Pipe Patch Pro'));
    assert.ok(find(main, n => n.tagName === 'img' && attribute(n, 'alt')?.includes('website project')));
  }
});

test('all review pages have descriptions, public-domain canonicals and preview indexing protection', () => {
  for (const page of all) {
    const root = parse(renderWordPressPage(page, '', pages));
    const description = find(root, n => n.tagName === 'meta' && attribute(n, 'name') === 'description');
    assert.ok(attribute(description, 'content').length > 40, page.path);
    assert.equal(attribute(find(root, n => n.tagName === 'meta' && attribute(n, 'name') === 'robots'), 'content'), 'noindex, follow');
    assert.equal(attribute(find(root, n => n.tagName === 'link' && attribute(n, 'rel') === 'canonical'), 'href'), `https://oderindestephen.com/${page.path ? page.path + '/' : ''}`);
  }
});

test('outreach preview connects real profiles and removes unfinished review and download promises', () => {
  const home = renderWordPressPage(pages.find(p => p.path === ''), '', pages);
  assert.ok(!home.includes('Rating · Reviews'));
  assert.ok(!home.includes('Get the Free Checklist'));
  assert.match(home, /href="https:\/\/www.upwork.com\/freelancers\/~0117a9b339945ef039"/);
  assert.match(home, /href="https:\/\/www.fiverr.com\/python_heros"/);
  assert.match(home, /href="\/case-studies\/"/);
  assert.match(home, /href="\/insights\/"/);
  const contact = renderWordPressPage(pages.find(p => p.path === 'contact'), 'https://formspree.io/f/mnppkklg', pages);
  assert.match(contact, /action="https:\/\/formspree.io\/f\/mnppkklg"/);
});

test('blog posts have a real article heading and appear in the insights index', () => {
  const post = pages.find(p => p.type === 'post');
  const html = renderWordPressPage(post, '', pages);
  const main = find(parse(html), n => attribute(n, 'id') === 'main-content');
  assert.equal(text(find(main, n => n.tagName === 'h1')), text(parse(post.title)));
  const index = renderWordPressPage(all.find(p => p.path === 'insights'), '', pages);
  assert.ok(index.includes(`href="/${post.path}/"`));
});


test('contact brief keeps required fields, valid service options and native delivery without Divi scripts', () => {
  const root = parse(renderWordPressPage(pages.find(p => p.path === 'contact'), 'https://formspree.io/f/mnppkklg', pages));
  const form = find(root, n => n.tagName === 'form');
  assert.equal(attribute(form, 'method'), 'post');
  for (const name of ['name', 'email', 'service', 'message']) {
    const field = find(form, n => attribute(n, 'name') === name);
    assert.ok(field, name);
    assert.equal(attribute(field, 'required'), '', name);
  }
  for (const name of ['company', 'budget', 'timeline']) assert.equal(attribute(find(form, n => attribute(n, 'name') === name), 'required'), undefined);
  assert.ok(find(form, n => n.tagName === 'option' && text(n) === 'Business website'));
  assert.ok(!find(root, n => n.tagName === 'script' && attribute(n, 'src')));
  assert.equal(attribute(find(form, n => n.tagName === 'button'), 'disabled'), undefined);
});


test('service and project pages expose readable content and real project routes', () => {
  for (const page of pages.filter(p => p.path.startsWith('business-website-') || p.path === 'case-studies')) {
    const html = renderWordPressPage(page, '', pages);
    const root = parse(html);
    assert.ok(!html.includes('Rating · Reviews'));
    assert.ok(!find(root, n => n.tagName === 'script' && attribute(n, 'src')));
    if (page.path === 'case-studies') for (const project of pages.filter(p => p.type === 'case-study')) assert.ok(html.includes(`href="/${project.path}/"`));
    else assert.ok(find(root, n => n.tagName === 'h1'));
  }
});
