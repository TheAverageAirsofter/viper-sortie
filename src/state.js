/* ---------------- game state ---------------- */
let state='menu', invert=false, best=0;
try{best=+localStorage.getItem('viperBest')||0;invert=localStorage.getItem('viperInvert')==='1'}catch(e){}
const P=Object.assign(newJet(playerJet,AC.gmax,AC),{hp:100,aim9:AC.srN,aim120:AC.mrN,rounds:AC.gunRounds,gStress:0,gloc:0,gcas:false,maxG:1});
const omega=new V3(), qPrev=new THREE.Quaternion();
let enemies=[],wave=0,score=0,kills=0,waveClearT=0,gunAcc=0,gunSndT=0,hurtT=0,shake=0,deadT=0,deathCause='';
let lockTarget=null,lockT=0,lockDist=0,lockAng=0,can9=false,can120=false,toneT=0;
let msgText='',msgT=0,clock=0,throttle=.8,thrSet=.8;
let gunHeld=false,brake=false,fire9=false,fire120=false;
const HG={on:false,bg:false,ang:.7,el:.2,zoom:1,drag:null,auto:true,pan:false,goal:null,t:0,tgt:new V3(0,2,-4),r:20};   // on = hangar editor panel; bg = hangar scene behind the menu   // hangar: turntable camera around the player's jet
const VIEWS=['CHASE','COCKPIT','PADLOCK','FLYBY']; let view=0; const flyCam=new V3(); let flyCamSet=false;
const keys={};
const REDUCED=!!(window.matchMedia&&matchMedia('(prefers-reduced-motion:reduce)').matches);
const srLive=document.getElementById('srLive');
// kill feed (War Thunder style): short lines in the top-right corner that fade after a few seconds; kind picks the colour
const FEED=[], FEED_LIFE=7;
function feed(text,kind){FEED.push({t:clock,text,kind:kind||(/^You (killed|destroyed)/.test(text)?'kill':/^(Wingman|Your wingman|The C-130)/.test(text)?'loss':'info')});while(FEED.length>6)FEED.shift()}
function message(t,dur){msgText=t;msgT=dur||1.6;if(srLive&&srLive.textContent!==t)srLive.textContent=t}   // mirrored to a screen-reader live region

function rearm(){
  P.aim9=AC.srN;P.aim120=AC.mrN;P.rounds=AC.gunRounds;
  if(typeof cmFlares==='function'){CM.flares=cmFlares();CM.chaff=cmChaff();CM.decoys=Math.max(0,AC.cm.decoys-(CM.decoy?1:0));syncCM()}
  playerJet.traverse(o=>{const m=/^r(9|120)_(\d+)/.exec(o.name);if(m)o.visible=+m[2]<(m[1]==='9'?AC.srN:AC.mrN)});
  P.tanksGone=false; P.jettKg=0; if(typeof agReset==='function')agReset(); const cj=$('cJett'); if(cj)cj.hidden=!(AC.tanks>0); if(typeof setGear==='function')setGear(!!P.gear);
}
function resetPlayer(){
  P.pos.set(0,4000,0); playerJet.quaternion.identity(); playerJet.visible=true;
  P.vel.set(0,0,230); P.onGround=false; P.onDeck=false; P.ejected=null; P.jetGhost=null; P.rescued=false; if(chute)chute.visible=false; P.scramble=false; P.stopT=0; if(typeof setGear==='function')setGear(false); P.n=1; P.hp=100; P.fuel=.75*(AC.intFuel||AC.fuelCap)+(AC.tankFuel||0); P.flamedOut=false; resetSystems(); P.gStress=0; P.gloc=0; P.gcas=false; P.maxG=1; axes(P); qPrev.copy(playerJet.quaternion); omega.set(0,0,0);
  rearm(); throttle=.8; setThr(.8);
}
let friends=[], mission='WAVES', banditType='F16', missionT=0, missionDone=false, spawnQ=[];
try{mission=localStorage.getItem('viperMission')||'WAVES';banditType=localStorage.getItem('viperBandit')||'F16'}catch(e){}
const RUSH_KILLS=8, RUSH_TIME=300;   // time-attack: bandits keep arriving, four at a time
const MISSIONS={WAVES:'Waves',STRIKE:'Strike / SEAD',INTERCEPT:'Intercept bombers',RUSH:'Bandit rush (8 in 5 min)',ESCORT:'Escort the C-130','2V4':'2 v 4 with wingman','4SHIP':'4-ship vs 6',CONVOY:'Convoy attack',GROUNDWAR:'Ground war (CAS)',ANTISHIP:'Anti-ship strike',CRUISE:'Cruise missile defence',CAMPAIGN:'Campaign',ONLINE:'Online dogfight',TRAINING:'Training'};
const LESSONS={BFM:'Dogfighting basics',DEFENSE:'Missile defense',BVR:'Long-range shot',LANDING:'Landing',REFUEL:'Air refueling'};
let lesson='BFM'; try{if(LESSONS[localStorage.getItem('vsLesson')])lesson=localStorage.getItem('vsLesson')}catch(e){}
let trainDefeated=0, trainConnT=0;
const BANDITS={F16:'F-16',F16B70:'F-16 Block 70',GRIPEN:'Gripen',GRIPENE:'Gripen E',MIG29:'MiG-29',MIG29UPG:'MiG-29UPG',MIG35:'MiG-35',SU27:'Su-27S',SU35:'Su-35S',F15C:'F-15C',F15EX:'F-15EX',TYPHOON:'Typhoon',RAFALE:'Rafale',J10C:'J-10C',J20:'J-20',FA18E:'F/A-18E',MIG29K:'MiG-29K',SU33:'Su-33',MIXED:'Mixed'};
// bandit skill: g they'll pull, how fast they notice and react to missiles, how well they defend, shot discipline, gunnery
const DIFF={
  ROOKIE: {name:'Rookie', g:6.5,react:2.0,irSee:1500,defP:.45,cmP:.35,notch:false,notchP:.15,rne:false,iK:.95,rK:1.0, spread:.03, gunR:700, lock:.5, cd:2.0},
  REGULAR:{name:'Regular',g:7.5,react:1.1,irSee:2500,defP:.75,cmP:.6, notch:true,notchP:.3, rne:false,iK:.85,rK:.95,spread:.022,gunR:850, lock:.75,cd:1.4},
  VETERAN:{name:'Veteran',g:8.5,react:.5, irSee:3200,defP:.92,cmP:.85,notch:true,notchP:.45,rne:true, iK:.8, rK:.85,spread:.015,gunR:950, lock:.9, cd:1.1},
  ACE:    {name:'Ace',    g:9,  react:0,  irSee:3500,defP:1,  cmP:1,  notch:true,notchP:.55,rne:true, iK:.75,rK:.8, spread:.012,gunR:1000,lock:1,  cd:1}
};
const REMOTE_SK={notchP:.5};
// Battle presets set existing values only: difficulty (which carries the missile and countermeasure rules), HUD marker level, damage-system severity, and a reward multiplier for progAward.
const PRESETS={ARCADE:{n:'Arcade',diff:'ROOKIE',marks:2,dmg:.6,reward:1},REALISTIC:{n:'Realistic',diff:'REGULAR',marks:1,dmg:1,reward:1.2},SIMULATOR:{n:'Simulator',diff:'VETERAN',marks:0,dmg:1.5,reward:1.5}};
let preset='REALISTIC'; try{const v=localStorage.getItem('vsPreset');if(PRESETS[v])preset=v}catch(e){}
// Engagement range: how far out the fight starts. Short = original; Long/Extreme give time to notch, drag and defend against radar missiles.
const ENG_RANGES={SHORT:{n:'Short',k:1},LONG:{n:'Long',k:2.5},EXTREME:{n:'Extreme',k:4}};
let rangeKey='LONG'; try{const r=localStorage.getItem('viperRange');if(ENG_RANGES[r])rangeKey=r}catch(e){}
const engK=()=>ENG_RANGES[rangeKey].k, farK=()=>1+(engK()-1)*.3;   // engK scales random merge distances; farK scales fixed scripted set-ups
let difficulty='REGULAR'; try{const d=localStorage.getItem('viperDiff');if(DIFF[d])difficulty=d}catch(e){}
const sk=e=>e.sk?e.sk:e.remote?REMOTE_SK:e.team==='red'?DIFF[difficulty]:DIFF.VETERAN;   // your wingman flies at veteran level
const RED_COLORS={body:0x6a3f3a,dark:0x2f2523,glass:0x222a30,glassE:0x000000,flame:0xff6a3a};
const BLUE_COLORS={body:0x7f93a8,dark:0x36404b,glass:0xc9a24a,glassE:0x2a1d00,flame:0xffa64a};
const templates={};
function tmpl(team,type){const k=team+type;
  if(!templates[k])templates[k]=type==='BOMBER'?buildBomber(RED_COLORS):type==='TRANSPORT'?buildTransport(BLUE_COLORS):buildJet(team==='red'?RED_COLORS:BLUE_COLORS,type);
  return templates[k]}
