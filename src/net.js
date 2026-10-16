/* ---------------- sortie recorder for the debrief ---------------- */
const REC={t:0,acc:0,frames:[],events:[],msl:new Map()}; let mslSeq=0;
function recReset(){REC.t=0;REC.acc=0;REC.frames=[];REC.events=[];REC.msl=new Map();mslSeq=0}
function fmtT(t){t=Math.max(0,t|0);return Math.floor(t/60)+':'+String(t%60).padStart(2,'0')}
function recEvent(text){REC.events.push({t:REC.t,text})}
function tgtLabel(t){if(!t)return 'nothing (no lock)';if(t.kind==='sam')return 'a SAM site';if(t===P)return 'you';if(t.kind==='bomber')return 'a bomber';if(t.kind==='transport')return 'the C-130';if(t.team==='blue')return 'your wingman';return 'bandit '+t.id+' ('+(AC_DEFS[t.type]?AC_DEFS[t.type].name:'?')+')'}
function recLaunch(m,who,target){m.rid=++mslSeq;
  REC.msl.set(m.rid,{id:m.rid,t:REC.t,who,name:m.name,target:tgtLabel(target),res:null,why:''});
  recEvent(who+' fired '+m.name+' at '+tgtLabel(target))}
function recMsl(m,res,why){const r=REC.msl.get(m.rid);if(!r||r.res)return;r.res=res;r.why=why;r.tEnd=REC.t;lessonMissile(r);
  recEvent(r.who+"'s "+r.name+' → '+r.target+': '+(res==='HIT'?'HIT':'MISSED ('+why.toLowerCase()+')'))}
function recTick(dt){
  if(state!=='play'&&state!=='dead')return;
  REC.t+=dt; REC.acc+=dt; if(REC.acc<.25)return; REC.acc=0;
  const f={t:REC.t,p:P.alive?[P.pos.x,P.pos.z]:null,e:[],f:[],m:[]};
  for(const e of enemies)if(e.alive)f.e.push([e.id,e.pos.x,e.pos.z,e.kind]);
  for(const g of ground)if(g.alive)f.e.push([g.id,g.pos.x,g.pos.z,g.kind]);
  for(const x of friends)if(x.alive)f.f.push([x.id,x.pos.x,x.pos.z,x.kind]);
  for(const m of missiles)if(m.on)f.m.push([m.rid,m.m.position.x,m.m.position.z,'blue']);
  for(const m of eMissiles)if(m.on)f.m.push([m.rid,m.m.position.x,m.m.position.z,m.team]);
  REC.frames.push(f); if(REC.frames.length>3600)REC.frames.shift();
}
/* ---------------- online dogfight (room capability) ----------------
   Everything travels in presence (no event topics), so anyone who can open the page can play.
   Each pilot simulates their own jet and missiles. Shooters claim hits; the victim applies them. */
let roomApi=null, userApi=null, dbApi=null;
const capsReady=(async()=>{try{if(!window.claude||!window.claude.use)return;
  [roomApi,userApi,dbApi]=await Promise.all([claude.use('room'),claude.use('user'),claude.use('db')])}catch(e){}})();
const NET={room:null,active:false,code:'arena',me:null,count:1,remotes:new Map(),known:new Set(),seenHits:new Set(),roster:new Map(),names:new Map(),myName:'',
  mode:'TEAMS',teamPref:'A',team:'B',kills:0,deaths:0,
  hitSeq:0,hits:[],pend:new Map(),sendT:0,lastHitBy:null,tracerT:0};
const ghostMsl=new Map();
const ghostPool=makePool(16,mslGeo,new THREE.MeshStandardMaterial({color:0xcfc6b8,flatShading:true}));
try{NET.mode=localStorage.getItem('vsNetMode')||'TEAMS';NET.teamPref=localStorage.getItem('vsTeam')||'A'}catch(e){}
const TEAMN={B:'Blue',R:'Red'};
// auto team: join whichever side has fewer pilots
function pickTeam(){if(NET.teamPref!=='A')return NET.teamPref;let b=0,r=0;for(const [pe,x] of NET.roster)if(pe!==NET.me&&x.md==='TEAMS'){if(x.tm==='B')b++;else if(x.tm==='R')r++}return b<=r?'B':'R'}
const isMate=pr=>NET.mode==='TEAMS'&&pr.md==='TEAMS'&&pr.tm===NET.team;
function myPresence(extra){return Object.assign({ac:AC.id,md:NET.mode,tm:NET.mode==='TEAMS'?NET.team:null,sk:NET.kills,sd:NET.deaths,a:0},extra||{})}
// lobby: join the room from the menu so you can see who's there before launching
async function netLobby(){
  if(mission!=='ONLINE'||state!=='menu'&&state!=='over')return; await capsReady; if(!roomApi){$('lobNote').textContent='Online play only works inside the Claude app.';renderRoster();return}
  const code=roomName(); try{
    if(NET.room&&NET.room.name!=='vs-'+code){await NET.room.leave().catch(()=>{});NET.room=null;NET.roster.clear()}
    if(!NET.room){NET.room=await roomApi.join('vs-'+code);NET.room.onPeers(netPeers,()=>{NET.room=null})}
    NET.team=pickTeam(); await NET.room.presence(myPresence()); netPeers({peers:NET.room.peers(),joined:[],left:[],updated:[]})}catch(e){$('lobNote').textContent='Could not join the room.'}}
