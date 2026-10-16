/* ---------------- weapons ---------------- */
/* ---------------- radar (APG-68 style fire-control radar) ---------------- */
const RANGES=[5,10,20,40,80,160];                 // nm display scales
const AZS=[60,30,10];                      // azimuth scan half-widths, deg (A6 / A3 / A1)
const ACMS=[null,'20x30','VSCAN','BORE'];  // dogfight auto-acquisition patterns
const DEG=Math.PI/180;
const R={sttSrc:'RDR',mode:'RWS',az:0,rng:2,acm:0,sweep:0,dir:1,tracks:new Map(),bug:null,stt:null,acqT:0,notchT:0,spiked:null};
const RADAR=R; // alias for places where R is a local screen coordinate
let seekT=null, scopeHits=[];
const qInvP=new THREE.Quaternion();
function relAngles(p){
  _pv.subVectors(p,P.pos).applyQuaternion(qInvP); const d=_pv.length();
  return {az:Math.atan2(-_pv.x,_pv.z),el:Math.atan2(_pv.y,Math.hypot(_pv.x,_pv.z)),d};
}
// a target beaming you (≈0 ground-relative closure) while you look down at it hides in ground clutter
function notched(e){
  _b.subVectors(e.pos,P.pos).normalize();
  return Math.abs(e.vel.dot(_b))<35&&e.pos.y<P.pos.y-200;
}
// IRST detection range (game estimate): ~15 km head-on, farther looking at a hot tailpipe
function irstRange(e){_c.subVectors(P.pos,e.pos).normalize();const rear=e.fwd.dot(_c)<-.3;const b=AC.irstR||15000;return Math.min(AC.irstMax||55000,b*(rear?1.7:1))}
function radarTarget(){
  if(R.stt)return R.acqT>=.5?R.stt:null;
  if(R.mode==='TWS'&&R.bug&&R.tracks.has(R.bug))return R.bug;
  return null;
}
function resetRadar(){R.mode='RWS';R.az=0;R.rng=2;R.acm=0;R.sweep=0;R.tracks.clear();R.bug=null;R.stt=null;R.spiked=null;seekT=null;syncRadarUI()}
function lockOn(e){
  if(!e||!e.alive)return;
  R.stt=e;R.acqT=0;R.notchT=0;R.bug=e;R.sttSrc=R.mode==='IRST'?'IRST':'RDR';
  // bandit's warning receiver hears the lock: at range he may beam and dive to notch you
  if(R.sttSrc==='RDR'&&R.spiked!==e){R.spiked=e; /* IRST is passive: he never hears it */ const d=e.pos.distanceTo(P.pos);
    if(d>6000&&DIFF[difficulty].notch&&Math.random()<.6*DIFF[difficulty].defP)e.rwrSpikeT=clock+3.5}  // he hears the lock and may beam pre-emptively
  syncRadarUI();
}
function breakLock(){R.stt=null;syncRadarUI()}
function quickLock(){
  if(R.stt){breakLock();message('LOCK BROKEN',.8);return}
  // designate the track nearest the nose; with no tracks, try anything inside a 20x30 box within 10 nm
  let best=null,ba=1e9;
  for(const [e] of R.tracks){if(!e.alive)continue;const a=relAngles(e.pos),s=Math.hypot(a.az,a.el);if(s<Math.PI/3&&s<ba){ba=s;best=e}}
  if(!best)for(const e of enemies){const a=relAngles(e.pos);if(a.d<18520&&Math.abs(a.az)<10*DEG&&a.el>-10*DEG&&a.el<20*DEG){best=e;break}}
  if(best){lockOn(best);message('LOCK',.7)} else message('NO RADAR TRACK',1);
}
function stepTarget(){
  const list=[...R.tracks.keys()].filter(e=>e.alive);
  if(!list.length){message('NO TRACKS',.8);return}
  const cur=R.stt||R.bug, i=list.indexOf(cur), next=list[(i+1)%list.length];
  if(R.stt)lockOn(next); else {R.bug=next;syncRadarUI()}
}
function updateRadar(dt){
  qInvP.copy(playerJet.quaternion).invert();
  if(P.sys&&P.sys.radar&&R.mode!=='IRST'){R.tracks.clear();if(R.stt&&R.sttSrc==='RDR')breakLock();return}
  const now=clock;
  for(const [e] of R.tracks)if(!e.alive)R.tracks.delete(e);
  if(R.bug&&!R.bug.alive)R.bug=null;
  if(R.stt&&!R.stt.alive){R.stt=null;syncRadarUI()}
  if(R.stt){
    const e=R.stt,a=relAngles(e.pos); R.acqT+=dt; R.sweep=a.az;
    let lost=null;
    const irst=R.sttSrc==='IRST';
    if(Math.hypot(a.az,a.el)>(irst?30:((AC.radar&&AC.radar.gimbal)||60))*DEG)lost='GIMBAL LIMIT';
    else if(a.d>(irst?irstRange(e)*1.3:radRange(e)*1.1))lost='RANGE';
    if(!irst&&notched(e)){R.notchT+=dt;if(R.notchT>1.5)lost='NOTCHED'} else R.notchT=0;
    if(lost){message('LOCK LOST · '+lost,1.5);breakLock()}
    else R.tracks.set(e,{t:now,az:a.az,d:a.d,pos:e.pos.clone(),vel:e.vel.clone()});
    return;
  }
  const acm=ACMS[R.acm];
  if(acm){
    for(const e of enemies){
      const a=relAngles(e.pos); if(a.d>18520)continue;
      const inP=acm==='20x30'?Math.abs(a.az)<10*DEG&&a.el>-10*DEG&&a.el<20*DEG
              :acm==='VSCAN'?Math.abs(a.az)<5*DEG&&a.el>-10*DEG&&a.el<50*DEG
              :Math.hypot(a.az,a.el)<2.5*DEG;
      if(inP){lockOn(e);message('ACM LOCK',.8);sndBeep(1500,.08,.05);return}
    }
    return;
  }
  if(R.mode==='IRST'){ // passive infrared search: ±30° field, short range, sees hot tailpipes farther, no notch
    for(const e of enemies){const a=relAngles(e.pos);
      if(Math.abs(a.az)<30*DEG&&a.el>-15*DEG&&a.el<30*DEG&&a.d<irstRange(e))R.tracks.set(e,{t:now,az:a.az,d:a.d,pos:e.pos.clone(),vel:e.vel.clone()})}
    for(const [e,tr] of R.tracks)if(now-tr.t>1.5)R.tracks.delete(e);
    R.sweep=0; return;
  }
  // search: antenna sweeps the azimuth limits, ~140°/s, ±30° elevation coverage
  const span=(R.mode==='TWS'?Math.min(AZS[R.az],25):AZS[R.az])*DEG;
  const prev=R.sweep; R.sweep+=R.dir*2.45*dt;
  if(R.sweep>span){R.sweep=span;R.dir=-1} if(R.sweep<-span){R.sweep=-span;R.dir=1}
  const lo=Math.min(prev,R.sweep)-.03,hi=Math.max(prev,R.sweep)+.03;
  for(const e of enemies){
    const a=relAngles(e.pos);
    if(a.az>=lo&&a.az<=hi&&Math.abs(a.el)<30*DEG&&a.d<radRange(e)&&!notched(e))
      R.tracks.set(e,{t:now,az:a.az,d:a.d,pos:e.pos.clone(),vel:e.vel.clone()});
  }
  const keep=R.mode==='TWS'?4.5:2.6;
  for(const [e,tr] of R.tracks)if(now-tr.t>keep){R.tracks.delete(e);if(R.bug===e)R.bug=null}
}
// B-scope: x = azimuth ±60°, y = range. Used by the radar panel and the cockpit MFD.
function drawScope(c,x0,y0,w,h,mfd){
  const RMAX=RANGES[R.rng]*1852, now=clock, G1='#4dff88', fs=mfd?13:10;
  const X=az=>x0+w/2+az/(Math.PI/3)*(w/2-10), Y=d=>y0+h-12-(d/RMAX)*(h-26);
  const hits=[];
  c.save();c.beginPath();c.rect(x0,y0,w,h);c.clip();
  c.fillStyle='#020604';c.fillRect(x0,y0,w,h);
  c.strokeStyle='rgba(77,255,136,.28)';c.lineWidth=1;
  for(let i=1;i<4;i++){const y=Y(RMAX*i/4);c.beginPath();c.moveTo(x0+6,y);c.lineTo(x0+w-6,y);c.stroke()}
  for(const a of [-30,0,30]){const x=X(a*DEG);c.beginPath();c.moveTo(x,y0+12);c.lineTo(x,y0+h-12);c.stroke()}
  const acm=ACMS[R.acm];
  if(!R.stt&&!acm){const span=(R.mode==='IRST'?30:R.mode==='TWS'?Math.min(AZS[R.az],25):AZS[R.az])*DEG;
    c.setLineDash([3,4]);c.strokeStyle='rgba(77,255,136,.7)';for(const s of [-1,1]){const x=X(s*span);c.beginPath();c.moveTo(x,y0+12);c.lineTo(x,y0+h-12);c.stroke()}c.setLineDash([])}
  // antenna azimuth caret
  c.fillStyle=G1;const ax=X(R.stt?R.sweep:acm?0:R.sweep);c.beginPath();c.moveTo(ax,y0+h-10);c.lineTo(ax-5,y0+h-1);c.lineTo(ax+5,y0+h-1);c.closePath();c.fill();
  c.font=`700 ${fs}px ${FONT}`;c.textBaseline='middle';
  if(mfd){ // OSB labels like the real FCR page
    c.textAlign='center';const top=[acm?'ACM':'CRM',R.stt?'STT':R.mode,'NORM','','OVRD'];
    top.forEach((t,i)=>t&&c.fillText(t,x0+24+i*48+4,y0+12));
    ['SWAP','FCR','','DCLT',''].forEach((t,i)=>t&&c.fillText(t,x0+24+i*48+4,y0+h-24));
    c.textAlign='left';c.fillText('▲',x0+4,y0+70);c.fillText(String(RANGES[R.rng]),x0+4,y0+92);c.fillText('▼',x0+4,y0+114);
    c.fillText('A'+(R.mode==='TWS'&&AZS[R.az]>25?'3':String(AZS[R.az]/10)),x0+4,y0+150);
  }
  const blip=(e,az,d,kind,alpha,vel)=>{
    if(d>RMAX||Math.abs(az)>Math.PI/3)return;
    const x=X(az),y=Y(d); hits.push({e,x,y});
    c.globalAlpha=alpha; c.fillStyle=G1;c.strokeStyle=G1;c.lineWidth=mfd?2:1.5;
    const s=mfd?7:5;
    if(kind==='search')c.fillRect(x-s,y-s*.55,s*2,s*1.1);
    else{
      if(kind==='stt'||kind==='bug'){c.fillStyle='#ffffff';c.strokeStyle='#ffffff'}
      if(kind==='track')c.strokeRect(x-s*.8,y-s*.8,s*1.6,s*1.6); else c.fillRect(x-s*.8,y-s*.8,s*1.6,s*1.6);
      if(vel){_e.copy(vel).applyQuaternion(qInvP);const l=Math.hypot(_e.x,_e.z)||1;c.beginPath();c.moveTo(x,y);c.lineTo(x-_e.x/l*s*2.6,y-_e.z/l*s*2.6);c.stroke()}
      if(kind==='stt'||kind==='bug'){c.beginPath();c.arc(x,y,s*1.9,0,Math.PI*2);c.stroke()}
    }
    c.globalAlpha=1;c.fillStyle=G1;c.font=`400 ${fs-2}px ${FONT}`;c.textAlign='center';
    c.fillText(String(Math.round(e.pos.y*3.281/1000)),x,y+s*2.2);
  };
  if(R.stt){const a=relAngles(R.stt.pos);blip(R.stt,a.az,a.d,R.acqT<.5?'track':'stt',1,R.stt.vel)}
  else if(acm){c.textAlign='center';c.fillStyle=G1;c.font=`700 ${fs+4}px ${FONT}`;c.fillText(acm==='20x30'?'20×30':acm,x0+w/2,y0+h*.42);
    c.font=`400 ${fs}px ${FONT}`;c.fillText('AUTO-ACQ ≤10 NM',x0+w/2,y0+h*.42+fs+8)}
  else for(const [e,tr] of R.tracks){
    if(!e.alive)continue;const age=now-tr.t;
    if(R.mode==='TWS'){_d.copy(tr.pos).addScaledVector(tr.vel,age);const a=relAngles(_d);blip(e,a.az,a.d,e===R.bug?'bug':'track',1,tr.vel)}
    else blip(e,tr.az,tr.d,'search',Math.max(.25,1-age/2.6),null);
  }
  // target data line: Mach, altitude, aspect, closure
  const tgt=R.stt||(R.mode==='TWS'&&R.bug);
  if(tgt&&tgt.alive){
    const at=atm(tgt.pos.y),mach=tgt.vel.length()/at.a;
    _a.subVectors(P.pos,tgt.pos).normalize();_b.copy(tgt.vel).normalize();
    const asp=180-Math.acos(clamp(_b.dot(_a),-1,1))/DEG, side=_e.crossVectors(_b,_a).y<0?'R':'L';
    _c.subVectors(tgt.pos,P.pos).normalize(); const vc=-_d.subVectors(tgt.vel,P.vel).dot(_c)*1.944;
    c.fillStyle=G1;c.font=`700 ${fs-1}px ${FONT}`;c.textAlign='center';
    c.fillText(`${mach.toFixed(2)}M ${String(Math.round(asp/10)).padStart(2,'0')}${side} ${Math.round(vc)}VC`,x0+w/2,y0+(mfd?36:10));
  }
  if(!mfd){c.textAlign='left';c.font=`700 ${fs}px ${FONT}`;c.fillStyle=G1;c.fillText(String(RANGES[R.rng]),x0+4,y0+10)}
  c.restore();
  return hits;
}
// radar panel UI
const rdrEl=$('rdr'),scope=$('rScope'),sctx=scope.getContext('2d');
let rdrOpen=false; try{rdrOpen=localStorage.getItem('viperRdr')==='1'}catch(e){}
function syncRadarUI(){
  const acm=ACMS[R.acm];
  $('rMode').textContent=R.stt?(R.sttSrc==='IRST'?'IR LK':'STT'):R.mode; $('rMode').classList.toggle('on',!!R.stt);
  $('rAz').textContent='A'+(R.mode==='TWS'&&AZS[R.az]>25?'2.5':String(AZS[R.az]/10));
  $('rAcm').textContent=acm?(acm==='20x30'?'20×30':acm):'ACM'; $('rAcm').classList.toggle('on',!!acm);
  $('rRng').textContent=RANGES[R.rng];
  rdrEl.hidden=!rdrOpen; $('bRdr').classList.toggle('on',rdrOpen);
}
function sizeScope(){const r=scope.getBoundingClientRect();if(!r.width)return false;
  const w=Math.round(r.width*DPR),h=Math.round(r.height*DPR);if(scope.width!==w||scope.height!==h){scope.width=w;scope.height=h}return true}