function clearWorld(){
  clearGround(); tankerStop(); clearWrecks(); clearIsles(); if(KC.t>0)endKillCam();
  for(const e of enemies)scene.remove(e.obj); for(const f of friends)scene.remove(f.obj);
  enemies=[];friends=[];spawnQ=[];[...pBullets,...eBullets,...missiles,...eMissiles].forEach(kill);
}
let gunShots=0,gunHits=0;
function startGame(){
  gunShots=0;gunHits=0;clearWorld(); resetPlayer(); resetRadar(); resetCM(); recReset(); rec3Reset(); P.alive=true;
  if(mission!=='ONLINE'){netStop();$('bSb').hidden=true;$('sbBox').hidden=true}
  trainHook=null;
  wave=0;score=0;kills=0;waveClearT=1.5;lockTarget=null;lockT=0;hurtT=0;missionT=0;missionDone=false;
  state='play'; showOverlay(null); $('ctrls').hidden=false; camSnap=true;
  $('cWing').hidden=mission!=='2V4'&&mission!=='4SHIP'&&mission!=='CAMPAIGN';
  if(mission!=='ONLINE'&&mission!=='TRAINING')tankerStart();
  sortie=null; GCI.known.clear(); GCI.lines=[]; GCI.rtb=false; GCI.commitT=7; GCI.threatT=8; initCarrier(); setupMission(); if(mission!=='4SHIP'&&mission!=='ONLINE'&&mission!=='TRAINING')gciPicture(); for(const e of enemies)GCI.known.add(e.id); if(startOnRunway&&mission!=='ONLINE'&&mission!=='TRAINING'){if(startCV&&AC.carrier)placeOnCarrier();else placeOnRunway()} recenterTilt();
}
const FIGHTERS=['F16','F16B70','F15C','F15EX','FA18E','GRIPEN','GRIPENE','TYPHOON','RAFALE','MIG29','MIG29UPG','MIG29K','MIG35','SU27','SU33','SU35','J10C','J20'];
FIGHTERS.push(...ROSTER_IDS);
Object.assign(BANDITS,{F4E:'F-4E Phantom II',FA18C:'F/A-18C',F15E:'F-15E',F35A:'F-35A',F22A:'F-22A',MIG21:'MiG-21bis',SU30SM:'Su-30SM',SU57:'Su-57',F104G:'F-104G',F4F:'F-4F ICE',MIG29G:'MiG-29G',EF2K1:'EF2000 T1',EF2K3:'EF2000 T3',F35DE:'F-35A (Luftwaffe)',
  F4EJ:'F-4EJ',F4EJK:'F-4EJ Kai',F4EIL:'F-4E (IAF)',F15J:'F-15J',F15JK:'F-15J Kai',F2A:'F-2A',F35AJ:'F-35A (JASDF)',F35B:'F-35B',F35BJ:'F-35B (JASDF)',KFIR:'Kfir C.7',F4E2K:'Kurnass 2000',F15BAZ:'F-15C Baz',F16BARAK:'F-16C Barak',F16I:'F-16I Sufa',F15I:"F-15I Ra'am",F35I:'F-35I Adir',
  J35F:'J 35F Draken',JA37:'JA 37 Viggen',LIGHTNING:'Lightning F.6',PHANTOM2:'Phantom FGR.2',TORNADO3:'Tornado F.3',J7G:'J-7G',F5E:'F-5E',F14B:'F-14B',MIG23ML:'MiG-23ML',MIG25PD:'MiG-25PD',J8F:'J-8F',F8E:'F-8E Crusader',F100D:'F-100D Super Sabre',MIG19PT:'MiG-19PT',MIG21F13:'MiG-21F-13',HUNTER:'Hunter F.6',MIRAGE3C:'Mirage IIIC',F4C:'F-4C Phantom II',F5A:'F-5A',J35D:'J 35D Draken',J29F:'J 29F Tunnan',J6A:'J-6A',MIG21MF:'MiG-21MF',A10A:'A-10A Thunderbolt II',SU25:'Su-25',A7E:'A-7E Corsair II',A4E:'A-4E Skyhawk',SU22M3:'Su-22M3',ALPHAJET:'Alpha Jet A',G91Y:'G.91Y',JAGUAR:'Jaguar GR.1',Q5A:'Q-5A',AMX:'AMX',F104S:'F-104S',TORNADOIT:'Tornado IDS',MIRAGEF1:'Mirage F1C',M2000:'Mirage 2000-5F',J11B:'J-11B',J15:'J-15',J16:'J-16'});
{const m=BANDITS.MIXED;delete BANDITS.MIXED;BANDITS.MIXED=m}
// matchmaking: bandits are only ever fighters within MM_BR of the battle rating of the jet you fly (Career and Free play alike)
const MM_BR=1;
const banditPool=()=>{const b=progBR(AC.id),p=FIGHTERS.filter(f=>Math.abs(progBR(f)-b)<=MM_BR+1e-6);return p.length?p:[AC.id]};
function pickBanditType(){const pool=banditPool();if(banditType!=='MIXED'&&pool.indexOf(banditType)>=0)return banditType;   // a fixed choice only counts while it is inside the window
  return pool[Math.random()*pool.length|0]}
