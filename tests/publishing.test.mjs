import test from 'node:test';
import assert from 'node:assert/strict';
import { contentFingerprint, assertCleanSource } from '../scripts/lib/publishing.mjs';
test('content polling detects publishing edits, route changes and deletions without relying on API order',()=>{
 const a={id:1,type:'page',modified:'2026-11-09T10:00:00',link:'http://local/'};
 const b={id:2,type:'post',modified:'2026-11-09T10:00:00',link:'http://local/post/'};
 assert.equal(contentFingerprint([a,b]),contentFingerprint([b,a]));
 assert.notEqual(contentFingerprint([a,b]),contentFingerprint([a]));
 assert.notEqual(contentFingerprint([a]),contentFingerprint([{...a,modified:'2026-11-09T11:00:00'}]));
 assert.notEqual(contentFingerprint([a]),contentFingerprint([{...a,link:'http://local/changed/'}]));
 assert.notEqual(contentFingerprint([a],'old'),contentFingerprint([a],'new'));
});
test('auto publisher refuses unrelated source edits',()=>{
 assert.doesNotThrow(()=>assertCleanSource(['src/data/wordpress.json','public/new.webp','migration/sync-report.json']));
 assert.throws(()=>assertCleanSource(['src/lib/wordpress.mjs']),/Uncommitted source edits/);
 assert.throws(()=>assertCleanSource(['.env.example']),/Uncommitted source edits/);
});
