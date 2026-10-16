/* ---------------- flight model (shared by player and bandits) ---------------- */
const _f=new V3(),_u=new V3(),_r=new V3(),_vd=new V3(),qa=new THREE.Quaternion();
function newJet(obj,gLim,ac){return {ac:ac||AC_DEFS.F16,obj,pos:obj.position,vel:new V3(),n:1,gLim,qd:0,mach:0,kcas:0,fwd:new V3(0,0,1),up:new V3(0,1,0),right:new V3(-1,0,0)}}
function axes(j){const q=j.obj.quaternion;j.fwd.set(0,0,1).applyQuaternion(q);j.up.set(0,1,0).applyQuaternion(q);j.right.set(-1,0,0).applyQuaternion(q)}
function fly(j,dt,rollIn,pitchIn,yawIn,thr,brake){
  const q=j.obj.quaternion, A=j.ac; j.ci=[rollIn,pitchIn,yawIn||0,thr];
  j.obj.rotateZ(rollIn*A.roll*(j.rollK??1)*clamp(j.qd/9000,A.tvc?.45:.15,1)*dt);
  axes(j);
  if(yawIn){qa.setFromAxisAngle(j.up,-yawIn*.12*dt);q.premultiply(qa);j.vel.applyQuaternion(qa);axes(j)}
  const at=atm(j.pos.y); let v=j.vel.length();
  if(v<5){j.vel.copy(j.fwd).multiplyScalar(5);v=5}
  const qd=.5*at.rho*v*v; j.qd=qd; j.mach=v/at.a; j.kcas=v*Math.sqrt(at.sig)*1.944;
  const MS=j.mass||A.MASS; const nAero=qd*A.S*A.CLMAX/(MS*G); j.nAero=nAero;
  // thrust vectoring (MiG-35 option): the nozzles keep pulling the nose round below ~260 kt, past what the wing alone gives
  const tv=A.tvc&&thr>.3?1+.7*clamp((260-j.kcas)/120,0,1):1;
  const nHi=Math.min(j.gLim,nAero*tv), nLo=Math.max(G_MIN,-nAero*.55*tv);
  const nCmd=pitchIn>=0?1+pitchIn*(j.gLim-1):1+pitchIn*(1-G_MIN);
  j.n+=(clamp(nCmd,nLo,nHi)-j.n)*Math.min(1,dt*7);   // FLCS g-onset
  j.n=clamp(j.n,nLo,nHi);
  const CL=j.n*MS*G/(qd*A.S+1);
  j.alpha=clamp(26*CL/A.CLMAX,-20,45);   // degrees: linear lift curve reaching CLmax at ~26 deg (the F-16 FLCS limits alpha to about 25)
  const over=A.vne?Math.max(0,j.kcas-A.vne)/50:0;   // past the low-level airspeed limit drag climbs steeply
  const D=qd*A.S*(cd0(j.mach,A)*A.cdK*(1+over*over*4)+A.KIND*CL*CL*(CL>A.CLMAX?1+(CL-A.CLMAX)*1.5:1)+(brake?.06:0)+(j.xcd||0));
  const T=thrust(A,thr,at.sig,j.mach,j.pos.y)*(j.thrK??1); j.lastT=T;
  _f.copy(j.fwd).multiplyScalar((T-D)/MS).addScaledVector(j.up,j.n*G); _f.y-=G;
  j.vel.addScaledVector(_f,dt); j.pos.addScaledVector(j.vel,dt); j.pos.addScaledVector(WIND,gust*dt);
  if(j===P&&turbK>0){const agl=j.pos.y-Math.max(groundH(j.pos.x,j.pos.z),0), nearDeck=ovc()&&Math.abs(j.pos.y-DECK_Y)<500?.6:0,
      k=turbK*(clamp(1-(agl-1500)/3500,.25,1)+nearDeck)*clamp(v/120,.3,1.2), t=clock;
    const bp=Math.sin(t*2.7)*.6+Math.sin(t*4.9+1.3)*.3+Math.sin(t*9.1+.7)*.15, br=Math.sin(t*3.3+2.1)*.6+Math.sin(t*6.1+.4)*.3+Math.sin(t*11.3)*.12;
    j.obj.rotateX(bp*.035*k*dt*6); j.obj.rotateZ(br*.05*k*dt*6); axes(j); j.vel.y+=bp*k*2.2*dt*6*.4}
  _vd.copy(j.vel).normalize(); qa.setFromUnitVectors(j.fwd,_vd); q.premultiply(qa); q.normalize();
  axes(j);
}
const bankOf=j=>Math.atan2(-j.right.y,j.up.y);

/* ---------------- time of day and weather ---------------- */
const TIMES={DAY:'day',DUSK:'dusk',NIGHT:'night'}, WXS={CLEAR:'clear',SCATTERED:'scattered clouds',OVERCAST:'overcast',RAIN:'rain and wind'};
var timeOfDay='DAY', weather='SCATTERED';   /* var: read by applyCloudCount before this line runs */ try{if(TIMES[localStorage.getItem('vsTime')])timeOfDay=localStorage.getItem('vsTime');if(WXS[localStorage.getItem('vsWx')])weather=localStorage.getItem('vsWx')}catch(e){}
const DECK_Y=3300;
const deck=new THREE.Mesh(new THREE.PlaneGeometry(70000,70000).rotateX(-Math.PI/2),new THREE.MeshLambertMaterial({color:0xd4d9de,transparent:true,opacity:.97,side:THREE.DoubleSide,depthWrite:true}));
deck.position.y=DECK_Y; deck.visible=false; deck.frustumCulled=false; scene.add(deck);
const stars=(()=>{const n=1500,a=new Float32Array(n*3);for(let i=0;i<n;i++){const u=Math.random(),v=Math.random()*.95+.05,th=u*Math.PI*2,ph=Math.acos(1-v);a[i*3]=Math.sin(ph)*Math.cos(th)*28000;a[i*3+1]=Math.cos(ph)*28000;a[i*3+2]=Math.sin(ph)*Math.sin(th)*28000}
  const g=new THREE.BufferGeometry();g.setAttribute('position',new THREE.BufferAttribute(a,3));const p=new THREE.Points(g,new THREE.PointsMaterial({color:0xffffff,size:2,sizeAttenuation:false,fog:false,transparent:true,opacity:.85}));p.visible=false;p.frustumCulled=false;scene.add(p);return p})();