// spawn a fighter: team, aircraft type, position, heading toward a point, loadout
function spawnFighter(team,type,pos,lookAt,opts={}){
  const obj=tmpl(team,type).clone(); obj.position.copy(pos); obj.lookAt(lookAt.x,pos.y,lookAt.z); scene.add(obj);
  const ac=AC_DEFS[type], e=Object.assign(newJet(obj,team==='red'?Math.min(DIFF[difficulty].g+wave*.15,ac.gmax):ac.gmax,ac),{
    team,type,kind:'fighter',hp:3,alive:true,mode:'',tgt:null,retgtT:0,lead:null,side:1,engaged:false,crankSide:Math.random()<.5?1:-1,
    flareCd:0,chaffCd:0,gunAcc:0,mslCd:rand(3,6)*(team==='red'?DIFF[difficulty].cd:1),lockT:0,spiking:false,zoneT:0,zI:null,zR:null,
    espec:aiSpecs(type),ir:opts.ir??ac.srN,rdr:opts.rdr??ac.mrN,cmd:'ENGAGE',escortPref:!!opts.escortPref,id:nextId()});
  axes(e); e.vel.copy(e.fwd).multiplyScalar(opts.speed||rand(220,250));
  (team==='red'?enemies:friends).push(e); return e;
}
function spawnHeavy(team,type,pos,wp,speed){
  const obj=tmpl(team,type).clone(); obj.position.copy(pos); obj.lookAt(wp); scene.add(obj);
  const e=Object.assign(newJet(obj,2.5,AC_DEFS.F16),{team,type,kind:type==='BOMBER'?'bomber':'transport',hp:type==='BOMBER'?5:8,alive:true,
    wp:wp.clone(),speed,tgt:null,mslCd:0,retgtT:0,flareCd:0,chaffCd:0,lockT:0,id:nextId()});
  axes(e); e.vel.copy(e.fwd).multiplyScalar(speed); (team==='red'?enemies:friends).push(e); return e;
}
let idSeq=0; const nextId=()=>++idSeq;
// a 2-ship of bandits: lead plus wingman 1.4 km line abreast
function spawnPair(type,center,lookAt,opts={}){
  const l=spawnFighter('red',type,center,lookAt,opts);
  const w=spawnFighter('red',type,center.clone().add(_s5.copy(l.right).multiplyScalar(1400)),lookAt,opts);  // 2-ships fly the same jet
  w.lead=l; w.side=1; return [l,w];
}
function setupMission(){
  if(mission==='TRAINING'){setupLesson();return}
  if(mission==='ONLINE'){netStart();return}
  sortie=null;
  if(mission==='WAVES'){message('WAVES · CLEAR EACH GROUP OF BANDITS',2.4);return}
  if(mission==='CAMPAIGN'){setupCampaign();return}
  if(mission==='CONVOY'){P.pos.set(0,6000,0);P.vel.set(0,0,240);setupConvoy(rand(-4000,4000),34000);spawnPair(pickBanditType(),new V3(0,7000,52000),new V3(0,5000,0));message('CONVOY · STOP AT LEAST 4 OF THE 5 TRUCKS BEFORE THEY GET THROUGH',3);return}
  if(mission==='GROUNDWAR'){setupGroundWar();spawnPair(pickBanditType(),new V3(sortie.center.x,7000,sortie.center.z+16000),new V3(0,5000,0));message('GROUND WAR · SUPPORT THE BLUE ARMOUR (GEPARD COVERS IT) · DESTROY THE '+sortie.need+' RED VEHICLES · ZSU-23-4 AND ZSU-57-2 WILL SHOOT AT YOU',3.6);return}
  if(mission==='ANTISHIP'){P.pos.set(0,6000,0);P.vel.set(0,0,240);setupShip();spawnPair(pickBanditType(),new V3(19600,7000,36000),new V3(0,5000,0));message('ANTI-SHIP · SINK THE FRIGATE NE OF THE BASE · IT HAS SAMS',3);return}
  if(mission==='CRUISE'){P.pos.set(0,5000,6000);P.vel.set(0,0,240);setupCruise();message('CRUISE MISSILES INBOUND FROM THE NORTH · LOW AND FAST · PROTECT THE BASE',3.2);return}
  if(mission==='STRIKE'){
    P.pos.set(0,6500,0); P.vel.set(0,0,240);
    const cx=rand(-4000,4000), cz=rand(38000,44000);
    spawnGround('radar',cx,cz+1500,true); spawnGround('bunker',cx-600,cz+600,true); spawnGround('bunker',cx+700,cz+900,true);
    spawnGround('sam',cx-3500,cz-2500,true); spawnGround('sam',cx+3800,cz-1500,true);
    spawnGround('aaa',cx-400,cz-300); spawnGround('aaa',cx+500,cz+200);
    const tp=pickBanditType(); spawnPair(tp,new V3(cx-6000,8000,cz+12000),new V3(0,6000,0),{rdr:Math.min(2,AC_DEFS[tp].mrN)});
    message(AC.strike?'STRIKE · KILL THE SAMS, RADAR AND BUNKERS · '+Math.round(cz/1000)+' KM NORTH':'STRIKE · '+AC.name.toUpperCase()+' HAS NO STRIKE FIT · USE GUNS OR ESCORT',3.2);return}
  if(mission==='RUSH'){message('BANDIT RUSH · SHOOT DOWN '+RUSH_KILLS+' IN '+fmtT(RUSH_TIME),3);return}
  if(mission==='INTERCEPT'){
    P.pos.set(0,6500,0); P.vel.set(0,0,250);
    const tp=pickBanditType();
    for(let i=0;i<4;i++){const x=(i%2?1:-1)*(700+(i>>1)*500), z=46000+(i>>1)*1500;
      spawnHeavy('red','BOMBER',new V3(x,9000,z),new V3(x*.3,9000,-4000),235)}
    spawnPair(tp,new V3(-3000,10500,43000),new V3(0,9000,0),{rdr:AC_DEFS[tp].mrN});
    spawnGround('sam',7000,30000);spawnGround('sam',-8000,20000);spawnGround('aaa',6400,29200);spawnGround('aaa',-7400,19300);
    message('INTERCEPT · 4 BOMBERS INBOUND · SAMS ALONG THEIR ROUTE',3);return}
  if(mission==='ESCORT'){
    P.pos.set(-900,6200,-600); P.vel.set(0,0,200);
    spawnHeavy('blue','TRANSPORT',new V3(0,5500,0),new V3(0,5500,ESCORT_LEN),150);
    spawnQ=[{t:12,n:2},{t:75,n:2},{t:140,n:2}];
    spawnGround('sam',6000,13000);spawnGround('sam',-6500,26000);spawnGround('aaa',2500,18000);spawnGround('aaa',-2500,31000);
    message('ESCORT · KEEP THE C-130 ALIVE FOR '+Math.round(ESCORT_LEN/150/60*10)/10+' MIN',3);return}
  if(mission==='4SHIP'){
    // two elements: Two on your right, Three on your left with Four on his left
    const two=spawnFighter('blue',AC.id,new V3(1600,4000,-300),new V3(1600,4000,30000),{speed:230}); two.lead=P;two.side=1;two.cs=2;
    const thr=spawnFighter('blue',AC.id,new V3(-1600,4200,-500),new V3(-1600,4200,30000),{speed:230}); thr.lead=P;thr.side=-1;thr.cs=3;
    const fou=spawnFighter('blue',AC.id,new V3(-3000,4200,-800),new V3(-3000,4200,30000),{speed:230}); fou.lead=thr;fou.side=-1;fou.cs=4;
    for(const w of [two,thr,fou]){w.cmd='ENGAGE';w.bombs=2}
    spawnPair(pickBanditType(),new V3(-5000,6000,30000*farK()),new V3(0,4000,0));spawnPair(pickBanditType(),new V3(1000,5500,33000*farK()),new V3(0,4000,0));spawnPair(pickBanditType(),new V3(6000,6500,31000*farK()),new V3(0,4000,0));
    spawnGround('sam',2000,36000);spawnGround('aaa',2600,35400);
    syncWing(); message('4-SHIP · TAP WING TO COMMAND THE FLIGHT',2.8); gciPicture(); return}
  if(mission==='2V4'){
    const w=spawnFighter('blue',AC.id,new V3(1600,4000,-300),new V3(1600,4000,30000),{speed:230});
    w.lead=P;w.side=1;w.cmd='ENGAGE';w.cs=2;w.bombs=2;syncWing();
    const tp=pickBanditType();
    spawnPair(tp,new V3(-4000,6000,26000*farK()),new V3(0,4000,0));
    spawnPair(pickBanditType(),new V3(5000,5000,29000*farK()),new V3(0,4000,0));
    message('2 V 4 · YOUR WINGMAN IS ON YOUR RIGHT',2.6);return}
}
const ESCORT_LEN=36000;
function setupLesson(){
  trainDefeated=0; trainConnT=0; trainHook=lessonHook;
  const ROOK=Object.assign({},DIFF.ROOKIE,{g:6});
  if(lesson==='BFM'){
    P.pos.set(0,4000,0); playerJet.quaternion.identity(); P.vel.set(0,0,230); axes(P);
    const e=spawnFighter('red','F16',new V3(2500,4200,4500),new V3(-6000,4200,4500),{ir:0,rdr:0,speed:220}); e.sk=ROOK; e.gLim=6;
    message('DOGFIGHT · GUNS ONLY · GET BEHIND HIM',2.6);
  } else if(lesson==='DEFENSE'){
    P.pos.set(0,6000,0); playerJet.quaternion.identity(); P.vel.set(0,0,250); axes(P);
    const e=spawnFighter('red','F16B70',new V3(0,7500,32000),new V3(0,7500,0),{ir:0,rdr:6,speed:250});
    e.sk=Object.assign({},DIFF.REGULAR,{lock:1.2,cd:.8,rK:1}); e.holdOff=true; e.drone=false;
    message('MISSILE DEFENSE · DEFEAT 3 RADAR MISSILES',2.6);
  } else if(lesson==='BVR'){
    P.pos.set(0,6500,0); playerJet.quaternion.identity(); P.vel.set(0,0,250); axes(P);
    const e=spawnFighter('red','F16',new V3(-4000,6500,30000),new V3(30000,6500,30000),{ir:0,rdr:0,speed:220}); e.drone=true;
    message('LONG-RANGE SHOT · TARGET DRONE 30 KM AHEAD',2.6);
  } else if(lesson==='LANDING'){
    P.pos.set(RWY.x,BASE_Y+650,RWY.z0-11500); playerJet.quaternion.identity(); P.vel.set(0,-5,120); axes(P); setThr(.45); throttle=.45;
    message('LANDING · RUNWAY 11 KM AHEAD',2.6);
  } else if(lesson==='REFUEL'){
    if(!AC.refuel){message(AC.name.toUpperCase()+' HAS NO REFUELING PROBE · PICK ANOTHER JET',3);setTimeout(()=>endMission(false,AC.name+' cannot refuel in the air'),1500);return}
    tankerStart(); updateTanker(0);
    P.pos.copy(TK.pos).addScaledVector(TK.fwd,-500).add(_s1.set(0,-40,0)); playerJet.lookAt(_s2.copy(P.pos).add(TK.fwd)); axes(P); P.vel.copy(TK.vel); setThr(.62); throttle=.62;
    P.fuel=.35*AC.fuelCap;
    message('AIR REFUELING · JOIN UP BEHIND THE TANKER',2.6);
  }
  qPrev.copy(playerJet.quaternion); camSnap=true;
}
function lessonHook(ev){
  if(mission!=='TRAINING'||missionDone)return;
  if(lesson==='LANDING'&&ev==='stopped')endMission(true,'Landed and stopped on the runway');
  if(lesson==='REFUEL'&&ev==='full')endMission(true,'Tanks full');
}
function lessonMissile(r){   // called when a missile aimed at you ends
  if(mission==='TRAINING'&&lesson==='DEFENSE'&&r.target==='you'&&r.res==='MISS'){trainDefeated++;message('MISSILE DEFEATED · '+trainDefeated+' / 3',1.6);
    if(trainDefeated>=3)endMission(true,'Defeated three radar missiles')}
}
function updateLesson(dt){
  if(state!=='play'||missionDone)return;
  if((lesson==='BFM'||lesson==='BVR')&&!enemies.length)endMission(true,lesson==='BFM'?'Gunned the bandit':'Splashed the drone at long range');
  if(lesson==='REFUEL'&&TK.conn){trainConnT+=dt;if(trainConnT>25)endMission(true,'Held contact for 25 seconds')}
}
function coachText(){
  if(mission!=='TRAINING'||state!=='play')return '';
  const e=enemies[0];
  if(lesson==='BFM'){if(!e)return '';
    const d=e.pos.distanceTo(P.pos), off=P.fwd.angleTo(_s1.subVectors(e.pos,P.pos));
    if(P.kcas<AC.corner-80)return 'Too slow · ease off the stick and use afterburner to get back toward '+AC.corner+' kt';
    if(off>.6)return 'Roll so he is above your nose (top of the HUD), then pull toward him';
    if(d>1100)return 'Good · hold about '+AC.corner+' kt and close in · '+(d/1000).toFixed(1)+' km';
    return 'Guns range · put the pipper on him and hold GUN';}
  if(lesson==='DEFENSE'){let mm=null,md=1e9;for(const m of eMissiles)if(m.on&&m.target===P){const d=m.m.position.distanceTo(P.pos);if(d<md){md=d;mm=m}}
    if(!mm)return 'He is ~30 km out and shoots radar missiles · SPIKE on the RWR means he has locked you · '+trainDefeated+'/3 defeated';
    _s1.subVectors(P.pos,mm.m.position).normalize(); const beam=Math.abs(P.vel.clone().normalize().dot(_s1))<.35;
    if(md<2500)return 'Missile close · break hard toward it and drop chaff!';
    if(md<8000&&!beam)return 'Turn so the missile sits at your 3 or 9 o\'clock, and drop chaff (CHF)';
    if(md<8000)return 'Holding the beam · keep it there, descend, drop chaff · '+(md/1000).toFixed(1)+' km';
    return beam?'Beaming · stay perpendicular to it and dive below it to hide in ground clutter':'Missile inbound '+(md/1000).toFixed(0)+' km · turn to put it at 3 or 9 o\'clock and descend';}
  if(lesson==='BVR'){if(!e)return '';
    let fly=null;for(const m of missiles)if(m.on)fly=m;
    if(fly)return fly.gmode==='ACTIVE'||fly.gmode==='TERM'&&!SPEC['120'].sarh?'Pitbull · the missile has its own radar now; you could turn away':
      SPEC['120'].sarh?'Keep the radar lock until impact (R-27R needs it in the last 12 km)':'Keep the lock (datalink) · turn ~45° off to crank';
    if(!R.stt)return 'Lock the drone · tap LOCK, or open RDR and tap it on the scope';
    if(pZone&&lockDist>pZone.rne)return 'Locked · watch the launch scale on the right · wait until the caret is inside NE ('+(lockDist/1852).toFixed(0)+' nm)';
    return can120?'Inside the no-escape zone · fire the radar missile now':'Point your nose at him to fire';}
  if(lesson==='LANDING'){
    if(P.onGround)return Math.hypot(P.vel.x,P.vel.z)>2?'On the runway · throttle to idle and hold BRK to stop':'Stopped · nicely done';
    const dz=RWY.z0-P.pos.z, want=BASE_Y+Math.max(0,dz)*Math.tan(3*DEG), dy=P.pos.y-want, w=[];
    if(!P.gear)w.push('Lower the GEAR');
    if(P.kcas>175)w.push('Slow to ~150 kt (throttle back, BRK)'); else if(P.kcas<125)w.push('Too slow · add power');
    if(Math.abs(P.pos.x-RWY.x)>25)w.push('Line up · runway is to your '+((P.pos.x-RWY.x)*P.right.x>0?'left':'right'));
    if(dz>300){if(dy>40)w.push('High · descend');else if(dy<-30)w.push('Low · level off');}
    else if(P.vel.y<-4)w.push('Flare · ease back to slow the sink below 4 m/s');
    return w.join(' · ')||'On glide path · 3° to the threshold, keep '+Math.round(P.kcas)+' kt';}
  if(lesson==='REFUEL'){if(!AC.refuel)return '';
    if(TK.conn)return 'Contact · hold position · '+Math.round(P.fuel/AC.fuelCap*100)+'% · '+Math.max(0,25-trainConnT).toFixed(0)+' s to go';
    if(TK.dist>400)return 'Close on the tanker · match its speed (~'+Math.round(TK.v*Math.sqrt(atm(TK.pos.y).sig)*1.944)+' kt) as you get near';
    return 'Follow the director: '+tankerCue();}
  return '';
}
function nextWave(){
  wave++; const n=Math.min(1+wave,6);
  const heading=Math.atan2(P.fwd.x,P.fwd.z);
  for(let i=0;i<n;i+=2){
    const a=heading+rand(-.9,.9), dist=rand(9000,14000)*engK();
    const c=new V3(P.pos.x+Math.sin(a)*dist,0,P.pos.z+Math.cos(a)*dist);
    c.y=Math.max(Math.max(groundH(c.x,c.z),0)+1500,P.pos.y+rand(-1200,1500));
    const tp=pickBanditType(), ac=AC_DEFS[tp], ld={ir:Math.min(2,ac.srN),rdr:wave>=4?ac.mrN:wave>=2?Math.min(2,ac.mrN):0};
    if(n-i>=2)spawnPair(tp,c,P.pos,ld); else spawnFighter('red',tp,c,P.pos,ld);
  }
  if(wave>1){P.hp=Math.min(100,P.hp+35);rearm();refuel()}
  if(wave>=3&&ground.filter(g=>g.alive).length<wave-1){const a=heading+rand(-1,1),d=rand(12000,18000);spawnGround('sam',P.pos.x+Math.sin(a)*d,P.pos.z+Math.cos(a)*d);spawnGround('aaa',P.pos.x+Math.sin(a)*d+600,P.pos.z+Math.cos(a)*d)}
  message('WAVE '+wave+' · '+n+' BANDITS',2.4);
}
function hitAI(t,amt,how,byPlayer){
  if(!t.alive)return;
  if(t.remote){if(byPlayer)netClaimHit(t,how==='GUNS'?4*amt:75,how);puff(t.pos.x,t.pos.y,t.pos.z,0,0,0,.3,.3,.3,.8,14,20,2);return} t.hp-=amt;
  if(t.hp>0){addHole(t.obj,amt>3?4:1);puff(t.pos.x,t.pos.y,t.pos.z,0,0,0,.3,.3,.3,.8,14,20,2);if(t.kind==='fighter'){t.gLim=Math.max(4,(t.gLim||7)*.8);t.rollK=(t.rollK??1)*.85}if(byPlayer&&t.kind==='bomber')message('BOMBER HIT',.8);if(byPlayer&&clock-(t.fdT||-9)>1.5){t.fdT=clock;feed((t.hp<=1?'Critical hit: ':'Hit: ')+(AC_DEFS[t.type]?AC_DEFS[t.type].name:t.kind==='bomber'?'bomber':'target')+' ('+how.replace(' (WINGMAN)','').toLowerCase()+')','hit')}return}
  if(t.team==='red')killEnemy(t,how,byPlayer); else killFriend(t,how);
}
function killEnemy(e,how,byPlayer=true){
  if(!e.alive)return; e.alive=false; scene.remove(e.obj); explode(e.pos,true); spawnWreck(e);
  const nm=e.kind==='bomber'?'BOMBER':e.kind==='cruise'?'CRUISE MISSILE':'BANDIT';
  if(byPlayer)REC3.lastKill={t:clock,id:e.id};
  if(byPlayer)gciSplash();
  if(byPlayer){kills++;score+=(e.kind==='bomber'?150:e.kind==='cruise'?120:100)*Math.max(1,wave)+(how==='GUNS'?50:0);message(e.kind==='cruise'?'CRUISE MISSILE DOWN':how==='GUNS'?'GUNS KILL':'SPLASH · '+how,1.4)}
  else message(nm+' DOWN · '+how,1.4);
  recEvent((byPlayer?'You killed ':'Wingman killed ')+(e.kind==='bomber'?'a bomber':e.kind==='cruise'?'a cruise missile':'a '+(AC_DEFS[e.type]?AC_DEFS[e.type].name:'bandit'))+' ('+how+')');
}
function killFriend(f,how){
  if(!f.alive)return; f.alive=false; scene.remove(f.obj); explode(f.pos,true); spawnWreck(f);
  message(f.kind==='transport'?'C-130 DESTROYED':'WINGMAN DOWN',2.2); recEvent((f.kind==='transport'?'The C-130':'Your wingman')+' was shot down ('+how+')');
}
const WCMDS=['ENGAGE','COVER','REJOIN','SORT','GROUND'], WSHORT={ENGAGE:'ENG',COVER:'COVER',REJOIN:'REJN',SORT:'SORT',GROUND:'GRND'};
function syncWing(){const w=friends.filter(f=>f.kind==='fighter'&&f.alive&&!f.remote);$('nWing').textContent=w.length?WSHORT[w[0].cmd]||'ENG':'—'}
function wingCmd(){const fl=friends.filter(f=>f.kind==='fighter'&&f.alive&&!f.remote);if(!fl.length)return;
  let i=WCMDS.indexOf(fl[0].cmd); do{i=(i+1)%WCMDS.length}while(WCMDS[i]==='GROUND'&&!ground.some(g=>g.alive));
  const c=WCMDS[i]; for(const w of fl){w.cmd=c;w.retgtT=0;w.engaged=c==='ENGAGE'||c==='SORT'||c==='GROUND'}
  const who=fl.length>1?'FLIGHT':'TWO', txt={ENGAGE:who+', ENGAGE',COVER:who+', COVER ME',REJOIN:who+', REJOIN',SORT:who+', SORT · ONE TARGET EACH',GROUND:who+', ATTACK THE GROUND TARGETS'}[c];
  message(txt,1.4); radio(fl.map(w=>w.cs||2).join(', ')+(c==='REJOIN'?', rejoining.':', copy.'),'wing'); syncWing()}
