/* ---------------- loop ---------------- */
let last=performance.now();
// AIM-120D: ~30 % more range than the C-7 (86 nm class), two-way datalink, GPS-aided INS (USAF F-16s carry it; approved for some exports)
function effAC(id){const b0=effAC0(id); let v=ldGet(id);
  if(!ldValid(id,v))v=ldDefault(id);
  if(mission==='STRIKE'&&!Object.values(v.ag).some(n=>n>0)&&STRIKE_LOAD[id])v=ldStrike(id);
  const c=ldCap(id), d=ldDefault(id), H=JET_HP[id]||{tankKg:0};
  const mrKg=MRKG[b0.mrFull]||180, srKg=SRKG[b0.srFull]||95, agList=Object.entries(v.ag).filter(([,n])=>n>0);
  const agKg=agList.reduce((a,[k,n])=>a+AGKG[k]*n+(AGW[k].perSt>1?Math.ceil(n/AGW[k].perSt)*145:0),0), tkFuel=v.tk*H.tankKg;
  const mass=(v.sr-d.sr)*srKg+(v.mr-d.mr)*mrKg+agKg+v.tk*(H.tankKg*.14)+tkFuel*.6;
  const scd=(v.sr-d.sr)*.0006+(v.mr-d.mr)*.0009+agList.reduce((a,[k,n])=>a+Math.ceil(n/(AGW[k].perSt||1))*.0015,0)+v.tk*.0025;
  return Object.assign({},b0,{srN:v.sr,mrN:v.mr,agList,tanks:v.tk,tankFuel:tkFuel,MASS:b0.MASS+mass,scd:Math.max(-.004,scd),fuelCap:b0.fuelCap+tkFuel,
    intFuel:b0.fuelCap,strike:agList.length>0,ld:v})}
function effAC0(id){const b=AC_DEFS[id];
  if(id.startsWith('F16')&&use120D)return Object.assign({},b,{mrName:'120D',mrFull:'AIM-120D',
    mr:Object.assign({},b.mr,{maxR:56000,cd:3.5e-5,acc:155,dlR:100000,termR:18000}),
    spec:b.spec.replace(/AIM-120C(-7)?/,'AIM-120D')});
  if(id==='SU35'&&suLR)return Object.assign({},b,{mrName:'R37M',mrFull:'R-37M',mrN:4,srN:4,mr:R37M,
    cm:Object.assign({},b.cm,{stations:[['1','R73','r9_0'],['2','R73','r9_2'],['5','R37M','r120_0'],['6','R37M','r120_2'],['7','R37M','r120_3'],['8','R37M','r120_1'],['11','R73','r9_3'],['12','R73','r9_1']]})});
  if(id==='MIG35'&&tvcOn)return Object.assign({},b,{tvc:true,spec:b.spec+'<span><b>Thrust vectoring</b> nozzles</span>'});
  return b}
