import { setTimeout as delay } from 'node:timers/promises';
// WordPress GET requests are safe to retry; never retry a form submission here.
export async function fetchWordPress(url, fetcher = fetch, { attempts = 3, delayMs = 500 } = {}) {
  for (let attempt = 1; attempt <= attempts; attempt++) {
    try {
      const response = await fetcher(url, { signal: AbortSignal.timeout(120_000), headers: { Connection: 'close' } });
      // Read the body inside the retry boundary: resets can happen after headers.
      const body = await response.arrayBuffer();
      if ([408,429,500,502,503,504].includes(response.status) && attempt < attempts) {
        await delay(delayMs * attempt); continue;
      }
      return new Response(body, { status: response.status, statusText: response.statusText, headers: response.headers });
    } catch (error) {
      if (attempt === attempts) throw error;
      console.warn(`WordPress connection interrupted; retrying request (${attempt}/${attempts}).`);
      await delay(delayMs * attempt);
    }
  }
}
