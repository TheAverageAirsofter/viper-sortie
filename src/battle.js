/* ---------------- air battle (Domination): two teams, three capture zones, points, and a lineup of jets to respawn into ----------------
   Hold more zones than the enemy and their points drain; every loss costs points too. When your jet is lost the battle keeps running:
   you spectate a team-mate and pick the next jet from your lineup. AI pilots fly to the zone they should take and fight what they meet. */
const BT={on:false,over:false,pts:{blue:0,red:0},zones:[],lineup:[],used:{},pend:{blue:0,red:0},tm:{blue:0,red:0},wpT:0,diedT:0,specI:0,max:300,sp:0};
const btCost=id=>Math.max(2,Math.min(8,Math.round(2+(progBR(id)-1)*.5)));   // spawn points: stronger jets cost more
const btAfford=id=>!BT.used[id]&&btCost(id)<=BT.sp;
const BT_ZONES=[['A',0,14000],['B',-9000,25000],['C',9000,25000]], BT_R=4500, BT_AI={blue:3,red:4};
/* battle conditions: the weather and time of day are rolled at the start and drift during the fight (clear -> cloud -> rain, day -> dusk -> night) */
const BT_WX=['CLEAR','SCATTERED','OVERCAST','RAIN'], BT_TIME=['DAY','DUSK','NIGHT'];
let btDyn=true;try{btDyn=localStorage.getItem('vsDynWx')!=='0'}catch(e){}
function setDynWx(v){btDyn=!!v;try{localStorage.setItem('vsDynWx',v?'1':'0')}catch(e){}}
function btConditions(first){
  if(!btDyn)return;
  if(first){BT.saved={weather,timeOfDay};weather=BT_WX[Math.random()*3|0];timeOfDay=BT_TIME[Math.random()<.6?0:1];BT.cT=0}
  else{const wi=BT_WX.indexOf(weather),ni=clamp(wi+(Math.random()<.55?1:-1),0,3);if(ni!==wi){weather=BT_WX[ni];message('WEATHER · '+WXS[weather].toUpperCase(),2.4)}
    if(BT.cN%2===1&&BT_TIME.indexOf(timeOfDay)<2){timeOfDay=BT_TIME[BT_TIME.indexOf(timeOfDay)+1];message('LIGHT FADING · '+TIMES[timeOfDay].toUpperCase(),2.4)}BT.cN++}
  applyEnv();
}
function btRestoreConditions(){if(BT.saved){weather=BT.saved.weather;timeOfDay=BT.saved.timeOfDay;BT.saved=null;applyEnv()}}
function setupBattle(){
  BT.on=true;BT.online=false;BT.over=false;BT.ground=false;BT.naval=false;BT.ships=null;BT.cN=0;btConditions(true);BT.pts.blue=BT.pts.red=BT.max;BT.pend.blue=BT.pend.red=0;BT.tm.blue=BT.tm.red=0;BT.wpT=0;BT.diedT=0;BT.specI=0;BT.used={};BT.sp=20;
  BT.zones=BT_ZONES.map(([n,x,z])=>({n,x,z,prog:0,own:0}));
  const pool=banditPool().filter(id=>id!==AC.id&&unlocked(id));
  BT.lineup=[AC.id];while(BT.lineup.length<4&&pool.length)BT.lineup.push(pool.splice(Math.random()*pool.length|0,1)[0]);
  BT.used[AC.id]=true;BT.sp=Math.max(0,BT.sp-btCost(AC.id));
  P.pos.set(0,4000,-1500);
  for(let i=0;i<BT_AI.blue;i++)btSpawn('blue',i);
  for(let i=0;i<BT_AI.red;i++)btSpawn('red',i);
  btAssign();sortie=null;
  message('AIR BATTLE · HOLD MORE ZONES THAN THE ENEMY · '+BT.max+' POINTS EACH',3.2);
}
/* online team battle: zones, points and the lineup work on the real pilots. Every client sees the same positions and kills (remote pilots are in friends / enemies),
   so each one integrates the same zone control and kill points locally; no extra messages are needed. Spawn points and respawns are per player. */
