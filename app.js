// ════════════════════════════════════════════════════════════════
//  FRUTOS SECOS SÁEZ — Lógica principal de la aplicación
//  Este archivo usa los valores definidos en js/config.js
// ════════════════════════════════════════════════════════════════


const VARS_N=['Cáscara','Penta','Comuna','Marcona','Garriguez','Ramillete','Largueta','Vairo','Lauran','Floración Tardía','Ferragnes','Ferranduel'];
const CALLE_MX=24,CAM_MX=24,ZM_MX=0; // ZM_MX=0 = sin límite
const ZONES=['A','B','C','D'];
const DEF_PEP=[1,2,6,7,11,12,16,17];
const SUBS=['A','B','C','D','E'];
const ANAL_TYPES=[
  {k:'fosetil',n:'Fosetil'},
  {k:'herbicidas',n:'Herbicidas ácidos'},
  {k:'glifosato',n:'Glifosato'},
  {k:'multiresiduo',n:'Multi residuo'},
  {k:'aflatoxinas',n:'Aflatoxinas'},
  {k:'salmonela',n:'Salmonela'},
  {k:'ecoli',n:'E-coli'}
];

let calles={},pepSet=new Set(DEF_PEP),cams={},zm={},movs=[],anals=[],loteSubs={},pedidos=[];
let aKey=null;

function initState(){
  for(let i=1;i<=20;i++)calles[i]={n:i,z:Math.ceil(i/5),lote:'',prov:'',cal:'',ta:'',va:'',eco:'',orig:'',pep:false,s:0,kg:0,fe:'',nt:'',ok:false};
  for(let i=1;i<=3;i++)cams[i]={n:i,lote:'',prov:'',cal:'',ta:'',va:'',eco:'',orig:'',pep:false,s:0,kg:0,fe:'',nt:'',ok:false};
  zm={lote:'',prov:'',cal:'',ta:'',va:'',eco:'',orig:'',pep:false,s:0,kg:0,fe:'',nt:'',ok:false};
}

function migratePropietario(obj){
  if(!obj)return;
  if(obj.cal==='Sin calibrar')obj.cal='Propietario';
}

// ── Indicador de sincronización ──────────────────────────────────
function setSyncStatus(s){
  const el=document.getElementById('sync-status');
  const tx=document.getElementById('sync-txt');
  if(!el)return;
  el.className='sync sync-'+s;
  const labels={ok:'Sincronizado',saving:'Guardando...',error:'Sin conexión',loading:'Conectando...'};
  tx.textContent=labels[s]||s;
}

// ── GUARDAR → Google Apps Script ─────────────────────────────────
let _saveTimer=null, _saving=false;

function save(){
  clearTimeout(_saveTimer);
  _saveTimer=setTimeout(_push, 1200);
}

async function _push(){
  if(_saving)return;
  _saving=true;
  setSyncStatus('saving');
  const payload={calles, pepSet:[...pepSet], cams, zm, movs, anals, loteSubs, pedidos};
  try{
    // Apps Script requiere redirect:follow y Content-Type text/plain para evitar preflight CORS
    const r=await fetch(CONFIG.backendUrl, {
      method:'POST',
      redirect:'follow',
      headers:{'Content-Type':'text/plain'},
      body:JSON.stringify(payload)
    });
    const txt=await r.text();
    const d=JSON.parse(txt);
    setSyncStatus(d.ok?'ok':'error');
  }catch(e){
    console.error('Error guardando:', e);
    setSyncStatus('error');
  }
  _saving=false;
}

// ── CARGAR ← Google Apps Script ──────────────────────────────────
function _applyData(d){
  if(!d||typeof d!=='object')return;
  function jp(v){if(v===null||v===undefined)return null;if(typeof v==='object')return v;try{return JSON.parse(v);}catch(e){return null;}}
  const c=jp(d.calles);   if(c){calles=c;Object.values(calles).forEach(migratePropietario);}
  const p=jp(d.pepSet);   if(p)pepSet=new Set(p.map(Number));
  const k=jp(d.cams);     if(k){cams=k;Object.values(cams).forEach(migratePropietario);}
  const z=jp(d.zm);       if(z){zm=z;migratePropietario(zm);}
  const m=jp(d.movs);     if(m){movs=m;movs.forEach(mv=>{if(mv.cal==='Sin calibrar')mv.cal='Propietario';});}
  const an=jp(d.anals);   if(an)anals=an;
  const ls=jp(d.loteSubs);if(ls)loteSubs=ls;
  const ped=jp(d.pedidos);if(ped)pedidos=ped;
}

async function load(){
  setSyncStatus('loading');
  document.getElementById('loading-ov').style.display='flex';
  try{
    const r=await fetch(CONFIG.backendUrl+'?action=load', {redirect:'follow'});
    const d=await r.json();
    _applyData(d);
    setSyncStatus('ok');
  }catch(e){
    console.error('Error cargando:', e);
    setSyncStatus('error');
  }
  document.getElementById('loading-ov').style.display='none';
}

// Auto-refresh cada 40 segundos
setInterval(async()=>{
  if(_saving)return;
  try{
    const r=await fetch(CONFIG.backendUrl+'?action=load',{redirect:'follow'});
    const d=await r.json();
    _applyData(d);
    render();
    setSyncStatus('ok');
  }catch(e){}
}, CONFIG.autoRefreshSegundos * 1000);

// Refresca al volver a la pestaña desde otro sitio
document.addEventListener('visibilitychange',()=>{
  if(!document.hidden) load().then(()=>render());
});