function syncOptLabels(){
  $('b120D').hidden=!AC.id.startsWith('F16'); $('b120D').textContent='Missiles: '+(use120D?'AIM-120D':AC.id==='F16B70'?'AIM-120C-7':'AIM-120C');
  $('bR37').hidden=AC.id!=='SU35'; $('bR37').textContent='Missiles: '+(suLR?'4× R-37M + 4× R-73':'8× R-77-1 + 4× R-73');

  if(typeof syncStartLbl==='function')syncStartLbl();
  $('bTVC').hidden=AC.id!=='MIG35'; $('bTVC').textContent='Thrust vectoring: '+(tvcOn?'on':'off');
}
function applyAC(){
  AC=effAC(AC.id);
  SPEC['9X']=AC.sr; SPEC['120']=AC.mr; P.ac=AC; P.gLim=AC.gmax;
  EYE.set(...AC.eye);
  while(playerJet.children.length)playerJet.remove(playerJet.children[0]);
  {const nj=buildJet(PLAYER_COLORS,AC.id);applyLivery(nj);playerJet.add(nj.children[0])} pFlame=playerJet.getObjectByName('flame');
  buildOutside(); if(sun.castShadow)playerJet.traverse(o=>{if(o.isMesh&&!(o.material&&o.material.transparent)){o.castShadow=o.receiveShadow=true}});
  $('b9').firstChild.nodeValue=AC.srName; $('b9').setAttribute('aria-label','Fire '+AC.srFull);
  $('b120').firstChild.nodeValue=AC.mrName; $('b120').setAttribute('aria-label','Fire '+AC.mrFull);
  $('cEcm').firstChild.nodeValue=AC.cm.jam||'ECM'; $('cEcm').hidden=!AC.cm.jam; $('kJamRow').hidden=!AC.cm.jam; $('cDcy').hidden=!AC.cm.decoys; $('kDcyRow').hidden=!AC.cm.decoys; $('bLoad').hidden=AC.cm.fixed;
  $('kSr').textContent=AC.srName; $('kMr').textContent=AC.mrName; $('kJam').textContent=AC.cm.jam;
  $('kSrD').textContent=(AC.srDesc?{[AC.id]:AC.srDesc}:{F16:'AIM-9X heat seeker, short range',F16B70:'AIM-9X heat seeker, cued by JHMCS II',GRIPEN:'IRIS-T heat seeker, Mach 3, 60 g',GRIPENE:'IRIS-T heat seeker, Mach 3, 60 g',MIG29:'R-73 heat seeker, ±40° off-boresight with the helmet sight',MIG29UPG:'R-73 heat seeker, cued by the Thales helmet sight',MIG35:'R-73 heat seeker, cued by the NSTsI helmet sight',SU27:'R-73 heat seeker, ±40° off-boresight with the helmet sight',SU35:'R-73 heat seeker, cued by the helmet sight'})[AC.id]+' · F';
  $('kMrD').textContent=AC.mrDesc&&!(AC.id==='F15EX'&&false)?AC.mrDesc+' · R':AC.id==='SU35'?(suLR?'R-37M: Mach 5–6 very long-range missile, datalink then active seeker. Big and less agile; best against non-maneuvering targets · R':'R-77-1 active radar (Fox 3): datalink, active ~20 km out · R'):AC.id==='SU27'?'R-27ER: long-burn semi-active (Fox 1). Datalink midcourse, hold the lock for the last ~14 km, launch under 5 g · R':AC.id==='MIG35'?'R-77-1 active radar (Fox 3), 110 km class: datalink midcourse, active ~20 km out. STT or TWS track · R':AC.id==='MIG29UPG'?'R-77 active radar (Fox 3): datalink midcourse, goes active ~20 km out, fire and forget. STT or TWS track · R':AC.id==='MIG29'?'R-27R: datalink midcourse (lock can drop and re-lock), semi-active terminal (hold lock for the last ~12 km), launch under 5 g · R':(AC.id.startsWith('GRIPEN')?'Meteor ramjet radar missile, long range':AC.id==='F16B70'?'AIM-120C-7 radar missile':'AIM-120C radar missile')+', needs STT lock or TWS track · R';
  $('kCmD').textContent=(AC.cmDesc?{[AC.id]:AC.cmDesc}:{F16:'ALE-47',F16B70:'ALE-47',GRIPEN:'EWS 39 dispensers',GRIPENE:'BOL dispensers',MIG29:'60 cartridges',MIG29UPG:'60 cartridges',MIG35:'64 cartridges',SU27:'96 cartridges',SU35:'96 cartridges'})[AC.id]+': FLR flares vs heat-seekers, CHF chaff vs radar missiles (hold for salvos) · Z / C';
  $('kJamD').textContent=AC.cm.jamName+': slows their lock, spoils radar shots outside burn-through · J';
  $('kAutoD').textContent=AC.cm.maws?'RWR cues chaff, missile approach warner cues flares · U':'RWR-cued chaff against radar missiles. No missile warner: watch for smoke trails · U';
  $('ovSpec').innerHTML=AC.spec; const oc=$('ovCorner'); if(oc)oc.textContent=AC.corner;
  if(state==='menu')$('ovEyebrow').textContent=AC.eyebrow+(squadron?' · '+squadron:'');
  $('bAC').textContent='Aircraft: '+AC.name;
  styleCockpit(); syncSensors(); P.fuel=.75*(AC.intFuel||AC.fuelCap)+(AC.tankFuel||0); resetSystems(); rearm(); resetCM(); resetRadar(); syncOptLabels(); buildGear(); if(typeof renderLd==='function')renderLd();
}
function setMenuLabels(){$('campBox').hidden=mission!=='CAMPAIGN';if(mission==='CAMPAIGN')renderCamp();$('roomRow').hidden=mission!=='ONLINE';const on=mission==='ONLINE';$('bNetMode').hidden=!on;$('bTeam').hidden=!on||NET.mode!=='TEAMS';$('bNetMode').textContent='Online: '+(NET.mode==='TEAMS'?'teams':'free for all');$('bTeam').textContent='Team: '+({A:'auto',B:'blue',R:'red'})[NET.teamPref];$('lobby').hidden=!on||(state!=='menu'&&state!=='over');if(on)setTimeout(netLobby,0);const tr=mission==='TRAINING';$('bLesson').hidden=!tr;$('bLesson').textContent='Lesson: '+LESSONS[lesson];$('bBandit').hidden=mission==='ONLINE'||tr;$('bDiff').hidden=mission==='ONLINE'||tr;$('bDiff').textContent='Difficulty: '+DIFF[difficulty].name;$('bMission').textContent='Mission: '+MISSIONS[mission];$('bBandit').textContent='Bandits: '+BANDITS[banditType]}
$('bMission').addEventListener('click',()=>{const k=Object.keys(MISSIONS);mission=k[(k.indexOf(mission)+1)%k.length];try{localStorage.setItem('viperMission',mission)}catch(e){};setMenuLabels();applyAC()});
$('bRole').addEventListener('click',()=>{$('ldPanel').hidden=!$('ldPanel').hidden;renderLd()});
$('ldDone').addEventListener('click',()=>{$('ldPanel').hidden=true});
const ldApply=v=>{ldSet(AC.id,v);applyAC()};
$('ldAA').addEventListener('click',()=>ldApply(ldDefault(AC.id)));
$('ldST').addEventListener('click',()=>ldApply(ldStrike(AC.id)));
$('ldCL').addEventListener('click',()=>{const v=ldDefault(AC.id);v.mr=0;v.sr=Math.min(2,v.sr);ldApply(v)});
// loadout editor: one row per store type, +/- within the jet's real stations
function renderLd(){
  const id=AC.id, c=ldCap(id), v=JSON.parse(JSON.stringify(ldValid(id,ldGet(id))?ldGet(id):ldDefault(id))), b=effAC0(id), H=JET_HP[id]||{tankKg:0};
  $('ldJet').textContent=AC.name; const rows=$('ldRows'); rows.innerHTML='';
  const free=c.hp+c.extra-ldUsed(v);
  const row=(label,sub,val,canDec,canInc,dec,inc)=>{const r=document.createElement('div');r.className='ldRow';
    r.innerHTML='<span></span><button type="button" aria-label="Fewer">−</button><b></b><button type="button" aria-label="More">+</button>';
    r.children[0].textContent=label;const sm=document.createElement('small');sm.textContent=sub;r.children[0].appendChild(sm);r.children[2].textContent=val;
    r.children[1].disabled=!canDec;r.children[3].disabled=!canInc;r.children[1].onclick=()=>{dec();ldApply(v)};r.children[3].onclick=()=>{inc();ldApply(v)};rows.appendChild(r)};
  row(b.srFull,'short range · '+c.sr+' rails',v.sr,v.sr>0,v.sr<c.sr,()=>v.sr--,()=>v.sr++);
  if(c.hp)row(b.mrFull,'medium/long range · '+c.hp+' stations',v.mr,v.mr>0,v.mr<c.hp&&free>0,()=>v.mr--,()=>v.mr++);
  for(const k of c.ag){const W=AGW[k],n=v.ag[k]||0,per=W.perSt||1;
    row(W.name,(W.kind==='arm'?'anti-radiation':W.kind==='dumb'?'unguided bomb · CCIP':'guided bomb')+(per>1?' · '+per+' per rack':''),n,n>0,(n%per!==0)||free>0,
      ()=>{v.ag[k]=n-1;if(!v.ag[k])delete v.ag[k]},()=>{v.ag[k]=n+1})}
  if(c.tanks)row('Drop tanks','+'+(H.tankKg/1000).toFixed(1)+' t fuel each · drag · JETT button',v.tk,v.tk>0,v.tk<c.tanks&&free>0,()=>v.tk--,()=>v.tk++);
  const e=effAC(id), m=e.MASS+.75*e.intFuel+e.tankFuel-.6*e.fuelCap+.6*e.fuelCap*0, tw=(e.T_AB/(m*G));
  $('ldSum').textContent=`Stations ${ldUsed(v)}/${c.hp+c.extra} · take-off weight ${(m/1000).toFixed(1)} t · thrust/weight ${tw.toFixed(2)} · fuel ${((.75*e.intFuel+e.tankFuel)/1000).toFixed(1)} t`+` · RCS ≈ ${((RCS[id]??3)+storesRCS(e)).toFixed(2)} m² (est.)`+(c.ag.length?'':' · no air-to-ground stores cleared');
  $('bRole').textContent='Loadout: '+[v.sr+'× '+b.srFull,c.hp?v.mr+'× '+b.mrFull:null,...Object.entries(v.ag).filter(([,n])=>n).map(([k,n])=>n+'× '+AGW[k].sh),v.tk?v.tk+' tank'+(v.tk>1?'s':''):null].filter(Boolean).join(', ')+' ▾'}
