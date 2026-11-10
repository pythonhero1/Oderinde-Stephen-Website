import { getCollection } from 'astro:content';
import pages from '../content/pages.json';
import site from '../config/site.json';

export async function GET() {
  const posts = await getCollection('blog', ({ data }) => !data.draft);
  const entries = [
    ...pages.map((page) => ({ path: page.path, updated: page.updated })),
    ...posts.map((post) => ({
      path: post.data.slug,
      updated: post.data.updated?.toISOString().slice(0, 10),
    })),
  ];
  const urls = entries
    .map(
      (page) =>
        `<url><loc>${site.origin}/${page.path ? `${page.path}/` : ''}</loc>${page.updated ? `<lastmod>${page.updated}</lastmod>` : ''}</url>`,
    )
    .join('');
  return new Response(
    `<?xml version="1.0" encoding="UTF-8"?><urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">${urls}</urlset>`,
    { headers: { 'Content-Type': 'application/xml; charset=utf-8' } },
  );
}
