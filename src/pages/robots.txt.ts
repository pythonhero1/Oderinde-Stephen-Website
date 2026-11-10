import site from '../config/site.json';
export function GET() {
  return new Response(
    `User-agent: *\n${site.indexable ? 'Allow: /' : 'Disallow: /'}\nSitemap: ${site.origin}/sitemap.xml\n`,
    { headers: { 'Content-Type': 'text/plain; charset=utf-8' } },
  );
}