/* image-based lighting: the sky is rendered into a blurred environment map so metal, canopies and paint pick up sky reflections */
const pmrem=new THREE.PMREMGenerator(renderer), envScene=new THREE.Scene(); envScene.add(new THREE.Mesh(new THREE.SphereGeometry(10,32,16),sky.material)); let envRT=null;
function updateEnvMap(){try{const rt=pmrem.fromScene(envScene,.03);if(envRT)envRT.dispose();envRT=rt;scene.environment=rt.texture;cockScene.environment=rt.texture}catch(e){}}
const glare=new THREE.Sprite(new THREE.SpriteMaterial({map:GLOW_TEX,blending:THREE.AdditiveBlending,depthWrite:false,fog:false,transparent:true,opacity:.5}));
glare.scale.setScalar(9000); glare.renderOrder=0; scene.add(glare);
const jetShadow=new THREE.Mesh(new THREE.PlaneGeometry(1,1).rotateX(-Math.PI/2),new THREE.MeshBasicMaterial({map:radTex([[0,'rgba(0,0,0,.95)'],[.45,'rgba(0,0,0,.7)'],[1,'rgba(0,0,0,0)']]),transparent:true,depthWrite:false,polygonOffset:true,polygonOffsetFactor:-4,opacity:.5}));
jetShadow.renderOrder=1; jetShadow.visible=false; scene.add(jetShadow);
function updateShadow(){
  const gh=Math.max(groundH(P.pos.x,P.pos.z),0), agl=P.pos.y-gh, k=timeOfDay==='NIGHT'||ovc()?.25:1;
  if(!P.alive||agl>700||SUN_DIR.y<.05){jetShadow.visible=false;return}
  const off=Math.min(agl/SUN_DIR.y,3000); const x=P.pos.x-SUN_DIR.x*off, z=P.pos.z-SUN_DIR.z*off;
  jetShadow.visible=true; jetShadow.position.set(x,(onRunway(x,z)?BASE_Y+.2:Math.max(groundH(x,z),0))+.4,z);
  const L=AC.fx?AC.fx.shadow[0]:AC.id.startsWith('SU')?22:AC.id.startsWith('MIG')?17:15, Sp=AC.fx?AC.fx.shadow[1]:AC.id.startsWith('SU')?15:AC.id.startsWith('MIG')?11.4:AC.id.startsWith('GRIPEN')?8.6:9.9, gr=1+agl/250;
  jetShadow.scale.set(Sp*1.1*gr,1,L*1.05*gr); jetShadow.rotation.y=Math.atan2(P.fwd.x,P.fwd.z); jetShadow.material.opacity=.55*k*(1-agl/700)/gr}
const boomLight=new THREE.PointLight(0xffa050,0,2200,2); scene.add(boomLight);
/* rain: streaks in a box around the camera, slanted by your own speed */
const RAIN_N=900, rainPos=new Float32Array(RAIN_N*6), rainOff=new Float32Array(RAIN_N*3);
for(let i=0;i<RAIN_N;i++){rainOff[i*3]=rand(-45,45);rainOff[i*3+1]=rand(-30,30);rainOff[i*3+2]=rand(-45,45)}
const rainGeo=new THREE.BufferGeometry(); rainGeo.setAttribute('position',new THREE.BufferAttribute(rainPos,3).setUsage(THREE.DynamicDrawUsage));
const rain=new THREE.LineSegments(rainGeo,new THREE.LineBasicMaterial({color:0xc8d2dc,transparent:true,opacity:.35,depthWrite:false}));
rain.frustumCulled=false; rain.visible=false; scene.add(rain);
/* thunderstorms: in rain, bolts flash the whole scene in a short stutter, and the thunder arrives after distance / 340 s */
const flashLt=new THREE.AmbientLight(0xdfe8ff,0); scene.add(flashLt);
const LT={next:7,seq:[],t:0,force:false};
function updateLightning(dt){
  if(weather!=='RAIN'||!(state==='play'||state==='menu')){flashLt.intensity=0;LT.seq.length=0;return}
  LT.next-=dt; if(LT.force||LT.next<=0){LT.force=false;LT.next=rand(6,16);LT.t=0;
    LT.seq=[[0,.07,1],[.07,.13,0],[.13,.3,.7],[.3,.38,0],[.38,.46,.5]];                 // [from, to, strength] seconds
    const dist=rand(1500,9000);setTimeout(()=>{if(state==='play')sndBoom(clamp(1-dist/11000,.12,.55))},dist/340*1000)}
  let f=0;if(LT.seq.length){LT.t+=dt;for(const [a,b,s] of LT.seq)if(LT.t>=a&&LT.t<b)f=s;if(LT.t>LT.seq[LT.seq.length-1][1])LT.seq.length=0}
  flashLt.intensity=f*1.7*LK;
}
function updateRain(dt){
  const sn=MAP==='ALPINE'; rain.material.color.setHex(sn?0xffffff:0xc8d2dc); rain.material.opacity=sn?.8:.35;
  const on=(weather==='RAIN'||(sn&&weather==='OVERCAST'))&&camera.position.y<DECK_Y&&(state==='play'||state==='menu'||state==='paused'||state==='replay'); rain.visible=on; if(!on)return;
  const vx=-P.vel.x+WIND.x, vy=(sn?-2.2:-9)-P.vel.y, vz=-P.vel.z+WIND.z, sp=Math.hypot(vx,vy,vz)||1, L=sn?Math.min(2.2,.2+sp*.007):Math.min(14,1.5+sp*.035), c=camera.position;
  for(let i=0;i<RAIN_N;i++){let x=rainOff[i*3]+vx*dt,y=rainOff[i*3+1]+vy*dt,z=rainOff[i*3+2]+vz*dt;
    x=((x+45)%90+90)%90-45; y=((y+30)%60+60)%60-30; z=((z+45)%90+90)%90-45; rainOff[i*3]=x;rainOff[i*3+1]=y;rainOff[i*3+2]=z;
    const j=i*6; rainPos[j]=c.x+x;rainPos[j+1]=c.y+y;rainPos[j+2]=c.z+z; rainPos[j+3]=c.x+x-vx/sp*L;rainPos[j+4]=c.y+y-vy/sp*L;rainPos[j+5]=c.z+z-vz/sp*L}
  rainGeo.attributes.position.needsUpdate=true}
