import { readFile, writeFile, mkdir, rm } from 'node:fs/promises';
import { existsSync } from 'node:fs';
import { loadEnvFile } from 'node:process';
import { execFile, spawn } from 'node:child_process';
import { promisify } from 'node:util';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { fetchCollection } from '../src/lib/wordpress.mjs';
import { contentFingerprint, assertCleanSource } from './lib/publishing.mjs';
const exec = promisify(execFile);
const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
process.chdir(root);
if (existsSync('.env')) loadEnvFile('.env');
const env = { ...process.env, PATH: path.dirname(process.execPath) + path.delimiter + process.env.PATH,
  ASTRO_TELEMETRY_DISABLED: '1', WRANGLER_SEND_METRICS: 'false', GIT_TERMINAL_PROMPT: '0' };
const base = process.env.WORDPRESS_URL;
if (!base) throw new Error('WORDPRESS_URL must be set in .env.');
const project = 'oderinde-stephen-preview';
const stateFile = '.local/publish-state.json';
const lock = '.local/publish.lock';
const watching = process.argv.includes('--watch');
const checking = process.argv.includes('--check');
const interval = Math.max(30, Number(process.env.PUBLISH_INTERVAL_SECONDS || 60)) * 1000;
let stopping = false;
process.on('SIGTERM', () => { stopping = true; });
process.on('SIGINT', () => { stopping = true; });
function log(message) { console.log(`[${new Date().toISOString()}] ${message}`); }
async function run(command, args) {
  await new Promise((resolve, reject) => {
    const child = spawn(command, args, { cwd: root, env, stdio: 'inherit' });
    child.on('error', reject);
    child.on('exit', code => code === 0 ? resolve() : reject(new Error(`${command} ${args.join(' ')} exited ${code}`)));
  });
}
async function git(args) { return (await exec('git', args, { cwd: root, env })).stdout.trim(); }
async function assertSourceUnchanged(expectedHead) {
  if (await git(['branch','--show-current']) !== 'main' || await git(['rev-parse','HEAD']) !== expectedHead) {
    throw new Error('The source branch changed during export. Will retry from a clean, reviewed checkout.');
  }
  const tracked = await git(['diff','--name-only','HEAD']);
  const untracked = await git(['ls-files','--others','--exclude-standard']);
  assertCleanSource([tracked,untracked].join('\n').split('\n').filter(Boolean));
}
async function revisions() {
  const records = [];
  for (const type of ['pages','posts','case-study']) records.push(...await fetchCollection(base, type));
  let marker = '';
  const publicDir = process.env.WORDPRESS_PUBLIC_DIR;
  if (publicDir) {
    try { marker = await readFile(path.resolve(publicDir, '..', '.astro-publish-request'), 'utf8'); }
    catch (error) { if (error.code !== 'ENOENT') throw error; }
  }
  if (!records.some(record => new URL(record.link).pathname === '/')) throw new Error('WordPress homepage unavailable; refusing to publish.');
  return { fingerprint: contentFingerprint(records, marker), count: records.length };
}
async function acquireLock() {
  await mkdir('.local', { recursive: true });
  try { await mkdir(lock); }
  catch (error) {
    if (error.code !== 'EEXIST') throw error;
    let oldPid;
    try { oldPid = Number(await readFile(path.join(lock, 'pid'), 'utf8')); } catch { throw new Error('Publisher lock exists; retry after the active run.'); }
    try { process.kill(oldPid, 0); throw new Error('A publisher is already running.'); }
    catch (error) { if (error.code !== 'ESRCH') throw error; }
    await rm(lock, { recursive: true }); await mkdir(lock);
  }
  await writeFile(path.join(lock, 'pid'), String(process.pid));
}
async function publish(target) {
  await acquireLock();
  try {
    // Never commit or deploy unrelated edits, or deploy from an unexpected branch.
    const branch = await git(['branch','--show-current']);
    if (branch !== 'main') throw new Error('Automatic publishing runs only from main.');
    const tracked = await git(['diff','--name-only','HEAD']);
    const untracked = await git(['ls-files','--others','--exclude-standard']);
    assertCleanSource([tracked, untracked].join('\n').split('\n').filter(Boolean));
    const origin = await git(['remote','get-url','origin']);
    if (origin !== 'https://github.com/pythonhero1/Oderinde-Stephen-Website.git') throw new Error('Unexpected Git remote; refusing automatic publishing.');
    // Resolve the existing production branch rather than changing the Pages project.
    const raw = await exec(process.execPath, ['node_modules/wrangler/bin/wrangler.js','pages','deployment','list','--project-name',project,'--environment','production','--json'], { cwd: root, env, maxBuffer: 4 * 1024 * 1024 });
    const deployments = JSON.parse(raw.stdout);
    const branchName = deployments.find(item => item.Environment === 'Production')?.Branch;
    if (!branchName) throw new Error('Could not resolve the preview project production branch. Deployment stopped.');
    await run('git', ['fetch','origin','main']);
    const head = await git(['rev-parse','HEAD']);
    const upstream = await git(['rev-parse','origin/main']);
    if (head !== upstream) {
      const ancestor = await git(['merge-base','HEAD','origin/main']);
      if (ancestor !== upstream) throw new Error('GitHub has changes; update this checkout before publishing.');
    }
    log(`Refreshing ${target.count} published WordPress records.`);
    await run(process.execPath, ['scripts/sync-wordpress.mjs']);
    const after = await revisions();
    if (target.fingerprint !== after.fingerprint) throw new Error('WordPress changed during export. The next check will retry.');
    await assertSourceUnchanged(head);
    await run(process.execPath, ['--test','tests/wordpress.test.mjs','tests/publishing.test.mjs','tests/outreach.test.mjs']);
    await run(process.execPath, ['node_modules/astro/bin/astro.mjs','build']);
    await run(process.execPath, ['scripts/validate-build.mjs']);
    await assertSourceUnchanged(head);
    await run('git', ['add','src/data/wordpress.json','public','migration/sync-report.json','migration/link-audit.json']);
    if (await git(['diff','--cached','--name-only'])) {
      await run('git', ['commit','-m','Refresh published WordPress content']);
    }
    const publishedCommit = await git(['rev-parse','HEAD']);
    await run('git', ['-c','http.version=HTTP/1.1','-c','http.postBuffer=524288000','push','origin',`${publishedCommit}:refs/heads/main`]);
    await run(process.execPath, ['node_modules/wrangler/bin/wrangler.js','pages','deploy','dist','--project-name',project,'--branch',branchName,'--commit-hash',publishedCommit]);
    await writeFile(stateFile, JSON.stringify({ fingerprint: after.fingerprint, publishedAt: new Date().toISOString(), commit: publishedCommit }, null, 2));
    log('Published https://oderinde-stephen-preview.pages.dev; live domain unchanged.');
  } finally { await rm(lock, { recursive: true, force: true }); }
}
async function tick(force = false) {
  const current = await revisions();
  let saved;
  try { saved = JSON.parse(await readFile(stateFile, 'utf8')); } catch (error) { if (error.code !== 'ENOENT') throw error; }
  if (checking) { log(`WordPress is reachable: ${current.count} records. ${saved?.fingerprint === current.fingerprint ? 'No new content.' : 'Content is pending publication.'}`); return; }
  if (force || saved?.fingerprint !== current.fingerprint) await publish(current);
}
if (!watching) await tick(!checking);
else {
  log(`Watching ${base}. The Mac must remain awake and online.${process.env.WORDPRESS_PUBLIC_DIR ? ' Keep the local WordPress site running.' : ''}`);
  while (!stopping) {
    try { await tick(); } catch (error) { log(`Publish paused: ${error.message}. Will retry; the existing preview stays live.`); }
    if (!stopping) await new Promise(resolve => setTimeout(resolve, interval));
  }
}
