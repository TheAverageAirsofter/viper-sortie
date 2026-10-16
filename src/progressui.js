
/* ---------- Tech tree tab in the hangar ---------- */
let progSel=null;
const fmtN=n=>Number(n).toLocaleString('en-US');
const nodeState=id=>!careerOn||progOwned(id)?'own':progRes(id)?'res':progResearchable(id)?'can':'lock';
function progWallet(){$('hgWallet').textContent=careerOn?fmtN(prog.sl)+' SL · '+fmtN(prog.frp)+' free RP':''}
function progDetail(id){
  const n=NODES[id],d=AC_DEFS[id],st=nodeState(id),nat=NATIONS[n.n],req=n.req?AC_DEFS[n.req].name:null,tw=d.T_AB/(d.MASS*G);
  let h='<div class="tdet" title="'+nat.n+' · rank '+ROMAN[n.r]+' · BR '+n.br.toFixed(1)+'"><h3>'+d.name+'</h3><p class="hgNote">'+nat.n+' · rank '+ROMAN[n.r]+' · BR '+n.br.toFixed(1)+' · thrust/weight '+tw.toFixed(2)+' · +'+d.gmax+' g · corner '+d.corner+' kt<br>'+d.srFull+' × '+d.srN+' · '+d.mrFull+' × '+d.mrN+'</p>';
  if(st==='own'){const cur=id===AC.id;h+='<div class="row"><button class="primary" data-act="use" data-id="'+id+'"'+(cur?' disabled':'')+'>'+(cur?'Selected':'Select aircraft')+'</button></div>';
    h+=careerOn?'<p class="hgNote">'+MODS.filter(m=>hasMod(id,m[0])).length+' of '+MODS.length+' modules installed. Open the Mods tab to research more.</p>':'<p class="hgNote">Free play: every aircraft is unlocked with all modules.</p>'}
  else if(st==='res'){const c=SL_PRICE[n.r];h+='<div class="row"><button class="primary" data-act="buy" data-id="'+id+'"'+(prog.sl>=c?'':' disabled')+'>Buy · '+fmtN(c)+' SL</button></div><p class="hgNote">Researched. You have '+fmtN(prog.sl)+' Silver Lions.</p>'}
  else if(st==='can'){const c=RP_COST[n.r];h+='<div class="row"><button class="primary" data-act="research" data-id="'+id+'"'+(progPool(n.req)>=c?'':' disabled')+'>Research · '+fmtN(c)+' RP</button></div><p class="hgNote">Paid from the '+fmtN(prog.rp[n.req]||0)+' RP earned in the '+req+' plus '+fmtN(prog.frp)+' free RP.</p>'}
  else h+='<p class="hgNote">Locked: research the '+req+' first.</p>';
  return h+'</div>'}
