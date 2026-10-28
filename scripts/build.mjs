import {readFileSync,writeFileSync,mkdirSync,copyFileSync} from 'node:fs';import path from 'node:path';import{createHash}from'node:crypto';
const manifest=JSON.parse(readFileSync('assets/manifest.json','utf8').replace(/^\uFEFF/,''));
const files=['index.html','styles.css','app.js','assets/favicon.svg','assets/manifest.json',...Object.values(manifest).flatMap(x=>[x.poster,x.cutout,x.video])];
assertPaths();function assertPaths(){if(files.some(f=>!f||path.isAbsolute(f)||f.includes('..')))throw Error('Invalid release asset path');}
const fingerprints=[];for(const file of [...new Set(files)].sort()){const bytes=readFileSync(file);const target=path.join('dist',file);mkdirSync(path.dirname(target),{recursive:true});copyFileSync(file,target);fingerprints.push({file,bytes:bytes.length,sha256:createHash('sha256').update(bytes).digest('hex')});}
const fingerprint=createHash('sha256').update(fingerprints.map(f=>`${f.file}\0${f.sha256}\n`).join('')).digest('hex');
writeFileSync('release-fingerprint.json',JSON.stringify({fingerprint,algorithm:'SHA256 of sorted path NUL file-SHA256 LF records',files:fingerprints},null,2));console.log(JSON.stringify({fingerprint,files:fingerprints.length,totalBytes:fingerprints.reduce((s,f)=>s+f.bytes,0)}));