function applyEnv(){
  const E={DAY:{top:0x2558a8,hor:0xc9dce8,bot:0x8fa6b0,sun:[-.5,.62,.6],sc:0xfff0d8,si:1.1,hi:.9,cl:1,glow:0xfff1d6,deep:0x15475f,ct:[1,1,1],glare:.5},
           DUSK:{top:0x22305a,hor:0xd9946e,bot:0x5d5054,sun:[-.9,.09,.42],sc:0xffa860,si:.9,hi:.5,cl:.9,glow:0xff7a30,deep:0x1d2a38,ct:[1,.86,.76],glare:.85},
           NIGHT:{top:0x02050c,hor:0x0c1626,bot:0x05080c,sun:[.4,.55,-.7],sc:0x9fb4d8,si:.18,hi:.16,cl:.28,glow:0x1a2a48,deep:0x03070d,ct:[.85,.9,1],glare:.12}}[timeOfDay];
  const u=sky.material.uniforms; u.top.value.setHex(E.top); u.hor.value.setHex(E.hor); u.bot.value.setHex(E.bot); u.glow.value.setHex(E.glow); u.disk.value=timeOfDay==='NIGHT'?.35:1;
  SUN_DIR.set(...E.sun).normalize(); sun.position.copy(SUN_DIR); sun.color.setHex(E.sc);
  const oc=ovc();
  sun.intensity=E.si*LK*(oc?.55:1)*(weather==='RAIN'?.75:1); hemi.intensity=E.hi*LK*(oc?.8:1)*(weather==='RAIN'?.85:1);
  {const sp={CLEAR:3,SCATTERED:7,OVERCAST:11,RAIN:15}[weather]||7,a=Math.random()*Math.PI*2;WIND.set(Math.sin(a)*sp,0,Math.cos(a)*sp);turbK={CLEAR:.12,SCATTERED:.3,OVERCAST:.55,RAIN:.9}[weather]||.3}
  rain.visible=false;
  scene.background=new THREE.Color(E.hor); scene.fog.color.setHex(E.hor); scene.fog.far=weather==='RAIN'?9000:oc?14000:16800; scene.fog.near=weather==='RAIN'?900:oc?2500:4000;
  cloudMats.forEach(m=>m.color.setRGB(E.cl*E.ct[0],E.cl*E.ct[1],E.cl*E.ct[2]));
  deck.material.color.setScalar(.84*E.cl); deck.visible=oc;
  stars.visible=timeOfDay==='NIGHT'&&!oc;
  const wu=waterMat.uniforms; wu.sunDir.value.copy(SUN_DIR); wu.sunCol.value.setHex(E.sc); wu.deep.value.setHex(E.deep); wu.skyc.value.setHex(E.hor); wu.skyt.value.setHex(E.top); wu.shine.value=oc?.15:timeOfDay==='NIGHT'?.35:1;
  glare.material.opacity=oc?0:E.glare; glare.material.color.setHex(E.sc);
  updateEnvMap();
  if(weather==='RAIN')scene.background.multiplyScalar(.82),scene.fog.color.multiplyScalar(.82),sky.material.uniforms.hor.value.multiplyScalar(.82),sky.material.uniforms.top.value.lerp(sky.material.uniforms.hor.value,.6);
  townLights.visible=timeOfDay!=='DAY'; townLights.material.opacity=timeOfDay==='NIGHT'?(oc?.45:.95):.35;
  if(rwyLights){rwyLights.material.opacity=timeOfDay==='NIGHT'?1:timeOfDay==='DUSK'?.8:.45;rwyLights.material.size=timeOfDay==='NIGHT'?3.2:2.2}
  if(MAP==='DESERT'){const dc=new THREE.Color(timeOfDay==='NIGHT'?0x1a1612:0xd8c39b);scene.fog.color.lerp(dc,.45);scene.background.copy(scene.fog.color);sky.material.uniforms.hor.value.lerp(dc,.4);scene.fog.far*=.78;scene.fog.near*=.6;updateEnvMap()}
  if(MAP==='OCEAN'){WIND.multiplyScalar(1.6);turbK+=.1}
  if(typeof TERR_U!=='undefined')TERR_U.mapId.value=MAP_ID[MAP]||0;
  applyCloudCount();
  if(typeof syncSensors==='function')syncSensors();
  $('bTime').textContent='Time: '+TIMES[timeOfDay]; $('bWx').textContent='Weather: '+(MAP==='ALPINE'&&(weather==='RAIN'||weather==='OVERCAST')?(weather==='RAIN'?'blizzard':'snow'):WXS[weather]); $('bMap').textContent='Map: '+MAPS[MAP];
}
// heat-seekers can't see through cloud, and one looking near the sun can lock onto it instead
function irBlocked(a,b){
  if(ovc()&&(a.y-DECK_Y)*(b.y-DECK_Y)<0)return true;
  if(weather==='SCATTERED')for(const cl of clouds){if(!cl.visible)continue;if(Math.abs(cl.position.y-(a.y+b.y)/2)>2500)continue;if(distSeg(cl.position,a,b)<360)return true}
  return false;
}
function irEnv(m,tg,dt){   // returns a miss reason or ''
  m.envT=(m.envT||0)-dt; if(m.envT>0)return ''; m.envT=.25;
  if(irBlocked(m.m.position,tg.pos))return 'LOST THE TARGET IN CLOUD';
  if(weather==='RAIN'&&m.m.position.distanceTo(tg.pos)>3500&&Math.random()<.12)return 'LOST THE TARGET IN RAIN';
  if(timeOfDay!=='NIGHT'&&weather!=='OVERCAST'){_s1.subVectors(tg.pos,m.m.position).normalize(); if(_s1.angleTo(SUN_DIR)<.14&&Math.random()<.35)return 'SEEKER LOCKED ONTO THE SUN'}
  return '';
}
$('bVoice').textContent='Voice warnings: '+(VOICE.on?'on':'off');
$('bVoice').addEventListener('click',()=>{VOICE.on=!VOICE.on;try{localStorage.setItem('vsVoice',VOICE.on?'1':'0')}catch(e){};$('bVoice').textContent='Voice warnings: '+(VOICE.on?'on':'off');if(VOICE.on){pickVoices();say('lock',0)}});
$('bTime').addEventListener('click',()=>{const k=Object.keys(TIMES);timeOfDay=k[(k.indexOf(timeOfDay)+1)%k.length];try{localStorage.setItem('vsTime',timeOfDay)}catch(e){};applyEnv()});
$('bMap').addEventListener('click',()=>{const k=Object.keys(MAPS);MAP=k[(k.indexOf(MAP)+1)%k.length];weather=MAP_WX[MAP];try{localStorage.setItem('vsMap',MAP);localStorage.setItem('vsWx',weather)}catch(e){};tCx=NaN;applyEnv()});
$('bKc').addEventListener('click',()=>{KC.on=!KC.on;try{localStorage.setItem('vsKillCam',KC.on?'1':'0')}catch(e){};$('bKc').textContent='Kill cam: '+(KC.on?'on':'off')});
$('bWx').addEventListener('click',()=>{const k=Object.keys(WXS);weather=k[(k.indexOf(weather)+1)%k.length];try{localStorage.setItem('vsWx',weather)}catch(e){};applyEnv()});

