const PAGE=12;
let all=[],filtered=[],page=1;

async function load(){
  try{
    const r=await fetch('games.json',{cache:'no-store'});
    const data=await r.json();
    // hard filter: ONLY gba/snes/atari2600
    all=(data.games||[]).filter(g=>['gba','snes','atari2600'].includes(g.system));
    filtered=[...all];
    render(); wire();
  }catch(e){
    console.error(e);
    document.getElementById('grid').innerHTML='<div class="err">Failed to load games.json</div>';
  }
}
function apply(){
  const q=(document.getElementById('q').value||'').toLowerCase().trim();
  const sys=document.getElementById('system').value;
  const yr=document.getElementById('year').value;
  filtered=all.filter(g=>{
    const t=(g.title+' '+(g.genre||'')+' '+(g.system||'')).toLowerCase();
    if(q && !t.includes(q)) return false;
    if(sys && g.system!==sys) return false;
    if(yr && String(g.year)!==yr) return false;
    return true;
  });
  page=1; render();
}
function render(){
  const grid=document.getElementById('grid');
  const count=document.getElementById('count');
  const total=filtered.length;
  const start=(page-1)*PAGE;
  const slice=filtered.slice(start,start+PAGE);

  count.textContent=`${total} game${total!==1?'s':''} found`;

  // direct-to-play like gbapokemon
  grid.innerHTML=slice.map(g=>`
    <a class="card" href="play.html?id=${g.id}" title="Play ${g.title}">
      <img class="cover" src="${g.cover}" alt="${g.title}">
      <div class="content">
        <div class="title title-font">${g.title}</div>
        <div class="meta">${(g.system||'').toUpperCase()} • ${g.year||''} ${g.genre?('• '+g.genre):''}</div>
      </div>
    </a>
  `).join('');

  const pageLabel=document.getElementById('pageLabel');
  pageLabel.textContent=total===0?'0/0':`${Math.min(start+1,total)}-${Math.min(start+slice.length,total)} of ${total}`;

  document.getElementById('prev').disabled=page<=1;
  document.getElementById('next').disabled=(start+PAGE)>=total;
}
function wire(){
  document.getElementById('q').oninput=apply;
  document.getElementById('system').onchange=apply;
  document.getElementById('year').onchange=apply;
  document.getElementById('reset').onclick=()=>{
    document.getElementById('q').value='';
    document.getElementById('system').value='';
    document.getElementById('year').value='';
    filtered=[...all]; page=1; render();
  };
  document.getElementById('prev').onclick=()=>{ if(page>1){ page--; render(); } };
  document.getElementById('next').onclick=()=>{ if((page*PAGE)<filtered.length){ page++; render(); } };
}
load();
