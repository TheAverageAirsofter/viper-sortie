/* ---------------- ground war: War Thunder armour that fights itself while you fly air support ----------------
   Blue (NATO) and red (Eastern bloc) columns close to gun range and trade shells. Red vehicles live in the same `ground` list as the SAMs and trucks, so your bombs,
   guns, missiles, TGP and wingmen already treat them as targets; blue vehicles are friendly and only die to red shells. Vehicles and BRs from the War Thunder wiki;
   gun and speed numbers are game estimates. gun: [range m, reload s, muzzle m/s, damage to vehicles, spread rad]; aa: [range m, rounds/s, damage to you]. */
const WAR_V={
  M1A1:{n:'M1A1 Abrams',team:'blue',cls:'mbt',br:11.7,hp:9,spd:14,gun:[3200,6,1670,3,.0012],look:'box',barrel:6.4,col:0x6d6a4c,hull:[3.6,1,7.8]},
  LEO2A4:{n:'Leopard 2A4',team:'blue',cls:'mbt',br:10.7,hp:8,spd:14,gun:[3100,5.5,1650,3,.0012],look:'box',barrel:6.2,col:0x55613f,hull:[3.5,1,7.7]},
  CHAL:{n:'Challenger Mk.2',team:'blue',cls:'mbt',br:10.3,hp:9,spd:11,gun:[3000,8,1500,3,.0013],look:'box',barrel:6.4,col:0x59603f,hull:[3.5,1.05,7.6]},
  M60A3:{n:'M60A3 TTS',team:'blue',cls:'mbt',br:9.0,hp:7,spd:12,gun:[2800,6.5,1490,2.5,.0016],look:'round',barrel:5.6,col:0x5f6a49,hull:[3.4,1,6.9]},
  M3:{n:'M3 Bradley',team:'blue',cls:'ifv',br:8.3,hp:5,spd:17,gun:[2200,.3,1100,.35,.004],aa:[1500,3,.6],look:'ifv',barrel:2.4,col:0x58623f,hull:[3.0,1.3,6.4]},
  MARDER:{n:'Marder 1A3',team:'blue',cls:'ifv',br:8.0,hp:5,spd:18,gun:[2000,.3,1050,.3,.004],aa:[1500,3,.5],look:'ifv',barrel:2.0,col:0x5b6244,hull:[3.1,1.2,6.7]},
  GEPARD:{n:'Gepard 1A2',team:'blue',cls:'spaa',br:9.7,hp:5,spd:14,gun:[2500,.15,1175,.4,.006],aa:[4500,10,1.2],look:'gepard',barrel:3.2,col:0x55613f,hull:[3.4,1,7.2]},
  M163:{n:'M163 Vulcan',team:'blue',cls:'spaa',br:7.3,hp:3,spd:17,gun:[1800,.1,1030,.2,.008],aa:[2200,12,.7],look:'m163',barrel:1.6,col:0x5b6244,hull:[2.7,1.3,4.9]},
  T80B:{n:'T-80B',team:'red',cls:'mbt',br:10.7,hp:8,spd:15,gun:[3000,7,1780,3,.0013],look:'round',barrel:6.0,col:0x6a5f45,hull:[3.4,.9,6.9]},
  T72A:{n:'T-72A',team:'red',cls:'mbt',br:9.3,hp:8,spd:13,gun:[2900,7,1780,3,.0014],look:'round',barrel:6.0,col:0x655b42,hull:[3.4,.9,6.9]},
  T62:{n:'T-62',team:'red',cls:'mbt',br:8.7,hp:7,spd:12,gun:[2600,8,1600,2.5,.0016],look:'round',barrel:5.6,col:0x6a6046,hull:[3.3,.9,6.6]},
  BMP2:{n:'BMP-2',team:'red',cls:'ifv',br:8.7,hp:5,spd:17,gun:[2200,.25,1000,.4,.004],aa:[1600,3,.6],look:'ifv',barrel:2.2,col:0x6a6046,hull:[3.1,1.1,6.7]},
  ZSU23:{n:'ZSU-23-4M4',team:'red',cls:'spaa',br:9.3,hp:4,spd:13,gun:[1800,.12,950,.25,.01],aa:[2600,14,1],look:'zsu23',barrel:2.6,col:0x655b42,hull:[3.1,1,6.5]},
  ZSU57:{n:'ZSU-57-2',team:'red',cls:'spaa',br:7.0,hp:5,spd:12,gun:[2200,.5,1000,1,.006],aa:[3000,4,2],look:'zsu57',barrel:4.2,col:0x6a6046,hull:[3.2,1,6.4]}};
