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
let REDUCED=!!(window.matchMedia&&matchMedia('(prefers-reduced-motion:reduce)').matches);
try{const v=localStorage.getItem('vsReduce');if(v==='1')REDUCED=true;else if(v==='0')REDUCED=false}catch(e){}
function setReduced(v){REDUCED=!!v;try{localStorage.setItem('vsReduce',v?'1':'0')}catch(e){}}
const srLive=document.getElementById('srLive');
// kill feed (War Thunder style): short lines in the top-right corner that fade after a few seconds; kind picks the colour
const FEED=[], FEED_LIFE=7;
function feed(text,kind){FEED.push({t:clock,text,kind:kind||(/^You (killed|destroyed)/.test(text)?'kill':/^(Wingman|Your wingman|The C-130)/.test(text)?'loss':'info')});while(FEED.length>6)FEED.shift()}
/* War Thunder style scoring events: lines fade over a few seconds under the sight; hits coalesce, kills chain into multi-kill bonuses */
const SC={list:[],streak:0,lastKill:-99};
function scEvent(text,pts,col,key){
  if(srLive&&(col==='kill'||col==='crit'))srLive.textContent=text;   // screen readers hear kills and critical hits
  if(pts)score+=pts;if(col==='crit'&&key!=='ghit')sndCrit();
  const f=key&&SC.list.find(x=>x.key===key&&clock-x.t<1.6);
  if(f){f.n++;f.pts+=pts;f.t=clock;f.text=text+' ×'+f.n}
  else{SC.list.push({text,pts,col:col||'',key:key||'',n:1,t:clock});while(SC.list.length>5)SC.list.shift()}
}
function scKill(label,pts,assistOK){
  const chain=clock-SC.lastKill<25?SC.streak+1:1;SC.streak=chain;SC.lastKill=clock;
  scEvent(label,pts,'kill');sndKill();
  if(chain>1){const nm=['','','DOUBLE KILL','TRIPLE KILL','QUADRUPLE KILL'][chain]||'MULTI KILL ×'+chain;scEvent(nm,40*chain,'bonus')}
}
function message(t,dur){msgText=t;msgT=dur||1.6;if(srLive&&srLive.textContent!==t)srLive.textContent=t}   // mirrored to a screen-reader live region

function rearm(){
  P.aim9=AC.srN;P.aim120=AC.mrN;P.rounds=AC.gunRounds;
  if(typeof cmFlares==='function'){CM.flares=cmFlares();CM.chaff=cmChaff();CM.decoys=Math.max(0,AC.cm.decoys-(CM.decoy?1:0));syncCM()}
  playerJet.traverse(o=>{const m=/^r(9|120)_(\d+)/.exec(o.name);if(m)o.visible=+m[2]<(m[1]==='9'?AC.srN:AC.mrN)});
  P.tanksGone=false; P.jettKg=0; if(typeof agReset==='function')agReset(); const cj=$('cJett'); if(cj)cj.hidden=!(AC.tanks>0); if(typeof setGear==='function')setGear(!!P.gear);
}
function resetPlayer(){
  P.pos.set(0,4000,0); playerJet.quaternion.identity(); playerJet.visible=true;
  P.vel.set(0,0,230); P.onGround=false; P.onDeck=false; P.ejected=null; P.jetGhost=null; P.rescued=false; if(chute)chute.visible=false; P.scramble=false; P.stopT=0; if(typeof setGear==='function')setGear(false); P.n=1; P.hp=100; P.flaps=0; P.spin=0; P.fuel=.75*(AC.intFuel||AC.fuelCap)+(AC.tankFuel||0); P.flamedOut=false; resetSystems(); P.gStress=0; P.gloc=0; P.gcas=false; P.maxG=1; axes(P); qPrev.copy(playerJet.quaternion); omega.set(0,0,0);
  rearm(); throttle=.8; setThr(.8);
}
const isBT=()=>mission==='BATTLE'||mission==='COMBINED'||mission==='NAVAL'||mission==='ASSAULT'||(mission==='ONLINE'&&BT.online);
let friends=[], mission='WAVES', banditType='F16', missionT=0, missionDone=false, spawnQ=[];
try{mission=localStorage.getItem('viperMission')||'WAVES';banditType=localStorage.getItem('viperBandit')||'F16'}catch(e){}
const RUSH_KILLS=8, RUSH_TIME=300;   // time-attack: bandits keep arriving, four at a time
const MISSIONS={WAVES:'Waves',STRIKE:'Strike / SEAD',INTERCEPT:'Intercept bombers',RUSH:'Bandit rush (8 in 5 min)',ESCORT:'Escort the C-130','2V4':'2 v 4 with wingman','4SHIP':'4-ship vs 6',CONVOY:'Convoy attack',GROUNDWAR:'Ground war (CAS)',BATTLE:'Air battle (domination)',COMBINED:'Combined arms battle',NAVAL:'Naval battle',ASSAULT:'Air assault (defend the base)',ANTISHIP:'Anti-ship strike',CRUISE:'Cruise missile defence',CAMPAIGN:'Campaign',ONLINE:'Online dogfight',TRAINING:'Training'};
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
  for(const d of DEBRIS)scene.remove(d.m);DEBRIS.length=0; clearGround(); tankerStop(); clearWrecks(); clearIsles(); if(KC.t>0)endKillCam();
  for(const e of enemies)scene.remove(e.obj); for(const f of friends)scene.remove(f.obj);
  enemies=[];friends=[];spawnQ=[];[...pBullets,...eBullets,...missiles,...eMissiles].forEach(kill);
}
let gunShots=0,gunHits=0;
function startGame(){sortieGround=0;btRestoreConditions();BT.on=false;BT.online=false;hideBtPick();TMAP.z=0;SC.list.length=0;SC.streak=0;SC.lastKill=-99;
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
  J35F:'J 35F Draken',A10C:'A-10C',J10A:'J-10A',JH7A:'JH-7A',MIG27M:'MiG-27M',SU24M:'Su-24M',AJS37:'AJS 37 Viggen',JA37DI:'JA 37DI Viggen',JA37:'JA 37 Viggen',LIGHTNING:'Lightning F.6',PHANTOM2:'Phantom FGR.2',TORNADO3:'Tornado F.3',J7G:'J-7G',F5E:'F-5E',F14B:'F-14B',MIG23ML:'MiG-23ML',MIG25PD:'MiG-25PD',J8F:'J-8F',F8E:'F-8E Crusader',F100D:'F-100D Super Sabre',MIG19PT:'MiG-19PT',MIG21F13:'MiG-21F-13',HUNTER:'Hunter F.6',MIRAGE3C:'Mirage IIIC',F4C:'F-4C Phantom II',F5A:'F-5A',J35D:'J 35D Draken',J29F:'J 29F Tunnan',J6A:'J-6A',MIG21MF:'MiG-21MF',A10A:'A-10A Thunderbolt II',SU25:'Su-25',A7E:'A-7E Corsair II',A4E:'A-4E Skyhawk',SU22M3:'Su-22M3',ALPHAJET:'Alpha Jet A',G91Y:'G.91Y',JAGUAR:'Jaguar GR.1',Q5A:'Q-5A',AMX:'AMX',F104S:'F-104S',TORNADOIT:'Tornado IDS',MIRAGEF1:'Mirage F1C',M2000:'Mirage 2000-5F',J11B:'J-11B',J15:'J-15',J16:'J-16'});
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
  if(mission==='BATTLE'){setupBattle();return}
  if(mission==='NAVAL'){setupNaval();return}
  if(mission==='ASSAULT'){setupAssault();return}
  if(mission==='COMBINED'){setupGroundWar();const c=sortie.center.clone();setupBattle();BT.ground=true;BT.zones[0].x=c.x;BT.zones[0].z=c.z;btAssign();message('COMBINED ARMS · BLUE ARMOUR HOLDS ZONE A · SUPPORT IT FROM THE AIR',3.4);return}
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
  if(wave>1){resetSystems();rearm();refuel()}
  if(wave>=3&&ground.filter(g=>g.alive).length<wave-1){const a=heading+rand(-1,1),d=rand(12000,18000);spawnGround('sam',P.pos.x+Math.sin(a)*d,P.pos.z+Math.cos(a)*d);spawnGround('aaa',P.pos.x+Math.sin(a)*d+600,P.pos.z+Math.cos(a)*d)}
  message('WAVE '+wave+' · '+n+' BANDITS',2.4);
}
/* AI fighters take module damage like the player: wings, engine fire, controls, pilot. Missiles, rams and bombs (amt >= 5) usually destroy the jet outright. */
const aiKill=(t,how,by)=>{if(t.team==='red')killEnemy(t,how,by);else killFriend(t,how)};
/* credit rules (War Thunder destroy rules): critical damage (a torn wing, fire, wounded pilot, dead controls) is credited for 90 s, plain hits for 15 s;
   a jet that crashes inside its window counts as shot down by whoever damaged it; a pilot who bails out counts as a shootdown */
