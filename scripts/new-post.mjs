import { mkdir, writeFile, readFile, readdir } from 'node:fs/promises';
import path from 'node:path';
const title = process.argv.slice(2).join(' ').trim();
if (!title) throw new Error('Add a title: npm run new:post -- "Your article title"');
const slug = title
  .normalize('NFKD')
  .replace(/[\u0300-\u036f]/g, '')
  .toLowerCase()
  .replace(/[^a-z0-9]+/g, '-')
  .replace(/^-|-$/g, '');
if (!slug) throw new Error('Use a title with letters or numbers.');
const pages = JSON.parse(await readFile('src/content/pages.json', 'utf8'));
if (pages.some((p) => p.path === slug)) throw new Error('That address is already used by a page.');
const directory = 'src/content/blog';
await mkdir(directory, { recursive: true });
for (const file of await readdir(directory)) {
  const source = await readFile(path.join(directory, file), 'utf8');
  if (source.includes(`slug: ${JSON.stringify(slug)}`))
    throw new Error('An article already uses that address.');
}
const date = new Intl.DateTimeFormat('en-CA', { timeZone: 'Asia/Dubai' }).format(new Date());
const output = path.join(directory, slug + '.md');
await writeFile(
  output,
  `---\ntitle: ${JSON.stringify(title)}\nslug: ${JSON.stringify(slug)}\ndescription: "Add a short search description for this article."\nupdated: "${date}"\ndraft: true\n---\n\nWrite your introduction here.\n\n## Your first section\n\nWrite the article here. Add images with ![Description](/assets/your-image.jpg).\n`,
  { flag: 'wx' },
);
console.log(`Created draft: ${output}\nEdit it, then change draft to false when ready to publish.`);
