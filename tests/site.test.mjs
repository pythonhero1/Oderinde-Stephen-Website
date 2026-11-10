import test from 'node:test';
import assert from 'node:assert/strict';
import {readFile,mkdtemp,mkdir,readdir,rm,writeFile} from 'node:fs/promises';
import {createHash} from 'node:crypto';
import {execFile} from 'node:child_process';
import {promisify} from 'node:util';
import {tmpdir} from 'node:os';
import path from 'node:path';
import {parse} from 'parse5';
import {renderSitePage} from '../src/lib/site.mjs';
import {getContentPages} from '../src/lib/content.mjs';
const manifest=JSON.parse(await readFile('src/content/pages.json','utf8'));
const original=JSON.parse(await readFile('tests/fixtures/original-layouts.json','utf8'));
const header=await readFile('src/design/shared/header.html','utf8');
const footer=await readFile('src/design/shared/footer.html','utf8');
const attr=(n,k)=>n.attrs?.find(a=>a.name===k)?.value;
const text=n=>n.nodeName==='#text'?n.value:(n.childNodes||[]).map(text).join('');
function find(n,p){if(p(n))return n;for(const c of n.childNodes||[]){const r=find(c,p);if(r)return r}}
async function render(page){return renderSitePage({page,layout:await readFile(`src/design/layouts/${page.layoutKey}.html`,'utf8'),content:await readFile(`src/content/pages/${page.contentKey||page.layoutKey}.html`,'utf8'),header,footer,endpoint:'https://formspree.io/f/mnppkklg'});}
function signature(main){const nodes=[];function walk(n){if(n.tagName&&n.tagName!=='a')nodes.push([n.tagName,attr(n,'class')||'']);if(n.tagName!=='form')for(const c of n.childNodes||[])walk(c)}walk(main);return createHash('sha256').update(JSON.stringify(nodes)).digest('hex');}

test('restored page structure matches the original design before the rejected redesign',async()=>{
 for(const [slug,expected]of Object.entries(original)){const html=await render(manifest.find(p=>p.path===slug));const main=find(parse(html),n=>attr(n,'id')==='main-content');assert.equal(signature(main),expected,slug||'home');assert.ok(!html.includes('outreach-article'));}
});
test('local pages render with no WordPress connection and preserve preview SEO',async()=>{
 const fetcher=globalThis.fetch;globalThis.fetch=()=>{throw new Error('Network use is not permitted for static content');};
 try{for(const page of manifest.filter(p=>p.type!=='collection')){const html=await render(page);assert.ok(!/https?:\/\/(?:cms\.oderindestephen\.com|oderindestephen\.local)|\/wp-json\/|\/wp-admin\//.test(html),page.path);const root=parse(html);assert.equal(attr(find(root,n=>n.tagName==='meta'&&attr(n,'name')==='robots'),'content'),'noindex, follow');assert.equal(attr(find(root,n=>n.tagName==='link'&&attr(n,'rel')==='canonical'),'href'),`https://oderindestephen.com/${page.path?page.path+'/':''}`);}}
 finally{globalThis.fetch=fetcher;}
});
test('contact form retains its original layout and verified Formspree delivery',async()=>{
 const root=parse(await render(manifest.find(p=>p.path==='contact')));const form=find(root,n=>n.tagName==='form');assert.equal(attr(form,'action'),'https://formspree.io/f/mnppkklg');assert.equal(attr(form,'method'),'post');for(const name of ['name','email','service','message'])assert.equal(attr(find(form,n=>attr(n,'name')===name),'required'),'');for(const name of ['company','budget','timeline'])assert.equal(attr(find(form,n=>attr(n,'name')===name),'required'),undefined);assert.ok(!find(form,n=>attr(n,'type')==='hidden'));
});
test('each project has its authored content instead of the duplicated template',async()=>{
 for(const page of manifest.filter(p=>p.type==='project')){const root=parse(await render(page));const main=find(root,n=>attr(n,'id')==='main-content');assert.ok(find(main,n=>n.tagName==='h1'));if(!page.path.includes('pipe-patch'))assert.ok(!text(main).includes('Pipe Patch Pro'),page.path);}
});
test('blog metadata and local content create unique published routes',async()=>{
 const pages=await getContentPages();const routes=pages.map(p=>p.path);assert.equal(new Set(routes).size,routes.length);assert.ok(pages.some(p=>p.type==='post'&&p.path.includes('why-wordpress')));assert.ok(pages.every(p=>typeof p.title==='string'&&p.title.length>0));
});
test('new article helper creates a draft and refuses an overwrite',async()=>{
 const directory=await mkdtemp(path.join(tmpdir(),'astro-content-'));const run=promisify(execFile);const helper=path.resolve('scripts/new-post.mjs');
 try{await mkdir(path.join(directory,'src/content'),{recursive:true});await writeFile(path.join(directory,'src/content/pages.json'),'[]');await run(process.execPath,[helper,'A practical website guide'],{cwd:directory});const files=await readdir(path.join(directory,'src/content/blog'));assert.deepEqual(files,['a-practical-website-guide.md']);const source=await readFile(path.join(directory,'src/content/blog',files[0]),'utf8');assert.match(source,/draft: true/);assert.match(source,/slug: "a-practical-website-guide"/);await assert.rejects(run(process.execPath,[helper,'A practical website guide'],{cwd:directory}));}
 finally{await rm(directory,{recursive:true,force:true});}
});
