import {readFileSync,writeFileSync} from 'node:fs';
import {createHash} from 'node:crypto';
import assert from 'node:assert/strict';
const digest=bytes=>createHash('sha256').update(bytes).digest('hex');
const release=JSON.parse(readFileSync('release-fingerprint.json','utf8'));
assert.equal(digest(release.files.map(file=>`${file.file}\0${file.sha256}\n`).join('')),release.fingerprint);
const files=await Promise.all(release.files.map(async file=>{
  const source=readFileSync(file.file),dist=readFileSync('dist/'+file.file);
  assert.equal(source.length,file.bytes);assert.equal(digest(source),file.sha256);assert.equal(digest(dist),file.sha256);
  const response=await fetch('http://127.0.0.1:4173/'+file.file);assert.equal(response.status,200);
  const served=Buffer.from(await response.arrayBuffer());assert.equal(digest(served),file.sha256);
  return {file:file.file,sourceMatches:true,distMatches:true,httpMatches:true,bytes:served.length};
}));
const range=await fetch('http://127.0.0.1:4173/assets/video/medusa.mp4',{headers:{Range:'bytes=0-1023'}});
const bytes=Buffer.from(await range.arrayBuffer());assert.equal(range.status,206);assert.equal(bytes.length,1024);assert.ok(bytes.equals(readFileSync('assets/video/medusa.mp4').subarray(0,1024)));
writeFileSync('qa/release-verification.json',JSON.stringify({fingerprint:release.fingerprint,files,range:{status:206,bytes:1024,matchesSource:true}},null,2));
console.log(JSON.stringify({fingerprint:release.fingerprint,verifiedSourceDistAndHttpFiles:files.length,rangeStatus:206,rangeBytes:1024}));