/* ---------------- airbase ---------------- */
const base=new THREE.Group(); scene.add(base);
{const rwTex=(()=>{const cv=document.createElement('canvas');cv.width=64;cv.height=1024;const c=cv.getContext('2d');
    c.fillStyle='#3b3e42';c.fillRect(0,0,64,1024);
    {let r=7;const rnd=()=>(r=(r*16807)%2147483647)/2147483647;                                   // weathered concrete: grain, slab joints, patches, rubber and oil
      for(let i=0;i<2600;i++){c.fillStyle='rgba('+(rnd()<.5?'255,255,255':'0,0,0')+','+(.03+rnd()*.07)+')';c.fillRect(rnd()*64,rnd()*1024,1+rnd()*2,1+rnd()*2)}
      for(let i=0;i<14;i++){c.fillStyle='rgba('+(rnd()<.5?'70,72,76':'28,30,32')+',.22)';c.fillRect(rnd()*40,rnd()*980,6+rnd()*18,10+rnd()*40)}
      c.fillStyle='rgba(0,0,0,.35)';for(let y=64;y<1024;y+=128)c.fillRect(0,y,64,1);c.fillRect(31,0,1,1024);
      for(const y0 of [70,800]){for(const x0 of [20,40]){for(let k=0;k<5;k++){c.fillStyle='rgba(8,8,10,'+(.16+rnd()*.14)+')';c.fillRect(x0+rnd()*5-2,y0+k*28+rnd()*10,3+rnd()*4,18+rnd()*34)}}}
      for(let i=0;i<4;i++){c.fillStyle='rgba(15,12,10,.18)';c.beginPath();c.ellipse(24+rnd()*16,300+rnd()*420,2+rnd()*3,5+rnd()*9,0,0,6.3);c.fill()}}
    c.fillStyle='#e8e8e2';
    for(const y of [190,806]){c.fillRect(14,y,12,34);c.fillRect(38,y,12,34)}                          // aiming-point bars
    for(const y of [250,300,350,400,606,656,706,756])for(const s of [-1,1]){c.fillRect(32+s*14-3,y,6,18);c.fillRect(32+s*22-3,y,6,18)}   // touchdown-zone bars
    for(let y=60;y<964;y+=40)c.fillRect(30,y,4,22);           // centreline
    c.fillRect(2,0,3,1024);c.fillRect(59,0,3,1024);            // edges
    for(const y of [6,1000])for(let x=6;x<58;x+=7)c.fillRect(x,y,4,16);   // threshold bars
    const t=new THREE.CanvasTexture(cv);t.anisotropy=8;return t})();
  const rw=new THREE.Mesh(new THREE.PlaneGeometry(RWY.w,RWY.z1-RWY.z0).rotateX(-Math.PI/2),new THREE.MeshLambertMaterial({map:rwTex}));
  rw.position.set(RWY.x,BASE_Y+.15,0); base.add(rw);
  const tw=new THREE.Mesh(new THREE.PlaneGeometry(22,RWY.z1-RWY.z0-400).rotateX(-Math.PI/2),new THREE.MeshLambertMaterial({color:0x4a4d50}));
  tw.position.set(RWY.x+140,BASE_Y+.12,0); base.add(tw);
  const apron=new THREE.Mesh(new THREE.PlaneGeometry(260,420).rotateX(-Math.PI/2),new THREE.MeshLambertMaterial({color:0x55585b}));
  apron.position.set(RWY.x+290,BASE_Y+.1,-200); base.add(apron);
  const bm=new THREE.MeshLambertMaterial({color:0x7c8172}), dm=new THREE.MeshLambertMaterial({color:0x5d6158});
  for(let i=0;i<4;i++){const h=new THREE.Mesh(new THREE.BoxGeometry(46,14,40),bm);h.position.set(RWY.x+380,BASE_Y+7,-360+i*70);base.add(h)}
  const tower=new THREE.Mesh(new THREE.BoxGeometry(10,26,10),dm);tower.position.set(RWY.x+250,BASE_Y+13,120);base.add(tower);
  const cab=new THREE.Mesh(new THREE.BoxGeometry(14,5,14),new THREE.MeshLambertMaterial({color:0x223038,emissive:0x0a1a24}));cab.position.set(RWY.x+250,BASE_Y+28,120);base.add(cab);
  // edge and threshold lights (bright at night)
  const pts=[],cols=[];for(let z=RWY.z0;z<=RWY.z1;z+=60)for(const x of [-RWY.w/2-1,RWY.w/2+1]){pts.push(RWY.x+x,BASE_Y+.6,z);cols.push(1,.95,.8)}
  for(let x=-RWY.w/2;x<=RWY.w/2;x+=4){pts.push(RWY.x+x,BASE_Y+.6,RWY.z0-4);cols.push(.3,1,.4);pts.push(RWY.x+x,BASE_Y+.6,RWY.z1+4);cols.push(.3,1,.4)}
  const lg=new THREE.BufferGeometry();lg.setAttribute('position',new THREE.Float32BufferAttribute(pts,3));lg.setAttribute('color',new THREE.Float32BufferAttribute(cols,3));
  const rl=new THREE.Points(lg,new THREE.PointsMaterial({size:2.2,vertexColors:true,sizeAttenuation:true,transparent:true,opacity:.5,fog:false}));rl.name='rwyLights';base.add(rl);
}
const rwyLights=base.getObjectByName('rwyLights');
// landing gear (world-scale, added to the player jet)
let gearObj=null;
/* ---------------- landing gear: per-type track, wheel sizes, twin nose wheels, mudguards; animated retraction with doors ---------------- */
// mx: half track, mz: main gear station, mr/nr: main and nose wheel radius, nw: nose wheels, mud: nose mudguard, navy: heavy carrier legs
const GEAR_SPEC={F16:{mx:1.18,mz:-.9,mr:.34,nr:.23,nw:1},F16B70:{mx:1.18,mz:-.9,mr:.35,nr:.23,nw:1},F15C:{mx:1.37,mz:-1.7,mr:.42,nr:.29,nw:1},F15EX:{mx:1.37,mz:-1.7,mr:.43,nr:.3,nw:1},
  FA18E:{mx:1.55,mz:-1.5,mr:.4,nr:.28,nw:2,navy:1},GRIPEN:{mx:1.2,mz:-1.25,mr:.3,nr:.21,nw:2},GRIPENE:{mx:1.27,mz:-1.4,mr:.32,nr:.22,nw:2},TYPHOON:{mx:1.7,mz:-1.3,mr:.35,nr:.25,nw:1},
  RAFALE:{mx:1.35,mz:-1.4,mr:.34,nr:.24,nw:1},J10C:{mx:1.3,mz:-1.4,mr:.35,nr:.25,nw:1},J20:{mx:1.75,mz:-2.0,mr:.43,nr:.3,nw:1},
  MIG29:{mx:1.55,mz:-1.7,mr:.42,nr:.27,nw:2,mud:1},MIG29UPG:{mx:1.55,mz:-1.7,mr:.42,nr:.27,nw:2,mud:1},MIG35:{mx:1.55,mz:-1.7,mr:.43,nr:.28,nw:2,mud:1},MIG29K:{mx:1.6,mz:-1.7,mr:.43,nr:.3,nw:2,mud:1,navy:1},
  SU27:{mx:2.17,mz:-2.4,mr:.52,nr:.34,nw:1,mud:1},SU33:{mx:2.17,mz:-2.4,mr:.52,nr:.32,nw:2,mud:1,navy:1},SU35:{mx:2.17,mz:-2.4,mr:.53,nr:.34,nw:1,mud:1}};