const CRIT_WINDOW=90, HIT_WINDOW=15;
function crashAI(e){
  const credit=e.team==='red'&&e.hitBy&&clock-e.hitBy<(e.critT&&clock-e.critT<CRIT_WINDOW?CRIT_WINDOW:HIT_WINDOW);
  if(credit){killEnemy(e,'CRASH',true);return}
  e.alive=false;scene.remove(e.obj);explode(e.pos,true);recEvent((e.team==='red'?'Bandit ':'Wingman ')+'flew into the ground')}
function aiBail(e,by){   // the pilot of a doomed jet may get out: a chute drifts down, the kill is still credited
  if(Math.random()>.55||e.pos.y<Math.max(groundH(e.pos.x,e.pos.z),0)+250)return;
  const c=new THREE.Mesh(new THREE.SphereGeometry(2.2,10,6,0,Math.PI*2,0,Math.PI/2),new THREE.MeshStandardMaterial({color:0xf2f2ea,side:THREE.DoubleSide}));
  c.position.copy(e.pos);scene.add(c);DEBRIS.push({m:c,v:new THREE.Vector3(WIND.x*.6,-5,WIND.z*.6),w:new THREE.Vector3(0,0,0),t:60,chute:true});
  if(by)message('PILOT EJECTED',1.4)}
