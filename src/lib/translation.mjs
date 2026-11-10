export const languages = { de: 'german', it: 'italian', es: 'spanish', fr: 'french' };
export const normalize = (text) => text.replace(/\s+/g, ' ').trim();
export function textKey(text) {
  let hash = 2166136261;
  for (const character of normalize(text)) {
    hash ^= character.codePointAt(0);
    hash = Math.imul(hash, 16777619);
  }
  return (hash >>> 0).toString(36);
}
export const skipTranslation =
  /^(?:https?:|www\.|[^\s@]+@[^\s@]+\.[^\s@]+)|^(?:H\.|Oderinde Stephen|WordPress|WooCommerce|Shopify|Wix Studio|Squarespace|Framer|Figma|Elementor|Divi|n8n|Google|G2|Trustpilot|Clutch)$/i;
