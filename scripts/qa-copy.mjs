import {mkdirSync, readFileSync, writeFileSync} from 'node:fs';
import {pathToFileURL} from 'node:url';
import assert from 'node:assert/strict';
const {chromium}=await import(pathToFileURL(process.argv[2]).href);
const browser=await chromium.launch({headless:true,channel:'chrome'});
const context=await browser.newContext({reducedMotion:'reduce',viewport:{width:1440,height:900}});
const page=await context.newPage();
const errors=[];page.on('pageerror',error=>errors.push(error.message));
const out='qa/copy';mkdirSync(out,{recursive:true});
const results=[];
async function test(name,fn){try{results.push({name,status:'passed',detail:await fn()});console.log('PASS '+name)}catch(error){results.push({name,status:'failed',error:error.stack});console.error('FAIL '+name+': '+error.message)}}
const normalize=text=>text.replace(/\s+/g,' ').trim();
await page.goto('http://127.0.0.1:4173/',{waitUntil:'networkidle'});
await page.evaluate(()=>document.fonts.ready);
await page.waitForFunction(()=>document.querySelector('.scene.is-active').classList.contains('has-poster'));
const copy=await page.evaluate(()=>({species:SPECIES,description:document.querySelector('meta[name="description"]').content,nav:[...document.querySelectorAll('.links a')].map(a=>a.textContent),sections:[...document.querySelectorAll('.section-heading')].map(el=>el.textContent.trim()),gallery:{title:document.querySelector('#gallery-title').textContent,intro:document.querySelector('.section-intro p').textContent,captions:[...document.querySelectorAll('.gallery-caption')].map(el=>el.textContent),buttons:[...document.querySelectorAll('[data-gallery]')].map(el=>el.getAttribute('aria-label'))},journal:{title:document.querySelector('#journal-title').innerText,notes:[...document.querySelectorAll('details')].map(el=>({title:el.querySelector('summary span').textContent,body:el.querySelector('.note-body p').textContent,source:el.querySelector('.note-body a').textContent,href:el.querySelector('.note-body a').href}))},footer:document.querySelector('footer').innerText,dialog:{label:document.querySelector('.portrait-info .kicker').textContent,cta:document.querySelector('.portrait-explore').textContent}}));
writeFileSync(`${out}/copy.json`,JSON.stringify(copy,null,2));
await test('Rewritten text fits at five widths; contextual links reach the selected profile',async()=>{
  const rows=[];
  for(const [width,height]of [[320,568],[390,844],[768,1024],[1024,768],[1440,900]]){
    await page.setViewportSize({width,height});
    for(const id of ['manta','orca','medusa']){
      await page.locator(`[data-select="${id}"]`).click();
      await page.waitForFunction(id=>document.querySelector('.stage').dataset.featured===id,id);
      await page.evaluate(()=>{document.querySelectorAll('details').forEach(el=>el.open=true);scrollTo({top:0,behavior:'instant'})});
      const geometry=await page.evaluate(()=>{
        const selectors=['.lede','.cta>a','#species-latin','#discover-title','#species-story','#species-facts','#species-source','.species-tabs','.section-heading','.section-intro','.gallery-caption','#journal-title','summary','.note-body','footer'];
        const textBounds=[];
        for(const selector of selectors)for(const element of document.querySelectorAll(selector)){
          const walker=document.createTreeWalker(element,NodeFilter.SHOW_TEXT);let node;
          while(node=walker.nextNode()){if(!node.textContent.trim())continue;const range=document.createRange();range.selectNodeContents(node);for(const rect of range.getClientRects())if(rect.width&&rect.height)textBounds.push({selector,text:node.textContent.trim(),left:rect.left,right:rect.right})}
        }
        const lede=document.querySelector('.lede').getBoundingClientRect(),cta=document.querySelector('.cta>a').getBoundingClientRect();
        return {overflow:document.documentElement.scrollWidth>innerWidth,outside:textBounds.filter(rect=>rect.left<-.5||rect.right>innerWidth+.5),ledeBottom:lede.bottom,ctaTop:cta.top,ctaText:document.querySelector('.cta>a').textContent,source:document.querySelector('#species-source').href};
      });
      assert.equal(geometry.overflow,false);assert.deepEqual(geometry.outside,[]);assert.ok(geometry.ledeBottom<geometry.ctaTop,JSON.stringify(geometry));
      assert.equal(geometry.ctaText,copy.species[id].cta);assert.equal(geometry.source,copy.species[id].source);
      await page.locator('.cta>a').click();assert.equal(await page.evaluate(()=>document.activeElement.id),'discover');
      assert.equal(normalize(await page.locator('#discover-title').innerText()),normalize(copy.species[id].headline));
      rows.push({width,height,species:id,...geometry});
      if(width===390||width===1440)await page.locator('#discover').screenshot({path:`${out}/profile-${id}-${width}.png`});
    }
    if(width===390||width===1440){for(const section of ['gallery','journal']){
      const target=page.locator(`#${section}`),bounds=await target.boundingBox();
      // Keep the whole section inside the capture viewport. Oversized element
      // screenshots can paint an off-screen fixed skip link into the clip.
      await page.setViewportSize({width,height:Math.max(height,Math.ceil(bounds.height)+40)});
      await page.evaluate(id=>{document.activeElement.blur();document.getElementById(id).scrollIntoView({block:'start',behavior:'instant'})},section);
      await target.screenshot({path:`${out}/${section}-${width}.png`});
      await page.setViewportSize({width,height});
    }}
  }
  return rows;
});
await test('Gallery names include visible labels; keyboard entry and profile navigation work',async()=>{
  const rows=[];await page.setViewportSize({width:390,height:844});
  for(const id of ['manta','orca','medusa']){
    const button=page.locator(`[data-gallery="${id}"]`),name=await button.getAttribute('aria-label');
    const label=await button.locator('.gallery-caption>span').first().textContent();assert.ok(name.toLowerCase().includes(label.toLowerCase()));
    assert.equal(await page.getByRole('button',{name,exact:true}).count(),1);
    await button.focus();await page.keyboard.press('Enter');await page.waitForFunction(()=>document.querySelector('dialog').open);
    assert.equal(await page.locator('#portrait-title').textContent(),copy.species[id].title);
    await page.getByRole('button',{name:'Read the profile',exact:true}).click();await page.waitForFunction(()=>!document.querySelector('dialog').open);
    assert.equal(await page.evaluate(()=>document.activeElement.id),'discover');assert.equal(await page.locator('.stage').getAttribute('data-featured'),id);
    rows.push({id,label,accessibleName:name,destination:'discover'});
  }
  return rows;
});
await test('Static Manta fallback matches the hydrated copy, navigation targets are preserved',async()=>{
  const c=await browser.newContext({javaScriptEnabled:false}),p=await c.newPage();await p.goto('http://127.0.0.1:4173/');
  const fallback={lede:normalize(await p.locator('.lede').innerText()),title:normalize(await p.locator('#discover-title').innerText()),story:await p.locator('#species-story').textContent(),cta:await p.locator('.cta>a').textContent()};
  assert.equal(fallback.lede,normalize(copy.species.manta.lede));assert.equal(fallback.title,normalize(copy.species.manta.headline));assert.equal(fallback.story,copy.species.manta.story);assert.equal(fallback.cta,copy.species.manta.cta);
  const links=html=>[...html.matchAll(/<a\b[^>]*href="([^"]+)"/g)].map(match=>match[1]);
  assert.deepEqual(links(readFileSync('index.html','utf8')),links(readFileSync('editorial/baseline/index.html','utf8')));
  await c.close();return {fallback,allAnchorDestinationsUnchanged:true};
});
await test('No numbered editorial labels or uncaught errors remain',async()=>{
  const labels=await page.locator('.section-heading,.species-tabs,.gallery-caption,summary,.portrait-info .kicker').allTextContents();
  assert.equal(labels.some(label=>/\b0[123]\b/.test(label)),false);assert.deepEqual(errors,[]);return {labels,errors};
});
await browser.close();
writeFileSync(`${out}/results.json`,JSON.stringify({recordedAt:new Date().toISOString(),browser:'Installed Chrome; simulated CSS viewports; reduced motion for copy captures',results},null,2));
if(results.some(result=>result.status==='failed'))process.exitCode=1;