function endMission(win,text){
  if(missionDone)return; missionDone=true; deathCause=win?'win':'fail'; missionText=text; recEvent(text);
  state='dead'; deadT=2.2; $('ctrls').hidden=true; resetStick(); gunHeld=false; brake=false;
}
let missionText='';
function updateMission(dt){
  if(mission==='TRAINING'){updateLesson(dt);return}
  if(state!=='play')return;
  missionT+=dt;
  if(P.scramble&&!P.onGround){P.scrT+=dt;const agl=P.pos.y-BASE_Y;if(agl>600||P.scrT>30){P.scramble=false;message(mission==='WAVES'?'AIRBORNE · BANDITS INBOUND':'AIRBORNE · WEAPONS FREE',2)}}
  if(mission==='STRIKE'){if(!ground.some(g=>g.objective&&g.alive))endMission(true,'Target area destroyed');return}
  if(sortie){sortieCheck(dt);return}
  if(mission==='WAVES'){
    if(enemies.length===0&&!P.scramble){
      if(waveClearT<=0){waveClearT=3;if(wave>0)message('WAVE '+wave+' CLEAR · REARMED & REFUELED',2.4)}
      waveClearT-=dt; if(waveClearT<=0.0001){waveClearT=0;nextWave()}
    }
    return;
  }
  if(mission==='RUSH'){
    if(kills>=RUSH_KILLS){endMission(true,RUSH_KILLS+' bandits down with '+fmtT(RUSH_TIME-missionT)+' to spare');return}
    if(missionT>=RUSH_TIME){endMission(false,'Time expired: '+kills+' of '+RUSH_KILLS+' bandits down');return}
    if(enemies.length<4&&!P.scramble){const heading=Math.atan2(P.fwd.x,P.fwd.z),a=heading+rand(-.9,.9),dist=rand(9000,14000)*engK();
      const c=new V3(P.pos.x+Math.sin(a)*dist,0,P.pos.z+Math.cos(a)*dist);c.y=Math.max(Math.max(groundH(c.x,c.z),0)+1500,P.pos.y+rand(-1200,1500));
      const tp=pickBanditType(),ac=AC_DEFS[tp];spawnPair(tp,c,P.pos,{ir:Math.min(2,ac.srN),rdr:Math.min(2,ac.mrN)})}
    return;
  }
  if(mission==='INTERCEPT'){
    const bombers=enemies.filter(e=>e.kind==='bomber');
    if(bombers.some(b=>b.pos.z<2500))endMission(false,'A bomber reached its release point');
    else if(!bombers.length)endMission(true,'All four bombers destroyed');
    return;
  }
  if(mission==='ESCORT'){
    const tr=friends.find(f=>f.kind==='transport');
    if(!tr||!tr.alive){endMission(false,'The C-130 was shot down');return}
    for(const q of spawnQ)if(!q.done&&missionT>=q.t){q.done=true;
      const a=rand(-.6,.6),d=rand(16000,20000)*farK();const c=new V3(tr.pos.x+Math.sin(a)*d,tr.pos.y+rand(500,2500),tr.pos.z+Math.cos(a)*d);
      const pr=spawnPair(pickBanditType(),c,tr.pos);pr.forEach(x=>x.escortPref=Math.random()<.65);message('BANDITS · 2-SHIP INBOUND ON THE C-130',2)}
    if(tr.pos.z>=ESCORT_LEN-200)endMission(true,'The C-130 made it home');
    return;
  }
  if(mission==='2V4'){if(!enemies.length)endMission(true,'All four bandits destroyed')}
  if(mission==='4SHIP'){if(!enemies.length)endMission(true,'All six bandits destroyed')}
  // ONLINE: free-for-all until you're shot down or abort
}
function die(cause){
  if(state!=='play')return; state='dead'; deathCause=cause; REC3.deathT=clock; if(mission==='ONLINE'&&NET.active)NET.deaths++; deadT=1.8; P.alive=false; missionDone=true; recEvent('You were '+({terrain:'killed hitting the ground',shot:'shot down by guns',missile:'killed by a missile',ejected:'out of the jet (ejected)',collision:'killed in a mid-air collision',landing:'killed crashing on landing',gearup:'killed landing gear-up',abort:'out (sortie aborted)',fuel:'down after running out of fuel'}[cause]||'down'));
  CM.flrHeld=CM.chfHeld=false; if(cause==='ejected'){deadT=7;playerJet.visible=false;$('ctrls').hidden=true;resetStick();gunHeld=false;brake=false;$('bEject').hidden=true;return}
  explode(P.pos,true); explode(P.pos.clone().addScaledVector(P.fwd,10),true);
  playerJet.visible=false; $('ctrls').hidden=true; resetStick(); gunHeld=false; brake=false;
}