function drawRadarPanel(){
  if(rdrEl.hidden||state!=='play')return;
  if(!sizeScope())return;
  const w=scope.width/DPR,h=scope.height/DPR;
  sctx.setTransform(DPR,0,0,DPR,0,0); scopeHits=drawScope(sctx,0,0,w,h,false);
}
$('bRdr').addEventListener('click',()=>{rdrOpen=!rdrOpen;try{localStorage.setItem('viperRdr',rdrOpen?'1':'0')}catch(e){};syncRadarUI();sizeScope()});
$('rMode').addEventListener('click',()=>{if(R.stt)breakLock();else if(R.acm)R.acm=0;else{const ms=AC.radar.modes;R.mode=ms[(ms.indexOf(R.mode)+1)%ms.length];R.tracks.clear();R.bug=null}syncRadarUI()});
$('rAz').addEventListener('click',()=>{R.az=(R.az+1)%AZS.length;syncRadarUI()});
$('rAcm').addEventListener('click',()=>{R.acm=(R.acm+1)%ACMS.length;if(R.stt)breakLock();syncRadarUI()});
$('rUp').addEventListener('click',()=>{R.rng=Math.min(RANGES.length-1,R.rng+1);syncRadarUI()});
$('rDn').addEventListener('click',()=>{R.rng=Math.max(0,R.rng-1);syncRadarUI()});
$('rStep').addEventListener('click',stepTarget);
$('bLock').addEventListener('click',()=>{audioInit();quickLock()});
scope.addEventListener('pointerdown',e=>{
  e.preventDefault();const r=scope.getBoundingClientRect(),x=e.clientX-r.left,y=e.clientY-r.top;
  let best=null,bd=22;for(const h of scopeHits){const d=Math.hypot(h.x-x,h.y-y);if(d<bd){bd=d;best=h.e}}
  if(best){
    if(R.mode==='TWS'&&!R.stt&&R.bug!==best){R.bug=best;syncRadarUI()} // first tap bugs the track, second tap locks
    else {lockOn(best);message('LOCK',.7)}
  } else if(R.stt){breakLock();message('LOCK BROKEN',.8)}
  else if(R.bug){R.bug=null}
});
syncRadarUI();

