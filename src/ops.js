/* ---------------- ground threats: Buk-type SAM launchers and radar-guided AAA ----------------
   9M38: Mach 3 (900 m/s), 3–42 km, up to 25 km altitude, semi-active with radio correction (GlobalSecurity) */
const BUK={burn:15,acc:62,cd:5e-5,gmax:22,life:60,fuze:17,gimbal:1.2,chaffP:.1,flareP:0,sarh:true,termR:12000,dlR:45000,minR:3000,maxR:38000};
let ground=[];
function buildSAM(){const g=new THREE.Group();
  const olive=new THREE.MeshLambertMaterial({color:0x4d5a3a}),dk=new THREE.MeshLambertMaterial({color:0x2e3427}),wh=new THREE.MeshLambertMaterial({color:0xd8d8d0});
  const hull=new THREE.Mesh(new THREE.BoxGeometry(3.2,1.8,9),olive);hull.position.y=1.4;g.add(hull);
  const tur=new THREE.Group();tur.position.y=2.4;g.add(tur);
  const dish=new THREE.Mesh(new THREE.CylinderGeometry(1.1,1.1,.3,12).rotateX(Math.PI/2),dk);dish.position.set(0,1.3,1.6);tur.add(dish);
  for(const x of [-.7,.7])for(const y of [.4,1.0]){const m=new THREE.Mesh(new THREE.CylinderGeometry(.2,.2,5.5,6).rotateX(Math.PI/2),wh);m.position.set(x,y,-1);m.rotation.x=-.5;tur.add(m)}
  g.userData.tur=tur;return g}
function buildAAA(){const g=new THREE.Group();const olive=new THREE.MeshLambertMaterial({color:0x56603e}),dk=new THREE.MeshLambertMaterial({color:0x2a2e24});
  const hull=new THREE.Mesh(new THREE.BoxGeometry(3,1.6,6.5),olive);hull.position.y=1.2;g.add(hull);
  const tur=new THREE.Group();tur.position.y=2.2;g.add(tur);tur.add(new THREE.Mesh(new THREE.BoxGeometry(2.4,1,2.6),olive));
  for(const x of [-.5,-.2,.2,.5]){const b=new THREE.Mesh(new THREE.CylinderGeometry(.05,.05,2.5,4).rotateX(Math.PI/2),dk);b.position.set(x,.4,1.6);tur.add(b)}
  g.userData.tur=tur;return g}
// early-warning radar (rotating antenna, cues the SAMs) and a hardened command bunker
function buildRadar(){const g=new THREE.Group();const olive=new THREE.MeshLambertMaterial({color:0x4d5a3a}),dk=new THREE.MeshLambertMaterial({color:0x2e3427});
  const hull=new THREE.Mesh(new THREE.BoxGeometry(3,2,8),olive);hull.position.y=1.5;g.add(hull);const mast=new THREE.Mesh(new THREE.CylinderGeometry(.25,.25,6,6),dk);mast.position.y=5;g.add(mast);
  const tur=new THREE.Group();tur.position.y=8;g.add(tur);const ant=new THREE.Mesh(new THREE.BoxGeometry(9,2.2,.4),dk);tur.add(ant);g.userData.spin=tur;return g}
function buildBunker(){const g=new THREE.Group();const con=new THREE.MeshLambertMaterial({color:0x8a8a80}),dk=new THREE.MeshLambertMaterial({color:0x3a3a36});
  const b=new THREE.Mesh(new THREE.BoxGeometry(22,6,14),con);b.position.y=2;g.add(b);const top=new THREE.Mesh(new THREE.BoxGeometry(18,2,10),con);top.position.y=6;g.add(top);
  const door=new THREE.Mesh(new THREE.BoxGeometry(5,4,.4),dk);door.position.set(0,2,7.1);g.add(door);return g}
function buildTruck(){const g=new THREE.Group();const ol=new THREE.MeshLambertMaterial({color:0x55603e}),dk=new THREE.MeshLambertMaterial({color:0x2a2e24});
  const cab=new THREE.Mesh(new THREE.BoxGeometry(2.4,2.2,2.2),ol);cab.position.set(0,1.6,3);g.add(cab);const box=new THREE.Mesh(new THREE.BoxGeometry(2.5,2.6,5.6),dk);box.position.set(0,1.8,-.8);g.add(box);return g}
// enemy frigate: 125 m, radar mast, vertical-launch SAMs, a gun forward
function buildShip(){const g=new THREE.Group();const gr=new THREE.MeshLambertMaterial({color:0x6c7278}),dk=new THREE.MeshLambertMaterial({color:0x3e4348});
  const h=new THREE.Mesh(new THREE.BoxGeometry(14,8,110),gr);h.position.y=2;g.add(h);const bow=new THREE.Mesh(new THREE.CylinderGeometry(0,7,18,4,1).rotateX(Math.PI/2).rotateZ(Math.PI/4),gr);bow.scale.set(1,.6,1);bow.position.set(0,3,63);g.add(bow);
  const sup=new THREE.Mesh(new THREE.BoxGeometry(10,9,30),gr);sup.position.set(0,10,-5);g.add(sup);const mast=new THREE.Mesh(new THREE.CylinderGeometry(.6,1.2,18,6),dk);mast.position.set(0,23,-2);g.add(mast);
  const tur=new THREE.Group();tur.position.set(0,24,-2);g.add(tur);tur.add(new THREE.Mesh(new THREE.BoxGeometry(6,1.4,.4),dk));
  const vls=new THREE.Mesh(new THREE.BoxGeometry(8,1.2,9),dk);vls.position.set(0,6.6,24);g.add(vls);const gun=new THREE.Mesh(new THREE.BoxGeometry(3,2,4),gr);gun.position.set(0,7,40);g.add(gun);
  g.userData.spin=tur;return g}
const ISLES=[], isleMat=new THREE.MeshLambertMaterial({color:0xcdbb8e});
function clearIsles(){ISLES.forEach(o=>scene.remove(o));ISLES.length=0}
function spawnGround(kind,x,z,objective){
  let lift=0; if(kind!=='ship'&&groundH(x,z)<1.5){lift=2.5;if(!ISLES.some(o=>Math.hypot(o.position.x-x,o.position.z-z)<200)){const is=new THREE.Mesh(new THREE.CylinderGeometry(240,330,6,28),isleMat);is.position.set(x,-.5,z);scene.add(is);ISLES.push(is)}}
  const y=(kind==='ship'?0:Math.max(groundH(x,z),0)+lift)+.2, obj=kind==='sam'?buildSAM():kind==='radar'?buildRadar():kind==='bunker'?buildBunker():kind==='truck'?buildTruck():kind==='ship'?buildShip():buildAAA(); obj.position.set(x,y,z); scene.add(obj);
  const e={kind,team:'red',type:({sam:'SAM',radar:'RADAR',bunker:'BUNKER',truck:'TRUCK',ship:'SHIP'})[kind]||'AAA',obj,pos:obj.position,vel:new V3(),fwd:new V3(0,0,1),up:UP,right:new V3(1,0,0),alive:true,hp:({sam:8,bunker:14,radar:5,truck:2,ship:24})[kind]||6,objective:!!objective,offT:0,
    lockT:0,tgt:null,mslCd:rand(4,8),shots:kind==='sam'?4:kind==='ship'?8:0,id:nextId(),gunAcc:0,seenT:-99};
  ground.push(e); return e;
}
function losClear(a,b){for(let i=1;i<8;i++){const t=i/8,x=a.x+(b.x-a.x)*t,z=a.z+(b.z-a.z)*t,y=a.y+(b.y-a.y)*t;if(Math.max(groundH(x,z),0)>y)return false}return true}
function updateGround(dt){
  if(state!=='play'||!P.alive){for(const g of ground){g.lockT=0;g.tgt=null}return}
  const ewr=ground.some(g=>g.alive&&g.kind==='radar'&&!(g.offT>0));
  for(const g of ground){if(!g.alive)continue;
    if(g.path){g.s=Math.min(g.s+g.spd*dt,g.path.len);const p=g.path,t=g.s/p.len;g.pos.set(p.a.x+(p.b.x-p.a.x)*t,0,p.a.z+(p.b.z-p.a.z)*t);g.pos.y=Math.max(groundH(g.pos.x,g.pos.z),0)+.2;g.obj.rotation.y=Math.atan2(p.b.x-p.a.x,p.b.z-p.a.z);g.vel.set(p.b.x-p.a.x,0,p.b.z-p.a.z).setLength(g.s<p.len?g.spd:0)}
    if(g.orbit){g.orbit.a+=g.spd/g.orbit.r*dt;g.pos.set(g.orbit.c.x+Math.cos(g.orbit.a)*g.orbit.r,.2,g.orbit.c.z+Math.sin(g.orbit.a)*g.orbit.r);g.obj.rotation.y=Math.atan2(-Math.sin(g.orbit.a),Math.cos(g.orbit.a));g.vel.set(-Math.sin(g.orbit.a),0,Math.cos(g.orbit.a)).multiplyScalar(g.spd);if(g.obj.userData.spin)g.obj.userData.spin.rotation.y+=dt*2}
    if(g.kind==='truck'||g.kind==='bunker')continue;
    if(g.kind==='radar'){if(g.obj.userData.spin&&!(g.offT>0))g.obj.userData.spin.rotation.y+=dt*1.6;g.offT=Math.max(0,(g.offT||0)-dt);continue}
    // an anti-radiation missile inbound: some crews switch the radar off (and stop shooting) to survive it
    if(g.offT>0){g.offT-=dt;g.lockT=0;g.tgt=null;g.spiking=false;continue}
    if(!g.armRolled&&AG.w.some(w=>w.W.kind==='arm'&&w.tgt===g&&w.pos.distanceTo(g.pos)<22000)){g.armRolled=true;if(Math.random()<.35){g.offT=rand(25,40);continue}}
    g.mslCd-=dt; _s1.subVectors(P.pos,g.pos); const d=_s1.length(); _s1.divideScalar(d||1); g.fwd.copy(_s1);
    const tur=g.obj.userData.tur; if(tur)tur.rotation.y=Math.atan2(_s1.x,_s1.z);
    const agl=P.pos.y-Math.max(groundH(P.pos.x,P.pos.z),0);
    if(g.kind==='sam'||g.kind==='ship'){
      // pulse-doppler radar: needs line of sight, loses you in the beam (near-zero closure) and in ground clutter below ~30 m
      const radial=Math.abs(P.vel.dot(_s1)), seen=!P.scramble&&d<45000*rcsK(P,g.pos)&&agl>30&&P.pos.y<25000&&radial>35&&(g.losT=(g.losT||0)-dt,g.losT>0?g.los:(g.losT=.5,g.los=losClear(g.pos.clone().setY(g.pos.y+6),P.pos)));
      if(seen){g.lockT+=dt*(CM.ecm&&d>9000?.4:1)*(ewr?1.5:1);g.tgt=P;g.seenT=clock} else {g.lockT=Math.max(0,g.lockT-dt*1.5);if(g.lockT<=0)g.tgt=null}
      if(g.lockT>.3&&!g.spiking){g.spiking=true;if(rwrMsgT<=0){message('SAM SPIKE',1.2);rwrMsgT=2}} if(g.lockT<=0)g.spiking=false;
      let mine=false;for(const m of eMissiles)if(m.on&&m.owner===g)mine=true;
      if(g.lockT>4&&g.shots>0&&g.mslCd<=0&&!mine&&d>BUK.minR&&d<BUK.maxR){g.shots--;g.mslCd=rand(9,14);launchSAM(g)}
    } else {
      // radar-directed 23 mm: inside ~2.5 km and below ~2,000 m above the gun
      const inR=d<2600&&P.pos.y-g.pos.y<2000&&agl>15&&losClear(g.pos.clone().setY(g.pos.y+3),P.pos);
      g.tgt=inR?P:null; g.lockT=inR?1:0;
      if(inR){g.gunAcc+=dt*12;while(g.gunAcc>=1){g.gunAcc--;const t=d/970;_c.copy(P.pos).addScaledVector(P.vel,t).sub(g.pos).normalize();
        const sp=.018;_c.x+=rand(-sp,sp);_c.y+=rand(-sp,sp);_c.z+=rand(-sp,sp);_c.normalize();
        const b=take(eBullets);b.on=true;b.life=3;b.m.visible=true;b.team='red';b.dmg=1;b.m.position.copy(g.pos).setY(g.pos.y+3);b.vel.copy(_c).multiplyScalar(970);b.m.quaternion.setFromUnitVectors(ZF,_c)}}
      else g.gunAcc=0;
    }
  }
}
function launchSAM(g){
  const m=take(eMissiles);m.on=true;m.type='RDR';m.t=0;m.target=P;m.m.visible=true;m.owner=g;m.team='red';m.spec=BUK;
  m.seen=new Set();m.notchT=0;m.notchRolled=false;m.blindT=0;m.lostT=0;m.dRolled=false;m.mawsWarned=false;m.mawSeen=-99;m.term=false;m.kp=null;m.gmode='';m.jit=m.jit||new V3();m.jit.set(0,0,0);m.jitT=0;m.reason='';
  m.name='9M38 (Buk)'; m.m.scale.set(1.8,1.8,1.9);
  m.m.position.copy(g.pos).setY(g.pos.y+4); m.prev.copy(m.m.position); m.vel.set(0,40,0).addScaledVector(g.fwd,20);
  recLaunch(m,'SAM site',P); message('SAM LAUNCH',1.8); buzz([60,50,60,50,60]); for(let i=0;i<5;i++)setTimeout(()=>sndBeep(1300,.06,.05),i*100);
}
function clearGround(){for(const g of ground)scene.remove(g.obj);ground=[]}
function killGround(g){if(!g.alive)return;g.alive=false;explode(g.pos.clone().setY(g.pos.y+3),true);g.obj.rotation.z=.3;g.obj.position.y-=1;
  kills++;score+=200*Math.max(1,wave);message(({sam:'SAM SITE DESTROYED',aaa:'AAA DESTROYED',radar:'EW RADAR DESTROYED',bunker:'BUNKER DESTROYED',truck:'TRUCK DESTROYED',ship:'FRIGATE SUNK'})[g.kind],1.6);recEvent('You destroyed '+({sam:'a SAM launcher',aaa:'an AAA gun',radar:'the early-warning radar',bunker:'the command bunker',truck:'a convoy truck',ship:'the frigate'})[g.kind]);if(g.kind==='ship'){g.obj.rotation.z=.25;g.obj.position.y=-4}if(typeof campaignKill==='function')campaignKill(g)}


