import { parse } from 'parse5';
export function findElement(html, predicate) {
  const document = parse(html, { sourceCodeLocationInfo: true });
  function visit(node) {
    if (node.tagName && predicate(node)) return node;
    for (const child of node.childNodes || []) { const found = visit(child); if (found) return found; }
  }
  return visit(document);
}
export function hasClass(node, name) { return node.attrs?.some(attr => attr.name === 'class' && attr.value.split(/\s+/).includes(name)); }