function buildGear(){
  if(gearObj)playerJet.remove(gearObj);
  gearObj=new THREE.Group(); gearObj.name='gear';
  const m=new THREE.MeshStandardMaterial({color:0xc8ccd0,roughness:.45,metalness:.5}), ch=new THREE.MeshStandardMaterial({color:0xe8ecef,roughness:.15,metalness:.95}),
    tyre=new THREE.MeshStandardMaterial({color:0x151617,roughness:.92}), hub=new THREE.MeshStandardMaterial({color:0x9da3a8,roughness:.4,metalness:.6}),
    door=new THREE.MeshStandardMaterial({color:new THREE.Color((PAINT[AC.id]||PAINT_DEF).c[0]),roughness:.55,metalness:.15,side:THREE.DoubleSide}), bay=new THREE.MeshStandardMaterial({color:0x2a2c2e,roughness:.8});
  const S=M2[AC.id], G=GEAR_SPEC[AC.id]||{mx:1.2,mz:-1,mr:.35,nr:.24,nw:1}, nz=AC.fx?AC.fx.nz:3.6, legs=[], doors=[];
  const wheel=(r,w)=>{const gw=new THREE.Group();const t=new THREE.Mesh(new THREE.CylinderGeometry(r,r,w,16).rotateZ(Math.PI/2),tyre);gw.add(t);
    const h=new THREE.Mesh(new THREE.CylinderGeometry(r*.55,r*.55,w+.02,10).rotateZ(Math.PI/2),hub);gw.add(h);return gw};
  const leg=(x,z,r,nose)=>{const top=S?bellyAt(S,z,x)+.15:-.5, wy=-GEAR_H+r, L=top-wy, th=(G.navy?1.5:1)*(nose?.07:.09);
    const gl=new THREE.Group(); gl.position.set(x,top,z); gearObj.add(gl);
    const st=new THREE.Mesh(new THREE.CylinderGeometry(th,th,L*.62,8),m); st.position.y=-L*.31; gl.add(st);
    const ol=new THREE.Mesh(new THREE.CylinderGeometry(th*.7,th*.7,L*.45,8),ch); ol.position.y=-L*.72; gl.add(ol);
    const tl=new THREE.Mesh(new THREE.BoxGeometry(.04,L*.22,.16),m); tl.position.set(0,-L*.66,nose?-.1:.12); tl.rotation.x=nose?.35:-.35; gl.add(tl);
    if(G.navy){const br=new THREE.Mesh(new THREE.CylinderGeometry(th*.6,th*.6,L*.75,6),m);br.position.set(0,-L*.4,nose?.0:-.32);br.rotation.x=nose?0:.5;gl.add(br)}
    const n=nose?G.nw:1, w=nose?r*.55:r*.65;
    for(let i=0;i<n;i++){const wh=wheel(r,w);wh.position.set(n>1?(i?-1:1)*(w*.5+th+.02):x>0?-th-w*.5+.0:x<0?th+w*.5:0,-L,0);if(!nose)wh.position.x=0;gl.add(wh)}
    if(nose&&G.mud){const mg=new THREE.Mesh(new THREE.CylinderGeometry(r*1.18,r*1.18,(n>1?w*2+th*2+.1:w+.12),14,1,true,-Math.PI*.15,Math.PI*1.1).rotateZ(Math.PI/2),door);mg.position.y=-L;gl.add(mg)}
    if(nose){const ll=new THREE.Mesh(new THREE.SphereGeometry(.07,8,6),new THREE.MeshBasicMaterial({color:0xfff6dd}));ll.name='llight';ll.position.set(0,-L*.55,.16);gl.add(ll)}
    legs.push({o:gl,nose,s:Math.sign(x)});
    // bay and door(s)
    const bl=Math.min(L*.95,nose?1.6:2.2), bw=nose?.32:.55;
    const b=new THREE.Mesh(new THREE.PlaneGeometry(bw,bl).rotateX(Math.PI/2),bay); b.position.set(x,top-.13,z-(nose?bl*.45:0)); gearObj.add(b); doors.push({o:b,bay:1});
    for(const sd of nose?[1,-1]:[x>0?1:-1]){const dg=new THREE.Group();dg.position.set(x+sd*bw*.5,top-.14,z-(nose?bl*.45:0));const d=new THREE.Mesh(new THREE.BoxGeometry(.02,bw*(nose?.9:1.1),bl),door);d.position.y=-bw*(nose?.45:.55);dg.add(d);gearObj.add(dg);doors.push({o:dg,s:sd})}};
  leg(0,nz,G.nr,true); leg(G.mx,G.mz,G.mr,false); leg(-G.mx,G.mz,G.mr,false);
  gearObj.userData={legs,doors}; gearObj.__legs=legs; gearObj.__doors=doors;
  P.gearT=P.gear?1:0; animGear(0); playerJet.add(gearObj);
}
function animGear(dt){if(!gearObj||!gearObj.__legs)return;const tgt=P.gear?1:0, was=P.gearT??tgt;P.gearT=was+clamp(tgt-was,-dt/3.2,dt/3.2);const t=P.gearT;
  if(dt&&Math.abs(tgt-was)>1e-3&&!P.gearSnd){P.gearSnd=1;sndGearCycle()} if(Math.abs(tgt-t)<1e-3)P.gearSnd=0;
  gearObj.visible=t>.002;
  for(const L of gearObj.__legs){const f=1-t;if(L.nose)L.o.rotation.set(-f*1.62,0,0);else L.o.rotation.set(0,0,-L.s*f*1.5)}
  const dOpen=t>.001&&t<.999?1:t>=.999?.85:0;
  for(const D of gearObj.__doors){if(D.bay){D.o.visible=t>.02;continue}D.o.visible=t>.002;D.o.rotation.z=D.s*(dOpen*1.45)}
  const ll=gearObj.getObjectByName('llight');if(ll)ll.visible=t>.98&&timeOfDay!=='DAY'}
function sndGearCycle(){if(!A.ctx||!A.on)return;const c=A.ctx,t=c.currentTime,o=c.createOscillator();o.type='sawtooth';o.frequency.setValueAtTime(140,t);o.frequency.linearRampToValueAtTime(190,t+2.6);
  const f=c.createBiquadFilter();f.type='bandpass';f.frequency.value=600;const g=c.createGain();g.gain.setValueAtTime(0,t);g.gain.linearRampToValueAtTime(.025,t+.3);g.gain.setValueAtTime(.025,t+2.6);g.gain.linearRampToValueAtTime(0,t+3.1);
  o.connect(f).connect(g).connect(A.master);o.start(t);o.stop(t+3.2);setTimeout(()=>sndNoise(.12,300,.25),3100)}

/* ---------------- battle damage you can see: holes and scorch, wrecks that fall burning, tails that break off ---------------- */
const HOLE_MAT=new THREE.MeshBasicMaterial({map:radTex([[0,'rgba(0,0,0,1)'],[.32,'rgba(10,8,6,.95)'],[.55,'rgba(40,32,24,.6)'],[1,'rgba(30,25,20,0)']]),transparent:true,depthWrite:false,polygonOffset:true,polygonOffsetFactor:-3,polygonOffsetUnits:-3,side:THREE.DoubleSide});
const HOLE_GEO=new THREE.CircleGeometry(1,12);
function addHole(obj,n){if(!obj)return;const g=obj.children[0]||obj;if(!g.__skin){g.__skin=[];g.traverse(o=>{if(o.isMesh&&o.material&&o.material.userData&&o.material.userData.paint)g.__skin.push(o)})}
  if(!g.__skin.length)return; g.__holes=g.__holes||0;
  for(let k=0;k<(n||1)&&g.__holes<14;k++){const ms=g.__skin[Math.random()*g.__skin.length|0],pa=ms.geometry.attributes.position,na=ms.geometry.attributes.normal,i=Math.random()*pa.count|0;
    const h=new THREE.Mesh(HOLE_GEO,HOLE_MAT);h.name='hole';const p=new THREE.Vector3().fromBufferAttribute(pa,i),nn=new THREE.Vector3().fromBufferAttribute(na,i).normalize();
    h.position.copy(p).addScaledVector(nn,.02);h.lookAt(_hv.copy(h.position).add(nn));h.scale.setScalar(rand(.12,.3));ms.add(h);g.__holes++}}