/* ---------------- air-to-ground: anti-radiation missiles, guided and unguided bombs ----------------
   HARM: Mach 2+, 100+ km class; Kh-31P: ramjet, Mach 3.5, ~110 km; JDAM (GBU-31): up to ~28 km; GBU-39 SDB: ~110 km from altitude;
   AASM Hammer: 15 km low / ~57 km high; Paveway IV, GBU-49, KAB-500 series, LS-6: glide ranges est. Game ranges are trimmed. */
const AGW={
  HARM:{name:'AGM-88 HARM',sh:'HARM',kind:'arm',burn:6,acc:150,cd:3e-5,gmax:20,maxR:80000,minR:5000,blast:15,len:4.2,r:.13},
  KH31P:{name:'Kh-31P',sh:'KH31',kind:'arm',burn:3,acc:170,sus:35,susAcc:55,vCap:1150,cd:3e-5,gmax:18,maxR:90000,minR:5000,blast:18,len:4.7,r:.18},
  YJ91:{name:'YJ-91',sh:'YJ91',kind:'arm',burn:3,acc:170,sus:35,susAcc:55,vCap:1150,cd:3e-5,gmax:18,maxR:90000,minR:5000,blast:18,len:4.7,r:.18},
  JDAM:{name:'GBU-31 JDAM',sh:'JDAM',kind:'gps',glide:2.4,blast:45,len:3.9,r:.23},
  SDB:{name:'GBU-39 SDB',sh:'SDB',kind:'gps',glide:7.5,blast:12,len:1.8,r:.1},
  GBU49:{name:'GBU-49',sh:'GBU49',kind:'gps',glide:1.5,blast:25,len:3.3,r:.14},
  PAVE4:{name:'Paveway IV',sh:'PWIV',kind:'gps',glide:2.4,blast:25,len:3.3,r:.14},
  AASM:{name:'AASM Hammer',sh:'AASM',kind:'gps',glide:3.6,boost:12000,blast:25,len:3.1,r:.16},
  KAB500S:{name:'KAB-500S',sh:'KAB',kind:'gps',glide:1.7,blast:30,len:3.0,r:.2},
  KAB500KR:{name:'KAB-500Kr',sh:'KAB',kind:'gps',glide:1.6,blast:30,len:3.05,r:.2},
  LS6:{name:'LS-6',sh:'LS6',kind:'gps',glide:5.5,blast:30,len:3.4,r:.2},
  FAB500:{name:'FAB-500',sh:'FAB',kind:'dumb',blast:32,len:2.4,r:.2},
  MK82:{name:'Mk 82 500 lb',sh:'MK82',kind:'dumb',blast:28,len:2.2,r:.13},
  MK84:{name:'Mk 84 2,000 lb',sh:'MK84',kind:'dumb',blast:40,len:3.3,r:.23},
  FAB250:{name:'FAB-250',sh:'FAB250',kind:'dumb',blast:26,len:2.1,r:.15},
  AGM65:{name:'AGM-65 Maverick',sh:'MAV',kind:'gps',glide:3,blast:22,len:2.45,r:.15},
  KH25ML:{name:'Kh-25ML',sh:'KH25',kind:'gps',glide:3.4,blast:24,len:3.8,r:.14}};
// strike loadouts: [weapon, count], and how many medium-range air-to-air missiles stay on (game fits, based on each jet's cleared stores)
const STRIKE_LOAD={FA18E:{ag:[['HARM',2],['JDAM',2]],keep:2},MIG29K:{ag:[['KH31P',2],['KAB500KR',2]],keep:2},SU33:{ag:[['FAB500',6]],keep:2},F16:{ag:[['HARM',2],['JDAM',2]],keep:2},F16B70:{ag:[['HARM',2],['JDAM',2]],keep:2},F15EX:{ag:[['JDAM',4]],keep:4},
  GRIPEN:{ag:[['GBU49',2]],keep:2},GRIPENE:{ag:[['SDB',4]],keep:2},TYPHOON:{ag:[['PAVE4',4]],keep:4},RAFALE:{ag:[['AASM',4]],keep:2},
  MIG29:{ag:[['FAB500',4]],keep:0},MIG29UPG:{ag:[['KH31P',2],['KAB500KR',2]],keep:2},MIG35:{ag:[['KH31P',2],['KAB500S',2]],keep:4},
  SU27:{ag:[['FAB500',6]],keep:2},SU35:{ag:[['KH31P',2],['KAB500S',4]],keep:4},J10C:{ag:[['YJ91',2],['LS6',2]],keep:2},
  A10A:{ag:[['AGM65',4],['MK82',4]],keep:0},SU25:{ag:[['KH25ML',2],['FAB250',4]],keep:0},A7E:{ag:[['MK82',6]],keep:0},A4E:{ag:[['MK82',3]],keep:0},SU22M3:{ag:[['KH25ML',2],['FAB250',4]],keep:0},
  ALPHAJET:{ag:[['MK82',4]],keep:0},G91Y:{ag:[['MK82',4]],keep:0},JAGUAR:{ag:[['MK84',2],['MK82',2]],keep:0},Q5A:{ag:[['FAB250',4]],keep:0},AMX:{ag:[['MK84',2],['MK82',2]],keep:0},F104S:{ag:[['MK82',3]],keep:0},TORNADOIT:{ag:[['MK84',2],['MK82',2]],keep:0}};
const AG={load:[],tgt:null,tgtT:0,w:[],sel:0};
AGW.SDB.perSt=4; for(const k of ['GBU49','PAVE4','KAB500KR','AGM65','KH25ML'])AGW[k].track=true;   // laser / TV seekers follow a moving target   // GBU-39s ride four to a BRU-61 rack
// store weights (kg) and the extra stations (centreline / heavy inboard) beyond the missile rails; tanks: max count and fuel per tank.
// Cleared weapons follow each type's real stores where known; tank sizes from published tank capacities (e.g. F-16 370 gal, F-15 600 gal, PTB-2000).
const AGKG={HARM:361,KH31P:600,YJ91:600,JDAM:925,SDB:130,GBU49:240,PAVE4:230,AASM:340,KAB500S:560,KAB500KR:520,LS6:500,FAB500:500,MK82:241,MK84:900,FAB250:250,AGM65:210,KH25ML:300};
const MRKG={'AIM-120C':152,'AIM-120C-7':161,'AIM-120D':161,'R-27R':253,'R-27ER':350,'R-77':175,'R-77-1':190,'R-37M':510,'METEOR':190,'PL-15':210};
const SRKG={'AIM-9X':85,'R-73':105,'IRIS-T':87,'PL-10':89,'MICA IR':112};
const JET_HP={F16:{extra:1,tanks:3,tankKg:1130,ag:['HARM','JDAM']},F16B70:{extra:1,tanks:3,tankKg:1130,ag:['HARM','JDAM']},
  F15C:{extra:1,tanks:3,tankKg:1820,ag:[]},F15EX:{extra:3,tanks:3,tankKg:1820,ag:['JDAM','SDB']},FA18E:{extra:1,tanks:3,tankKg:1500,ag:['HARM','JDAM']},
  GRIPEN:{extra:1,tanks:3,tankKg:880,ag:['GBU49']},GRIPENE:{extra:3,tanks:3,tankKg:880,ag:['SDB','GBU49']},TYPHOON:{extra:1,tanks:3,tankKg:800,ag:['PAVE4']},
  RAFALE:{extra:2,tanks:3,tankKg:1600,ag:['AASM']},MIG29:{extra:1,tanks:3,tankKg:1150,ag:['FAB500']},MIG29UPG:{extra:1,tanks:3,tankKg:1150,ag:['KH31P','KAB500KR','FAB500']},
  MIG29K:{extra:1,tanks:3,tankKg:1150,ag:['KH31P','KAB500KR','FAB500']},MIG35:{extra:1,tanks:3,tankKg:1150,ag:['KH31P','KAB500S','FAB500']},
  SU27:{extra:0,tanks:0,tankKg:0,ag:['FAB500']},SU33:{extra:2,tanks:0,tankKg:0,ag:['FAB500']},SU35:{extra:2,tanks:2,tankKg:1600,ag:['KH31P','KAB500S','FAB500']},
  J10C:{extra:1,tanks:3,tankKg:1100,ag:['YJ91','LS6']},J20:{extra:0,tanks:0,tankKg:0,ag:[]}};
rosterFill(JET_HP,{A10A:{extra:10,tanks:0,tankKg:0,ag:['AGM65','MK82','MK84']},SU25:{extra:8,tanks:2,tankKg:1300,ag:['KH25ML','FAB250','FAB500']},A7E:{extra:6,tanks:2,tankKg:1000,ag:['MK82','MK84']},A4E:{extra:3,tanks:1,tankKg:1000,ag:['MK82']},SU22M3:{extra:6,tanks:2,tankKg:1300,ag:['KH25ML','FAB250','FAB500']},
  ALPHAJET:{extra:4,tanks:1,tankKg:245,ag:['MK82']},G91Y:{extra:4,tanks:2,tankKg:500,ag:['MK82']},JAGUAR:{extra:5,tanks:3,tankKg:1000,ag:['MK82','MK84']},Q5A:{extra:6,tanks:0,tankKg:0,ag:['FAB250']},AMX:{extra:5,tanks:2,tankKg:500,ag:['MK82','MK84']},F104S:{extra:3,tanks:2,tankKg:900,ag:['MK82']},TORNADOIT:{extra:5,tanks:2,tankKg:1170,ag:['MK82','MK84']},
  F4C:{extra:2,tanks:3,tankKg:1800,ag:[]},F5A:{extra:1,tanks:3,tankKg:700,ag:[]},J35D:{extra:0,tanks:1,tankKg:600,ag:[]},J29F:{extra:0,tanks:0,tankKg:0,ag:[]},J6A:{extra:0,tanks:2,tankKg:400,ag:[]},MIG21MF:{extra:1,tanks:2,tankKg:490,ag:[]},F8E:{extra:0,tanks:2,tankKg:1000,ag:[]},F100D:{extra:1,tanks:2,tankKg:1000,ag:[]},MIG19PT:{extra:0,tanks:2,tankKg:400,ag:[]},MIG21F13:{extra:0,tanks:1,tankKg:400,ag:[]},HUNTER:{extra:0,tanks:2,tankKg:540,ag:[]},MIRAGE3C:{extra:0,tanks:2,tankKg:800,ag:[]},F4E:{extra:2,tanks:3,tankKg:1800,ag:['PAVE4']},F35A:{extra:2,tanks:0,tankKg:0,ag:['JDAM']},F22A:{extra:0,tanks:0,tankKg:0,ag:[]},F104G:{extra:1,tanks:2,tankKg:700,ag:[]},
  MIG21:{extra:1,tanks:2,tankKg:400,ag:['FAB500']},SU57:{extra:2,tanks:0,tankKg:0,ag:['KAB500S']},J35F:{extra:0,tanks:1,tankKg:600,ag:[]},JA37:{extra:1,tanks:1,tankKg:1000,ag:[]},
  LIGHTNING:{extra:0,tanks:1,tankKg:1000,ag:[]},TORNADO3:{extra:1,tanks:2,tankKg:1500,ag:[]},KFIR:{extra:2,tanks:3,tankKg:900,ag:['PAVE4']},F15E:{extra:3,tanks:3,tankKg:1820,ag:['JDAM','SDB']},
  F15I:{extra:3,tanks:3,tankKg:1820,ag:['JDAM','SDB']},F16I:{extra:1,tanks:3,tankKg:1130,ag:['JDAM']},F5E:{extra:1,tanks:3,tankKg:900,ag:[]},F14B:{extra:0,tanks:2,tankKg:1000,ag:[]},MIG23ML:{extra:1,tanks:2,tankKg:800,ag:['FAB500']},MIG25PD:{extra:0,tanks:0,tankKg:0,ag:[]},J8F:{extra:1,tanks:2,tankKg:900,ag:['LS6']},MIRAGEF1:{extra:1,tanks:2,tankKg:1100,ag:[]},M2000:{extra:2,tanks:3,tankKg:1700,ag:['LS6']},J7G:{extra:1,tanks:2,tankKg:400,ag:['LS6']},J11B:{extra:1,tanks:0,tankKg:0,ag:['YJ91','LS6']},J15:{extra:1,tanks:0,tankKg:0,ag:['YJ91','LS6']},J16:{extra:2,tanks:2,tankKg:1600,ag:['YJ91','LS6']},SU30SM:{extra:2,tanks:2,tankKg:1600,ag:['KH31P','KAB500S','FAB500']}});
