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
// crew, ammunition-rack vulnerability (1 = autoloader carousel in the hull, low = blow-out panels) and the gun's pivot (y, z) in the turret
const WAR_X={M1A1:{crew:4,rack:.3,gy:.62,gz:2.25},LEO2A4:{crew:4,rack:.45,gy:.6,gz:2.1},CHAL:{crew:4,rack:.4,gy:.62,gz:2.2},M60A3:{crew:4,rack:.8,gy:.5,gz:1.7},M3:{crew:3,rack:.7,gy:.55,gz:.9},MARDER:{crew:3,rack:.6,gy:.55,gz:.9},
  GEPARD:{crew:3,rack:.5,gy:.8,gz:1.6},M163:{crew:3,rack:.5,gy:.6,gz:.5},T80B:{crew:3,rack:1.3,gy:.5,gz:1.5},T72A:{crew:3,rack:1.4,gy:.5,gz:1.5},T62:{crew:4,rack:.9,gy:.5,gz:1.5},BMP2:{crew:3,rack:1,gy:.55,gz:.8},ZSU23:{crew:4,rack:.6,gy:.75,gz:1.4},ZSU57:{crew:6,rack:.8,gy:.55,gz:1.4}};
for(const k in WAR_X)Object.assign(WAR_V[k],WAR_X[k]);
const WAR={on:false,units:[],sh:[],t:0,debris:[]};
const warMat=c=>new THREE.MeshLambertMaterial({color:c});
const warShellMat={blue:new THREE.MeshBasicMaterial({color:0xfff4c0}),red:new THREE.MeshBasicMaterial({color:0xffb27a})};
const warShellGeo=new THREE.BoxGeometry(.28,.28,7);
for(let i=0;i<48;i++){const m=new THREE.Mesh(warShellGeo,warShellMat.blue);m.visible=false;m.frustumCulled=false;scene.add(m);WAR.sh.push({m,on:false,vel:new V3(),prev:new V3(),life:0,team:'blue',dmg:0,owner:null})}
/* ---- models: parts are collected per material group and merged, so a vehicle costs about seven draw calls ---- */
const _wm4=new THREE.Matrix4(),_wq=new THREE.Quaternion(),_we=new THREE.Euler(),_wv=new V3(),_ws=new V3();
function wPart(list,geo,x,y,z,rx,ry,rz,sx,sy,sz){_we.set(rx||0,ry||0,rz||0);_wq.setFromEuler(_we);_wm4.compose(_wv.set(x,y,z),_wq,_ws.set(sx||1,sy||1,sz||1));const g=geo.index?geo.toNonIndexed():geo.clone();g.applyMatrix4(_wm4);list.push(g)}
function wMerge(list,mat){if(!list.length)return null;const n=list.reduce((a,g)=>a+g.attributes.position.count,0),pos=new Float32Array(n*3),nor=new Float32Array(n*3);let o=0;
  for(const g of list){pos.set(g.attributes.position.array,o*3);nor.set(g.attributes.normal.array,o*3);o+=g.attributes.position.count}
  const G=new THREE.BufferGeometry();G.setAttribute('position',new THREE.BufferAttribute(pos,3));G.setAttribute('normal',new THREE.BufferAttribute(nor,3));return new THREE.Mesh(G,mat)}
