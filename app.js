const ORDER = ['manta', 'orca', 'medusa'];
const SPECIES = {
  manta: { name:'MANTA', title:'Manta', latin:'Mobula birostris', headline:'Giant\nmanta rays', lede:'Giant manta rays glide through the ocean,\nfiltering plankton from the water.', cta:'About manta rays', story:'Giant manta rays use broad, wing-like fins to move through tropical and subtropical seas. They filter plankton from the water.', facts:[['Family','Mobulidae'],['Diet','Plankton'],['Range','Tropical to temperate seas']], source:'https://www.fisheries.noaa.gov/species/giant-manta-ray', sourceLabel:'Manta ray facts from NOAA', alt:'A giant manta ray gliding through dark blue ocean water.' },
  orca: { name:'ORCA', title:'Orca', latin:'Orcinus orca', headline:'Life in\nfamily groups', lede:'Orcas use calls to communicate and echolocation to find prey.\nHunting traditions pass between generations.', cta:'About orcas', story:'Orcas are highly social dolphins. They use calls to communicate and echolocation to find prey. Family groups pass hunting behaviours between generations.', facts:[['Family','Delphinidae'],['Diet','Varies by population'],['Range','Oceans worldwide']], source:'https://www.fisheries.noaa.gov/species/killer-whale', sourceLabel:'Orca facts from NOAA', alt:'A single orca swimming through deep, cold blue water.' },
  medusa: { name:'MEDUSA', title:'Medusa', latin:'A study of jellyfish', headline:'How jellyfish\nmove', lede:'Jellyfish swim by pulsing their bells\nand drift with the currents.', cta:'About jellyfish', story:'Jellyfish move by pulsing their bells and drifting with ocean currents. Some species produce their own light. Medusa is an artistic portrait of a jellyfish, not a depiction of an identified species.', facts:[['Form','Free-swimming medusa'],['Movement','Bell pulses and currents'],['Light','Bioluminescence in some species']], source:'https://oceanexplorer.noaa.gov/facts/bioluminescence.html', sourceLabel:'Bioluminescence explained by NOAA', alt:'A translucent jellyfish with delicate trailing tentacles in the dark ocean.' }
};
const $ = selector => document.querySelector(selector);
const $$ = selector => [...document.querySelectorAll(selector)];
const stage = $('.stage'), scenes = new Map(ORDER.map(id => [id,$(`[data-scene="${id}"]`)]));
const status = $('.media-status'), motionButton = $('.motion-control');
const reduce = matchMedia('(prefers-reduced-motion: reduce)');
const connection = navigator.connection;
const limitedConnection = () => connection?.saveData || /(^|-)2g$/.test(connection?.effectiveType || '');
let media = Object.fromEntries(ORDER.map(id => [id,{}]));
let featured = 'manta', requestVersion = 0, pending = null, inView = true, userPaused = false, manifestReady = false;
let activeGallery = null, lastGalleryButton = null, restorePortraitFocus = true;
const posterPromises = new Map(), posterImages = new Map(), videoErrors = new Set();
try { userPaused = localStorage.getItem('nereid-motion-paused') === 'true'; } catch {}