const railsOf=(b,re)=>b.cm.stations.filter(st=>re.test(st[2])).length;
function ldDefault(id){const b=effAC0(id);return{sr:b.srN,mr:ldStockMr(id,b),ag:{},tk:0}}
// a stock career jet carries only the basic missile load until Weapon pylons is installed
function ldStockMr(id,b){return careerOn&&!hasMod(id,'ord1')?Math.min(b.mrN,Math.max(2,Math.ceil(b.mrN/2))):b.mrN}
function ldStrike(id){const b=effAC0(id),SL=STRIKE_LOAD[id];if(!SL)return ldDefault(id);const ag={};SL.ag.forEach(([k,n])=>ag[k]=n);return{sr:b.srN,mr:Math.min(b.mrN,SL.keep),ag,tk:0}}
function ldGet(id){try{const v=JSON.parse(localStorage.getItem('vsLd_'+id)||'null');if(v&&typeof v.sr==='number')return v}catch(e){}return strikeRole&&STRIKE_LOAD[id]?ldStrike(id):ldDefault(id)}
function ldSet(id,v){try{localStorage.setItem('vsLd_'+id,JSON.stringify(v))}catch(e){}}
function ldCap(id){const b=effAC0(id),H=JET_HP[id]||{extra:0,tanks:0,tankKg:0,ag:[]},o=!careerOn||hasMod(id,'ord1'),t=!careerOn||hasMod(id,'tnk1');return{sr:railsOf(b,/^r9_/),hp:o?railsOf(b,/^r120_/):ldStockMr(id,b),extra:o?H.extra:0,tanks:t?H.tanks:0,tankKg:H.tankKg,ag:o?H.ag:[]}}
const ldUsed=(v)=>v.mr+Object.entries(v.ag).reduce((a,[k,n])=>a+Math.ceil(n/(AGW[k].perSt||1)),0)+v.tk;
function ldValid(id,v){const c=ldCap(id);return v.sr>=0&&v.sr<=c.sr&&v.mr>=0&&v.mr<=c.hp&&v.tk>=0&&v.tk<=c.tanks&&Object.keys(v.ag).every(k=>c.ag.includes(k)&&v.ag[k]>=0)&&ldUsed(v)<=c.hp+c.extra}
const agStoreMat=new THREE.MeshStandardMaterial({color:0x8a8f7a,roughness:.6,flatShading:true});
function agCount(){return AG.load.reduce((a,l)=>a+l.n,0)}
function agReset(){AG.load=(AC.agList||[]).map(([k,n])=>({k,n,max:n}));AG.tgt=null;AG.w.forEach(w=>{scene.remove(w.m)});AG.w=[];agStores();agSync()}
// hang the stores on the freed rails (and extra stations under the fuselage)
function agStores(){
  const g=playerJet.children[0]; if(!g)return; g.children.filter(o=>/^(ag_|agpy_|tgp_)/.test(o.name)).forEach(o=>g.remove(o));
  const rails=[]; g.traverse(o=>{const m=/^r120_(\d+)/.exec(o.name);if(m)rails.push([+m[1],o])}); rails.sort((a,b)=>a[0]-b[0]);
  g.children.filter(o=>/^tk_/.test(o.name)).forEach(o=>g.remove(o));
  const free=rails.filter(([i])=>i>=AC.mrN).map(([,o])=>o.position.clone());
  const ref=rails.length?rails[0][1].position:new V3(2,-.6,-1), need=AG.load.reduce((a,l)=>a+Math.ceil(l.max/(AGW[l.k].perSt||1)),0)+(AC.tanks||0);
  const cl=new V3(0,ref.y-.45,ref.z+.2); if(free.length<need)free.push(cl);
  for(let k=0;free.length<need;k++){const s=k%2?-1:1;free.push(new V3(s*(Math.abs(ref.x)*.45+.35*(k>>1)),ref.y-.35,ref.z+.6-(k>>1)*1.2))}
  const sc=M2[AC.id]?1:AC.id.startsWith('F16')?1/.75:AC.id.startsWith('SU')?1/1.266:1;
  // tanks take the centreline first, then the heavy stations
  for(let i=0;i<(AC.tanks||0);i++){const p=free.pop();if(!p)break;const geo=new THREE.CylinderGeometry(.38,.38,4.4,10);
    geo.rotateX(Math.PI/2);const m=new THREE.Mesh(geo,tankMat);m.scale.setScalar(sc);m.position.copy(p).add(new V3(0,-.15,0));m.name='tk_'+i;m.visible=!P.tanksGone;g.add(m);
    const nc=new THREE.Mesh(new THREE.SphereGeometry(.38,10,8),tankMat);nc.scale.set(1,1,2.2);nc.position.z=2.2;m.add(nc);const tc=nc.clone();tc.position.z=-2.2;m.add(tc);
    const fin=new THREE.Mesh(new THREE.BoxGeometry(.02,.5,.6),tankMat);fin.position.set(0,.2,-2.3);m.add(fin);agPylon(g,m.position,.38*sc,'agpy_tk'+i)}
  let n=0;
  for(const l of AG.load){const W=AGW[l.k],per=W.perSt||1;for(let i=0;i<l.max;i++){if(i%per===0)n++;const p=free[n-1];if(!p)continue;
    const m=storeMesh(W);m.scale.setScalar(sc);if(i%per===0)agPylon(g,p,W.r*sc*(per>1?1.6:1),'agpy_'+l.k+i);
    m.position.copy(p);if(per>1){m.position.x+=((i%per)%2-.5)*.32;m.position.y-=Math.floor((i%per)/2)*.26}m.name='ag_'+l.k+'_'+i;m.visible=i<l.n;g.add(m)}}}
const tankMat=new THREE.MeshStandardMaterial({color:0x9aa1a8,roughness:.5,metalness:.2});
const pylMat=new THREE.MeshStandardMaterial({color:0x5c636a,roughness:.55,metalness:.25});
// AG stores with their real shapes: bombs with tail kits and strakes, missiles with wings; a pylon above each station
function storeMesh(W){const g=new THREE.Group(),mat=W.kind==='arm'?new THREE.MeshStandardMaterial({color:0xe6e6e0,roughness:.5}):agStoreMat,L=W.len,r=W.r;
  const b=new THREE.Mesh(new THREE.CylinderGeometry(r,r*.92,L*.72,12).rotateX(Math.PI/2),mat);b.position.z=-L*.06;g.add(b);
  const n=new THREE.Mesh(new THREE.SphereGeometry(r,12,8),mat);n.scale.set(1,1,W.kind==='arm'?2.6:1.5);n.position.z=L*.3;g.add(n);
  const tk=new THREE.Mesh(new THREE.CylinderGeometry(r*.92,r*.62,L*.2,10).rotateX(Math.PI/2),mat);tk.position.z=-L*.52;g.add(tk);
  const fs=W.kind==='arm'?r*3.4:r*3,fl=W.kind==='arm'?L*.12:L*.16;
  for(const a of [0,Math.PI/2]){const f=new THREE.Mesh(new THREE.BoxGeometry(fs,.015,fl),mat);f.rotation.z=a+Math.PI/4;f.position.z=-L*.52;g.add(f);
    if(W.kind!=='dumb'){const s=new THREE.Mesh(new THREE.BoxGeometry(W.kind==='arm'?fs*.9:fs*.55,.012,L*.22),mat);s.rotation.z=a+Math.PI/4;s.position.z=W.kind==='arm'?L*.05:-L*.05;g.add(s)}}
  if(W.kind==='gps'&&W.glide>3){const w=new THREE.Mesh(new THREE.BoxGeometry(r*9,.02,L*.18),mat);w.position.set(0,r*.9,0);g.add(w)}
  return g}
function agPylon(g,p,r,name){const S=M2[AC.id];if(!S)return;const top=bellyAt(S,p.z,p.x)+.05,y0=p.y+r;if(top-y0<.08)return;const m=new THREE.Mesh(new THREE.BoxGeometry(.1,top-y0+.05,1.5),pylMat);m.name=name;m.position.set(p.x,(top+y0)/2,p.z);g.add(m)}
function agSync(){const on=AG.load.length>0;$('bAg').hidden=!on;$('bAgN').hidden=!on;if(!on)return;const l=agPick();
  $('bAg').firstChild.nodeValue=l?AGW[l.k].sh:'AG';$('cAg').textContent=l?l.n:0}
const emitting=g=>g&&g.alive&&(g.kind==='sam'||g.kind==='aaa'||g.kind==='radar'||g.kind==='ship')&&!(g.offT>0);
// weapon choice: an anti-radiation missile against an emitter, otherwise a bomb
function agPick(){const t=AG.tgt, arm=AG.load.find(l=>AGW[l.k].kind==='arm'&&l.n>0), bomb=AG.load.find(l=>AGW[l.k].kind!=='arm'&&l.n>0);
  return t&&emitting(t)&&arm?arm:bomb||arm||null}
function agCandidates(){return ground.filter(g=>g.alive&&g.pos.distanceTo(P.pos)<110000).map(g=>{_s1.subVectors(g.pos,P.pos);const d=_s1.length();return{g,d,a:_s1.normalize().angleTo(P.fwd)}}).filter(c=>c.a<1.2).sort((a,b)=>a.d-b.d)}
function agNext(){const c=agCandidates();if(!c.length){AG.tgt=null;message('NO GROUND TARGETS AHEAD',1);return}
  const i=c.findIndex(x=>x.g===AG.tgt);AG.tgt=c[(i+1)%c.length].g;message('TGT · '+agName(AG.tgt),.9);agSync()}
const agName=g=>({sam:'SAM LAUNCHER',aaa:'AAA',radar:'EW RADAR',bunker:'BUNKER',truck:'TRUCK',ship:'FRIGATE'})[g.kind]||'TARGET';
// how far a glide bomb can reach from here (est.): height and speed set the glide footprint
function agReach(W){if(!W.glide)return 0;const agl=Math.max(0,P.pos.y-Math.max(groundH(P.pos.x,P.pos.z),0));return W.glide*agl*(.55+.45*Math.min(P.mach||.8,1.3))+(W.boost||0)+Math.max(0,P.vel.y)*20}
function agInRange(l,t){if(!l||!t)return false;const W=AGW[l.k],d=Math.hypot(t.pos.x-P.pos.x,t.pos.z-P.pos.z);
  if(W.kind==='arm')return emitting(t)&&d<W.maxR&&d>W.minR; if(W.kind==='gps')return d<agReach(W); return false}
// CCIP: integrate a dumb bomb from release to the ground
const _ci=new V3(),_cv=new V3();
function ccip(){_ci.copy(P.pos);_cv.copy(P.vel);for(let i=0;i<600;i++){_cv.y-=G*.05;_cv.multiplyScalar(1-.0004*_cv.length()*.05);_ci.addScaledVector(_cv,.05);if(_ci.y<=Math.max(groundH(_ci.x,_ci.z),0))return _ci}return null}
function agRelease(){
  if(state!=='play'||!P.alive)return; const l=agPick(); if(!l){message('NO STORES',.8);return}
  const W=AGW[l.k], t=AG.tgt;
  if(W.kind==='arm'&&!emitting(t)){message(t?'TARGET NOT EMITTING':'NO TARGET',1);return}
  if(W.kind==='gps'&&!t){message('NO TARGET',1);return}
  const g=playerJet.children[0], st=g.getObjectByName('ag_'+l.k+'_'+(l.max-l.n)); l.n--;
  const p=new V3(); if(st){st.getWorldPosition(p);st.visible=false}else p.copy(P.pos).addScaledVector(P.up,-1.5);
  const m=storeMesh(W); m.position.copy(p); scene.add(m);
  const w={W,m,pos:m.position,vel:P.vel.clone().addScaledVector(P.up,-3),t:0,tgt:t,aim:t?t.pos.clone():null,reach:W.kind==='gps'?agReach(W):0,start:p.clone(),lift:true,err:new V3()};
  if(t&&W.kind==='gps'&&Math.hypot(t.pos.x-P.pos.x,t.pos.z-P.pos.z)>w.reach)w.short=true;
  AG.w.push(w); recEvent('You released '+W.name+(t?' at the '+agName(t).toLowerCase():''));
  message(W.kind==='arm'?'MAGNUM':W.kind==='dumb'?'BOMBS AWAY':'PICKLE · '+W.sh,1); if(W.kind==='arm')sndMsl(); agSync()}
function agDetonate(w){
  const p=w.pos; explode(p.clone().setY(Math.max(p.y,Math.max(groundH(p.x,p.z),0)+2)),w.W.blast>20);
  let hit=false; for(const g of ground){if(!g.alive)continue;const d=g.pos.distanceTo(p);if(d<w.W.blast){g.hp-=d<w.W.blast*.5?20:8;hit=true;if(g.hp<=0)killGround(g)}}
  if(!hit)message(w.short?'MISS · FELL SHORT':'MISS',1); scene.remove(w.m); w.dead=true}
