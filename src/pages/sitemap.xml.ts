import site from '../config/site.json';
import {getContentPages} from '../lib/content.mjs';
export async function GET() {
  const pages=await getContentPages();
  const urls=pages.map(page=>`<url><loc>${site.origin}/${page.path?page.path+'/':''}</loc>${page.updated?`<lastmod>${page.updated}</lastmod>`:''}</url>`).join('');
  return new Response(`<?xml version="1.0" encoding="UTF-8"?><urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">${urls}</urlset>`,{headers:{'Content-Type':'application/xml; charset=utf-8'}});
}
