
/* ---------- Tech tree tab in the hangar ---------- */
let progSel=null;
const fmtN=n=>Number(n).toLocaleString('en-US');
const nodeState=id=>progOwned(id)?'own':progRes(id)?'res':progResearchable(id)?'can':'lock';
function progWallet(){$('hgWallet').textContent=careerOn?fmtN(prog.sl)+' SL · '+fmtN(prog.frp)+' free RP':''}
function progDetail(id){
  const n=NODES[id],d=AC_DEFS[id],st=nodeState(id),nat=NATIONS[n.n],req=n.req?AC_DEFS[n.req].name:null,tw=d.T_AB/(d.MASS*G);
  let h='<div class="tdet"><h3>'+d.name+'</h3><p class="hgNote">'+nat.n+' · rank '+ROMAN[n.r]+' · BR '+n.br.toFixed(1)+' · thrust/weight '+tw.toFixed(2)+' · +'+d.gmax+' g · corner '+d.corner+' kt<br>'+d.srFull+' × '+d.srN+' · '+d.mrFull+' × '+d.mrN+'</p>';
  if(st==='own'){h+='<div class="row"><button class="ghost" data-act="use" data-id="'+id+'">Use in hangar</button></div>';
    h+='<p class="hgNote">'+MODS.filter(m=>hasMod(id,m[0])).length+' of '+MODS.length+' modules installed. Open the Mods tab to research more.</p>'}
  else if(st==='res'){const c=SL_PRICE[n.r];h+='<div class="row"><button class="primary" data-act="buy" data-id="'+id+'"'+(prog.sl>=c?'':' disabled')+'>Buy · '+fmtN(c)+' SL</button></div><p class="hgNote">Researched. You have '+fmtN(prog.sl)+' Silver Lions.</p>'}
  else if(st==='can'){const c=RP_COST[n.r];h+='<div class="row"><button class="primary" data-act="research" data-id="'+id+'"'+(progPool(n.req)>=c?'':' disabled')+'>Research · '+fmtN(c)+' RP</button></div><p class="hgNote">Paid from the '+fmtN(prog.rp[n.req]||0)+' RP earned in the '+req+' plus '+fmtN(prog.frp)+' free RP.</p>'}
  else h+='<p class="hgNote">Locked: research the '+req+' first.</p>';
  return h+'</div>'}
/* Mods tab: modules for the aircraft in the hangar, grouped by family. Research costs RP earned in this aircraft (or free RP), then the module is bought with Silver Lions. */
/* what a module actually changes: flip it on in memory, re-run the effective-aircraft maths, and report the numbers that moved.
   Computed rather than written down, so a card can never disagree with modApply or ldCap. */
function modSnap(id){const e=effAC(id),c=ldCap(id),bf=AC.cm.fixed?AC.cm.flares:CM_LOADS[cmLoad][0]*15,bc=AC.cm.fixed?AC.cm.chaff:CM_LOADS[cmLoad][1]*30;
  return {thrust:e.T_AB,roll:e.roll,lift:e.CLMAX,range:e.mr.maxR,agility:e.mr.gmax,tanks:c.tanks,rails:c.hp,flares:bf*(e.cmK||1),chaff:bc*(e.cmK||1)}}