/* ---------------- launch zones: fly the missile's own motor/drag model forward ---------------- */
// Rmax: he holds course. Rne ("no escape"): he turns tail and runs at his current speed.
function dlz(spec,shooter,target){
  const los=new V3().subVectors(target.pos,shooter.pos), d=los.length(); los.divideScalar(d||1);
  const away=target.vel.dot(los), vt=target.vel.length();
  const f=flyout(spec,(shooter.pos.y+target.pos.y)/2,Math.max(150,shooter.vel.length()));
  let rmax=0,rne=0;
  for(let i=0;i<f.S.length;i++){const t=(i+1)*.25; if(f.V[i]<Math.max(250,vt*1.15))break;
    rmax=Math.max(rmax,f.S[i]-away*t); rne=Math.max(rne,f.S[i]-vt*t)}
  const cap=spec.maxR*(spec.sus?1.4:spec.burn<6?1.6:1.25);   // seeker / radar support limit
  return {rmax:Math.min(rmax,cap),rne:Math.min(rne,cap),rmin:spec.minR,d,vc:-(target.vel.dot(los)-shooter.vel.dot(los))};
}
let pZone=null,pZoneT=0,pZoneW='';
// R-27R: inertial midcourse with radio-correction datalink from the launcher's radar, then semi-active terminal homing.
// Lock can drop in midcourse (it flies to the last known intercept point) but the radar must illuminate the target at the end.
function sarhStep(m,s,tg,lockOK,launcher){
  if(!m.vt)m.vt={pos:new V3(),vel:new V3(),alive:true};
  if(!m.kp){m.kp=tg.pos.clone();m.kv=tg.vel.clone();m.kT=clock}
  if(!m.term&&tg.pos.distanceTo(m.m.position)<s.termR)m.term=true;
  if(m.term){if(s.arh){m.gmode='ACTIVE';return tg} if(lockOK){m.gmode='TERM';return tg} m.gmode='LOST';return null}
  if(lockOK&&launcher.pos.distanceTo(m.m.position)<s.dlR){m.kp.copy(tg.pos);m.kv.copy(tg.vel);m.kT=clock;m.gmode='DL';return tg}
  m.gmode='INS'; m.vt.pos.copy(m.kp).addScaledVector(m.kv,clock-m.kT); m.vt.vel.copy(m.kv); return m.vt;
}
function launch(type,target){
  const isNine=type==='9X';
  const idx=isNine?AC.srN-P.aim9:AC.mrN-P.aim120;
  if(isNine)P.aim9--; else P.aim120--;
  const rail=playerJet.getObjectByName((isNine?'r9_':'r120_')+idx);
  const m=take(missiles); m.on=true; m.type=type; m.t=0; m.target=target; m.m.visible=true;
  m.m.scale.set(isNine?1:1.3,isNine?1:1.3,isNine?1:1.22);
  if(rail){rail.getWorldPosition(m.m.position);rail.visible=false} else m.m.position.copy(P.pos);
  m.m.position.addScaledVector(P.up,-1);
  m.vel.copy(P.vel).addScaledVector(P.up,-4); m.prev.copy(m.m.position);
  m.notchT=0; m.notchRolled=false; m.blindT=0; m.lostT=0; m.term=false; m.kp=null; m.gmode=''; m.reason=target?'':'NO LOCK (BORESIGHT)'; m.team='blue'; m.owner=P; m.name=isNine?AC.srFull:AC.mrFull;
  recLaunch(m,'You',target);
  sndMsl(); buzz(35); message(isNine?'FOX 2':'FOX 3',1);
}
function updateWeapons(dt){
  updateRadar(dt);
  const s9=SPEC['9X'],s12=SPEC['120'], rt=radarTarget();
  // 9X seeker: slaved to the radar target if it can see it, otherwise searches near the nose for the hottest source
  let seek=null;
  if(rt){_a.subVectors(rt.pos,P.pos);if(P.fwd.angleTo(_a)<s9.cone&&_a.length()<=s9.maxR*1.2)seek=rt}
  if(seek&&irBlocked(P.pos,seek.pos))seek=null;
  if(!seek){let ba=.35;for(const e of enemies){if(!e.alive||irBlocked(P.pos,e.pos))continue;_a.subVectors(e.pos,P.pos);const a=P.fwd.angleTo(_a);if(a<ba&&_a.length()<=s9.maxR*1.2){ba=a;seek=e}}}
  if(seek&&seek===seekT)lockT+=dt; else {seekT=seek;lockT=0}
  lockTarget=rt||seekT;
  if(lockTarget){_a.subVectors(lockTarget.pos,P.pos);lockDist=_a.length();lockAng=P.fwd.angleTo(_a)} else {lockDist=0;lockAng=0}
  pZoneT-=dt; if(pZoneT<=0){pZoneT=.25; const zt=rt||seekT; pZoneW=rt?'120':'9X'; pZone=zt?dlz(SPEC[pZoneW],P,zt):null}
  let sd=0; if(seekT)sd=seekT.pos.distanceTo(P.pos);
  can9=!!seekT&&lockT>s9.lockT&&sd>=s9.minR&&sd<=s9.maxR;
  can120=!!rt&&lockAng<s12.cone&&lockDist>=s12.minR&&lockDist<=s12.maxR&&!(s12.sarh&&R.sttSrc!=='RDR')&&!(s12.launchG&&P.n>s12.launchG);
  const lb=$('bLock'); lb.textContent=R.stt?'UNLK':'LOCK'; lb.classList.toggle('on',!!R.stt);
  $('b9').classList.toggle('ready',can9&&P.aim9>0);
  $('b120').classList.toggle('ready',can120&&P.aim120>0);
  $('c9').textContent=P.aim9;$('c120').textContent=P.aim120;$('cGun').textContent=P.rounds;
  if(seekT&&state==='play'&&P.aim9>0){toneT-=dt;if(toneT<=0){if(can9){sndBeep(1100,.06,.04,'sawtooth');toneT=.09}else{sndBeep(420,.12,.03,'sawtooth');toneT=.3}}}

  if(fire9){fire9=false; if(P.aim9>0)launch('9X',can9?seekT:null); else message('NO '+AC.srName+' LEFT',1)}
  if(fire120){fire120=false;
    if(P.aim120<=0)message('NO '+AC.mrName+' LEFT',1);
    else if(!rt)message(R.stt?'ACQUIRING':AC.radar.modes.includes('TWS')?'NEED RADAR LOCK OR TWS TRACK':'NEED RADAR LOCK',1.2);
    else if(s12.sarh&&R.sttSrc!=='RDR')message(AC.mrFull+' NEEDS RADAR LOCK, NOT IRST',1.3);
    else if(s12.launchG&&P.n>s12.launchG)message('OVER '+s12.launchG+' G · LAUNCH INHIBITED',1.2);
    else if(!can120)message(lockDist<s12.minR?'TOO CLOSE FOR '+AC.mrName:lockDist>s12.maxR?'OUT OF RANGE':'OFF BORESIGHT',1.1);
    else launch('120',rt)}

  // gun: real rate of fire for the selected jet
  if(gunHeld&&P.rounds>0&&state==='play'){
    gunAcc+=dt*AC.gunRate; gunSndT-=dt; if(gunSndT<=0){sndGun();gunSndT=.05;buzz(12)}
    while(gunAcc>=1&&P.rounds>0){gunAcc--;P.rounds--;
      _d.copy(P.fwd);_d.x+=rand(-.004,.004);_d.y+=rand(-.004,.004);_d.z+=rand(-.004,.004);_d.normalize();
      const b=take(pBullets);b.on=true;b.life=2;b.m.visible=true;
      b.m.position.copy(P.pos).addScaledVector(P.fwd,5).addScaledVector(P.right,-.9).addScaledVector(P.up,.4).addScaledVector(_d,rand(0,15));
      b.prev.copy(b.m.position); b.vel.copy(P.vel).addScaledVector(_d,AC.muzzle); b.m.quaternion.setFromUnitVectors(ZF,_d);
    }
    if(P.rounds===0)message('WINCHESTER · GUN EMPTY',1.4);
  } else gunAcc=0;
  for(const b of pBullets){ if(!b.on)continue;
    if(ground.length)for(const g of ground)if(g.alive&&distSeg(_s1.copy(g.pos).setY(g.pos.y+2),b.prev,b.m.position)<9){kill(b);g.hp-=AC.gunDmg;puff(b.m.position.x,b.m.position.y,b.m.position.z,0,0,0,1,.8,.3,1,5,16,.25);if(g.hp<=0)killGround(g);break}
    if(!b.on)continue;
    b.life-=dt; if(b.life<=0){kill(b);continue}
    b.prev.copy(b.m.position); b.vel.y-=G*dt; b.vel.multiplyScalar(gunDrag(b.vel.length(),atm(b.m.position.y).sig,dt)); b.m.position.addScaledVector(b.vel,dt);
    for(const e of enemies){ if(!e.alive)continue;
      if(distSeg(e.pos,b.prev,b.m.position)<(e.kind==='fighter'?7:14)){kill(b);const p=b.m.position;puff(p.x,p.y,p.z,0,0,0,1,.8,.3,1,5,16,.25);
        hitAI(e,AC.gunDmg,'GUNS',true);break}}
  }
  // missiles: proportional navigation, g-limited by airspeed
  for(const m of missiles){ if(!m.on)continue;
    const s=SPEC[m.type], p=m.m.position, at=atm(p.y);
    m.t+=dt; let v=m.vel.length(); _a.copy(m.vel).divideScalar(v);
    if(m.t<s.burn)m.vel.addScaledVector(_a,s.acc*dt);
    else if(s.sus&&m.t<s.burn+s.sus&&v<s.vCap)m.vel.addScaledVector(_a,s.susAcc*dt); // Meteor ramjet
    m.vel.addScaledVector(_a,-at.rho*s.cd*v*v*dt); m.vel.y-=G*dt;
    v=m.vel.length(); _a.copy(m.vel).divideScalar(v);
    const tg=m.target;
    if(tg&&!tg.alive){m.target=null;m.reason=m.reason||'TARGET ALREADY DESTROYED'}
    if(m.type==='9X'&&m.target&&m.t>.3){const why=irEnv(m,m.target,dt);if(why){m.target=null;m.reason=why}}
    let aim=tg;
    if((s.sarh||s.arh)&&tg&&tg.alive){const g=sarhStep(m,s,tg,(R.stt===tg&&R.sttSrc==='RDR')||(R.mode==='TWS'&&R.tracks.has(tg)&&!(P.sys&&P.sys.radar)),P);
      if(!g){m.target=null;m.reason='NO RADAR LOCK IN TERMINAL PHASE';if(state==='play')message(AC.mrFull+' LOST · NO LOCK IN TERMINAL',1.4)} else aim=g}
    if(m.target&&tg.alive&&m.t>.3){
      const r=_b.subVectors(aim.pos,p);
      if(_a.angleTo(r)>s.gimbal){m.target=null;m.reason='TARGET LEFT SEEKER FIELD'}   // outside seeker gimbal: lost
      else{
        const vr=_c.subVectors(aim.vel,m.vel), om=_d.crossVectors(r,vr).divideScalar(r.lengthSq());
        const acc=_e.crossVectors(om,m.vel).multiplyScalar(4); acc.y+=G;
        acc.addScaledVector(_a,-acc.dot(_a));
        const q=.5*at.rho*v*v, lim=s.gmax*G*clamp(q/40000,m.t<s.burn?.35:.08,1);
        if(acc.length()>lim)acc.setLength(lim);
        if(!(m.blindT>0))m.vel.addScaledVector(acc,dt);
        aiDecoyRoll(m,tg,m.type==='9X'?'IR':'RDR',s.decoy??.08,.06,dt);
      }
    }
    m.prev.copy(p); p.addScaledVector(m.vel,dt);
    m.m.quaternion.setFromUnitVectors(ZF,_a.copy(m.vel).normalize());
    if(m.t<s.burn){puff(p.x,p.y,p.z,rand(-3,3),rand(-3,3),rand(-3,3),.88,.88,.9,.55,3,9,1.6);puff(p.x,p.y,p.z,0,0,0,1,.75,.35,.9,1.8,0,.06)}
    let done=false;
    for(const e of enemies){if(e.alive&&distSeg(e.pos,m.prev,p)<s.fuze*(e.kind==='fighter'?1:1.8)){recMsl(m,'HIT','');hitAI(e,5,m.type==='9X'?AC.srFull:AC.mrFull,true);done=true;break}}
    if(!done&&p.y<Math.max(groundH(p.x,p.z),0)){explode(p,false);done=true;recMsl(m,'MISS',m.reason||'HIT THE GROUND')}
    if(!done&&(m.t>s.life||(m.t>s.burn+(s.sus||0)&&v<250))){explode(p,false);done=true;recMsl(m,'MISS',m.reason||'OUT OF ENERGY')}
    if(!done){if(!m.target){m.lostT=(m.lostT||0)+dt;if(m.lostT>4){explode(p,false);done=true;recMsl(m,'MISS',m.reason||'LOST TARGET')}}else m.lostT=0}
    if(done)kill(m);
  }
  // AI rounds: red rounds hit you and your friends, blue (wingman) rounds hit bandits
  for(const b of eBullets){ if(!b.on)continue;
    b.life-=dt; if(b.life<=0){kill(b);continue}
    b.prev.copy(b.m.position); b.vel.y-=G*dt; b.vel.multiplyScalar(gunDrag(b.vel.length(),atm(b.m.position.y).sig,dt)); b.m.position.addScaledVector(b.vel,dt);
    if(b.team==='ghost')continue;
    if(b.team==='red'){
      if(state==='play'&&P.alive&&distSeg(P.pos,b.prev,b.m.position)<6){
        kill(b);P.hp-=4*(b.dmg||1);if(Math.random()<.5)addHole(playerJet,1);hurtT=.35;shake=.4;sndHit();buzz(40);
        puff(P.pos.x,P.pos.y+1,P.pos.z,0,0,0,1,.7,.3,1,4,12,.2);
        if(Math.random()<.12*(b.dmg||1))damageSystem(1);
        if(P.hp<=0)die('shot');continue}
      for(const f of friends)if(f.alive&&distSeg(f.pos,b.prev,b.m.position)<(f.kind==='fighter'?7:16)){kill(b);hitAI(f,b.dmg||1,'GUNS',false);break}
    } else for(const e of enemies)if(e.alive&&distSeg(e.pos,b.prev,b.m.position)<(e.kind==='fighter'?7:14)){kill(b);hitAI(e,b.dmg||1,'GUNS (WINGMAN)',false);break}
  }
}