// a side-profile polygon (z, y) extruded across x: wedge hulls and sloped turrets
function wPrism(pts,w){const sh=new THREE.Shape();pts.forEach((p,i)=>i?sh.lineTo(p[0],p[1]):sh.moveTo(p[0],p[1]));sh.closePath();const g=new THREE.ExtrudeGeometry(sh,{depth:w,bevelEnabled:false});g.translate(0,0,-w/2);g.rotateY(-Math.PI/2);return g}
const wBox=(w,h,l)=>new THREE.BoxGeometry(w,h,l), wCyl=(r1,r2,h,n)=>new THREE.CylinderGeometry(r1,r2,h,n||10), wSph=()=>new THREE.SphereGeometry(1,14,9);
const wBarrel=(r,len)=>new THREE.CylinderGeometry(r,r,len,8).rotateX(Math.PI/2).translate(0,0,len/2);
function warBuild(d){
  const g=new THREE.Group(),W=d.hull[0],H1=d.hull[1],L=d.hull[2],body=warMat(d.col),tmat=warMat(new THREE.Color(d.col).multiplyScalar(.9).getHex()),dk=warMat(0x24272a),dk2=warMat(0x3a3d3a);
  const hullG=[],sideL=[],sideR=[],turB=[],turD=[],gunG=[];
  const tier=d.look==='ifv'||d.look==='m163';
  // hull: sloped glacis and rear deck
  const hp=d.look==='m163'?[[-L/2,.3],[-L/2,.3+H1],[L/2-1.0,.3+H1],[L/2,.3+H1*.6],[L/2,.3]]:tier?[[-L/2,.3],[-L/2,.3+H1],[L/2-1.5,.3+H1],[L/2,.3+H1*.55],[L/2,.3]]:[[-L/2,.3],[-L/2,.3+H1*.92],[-L/2+1.8,.3+H1],[L/2-2.0,.3+H1],[L/2,.3+H1*.5],[L/2,.3]];
  wPart(hullG,wPrism(hp,W-.35),0,0,0);
  if(!tier||d.look==='m163'){wPart(sideL,wBox(W*.55,.05,1.7),0,.3+H1+.04,-L/2+1.3);}                                       // engine deck grille (hull frame, dark)
  // running gear: road wheels, sprocket, idler, track runs and skirts, one merged mesh per side
  const nW=tier?5:6;
  for(const [sd,list] of [[-1,sideL],[1,sideR]]){const x=sd*(W/2+.12);
    wPart(list,wBox(.8,.95,L+.2),x,.6,0);wPart(list,wBox(.8,.1,L-.2),x,1.12,0);
    for(let i=0;i<nW;i++){const z=-L/2+1.2+(L-2.4)*i/(nW-1);wPart(list,wCyl(.46,.46,.55,12),x+sd*-.12,.55,z,0,0,Math.PI/2)}
    wPart(list,wCyl(.4,.4,.55,12),x-sd*.12,.6,-L/2+.45,0,0,Math.PI/2);wPart(list,wCyl(.36,.36,.55,12),x-sd*.12,.6,L/2-.35,0,0,Math.PI/2);
    if(!tier&&d.team==='blue')wPart(list,wBox(.08,.55,L*.8),x+sd*.42,.95,0)}                                              // side skirts on the NATO tanks
  const yT=.3+H1, T=turB, TD=turD;   // turret frame: y = 0 at the ring
  const top={v:1};
  switch(d.look){
    case 'box':{
      if(d.n.indexOf('Abrams')>=0){wPart(T,wPrism([[-2.5,0],[-2.5,.92],[-.7,1.06],[1.0,.96],[2.0,.72],[2.3,.35],[2.3,0]],3.3),0,0,0);wPart(T,wBox(3.2,.8,1.1),0,.45,-2.75);wPart(T,wBox(.7,.3,.9),-.75,1.1,-.3);wPart(TD,wCyl(.42,.42,.3,10),.75,1.15,-.2);wPart(TD,wBox(1.0,.7,.4),0,.5,2.35);top.v=1.2}
      else if(d.n.indexOf('Leopard')>=0){wPart(T,wPrism([[-2.4,0],[-2.4,.95],[1.7,.95],[2.15,.78],[2.15,0]],3.4),0,0,0);for(const s of [-1,1])wPart(T,wBox(.55,.78,1.5),s*1.55,.45,1.55,0,-s*.55);wPart(T,wBox(3.1,.7,1.0),0,.45,-2.75);wPart(TD,wCyl(.4,.4,.3,10),.8,1.1,-.2);wPart(TD,wBox(.9,.6,.4),0,.5,2.2);top.v=1.05}
      else{wPart(T,wPrism([[-2.6,0],[-2.6,.98],[1.4,1.05],[2.25,.78],[2.25,0]],3.5),0,0,0);wPart(T,wBox(3.3,.85,1.4),0,.5,-2.9);wPart(TD,wCyl(.42,.42,.3,10),.8,1.18,-.4);wPart(TD,wBox(1.1,.7,.4),0,.5,2.3);top.v=1.15}
      break}
    case 'round':{
      const m60=d.n.indexOf('M60')>=0;wPart(T,wSph(),0,m60?.15:.05,.1,0,0,0,m60?1.5:1.6,m60?.85:.55,m60?2.0:1.85);
      wPart(TD,wCyl(.46,.46,.32,10),m60?.65:.55,m60?1.0:.62,-.3);
      if(!m60){wPart(TD,wBox(.5,.3,.6),-.75,.6,1.1);for(const s of [-1,1])for(let i=0;i<3;i++)wPart(TD,wCyl(.07,.07,.3,6),s*(.75+i*.15),.45,1.55,Math.PI/2,0,0);wPart(TD,wCyl(.05,.05,.7,6),.55,.9,-.3)}
      else wPart(TD,wBox(.9,.3,.6),-.9,.55,-.2);
      top.v=m60?1.1:.82;break}
    case 'ifv':{
      const brad=d.n.indexOf('Bradley')>=0,mard=d.n.indexOf('Marder')>=0;
      wPart(T,wBox(brad?1.9:1.7,.85,2.0),brad?-.4:.35,.42,-.2);if(brad)wPart(TD,wBox(.7,.55,1.2),.95,.8,-.4);else if(mard)wPart(TD,wBox(.5,.4,.8),-.1,.9,-.3);else wPart(TD,wBox(.3,.35,.9),-.5,1.0,.1);
      wPart(TD,wCyl(.3,.3,.18,8),brad?-.4:.35,.9,-.3);top.v=.9;break}
    case 'gepard':{
      wPart(T,wPrism([[-1.9,0],[-1.9,1.25],[1.1,1.35],[1.9,.95],[1.9,0]],3.3),0,0,0);
      wPart(TD,wCyl(.06,.06,1.0,6),0,1.8,-1.0);wPart(TD,wCyl(.95,.95,.14,16),0,2.4,-1.0,Math.PI/2.4);wPart(TD,wCyl(.42,.42,.14,12),0,1.55,1.4,Math.PI/2.1);
      for(const s of [-1,1])wPart(TD,wBox(.3,.35,.9),s*1.35,.6,1.2);top.v=1.4;break}
    case 'm163':{
      wPart(T,wCyl(.95,1.0,.65,14),0,.3,0);wPart(T,wBox(.15,.8,1.2),.9,.7,.3);wPart(T,wBox(.15,.8,1.2),-.9,.7,.3);wPart(TD,wBox(1.3,.3,.8),0,.5,-.8);top.v=.8;break}
    case 'zsu23':{
      wPart(T,wBox(2.9,1.2,2.9),0,.6,-.2);wPart(T,wBox(2.6,.2,1.0),0,1.25,.9,-.35);wPart(TD,wCyl(.06,.06,.8,6),0,1.6,-1.0);wPart(TD,wCyl(.85,.85,.14,14),0,2.1,-1.1,Math.PI/2.3);top.v=1.4;break}
    default:{   // ZSU-57-2: open-topped turret with thin walls
      for(const s of [-1,1])wPart(T,wBox(.12,.9,3.0),s*1.4,.45,-.2);wPart(T,wBox(2.9,.9,.12),0,.45,-1.7);wPart(T,wBox(2.9,.5,.12),0,.3,1.3);wPart(TD,wBox(2.6,.1,2.6),0,.05,-.2);top.v=.9}}
  // gun: barrel(s) in their own group so they can elevate and recoil
  const gg=new THREE.Group();gg.position.set(0,d.gy,d.gz);
  if(d.look==='gepard')for(const s of [-1,1]){wPart(gunG,wBarrel(.075,d.barrel),s*1.35,d.gy*0-.15,-d.gz+1.2);wPart(gunG,wCyl(.1,.1,.35,8).rotateX(Math.PI/2),s*1.35,-.15,-d.gz+1.2+d.barrel,0,0,0)}
  else if(d.look==='zsu23')for(const x of [-.55,-.18,.18,.55])for(const y of [-.2,.2])wPart(gunG,wBarrel(.05,d.barrel),x,y,0);
  else if(d.look==='zsu57')for(const x of [-.45,.45])wPart(gunG,wBarrel(.1,d.barrel),x,0,0);
  else if(d.look==='m163')for(let i=0;i<6;i++){const a=i*Math.PI/3;wPart(gunG,wBarrel(.03,d.barrel),Math.cos(a)*.17,Math.sin(a)*.17,0)}
  else if(d.cls==='mbt'){const r=d.n.indexOf('T-')===0?.14:.13;wPart(gunG,wBarrel(r,d.barrel),0,0,0);wPart(gunG,wCyl(r*1.45,r*1.45,.9,10).rotateX(Math.PI/2),0,0,d.barrel*.62);   // bore evacuator
    if(d.n.indexOf('Leopard')>=0||d.n.indexOf('Abrams')>=0||d.n.indexOf('Chall')>=0)wPart(gunG,wCyl(r*1.3,r*1.3,1.4,10).rotateX(Math.PI/2),0,0,.9)}
  else wPart(gunG,wBarrel(.06,d.barrel),0,0,0);
  if(d.look==='gepard')gg.position.set(0,.8,d.gz);
  const hull=wMerge(hullG,body),sl=wMerge(sideL,dk),sr=wMerge(sideR,dk),tb=wMerge(turB,tmat),td=wMerge(turD,dk2),gn=wMerge(gunG,dk);
  const tur=new THREE.Group();tur.position.y=yT;
  g.add(hull);g.add(sl);g.add(sr);g.add(tur);tur.add(tb);if(td)tur.add(td);tur.add(gg);if(gn)gg.add(gn);
  const mk=new THREE.Mesh(new THREE.PlaneGeometry(1.6,1.6).rotateX(-Math.PI/2),new THREE.MeshBasicMaterial({color:d.team==='blue'?0x2b8cff:0xff3b30,side:THREE.DoubleSide}));mk.position.set(0,top.v+.05,-.3);tur.add(mk);   // roof panel: readable from the air
  g.userData={tur,gun:gg,gz:d.gz,sl,sr,yT,L};return g}