$('bBandit').addEventListener('click',()=>{const k=Object.keys(BANDITS);banditType=k[(k.indexOf(banditType)+1)%k.length];try{localStorage.setItem('viperBandit',banditType)}catch(e){};setMenuLabels()});
$('cWing').addEventListener('click',wingCmd);
$('cGci').addEventListener('click',()=>{audioInit();radio(gciName()+', '+myCall()+', bogey dope.','wing');setTimeout(gciBogeyDope,1200)});
$('bLesson').addEventListener('click',()=>{const k=Object.keys(LESSONS);lesson=k[(k.indexOf(lesson)+1)%k.length];try{localStorage.setItem('vsLesson',lesson)}catch(e){};setMenuLabels()});
$('bDiff').addEventListener('click',()=>{const k=Object.keys(DIFF);difficulty=k[(k.indexOf(difficulty)+1)%k.length];try{localStorage.setItem('viperDiff',difficulty)}catch(e){};setMenuLabels()});
// tilt to fly: phone motion sensors. Blocked inside the Claude app viewer; works when the HTML file is opened in a phone browser.
const tilt={on:false,got:false,cal:null,x:0,y:0,raw:{r:0,p:0}};
function tiltAxes(e){const a=(screen.orientation&&screen.orientation.angle)??window.orientation??0;
  const b=e.beta||0,g=e.gamma||0;
  if(a===90)return {r:b,p:g}; if(a===270||a===-90)return {r:-b,p:-g}; return {r:g,p:b}}