const MOD_METRICS=[['thrust','thrust','pct'],['roll','roll rate','pct'],['lift','lift','pct'],['range','missile range','pct'],['agility','missile agility','pct'],['tanks','drop tanks','abs'],['rails','missile stations','abs'],['flares','flares','abs'],['chaff','chaff','abs']];
function modEffect(id,k){const m=prog.mods[id]||(prog.mods[id]={}),row=MODS.find(x=>x[0]===k),req=row&&row[4],
  pre=req&&!m[req]?[req]:[],                        // tier II is measured from the state that already has tier I, so its card reads the same before and after you buy the prerequisite
  keys=pre.concat(k),had={},prev={};
  for(const q of keys)if(Object.prototype.hasOwnProperty.call(m,q)){prev[q]=m[q];had[q]=1;delete m[q]}
  for(const q of pre)m[q]=true; const a=modSnap(id);          // as it will fly once the prerequisite is in
  m[k]=true; const b=modSnap(id);                            // with this module as well
  for(const q of keys)if(had[q])m[q]=prev[q];else delete m[q]; if(!Object.keys(m).length)delete prog.mods[id];
  const out=[];for(const [f,label,kind] of MOD_METRICS){const x=a[f],y=b[f];if(typeof x!=='number'||typeof y!=='number')continue;
    if(kind==='abs'){const X=Math.round(x),Y=Math.round(y);if(X!==Y)out.push(X+' → '+Y+' '+label)}   // a count, so zero is a real starting point
    else if(x){const d=Math.round((y/x-1)*100);if(d)out.push((d>0?'+':'−')+Math.abs(d)+' % '+label)}}
  const s=out.slice(0,3).join(' · ');return s&&pre.length?s+' · with '+MODS.find(x=>x[0]===pre[0])[1]:s}
function modsRender(){const el=$('hgMods'),id=AC.id;progWallet();
  if(!careerOn){el.innerHTML='<p class="hgNote">Modifications belong to <b>Career mode</b>: a stock aircraft flies with penalties and you earn the modules by flying it. Free play gives every aircraft all modules for free.</p><div class="row"><button class="primary" data-act="career">Switch to Career</button></div>';return}
  if(!progOwned(id)){el.innerHTML='<p class="hgNote">Buy this aircraft in the Tech tree first.</p>';return}
  const stock=!hasMod(id,'eng1')||!hasMod(id,'afr1')||!hasMod(id,'cms1')||!hasMod(id,'wpn1');
  let h='<p class="hgNote">'+AC.name+(stock?' is flying in stock condition: -6 % thrust, -10 % roll rate, half the countermeasures, -10 % missile range and agility, no drop tanks and only the basic missile load.':' is fully modified.')+' '+fmtN(prog.rp[id]||0)+' RP earned in this aircraft, '+fmtN(prog.frp)+' free RP, '+fmtN(prog.sl)+' SL.</p><div class="mods">';
  for(const m of MODS){const k=m[0],c=modCost(id,m),have=hasMod(id,k),res=modRes(id,k),lockd=m[4]&&!hasMod(id,m[4]),st=have?'own':res?'res':lockd?'lock':'can';
    let btn;if(have)btn='<b class="ok">Installed</b>';else if(lockd)btn='<small>Needs '+MODS.find(x=>x[0]===m[4])[1]+'</small>';
    else if(res)btn='<button type="button" class="primary" data-act="mbuy" data-m="'+k+'"'+(prog.sl>=c.sl?'':' disabled')+'>Buy '+fmtN(c.sl)+' SL</button>';
    else btn='<button type="button" class="ghost" data-act="mres" data-m="'+k+'"'+(progPool(id)>=c.rp?'':' disabled')+'>Research '+fmtN(c.rp)+' RP</button>';
    const eff=modEffect(id,k);
    h+='<div class="mod '+st+'" data-m="'+k+'"><small>'+m[5]+'</small><b>'+m[1]+'</b>'+(eff?'<em class="eff">'+eff+'</em>':'')+'<p>'+m[3]+'</p>'+btn+'</div>'}
  el.innerHTML=h+'</div>'}
$('hgMods').addEventListener('click',e=>{const t=e.target.closest('[data-act]');if(!t)return;const act=t.dataset.act;
  if(act==='career'){$('bMode').click();modsRender();return}
  const ok=act==='mres'?progModResearch(AC.id,t.dataset.m):act==='mbuy'?progModBuy(AC.id,t.dataset.m):false;
  if(ok){if(act==='mbuy')applyAC();syncCareerUI()}modsRender()});
