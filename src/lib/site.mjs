import { parse, parseFragment, serialize } from 'parse5';
import { configureContactForms } from './contact-form.mjs';
import site from '../config/site.json' with {type:'json'};
const attr=(n,k)=>n.attrs?.find(a=>a.name===k)?.value;
const text=n=>n.nodeName==='#text'?n.value:(n.childNodes||[]).map(text).join('');
const plain=s=>text(parseFragment(s||'')).replace(/\s+/g,' ').trim();
const escape=s=>String(s).replaceAll('&','&amp;').replaceAll('<','&lt;').replaceAll('>','&gt;').replaceAll('"','&quot;');
function walk(n,f){f(n);for(const c of [...(n.childNodes||[])])walk(c,f)}
function find(n,p){if(p(n))return n;for(const c of n.childNodes||[]){const r=find(c,p);if(r)return r}}
function set(n,k,v){n.attrs??=[];n.attrs=n.attrs.filter(a=>a.name!==k);n.attrs.push({name:k,value:v})}
function inner(n,html){n.childNodes=parseFragment(html).childNodes;for(const c of n.childNodes)c.parentNode=n}
const aliases={'/portfolio/':'/case-studies/','/solutions/':'/business-website-solutions/','/e-commerce-development/':'/contact/','/website-redesign/':'/contact/','/client-portals-business-systems/':'/contact/','/shopify-development/':'/contact/','/woocommerce-development/':'/contact/','/wordpress-development/':'/business-website-development/'};
export function renderSitePage({page,layout,content,header,footer,endpoint='',posts=[]}) {
  let html=layout.replace('<!-- SITE_CONTENT -->',content).replace('<!-- SITE_HEADER -->',header).replace('<!-- SITE_FOOTER -->',footer);
  const root=parse(html); const head=find(root,n=>n.tagName==='head');
  walk(root,n=>{if(n.tagName==='script'&&attr(n,'type')==='speculationrules'&&n.parentNode)n.parentNode.childNodes=n.parentNode.childNodes.filter(c=>c!==n)});
  // Functional link and metadata changes only: preserve the original DOM, class names and styling.
  walk(root,n=>{
    if(n.tagName!=='a')return;
    const label=plain(text(n));let href=attr(n,'href');
    if(/(?:Open |Start a Conversation on )?Upwork(?: Profile)?$/i.test(label))href=site.upwork;
    else if(/(?:Open |Start a Conversation on )?Fiverr(?: Profile)?$/i.test(label))href=site.fiverr;
    else if(/Book (?:a |Your )?(?:Strategy )?Call/i.test(label))href=site.booking;
    else if(/More About|^About$/i.test(label))href='/#about';
    else if(/^(?:View |Explore |All |Full |Selected )*(?:My Work|Selected Work|Full Portfolio|Portfolio|Case Studies)$/i.test(label))href='/case-studies/';
    else if(/Insights/.test(label))href='/insights/';
    else if(/Create Client Account|Start (?:a |Your )?Project|Ask a Project Question|Request.*Quote/.test(label)&&(!href||href==='/'||href==='#'))href='/contact/';
    else if(label==='Explore Packages')href='/pricing/#packages';
    if(aliases[href])href=aliases[href];
    if(href?.startsWith('/services/'))href=aliases[href.replace('/services','')]||'/contact/';
    if(href?.startsWith('/insights/')&&href!=='/insights/'&&!posts.some(p=>`/${p.path}/`===href))href='/insights/';
    if(href)set(n,'href',href);
    if(attr(n,'target')==='_blank')set(n,'rel','noopener noreferrer');
  });
  if(page.path===''){
    const about=find(root,n=>(attr(n,'class')||'').split(/\s+/).includes('et_pb_section_5'));if(about)set(about,'id','about');
  }
  if(page.path==='pricing'){
    const heading=find(root,n=>n.tagName==='h2'&&/Website & Digital Solutions Pricing/.test(text(n)));
    if(heading)set(heading,'id','packages');
  }
  // Keep the existing card presentation while making its text actually clickable.
  walk(root,n=>{
    if(!/^h[1-6]$/.test(n.tagName))return;
    const label=plain(text(n));
    const profile=/^Upwork Profile$/i.test(label)?site.upwork:/^LinkedIn Profile$/i.test(label)?site.linkedin:/^Fiverr Profile$/i.test(label)?site.fiverr:'';
    if(profile){inner(n,`<a href="${profile}" style="color:inherit;text-decoration:inherit" target="_blank" rel="noopener noreferrer">${label}</a>`);return;}
    if(label!=='View Case Study')return;
    let card=n.parentNode;while(card&&!find(card,c=>c.tagName==='img'))card=card.parentNode;
    if(!card)return;const names=[['Pipe Patch','pipe-patch-pro-amazon-listing-website'],['Samuel','samuel-edmond-stone-landing-page'],['Einbruchschutz','einbruchschutz-baumgaertner-modernizing-website-redesign-case-study']];
    const match=names.find(([name])=>text(card).includes(name));if(match)inner(n,`<a href="/case-study/${match[1]}/" style="color:inherit">View Case Study</a>`);
  });
  if(head){
    head.childNodes=head.childNodes.filter(n=>!(n.tagName==='script'&&attr(n,'type')==='application/ld+json'));
    head.childNodes=head.childNodes.filter(n=>n.tagName!=='title'&&!(n.tagName==='meta'&&['description','robots'].includes(attr(n,'name')))&&!(n.tagName==='link'&&attr(n,'rel')==='canonical'));
    const canonical=site.origin+'/'+(page.path?page.path+'/':'');
    const title=page.title.includes('Oderinde Stephen')?page.title:page.title+' | Oderinde Stephen';
    const nodes=parseFragment(`<title>${escape(title)}</title><meta name="description" content="${escape(page.description)}"><meta name="robots" content="${site.indexable?'index, follow':'noindex, follow'}"><link rel="canonical" href="${canonical}"><link rel="stylesheet" href="/styles/responsive.css">`).childNodes;
    const schema={'@context':'https://schema.org','@type':page.type==='post'?'BlogPosting':page.type==='project'?'Article':'WebPage',name:page.title,headline:page.title,description:page.description,url:canonical,author:{'@type':'Person',name:site.name,url:site.origin+'/'} };
    nodes.push(...parseFragment(`<script type="application/ld+json">${JSON.stringify(schema).replaceAll('<','\\u003c')}</script>`).childNodes);
    for(const n of nodes)n.parentNode=head;head.childNodes.push(...nodes);
    walk(head,n=>{if(n.tagName==='meta'){const k=attr(n,'property')||attr(n,'name');if(['og:title','twitter:title'].includes(k))set(n,'content',title);if(['og:description','twitter:description'].includes(k))set(n,'content',page.description);if(k==='og:url')set(n,'content',canonical)}});
  }
  return configureContactForms(serialize(root),endpoint);
}