function updateAG(dt){
  if(AG.load.length&&state==='play'){AG.tgtT-=dt;
    if(AG.tgt&&!AG.tgt.alive)AG.tgt=null;
    if(!AG.tgt&&AG.tgtT<=0){AG.tgtT=.5;const c=agCandidates();if(c.length){AG.tgt=c[0].g;agSync()}}}
  for(const w of AG.w){if(w.dead)continue; w.t+=dt; const W=w.W, v=w.vel.length();
    if(W.kind==='arm'){
      if(w.tgt&&emitting(w.tgt))w.aim.copy(w.tgt.pos);
      else if(w.tgt&&!w.lostSet){w.lostSet=true;w.err.set(rand(-70,70),0,rand(-70,70));w.aim.add(w.err)}   // radar went quiet: fly to the last fix
      const thr=w.t<W.burn?W.acc:(W.sus&&w.t<W.burn+W.sus?W.susAcc:0);
      _a.copy(w.vel).normalize(); w.vel.addScaledVector(_a,thr*dt); if(W.vCap&&w.vel.length()>W.vCap)w.vel.setLength(W.vCap);
      w.vel.y-=G*dt; w.vel.multiplyScalar(1-W.cd*v*dt);
      const d=w.pos.distanceTo(w.aim); _b.copy(w.aim); if(d>12000)_b.y+=d*.18;           // loft on long shots
      _b.sub(w.pos).normalize().multiplyScalar(v); _b.sub(w.vel).multiplyScalar(d<4000?5:2.5); const lim=W.gmax*G*(d<4000?1.5:1); if(_b.length()>lim)_b.setLength(lim); _b.y+=G; w.vel.addScaledVector(_b,dt);
      if(Math.random()<.9)puff(w.pos.x,w.pos.y,w.pos.z,rand(-2,2),rand(-2,2),rand(-2,2),.88,.88,.9,.5,3,9,1.4);
      w.pos.addScaledVector(w.vel,dt); w.m.quaternion.setFromUnitVectors(ZF,_a.copy(w.vel).normalize());
      const dn=w.pos.distanceTo(w.aim); if(dn<20||(w.dmin<200&&dn>w.dmin)||w.pos.y<=Math.max(groundH(w.pos.x,w.pos.z),0)||w.t>140){if(dn>w.dmin&&w.dmin<200)w.pos.lerp(w.aim,0);agDetonate(w)} w.dmin=Math.min(w.dmin??1e9,dn)}
    else{
      if(w.tgt&&w.tgt.alive&&W.track)w.aim.copy(w.tgt.pos);
      if(W.kind==='gps'&&w.lift&&w.aim){const dh=Math.hypot(w.pos.x-w.start.x,w.pos.z-w.start.z);
        if(dh>w.reach)w.lift=false;   // out of energy: it stops gliding and falls
        else{_b.subVectors(w.aim,w.pos).normalize().multiplyScalar(Math.max(170,v*.995));_b.sub(w.vel).multiplyScalar(1.6);const lim=3*G;if(_b.length()>lim)_b.setLength(lim);w.vel.addScaledVector(_b,dt);w.vel.y+=G*dt*.92}}
      w.vel.y-=G*dt; w.vel.multiplyScalar(1-.0004*v*dt);
      w.pos.addScaledVector(w.vel,dt); w.m.quaternion.setFromUnitVectors(ZF,_a.copy(w.vel).normalize());
      if(w.pos.y<=Math.max(groundH(w.pos.x,w.pos.z),0)+(w.aim&&w.pos.distanceTo(w.aim)<6?6:0)||w.t>200)agDetonate(w)}}
  AG.w=AG.w.filter(w=>!w.dead)}
$('bAg').addEventListener('pointerdown',e=>{e.preventDefault();audioInit();agRelease()});
$('bAgN').addEventListener('pointerdown',e=>{e.preventDefault();agNext()});
function drawAGHud(c){
  if(!AG.load.length||state!=='play')return; const l=agPick(), t=AG.tgt;
  if(t){const p=proj(_d.copy(t.pos).setY(t.pos.y+3)); const d=t.pos.distanceTo(P.pos), inR=agInRange(l,t);
    if(p.ok){c.strokeStyle=inR?HUD:WARN;c.lineWidth=1.5;c.strokeRect(p.x-9,p.y-9,18,18);c.beginPath();c.moveTo(p.x-14,p.y);c.lineTo(p.x-9,p.y);c.moveTo(p.x+9,p.y);c.lineTo(p.x+14,p.y);c.stroke();
      txt(c,(emitting(t)?'◆ ':'')+agName(t),p.x,p.y-18,'center',inR?HUD:WARN,10,700)}
    const Wp=l&&AGW[l.k], rng=Wp?(Wp.kind==='arm'?Wp.maxR:Wp.kind==='gps'?agReach(Wp):0):0;
    txt(c,'TGT '+agName(t)+' · '+(d/1000).toFixed(1)+' KM'+(l?' · '+AGW[l.k].sh+(Wp.kind==='dumb'?' · CCIP':inR?' · IN RNG':' · RNG '+(rng/1000).toFixed(0)+' KM'):''),W/2,H*.82,'center',inR?HUD:WARN,12,700)}
  if(l&&AGW[l.k].kind==='dumb'){const ip=ccip();if(ip){const q=proj(ip);if(q.ok){c.strokeStyle=HUD;c.lineWidth=1.5;c.beginPath();c.arc(q.x,q.y,7,0,Math.PI*2);c.stroke();c.fillStyle=HUD;c.fillRect(q.x-1,q.y-1,2,2);
    const fpm=proj(_e.copy(P.pos).addScaledVector(P.vel,3));if(fpm.ok){c.beginPath();c.moveTo(fpm.x,fpm.y);c.lineTo(q.x,q.y);c.stroke()}}}}}

/* ---------------- aircraft carrier: catapult (CATOBAR) or ski-jump (STOBAR) launch, angled deck, 4 arresting wires, optical landing aid ----------------
   ship-local frame: +z bow, +x port. Flight deck 20 m above the sea; the angled landing area is 9° to port. Steams at 6 m/s (12 kt) on a track
   through the widest open water near the base, turning around at each end when you're not around. */
const CV={obj:null,pos:new V3(),vel:new V3(),psi:Math.PI/2,c:new V3(-13600,0,10600),sAlong:0,dir:1,spd:6,kind:'CATOBAR',DECK:20,
  L0:new THREE.Vector2(6,-158),U:new THREE.Vector2(Math.sin(9*Math.PI/180),Math.cos(9*Math.PI/180)),WIRES:[50,62,74,86],TD:72,parts:{}};
function buildCarrier(){const g=new THREE.Group(),P_={};
  const hullM=new THREE.MeshLambertMaterial({color:0x7d848c}),deckM=new THREE.MeshLambertMaterial({color:0x3b3f44}),wm=new THREE.MeshBasicMaterial({color:0xe8e8e0}),ym=new THREE.MeshBasicMaterial({color:0xd8c040});
  const hull=new THREE.Mesh(new THREE.BoxGeometry(40,19,300),hullM);hull.position.set(0,9.5,-10);g.add(hull);
  const bow=new THREE.Mesh(new THREE.CylinderGeometry(0,20,40,4,1).rotateX(Math.PI/2).rotateZ(Math.PI/4),hullM);bow.scale.set(1,.68,1);bow.position.set(0,12,158);g.add(bow);
  const deck=new THREE.Mesh(new THREE.BoxGeometry(76,1,330),deckM);deck.position.set(0,19.5,0);g.add(deck);
  const line=(x0,z0,x1,z1,w,mat,y)=>{const L=Math.hypot(x1-x0,z1-z0),m=new THREE.Mesh(new THREE.BoxGeometry(w,.1,L),mat);m.position.set((x0+x1)/2,20.06+(y||0),(z0+z1)/2);m.rotation.y=Math.atan2(x1-x0,z1-z0);g.add(m);return m};
  const at=s=>[CV.L0.x+CV.U.x*s,CV.L0.y+CV.U.y*s], n=[CV.U.y,-CV.U.x];
  for(let s=10;s<230;s+=14){const a=at(s),b=at(s+7);line(a[0],a[1],b[0],b[1],.5,wm)}                                   // landing centreline
  for(const o of [-12,12]){const a=at(0),b=at(235);line(a[0]+n[0]*o,a[1]+n[1]*o,b[0]+n[0]*o,b[1]+n[1]*o,.4,ym)}       // landing area edges
  for(const w of CV.WIRES){const a=at(w);line(a[0]-n[0]*12,a[1]-n[1]*12,a[0]+n[0]*12,a[1]+n[1]*12,.18,new THREE.MeshBasicMaterial({color:0x222222}),.1)}
  const isl=new THREE.Mesh(new THREE.BoxGeometry(10,20,38),hullM);isl.position.set(-31,30,30);g.add(isl);
  const mast=new THREE.Mesh(new THREE.CylinderGeometry(.6,.9,14,6),hullM);mast.position.set(-31,47,34);g.add(mast);
  const lens=new THREE.Mesh(new THREE.BoxGeometry(1.2,2.2,.6),new THREE.MeshBasicMaterial({color:0xffb030}));lens.position.set(37,21.5,-40);g.add(lens);
  const cats=new THREE.Group();
  for(const x of [-12,-2]){const m=new THREE.Mesh(new THREE.BoxGeometry(.35,.1,95),wm);m.position.set(x,20.07,52);cats.add(m)} g.add(cats);P_.cats=cats;
  // ski-jump ramp: 45 m long, rising to ~6 m with a ~12° exit
  const sh=new THREE.Shape();sh.moveTo(120,0);for(let i=1;i<=10;i++){const z=120+i*4.5;sh.lineTo(z,CV_ramp(z))}sh.lineTo(165,0);sh.lineTo(120,0);
  const rg=new THREE.ExtrudeGeometry(sh,{depth:44,bevelEnabled:false});rg.rotateY(-Math.PI/2);rg.translate(22,20,0);const ramp=new THREE.Mesh(rg,deckM);g.add(ramp);P_.ramp=ramp;
  g.userData.parts=P_;return g}
function CV_ramp(lz){return lz<=120?0:6*Math.pow(Math.min(1,(lz-120)/45),1.6)}
const _cvq=new THREE.Quaternion(),_cvv=new V3();
function cvLocalToWorld(lx,ly,lz,out){return out.set(lx,ly,lz).applyAxisAngle(UP,CV.psi).add(CV.pos)}
function cvWorldToLocal(p,out){return out.copy(p).sub(CV.pos).applyAxisAngle(UP,-CV.psi)}
function cvDeckY(lz){return CV.DECK+(CV.kind==='STOBAR'?CV_ramp(lz):0)}
function initCarrier(){if(!CV.obj){CV.obj=buildCarrier();scene.add(CV.obj)}CV.kind=AC.carrier||'CATOBAR';const p=CV.obj.userData.parts;p.cats.visible=CV.kind==='CATOBAR';p.ramp.visible=CV.kind==='STOBAR';CV.sAlong=-800;CV.dir=1;updateCarrier(0)}
function updateCarrier(dt){
  if(!CV.obj)return; const far=P.pos.distanceTo(CV.pos)>9000&&!P.onDeck;
  CV.sAlong+=CV.dir*CV.spd*dt; if((CV.sAlong>1400&&CV.dir>0&&(far||CV.sAlong>1700))||(CV.sAlong<-1400&&CV.dir<0&&(far||CV.sAlong<-1700)))CV.dir*=-1;
  const base=0.35; CV.psi=CV.dir>0?base:base+Math.PI;   // track runs along this bearing through the open water
  CV.pos.set(CV.c.x+Math.sin(base)*CV.sAlong,0,CV.c.z+Math.cos(base)*CV.sAlong); CV.vel.set(Math.sin(CV.psi),0,Math.cos(CV.psi)).multiplyScalar(CV.spd);
  CV.obj.position.copy(CV.pos); CV.obj.rotation.y=CV.psi}
// ---- on deck
const DK={lx:0,lz:0,h:0,v:0,mode:'',t:0,pitch:0};
function cvSpot(){ // launch position: catapult 1 on the bow, or the long take-off position for the ski-jump
  if(CV.kind==='CATOBAR'){DK.lx=-12;DK.lz=6;DK.mode='cat'}else{DK.lx=-4;DK.lz=-35;DK.mode='ski'} DK.h=0;DK.v=0;DK.t=0;DK.pitch=0;
  message(CV.kind==='CATOBAR'?'ON CAT 1 · MIL OR AB TO LAUNCH':'ON THE DECK · FULL AB TO ROLL',3)}
function placeOnCarrier(){initCarrier();P.onGround=true;P.onDeck=true;P.serviced=true;P.scramble=true;P.scrT=0;setGear(true);throttle=0;setThr(0);cvSpot();deckPose();qPrev.copy(playerJet.quaternion);camSnap=true}
function deckPose(){
  const y=cvDeckY(DK.lz)+GEAR_H; cvLocalToWorld(DK.lx,y,DK.lz,P.pos);
  const sl=CV.kind==='STOBAR'&&DK.lz>120?Math.atan((CV_ramp(DK.lz+.5)-CV_ramp(DK.lz-.5))):0; DK.pitch=sl;
  playerJet.quaternion.setFromAxisAngle(UP,CV.psi+DK.h); _cvq.setFromAxisAngle(_cvv.set(1,0,0),-sl); playerJet.quaternion.multiply(_cvq); axes(P);
  P.vel.copy(CV.vel).addScaledVector(P.fwd,DK.v)}