function aiGunHit(t,amt,by){
  const s=t.sys||(t.sys={wL:0,wR:0,eng:0,fireT:0,fatal:false,pilot:0,ctl:1,spin:0,by:false});s.by=by||s.by;let label='';
  if(Math.random()<.03*amt*(1+3*s.pilot))return 'PILOT KILLED';
  const r=Math.random();
  if(r<.3){const side=Math.random()<.5?'wL':'wR';if(s[side]<1){s[side]=Math.min(1,s[side]+.12*amt+.05);if(s[side]>=1){s.spin=1;label='WING TORN OFF';breakWing(t.obj,side,t.pos,t.vel)}else label='WING DAMAGE'}}
  else if(r<.42&&!s.eng){s.eng=1;s.fireT=9;s.fatal=Math.random()<.4;label='ENGINE FIRE'}
  else if(r<.5&&s.ctl>.6){s.ctl=.55;label='CONTROLS DAMAGED'}
  else if(r<.55&&s.pilot<1){s.pilot=Math.min(1,s.pilot+.5);label='PILOT WOUNDED'}
  t.hp=Math.max(.3,3*(1-(.35*(s.wL+s.wR)+.3*(s.eng>0)+.2*s.pilot)));
  return label;
}
function aiSystems(e,dt){   // per frame: fires burn out or spread, wings and controls limit the jet
  const s=e.sys;if(!s||!e.alive)return;
  if(e.gLim0==null)e.gLim0=e.gLim;
  const wd=Math.max(s.wL,s.wR);
  e.gLim=Math.max(3,e.gLim0*(1-.5*wd)*(s.ctl<1?.8:1));e.rollK=(1-.3*wd)*(s.ctl<1?.8:1);e.thrK=s.eng===2?.35:s.eng===1?.8:1;
  if(s.eng===1){s.fireT-=dt;if(Math.random()<dt*10)puff(e.pos.x,e.pos.y,e.pos.z,e.vel.x*.2,e.vel.y*.2,e.vel.z*.2,.15,.15,.15,.7,4,10,2.5);
    if(s.fireT<=0){if(s.fatal){aiBail(e,s.by);aiKill(e,'FIRE',s.by);return}s.eng=2}}
  if(wd>.25&&Math.random()<dt*8*wd)puff(e.pos.x,e.pos.y,e.pos.z,e.vel.x*.3,e.vel.y*.3,e.vel.z*.3,.2,.2,.2,.7,3,10,2);
  if(s.spin){s.spin+=dt;e.obj.rotateZ(dt*3);if(s.spin>4.5){aiBail(e,s.by);aiKill(e,'WING',s.by)}}   // a wing off: the jet tumbles for a few seconds then breaks up
}
function hitAI(t,amt,how,byPlayer){
  if(!t.alive)return;
  if(t.remote){if(byPlayer){t.hitBy=clock;scEvent(how==='GUNS'?'HIT':'DIRECT HIT',how==='GUNS'?3:20,how==='GUNS'?'':'crit',how==='GUNS'?'hit':'dh');netClaimHit(t,how==='GUNS'?4*amt:75,how)}puff(t.pos.x,t.pos.y,t.pos.z,0,0,0,.3,.3,.3,.8,14,20,2);return}
  if(t.kind==='fighter'&&!t.drone){   // (test drones keep the simple hit-point pool)
    if(amt>=5&&(amt>=50||Math.random()<.85)){if(byPlayer){t.hitBy=clock;scEvent('DIRECT HIT',20,'crit','dh')}aiKill(t,how,byPlayer);return}
    let label;
    if(amt>=5){const s=t.sys||(t.sys={wL:0,wR:0,eng:0,fireT:0,fatal:false,pilot:0,ctl:1,spin:0,by:false});s.by=byPlayer||s.by;s[Math.random()<.5?'wL':'wR']=Math.min(1,.6+Math.random()*.4);if(!s.eng){s.eng=1;s.fireT=9;s.fatal=Math.random()<.4}if(s.wL>=1||s.wR>=1){s.spin=1;breakWing(t.obj,s.wL>=1?'wL':'wR',t.pos,t.vel)}label='CRITICAL DAMAGE';t.hp=.6}
    else{label=aiGunHit(t,amt,byPlayer);if(label==='PILOT KILLED'){if(byPlayer){t.hitBy=clock;scEvent('PILOT KILLED',30,'crit')}aiKill(t,how,byPlayer);return}}
    addHole(t.obj,amt>3?4:1);puff(t.pos.x,t.pos.y,t.pos.z,0,0,0,.3,.3,.3,.8,14,20,2);
    if(byPlayer&&label)t.critT=clock;
    if(byPlayer){t.hitBy=clock;if(label)scEvent(label,25,'crit');else if(how==='GUNS')scEvent('HIT',3,'','hit');else scEvent('DIRECT HIT',20,'crit','dh')}
    if(byPlayer&&clock-(t.fdT||-9)>1.5){t.fdT=clock;feed((label?'Critical hit: ':'Hit: ')+(AC_DEFS[t.type]?AC_DEFS[t.type].name:'target')+(label?' · '+label.toLowerCase():'')+' ('+how.replace(' (WINGMAN)','').toLowerCase()+')','hit')}
    return}
  if(byPlayer){t.hitBy=clock;if(how==='GUNS')scEvent('HIT',3,'','hit');else scEvent('DIRECT HIT',20,'crit','dh')}
  t.hp-=amt;
  if(t.hp>0){addHole(t.obj,amt>3?4:1);puff(t.pos.x,t.pos.y,t.pos.z,0,0,0,.3,.3,.3,.8,14,20,2);if(byPlayer&&t.kind==='bomber')message('BOMBER HIT',.8);if(byPlayer&&clock-(t.fdT||-9)>1.5){t.fdT=clock;feed((t.hp<=1?'Critical hit: ':'Hit: ')+(t.kind==='bomber'?'bomber':'target')+' ('+how.replace(' (WINGMAN)','').toLowerCase()+')','hit')}return}
  aiKill(t,how,byPlayer);
}
function killEnemy(e,how,byPlayer=true){
  if(!e.alive)return; e.alive=false; scene.remove(e.obj); explode(e.pos,true); spawnWreck(e);
  if(isBT()){btLoss('red');if(byPlayer)BT.sp+=2}
  const nm=e.kind==='bomber'?'BOMBER':e.kind==='cruise'?'CRUISE MISSILE':'BANDIT';
  if(byPlayer)REC3.lastKill={t:clock,id:e.id};
  if(byPlayer)gciSplash();
  if(!byPlayer&&e.hitBy&&clock-e.hitBy<12)scEvent('ASSIST',40,'bonus');
  if(byPlayer){kills++;const kp=(e.kind==='bomber'?150:e.kind==='cruise'?120:100)*Math.max(1,wave)+(how==='GUNS'?50:0);score+=kp;scKill((e.kind==='bomber'?'BOMBER':e.kind==='cruise'?'CRUISE MISSILE':(AC_DEFS[e.type]?AC_DEFS[e.type].name.toUpperCase():'AIRCRAFT'))+' DESTROYED',0);SC.list[SC.list.length-1].pts=kp;message(e.kind==='cruise'?'CRUISE MISSILE DOWN':how==='GUNS'?'GUNS KILL':'SPLASH · '+how,1.4)}
  else message(nm+' DOWN · '+how,1.4);
  recEvent((byPlayer?'You killed ':'Wingman killed ')+(e.kind==='bomber'?'a bomber':e.kind==='cruise'?'a cruise missile':'a '+(AC_DEFS[e.type]?AC_DEFS[e.type].name:'bandit'))+' ('+how+')');
}
function killFriend(f,how){
  if(!f.alive)return; f.alive=false; scene.remove(f.obj); explode(f.pos,true); spawnWreck(f);
  if(isBT())btLoss('blue');
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
  CM.flrHeld=CM.chfHeld=false; if(isBT())btDied(); if(cause==='ejected'){deadT=7;playerJet.visible=false;$('ctrls').hidden=true;resetStick();gunHeld=false;brake=false;$('bEject').hidden=true;return}
  explode(P.pos,true); explode(P.pos.clone().addScaledVector(P.fwd,10),true);
  playerJet.visible=false; $('ctrls').hidden=true; resetStick(); gunHeld=false; brake=false;
}