function rosterRows(){const rows=[];for(const [peer,x] of NET.roster){rows.push({peer,me:peer===NET.me,name:peer===NET.me?(NET.myName||'You')+' (you)':(NET.names.get(x.by)||'Pilot'),ac:x.ac,tm:x.md==='TEAMS'?x.tm:null,k:x.sk||0,d:x.sd||0,st:x.a?'flying':'lobby'})}
  rows.sort((a,b)=>(a.tm||'Z').localeCompare(b.tm||'Z')||b.k-a.k);return rows}
function sbHtml(){const rows=rosterRows();let tb=0,tr=0;for(const r of rows){if(r.tm==='B')tb+=r.k;if(r.tm==='R')tr+=r.k}
  const esc=t=>String(t).replace(/[&<>"]/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;'})[c]);
  let h='<tr><th>Pilot</th><th>Jet</th><th>Team</th><th>K</th><th>D</th><th></th></tr>';
  for(const r of rows)h+=`<tr class="${r.me?'me':''}"><td>${esc(r.name)}</td><td>${esc(AC_DEFS[r.ac]?AC_DEFS[r.ac].name:'—')}</td><td class="${r.tm==='B'?'tB':r.tm==='R'?'tR':''}">${r.tm?TEAMN[r.tm]:'FFA'}</td><td>${r.k}</td><td>${r.d}</td><td>${r.st}</td></tr>`;
  if(rows.some(r=>r.tm))h+=`<tr><td colspan="6"><span class="tB">Blue ${tb}</span> · <span class="tR">Red ${tr}</span></td></tr>`;
  return h}
function renderRoster(){const h=sbHtml();$('lobTbl').innerHTML=h;if(!$('sbBox').hidden)$('sbTbl').innerHTML=h;$('lobRoom').textContent=NET.code||roomName()}
function jettTanks(){if(!(AC.tanks>0)||P.tanksGone||state!=='play')return;P.tanksGone=true;
  const drop=(AC.tanks*AC.tankFuel/AC.tanks)||0, left=Math.max(0,P.fuel-AC.intFuel); P.fuel=Math.min(P.fuel,AC.intFuel); P.jettKg=(AC.tanks*(JET_HP[AC.id].tankKg*.14))+0*left;
  playerJet.traverse(o=>{if(/^tk_/.test(o.name)){o.visible=false;const w=new V3();o.getWorldPosition(w);puff(w.x,w.y,w.z,0,-10,0,.6,.6,.6,.4,3,4,.6)}});
  setGear(P.gear);message('TANKS JETTISONED',1.2);$('cJett').hidden=true}
$('cJett').addEventListener('pointerdown',e=>{e.preventDefault();jettTanks()});
$('bSortie').addEventListener('click',()=>{const k=Object.keys(CAMP_SORTIES);campSortie=k[(k.indexOf(campSortie)+1)%k.length];try{localStorage.setItem('vsCampSortie',campSortie)}catch(e){};renderCamp()});
$('bCampReset').addEventListener('click',()=>{if(!$('bCampReset').dataset.sure){$('bCampReset').dataset.sure='1';$('bCampReset').textContent='Tap again to reset';setTimeout(()=>{delete $('bCampReset').dataset.sure;$('bCampReset').textContent='New campaign'},2500);return}camp=campNew();campSave();renderCamp()});
$('bSb').addEventListener('click',()=>{$('sbBox').hidden=!$('sbBox').hidden;renderRoster()});
$('bNetMode').addEventListener('click',()=>{NET.mode=NET.mode==='TEAMS'?'FFA':'TEAMS';try{localStorage.setItem('vsNetMode',NET.mode)}catch(e){};setMenuLabels();netLobby()});
$('bTeam').addEventListener('click',()=>{NET.teamPref=({A:'B',B:'R',R:'A'})[NET.teamPref];try{localStorage.setItem('vsTeam',NET.teamPref)}catch(e){};setMenuLabels();netLobby()});
function roomName(){const v=(($('roomCode').value||'arena').toLowerCase().replace(/[^a-z0-9_.-]/g,'').slice(0,24))||'arena';$('roomCode').value=v;return v}
function netStop(){NET.active=false;if(NET.room)NET.room.presence({a:0,m:[],h:[]}).catch(()=>{});
  for(const r of NET.remotes.values())if(r.obj)scene.remove(r.obj);NET.remotes.clear();for(const g of ghostMsl.values())kill(g);ghostMsl.clear()}
async function netStart(){
  netStop(); NET.code=roomName(); NET.active=true; NET.hits=[]; NET.pend.clear(); NET.lastHitBy=null;
  // spawn somewhere on a 9 km ring around the arena centre, facing in
  NET.team=pickTeam(); const a=NET.mode==='TEAMS'?(NET.team==='B'?Math.PI:0)+rand(-.5,.5):Math.random()*Math.PI*2; P.pos.set(Math.sin(a)*9000,rand(4500,6500),Math.cos(a)*9000);
  playerJet.lookAt(0,P.pos.y,0); axes(P); P.vel.copy(P.fwd).multiplyScalar(240); qPrev.copy(playerJet.quaternion); camSnap=true;
  await capsReady;
  if(!roomApi){message('ONLINE ONLY WORKS INSIDE THE CLAUDE APP · FLYING SOLO',3.5);return}
  try{
    if(NET.room&&NET.room.name!=='vs-'+NET.code){await NET.room.leave().catch(()=>{});NET.room=null}
    if(!NET.room){NET.room=await roomApi.join('vs-'+NET.code);NET.room.onPeers(netPeers,()=>{NET.room=null})}
    netPeers({peers:NET.room.peers(),joined:NET.room.peers(),left:[],updated:[]});
    message('ONLINE · ROOM '+NET.code.toUpperCase()+(NET.mode==='TEAMS'?' · TEAM '+TEAMN[NET.team].toUpperCase():' · FREE FOR ALL'),3); $('bSb').hidden=false;
  }catch(e){NET.room=null;message('COULD NOT JOIN THE ROOM · FLYING SOLO',2.5)}
}
function netPeers(ch){
  let n=0;
  NET.roster.clear();
  for(const p of ch.peers){if(p.sameTab)NET.me=p.peer; if(p.presence&&p.presence.ac&&p.presence.a)n++;
    if(p.presence&&p.presence.ac){NET.roster.set(p.peer,Object.assign({by:p.by},p.presence));
      if(p.by&&!NET.names.has(p.by)&&userApi){NET.names.set(p.by,'');userApi.profiles([p.by]).then(ps=>{const nm=(ps[p.by]&&ps[p.by].name)||'Pilot';NET.names.set(p.by,nm);if(p.sameTab)NET.myName=nm;renderRoster()}).catch(()=>{})}}}
  renderRoster();
  NET.count=Math.max(1,n);
  for(const p of ch.left)netRemove(p.peer,false);
  for(const p of [...ch.joined,...ch.updated])if(!p.sameTab)netRemote(p);
}
function netRemove(peer,boom){const r=NET.remotes.get(peer);if(r){if(r.alive&&boom)explode(r.pos,true);r.alive=false;scene.remove(r.obj);NET.remotes.delete(peer);friends=friends.filter(f=>f!==r)}
  for(const [k,g] of ghostMsl)if(k.startsWith(peer+':')){kill(g);ghostMsl.delete(k)}}
function netRemote(p){
  const pr=p.presence||{};
  const first=!NET.known.has(p.peer); NET.known.add(p.peer);
  if(first)for(const h of (pr.h||[]))NET.seenHits.add(p.peer+':'+h[0]);   // old claims from before we arrived
  if(!NET.active||!(state==='play'||state==='dead'||state==='paused'))return;
  let r=NET.remotes.get(p.peer);
  if(!pr.ac||!AC_DEFS[pr.ac]||!pr.a){
    if(r&&r.alive){if(pr.k===NET.me&&!r.mate){kills++;NET.kills++;score+=300;message('SPLASH · '+(r.name||'PILOT').toUpperCase(),1.8);recEvent('You shot down '+(r.name||'another pilot')+' ('+AC_DEFS[r.type].name+')')}
      else recEvent((r.name||'A pilot')+' went down');netRemove(p.peer,true)}
    return;
  }
  const mate=isMate(pr);
  if(!r||r.type!==pr.ac||!!r.mate!==mate){
    if(r)netRemove(p.peer,false);
    const obj=tmpl(mate?'blue':'red',pr.ac).clone(); scene.add(obj);
    r=Object.assign(newJet(obj,9,AC_DEFS[pr.ac]),{team:mate?'blue':'red',mate,type:pr.ac,kind:'fighter',remote:true,peer:p.peer,hp:100,alive:true,id:nextId(),
      tgt:null,lockT:0,flareCd:0,chaffCd:0,cmDrop:null,fl:pr.fl||0,ch:pr.ch||0,name:'',netP:new V3(),netV:new V3(),netQ:new THREE.Quaternion(),netT:0,mode:''});
    r.pos.fromArray(pr.p||[0,5000,0]);
    NET.remotes.set(p.peer,r); (mate?friends:enemies).push(r);
    if(userApi&&p.by)userApi.profiles([p.by]).then(ps=>{r.name=(ps[p.by]&&ps[p.by].name)||''}).catch(()=>{});
    recEvent((p.by?'A pilot':'A pilot')+' joined in a '+AC_DEFS[pr.ac].name);
  }
  r.netP.fromArray(pr.p||[0,0,0]); r.netV.fromArray(pr.v||[0,0,0]); if(pr.q)r.netQ.fromArray(pr.q); r.netT=performance.now();
  r.n=pr.n||1; r.gun=!!pr.g; r.lockMe=!!NET.me&&pr.l===NET.me; r.tgt=r.lockMe?P:null; r.lockT=r.lockMe?1:0; r.ecmOn=!!pr.e;
  if((pr.fl||0)>r.fl){r.cmDrop={t:clock,type:'flare'};aiDispense(r,'flare')} if((pr.ch||0)>r.ch){r.cmDrop={t:clock,type:'chaff'};aiDispense(r,'chaff')}
  r.fl=pr.fl||0; r.ch=pr.ch||0;
  // hits other pilots claim on me
  for(const h of (pr.h||[])){const key=p.peer+':'+h[0]; if(NET.seenHits.has(key))continue; NET.seenHits.add(key);
    if(h[1]===NET.me&&state==='play'&&P.alive&&!(r&&r.mate)){const dmg=clamp(+h[2]||0,0,120);P.hp-=dmg;   // claims are client-reported, so bound what one claim can do
    hurtT=dmg>40?.8:.35;shake=dmg>40?1.2:.4;sndHit();buzz(dmg>40?[120,60,200]:40);
      NET.lastHitBy=p.peer; if(dmg>40){message('MISSILE HIT',1.2);damageSystem(2)}else if(Math.random()<.1)damageSystem(1);
      if(P.hp<=0)die(dmg>40?'missile':'shot')}}
  // their missiles in flight
  const live=new Set();
  for(const mm of (pr.m||[])){const key=p.peer+':'+mm[0]; live.add(key); let g=ghostMsl.get(key);
    if(!g){g=take(ghostPool);g.on=true;g.m.visible=true;g.mawsWarned=false;g.mawSeen=-99;ghostMsl.set(key,g);
      if(mm[8]===NET.me&&mm[1]==='120'){message('MISSILE LAUNCH',1.6);buzz([60,50,60])}}
    g.type=mm[1]; g.m.position.set(mm[2],mm[3],mm[4]); g.vel.set(mm[5],mm[6],mm[7]); g.tgt=mm[8]; g.burn=!!mm[9]; g.t0=performance.now();}
  for(const [k,g] of ghostMsl)if(k.startsWith(p.peer+':')&&!live.has(k)){explode(g.m.position,false);kill(g);ghostMsl.delete(k)}
}
function netClaimHit(t,dmg,how){NET.pend.set(t.peer,(NET.pend.get(t.peer)||0)+dmg); if(how!=='GUNS')message('HIT · '+(t.name||'PILOT').toUpperCase(),1)}
function updateNet(dt){
  if(!NET.active)return;
  const now=performance.now();
  for(const r of NET.remotes.values()){ if(!r.alive)continue;
    const age=Math.min(.6,(now-r.netT)/1000); _s1.copy(r.netP).addScaledVector(r.netV,age);
    if(r.pos.distanceTo(_s1)>400)r.pos.copy(_s1); else r.pos.lerp(_s1,1-Math.exp(-dt*10));
    r.vel.copy(r.netV); r.obj.quaternion.slerp(r.netQ,1-Math.exp(-dt*10)); axes(r);
    const at=atm(r.pos.y),v=r.vel.length(); r.mach=v/at.a; r.kcas=v*Math.sqrt(at.sig)*1.944;
    if(r.gun&&clock-NET.tracerT>.07){NET.tracerT=clock;const b=take(eBullets);b.on=true;b.life=1.2;b.m.visible=true;b.team='ghost';
      b.m.position.copy(r.pos).addScaledVector(r.fwd,9);b.vel.copy(r.vel).addScaledVector(r.fwd,AC_DEFS[r.type].muzzle);b.m.quaternion.setFromUnitVectors(ZF,r.fwd)}}
  for(const g of ghostMsl.values()){const p=g.m.position;p.addScaledVector(g.vel,dt);g.m.quaternion.setFromUnitVectors(ZF,_s2.copy(g.vel).normalize());
    if(g.burn)puff(p.x,p.y,p.z,rand(-3,3),rand(-3,3),rand(-3,3),.85,.85,.87,.55,3,9,1.6)}
  // my state out ~12 times a second
  NET.sendT-=dt; if(NET.sendT>0||!NET.room)return; NET.sendT=1/12;
  for(const [peer,d] of NET.pend){NET.hits.push([++NET.hitSeq,peer,Math.round(d)])} NET.pend.clear(); if(NET.hits.length>10)NET.hits=NET.hits.slice(-10);
  const r1=x=>Math.round(x*10)/10, q=playerJet.quaternion;
  const msl=[]; for(const m of missiles)if(m.on&&msl.length<8){const pp=m.m.position;
    msl.push([m.rid,m.type,r1(pp.x),r1(pp.y),r1(pp.z),r1(m.vel.x),r1(m.vel.y),r1(m.vel.z),m.target&&m.target.remote?m.target.peer:null,m.t<SPEC[m.type].burn?1:0])}
  const alive=state==='play'&&P.alive;
  NET.room.presence({ac:AC.id,md:NET.mode,tm:NET.mode==='TEAMS'?NET.team:null,sk:NET.kills,sd:NET.deaths,a:alive?1:0,p:[r1(P.pos.x),r1(P.pos.y),r1(P.pos.z)],q:[+q.x.toFixed(4),+q.y.toFixed(4),+q.z.toFixed(4),+q.w.toFixed(4)],
    v:[r1(P.vel.x),r1(P.vel.y),r1(P.vel.z)],n:+P.n.toFixed(1),g:alive&&gunHeld&&P.rounds>0?1:0,
    l:R.stt&&R.stt.remote&&R.sttSrc==='RDR'?R.stt.peer:null,e:CM.ecm?1:0,fl:CM.flDisp||0,ch:CM.chDisp||0,m:msl,h:NET.hits,k:alive?null:NET.lastHitBy}).catch(()=>{});
}
$('roomCode').addEventListener('keydown',e=>e.stopPropagation());

/* ---------------- 3-D replay: the last ~25 s is recorded at 10 Hz; replays the last kill or your death from several cameras ---------------- */
const REC3={buf:[],booms:[],acc:0,lastKill:null,deathT:null};
function rec3Reset(){REC3.buf.length=0;REC3.booms.length=0;REC3.lastKill=null;REC3.deathT=null;REC3.acc=0}
function rec3(dt){
  if(state!=='play'&&state!=='dead')return; REC3.acc+=dt; if(REC3.acc<.1)return; REC3.acc=0;
  const f={t:clock,j:[],m:[]}, J=(id,type,team,obj,ab)=>f.j.push({id,type,team,p:obj.position.toArray(),q:obj.quaternion.toArray(),ab});
  if(P.alive)J('P',AC.id,'blue',playerJet,throttle>.81);
  for(const e of enemies)if(e.alive&&!e.remote)J(e.id,e.kind==='bomber'?'BOMBER':e.type,'red',e.obj,true);
  for(const e of friends)if(e.alive)J(e.id,e.kind==='transport'?'TRANSPORT':e.type,'blue',e.obj,false);
  for(const m of missiles)if(m.on)f.m.push(m.m.position.toArray().concat(m.m.quaternion.toArray()));
  for(const m of eMissiles)if(m.on)f.m.push(m.m.position.toArray().concat(m.m.quaternion.toArray()));
  REC3.buf.push(f); while(REC3.buf.length&&clock-REC3.buf[0].t>26)REC3.buf.shift();
  while(REC3.booms.length&&clock-REC3.booms[0].t>26)REC3.booms.shift()}
let REP=null; const rpMsl=[];
for(let i=0;i<24;i++){const m=new THREE.Mesh(mslGeo,new THREE.MeshStandardMaterial({color:0xeeeeea,flatShading:true}));m.visible=false;m.frustumCulled=false;scene.add(m);rpMsl.push(m)}
const RP_CAMS=['CHASE','ORBIT','MISSILE','FLYBY'];
function canReplay(kill){if(REC3.buf.length<10)return false;if(kill)return !!REC3.lastKill&&REC3.lastKill.t>REC3.buf[0].t+1;return true}
function startReplay(kill){
  if(!canReplay(kill))return;
  const b=REC3.buf, endT=b[b.length-1].t; let from,to,focus,keyT;
  if(kill){keyT=REC3.lastKill.t;from=Math.max(b[0].t,keyT-8);to=Math.min(endT,keyT+3);focus=REC3.lastKill.id}
  else{keyT=REC3.deathT??endT;from=Math.max(b[0].t,keyT-10);to=endT;focus='P'}
  REP={t:from,from,to,keyT,focus,prev:state,view,cam:0,camT:0,manual:false,actors:new Map(),bi:0,boomI:REC3.booms.findIndex(x=>x.t>=from),saved:P.pos.clone(),fly:new V3(),flySet:false,lastFocus:new V3()};
  if(REP.boomI<0)REP.boomI=REC3.booms.length;
  {const f0=b.find(x=>x.t>=from&&x.j.some(j=>j.id===focus)); if(f0){REP.t=Math.max(from,f0.t);REP.lastFocus.fromArray(f0.j.find(j=>j.id===focus).p)} else REP.lastFocus.copy(P.pos)}
  state='replay'; view=0; showOverlay(null); $('ctrls').hidden=true; $('rpBar').hidden=false; resetStick();
  for(const e of enemies)e.obj.visible=false; for(const e of friends)e.obj.visible=false;
  [...missiles,...eMissiles].forEach(m=>m.m.visible=false); camSnap=true; projKey='';
  $('rpLbl').textContent=kill?'KILL REPLAY':'REPLAY'}
function stopReplay(){
  if(!REP)return; for(const a of REP.actors.values())scene.remove(a); rpMsl.forEach(m=>m.visible=false);
  for(const e of enemies)if(e.alive)e.obj.visible=true; for(const e of friends)if(e.alive)e.obj.visible=true;
  [...missiles,...eMissiles].forEach(m=>m.m.visible=m.on);
  P.pos.copy(REP.saved); state=REP.prev; view=REP.view; projKey=''; camSnap=true; $('rpBar').hidden=true;
  showOverlay(state==='paused'?'pause':'over'); REP=null}
$('rpExit').addEventListener('click',stopReplay);
$('bPhoto').addEventListener('click',photoStart); $('phExit').addEventListener('click',photoStop); $('phSnap').addEventListener('click',()=>{photoGrab=true}); $('phClose').addEventListener('click',()=>$('photoShot').hidden=true);
glCanvas.addEventListener('pointerdown',e=>{if(!PHOTO.on)return;PHOTO.drag={x:e.clientX,y:e.clientY,yaw:PHOTO.yaw,p:PHOTO.pitch};glCanvas.setPointerCapture(e.pointerId)});
glCanvas.addEventListener('pointermove',e=>{if(!PHOTO.on||!PHOTO.drag)return;PHOTO.yaw=PHOTO.drag.yaw-(e.clientX-PHOTO.drag.x)*.008;PHOTO.pitch=clamp(PHOTO.drag.p+(e.clientY-PHOTO.drag.y)*.006,-.3,1.4)});
glCanvas.addEventListener('pointerup',()=>{PHOTO.drag=null});
glCanvas.addEventListener('wheel',e=>{if(!PHOTO.on)return;e.preventDefault();PHOTO.dist=clamp(PHOTO.dist*(e.deltaY>0?1.1:.9),12,400)},{passive:false});
{let pd=0;glCanvas.addEventListener('touchmove',e=>{if(!PHOTO.on||e.touches.length<2)return;const d=Math.hypot(e.touches[0].clientX-e.touches[1].clientX,e.touches[0].clientY-e.touches[1].clientY);if(pd)PHOTO.dist=clamp(PHOTO.dist*pd/d,12,400);pd=d},{passive:true});glCanvas.addEventListener('touchend',()=>{pd=0})}
$('rpCam').addEventListener('click',()=>{if(!REP)return;REP.manual=true;REP.cam=(REP.cam+1)%RP_CAMS.length;REP.camT=0;REP.flySet=false});
$('bReplay').addEventListener('click',()=>startReplay(state==='paused'));
function rpActor(j){let a=REP.actors.get(j.id);if(!a){a=tmpl(j.team==='red'?'red':'blue',j.type).clone();scene.add(a);REP.actors.set(j.id,a)}return a}
const _rq1=new THREE.Quaternion(),_rq2=new THREE.Quaternion();
function updateReplay(dt){
  if(!REP)return;
  const slow=Math.abs(REP.t-REP.keyT)<1.4?.35:1; REP.t+=dt*slow; if(REP.t>=REP.to){stopReplay();return}
  const b=REC3.buf; while(REP.bi<b.length-2&&b[REP.bi+1].t<=REP.t)REP.bi++;
  const A=b[REP.bi],B=b[Math.min(REP.bi+1,b.length-1)], u=B.t>A.t?clamp((REP.t-A.t)/(B.t-A.t),0,1):0;
  const seen=new Set(); let focusObj=null;
  for(const ja of A.j){const jb=B.j.find(x=>x.id===ja.id)||ja, a=rpActor(ja); seen.add(ja.id); a.visible=true;
    a.position.fromArray(ja.p).lerp(_a.fromArray(jb.p),u); a.quaternion.slerpQuaternions(_rq1.fromArray(ja.q),_rq2.fromArray(jb.q),u);
    setAB(a,!!ja.ab); if(ja.id===REP.focus)focusObj=a}
  for(const [id,a] of REP.actors)if(!seen.has(id))a.visible=false;
  rpMsl.forEach(m=>m.visible=false);
  A.m.forEach((ma,i)=>{const m=rpMsl[i];if(!m)return;const mb=B.m.length===A.m.length?B.m[i]:ma;m.visible=true;
    m.position.set(ma[0],ma[1],ma[2]).lerp(_a.set(mb[0],mb[1],mb[2]),u);m.quaternion.slerpQuaternions(_rq1.fromArray(ma,3),_rq2.fromArray(mb,3),u);
    if(Math.random()<.8)puff(m.position.x,m.position.y,m.position.z,rand(-2,2),rand(-2,2),rand(-2,2),.88,.88,.9,.5,3,9,1.4)});
  while(REP.boomI<REC3.booms.length&&REC3.booms[REP.boomI].t<=REP.t){const x=REC3.booms[REP.boomI++];explode(_a.fromArray(x.p).clone(),x.big,true)}
  if(focusObj)REP.lastFocus.copy(focusObj.position);
  const fp=REP.lastFocus; P.pos.copy(fp);   // terrain, water and clouds follow the action
  // cameras
  REP.camT+=dt; if(!REP.manual&&REP.camT>3.4){REP.cam=(REP.cam+1)%RP_CAMS.length;REP.camT=0;REP.flySet=false}
  let mode=RP_CAMS[REP.cam];
  let near=null,nd=7000; if(mode==='MISSILE')for(const m of rpMsl)if(m.visible){const d=m.position.distanceTo(fp);if(d<nd){nd=d;near=m}}
  if(mode==='MISSILE'&&!near)mode='ORBIT';
  camera.up.set(0,1,0);
  if(mode==='CHASE'&&focusObj){_b.set(0,0,1).applyQuaternion(focusObj.quaternion);_c.set(0,1,0).applyQuaternion(focusObj.quaternion);
    camera.position.copy(fp).addScaledVector(_b,-38).addScaledVector(_c,9);camera.up.copy(_c);camera.lookAt(_d.copy(fp).addScaledVector(_b,30))}
  else if(mode==='ORBIT'){const a=REP.t*.45;camera.position.set(fp.x+Math.sin(a)*70,fp.y+18,fp.z+Math.cos(a)*70);camera.lookAt(fp)}
  else if(mode==='MISSILE'){_b.set(0,0,1).applyQuaternion(near.quaternion);camera.position.copy(near.position).addScaledVector(_b,-14).add(_c.set(0,2.5,0));camera.lookAt(fp)}
  else {if(!REP.flySet){REP.flySet=true;_b.set(0,0,1).applyQuaternion(focusObj?focusObj.quaternion:camera.quaternion);REP.fly.copy(fp).addScaledVector(_b,180).add(_c.set(rand(-40,40),rand(5,25),rand(-40,40)))}
    camera.position.copy(REP.fly);camera.lookAt(fp)}
  {const gh=Math.max(groundH(camera.position.x,camera.position.z),0)+4;if(camera.position.y<gh)camera.position.y=gh}
  playerJet.visible=false; jetShadow.visible=false;
  $('rpLbl').textContent=(REP.prev==='paused'?'KILL REPLAY':'REPLAY')+' · '+mode+(slow<1?' · SLOW-MO':'')}

/* ---------------- career: pilot record saved per person ---------------- */
const RANKS=[[0,'2nd Lt'],[1500,'1st Lt'],[4000,'Captain'],[8000,'Major'],[15000,'Lt Col'],[25000,'Colonel']];
const UNLOCK={F16:0,GRIPEN:0,MIG29:0,SU27:1,MIG29UPG:1,F15C:1,J10C:2,F16B70:2,RAFALE:3,GRIPENE:3,TYPHOON:4,MIG35:4,F15EX:5,SU35:5,J20:5,FA18E:2,MIG29K:2,SU33:3};
const DIFF_XP={ROOKIE:.5,REGULAR:1,VETERAN:1.5,ACE:2};
let career={xp:0,sorties:0,kills:0,deaths:0,wins:0}, careerOn=false, careerDoc=null, lastAward=null;
try{careerOn=localStorage.getItem('viperMode')==='career';const c=JSON.parse(localStorage.getItem('viperCareer')||'null');if(c&&typeof c.xp==='number')career=Object.assign(career,c)}catch(e){}
const rankIdx=xp=>{let i=0;RANKS.forEach((r,j)=>{if(xp>=r[0])i=j});return i};
const unlocked=id=>!careerOn||progOwned(id);
progMigrate();
(async()=>{await capsReady; try{if(!dbApi||!userApi)return; const id=await userApi.id(); if(!id)return;
  careerDoc=dbApi.doc('data/users/'+id+'/career'); const snap=await careerDoc.get();
  if(snap.exists){const d=snap.data(); if(d&&typeof d.xp==='number'&&d.xp>=career.xp){career=Object.assign({},career,d);syncCareerUI()}}}catch(e){careerDoc=null}})();
function saveCareer(){try{localStorage.setItem('viperCareer',JSON.stringify(career))}catch(e){}
  if(careerDoc)careerDoc.set({...career}).catch(()=>{careerDoc=null})}
function syncCareerUI(){
  $('bMode').textContent='Mode: '+(careerOn?'Career':'Free play');
  const pc=$('pilotCard'); pc.hidden=!careerOn; if(!careerOn)return;
  const ri=rankIdx(career.xp), nx=RANKS[ri+1], nextJet=Object.keys(UNLOCK).find(k=>UNLOCK[k]===ri+1);
  pc.innerHTML='';const b=document.createElement('b');b.textContent=RANKS[ri][1];pc.appendChild(b);
  pc.appendChild(document.createTextNode(` · ${career.xp.toLocaleString()} XP · ${career.kills} kill${career.kills===1?'':'s'} · ${career.wins} mission${career.wins===1?'':'s'} won · ${career.sorties} sortie${career.sorties===1?'':'s'}`+
    ` · ${prog.sl.toLocaleString()} SL · ${prog.frp.toLocaleString()} free RP · Hangar > Tech tree to research and buy`));
  if(!unlocked(AC.id)){AC=AC_DEFS[PROG_START.find(unlocked)||'F4E'];applyAC()}
}
function careerAward(){
  lastAward=null; if(!careerOn||deathCause==='abort'&&missionT<20)return;
  const win=deathCause==='win', before=rankIdx(career.xp);
  const mult=mission==='ONLINE'?1.5:mission==='TRAINING'?.3:DIFF_XP[difficulty];
  const pm=PRESETS[preset].reward, lines=[['Sortie',50],['Kills and score',score],['Mission win',win?1000:0],['Survival',P.alive?250:0],['Rescue',!P.alive&&P.rescued?120:0]].map(l=>[l[0],Math.round(l[1]*mult)]);
  const xp=Math.round((50+score+(win?1000:0)+(P.alive?250:P.rescued?120:0))*mult*pm);   // 50 for flying the sortie; the preset multiplies the lot
  {const d=xp-lines.reduce((a,l)=>a+l[1],0);if(pm===1)lines[1][1]+=d;else if(d)lines.push(['Preset ×'+pm.toFixed(1),d])}   // lines always add up to xp
  career.xp+=xp;career.sorties++;career.kills+=kills;if(!P.alive&&!P.rescued)career.deaths++;if(win)career.wins++;
  const after=rankIdx(career.xp), newJets=Object.keys(UNLOCK).filter(k=>UNLOCK[k]>before&&UNLOCK[k]<=after).map(k=>AC_DEFS[k].name);
  const pg=progAward(xp,win,kills,P.alive||!!P.rescued,!!P.rescued,lines.filter(l=>l[1]));
  const dt=[dailyAdd('k',kills),dailyAdd('m',missionT/60)].filter(Boolean);
  lastAward={xp,promoted:after>before?RANKS[after][1]:null,newJets:[],prog:pg,daily:dt};
  saveCareer(); syncCareerUI();
}
$('bMode').addEventListener('click',()=>{careerOn=!careerOn;try{localStorage.setItem('viperMode',careerOn?'career':'free')}catch(e){};syncCareerUI()});

/* ---------------- hooks filled in by later systems ---------------- */
function buzz(p){try{if(hapticsOn&&navigator.vibrate)navigator.vibrate(p)}catch(e){}}
let hapticsOn=true;
function updateCombat(dt){
  for(const e of enemies) if(e.alive&&!e.remote) updateAI(e,dt);
  updateNet(dt); updateGround(dt); updateTanker(dt); updateAG(dt); updateGCI(dt);
  for(const f of friends) if(f.alive&&!f.remote) updateAI(f,dt);
  updateWeapons(dt);
  updateCM(dt);
  updateEnemyMissiles(dt);
  enemies=enemies.filter(e=>e.alive);
  updateMission(dt);
  recTick(dt);
}