const today=()=>new Date().toISOString().slice(0,10);
const pd=n=>String(n).padStart(2,'0');
function loteBase(f){const d=new Date((f||today())+'T12:00:00');return pd(d.getDate())+pd(d.getMonth()+1)+String(d.getFullYear()).slice(2);}
function nextN(base){const pf=base+'/';const all=[...Object.values(calles),...Object.values(cams),zm];const ns=[...all.filter(x=>x.lote&&x.lote.startsWith(pf)).map(x=>+x.lote.split('/')[1]),...movs.filter(m=>m.lote&&m.lote.startsWith(pf)).map(m=>+m.lote.split('/')[1])].filter(n=>n>0&&!isNaN(n));return ns.length?Math.max(...ns)+1:1;}
function genLote(f){const b=loteBase(f);return b+'/'+nextN(b);}
function getItem(k){if(k==='zm')return zm;if(k.startsWith('cam'))return cams[+k.slice(3)];return calles[+k.slice(1)];}
function setItem(k,d){if(k==='zm')Object.assign(zm,d);else if(k.startsWith('cam'))Object.assign(cams[+k.slice(3)],d);else Object.assign(calles[+k.slice(1)],d);}
function keyMax(k){return k==='zm'?0:k.startsWith('cam')?CAM_MX:CALLE_MX;}
function keyLabel(k){if(k==='zm')return'Zona Muerta';if(k.startsWith('cam'))return'Cámara '+k.slice(3);return'C'+pd(+k.slice(1));}
function keyType(k){if(k==='zm')return'zm';if(k.startsWith('cam'))return'cam';return'c';}
function ecoLabel(eco){return eco==='EB'?'Eco Blanda':eco==='ED'?'Eco Dura':'';}
function ecoBadgeTxt(eco){return eco==='EB'?'ECO·B':eco==='ED'?'ECO·D':'ECO';}
function allActiveLotes(){const all=[...Object.values(calles),...Object.values(cams),zm];const seen=new Set();all.filter(x=>x.ok&&x.lote).forEach(x=>seen.add(x.lote));movs.filter(m=>m.t==='E'&&m.lote).forEach(m=>seen.add(m.lote));return[...seen].sort();}

function cellCls(k,item){
  const type=keyType(k),n=type==='c'?+k.slice(1):0;
  const desPep=type==='c'&&pepSet.has(n);
  if(type==='cam')return item.ok?'cOK':'cEK';
  if(type==='zm')return item.ok?'cOZ':'cEZ';
  if(!item.ok)return desPep?'cEP':'cEG';
  if(item.pep&&item.orig==='P')return'cOP';
  if(item.pep&&item.orig==='O')return'cOO';
  return'cOG';
}
function accentHex(k,item){const type=keyType(k);if(!item.ok){if(type==='cam')return'#7ecde8';if(type==='zm')return'#e5c87a';return pepSet.has(+k.slice(1))?'#5a8827':'#c4bfb8';}if(type==='cam')return'#0369a1';if(type==='zm')return'#b45309';if(item.pep&&item.orig==='P')return'#c9a47a';if(item.pep&&item.orig==='O')return'#3d5e1a';return'#2563eb';}
function textHex(k,item){const type=keyType(k);if(!item.ok)return'#9e9083';if(type==='cam')return'#0c4472';if(type==='zm')return'#7a3a08';if(item.pep&&item.orig==='P')return'#5c3a10';if(item.pep&&item.orig==='O')return'#2a5010';return'#1e3a8a';}

function addPep(val){const n=+val;if(!n)return;pepSet.add(n);save();renderPep();rebuildPepSel();renderMap();}
function removePep(n){pepSet.delete(n);save();renderPep();rebuildPepSel();renderMap();}
function renderPep(){const el=document.getElementById('pep-tags');if(!pepSet.size){el.innerHTML='<span class="pep-none">Ninguna designada</span>';return;}el.innerHTML=[...pepSet].sort((a,b)=>a-b).map(n=>`<span class="ptag" onclick="removePep(${n})">C${pd(n)}<span class="x">×</span></span>`).join('');}
function rebuildPepSel(){const sel=document.getElementById('pep-add');sel.innerHTML='<option value="">+ Marcar calle como pepita...</option>';for(let i=1;i<=20;i++)if(!pepSet.has(i)){const o=document.createElement('option');o.value=i;o.textContent='C'+pd(i);sel.appendChild(o);}}

function renderMap(){
  let html='';
  for(let zi=0;zi<4;zi++){html+=`<div class="zone"><div class="zlbl">ZONA ${ZONES[zi]} — Calles ${zi*5+1}–${(zi+1)*5}</div><div class="g5">`;for(let j=0;j<5;j++){const n=zi*5+j+1;html+=mkCell('c'+n,calles[n]);}html+=`</div></div>`;}
  html+=`<div class="stitle">Cámaras Frigoríficas</div><div class="g3">`;
  for(let i=1;i<=3;i++)html+=mkCell('cam'+i,cams[i]);
  html+=`</div><div class="stitle">Zona Muerta <span style="font-size:11px;font-weight:400;color:#7a6040;margin-left:4px">(sin límite de sacas)</span></div><div class="g1">`;
  html+=mkCell('zm',zm);
  html+=`</div><div class="legend"><div class="li"><div class="ld" style="background:#f7f4ee;border-color:#ddd5c4"></div>General vacía</div><div class="li"><div class="ld" style="background:#ecf6dd;border-color:#b5d47a"></div>Pepita vacía</div><div class="li"><div class="ld" style="background:#f5ede2;border-color:#c9a47a"></div>Pepita proveedor</div><div class="li"><div class="ld" style="background:#d4ecb4;border-color:#7ab83a"></div>Pepita propia</div><div class="li"><div class="ld" style="background:#e8f0fb;border-color:#93b8f0"></div>General ocupada</div><div class="li"><div class="ld" style="background:#cce8f8;border-color:#4ab0e0"></div>Cámara</div><div class="li"><div class="ld" style="background:#fce8c0;border-color:#d0892a"></div>Zona muerta</div></div>`;
  document.getElementById('map-content').innerHTML=html;
}