/* Mods tab: modules for the aircraft in the hangar, grouped by family. Research costs RP earned in this aircraft (or free RP), then the module is bought with Silver Lions. */
function modsRender(){const el=$('hgMods'),id=AC.id;progWallet();
  if(!careerOn){el.innerHTML='<p class="hgNote">Modifications belong to <b>Career mode</b>: a stock aircraft flies with penalties and you earn the modules by flying it. Free play gives every aircraft all modules for free.</p><div class="row"><button class="primary" data-act="career">Switch to Career</button></div>';return}
  if(!progOwned(id)){el.innerHTML='<p class="hgNote">Buy this aircraft in the Tech tree first.</p>';return}
  const stock=!hasMod(id,'eng1')||!hasMod(id,'afr1')||!hasMod(id,'cms1')||!hasMod(id,'wpn1');
  let h='<p class="hgNote">'+AC.name+(stock?' is flying in stock condition: -6 % thrust, -10 % roll rate, half the countermeasures, -10 % missile range and agility, no drop tanks and only the basic missile load.':' is fully modified.')+' '+fmtN(prog.rp[id]||0)+' RP earned in this aircraft, '+fmtN(prog.frp)+' free RP, '+fmtN(prog.sl)+' SL.</p><div class="mods">';
  for(const m of MODS){const k=m[0],c=modCost(id,m),have=hasMod(id,k),res=modRes(id,k),lockd=m[4]&&!hasMod(id,m[4]),st=have?'own':res?'res':lockd?'lock':'can';
    let btn;if(have)btn='<b class="ok">Installed</b>';else if(lockd)btn='<small>Needs '+MODS.find(x=>x[0]===m[4])[1]+'</small>';
    else if(res)btn='<button type="button" class="primary" data-act="mbuy" data-m="'+k+'"'+(prog.sl>=c.sl?'':' disabled')+'>Buy '+fmtN(c.sl)+' SL</button>';
    else btn='<button type="button" class="ghost" data-act="mres" data-m="'+k+'"'+(progPool(id)>=c.rp?'':' disabled')+'>Research '+fmtN(c.rp)+' RP</button>';
    h+='<div class="mod '+st+'" data-m="'+k+'"><small>'+m[5]+'</small><b>'+m[1]+'</b><p>'+m[3]+'</p>'+btn+'</div>'}
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
function nodeText(i){const n=NODES[i],st=nodeState(i);if(i===AC.id)return 'In hangar';return st==='own'?(!careerOn?'Unlocked':(SL_PRICE[n.r]?'Owned · '+fmtN(SL_PRICE[n.r])+' SL':'Owned')):st==='res'?'Researched · '+fmtN(SL_PRICE[n.r])+' SL':st==='can'?'Research · '+fmtN(RP_COST[n.r])+' RP':'Locked · '+fmtN(RP_COST[n.r])+' RP'}
// the researchable node worth doing next: the cheapest one you can already afford, else the cheapest overall
function nextResearch(){const c=Object.keys(NODES).filter(progResearchable);if(!c.length)return null;const cost=i=>RP_COST[NODES[i].r],ok=c.filter(i=>progPool(NODES[i].req)>=cost(i));return (ok.length?ok:c).sort((a,b)=>cost(a)-cost(b))[0]}
function progRender(){const el=$('hgTree');progWallet();const had=document.activeElement&&el.contains(document.activeElement)?document.activeElement.dataset.id:null;
  if(!progSel||!NODES[progSel])progSel=AC.id;const nx=nextResearch();
  let h=(careerOn?'<p class="hgNote">'+fmtN(prog.sl)+' Silver Lions · '+fmtN(prog.frp)+' free RP · '+prog.sorties+' career sorties. Tap an aircraft, then Select it; double-tap selects at once. Arrow keys move between them.</p>':
    '<p class="hgNote">Free play: every aircraft is unlocked. Tap an aircraft, then Select it; double-tap selects at once. <button class="ghost" data-act="career" type="button">Switch to Career</button> to research and buy them instead.</p>')+'<div class="tree">';
  for(const nk in NATIONS){const pos=treeLayout(nk),ids=Object.keys(pos),mc=Math.max(...ids.map(i=>pos[i].c)),mr=Math.max(...ids.map(i=>pos[i].r)),W=(mc+1)*(TN_W+TN_GX)-TN_GX,Hh=(mr+1)*(TN_H+TN_GY)-TN_GY;
    const X=i=>pos[i].c*(TN_W+TN_GX),Y=i=>pos[i].r*(TN_H+TN_GY);
    const lines=ids.filter(i=>NODES[i].req&&pos[NODES[i].req]).map(i=>{const p=NODES[i].req,x1=X(p)+TN_W,y1=Y(p)+TN_H/2,x2=X(i),y2=Y(i)+TN_H/2,m=(x1+x2)/2,on=progRes(i);
      return '<path d="M'+x1+' '+y1+'C'+m+' '+y1+' '+m+' '+y2+' '+x2+' '+y2+'" class="'+(on?'on':progRes(p)?'nx':'')+'"/>'}).join('');
    h+='<div class="tnat" style="--nc:'+NATIONS[nk].c+'"><h4>'+NATIONS[nk].n+'</h4><div class="tgw"><div class="tgrid" style="width:'+W+'px;height:'+Hh+'px"><svg width="'+W+'" height="'+Hh+'" aria-hidden="true">'+lines+'</svg>'+
      ids.map(i=>'<button type="button" class="tn '+nodeState(i)+(i===progSel?' sel':'')+(i===AC.id?' cur':'')+(i===nx?' next':'')+'" data-id="'+i+'" style="left:'+X(i)+'px;top:'+Y(i)+'px;width:'+TN_W+'px;height:'+TN_H+'px" title="'+AC_DEFS[i].name+'"><b>'+AC_DEFS[i].name+'</b><small>'+ROMAN[NODES[i].r]+' · BR '+NODES[i].br.toFixed(1)+'</small><em>'+nodeText(i)+'</em></button>').join('')+'</div></div></div>'}
  h+='</div>'+progDetail(progSel)+(careerOn?'<h4 class="hgSub">Crew training</h4>'+crewCards():'');
  el.innerHTML=h;if(had){const b=el.querySelector('.tn[data-id="'+had+'"]');if(b)b.focus()}}
// arrow keys move between aircraft by position
$('hgTree').addEventListener('keydown',e=>{const k=e.key;if(['ArrowLeft','ArrowRight','ArrowUp','ArrowDown'].indexOf(k)<0)return;const cur=document.activeElement;if(!cur||!cur.classList.contains('tn'))return;
  const all=[...$('hgTree').querySelectorAll('.tn')],c=cur.getBoundingClientRect(),cx=c.left+c.width/2,cy=c.top+c.height/2,dx=k==='ArrowRight'?1:k==='ArrowLeft'?-1:0,dy=k==='ArrowDown'?1:k==='ArrowUp'?-1:0;let best=null,bs=1e9;
  for(const n of all){if(n===cur)continue;const r=n.getBoundingClientRect(),x=r.left+r.width/2-cx,y=r.top+r.height/2-cy,pr=dx?x*dx:y*dy,sd=dx?Math.abs(y):Math.abs(x);if(pr<4)continue;const sc=pr+sd*2.2;if(sc<bs){bs=sc;best=n}}
  e.preventDefault();if(best)best.focus()});
if(/[?&]test\b/.test(location.search))Object.assign(window.__vs||{},{ldCap,progModResearch,progModBuy,modCost,MODS,prog,progAward,NODES,pickBanditType});
function progUse(id){if(!AC_DEFS[id]||nodeState(id)!=='own')return;AC=AC_DEFS[id];try{localStorage.setItem('viperAC',id)}catch(er){};progSel=id;applyAC();$('hgName').textContent=AC.name;progRender()}
$('hgTree').addEventListener('dblclick',e=>{const t=e.target.closest('.tn');if(t)progUse(t.dataset.id)});
$('hgTree').addEventListener('click',e=>{const t=e.target.closest('[data-id],[data-act]');if(!t)return;const id=t.dataset.id,act=t.dataset.act;
  if(!act){progSel=id;if(nodeState(id)==='own'&&id!==AC.id){progUse(id);message(AC_DEFS[id].name.toUpperCase()+' SELECTED',1.2);return}progRender();return}
  if(act==='career'){$('bMode').click();progRender();return}
  let ok=false;
  if(act==='research')ok=progResearch(id);else if(act==='buy')ok=progBuy(id);else if(act==='crew')ok=progCrew(t.dataset.k);
  else if(act==='use'){progUse(id);return}
  if(ok){if(act==='crew'||act==='buy')applyAC();syncCareerUI();$('hgName').textContent=AC.name}progRender()});