function onOrient(e){if(e.beta==null)return;tilt.got=true;const v=tiltAxes(e);tilt.raw=v;
  if(!tilt.cal)tilt.cal={...v};
  const dz=x=>Math.abs(x)<.06?0:x;
  tilt.x=dz(clamp((v.r-tilt.cal.r)/28,-1,1)); tilt.y=dz(clamp((v.p-tilt.cal.p)/22,-1,1))}
function recenterTilt(){if(tilt.on)tilt.cal={...tilt.raw}}
async function setTilt(on){
  if(on){
    try{if(window.DeviceOrientationEvent&&typeof DeviceOrientationEvent.requestPermission==='function'){const r=await DeviceOrientationEvent.requestPermission();if(r!=='granted')throw 0}}
    catch(e){message('MOTION SENSORS NOT ALLOWED HERE',2.4);$('bTilt').textContent='Controls: tilt blocked here';return}
    tilt.on=true;tilt.got=false;tilt.cal=null;addEventListener('deviceorientation',onOrient);
    $('bTilt').textContent='Controls: tilt to fly';
    setTimeout(()=>{if(tilt.on&&!tilt.got){tilt.on=false;removeEventListener('deviceorientation',onOrient);
      $('bTilt').textContent='Controls: tilt blocked here (use the downloaded file)'}},1500);
  } else {tilt.on=false;removeEventListener('deviceorientation',onOrient);$('bTilt').textContent='Controls: touch stick'}
  try{localStorage.setItem('viperTilt',tilt.on?'1':'0')}catch(e){}
}
$('bTilt').addEventListener('click',()=>setTilt(!tilt.on));
try{hapticsOn=localStorage.getItem('viperHaptic')!=='0'}catch(e){}
function setHapticLabel(){$('bHaptic').textContent='Vibration: '+(hapticsOn?(navigator.vibrate?'on':'on (not supported on this phone)'):'off')}
$('bHaptic').addEventListener('click',()=>{hapticsOn=!hapticsOn;setHapticLabel();try{localStorage.setItem('viperHaptic',hapticsOn?'1':'0')}catch(e){};buzz(30)});
setHapticLabel();
$('bQual').addEventListener('click',()=>{const k=Object.keys(QUALS);setQuality(k[(k.indexOf(quality)+1)%k.length])});
$('bQual').textContent='Graphics: '+({LOW:'Low',MED:'Medium',HIGH:'High'})[quality];
setMenuLabels();
$('bAC').addEventListener('click',()=>{const order=FIGHTERS;let i=order.indexOf(AC.id);for(let k=0;k<order.length;k++){i=(i+1)%order.length;if(unlocked(order[i]))break}AC=AC_DEFS[order[i]];try{localStorage.setItem('viperAC',AC.id)}catch(e){};applyAC()});
updateTerrain(0,0); resetPlayer(); applyAC(); syncCareerUI(); applyEnv(); setShadows(quality==='HIGH'); $('bKc').textContent='Kill cam: '+(KC.on?'on':'off');
function frame(now){
  requestAnimationFrame(frame); pollGamepad(Math.min(.05,(now-last)/1000)||.016);
  let dt=Math.min(.05,(now-last)/1000); autoQuality(now-last); last=now;
  if(state==='paused')dt=0;
  const rdt=dt; killCamWatch(rdt); if(KC.t>0)dt*=KC.slow;
  clock+=dt;msgT-=dt;hurtT=Math.max(0,hurtT-dt);shake=Math.max(0,shake-dt);
  if(dt>0){
    // sub-step physics for stability at high g / Mach 4 missiles
    const steps=Math.max(1,Math.ceil(dt/.0167)), h=dt/steps; // keeps every step <= ~16.7 ms whatever the frame rate
    for(let s=0;s<steps;s++){
      if(state!=='paused'&&state!=='replay')updateCarrier(h);
      if(state==='menu')updatePlayer(h,true); else if(state==='play')updatePlayer(h,false);
      if(state!=='menu'&&state!=='replay')updateCombat(h);
    }
    rec3(dt); voiceWatch(); updateEject(dt); syncEjectBtn();
    if(state==='dead'){deadT-=dt;if(deadT<=0){state='over';campaignAfter();careerAward();if(score>best){best=score;try{localStorage.setItem('viperBest',best)}catch(e){}}showOverlay('over')}}
    fxTick++; if(P.alive)jetFX(P,AC.id,true);
    for(const e of enemies)if(e.kind==='fighter')jetFX(e,e.type,false);
    for(const f of friends)if(f.kind==='fighter')jetFX(f,f.type,false);
    if(state==='play'||state==='dead'){dmgFX(P,AC.id,true);for(const e of enemies)dmgFX(e,e.type,false);for(const f of friends)dmgFX(f,f.type,false)}
    updateParticles(dt);
    animJet(playerJet.children[0],P,dt,true); if(outside&&VIEWS[view]==='COCKPIT')animJet(outside,P,dt,true); animGear(dt); updateWrecks(dt);
    for(const L of [enemies,friends])for(const j of L)if(j.alive&&j.kind==='fighter'){const d=j.pos.distanceTo(camera.position);lodJet(j.obj,d);if(d<3500)animJet(j.obj,j,dt,false)}
  }
  HAZE_MAT.uniforms.t.value=clock; HAZE_MAT.uniforms.k.value=QUALS[quality].fx?1:0;
  const cx=Math.round(P.pos.x/TSTEP)*TSTEP,cz=Math.round(P.pos.z/TSTEP)*TSTEP;
  if(cx!==tCx||cz!==tCz)updateTerrain(cx,cz);
  water.position.set(P.pos.x,0,P.pos.z);
  for(const cl of clouds){
    const dx=cl.position.x-P.pos.x,dz=cl.position.z-P.pos.z;
    if(Math.abs(dx)>16000||Math.abs(dz)>16000){
      const a=Math.atan2(P.fwd.x,P.fwd.z)+rand(-1,1),d=rand(10000,15000);
      cl.position.set(P.pos.x+Math.sin(a)*d,ovc()?rand(3250,3700):rand(2600,4200),P.pos.z+Math.cos(a)*d)}
  }
  deck.position.x=P.pos.x; deck.position.z=P.pos.z; stars.position.copy(camera.position);
  updateCamera(dt||.016); if(killCamCamera(rdt||.016))playerJet.visible=P.alive; if(state==='replay')updateReplay(dt||.016); if(PHOTO.on)photoCam(); sky.position.copy(camera.position);
  waterMat.uniforms.t.value=now*.001; glare.position.copy(camera.position).addScaledVector(SUN_DIR,26000);
  pMat.uniforms.fogC.value.copy(scene.fog.color); pMat.uniforms.fogN.value=scene.fog.near; pMat.uniforms.fogF.value=scene.fog.far;
  if(boomLight.intensity>0)boomLight.intensity=Math.max(0,boomLight.intensity-(dt||.016)*7);
  updateShadow(); gust=1+.35*Math.sin(clock*.7)*Math.sin(clock*1.9+1); updateRain(dt||.016);
  for(const cl of clouds){if(!cl.visible)continue;const d=cl.position.distanceTo(camera.position),o=clamp((d-380)/900,0,1)*.95;if(cl.userData.op!==o){cl.userData.op=o;for(const m of cl.userData.mats)m.opacity=o}}
  sndEngine(); sndExtra(); sndFlyby(); updateGlints(); updateFlareLight(); shadowFollow();
  renderer.clear(); renderer.render(scene,camera);
  if(VIEWS[view]==='COCKPIT'&&!(KC.t>0)&&(state==='play'||state==='menu'||state==='paused')){
    updateCockpit(dt||.016); renderer.clearDepth(); renderer.render(cockScene,cockCam);
  }
  if(TGP.mode&&!PHOTO.on)renderTGP(); else TGP.rect=null;
  if(photoGrab)photoCapture();
  drawHUD(); drawRadarPanel();
}
requestAnimationFrame(frame);