/* ---------------- input ---------------- */
const stick={id:null,ox:0,oy:0,x:0,y:0};
const look={id:null,ox:0,oy:0,y0:0,p0:0,yaw:0,pitch:0};
const stickBase=$('stickBase'),stickKnob=$('stickKnob'),stickHint=$('stickHint');
function resetStick(){stick.id=null;stick.x=0;stick.y=0;stickBase.hidden=true;stickKnob.style.transform=''}
glCanvas.addEventListener('pointerdown',e=>{
  if(state!=='play')return;
  if(e.clientX>W*.62){ // right side of the screen: look around (cockpit head / chase orbit)
    if(look.id!==null)return; e.preventDefault();
    look.id=e.pointerId;look.ox=e.clientX;look.oy=e.clientY;look.y0=look.yaw;look.p0=look.pitch;
    try{glCanvas.setPointerCapture(e.pointerId)}catch(_){}
    return;
  }
  if(stick.id!==null)return;
  e.preventDefault(); audioInit();
  stick.id=e.pointerId;stick.ox=e.clientX;stick.oy=e.clientY;stick.x=0;stick.y=0;
  try{glCanvas.setPointerCapture(e.pointerId)}catch(_){}
  stickBase.style.left=stick.ox+'px';stickBase.style.top=stick.oy+'px';stickBase.hidden=false;stickHint.hidden=true;
});
glCanvas.addEventListener('pointermove',e=>{
  if(e.pointerId===look.id){
    look.yaw=clamp(look.y0-(e.clientX-look.ox)*.011,-2.6,2.6);
    look.pitch=clamp(look.p0-(e.clientY-look.oy)*.011,-.7,1.3);
    return;
  }
  if(e.pointerId!==stick.id)return;
  let dx=e.clientX-stick.ox,dy=e.clientY-stick.oy; const R=56,l=Math.hypot(dx,dy);
  if(l>R){dx*=R/l;dy*=R/l}
  stick.x=dx/R;stick.y=dy/R; stickKnob.style.transform=`translate(${dx}px,${dy}px)`;
});
['pointerup','pointercancel'].forEach(t=>glCanvas.addEventListener(t,e=>{if(e.pointerId===stick.id)resetStick();if(e.pointerId===look.id)look.id=null}));
function holdBtn(el,on,off){
  el.addEventListener('pointerdown',e=>{e.preventDefault();audioInit();try{el.setPointerCapture(e.pointerId)}catch(_){};el.classList.add('on');on()});
  ['pointerup','pointercancel','lostpointercapture'].forEach(t=>el.addEventListener(t,()=>{el.classList.remove('on');off&&off()}));
}
holdBtn($('bGun'),()=>gunHeld=true,()=>gunHeld=false);
// throttle slider
const thrEl=$('thr'),thrKnob=$('thrKnob'),thrFill=$('thrFill');
let thrId=null;
function setThr(v){
  v=clamp(v,0,1); if(Math.abs(v-.8)<.035)v=.8;        // MIL detent
  thrSet=v; const pct=Math.round(v*100);
  thrKnob.style.top=(100-v*100)+'%'; thrFill.style.height=(v*100)+'%';
  thrKnob.textContent=v>.8?'AB':v===.8?'MIL':v<.02?'IDLE':pct+'%';
  thrKnob.classList.toggle('ab',v>.8); thrEl.setAttribute('aria-valuenow',pct);
}
function thrFromY(y){const r=thrEl.getBoundingClientRect();setThr(1-(y-r.top)/r.height)}
thrEl.addEventListener('pointerdown',e=>{e.preventDefault();audioInit();thrId=e.pointerId;try{thrEl.setPointerCapture(e.pointerId)}catch(_){};thrFromY(e.clientY)});
thrEl.addEventListener('pointermove',e=>{if(e.pointerId===thrId)thrFromY(e.clientY)});
['pointerup','pointercancel'].forEach(t=>thrEl.addEventListener(t,e=>{if(e.pointerId===thrId)thrId=null}));
thrEl.addEventListener('keydown',e=>{if(e.code==='ArrowUp'){setThr(thrSet+.05);e.preventDefault()}if(e.code==='ArrowDown'){setThr(thrSet-.05);e.preventDefault()}});
setThr(.8);
let lookHinted=false;
function cycleView(){view=(view+1)%VIEWS.length;flyCamSet=false;camSnap=true;look.yaw=look.pitch=0;
  if(VIEWS[view]==='COCKPIT'&&!lookHinted){lookHinted=true;message('DRAG RIGHT SIDE TO LOOK AROUND',2.4)} else message(VIEWS[view]+' VIEW',1)}
$('bCam').addEventListener('click',cycleView);
holdBtn($('bBrake'),()=>brake=true,()=>brake=false);
holdBtn($('b9'),()=>fire9=true);
holdBtn($('b120'),()=>fire120=true);
$('bPause').addEventListener('click',()=>pause());
addEventListener('keydown',e=>{
  keys[e.code]=true; audioInit();
  if(state==='play'){
    if(e.code==='Space'){gunHeld=true;e.preventDefault()}
    if(e.code==='KeyF')fire9=true;
    if(e.code==='KeyR')fire120=true;
    if(e.code==='KeyB')brake=true;
    if(e.code==='KeyV')cycleView();
    if(e.code==='KeyL'&&!e.repeat)$('bGear').click();
    if(e.code==='KeyT')quickLock();
    if(e.code==='KeyY')stepTarget();
    if(e.code==='KeyG')$('rAcm').click();
    if(e.code==='KeyM')$('rMode').click();
    if(e.code==='BracketRight')$('rUp').click();
    if(e.code==='BracketLeft')$('rDn').click();
    if(e.code==='KeyX')$('bRdr').click();
    if(e.code==='KeyZ'&&!CM.flrHeld){CM.flrHeld=true;CM.flrT=0}
    if(e.code==='KeyC'&&!CM.chfHeld){CM.chfHeld=true;CM.chfT=0}
    if(e.code==='KeyJ')toggleECM();
    if(e.code==='KeyK')deployDecoy();
    if(e.code==='KeyH')agRelease();
    if(e.code==='KeyN')agNext();
    if(e.code==='KeyU')$('cAuto').click();
    if(e.code==='KeyP'||e.code==='Escape')pause();
  } else if(state==='paused'&&(e.code==='KeyP'||e.code==='Escape')) resume();
});
addEventListener('keyup',e=>{
  keys[e.code]=false;
  if(e.code==='Space')gunHeld=false;
  if(e.code==='KeyB')brake=false;
  if(e.code==='KeyZ')CM.flrHeld=false;
  if(e.code==='KeyC')CM.chfHeld=false;
});
addEventListener('blur',()=>{for(const k in keys)keys[k]=false;gunHeld=false;brake=false});
document.addEventListener('visibilitychange',()=>{if(document.hidden&&state==='play')pause()});

