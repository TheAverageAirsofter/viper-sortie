/* ---------------- AI: team-aware fighters (red bandits, blue wingman) and heavies (bombers, transport) ---------------- */
const _s1=new V3(),_s2=new V3(),_s3=new V3(),_s4=new V3(),_s5=new V3();
const RWR_SYM={F16:'16',F16B70:'16',GRIPEN:'39',GRIPENE:'39',MIG29:'29',MIG29UPG:'29',MIG35:'35',SU27:'27',SU35:'S35'};
// bandit missile seekers: how easily each is fooled (game estimates; newer imaging seekers are much harder)
const SEEKER={F16:{flareP:.12,chaffP:.08},F16B70:{flareP:.12,chaffP:.06},GRIPEN:{flareP:.08,chaffP:.06},GRIPENE:{flareP:.08,chaffP:.05},MIG29:{flareP:.3,chaffP:.15},MIG29UPG:{flareP:.3,chaffP:.1},MIG35:{flareP:.25,chaffP:.08},SU27:{flareP:.3,chaffP:.15},SU35:{flareP:.2,chaffP:.07}};
function aiSpecs(type){const ac=AC_DEFS[type],k=SEEKER[type]||ac.seek||{flareP:.15,chaffP:.08};
  return {IR:Object.assign({},ac.sr,{flareP:k.flareP}),RDR:Object.assign({},ac.mr,{chaffP:k.chaffP})}}
function blueJets(){const a=[];if(state==='play'&&P.alive&&!P.scramble)a.push(P);for(const f of friends)if(f.alive)a.push(f);return a}
function pickTarget(e){
  if(e.team==='red'){
    if(e.kind!=='fighter')return null;
    const tr=friends.find(f=>f.alive&&f.kind==='transport');
    if(tr&&e.escortPref)return tr;
    let best=null,bd=e.wp?22000:60000;for(const b of blueJets()){const d=b.pos.distanceTo(e.pos);if(d<bd){bd=d;best=b}}return best;
  }
  // blue wingman / flight
  if(e.cmd==='REJOIN')return null;
  if(e.cmd==='GROUND'){let best=null,bd=80000;for(const g of ground){if(!g.alive)continue;const d=g.pos.distanceTo(e.pos);if(d<bd){bd=d;best=g}}if(best)return best}
  if(e.cmd==='SORT'){const taken=new Set(friends.filter(f=>f!==e&&f.alive&&f.cmd==='SORT'&&f.tgt).map(f=>f.tgt));if(lockTarget)taken.add(lockTarget);
    let best=null,bd=60000;for(const r of enemies){if(!r.alive||taken.has(r))continue;const d=r.pos.distanceTo(e.pos);if(d<bd){bd=d;best=r}}if(best)return best}
  if(e.cmd==='COVER'){let best=null,bd=20000;for(const r of enemies){if(!r.alive||r.tgt!==P)continue;const d=r.pos.distanceTo(P.pos);if(d<bd){bd=d;best=r}}return best}
  let best=null,bd=e.wp?22000:60000;for(const r of enemies){if(!r.alive)continue;const d=r.pos.distanceTo(e.pos);if(d<bd){bd=d;best=r}}return best;
}
// which missile coming at this jet does it know about? radar shots via RWR, heat-seekers only by eye (<3.5 km) or a MAW
function threatTo(e){
  let best=null,bd=1e9;
  const look=(m,radar,burning)=>{const d=m.m.position.distanceTo(e.pos);
    const known=radar?d<25000:(d<sk(e).irSee*(weather==='RAIN'?.6:1)||(e.ac&&e.ac.cm.maws&&burning&&d<10000));
    if(known&&d<bd){bd=d;best={m,d,radar}}};
  for(const m of missiles)if(m.on&&m.target===e){if(m.type==='120'&&SPEC['120'].arh&&!m.term)continue;look(m,m.type==='120',m.t<SPEC[m.type].burn)}
  for(const m of eMissiles)if(m.on&&m.target===e&&m.team!==e.team)look(m,m.type==='RDR',m.t<m.spec.burn);
  if(!best)return null;
  // reaction time, and lower-skill pilots sometimes never react to a given missile
  if(e.awareOf!==best.m){e.awareOf=best.m;e.awareT=clock;e.willDef=Math.random()<sk(e).defP}
  if(!e.willDef||clock-e.awareT<sk(e).react)return null;
  return best;
}
// lift-vector steering: roll the lift onto the desired direction, then pull
function steer(e,dt,dir,gK,thr){
  const ang=e.fwd.angleTo(dir);
  const perp=_s1.copy(dir).addScaledVector(e.fwd,-e.fwd.dot(dir));
  const lift=_s2.set(0,0,0);
  if(perp.lengthSq()>1e-8)lift.copy(perp.normalize()).multiplyScalar(Math.min(ang*2.2,1)*e.gLim*gK*G);
  lift.y+=G; lift.addScaledVector(e.fwd,-e.fwd.dot(lift));
  const nNeed=lift.length()/G; lift.normalize();
  const signed=Math.atan2(_s3.crossVectors(e.up,lift).dot(e.fwd),e.up.dot(lift));
  const rollIn=clamp(signed*2.5,-1,1), nCmd=nNeed*Math.max(0,Math.cos(signed));
  const pitchIn=nCmd>=1?(nCmd-1)/(e.gLim-1):(nCmd-1)/4;
  fly(e,dt,rollIn,clamp(pitchIn,-1,1),0,thr,false);
}
function aiDispense(e,type){ // visual flares/chaff from an AI jet
  if(type==='flare')for(let i=0;i<6;i++)puff(e.pos.x,e.pos.y,e.pos.z,e.vel.x*.3+rand(-30,30),e.vel.y*.3-20,e.vel.z*.3+rand(-30,30),1,.95,.7,1,4,2,1.6);
  else for(let i=0;i<8;i++)puff(e.pos.x,e.pos.y,e.pos.z,rand(-15,15),rand(-15,15),rand(-15,15),.78,.8,.84,.55,5,18,rand(2,4));
}
function ownMissileOn(e,t){for(const m of eMissiles)if(m.on&&m.owner===e&&m.target===t)return m;return null}
function missilesAt(t){let n=0;for(const m of eMissiles)if(m.on&&m.target===t)n++;return n}
// subsonic land-attack cruise missile: ~250 m/s, terrain-following at ~60 m, flies to its target point
function buildCruise(){const g=new THREE.Group(),m=new THREE.MeshStandardMaterial({color:0x8d9196,roughness:.6,flatShading:true});
  const b=new THREE.Mesh(new THREE.CylinderGeometry(.32,.32,6.2,8).rotateX(Math.PI/2),m);g.add(b);const n=new THREE.Mesh(new THREE.ConeGeometry(.32,1,8).rotateX(Math.PI/2),m);n.position.z=3.6;g.add(n);
  const w=new THREE.Mesh(new THREE.BoxGeometry(3.2,.06,.5),m);w.position.z=.3;g.add(w);const t=new THREE.Mesh(new THREE.BoxGeometry(.06,.7,.5),m);t.position.set(0,.4,-2.8);g.add(t);return g}
