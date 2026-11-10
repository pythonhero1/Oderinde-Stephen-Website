import pages from '../data/wordpress.json';
import site from '../config/site.json';
import { getSitePages } from '../lib/site-pages.mjs';
export function GET() {
  const urls = getSitePages(pages).map(page => `<url><loc>${site.origin}/${page.path ? page.path + '/' : ''}</loc>${page.modified ? `<lastmod>${page.modified.slice(0, 10)}</lastmod>` : ''}</url>`).join('');
  return new Response(`<?xml version="1.0" encoding="UTF-8"?><urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">${urls}</urlset>`, { headers: { 'Content-Type': 'application/xml; charset=utf-8' } });
}