/* ---------------- overlay ---------------- */
function setInvertLabel(){$('bInvert').textContent=invert?'Stick: push up to climb':'Stick: pull back to climb'}
function setSoundLabel(){$('bSound').textContent='Sound: '+(A.on?'on':'off')}
setInvertLabel();setSoundLabel();
$('bInvert').addEventListener('click',()=>{invert=!invert;setInvertLabel();try{localStorage.setItem('viperInvert',invert?'1':'0')}catch(e){}});
$('bLoad').addEventListener('click',()=>{cmLoad=(cmLoad+1)%CM_LOADS.length;setLoadLabel();
  try{localStorage.setItem('viperCmLoad',cmLoad)}catch(e){}});
$('bSound').addEventListener('click',()=>{A.on=!A.on;setSoundLabel();if(A.master)A.master.gain.value=A.on?.55:0});
$('bStart').addEventListener('click',()=>{audioInit();if(state==='paused')resume();else startGame()});
$('bQuit').addEventListener('click',()=>{state='play';die('abort');deadT=0.01});
function showOverlay(kind){
  const ov=$('ov'); if(!kind){ov.hidden=true;return}
  ov.hidden=false; $('bReplay').hidden=true; $('bPhoto').hidden=true; $('campBox').hidden=mission!=='CAMPAIGN'||kind==='pause'; if(mission==='CAMPAIGN')renderCamp(); $('lobby').hidden=!(mission==='ONLINE'&&kind!=='pause'); if(mission==='ONLINE')renderRoster();
  const stats=$('ovStats'),keysEl=$('ovKeys');
  if(kind==='pause'){
    $('ovEyebrow').textContent='Holding pattern';$('ovTitle').textContent='Paused';
    $('ovLede').textContent=MISSIONS[mission]+' in progress: '+missionStatus().toLowerCase()+'. Everything holds until you resume.';
    stats.hidden=true;keysEl.hidden=false;$('debrief').hidden=true;$('bStart').textContent='Resume';$('bQuit').hidden=false;$('bAC').hidden=true;$('bPhoto').hidden=false;$('bReplay').hidden=!canReplay(true);$('bReplay').textContent='Replay last kill';
  } else {
    const causes={ejected:'Ejected',landing:'Crashed on landing',gearup:'Landed with the gear up',terrain:'Controlled flight into terrain',shot:'Shot down by guns',missile:'Killed by a missile',collision:'Mid-air collision',abort:'Sortie aborted'};
    const win=deathCause==='win', fail=deathCause==='fail';
    $('ovEyebrow').textContent=win||fail?MISSIONS[mission]+' · '+missionText:(causes[deathCause]||'Sortie over');
    $('ovTitle').textContent=win?'Mission Complete':fail?'Mission Failed':deathCause==='abort'?'Sortie Aborted':deathCause==='ejected'?(P.rescued?'Rescued':'Captured'):'Shot Down';
    $('ovLede').textContent=win?'Good work. Scrub the replay below to see how each missile did.':fail?'The replay below shows where it went wrong.':'Watch the replay: every missile shot and why it hit or missed is listed below.';
    if(campNote)$('ovLede').textContent=campNote+' '+$('ovLede').textContent;
    if(lastAward&&lastAward.daily&&lastAward.daily.length)$('ovLede').textContent='Daily task done: '+lastAward.daily.join(', ')+'. '+$('ovLede').textContent;
    if(deathCause==='ejected'&&P.rescueText)$('ovLede').textContent=P.rescueText+'. '+(P.rescued?'You live to fly again; your career record keeps the streak.':'');
    stats.innerHTML=`<div class="stat"><span>Score</span><b>${score}</b></div><div class="stat"><span>${mission==='WAVES'?'Wave':'Time'}</span><b>${mission==='WAVES'?wave:fmtT(missionT)}</b></div><div class="stat"><span>Kills</span><b>${kills}</b></div><div class="stat"><span>Max G</span><b>${P.maxG.toFixed(1)}</b></div><div class="stat"><span>Best</span><b>${best}</b></div>`;
    const rew=$('ovRew');rew.innerHTML='';
    if(lastAward){const d=document.createElement('div');d.className='stat';d.innerHTML='<span>XP</span><b></b>';d.querySelector('b').textContent='+'+lastAward.xp.toLocaleString();rew.appendChild(d);
      if(lastAward.prog){const g=lastAward.prog;for(const [l,v] of [['Silver Lions','+'+g.sl.toLocaleString()],['Repair',g.rep?'−'+g.rep.toLocaleString():'none'],['Free RP','+'+g.fr.toLocaleString()]]){const e=document.createElement('div');e.className='stat';e.innerHTML='<span></span><b></b>';e.children[0].textContent=l;e.children[1].textContent=v;rew.appendChild(e)}}
      if(lastAward.promoted)$('ovLede').textContent='Promoted to '+lastAward.promoted+'!'+(lastAward.newJets.length?' Unlocked: '+lastAward.newJets.join(', ')+'.':'')+' '+$('ovLede').textContent}
    stats.hidden=false;keysEl.hidden=true;$('bStart').textContent='Fly again';$('bReplay').hidden=!canReplay(false);$('bReplay').textContent='Watch replay';$('debrief').hidden=false;openDebrief();$('bQuit').hidden=true;$('bAC').hidden=false;
  }
}
// top-down replay
let dbT=1,dbPlaying=false,dbBounds=null,dbRaf=0;
function openDebrief(){
  const F=REC.frames; dbBounds=null;
  if(F.length){let x0=1e9,x1=-1e9,z0=1e9,z1=-1e9;
    const ext=(x,z)=>{x0=Math.min(x0,x);x1=Math.max(x1,x);z0=Math.min(z0,z);z1=Math.max(z1,z)};
    for(const f of F){if(f.p)ext(f.p[0],f.p[1]);for(const e of f.e)ext(e[1],e[2]);for(const e of f.f)ext(e[1],e[2])}
    const pad=Math.max(2000,(Math.max(x1-x0,z1-z0))*.08);dbBounds={x0:x0-pad,x1:x1+pad,z0:z0-pad,z1:z1+pad}}
  const list=$('dbList'); list.innerHTML='';
  const ms=[...REC.msl.values()];
  if(!ms.length){const li=document.createElement('li');li.textContent='No missiles fired this sortie.';list.appendChild(li)}
  for(const r of ms){const li=document.createElement('li');li.className=r.res==='HIT'?'hit':r.res?'miss':'';
    li.textContent=`${fmtT(r.t)} ${r.who} · ${r.name} → ${r.target}: ${r.res==='HIT'?'HIT':r.res?'MISS, '+r.why.toLowerCase():'in flight when the sortie ended'}`;list.appendChild(li)}
  dbT=1;dbPlaying=false;$('dbPlay').textContent='Play';$('dbSlider').value=1000;drawDebrief();
}
function drawDebrief(){
  const cv=$('dbCanvas'),r=cv.getBoundingClientRect(); if(!r.width)return;
  cv.width=r.width*DPR;cv.height=r.height*DPR;const c=cv.getContext('2d');c.setTransform(DPR,0,0,DPR,0,0);
  const w=r.width,h=r.height;c.fillStyle='#06100c';c.fillRect(0,0,w,h);
  const F=REC.frames;if(!F.length||!dbBounds){$('dbTime').textContent='0:00';return}
  const b=dbBounds,sc=Math.min(w/(b.x1-b.x0),h/(b.z1-b.z0)),ox=(w-(b.x1-b.x0)*sc)/2,oy=(h-(b.z1-b.z0)*sc)/2;
  const X=x=>ox+(b.x1-x)*sc, Y=z=>h-(oy+(z-b.z0)*sc);   // north (+z) up, east (−x) right
  c.strokeStyle='rgba(125,255,154,.08)';c.lineWidth=1;const step=10000;
  for(let x=Math.ceil(b.x0/step)*step;x<b.x1;x+=step){c.beginPath();c.moveTo(X(x),0);c.lineTo(X(x),h);c.stroke()}
  for(let z=Math.ceil(b.z0/step)*step;z<b.z1;z+=step){c.beginPath();c.moveTo(0,Y(z));c.lineTo(w,Y(z));c.stroke()}
  c.fillStyle='rgba(125,255,154,.35)';c.font=`10px ${FONT}`;c.fillText('10 km grid',6,h-6);
  const idx=Math.min(F.length-1,Math.round(dbT*(F.length-1))), tNow=F[idx].t;
  const trails=new Map();
  for(let i=0;i<=idx;i++){const f=F[i];
    const add=(k,x,z,col)=>{if(!trails.has(k))trails.set(k,{col,pts:[]});trails.get(k).pts.push([X(x),Y(z)])};
    if(f.p)add('p',f.p[0],f.p[1],'#7dff9a');for(const e of f.e)add('e'+e[0],e[1],e[2],'#ff5a4e');for(const e of f.f)add('f'+e[0],e[1],e[2],'#6fb7ff');
    for(const m of f.m)add('m'+m[0],m[1],m[2],m[3]==='red'?'rgba(255,180,170,.7)':'rgba(220,255,230,.7)')}
  for(const [k,tr] of trails){c.strokeStyle=tr.col;c.globalAlpha=k[0]==='m'?.6:.55;c.lineWidth=k[0]==='m'?1:1.6;c.beginPath();
    tr.pts.forEach((p,i)=>i?c.lineTo(p[0],p[1]):c.moveTo(p[0],p[1]));c.stroke()}
  c.globalAlpha=1;const f=F[idx];
  const dot=(x,z,col,rad)=>{c.fillStyle=col;c.beginPath();c.arc(X(x),Y(z),rad,0,Math.PI*2);c.fill()};
  if(f.p)dot(f.p[0],f.p[1],'#7dff9a',4);for(const e of f.e)dot(e[1],e[2],'#ff5a4e',e[3]==='fighter'?3.5:5);for(const e of f.f)dot(e[1],e[2],'#6fb7ff',e[3]==='fighter'?3.5:5);
  for(const m of f.m)dot(m[1],m[2],'#ffffff',1.8);
  const ev=REC.events.filter(e=>e.t<=tNow).slice(-2);c.fillStyle='rgba(232,240,234,.85)';c.font=`11px ${FONT}`;
  ev.forEach((e,i)=>c.fillText(fmtT(e.t)+' '+e.text.slice(0,Math.floor(w/6.6)),6,14+i*14));
  $('dbTime').textContent=fmtT(tNow);
}
function dbLoop(){if(!dbPlaying)return;const F=REC.frames;const n=Math.max(1,F.length-1);dbT=Math.min(1,dbT+4/(n)); $('dbSlider').value=Math.round(dbT*1000);drawDebrief();
  if(dbT>=1){dbPlaying=false;$('dbPlay').textContent='Play';return}dbRaf=requestAnimationFrame(dbLoop)}