const _hv=new THREE.Vector3();
const WRECKS=[];
function spawnWreck(e){if(!e.obj||WRECKS.length>8)return;const obj=e.obj;scene.add(obj);
  const w={o:obj,vel:e.vel.clone(),spin:new V3(rand(-1.2,1.2),rand(-.4,.4),rand(-2.5,2.5)),t:0,parts:[]};
  addHole(obj,5);
  const g=obj.children[0];
  if(g&&e.kind==='fighter'&&Math.random()<.65){const tail=new THREE.Group();scene.add(tail);obj.updateMatrixWorld(true);
    const tz=Math.min(...(obj.userData.spec?obj.userData.spec.noz.map(n=>n[2]):[-6]))+3.2;
    const pick=[];g.children.forEach(o=>{if(o.name==='finG'||(o.name==='cs'&&o.userData&&o.userData.cs==='stab')||o.name==='nozG'||o.name==='flame')pick.push(o)});
    if(pick.length){pick.forEach(o=>tail.attach(o));w.parts.push({o:tail,vel:e.vel.clone().add(new V3(rand(-15,15),rand(5,20),rand(-15,15))),spin:new V3(rand(-4,4),rand(-4,4),rand(-4,4))})}
    else scene.remove(tail)}
  WRECKS.push(w)}
function updateWrecks(dt){for(let i=WRECKS.length-1;i>=0;i--){const w=WRECKS[i];w.t+=dt;
    const step=(o,vel,spin,fire)=>{vel.y-=G*dt;vel.multiplyScalar(Math.exp(-dt*.25));o.position.addScaledVector(vel,dt);o.rotateX(spin.x*dt);o.rotateY(spin.y*dt);o.rotateZ(spin.z*dt);
      if(fire&&QUALS[quality].fx&&Math.random()<.85){const p=o.position;puff(p.x,p.y,p.z,rand(-2,2),rand(0,3),rand(-2,2),1,rand(.4,.65),.12,.9,rand(4,7),3,.25);
        const s=rand(.06,.14);puff(p.x,p.y,p.z,vel.x*.1,vel.y*.1+3,vel.z*.1,s,s,s,.7,6,18,3.5)}
      return o.position.y<Math.max(groundH(o.position.x,o.position.z),0)+2};
    let gone=step(w.o,w.vel,w.spin,true)||w.t>16;
    for(const p of w.parts){if(p.done)continue;if(step(p.o,p.vel,p.spin,Math.random()<.4)||w.t>16){p.done=1;scene.remove(p.o);if(w.t<16)explode(p.o.position,false,true)}}
    if(gone){if(w.t<16)explode(w.o.position.clone().setY(Math.max(w.o.position.y,Math.max(groundH(w.o.position.x,w.o.position.z),0)+3)),true,true);scene.remove(w.o);w.parts.forEach(p=>scene.remove(p.o));WRECKS.splice(i,1)}}}
function clearWrecks(){for(const w of WRECKS){scene.remove(w.o);w.parts.forEach(p=>scene.remove(p.o))}WRECKS.length=0}

/* ---------------- lighting: canopy sun glint (also how you spot a distant jet), flare light, soft self-shadows on High ---------------- */
const GLINTS=[];for(let i=0;i<10;i++){const s=new THREE.Sprite(new THREE.SpriteMaterial({map:GLOW_TEX,color:0xfff6e0,blending:THREE.AdditiveBlending,depthWrite:false,depthTest:true,transparent:true,fog:false}));s.visible=false;s.renderOrder=3;scene.add(s);GLINTS.push(s)}
const _gl=new THREE.Vector3(),_gn=new THREE.Vector3(),_gv=new THREE.Vector3();
function updateGlints(){let k=0;const day=timeOfDay!=='NIGHT'&&!ovc()&&SUN_DIR.y>0, cock=VIEWS[view]==='COCKPIT';
  if(day){const list=[];if(!cock&&P.alive&&playerJet.visible)list.push(P);for(const e of enemies)if(e.alive&&e.kind==='fighter')list.push(e);for(const f of friends)if(f.alive&&f.kind==='fighter')list.push(f);
    for(const j of list){if(k>=GLINTS.length)break;const S=M2[j===P?AC.id:j.type];if(!S)continue;
      _gl.copy(j.pos).addScaledVector(j.up,S.canopy[1]+S.canopy[3]*.6).addScaledVector(j.fwd,S.canopy[0]);const d=_gl.distanceTo(camera.position);if(d>14000||d<6)continue;
      _gv.subVectors(camera.position,_gl).divideScalar(d);_gn.copy(j.up).multiplyScalar(.85).addScaledVector(j.fwd,.25).normalize();
      const rr=_gn.multiplyScalar(2*_gn.dot(SUN_DIR)).sub(SUN_DIR),a=Math.pow(Math.max(rr.dot(_gv),0),70);if(a<.05)continue;
      const s=GLINTS[k++];s.visible=true;s.position.copy(_gl).addScaledVector(_gv,1.2);s.scale.setScalar(Math.max(1.6,d*.009)*(.5+a));s.material.opacity=Math.min(1,a*1.4)}}
  for(;k<GLINTS.length;k++)GLINTS[k].visible=false}
const flareLight=new THREE.PointLight(0xffd090,0,600,2);scene.add(flareLight);
function updateFlareLight(){let best=null,bd=1e9;for(const o of CM.objs)if(o.type==='flare'&&o.alive){const d=o.pos.distanceTo(camera.position);if(d<bd){bd=d;best=o}}
  if(best&&bd<900){flareLight.position.copy(best.pos);flareLight.intensity=LK*(timeOfDay==='NIGHT'?3:1.4)*(.8+Math.random()*.4)*clamp(best.life/1.5,0,1)}else flareLight.intensity=0}
function setShadows(on){renderer.shadowMap.enabled=on;renderer.shadowMap.type=THREE.PCFSoftShadowMap;sun.castShadow=on;
  if(on){sun.shadow.mapSize.set(1024,1024);const c=sun.shadow.camera;c.left=c.bottom=-15;c.right=c.top=15;c.near=1;c.far=200;c.updateProjectionMatrix();sun.shadow.bias=-.0006;sun.shadow.normalBias=.03;sun.target=playerJet}
  else sun.target=new THREE.Object3D();
  playerJet.traverse(o=>{if(o.isMesh&&!(o.material&&(o.material.transparent||o.material.blending===THREE.AdditiveBlending))){o.castShadow=on;o.receiveShadow=on}});
  scene.traverse(o=>{if(o.material)o.material.needsUpdate=true})}
