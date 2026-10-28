import {readFileSync,readdirSync} from 'node:fs';
import {createHash} from 'node:crypto';
import assert from 'node:assert/strict';
const approved='5aac6a75755f9f265574872e60c5fa3d4b913fc42ae027fa24904a80a8b55a8f';
const manifest=JSON.parse(readFileSync('release-fingerprint.json','utf8'));
const sha256=bytes=>createHash('sha256').update(bytes).digest('hex');
assert.equal(manifest.fingerprint,approved,'Build differs from independently approved candidate');
assert.equal(sha256(manifest.files.map(f=>`${f.file}\0${f.sha256}\n`).join('')),approved);
for(const f of manifest.files){
  for(const path of [f.file,'dist/'+f.file]){
    const bytes=readFileSync(path);assert.equal(bytes.length,f.bytes,path);assert.equal(sha256(bytes),f.sha256,path);
  }
}
const listed=readdirSync('dist',{recursive:true,withFileTypes:true}).filter(f=>f.isFile()).map(f=>(f.parentPath+'/'+f.name).replaceAll('\\','/').replace(/^dist\//,''));
assert.deepEqual(listed.sort(),manifest.files.map(f=>f.file).sort(),'Unexpected files in deployment artifact');
console.log(`Approved fingerprint ${approved}: all ${manifest.files.length} source and deployment files match.`);