function warSpawn(id,x,z,heading){
  const d=WAR_V[id],obj=warBuild(d);obj.position.set(x,Math.max(groundH(x,z),0)+.2,z);obj.rotation.y=heading;scene.add(obj);
  const kind=d.cls==='mbt'?'tank':d.cls==='ifv'?'ifv':'spaa';
  const u={kind,team:d.team,type:d.n,def:d,obj,pos:obj.position,vel:new V3(),fwd:new V3(0,0,1),up:UP,right:new V3(1,0,0),alive:true,hp:d.hp,hpSeen:d.hp,objective:false,offT:0,lockT:0,tgt:null,mslCd:99,shots:0,id:nextId(),gunAcc:0,seenT:-99,
    war:true,heading,aim:null,scanT:rand(0,1),cd:rand(1,d.gun[1]+2),dustT:0,burnT:0,airAcc:0,rec:0,
    mod:{trk:false,eng:false,gun:0,tur:false,fire:false,crew:d.crew,ammo:true},fireT:0,fireLeft:0,note:{}};
  WAR.units.push(u);if(d.team==='red')ground.push(u);return u}
const warEnemy=u=>u.team==='blue'?'red':'blue';
function warPick(u){let best=null,bd=6500;for(const o of WAR.units){if(!o.alive||o.team===u.team)continue;const d=Math.hypot(o.pos.x-u.pos.x,o.pos.z-u.pos.z);if(d<bd){bd=d;best=o}}return best}
const warAng=a=>{while(a>Math.PI)a-=2*Math.PI;while(a<-Math.PI)a+=2*Math.PI;return a};
function warFire(u,t){
  const d=u.def,from=new V3(u.pos.x,u.pos.y+2.4,u.pos.z),to=new V3(t.pos.x,t.pos.y+1.4,t.pos.z),dist=from.distanceTo(to);
  const s=WAR.sh.find(q=>!q.on)||WAR.sh[0],T=dist/d.gun[2],dir=to.sub(from);dir.y+=.5*9.81*T*T;                                    // aim up to drop onto the target
  dir.addScaledVector(t.vel||new V3(),T*.8).normalize();const sp=d.gun[4]*2.6*(u.moving?2.2:1)*(u.mod.gun===1?2.6:1)*(u.mod.crew<d.crew?1.25:1);dir.x+=rand(-sp,sp);dir.y+=rand(-sp,sp);dir.z+=rand(-sp,sp);dir.normalize();
  s.on=true;s.team=u.team;s.dmg=d.gun[3];s.owner=u;s.life=8;s.m.material=warShellMat[u.team];s.m.visible=true;s.m.position.copy(from);s.prev.copy(from);s.vel.copy(dir).multiplyScalar(d.gun[2]);s.m.quaternion.setFromUnitVectors(ZF,dir);
  const big=d.cls==='mbt';puff(from.x+dir.x*4,from.y+dir.y*4,from.z+dir.z*4,dir.x*30,dir.y*30+2,dir.z*30,1,.85,.5,1,big?9:3,big?30:10,.14);                  // muzzle flash
  if(big)puff(from.x,from.y,from.z,dir.x*8,3,dir.z*8,.5,.48,.44,.6,big?7:3,12,2.2);
  u.rec=1;const cd=camera.position.distanceTo(from);if(big&&cd<7000&&typeof sndBoom==='function')sndBoom(clamp(1-cd/7000,0,.45)*.8)}