$('dbPlay').addEventListener('click',()=>{dbPlaying=!dbPlaying;$('dbPlay').textContent=dbPlaying?'Pause':'Play';if(dbPlaying){if(dbT>=1)dbT=0;dbLoop()}});
$('dbSlider').addEventListener('input',e=>{dbT=e.target.value/1000;dbPlaying=false;$('dbPlay').textContent='Play';drawDebrief()});
function pause(){if(state!=='play')return;state='paused';gunHeld=false;brake=false;resetStick();$('ctrls').hidden=true;showOverlay('pause')}
function resume(){recenterTilt();state='play';showOverlay(null);$('ctrls').hidden=false;last=performance.now()}

// Adaptive quality: if play stays under ~35 fps for ~3 s, step the graphics tier down once (not saved as the user's preference).
let aqAvg=16,aqSlow=0,aqCool=0;
const NO_AQ=/[?&]noaq\b/.test(location.search);   // dev/screenshots: keep the chosen quality
function autoQuality(ms){
  if(NO_AQ)return;
  if(state!=='play'||!(ms>0)||ms>250){aqSlow=0;return}   // ignore pauses and tab switches
  aqAvg+=(ms-aqAvg)*.05; aqCool=Math.max(0,aqCool-ms);
  if(aqAvg>28.5&&aqCool<=0){aqSlow+=ms;if(aqSlow>3000){const k=Object.keys(QUALS),i=k.indexOf(quality);aqSlow=0;aqCool=20000;if(i>0){setQuality(k[i-1],true);aqAvg=16;message('GRAPHICS LOWERED FOR FRAME RATE',2.5)}}}
  else aqSlow=0;
}
function setQuality(q,auto){quality=q;if(!auto)try{localStorage.setItem('viperQuality',q)}catch(e){}
  DPR=Math.min(window.devicePixelRatio||1,QUALS[q].dpr); renderer.setPixelRatio(DPR);
  terrain.geometry.dispose(); terrain.geometry=buildTerrainGeo(QUALS[q].seg); tGeo=terrain.geometry; tCx=NaN; applyCloudCount(); resize();
  $('bQual').textContent='Graphics: '+({LOW:'Low',MED:'Medium',HIGH:'High'})[q]; setShadows(q==='HIGH')}
/* ---------------- resize ---------------- */
let W=1,H=1,INS={t:0,r:0,b:0,l:0};
// cockpit uses a tighter field of view and a raised eye point so the HUD and the panel both fit
let projKey='';
function applyProj(){
  // HG.on shifts the jet left of the editor panel; HG.bg parks it right of the menu's aircraft card
  const pit=VIEWS[view]==='COCKPIT', key=pit+'|'+W+'|'+H+'|'+HG.on+'|'+HG.bg; if(key===projKey)return; projKey=key;
  const fov=pit?(W<H?74:58):(W<H?86:66);
  for(const cam of [camera,cockCam]){cam.fov=fov;cam.aspect=W/H;if(pit)cam.setViewOffset(W,H,0,H*(W<H?.07:.16),W,H);else if(HG.on)cam.setViewOffset(W,H,W<H?0:W*.2,W<H?H*.2:0,W,H);else if(HG.bg)cam.setViewOffset(W,H,W<H?0:-W*.14,W<H?-H*.06:0,W,H);else cam.clearViewOffset();cam.updateProjectionMatrix()}
  pMat.uniforms.scale.value=H*DPR/2/Math.tan(fov*Math.PI/360);
}
function resize(){
  W=innerWidth;H=innerHeight;renderer.setSize(W,H,false);
  projKey='';applyProj();
  hud.width=W*DPR;hud.height=H*DPR;hctx.setTransform(DPR,0,0,DPR,0,0);
  const cs=getComputedStyle($('safe'));
  INS={t:parseFloat(cs.paddingTop)||0,r:parseFloat(cs.paddingRight)||0,b:parseFloat(cs.paddingBottom)||0,l:parseFloat(cs.paddingLeft)||0};
}
addEventListener('resize',resize);resize();

/* ---------------- player ---------------- */
const _a=new V3(),_b=new V3(),_c=new V3(),_d=new V3(),_e=new V3();
function distSeg(p,a,b){_a.subVectors(b,a);const l2=_a.lengthSq();let t=l2>0?_b.subVectors(p,a).dot(_a)/l2:0;t=clamp(t,0,1);_c.copy(a).addScaledVector(_a,t);return _c.distanceTo(p)}
// stick shaping: dead zone, then a blend of linear and squared response; sensitivity scales the result
var SENS={Low:.7,Normal:1,High:1.3}, DZS=[0,.05,.1,.15];
var sens='Normal', dz=1; try{sens=localStorage.getItem('vsSens')||'Normal';dz=+(localStorage.getItem('vsDz')??1)}catch(e){}
const shape=v=>{const d=DZS[dz]||0,a=Math.abs(v);if(a<d)return 0;const u=Math.sign(v)*(a-d)/(1-d);return clamp((u*Math.abs(u)*.6+u*.4)*SENS[sens],-1,1)};
/* gamepad (standard mapping): left stick fly, right stick look, RT gun, A short-range, B long-range, X lock, Y view,
   LB flares, RB chaff, LT air-to-ground, D-pad up/down throttle, D-pad left TGP, right wing command, Back radar, Start pause, L3 ECM */
const GP={on:false,x:0,y:0,lx:0,ly:0,prev:[],name:''};
function pollGamepad(dt){let pads=[];try{pads=navigator.getGamepads?navigator.getGamepads():[]}catch(e){}
  const g=[...pads].find(p=>p&&p.connected); if(!g){if(GP.on){GP.on=false;message('CONTROLLER DISCONNECTED',1.2)}GP.x=GP.y=0;return}
  if(!GP.on){GP.on=true;GP.name=g.id;message('CONTROLLER CONNECTED',1.4)}
  const ax=i=>Math.abs(g.axes[i]||0)<.08?0:g.axes[i];
  GP.x=ax(0);GP.y=ax(1);GP.lx=ax(2);GP.ly=ax(3);
  const b=i=>!!(g.buttons[i]&&g.buttons[i].pressed), edge=i=>b(i)&&!GP.prev[i];
  if(b(7))gunHeld=true; else if(GP.prev[7])gunHeld=false;
  if(edge(0))fire9=true; if(edge(1))fire120=true; if(edge(2))quickLock(); if(edge(3))cycleView();
  if(edge(4)){CM.flrHeld=true;CM.flrT=0} if(GP.prev[4]&&!b(4))CM.flrHeld=false;
  if(edge(5)){CM.chfHeld=true;CM.chfT=0} if(GP.prev[5]&&!b(5))CM.chfHeld=false;
  if(edge(6))agRelease(); if(b(12))setThr(thrSet+.5*dt); if(b(13))setThr(thrSet-.5*dt);
  if(edge(14))$('cTgp').click(); if(edge(15))wingCmd(); if(edge(8))$('bRdr').click(); if(edge(9))(state==='play'?pause():state==='paused'?resume():0); if(edge(10))toggleECM();
  if(state==='play'&&(GP.lx||GP.ly)){look.yaw=clamp(look.yaw-GP.lx*2.2*dt,-2.6,2.6);look.pitch=clamp(look.pitch-GP.ly*1.6*dt,-.6,1.2)}
  GP.prev=g.buttons.map(x=>x.pressed)}
const qTmp=new THREE.Quaternion();

