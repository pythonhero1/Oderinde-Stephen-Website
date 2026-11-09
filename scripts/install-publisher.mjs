import { copyFile, mkdir, writeFile, chmod, access } from 'node:fs/promises';
import { execFile } from 'node:child_process';
import { promisify } from 'node:util';
import { homedir } from 'node:os';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
const exec = promisify(execFile);
const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
if (process.platform !== 'darwin') throw new Error('This installer is for the local Mac. Run npm run watch:wordpress manually on other systems.');
const label = 'com.oderindestephen.astro-publisher';
const domain=`gui/${process.getuid()}`;
if (process.argv.includes('--stop')) {
  await exec('/bin/launchctl',['disable',`${domain}/${label}`]);
  try { await exec('/bin/launchctl',['bootout',`${domain}/${label}`]); } catch {}
  console.log('Local automatic publishing stopped and disabled. Run npm run install:publisher to enable it again.');
  process.exit(0);
}
const target = path.join(root,'.tools/node/bin/node');
await mkdir(path.dirname(target),{recursive:true});
// Keep an official runtime in the ignored local tools folder: /tmp is not durable.
if (path.resolve(process.execPath) !== target) await copyFile(process.execPath,target);
await chmod(target,0o755);
await mkdir(path.join(root,'.local'),{recursive:true});
const agents = path.join(homedir(),'Library/LaunchAgents');
await mkdir(agents,{recursive:true});
const xml = value => String(value).replaceAll('&','&amp;').replaceAll('<','&lt;').replaceAll('>','&gt;').replaceAll('"','&quot;');
const plist = `<?xml version="1.0" encoding="UTF-8"?>
<!DOCTYPE plist PUBLIC "-//Apple//DTD PLIST 1.0//EN" "http://www.apple.com/DTDs/PropertyList-1.0.dtd">
<plist version="1.0"><dict>
<key>Label</key><string>${label}</string>
<key>ProgramArguments</key><array><string>${xml(target)}</string><string>${xml(path.join(root,'scripts/publish-wordpress.mjs'))}</string><string>--watch</string></array>
<key>WorkingDirectory</key><string>${xml(root)}</string>
<key>EnvironmentVariables</key><dict><key>PATH</key><string>${xml(path.dirname(target)+':/usr/bin:/bin:/usr/sbin:/sbin')}</string></dict>
<key>RunAtLoad</key><true/><key>KeepAlive</key><true/><key>ThrottleInterval</key><integer>30</integer>
<key>StandardOutPath</key><string>${xml(path.join(root,'.local/publisher.log'))}</string>
<key>StandardErrorPath</key><string>${xml(path.join(root,'.local/publisher-error.log'))}</string>
</dict></plist>`;
const file=path.join(agents,label+'.plist');
await writeFile(file,plist,{mode:0o600});
await exec('/bin/launchctl',['enable',`${domain}/${label}`]);
try { await exec('/bin/launchctl',['bootout',`${domain}/${label}`]); } catch { /* First installation has no running agent. */ }
await exec('/bin/launchctl',['bootstrap',domain,file]);
console.log('Local WordPress publisher installed. It runs while you are signed in and the Mac is awake. Logs: .local/publisher.log');
