import { readFile, readdir } from 'node:fs/promises';
import path from 'node:path';
export async function getContentPages() {
  const pages=JSON.parse(await readFile(path.resolve('src/content/pages.json'),'utf8'));
  const dir=path.resolve('src/content/blog');
  for(const filename of await readdir(dir)){
    if(!filename.endsWith('.md'))continue;
    const source=await readFile(path.join(dir,filename),'utf8');
    const frontmatter=source.split('---')[1]||'';
    const value=key=>{const raw=frontmatter.match(new RegExp('^'+key+': (.+)$','m'))?.[1];if(!raw)return '';try{return JSON.parse(raw)}catch{return raw}};
    if(value('draft')===true)continue;
    pages.push({path:value('slug'),title:value('title'),description:value('description'),updated:value('updated'),type:'post'});
  }
  return pages;
}
