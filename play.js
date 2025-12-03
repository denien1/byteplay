const params = new URL(location.href).searchParams;
const id = params.get('id') || '';
let meta = null;

// wait for a CSS transition on an element
function waitTransition(el){
  return new Promise(res=>{
    const done=()=>{ el.removeEventListener('transitionend',done); res(); };
    el.addEventListener('transitionend',done,{once:true});
  });
}

function showLoading(){
  const wrap = document.getElementById('loader');
  const bar  = wrap.querySelector('.liquid-fill');
  wrap.style.display = 'flex';
  // force reflow so width transition starts
  // eslint-disable-next-line no-unused-expressions
  bar.offsetWidth;
  bar.classList.add('fill-animate');
}
function hideLoading(){
  const wrap = document.getElementById('loader');
  const bar  = wrap.querySelector('.liquid-fill');
  bar.classList.remove('fill-animate');
  wrap.style.display = 'none';
}

function loadLoader(){
  return new Promise((resolve,reject)=>{
    const s = document.createElement('script');
    s.src = 'data/loader.js';
    s.onload = resolve;
    s.onerror = ()=>reject(new Error('Could not load data/loader.js — ensure /data exists.'));
    document.body.appendChild(s);
  });
}

async function startGame(){
  showLoading();
  const bar = document.querySelector('.liquid-fill');
  const loaderPromise = loadLoader();   // start loading emulator in parallel
  await waitTransition(bar);            // wait for bar to reach 100%
  try { await loaderPromise; } catch(e){ fail(e.message); }
  hideLoading();
}

async function boot(){
  try{
    const r = await fetch('games.json', { cache: 'no-store' });
    const data = await r.json();
    const games = (data.games || []).filter(g => ['gba','snes','atari2600'].includes(g.system));
    meta = games.find(g => g.id === id);
  }catch(e){
    console.error(e);
    fail('Failed to load games.json');
    wireToolbar();
    return;
  }

  // BYOR
  if(!meta && id === 'byor'){
    renderSidebar({title:'Bring Your Own ROM', cover:'assets/byor-cover.svg', system:'custom', year:'—', genre:'—', region:'—'});
    document.getElementById('title').textContent = 'Bring Your Own ROM';
    document.getElementById('details').innerHTML =
      `<h2 class="title-font">Upload ROM</h2>
       <p class="dim">Choose a ROM file (.gba, .gbc, .gb, .sfc/.smc, .nes, .a26). Everything runs locally in your browser.</p>`;
    const input = document.createElement('input');
    input.type='file';
    input.accept='.gba,.gbc,.gb,.sfc,.smc,.nes,.a26';
    input.className='btn';
    input.style.margin='12px 0';
    document.querySelector('.toolbar').prepend(input);
    input.onchange = async () => {
      const f = input.files?.[0]; if(!f) return;
      const core = guessCore(f.name);
      setupAspectByCore(core);
      window.EJS_player   = '#game';
      window.EJS_core     = core;
      window.EJS_gameUrl  = URL.createObjectURL(f);
      window.EJS_pathtodata = 'data/';
      window.EJS_threads  = false;
      await startGame(); // bar fills, emulator loads, then starts
    };
    wireToolbar();
    return;
  }

  if(!meta){
    fail('Game not found.');
    wireToolbar();
    return;
  }

  // UI
  document.getElementById('title').textContent = meta.title || '';
  renderSidebar(meta);
  renderDetails(meta);
  const coreFinal = normalizeCore(meta.core) || guessCore(meta.rom || '');
  setupAspectByCore(coreFinal);

  // EJS variables (GitHub Pages safe)
  window.EJS_player     = '#game';
  window.EJS_core       = coreFinal;
  window.EJS_gameUrl    = meta.rom;
  window.EJS_pathtodata = 'data/';
  window.EJS_threads    = false;

  // One click: hide button, fill bar, then start
  const startBtn = document.getElementById('startBtn');
  startBtn.onclick = async () => {
    startBtn.style.display = 'none';
    await startGame();
  };

  wireToolbar();
}