function spawnCruise(pos,wp){const obj=buildCruise();obj.position.copy(pos);obj.lookAt(wp);scene.add(obj);
  const e=Object.assign(newJet(obj,3,AC_DEFS.F16),{team:'red',type:'CRUISE',kind:'cruise',hp:1,alive:true,wp:wp.clone(),speed:245,tgt:null,mslCd:0,retgtT:0,flareCd:0,chaffCd:0,lockT:0,id:nextId(),rcs:.1});
  axes(e);e.vel.copy(e.fwd).multiplyScalar(e.speed);enemies.push(e);return e}
function updateCruise(e,dt){const gh=Math.max(groundH(e.pos.x,e.pos.z),groundH(e.pos.x+e.vel.x*3,e.pos.z+e.vel.z*3),0);
  _s1.set(e.wp.x,gh+60,e.wp.z); dummy.position.copy(e.pos); dummy.lookAt(_s1); e.obj.quaternion.rotateTowards(dummy.quaternion,.6*dt); axes(e);
  e.vel.copy(e.fwd).multiplyScalar(e.speed); e.pos.addScaledVector(e.vel,dt); if(e.pos.y<gh+25)e.pos.y=gh+25; e.kcas=e.speed*1.9;
  if(Math.random()<.4)puff(e.pos.x-e.fwd.x*3,e.pos.y,e.pos.z-e.fwd.z*3,0,0,0,.9,.9,.92,.15,1,3,.5)}