const BT_ZONES_ONLINE=[['A',0,0],['B',-9000,0],['C',9000,0]];
function btInitOnline(){
  BT.on=true;BT.online=true;BT.over=false;BT.ground=false;BT.naval=false;BT.ships=null;BT.cN=0;BT.cT=0;
  BT.pts.blue=BT.pts.red=BT.max;BT.pend.blue=BT.pend.red=0;BT.tm.blue=BT.tm.red=0;BT.wpT=0;BT.diedT=0;BT.specI=0;BT.used={};BT.sp=20;
  BT.zones=BT_ZONES_ONLINE.map(([n,x,z])=>({n,x,z,prog:0,own:0}));
  const s=netTeamScore(),me=NET.team||'B';BT.kOld={m:s[me]||0,t:s[me==='B'?'R':'B']||0};
  const pool=banditPool().filter(id=>id!==AC.id&&unlocked(id));
  BT.lineup=[AC.id];while(BT.lineup.length<4&&pool.length)BT.lineup.push(pool.splice(Math.random()*pool.length|0,1)[0]);
  BT.used[AC.id]=true;BT.sp=Math.max(0,BT.sp-btCost(AC.id));
}
/* naval battle: three enemy frigates (SAMs and guns) on the sea; each one alive drains your points, each one sunk drains theirs */
function findSea(cx,cz){for(let r=0;r<20000;r+=700)for(let k=0;k<14;k++){const x=cx+Math.cos(k*.45)*r,z=cz+Math.sin(k*.45)*r;if(groundH(x,z)<-4)return [x,z]}return [cx,cz]}
function setupNaval(){
  setupBattle();BT.naval=true;BT.zones=[];BT.ships=[];
  [[-8000,26000],[0,32000],[8000,26000]].forEach(([x,z],i)=>{const [sx,sz]=findSea(x,z),g=spawnGround('ship',sx,sz,true);g.orbit={c:new V3(sx,0,sz),r:700+i*200,a:Math.random()*6.28};g.spd=7;BT.ships.push(g)});
  btAssign();message('NAVAL BATTLE · SINK THE FRIGATES · EACH ONE AFLOAT BLEEDS YOUR POINTS',3.4);
  if(AC.carrier)placeOnCarrier();   // carrier jets launch from the deck
}
const btShipsLeft=()=>BT.ships?BT.ships.filter(g=>g.alive).length:0;
function btSpawn(team,i){
  const pool=banditPool(),type=pool[Math.random()*pool.length|0],s=team==='blue'?-1:1;
  const pos=new V3((i-1)*1800+rand(-600,600),rand(3800,5200),team==='blue'?-1500-i*500:36000+i*500);
  const e=spawnFighter(team,type,pos,new V3(0,pos.y,team==='blue'?30000:0),{speed:rand(220,250)});
  e.cmd='ENGAGE';e.engaged=true;e.bombs=0;e.btAI=true;if(team==='blue')e.cs=2+i;return e;
}
// each AI jet flies to the nearest zone its side does not hold yet (or the contested one)
function btAssign(){
  if(BT.naval){
    for(const e of friends){if(!e.alive||e.kind!=='fighter')continue;let best=null,bd=1e9;for(const g of BT.ships||[]){if(!g.alive)continue;const d=Math.hypot(g.pos.x-e.pos.x,g.pos.z-e.pos.z);if(d<bd){bd=d;best=g}}e.wp=best?new V3(best.pos.x,4500,best.pos.z):null}
    for(const e of enemies){if(e.alive&&e.kind==='fighter')e.wp=new V3(0,4500,0)}   // the red jets press on to your base
    return}
  for(const team of ['blue','red']){
    const own=team==='blue'?1:-1,load=new Map();
    for(const e of team==='blue'?friends:enemies){
      if(!e.alive||e.kind!=='fighter')continue;
      // nearest zone the side does not hold yet; each jet already sent there makes it less attractive, so the flight spreads out
      let best=null,bd=1e9;for(const z of BT.zones){const d=Math.hypot(z.x-e.pos.x,z.z-e.pos.z)+(z.own===own?9000:0)+(load.get(z)||0)*7000;if(d<bd){bd=d;best=z}}
      if(best)load.set(best,(load.get(best)||0)+1);
      e.wp=best?new V3(best.x,Math.max(2500,Math.min(5500,e.pos.y)),best.z):null;
    }
  }
}
const btAlive=team=>(team==='blue'?friends:enemies).filter(e=>e.alive&&e.kind==='fighter'&&e.btAI).length;
function btLoss(team,pts){   // a jet of this side was lost: points off and a replacement queued
  if(!BT.on||BT.over)return;
  BT.pts[team]=Math.max(0,BT.pts[team]-(pts||12));BT.pend[team]++;if(BT.tm[team]<=0)BT.tm[team]=16;
}
function btStatus(){
  const z=BT.naval?'SHIPS '+btShipsLeft():'ZONES '+BT.zones.map(q=>q.n+(q.own>0?'+':q.own<0?'-':'·')).join(' ');
  return 'BLUE '+Math.round(BT.pts.blue)+' · RED '+Math.round(BT.pts.red)+'  '+z+'  SP '+BT.sp;
}
function btDied(){   // called from die(): the battle goes on, the sortie does not end
  if(BT.over)return;
  BT.pts.blue=Math.max(0,BT.pts.blue-12);BT.diedT=clock;
  const left=BT.lineup.filter(btAfford);
  deadT=left.length?1e9:2.2;
}
function btSpecTarget(){
  const l=friends.filter(f=>f.alive&&f.kind==='fighter');if(l.length)return l[BT.specI%l.length];
  const r=enemies.filter(e=>e.alive&&e.kind==='fighter');return r.length?r[BT.specI%r.length]:null;
}
function btTick(dt){
  if(!BT.on||!isBT()||BT.over||(state!=='play'&&state!=='dead'))return;
  const live=state==='play'&&P.alive;
  for(const z of BT.zones){
    let b=0,r=0;
    if(live&&Math.hypot(P.pos.x-z.x,P.pos.z-z.z)<BT_R)b++;
    for(const f of friends)if(f.alive&&f.kind==='fighter'&&Math.hypot(f.pos.x-z.x,f.pos.z-z.z)<BT_R)b++;
    for(const e of enemies)if(e.alive&&e.kind==='fighter'&&Math.hypot(e.pos.x-z.x,e.pos.z-z.z)<BT_R)r++;
    if(BT.ground&&WAR.on)for(const u of WAR.units)if(u.alive&&Math.hypot(u.pos.x-z.x,u.pos.z-z.z)<BT_R){if(u.team==='blue')b++;else r++}
    z.prog=clamp(z.prog+clamp(b-r,-2,2)*.045*dt,-1,1);
    const o=z.prog>.6?1:z.prog<-.6?-1:Math.abs(z.prog)<.12?0:z.own;
    if(o!==z.own){z.own=o;if(state==='play'){message(o>0?'ZONE '+z.n+' CAPTURED':o<0?'ZONE '+z.n+' LOST':'ZONE '+z.n+' NEUTRAL',1.8);if(o)sndZone(o>0)}if(o>0){scEvent('ZONE '+z.n+' CAPTURED',60,'bonus');BT.sp+=3}}
  }
  if(BT.naval)BT.pts.blue=Math.max(0,BT.pts.blue-btShipsLeft()*.35*dt);
  const bz=BT.zones.filter(z=>z.own>0).length, rz=BT.zones.filter(z=>z.own<0).length;
  BT.pts.red=Math.max(0,BT.pts.red-bz*.6*dt);BT.pts.blue=Math.max(0,BT.pts.blue-rz*.6*dt);
  if(BT.online){const s=netTeamScore(),me=NET.team||'B',th=me==='B'?'R':'B';BT.pts.red=Math.max(0,BT.pts.red-12*Math.max(0,(s[me]||0)-BT.kOld.m));BT.pts.blue=Math.max(0,BT.pts.blue-12*Math.max(0,(s[th]||0)-BT.kOld.t));BT.kOld.m=s[me]||0;BT.kOld.t=s[th]||0}
  if(!BT.online)for(const team of ['blue','red']){   // reinforcements
    if(BT.pend[team]>0&&BT.pts[team]>0){BT.tm[team]-=dt;if(BT.tm[team]<=0&&btAlive(team)<BT_AI[team]){BT.pend[team]--;BT.tm[team]=BT.pend[team]>0?16:0;btSpawn(team,Math.random()*3|0);btAssign()}}
  }
  BT.wpT-=dt;if(BT.wpT<=0){BT.wpT=5;if(!BT.online)btAssign()}
  BT.cT=(BT.cT||0)+dt;if(BT.cT>=170){BT.cT=0;if(!BT.online)btConditions(false)}
  if(BT.pts.red<=0||BT.pts.blue<=0){
    BT.over=true;hideBtPick();const win=BT.pts.red<=0&&BT.pts.blue>0;
    missionDone=false;if(!P.alive)state='play';   // endMission re-enters 'dead' with the usual short fade to the debrief
    endMission(win,win?'Enemy points depleted':'Your points ran out');return}
  if(state==='dead'&&!P.alive&&BT.diedT&&clock-BT.diedT>2.4)showBtPick();
}
// respawn picker: lineup buttons plus a next-spectate button; the camera follows a team-mate meanwhile
const btPick=document.createElement('div');btPick.id='btPick';btPick.hidden=true;btPick.setAttribute('role','dialog');btPick.setAttribute('aria-label','Choose your next jet');document.body.appendChild(btPick);
function hideBtPick(){btPick.hidden=true;btPick.dataset.k=''}
function showBtPick(){
  const key=BT.lineup.filter(btAfford).join(',')+'|'+BT.sp+'|'+BT.over;
  if(!btPick.hidden&&btPick.dataset.k===key)return;
  btPick.dataset.k=key;btPick.hidden=false;btPick.innerHTML='';
  const h=document.createElement('p');h.className='eyebrow';h.textContent='Shot down · '+btStatus()+' · spawn points are earned by kills and zone captures';btPick.appendChild(h);
  const row=document.createElement('div');row.className='btRow';btPick.appendChild(row);
  for(const id of BT.lineup){
    const b=document.createElement('button');b.type='button';b.className='ghost';const u=BT.used[id];
    b.textContent=(u?'✕ ':'')+AC_DEFS[id].name+' · '+btCost(id)+' SP'+(BT.naval&&AC_DEFS[id].carrier?' · deck':'');b.disabled=!btAfford(id);
    b.addEventListener('click',()=>btRespawn(id));row.appendChild(b)}
  const n=document.createElement('button');n.type='button';n.className='ghost';n.textContent='Spectate next';n.addEventListener('click',()=>{BT.specI++});btPick.appendChild(n);
}
function btRespawn(id){
  if(state!=='dead'||P.alive||BT.over||!btAfford(id))return;
  BT.used[id]=true;BT.sp-=btCost(id);hideBtPick();
  AC=AC_DEFS[id];applyAC();
  resetPlayer();resetRadar();resetCM();
  P.pos.set(rand(-2500,2500),4000,-1500);P.alive=true;missionDone=false;lockTarget=null;lockT=0;hurtT=0;shake=0;
  playerJet.visible=true;playerJet.quaternion.identity();state='play';$('ctrls').hidden=false;camSnap=true;BT.diedT=0;
  if(BT.online){const a=(NET.team==='B'?Math.PI:0)+rand(-.5,.5);P.pos.set(Math.sin(a)*9000,rand(4500,6500),Math.cos(a)*9000);playerJet.lookAt(0,P.pos.y,0);axes(P);P.vel.copy(P.fwd).multiplyScalar(240);qPrev.copy(playerJet.quaternion)}
  if(BT.naval&&AC.carrier)placeOnCarrier();else message('RESPAWNED · '+AC.name.toUpperCase(),2.2);
  sndSpawn();
}