/* ---- damage modules (War Thunder style): a hit can break the tracks, engine, gun, turret drive, kill crew, hit the ammunition rack or start a fire ---- */
const WAR_NOTE={trk:'tracks damaged',eng:'engine damaged',fire:'engine on fire',gun:'gun barrel damaged',gun2:'gun destroyed',tur:'turret drive damaged',crew:'crewman killed',rack:'ammunition rack hit'};
function warNote(u,k,txt){if(u.note[k])return;u.note[k]=1;if(u.team==='red'||u.def.cls==='mbt')feed((u.team==='blue'?'Blue ':'Red ')+u.def.n+': '+(txt||WAR_NOTE[k]),u.team==='red'?'hit':'loss')}
function warModules(u,dmg,by){
  const d=u.def,m=u.mod,heavy=dmg>=2;
  for(let k=0;k<(heavy?2:1)&&u.alive;k++){const r=Math.random();
    if(r<.14){if(!m.trk){m.trk=true;warNote(u,'trk')}}
    else if(r<.28){if(!m.eng){m.eng=true;warNote(u,'eng');if(Math.random()<.5)warBurn(u)}else if(!m.fire&&Math.random()<.5)warBurn(u)}
    else if(r<.40){if(m.gun<2){m.gun++;warNote(u,m.gun===1?'gun':'gun2')}}
    else if(r<.52){if(!m.tur){m.tur=true;warNote(u,'tur')}}
    else if(r<.68){m.crew--;warNote(u,'crew');if(m.crew<=0){warDie(u,by,'crew knocked out');return}}
    else if(r<.82){warNote(u,'rack');if(Math.random()<(heavy?.55:.05)*d.rack){warDie(u,by,'ammunition detonated');return}}
  }}
