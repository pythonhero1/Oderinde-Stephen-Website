import { normalize, textKey, skipTranslation } from '../lib/translation.mjs';
const selector = document.querySelector<HTMLSelectElement>('[data-language-select]')!;
const status = document.querySelector<HTMLElement>('[data-translation-status]')!;
const excluded = 'script,style,svg,code,pre,noscript,textarea,[data-no-translate],[translate="no"]';
const entries: { node: Text | Element; attribute?: string; original: string; key: string }[] = [];
function add(node: Text | Element, original: string, attribute?: string) {
  const text = normalize(original);
  if (/[a-zA-Z]/.test(text) && !skipTranslation.test(text) && text.length <= 1800)
    entries.push({ node, attribute, original, key: textKey(text) });
}
const walker = document.createTreeWalker(document.body, NodeFilter.SHOW_TEXT);
while (walker.nextNode()) {
  const node = walker.currentNode as Text;
  if (!node.parentElement?.closest(excluded)) add(node, node.data);
}
for (const element of document.querySelectorAll('[placeholder],[alt]')) {
  if (element.closest(excluded.replace('textarea,', ''))) continue;
  for (const attr of ['placeholder', 'alt'])
    if (element.hasAttribute(attr)) add(element, element.getAttribute(attr)!, attr);
}
let current: AbortController | undefined;
const cache: Record<string, Record<string, string>> = {};
function apply(translations: Record<string, string> = {}) {
  for (const entry of entries) {
    const translated = translations[entry.key];
    const value = translated
      ? entry.original.replace(/\S[\s\S]*\S|\S/, translated)
      : entry.original;
    if (entry.attribute) (entry.node as Element).setAttribute(entry.attribute, value);
    else (entry.node as Text).data = value;
  }
}
export async function changeLanguage(language: string) {
  current?.abort();
  const controller = new AbortController();
  current = controller;
  apply();
  document.documentElement.lang = 'en';
  status.hidden = language === 'en';
  if (language === 'en') {
    try {
      localStorage.removeItem('site-language');
    } catch {}
    return;
  }
  status.textContent = 'Automatically translating…';
  const translations = (cache[language] ||= {});
  const keys = [...new Set(entries.map((entry) => entry.key))].filter((key) => !translations[key]);
  try {
    // Two bounded batches keep first-time translation moving without blocking the page.
    let offset = 0;
    let completed = 0;
    async function batch() {
      while (offset < keys.length) {
        const selection = keys.slice(offset, (offset += 16));
        const response = await fetch('/api/translate', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ language, keys: selection }),
          signal: controller.signal,
        });
        if (!response.ok) throw new Error('Translation unavailable');
        const result = await response.json();
        if (controller.signal.aborted) return;
        Object.assign(translations, result.translations);
        completed += selection.length;
        status.textContent = `Automatically translating… ${Math.round((completed / keys.length) * 100)}%`;
      }
    }
    await Promise.all([batch(), batch()]);
    if (controller.signal.aborted) return;
    apply(translations);
    document.documentElement.lang = language;
    try {
      localStorage.setItem('site-language', language);
    } catch {}
    status.textContent = 'Automatically translated · English is the original';
  } catch {
    if (controller.signal.aborted) return;
    controller.abort();
    apply();
    selector.value = 'en';
    status.textContent = 'Translation unavailable. Showing English. Please try again later.';
  }
}