function mkCell(key,item){
  const type=keyType(key),n=type==='c'?+key.slice(1):type==='cam'?+key.slice(3):0;
  const isPepDes=type==='c'&&pepSet.has(n);
  const mx=keyMax(key),ok=item.ok;
  const cls=cellCls(key,item),ac=accentHex(key,item),tx=textHex(key,item);
  const lbl=type==='c'?'C'+pd(n):type==='cam'?'CÁM '+n:'ZONA MUERTA';
  const onclick=ok?`openEdit('${key}')`:`openFill('${key}')`;
  let inner=`<div class="ctop"><span class="cn">${lbl}</span><span class="cbgs">`;
  if(isPepDes||item.pep)inner+=`<span class="bpep">PEP</span>`;
  if(type==='cam')inner+=`<span class="bfr">❄</span>`;
  if(type==='zm')inner+=`<span class="bzm">ZM</span>`;
  if(ok&&item.ta==='Ecológica')inner+=`<span class="beco">${ecoBadgeTxt(item.eco)}</span>`;
  inner+=`</span></div>`;
  if(ok){
    inner+=`<div class="ccal" style="color:${tx}">${item.cal||'—'}</div>`;
    inner+=`<div class="cvar" style="color:${tx}">${item.va||'—'}</div>`;
    inner+=`<div class="cprov" style="color:${tx}">${item.prov||'—'}</div>`;
    inner+=`<div class="clote" style="color:${tx}">${item.lote||'—'}</div>`;
    const sacLbl=type==='zm'?`<small> sacas</small>`:`<small>/${mx}</small>`;
    inner+=`<div class="csac" style="color:${ac}">${item.s}${sacLbl}</div>`;
    if(item.kg)inner+=`<div class="ckg">${item.kg} kg</div>`;
    if(type!=='zm'&&mx>0)inner+=`<div class="cbar"><div class="cbf" style="width:${Math.min(item.s/mx*100,100)}%;background:${ac}"></div></div>`;
  }else{inner+=`<div class="cempty">+ Asignar</div>`;}
  return`<div class="cell ${cls}" onclick="${onclick}">${inner}</div>`;
}

function updateStats(){
  const tc=Object.values(calles).reduce((s,c)=>s+(c.ok?c.s:0),0);
  document.getElementById('stC').textContent=tc+'/'+(20*CALLE_MX);
  const tk=Object.values(cams).reduce((s,c)=>s+(c.ok?c.s:0),0);
  document.getElementById('stK').textContent=tk+'/'+(3*CAM_MX);
  document.getElementById('stZ').textContent=(zm.ok?zm.s:0);
}

// RESUMEN
function renderResumen(){
  const allOccArr=allOcc();
  const totalSacasC=Object.values(calles).reduce((s,c)=>s+(c.ok?c.s:0),0);
  const totalCapC=20*CALLE_MX;
  const totalSacasK=Object.values(cams).reduce((s,c)=>s+(c.ok?c.s:0),0);
  const totalCapK=3*CAM_MX;
  const totalSacasZ=zm.ok?zm.s:0;
  const totalKg=allOccArr.reduce((s,c)=>s+(c.kg||0),0);
  const totalSacas=totalSacasC+totalSacasK+totalSacasZ;
  const calMap={},varMap={},taMap={eco:0,conv:0};
  allOccArr.forEach(c=>{
    if(c.cal)calMap[c.cal]=(calMap[c.cal]||0)+c.s;
    if(c.va)varMap[c.va]=(varMap[c.va]||0)+c.s;
    if(c.ta==='Ecológica')taMap.eco+=c.s;else if(c.ta)taMap.conv+=c.s;
  });
  const maxCalSacas=Math.max(1,...Object.values(calMap));
  const maxVarSacas=Math.max(1,...Object.values(varMap));
  const sortedCal=Object.entries(calMap).sort((a,b)=>b[1]-a[1]);
  const sortedVar=Object.entries(varMap).sort((a,b)=>b[1]-a[1]).slice(0,8);
  const pendAnal=anals.filter(a=>analResult(a)==='PENDIENTE').length;
  const noaptoAnal=anals.filter(a=>analResult(a)==='NO APTO').length;
  const pPend=pedidos.filter(p=>p.estado==='Pendiente').length;
  const pPrep=pedidos.filter(p=>p.estado==='Preparado').length;

  document.getElementById('resumen-content').innerHTML=`
  <div class="stat-grid">
    <div class="stat-card"><div class="stat-num">${totalSacas}</div><div class="stat-lbl">Sacas en almacén</div><div class="stat-sub">${Math.round(totalKg).toLocaleString('es')} kg totales</div></div>
    <div class="stat-card"><div class="stat-num" style="color:#0369a1">${totalSacasC}/${totalCapC}</div><div class="stat-lbl">Sacas en calles</div><div class="stat-sub">${Math.round(totalSacasC/totalCapC*100)}% ocupado</div></div>
    <div class="stat-card"><div class="stat-num" style="color:#0369a1">${totalSacasK}/${totalCapK}</div><div class="stat-lbl">Sacas en cámaras</div><div class="stat-sub">${Math.round(totalSacasK/totalCapK*100)}% ocupado</div></div>
    <div class="stat-card"><div class="stat-num" style="color:#b45309">${totalSacasZ}</div><div class="stat-lbl">Sacas Zona Muerta</div><div class="stat-sub">Sin límite asignado</div></div>
    <div class="stat-card"><div class="stat-num" style="color:#1a6e2a">${taMap.eco}</div><div class="stat-lbl">Sacas ecológicas</div><div class="stat-sub">${taMap.conv} convencionales</div></div>
    <div class="stat-card"><div class="stat-num" style="color:${noaptoAnal>0?'#c0392b':'#5a8827'}">${anals.length}</div><div class="stat-lbl">Analíticas registradas</div><div class="stat-sub">${noaptoAnal>0?noaptoAnal+' No Aptos':pendAnal>0?pendAnal+' pendientes':'Todas aptas'}</div></div>
    <div class="stat-card"><div class="stat-num" style="color:#856404">${pPend+pPrep}</div><div class="stat-lbl">Pedidos activos</div><div class="stat-sub">${pPend} pend. · ${pPrep} preparados</div></div>
  </div>
  <div style="display:grid;grid-template-columns:1fr 1fr;gap:14px;flex-wrap:wrap">
    <div class="res-section"><div class="res-title">Sacas por calibre</div>${sortedCal.length?sortedCal.map(([k,v])=>`<div class="bar-row"><div class="bar-lbl">${k}</div><div class="bar-bg"><div class="bar-fill" style="width:${Math.round(v/maxCalSacas*100)}%"></div></div><div class="bar-val">${v} sacas</div></div>`).join(''):'<div style="color:var(--M);font-size:13px">Sin datos</div>'}</div>
    <div class="res-section"><div class="res-title">Sacas por variedad</div>${sortedVar.length?sortedVar.map(([k,v])=>`<div class="bar-row"><div class="bar-lbl">${k}</div><div class="bar-bg"><div class="bar-fill" style="width:${Math.round(v/maxVarSacas*100)}%"></div></div><div class="bar-val">${v} sacas</div></div>`).join(''):'<div style="color:var(--M);font-size:13px">Sin datos</div>'}</div>
  </div>`;
}