function shadowFollow(){if(!sun.castShadow)return;sun.position.copy(playerJet.position).addScaledVector(SUN_DIR,100)}

/* ---------------- kill cam: when your missile is about to arrive, time slows and the camera rides behind it into the target ---------------- */
var KC={on:true,t:0,m:null,tg:null,hold:0,cd:0,slow:1,pos:new THREE.Vector3(),last:new THREE.Vector3()};
try{KC.on=localStorage.getItem('vsKillCam')!=='0'}catch(e){}
function killCamWatch(dt){KC.cd=Math.max(0,KC.cd-dt);
  if(KC.t>0){KC.t+=dt; const m=KC.m;
    if(m&&m.on){KC.last.copy(m.m.position)} else if(!KC.hold)KC.hold=KC.t;
    if((KC.hold&&KC.t-KC.hold>1.3)||KC.t>5||state!=='play'||!P.alive)endKillCam();
    return}
  if(!KC.on||KC.cd>0||state!=='play'||!P.alive||P.onGround)return;
  for(const e of eMissiles)if(e.on&&e.target===P&&e.m.position.distanceTo(P.pos)<8000)return;
  for(const m of missiles){if(!m.on||!m.target||!m.target.alive||!m.target.kind)continue;const d=m.m.position.distanceTo(m.target.pos);
    const cl=-_hv.subVectors(m.target.pos,m.m.position).normalize().dot(_gv.subVectors(m.target.vel||m.vel,m.vel));
    if(d<700&&cl>150&&d/cl<1.6&&!m.reason){KC.t=1e-3;KC.m=m;KC.tg=m.target;KC.hold=0;KC.slow=.28;KC.last.copy(m.m.position);$('kcTag').hidden=false;$('hud').style.visibility='hidden';$('ctrls').style.visibility='hidden';
      KC.pos.copy(m.m.position).addScaledVector(_hv.copy(m.vel).normalize(),-28).add(_gv.set(0,6,0));break}}}
function endKillCam(){KC.t=0;KC.m=null;KC.tg=null;KC.slow=1;KC.cd=6;$('kcTag').hidden=true;$('hud').style.visibility='';$('ctrls').style.visibility='';camSnap=true}
function killCamCamera(dt){if(!(KC.t>0))return false;const m=KC.m,tg=KC.tg,p=m&&m.on?m.m.position:KC.last;
  if(m&&m.on){_hv.copy(m.vel).normalize();_gl.copy(p).addScaledVector(_hv,-24).add(_gv.set(0,4.5,0))}else _gl.copy(KC.pos);
  KC.pos.lerp(_gl,1-Math.exp(-dt*6));camera.position.copy(KC.pos);camera.up.set(0,1,0);camera.lookAt(tg&&(tg.alive||KC.hold)?(tg.pos||p):p);return true}

/* ---------------- sound: per-engine character, fly-bys with Doppler, sonic booms ---------------- */
// howl: a narrow resonant tone (the AL-31F's famous howl, the F110's growl), whine: compressor whine level
const ENG_SND={F16:{f:40,roar:250,wh:.003,twin:0,howl:[180,.012]},F16B70:{f:39,roar:240,wh:.003,twin:0,howl:[175,.012]},F15C:{f:36,roar:225,wh:.004,twin:1,howl:[160,.01]},F15EX:{f:34,roar:215,wh:.004,twin:1,howl:[150,.012]},
  FA18E:{f:38,roar:240,wh:.006,twin:1,howl:[210,.01]},GRIPEN:{f:52,roar:330,wh:.014,twin:0,howl:[320,.008]},GRIPENE:{f:48,roar:300,wh:.011,twin:0,howl:[290,.009]},
  TYPHOON:{f:44,roar:290,wh:.012,twin:1,howl:[340,.009]},RAFALE:{f:46,roar:300,wh:.011,twin:1,howl:[300,.009]},J10C:{f:34,roar:220,wh:.005,twin:0,howl:[200,.012]},J20:{f:30,roar:200,wh:.006,twin:1,howl:[190,.012]},
  MIG29:{f:30,roar:200,wh:.004,twin:1,howl:[140,.013]},MIG29UPG:{f:30,roar:200,wh:.004,twin:1,howl:[140,.013]},MIG35:{f:33,roar:215,wh:.005,twin:1,howl:[150,.013]},MIG29K:{f:33,roar:215,wh:.005,twin:1,howl:[150,.013]},
  SU27:{f:27,roar:185,wh:.004,twin:1,howl:[420,.02]},SU33:{f:27,roar:185,wh:.004,twin:1,howl:[410,.02]},SU35:{f:26,roar:180,wh:.006,twin:1,howl:[440,.022]}};
function sndInitExtra(){if(!A.ctx||A.howl)return;const c=A.ctx;
  A.howl=c.createBufferSource();A.howl.buffer=A.noise;A.howl.loop=true;A.howlF=c.createBiquadFilter();A.howlF.type='bandpass';A.howlF.Q.value=18;A.howlF.frequency.value=400;
  A.howlG=c.createGain();A.howlG.gain.value=0;A.howl.connect(A.howlF).connect(A.howlG).connect(A.master);A.howl.start();
  A.wind=c.createBufferSource();A.wind.buffer=A.noise;A.wind.loop=true;A.windF=c.createBiquadFilter();A.windF.type='highpass';A.windF.frequency.value=1200;A.windG=c.createGain();A.windG.gain.value=0;
  A.wind.connect(A.windF).connect(A.windG).connect(A.master);A.wind.start()}
function sndExtra(){if(!A.ctx)return;sndInitExtra();const t=A.ctx.currentTime,live=(state==='play'||state==='menu')&&(P.thrK??1)>0,s=ENG_SND[AC.id],ab=throttle>.81,k=clamp(P.kcas/700,0,1.2);
  if(s&&s.howl){A.howlF.frequency.setTargetAtTime(s.howl[0]*(.75+Math.min(throttle,.8)*.45+k*.15),t,.25);A.howlG.gain.setTargetAtTime(live?s.howl[1]*(.4+throttle)*(VIEWS[view]==='COCKPIT'?.6:1.3):0,t,.25)}
  A.windG.gain.setTargetAtTime((state==='play'&&P.alive?clamp((P.kcas-120)/600,0,1)*.05*(VIEWS[view]==='COCKPIT'?1:.4):0),t,.3)}
const FLYBY=new Map();
function sndFlyby(){if(!A.ctx||!A.on||state!=='play')return;const cp=camera.position;
  for(const j of enemies.concat(friends)){if(!j.alive||j.kind!=='fighter')continue;const d=j.pos.distanceTo(cp),st=FLYBY.get(j)||{d,near:0,boom:0};
    const closing=st.d-d;
    if(d<420&&closing<0&&!st.near&&j.vel.length()>140){st.near=1;whoosh(clamp(1-d/420,.15,1),j.vel.length())}
    if(d>900)st.near=0;
    if(j.mach>1&&d<1800&&closing<0&&!st.boom){st.boom=1;sonicBoom(clamp(1-d/1800,.2,1))}
    if(d>3500)st.boom=0;st.d=d;FLYBY.set(j,st)}}