function warBurn(u){if(u.mod.fire||!u.alive)return;u.mod.fire=true;u.fireLeft=rand(14,24);warNote(u,'fire')}
function warDamage(u,dmg,by){if(!u.alive)return;u.hp-=dmg;puff(u.pos.x,u.pos.y+2,u.pos.z,0,4,0,.2,.2,.2,.7,8,10,2.5);if(u.hp<=0)warDie(u,by)}
function warWreck(u){u.burnT=45;if(u.obj.userData.tur){u.obj.userData.tur.position.y+=.25;u.obj.userData.tur.rotation.z=.2}
  u.obj.traverse(o=>{if(o.isMesh&&o.material&&o.material.color&&!o.material.isMeshBasicMaterial)o.material=o.material.clone(),o.material.color.setHex(0x1b1b1a)})}
// the turret flies off when the ammunition goes up
function warPop(u){const t=u.obj.userData.tur;if(!t||t.parent!==u.obj)return;u.obj.updateMatrixWorld(true);const wp=new V3();t.getWorldPosition(wp);u.obj.remove(t);t.position.copy(wp);t.rotation.set(0,u.heading,0);scene.add(t);
  WAR.debris.push({o:t,vel:new V3(rand(-4,4),rand(16,22),rand(-4,4)),spin:new V3(rand(-1.5,1.5),rand(-1,1),rand(-1.5,1.5)),t:0})}