function deckRoll(dt,rollIn){
  const A=AC, at=atm(CV.DECK), air=DK.v+CV.spd, MS=P.mass||A.MASS, qd=.5*at.rho*air*air;
  const T=thrust(A,throttle,at.sig,air/at.a,CV.DECK)*(P.thrK??1); P.lastT=T; const D=qd*A.S*(cd0(air/at.a,A)*A.cdK+(P.xcd||0));
  DK.t+=dt; P.n=1; P.qd=qd; P.mach=air/at.a; P.kcas=air*Math.sqrt(at.sig)*1.944; P.nAero=qd*A.S*A.CLMAX/(MS*G);
  if(DK.mode==='cat'){if(throttle>=.79){DK.hold=(DK.hold||0)+dt;if(DK.hold>1.8){DK.mode='shot';message('CAT SHOT',1)}}else DK.hold=0}
  else if(DK.mode==='shot'){DK.v=Math.min(DK.v+(75*75/(2*94))*dt,75-CV.spd+2)}
  else if(DK.mode==='ski'){if(throttle>=.79){DK.hold=(DK.hold||0)+dt;if(DK.hold>1.5){DK.mode='roll';message('ROLLING · STAY ON THE CENTRELINE',1.2)}}else DK.hold=0}
  else if(DK.mode==='trap'){DK.v=Math.max(0,DK.v-Math.max(4,DK.v*DK.v/(2*Math.max(8,DK.trapLeft))*1)*dt);DK.trapLeft-=DK.v*dt;if(DK.v<=.3){DK.v=0;DK.mode='stop';DK.t=0}}
  else if(DK.mode==='stop'){DK.v=0;if(DK.t>4&&!P.serviced){P.serviced=true;P.fuel=AC.fuelCap;P.hp=100;resetSystems();rearm();CM.flares=cmFlares();CM.chaff=cmChaff();syncCM();message('REARMED · REFUELED',2)}
    if(DK.t>6.5){P.serviced=true;cvSpot()}}
  if(DK.mode==='roll'){DK.v=Math.max(0,DK.v+((T-D)/MS-(brake?.42:.03)*G)*dt);DK.h-=rollIn*.25*clamp(DK.v/15,0,1)*dt*(DK.v>2?1:0)}
  DK.lz+=Math.cos(DK.h)*DK.v*dt; DK.lx+=Math.sin(DK.h)*DK.v*dt; deckPose();
  // leaving the deck: off the bow / ramp / angled-deck edge
  const off=DK.lz>165||Math.abs(DK.lx)>38||DK.lz<-165||(DK.mode==='shot'&&DK.lz>100);
  if(off){P.onGround=false;P.onDeck=false;P.airT=0;P.pos.y+=.3;
    if(DK.mode==='shot'){P.vel.y+=2.5;message('AIRBORNE · GEAR UP',1.4)}
    else if(CV.kind==='STOBAR'&&DK.lz>165)message('OFF THE RAMP · GEAR UP',1.4);
    DK.mode=''}}
// ---- touchdown on the deck: trap, bolter, ramp strike
function cvContact(){
  if(!CV.obj||P.onGround)return false; const L=cvWorldToLocal(P.pos,_cvv);
  if(Math.abs(L.x)>40||Math.abs(L.z)>170)return false;
  const dy=L.y-(cvDeckY(L.z)+GEAR_H);
  if(dy>0)return false;
  if(L.y<CV.DECK-1&&L.y>0){die('collision');return true}                       // into the side of the ship
  const sink=-(P.vel.y), dx=L.x-CV.L0.x, dz=L.z-CV.L0.y, sAl=dx*CV.U.x+dz*CV.U.y, lat=dx*CV.U.y-dz*CV.U.x;
  if(!P.gear){die('gearup');return true} if(sink>7.5||Math.abs(bankOf(P))>.3){die('landing');return true}
  if(sAl<0){die('landing');recEvent('Ramp strike');return true}
  P.onGround=true;P.onDeck=true;P.serviced=false; const rv=_s1.subVectors(P.vel,CV.vel); _s2.set(Math.sin(CV.psi),0,Math.cos(CV.psi));
  DK.lx=L.x;DK.lz=L.z;DK.h=Math.atan2(rv.x,rv.z)-CV.psi;DK.v=Math.max(0,rv.dot(_s2));DK.t=0;
  const ball=CV.lastBall??0;
  if(AC.carrier&&sAl>40&&sAl<92&&Math.abs(lat)<12){const wi=CV.WIRES.findIndex(w=>w>=sAl-3);const wire=wi<0?4:wi+1;DK.mode='trap';DK.trapLeft=95;
    const grade=wire===3&&Math.abs(ball)<.35&&!CV.waved?'OK':(wire===2||wire===4)&&Math.abs(ball)<.7?'FAIR':CV.waved?'WAVE-OFF IGNORED':'NO GRADE';
    message('TRAP · '+wire+' WIRE · '+grade,2.6);recEvent('Trapped on the '+wire+' wire ('+grade+'), sink '+sink.toFixed(1)+' m/s');buzz([60,40,60])}
  else{DK.mode='roll';message(AC.carrier?'BOLTER · BOLTER · POWER UP':'TOUCH AND GO · NO HOOK',2);recEvent(AC.carrier?'Boltered':'Touch-and-go on the carrier')}
  CV.waved=false; return true}
// ---- optical landing aid ("meatball" / Luna), lineup, on-speed, LSO calls
function cvApproach(){
  if(!CV.obj||P.onDeck||!P.gear)return null;
  const td=cvLocalToWorld(CV.L0.x+CV.U.x*CV.TD,cvDeckY(0),CV.L0.y+CV.U.y*CV.TD,_s3.set(0,0,0)).clone();
  const uw=new V3(CV.U.x,0,CV.U.y).applyAxisAngle(UP,CV.psi), nw=new V3(CV.U.y,0,-CV.U.x).applyAxisAngle(UP,CV.psi);
  const r=new V3().subVectors(P.pos,td), dist=-r.dot(uw), lat=r.dot(nw), h=P.pos.y-td.y;
  if(dist<-50||dist>9000)return null;
  const ang=Math.atan2(h,Math.max(1,dist))*57.3, dev=ang-3.5; CV.lastBall=dev;
  return {dist,lat,h,dev,spd:P.kcas-(AC.vApp||140)}}
function cvLSO(a){
  if(!a||state!=='play')return;
  if(a.dist<2600&&a.dist>150){
    if(a.dist<550&&(a.dev<-1.0||a.dev>1.5||Math.abs(a.lat)>14||a.spd>25)){if(!CV.waved){CV.waved=true;say('waveoff',4);message('WAVE OFF · WAVE OFF',1.6)}}
    else if(a.dev<-.45)say('power',2.4); else if(a.dev>.6)say('high',3); else if(a.lat>8)say('right',3); else if(a.lat<-8)say('left',3)}
  if(a.dist>2600)CV.waved=false}
function drawCarrierHud(c){
  if(!CV.obj||state!=='play')return;
  const a=cvApproach(); cvLSO(a);
  if(!P.onDeck){const sp=cvLocalToWorld(0,22,0,_s3.set(0,0,0)), q=proj(sp), d=P.pos.distanceTo(CV.pos);
    if(q.ok&&(AC.carrier||d<15000)){c.strokeStyle='#6fb7ff';c.lineWidth=1.5;c.beginPath();c.moveTo(q.x,q.y-8);c.lineTo(q.x+8,q.y);c.lineTo(q.x,q.y+8);c.lineTo(q.x-8,q.y);c.closePath();c.stroke();
      txt(c,(CV.kind==='CATOBAR'?'CVN ':'CV ')+(d/1000).toFixed(1),q.x,q.y-16,'center','#6fb7ff',10,700)}}
  if(a&&a.dist<7000){const x0=W*.17,y0=H*.42,cell=10, by=clamp(-a.dev/.18,-6,6)*cell;
    c.fillStyle='rgba(0,0,0,.35)';c.fillRect(x0-48,y0-78,96,156);
    c.fillStyle='#3cff6a';for(const sx of [-1,1])for(let i=1;i<=4;i++)c.fillRect(x0+sx*(10+i*7)-3,y0-1.5,6,3);
    c.fillStyle=a.dev<-1?'#ff3b30':'#ffb030';c.beginPath();c.arc(x0,y0+by,6,0,Math.PI*2);c.fill();
    const lx=clamp(a.lat/2,-40,40);c.strokeStyle='#fff';c.beginPath();c.moveTo(x0-lx,y0+60);c.lineTo(x0-lx,y0+70);c.stroke();c.strokeStyle='rgba(255,255,255,.4)';c.beginPath();c.moveTo(x0-44,y0+65);c.lineTo(x0+44,y0+65);c.stroke();
    txt(c,'BALL',x0,y0-68,'center','#ffb030',10,700);
    txt(c,Math.abs(a.spd)<7?'ON SPEED':a.spd>0?'FAST +'+Math.round(a.spd):'SLOW '+Math.round(a.spd),x0,y0+50,'center',Math.abs(a.spd)<7?HUD:WARN,10,700);
    txt(c,(a.dist/1000).toFixed(1)+' KM · '+(Math.abs(a.lat)<4?'LINED UP':a.lat>0?'COME RIGHT':'COME LEFT'),x0,y0-56,'center',HUD,9,700);
    if(CV.waved&&(clock*3%1)<.6){c.strokeStyle='#ff3b30';c.lineWidth=2;c.strokeRect(W/2-80,H*.55-16,160,32);txt(c,'WAVE OFF',W/2,H*.55,'center','#ff3b30',16,700);c.lineWidth=1.5}}
  if(P.onDeck){const m=DK.mode;txt(c,m==='cat'?'CAT 1 · '+(throttle>=.79?'LAUNCH IN '+Math.max(0,1.8-(DK.hold||0)).toFixed(1):'THROTTLE TO MIL OR AB'):m==='ski'?(throttle>=.79?'BRAKES OFF IN '+Math.max(0,1.5-(DK.hold||0)).toFixed(1):'FULL AFTERBURNER, THEN ROLL'):m==='trap'?'ARRESTED':m==='stop'?(P.serviced?'RESPOTTING':'REARMING · '+Math.max(0,4-DK.t).toFixed(0)):m==='roll'?Math.round(P.kcas)+' KT':'',W/2,H*.82,'center',HUD,12,700)}}

/* ---------------- AWACS / GCI: picture calls, BRAA, threat warnings, commit, splash, home plate ----------------
   BRAA = bearing, range (nm), altitude (thousands of ft), aspect (hot / flank / beam / cold) from your jet */
const GCI={t:0,threatT:0,commitT:0,known:new Set(),lastSay:0,lines:[]};
const brg=(dx,dz)=>{let b=Math.round((Math.atan2(-dx,dz)*180/Math.PI+360)%360);return b===0?360:b};
const pad3=b=>String(b).padStart(3,'0');
function myCall(){const m=/Callsign ([^·]+)$/.exec(AC.eyebrow||'');return (m?m[1]:'Viper 1').trim()}
function gciName(){return /^(MIG|SU)/.test(AC.id)?'Granit':/^J/.test(AC.id)?'Shenying':'Magic'}
function aspect(e){_s1.subVectors(P.pos,e.pos).normalize();const a=Math.acos(clamp(_s1.dot(_s2.copy(e.vel).normalize()),-1,1))*57.3;return a<30?'hot':a<70?'flanking':a<110?'beam':'cold'}
function braa(e){const dx=e.pos.x-P.pos.x,dz=e.pos.z-P.pos.z,d=Math.hypot(dx,dz)/1852;return 'BRAA '+pad3(brg(dx,dz))+', '+Math.round(d)+', angels '+Math.max(1,Math.round(e.pos.y*3.281/1000))+', '+aspect(e)}
// groups: bandits within 5 km of each other are one group
function groups(){const gs=[];for(const e of enemies){if(!e.alive)continue;let g=gs.find(g=>g.lead.pos.distanceTo(e.pos)<5000);if(g)g.n++;else gs.push({lead:e,n:1})}return gs.sort((a,b)=>a.lead.pos.distanceTo(P.pos)-b.lead.pos.distanceTo(P.pos))}
function radio(text,who){const from=who==='wing'?'':who==='lso'?'Paddles: ':gciName()+': ';GCI.lines.push({t:clock,text:from+text});if(GCI.lines.length>3)GCI.lines.shift();
  if(!VOICE.on||!A.on||typeof speechSynthesis==='undefined')return; const now=performance.now(); if(now-GCI.lastSay<600&&who!=='gci!')return; GCI.lastSay=now;
  try{const u=new SpeechSynthesisUtterance(text.replace(/BRAA/g,'bra').replace(/(\d)(\d)(\d),/g,'$1 $2 $3,'));u.rate=1.2;u.pitch=who==='wing'?.95:.8;u.volume=.9;if(VOICE.en)u.voice=VOICE.en;speechSynthesis.speak(u)}catch(e){}}
function gciPicture(){setTimeout(()=>{if(state!=='play')return;const gs=groups();if(!gs.length){radio(myCall()+', picture clean.');return}
  radio(myCall()+', picture, '+gs.length+' group'+(gs.length>1?'s':'')+'. Lead group '+braa(gs[0].lead)+', hostile'+(gs[0].n>1?', '+gs[0].n+' contacts':'')+'.');gs.forEach(g=>GCI.known.add(g.lead.id))},2500)}
function gciBogeyDope(){const gs=groups();if(!gs.length){radio(myCall()+', clean.');return}const g=gs[0];radio(myCall()+', single group '+braa(g.lead)+', hostile.')}
function updateGCI(dt){
  if(state!=='play'||mission==='ONLINE'||mission==='TRAINING'||!P.alive)return; GCI.threatT-=dt;GCI.commitT-=dt;GCI.t-=dt;
  const gs=groups();
  for(const g of gs)if(!GCI.known.has(g.lead.id)){GCI.known.add(g.lead.id);radio(myCall()+', new group '+braa(g.lead)+', hostile'+(g.n>1?', '+g.n+' contacts':'')+'.');break}
  // threat: a bandit inside 10 nm in your rear quarter pointing at you
  if(GCI.threatT<=0)for(const e of enemies){if(!e.alive||e.remote)continue;const d=e.pos.distanceTo(P.pos);_s1.subVectors(e.pos,P.pos).normalize();
    if(d<18000&&_s1.dot(P.fwd)<-.2&&aspect(e)==='hot'){radio(myCall()+', threat, '+braa(e)+'!','gci!');GCI.threatT=14;break}}
  if(GCI.commitT<=0&&gs.length&&gs[0].lead.pos.distanceTo(P.pos)<75000&&!gs[0].committed){gs[0].committed=true;gs[0].lead.gciCommit=true;radio(myCall()+', commit, commit, '+braa(gs[0].lead)+'.');GCI.commitT=30}
  if(P.bingo&&!GCI.rtb){GCI.rtb=true;const dx=-P.pos.x,dz=-P.pos.z;radio(myCall()+', home plate '+pad3(brg(dx,dz))+' for '+Math.round(Math.hypot(dx,dz)/1852)+'.')}}