const WAR={on:false,units:[],sh:[],t:0};
const warMat=c=>new THREE.MeshLambertMaterial({color:c});
const warShellMat={blue:new THREE.MeshBasicMaterial({color:0xfff4c0}),red:new THREE.MeshBasicMaterial({color:0xffb27a})};
const warShellGeo=new THREE.BoxGeometry(.28,.28,7);
for(let i=0;i<48;i++){const m=new THREE.Mesh(warShellGeo,warShellMat.blue);m.visible=false;m.frustumCulled=false;scene.add(m);WAR.sh.push({m,on:false,vel:new V3(),prev:new V3(),life:0,team:'blue',dmg:0,owner:null})}
function warBuild(d){
  const g=new THREE.Group(),body=warMat(d.col),dk=warMat(0x24272a),H=d.hull,tur=new THREE.Group();
  const add=(geo,mat,x,y,z,par)=>{const m=new THREE.Mesh(geo,mat);m.position.set(x,y,z);(par||g).add(m);return m};
  add(new THREE.BoxGeometry(H[0],H[1],H[2]),body,0,.85+H[1]/2-.45,0);
  for(const s of [-1,1])add(new THREE.BoxGeometry(.78,.95,H[2]+.5),dk,s*(H[0]/2+.08),.55,0);
  tur.position.y=.85+H[1]-.1;g.add(tur);
  const bar=(r,len,x,y,z)=>add(new THREE.CylinderGeometry(r,r,len,8).rotateX(Math.PI/2),dk,x,y,z+len/2,tur);
  let top=1;
  if(d.look==='box'){add(new THREE.BoxGeometry(3.1,.95,3.9),body,0,.5,-.2,tur);add(new THREE.BoxGeometry(2.5,.5,3.2),body,0,1.1,-.5,tur);add(new THREE.BoxGeometry(2.6,.7,1.2),body,0,.6,-2.1,tur);bar(.13,d.barrel,0,.55,1.7);top=1.4}
  else if(d.look==='round'){add(new THREE.CylinderGeometry(1.25,1.45,.8,14),body,0,.4,0,tur);add(new THREE.CylinderGeometry(.5,.5,.35,10),body,.6,.95,0,tur);bar(.12,d.barrel,0,.45,1.3);add(new THREE.CylinderGeometry(.16,.16,1.1,8).rotateX(Math.PI/2),dk,0,.45,3.4,tur);top=1.15}
  else if(d.look==='ifv'){add(new THREE.BoxGeometry(1.9,.75,2.1),body,0,.4,-.2,tur);bar(.06,d.barrel,.25,.5,1.0);if(d.n.indexOf('Bradley')>=0)add(new THREE.BoxGeometry(.7,.5,1.2),dk,-1.1,.7,-.2,tur);top=.8}
  else if(d.look==='gepard'){add(new THREE.BoxGeometry(3.1,1.3,3.2),body,0,.65,-.2,tur);for(const x of [-1.25,1.25])bar(.07,d.barrel,x,.6,1.6);add(new THREE.CylinderGeometry(.85,.85,.16,14).rotateX(Math.PI/2),dk,0,1.7,-1.2,tur);add(new THREE.CylinderGeometry(.4,.4,.14,10).rotateX(Math.PI/2),dk,0,1.5,1.3,tur);top=1.35}
  else if(d.look==='m163'){add(new THREE.CylinderGeometry(1.0,1.1,.7,12),body,0,.35,0,tur);for(let i=0;i<6;i++){const a=i*Math.PI/3;bar(.03,d.barrel,Math.cos(a)*.17,.55+Math.sin(a)*.17,.6)}top=.75}
  else if(d.look==='zsu23'){add(new THREE.BoxGeometry(2.9,1.2,2.9),body,0,.6,-.2,tur);for(const x of [-.55,-.18,.18,.55])for(const y of [.55,.95])if(Math.abs(x)>.3||y<.8)bar(.05,d.barrel,x,y,1.2);add(new THREE.CylinderGeometry(.8,.8,.18,12).rotateX(Math.PI/2),dk,0,1.5,-1.2,tur);top=1.3}
  else{add(new THREE.BoxGeometry(2.9,.8,3.2),body,0,.4,-.2,tur);for(const x of [-.45,.45])bar(.1,d.barrel,x,.55,1.4);top=.8}
  add(new THREE.PlaneGeometry(2.2,2.2).rotateX(-Math.PI/2),new THREE.MeshBasicMaterial({color:d.team==='blue'?0x2b8cff:0xff3b30,side:THREE.DoubleSide}),0,top+.05,-.2,tur);   // roof panel: readable from the air
  g.userData.tur=tur;return g}
