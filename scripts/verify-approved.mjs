import {readFileSync,readdirSync} from 'node:fs';
import {createHash} from 'node:crypto';
import assert from 'node:assert/strict';
const approved='0d2ea1daecd20544d60271af8081ada1bc5eb213ff9a62057b37b47369079116';
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
