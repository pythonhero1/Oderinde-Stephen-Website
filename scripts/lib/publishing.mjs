import { createHash } from 'node:crypto';
export function contentFingerprint(records, marker = '') {
  const stable = records.map(record => ({ id: record.id, type: record.type,
    path: record.path ?? new URL(record.link).pathname.replace(/^\/|\/$/g, ''), modified: record.modified }))
    .sort((a, b) => `${a.type}:${a.id}`.localeCompare(`${b.type}:${b.id}`));
  return createHash('sha256').update(JSON.stringify({ records: stable, marker })).digest('hex');
}
export function isPublishOutput(file) {
  return file === 'src/data/wordpress.json' || file.startsWith('public/') ||
    ['migration/sync-report.json','migration/link-audit.json'].includes(file);
}
export function assertCleanSource(files) {
  const unexpected = files.filter(file => !isPublishOutput(file));
  if (unexpected.length) throw new Error(`Uncommitted source edits need review before publishing: ${unexpected.join(', ')}`);
}