function gciSplash(){if(mission!=='ONLINE'&&mission!=='TRAINING'&&Math.random()<.8)setTimeout(()=>radio(myCall()+', '+gciName()+' copies splash.'),900)}
function drawRadioLines(c){const now=clock;GCI.lines=GCI.lines.filter(l=>now-l.t<7);let y=TGP.rect?TGP.rect.y+TGP.rect.size+16:H*.17;c.font=`700 11px ${FONT}`;for(const l of GCI.lines){const words=l.text.toUpperCase().split(' ');let line='';for(const w of words){const t=line?line+' '+w:w;if(c.measureText(t).width>W-24&&line){txt(c,line,W/2,y,'center','#9fd3ff',11,700);y+=14;line=w}else line=t}if(line){txt(c,line,W/2,y,'center','#9fd3ff',11,700);y+=15}}}

/* ---------------- ejection and combat search-and-rescue ----------------
   zero-zero seat: fine on the runway, but not inverted near the ground or diving hard at low level; very high speed hurts */
let chute=null;
function buildChute(){const g=new THREE.Group();const seat=new THREE.Mesh(new THREE.BoxGeometry(.7,1.1,.7),new THREE.MeshLambertMaterial({color:0x3a3f36}));g.add(seat);
  const can=new THREE.Mesh(new THREE.SphereGeometry(4.2,12,6,0,Math.PI*2,0,Math.PI/2),new THREE.MeshLambertMaterial({color:0xf08a24,side:THREE.DoubleSide}));can.position.y=7;can.visible=false;can.name='can';g.add(can);
  const lm=new THREE.LineBasicMaterial({color:0xdddddd});for(let i=0;i<6;i++){const a=i/6*Math.PI*2,gg=new THREE.BufferGeometry().setFromPoints([new V3(0,.5,0),new V3(Math.cos(a)*4,7,Math.sin(a)*4)]);const l=new THREE.Line(gg,lm);l.name='ln';l.visible=false;g.add(l)}
  return g}
function ejectOK(){return state==='play'&&P.alive}
function eject(){
  if(!ejectOK())return; const gh=Math.max(groundH(P.pos.x,P.pos.z),0), agl=P.pos.y-gh, inv=Math.abs(bankOf(P))>2.2;
  if(agl<70&&(inv||P.vel.y<-45)&&!P.onGround){message('EJECTION OUTSIDE THE ENVELOPE',2);die('terrain');return}
  const fast=P.kcas>650; P.ejected={t:0,fast}; P.rescued=false;
  if(!chute){chute=buildChute();scene.add(chute)} chute.visible=true; chute.position.copy(P.pos); chute.getObjectByName('can').visible=false; chute.children.forEach(o=>{if(o.name==='ln')o.visible=false});
  P.ejVel=P.vel.clone().multiplyScalar(.35).addScaledVector(P.up,28);
  P.jetGhost={pos:P.pos.clone(),vel:P.vel.clone(),t:0};
  sndNoise(.4,1800,.6,'highpass'); buzz([200]); recEvent('Ejected at '+Math.round(P.kcas)+' kt, '+Math.round(agl*3.281)+' ft');
  die('ejected')}
function updateEject(dt){
  if(!P.ejected)return; const e=P.ejected; e.t+=dt;
  if(P.jetGhost&&P.jetGhost.t>=0){const j=P.jetGhost;j.t+=dt;j.vel.y-=G*dt*.5;j.pos.addScaledVector(j.vel,dt);
    if(j.t>3.5||j.pos.y<Math.max(groundH(j.pos.x,j.pos.z),0)+2){explode(j.pos,true);j.t=-1}}
  if(!chute)return; const v=P.ejVel; if(e.t>1.6){chute.getObjectByName('can').visible=true;chute.children.forEach(o=>{if(o.name==='ln')o.visible=true});v.multiplyScalar(Math.exp(-dt*2.5));v.y=Math.max(v.y-G*dt,-6.5)}else v.y-=G*dt;
  v.x+=WIND.x*dt*.3;v.z+=WIND.z*dt*.3; chute.position.addScaledVector(v,dt);
  const gh=Math.max(groundH(chute.position.x,chute.position.z),0); if(chute.position.y<gh+.5){chute.position.y=gh+.5;v.set(0,0,0);if(!e.down){e.down=true;csar()}}
  if(e.t>6.6&&!e.down){e.down=true;csar()}
  P.pos.copy(chute.position)}
// rescue: helicopters come for you; close to SAMs or enemy fighters it can go wrong
function csar(){const p=chute.position, sea=groundH(p.x,p.z)<0;
  let hostile=0;for(const g of ground)if(g.alive&&g.pos.distanceTo(p)<12000)hostile++;for(const e of enemies)if(e.alive&&!e.remote&&e.pos.distanceTo(p)<15000)hostile++;
  P.rescued=Math.random()<(hostile?Math.max(.35,.85-hostile*.15):.97);
  P.rescueText=P.rescued?(sea?'Picked out of the water by the rescue helicopter':'Picked up by the CSAR helicopter')+(hostile?' under fire':'')+(P.ejected.fast?' · injured in a high-speed ejection':''):'Captured before the rescue helicopter could reach you';
  message(P.rescued?'RESCUE INBOUND':'CSAR ABORTED',2)}
$('bEject').addEventListener('click',()=>{if(!$('bEject').dataset.armed){$('bEject').dataset.armed='1';$('bEject').textContent='PULL AGAIN';setTimeout(()=>{delete $('bEject').dataset.armed;$('bEject').textContent='EJECT'},1600);return}eject()});
function syncEjectBtn(){const show=state==='play'&&P.alive&&(P.hp<45||P.flamedOut||(P.sys&&(P.sys.eng.some(v=>v===1)||P.sys.hyd))||P.fuel<=0);if($('bEject').hidden===show)$('bEject').hidden=!show}

/* ---------------- sortie builders shared by the stand-alone missions and the campaign ---------------- */
let sortie=null;   // {kind, ...} what this flight has to do
function landPath(cx,cz,len){let best=null;for(let k=0;k<16;k++){const a=k/16*Math.PI*2,dx=Math.sin(a),dz=Math.cos(a);let L=0;
    for(let d=0;d<=len;d+=150){const x=cx+dx*d,z=cz+dz*d;if(groundH(x,z)<4||Math.hypot(x*1.6,z)<5200)break;L=d}
    if(!best||L>best.len)best={a:new V3(cx,0,cz),b:new V3(cx+dx*L,0,cz+dz*L),len:L}}return best}
function findLand(cx,cz){for(let r=0;r<12000;r+=500)for(let k=0;k<12;k++){const x=cx+Math.cos(k*.52)*r,z=cz+Math.sin(k*.52)*r;if(groundH(x,z)>12&&groundH(x,z)<300)return [x,z]}return [cx,cz]}
function setupConvoy(cx,cz){const [x,z]=findLand(cx,cz);const p=landPath(x,z,9000);const kinds=['aaa','truck','truck','truck','truck','truck'];
  kinds.forEach((k,i)=>{const g=spawnGround(k,x,z,k==='truck');g.path=p;g.spd=11;g.s=-i*70});
  sortie={kind:'CONVOY',need:4,center:new V3(x,0,z)}; return p}
function setupShip(){const g=spawnGround('ship',19600,21200,true);g.orbit={c:new V3(19600,0,21200),r:900,a:Math.random()*6.28};g.spd=7;sortie={kind:'SHIP',center:g.pos}}
function setupCruise(){sortie={kind:'CRUISE',left:6,t:0,second:false};for(const x of [-6000,0,6000])spawnCruise(new V3(x,400,58000),new V3(x*.1,60,0))}
function setupCAP(cz,n){for(let i=0;i<n;i+=2)spawnPair(pickBanditType(),new V3(rand(-6000,6000),rand(5000,8000),cz+rand(-3000,3000)),new V3(0,5000,0));sortie={kind:'CAP'}}
function sortieStatus(){if(!sortie)return'';const left=ground.filter(g=>g.objective&&g.alive).length;
  return sortie.kind==='CONVOY'?'TRUCKS LEFT '+ground.filter(g=>g.kind==='truck'&&g.alive).length:sortie.kind==='SHIP'?'FRIGATE '+(left?'AFLOAT':'SUNK'):sortie.kind==='CRUISE'?'CRUISE MISSILES '+(enemies.filter(e=>e.kind==='cruise').length+(sortie.second?0:3)):sortie.kind==='STRIKE'?'TARGETS LEFT '+left:'BANDITS '+enemies.length}
function sortieCheck(dt){if(!sortie)return;const k=sortie.kind;
  if(k==='CONVOY'){const tr=ground.filter(g=>g.kind==='truck');const dead=tr.filter(g=>!g.alive).length;if(dead>=sortie.need)endMission(true,'Convoy stopped');else if(tr.some(g=>g.alive&&g.s>=g.path.len))endMission(false,'The convoy got through')}
  else if(k==='SHIP'||k==='STRIKE'){if(!ground.some(g=>g.objective&&g.alive))endMission(true,k==='SHIP'?'Frigate sunk':'Target area destroyed')}
  else if(k==='CRUISE'){sortie.t+=dt;if(!sortie.second&&sortie.t>40){sortie.second=true;for(const x of [-3000,3000,9000])spawnCruise(new V3(x,400,60000),new V3(x*.1,60,0));radio(myCall()+', second salvo, '+braa(enemies[enemies.length-1])+'.')}
    if(enemies.some(e=>e.kind==='cruise'&&e.alive&&Math.hypot(e.pos.x,e.pos.z)<1500))endMission(false,'A cruise missile hit the base');else if(sortie.second&&!enemies.some(e=>e.kind==='cruise'))endMission(true,'All cruise missiles intercepted')}
  else if(k==='CAP'){if(!enemies.length)endMission(true,'Airspace clear')}}
/* ---------------- dynamic campaign: six sectors north of the base, a moving front, and losses that stay lost ---------------- */
const SECTORS=['Aster Valley','Brimstone Ridge','Cobalt Lakes','Drover Gap','Ember Coast','Falcon Plateau'];
const CAMP_SORTIES={CAP:'Combat air patrol',STRIKE:'Strike the sector HQ',CONVOY:'Hit the supply convoy',ANTISHIP:'Sink the frigate',CRUISE:'Defend against cruise missiles'};
let camp=null, campSortie='CAP', campNote='';
function campNew(){return{front:2,str:[0,0,100,100,100,100],dead:{},sorties:0,wins:0,log:[]}}
function campLoad(){try{const c=JSON.parse(localStorage.getItem('vsCampaign')||'null');if(c&&c.str)return c}catch(e){}return campNew()}
function campSave(){try{localStorage.setItem('vsCampaign',JSON.stringify(camp))}catch(e){}}
camp=campLoad(); try{campSortie=localStorage.getItem('vsCampSortie')||'CAP'}catch(e){}
const secZ=i=>8000+i*14000;
function setupCampaign(){
  const f=Math.min(camp.front,5), cz=secZ(f), cx=rand(-5000,5000); P.pos.set(0,6000,Math.max(0,cz-34000)); P.vel.set(0,0,240);
  const k=campSortie;
  if(k==='CAP'){setupCAP(cz,f>=4?6:4)}
  else if(k==='STRIKE'){const slots=[['radar',0,1500],['bunker',-600,600],['bunker',700,900],['sam',-3500,-2500],['sam',3800,-1500]];if((camp.dead[f]||[]).length>=slots.length)camp.dead[f]=[];const dead=camp.dead[f]||[];
    slots.forEach(([kind,dx,dz],i)=>{if(dead.includes(i))return;const g=spawnGround(kind,cx+dx,cz+dz,true);g.campSlot=i;g.campSec=f});
    spawnGround('aaa',cx-400,cz-300);spawnGround('aaa',cx+500,cz+200);spawnPair(pickBanditType(),new V3(cx-6000,8000,cz+12000),new V3(0,6000,0));sortie={kind:'STRIKE'}}
  else if(k==='CONVOY'){setupConvoy(cx,cz);spawnPair(pickBanditType(),new V3(cx,7000,cz+15000),new V3(0,5000,0))}
  else if(k==='ANTISHIP'){setupShip();spawnPair(pickBanditType(),new V3(19600,7000,36000),new V3(0,5000,0))}
  else if(k==='CRUISE'){P.pos.set(0,5000,6000);setupCruise()}
  if(f>=3)spawnGround('sam',cx+rand(-6000,6000),cz-9000);   // deeper sectors are better defended
  message('CAMPAIGN · '+SECTORS[f].toUpperCase()+' · '+CAMP_SORTIES[k].toUpperCase(),3.2)}
