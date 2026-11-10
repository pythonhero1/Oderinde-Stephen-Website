import strings from '../../.generated/translation-strings.json' with { type: 'json' };
import { languages } from '../../src/lib/translation.mjs';
import { translatedLabel } from '../../src/lib/translation-labels.mjs';

const json = (body, status = 200) =>
  Response.json(body, {
    status,
    headers: { 'Cache-Control': 'no-store', 'X-Content-Type-Options': 'nosniff' },
  });
export async function onRequestPost({ request, env, waitUntil }) {
  // Only published copy can be translated; enquiry text is never accepted.
  const origin = request.headers.get('Origin');
  if (origin && origin !== new URL(request.url).origin)
    return json({ error: 'Invalid origin' }, 403);
  if (Number(request.headers.get('Content-Length')) > 2048)
    return json({ error: 'Request too large' }, 413);
  let body;
  try {
    const raw = await request.text();
    if (raw.length > 2048) return json({ error: 'Request too large' }, 413);
    body = JSON.parse(raw);
  } catch {
    return json({ error: 'Invalid request' }, 400);
  }
  const { language, keys } = body || {};
  if (
    !Object.hasOwn(languages, language) ||
    !Array.isArray(keys) ||
    !keys.length ||
    keys.length > 16 ||
    keys.some((key) => typeof key !== 'string' || !Object.hasOwn(strings, key))
  )
    return json({ error: 'Invalid translation selection' }, 400);
  if (!env.AI) return json({ error: 'Translation temporarily unavailable' }, 503);
  const translations = {};
  const pending = [...new Set(keys)];
  async function translate() {
    while (pending.length) {
      const key = pending.shift();
      const label = translatedLabel(strings[key], language);
      if (label) {
        translations[key] = label;
        continue;
      }
      const cacheKey = new Request(
        `${new URL(request.url).origin}/api/translation-cache/v1/${language}/${key}`,
      );
      const cached = await caches.default.match(cacheKey);
      if (cached) {
        translations[key] = await cached.text();
        continue;
      }
      const output = await env.AI.run('@cf/meta/m2m100-1.2b', {
        text: strings[key],
        source_lang: 'english',
        target_lang: languages[language],
      });
      if (!output?.translated_text?.trim()) throw new Error('Empty translation');
      translations[key] = output.translated_text.trim();
      waitUntil(
        caches.default.put(
          cacheKey,
          new Response(translations[key], {
            headers: {
              'Cache-Control': 'public, max-age=31536000',
              'Content-Type': 'text/plain; charset=utf-8',
            },
          }),
        ),
      );
    }
  }
  try {
    await Promise.all(Array.from({ length: Math.min(4, pending.length) }, translate));
  } catch {
    return json({ error: 'Translation temporarily unavailable. Please try again later.' }, 503);
  }
  return json({ translations });
}
