import { mkdirSync, writeFileSync } from 'node:fs';
import { pathToFileURL } from 'node:url';
import assert from 'node:assert/strict';
const { chromium } = await import(process.argv[2] ? pathToFileURL(process.argv[2]).href : 'playwright');
const browser=await chromium.launch({headless:true,channel:'chrome'});
async function newContext(options={}){const context=await browser.newContext(options);context.setDefaultTimeout(12000);return context;}
const out='qa';mkdirSync(out,{recursive:true});
const results=[];const base='http://127.0.0.1:4173/';
const delay=ms=>new Promise(r=>setTimeout(r,ms));
async function test(name,fn){try{const detail=await fn();results.push({name,status:'passed',detail});console.log('PASS '+name);}catch(error){results.push({name,status:'failed',error:error.message});console.error('FAIL '+name+': '+error.message);}}
async function ready(page){await page.goto(base,{waitUntil:'domcontentloaded'});await page.waitForFunction(()=>document.querySelector('.scene.is-active').classList.contains('has-poster'));await page.waitForFunction(()=>!document.documentElement.classList.contains('anim'));}
async function choose(page,id){await page.locator(`.animal[data-species="${id}"]`).click();await page.waitForFunction(id=>document.querySelector('.stage').dataset.featured===id,id);}
const ctx=await newContext({viewport:{width:1440,height:900}});const page=await ctx.newPage();
const errors=[];page.on('pageerror',e=>errors.push(e.message));
await test('Real videos: metadata, mutually exclusive playback and three complete cycles',async()=>{
  await ready(page);let metadata=[];
  for(const id of ['manta','orca','medusa']){if(id!=='manta')await choose(page,id);await page.waitForFunction(()=>{const v=document.querySelector('.scene.is-active video');return v.readyState===4&&!v.paused&&v.currentTime>0;});metadata.push(await page.locator('.scene.is-active video').evaluate(v=>({scene:v.parentElement.dataset.scene,width:v.videoWidth,height:v.videoHeight,duration:v.duration,muted:v.muted,loop:v.loop,playsInline:v.playsInline})));assert.equal(await page.locator('video').evaluateAll(vs=>vs.filter(v=>!v.paused).length),1);}
  await choose(page,'manta');for(let n=0;n<3;n++)for(const id of ['orca','medusa','manta'])await choose(page,id);
  assert.deepEqual(await page.locator('.animal').evaluateAll(bs=>bs.map(b=>b.dataset.species)),['orca','medusa']);
  for(const m of metadata){assert.equal(m.width,1920);assert.equal(m.height,1080);assert.equal(m.duration,8);assert.ok(m.muted&&m.loop&&m.playsInline);}return metadata;
});
await test('Responsive geometry and media at all eight requested sizes',async()=>{
  const rows=[];
  for(const [width,height]of [[2560,1440],[1440,900],[1366,768],[1024,768],[768,1024],[390,844],[375,812],[320,568]]){
    await page.setViewportSize({width,height});await page.evaluate(()=>scrollTo(0,0));
    for(const id of ['manta','orca','medusa']){
      if(await page.locator('.stage').getAttribute('data-featured')!==id)await choose(page,id);
      await page.evaluate(async()=>{await document.fonts.ready;scrollTo({top:0,behavior:'instant'})});await delay(250);
      const info=await page.evaluate(()=>{
        const range=document.createRange();range.selectNodeContents(document.querySelector('h1 .ent-line').firstChild);
        const title=range.getBoundingClientRect(),cta=document.querySelector('.cta>a').getBoundingClientRect();
        const rect=r=>({top:r.top,bottom:r.bottom,left:r.left,right:r.right});
        return {scene:document.querySelector('.stage').dataset.featured,overflow:document.documentElement.scrollWidth>innerWidth,title:rect(title),cta:rect(cta),scrollX,scrollY,images:[...document.querySelectorAll('.animal img.is-shown')].every(i=>i.complete&&i.naturalWidth>0)};
      });
      assert.equal(info.overflow,false);assert.equal(info.scrollY,0);assert.equal(info.scrollX,0);
      for(const bounds of [info.title,info.cta])assert.ok(bounds.left>=0&&bounds.right<=width&&bounds.top>=0&&bounds.bottom<=height,JSON.stringify(info));
      assert.ok(info.images);rows.push({width,height,...info});
    }
  }return rows;
});
await test('Keyboard menu, gallery focus and meaningful navigation',async()=>{
  await page.setViewportSize({width:390,height:844});await page.evaluate(()=>scrollTo({top:0,behavior:'instant'}));await page.locator('.burger').focus();await page.keyboard.press('Enter');await page.keyboard.press('Tab');assert.equal(await page.evaluate(()=>document.activeElement.textContent),'Species');await page.keyboard.press('Escape');assert.equal(await page.locator('.burger').getAttribute('aria-expanded'),'false');assert.equal(await page.evaluate(()=>document.activeElement.className),'burger');
  await page.locator('[data-gallery="orca"]').click();await page.keyboard.press('Escape');await page.waitForFunction(()=>!document.querySelector('dialog').open);assert.equal(await page.evaluate(()=>document.activeElement.dataset.gallery),'orca');
  await page.locator('[data-gallery="orca"]').click();await page.getByRole('button',{name:'Meet this species →'}).click();await page.waitForFunction(()=>document.activeElement.id==='discover'&&!document.querySelector('dialog').open);await delay(200);assert.equal(await page.evaluate(()=>document.activeElement.id),'discover');assert.equal(await page.locator('.stage').getAttribute('data-featured'),'orca');
  await page.locator('summary').first().click();assert.equal(await page.locator('details').first().getAttribute('open'),'');
});
await test('Pause persistence, off-screen suspension and resumed playback',async()=>{
  await page.evaluate(()=>scrollTo(0,0));await page.locator('.motion-control').click();assert.equal(await page.locator('video').evaluateAll(vs=>vs.every(v=>v.paused)),true);await page.reload();await page.waitForFunction(()=>document.querySelector('.motion-control').textContent==='Play motion');assert.equal(await page.locator('video').evaluateAll(vs=>vs.every(v=>!v.getAttribute('src'))),true);
  await page.locator('.motion-control').click();await page.waitForFunction(()=>!document.querySelector('.scene.is-active video').paused);await page.locator('#journal').scrollIntoViewIfNeeded();await page.waitForFunction(()=>document.querySelector('.scene.is-active video').paused);await page.evaluate(()=>scrollTo(0,0));await page.waitForFunction(()=>!document.querySelector('.scene.is-active video').paused);
});
await test('Continuous native looping',async()=>{
  const loops=[];for(const id of ['manta','orca','medusa']){if(await page.locator('.stage').getAttribute('data-featured')!==id)await choose(page,id);await page.waitForFunction(()=>!document.querySelector('.scene.is-active video').paused);const observed=await page.locator('.scene.is-active video').evaluate(v=>new Promise(resolve=>{let last=v.currentTime;const timer=setTimeout(()=>{v.removeEventListener('timeupdate',check);resolve(false)},10000);function check(){if(v.currentTime<last-.5){clearTimeout(timer);v.removeEventListener('timeupdate',check);resolve(true)}last=v.currentTime}v.addEventListener('timeupdate',check);}));assert.ok(observed);loops.push({scene:id,observedWrap:true});}return loops;
});
await test('Final screenshots',async()=>{
  await page.setViewportSize({width:1440,height:900});await page.evaluate(()=>scrollTo(0,0));for(const id of ['manta','orca','medusa']){if(await page.locator('.stage').getAttribute('data-featured')!==id)await choose(page,id);await delay(500);await page.screenshot({path:`${out}/desktop-${id}.png`});}
  await page.setViewportSize({width:390,height:844});for(const id of ['manta','orca','medusa']){if(await page.locator('.stage').getAttribute('data-featured')!==id)await choose(page,id);await delay(400);await page.screenshot({path:`${out}/phone-${id}.png`});}
  await page.setViewportSize({width:1440,height:900});await page.locator('#gallery').scrollIntoViewIfNeeded();await page.screenshot({path:`${out}/gallery.png`});
});
await test('Reduced motion: no video fetch or entrance, matching poster after switch',async()=>{
  const c=await newContext({reducedMotion:'reduce'}),p=await c.newPage();let clips=0;p.on('request',r=>{if(r.url().endsWith('.mp4'))clips++});await ready(p);await choose(p,'medusa');await delay(2800);assert.equal(clips,0);assert.equal(await p.locator('.scene.is-active video').evaluate(v=>getComputedStyle(v).display),'none');assert.match(await p.locator('.scene.is-active').getAttribute('style'),/medusa.webp/);assert.ok(!(await p.locator('html').getAttribute('class')));await c.close();
});
await test('Save-data: no automatic clips, explicit motion works',async()=>{
  const c=await newContext(),p=await c.newPage();await p.addInitScript(()=>Object.defineProperty(navigator,'connection',{value:{saveData:true,effectiveType:'2g'}}));let clips=0;p.on('request',r=>{if(r.url().endsWith('.mp4'))clips++});await ready(p);await delay(2800);assert.equal(clips,0);await p.locator('.motion-control').click();await p.waitForFunction(()=>!document.querySelector('.scene.is-active video').paused&&document.querySelector('.scene.is-active video').currentTime>0);assert.ok(clips>0);await c.close();
});
await test('Video failure retains poster; retry recovers',async()=>{
  const c=await newContext(),p=await c.newPage();await p.route('**/*.mp4',r=>r.abort());await ready(p);await p.waitForFunction(()=>document.querySelector('.motion-control').textContent==='Retry motion');assert.match(await p.locator('.scene.is-active').getAttribute('style'),/manta.webp/);await p.unroute('**/*.mp4');await p.locator('.motion-control').click();await p.waitForFunction(()=>document.querySelector('.scene.is-active video').currentTime>0&&!document.querySelector('.scene.is-active video').paused);await c.close();
});
await test('Rejected autoplay offers retry without losing scene',async()=>{
  const c=await newContext(),p=await c.newPage();await p.route('http://127.0.0.1:4173/',async route=>{const response=await route.fetch();await route.fulfill({response,body:(await response.text()).replace('<video autoplay','<video')});});await p.addInitScript(()=>{const native=HTMLMediaElement.prototype.play;window.blockAutoplay=true;HTMLMediaElement.prototype.play=function(){return window.blockAutoplay?Promise.reject(new DOMException('Test autoplay rejection','NotAllowedError')):native.call(this)}});await ready(p);await p.waitForFunction(()=>document.querySelector('.motion-control').textContent==='Retry motion');await p.evaluate(()=>{window.blockAutoplay=false});await p.locator('.motion-control').click();await p.waitForFunction(()=>document.querySelector('.scene.is-active video').currentTime>0);await c.close();
});
await test('Poster failure preserves old selection; subsequent retry recovers',async()=>{
  const c=await newContext(),p=await c.newPage();await p.route('**/assets/video/orca.webp',r=>r.abort());await ready(p);await p.getByRole('button',{name:'Show ORCA',exact:true}).click();await p.waitForFunction(()=>document.querySelector('.media-status').textContent.includes('could not load'));assert.equal(await p.locator('.stage').getAttribute('data-featured'),'manta');await p.unroute('**/assets/video/orca.webp');await choose(p,'orca');await c.close();
});
await test('Delayed poster race: last selection wins',async()=>{
  const c=await newContext(),p=await c.newPage();let release;const gate=new Promise(r=>release=r);await p.route('**/assets/video/orca.webp',async r=>{await gate;await r.continue()});await ready(p);await p.getByRole('button',{name:'Show ORCA',exact:true}).click();await p.getByRole('button',{name:'Show MEDUSA',exact:true}).click();await p.waitForFunction(()=>document.querySelector('.stage').dataset.featured==='medusa');release();await delay(1200);assert.equal(await p.locator('.stage').getAttribute('data-featured'),'medusa');assert.equal(await p.locator('h1').innerText(),'MEDUSA');await c.close();
});
await test('No uncaught page errors in normal journeys',async()=>assert.deepEqual(errors,[]));
await browser.close();writeFileSync(`${out}/results.json`,JSON.stringify({date:new Date().toISOString(),results},null,2));if(results.some(r=>r.status==='failed'))process.exitCode=1;