// MODAL ENTRADA
function openFill(key){
  aKey=key;
  const f=today(),type=keyType(key),n=type==='c'?+key.slice(1):0;
  const autoPep=type==='c'&&pepSet.has(n);
  document.getElementById('ft').textContent='Asignar '+keyLabel(key);
  document.getElementById('f-lote').value=genLote(f);
  document.getElementById('f-sacas').value='1';
  const mx=keyMax(key);
  document.getElementById('f-sacas').max=mx>0?mx:9999;
  document.getElementById('f-kg').value='';
  document.getElementById('f-cal').value='';
  document.querySelectorAll('input[name="fTa"]').forEach(r=>r.checked=false);
  document.querySelectorAll('input[name="fOrig"]').forEach(r=>r.checked=false);
  document.querySelectorAll('input[name="fEco"]').forEach(r=>r.checked=false);
  document.getElementById('f-var').innerHTML='<option value="">— Seleccionar tipo primero —</option>';
  document.getElementById('f-eco-blk').style.display='none';
  document.getElementById('f-prov').value='';
  document.getElementById('f-fe').value=f;
  document.getElementById('f-nt').value='';
  document.getElementById('f-is-pep').checked=autoPep;
  togglePep(autoPep);
  document.getElementById('mod-fill').style.display='flex';
}

document.getElementById('f-fe').addEventListener('change',function(){document.getElementById('f-lote').value=genLote(this.value);});

function togglePep(v){
  const cb=document.getElementById('f-is-pep');
  if(v!==undefined)cb.checked=v;
  const on=cb.checked;
  document.getElementById('f-bpep').style.display=on?'inline':'none';
  document.getElementById('f-orig-blk').style.display=on?'block':'none';
  document.getElementById('f-pep-hint').textContent=on?'Lote obligatorio':'Lote opcional';
  const r=document.getElementById('f-lote-req');r.textContent=on?'*':'(opcional)';r.style.color=on?'var(--R)':'';
}

function onTipoChange(){
  const t=document.querySelector('input[name="fTa"]:checked')?.value;
  const prev=document.getElementById('f-var').value;
  document.getElementById('f-var').innerHTML='<option value="">—</option>'+VARS_N.map(v=>`<option${v===prev?' selected':''}>${v}</option>`).join('');
  const eco=t==='Ecológica';
  document.getElementById('f-eco-blk').style.display=eco?'block':'none';
  if(!eco)document.querySelectorAll('input[name="fEco"]').forEach(r=>r.checked=false);
}

function doFill(){
  const k=aKey;
  const lote=document.getElementById('f-lote').value.trim();
  const sv=parseInt(document.getElementById('f-sacas').value);
  const kg=parseFloat(document.getElementById('f-kg').value)||0;
  const cal=document.getElementById('f-cal').value;
  const ta=document.querySelector('input[name="fTa"]:checked')?.value||'';
  const va=document.getElementById('f-var').value;
  const eco=document.querySelector('input[name="fEco"]:checked')?.value||'';
  const prov=document.getElementById('f-prov').value.trim();
  const fe=document.getElementById('f-fe').value||today();
  const nt=document.getElementById('f-nt').value.trim();
  const pep=document.getElementById('f-is-pep').checked;
  const orig=document.querySelector('input[name="fOrig"]:checked')?.value||'';
  const mx=keyMax(k);
  if(pep&&!lote)return sf('El lote es obligatorio para pepita comprada');
  if(!sv||sv<1)return sf('Introduce un número de sacas válido');
  if(mx>0&&sv>mx)return sf('Máximo '+mx+' sacas para esta ubicación');
  if(pep&&!orig)return sf('Selecciona el origen del producto');
  setItem(k,{lote,prov,cal,ta,va,eco,orig,pep,s:sv,kg,fe,nt,ok:true});
  movs.unshift({id:Date.now(),t:'E',key:k,lbl:keyLabel(k),lote,prov,cal,ta,va,eco,s:sv,kg,fe,dest:''});
  save();render();closeModal();sf(keyLabel(k)+' asignada'+(lote?' · '+lote:''),true);
}