function updateHeavy(e,dt){ if(e.kind==='cruise'){updateCruise(e,dt);return} // bombers and the transport: steady flight to a waypoint, gentle turns
  _s1.subVectors(e.wp,e.pos); dummy.position.copy(e.pos); dummy.lookAt(e.wp);
  e.obj.quaternion.rotateTowards(dummy.quaternion,.05*dt); axes(e);
  e.vel.copy(e.fwd).multiplyScalar(e.speed); e.pos.addScaledVector(e.vel,dt);
  e.kcas=e.speed*Math.sqrt(atm(e.pos.y).sig)*1.944;
}
const dummy=new THREE.Object3D();
function updateAI(e,dt){
  axes(e); e.flareCd-=dt; e.chaffCd-=dt; e.mslCd-=dt; e.retgtT-=dt;
  if(e.kind!=='fighter'){updateHeavy(e,dt);return}
  if(e.drone){steer(e,dt,_s4.copy(e.fwd).setY(0).normalize(),1,.8);return}
  if(e.retgtT<=0||!e.tgt||!e.tgt.alive){e.retgtT=1.5;e.tgt=pickTarget(e)}
  const tg=e.tgt, live=state==='play';
  const dT=tg?tg.pos.distanceTo(e.pos):1e9;
  let th=live?threatTo(e):null;
  if(!th&&live&&e.rwrSpikeT>clock&&e.team==='red')th={m:{m:{position:P.pos}},d:P.pos.distanceTo(e.pos),radar:true};
  const dir=_s4; let thr=.85,gK=1; e.mode='';
  const lead=e.lead&&e.lead.alive!==false?e.lead:null;
  if(lead&&tg&&dT<22000)e.engaged=true;
  const own=tg?ownMissileOn(e,tg):null;
  if(th){
    // missile defence: notch radar shots at range, drag heat-seekers, break at the end
    const mp=th.m.m.position, l=_s5.subVectors(e.pos,mp); l.y=0; l.normalize();
    const side=_s3.set(l.z,0,-l.x); if(side.dot(e.fwd)<0)side.negate();
    if(th.d<2500){e.mode='BREAK';dir.copy(side).addScaledVector(UP,-.15).normalize();thr=1;gK=1}
    else if(th.radar&&sk(e).notch){e.mode='NOTCH';dir.copy(side).addScaledVector(UP,-.18).normalize();thr=.9}
    else {e.mode='DRAG';dir.copy(l).addScaledVector(UP,-.1).normalize();thr=1}
    if(th.radar&&th.d<7000&&e.chaffCd<=0){e.chaffCd=th.d<2500?.4:1.1;if(Math.random()<sk(e).cmP){aiDispense(e,'chaff');e.cmDrop={t:clock,type:'chaff'}}}
    if(!th.radar&&th.d<4000&&e.flareCd<=0){e.flareCd=th.d<2500?.35:.6;if(Math.random()<sk(e).cmP){aiDispense(e,'flare');e.cmDrop={t:clock,type:'flare'}}}
  } else if(own&&(own.spec.sarh||own.t<9)){
    // crank: keep him 45° off the nose so the radar can support the missile while closing slower
    e.mode='CRANK'; const los=_s5.subVectors(tg.pos,e.pos); los.y*=.3; los.normalize();
    dir.copy(los).applyAxisAngle(UP,e.crankSide*.8);
  } else if(!tg||(lead&&!e.engaged)){
    // fly formation (line abreast, 1.4 km) or, with nothing to do, hold heading
    e.mode='FORM';
    if(lead){_s5.copy(lead.pos).addScaledVector(lead.right,1400*e.side).addScaledVector(lead.fwd,-300).addScaledVector(lead.vel,3);
      dir.subVectors(_s5,e.pos).normalize(); const behind=_s3.subVectors(_s5,e.pos).dot(lead.fwd)>0; thr=behind?1:.72}
    else if(e.wp){dir.subVectors(e.wp,e.pos);dir.y*=.3;dir.normalize();thr=.9}   // air battle: fly to the zone
    else dir.copy(e.fwd);
  } else {
    // attack: pure pursuit long range (stay high), lead pursuit in the fight, unload when slow
    e.mode='ATTACK';
    if(e.holdOff&&dT<21000){dir.subVectors(e.pos,tg.pos);dir.y=0;dir.normalize()}
    else if(dT>15000||ground.includes(tg)){dir.subVectors(tg.pos,e.pos);if(ground.includes(tg))dir.y=Math.max(dir.y,(4500-e.pos.y)/3000);else if(dir.y<0)dir.y*=.3;dir.normalize()}
    else{const t=clamp(dT/900,0,1.2);dir.copy(tg.pos).addScaledVector(tg.vel,t).sub(e.pos).normalize()}
    thr=dT<6000?1:.85; if(e.kcas<300){gK=.65;thr=1} if(e.mach>1.3)thr=.8;
  }
  const gh=Math.max(groundH(e.pos.x,e.pos.z),0), agl=e.pos.y-gh;
  if(agl<900||(e.vel.y<-70&&agl<2600)){dir.copy(e.fwd);dir.y=Math.max(.5,dir.y);dir.normalize();thr=1}
  steer(e,dt,dir,gK,thr*(e.thrK??1));
  const fl=e.obj.getObjectByName('flame'); if(fl)fl.scale.z=thr>.95?1.5:.5; setAB(e.obj,thr>.95);
  if(e.pos.y<Math.max(groundH(e.pos.x,e.pos.z),0)+3){e.alive=false;scene.remove(e.obj);explode(e.pos,true);recEvent((e.team==='red'?'Bandit ':'Wingman ')+'flew into the ground');return}
  if(!live||!tg)return;
  if(ground.includes(tg)){   // flight ground attack: guided bomb release inside ~6 km, then pull off
    const dh=Math.hypot(tg.pos.x-e.pos.x,tg.pos.z-e.pos.z); e.bombCd=(e.bombCd||0)-dt;
    if(dh<6000&&(e.bombs||0)>0&&e.bombCd<=0&&e.pos.y-tg.pos.y>900){e.bombs--;e.bombCd=4;
      const W=AGW.JDAM,m=new THREE.Mesh(new THREE.CylinderGeometry(W.r,W.r*.8,W.len,8).rotateX(Math.PI/2),agStoreMat);m.position.copy(e.pos).addScaledVector(e.up,-1.5);scene.add(m);
      AG.w.push({W,m,pos:m.position,vel:e.vel.clone(),t:0,tgt:tg,aim:tg.pos.clone(),reach:99999,start:m.position.clone(),lift:true,err:new V3()});radio((e.cs||2)+', bombs away.','wing')}
    if((e.bombs||0)<=0&&!e.gndDone){e.gndDone=true;e.cmd='REJOIN';syncWing();radio((e.cs||2)+', Winchester, rejoining.','wing')}
    return}
  _a.subVectors(tg.pos,e.pos); const off=e.fwd.angleTo(_a);
  if(dT<13){if(tg===P){hitAI(e,99,'RAM',true);die('collision')}else{hitAI(e,99,'RAM',false);hitAI(tg,99,'RAM',false)}return}
  // guns: 3° cone inside 1 km
  if(dT<sk(e).gunR&&off<.05&&(e.ac.gunRounds??1)>0){
    e.gunAcc+=dt*(e.ac.gunRate/4);
    while(e.gunAcc>=1){e.gunAcc--;
      const t=gunTof(dT,e.ac.muzzle,atm(e.pos.y).sig); _c.copy(tg.pos).addScaledVector(tg.vel,t*.8).sub(e.pos).normalize();
      const sp=sk(e).spread;_c.x+=rand(-sp,sp);_c.y+=rand(-sp,sp);_c.z+=rand(-sp,sp);_c.normalize();
      const b=take(eBullets);b.on=true;b.life=1.6;b.m.visible=true;b.team=e.team;b.dmg=e.ac.gunDmg;
      b.m.position.copy(e.pos).addScaledVector(e.fwd,9);b.vel.copy(e.vel).addScaledVector(_c,e.ac.muzzle);
      b.m.quaternion.setFromUnitVectors(ZF,_c);
    }
  } else e.gunAcc=0;
  // radar lock (ECM slows it outside ~8 km burn-through), then shots inside his own launch zones
  const jam=tg===P&&CM.ecm&&dT>8000;
  if(dT<35000*(tg===P?rcsK(P,e.pos):1)&&off<1.05)e.lockT+=dt*(jam?.35:1)*sk(e).lock; else e.lockT=Math.max(0,e.lockT-dt*2);
  if(tg===P&&e.lockT>.3&&!e.spiking){e.spiking=true;if(rwrMsgT<=0){message('SPIKE',.9);rwrMsgT=2}}
  if(e.lockT<=0)e.spiking=false;
  e.zoneT-=dt;
  if(e.zoneT<=0){e.zoneT=.5;
    e.zI=e.ir>0?dlz(e.espec.IR,e,tg):null; e.zR=e.rdr>0?dlz(e.espec.RDR,e,tg):null}
  if(e.mslCd<=0&&!own&&missilesAt(tg)<2&&e.mode!=='NOTCH'&&e.mode!=='DRAG'&&e.mode!=='BREAK'){
    const sI=e.espec.IR,sR=e.espec.RDR;
    const D=sk(e), irMax=D.rne?Math.min(e.zI?e.zI.rne*1.15:0,e.zI?e.zI.rmax*D.iK:0):(e.zI?e.zI.rmax*D.iK:0);
    if(e.zI&&dT>sI.minR&&dT<Math.min(irMax,sI.maxR)&&off<sI.cone*.8&&(!sI.rear||rearOK(e.pos,tg))){e.ir--;e.mslCd=rand(5,9)*D.cd;launchAI(e,'IR')}
    else if(e.zR&&e.lockT>2&&dT>sR.minR&&dT<e.zR.rmax*D.rK*(jam?.6:1)&&off<.4&&!(sR.launchG&&e.n>sR.launchG)){e.rdr--;e.mslCd=rand(8,13)*D.cd;launchAI(e,'RDR')}
  }
}