function setTextWithBreaks(element,text) {
  element.replaceChildren(...text.split('\n').flatMap((part,i) => i ? [document.createElement('br'),document.createTextNode(' '+part)] : [document.createTextNode(part)]));
}
function posterReady(id) {
  if (!media[id].poster) return Promise.resolve(true); // Explicit development state, never represented as a finished image.
  if (!posterPromises.has(id)) {
    const image = new Image(); image.decoding='async';
    posterPromises.set(id,new Promise(resolve => {
      let settled=false;
      const timeout=setTimeout(()=>{if(!settled){settled=true;posterPromises.delete(id);resolve(false);}},12000);
      image.onload = async () => { try { await image.decode(); } catch {} if(settled)return;settled=true;clearTimeout(timeout);posterImages.set(id,image);resolve(true); };
      image.onerror = () => {if(settled)return;settled=true;clearTimeout(timeout);posterPromises.delete(id);resolve(false);};
      image.src = media[id].poster;
    }));
  }
  return posterPromises.get(id);
}
function updateMediaStatus() {
  const current = media[featured], video = scenes.get(featured).querySelector('video');
  motionButton.hidden = !current.video || reduce.matches;
  if (pending) { status.textContent=`Loading ${SPECIES[pending].title.toLowerCase()}...`; return; }
  if (!current.poster) status.textContent='Image unavailable.';
  else if (!posterImages.has(featured)) status.textContent='Image unavailable. Choose another animal or try again.';
  else if (!current.video) status.textContent='Showing a still image.';
  else if (reduce.matches) status.textContent='Motion is off to match your settings.';
  else if (limitedConnection() && !video.getAttribute('src')) status.textContent='Showing a still image to save data.';
  else if (videoErrors.has(featured)) status.textContent='Video could not play. Try again.';
  else status.textContent='';
  motionButton.textContent=videoErrors.has(featured) ? 'Retry video' : userPaused || (limitedConnection()&&!video.getAttribute('src')) ? 'Play video' : 'Pause video';
  motionButton.setAttribute('aria-pressed',String(userPaused));
}
function warm(id,explicit=false) {
  posterReady(id);
  if (!media[id].video || reduce.matches || userPaused || (limitedConnection() && !explicit)) return;
  const video = scenes.get(id).querySelector('video');
  if (!video.getAttribute('src')) { video.preload='auto'; video.src=media[id].video; video.load(); }
}
function syncPlayback(explicit=false) {
  for (const id of ORDER) {
    const video = scenes.get(id).querySelector('video');
    if (id !== featured || reduce.matches || userPaused || document.hidden || !inView) { video.pause(); continue; }
    warm(id,explicit);
    if (!video.getAttribute('src')) continue;
    video.muted=true;
    video.play().catch(() => { if (id===featured && !userPaused && !document.hidden && inView) { videoErrors.add(id); updateMediaStatus(); } });
  }
  updateMediaStatus();
}
function render(id,announce=true) {
  featured=id; stage.dataset.featured=id;
  for (const key of ORDER) scenes.get(key).classList.toggle('is-active',key===id);
  $('.title .ent-line').textContent=SPECIES[id].name;
  setTextWithBreaks($('.lede'),SPECIES[id].lede);
  $('.cta > a').textContent=SPECIES[id].cta;
  const rest=ORDER.filter(key=>key!==id);
  $$('.animal').forEach((button,i) => {
    const other=rest[i]; button.dataset.species=other;
    button.setAttribute('aria-label',`Show ${SPECIES[other].name}`);
    button.querySelectorAll('img').forEach(image=>image.classList.toggle('is-shown',image.dataset.species===other && Boolean(media[other].cutout)));
    const placeholder=button.querySelector('.cutout-placeholder');
    placeholder.hidden=Boolean(media[other].cutout); placeholder.textContent=SPECIES[other].name;
    $(`.label-${i===0?'l':'r'}`).textContent=SPECIES[other].name;
  });
  $('#species-latin').textContent=SPECIES[id].latin;
  setTextWithBreaks($('#discover-title'),SPECIES[id].headline);
  $('#species-story').textContent=SPECIES[id].story;
  $('#species-facts').replaceChildren(...SPECIES[id].facts.map(([term,value])=>{
    const row=document.createElement('div'),dt=document.createElement('dt'),dd=document.createElement('dd');
    dt.textContent=term;dd.textContent=value;row.append(dt,dd);return row;
  }));
  $('#species-source').href=SPECIES[id].source;
  $('#species-source').textContent=SPECIES[id].sourceLabel;
  $$('[data-select]').forEach(button=>button.setAttribute('aria-pressed',String(button.dataset.select===id)));
  if (announce) $('#scene-announcement').textContent=`${SPECIES[id].name}. ${SPECIES[id].lede.replace('\n',' ')}`;
  syncPlayback();
}
async function show(id) {
  if (!ORDER.includes(id)) return false;
  const version=++requestVersion;
  if (id===featured && (!media[id].poster || posterImages.has(id))) {pending=null;stage.removeAttribute('aria-busy');updateMediaStatus();return true;}
  pending=id;stage.setAttribute('aria-busy','true');updateMediaStatus();
  await manifestPromise;
  const ready=await posterReady(id);
  if (version!==requestVersion) return false;
  pending=null;stage.removeAttribute('aria-busy');
  if (!ready) {status.textContent=`${SPECIES[id].title} could not load. Select it again to retry.`;return false;}
  render(id); return true;
}