function openEdit(key){
  aKey=key;
  const item=getItem(key),mx=keyMax(key),ac=accentHex(key,item);
  document.getElementById('et-lbl').textContent=keyLabel(key);
  document.getElementById('et-lote').textContent=item.lote?' '+item.lote:'';
  const tf=item.ta==='Ecológica'&&item.eco?item.ta+' · '+ecoLabel(item.eco):item.ta||'—';
  const rows=[['Calibre',item.cal||'—'],['Variedad',item.va||'—'],['Tipo',tf],['Proveedor',item.prov||'—'],['Entrada',item.fe||'—'],['Peso',item.kg?item.kg+' kg':'—']];
  if(item.pep)rows.push(['Origen',item.orig==='P'?'Proveedor directo':item.orig==='O'?'Producción propia':'—']);
  if(item.nt)rows.push(['Notas',item.nt]);
  document.getElementById('e-info').innerHTML=rows.map(([k,v])=>`<div><div class="ik">${k}</div><div class="iv">${v}</div></div>`).join('');
  const pct=mx>0?Math.min(item.s/mx*100,100):Math.min(item.s/50*100,100);
  document.getElementById('e-sbf').style.cssText=`width:${pct}%;height:100%;background:${ac}`;
  const capLbl=mx>0?`/${mx} sacas`:' sacas (sin límite)';
  document.getElementById('e-sblbl').textContent=item.s+capLbl+(item.kg?' · '+item.kg+' kg':'');
  document.getElementById('e-sac').value='';document.getElementById('e-sac').max=item.s;document.getElementById('e-sac').placeholder='1–'+item.s;
  document.getElementById('e-fe').value=today();document.getElementById('e-dest').value='';
  document.getElementById('mod-edit').style.display='flex';
}

function doSalida(){
  const k=aKey,item=getItem(k);
  const sv=parseInt(document.getElementById('e-sac').value);
  const fd=document.getElementById('e-fe').value||today();
  const dest=document.getElementById('e-dest').value.trim();
  if(!sv||sv<1||sv>item.s)return sf('Sacas inválidas (1–'+item.s+')');
  const rem=item.s-sv,kgOut=item.kg?Math.round(item.kg/item.s*sv*10)/10:0,kgRem=item.kg?Math.round(item.kg/item.s*rem*10)/10:0;
  movs.unshift({id:Date.now(),t:'S',key:k,lbl:keyLabel(k),lote:item.lote,prov:item.prov,cal:item.cal,ta:item.ta,va:item.va,eco:item.eco,s:sv,kg:kgOut,fe:fd,dest});
  if(rem===0)setItem(k,{lote:'',prov:'',cal:'',ta:'',va:'',eco:'',orig:'',pep:false,s:0,kg:0,fe:'',nt:'',ok:false});
  else setItem(k,{s:rem,kg:kgRem});
  save();render();closeModal();sf(sv+' sacas retiradas de '+keyLabel(k)+(rem===0?' — libre':''),true);
}

function doVaciar(){
  const k=aKey,item=getItem(k);
  movs.unshift({id:Date.now(),t:'S',key:k,lbl:keyLabel(k),lote:item.lote,prov:item.prov,cal:item.cal,ta:item.ta,va:item.va,eco:item.eco,s:item.s,kg:item.kg,fe:today(),dest:'Vaciado'});
  setItem(k,{lote:'',prov:'',cal:'',ta:'',va:'',eco:'',orig:'',pep:false,s:0,kg:0,fe:'',nt:'',ok:false});
  save();render();closeModal();sf(keyLabel(k)+' vaciada',true);
}
function closeModal(){document.getElementById('mod-fill').style.display='none';document.getElementById('mod-edit').style.display='none';}

// ANALÍTICA
function buildAnalTypesForm(existing){
  const html=ANAL_TYPES.map(({k,n})=>{
    const ex=existing&&existing[k]?existing[k]:{realizado:false,valor:'',apto:null};
    const ch=ex.realizado?'checked':'';
    const ap=ex.apto===true?'checked':'';
    const na=ex.apto===false?'checked':'';
    const actClass=ex.realizado?'active':'';
    return`<div class="anal-row">
      <div class="anal-check"><input type="checkbox" id="ac-${k}" onchange="toggleAnalType('${k}')" ${ch}><label for="ac-${k}">${n}</label></div>
      <div class="anal-val ${actClass}" id="av-${k}"><input type="text" style="padding:5px 8px;font-size:12px" placeholder="Valor / observación" id="aval-${k}" value="${ex.valor||''}"></div>
      <div class="anal-res ${actClass}" id="ar-${k}">
        <label style="color:#1a5c2a"><input type="radio" name="ares-${k}" value="apto" ${ap}> Apto</label>
        <label style="color:#c0392b"><input type="radio" name="ares-${k}" value="noApto" ${na}> No apto</label>
      </div>
    </div>`;
  }).join('');
  document.getElementById('anal-types-form').innerHTML=`<div class="anal-hdr-row"><span>Tipo</span><span>Valor</span><span>Resultado</span></div>`+html;
}

function toggleAnalType(k){
  const on=document.getElementById('ac-'+k).checked;
  document.getElementById('av-'+k).classList.toggle('active',on);
  document.getElementById('ar-'+k).classList.toggle('active',on);
}