function campaignKill(g){if(mission!=='CAMPAIGN'||g.campSlot==null)return;(camp.dead[g.campSec]=camp.dead[g.campSec]||[]).push(g.campSlot);campSave()}
function campaignAfter(){
  campNote=''; if(mission!=='CAMPAIGN'||deathCause==='abort')return; const f=camp.front, win=deathCause==='win';
  camp.sorties++; if(win)camp.wins++;
  const hit=win?(campSortie==='STRIKE'?60:campSortie==='CRUISE'?25:40):0;
  if(win){camp.str[f]=Math.max(0,camp.str[f]-hit);campNote=SECTORS[f]+' resistance down to '+camp.str[f]+'%.';
    if(camp.str[f]<=0){camp.front++;delete camp.dead[f];campNote=SECTORS[f]+' captured! The front moves north.';if(camp.front>=6){campNote='Falcon Plateau has fallen — campaign won in '+camp.sorties+' sorties!';camp=Object.assign(campNew(),{log:[]})}}}
  else{camp.str[f]=Math.min(100,camp.str[f]+20);campNote='The sortie failed; '+SECTORS[f]+' reinforced to '+camp.str[f]+'%.';
    if(camp.str[f]>=100&&f>1&&Math.random()<.5){camp.front--;camp.str[camp.front]=60;campNote='The enemy counter-attacked and retook '+SECTORS[camp.front]+'.'}}
  camp.log.unshift(campNote); camp.log=camp.log.slice(0,6); campSave()}
function renderCamp(){const el=$('campMap');if(!el)return;let h='';for(let i=5;i>=0;i--){const blue=i<camp.front,front=i===camp.front;
    h+=`<div class="cs ${blue?'cB':'cR'}${front?' cF':''}"><span>${SECTORS[i]}</span><b>${blue?'held':front?'front · '+camp.str[i]+'%':'enemy'}</b></div>`}
  el.innerHTML=h; $('bSortie').textContent='Sortie: '+CAMP_SORTIES[campSortie]; $('campLog').textContent=camp.log[0]||'Six sectors stand between your base and the enemy capital. Push the front north.'}

/* ---------------- targeting pod (FLIR, white-hot / black-hot, two fields of view) and night-vision goggles ---------------- */
const TGP={mode:0,fov:4,cam:new THREE.PerspectiveCamera(4,1,5,60000),rt:new THREE.WebGLRenderTarget(320,320),rect:null};
const flirMat=new THREE.ShaderMaterial({uniforms:{map:{value:TGP.rt.texture},bh:{value:0},t:{value:0},gain:{value:1}},depthTest:false,depthWrite:false,
  vertexShader:'varying vec2 vUv;void main(){vUv=uv;gl_Position=vec4(position.xy,0.,1.);}',
  fragmentShader:'uniform sampler2D map;uniform float bh,t,gain;varying vec2 vUv;float h(vec2 p){return fract(sin(dot(p,vec2(12.9898,78.233)))*43758.5453);}void main(){vec3 c=texture2D(map,vUv).rgb;float l=dot(c,vec3(.3,.59,.11))*gain;l=clamp((l-.05)*1.35,0.,1.);if(bh>.5)l=1.-l;l+= (h(vUv*320.+t)-.5)*.08;l*=.92+.08*sin(vUv.y*640.);gl_FragColor=vec4(vec3(l),1.);}'});
const flirScene=new THREE.Scene(), flirCam=new THREE.Camera(); flirScene.add(new THREE.Mesh(new THREE.PlaneGeometry(2,2),flirMat));
const _hot=[],_bg=new THREE.Color(0x101214);
function tgpAim(out){if(AG.tgt&&AG.tgt.alive)return out.copy(AG.tgt.pos).setY(AG.tgt.pos.y+2);if(lockTarget&&lockTarget.alive)return out.copy(lockTarget.pos);
  return out.copy(P.pos).addScaledVector(P.fwd,6000).addScaledVector(UP,-2500)}
function renderTGP(){
  if(!TGP.mode||state!=='play'||!P.alive||!AC.pod){TGP.rect=null;return}
  const size=Math.round(Math.min(W,H)*.36), x=Math.round(W*.27), y=Math.round(Math.max(52,H*.12)); TGP.rect={x,y,size};
  const c=TGP.cam; c.fov=TGP.fov; c.updateProjectionMatrix(); c.position.copy(P.pos).addScaledVector(P.up,-1.6); c.up.copy(UP); c.lookAt(tgpAim(_d));
  // hot things glow in the IR picture: engines, vehicles, ships; the sky is cold
  _hot.length=0; const heat=o=>o.traverse(m=>{if(m.material&&m.material.emissive&&!m.material.__h){m.material.__h=1;_hot.push([m.material,m.material.emissive.getHex()]);m.material.emissive.setHex(0xe8e8e8)}});
  for(const g of ground)if(g.alive)heat(g.obj); for(const e of enemies)if(e.alive)heat(e.obj); for(const e of friends)if(e.alive)heat(e.obj); if(CV.obj)heat(CV.obj);
  const bg=scene.background, ff=scene.fog.far, fc=scene.fog.color.getHex(); scene.background=_bg; scene.fog.far=ff*3; scene.fog.color.setHex(0x202426); sky.visible=false; glare.visible=false; rain.visible=false;
  clouds.forEach(cl=>cl.userData.v=cl.visible); clouds.forEach(cl=>cl.visible=false); const ex=playerJet.visible; playerJet.visible=false;
  renderer.setRenderTarget(TGP.rt); renderer.clear(); renderer.render(scene,c); renderer.setRenderTarget(null);
  scene.background=bg; scene.fog.far=ff; scene.fog.color.setHex(fc); sky.visible=true; glare.visible=true; clouds.forEach(cl=>cl.visible=cl.userData.v); playerJet.visible=ex;
  for(const [m,h] of _hot){m.emissive.setHex(h);delete m.__h}
  flirMat.uniforms.gain.value=timeOfDay==='NIGHT'?5:timeOfDay==='DUSK'?1.8:1; flirMat.uniforms.bh.value=TGP.mode===2?1:0; flirMat.uniforms.t.value=clock%10;
  renderer.setViewport(x,H-y-size,size,size); renderer.setScissor(x,H-y-size,size,size); renderer.setScissorTest(true); renderer.clearDepth(); renderer.render(flirScene,flirCam);
  renderer.setScissorTest(false); renderer.setViewport(0,0,W,H);
  const tp=$('tgpTap'); tp.hidden=false; tp.style.left=x+'px'; tp.style.top=y+'px'; tp.style.width=tp.style.height=size+'px'}
function drawTGPHud(c){const r=TGP.rect; if(!r){$('tgpTap').hidden=true;return} const {x,y,size}=r, cx=x+size/2, cy=y+size/2;
  c.strokeStyle='rgba(255,255,255,.85)';c.lineWidth=1.5;c.strokeRect(x,y,size,size);c.beginPath();
  for(const [a,b] of [[-1,0],[1,0],[0,-1],[0,1]]){c.moveTo(cx+a*8,cy+b*8);c.lineTo(cx+a*size*.22,cy+b*size*.22)}c.stroke();c.strokeRect(cx-6,cy-6,12,12);
  const t=AG.tgt&&AG.tgt.alive?AG.tgt:lockTarget, d=t?t.pos.distanceTo(P.pos):0;
  txt(c,(TGP.mode===1?'WHOT':'BHOT')+' · '+(TGP.fov<2?'NFOV':'WFOV')+' · '+AC.pod,x+6,y+12,'left','#fff',10,700);
  txt(c,t?(AG.tgt===t?'TGT '+agName(t):'AIR TRACK')+' · '+(d/1852).toFixed(1)+' NM':'PT · SNOWPLOW',x+6,y+size-12,'left','#fff',10,700);
  txt(c,'TAP TO ZOOM',x+size-6,y+size-12,'right','rgba(255,255,255,.6)',9,700)}
$('tgpTap').addEventListener('pointerdown',e=>{e.preventDefault();TGP.fov=TGP.fov>2?.7:4});
$('cTgp').addEventListener('click',()=>{TGP.mode=(TGP.mode+1)%3;$('nTgp').textContent=['OFF','WHOT','BHOT'][TGP.mode];if(!TGP.mode)$('tgpTap').hidden=true});
let nvgOn=false;
$('cNvg').addEventListener('click',()=>{nvgOn=!nvgOn;$('gl').classList.toggle('nvg',nvgOn);$('nNvg').textContent=nvgOn?'ON':'OFF'});
function drawNVG(c){if(!nvgOn||state!=='play')return;const g=c.createRadialGradient(W/2,H/2,Math.min(W,H)*.42,W/2,H/2,Math.max(W,H)*.62);g.addColorStop(0,'rgba(0,0,0,0)');g.addColorStop(1,'rgba(0,8,0,.92)');c.fillStyle=g;c.fillRect(0,0,W,H)}
function syncSensors(){AC.pod=PODS[AC.id]||null;$('cTgp').hidden=!AC.pod;if(!AC.pod){TGP.mode=0;$('nTgp').textContent='OFF'}
  const dark=timeOfDay!=='DAY';$('cNvg').hidden=!dark;if(!dark&&nvgOn){nvgOn=false;$('gl').classList.remove('nvg');$('nNvg').textContent='OFF'}}

/* ---------------- paint schemes and squadron ---------------- */
// solid / two-tone schemes plus painted camouflage (canvas texture) for the aggressor and splinter schemes
var LIVERIES={default:{n:'default'},aggr:{n:'aggressor blue splinter',camo:['#7e9bb8','#5d7590','#a9bccd']},navy:{n:'navy low-vis grey',body:0x9aa3ab,dark:0x5d656d},
  desert:{n:'desert',camo:['#c8a879','#9b7a52','#e0c9a0']},rusblue:{n:'Russian blue splinter',camo:['#8fb2cf','#5f84a8','#c8d8e4']},plaan:{n:'PLAAF grey',body:0x8c9196,dark:0x50565c},
  black:{n:'black (test squadron)',body:0x2b2e33,dark:0x15171a},tiger:{n:'tiger meet',camo:['#d8a230','#2a2422','#e8c050']}};
var livery='default', squadron=''; try{livery=localStorage.getItem('vsLivery')||'default';squadron=localStorage.getItem('vsSquadron')||''}catch(e){}
var camoTex={};
function camoMap(k){if(camoTex[k])return camoTex[k];const L=LIVERIES[k],cv=document.createElement('canvas');cv.width=cv.height=256;const c=cv.getContext('2d');c.fillStyle=L.camo[0];c.fillRect(0,0,256,256);
  for(let i=0;i<34;i++){c.fillStyle=L.camo[1+(i%2)];c.beginPath();const x=Math.random()*256,y=Math.random()*256,r=18+Math.random()*40;
    if(k==='tiger'){c.fillRect(x,0,8+Math.random()*10,256);continue}
    c.moveTo(x,y);for(let j=0;j<5;j++)c.lineTo(x+Math.cos(j*1.3+i)*r*(.6+Math.random()*.6),y+Math.sin(j*1.3+i)*r*(.6+Math.random()*.6));c.closePath();c.fill()}
  const t=new THREE.CanvasTexture(cv);t.wrapS=t.wrapT=THREE.RepeatWrapping;t.repeat.set(.35,.35);return camoTex[k]=t}
function applyLivery(root){if(!LIVERIES||!livery||livery==='default')return;const L=LIVERIES[livery]||LIVERIES.default;
  root.traverse(o=>{const m=o.material;if(!m||!m.userData||!m.userData.pu||m.__liv)return;m.__liv=1;const u=m.userData.pu;
    if(L.camo){u.pPat.value=2;u.pc0.value.set(L.camo[0]);u.pc1.value.set(L.camo[1]);u.pc2.value.set(L.camo[2]);u.pBelK.value=0}
    else if(L.body){u.pPat.value=0;u.pc0.value.setHex(L.body);u.pBelK.value=0}});
  root.traverse(o=>{const m=o.material;if(!m||!m.isMeshStandardMaterial||m.__liv)return;
    const isBody=m.color.getHex()===PLAYER_COLORS.body, isDark=m.color.getHex()===PLAYER_COLORS.dark;
    if(!isBody&&!isDark)return; const nm=m.clone(); nm.__liv=1;
    if(L.camo&&isBody){nm.map=camoMap(livery);nm.color.setHex(0xffffff)} else if(isBody&&L.body)nm.color.setHex(L.body); else if(isDark&&L.dark)nm.color.setHex(L.dark); else if(isDark&&L.camo)nm.color.set(L.camo[1]);
    o.material=nm})}
$('bLivery').addEventListener('click',()=>{const k=Object.keys(LIVERIES);livery=k[(k.indexOf(livery)+1)%k.length];try{localStorage.setItem('vsLivery',livery)}catch(e){};$('bLivery').textContent='Paint: '+LIVERIES[livery].n;applyAC()});
$('bLivery').textContent='Paint: '+(LIVERIES[livery]||LIVERIES.default).n;
$('sqName').value=squadron; $('sqName').addEventListener('keydown',e=>e.stopPropagation());
$('sqName').addEventListener('input',()=>{squadron=$('sqName').value.trim().slice(0,28);try{localStorage.setItem('vsSquadron',squadron)}catch(e){};if(state==='menu')$('ovEyebrow').textContent=AC.eyebrow+(squadron?' · '+squadron:'')});
$('bSens').addEventListener('click',()=>{const k=Object.keys(SENS);sens=k[(k.indexOf(sens)+1)%k.length];try{localStorage.setItem('vsSens',sens)}catch(e){};syncSettings()});
$('bDz').addEventListener('click',()=>{dz=(dz+1)%DZS.length;try{localStorage.setItem('vsDz',dz)}catch(e){};syncSettings()});
function syncSettings(){$('bSens').textContent='Stick sensitivity: '+sens.toLowerCase();$('bDz').textContent='Dead zone: '+Math.round(DZS[dz]*100)+'%'}
setTimeout(syncSettings,0);
/* ---------------- photo mode: freeze, free orbit camera, hide the HUD, grab a picture ---------------- */
const PHOTO={on:false,yaw:.8,pitch:.25,dist:40,hud:false,drag:null,tgt:null};
function photoStart(){if(state!=='paused')return;PHOTO.on=true;PHOTO.tgt=P.alive?playerJet.position:P.pos;showOverlay(null);$('photoBar').hidden=false;$('hud').style.visibility='hidden';$('ctrls').hidden=true}
function photoStop(){PHOTO.on=false;$('photoBar').hidden=true;$('hud').style.visibility='';$('photoShot').hidden=true;showOverlay('pause')}
function photoCam(){const t=PHOTO.tgt||P.pos,cp=Math.cos(PHOTO.pitch);camera.up.set(0,1,0);camera.position.set(t.x+Math.sin(PHOTO.yaw)*cp*PHOTO.dist,t.y+Math.sin(PHOTO.pitch)*PHOTO.dist,t.z+Math.cos(PHOTO.yaw)*cp*PHOTO.dist);
  const gh=Math.max(groundH(camera.position.x,camera.position.z),0)+3;if(camera.position.y<gh)camera.position.y=gh;camera.lookAt(t);playerJet.visible=P.alive}