/* ---------------- input ---------------- */
const stick={id:null,ox:0,oy:0,x:0,y:0};
const look={id:null,ox:0,oy:0,y0:0,p0:0,yaw:0,pitch:0};
/* keyboard + mouse mode (Settings > Controls > Input): the mouse is a relative stick (click to capture it, Esc to release and pause),
   left button guns, right button short-range missile, middle button long-range missile, wheel or W/S throttle, A/D rudder */
const _kv=new THREE.Vector3(),_kq=new THREE.Quaternion();
const KBM={on:false,aim:true,x:0,y:0,idle:0,az:0,el:0,last:0,ad:new THREE.Vector3(0,0,1),ar:0,ap:0};
try{KBM.on=localStorage.getItem('vsKbm')==='1';KBM.aim=localStorage.getItem('vsKbmAim')!=='0'}catch(e){}
function kbmAim(v){KBM.aim=!!v;KBM.last=0;KBM.x=KBM.y=0;try{localStorage.setItem('vsKbmAim',v?'1':'0')}catch(e){}}
function kbmSet(v){KBM.on=!!v;KBM.x=KBM.y=0;try{localStorage.setItem('vsKbm',v?'1':'0')}catch(e){}if(!v&&document.pointerLockElement)document.exitPointerLock()}
const kbmLock=()=>{if(KBM.on&&document.pointerLockElement!==glCanvas)try{const r=glCanvas.requestPointerLock();if(r&&r.catch)r.catch(()=>{})}catch(e){}};
glCanvas.addEventListener('contextmenu',e=>{if(KBM.on)e.preventDefault()});
glCanvas.addEventListener('wheel',e=>{if(KBM.on&&state==='play'&&KB.wheel!=='none'){e.preventDefault();if(KB.wheel==='throttle')setThr(thrSet-Math.sign(e.deltaY)*.05);else if(KB.wheel==='view'&&(performance.now()-(KB.wt||0))>250){KB.wt=performance.now();cycleView()}}},{passive:false});
document.addEventListener('mousemove',e=>{if(KBM.on&&state==='play'&&document.pointerLockElement===glCanvas){const k=.0032*(SENS[sens]||1)*KB.msens, my=e.movementY*(KB.minv?-1:1);if(KBM.aim){KBM.az-=e.movementX*k*1.1;KBM.el=clamp(KBM.el-my*k*1.1,-1.2,1.2);KBM.idle=0;return}KBM.x=clamp(KBM.x+e.movementX*k,-1,1);KBM.y=clamp(KBM.y+my*k,-1,1);KBM.idle=0}});
document.addEventListener('pointerlockchange',()=>{if(KBM.on&&!document.pointerLockElement&&state==='play')pause()});
const stickBase=$('stickBase'),stickKnob=$('stickKnob'),stickHint=$('stickHint');
function resetStick(){stick.id=null;stick.x=0;stick.y=0;stickBase.hidden=true;stickKnob.style.transform=''}
glCanvas.addEventListener('pointerdown',e=>{
  if(state!=='play')return;
  if(KBM.on&&e.pointerType==='mouse'){e.preventDefault();audioInit();kbmLock();const a=KB.mouse[e.button];if(a)actDown(a);return}
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
['pointerup','pointercancel'].forEach(t=>glCanvas.addEventListener(t,e=>{if(KBM.on&&e.pointerType==='mouse'){const a=KB.mouse[e.button];if(a)actUp(a)}if(e.pointerId===stick.id)resetStick();if(e.pointerId===look.id)look.id=null}));
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
/* ---------------- rebindable keyboard + mouse controls (Settings > Controls > Bindings) ----------------
   Every action has up to two keys per control style ('kb' = classic keys, 'kbm' = mouse mode); the mouse buttons and wheel are bound separately.
   Arrow keys always roll and pitch, Right Shift / = and Right Ctrl / - always move the throttle, Esc always pauses. */
const KB_ACTS=[['pitchPull','Pitch up (pull)','Flight'],['pitchPush','Pitch down (push)','Flight'],['rollL','Roll left','Flight'],['rollR','Roll right','Flight'],['yawL','Rudder left','Flight'],['yawR','Rudder right','Flight'],
  ['thrUp','Throttle up','Flight'],['thrDn','Throttle down','Flight'],['brake','Speed brake','Flight'],['flaps','Flaps','Flight'],['gear','Landing gear','Flight'],['auto','Autopilot','Flight'],
  ['gun','Guns','Weapons'],['aim9','Short-range missile','Weapons'],['aim120','Long-range missile','Weapons'],['agRel','Air-to-ground release','Weapons'],['agNext','Next ground target','Weapons'],['agWpn','Next air-to-ground weapon','Weapons'],['agSight','Sight mode (standard / ballistic computer / CCRP)','Weapons'],
  ['lock','Lock nearest target','Sensors'],['nextTgt','Next target','Sensors'],['radar','Radar panel','Sensors'],['radarMode','Radar mode','Sensors'],['acm','ACM mode','Sensors'],['radarSub','Radar sub-mode (PD / MTI / SRC)','Sensors'],['rangeUp','Radar range up','Sensors'],['rangeDn','Radar range down','Sensors'],
  ['flare','Flares','Defence'],['chaff','Chaff','Defence'],['ecm','Jammer','Defence'],['decoy','Towed decoy','Defence'],
  ['view','Cycle camera','Other'],['map','Tactical map','Other'],['pause','Pause','Other']];
const KB_COMMON={thrUp:['ShiftLeft','Equal'],thrDn:['ControlLeft','Minus'],brake:['KeyB'],flaps:['KeyO'],gear:['KeyL'],auto:['KeyU'],gun:['Space'],aim9:['KeyF'],aim120:['KeyR'],agRel:['KeyH'],agNext:['KeyN'],agWpn:['Period'],agSight:['KeyI'],lock:['KeyT'],nextTgt:['KeyY'],radar:['KeyX'],radarMode:['KeyM'],acm:['KeyG'],radarSub:['Quote'],rangeUp:['BracketRight'],rangeDn:['BracketLeft'],flare:['KeyZ'],chaff:['KeyC'],ecm:['KeyJ'],decoy:['KeyK'],view:['KeyV'],map:['Tab'],pause:['KeyP']};
const KB_DEF={kb:Object.assign({},KB_COMMON,{pitchPull:['KeyS'],pitchPush:['KeyW'],rollL:['KeyA'],rollR:['KeyD'],yawL:['KeyQ'],yawR:['KeyE']}),
  kbm:Object.assign({},KB_COMMON,{pitchPull:[],pitchPush:[],rollL:[],rollR:[],yawL:['KeyA','KeyQ'],yawR:['KeyD','KeyE'],thrUp:['KeyW','ShiftLeft'],thrDn:['KeyS','ControlLeft']})};
const KB_MOUSE_ACTS=['','gun','aim9','aim120','flare','chaff','lock','nextTgt','brake','flaps','view','gear','agRel','ecm','decoy'];
const KB={map:{kb:{},kbm:{}},rev:{kb:{},kbm:{}},mouse:{0:'gun',1:'aim120',2:'aim9',3:'',4:''},wheel:'throttle',msens:1,minv:false};
function kbReset(mode){for(const m of mode?[mode]:['kb','kbm'])for(const [a] of KB_ACTS)KB.map[m][a]=(KB_DEF[m][a]||[]).slice();if(!mode){KB.mouse={0:'gun',1:'aim120',2:'aim9',3:'',4:''};KB.wheel='throttle';KB.msens=1;KB.minv=false}kbRebuild()}
function kbRebuild(){for(const m of ['kb','kbm']){const r=KB.rev[m]={};for(const [a] of KB_ACTS)for(const c of KB.map[m][a])if(c)r[c]=a}}
function kbSave(){try{localStorage.setItem('vsKeys',JSON.stringify({map:KB.map,mouse:KB.mouse,wheel:KB.wheel,msens:KB.msens,minv:KB.minv}))}catch(e){}}
kbReset();
try{const v=JSON.parse(localStorage.getItem('vsKeys')||'null');if(v){for(const m of ['kb','kbm'])if(v.map&&v.map[m])for(const [a] of KB_ACTS)if(Array.isArray(v.map[m][a]))KB.map[m][a]=v.map[m][a].filter(x=>typeof x==='string').slice(0,2);
  if(v.mouse)Object.assign(KB.mouse,v.mouse);if(v.wheel)KB.wheel=v.wheel;if(+v.msens>0)KB.msens=+v.msens;KB.minv=!!v.minv;kbRebuild()}}catch(e){}
const KB_ALIAS={rollL:['ArrowLeft'],rollR:['ArrowRight'],pitchPush:['ArrowUp'],pitchPull:['ArrowDown'],thrUp:['ShiftRight','Equal'],thrDn:['ControlRight','Minus']};
const kbHeld=a=>{const m=KB.map[KBM.on?'kbm':'kb'][a];for(const c of m)if(keys[c])return true;const al=KB_ALIAS[a];if(al)for(const c of al)if(keys[c])return true;return false};
function cycleFlaps(){
  if(P.sys&&P.sys.flapOff){message('FLAPS DAMAGED',1);return}
  if(P.gear){message('LANDING FLAPS WITH THE GEAR DOWN',1);return}
  P.flaps=((P.flaps||0)+1)%3;P.flapManual=true;message(['FLAPS UP','COMBAT FLAPS','LANDING FLAPS'][P.flaps],1)}
$('bFlaps').addEventListener('click',cycleFlaps);
function actDown(a){
  switch(a){
    case 'gun':gunHeld=true;break;case 'aim9':fire9=true;break;case 'aim120':fire120=true;break;case 'brake':brake=true;break;
    case 'flaps':cycleFlaps();break;case 'view':cycleView();break;case 'gear':$('bGear').click();break;case 'lock':quickLock();break;case 'nextTgt':stepTarget();break;
    case 'acm':$('rAcm').click();break;case 'radarSub':cycleRadarSub();break;case 'radarMode':$('rMode').click();break;case 'rangeUp':$('rUp').click();break;case 'rangeDn':$('rDn').click();break;
    case 'radar':$('bRdr').click();break;case 'map':mapStep();break;case 'flare':if(!CM.flrHeld){CM.flrHeld=true;CM.flrT=0}break;case 'chaff':if(!CM.chfHeld){CM.chfHeld=true;CM.chfT=0}break;
    case 'ecm':toggleECM();break;case 'decoy':deployDecoy();break;case 'agRel':agRelease();break;case 'agNext':agNext();break;case 'agWpn':agWpn();break;case 'agSight':agSight();break;case 'auto':$('cAuto').click();break;case 'pause':pause();break;
  }
}
function actUp(a){if(a==='agRel')AG.hold=false;if(a==='gun')gunHeld=false;else if(a==='brake')brake=false;else if(a==='flare')CM.flrHeld=false;else if(a==='chaff')CM.chfHeld=false}
const KBE={open:false};   // the bindings editor (menu.js) captures keys while it is open
addEventListener('keydown',e=>{
  if(KBE.open)return;
  keys[e.code]=true; audioInit();
  const a=KB.rev[KBM.on?'kbm':'kb'][e.code];
  if(state==='play'){
    if(a&&!e.repeat){if(a==='gun'||a==='map')e.preventDefault();actDown(a)}
    if(e.code==='Escape')pause();
  } else if(state==='paused'&&(a==='pause'||e.code==='Escape')) resume();
});
addEventListener('keyup',e=>{
  keys[e.code]=false;
  const a=KB.rev[KBM.on?'kbm':'kb'][e.code];if(a)actUp(a);
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
$('bStart').addEventListener('click',()=>{audioInit();kbmLock();if(state==='paused')resume();else startGame()});
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
  if(aqAvg>28.5&&aqCool<=0){aqSlow+=ms;if(aqSlow>3000){const k=Object.keys(QUALS),i=k.indexOf(quality);aqSlow=0;aqCool=20000;if(postActive()){POST.on=false;aqAvg=16;message('BLOOM OFF FOR FRAME RATE',2.5)}
    else if(i>0){setQuality(k[i-1],true);aqAvg=16;message('GRAPHICS LOWERED FOR FRAME RATE',2.5)}}}
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
function resetSystems(){P.sys={eng:Array(AC.engines).fill(0),fireT:Array(AC.engines).fill(0),hyd:false,flapOff:false,radar:false,leak:false,wL:0,wR:0,ctl:1,gun:false,pilot:0,torn:0,burn:0};P.thrK=1;P.rollK=1;P.gLim=AC.gmax;P.bingo=false;P.lowFuel=false}
function refuel(){P.fuel=Math.max(P.fuel||0,.75*AC.fuelCap);resetSystems();P.bingo=false;P.lowFuel=false}
const fuelStr=kg=>AC.fuelUnit==='LB'?Math.round(kg*2.2046/10)*10+' LB':Math.round(kg/10)*10+' KG';
const ENG_NAME=i=>AC.engines>1?(i===0?'LEFT ':'RIGHT '):'';
/* damage is modular: there is no hit-point pool. A hit rolls the pilot, the wings and the systems; you are lost when the pilot is killed, the
   airframe is destroyed (missile), both wings are gone or a fuel fire takes hold. P.hp is only a summary of the modules for smoke, lights and the Arcade bar. */
/* a torn wing: clip the outer half off the model (side: wL = +x, the left wing) and send a chunk tumbling away */
const DEBRIS=[];
function breakWing(root,side,pos,vel){
  const s=side==='wL'?1:-1;let cut=0;
  root.traverse(o=>{if(o.isMesh&&o.name==='wingM'){o.geometry.computeBoundingBox();cut=Math.max(cut,o.geometry.boundingBox.max.x*.5)}});
  if(!cut)return;const pl=new THREE.Plane(new THREE.Vector3(-s,0,0),cut);
  root.traverse(o=>{const cs=o.parent&&o.parent.name==='cs'&&o.parent.userData&&['ail','flap','elv'].includes(o.parent.userData.cs)&&Math.sign(o.parent.userData.s)===s;
    if(o.isMesh&&(o.name==='wingM'||cs)){const m=o.material.clone();m.clippingPlanes=[pl];m.side=THREE.DoubleSide;o.material=m}});
  const ch=new THREE.Mesh(new THREE.BoxGeometry(cut*1.2,.12,3.2),new THREE.MeshStandardMaterial({color:0x6c7178,roughness:.7}));
  ch.position.copy(pos);scene.add(ch);DEBRIS.push({m:ch,v:vel.clone().add(new THREE.Vector3(s*8,5,0)),w:new THREE.Vector3(rand(-3,3),rand(-2,2),rand(4,9)),t:7});
  puff(pos.x,pos.y,pos.z,0,0,0,1,.6,.2,1,6,14,.3);
}
function updateDebris(dt){for(let i=DEBRIS.length-1;i>=0;i--){const d=DEBRIS[i];d.t-=dt;if(!d.chute)d.v.y-=9.8*dt;d.m.position.addScaledVector(d.v,dt);d.m.rotation.x+=d.w.x*dt;d.m.rotation.y+=d.w.y*dt;d.m.rotation.z+=d.w.z*dt;
  if(!d.chute&&Math.random()<dt*14)puff(d.m.position.x,d.m.position.y,d.m.position.z,0,0,0,.2,.2,.2,.7,3,10,2);
  if(d.t<=0||d.m.position.y<Math.max(groundH(d.m.position.x,d.m.position.z),0)){scene.remove(d.m);DEBRIS.splice(i,1)}}}
function wingHit(side,amt){
  const sy=P.sys;if(sy[side]>=1)return;sy[side]=Math.min(1,sy[side]+amt);
  if(sy[side]>=1){message((side==='wL'?'LEFT':'RIGHT')+' WING TORN OFF',2.4);recEvent((side==='wL'?'Left':'Right')+' wing torn off');shake=1;hurtT=.8;sndTear();sy.torn=side==='wL'?-1:1;breakWing(playerJet,side,P.pos,P.vel);
    if(sy.wL>=1&&sy.wR>=1){message('BOTH WINGS GONE',2);die('shot')}}
}
function playerGunHit(m){
  m=m||1;const sy=P.sys,sev=PRESETS[preset].dmg;
  if(Math.random()<.012*m*sev*(1+3*sy.pilot)){message('PILOT KILLED',1.6);recEvent('The pilot was killed');die('shot');return}
  const r=Math.random();
  if(r<.25)wingHit(Math.random()<.5?'wL':'wR',.08*m*sev);
  else if(r<.37)damageSystem(1);
}
function playerMissileHit(){
  const sy=P.sys,sev=PRESETS[preset].dmg;
  explode(P.pos,false);addHole(playerJet,5);hurtT=.8;shake=1.2;sndHit();buzz([120,60,200]);
  if(Math.random()<Math.min(.9,.5*sev)){message('AIRFRAME DESTROYED',1.6);feed('Critical hit: your airframe was destroyed','loss');die('missile');return}
  message('MISSILE HIT',1.2);feed('Critical hit: you were struck by a missile','loss');damageSystem(3);wingHit(Math.random()<.5?'wL':'wR',.3+Math.random()*.3);
  if(Math.random()<.3)sy.pilot=Math.min(1,sy.pilot+.5);
}
function damageSystem(n){
  n*=PRESETS[preset].dmg;n=Math.floor(n)+(Math.random()<n%1?1:0);   // preset scales how many systems a hit takes out
  for(let i=0;i<n;i++){const r=Math.random();
    if(r<.2){const ok=P.sys.eng.map((v,j)=>v===0?j:-1).filter(j=>j>=0);if(ok.length){const j=ok[Math.random()*ok.length|0];P.sys.eng[j]=1;P.sys.fireT[j]=7;message(ENG_NAME(j)+'ENGINE FIRE',1.8);sndFire();recEvent(ENG_NAME(j).toLowerCase()+'engine fire');buzz([200,80,200])}}
    else if(r<.34){if(!P.sys.hyd){P.sys.hyd=true;message('HYDRAULICS FAILED · G AND ROLL LIMITED',1.8);recEvent('Hydraulics failed')}}
    else if(r<.46){if(!P.sys.radar){P.sys.radar=true;if(R.stt&&R.sttSrc==='RDR')breakLock();R.tracks.clear();message('RADAR FAILED',1.6);recEvent('Radar failed')}}
    else if(r<.56){if(!P.sys.leak){P.sys.leak=true;message('FUEL LEAK',1.6);recEvent('Fuel leak')}}
    else if(r<.74){const side=Math.random()<.5?'wL':'wR';if(P.sys[side]<1){wingHit(side,.35+Math.random()*.2);if(P.sys[side]<1){message((side==='wL'?'LEFT':'RIGHT')+' WING DAMAGED',1.8);recEvent((side==='wL'?'Left':'Right')+' wing damaged')}}}
    else if(r<.82){if(P.sys.ctl>.6){P.sys.ctl=.55;message('ELEVATOR DAMAGED · PITCH LIMITED',1.8);recEvent('Elevator damaged')}}
    else if(r<.9){if(!P.sys.gun){P.sys.gun=true;message('GUNS JAMMED',1.6);recEvent('Guns jammed')}}
    else if(P.sys.pilot<1){P.sys.pilot=Math.min(1,P.sys.pilot+.5);message('PILOT WOUNDED · G TOLERANCE REDUCED',1.8);sndHit();recEvent('Pilot wounded')}
  }
}
function updateSystems(dt,auto){
  const sy=P.sys; let k=0;
  {const t=['UP','CBT','LDG'][P.flaps||0];if($('nFlaps').textContent!==t){$('nFlaps').textContent=t;$('bFlaps').classList.toggle('down',!!P.flaps)}}
  for(let i=0;i<sy.eng.length;i++){
    if(sy.eng[i]===1){sy.fireT[i]-=dt; if(Math.random()<.6)puff(P.pos.x,P.pos.y,P.pos.z,P.vel.x*.2,P.vel.y*.2,P.vel.z*.2,.15,.15,.15,.7,4,10,2.5);
      if(sy.fireT[i]<=0){sy.eng[i]=2;message(ENG_NAME(i)+'ENGINE FAILED',2);recEvent(ENG_NAME(i).toLowerCase()+'engine failed')}}
    k+=sy.eng[i]===0?1:sy.eng[i]===1?.7:0;
  }
  k/=sy.eng.length;
  if(P.fuel<=0)k=0;
  const wd=Math.max(sy.wL,sy.wR);
  P.thrK=k; P.rollK=(sy.hyd?.45:1)*(1-.3*wd); P.gLim=(sy.hyd?Math.min(5,AC.gmax):AC.gmax)*(1-.5*wd);
  for(const [side,sgn] of [['wL',-1],['wR',1]])if(sy[side]>.25&&state==='play'&&Math.random()<dt*14*sy[side]){_d.copy(P.pos).addScaledVector(P.right,sgn*(AC.span||8)*.3);puff(_d.x,_d.y,_d.z,P.vel.x*.3,P.vel.y*.3,P.vel.z*.3,.2,.2,.2,.7,3.5,12,2)}   // smoke streams off a damaged wing
  {const on=sy.eng.some(v=>v===1);   // a burning engine with a fuel leak spreads: the airframe is lost in seconds unless the fire burns out
    if(on&&sy.leak&&state==='play'){if(!sy.burn)message('FUEL FIRE · EJECT',2);sy.burn+=dt*3;if(sy.burn>14){message('AIRFRAME LOST TO FIRE',2);recEvent('A fuel fire destroyed the airframe');die('shot')}}else sy.burn=Math.max(0,sy.burn-dt);
    const dead=sy.eng.filter(v=>v===2).length/sy.eng.length;
    P.hp=clamp(100-30*sy.wL-30*sy.wR-20*dead-8*sy.hyd-5*sy.radar-5*sy.leak-10*(sy.ctl<1)-10*sy.gun-15*sy.pilot-(sy.burn>0?20:0),1,100)}
  if(wd>=.7&&sy.wL<1&&sy.wR<1&&P.n>4&&Math.random()<dt*(P.n-3)*.25){recEvent('A wing failed under load');wingHit(sy.wL>=sy.wR?'wL':'wR',1)}
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
    const km=KBM.on;
    const kx=(kbHeld('rollR')?1:0)-(kbHeld('rollL')?1:0);
    const ky=(kbHeld('pitchPull')?1:0)-(kbHeld('pitchPush')?1:0);
    if(km&&KBM.aim){   // mouse aim: the cursor is a point in the world and the flight computer rolls and pulls the nose onto it (War Thunder's mouse-aim mode)
      const now=performance.now();if(now-KBM.last>500){KBM.az=Math.atan2(P.fwd.x,P.fwd.z);KBM.el=Math.asin(clamp(P.fwd.y,-1,1))}KBM.last=now;
      KBM.ad.set(Math.sin(KBM.az)*Math.cos(KBM.el),Math.sin(KBM.el),Math.cos(KBM.az)*Math.cos(KBM.el));
      if(KBM.ad.dot(P.fwd)<Math.cos(1.45)){KBM.ad.lerp(P.fwd,.12).normalize();KBM.az=Math.atan2(KBM.ad.x,KBM.ad.z);KBM.el=Math.asin(clamp(KBM.ad.y,-1,1))}   // the cursor cannot run far behind the nose
      const l=_kv.copy(KBM.ad).applyQuaternion(_kq.copy(P.obj.quaternion).invert()), rt=-l.x, up=l.y, a=Math.acos(clamp(l.z,-1,1)), rc=Math.atan2(rt,up);
      const sm=clamp((a-.15)/.35,0,1), s2=sm*sm*(3-2*sm);
      KBM.ar=clamp(rt*3,-1,1)*(1-s2)+clamp(rc*2.2,-1,1)*s2;
      KBM.ap=clamp(up*3,-1,1)*(1-s2)+clamp(a*2.5,0,1)*clamp(Math.cos(rc)*1.5,0,1)*s2;
    } else KBM.ar=KBM.ap=0;
    if(km){KBM.idle+=dt;if(KBM.idle>.4){const d=.5*dt;KBM.x=Math.abs(KBM.x)<d?0:KBM.x-Math.sign(KBM.x)*d;KBM.y=Math.abs(KBM.y)<d?0:KBM.y-Math.sign(KBM.y)*d}   // the virtual stick drifts home once the mouse rests
    }
    const tx=tilt.on&&stick.id===null?tilt.x:0, ty=tilt.on&&stick.id===null?tilt.y:0;
    rollIn=clamp(shape(stick.x)+kx+tx+shape(GP.x)+(km&&!KBM.aim?KBM.x:0),-1,1);
    const sy=clamp(shape(stick.y)+ky+ty-shape(GP.y)*-1+(km&&!KBM.aim?KBM.y:0),-1,1); pitchIn=invert?-sy:sy;
    if(km&&KBM.aim){rollIn=clamp(rollIn+KBM.ar,-1,1);pitchIn=clamp(pitchIn+KBM.ap,-1,1)}
    yawIn=(kbHeld('yawR')?1:0)-(kbHeld('yawL')?1:0);
    if(kbHeld('thrUp'))setThr(thrSet+.5*dt);
    if(kbHeld('thrDn'))setThr(thrSet-.5*dt);
    // engine spool: ~3 s idle→MIL, afterburner lights faster
    let cmd=thrSet;
    // G-LOC: pilot is out, hands off the stick
    if(P.sys){pitchIn*=pitchIn>0?P.sys.ctl:1;rollIn=clamp(rollIn+(P.sys.wR-P.sys.wL)*.5,-1,1)}   // damaged wing drags the jet round; a damaged elevator limits the pull
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
    const over=Math.max(0,P.n-6-.25*crewLvl('g')+3*((P.sys&&P.sys.pilot)||0)), under=Math.max(0,-P.n-2);
    if(over>0||under>0)P.gStress+=(Math.pow(over,1.6)*.035+under*.08)*dt; else if(P.n<4.5)P.gStress=Math.max(0,P.gStress-.3*dt);
    if(P.gloc>0){P.gloc-=dt;if(P.gloc<=0)P.gStress=.6}
    else if(P.gStress>=1){P.gloc=5;message('G-LOC',2)}
  }
  const ab=throttle>.81, fw=ab?1.1:.45+throttle*.55; setAB(playerJet,ab); setAB(outside,ab); pFlame.scale.set(fw,fw,ab?.8+(throttle-.8)*5*(1+Math.random()*.25):.1+throttle*.55);
  if(ab&&state==='play'){_d.copy(P.pos).addScaledVector(P.fwd,-8.5);puff(_d.x,_d.y,_d.z,0,0,0,1,.6,.25,.6,1.8,5,.16)}
  if(!auto&&!P.onGround&&state==='play'&&!cvContact()){if(!checkTouchdown()){const gh=Math.max(groundH(P.pos.x,P.pos.z),0);if(P.pos.y<gh+1.2)die('terrain')}}
}

