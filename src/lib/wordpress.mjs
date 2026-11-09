import { parse } from 'parse5';

export const CONTENT_MARKER = '<!-- ASTRO_WORDPRESS_CONTENT -->';
export const SITE_ORIGIN = 'https://oderindestephen.com';

export function findElement(html, predicate) {
  const document = parse(html, { sourceCodeLocationInfo: true });
  function visit(node) {
    if (node.tagName && predicate(node)) return node;
    for (const child of node.childNodes || []) {
      const found = visit(child);
      if (found) return found;
    }
  }
  return visit(document);
}
export function hasClass(node, name) {
  return node.attrs?.some(attr => attr.name === 'class' && attr.value.split(/\s+/).includes(name));
}
export function replaceInner(html, node, replacement) {
  const location = node?.sourceCodeLocation;
  if (!location?.startTag || !location?.endTag) throw new Error('Cannot find a complete content element');
  return html.slice(0, location.startTag.endOffset) + replacement + html.slice(location.endTag.startOffset);
}
export function normalizeUrls(html, wordpressUrl) {
  const origin = new URL(wordpressUrl).origin;
  // URLs in HTML, inline CSS, inline JSON and escaped JS strings.
  return html.replaceAll(origin + '/', '/').replaceAll(origin.replaceAll('/', '\\/') + '\\/', '/')
    .replaceAll(origin, SITE_ORIGIN)
    .replace(/(?:https?:)?\/\/(?:www\.)?oderindestephen\.com(?=\/(?:wp-content|wp-includes)\/)/g, '');
}
export function cleanMarkup(html, wordpressUrl) {
  let output = normalizeUrls(html, wordpressUrl);
  // Export anonymous public presentation only, never the WordPress admin UI.
  output = output.replace(/<div id="wpadminbar"[\s\S]*?<!-- #wpadminbar -->/g, '')
    .replace(/\blogged-in\b|\badmin-bar\b/g, '')
    .replace(/<script\b[^>]*>[\s\S]*?<\/script>/gi, script =>
      /heartbeat|ahc_front|wpil-frontend|\/core\/admin\/|google_gtagjs|gtag\(/.test(script) ? '' : script)
    .replace(/<link\b[^>]*>/gi, link => /pingback|api\.w\.org|EditURI|wlwmanifest|oembed|dashicons|wp-json|(?:comments\/)?feed\//.test(link) ? '' : link)
    .replace(/<style[^>]*>\s*html\s*\{\s*margin-top:[\s\S]*?<\/style>/gi, '');
  return output;
}
export function protectPreviewForms(html) {
  if (!html.includes('et_pb_contact_form')) return html;
  return html.replace(/(<form\b[^>]*class="et_pb_contact_form[^>]*>)/g,
    '$1<p role="status">Contact form delivery is not enabled in this preview. Please email <a href="mailto:Contact@oderindestephen.com">Contact@oderindestephen.com</a>.</p>')
    .replace(/<button([^>]*class="[^"]*et_pb_contact_submit[^"]*"[^>]*)>/g,
      '<button disabled aria-disabled="true"$1>')
    .replace('</body>', '<script>document.addEventListener("submit",function(e){if(e.target.matches(".et_pb_contact_form")){e.preventDefault();e.stopImmediatePropagation();}},true);</script></body>');
}
export function renderWordPressPage(page) {
  let html = normalizeUrls(page.template, SITE_ORIGIN);
  if (page.contentSource === 'rest-api') {
    if (!html.includes(CONTENT_MARKER)) throw new Error(`Missing content marker for ${page.path}`);
    html = html.replace(CONTENT_MARKER, normalizeUrls(page.content, SITE_ORIGIN));
  }
  const canonical = SITE_ORIGIN + '/' + (page.path ? page.path + '/' : '');
  html = html.replace(/<link[^>]*rel=["']canonical["'][^>]*>/gi, '')
    .replace('</head>', `<link rel="canonical" href="${canonical}"></head>`);
  return protectPreviewForms(html);
}

export async function fetchCollection(base, endpoint, fetcher = fetch) {
  const items = [];
  let totalPages = 1;
  for (let page = 1; page <= totalPages; page++) {
    const url = new URL(`${base.replace(/\/$/, '')}/wp-json/wp/v2/${endpoint}`);
    url.search = new URLSearchParams({ per_page: '100', page: String(page), status: 'publish', _fields: 'id,link,type,slug,modified' });
    const response = await fetcher(url, { signal: AbortSignal.timeout(120_000) });
    if (!response.ok) throw new Error(`WordPress ${endpoint}: HTTP ${response.status}`);
    const result = await response.json();
    if (!Array.isArray(result)) throw new Error(`Invalid WordPress collection: ${endpoint}`);
    totalPages = Number(response.headers.get('x-wp-totalpages') || 1);
    if (!Number.isInteger(totalPages) || totalPages < 0 || totalPages > 1000) throw new Error('Invalid WordPress pagination');
    items.push(...result.map(item => ({ ...item, endpoint })));
  }
  return items;
}