/* crew skills as cards: name, what it does, five pips, next-level cost; shared by the hangar and the Pilot pane */
function crewCards(){return '<div class="crew">'+CREW.map(c=>{const k=c[0],lv=prog.crew[k]||0,cost=crewCost(k),maxed=lv>=5,poor=prog.sl<cost,off=maxed||poor||!careerOn;
  return '<div class="crc"><b>'+c[1]+'</b><p>'+c[2]+'</p><div class="pips" role="img" aria-label="Level '+lv+' of 5">'+[1,2,3,4,5].map(n=>'<i'+(n<=lv?' class="on"':'')+'></i>').join('')+'</div>'+
    '<button type="button" class="ghost" data-act="crew" data-k="'+k+'"'+(off?' disabled':'')+'>'+(maxed?'Maxed':fmtN(cost)+' SL')+'</button>'+(!careerOn?'<small>Career only</small>':poor&&!maxed?'<small>Need '+fmtN(cost-prog.sl)+' more SL</small>':'')+'</div>'}).join('')+'</div>'}
/* tech tree: each nation is a small graph; nodes sit in rank columns and hairlines join a node to the one it was researched from */
const TN_W=88,TN_H=60,TN_GX=14,TN_GY=8;
function treeLayout(nk){const ids=Object.keys(NODES).filter(i=>NODES[i].n===nk),pos={};let nr=0;
  const place=(id,row,minC)=>{const c=Math.max(NODES[id].r-1,minC);pos[id]={c,r:row};ids.filter(k=>NODES[k].req===id).sort((a,b)=>NODES[a].r-NODES[b].r).forEach((k,i)=>place(k,i===0?row:nr++,c+1))};   // a child always sits right of its parent
  for(const root of ids.filter(i=>!NODES[i].req||NODES[NODES[i].req].n!==nk))place(root,nr++,0);return pos}
function nodeText(i){const n=NODES[i],st=nodeState(i);return st==='own'?(SL_PRICE[n.r]?'Owned · '+fmtN(SL_PRICE[n.r])+' SL':'Owned'):st==='res'?'Researched · '+fmtN(SL_PRICE[n.r])+' SL':st==='can'?'Research · '+fmtN(RP_COST[n.r])+' RP':'Locked · '+fmtN(RP_COST[n.r])+' RP'}
// the researchable node worth doing next: the cheapest one you can already afford, else the cheapest overall
function nextResearch(){const c=Object.keys(NODES).filter(progResearchable);if(!c.length)return null;const cost=i=>RP_COST[NODES[i].r],ok=c.filter(i=>progPool(NODES[i].req)>=cost(i));return (ok.length?ok:c).sort((a,b)=>cost(a)-cost(b))[0]}
function progRender(){const el=$('hgTree');progWallet();const had=document.activeElement&&el.contains(document.activeElement)?document.activeElement.dataset.id:null;
  if(!careerOn){el.innerHTML='<p class="hgNote">Progression runs in <b>Career mode</b>. Fly sorties to earn Research Points and Silver Lions, research new aircraft down each nation\'s tree, buy them, install modules and train your crew. Bandits are matched to your aircraft\'s battle rating. Free play keeps every aircraft unlocked.</p><div class="row"><button class="primary" data-act="career" type="button">Switch to Career mode</button></div>';return}
  if(!progSel||!NODES[progSel])progSel=AC.id;const nx=nextResearch();
  let h='<p class="hgNote">'+fmtN(prog.sl)+' Silver Lions · '+fmtN(prog.frp)+' free RP · '+prog.sorties+' career sorties. Tap an aircraft; arrow keys move between them.</p><div class="tree">';
  for(const nk in NATIONS){const pos=treeLayout(nk),ids=Object.keys(pos),mc=Math.max(...ids.map(i=>pos[i].c)),mr=Math.max(...ids.map(i=>pos[i].r)),W=(mc+1)*(TN_W+TN_GX)-TN_GX,Hh=(mr+1)*(TN_H+TN_GY)-TN_GY;
    const X=i=>pos[i].c*(TN_W+TN_GX),Y=i=>pos[i].r*(TN_H+TN_GY);
    const lines=ids.filter(i=>NODES[i].req&&pos[NODES[i].req]).map(i=>{const p=NODES[i].req,x1=X(p)+TN_W,y1=Y(p)+TN_H/2,x2=X(i),y2=Y(i)+TN_H/2,m=(x1+x2)/2,on=progRes(i);
      return '<path d="M'+x1+' '+y1+'C'+m+' '+y1+' '+m+' '+y2+' '+x2+' '+y2+'" class="'+(on?'on':progRes(p)?'nx':'')+'"/>'}).join('');
    h+='<div class="tnat" style="--nc:'+NATIONS[nk].c+'"><h4>'+NATIONS[nk].n+'</h4><div class="tgw"><div class="tgrid" style="width:'+W+'px;height:'+Hh+'px"><svg width="'+W+'" height="'+Hh+'" aria-hidden="true">'+lines+'</svg>'+
      ids.map(i=>'<button type="button" class="tn '+nodeState(i)+(i===progSel?' sel':'')+(i===nx?' next':'')+'" data-id="'+i+'" style="left:'+X(i)+'px;top:'+Y(i)+'px;width:'+TN_W+'px;height:'+TN_H+'px" title="'+AC_DEFS[i].name+'"><b>'+AC_DEFS[i].name+'</b><small>'+ROMAN[NODES[i].r]+' · BR '+NODES[i].br.toFixed(1)+'</small><em>'+nodeText(i)+'</em></button>').join('')+'</div></div></div>'}
  h+='</div>'+progDetail(progSel)+'<h4 class="hgSub">Crew training</h4>'+crewCards();
  el.innerHTML=h;if(had){const b=el.querySelector('.tn[data-id="'+had+'"]');if(b)b.focus()}}
