import {readFileSync,writeFileSync,mkdirSync} from 'node:fs';
import {createHash} from 'node:crypto';
import {pathToFileURL} from 'node:url';
import assert from 'node:assert/strict';
const {chromium}=await import(pathToFileURL(process.argv[2]).href);
const base=process.argv[3],commit=process.argv[4];
assert.equal(base,'https://seoshiro.github.io/NEREID/');assert.match(commit,/^[0-9a-f]{40}$/);
const release=JSON.parse(readFileSync('release-fingerprint.json','utf8'));
const browser=await chromium.launch({headless:true,channel:'chrome'});
const results=[],errors=[],failedRequests=[];mkdirSync('qa/live',{recursive:true});
async function test(name,fn){try{results.push({name,status:'passed',detail:await fn()});console.log('PASS '+name)}catch(error){results.push({name,status:'failed',error:error.stack});console.error('FAIL '+name+': '+error.message)}}
await test('All 14 live runtime files match the independently approved fingerprint',async()=>{
  const context=await browser.newContext();const rows=[];
  for(const file of release.files){
    const response=await context.request.get(new URL(file.file,base).href,{timeout:30000});
    assert.equal(response.status(),200,file.file);const bytes=await response.body();
    const sha256=createHash('sha256').update(bytes).digest('hex');assert.equal(sha256,file.sha256,file.file);assert.equal(bytes.length,file.bytes,file.file);
    rows.push({file:file.file,status:response.status(),bytes:bytes.length,sha256,contentType:response.headers()['content-type']});
  }
  const partial=await context.request.get(new URL('assets/video/medusa.mp4',base).href,{headers:{Range:'bytes=0-1023'}});
  assert.equal(partial.status(),206);const bytes=await partial.body();assert.equal(bytes.length,1024);assert.ok(bytes.equals(readFileSync('assets/video/medusa.mp4').subarray(0,1024)));
  await context.close();return{fingerprint:release.fingerprint,files:rows,range:{status:206,bytes:1024}};
});
for(const [label,width,height]of [['desktop',1440,900],['mobile',390,844]])await test(`${label}: three scenes, playback, geometry, navigation and gallery`,async()=>{
  const context=await browser.newContext({viewport:{width,height}}),page=await context.newPage();page.setDefaultTimeout(20000);
  page.on('pageerror',error=>errors.push({viewport:label,message:error.message}));
  page.on('requestfailed',request=>failedRequests.push({viewport:label,url:request.url(),error:request.failure()?.errorText}));
  const response=await page.goto(base,{waitUntil:'domcontentloaded'});assert.equal(response.status(),200);
  await page.waitForFunction(()=>document.querySelector('.scene.is-active').classList.contains('has-poster')&&!document.documentElement.classList.contains('anim'));
  await page.evaluate(()=>document.fonts.ready);const scenes=[];
  for(const id of ['manta','orca','medusa']){
    if(id!=='manta')await page.locator(`.animal[data-species="${id}"]`).click();
    await page.waitForFunction(id=>{const s=document.querySelector('.scene.is-active'),v=s.querySelector('video');return s.dataset.scene===id&&v.readyState>=2&&!v.paused&&v.currentTime>0},id);
    await page.waitForTimeout(350); // Capture the settled 220 ms crossfade.
    await page.locator('#species').focus();await page.evaluate(()=>scrollTo({top:0,behavior:'instant'}));
    const info=await page.evaluate(()=>{
      const scene=document.querySelector('.scene.is-active'),v=scene.querySelector('video'),range=document.createRange();range.selectNodeContents(document.querySelector('h1 .ent-line').firstChild);
      const rect=r=>({left:r.left,right:r.right,top:r.top,bottom:r.bottom});
      return {scene:scene.dataset.scene,title:document.querySelector('h1').textContent,ctaText:document.querySelector('.cta>a').textContent,profile:document.querySelector('#discover-title').innerText,videoWidth:v.videoWidth,videoHeight:v.videoHeight,duration:v.duration,muted:v.muted,inline:v.playsInline,loop:v.loop,playing:[...document.querySelectorAll('video')].filter(v=>!v.paused).length,overflow:document.documentElement.scrollWidth>innerWidth,scrollY,titleBounds:rect(range.getBoundingClientRect()),ctaBounds:rect(document.querySelector('.cta>a').getBoundingClientRect())};
    });
    assert.equal(info.title,id.toUpperCase());assert.equal(info.videoWidth,1920);assert.equal(info.videoHeight,1080);assert.equal(info.duration,8);assert.ok(info.muted&&info.inline&&info.loop);assert.equal(info.playing,1);assert.equal(info.overflow,false);assert.equal(info.scrollY,0);
    assert.equal(info.ctaText,{manta:'About manta rays',orca:'About orcas',medusa:'About jellyfish'}[id]);
    for(const r of [info.titleBounds,info.ctaBounds])assert.ok(r.left>=0&&r.right<=width&&r.top>=0&&r.bottom<=height);
    await page.screenshot({path:`qa/live/${label}-${id}.png`});scenes.push(info);
  }
  if(label==='mobile'){
    await page.locator('.burger').focus();await page.keyboard.press('Enter');
    for(let i=1;i<=5;i++){await page.keyboard.press('Tab');assert.ok(await page.locator(`#site-nav a:nth-child(${i})`).evaluate(e=>e===document.activeElement))}
    await page.keyboard.press('Escape');assert.equal(await page.locator('.burger').getAttribute('aria-expanded'),'false');assert.ok(await page.locator('.burger').evaluate(e=>e===document.activeElement));
    await page.keyboard.press('Enter');for(let i=0;i<3;i++)await page.keyboard.press('Tab');await page.keyboard.press('Enter');
    await page.waitForFunction(()=>document.activeElement.id==='gallery');assert.equal(await page.locator('.burger').getAttribute('aria-expanded'),'false');
  }else await page.locator('#site-nav a[href="#gallery"]').click();
  await page.locator('[data-gallery="orca"]').click();assert.equal(await page.locator('dialog').evaluate(d=>d.open),true);
  await page.keyboard.press('Escape');await page.waitForFunction(()=>!document.querySelector('dialog').open);assert.equal(await page.evaluate(()=>document.activeElement.dataset.gallery),'orca');
  await page.locator('summary').first().click();assert.equal(await page.locator('details').first().getAttribute('open'),'');
  await page.locator('#species').focus();await page.evaluate(()=>scrollTo({top:0,behavior:'instant'}));
  await page.waitForFunction(()=>!document.querySelector('.scene.is-active video').paused);await page.locator('.motion-control').click();assert.ok(await page.locator('video').evaluateAll(vs=>vs.every(v=>v.paused)));
  await page.locator('.motion-control').click();await page.waitForFunction(()=>!document.querySelector('.scene.is-active video').paused);
  const copy=await page.locator('.section-heading,.species-tabs,.gallery-caption,summary').allTextContents();
  assert.equal(copy.some(text=>/\b0[123]\b/.test(text)),false);
  assert.equal(await page.locator('#gallery-title').textContent(),'Ocean portraits');
  assert.equal((await page.locator('#journal-title').innerText()).replace(/\s+/g,' '),'Feeding, sound and light');
  await context.close();return{scenes,keyboardMenu:label==='mobile',gallery:true,journal:true,pauseAndResume:true,decorativeNumberingAbsent:true,editorialLabels:copy};
});
await test('No uncaught browser errors during live smoke',async()=>{assert.deepEqual(errors,[]);return{errors,failedRequests}});
await browser.close();writeFileSync('qa/live/results.json',JSON.stringify({recordedAt:new Date().toISOString(),url:base,commit,fingerprint:release.fingerprint,browser:'Installed Chrome; desktop and mobile CSS viewport simulations',results},null,2));
if(results.some(r=>r.status==='failed'))process.exitCode=1;