for (const id of ORDER) {
  const video=scenes.get(id).querySelector('video');
  video.addEventListener('playing',()=>{
    if (featured!==id || reduce.matches || userPaused || document.hidden || !inView) {video.pause();return;}
    video.classList.add('is-playing');videoErrors.delete(id);updateMediaStatus();
  });
  video.addEventListener('error',()=>{video.classList.remove('is-playing');videoErrors.add(id);if(featured===id)updateMediaStatus();});
}
const manifestPromise=fetch('assets/manifest.json').then(response=>{
  if(!response.ok)throw Error('Manifest missing');return response.json();
}).then(async loaded=>{
  for (const id of ORDER) {
    media[id]=loaded[id]||{};
    const scene=scenes.get(id),video=scene.querySelector('video');
    scene.style.setProperty('--scene-position',media[id].position||'50% 50%');
    if (media[id].poster) {
      scene.style.backgroundImage=`url("${media[id].poster}")`;scene.classList.add('has-poster');video.poster=media[id].poster;
      const image=new Image();image.src=media[id].poster;image.alt=SPECIES[id].alt;image.loading='lazy';image.decoding='async';
      $(`[data-art="${id}"]`).replaceChildren(image);
    }
    if (media[id].cutout) $$('.animal img').filter(image=>image.dataset.species===id).forEach(image=>{image.src=media[id].cutout;image.hidden=false;image.decoding='async';});
  }
  manifestReady=true;
  await posterReady(featured);render(featured,false);
  // All posters are lightweight fallbacks. Only preload additional clips on a suitable connection.
  ORDER.forEach(posterReady);
  const preload=()=>{if(!limitedConnection()&&!reduce.matches&&!userPaused)ORDER.forEach(id=>warm(id));};
  if ('requestIdleCallback' in window) requestIdleCallback(preload,{timeout:4000});else setTimeout(preload,2500);
}).catch(()=>{manifestReady=true;render(featured,false);status.textContent='Some media could not load. Reload the page to try again.';});

$$('.animal').forEach(button=>{
  button.addEventListener('click',()=>show(button.dataset.species));
  for (const event of ['pointerenter','focus'])button.addEventListener(event,()=>{if(manifestReady)warm(button.dataset.species);});
});
$$('[data-select]').forEach(button=>button.addEventListener('click',()=>show(button.dataset.select)));
motionButton.addEventListener('click',()=>{
  if(videoErrors.has(featured)){const video=scenes.get(featured).querySelector('video');videoErrors.delete(featured);video.load();userPaused=false;}
  else if(limitedConnection()&&!scenes.get(featured).querySelector('video').getAttribute('src'))userPaused=false;
  else userPaused=!userPaused;
  try{localStorage.setItem('nereid-motion-paused',String(userPaused));}catch{}
  syncPlayback(true);
});
document.addEventListener('visibilitychange',()=>syncPlayback());
reduce.addEventListener('change',()=>{document.documentElement.classList.remove('anim','play');syncPlayback();});
new IntersectionObserver(entries=>{inView=entries[0].isIntersecting;syncPlayback();},{threshold:.05}).observe(stage);

