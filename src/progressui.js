
/* ---------- Tech tree tab in the hangar ---------- */
let progSel=null;
const fmtN=n=>Number(n).toLocaleString('en-US');
const nodeState=id=>progOwned(id)?'own':progRes(id)?'res':progResearchable(id)?'can':'lock';
function progWallet(){$('hgWallet').textContent=careerOn?fmtN(prog.sl)+' SL · '+fmtN(prog.frp)+' free RP':''}
function progDetail(id){
  const n=NODES[id],d=AC_DEFS[id],st=nodeState(id),nat=NATIONS[n.n],req=n.req?AC_DEFS[n.req].name:null,tw=d.T_AB/(d.MASS*G);
  let h='<div class="tdet"><h3>'+d.name+'</h3><p class="hgNote">'+nat.n+' · rank '+ROMAN[n.r]+' · BR '+n.br.toFixed(1)+' · thrust/weight '+tw.toFixed(2)+' · +'+d.gmax+' g · corner '+d.corner+' kt<br>'+d.srFull+' × '+d.srN+' · '+d.mrFull+' × '+d.mrN+'</p>';
  if(st==='own'){h+='<div class="row"><button class="ghost" data-act="use" data-id="'+id+'">Use in hangar</button></div>';
    h+='<table class="hgT"><caption>Modules · '+fmtN(prog.rp[id]||0)+' RP on this aircraft</caption>'+MODS.map(m=>{const c=modCost(id,m),have=hasMod(id,m[0]),lockd=m[4]&&!hasMod(id,m[4]);
      const btn=have?'<b class="ok">Installed</b>':lockd?'<small>needs '+MODS.find(x=>x[0]===m[4])[1]+'</small>':'<button class="ghost" data-act="mod" data-id="'+id+'" data-m="'+m[0]+'"'+(progPool(id)>=c.rp&&prog.sl>=c.sl?'':' disabled')+'>'+fmtN(c.rp)+' RP + '+fmtN(c.sl)+' SL</button>';
      return '<tr><th>'+m[1]+'<small>'+m[3]+'</small></th><td>'+btn+'</td></tr>'}).join('')+'</table>'}
  else if(st==='res'){const c=SL_PRICE[n.r];h+='<div class="row"><button class="primary" data-act="buy" data-id="'+id+'"'+(prog.sl>=c?'':' disabled')+'>Buy · '+fmtN(c)+' SL</button></div><p class="hgNote">Researched. You have '+fmtN(prog.sl)+' Silver Lions.</p>'}
  else if(st==='can'){const c=RP_COST[n.r];h+='<div class="row"><button class="primary" data-act="research" data-id="'+id+'"'+(progPool(n.req)>=c?'':' disabled')+'>Research · '+fmtN(c)+' RP</button></div><p class="hgNote">Paid from the '+fmtN(prog.rp[n.req]||0)+' RP earned in the '+req+' plus '+fmtN(prog.frp)+' free RP.</p>'}
  else h+='<p class="hgNote">Locked: research the '+req+' first.</p>';
  return h+'</div>'}
function progRender(){const el=$('hgTree');progWallet();
  if(!careerOn){el.innerHTML='<p class="hgNote">Progression runs in <b>Career mode</b>. Fly sorties to earn Research Points and Silver Lions, research new aircraft down each nation\'s tree, buy them, install modules and train your crew. Bandits are matched to your aircraft\'s battle rating. Free play keeps every aircraft unlocked.</p><div class="row"><button class="primary" data-act="career" type="button">Switch to Career mode</button></div>';return}
  if(!progSel||!NODES[progSel])progSel=AC.id;
  let h='<p class="hgNote">'+fmtN(prog.sl)+' Silver Lions · '+fmtN(prog.frp)+' free RP · '+prog.sorties+' career sorties. Tap an aircraft.</p><div class="tree">';
  for(const nk in NATIONS){const ids=Object.keys(NODES).filter(i=>NODES[i].n===nk).sort((a,b)=>NODES[a].r-NODES[b].r||(NODES[a].req===NODES[b].req?0:1));
    h+='<div class="tnat" style="--nc:'+NATIONS[nk].c+'"><h4>'+NATIONS[nk].n+'</h4><div class="tnodes">'+ids.map(i=>'<button type="button" class="tn '+nodeState(i)+(i===progSel?' sel':'')+'" data-id="'+i+'"><b>'+AC_DEFS[i].name+'</b><small>'+ROMAN[NODES[i].r]+' · BR '+NODES[i].br.toFixed(1)+'</small></button>').join('')+'</div></div>'}
  h+='</div>'+progDetail(progSel);
  h+='<table class="hgT"><caption>Crew training · Silver Lions</caption>'+CREW.map(c=>{const lv=prog.crew[c[0]]||0;return '<tr><th>'+c[1]+' · level '+lv+' / 5<small>'+c[2]+'</small></th><td>'+(lv>=5?'<b class="ok">Maxed</b>':'<button class="ghost" data-act="crew" data-k="'+c[0]+'"'+(prog.sl>=crewCost(c[0])?'':' disabled')+'>'+fmtN(crewCost(c[0]))+' SL</button>')+'</td></tr>'}).join('')+'</table>';
  el.innerHTML=h}
if(/[?&]test\b/.test(location.search))Object.assign(window.__vs||{},{prog,progAward,NODES,pickBanditType});
$('hgTree').addEventListener('click',e=>{const t=e.target.closest('[data-id],[data-act]');if(!t)return;const id=t.dataset.id,act=t.dataset.act;
  if(!act){progSel=id;progRender();return}
  if(act==='career'){$('bMode').click();progRender();return}
  let ok=false;
  if(act==='research')ok=progResearch(id);else if(act==='buy')ok=progBuy(id);else if(act==='mod')ok=progMod(id,t.dataset.m);else if(act==='crew')ok=progCrew(t.dataset.k);
  else if(act==='use'){AC=AC_DEFS[id];try{localStorage.setItem('viperAC',id)}catch(er){};applyAC();hgTab('load');return}
  if(ok){if(act==='mod'||act==='crew'||act==='buy')applyAC();syncCareerUI();$('hgName').textContent=AC.name}progRender()});
