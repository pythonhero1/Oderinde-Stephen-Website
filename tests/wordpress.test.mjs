import test from 'node:test';
import assert from 'node:assert/strict';
import { fetchCollection, CONTENT_MARKER, cleanMarkup, normalizeUrls, renderWordPressPage } from '../src/lib/wordpress.mjs';

test('REST discovery includes every pagination page and fails on API errors', async () => {
  const urls = [];
  const records = await fetchCollection('http://example.local', 'pages', async url => {
    urls.push(String(url));
    return new Response(JSON.stringify([{ id: Number(url.searchParams.get('page')) }]), { headers: { 'x-wp-totalpages': '2' } });
  });
  assert.deepEqual(records.map(record => record.id), [1, 2]);
  assert.match(urls[1], /page=2/);
  await assert.rejects(fetchCollection('http://example.local', 'posts', async () => new Response('', { status: 503 })), /HTTP 503/);
});

test('REST content replaces the layout marker and navigation stays portable', () => {
  const page = { path: 'services', contentSource: 'rest-api', content: '<p>Fresh WordPress content</p>', template: `<html><head><link rel="canonical" href="/"></head><body>${CONTENT_MARKER}</body></html>` };
  const html = renderWordPressPage(page);
  assert.match(html, /Fresh WordPress content/);
  assert.match(html, /href="https:\/\/oderindestephen.com\/services\/"/);
  assert.ok(!html.includes(CONTENT_MARKER));
  assert.equal(normalizeUrls('<a href="http://example.local/contact/">Contact</a>', 'http://example.local'), '<a href="/contact/">Contact</a>');
});

test('preview forms do not submit to an unavailable WordPress handler', () => {
  const html = renderWordPressPage({ path: 'contact', contentSource: 'rest-api', content: '<form class="et_pb_contact_form"><button class="et_pb_contact_submit">Send</button></form>', template: `<html><head></head><body>${CONTENT_MARKER}</body></html>` });
  assert.match(html, /disabled aria-disabled="true"/);
  assert.match(html, /e.preventDefault\(\)/);
  assert.match(html, /mailto:Contact@oderindestephen.com/);
});

test('public exports remove dashboard and plugin telemetry', () => {
  const html = cleanMarkup('<html class="logged-in admin-bar"><link rel="alternate" href="http://example.local/wp-json/wp/v2/pages/1"><script src="/heartbeat.js"></script><script src="/presentation.js"></script></html>', 'http://example.local');
  assert.ok(!html.includes('wp-json'));
  assert.ok(!html.includes('heartbeat'));
  assert.ok(html.includes('presentation.js'));
});

test('production-hosted and protocol-relative fonts are served locally in previews', () => {
  assert.equal(normalizeUrls('url(//oderindestephen.com/wp-content/font.woff)', 'http://example.local'), 'url(/wp-content/font.woff)');
  assert.equal(normalizeUrls('https://oderindestephen.com/wp-content/photo.webp', 'http://example.local'), '/wp-content/photo.webp');
});