function fail(msg){
  document.getElementById('details').innerHTML = `<div class="err">${msg}</div>`;
  hideLoading();
  const startBtn = document.getElementById('startBtn');
  if(startBtn) startBtn.style.display = 'none';
}

function guessCore(n){
  n = (n||'').toLowerCase();
  if(n.endsWith('.gba')) return 'gba';
  if(n.endsWith('.gbc')) return 'gbc';
  if(n.endsWith('.gb'))  return 'gb';
  if(n.endsWith('.sfc') || n.endsWith('.smc')) return 'snes';
  if(n.endsWith('.nes')) return 'nes';
  if(n.endsWith('.a26')) return 'atari2600';
  return 'gba';
}
function normalizeCore(c){
  const k = (c||'').toLowerCase();
  return ['gba','snes','atari2600','gb','gbc','nes'].includes(k) ? k : '';
}
function setupAspectByCore(core){
  const wrap = document.getElementById('emuWrap');
  wrap.classList.remove('ar-3x2','ar-4x3');
  (core === 'gba' ? wrap.classList.add('ar-3x2') : wrap.classList.add('ar-4x3'));
}
function renderSidebar(g){
  document.getElementById('sidebar').innerHTML = `
    <div class="side-card">
      <img class="side-cover" src="${g.cover}" alt="${g.title||'Game Cover'}">
      <h3 class="side-title title-font">${g.title||'Untitled'}</h3>
      <div class="side-meta">${(g.system||'').toUpperCase()} • ${g.year||''}</div>
      <div class="side-meta">${g.genre||''} ${g.region?('• '+g.region):''}</div>
      <a class="btn wfull" href="./">Home</a>
    </div>`;
}
function renderDetails(g){
  const url = location.href;
  document.getElementById('details').innerHTML = `
    <h2 class="title-font">${g.title}</h2>
    <p class="dim">${(g.system||'').toUpperCase()} • ${g.year||''} ${g.genre?('• '+g.genre):''} ${g.region?('• '+g.region):''}</p>
    ${g.description ? `<p>${g.description}</p>` : `<p>No description available.</p>`}
    <div class="share-row">
      <button class="share-btn" data-kind="x">X</button>
      <button class="share-btn" data-kind="fb">FB</button>
      <button class="share-btn" data-kind="tt">TikTok</button>
      <button class="share-btn" data-kind="copy">Copy</button>
      <button class="share-btn" data-kind="more">Share</button>
    </div>
  `;
  document.querySelectorAll('.share-btn').forEach(b=>{
    b.onclick=()=>{
      const k=b.dataset.kind;
      if(k==='copy'){ navigator.clipboard?.writeText(url); b.textContent='Copied!'; setTimeout(()=>b.textContent='Copy',1000); return; }
      if(k==='x')  window.open(`https://twitter.com/intent/tweet?text=${encodeURIComponent('Playing '+g.title+' on BytePlay')}&url=${encodeURIComponent(url)}`,'_blank');
      if(k==='fb') window.open(`https://www.facebook.com/sharer/sharer.php?u=${encodeURIComponent(url)}`,'_blank');
      if(k==='tt') window.open(`https://www.tiktok.com/share?url=${encodeURIComponent(url)}`,'_blank');
      if(k==='more') navigator.share?.({title:g.title,text:'Play on BytePlay',url}).catch(()=>{});
    };
  });
}
function wireToolbar(){
  document.getElementById('fullscreen').onclick = () => {
    const el = document.querySelector('#game').parentElement;
    (el.requestFullscreen || el.webkitRequestFullscreen || el.msRequestFullscreen || (()=>{})).call(el);
  };
  document.getElementById('restart').onclick = () => location.reload();
}

boot();