const navrow=$('.navrow'),burger=$('.burger'),navigation=$('#site-nav');
const compactNavigation=matchMedia('(max-width:1030px), (max-height:620px)');
let lastNavigationFocus=null;
document.addEventListener('focusin',event=>{lastNavigationFocus=navrow.contains(event.target)?event.target:null;});
function setMenu(open,restoreFocus=false,fromBreakpoint=false){
  const compact=compactNavigation.matches;
  // A CSS breakpoint can blur a newly hidden control before the change event.
  const focusTarget=fromBreakpoint&&document.activeElement===document.body?lastNavigationFocus:document.activeElement;
  open=compact&&open;
  // Move focus before hiding links, including a desktop-to-mobile breakpoint change.
  if(!open&&compact&&(restoreFocus||navigation.contains(focusTarget)))burger.focus({preventScroll:true});
  navrow.dataset.open=String(open);
  burger.setAttribute('aria-expanded',String(open));
  burger.setAttribute('aria-label',open?'Close navigation':'Open navigation');
  navigation.inert=compact&&!open;
  if(!compact&&focusTarget===burger)navigation.querySelector('a').focus({preventScroll:true});
}
burger.addEventListener('click',()=>setMenu(navrow.dataset.open!=='true'));
document.addEventListener('click',event=>{if(!navrow.contains(event.target))setMenu(false);});
document.addEventListener('keydown',event=>{if(event.key==='Escape'&&navrow.dataset.open==='true'){event.preventDefault();setMenu(false,true);}});
navrow.addEventListener('focusout',event=>{if(navrow.dataset.open==='true'&&event.relatedTarget!==burger&&!navigation.contains(event.relatedTarget))setMenu(false);});
$$('.links a').forEach(link=>link.addEventListener('click',()=>setMenu(false)));
compactNavigation.addEventListener('change',()=>setMenu(false,false,true));
setMenu(false);
$$('a[href^="#"]').forEach(link=>link.addEventListener('click',event=>{
  const target=document.getElementById(link.hash.slice(1));if(!target)return;
  event.preventDefault();history.replaceState(null,'',link.hash);
  target.scrollIntoView({behavior:reduce.matches?'instant':'smooth',block:'start'});
  if(target.hasAttribute('tabindex'))target.focus({preventScroll:true});
}));
new IntersectionObserver(entries=>{
  for(const entry of entries)if(entry.isIntersecting)$$('.links a:not(.enroll)').forEach(link=>{if(link.hash===`#${entry.target.id}`)link.setAttribute('aria-current','page');else link.removeAttribute('aria-current');});
},{rootMargin:'-15% 0px -55% 0px'}).observe(stage);
const sectionObserver=new IntersectionObserver(entries=>{
  const visible=entries.filter(entry=>entry.isIntersecting).sort((a,b)=>b.intersectionRatio-a.intersectionRatio)[0];
  if(visible)$$('.links a:not(.enroll)').forEach(link=>{if(link.hash===`#${visible.target.id}`)link.setAttribute('aria-current','page');else link.removeAttribute('aria-current');});
},{rootMargin:'-10% 0px -45% 0px'});$$('.editorial').forEach(section=>sectionObserver.observe(section));

const dialog=$('#portrait-dialog');
$$('[data-gallery]').forEach(button=>button.addEventListener('click',()=>{
  activeGallery=button.dataset.gallery;lastGalleryButton=button;restorePortraitFocus=true;
  $('#portrait-title').textContent=SPECIES[activeGallery].title;
  $('.portrait-description').textContent=SPECIES[activeGallery].story;
  const art=$('.portrait-art');art.replaceChildren();
  if(media[activeGallery].poster){const image=new Image();image.src=media[activeGallery].poster;image.alt=SPECIES[activeGallery].alt;art.append(image);}else art.textContent='Image unavailable.';
  dialog.showModal();document.body.style.overflow='hidden';
}));
$('.dialog-close').addEventListener('click',()=>dialog.close());
dialog.addEventListener('click',event=>{if(event.target===dialog){const rect=dialog.getBoundingClientRect();if(event.clientX<rect.left||event.clientX>rect.right||event.clientY<rect.top||event.clientY>rect.bottom)dialog.close();}});
dialog.addEventListener('close',()=>{document.body.style.overflow='';if(restorePortraitFocus)lastGalleryButton?.focus({preventScroll:true});});
$('.portrait-explore').addEventListener('click',async()=>{const ok=await show(activeGallery);if(ok){restorePortraitFocus=false;dialog.close();document.body.style.overflow='';history.replaceState(null,'','#discover');$('#discover').scrollIntoView({behavior:reduce.matches?'instant':'smooth'});$('#discover').focus({preventScroll:true});}});

if(document.documentElement.classList.contains('anim')){
  Promise.race([document.fonts.ready,new Promise(resolve=>setTimeout(resolve,500))]).then(()=>requestAnimationFrame(()=>requestAnimationFrame(()=>{
    document.documentElement.classList.add('play');setTimeout(()=>document.documentElement.classList.remove('anim','play'),2150);
  })));
}