// arrow keys move between aircraft by position
$('hgTree').addEventListener('keydown',e=>{const k=e.key;if(['ArrowLeft','ArrowRight','ArrowUp','ArrowDown'].indexOf(k)<0)return;const cur=document.activeElement;if(!cur||!cur.classList.contains('tn'))return;
  const all=[...$('hgTree').querySelectorAll('.tn')],c=cur.getBoundingClientRect(),cx=c.left+c.width/2,cy=c.top+c.height/2,dx=k==='ArrowRight'?1:k==='ArrowLeft'?-1:0,dy=k==='ArrowDown'?1:k==='ArrowUp'?-1:0;let best=null,bs=1e9;
  for(const n of all){if(n===cur)continue;const r=n.getBoundingClientRect(),x=r.left+r.width/2-cx,y=r.top+r.height/2-cy,pr=dx?x*dx:y*dy,sd=dx?Math.abs(y):Math.abs(x);if(pr<4)continue;const sc=pr+sd*2.2;if(sc<bs){bs=sc;best=n}}
  e.preventDefault();if(best)best.focus()});
if(/[?&]test\b/.test(location.search))Object.assign(window.__vs||{},{ldCap,progModResearch,progModBuy,modCost,MODS,prog,progAward,NODES,pickBanditType,redSkill,stockMods});
$('hgTree').addEventListener('click',e=>{const t=e.target.closest('[data-id],[data-act]');if(!t)return;const id=t.dataset.id,act=t.dataset.act;
  if(!act){progSel=id;progRender();return}
  if(act==='career'){$('bMode').click();progRender();return}
  let ok=false;
  if(act==='research')ok=progResearch(id);else if(act==='buy')ok=progBuy(id);else if(act==='crew')ok=progCrew(t.dataset.k);
  else if(act==='use'){AC=AC_DEFS[id];try{localStorage.setItem('viperAC',id)}catch(er){};applyAC();hgTab('load');return}
  if(ok){if(act==='crew'||act==='buy')applyAC();syncCareerUI();$('hgName').textContent=AC.name}progRender()});