function getAnalData(){
  const data={};
  ANAL_TYPES.forEach(({k})=>{
    const realizado=document.getElementById('ac-'+k).checked;
    const valor=document.getElementById('aval-'+k).value.trim();
    const aptoEl=document.querySelector(`input[name="ares-${k}"]:checked`);
    data[k]={realizado,valor,apto:realizado?aptoEl?.value==='apto':null};
  });
  return data;
}

function analResult(a){
  if(!a.analisis)return'PENDIENTE';
  const done=ANAL_TYPES.filter(({k})=>a.analisis[k]&&a.analisis[k].realizado);
  if(!done.length)return'PENDIENTE';
  if(done.some(({k})=>a.analisis[k].apto===false))return'NO APTO';
  if(done.some(({k})=>a.analisis[k].apto===null))return'PENDIENTE';
  return'APTO';
}

function analCellHtml(a,k){
  if(!a.analisis||!a.analisis[k]||!a.analisis[k].realizado)return`<td style="color:#ccc;font-size:11px">—</td>`;
  const {valor,apto}=a.analisis[k];
  const dot=apto===true?`<span style="color:#1a5c2a">●</span>`:apto===false?`<span style="color:#c0392b">●</span>`:`<span style="color:#856404">●</span>`;
  return`<td style="font-size:11px">${dot} ${valor||''}</td>`;
}

function openAnalForm(){
  const lotes=allActiveLotes();
  const sel=document.getElementById('a-lote');
  sel.innerHTML='<option value="">— Seleccionar —</option>'+lotes.map(l=>`<option>${l}</option>`).join('');
  document.getElementById('a-fecha').value=today();
  document.getElementById('a-coment').value='';
  document.getElementById('a-sub-sel-blk').style.display='none';
  renderSubChips(null);
  buildAnalTypesForm(null);
  document.getElementById('mod-anal').style.display='flex';
}

function onAnalLoteChange(){const lote=document.getElementById('a-lote').value;renderSubChips(lote);renderSubSel(lote);}
function renderSubChips(lote){const cur=lote?loteSubs[lote]||0:0;document.querySelectorAll('#a-subs-chips .schip').forEach((ch,i)=>{const val=i===0?0:i+1;ch.classList.toggle('sa',val===cur);});}
function setSubs(n){const lote=document.getElementById('a-lote').value;if(!lote&&n>0){sf('Selecciona primero un lote');return;}if(lote){if(n===0)delete loteSubs[lote];else loteSubs[lote]=n;save();}renderSubChips(lote);renderSubSel(lote);}
function renderSubSel(lote){const cnt=lote?loteSubs[lote]||0:0;const blk=document.getElementById('a-sub-sel-blk');const sel=document.getElementById('a-sub');if(cnt>0){blk.style.display='block';sel.innerHTML='<option value="">— Lote completo —</option>'+SUBS.slice(0,cnt).map(s=>`<option value="${s}">Sublote ${s}</option>`).join('');}else blk.style.display='none';}

function doAddAnal(){
  const fecha=document.getElementById('a-fecha').value;
  const lote=document.getElementById('a-lote').value;
  const sub=document.getElementById('a-sub')?.value||'';
  const coment=document.getElementById('a-coment').value.trim();
  const analisis=getAnalData();
  if(!fecha)return sf('Introduce la fecha del análisis');
  if(!lote)return sf('Selecciona un lote');
  anals.unshift({id:Date.now(),fecha,lote,sub,analisis,coment});
  save();renderAnal();closeAnal();sf('Analítica registrada',true);
}
function deleteAnal(id){if(!confirm('¿Eliminar esta analítica?'))return;anals=anals.filter(a=>a.id!==id);save();renderAnal();}
function closeAnal(){document.getElementById('mod-anal').style.display='none';}

function renderAnal(){
  const b=document.getElementById('anal-body');
  if(!anals.length){b.innerHTML='<tr><td colspan="12" class="empty-st">No hay analíticas registradas</td></tr>';return;}
  b.innerHTML=anals.map(a=>{
    const res=analResult(a);
    const resBdg=res==='APTO'?`<span class="bdg bapto">APTO</span>`:res==='NO APTO'?`<span class="bdg bnapto">NO APTO</span>`:`<span class="bdg bpend">PEND.</span>`;
    const loteFull=a.sub?`<b>${a.lote}</b>·<span class="sublbl">${a.sub}</span>`:`<b>${a.lote}</b>`;
    return`<tr>
      <td style="white-space:nowrap">${a.fecha}</td>
      <td style="font-family:monospace">${loteFull}</td>
      ${ANAL_TYPES.map(({k})=>analCellHtml(a,k)).join('')}
      <td>${resBdg}</td>
      <td style="color:var(--M);max-width:160px;font-size:11px">${a.coment||'—'}</td>
      <td><button class="btn-del" onclick="deleteAnal(${a.id})">✕</button></td>
    </tr>`;
  }).join('');
}

// PEDIDOS
function openPedidoForm(){
  document.getElementById('p-cliente').value='';
  document.getElementById('p-cal').value='';
  document.getElementById('p-var').value='';
  document.getElementById('p-sacas').value='';
  document.getElementById('p-kg').value='';
  document.getElementById('p-tipo').value='';
  document.getElementById('p-fecha').value=today();
  document.getElementById('p-notas').value='';
  document.getElementById('mod-pedido').style.display='flex';
}