/* ---------- HUD colour palette (colour-blind safe option: cyan friendly, orange threat, yellow warning) ---------- */
const PALS={green:{n:'green',hud:'#7dff9a',dim:'rgba(125,255,154,.45)',warn:'#ffb347',threat:'#ff5a4e'},
  cb:{n:'blue / orange',hud:'#5cd0ff',dim:'rgba(92,208,255,.45)',warn:'#ffe14d',threat:'#ff8c1a'}};
let palKey='green'; try{const k=localStorage.getItem('viperPal');if(PALS[k])palKey=k}catch(e){}
function applyPal(){const p=PALS[palKey],r=document.documentElement.style;HUD=p.hud;HUDD=p.dim;WARN=p.warn;THREAT=p.threat;
  r.setProperty('--hud',p.hud);r.setProperty('--hud-dim',p.dim);r.setProperty('--warn',p.warn);r.setProperty('--threat',p.threat);$('bPal').textContent='HUD colours: '+p.n}
$('bPal').addEventListener('click',()=>{palKey=palKey==='green'?'cb':'green';try{localStorage.setItem('viperPal',palKey)}catch(e){};applyPal()});
applyPal();

/* ---------- first-run hint: point new pilots at the guided lessons ---------- */
(function(){let seen=false;try{seen=!!localStorage.getItem('vsSeen')}catch(e){}
  const box=$('firstRun');box.hidden=seen||mission==='TRAINING';
  const done=()=>{box.hidden=true;try{localStorage.setItem('vsSeen','1')}catch(e){}};
  $('bFirst').addEventListener('click',()=>{mission='TRAINING';try{localStorage.setItem('viperMission',mission)}catch(e){};done();setMenuLabels();applyAC()});
  $('bStart').addEventListener('click',done);
})();