/* ---------------- countermeasures: ALE-47 flares/chaff, ECM pod, ALE-50 towed decoy ---------------- */
// Block 50/52: four ALE-47 canisters on the aft fuselage, flare canister = 15 flares, chaff canister = 30 cartridges.
// ALQ-184(V)9 ECM pod on the centreline with ALE-50 towed decoys (4). No missile approach warning on a standard Block 50.
const CM_LOADS=[[2,2],[3,1],[4,0],[1,3],[0,4]];   // [flare canisters, chaff canisters]; 2+2 is the normal fit
let cmLoad=0; try{cmLoad=clamp(+localStorage.getItem('viperCmLoad')||0,0,CM_LOADS.length-1)}catch(e){}
// Gripen C dispenser capacities aren't published; fixed game values are used for it
const cmFlares=()=>Math.round((AC.cm.fixed?AC.cm.flares:CM_LOADS[cmLoad][0]*15)*(AC.cmK||1)), cmChaff=()=>Math.round((AC.cm.fixed?AC.cm.chaff:CM_LOADS[cmLoad][1]*30)*(AC.cmK||1));
const CM={flares:30,chaff:60,decoys:4,ecm:false,heat:0,auto:false,flrHeld:false,chfHeld:false,flrT:0,chfT:0,autoT:0,decoy:null,objs:[]};
// bandit missiles: an older heat-seeker and a radar missile, both PN-guided and g-limited like yours
const eMissiles=makePool(14,mslGeo,new THREE.MeshStandardMaterial({color:0xcfc6b8,flatShading:true}));
const decoyMesh=new THREE.Mesh(new THREE.CylinderGeometry(.15,.15,1.6,6).rotateX(Math.PI/2),new THREE.MeshStandardMaterial({color:0x50585e,flatShading:true}));
decoyMesh.visible=false; scene.add(decoyMesh);
const cableGeo=new THREE.BufferGeometry().setFromPoints([new V3(),new V3()]);
const cable=new THREE.Line(cableGeo,new THREE.LineBasicMaterial({color:0x2a2a2a})); cable.visible=false; cable.frustumCulled=false; scene.add(cable);
let rwrMsgT=0,warnT=0,warnAlt=false;
function syncCM(){
  $('nFlr').textContent=CM.flares;$('nChf').textContent=CM.chaff;$('nDcy').textContent=CM.decoy?'OUT':CM.decoys;
  $('nEcm').textContent=CM.ecm?'XMIT':'STBY';
  $('cEcm').classList.toggle('on',CM.ecm);
  $('cDcy').classList.toggle('on',!!CM.decoy);
  $('nAuto').textContent=CM.auto?'ON':'OFF';$('cAuto').classList.toggle('on',CM.auto);
}
function cutDecoy(){CM.decoy=null;decoyMesh.visible=false;cable.visible=false}
function resetCM(){CM.flares=cmFlares();CM.chaff=cmChaff();CM.decoys=AC.cm.decoys;CM.ecm=false;CM.objs.length=0;cutDecoy();eMissiles.forEach(kill);syncCM()}
function dispense(type){
  if(state!=='play')return false;
  if(type==='flare'){if(CM.flares<=0){message('FLARES OUT',.8);return false}CM.flares--;CM.flDisp=(CM.flDisp||0)+1}
  else {if(CM.chaff<=0){message('CHAFF OUT',.8);return false}CM.chaff--;CM.chDisp=(CM.chDisp||0)+1}
  const o={type,alive:true,life:type==='flare'?3.5:5,
    pos:P.pos.clone().addScaledVector(P.fwd,-5).addScaledVector(P.up,-1),
    vel:P.vel.clone().multiplyScalar(type==='flare'?.85:.3).addScaledVector(P.up,-25).addScaledVector(P.right,rand(-14,14))};
  CM.objs.push(o);
  if(type==='chaff')for(let i=0;i<10;i++)puff(o.pos.x,o.pos.y,o.pos.z,rand(-15,15),rand(-15,15),rand(-15,15),.78,.8,.84,.55,5,18,rand(2,4));
  sndNoise(.06,3000,.12,'highpass'); syncCM(); return true;
}
function deployDecoy(){
  if(state!=='play')return;
  if(!AC.cm.decoys){message('NO TOWED DECOY ON THIS JET',.9);return}
  if(CM.decoy){message('DECOY ALREADY OUT',.8);return}
  if(CM.decoys<=0){message('NO DECOYS LEFT',.9);return}
  CM.decoys--;CM.decoy={pos:P.pos.clone().addScaledVector(P.fwd,-10),vel:P.vel.clone(),alive:true};
  decoyMesh.visible=true;cable.visible=true;message('DECOY DEPLOYED',1);syncCM();
}
function toggleECM(){
  if(!AC.cm.jam){message('NO JAMMER ON THIS JET',.9);return}
  if(state!=='play')return;
  CM.ecm=!CM.ecm;message(CM.ecm?'ECM TRANSMIT':'ECM STANDBY',.9);syncCM();
}
function inFlightE(){let n=0;for(const m of eMissiles)if(m.on)n++;return n}
function launchAI(e,type){
  const m=take(eMissiles);m.on=true;m.type=type;m.t=0;m.target=e.tgt;m.m.visible=true;m.owner=e;m.team=e.team;m.spec=e.espec[type];
  m.seen=new Set();m.notchT=0;m.notchRolled=false;m.blindT=0;m.lostT=0;m.dRolled=false;m.mawsWarned=false;m.mawSeen=-99;m.term=false;m.kp=null;m.gmode='';m.jit=m.jit||new V3();m.jit.set(0,0,0);m.jitT=0;m.reason='';m.rollT=0;m.nextRoll=0;m.pNotch=false;m.pClutter=false;
  m.name=(type==='IR'?AC_DEFS[e.type].srFull:AC_DEFS[e.type].mrFull);
  m.m.scale.set(type==='IR'?1:1.3,type==='IR'?1:1.3,type==='IR'?1:1.25);
  m.m.position.copy(e.pos).addScaledVector(e.up,-1.5);m.prev.copy(m.m.position);m.vel.copy(e.vel);
  recLaunch(m,e.team==='red'?'Bandit':'Wingman',e.tgt);
  if(e.team==='blue')message('TWO · FOX '+(type==='IR'?'2':m.spec.sarh?'1':'3'),1);
  if(m.target===P&&type==='RDR'){message('MISSILE LAUNCH',1.6);buzz([60,50,60]);for(let i=0;i<4;i++)setTimeout(()=>sndBeep(1300,.06,.05),i*110)}
}
// notch: the target beams the missile (near-zero closure) while the seeker looks down into ground clutter.
// One roll per notch attempt; on success the seeker goes blind and coasts. If the target leaves the notch the seeker
// can re-acquire; if it stays blind ~2.5 s the missile is lost.
function notchCheck(m,tg,dt,p){
  const mp=m.m.position; _s1.subVectors(tg.pos,mp); const d=_s1.length(); _s1.divideScalar(d||1);
  const closing=Math.abs(tg.vel.dot(_s1));   // target's own speed along the line of sight (doppler vs ground clutter)
  const lookDown=(mp.y-tg.pos.y)/(d||1), agl=tg.pos.y-Math.max(groundH(tg.pos.x,tg.pos.z),0);
  if(tg===P){
    /* you: the seeker's velocity gate is ~±60 m/s wide (about ±14° off the beam at 250 m/s); you need clutter behind you
       (it looks down on you, or you're low). Every 1.5 s held in the notch is another roll; chaff in the notch helps a lot */
    const live=!(m.spec&&m.spec.arh)||d<(m.spec.termR||20000)*1.1;   // a Fox 3 still on datalink isn't using its own seeker yet
    const inNotch=live&&closing<60&&(lookDown>.02||agl<1500)&&agl<9000; m.pNotch=inNotch; m.pClutter=lookDown>.02||agl<1500;
    if(inNotch){m.notchT=(m.notchT||0)+dt;
      if(m.notchT>(m.nextRoll||1)&&!(m.blindT>0)){m.nextRoll=m.notchT+1.5;
        let ch=false;for(const o of CM.objs)if(o.type==='chaff'&&o.pos.distanceToSquared(P.pos)<160000)ch=true;
        if(Math.random()<(ch?.9:.6)*(CM.ecm?1.1:1))m.blindT=1.5}}
    else {m.notchT=0;m.nextRoll=0}
    if(m.blindT>0){m.blindT-=dt;
      if(!inNotch&&m.blindT<1.2){m.blindT=0}
      else if(m.blindT<=0){m.blindT=0;m.target=null;m.reason='NOTCHED';return true}}
    return false;
  }
  const inNotch=closing<30&&lookDown>.06&&agl<7000;
  if(inNotch){m.notchT=(m.notchT||0)+dt;if(m.notchT>1.2&&!m.notchRolled){m.notchRolled=true;if(Math.random()<p)m.blindT=2.5}}
  else {m.notchT=0;m.notchRolled=false}
  if(m.blindT>0){m.blindT-=dt;
    if(!inNotch&&m.blindT<2){m.blindT=0}                       // he left the notch: seeker re-acquires
    else if(m.blindT<=0){m.blindT=0;m.target=null;m.reason='NOTCHED';return true}}
  return false;
}
// an AI jet defending against a missile: its flares/chaff (from its own defensive logic) and beaming get rolls
function aiDecoyRoll(m,tg,kind,flareP,chaffP,dt){
  if(!tg||tg===P||!tg.alive)return;
  const drop=tg.cmDrop&&clock-tg.cmDrop.t<.3?tg.cmDrop.type:null;
  if(drop&&!m.seen)m.seen=new Set();
  if(drop&&!m.seen.has(tg.cmDrop)){m.seen.add(tg.cmDrop);
    _s1.subVectors(tg.pos,m.m.position).normalize(); const beam=Math.abs(tg.vel.dot(_s1))<70;
    if(kind==='IR'&&drop==='flare'&&Math.random()<flareP){m.target=null;m.reason='DECOYED BY FLARES';return}
    if(kind==='RDR'&&drop==='chaff'&&Math.random()<chaffP*(beam?1:.15)){m.target=null;m.reason='DECOYED BY CHAFF';return}
  }
  if(kind==='RDR')notchCheck(m,tg,dt,sk(tg).notchP||.3);
}
function updateCM(dt){
  rwrMsgT-=dt; CM.flrT-=dt; CM.chfT-=dt;
  // held buttons fire 2-cartridge salvos every 0.35 s
  if(CM.flrHeld&&CM.flrT<=0){CM.flrT=.35;if(dispense('flare'))dispense('flare')}
  if(CM.chfHeld&&CM.chfT<=0){CM.chfT=.35;if(dispense('chaff'))dispense('chaff')}
  // threat picture
  // RWR hears radars and radar-guided missiles. Heat-seekers are passive: only a missile approach warner
  // (Gripen's UV MAW, not a Block 50 F-16) sees them, and only while the rocket motor burns.
  let spike=false,launch=false,maws=false,samSpike=false,nThreat=0;
  for(const e of enemies)if(e.alive&&e.tgt===P&&e.lockT>0){spike=true;nThreat++}
  for(const m of eMissiles){if(!m.on||m.target!==P)continue;
    if(m.type==='RDR')launch=true;
    if(AC.cm.maws){
      if(m.t<m.spec.burn&&m.m.position.distanceTo(P.pos)<10000){m.mawSeen=clock;if(!m.mawsWarned){m.mawsWarned=true;message('MISSILE · MISSILE',1.4);buzz([80,40,80])}}
      if(clock-m.mawSeen<3)maws=true}}
  for(const g of ghostMsl.values()){if(!g.on||g.tgt!==NET.me)continue;
    if(g.type==='120')launch=true;
    if(AC.cm.maws&&g.burn&&g.m.position.distanceTo(P.pos)<10000){g.mawSeen=clock;if(!g.mawsWarned){g.mawsWarned=true;message('MISSILE · MISSILE',1.4);buzz([80,40,80])}}
    if(AC.cm.maws&&clock-(g.mawSeen||-99)<3)maws=true}
  for(const e of enemies)if(e.remote&&e.alive&&e.lockMe)spike=true;
  for(const g of ground)if(g.alive&&g.kind==='sam'&&g.lockT>.3){spike=true;samSpike=true;nThreat++}
  if(state==='play'){if(nThreat>(CM.nThreat||0)){for(let i=0;i<3;i++)setTimeout(()=>sndBeep(1700,.035,.035,'sine'),i*70)}CM.nThreat=nThreat;
    if(launch&&!CM.vLaunch)say('launch',3); CM.vLaunch=launch; if(maws&&!CM.vMaws)say('maws',3); CM.vMaws=maws}
  // AUTO: RWR cues chaff against radar missiles; with a MAW it also cues flares
  if(CM.auto&&state==='play'){CM.autoT-=dt;
    if(CM.autoT<=0){let rd=false,ir=false;
      for(const m of eMissiles){if(!m.on||m.target!==P)continue;
        if(m.type==='RDR'&&m.m.position.distanceTo(P.pos)<7000)rd=true;
        if(AC.cm.maws&&clock-m.mawSeen<3)ir=true}
      if(ir&&dispense('flare'))dispense('flare');
      if(rd&&dispense('chaff'))dispense('chaff');
      if(ir||rd)CM.autoT=.6}}
  // warning tones
  if(state==='play'){warnT-=dt;if(warnT<=0){
    if(maws){warnAlt=!warnAlt;sndBeep(warnAlt?760:1040,.12,.05);warnT=.14}
    else if(launch){sndBeep(1300,.06,.04);warnT=.16}
    else if(samSpike){warnAlt=!warnAlt;sndBeep(warnAlt?560:680,.16,.03,'triangle');warnT=.32}
    else if(spike){sndBeep(900,.08,.03);warnT=.55}
    else warnT=.2}}
  // expendables
  for(const o of CM.objs){o.life-=dt;if(o.life<=0){o.alive=false;continue}
    o.vel.multiplyScalar(Math.exp(-(o.type==='flare'?1.2:4)*dt)); o.vel.y-=G*dt*(o.type==='flare'?.6:.05); o.pos.addScaledVector(o.vel,dt);
    if(o.type==='flare'){puff(o.pos.x,o.pos.y,o.pos.z,0,0,0,1,.95,.75,1,5,0,.12);puff(o.pos.x,o.pos.y,o.pos.z,rand(-2,2),rand(-2,2),rand(-2,2),.85,.85,.85,.35,2.5,7,1.4)}
    else if(Math.random()<.3)puff(o.pos.x+rand(-8,8),o.pos.y+rand(-8,8),o.pos.z+rand(-8,8),0,-2,0,.85,.88,.92,.45,2,4,1)}
  CM.objs=CM.objs.filter(o=>o.alive);
  // towed decoy on ~100 m of cable
  if(CM.decoy){
    _a.copy(P.pos).addScaledVector(P.fwd,-100).addScaledVector(P.up,-4);
    CM.decoy.pos.lerp(_a,1-Math.exp(-dt*3)); CM.decoy.vel.copy(P.vel);
    decoyMesh.position.copy(CM.decoy.pos); decoyMesh.quaternion.copy(playerJet.quaternion);
    const pa=cableGeo.attributes.position; _b.copy(P.pos).addScaledVector(P.fwd,-3.4).addScaledVector(P.up,-1.5);
    pa.setXYZ(0,_b.x,_b.y,_b.z); pa.setXYZ(1,CM.decoy.pos.x,CM.decoy.pos.y,CM.decoy.pos.z); pa.needsUpdate=true;
  }
}
function updateEnemyMissiles(dt){
  for(const m of eMissiles){ if(!m.on)continue;
    const s=m.spec,p=m.m.position,at=atm(p.y);
    m.t+=dt; let v=m.vel.length(); _a.copy(m.vel).divideScalar(v);
    if(m.t<s.burn)m.vel.addScaledVector(_a,s.acc*dt);
    else if(s.sus&&m.t<s.burn+s.sus&&v<s.vCap)m.vel.addScaledVector(_a,s.susAcc*dt);
    m.vel.addScaledVector(_a,-at.rho*s.cd*v*v*dt); m.vel.y-=G*dt;
    v=m.vel.length(); _a.copy(m.vel).divideScalar(v);
    let tg=m.target; if(tg&&!tg.alive){tg=m.target=null;if(!m.reason)m.reason='TARGET GONE'}
    if(m.type==='IR'&&tg&&(tg===P||tg.kind)&&m.t>.3){const why=irEnv(m,tg,dt);if(why){tg=m.target=null;m.reason=why}}
    // semi-active (R-27R): datalink/inertial midcourse, needs the launcher's radar on the target in the terminal phase
    let vt=null;
    if(tg&&(s.sarh||s.arh)&&(tg===P||tg.kind)){const o=m.owner;
      const lockOK=o.alive&&o.tgt===tg&&o.lockT>0&&o.fwd.angleTo(_s1.subVectors(tg.pos,o.pos))<1.05;
      const g=sarhStep(m,s,tg,lockOK,o);
      if(!g){tg=m.target=null;m.reason='NO ILLUMINATION IN TERMINAL PHASE';if(m.wasOnP)message('MISSILE LOST ILLUMINATION',1)} else if(g!==tg)vt=g}
    if(tg===P)m.wasOnP=true;
    if(tg&&m.t>.3){
      const dT=tg.pos.distanceTo(p);
      if(tg===P){
        if(m.type==='IR'){
          // each new flare in the seeker's view gets one chance to steal it
          for(const o of CM.objs){if(o.type!=='flare'||m.seen.has(o))continue;
            _b.subVectors(o.pos,p);
            if(_a.angleTo(_b)<.35&&_b.length()<dT*1.4){m.seen.add(o);
              const thrK=throttle>.81?.4:throttle<.3?1.4:1;           // afterburner plume outshines flares, idle helps them
              _c.subVectors(p,P.pos).normalize();
              const tail=_c.dot(P.fwd)<-.5?.8:1.2;                    // a seeker staring up your tailpipe is harder to fool
              if(Math.random()<s.flareP*thrK*tail){m.target=o;tg=o;m.reason='DECOYED BY YOUR FLARES';break}}}
        } else {
          _c.subVectors(P.pos,p).normalize(); const beam=Math.abs(P.vel.dot(_c))<70;  // beaming: you and the chaff share the clutter doppler
          for(const o of CM.objs){if(o.type!=='chaff'||m.seen.has(o))continue;
            _b.subVectors(o.pos,p);
            if(_a.angleTo(_b)<.3&&_b.length()<dT*1.3){m.seen.add(o);
              if(Math.random()<s.chaffP*(beam?2.5:.3)*(CM.ecm?1.5:1)){m.target=o;tg=o;m.reason='DECOYED BY YOUR CHAFF';break}}}
          if(tg===P&&CM.decoy&&!m.dRolled&&dT<6000){m.dRolled=true;if(Math.random()<.6){m.target=CM.decoy;tg=CM.decoy;m.reason='PULLED OFF BY TOWED DECOY'}}
          if(tg===P&&notchCheck(m,P,dt,.5)){tg=null;message('MISSILE TRASHED',1)}
        }
      } else if(tg.kind){ aiDecoyRoll(m,tg,m.type,s.flareP,s.chaffP,dt); tg=m.target; }
      if(tg){
        const aim=vt&&tg===m.target&&(tg===P||tg.kind)?vt:tg;
        _b.subVectors(aim.pos,p);
        if(m.type==='RDR'&&CM.ecm&&tg===P){ // jamming noise on its track, gone inside ~2 km burn-through
          m.jitT-=dt;if(m.jitT<=0){m.jitT=.4;const k=clamp((dT-2000)/6000,0,1)*90;m.jit.set(rand(-k,k),rand(-k,k),rand(-k,k))}
          _b.add(m.jit)}
        if(_a.angleTo(_b)>s.gimbal){m.target=null;m.reason=m.reason||'TARGET LEFT SEEKER FIELD'}
        else{
          const vr=_c.subVectors(aim.vel,m.vel), om=_d.crossVectors(_b,vr).divideScalar(_b.lengthSq());
          const acc=_e.crossVectors(om,m.vel).multiplyScalar(4); acc.y+=G; acc.addScaledVector(_a,-acc.dot(_a));
          const q=.5*at.rho*v*v, lim=s.gmax*G*clamp(q/40000,m.t<s.burn?.35:.08,1);
          if(acc.length()>lim)acc.setLength(lim); if(!(m.blindT>0))m.vel.addScaledVector(acc,dt);
        }
      }
    }
    m.prev.copy(p); p.addScaledVector(m.vel,dt);
    m.m.quaternion.setFromUnitVectors(ZF,_a.copy(m.vel).normalize());
    if(m.t<s.burn){puff(p.x,p.y,p.z,rand(-3,3),rand(-3,3),rand(-3,3),.85,.85,.87,.55,3,9,1.6);puff(p.x,p.y,p.z,0,0,0,1,.7,.3,.9,1.8,0,.06)}
    let done=false;
    const fz=s.fuze;
    if(m.team==='red'&&state==='play'&&P.alive&&distSeg(P.pos,m.prev,p)<fz){
      done=true;recMsl(m,'HIT','');explode(p,false);P.hp-=75;addHole(playerJet,5);hurtT=.8;shake=1.2;sndHit();buzz([120,60,200]);message('MISSILE HIT',1.2);damageSystem(2);if(P.hp<=0)die('missile');
    } else if(CM.decoy&&m.target===CM.decoy&&distSeg(CM.decoy.pos,m.prev,p)<fz){done=true;recMsl(m,'MISS','HIT YOUR TOWED DECOY');explode(p,false);cutDecoy();syncCM();message('DECOY HIT · DECOY LOST',1.4)}
    else if(m.target&&m.target.kind&&m.target!==P&&distSeg(m.target.pos,m.prev,p)<fz*(m.target.kind==='fighter'?1:1.8)){done=true;recMsl(m,'HIT','');explode(p,false);hitAI(m.target,5,m.name,false)}
    else if(m.target&&m.target.type&&!m.target.kind&&distSeg(m.target.pos,m.prev,p)<fz){done=true;explode(p,false);recMsl(m,'MISS',m.reason||'DECOYED')}
    if(!done&&p.y<Math.max(groundH(p.x,p.z),0)){explode(p,false);done=true;recMsl(m,'MISS',m.reason||'HIT THE GROUND')}
    if(!done&&(m.t>s.life||(m.t>s.burn+(s.sus||0)&&v<250))){explode(p,false);done=true;recMsl(m,'MISS',m.reason||'OUT OF ENERGY')}
    if(!done){if(!m.target){m.lostT=(m.lostT||0)+dt;if(m.lostT>4){explode(p,false);done=true;recMsl(m,'MISS',m.reason||'LOST TARGET')}}else m.lostT=0}
    if(done)kill(m);
  }
}
function setLoadLabel(){const [f,c]=CM_LOADS[cmLoad];$('bLoad').textContent=`Canisters: ${f} flare + ${c} chaff (${f*15}F / ${c*30}C)`}
setLoadLabel(); CM.flares=cmFlares(); CM.chaff=cmChaff();
// countermeasure buttons
holdBtn($('cFlr'),()=>{CM.flrHeld=true;CM.flrT=0},()=>CM.flrHeld=false);
holdBtn($('cChf'),()=>{CM.chfHeld=true;CM.chfT=0},()=>CM.chfHeld=false);
$('cEcm').addEventListener('click',toggleECM);
$('cDcy').addEventListener('click',deployDecoy);
$('cAuto').addEventListener('click',()=>{CM.auto=!CM.auto;message(CM.auto?'CMDS AUTO':'CMDS MANUAL',.9);syncCM()});
syncCM();