function whoosh(v,sp){const c=A.ctx,t=c.currentTime,s=c.createBufferSource();s.buffer=A.noise;const f=c.createBiquadFilter();f.type='bandpass';f.Q.value=1.4;
  f.frequency.setValueAtTime(1500+sp,t);f.frequency.exponentialRampToValueAtTime(220,t+1.6);const g=c.createGain();g.gain.setValueAtTime(.001,t);g.gain.exponentialRampToValueAtTime(.5*v,t+.12);g.gain.exponentialRampToValueAtTime(.001,t+1.9);
  s.connect(f).connect(g).connect(A.master);s.start(t,Math.random(),2)}
function sonicBoom(v){sndNoise(.35,160,1.1*v);setTimeout(()=>sndNoise(.4,150,1.0*v),110);buzz([60,40,80])}

const GEAR_H=1.95;
function setGear(down){P.gear=down; P.xcd=(down?.022:0)+(AC.scd||0)-(P.tanksGone?(AC.tanks||0)*.0025:0); if(!P.alive||state!=='play'||P.onGround)P.gearT=down?1:0; $('nGear').textContent=down?'DOWN':'UP'; $('bGear').classList.toggle('down',down)}
// rolling on the runway: thrust, drag, rolling friction, wheel brakes, nosewheel steering; lift-off once the wing can hold the jet
function groundRoll(dt,rollIn,pitchIn){
  const A=AC, at=atm(P.pos.y); let v=Math.hypot(P.vel.x,P.vel.z);
  const hdg=Math.atan2(P.fwd.x,P.fwd.z)-rollIn*.35*clamp(v/15,0,1)*dt*(v>2?1:0);
  const MS=P.mass||A.MASS, qd=.5*at.rho*v*v, nAero=qd*A.S*A.CLMAX/(MS*G);
  const T=thrust(A,throttle,at.sig,v/at.a,P.pos.y)*(P.thrK??1); P.lastT=T;
  const D=qd*A.S*(cd0(v/at.a,A)*A.cdK+(P.xcd||0)+(brake?.06:0));
  const fr=(brake&&v>.5?.42:.025)*G;   // wheel brakes when BRK is held (wings roll level, so nearly all weight is on the wheels)
  v=Math.max(0,v+((T-D)/MS-fr)*dt);
  P.vel.set(Math.sin(hdg)*v,0,Math.cos(hdg)*v); P.pos.addScaledVector(P.vel,dt); P.pos.y=BASE_Y+GEAR_H;
  playerJet.quaternion.setFromAxisAngle(UP,hdg); axes(P);
  P.n=1; P.qd=qd; P.mach=v/at.a; P.kcas=v*Math.sqrt(at.sig)*1.944; P.nAero=nAero;
  if(pitchIn>.25&&nAero>1.05){P.onGround=false;P.vel.y=2.5+pitchIn*3;P.pos.y+=.4;P.airT=0;message('ROTATE · GEAR UP WHEN CLIMBING',1.6)}
  if(!onRunway(P.pos.x,P.pos.z)){if(v>18){die('landing')}}
  // rearm, refuel and repair after 4 s stopped on the runway
  if(v<1.5){P.stopT=(P.stopT||0)+dt; if(P.stopT>4&&!P.serviced){P.serviced=true;P.fuel=AC.fuelCap;P.hp=100;resetSystems();rearm();CM.flares=cmFlares();CM.chaff=cmChaff();syncCM();
      message('REARMED · REFUELED · REPAIRED',2.2);recEvent('Landed and turned around at the base');if(trainHook)trainHook('stopped')}}
  else {P.stopT=0; if(v>5)P.serviced=false}
}
function checkTouchdown(){
  const g=groundH(P.pos.x,P.pos.z);
  if(P.pos.y>g+GEAR_H||P.onGround||P.vel.y>0)return false;
  const ok=P.gear&&onRunway(P.pos.x,P.pos.z)&&P.vel.y>-4.2&&Math.abs(bankOf(P))<.22&&P.kcas<230&&P.fwd.y>-.12;
  if(!ok){die(P.gear?'landing':'gearup');return true}
  P.onGround=true; const sink=-P.vel.y; P.vel.y=0; P.pos.y=BASE_Y+GEAR_H;
  message(sink<1.5?'GREASED IT':sink<2.8?'TOUCHDOWN':'FIRM TOUCHDOWN',1.6); recEvent('Touched down at '+Math.round(P.kcas)+' kt, sink '+sink.toFixed(1)+' m/s');
  {const dt=dailyAdd('l',1);if(dt)message('DAILY TASK · '+dt,2.6)}
  if(trainHook)trainHook('touchdown'); return true;
}
let startOnRunway=false,startCV=false; try{const v=localStorage.getItem('vsStart');startOnRunway=v==='rwy'||v==='cv';startCV=v==='cv'}catch(e){}
function placeOnRunway(){P.pos.set(RWY.x,BASE_Y+GEAR_H,RWY.z0+120);playerJet.quaternion.identity();P.vel.set(0,0,0);P.onGround=true;P.serviced=true;P.scramble=true;P.scrT=0;
  setGear(true);throttle=0;setThr(0);axes(P);qPrev.copy(playerJet.quaternion);camSnap=true;
  message('SCRAMBLE · ROTATE AT '+rotateKt()+' KT',4)}
// speed where the wing can lift the jet off (same test as groundRoll uses)
function rotateKt(){const MS=P.mass||AC.MASS, at=atm(BASE_Y);return Math.round(Math.sqrt(1.05*MS*G/(.5*at.rho*AC.S*AC.CLMAX))*Math.sqrt(at.sig)*1.944/5+.5)*5}
$('bGear').addEventListener('click',()=>{if(P.onGround){message('WEIGHT ON WHEELS',.8);return}setGear(!P.gear);message(P.gear?'GEAR DOWN':'GEAR UP',.8)});
$('b120D').addEventListener('click',()=>{use120D=!use120D;try{localStorage.setItem('vs120D',use120D?'1':'0')}catch(e){};applyAC()});
$('bR37').addEventListener('click',()=>{suLR=!suLR;try{localStorage.setItem('vsR37',suLR?'1':'0')}catch(e){};applyAC()});
$('bTVC').addEventListener('click',()=>{tvcOn=!tvcOn;try{localStorage.setItem('vsTVC',tvcOn?'1':'0')}catch(e){};applyAC()});
function syncStartLbl(){if(startCV&&!AC.carrier){}$('bStartPos').textContent='Start: '+(!startOnRunway?'in the air':startCV&&AC.carrier?'on the carrier':'on the runway')}
$('bStartPos').addEventListener('click',()=>{if(!startOnRunway){startOnRunway=true;startCV=false}else if(!startCV&&AC.carrier){startCV=true}else{startOnRunway=false;startCV=false}try{localStorage.setItem('vsStart',!startOnRunway?'air':startCV?'cv':'rwy')}catch(e){};syncStartLbl()});
syncStartLbl();
let trainHook=null;