function warDie(u,by,why){if(!u.alive)return;u.alive=false;const big=why==='ammunition detonated';explode(new V3(u.pos.x,u.pos.y+2,u.pos.z),big);
  if(big)warPop(u);warWreck(u);
  if(by&&by.def)feed((by.team==='blue'?'Blue ':'Red ')+by.def.n+' destroyed '+u.def.n+(why?' ('+why+')':''),u.team==='red'?'kill':'loss');else if(why)feed(u.def.n+': '+why,u.team==='red'?'kill':'loss')}
const warFlags=u=>{const m=u.mod,a=[];if(m.trk)a.push('TRK');if(m.eng)a.push('ENG');if(m.gun)a.push(m.gun>1?'GUN X':'GUN');if(m.tur)a.push('TUR');if(u.def.crew&&m.crew<u.def.crew)a.push('CREW '+m.crew+'/'+u.def.crew);if(m.fire)a.push('FIRE');return a.join(' ')};
function warClear(){for(const u of WAR.units)if(u.team==='blue')scene.remove(u.obj);WAR.units=[];for(const s of WAR.sh){s.on=false;s.m.visible=false}for(const x of WAR.debris)scene.remove(x.o);WAR.debris=[];WAR.on=false}
function updateWar(dt){
  if(!WAR.on)return;
  if(state!=='play'){return}
  WAR.t+=dt;
  for(const x of WAR.debris){if(x.t>6)continue;x.t+=dt;x.vel.y-=9.81*dt;x.o.position.addScaledVector(x.vel,dt);x.o.rotation.x+=x.spin.x*dt;x.o.rotation.y+=x.spin.y*dt;x.o.rotation.z+=x.spin.z*dt;const gh=Math.max(groundH(x.o.position.x,x.o.position.z),0)+.8;if(x.o.position.y<gh){x.o.position.y=gh;x.t=7}}
  for(const u of WAR.units){
    if(!u.alive){if(u.burnT>0){u.burnT-=dt;u.dustT-=dt;if(u.dustT<=0){u.dustT=.35;puff(u.pos.x+rand(-1,1),u.pos.y+2.5,u.pos.z+rand(-1,1),rand(-1,1),rand(6,10),rand(-1,1),.14,.14,.14,.6,rand(5,9),rand(6,12),rand(3,5),-.3)}}continue}
    const d=u.def,m=u.mod;u.cd-=dt;u.scanT-=dt;
    // module effects from damage taken since last frame (also covers your bombs and gun, which only lower hp)
    if(u.hp<u.hpSeen-1e-6){const dl=u.hpSeen-u.hp;u.hpSeen=u.hp;if(u.hp>0)warModules(u,dl,null);if(!u.alive)continue}
    if(m.fire){u.fireT-=dt;u.hp-=.1*dt;u.hpSeen=u.hp;if(u.fireT<=0){u.fireT=.12;const rx=Math.sin(u.heading)*-3,rz=Math.cos(u.heading)*-3;puff(u.pos.x+rx+rand(-.4,.4),u.pos.y+2.4,u.pos.z+rz+rand(-.4,.4),rand(-1,1),rand(4,8),rand(-1,1),1,.55,.15,.9,rand(2,4),rand(3,6),rand(.5,.9),-.3);if(Math.random()<.4)puff(u.pos.x+rx,u.pos.y+3,u.pos.z+rz,rand(-1,1),rand(7,11),rand(-1,1),.12,.12,.12,.65,rand(4,8),rand(6,12),rand(2,4),-.3)}
      u.fireLeft-=dt;if(u.fireLeft<=0){if(m.crew>0&&Math.random()<.55){m.fire=false;feed(d.n+': fire extinguished','info')}else u.fireLeft=8}
      if(u.hp<=0){warDie(u,null,'burned out');continue}}
    if(u.scanT<=0){u.scanT=.8+Math.random()*.5;u.aim=warPick(u);u.los=!u.aim||losClear(new V3(u.pos.x,u.pos.y+2.4,u.pos.z),new V3(u.aim.pos.x,u.aim.pos.y+1.4,u.aim.pos.z))}
    const t=u.aim&&u.aim.alive?u.aim:null;let dist=1e9,wantH=u.team==='blue'?0:Math.PI;
    if(t){const dx=t.pos.x-u.pos.x,dz=t.pos.z-u.pos.z;dist=Math.hypot(dx,dz);wantH=Math.atan2(dx,dz)}
    u.moving=!m.trk&&(!t||dist>d.gun[0]*.78||u.los===false);   // no line of sight (a ridge in between): keep advancing
    const dh=warAng(wantH-u.heading);if(!m.trk)u.heading+=clamp(dh,-dt*.45,dt*.45);u.obj.rotation.y=u.heading;
    if(u.moving&&Math.abs(dh)<.9){const v=d.spd*.5*(m.eng?.45:1);u.pos.x+=Math.sin(u.heading)*v*dt;u.pos.z+=Math.cos(u.heading)*v*dt;u.vel.set(Math.sin(u.heading)*v,0,Math.cos(u.heading)*v);
      u.dustT-=dt;if(u.dustT<=0){u.dustT=.3;puff(u.pos.x-Math.sin(u.heading)*3,u.pos.y+.4,u.pos.z-Math.cos(u.heading)*3,rand(-1,1),rand(1,2.5),rand(-1,1),.55,.5,.4,.35,rand(4,7),rand(5,9),rand(1.5,2.5),-.2)}}
    else u.vel.set(0,0,0);
    u.pos.y=Math.max(groundH(u.pos.x,u.pos.z),0)+.2;
    // turret follows its target (in the hull's frame); the gun elevates and recoils
    const ud=u.obj.userData,tur=ud.tur;let aimed=false;
    if(t&&tur&&tur.parent===u.obj){const want=Math.atan2(t.pos.x-u.pos.x,t.pos.z-u.pos.z)-u.heading,cur=tur.rotation.y,dd=warAng(want-cur);tur.rotation.y=cur+clamp(dd,-dt*1.2*(m.tur?.25:1),dt*1.2*(m.tur?.25:1));aimed=Math.abs(dd)<.06;
      if(ud.gun){const el=Math.atan2(t.pos.y-u.pos.y-1,Math.max(dist,50))+9.81*dist/(2*d.gun[2]*d.gun[2]);ud.gun.rotation.x+=(-clamp(el,-.12,.35)+(m.gun===1?.08:0)-ud.gun.rotation.x)*Math.min(1,dt*5)}}
    if(ud.gun){u.rec=Math.max(0,u.rec-dt*2.5);ud.gun.position.z=d.gz-u.rec*.4}
    const crewK=m.crew>0?d.crew/m.crew:9;
    if(t&&aimed&&u.cd<=0&&m.gun<2&&dist<d.gun[0]&&u.los!==false){u.cd=d.gun[1]*(.9+Math.random()*.25)*(m.gun===1?1.6:1)*crewK;warFire(u,t)}
    // blue anti-aircraft (Gepard, Vulcan, IFV cannons): bursts at the nearest red fighter, with a hit chance that falls off with range
    if(u.team==='blue'&&d.aa){u.aaT=(u.aaT||0)-dt;if(u.aaT<=0){u.aaT=.35+Math.random()*.2;let bt=null,bdd=d.aa[0];for(const e of enemies){if(!e.alive||e.kind!=='fighter'||e.pos.y-u.pos.y<25)continue;const dd=e.pos.distanceTo(u.pos);if(dd<bdd){bdd=dd;bt=e}}
      if(bt){const ux=(bt.pos.x-u.pos.x)/bdd,uy=(bt.pos.y-u.pos.y)/bdd,uz=(bt.pos.z-u.pos.z)/bdd;for(let k=0;k<3;k++)puff(u.pos.x+ux*8*(k+1),u.pos.y+3+uy*8*(k+1),u.pos.z+uz*8*(k+1),ux*900,uy*900,uz*900,1,.8,.35,1,2.4,0,.55);
        if(Math.random()<clamp(1-bdd/d.aa[0],.05,1)*.45*(d.cls==='spaa'?1:.35)*(m.gun>1?0:1))hitAI(bt,d.aa[2],d.n,false)}}}
    // red anti-aircraft: shoot at you inside range, like the AAA guns
    if(u.team==='red'&&d.aa&&m.gun<2&&P.alive&&!P.scramble){const pd=u.pos.distanceTo(P.pos),agl=P.pos.y-Math.max(groundH(P.pos.x,P.pos.z),0);
      if(pd<d.aa[0]&&P.pos.y-u.pos.y<2600&&agl>15){u.airAcc+=dt*d.aa[1]/crewK;while(u.airAcc>=1){u.airAcc--;const tt=pd/970;_c.copy(P.pos).addScaledVector(P.vel,tt).sub(u.pos).normalize();const sp=d.cls==='spaa'?.018:.04;_c.x+=rand(-sp,sp);_c.y+=rand(-sp,sp);_c.z+=rand(-sp,sp);_c.normalize();
        const b=take(eBullets);b.on=true;b.life=3;b.m.visible=true;b.team='red';b.dmg=d.aa[2];b.m.position.copy(u.pos).setY(u.pos.y+3);b.vel.copy(_c).multiplyScalar(970);b.m.quaternion.setFromUnitVectors(ZF,_c)}}
      else u.airAcc=0}
  }
  // shells in flight
  for(const s of WAR.sh){if(!s.on)continue;s.prev.copy(s.m.position);s.vel.y-=9.81*dt;s.m.position.addScaledVector(s.vel,dt);s.life-=dt;
    s.m.quaternion.setFromUnitVectors(ZF,_s1.copy(s.vel).normalize());
    let hit=null;for(const o of WAR.units){if(!o.alive||o.team===s.team)continue;if(distSeg(_s2.set(o.pos.x,o.pos.y+1.4,o.pos.z),s.prev,s.m.position)<5){hit=o;break}}
    if(hit){s.on=false;s.m.visible=false;const p=s.m.position;puff(p.x,p.y,p.z,0,3,0,1,.8,.4,1,10,22,.2);
      hit.hp-=s.dmg;puff(hit.pos.x,hit.pos.y+2,hit.pos.z,0,5,0,.2,.2,.2,.7,9,10,3);
      if(hit.hp<=0&&hit.alive){hit.alive=false;explode(new V3(hit.pos.x,hit.pos.y+2,hit.pos.z),false);warWreck(hit);if(s.owner&&s.owner.def)feed((s.owner.team==='blue'?'Blue ':'Red ')+s.owner.def.n+' destroyed '+hit.def.n,hit.team==='red'?'kill':'loss')}
      else if(hit.alive){hit.hpSeen=hit.hp+s.dmg;}   // the module roll runs next frame
      continue}
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