let photoGrab=false;
// the picture is grabbed straight after the frame renders, then offered through the viewer's save prompt (falls back to long-press save)
let dlApi=null; const dlReady=(async()=>{try{if(window.claude&&window.claude.use)dlApi=await claude.use('downloads')}catch(e){}})();
function photoCapture(){photoGrab=false;let url;try{url=glCanvas.toDataURL('image/jpeg',.92)}catch(e){message('COULD NOT CAPTURE',1);return}
  $('photoImg').src=url;$('photoShot').hidden=false;$('photoMsg').textContent=dlApi?'Saving…':'Long-press the picture to save it.';
  if(!dlApi)return;
  fetch(url).then(r=>r.blob()).then(blob=>dlApi.save({filename:'viper-sortie-'+new Date().toISOString().slice(0,19).replace(/[:T]/g,'-')+'.jpg',data:blob}))
    .then(()=>{$('photoMsg').textContent='Saved.'}).catch(e=>{$('photoMsg').textContent=e&&e.code==='declined'?'Not saved. Long-press the picture to save it instead.':'Long-press the picture to save it.'})}

/* ---------------- radar cross-section: detection range scales with RCS^(1/4) (radar equation) and with aspect ----------------
   frontal RCS in m², public estimates where they exist, otherwise game estimates; external stores add to it */
const RCS={F16:1.2,F16B70:1.2,F15C:10,F15EX:8,FA18E:1,GRIPEN:.5,GRIPENE:.4,TYPHOON:.5,RAFALE:.5,MIG29:5,MIG29UPG:5,MIG29K:3,MIG35:3,SU27:15,SU33:15,SU35:3,J10C:1.5,J20:.05,CRUISE:.1,BOMBER:60,TRANSPORT:40};
rosterFill(RCS,{A10A:12,SU25:8,A7E:6,A4E:3,SU22M3:7,ALPHAJET:2.5,G91Y:3,JAGUAR:3,Q5A:5,AMX:2.5,F104S:1.5,TORNADOIT:5,F4C:6,F5A:1.5,J35D:3,J29F:3.5,J6A:3,MIG21MF:2,F8E:4,F100D:5,MIG19PT:3,MIG21F13:1.8,HUNTER:4,MIRAGE3C:3,F4E:6,FA18C:1.5,F15E:8,F35A:.02,F22A:.01,SU57:.1,F104G:1.5,MIG21:2,SU30SM:12,J35F:3,JA37:4,LIGHTNING:5,TORNADO3:5,KFIR:3,F2A:1.2,F35B:.02,F35DE:.02,F35AJ:.02,F35BJ:.02,F35I:.015,EF2K1:.6,EF2K3:.5,J7G:2,J11B:15,J15:15,J16:6,MIG29G:5});
const REF_RCS=5;   // radar ranges in the jet data are quoted against a ~5 m² fighter
function storesRCS(ac){if(ac.id==='J20')return 0;return (ac.srN+ac.mrN)*.04+(AG.load||[]).reduce((a,l)=>a+l.n*.12,0)+(ac.tanks&&!P.tanksGone?ac.tanks*.4:0)}
function playerRCS(){return (RCS[AC.id]??3)+storesRCS(AC)}
function rcsOf(t,from){const base=t===P?playerRCS():t.remote?(RCS[t.type]??3):(t.rcs??RCS[t.type]??(t.kind==='bomber'?60:3));
  _s1.subVectors(from,t.pos).normalize(); const c=Math.abs(_s1.dot(t.fwd)), front=_s1.dot(t.fwd)>0;
  return base*(c>.7?(front?1:2.5):c>.35?2.5:6)}   // nose-on smallest, beam biggest, tail (engines) in between
const rcsK=(t,from)=>clamp(Math.pow(rcsOf(t,from)/REF_RCS,.25),.2,2.2);
function radRange(e){return ((AC.radar&&AC.radar.range)||74000)*rcsK(e,P.pos)}

/* ---------------- tanker (boom for F-16s, hose-and-drogue for probe jets) ---------------- */
const TK={obj:null,pos:new V3(),vel:new V3(),fwd:new V3(),up:new V3(0,1,0),right:new V3(),ang:0,c:new V3(0,7000,18000),r:14000,v:200,on:false,
  conn:false,kind:'',dist:1e9,off:new V3(),boom:null,hoses:[]};
function buildTanker(){
  const g=new THREE.Group(),root=new THREE.Group();root.add(g);
  const body=new THREE.MeshStandardMaterial({color:0x9aa3aa,roughness:.7,flatShading:true,side:THREE.DoubleSide}),dark=new THREE.MeshStandardMaterial({color:0x40464c,flatShading:true});
  const add=(geo,mat,x,y,z)=>{const m=new THREE.Mesh(geo,mat);m.position.set(x,y,z);g.add(m);return m};
  let geo=new THREE.CylinderGeometry(2.6,2.6,40,12);geo.rotateX(Math.PI/2);add(geo,body,0,0,0);
  geo=new THREE.SphereGeometry(2.6,12,8);add(geo,body,0,0,20).scale.set(1,1,1.6);
  geo=new THREE.ConeGeometry(2.6,10,12);geo.rotateX(-Math.PI/2);add(geo,body,0,.6,-25).scale.set(1,.7,1);
  const sh=new THREE.Shape();sh.moveTo(2,6);sh.lineTo(24,-6);sh.lineTo(24,-9);sh.lineTo(2,-4);
  for(const s of [1,-1]){const sh2=new THREE.Shape();sh2.moveTo(2*s,6);sh2.lineTo(24*s,-6);sh2.lineTo(24*s,-9);sh2.lineTo(2*s,-4);
    const eg=new THREE.ExtrudeGeometry(sh2,{depth:.5,bevelEnabled:false});eg.rotateX(Math.PI/2);eg.translate(0,-1,0);g.add(new THREE.Mesh(eg,body));
    geo=new THREE.CylinderGeometry(1.4,1.2,5,10);geo.rotateX(Math.PI/2);add(geo,dark,9*s,-2.6,1);
    geo=new THREE.CylinderGeometry(.5,.4,3,8);geo.rotateX(Math.PI/2);add(geo,dark,16*s,-2.2,-6)}  // wing refuelling pods
  const ts=new THREE.Shape();ts.moveTo(-18,2);ts.lineTo(-27,2);ts.lineTo(-29,11);ts.lineTo(-25,11);ts.lineTo(-18,2);
  const tg=new THREE.ExtrudeGeometry(ts,{depth:.5,bevelEnabled:false});tg.rotateY(-Math.PI/2);tg.translate(.25,0,0);g.add(new THREE.Mesh(tg,body));
  add(new THREE.BoxGeometry(18,.4,4),body,0,1.5,-26);
  // boom
  const boom=new THREE.Group();boom.position.set(0,-1.8,-24);g.add(boom);
  geo=new THREE.CylinderGeometry(.25,.18,14,8);geo.rotateX(Math.PI/2);geo.translate(0,0,-7);const bm=new THREE.Mesh(geo,dark);boom.add(bm);boom.rotation.x=-.5;
  // hoses with drogues
  const hoses=[];for(const s of [1,-1]){const h=new THREE.Group();h.position.set(16*s,-2.2,-7.5);g.add(h);
    geo=new THREE.CylinderGeometry(.08,.08,26,5);geo.rotateX(Math.PI/2);geo.translate(0,0,-13);h.add(new THREE.Mesh(geo,dark));
    const dr=new THREE.Mesh(new THREE.ConeGeometry(.6,.9,10,1,true).rotateX(-Math.PI/2),dark);dr.position.set(0,0,-26.3);h.add(dr);h.rotation.x=-.12;hoses.push(h)}
  return {root,boom,hoses};
}
function tankerStart(){
  if(TK.obj)scene.remove(TK.obj);
  const b=buildTanker(); TK.obj=b.root; TK.boom=b.boom; TK.hoses=b.hoses; scene.add(TK.obj); TK.on=true; TK.conn=false; TK.ang=rand(0,Math.PI*2);
}
function tankerStop(){TK.on=false;TK.conn=false;if(TK.obj){scene.remove(TK.obj);TK.obj=null}}
const _tq=new THREE.Quaternion(),_tm=new THREE.Matrix4();
function updateTanker(dt){
  if(!TK.on)return;
  TK.ang+=TK.v/TK.r*dt;
  TK.pos.set(TK.c.x+Math.sin(TK.ang)*TK.r,TK.c.y,TK.c.z+Math.cos(TK.ang)*TK.r);
  TK.fwd.set(Math.cos(TK.ang),0,-Math.sin(TK.ang)); TK.vel.copy(TK.fwd).multiplyScalar(TK.v);
  TK.obj.position.copy(TK.pos); TK.obj.lookAt(_s1.copy(TK.pos).add(TK.fwd)); TK.obj.rotateZ(-.22);   // ~13° bank in the orbit
  TK.obj.updateMatrixWorld();
  const kind=AC.refuel; TK.kind=kind||'';
  if(!kind||!P.alive||state!=='play'){TK.conn=false;TK.dist=1e9;return}
  // contact point on the tanker and receptacle / probe on your jet (world)
  const cp=kind==='boom'?_s2.set(0,-8.5,-37):_s2.set(TK.hoses[0]?16:0,-4.5,-34);
  if(kind==='probe'){const L=_s3.set(16,-4.5,-34).applyMatrix4(TK.obj.matrixWorld),R2=_s4.set(-16,-4.5,-34).applyMatrix4(TK.obj.matrixWorld);
    cp.copy(L.distanceTo(P.pos)<R2.distanceTo(P.pos)?L:R2)} else cp.applyMatrix4(TK.obj.matrixWorld);
  const rp=_s5.set(kind==='boom'?0:-.55,kind==='boom'?1.0:.7,kind==='boom'?2.2:7.6).applyQuaternion(playerJet.quaternion).add(P.pos);
  TK.dist=rp.distanceTo(cp); TK.off.subVectors(cp,rp);    // where the contact point is relative to you (world)
  const rel=_s1.subVectors(P.vel,TK.vel).length();
  const grab=kind==='boom'?14:4.5, keep=kind==='boom'?22:9;
  if(!TK.conn&&TK.dist<grab&&rel<6){TK.conn=true;message('CONTACT',1.2);buzz(40);if(trainHook)trainHook('contact')}
  if(TK.conn&&(TK.dist>keep||rel>9)){TK.conn=false;message('DISCONNECT',1)}
  if(TK.conn){const flow=kind==='boom'?45:18;P.fuel=Math.min(AC.fuelCap,P.fuel+flow*dt);P.bingo=P.fuel<.25*AC.fuelCap;P.lowFuel=P.fuel<.1*AC.fuelCap;
    if(P.fuel>=AC.fuelCap-1){TK.conn=false;message('TANKS FULL · DISCONNECT',1.6);if(trainHook)trainHook('full')}}
  // boom operator flies the boom to you once you're close and stable
  if(kind==='boom'&&TK.boom&&TK.dist<60){_s3.copy(rp);TK.obj.worldToLocal(_s3);const bp=TK.boom.position;
    TK.boom.rotation.x=-clamp(Math.atan2(-( _s3.y-bp.y),-(_s3.z-bp.z)),.3,.85);TK.boom.rotation.y=clamp(Math.atan2(-(_s3.x-bp.x),-(_s3.z-bp.z)),-.25,.25)}
}
// pilot director: how to move to reach the contact point, in your own frame
function tankerCue(){
  if(!TK.on||!TK.kind||TK.dist>400)return '';
  if(TK.conn)return 'CONTACT · FUEL '+Math.round(P.fuel/AC.fuelCap*100)+'%';
  const o=TK.off, f=o.dot(P.fwd), u=o.dot(P.up), r=o.dot(P.right), w=[];
  if(Math.abs(u)>1.5)w.push((u>0?'UP ':'DOWN ')+Math.round(Math.abs(u)));
  if(Math.abs(r)>1.5)w.push((r>0?'RIGHT ':'LEFT ')+Math.round(Math.abs(r)));
  if(Math.abs(f)>2)w.push((f>0?'FWD ':'BACK ')+Math.round(Math.abs(f)));
  const rel=P.vel.dot(TK.fwd)-TK.v;
  return (TK.kind==='boom'?'BOOM ':'DROGUE ')+(w.join(' · ')||'HOLD')+' · '+(rel>0?'+':'')+Math.round(rel*1.944)+' KT';
}

