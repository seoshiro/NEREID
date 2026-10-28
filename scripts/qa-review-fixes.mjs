import {mkdirSync,writeFileSync} from 'node:fs';
import {pathToFileURL} from 'node:url';
import assert from 'node:assert/strict';
const {chromium}=await import(pathToFileURL(process.argv[2]).href);
const browser=await chromium.launch({headless:true,channel:'chrome'});
const page=await browser.newPage({viewport:{width:390,height:844}});
page.setDefaultTimeout(12000);
const errors=[];page.on('pageerror',error=>errors.push(error.message));
const results=[];mkdirSync('qa/review-fixes',{recursive:true});
async function test(name,fn){if(process.argv[3]&&!new RegExp(process.argv[3]).test(name))return;try{results.push({name,status:'passed',detail:await fn()});console.log('PASS '+name)}catch(error){results.push({name,status:'failed',error:error.stack});console.error('FAIL '+name+': '+error.stack)}}
async function focus(selector){await page.locator(selector).focus()}
async function focused(selector){assert.ok(await page.locator(selector).evaluate(element=>element===document.activeElement),'Expected focus on '+selector+'; '+await page.evaluate(()=>JSON.stringify({active:document.activeElement.tagName+'.'+document.activeElement.className,open:document.querySelector('.navrow').dataset.open,inert:document.querySelector('#site-nav').inert,visibility:getComputedStyle(document.querySelector('#site-nav')).visibility})))}
async function closed(){assert.equal(await page.locator('.burger').getAttribute('aria-expanded'),'false',await page.evaluate(()=>document.activeElement.outerHTML));assert.ok(await page.locator('#site-nav').evaluate(nav=>nav.inert))}
await page.goto('http://127.0.0.1:4173/',{waitUntil:'domcontentloaded'});
await page.waitForFunction(()=>document.querySelector('.scene.is-active').classList.contains('has-poster')&&!document.documentElement.classList.contains('anim'));
await test('390x844 disclosure: Enter/Space, all five links, reverse Tab, Escape, close and destination focus',async()=>{
  const order=[];
  for(const key of ['Enter','Space']){
    await focus('.burger');await page.keyboard.press(key);
    assert.equal(await page.locator('.burger').getAttribute('aria-expanded'),'true');
    for(let i=1;i<=5;i++){await page.keyboard.press('Tab');await focused(`#site-nav a:nth-child(${i})`);order.push(await page.locator(`#site-nav a:nth-child(${i})`).textContent())}
    for(let i=4;i>=1;i--){await page.keyboard.press('Shift+Tab');await focused(`#site-nav a:nth-child(${i})`)}
    await page.keyboard.press('Shift+Tab');await focused('.burger');
    await page.keyboard.press(key);await closed();await focused('.burger');
  }
  await page.keyboard.press('Enter');await page.keyboard.press('Tab');await page.keyboard.press('Escape');await closed();await focused('.burger');
  await page.keyboard.press('Enter');for(let i=0;i<6;i++)await page.keyboard.press('Tab');await closed();await focused('.animal-l');
  await focus('.burger');await page.keyboard.press('Enter');await page.keyboard.press('Shift+Tab');await closed();await focused('.navrow .logo');
  await focus('.burger');await page.keyboard.press('Enter');await page.keyboard.press('Tab');await page.keyboard.press('Enter');await closed();await focused('#species');
  await focus('.burger');await page.keyboard.press('Enter');for(let i=0;i<3;i++)await page.keyboard.press('Tab');await page.keyboard.press('Enter');await closed();await focused('#gallery');
  await page.evaluate(()=>scrollTo({top:0,behavior:'instant'}));await focus('.burger');await page.keyboard.press('Enter');await page.locator('.motion-control').click();await closed();await focused('.motion-control');await page.locator('.motion-control').click();
  await focus('.burger');await page.keyboard.press('Enter');await page.keyboard.press('Tab');await page.waitForTimeout(350);await page.screenshot({path:'qa/review-fixes/menu-keyboard.png'});await page.keyboard.press('Escape');
  return {activationKeys:['Enter','Space'],forwardOrder:order,escapeFocus:'burger',navigationFocus:['species','gallery'],tabExit:'animal-l',outsideClickFocus:'motion-control'};
});
await test('Navigation breakpoint changes preserve a visible, usable focus target',async()=>{
  await focus('.burger');await page.keyboard.press('Enter');await page.keyboard.press('Tab');await page.keyboard.press('Tab');await focused('#site-nav a:nth-child(2)');
  await page.setViewportSize({width:1440,height:900});await page.waitForFunction(()=>!document.querySelector('#site-nav').inert);await focused('#site-nav a:nth-child(2)');
  assert.equal(await page.locator('.burger').getAttribute('aria-expanded'),'false');
  await page.setViewportSize({width:390,height:844});await page.waitForFunction(()=>document.querySelector('#site-nav').inert);await closed();await focused('.burger');
  await page.setViewportSize({width:1440,height:900});await page.waitForFunction(()=>!document.querySelector('#site-nav').inert);await focused('#site-nav a:first-child');
  await page.setViewportSize({width:1440,height:600});await page.waitForFunction(()=>document.querySelector('#site-nav').inert);await focused('.burger');
  await page.keyboard.press('Space');await page.keyboard.press('Tab');await focused('#site-nav a:first-child');await page.keyboard.press('Escape');await closed();await focused('.burger');
  return {widthBreakpoint:true,heightBreakpoint:true,hiddenFocusedElements:0};
});
await test('Tablet Medusa: poster, complete clip samples, protected description and real loop',async()=>{
  const rows=[];
  for(const [width,height]of [[1024,768],[768,1024]]){
    await page.setViewportSize({width,height});await page.evaluate(()=>scrollTo({top:0,behavior:'instant'}));
    if(await page.locator('.stage').getAttribute('data-featured')!=='medusa')await page.locator('.animal[data-species="medusa"]').click();
    await page.waitForFunction(()=>{const v=document.querySelector('[data-scene="medusa"] video');return v.readyState>=2&&v.classList.contains('is-playing')});
    await page.locator('#species').focus();await page.evaluate(()=>scrollTo({top:0,behavior:'instant'}));
    const protection=await page.evaluate(()=>{
      const scene=document.querySelector('[data-scene="medusa"]'),lede=document.querySelector('.lede');
      const sr=scene.getBoundingClientRect(),lr=lede.getBoundingClientRect();
      const gradient=getComputedStyle(scene,'::after').backgroundImage;
      const stops=[...gradient.matchAll(/rgba?\(([^)]+)\)(?: ([\d.]+)px)?/g)].map(m=>({rgba:m[1].split(',').map(Number),y:Number(m[2]||0)}));
      const localY=lr.bottom-sr.top;const left=stops.findLast(s=>s.y<=localY)||stops[0],right=stops.find(s=>s.y>localY)||stops.at(-1);
      const t=left===right?0:(localY-left.y)/(right.y-left.y);
      const alpha=(left.rgba[3]??1)*(1-t)+(right.rgba[3]??1)*t;
      // Conservative bound: an all-white moving frame behind the measured scrim.
      const bg=[4,16,31].map(c=>(c*alpha+255*(1-alpha))/255);
      const fg=bg.map(c=>.95+.05*c);
      const luminance=rgb=>rgb.reduce((sum,c,i)=>sum+[.2126,.7152,.0722][i]*(c<=.04045?c/12.92:((c+.055)/1.055)**2.4),0);
      return {gradient,sceneTop:sr.top,descriptionTop:lr.top,descriptionBottom:lr.bottom,minScrimAlpha:alpha,conservativeContrast:(luminance(fg)+.05)/(luminance(bg)+.05),scrollY,overflow:document.documentElement.scrollWidth>innerWidth};
    });
    assert.equal(protection.scrollY,0);assert.equal(protection.overflow,false);assert.ok(protection.conservativeContrast>=4.5,JSON.stringify(protection));
    const shots=[];
    await page.locator('[data-scene="medusa"] video').evaluate(v=>{v.pause();v.classList.remove('is-playing')});
    await page.waitForTimeout(250);shots.push({label:'POSTER',data:(await page.screenshot({path:`qa/review-fixes/medusa-${width}-poster.png`})).toString('base64')});
    for(const time of [.05,1,2,3.3,4,5,6,7.95]){
      await page.locator('[data-scene="medusa"] video').evaluate(async(v,time)=>{v.pause();await new Promise(resolve=>{v.addEventListener('seeked',resolve,{once:true});v.currentTime=time});v.classList.add('is-playing')},time);
      await page.waitForTimeout(250);
      shots.push({label:time.toFixed(2)+' s',data:(await page.screenshot(time===3.3?{path:`qa/review-fixes/medusa-${width}-3.30s.png`}:{})).toString('base64')});
    }
    const sheet=await page.evaluate(async shots=>{
      const w=384,h=Math.round(innerHeight/innerWidth*w),canvas=document.createElement('canvas');canvas.width=w*3;canvas.height=(h+28)*3;const ctx=canvas.getContext('2d');ctx.fillStyle='#04101f';ctx.fillRect(0,0,canvas.width,canvas.height);
      for(let i=0;i<shots.length;i++){const img=new Image();img.src='data:image/png;base64,'+shots[i].data;await img.decode();const x=i%3*w,y=Math.floor(i/3)*(h+28);ctx.drawImage(img,x,y+28,w,h);ctx.fillStyle='white';ctx.font='14px sans-serif';ctx.fillText(shots[i].label,x+12,y+20)}return canvas.toDataURL('image/png').split(',')[1];
    },shots);
    writeFileSync(`qa/review-fixes/medusa-${width}-cycle.png`,Buffer.from(sheet,'base64'));
    const loop=await page.locator('[data-scene="medusa"] video').evaluate(async v=>{
      v.currentTime=0;await v.play();return await new Promise((resolve,reject)=>{let prev=v.currentTime,max=0;const timeout=setTimeout(()=>{v.removeEventListener('timeupdate',check);reject(Error('Loop not observed'))},11000);function check(){max=Math.max(max,v.currentTime);if(prev>7&&v.currentTime<1){clearTimeout(timeout);v.removeEventListener('timeupdate',check);resolve({maxTime:max,wrapTo:v.currentTime})}prev=v.currentTime}v.addEventListener('timeupdate',check)});
    });
    rows.push({width,height,...protection,posterAndFrameSamples:shots.map(s=>s.label),loop});
  }return rows;
});
await test('No uncaught browser errors during the review regressions',async()=>{assert.deepEqual(errors,[]);return errors});
await browser.close();writeFileSync('qa/review-fixes/results.json',JSON.stringify({recordedAt:new Date().toISOString(),browser:'Installed Chrome, simulated CSS viewports',results},null,2));
if(results.some(r=>r.status==='failed'))process.exitCode=1;