function doAddPedido(){
  const cliente=document.getElementById('p-cliente').value.trim();
  if(!cliente)return sf('Introduce el nombre del cliente');
  pedidos.unshift({
    id:Date.now(),cliente,
    cal:document.getElementById('p-cal').value,
    va:document.getElementById('p-var').value.trim(),
    sacas:parseInt(document.getElementById('p-sacas').value)||0,
    kg:parseFloat(document.getElementById('p-kg').value)||0,
    tipo:document.getElementById('p-tipo').value,
    fecha:document.getElementById('p-fecha').value||today(),
    notas:document.getElementById('p-notas').value.trim(),
    estado:'Pendiente'
  });
  save();renderPedidos();closePedido();sf('Pedido añadido',true);
}

function setPedidoEstado(id,estado){
  const p=pedidos.find(x=>x.id===id);if(!p)return;
  p.estado=estado;save();renderPedidos();
}
function deletePedido(id){if(!confirm('¿Eliminar este pedido?'))return;pedidos=pedidos.filter(p=>p.id!==id);save();renderPedidos();}
function closePedido(){document.getElementById('mod-pedido').style.display='none';}

function renderPedidos(){
  const pend=pedidos.filter(p=>p.estado==='Pendiente');
  const prep=pedidos.filter(p=>p.estado==='Preparado');
  const entregados=pedidos.filter(p=>p.estado==='Entregado');
  function card(p){
    const btns=p.estado==='Pendiente'
      ?`<button class="btn-sm" style="background:var(--G);color:#fff;border-color:var(--G)" onclick="setPedidoEstado(${p.id},'Preparado')">✓ Preparado</button>`
      :p.estado==='Preparado'
      ?`<button class="btn-sm" style="background:#0369a1;color:#fff;border-color:#0369a1" onclick="setPedidoEstado(${p.id},'Entregado')">✓ Entregar</button><button class="btn-sm bc" onclick="setPedidoEstado(${p.id},'Pendiente')">↩ Pend.</button>`
      :`<button class="btn-sm bc" onclick="setPedidoEstado(${p.id},'Pendiente')">↩ Reabrir</button>`;
    return`<div class="ped-card">
      <div class="ped-card-top"><div><div class="ped-cliente">${p.cliente}</div></div><button class="btn-del" onclick="deletePedido(${p.id})">✕</button></div>
      <div class="ped-info">${[p.cal,p.va,p.tipo].filter(Boolean).join(' · ')}${p.sacas?` · ${p.sacas} sacas`:''} ${p.kg?`· ${p.kg} kg`:''}</div>
      <div class="ped-info">Pedido: ${p.fecha}${p.notas?' · '+p.notas:''}</div>
      <div class="ped-actions">${btns}</div>
    </div>`;
  }
  function entRow(p){
    return`<tr>
      <td style="white-space:nowrap;color:#7a6040">${p.fecha}</td>
      <td><b>${p.cliente}</b></td>
      <td>${p.cal||'—'}</td>
      <td style="color:#7a6040">${p.va||'—'}</td>
      <td>${p.tipo?`<span class="bdg ${p.tipo==='Ecológica'?'beco2':'bnorm'}">${p.tipo==='Ecológica'?'Eco':'Conv.'}</span>`:'—'}</td>
      <td><b>${p.sacas||'—'}</b></td>
      <td style="color:#7a6040">${p.kg||'—'}</td>
      <td style="color:#7a6040;font-size:12px">${p.notas||'—'}</td>
      <td><button class="btn-sm bc" style="font-size:11px" onclick="setPedidoEstado(${p.id},'Pendiente')">↩ Reabrir</button> <button class="btn-del" onclick="deletePedido(${p.id})">✕</button></td>
    </tr>`;
  }
  document.getElementById('pedidos-content').innerHTML=`
  <div class="ped-sections">
    <div><div class="ped-section-title">⏳ Pendientes <span style="background:#fff3cd;color:#856404;padding:1px 7px;border-radius:8px;font-size:11px">${pend.length}</span></div>${pend.length?pend.map(card).join(''):'<div class="empty-st" style="padding:20px 0">Sin pedidos pendientes</div>'}</div>
    <div><div class="ped-section-title">📦 Preparados <span style="background:var(--GL);color:var(--GD);padding:1px 7px;border-radius:8px;font-size:11px">${prep.length}</span></div>${prep.length?prep.map(card).join(''):'<div class="empty-st" style="padding:20px 0">Sin pedidos preparados</div>'}</div>
  </div>
  <div style="margin-top:20px">
    <div class="ped-section-title" style="margin-bottom:10px">✅ Pedidos servidos <span style="background:#cce8f8;color:#0369a1;padding:1px 7px;border-radius:8px;font-size:11px">${entregados.length}</span></div>
    ${entregados.length?`<div class="tw"><table class="mw"><thead><tr>
      <th>Fecha</th><th>Cliente</th><th>Calibre</th><th>Variedad</th><th>Tipo</th><th>Sacas</th><th>Kg</th><th>Notas</th><th></th>
    </tr></thead><tbody>${entregados.map(entRow).join('')}</tbody></table></div>`
    :'<div class="empty-st">Aún no hay pedidos servidos</div>'}
  </div>`;
}

// TABLAS
function allOcc(){return[...Object.values(calles).filter(c=>c.ok).map(c=>({...c,lbl:'C'+pd(c.n),key:'c'+c.n})),...Object.values(cams).filter(c=>c.ok).map(c=>({...c,lbl:'CÁM '+c.n,key:'cam'+c.n})),...(zm.ok?[{...zm,lbl:'ZM',key:'zm'}]:[])]}
function tipoCell(ta,eco){if(!ta)return'—';if(ta==='Ecológica'){const el=ecoLabel(eco);return`<span class="bdg beco2">Eco</span>${el?` <span class="sublbl">${el}</span>`:''}`;}return`<span class="bdg bnorm">Conv.</span>`;}