/* ---------------- fuel and system damage ---------------- */
// fuel: thrust × specific fuel consumption; jet gets lighter as it burns. Starts at 75 % of internal.
function resetSystems(){P.sys={eng:Array(AC.engines).fill(0),fireT:Array(AC.engines).fill(0),hyd:false,radar:false,leak:false};P.thrK=1;P.rollK=1;P.gLim=AC.gmax;P.bingo=false;P.lowFuel=false}
function refuel(){P.fuel=Math.max(P.fuel||0,.75*AC.fuelCap);resetSystems();P.bingo=false;P.lowFuel=false}
const fuelStr=kg=>AC.fuelUnit==='LB'?Math.round(kg*2.2046/10)*10+' LB':Math.round(kg/10)*10+' KG';
const ENG_NAME=i=>AC.engines>1?(i===0?'LEFT ':'RIGHT '):'';
function damageSystem(n){
  n*=PRESETS[preset].dmg;n=Math.floor(n)+(Math.random()<n%1?1:0);   // preset scales how many systems a hit takes out
  for(let i=0;i<n;i++){const r=Math.random();
    if(r<.32){const ok=P.sys.eng.map((v,j)=>v===0?j:-1).filter(j=>j>=0);if(ok.length){const j=ok[Math.random()*ok.length|0];P.sys.eng[j]=1;P.sys.fireT[j]=7;message(ENG_NAME(j)+'ENGINE FIRE',1.8);recEvent(ENG_NAME(j).toLowerCase()+'engine fire');buzz([200,80,200])}}
    else if(r<.52){if(!P.sys.hyd){P.sys.hyd=true;message('HYDRAULICS FAILED · G AND ROLL LIMITED',1.8);recEvent('Hydraulics failed')}}
    else if(r<.72){if(!P.sys.radar){P.sys.radar=true;if(R.stt&&R.sttSrc==='RDR')breakLock();R.tracks.clear();message('RADAR FAILED',1.6);recEvent('Radar failed')}}
    else if(r<.9){if(!P.sys.leak){P.sys.leak=true;message('FUEL LEAK',1.6);recEvent('Fuel leak')}}
  }
}
function updateSystems(dt,auto){
  const sy=P.sys; let k=0;
  for(let i=0;i<sy.eng.length;i++){
    if(sy.eng[i]===1){sy.fireT[i]-=dt; if(Math.random()<.6)puff(P.pos.x,P.pos.y,P.pos.z,P.vel.x*.2,P.vel.y*.2,P.vel.z*.2,.15,.15,.15,.7,4,10,2.5);
      if(sy.fireT[i]<=0){sy.eng[i]=2;message(ENG_NAME(i)+'ENGINE FAILED',2);recEvent(ENG_NAME(i).toLowerCase()+'engine failed')}}
    k+=sy.eng[i]===0?1:sy.eng[i]===1?.7:0;
  }
  k/=sy.eng.length;
  if(P.fuel<=0)k=0;
  P.thrK=k; P.rollK=sy.hyd?.45:1; P.gLim=sy.hyd?Math.min(5,AC.gmax):AC.gmax;
  if(!auto){
    const sfc=throttle<=.8?AC.sfcDry:AC.sfcDry+(AC.sfcAB-AC.sfcDry)*(throttle-.8)/.2;
    P.fuelFlow=(P.lastT||0)*sfc*2.832e-5;                      // kg/s
    P.fuel=Math.max(0,P.fuel-P.fuelFlow*dt-(sy.leak?3:0)*dt);
    if(!P.bingo&&P.fuel<.25*AC.fuelCap){P.bingo=true;message('BINGO FUEL',2);buzz([60,60,60])}
    if(P.fuel>0)P.flamedOut=false;
    if(!P.lowFuel&&P.fuel<.1*AC.fuelCap){P.lowFuel=true;message('FUEL LOW',2)}
    if(P.fuel<=0&&!P.flamedOut){P.flamedOut=true;message('FLAMEOUT · OUT OF FUEL',2.4);recEvent('Ran out of fuel')}
  }
  P.mass=AC.MASS+(P.fuel-.6*AC.fuelCap)-(P.jettKg||0);
}
function updatePlayer(dt,auto){
  axes(P);
  let rollIn=0,pitchIn=0,yawIn=0;
  const bank=bankOf(P);
  if(auto){
    rollIn=clamp((.4-bank)*2,-1,1);
    const nNeed=1/Math.max(.3,Math.cos(bank))+(4000-P.pos.y)*.0008-P.vel.y*.02;
    pitchIn=nNeed>=1?(nNeed-1)/(G_MAX-1):(nNeed-1)/4;
    throttle=.8;
  } else {
    const kx=(keys.KeyD||keys.ArrowRight?1:0)-(keys.KeyA||keys.ArrowLeft?1:0);
    const ky=(keys.KeyS||keys.ArrowDown?1:0)-(keys.KeyW||keys.ArrowUp?1:0);
    const tx=tilt.on&&stick.id===null?tilt.x:0, ty=tilt.on&&stick.id===null?tilt.y:0;
    rollIn=clamp(shape(stick.x)+kx+tx+shape(GP.x),-1,1);
    const sy=clamp(shape(stick.y)+ky+ty-shape(GP.y)*-1,-1,1); pitchIn=invert?-sy:sy;
    yawIn=(keys.KeyE?1:0)-(keys.KeyQ?1:0);
    // keyboard throttle: Shift/= up, Ctrl/- down
    if(keys.ShiftLeft||keys.ShiftRight||keys.Equal)setThr(thrSet+.5*dt);
    if(keys.ControlLeft||keys.ControlRight||keys.Minus)setThr(thrSet-.5*dt);
    // engine spool: ~3 s idle→MIL, afterburner lights faster
    let cmd=thrSet;
    // G-LOC: pilot is out, hands off the stick
    if(P.gloc>0){rollIn=0;pitchIn=0;yawIn=0}
    // Auto-GCAS: predicts ground impact, rolls wings level and pulls 5 g
    const gh=Math.max(groundH(P.pos.x,P.pos.z),0), agl=P.pos.y-gh;
    const ahead=Math.max(groundH(P.pos.x+P.vel.x*3,P.pos.z+P.vel.z*3),0);
    /* Only the F-16s carry it (fielded on the F-16 in 2014). Like the real one it waits until the last moment a
       roll-level + 5 g pull still clears the ground, then gives the jet back as soon as the flight path is safe.
       Pulling harder than it does yourself overrides its pitch. */
    if(AC.id.startsWith('F16')&&!P.gear&&!P.onGround&&P.alive){
      const v=Math.max(60,P.vel.length()), gam=Math.asin(clamp(P.vel.y/v,-1,1));
      const ahead2=Math.max(groundH(P.pos.x+P.vel.x*2,P.pos.z+P.vel.z*2),0), clr=Math.min(agl,P.pos.y-Math.max(ahead,ahead2));
      const tRoll=.4+Math.abs(bank)/(AC.roll||4), sink=Math.max(0,-P.vel.y);
      const need=sink*tRoll+(gam<0?v*v/(G*4)*(1-Math.cos(gam)):0)+40;
      if(!P.gcas&&((P.vel.y<-1&&clr<need)||(P.pos.y+P.vel.y*2-ahead2)<12)){P.gcas=true;message('AUTO GCAS',1.2)}
      if(P.gcas&&P.vel.y>=1&&clr>40)P.gcas=false;
    } else P.gcas=false;
    if(P.gcas){
      rollIn=clamp(-bank*2.5,-1,1);
      pitchIn=Math.max(pitchIn,Math.abs(bank)<.8?(5-1)/(G_MAX-1):0);
      cmd=Math.max(cmd,.8);
    }
    const rate=cmd>throttle?(throttle>=.8?1.5:.3):.45;
    throttle+=clamp(cmd-throttle,-rate*dt,rate*dt);
  }
  updateSystems(dt,auto);
  P.inRoll=rollIn; P.inPitch=clamp(pitchIn,-1,1);
  if(P.onGround&&!auto)(P.onDeck?deckRoll:groundRoll)(dt,rollIn,clamp(pitchIn,-1,1)); else fly(P,dt,rollIn,clamp(pitchIn,-1,1),yawIn,throttle,brake);
  if(P.pos.y>18000){P.pos.y=18000;if(P.vel.y>0)P.vel.y=0}
  // own angular velocity (for the gunsight)
  qTmp.copy(qPrev).invert().premultiply(playerJet.quaternion);
  if(qTmp.w<0){qTmp.x*=-1;qTmp.y*=-1;qTmp.z*=-1;qTmp.w*=-1}
  const ang=2*Math.acos(clamp(qTmp.w,-1,1)), sn=Math.sqrt(1-qTmp.w*qTmp.w);
  if(sn>1e-6&&dt>0)_e.set(qTmp.x/sn,qTmp.y/sn,qTmp.z/sn).multiplyScalar(ang/dt); else _e.set(0,0,0);
  omega.lerp(_e,.25); qPrev.copy(playerJet.quaternion);
  // pilot g tolerance
  if(!auto){
    P.maxG=Math.max(P.maxG,P.n);
    const over=Math.max(0,P.n-6-.25*crewLvl('g')), under=Math.max(0,-P.n-2);
    if(over>0||under>0)P.gStress+=(Math.pow(over,1.6)*.035+under*.08)*dt; else if(P.n<4.5)P.gStress=Math.max(0,P.gStress-.3*dt);
    if(P.gloc>0){P.gloc-=dt;if(P.gloc<=0)P.gStress=.6}
    else if(P.gStress>=1){P.gloc=5;message('G-LOC',2)}
  }
  const ab=throttle>.81, fw=ab?1.1:.45+throttle*.55; setAB(playerJet,ab); setAB(outside,ab); pFlame.scale.set(fw,fw,ab?.8+(throttle-.8)*5*(1+Math.random()*.25):.1+throttle*.55);
  if(ab&&state==='play'){_d.copy(P.pos).addScaledVector(P.fwd,-8.5);puff(_d.x,_d.y,_d.z,0,0,0,1,.6,.25,.6,1.8,5,.16)}
  if(!auto&&!P.onGround&&state==='play'&&!cvContact()){if(!checkTouchdown()){const gh=Math.max(groundH(P.pos.x,P.pos.z),0);if(P.pos.y<gh+1.2)die('terrain')}}
}