function warSpawn(id,x,z,heading){
  const d=WAR_V[id],obj=warBuild(d);obj.position.set(x,Math.max(groundH(x,z),0)+.2,z);obj.rotation.y=heading;scene.add(obj);
  const kind=d.cls==='mbt'?'tank':d.cls==='ifv'?'ifv':'spaa';
  const u={kind,team:d.team,type:d.n,def:d,obj,pos:obj.position,vel:new V3(),fwd:new V3(0,0,1),up:UP,right:new V3(1,0,0),alive:true,hp:d.hp,objective:false,offT:0,lockT:0,tgt:null,mslCd:99,shots:0,id:nextId(),gunAcc:0,seenT:-99,
    war:true,heading,aim:null,scanT:rand(0,1),cd:rand(1,d.gun[1]+2),dustT:0,burnT:0,airAcc:0};
  WAR.units.push(u);if(d.team==='red')ground.push(u);return u}
const warEnemy=u=>u.team==='blue'?'red':'blue';
function warPick(u){let best=null,bd=6500;for(const o of WAR.units){if(!o.alive||o.team===u.team)continue;const d=Math.hypot(o.pos.x-u.pos.x,o.pos.z-u.pos.z);if(d<bd){bd=d;best=o}}return best}
const warAng=a=>{while(a>Math.PI)a-=2*Math.PI;while(a<-Math.PI)a+=2*Math.PI;return a};
function warFire(u,t){
  const d=u.def,from=new V3(u.pos.x,u.pos.y+2.4,u.pos.z),to=new V3(t.pos.x,t.pos.y+1.4,t.pos.z),dist=from.distanceTo(to);
  const s=WAR.sh.find(q=>!q.on)||WAR.sh[0],T=dist/d.gun[2],dir=to.sub(from);dir.y+=.5*9.81*T*T;                                    // aim up to drop onto the target
  dir.addScaledVector(t.vel||new V3(),T*.8).normalize();const sp=d.gun[4]*2.6*(u.moving?2.2:1);dir.x+=rand(-sp,sp);dir.y+=rand(-sp,sp);dir.z+=rand(-sp,sp);dir.normalize();
  s.on=true;s.team=u.team;s.dmg=d.gun[3];s.owner=u;s.life=8;s.m.material=warShellMat[u.team];s.m.visible=true;s.m.position.copy(from);s.prev.copy(from);s.vel.copy(dir).multiplyScalar(d.gun[2]);s.m.quaternion.setFromUnitVectors(ZF,dir);
  const big=d.cls==='mbt';puff(from.x+dir.x*4,from.y+dir.y*4,from.z+dir.z*4,dir.x*30,dir.y*30+2,dir.z*30,1,.85,.5,1,big?9:3,big?30:10,.14);                  // muzzle flash
  if(big)puff(from.x,from.y,from.z,dir.x*8,3,dir.z*8,.5,.48,.44,.6,big?7:3,12,2.2);
  const cd=camera.position.distanceTo(from);if(big&&cd<7000&&typeof sndBoom==='function')sndBoom(clamp(1-cd/7000,0,.45)*.8)}
function warDamage(u,dmg,by){if(!u.alive)return;u.hp-=dmg;puff(u.pos.x,u.pos.y+2,u.pos.z,0,4,0,.2,.2,.2,.7,8,10,2.5);if(u.hp<=0)warDie(u,by)}
function warWreck(u){u.burnT=45;if(u.obj.userData.tur){u.obj.userData.tur.position.y+=.5;u.obj.userData.tur.rotation.z=.25}
  u.obj.traverse(o=>{if(o.isMesh&&o.material&&o.material.color&&!o.material.isMeshBasicMaterial)o.material.color.setHex(0x1b1b1a)})}
function warDie(u,by){u.alive=false;explode(new V3(u.pos.x,u.pos.y+2,u.pos.z),false);warWreck(u);
  if(by&&by.def)feed((by.team==='blue'?'Blue ':'Red ')+by.def.n+' destroyed '+u.def.n,u.team==='red'?'kill':'loss')}