function renderInv(){
  const b=document.getElementById('inv-body'),all=allOcc();
  if(!all.length){b.innerHTML='<tr><td colspan="9" class="empty-st">No hay producto almacenado</td></tr>';return;}
  b.innerHTML=all.map(c=>`<tr onclick="openEdit('${c.key}')"><td><b>${c.lbl}</b>${c.pep?' <span class="bpep" style="font-size:9px">PEP</span>':''}</td><td style="font-family:monospace;font-weight:700">${c.lote||'—'}</td><td>${c.cal?`<span class="bdg bcal">${c.cal}</span>`:'—'}</td><td>${tipoCell(c.ta,c.eco)}</td><td style="color:#7a6040">${c.va||'—'}</td><td style="color:#7a6040">${c.prov||'—'}</td><td><b>${c.s}</b></td><td style="color:#7a6040">${c.kg||'—'}</td><td style="color:#7a6040;font-size:12px">${c.fe}</td></tr>`).join('');
}

function renderLotes(){
  const b=document.getElementById('lotes-body'),all=allOcc().filter(c=>c.lote);
  const map={};all.forEach(c=>{if(!map[c.lote])map[c.lote]={lote:c.lote,cal:c.cal,ta:c.ta,eco:c.eco,va:c.va,prov:c.prov,fe:c.fe,s:0,kg:0,ubics:[]};map[c.lote].s+=c.s;map[c.lote].kg+=c.kg||0;map[c.lote].ubics.push(c.lbl);});
  const rows=Object.values(map).sort((a,b)=>b.fe.localeCompare(a.fe));
  if(!rows.length){b.innerHTML='<tr><td colspan="9" class="empty-st">No hay lotes activos</td></tr>';return;}
  b.innerHTML=rows.map(r=>{const subs=loteSubs[r.lote];return`<tr><td style="font-family:monospace;font-weight:700">${r.lote}${subs?` <span class="sublbl">${subs} sub.</span>`:''}</td><td>${r.cal?`<span class="bdg bcal">${r.cal}</span>`:'—'}</td><td>${tipoCell(r.ta,r.eco)}</td><td style="color:#7a6040">${r.va||'—'}</td><td style="color:#7a6040">${r.prov||'—'}</td><td style="color:#7a6040;font-size:12px">${r.ubics.join(', ')}</td><td><b>${r.s}</b></td><td style="color:#7a6040">${r.kg?Math.round(r.kg*10)/10:'—'}</td><td style="color:#7a6040;font-size:12px">${r.fe}</td></tr>`;}).join('');
}

function renderHist(){
  const b=document.getElementById('hist-body');
  if(!movs.length){b.innerHTML='<tr><td colspan="9" class="empty-st">Sin movimientos</td></tr>';return;}
  b.innerHTML=movs.slice(0,200).map(m=>`<tr><td style="color:#7a6040">${m.fe}</td><td><span class="bdg ${m.t==='E'?'bein':'bout'}">${m.t==='E'?'ENT':'SAL'}</span></td><td><b>${m.lbl}</b></td><td style="font-family:monospace;font-size:12px">${m.lote||'—'}</td><td>${m.cal||'—'}</td><td style="font-size:11px;color:#7a6040">${m.ta==='Ecológica'&&m.eco?'Eco '+ecoLabel(m.eco).split(' ')[1]:(m.ta||'—')}</td><td style="font-weight:700;color:${m.t==='E'?'#3d5e1a':'#c0392b'}">${m.t==='E'?'+':'-'}${m.s}</td><td style="color:#7a6040">${m.kg||'—'}</td><td style="color:#7a6040;font-size:12px">${m.dest||m.prov||'—'}</td></tr>`).join('');
}

function showTab(id,btn){
  ['mapa','resumen','inv','lotes','anal','pedidos','hist'].forEach(t=>document.getElementById('tab-'+t).style.display='none');
  document.getElementById('tab-'+id).style.display='block';
  document.querySelectorAll('.tab').forEach(b=>b.classList.remove('a'));btn.classList.add('a');
  if(id==='resumen')renderResumen();
  if(id==='inv')renderInv();
  if(id==='lotes')renderLotes();
  if(id==='anal')renderAnal();
  if(id==='pedidos')renderPedidos();
  if(id==='hist')renderHist();
}

function sf(msg,ok=false){const f=document.getElementById('flash');f.textContent=msg;f.className='flash '+(ok?'fok':'ferr');f.style.display='block';setTimeout(()=>f.style.display='none',3200);}

function render(){renderMap();updateStats();renderPep();rebuildPepSel();const a=document.querySelector('.tab.a');if(a){const id=a.getAttribute('onclick').match(/'(\w+)'/)[1];if(id==='resumen')renderResumen();if(id==='inv')renderInv();if(id==='lotes')renderLotes();if(id==='anal')renderAnal();if(id==='pedidos')renderPedidos();if(id==='hist')renderHist();}}

initState();

// Poblar desplegables de calibres desde config.js
document.querySelectorAll('#f-cal,#p-cal').forEach(sel=>{
  const cur=sel.value;
  sel.innerHTML='<option value="">—</option>';
  CONFIG.calibres.forEach(c=>{
    const o=document.createElement('option');
    o.value=c; o.textContent=c;
    sel.appendChild(o);
  });
  sel.value=cur;
});

// Nombre empresa desde config
const hn=document.getElementById('hdr-nombre');
const hs=document.getElementById('hdr-subtitulo');
if(hn)hn.textContent=CONFIG.nombre;
if(hs)hs.textContent=CONFIG.subtitulo;

load().then(()=>render());