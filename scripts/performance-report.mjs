import { readFile, writeFile } from 'node:fs/promises';
import { parse } from 'parse5';
import { gzipSync } from 'node:zlib';

const html = await readFile('dist/index.html', 'utf8');
const scripts = [],
  styles = [],
  inlineScripts = [],
  inlineStyles = [];
function visit(node) {
  const attribute = (name) => node.attrs?.find((item) => item.name === name)?.value;
  const content = () => (node.childNodes || []).map((child) => child.value || '').join('');
  if (node.tagName === 'script' && attribute('type') !== 'application/ld+json') {
    if (attribute('src')) scripts.push(attribute('src'));
    else if (content().trim()) inlineScripts.push(content());
  }
  if (node.tagName === 'style') inlineStyles.push(content());
  if (node.tagName === 'link' && attribute('rel') === 'stylesheet') styles.push(attribute('href'));
  for (const child of node.childNodes || []) visit(child);
}
visit(parse(html));
const scriptFiles = await Promise.all(scripts.map((url) => readFile('dist' + url)));
const stylesheetFiles = await Promise.all(styles.map((url) => readFile('dist' + url)));
const report = {
  page: '/',
  htmlBytes: Buffer.byteLength(html),
  htmlGzipBytes: gzipSync(html).length,
  browserScripts: scripts.length + inlineScripts.length,
  browserJavaScriptBytes:
    scriptFiles.reduce((sum, bytes) => sum + bytes.length, 0) +
    inlineScripts.reduce((sum, script) => sum + Buffer.byteLength(script), 0),
  externalStylesheetBytes: stylesheetFiles.reduce((sum, bytes) => sum + bytes.length, 0),
  externalStylesheetGzipBytes: stylesheetFiles.reduce(
    (sum, bytes) => sum + gzipSync(bytes).length,
    0,
  ),
  inlineCssBytes: inlineStyles.reduce((sum, css) => sum + Buffer.byteLength(css), 0),
};
if (report.htmlGzipBytes > 30000)
  throw new Error('Homepage exceeds its 30 KB compressed HTML budget.');
if (report.browserJavaScriptBytes > 8000)
  throw new Error('Homepage exceeds its 8 KB browser JavaScript budget.');
if (report.externalStylesheetGzipBytes > 40000)
  throw new Error('Homepage exceeds its 40 KB compressed stylesheet budget.');
await writeFile('reports/performance.json', JSON.stringify(report, null, 2) + '\n');
console.log(JSON.stringify(report, null, 2));