function warClear(){for(const u of WAR.units)if(u.team==='blue')scene.remove(u.obj);WAR.units=[];for(const s of WAR.sh){s.on=false;s.m.visible=false}WAR.on=false}
function updateWar(dt){
  if(!WAR.on)return;
  if(state!=='play'){return}
  WAR.t+=dt;
  for(const u of WAR.units){
    if(!u.alive){if(u.burnT>0){u.burnT-=dt;u.dustT-=dt;if(u.dustT<=0){u.dustT=.35;puff(u.pos.x+rand(-1,1),u.pos.y+2.5,u.pos.z+rand(-1,1),rand(-1,1),rand(6,10),rand(-1,1),.14,.14,.14,.6,rand(5,9),rand(6,12),rand(3,5),-.3)}}continue}
    const d=u.def;u.cd-=dt;u.scanT-=dt;
    if(u.scanT<=0){u.scanT=.8+Math.random()*.5;u.aim=warPick(u)}
    const t=u.aim&&u.aim.alive?u.aim:null;let dist=1e9,wantH=u.team==='blue'?0:Math.PI;
    if(t){const dx=t.pos.x-u.pos.x,dz=t.pos.z-u.pos.z;dist=Math.hypot(dx,dz);wantH=Math.atan2(dx,dz)}
    u.moving=!t||dist>d.gun[0]*.78;
    const dh=warAng(wantH-u.heading);u.heading+=clamp(dh,-dt*.45,dt*.45);u.obj.rotation.y=u.heading;
    if(u.moving&&Math.abs(dh)<.9){const v=d.spd*.5;u.pos.x+=Math.sin(u.heading)*v*dt;u.pos.z+=Math.cos(u.heading)*v*dt;u.vel.set(Math.sin(u.heading)*v,0,Math.cos(u.heading)*v);
      u.dustT-=dt;if(u.dustT<=0){u.dustT=.3;puff(u.pos.x-Math.sin(u.heading)*3,u.pos.y+.4,u.pos.z-Math.cos(u.heading)*3,rand(-1,1),rand(1,2.5),rand(-1,1),.55,.5,.4,.35,rand(4,7),rand(5,9),rand(1.5,2.5),-.2)}}
    else u.vel.set(0,0,0);
    u.pos.y=Math.max(groundH(u.pos.x,u.pos.z),0)+.2;
    // turret follows its target (in the hull's frame)
    const tur=u.obj.userData.tur;let aimed=false;
    if(t&&tur){const want=Math.atan2(t.pos.x-u.pos.x,t.pos.z-u.pos.z)-u.heading,cur=tur.rotation.y,dd=warAng(want-cur);tur.rotation.y=cur+clamp(dd,-dt*1.2,dt*1.2);aimed=Math.abs(dd)<.06}
    if(t&&aimed&&u.cd<=0&&dist<d.gun[0]&&losClear(new V3(u.pos.x,u.pos.y+2.4,u.pos.z),new V3(t.pos.x,t.pos.y+1.4,t.pos.z))){u.cd=d.gun[1]*(.9+Math.random()*.25);warFire(u,t)}
    // blue anti-aircraft (Gepard, Vulcan, IFV cannons): bursts at the nearest red fighter, with a hit chance that falls off with range
    if(u.team==='blue'&&d.aa){u.aaT=(u.aaT||0)-dt;if(u.aaT<=0){u.aaT=.35+Math.random()*.2;let bt=null,bdd=d.aa[0];for(const e of enemies){if(!e.alive||e.kind!=='fighter'||e.pos.y-u.pos.y<25)continue;const dd=e.pos.distanceTo(u.pos);if(dd<bdd){bdd=dd;bt=e}}
      if(bt){const ux=(bt.pos.x-u.pos.x)/bdd,uy=(bt.pos.y-u.pos.y)/bdd,uz=(bt.pos.z-u.pos.z)/bdd;for(let k=0;k<3;k++)puff(u.pos.x+ux*8*(k+1),u.pos.y+3+uy*8*(k+1),u.pos.z+uz*8*(k+1),ux*900,uy*900,uz*900,1,.8,.35,1,2.4,0,.55);
        if(Math.random()<clamp(1-bdd/d.aa[0],.05,1)*.45*(d.cls==='spaa'?1:.35))hitAI(bt,d.aa[2],d.n,false)}}}
    // red anti-aircraft: shoot at you inside range, like the AAA guns
    if(u.team==='red'&&d.aa&&P.alive&&!P.scramble){const pd=u.pos.distanceTo(P.pos),agl=P.pos.y-Math.max(groundH(P.pos.x,P.pos.z),0);
      if(pd<d.aa[0]&&P.pos.y-u.pos.y<2600&&agl>15){u.airAcc+=dt*d.aa[1];while(u.airAcc>=1){u.airAcc--;const tt=pd/970;_c.copy(P.pos).addScaledVector(P.vel,tt).sub(u.pos).normalize();const sp=d.cls==='spaa'?.018:.04;_c.x+=rand(-sp,sp);_c.y+=rand(-sp,sp);_c.z+=rand(-sp,sp);_c.normalize();
        const b=take(eBullets);b.on=true;b.life=3;b.m.visible=true;b.team='red';b.dmg=d.aa[2];b.m.position.copy(u.pos).setY(u.pos.y+3);b.vel.copy(_c).multiplyScalar(970);b.m.quaternion.setFromUnitVectors(ZF,_c)}}
      else u.airAcc=0}
  }
  // shells in flight
  for(const s of WAR.sh){if(!s.on)continue;s.prev.copy(s.m.position);s.vel.y-=9.81*dt;s.m.position.addScaledVector(s.vel,dt);s.life-=dt;
    s.m.quaternion.setFromUnitVectors(ZF,_s1.copy(s.vel).normalize());
    let hit=null;for(const o of WAR.units){if(!o.alive||o.team===s.team)continue;if(distSeg(_s2.set(o.pos.x,o.pos.y+1.4,o.pos.z),s.prev,s.m.position)<5){hit=o;break}}
    if(hit){s.on=false;s.m.visible=false;const p=s.m.position;puff(p.x,p.y,p.z,0,3,0,1,.8,.4,1,10,22,.2);const wasRed=hit.team==='red';
      if(wasRed){hit.hp-=s.dmg;puff(hit.pos.x,hit.pos.y+2,hit.pos.z,0,5,0,.2,.2,.2,.7,9,10,3);if(hit.hp<=0&&hit.alive){hit.alive=false;explode(new V3(hit.pos.x,hit.pos.y+2,hit.pos.z),false);warWreck(hit);if(s.owner&&s.owner.def)feed('Blue '+s.owner.def.n+' destroyed '+hit.def.n,'kill')}}
      else warDamage(hit,s.dmg,s.owner);continue}
    const gh=Math.max(groundH(s.m.position.x,s.m.position.z),0);
    if(s.m.position.y<gh+.3||s.life<=0){s.on=false;s.m.visible=false;if(s.life>0){const p=s.m.position;puff(p.x,gh+1,p.z,0,4,0,.5,.42,.32,.8,9,16,2,-.2)}}}
}
// the mission: blue armour in the south, red in the north, you overhead
function setupGroundWar(){
  warClear();WAR.on=true;WAR.t=0;
  const [cx,cz]=findLand(rand(-3000,3000),31000),gap=1900;
  const blue=['M1A1','M1A1','LEO2A4','LEO2A4','CHAL','M60A3','M3','MARDER','GEPARD','M163'],red=['T80B','T80B','T80B','T72A','T72A','T62','BMP2','BMP2','ZSU23','ZSU57'];
  blue.forEach((id,i)=>{const k=i%5,r=i>>2;warSpawn(id,cx+(k-2)*140+rand(-20,20),cz-gap-r*110,0)});
  red.forEach((id,i)=>{const k=i%5,r=i>>2;warSpawn(id,cx+(k-2)*140+rand(-20,20),cz+gap+r*110,Math.PI)});
  sortie={kind:'GROUNDWAR',center:new V3(cx,0,cz),need:red.length};
  P.pos.set(0,5500,0);P.vel.set(0,0,240)}
const warAlive=team=>WAR.units.filter(u=>u.team===team&&u.alive).length;
function warStatus(){return 'RED '+warAlive('red')+' · BLUE '+warAlive('blue')}
function warCheck(dt){
  if(!warAlive('red'))endMission(true,'Enemy armour destroyed');
  else if(!warAlive('blue'))endMission(false,'The friendly force was wiped out');
  else if(WAR.t>900)endMission(warAlive('blue')>=warAlive('red'),warAlive('blue')>=warAlive('red')?'Held the line':'Out of time')}
