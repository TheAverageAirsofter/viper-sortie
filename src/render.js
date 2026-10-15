/* ---------------- renderer / scene ---------------- */
const glCanvas=$('gl'), hud=$('hud'), hctx=hud.getContext('2d');
const QUALS={LOW:{dpr:1,seg:110,clouds:16,fx:0,trees:0},MED:{dpr:1.5,seg:150,clouds:30,fx:1,trees:2200},HIGH:{dpr:2,seg:190,clouds:44,fx:2,trees:4500}};
let quality='MED'; try{const q=localStorage.getItem('viperQuality');if(QUALS[q])quality=q}catch(e){}
let DPR=Math.min(window.devicePixelRatio||1,QUALS[quality].dpr);
const renderer=new THREE.WebGLRenderer({canvas:glCanvas,antialias:true,powerPreference:'high-performance'});
renderer.setPixelRatio(DPR); renderer.autoClear=false;
// keep the r128 look on newer three.js: linear output, no colour management, legacy light units
if(THREE.ColorManagement)THREE.ColorManagement.enabled=false; if('outputColorSpace' in renderer)renderer.outputColorSpace=THREE.LinearSRGBColorSpace; if('useLegacyLights' in renderer)renderer.useLegacyLights=true;
// r165+ removed legacy lights: light intensities are pi times lower, so scale ours back up to keep the same look (LK is 1 on older builds)
const LK=('useLegacyLights' in renderer)?1:Math.PI;
const scene=new THREE.Scene();
const HORIZON=new THREE.Color(0xc6d9e5);
scene.background=HORIZON;
scene.fog=new THREE.Fog(HORIZON,4000,19000);
const camera=new THREE.PerspectiveCamera(66,1,1,40000);
const hemi=new THREE.HemisphereLight(0xd6e8ff,0x4d5a3c,0.95*LK); scene.add(hemi);
const sun=new THREE.DirectionalLight(0xfff0d8,1.05*LK); sun.position.set(-0.5,1,0.6); scene.add(sun);
const SUN_DIR=sun.position.clone().normalize();
const sky=new THREE.Mesh(new THREE.SphereGeometry(30000,32,16),new THREE.ShaderMaterial({
  side:THREE.BackSide,depthWrite:false,fog:false,
  uniforms:{top:{value:new THREE.Color(0x2b5fae)},hor:{value:HORIZON},bot:{value:new THREE.Color(0x8fa6b0)},sun:{value:SUN_DIR},glow:{value:new THREE.Color(0xfff2dc)},disk:{value:1}},
  vertexShader:'varying vec3 vD;void main(){vD=normalize(position);gl_Position=projectionMatrix*modelViewMatrix*vec4(position,1.);}',
  /* sky: zenith-to-horizon gradient, a haze band on the horizon, warm scattering toward the sun's side, sun halo and disk */
  fragmentShader:'uniform vec3 top,hor,bot,sun,glow;uniform float disk;varying vec3 vD;void main(){vec3 d=normalize(vD);float h=d.y;float s=max(dot(d,sun),0.);'+
    'vec2 a=normalize(d.xz+1e-4),b=normalize(sun.xz+1e-4);float az=max(dot(a,b),0.);'+
    'vec3 H=mix(hor,glow,pow(az,4.)*.75*(1.-clamp(h*2.5,0.,1.)));'+
    'vec3 c=h>0.?mix(H,top,pow(clamp(h,0.,1.),.42)):mix(H,bot,min(1.,-h*6.));'+
    'c=mix(c,H*1.04+.02,exp(-abs(h)*28.)*.55);'+
    'c+=glow*pow(s,7.)*.32+vec3(1.,.95,.85)*pow(s,64.)*.3*disk;'+
    'c+=vec3(1.,.97,.9)*smoothstep(.99945,.9998,s)*2.2*disk;'+
    'gl_FragColor=linearToOutputTexel(vec4(c,1.));}'
}));
sky.renderOrder=-1; scene.add(sky);
const radTex=(stops)=>{const cv=document.createElement('canvas');cv.width=cv.height=128;const c=cv.getContext('2d');const g=c.createRadialGradient(64,64,0,64,64,64);stops.forEach(([o,col])=>g.addColorStop(o,col));c.fillStyle=g;c.fillRect(0,0,128,128);return new THREE.CanvasTexture(cv)};
const GLOW_TEX=radTex([[0,'rgba(255,255,255,1)'],[.18,'rgba(255,255,255,.55)'],[.5,'rgba(255,255,255,.12)'],[1,'rgba(255,255,255,0)']]);
// afterburner shock diamonds and nozzle glow: added to every jet model's flame; toggled per jet with setAB
const DIA_MAT=new THREE.SpriteMaterial({map:GLOW_TEX,color:0xffd9b0,blending:THREE.AdditiveBlending,depthWrite:false,transparent:true,opacity:.7});
function dressFlames(root){
  const fl=[];root.traverse(o=>{if(o.name==='flame')fl.push(o)});
  for(const f of fl){const ms=[];f.traverse(o=>{if(o.isMesh&&o.material.blending===THREE.AdditiveBlending)ms.push(o)});
    for(const m of ms){m.geometry.computeBoundingBox();const bb=m.geometry.boundingBox,len=bb.max.z-bb.min.z,r=(bb.max.x-bb.min.x)/2,z0=bb.max.z;
      const core=new THREE.Mesh(m.geometry,new THREE.MeshBasicMaterial({color:0xfff2d0,transparent:true,opacity:.7,blending:THREE.AdditiveBlending,depthWrite:false}));core.scale.set(.5,.5,.7);core.name='core';m.add(core);
      const gl=new THREE.Sprite(new THREE.SpriteMaterial({map:GLOW_TEX,color:m.material.color,blending:THREE.AdditiveBlending,depthWrite:false,transparent:true,opacity:.8}));gl.position.z=z0-.2;gl.scale.setScalar(r*5);gl.name='nglow';m.add(gl);
      for(let i=0;i<4;i++){const d=new THREE.Sprite(DIA_MAT);d.position.z=z0-len*(.2+i*.19);d.scale.setScalar(r*(1.5-i*.22));d.name='dia';d.visible=false;m.add(d)}}}
  return root}
function setAB(obj,on){if(!obj)return;if(!obj.__dia){obj.__dia=[];obj.traverse(o=>{if(o.name==='dia')obj.__dia.push(o)})}if(obj.__abOn===on)return;obj.__abOn=on;for(const d of obj.__dia)d.visible=on}

/* ---------------- terrain ---------------- */
/* ---------------- maps ---------------- */
var MAPS={ISLANDS:'islands',DESERT:'desert canyons',ALPINE:'snowy alps',OCEAN:'open ocean'}, MAP='ISLANDS';
try{if(MAPS[localStorage.getItem('vsMap')])MAP=localStorage.getItem('vsMap')}catch(e){}
const MAP_ID={ISLANDS:0,DESERT:1,ALPINE:2,OCEAN:3};
const MAP_WX={ISLANDS:'SCATTERED',DESERT:'CLEAR',ALPINE:'OVERCAST',OCEAN:'SCATTERED'};


// airbase: runway along +z at x=0, terrain flattened around it
const BASE_Y=30, RWY={x:0,z0:-1500,z1:1500,w:45};
function rawH(x,z){
  let h=Math.sin(x*0.0011)*Math.cos(z*0.0013)*230+Math.cos(x*0.00071-z*0.00052)*170
       +Math.sin(x*0.0031+z*0.0021)*80+Math.sin(z*0.0049-x*0.0017)*40-40;
  const r=Math.abs(Math.sin(x*0.00045+Math.cos(z*0.0003)*2));
  h=h+(1-r)*280-90;
  if(MAP==='DESERT'){h=h*.45+235+Math.sin(x*.0062+Math.sin(z*.0021)*2)*12+Math.sin(z*.0047+x*.0013)*8;
    if(h>300){const t=Math.min(1,(h-300)/22);h=300+t*t*(3-2*t)*120+Math.max(0,h-322)*.06}}
  else if(MAP==='ALPINE'){const q=1-Math.abs(Math.sin(x*.00052+Math.cos(z*.00041)*1.7)),q2=1-Math.abs(Math.cos(z*.00063-x*.00029+Math.sin(x*.0002)));h=h*1.5+q*q*900+q2*q2*500-260}
  else if(MAP==='OCEAN')h=(h-330)*1.15;
  return h;
}
function groundH(x,z){const d=Math.hypot(x*1.6,z);
  if(d<2600)return BASE_Y; const h=rawH(x,z); if(d>5200)return h; const t=(d-2600)/2600, s=t*t*(3-2*t); return BASE_Y+(h-BASE_Y)*s}
const onRunway=(x,z)=>Math.abs(x-RWY.x)<RWY.w/2+6&&z>RWY.z0-40&&z<RWY.z1+40;
const TSIZE=36000,TSTEP=800;
let tGeo,tPos,tBase,tCol;
function buildTerrainGeo(seg){
  tGeo=new THREE.PlaneGeometry(TSIZE,TSIZE,seg,seg); tGeo.rotateX(-Math.PI/2);
  tPos=tGeo.attributes.position; tBase=tPos.array.slice();
  tCol=new Float32Array(tPos.count*3); tGeo.setAttribute('color',new THREE.BufferAttribute(tCol,3));
  return tGeo;
}
/* tileable value-noise (3 independent channels), used by the terrain shader and to place forests where the shader paints them */
const NOISE=(()=>{const S=256,P=[4,8,16,32,64],vals=new Float32Array(S*S*3);
  const vn=(per,seed)=>{const g=new Float32Array(per*per);let r=seed;for(let i=0;i<g.length;i++){r=(r*16807)%2147483647;g[i]=r/2147483647}
    return (x,y)=>{const xi=Math.floor(x),yi=Math.floor(y),fx=x-xi,fy=y-yi,u=fx*fx*(3-2*fx),v=fy*fy*(3-2*fy),A=(i,j)=>g[((j%per+per)%per)*per+((i%per+per)%per)];
      return A(xi,yi)*(1-u)*(1-v)+A(xi+1,yi)*u*(1-v)+A(xi,yi+1)*(1-u)*v+A(xi+1,yi+1)*u*v}};
  for(let c=0;c<3;c++){const fs=P.map((p,k)=>vn(p,1234+c*977+k*131));let lo=9,hi=-9;
    for(let y=0;y<S;y++)for(let x=0;x<S;x++){let v=0,amp=.5,tot=0;for(let k=0;k<5;k++){v+=fs[k](x/S*P[k],y/S*P[k])*amp;tot+=amp;amp*=.55}v/=tot;vals[(y*S+x)*3+c]=v;if(v<lo)lo=v;if(v>hi)hi=v}
    for(let i=c;i<vals.length;i+=3)vals[i]=(vals[i]-lo)/(hi-lo)}
  const data=new Uint8Array(S*S*4);for(let i=0;i<S*S;i++){data[i*4]=vals[i*3]*255;data[i*4+1]=vals[i*3+1]*255;data[i*4+2]=vals[i*3+2]*255;data[i*4+3]=255}
  const t=new THREE.DataTexture(data,S,S,THREE.RGBAFormat);t.wrapS=t.wrapT=THREE.RepeatWrapping;t.magFilter=THREE.LinearFilter;t.minFilter=THREE.LinearMipmapLinearFilter;t.generateMipmaps=true;t.needsUpdate=true;
  t.at=(u,v,c)=>{u=(u-Math.floor(u))*S-.5;v=(v-Math.floor(v))*S-.5;const x0=Math.floor(u),y0=Math.floor(v),fx=u-x0,fy=v-y0,R=(x,y)=>vals[((((y%S)+S)%S)*S+(((x%S)+S)%S))*3+c];
    return R(x0,y0)*(1-fx)*(1-fy)+R(x0+1,y0)*fx*(1-fy)+R(x0,y0+1)*(1-fx)*fy+R(x0+1,y0+1)*fx*fy};
  return t})();
/* terrain: smooth-shaded, coloured per pixel from height, slope and noise — beaches, meadows, forest, dry upland, rock, snow */
const terrMat=new THREE.MeshLambertMaterial({color:0xffffff});
const TERR_U={mapId:{value:MAP_ID[MAP]||0}};
terrMat.onBeforeCompile=sh=>{sh.uniforms.nTex={value:NOISE};sh.uniforms.mapId=TERR_U.mapId;
  sh.vertexShader=sh.vertexShader.replace('#include <common>','#include <common>\nvarying vec3 vWPos;varying vec3 vWN;')
    .replace('#include <project_vertex>','#include <project_vertex>\nvWPos=(modelMatrix*vec4(transformed,1.)).xyz;vWN=normalize(mat3(modelMatrix)*objectNormal);');
  sh.fragmentShader=sh.fragmentShader.replace('#include <common>',`#include <common>
uniform sampler2D nTex;uniform float mapId;varying vec3 vWPos;varying vec3 vWN;
vec3 terr(){float h=vWPos.y;float sl=1.-normalize(vWN).y;
 float n1=texture2D(nTex,vWPos.xz/2600.).r,n2=texture2D(nTex,vWPos.xz/530.).g,n3=texture2D(nTex,vWPos.xz/95.).b,n4=texture2D(nTex,vWPos.xz/19.).r;
 if(mapId>.5&&mapId<1.5){vec3 c=mix(vec3(.74,.65,.51),vec3(.69,.58,.44),n2*.6+n1*.4);
   c=mix(c,vec3(.80,.72,.58),smoothstep(.55,.85,n1)*.5);
   vec3 rk=mix(vec3(.60,.39,.25),vec3(.44,.28,.19),.5+.5*sin(h*.16+n3*3.));
   c=mix(c,rk,smoothstep(.16,.3,sl+(n3-.5)*.12));
   c=mix(c,vec3(.45,.43,.28),smoothstep(.78,.9,n4)*smoothstep(.25,.1,sl)*.55);
   c=mix(vec3(.72,.66,.50),c,smoothstep(2.,8.,h));
   return c*(.86+.28*n4*(.55+.45*n3));}
 if(mapId>1.5&&mapId<2.5){vec3 c=mix(vec3(.22,.36,.15),vec3(.33,.42,.19),smoothstep(.3,.72,n2));
   c=mix(c,vec3(.11,.21,.10),smoothstep(.45,.7,n1)*(1.-smoothstep(900.,1150.,h)));
   vec3 rk=mix(vec3(.47,.46,.44),vec3(.30,.30,.30),n3);
   c=mix(c,rk,smoothstep(.22,.38,sl+(n3-.5)*.14));
   c=mix(c,rk,smoothstep(1000.,1250.,h+(n2-.5)*200.));
   c=mix(c,vec3(.94,.96,.99),smoothstep(1150.,1350.,h+(n1-.5)*260.)*smoothstep(.55,.25,sl));
   c=mix(vec3(.55,.52,.45),c,smoothstep(3.,10.,h));
   return c*(.84+.32*n4*(.55+.45*n3));}
 vec3 c=mix(vec3(.25,.39,.16),vec3(.40,.48,.21),smoothstep(.3,.72,n2));
 c=mix(c,vec3(.15,.26,.12),smoothstep(.5,.72,n1)*(1.-smoothstep(260.,380.,h)));
 c=mix(c,vec3(.48,.45,.30),smoothstep(190.,390.,h+(n2-.5)*140.));
 vec3 rk=mix(vec3(.45,.42,.37),vec3(.31,.30,.28),n3);
 c=mix(c,rk,smoothstep(.2,.36,sl+(n3-.5)*.14));
 c=mix(c,rk,smoothstep(400.,480.,h+(n2-.5)*90.));
 c=mix(c,vec3(.93,.95,.98),smoothstep(500.,560.,h+(n1-.5)*100.)*smoothstep(.5,.22,sl));
 c=mix(vec3(.80,.74,.55),c,smoothstep(4.,15.,h+(n3-.5)*9.));
 c*=.84+.32*n4*(.55+.45*n3);
 return c;}`).replace('#include <color_fragment>','#include <color_fragment>\ndiffuseColor.rgb*=terr();')};
const terrain=new THREE.Mesh(buildTerrainGeo(QUALS[quality].seg),terrMat);
terrain.frustumCulled=false; scene.add(terrain);
let tCx=NaN,tCz=NaN;
function updateTerrain(cx,cz){
  tCx=cx;tCz=cz; terrain.position.set(cx,0,cz);
  const a=tPos.array;
  for(let i=0;i<tPos.count;i++){
    const x=tBase[i*3]+cx,z=tBase[i*3+2]+cz,h=groundH(x,z); a[i*3+1]=h;
  }
  tPos.needsUpdate=true; tGeo.computeVertexNormals(); placeTrees(cx,cz);
}
/* water: rolling swell normals, Fresnel sky reflection and a sun glint path */
const waterMat=new THREE.ShaderMaterial({fog:true,
  uniforms:THREE.UniformsUtils.merge([THREE.UniformsLib.fog,{t:{value:0},sunDir:{value:new THREE.Vector3(0,1,0)},sunCol:{value:new THREE.Color(0xfff0d8)},deep:{value:new THREE.Color(0x174a63)},skyc:{value:new THREE.Color(0xc6d9e5)},skyt:{value:new THREE.Color(0x2558a8)},shine:{value:1}}]),
  vertexShader:`varying vec3 vW;
#include <fog_pars_vertex>
void main(){vec4 w=modelMatrix*vec4(position,1.);vW=w.xyz;vec4 mvPosition=viewMatrix*w;gl_Position=projectionMatrix*mvPosition;
#include <fog_vertex>
}`,
  fragmentShader:`uniform float t,shine;uniform vec3 sunDir,sunCol,deep,skyc,skyt;varying vec3 vW;
#include <common>
#include <fog_pars_fragment>
void main(){vec2 p=vW.xz;vec2 g=vec2(0.);
 vec2 q=p+vec2(sin(p.y*.0013),cos(p.x*.0011))*260.;
 g+=vec2(.8,.6)*cos(dot(q,vec2(.8,.6))*.031+t*1.1)*.22;
 g+=vec2(-.5,.86)*cos(dot(q,vec2(-.5,.86))*.057+t*1.7)*.2;
 g+=vec2(.96,-.28)*cos(dot(p,vec2(.96,-.28))*.13+t*2.3)*.18;
 g+=vec2(.2,.98)*cos(dot(q,vec2(.2,.98))*.29+t*3.1)*.13;
 float dist=length(cameraPosition-vW);float hf=1.-smoothstep(600.,2500.,dist);
 g+=vec2(-.9,-.43)*cos(dot(p,vec2(-.9,-.43))*.67+t*4.2)*.09*hf;
 g+=vec2(.6,-.8)*cos(dot(q,vec2(.6,-.8))*1.31+t*5.3)*.06*hf;
float k=.5*clamp(1.-dist/5000.,.06,1.);
 vec3 N=normalize(vec3(-g.x*k,1.,-g.y*k));vec3 V=normalize(cameraPosition-vW);
 float fr=.02+.98*pow(1.-max(dot(N,V),0.),5.);
 vec3 R=reflect(-V,N);vec3 sk=mix(skyc*.94,skyt,clamp(R.y*2.2,0.,1.));
 vec3 c=mix(deep*(.92+.25*g.x),sk,clamp(fr*.9,0.,1.));
 float sd=max(dot(R,sunDir),0.);
 c+=sunCol*(pow(sd,300.)*3.+pow(sd,24.)*.14)*shine;
 gl_FragColor=vec4(c,1.);
#include <fog_fragment>
}`});
const water=new THREE.Mesh(new THREE.PlaneGeometry(TSIZE*1.3,TSIZE*1.3).rotateX(-Math.PI/2),waterMat);
/* forests: instanced conifers placed (deterministically) where the terrain shader paints forest, re-laid when the terrain recentres */
const treeGeo=(()=>{const a=new THREE.ConeGeometry(4.2,13,6);a.translate(0,9.5,0);return a})();
const trees=new THREE.InstancedMesh(treeGeo,new THREE.MeshLambertMaterial({color:0xffffff}),4500);
trees.frustumCulled=false;trees.count=0;scene.add(trees);
{const c=new THREE.Color();for(let i=0;i<4500;i++){c.setRGB(.27+Math.random()*.08,.4+Math.random()*.1,.19+Math.random()*.05);trees.setColorAt(i,c)}trees.instanceColor.needsUpdate=true}
function placeTrees(cx,cz){
  const max=Math.round(QUALS[quality].trees*(MAP==='ALPINE'?1.3:MAP==='OCEAN'?.6:1)); if(!max||MAP==='DESERT'){trees.count=0;trees.instanceMatrix.needsUpdate=true;return}
  const R=3400, cell=Math.round(R*2/Math.sqrt(max*2.2)), m=new THREE.Matrix4(), q=new THREE.Quaternion(), sc=new THREE.Vector3(), ps=new THREE.Vector3(); let n=0;
  const hs=(i,j,k)=>{const v=Math.sin(i*127.1+j*311.7+k*74.7)*43758.5453;return v-Math.floor(v)};
  const i0=Math.floor((cx-R)/cell),i1=Math.floor((cx+R)/cell),j0=Math.floor((cz-R)/cell),j1=Math.floor((cz+R)/cell);
  for(let i=i0;i<=i1&&n<max;i++)for(let j=j0;j<=j1&&n<max;j++){
    const x=(i+hs(i,j,1))*cell, z=(j+hs(i,j,2))*cell;
    if(Math.hypot(x*1.6,z)<3100)continue;
    const f=NOISE.at(x/2600,z/2600,0), p=Math.max(0,Math.min(1,(f-.5)/.2))*.95+.05;
    if(hs(i,j,3)>p)continue;
    const h=groundH(x,z); if(h<14||h>(MAP==='ALPINE'?1080:360))continue;
    if(Math.abs(groundH(x+8,z)-h)>5||Math.abs(groundH(x,z+8)-h)>5)continue;
    const k=.9+hs(i,j,4)*.8; sc.set(k,k*(.85+hs(i,j,5)*.4),k); q.setFromAxisAngle(UP,hs(i,j,6)*6.28); ps.set(x,h-1,z);
    m.compose(ps,q,sc); trees.setMatrixAt(n++,m)}
  trees.count=n; trees.instanceMatrix.needsUpdate=true}
water.frustumCulled=false; scene.add(water);
// soft sprite clouds: a painted puff texture, lit tops and greyer bases
/* cumulus puffs: many soft lobes, sunlit tops and blue-grey shaded bases baked into three texture variants */
const cloudTexs=[0,1,2].map(v=>{const S=256,cv=document.createElement('canvas');cv.width=cv.height=S;const c=cv.getContext('2d');
  const lobes=14+v*4;for(let i=0;i<lobes;i++){const a=Math.random()*Math.PI,rr=Math.random();
    const x=S/2+Math.cos(a)*rr*S*.3*(v===2?1.25:1),y=S*.56-Math.sin(a)*rr*S*.24,r=S*(.1+Math.random()*.13);
    const g=c.createRadialGradient(x,y,0,x,y,r);g.addColorStop(0,'rgba(255,255,255,.62)');g.addColorStop(.55,'rgba(255,255,255,.36)');g.addColorStop(1,'rgba(255,255,255,0)');c.fillStyle=g;c.fillRect(0,0,S,S)}
  c.globalCompositeOperation='source-atop';const sg=c.createLinearGradient(0,S*.25,0,S*.8);sg.addColorStop(0,'rgba(255,252,246,0)');sg.addColorStop(.55,'rgba(205,214,226,.35)');sg.addColorStop(1,'rgba(128,140,160,.85)');
  c.fillStyle=sg;c.fillRect(0,0,S,S);return new THREE.CanvasTexture(cv)});
const cloudMats=[];   // every cloud's materials, recoloured by applyEnv
const clouds=[];
for(let i=0;i<44;i++){
  const c=new THREE.Group(); const n=8+(Math.random()*7|0); const mats=cloudTexs.map(t=>new THREE.SpriteMaterial({map:t,transparent:true,depthWrite:false,opacity:.95}));
  mats.forEach(m=>cloudMats.push(m)); c.userData.mats=mats;
  for(let j=0;j<n;j++){const y=rand(-70,110);const m=new THREE.Sprite(mats[j%3]);const sc=rand(300,680)*(y>40?.8:1.1);m.scale.set(sc*1.45,sc*.8,1);m.position.set(rand(-480,480),y,rand(-340,340));c.add(m)}
  c.position.set(rand(-15000,15000),rand(2600,4200),rand(-15000,15000)); scene.add(c); clouds.push(c);
}
function applyCloudCount(){const w=typeof weather==='string'?weather:'SCATTERED';clouds.forEach((c,i)=>c.visible=w==='CLEAR'?false:(w==='OVERCAST'||w==='RAIN')?i<Math.min(44,QUALS[quality].clouds+14):i<QUALS[quality].clouds)}
applyCloudCount();


/* ---------------- jet model (true scale: 15 m long, 9.9 m span) ---------------- */
// navigation lights: red left wingtip, green right, white tail (what you see of a jet at night)
const NAVM=[new THREE.MeshBasicMaterial({color:0xff2a2a}),new THREE.MeshBasicMaterial({color:0x2aff5a}),new THREE.MeshBasicMaterial({color:0xffffff})], NAVG=new THREE.SphereGeometry(.22,6,4);
function withNav(root,type){const D=AC_DEFS[type];if(D&&D.fx&&D.fx.nav){const [sp,tl,tp]=D.fx.nav;[[sp,0,D.fx.navZ!=null?D.fx.navZ:-3.5,0],[-sp,0,D.fx.navZ!=null?D.fx.navZ:-3.5,1],[0,tp,tl,2]].forEach(([x,y,z,i])=>{const m=new THREE.Mesh(NAVG,NAVM[i]);m.position.set(x,y,z);m.name='nav';root.children[0].add(m)});return root}
  const f=type.startsWith('F16'), span=type.startsWith('MIG')||type.startsWith('SU')?5.7:type.startsWith('GRIPEN')?4.3:6.7,tail=type.startsWith('MIG')||type.startsWith('SU')?-8.6:type.startsWith('GRIPEN')?-6:-7.4;   // F-16 model is built in 0.75-scale units
  [[span,0,f?-2.2:-1.5,0],[-span,0,f?-2.2:-1.5,1],[0,f?3.6:2.6,tail,2]].forEach(([x,y,z,i])=>{const m=new THREE.Mesh(NAVG,NAVM[i]);m.position.set(x,y,z);m.name='nav';root.children[0].add(m)});return root}
function buildJet(c,type){type=type||'F16';const r=withNav(buildJetBase(c,type),type);
  r.traverse(o=>{const m=o.material;if(m&&m.isMeshStandardMaterial&&!m.__ibl){m.__ibl=true;m.envMapIntensity=.75;if(m.roughness>.55){m.roughness=.48;m.metalness=Math.max(m.metalness,.22)}}});
  return dressFlames(r)}
function buildJetBase(c,type){const D=AC_DEFS[type];if(typeof M2!=='undefined'&&M2[type])return buildLoftJet(c,M2[type],type);if(D&&D.model&&MODELS[D.model])return buildParam(c,MODELS[D.model]);if(type==='SU27'||type==='SU35'||type==='SU33')return buildSu(c,type);if(type==='MIG29K')return buildMig29(c,'35');return type==='GRIPEN'?buildGripen(c):type==='GRIPENE'?buildGripen(c,true):type==='F16B70'?buildF16(c,true):type==='MIG29'?buildMig29(c,'A'):type==='MIG29UPG'?buildMig29(c,'UPG'):type==='MIG35'?buildMig29(c,'35'):buildF16(c)}
function buildF16(c,b70){
  const g=new THREE.Group(), root=new THREE.Group(); root.add(g); g.scale.setScalar(.75);
  const body=new THREE.MeshStandardMaterial({color:c.body,roughness:.62,metalness:.1,flatShading:true,side:THREE.DoubleSide});
  const dark=new THREE.MeshStandardMaterial({color:c.dark,roughness:.5,metalness:.3,flatShading:true,side:THREE.DoubleSide});
  const glass=new THREE.MeshStandardMaterial({color:c.glass,roughness:.15,metalness:.55,emissive:c.glassE});
  const white=new THREE.MeshStandardMaterial({color:0xeeeeea,roughness:.5,flatShading:true});
  const add=(geo,mat,x,y,z)=>{const m=new THREE.Mesh(geo,mat);m.position.set(x,y,z);g.add(m);return m};
  let geo=new THREE.CylinderGeometry(1.05,.95,13,10); geo.rotateX(Math.PI/2); add(geo,body,0,0,.5).name='fuse';
  geo=new THREE.ConeGeometry(1.05,5.5,10); geo.rotateX(Math.PI/2); add(geo,body,0,0,9.75);
  geo=new THREE.CylinderGeometry(.05,.05,1.6,4); geo.rotateX(Math.PI/2); add(geo,dark,0,0,13.2);
  const can=add(new THREE.SphereGeometry(1,12,8),glass,0,.95,4.8); can.scale.set(.72,.62,2.4); can.name='canopy';
  add(new THREE.BoxGeometry(.9,.6,8),body,0,.8,-1.2);
  add(new THREE.BoxGeometry(1.7,1.1,3.4),body,0,-1.15,2.3);
  add(new THREE.BoxGeometry(1.45,.85,.2),dark,0,-1.15,4.05);
  add(new THREE.BoxGeometry(1.9,.55,8.5),body,0,-.75,-1.5);
  const plate=(pts,mat,y,depth)=>{for(const s of [1,-1]){
    const sh=new THREE.Shape(); sh.moveTo(pts[0][0]*s,pts[0][1]);
    for(let i=1;i<pts.length;i++) sh.lineTo(pts[i][0]*s,pts[i][1]);
    const eg=new THREE.ExtrudeGeometry(sh,{depth,bevelEnabled:false}); eg.rotateX(Math.PI/2); eg.translate(0,y+depth/2,0);
    g.add(new THREE.Mesh(eg,mat));}};
  plate([[.8,3.2],[6.4,-1.5],[6.4,-2.9],[.8,-4.2]],body,-.1,.22);
  plate([[.9,6.5],[1.9,2.6],[.9,2.6]],body,-.1,.18);
  plate([[.8,-4.8],[3.7,-7.1],[3.7,-7.9],[.8,-7.9]],body,-.2,.16);
  if(b70){ // Block 70: conformal fuel tanks along the upper fuselage; EW is internal, so no pod (IRST pod on the centreline)
    for(const s of [1,-1]){const cft=add(new THREE.BoxGeometry(.75,.55,6.2),body,.75*s,.85,-.2);cft.rotation.z=-.25*s}
    add(new THREE.BoxGeometry(.14,.5,1.4),dark,0,-1.3,.6);
    add(new THREE.CylinderGeometry(.22,.22,3.0,8).rotateX(Math.PI/2),dark,0,-1.75,.6);
    add(new THREE.SphereGeometry(.22,8,6),dark,0,-1.75,2.1);
  } else {
  // ALQ-184 ECM pod on the centreline pylon (station 5)
  add(new THREE.BoxGeometry(.14,.5,1.8),dark,0,-1.3,-.4);
  const pod=add(new THREE.CylinderGeometry(.32,.32,5.2,8).rotateX(Math.PI/2),dark,0,-1.85,-.6); pod.name='ecmPod';
  add(new THREE.ConeGeometry(.32,.8,8).rotateX(Math.PI/2),dark,0,-1.85,2.4);
  }
  const ts=new THREE.Shape(); ts.moveTo(-2.4,.9); ts.lineTo(-6.6,.9); ts.lineTo(-7.7,5.2); ts.lineTo(-6.3,5.2); ts.lineTo(-2.4,.9);
  const tg=new THREE.ExtrudeGeometry(ts,{depth:.2,bevelEnabled:false}); tg.rotateY(-Math.PI/2); tg.translate(.1,0,0); g.add(new THREE.Mesh(tg,body));
  geo=new THREE.CylinderGeometry(.92,.72,1.7,12,1,true); geo.rotateX(Math.PI/2); add(geo,dark,0,0,-6.8);
  // AIM-9X on wingtips, AIM-120C on underwing pylons
  const g9=new THREE.CylinderGeometry(.13,.13,4,6); g9.rotateX(Math.PI/2);
  const g120=new THREE.CylinderGeometry(.17,.17,4.9,6); g120.rotateX(Math.PI/2);
  [6.6,-6.6].forEach((x,i)=>{add(g9,white,x,-.1,-1.6).name='r9_'+i});
  [4.6,-4.6,3.0,-3.0].forEach((x,i)=>{add(g120,white,x,-.75,-1.2).name='r120_'+i});
  const fm=new THREE.MeshBasicMaterial({color:c.flame,transparent:true,opacity:.85,blending:THREE.AdditiveBlending,depthWrite:false});
  geo=new THREE.ConeGeometry(.68,4,10,1,true); geo.rotateX(-Math.PI/2); geo.translate(0,0,-2);
  add(geo,fm,0,0,-7.6).name='flame';
  return root;
}
// JAS 39C: close-coupled canard delta, 14.1 m long, 8.4 m span (true scale)
function buildGripen(c,isE){
  const g=new THREE.Group(), root=new THREE.Group(); root.add(g);
  const body=new THREE.MeshStandardMaterial({color:c.body,roughness:.62,metalness:.1,flatShading:true,side:THREE.DoubleSide});
  const dark=new THREE.MeshStandardMaterial({color:c.dark,roughness:.5,metalness:.3,flatShading:true,side:THREE.DoubleSide});
  const glass=new THREE.MeshStandardMaterial({color:c.glass,roughness:.15,metalness:.55,emissive:c.glassE});
  const white=new THREE.MeshStandardMaterial({color:0xeeeeea,roughness:.5,flatShading:true});
  const add=(geo,mat,x,y,z)=>{const m=new THREE.Mesh(geo,mat);m.position.set(x,y,z);g.add(m);return m};
  let geo=new THREE.CylinderGeometry(.75,.62,10.5,10); geo.rotateX(Math.PI/2); add(geo,body,0,0,0).name='fuse';
  if(isE){g.scale.z=15.2/14.1; add(new THREE.SphereGeometry(.12,8,6),dark,.22,.6,5.2).name='irst';}  // E: stretched 15.2 m, Skyward-G IRST ball
  geo=new THREE.ConeGeometry(.75,3.2,10); geo.rotateX(Math.PI/2); add(geo,body,0,0,6.85);
  geo=new THREE.CylinderGeometry(.04,.04,.9,4); geo.rotateX(Math.PI/2); add(geo,dark,0,0,8.85);
  const can=add(new THREE.SphereGeometry(1,12,8),glass,0,.72,3.6); can.scale.set(.55,.5,1.9); can.name='canopy';
  add(new THREE.BoxGeometry(.7,.45,6),body,0,.55,-.6);
  for(const s of [1,-1]){add(new THREE.BoxGeometry(.6,.95,2.8),body,.95*s,-.1,1.7);add(new THREE.BoxGeometry(.5,.8,.12),dark,.95*s,-.1,3.12)}
  const plate=(pts,mat,y,depth)=>{for(const s of [1,-1]){
    const sh=new THREE.Shape(); sh.moveTo(pts[0][0]*s,pts[0][1]);
    for(let i=1;i<pts.length;i++) sh.lineTo(pts[i][0]*s,pts[i][1]);
    const eg=new THREE.ExtrudeGeometry(sh,{depth,bevelEnabled:false}); eg.rotateX(Math.PI/2); eg.translate(0,y+depth/2,0);
    g.add(new THREE.Mesh(eg,mat));}};
  plate([[.7,1.4],[4.2,-3.3],[4.2,-4.1],[.7,-4.6]],body,-.25,.2);      // delta wing
  plate([[.95,3.1],[2.45,1.7],[2.45,1.25],[.95,1.05]],body,.2,.12);   // close-coupled canards
  const ts=new THREE.Shape(); ts.moveTo(-2.2,.6); ts.lineTo(-5.0,.6); ts.lineTo(-5.7,3.4); ts.lineTo(-4.7,3.4); ts.lineTo(-2.2,.6);
  const tg=new THREE.ExtrudeGeometry(ts,{depth:.16,bevelEnabled:false}); tg.rotateY(-Math.PI/2); tg.translate(.08,0,0); g.add(new THREE.Mesh(tg,body));
  geo=new THREE.CylinderGeometry(.62,.52,1.0,12,1,true); geo.rotateX(Math.PI/2); add(geo,dark,0,0,-5.6);
  // IRIS-T on the wingtips, Meteor on underwing pylons (true lengths 2.9 m / 3.65 m)
  const g9=new THREE.CylinderGeometry(.1,.1,2.94,6); g9.rotateX(Math.PI/2);
  const g120=new THREE.CylinderGeometry(.14,.14,3.65,6); g120.rotateX(Math.PI/2);
  [4.35,-4.35].forEach((x,i)=>{add(g9,white,x,-.25,-2.6).name='r9_'+i});
  [3.0,-3.0,1.95,-1.95].forEach((x,i)=>{add(g120,white,x,-.6,-1.9).name='r120_'+i});
  const fm=new THREE.MeshBasicMaterial({color:c.flame,transparent:true,opacity:.85,blending:THREE.AdditiveBlending,depthWrite:false});
  geo=new THREE.ConeGeometry(.5,3.4,10,1,true); geo.rotateX(-Math.PI/2); geo.translate(0,0,-1.7);
  add(geo,fm,0,0,-6.1).name='flame';
  return root;
}
// MiG-29 9.12: 17.3 m long, 11.4 m span, twin RD-33s, twin canted fins, big LERX (true scale)
// Su-27/Su-35: the Fulcrum layout grown 27 % (21.9 m, 14.7–15.3 m span) with a tail stinger; weapons hung at true size
function buildSu(c,type){
  const root=buildMig29(c,'SU'), g=root.children[0]; g.scale.setScalar(1.266);
  const body=new THREE.MeshStandardMaterial({color:c.body,roughness:.62,metalness:.1,flatShading:true});
  const st=new THREE.Mesh(new THREE.ConeGeometry(.45,3.2,8).rotateX(-Math.PI/2),body); st.position.set(0,-.2,-8.9); g.add(st);
  if(type==='SU35'){const nose=new THREE.Mesh(new THREE.ConeGeometry(.64,2.3,10).rotateX(Math.PI/2),new THREE.MeshStandardMaterial({color:0x5a6066,roughness:.7,flatShading:true}));nose.position.set(0,0,7.95);g.add(nose)}
  const arm=new THREE.Group(); root.add(arm); const white=new THREE.MeshStandardMaterial({color:0xeeeeea,roughness:.5,flatShading:true});
  const msl=(len,r,x,y,z,name)=>{const m=new THREE.Mesh(new THREE.CylinderGeometry(r,r,len,6).rotateX(Math.PI/2),white);m.position.set(x,y,z);m.name=name;arm.add(m)};
  [[7.3,-.4,-3.6],[-7.3,-.4,-3.6],[6.0,-.75,-3.0],[-6.0,-.75,-3.0]].forEach(([x,y,z],i)=>msl(2.9,.11,x,y,z,'r9_'+[0,1,2,3][i]));
  const lr=type==='SU35'&&c===PLAYER_COLORS&&suLR;
  if(type==='SU33'){const cm=new THREE.MeshStandardMaterial({color:c.body,roughness:.62,metalness:.1,flatShading:true,side:THREE.DoubleSide});for(const sg of [1,-1]){const sh=new THREE.Shape();sh.moveTo(.75*sg,5.6);sh.lineTo(2.6*sg,4.4);sh.lineTo(2.6*sg,3.9);sh.lineTo(.75*sg,4.1);const eg=new THREE.ExtrudeGeometry(sh,{depth:.12,bevelEnabled:false});eg.rotateX(Math.PI/2);eg.translate(0,.32,0);g.add(new THREE.Mesh(eg,cm))}}
  if(type==='SU27'||type==='SU33')[[4.7,-.85,-2.4],[-4.7,-.85,-2.4],[3.4,-.85,-2.0],[-3.4,-.85,-2.0],[1.45,-1.75,1.2],[-1.45,-1.75,1.2]].forEach(([x,y,z],i)=>msl(4.78,.17,x,y,z,'r120_'+i));
  else if(lr)[[3.4,-.95,-2.0],[-3.4,-.95,-2.0],[1.45,-1.85,1.2],[-1.45,-1.85,1.2]].forEach(([x,y,z],i)=>msl(4.2,.19,x,y,z,'r120_'+i));
  else [[4.7,-.85,-2.4],[-4.7,-.85,-2.4],[3.4,-.85,-2.0],[-3.4,-.85,-2.0],[1.45,-1.75,1.2],[-1.45,-1.75,1.2],[0,-1.35,3.2],[0,-1.35,-2.4]].forEach(([x,y,z],i)=>msl(3.71,.1,x,y,z,'r120_'+i));
  return root;
}
function buildMig29(c,upg){
  const g=new THREE.Group(), root=new THREE.Group(); root.add(g);
  const body=new THREE.MeshStandardMaterial({color:c.body,roughness:.62,metalness:.1,flatShading:true,side:THREE.DoubleSide});
  const dark=new THREE.MeshStandardMaterial({color:c.dark,roughness:.5,metalness:.3,flatShading:true,side:THREE.DoubleSide});
  const glass=new THREE.MeshStandardMaterial({color:c.glass,roughness:.15,metalness:.55,emissive:c.glassE});
  const white=new THREE.MeshStandardMaterial({color:0xeeeeea,roughness:.5,flatShading:true});
  const add=(geo,mat,x,y,z)=>{const m=new THREE.Mesh(geo,mat);m.position.set(x,y,z);g.add(m);return m};
  let geo=new THREE.CylinderGeometry(.62,.78,6.8,10); geo.rotateX(Math.PI/2); add(geo,body,0,0,3.4).name='fuse';
  geo=new THREE.ConeGeometry(.62,2.2,10); geo.rotateX(Math.PI/2); add(geo,body,0,0,7.9);
  geo=new THREE.CylinderGeometry(.035,.035,1.2,4); geo.rotateX(Math.PI/2); add(geo,dark,0,0,9.5);
  const can=add(new THREE.SphereGeometry(1,12,8),glass,0,.75,4.6); can.scale.set(.55,.5,1.9); can.name='canopy';
  add(new THREE.SphereGeometry(.13,8,6),dark,.18,.72,6.35).name='irst';                            // IRST/laser rangefinder ball
  add(new THREE.BoxGeometry(.8,.5,5.5),body,0,.5,-.4);
  if(upg==='35'){add(new THREE.BoxGeometry(1.1,.75,7.5),body,0,.75,-1.2); geo=new THREE.ConeGeometry(.55,1.6,8); geo.rotateX(Math.PI/2); add(geo,body,0,.75,3.3)} // bigger dorsal spine (fuel + avionics)
  add(new THREE.BoxGeometry(2.6,.5,8),body,0,-.05,-3.4);                                // flat lifting centre body
  for(const s of [1,-1]){
    geo=new THREE.CylinderGeometry(.62,.62,9.3,10); geo.rotateX(Math.PI/2); add(geo,body,1.05*s,-.35,-3.15);
    add(new THREE.BoxGeometry(1.0,.75,2.0),body,1.05*s,-.6,2.5); add(new THREE.BoxGeometry(.85,.6,.12),dark,1.05*s,-.6,3.52);
    geo=new THREE.CylinderGeometry(.6,.5,.9,12,1,true); geo.rotateX(Math.PI/2); add(geo,dark,1.05*s,-.35,-8.2);
  }
  const plate=(pts,mat,y,depth)=>{for(const s of [1,-1]){
    const sh=new THREE.Shape(); sh.moveTo(pts[0][0]*s,pts[0][1]);
    for(let i=1;i<pts.length;i++) sh.lineTo(pts[i][0]*s,pts[i][1]);
    const eg=new THREE.ExtrudeGeometry(sh,{depth,bevelEnabled:false}); eg.rotateX(Math.PI/2); eg.translate(0,y+depth/2,0);
    g.add(new THREE.Mesh(eg,mat));}};
  plate([[1.6,1.0],[5.68,-3.5],[5.68,-4.6],[1.6,-5.2]],body,-.15,.2);   // 42° swept wing
  plate([[.6,5.4],[1.8,1.0],[.6,1.0]],body,-.05,.16);                   // LERX
  plate([[1.6,-6.0],[4.0,-7.6],[4.0,-8.2],[1.6,-8.3]],body,-.2,.14);    // stabilators
  for(const s of [1,-1]){ // twin fins, canted outward
    const ts=new THREE.Shape(); ts.moveTo(-4.0,.3); ts.lineTo(-7.2,.3); ts.lineTo(-7.9,3.4); ts.lineTo(-6.7,3.4); ts.lineTo(-4.0,.3);
    const tg=new THREE.ExtrudeGeometry(ts,{depth:.14,bevelEnabled:false}); tg.rotateY(-Math.PI/2); tg.translate(.07,0,0); tg.rotateZ(-.11*s);
    const f=new THREE.Mesh(tg,body); f.position.x=1.35*s; f.position.y=.1; g.add(f);
  }
  // R-73 on the outer two pylons each side, R-27R inboard (true lengths 2.9 m / 4.08 m)
  const g9=new THREE.CylinderGeometry(.11,.11,2.9,6); g9.rotateX(Math.PI/2);
  const g120=new THREE.CylinderGeometry(.15,.15,4.08,6); g120.rotateX(Math.PI/2);
  if(upg==='SU'){ /* Sukhoi: weapons are hung by buildSu at true size */ } else if(upg==='35'){ // MiG-35: 4 pylons per wing; R-73 outermost, three R-77-1 inboard each side, refuelling probe
    [5.3,-5.3].forEach((x,i)=>{add(g9,white,x,-.5,-2.6).name='r9_'+i});
    const g77=new THREE.CylinderGeometry(.1,.1,3.71,6); g77.rotateX(Math.PI/2);
    [4.4,-4.4,3.5,-3.5,2.6,-2.6].forEach((x,i)=>{add(g77,white,x,-.58,-2.0).name='r120_'+i});
    geo=new THREE.CylinderGeometry(.05,.05,1.6,5); geo.rotateX(Math.PI/2); add(geo,dark,.5,.45,6.8);
  } else if(upg==='UPG'){ // UPG: R-73 outboard, four R-77 (3.6 m, grid-fin tail), and the retractable refuelling probe on the left nose
    [4.6,-4.6].forEach((x,i)=>{add(g9,white,x,-.55,-2.4).name='r9_'+i});
    const g77=new THREE.CylinderGeometry(.1,.1,3.6,6); g77.rotateX(Math.PI/2);
    [3.6,-3.6,2.6,-2.6].forEach((x,i)=>{add(g77,white,x,-.58,-2.0).name='r120_'+i});
    geo=new THREE.CylinderGeometry(.05,.05,1.6,5); geo.rotateX(Math.PI/2); add(geo,dark,.5,.45,6.8);
  } else {
    [4.6,-4.6,3.6,-3.6].forEach((x,i)=>{add(g9,white,x,-.55,-2.4).name='r9_'+i});
    [2.6,-2.6].forEach((x,i)=>{add(g120,white,x,-.6,-1.8).name='r120_'+i});
  }
  const fm=new THREE.MeshBasicMaterial({color:c.flame,transparent:true,opacity:.85,blending:THREE.AdditiveBlending,depthWrite:false});
  const fl=new THREE.Group(); fl.position.set(0,-.35,-8.65); fl.name='flame'; g.add(fl);
  for(const s of [1,-1]){geo=new THREE.ConeGeometry(.48,3.4,10,1,true); geo.rotateX(-Math.PI/2); geo.translate(0,0,-1.7);
    const m=new THREE.Mesh(geo,fm); m.position.x=1.05*s; fl.add(m)}
  return root;
}

/* parametric true-scale model: fuselage tube + nose, intakes, delta/trapezoid wings, canards, tails, nozzles, missile rails.
   +z is forward, +x is the left wing (matches the other models). */
const MODELS={
  F15:{fr:.95,fl:13.6,fz:-1.8,nl:4.2,radome:1,boxes:[[3.3,.9,11.5,0,-.05,-3.2]],intakes:[[1.6,0,1.4,1.0,1.35,4.6],[-1.6,0,1.4,1.0,1.35,4.6]],
    canopy:[4.0,.98,.62,.58,2.1],wing:[[1.5,1.6],[6.5,-3.5],[6.5,-5.1],[1.5,-5.6]],wingY:-.05,htail:[[1.7,-6.6],[4.3,-8.4],[4.3,-9.4],[1.7,-9.1]],htailY:-.05,
    vtails:[{x:1.55,cant:.04,pts:[[-5.0,.45],[-7.6,.45],[-9.3,3.6],[-8.0,3.6]]},{x:-1.55,cant:-.04,pts:[[-5.0,.45],[-7.6,.45],[-9.3,3.6],[-8.0,3.6]]}],
    nozzles:[[.72,0,-9.15,.58],[-.72,0,-9.15,.58]],m9:[3.0,.07],m120:[3.66,.09],
    r9:[[4.45,-.55,-2.7],[-4.45,-.55,-2.7]],r120:[[3.45,-.6,-2.4],[-3.45,-.6,-2.4],[1.75,-.9,1.4],[-1.75,-.9,1.4],[1.75,-.9,-3.6],[-1.75,-.9,-3.6]]},
  TYPHOON:{fr:.8,fl:10.4,fz:-1.6,nl:3.7,radome:1,intakes:[[0,-.85,1.1,1.6,.8,3.4]],canopy:[3.7,.8,.5,.48,1.8],
    wing:[[.75,.9],[5.45,-4.3],[5.45,-4.9],[.75,-6.2]],wingY:-.2,canard:[[.7,4.8],[2.3,3.6],[2.3,3.2],[.7,3.5]],canardY:.2,
    vtails:[{x:0,cant:0,pts:[[-3.4,.7],[-6.3,.7],[-7.0,3.9],[-5.9,3.9]]}],nozzles:[[.5,0,-7.0,.5],[-.5,0,-7.0,.5]],m9:[2.94,.07],m120:[3.65,.09],
    r9:[[4.7,-.45,-3.0],[-4.7,-.45,-3.0]],r120:[[3.6,-.55,-2.3],[-3.6,-.55,-2.3],[2.6,-.55,-1.9],[-2.6,-.55,-1.9],[.78,-.95,-1.0],[-.78,-.95,-1.0]]},
  RAFALE:{fr:.75,fl:9.8,fz:-1.5,nl:3.7,radome:1,intakes:[[.98,-.45,1.0,.7,.9,2.7],[-.98,-.45,1.0,.7,.9,2.7]],canopy:[3.4,.78,.48,.46,1.7],
    wing:[[.8,1.0],[5.45,-4.6],[5.45,-5.25],[.8,-6.0]],wingY:-.15,canard:[[.85,2.7],[2.45,1.5],[2.45,1.1],[.85,1.2]],canardY:.35,
    vtails:[{x:0,cant:0,pts:[[-2.8,.68],[-5.6,.68],[-6.4,3.6],[-5.3,3.6]]}],nozzles:[[.45,0,-6.75,.45],[-.45,0,-6.75,.45]],m9:[3.1,.08],m120:[3.65,.09],
    r9:[[5.45,-.1,-3.5],[-5.45,-.1,-3.5],[4.2,-.5,-2.7],[-4.2,-.5,-2.7]],r120:[[3.0,-.55,-2.1],[-3.0,-.55,-2.1],[.82,-.95,-1.6],[-.82,-.95,-1.6]]},
  J10:{fr:.8,fl:10.8,fz:-1.4,nl:3.7,radome:1,intakes:[[0,-.95,1.5,1.5,.9,3.4]],canopy:[4.1,.82,.5,.52,1.7],
    wing:[[.8,1.5],[4.9,-4.3],[4.9,-4.9],[.8,-5.8]],wingY:-.25,canard:[[.75,4.0],[2.05,3.0],[2.05,2.6],[.75,2.8]],canardY:.15,
    vtails:[{x:0,cant:0,pts:[[-2.6,.7],[-5.9,.7],[-7.0,4.2],[-5.8,4.2]]},{x:.55,cant:2.6,pts:[[-4.6,.4],[-6.3,.4],[-6.6,1.2],[-5.6,1.2]]},{x:-.55,cant:-2.6,pts:[[-4.6,.4],[-6.3,.4],[-6.6,1.2],[-5.6,1.2]]}],
    nozzles:[[0,0,-7.25,.56]],m9:[3.0,.08],m120:[3.99,.1],
    r9:[[4.3,-.55,-2.8],[-4.3,-.55,-2.8]],r120:[[3.3,-.6,-2.2],[-3.3,-.6,-2.2],[2.2,-.6,-1.7],[-2.2,-.6,-1.7]]},
  J20:{fr:1.0,fl:14.6,fz:-1.7,nl:4.6,radome:0,boxes:[[2.8,.7,12.5,0,-.15,-2.0]],intakes:[[1.5,-.05,2.6,.95,1.15,4.2],[-1.5,-.05,2.6,.95,1.15,4.2]],
    canopy:[5.3,1.0,.6,.55,2.4],wing:[[1.25,.6],[6.5,-5.4],[6.5,-6.2],[1.25,-7.3]],wingY:0,canard:[[1.4,4.0],[3.65,2.4],[3.65,1.9],[1.4,2.1]],canardY:.25,
    vtails:[{x:1.4,cant:.35,pts:[[-5.6,.55],[-7.8,.55],[-8.6,2.6],[-7.3,2.6]]},{x:-1.4,cant:-.35,pts:[[-5.6,.55],[-7.8,.55],[-8.6,2.6],[-7.3,2.6]]},
            {x:1.2,cant:2.75,pts:[[-6.0,.5],[-7.8,.5],[-8.2,1.4],[-7.2,1.4]]},{x:-1.2,cant:-2.75,pts:[[-6.0,.5],[-7.8,.5],[-8.2,1.4],[-7.2,1.4]]}],
    nozzles:[[.75,0,-9.45,.6],[-.75,0,-9.45,.6]],m9:[3.0,.08],m120:[3.99,.1],internal:true,
    r9:[[1.25,-.35,.6],[-1.25,-.35,.6]],r120:[[.5,-.6,-1.0],[-.5,-.6,-1.0],[.5,-.6,-3.6],[-.5,-.6,-3.6]]}};
MODELS.FA18={fr:.85,fl:12.0,fz:-1.6,nl:3.6,radome:1,intakes:[[1.25,-.35,.6,.8,.95,2.8],[-1.25,-.35,.6,.8,.95,2.8]],canopy:[3.6,.86,.5,.5,1.9],
  wing:[[1.4,.6],[6.8,-2.2],[6.8,-3.6],[1.4,-4.4]],wingY:-.1,canard:[[.8,6.2],[1.9,1.0],[.8,1.0]],canardY:.05,htail:[[1.3,-5.6],[3.6,-6.9],[3.6,-7.9],[1.3,-7.6]],htailY:-.1,
  vtails:[{x:1.0,cant:.35,pts:[[-3.2,.5],[-5.3,.5],[-6.5,3.1],[-5.4,3.1]]},{x:-1.0,cant:-.35,pts:[[-3.2,.5],[-5.3,.5],[-6.5,3.1],[-5.4,3.1]]}],
  nozzles:[[.55,0,-7.65,.48],[-.55,0,-7.65,.48]],m9:[3.0,.07],m120:[3.66,.09],
  r9:[[6.85,-.05,-3.0],[-6.85,-.05,-3.0]],r120:[[4.9,-.6,-1.9],[-4.9,-.6,-1.9],[3.4,-.6,-1.5],[-3.4,-.6,-1.5],[1.15,-1.05,-1.0],[-1.15,-1.05,-1.0]]};
MODELS.F15EX=Object.assign({},MODELS.F15,{boxes:[[3.3,.9,11.5,0,-.05,-3.2],[.55,.7,6.5,2.15,-.35,-2.6],[.55,.7,6.5,-2.15,-.35,-2.6]],
  r9:[[4.75,-.55,-2.8],[-4.75,-.55,-2.8],[3.35,-.55,-2.7],[-3.35,-.55,-2.7]],
  r120:[[4.05,-.8,-2.4],[-4.05,-.8,-2.4],[1.75,-.9,1.4],[-1.75,-.9,1.4],[1.75,-.9,-3.6],[-1.75,-.9,-3.6],[2.55,-.8,-2.0],[-2.55,-.8,-2.0]]});
// the tube runs 1.6 m further forward (shorter nose cone) so the nose starts well ahead of the cockpit panel
for(const k in MODELS){const M=MODELS[k];if(M.__x)continue;M.__x=1;M.fl+=1.6;M.fz+=.8;M.nl-=1.6}
function buildParam(c,M){
  const g=new THREE.Group(), root=new THREE.Group(); root.add(g);
  const body=new THREE.MeshStandardMaterial({color:c.body,roughness:.62,metalness:.1,flatShading:true,side:THREE.DoubleSide});
  const dark=new THREE.MeshStandardMaterial({color:c.dark,roughness:.5,metalness:.3,flatShading:true,side:THREE.DoubleSide});
  const glass=new THREE.MeshStandardMaterial({color:c.glass,roughness:.15,metalness:.55,emissive:c.glassE});
  const white=new THREE.MeshStandardMaterial({color:0xeeeeea,roughness:.5,flatShading:true});
  const add=(geo,mat,x,y,z)=>{const m=new THREE.Mesh(geo,mat);m.position.set(x,y,z);g.add(m);return m};
  let geo=new THREE.CylinderGeometry(M.fr,M.fr*.86,M.fl,12); geo.rotateX(Math.PI/2); add(geo,body,0,0,M.fz).name='fuse';
  const zf=M.fz+M.fl/2; geo=new THREE.ConeGeometry(M.fr,M.nl,12); geo.rotateX(Math.PI/2); add(geo,M.radome?dark:body,0,0,zf+M.nl/2);
  if(M.radome){geo=new THREE.CylinderGeometry(M.fr,M.fr,.25,12,1,true);geo.rotateX(Math.PI/2);add(geo,body,0,0,zf+.12)}
  (M.boxes||[]).forEach(([w,h,l,x,y,z])=>add(new THREE.BoxGeometry(w,h,l),body,x,y,z));
  (M.intakes||[]).forEach(([x,y,z,w,h,l])=>{add(new THREE.BoxGeometry(w,h,l),body,x,y,z);add(new THREE.BoxGeometry(w*.86,h*.8,.1),dark,x,y,z+l/2+.02)});
  const [cz,cy,sx,sy,sz]=M.canopy; const can=add(new THREE.SphereGeometry(1,12,8),glass,0,cy,cz); can.scale.set(sx,sy,sz); can.name='canopy';
  geo=new THREE.BoxGeometry(sx*1.3,sy*.9,sz*2.4); add(geo,body,0,cy-.18,cz-sz*1.6);   // spine behind the canopy
  const plate=(pts,mat,y,depth)=>{for(const s of [1,-1]){
    const sh=new THREE.Shape(); sh.moveTo(pts[0][0]*s,pts[0][1]); for(let i=1;i<pts.length;i++)sh.lineTo(pts[i][0]*s,pts[i][1]);
    const eg=new THREE.ExtrudeGeometry(sh,{depth,bevelEnabled:false}); eg.rotateX(Math.PI/2); eg.translate(0,y+depth/2,0); g.add(new THREE.Mesh(eg,mat))}};
  plate(M.wing,body,M.wingY,.22); if(M.canard)plate(M.canard,body,M.canardY,.12); if(M.htail)plate(M.htail,body,M.htailY,.14);
  for(const v of M.vtails){const sh=new THREE.Shape(); sh.moveTo(v.pts[0][0],v.pts[0][1]); for(let i=1;i<v.pts.length;i++)sh.lineTo(v.pts[i][0],v.pts[i][1]);
    const tg=new THREE.ExtrudeGeometry(sh,{depth:.16,bevelEnabled:false}); tg.rotateY(-Math.PI/2); tg.translate(.08,0,0);
    const gr=new THREE.Group(); gr.position.x=v.x; gr.rotation.z=v.cant; gr.add(new THREE.Mesh(tg,body)); g.add(gr)}
  for(const [x,y,z,r] of M.nozzles){geo=new THREE.CylinderGeometry(r,r*.86,1.2,12,1,true); geo.rotateX(Math.PI/2); add(geo,dark,x,y,z)}
  const g9=new THREE.CylinderGeometry(M.m9[1],M.m9[1],M.m9[0],6); g9.rotateX(Math.PI/2);
  const g120=new THREE.CylinderGeometry(M.m120[1],M.m120[1],M.m120[0],6); g120.rotateX(Math.PI/2);
  M.r9.forEach((p,i)=>{add(g9,white,...p).name='r9_'+i}); M.r120.forEach((p,i)=>{add(g120,white,...p).name='r120_'+i});
  const fm=new THREE.MeshBasicMaterial({color:c.flame,transparent:true,opacity:.85,blending:THREE.AdditiveBlending,depthWrite:false});
  const zn=M.nozzles[0][2]-.6, fl=new THREE.Group(); fl.position.set(0,M.nozzles[0][1],zn); fl.name='flame'; g.add(fl);
  for(const [x,,,r] of M.nozzles){geo=new THREE.ConeGeometry(r*.85,3.6,10,1,true); geo.rotateX(-Math.PI/2); geo.translate(0,0,-1.8); const m=new THREE.Mesh(geo,fm); m.position.x=x; fl.add(m)}
  return root}
// cockpit eye point and cut-away tube for the parametric jets (model units = metres)
for(const id of ['F15C','F15EX','TYPHOON','RAFALE','J10C','J20','FA18E']){const D=AC_DEFS[id],M=MODELS[D.model];
  D.eye=[0,M.canopy[1]+.14,M.canopy[0]+.15]; D.cut={r:M.fr,full:[M.fz-M.fl/2,M.canopy[0]-1.2],open:[M.canopy[0]-1.2,M.fz+M.fl/2]}}
/* ================= lofted true-scale jet models =================
   fuselage and nacelles: cross-sections [z, halfWidth, heightAbove, depthBelow, centreY, superellipse n] lofted nose-to-tail;
   wings, canards and stabilators: spanwise sections {x, zle, zte, y, t} with a diamond airfoil (t = thickness/chord);
   fins: sections {h, zle, zte} lofted upward, then canted. +z is forward, +x is the left wing, y up; 1 unit = 1 m. */
const LOFT_N=18;
function loftGeo(st,opts){
  opts=opts||{};const N=opts.n||LOFT_N, pos=[], idx=[], sk=opts.skipTop;
  for(const [z,w,ht,hb,yc,ne] of st){const e=2/(ne||2.4);
    for(let j=0;j<N;j++){const a=j/N*Math.PI*2,c=Math.cos(a),s=Math.sin(a);
      pos.push(Math.sign(c)*Math.pow(Math.abs(c),e)*w, (yc||0)+Math.sign(s)*Math.pow(Math.abs(s),e)*(s>=0?ht:hb), z)}}
  for(let i=0;i<st.length-1;i++){const zm=(st[i][0]+st[i+1][0])/2;
    for(let j=0;j<N;j++){const a=i*N+j,b=i*N+(j+1)%N,c=(i+1)*N+j,d=(i+1)*N+(j+1)%N;
      if(sk&&zm>sk[0]&&zm<sk[1]){const ang=(j+.5)/N*Math.PI*2;if(Math.sin(ang)>.35)continue}
      idx.push(a,c,b,b,c,d)}}
  if(opts.capTail!==false){const base=pos.length/3;const s0=st[0];pos.push(0,s0[4]||0,s0[0]);for(let j=0;j<N;j++)idx.push(base,j,(j+1)%N)}
  const g=new THREE.BufferGeometry();g.setAttribute('position',new THREE.Float32BufferAttribute(pos,3));g.setIndex(idx);g.computeVertexNormals();return g}
// spanwise surface (both sides unless half): diamond section, max thickness at 40 % chord
function wingGeo(st,mirror){
  const pos=[],idx=[];
  const sec=(s,sg)=>{const c=s.zle-s.zte,zm=s.zle-c*.4,t=(s.t||.04)*c/2,x=s.x*sg,y=s.y||0;return[[x,y,s.zle],[x,y+t,zm],[x,y,s.zte],[x,y-t,zm]]};
  for(const sg of mirror===false?[1]:[1,-1]){const b0=pos.length/3;
    st.forEach(s=>sec(s,sg).forEach(p=>pos.push(...p)));
    for(let i=0;i<st.length-1;i++)for(let j=0;j<4;j++){const a=b0+i*4+j,b=b0+i*4+(j+1)%4,c=b0+(i+1)*4+j,d=b0+(i+1)*4+(j+1)%4;if(sg>0)idx.push(a,b,c,b,d,c);else idx.push(a,c,b,b,c,d)}
    const L=b0+(st.length-1)*4;if(sg>0)idx.push(L,L+1,L+2,L,L+2,L+3);else idx.push(L,L+2,L+1,L,L+3,L+2)}
  const g=new THREE.BufferGeometry();g.setAttribute('position',new THREE.Float32BufferAttribute(pos,3));g.setIndex(idx);g.computeVertexNormals();return g}
// fin: sections {h, zle, zte, t} stacked upward from y=0, thickness along x
function finGeo(st){const ws=st.map(s=>({x:s.h,zle:s.zle,zte:s.zte,t:s.t||.05,y:0}));const g=wingGeo(ws,false);
  const p=g.attributes.position;for(let i=0;i<p.count;i++){const x=p.getX(i),y=p.getY(i);p.setXYZ(i,y,x,p.getZ(i))}g.computeVertexNormals();return g}
// missile: body, ogive nose, cruciform fins; named group so launch rails find it
function mslMesh(len,r,mat,name,fin){const g=new THREE.Group();g.name=name;
  const b=new THREE.Mesh(new THREE.CylinderGeometry(r,r,len*.86,8).rotateX(Math.PI/2),mat);b.position.z=-len*.07;g.add(b);
  const n=new THREE.Mesh(new THREE.ConeGeometry(r,len*.14,8).rotateX(Math.PI/2),mat);n.position.z=len*.43;g.add(n);
  const fs=fin||r*3.2;for(const a of [0,Math.PI/2]){const f=new THREE.Mesh(new THREE.BoxGeometry(fs,.012,len*.1),mat);f.rotation.z=a+Math.PI/4;f.position.z=-len*.44;g.add(f);
    const f2=new THREE.Mesh(new THREE.BoxGeometry(fs*.7,.012,len*.06),mat);f2.rotation.z=a+Math.PI/4;f2.position.z=len*.2;g.add(f2)}
  return g}
const MSL_DIM={'AIM-9X':[3.0,.08],'AIM-120C':[3.66,.1],'AIM-120C-7':[3.66,.1],'AIM-120D':[3.66,.1],'R-73':[2.9,.1],'R-27R':[4.08,.13],'R-27ER':[4.78,.15],'R-77':[3.6,.11],'R-77-1':[3.71,.11],
  'R-37M':[4.2,.19],'IRIS-T':[2.94,.08],'METEOR':[3.65,.1],'MICA IR':[3.1,.09],'PL-10':[3.0,.09],'PL-15':[4.0,.11]};
/* ================= jet detail: paint, panel lines, control surfaces, canopies, pilots, decals ================= */
// real-world schemes. p: 0 solid, 1 soft two-tone, 2 splinter, 3 digital. c: three paint colours, b: belly colour (null = same), soot: exhaust staining
const PAINT={
  F16:{p:1,c:['#8e969d','#737b83','#9aa2a8'],nat:'usaf',num:'AF 90-0812',lowvis:1},
  F16B70:{p:1,c:['#868f97','#6c757d','#939ba2'],nat:'usaf',num:'AF 21-1001',lowvis:1},
  F15C:{p:1,c:['#9aa3ab','#7e8995','#a7afb6'],nat:'usaf',num:'AF 86-0172',lowvis:1},
  F15EX:{p:1,c:['#7b858f','#646e78','#858f98'],nat:'usaf',num:'AF 20-0001',lowvis:1},
  FA18E:{p:1,c:['#a2a9af','#8a939b','#adb3b8'],nat:'usn',num:'NE 201',nose:'201',lowvis:1},
  GRIPEN:{p:0,c:['#7f888f','#737c84','#8a9399'],nat:'swe',num:'39271'},
  GRIPENE:{p:0,c:['#6f7880','#646d75','#7a838b'],nat:'swe',num:'39-8'},
  TYPHOON:{p:0,c:['#8d959b','#81898f','#99a0a6'],nat:'raf',num:'ZK342',lowvis:1},
  RAFALE:{p:0,c:['#626d79','#58636f','#6e7984'],nat:'fra',num:'30-GX',lowvis:1},
  J10C:{p:1,c:['#8f989f','#7a858e','#9ca4aa'],nat:'prc',num:'62125',nose:'62125'},
  J20:{p:0,c:['#4d5258','#45494f','#565b61'],nat:'prc',num:'78271',nose:'78271'},
  MIG29:{p:2,c:['#9aa6aa','#76858b','#b3bcbf'],b:'#c8d3da',nat:'rus',nose:'08'},
  MIG29UPG:{p:2,c:['#7e8d9b','#5e6d7c','#9caab5'],b:'#b9c4cc',nat:'ind',num:'KB 3112'},
  MIG35:{p:3,c:['#8ea2b4','#62798f','#bccad5'],b:'#cfd9e1',nat:'rus',nose:'35'},
  MIG29K:{p:0,c:['#5c6a77','#536170','#677581'],b:'#a9b6c1',nat:'rus',nose:'41'},
  SU27:{p:2,c:['#a9bccb','#7f98ad','#5c7a92'],b:'#cbd9e3',nat:'rus',nose:'02'},
  SU33:{p:2,c:['#9fb2c1','#6c8599','#c9d6df'],b:'#cfdbe3',nat:'rus',nose:'77'},
  SU35:{p:3,c:['#7e9bb6','#58779a','#a8c0d3'],b:'#c6d5e0',nat:'rus',nose:'01'}};
const PAINT_DEF={p:0,c:['#8a95a0','#7a8590','#96a0aa']};
function paintMat(type,base){
  const P=PAINT[type]||PAINT_DEF, m=base.clone(); m.color.setHex(0xffffff);
  m.userData.pu={pc0:{value:new THREE.Color(P.c[0])},pc1:{value:new THREE.Color(P.c[1])},pc2:{value:new THREE.Color(P.c[2])},pBel:{value:new THREE.Color(P.b||P.c[0])},
    pPat:{value:P.p},pBelK:{value:P.b?1:0},pTail:{value:-8},pSc:{value:1.9}};
  m.extensions={derivatives:true}; m.userData.paint=1; m.onBeforeCompile=paintCompile; return m}
function paintCompile(sh){const u=this.userData.pu; if(u)for(const k in u)sh.uniforms[k]=u[k]; sh.uniforms.nTex={value:NOISE};
  sh.vertexShader=sh.vertexShader.replace('#include <common>','#include <common>\nattribute vec3 jp;attribute vec3 jn;varying vec3 vJP;varying vec3 vJN;')
    .replace('#include <begin_vertex>','#include <begin_vertex>\nvJP=jp;vJN=jn;');
  sh.fragmentShader=sh.fragmentShader.replace('#include <common>',`#include <common>
uniform vec3 pc0,pc1,pc2,pBel;uniform float pPat,pBelK,pTail,pSc;uniform sampler2D nTex;varying vec3 vJP;varying vec3 vJN;
float ph(vec2 p){return fract(sin(dot(p,vec2(127.1,311.7)))*43758.5453);}
float splinter(vec2 p){vec2 i=floor(p),f=fract(p);float md=9.,id=0.;
 for(int y=-1;y<=1;y++)for(int x=-1;x<=1;x++){vec2 g=vec2(float(x),float(y));vec2 o=vec2(ph(i+g),ph(i+g+17.3));vec2 r=g+o-f;float d=max(abs(r.x),abs(r.y))*.55+length(r)*.45;if(d<md){md=d;id=ph(i+g+5.1);}}
 return id;}
vec3 paint(){vec3 n=normalize(vJN);bool side=abs(n.x)>.62;vec2 p=side?vec2(vJP.z,vJP.y*1.3+3.7):vec2(vJP.z,vJP.x);p/=pSc;
 float id;vec3 c;
 if(pPat<.5){c=pc0;}
 else if(pPat<1.5){float t=texture2D(nTex,p*.09).r;c=mix(pc0,pc1,smoothstep(.47,.53,t+(n.y>.6&&abs(vJP.x)<1.3?.12:0.)));}
 else if(pPat<2.5){id=splinter(p*.75);c=id<.42?pc0:id<.76?pc1:pc2;}
 else {vec2 q=floor(p*5.)/5.;float t=texture2D(nTex,q*.06).g*.7+ph(q)*.3;c=t<.45?pc0:t<.62?pc1:pc2;}
 if(pBelK>.5)c=mix(c,pBel,smoothstep(-.25,-.5,n.y));
 // panel lines: frame stations along the length, plus a panel grid on wings and tails
 float wz=fwidth(vJP.z)+1e-4, lz=abs(fract(vJP.z/1.27+.5)-.5)*1.27, ln=1.-smoothstep(.012,.012+wz*1.4,lz);
 if(abs(n.y)>.6&&abs(vJP.x)>1.25){float wx=fwidth(vJP.x)+1e-4,lx=abs(fract(vJP.x/1.05+.5)-.5)*1.05;ln=max(ln,1.-smoothstep(.012,.012+wx*1.4,lx));}
 ln*=1.-smoothstep(.015,.05,wz);
 float pid=ph(floor(vec2(vJP.z/1.27,vJP.x/1.05+vJP.y)));
 c*=(1.-.24*ln)*(.975+.05*pid);
 // grime and exhaust soot
 float gr=texture2D(nTex,vJP.zx/7.).g;c*=.93+.1*gr;
 c=mix(c,c*.42,smoothstep(pTail+3.2,pTail+.2,vJP.z)*(.55+.35*gr));
 return c;}`).replace('#include <color_fragment>','#include <color_fragment>\ndiffuseColor.rgb=paint();')}
// bake jet-space position and normal into each painted mesh so paint stays put when a surface moves
function bakePaint(g,mat){g.updateMatrixWorld(true);const iv=new THREE.Matrix4().copy(g.matrixWorld).invert(),M=new THREE.Matrix4(),N=new THREE.Matrix3(),v=new THREE.Vector3();
  g.traverse(o=>{if(!o.isMesh||o.material!==mat||o.geometry.attributes.jp)return;const ge=o.geometry,p=ge.attributes.position,nn=ge.attributes.normal;M.multiplyMatrices(iv,o.matrixWorld);N.getNormalMatrix(M);
    const jp=new Float32Array(p.count*3),jn=new Float32Array(p.count*3),c=new THREE.Vector3(),w=new THREE.Vector3();
    for(let i=0;i<p.count;i++){v.fromBufferAttribute(p,i).applyMatrix4(M);jp[i*3]=v.x;jp[i*3+1]=v.y;jp[i*3+2]=v.z;c.add(v)}c.divideScalar(Math.max(1,p.count));
    for(let i=0;i<p.count;i++){v.fromBufferAttribute(nn,i).applyMatrix3(N).normalize();w.set(jp[i*3]-c.x,(jp[i*3+1]-c.y)*3,jp[i*3+2]-c.z);if(v.dot(w)<0)v.negate();jn[i*3]=v.x;jn[i*3+1]=v.y;jn[i*3+2]=v.z}
    ge.setAttribute('jp',new THREE.BufferAttribute(jp,3));ge.setAttribute('jn',new THREE.BufferAttribute(jn,3))})}
// national markings and numbers, drawn once per design on a canvas
const DECAL_TEX={};
function decalTex(kind,txt,lowvis){const key=kind+'|'+(txt?txt.s+(txt.red?'r':''):'')+'|'+(lowvis?1:0);if(DECAL_TEX[key])return DECAL_TEX[key];
  const cv=document.createElement('canvas');cv.width=256;cv.height=kind==='text'?128:256;const c=cv.getContext('2d'),W=256,H=cv.height,cx=128,cy=H/2;
  const star=(x,y,r,ri,fill)=>{c.beginPath();for(let i=0;i<10;i++){const a=-Math.PI/2+i*Math.PI/5,rr=i%2?ri:r;c.lineTo(x+Math.cos(a)*rr,y+Math.sin(a)*rr)}c.closePath();c.fillStyle=fill;c.fill()};
  const disc=(r,f)=>{c.beginPath();c.arc(cx,cy,r,0,7);c.fillStyle=f;c.fill()};
  const lv=lowvis;
  if(kind==='usaf'||kind==='usn'){const g=lv?'#4d555c':'#1d3a78';c.fillStyle=g;c.fillRect(8,102,240,52);disc(84,g);star(cx,cy,78,30,lv?'#9aa1a7':'#ffffff');c.fillStyle=lv?'#9aa1a7':'#fff';c.fillRect(56,114,144,28);star(cx,cy,64,24,lv?'#9aa1a7':'#fff');
    c.fillStyle=lv?'#4d555c':'#1d3a78';c.fillRect(10,116,40,24);c.fillRect(206,116,40,24)}
  else if(kind==='swe'){disc(118,lv?'#5d7a95':'#0a5aa8');c.fillStyle=lv?'#c9c9a0':'#f6c400';const cr=(x,y,s)=>{c.fillRect(x-s,y,s*2,s*.7);for(const k of [-1,0,1]){c.beginPath();c.moveTo(x+k*s*.8-s*.25,y);c.lineTo(x+k*s*.8,y-s*.9);c.lineTo(x+k*s*.8+s*.25,y);c.fill()}};
    cr(cx-40,cy-30,22);cr(cx+40,cy-30,22);cr(cx,cy+42,22)}
  else if(kind==='raf'){disc(118,lv?'#7d8fa8':'#1d3f8a');disc(50,lv?'#c98f8f':'#c8102e')}
  else if(kind==='fra'){disc(118,lv?'#a35f62':'#c8102e');disc(82,lv?'#c9cdd1':'#ffffff');disc(46,lv?'#56698a':'#0b3d91')}
  else if(kind==='ind'){disc(118,'#ff9933');disc(80,'#ffffff');disc(42,'#138808')}
  else if(kind==='prc'){c.fillStyle='#c8102e';c.fillRect(4,104,248,48);c.fillStyle='#f6c400';c.fillRect(4,118,248,6);star(cx,cy,104,42,'#f6c400');star(cx,cy,92,37,'#c8102e');
    c.fillStyle='#f6c400';c.font='bold 46px sans-serif';c.textAlign='center';c.textBaseline='middle';c.fillText('八一',cx,cy+6)}
  else if(kind==='rus'){star(cx,cy+8,124,50,'#c8102e');star(cx,cy+8,112,45,'#ffffff');star(cx,cy+8,96,38,'#c8102e')}
  else if(kind==='text'){c.font='bold 92px "Arial Narrow",Arial,sans-serif';c.textAlign='center';c.textBaseline='middle';
    if(txt.red){c.lineWidth=10;c.strokeStyle='#f2f2f2';c.strokeText(txt.s,cx,cy+4);c.fillStyle='#c8102e';c.fillText(txt.s,cx,cy+4)}
    else{c.fillStyle=lv?'#40474e':'#151719';c.fillText(txt.s,cx,cy+4)}}
  const t=new THREE.CanvasTexture(cv);t.anisotropy=4;return DECAL_TEX[key]=t}
const DECAL_MATS={};
function decalMat(kind,txt,lowvis){const key=kind+'|'+(txt?txt.s+(txt.red?'r':''):'')+'|'+(lowvis?1:0);if(DECAL_MATS[key])return DECAL_MATS[key];
  return DECAL_MATS[key]=new THREE.MeshStandardMaterial({map:decalTex(kind,txt,lowvis),transparent:true,alphaTest:.35,roughness:.6,metalness:.1,polygonOffset:true,polygonOffsetFactor:-2,polygonOffsetUnits:-2,depthWrite:false,side:THREE.DoubleSide})}
// cross-section lookups used to sit decals, gear and pods on the skin
function secAt(st,z){if(z<=st[0][0])return st[0];for(let i=1;i<st.length;i++)if(st[i][0]>=z){const a=st[i-1],b=st[i],t=(z-a[0])/(b[0]-a[0]);return a.map((v,k)=>v+(b[k]-v)*t)}return st[st.length-1]}
function bellyAt(S,z,x){let y=(()=>{const s=secAt(S.fus,z);return Math.abs(x)<s[1]?s[4]-s[3]:1e9})();
  for(const p of S.parts||[]){const xs=p.x?[p.x,-p.x]:[0];for(const px of xs){if(z<p.st[0][0]||z>p.st[p.st.length-1][0])continue;const s=secAt(p.st,z);if(Math.abs(x-px)<s[1]*1.05)y=Math.min(y,s[4]-s[3])}}
  return y>1e8?secAt(S.fus,z)[4]-secAt(S.fus,z)[3]:y}
const lerp3=(a,b,t)=>a+(b-a)*t;
function finAt(st,h){if(h<=st[0].h)return st[0];for(let i=1;i<st.length;i++)if(st[i].h>=h){const a=st[i-1],b=st[i],t=(h-a.h)/((b.h-a.h)||1);return{h,zle:lerp3(a.zle,b.zle,t),zte:lerp3(a.zte,b.zte,t),t:lerp3(a.t||.05,b.t||.05,t)}}return st[st.length-1]}
// a hinged trailing-edge strip (aileron, flap, elevon) for one side of a wing
function hingeStrip(r,t,f0,f1,frac,s,mat,kind){
  const at=f=>({x:lerp3(r.x,t.x,f),zle:lerp3(r.zle,t.zle,f),zte:lerp3(r.zte,t.zte,f),y:lerp3(r.y||0,t.y||0,f),t:lerp3(r.t||.04,t.t||.04,f)});
  const a=at(f0),b=at(f1),sec=o=>{const c=o.zle-o.zte;return{x:o.x*s,zle:o.zte+c*frac,zte:o.zte-.02,y:o.y,t:o.t*1.15}};
  const A=sec(a),B=sec(b),geo=wingGeo([A,B],false),piv=new THREE.Vector3(A.x,A.y,A.zle),ax=new THREE.Vector3(B.x-A.x,B.y-A.y,B.zle-A.zle).normalize();if(ax.x<0)ax.negate();
  geo.translate(-piv.x,-piv.y,-piv.z);const grp=new THREE.Group();grp.position.copy(piv);grp.name='cs';grp.userData={cs:kind,s,ax:ax.toArray()};grp.add(new THREE.Mesh(geo,mat));return grp}
function buildLoftJet(c,S,type){
  const g=new THREE.Group(), root=new THREE.Group(); root.add(g);
  const PS=PAINT[type]||PAINT_DEF;
  const body0=new THREE.MeshStandardMaterial({color:c.body,roughness:.5,metalness:.18,side:THREE.DoubleSide}), body=paintMat(type,body0);
  const dark=new THREE.MeshStandardMaterial({color:new THREE.Color(PS.c[1]).multiplyScalar(.62),roughness:.5,metalness:.3,side:THREE.DoubleSide});
  const metal=new THREE.MeshStandardMaterial({color:0x6b6a68,roughness:.35,metalness:.85,side:THREE.DoubleSide});
  const glass=new THREE.MeshStandardMaterial({color:c.glass,roughness:.04,metalness:.75,emissive:c.glassE,transparent:true,opacity:.9,envMapIntensity:1.6});glass.__ibl=true;
  const white=new THREE.MeshStandardMaterial({color:0xe6e6e0,roughness:.5});
  const black=new THREE.MeshStandardMaterial({color:0x0b0c0d,roughness:.8,side:THREE.DoubleSide});
  const add=(geo,mat,name,par)=>{const m=new THREE.Mesh(geo,mat);if(name)m.name=name;(par||g).add(m);return m};
  // fuselage (radome split off in the dark colour), plus a copy with the cockpit tub opened for the cockpit view
  const rz=S.radome, fst=S.fus;
  if(rz!=null){const k=fst.findIndex(s=>s[0]>=rz);let mid=null;if(k>0&&Math.abs(fst[k][0]-rz)>.01){const a=fst[k-1],b=fst[k],t=(rz-a[0])/(b[0]-a[0]);mid=a.map((v,i)=>v+(b[i]-v)*t)}
    const back=fst.filter(s=>s[0]<=rz+.01).concat(mid?[mid]:[]), front=(mid?[mid]:[]).concat(fst.filter(s=>s[0]>=rz-.01));add(loftGeo(back),body,'fuse').userData.st=back;add(loftGeo(front,{capTail:false}),dark,'radome')}
  else add(loftGeo(fst),body,'fuse');
  const cz=S.canopy[0],cut=add(loftGeo(rz!=null?g.getObjectByName('fuse').userData.st:fst,{skipTop:[cz-1.3,cz+1.4]}),body,'fuseCut');cut.visible=false;
  for(const p of S.parts||[]){const xs=p.x?[p.x,-p.x]:[0];for(const x of xs){const m=add(loftGeo(p.st,{n:p.n||12}),p.dark?dark:body);m.position.x=x;
      if(p.mouth){const [z,w,ht,hb,yc]=p.st[p.st.length-1];const mo=add(new THREE.PlaneGeometry(w*1.8,(ht+hb)*.9),black);mo.position.set(x,yc+(ht-hb)/2,z-.02)}}}
  // flying surfaces: the biggest is the wing; stubby ones are strakes/LERX; the rest move (tailplanes behind, canards ahead)
  const ws=S.wings.map(w=>{const r=w.st[0],t=w.st[w.st.length-1];return{w,r,t,span:t.x-r.x,ch:r.zle-r.zte}});
  const main=ws.reduce((a,b)=>b.t.x>a.t.x?b:a);
  ws.forEach(o=>{o.kind=o===main?'main':o.span/o.ch<.5?'fix':o.r.zle<main.r.zte?'stab':'can'});
  const hasStab=ws.some(o=>o.kind==='stab');
  for(const o of ws){const mat=o.w.dark?dark:body;
    if(o.kind==='main'||o.kind==='fix'){add(wingGeo(o.w.st),mat);
      if(o.kind==='main')for(const s of [1,-1]){
        if(hasStab){g.add(hingeStrip(o.r,o.t,.52,.94,.24,s,mat,'ail'));g.add(hingeStrip(o.r,o.t,.1,.5,.26,s,mat,'flap'))}
        else{g.add(hingeStrip(o.r,o.t,.12,.5,.2,s,mat,'elv'));g.add(hingeStrip(o.r,o.t,.52,.95,.2,s,mat,'elv'))}}}
    else for(const s of [1,-1]){const st=o.w.st.map(q=>Object.assign({},q,{x:q.x*s})),geo=wingGeo(st,false),pz=o.r.zle-o.ch*.42,piv=new THREE.Vector3(o.r.x*s,o.r.y||0,pz);
      geo.translate(-piv.x,-piv.y,-piv.z);const grp=new THREE.Group();grp.position.copy(piv);grp.name='cs';grp.userData={cs:o.kind,s,ax:[1,0,0]};add(geo,mat,null,grp);g.add(grp)}}
  // fins: rudders on the trailing edge; the J-20's fins are all-moving
  const allMove=type==='J20';
  for(const f of S.fins||[]){const xs=f.mirror?[f.x,-f.x]:[f.x||0];xs.forEach((x,i)=>{const gr=new THREE.Group();gr.name='finG';gr.position.set(x,f.y||0,0);gr.rotation.z=(i?-1:1)*(f.cant||0);g.add(gr);
      const ventral=Math.abs(f.cant||0)>1.5, top=f.st[f.st.length-1].h;
      if(allMove&&!ventral){const b0=finAt(f.st,0),pz=b0.zle-(b0.zle-b0.zte)*.45,geo=finGeo(f.st);geo.translate(0,0,-pz);const mg=new THREE.Group();mg.position.z=pz;mg.name='cs';mg.userData={cs:'afin',s:i?-1:1,ax:[0,1,0]};add(geo,body,null,mg);gr.add(mg)}
      else add(finGeo(f.st),body,null,gr);
      if(!ventral&&!allMove){const a=finAt(f.st,top*.1),b=finAt(f.st,top*.86),sc=o=>{const ch=o.zle-o.zte;return{h:o.h,zle:o.zte+ch*.3,zte:o.zte-.02,t:(o.t||.05)*1.1}};
        const A=sc(a),B=sc(b),geo=finGeo([A,B]);geo.translate(0,-A.h,-A.zle);const rg=new THREE.Group();rg.position.set(0,A.h,A.zle);rg.name='cs';
        rg.userData={cs:'rud',s:i?-1:1,ax:new THREE.Vector3(0,B.h-A.h,B.zle-A.zle).normalize().toArray()};add(geo,body,null,rg);gr.add(rg)}
      // fin markings
      if(!ventral){const m=finAt(f.st,top*.55),ch=m.zle-m.zte,hw=(m.t||.05)*ch/2*.9+.015;
        const fk=PS.nat==='rus'||PS.nat==='prc'?PS.nat:PS.nat==='fra'||PS.nat==='raf'||PS.nat==='swe'||PS.nat==='ind'?PS.nat:null;
        for(const sd of [1,-1]){
          if(fk){const sz=Math.min(ch*.5,1.05),d=add(new THREE.PlaneGeometry(sz,sz*(fk==='prc'?.62:1)),decalMat(fk,null,PS.lowvis),'decal',gr);d.position.set(sd*hw,m.h,m.zle-ch*.5);d.rotation.y=sd*Math.PI/2}
          if(PS.num){const t2=finAt(f.st,top*(fk?.24:.5)),c2=t2.zle-t2.zte,w2=Math.min(c2*.75,1.6),d=add(new THREE.PlaneGeometry(w2,w2*.5),decalMat('text',{s:PS.num},PS.lowvis),'decal',gr);
            d.position.set(sd*((t2.t||.05)*c2/2*.9+.016),t2.h,t2.zle-c2*.5);d.rotation.y=sd*Math.PI/2}}}})}
  // wing markings (top surface)
  {const o=main,f=.6,x=lerp3(o.r.x,o.t.x,f),zle=lerp3(o.r.zle,o.t.zle,f),zte=lerp3(o.r.zte,o.t.zte,f),ch=zle-zte,y=lerp3(o.r.y||0,o.t.y||0,f),th=lerp3(o.r.t||.04,o.t.t||.04,f)*ch/2*.92;
    const nk=PS.nat==='usn'?'usaf':PS.nat, sz=Math.min(ch*.62,PS.nat==='usaf'||PS.nat==='usn'?1.5:1.25);
    if(nk)for(const s of (nk==='usaf'?[1]:[1,-1])){const d=add(new THREE.PlaneGeometry(sz*(nk==='usaf'||nk==='prc'?1.6:1),sz*(nk==='usaf'?.65:nk==='prc'?.62:1)),decalMat(nk,null,PS.lowvis),'decal');d.position.set(x*s,y+th+.02,zle-ch*.45);d.rotation.x=-Math.PI/2}}
  // nose numbers (Russian red bort numbers, Chinese and US Navy modex)
  if(PS.nose||PS.nat==='usaf'||PS.nat==='usn'){const zN=(rz!=null?Math.min(rz-.7,cz-1.1):cz-1.6),s=secAt(fst,zN);
    for(const sd of [1,-1]){let mat,w;if(PS.nose){mat=decalMat('text',{s:PS.nose,red:PS.nat==='rus'},PS.lowvis);w=PS.nose.length>3?1.1:.95}
      else{mat=decalMat(PS.nat,null,PS.lowvis);w=.85}
      const zz=PS.nose?zN:cz-1.75-.4, ss=PS.nose?s:secAt(fst,zz), d=add(new THREE.PlaneGeometry(w,w*(PS.nose?.5:.4)),mat,'decal');d.position.set(sd*(ss[1]+.012),ss[4]+(PS.nose?-.02:-ss[3]*.35),zz);d.rotation.y=sd*Math.PI/2}}
  // canopy: hinged at the back so it can open on the ground; frames by type
  const [cZ,cY,sx,sy,sz]=S.canopy, cg=new THREE.Group(); cg.name='canopyG'; cg.position.set(0,cY,cZ-sz*.92); g.add(cg);
  const can=add(new THREE.SphereGeometry(1,24,14),glass,'canopy',cg); can.position.set(0,0,sz*.92); can.scale.set(sx,sy,sz);
  const bow=(zo,par,name)=>{const k=Math.sqrt(Math.max(.05,1-(zo/sz)**2)),fr=add(new THREE.TorusGeometry(sx*k*.99,.035,5,18,Math.PI),dark,name||'cframe',par||cg);fr.position.set(0,0,(par===g?cZ:sz*.92)+zo);if(par===g)fr.position.y=cY;fr.scale.set(1,sy/sx,1);return fr};
  if(S.frame)bow(S.frame);
  if(!/^F16/.test(type))bow(sz*.58,g,'wsbow');
  if(type==='F15EX')bow(-.1);
  if(/^(MIG|SU)/.test(type))bow(sz*.12);
  for(const s of [1,-1]){const r=add(new THREE.BoxGeometry(.05,.05,sz*1.75),dark,'cframe',cg);r.position.set(s*sx*.99,0,sz*.92)}
  // pilot (helmet, visor, shoulders), hidden in the cockpit view
  {const D=AC_DEFS[type],e=D&&D.eye?D.eye:[0,cY+sy*.38,cZ+sz*.12],pg=new THREE.Group();pg.name='pilot';g.add(pg);
    const rus=/^(MIG|SU)/.test(type),hm=new THREE.MeshStandardMaterial({color:rus?0xe8e8e2:0x6f7478,roughness:.45}),vm=new THREE.MeshStandardMaterial({color:0x1a1408,roughness:.08,metalness:.9}),sm=new THREE.MeshStandardMaterial({color:rus?0x55603f:0x4f5a43,roughness:.9});
    const h=add(new THREE.SphereGeometry(.15,12,10),hm,null,pg);h.position.set(0,e[1]-.05,e[2]-.1);
    const v=add(new THREE.SphereGeometry(.152,12,8,-Math.PI*.35,Math.PI*.7,Math.PI*.3,Math.PI*.3),vm,null,pg);v.position.copy(h.position);
    const sh=add(new THREE.BoxGeometry(.46,.3,.32),sm,null,pg);sh.position.set(0,e[1]-.36,e[2]-.18);
    const hr=add(new THREE.BoxGeometry(.5,.55,.12),dark,null,pg);hr.position.set(0,e[1]-.15,e[2]-.42)}
  if(S.irst){const ir=add(new THREE.SphereGeometry(.13,10,8),new THREE.MeshStandardMaterial({color:0x2a2a1a,roughness:.1,metalness:.8}),'irst');ir.position.set(...S.irst)}
  if(S.probe){const pr=add(new THREE.CylinderGeometry(.045,.045,S.probe[3],5).rotateX(Math.PI/2),dark);pr.position.set(S.probe[0],S.probe[1],S.probe[2])}
  if(S.stinger)add(loftGeo(S.stinger,{n:10}),body);
  // nozzles: petals open in afterburner; thrust-vectoring ones swivel; a faint heat-haze plume behind each
  const fm=new THREE.MeshBasicMaterial({color:c.flame,transparent:true,opacity:.85,blending:THREE.AdditiveBlending,depthWrite:false});
  const fl=new THREE.Group(); fl.name='flame'; fl.position.set(0,S.noz[0][1],S.noz[0][2]-S.noz[0][4]*.5-.1); g.add(fl);
  for(const [x,y,z,r,len] of S.noz){const ng=new THREE.Group();ng.name='nozG';ng.userData={s:Math.sign(x)};ng.position.set(x,y,z+len*.5);g.add(ng);
    const n=add(new THREE.CylinderGeometry(r*.94,r,len,18,1,true).rotateX(Math.PI/2),metal,'noz',ng);n.position.z=-len*.5;
    const lip=add(new THREE.TorusGeometry(r*.98,.03,4,18),dark,null,n);lip.position.z=-len*.5;
    const th=add(new THREE.CircleGeometry(r*.85,16),black,null,ng);th.position.z=-len*.2;th.rotation.y=Math.PI;
    const hz=add(HAZE_GEO,HAZE_MAT,'haze',ng);hz.position.z=-len;hz.scale.set(r/.5,r/.5,1);
    const cgm=new THREE.ConeGeometry(r*.82,3.6,12,1,true);cgm.rotateX(-Math.PI/2);cgm.translate(0,0,-1.8);const m=new THREE.Mesh(cgm,fm);m.position.x=x;fl.add(m)}
  // stores: rails carry the real missile sizes for this jet's weapons; pylons go away with their missile
  const ac=AC_DEFS[type], d9=MSL_DIM[ac.srFull]||[3,.09], dM=MSL_DIM[ac.mrFull]||[3.7,.1];
  const lr=type==='SU35'&&c===PLAYER_COLORS&&suLR, d120=lr?MSL_DIM['R-37M']:dM;
  const pyl=(x,y,z,top,nm)=>{if(top==null||top-y<.25)return;const p=add(new THREE.BoxGeometry(.09,top-y-.1,1.4),dark,'py_'+nm);p.position.set(x,(top+y)/2,z)};
  (S.r9||[]).forEach(([x,y,z,top],i)=>{const m=mslMesh(d9[0],d9[1],white,'r9_'+i);m.position.set(x,y,z);g.add(m);pyl(x,y+d9[1],z,top,'r9_'+i)});
  (lr&&S.r120lr?S.r120lr:S.r120||[]).forEach(([x,y,z,top],i)=>{const m=mslMesh(d120[0],d120[1],white,'r120_'+i);m.position.set(x,y,z);g.add(m);if(!S.internal)pyl(x,y+d120[1],z,top,'r120_'+i)});
  if(S.hook){const h=add(new THREE.BoxGeometry(.08,.08,1.6),dark);h.position.set(0,S.hook[1],S.hook[0])}
  body.userData.pu.pTail.value=Math.min(...S.noz.map(n=>n[2]))+.6;
  bakePaint(g,body);
  root.userData.spec=S;
  return root}
// heat haze: a faint, rippling plume behind each nozzle
const HAZE_GEO=(()=>{const g=new THREE.CylinderGeometry(1.15,.5,7,14,6,true);g.rotateX(Math.PI/2);g.translate(0,0,-3.5);return g})();
const HAZE_MAT=new THREE.ShaderMaterial({transparent:true,depthWrite:false,side:THREE.DoubleSide,uniforms:{t:{value:0},k:{value:0}},
  vertexShader:'varying vec3 vP;varying float vF;void main(){vP=position;vec4 mv=modelViewMatrix*vec4(position,1.);vec3 n=normalize(normalMatrix*normal);vF=abs(dot(n,normalize(-mv.xyz)));gl_Position=projectionMatrix*mv;}',
  fragmentShader:'uniform float t,k;varying vec3 vP;varying float vF;void main(){float a=sin(vP.z*3.1+t*31.)*sin(atan(vP.y,vP.x)*5.+vP.z*1.7-t*23.)*.5+.5;float f=smoothstep(-7.,-4.5,vP.z)*smoothstep(0.,-.6,vP.z);'+
    'gl_FragColor=vec4(vec3(.9+.1*a),(.012+.03*a)*f*vF*vF*k);}'});
// far-away jets drop their small details (markings, pilot, frames, haze) to save draw calls
const DET_NAMES=new Set(['decal','pilot','haze','cframe','wsbow','hole','cs']);
function lodJet(obj,d){if(!obj)return;const far=d>1400;if(obj.__far===far)return;obj.__far=far;
  if(!obj.__det){obj.__det=[];obj.traverse(o=>{if(DET_NAMES.has(o.name)&&o.name!=='cs')obj.__det.push(o)})}
  for(const o of obj.__det)o.visible=!far}
// control surfaces, nozzles and canopy follow the stick, throttle and ground state
const _ax=new THREE.Vector3();
function animJet(obj,j,dt,isPlayer){
  if(!obj)return; let A=obj.__anim;
  if(!A){A=obj.__anim={cs:[],noz:[],can:null,d:new Map()};obj.traverse(o=>{if(o.name==='cs')A.cs.push(o);else if(o.name==='nozG')A.noz.push(o);else if(o.name==='canopyG')A.can=o;else if(o.name&&o.name.startsWith('py_'))(A.py||(A.py=[])).push(o)});
    if(A.py)A.py.forEach(p=>p.__rail=obj.getObjectByName(p.name.slice(3)))}
  const ci=j&&j.ci||[0,0,0,0], ground=isPlayer&&P.onGround, k=1-Math.exp(-dt*12);
  const r=ground?0:ci[0], p=ground?0:ci[1], y=ci[2]||0, thr=isPlayer?throttle:(ci[3]||.6), slow=j&&j.kcas!=null?clamp((230-j.kcas)/90,0,1):0, gearDn=isPlayer&&P.gear?1:0;
  for(const o of A.cs){const u=o.userData,s=u.s;let t=0;
    switch(u.cs){case 'stab':t=-p*.33+s*r*.12;break;case 'can':t=p*.28-s*r*.04;break;case 'ail':t=s*r*.38;break;case 'flap':t=Math.max(slow*.4,gearDn*.55);break;
      case 'elv':t=s*r*.3-p*.28;break;case 'rud':t=y*.45-r*.06;break;case 'afin':t=(y*.3-r*.04)*s;break}
    const d=(o.__d||0)+(t-(o.__d||0))*k;o.__d=d;_ax.fromArray(u.ax);o.quaternion.setFromAxisAngle(_ax,u.cs==='rud'||u.cs==='afin'?d:-d)}
  const ab=thr>.81, tv=j&&j.ac&&j.ac.tvc;
  for(const n of A.noz){const ns=ab?1.13:thr<.25?1.02:.93,c=n.children[0];if(c){const v=c.scale.x+(ns-c.scale.x)*k*.5;c.scale.set(v,v,1)}
    if(tv){const tt=clamp(p*.28+n.userData.s*r*.08,-.26,.26);n.rotation.x+=(tt-n.rotation.x)*k}}
  if(A.py)for(const q of A.py)if(q.__rail)q.visible=q.__rail.visible;
  if(A.can){const open=isPlayer&&P.onGround&&Math.hypot(P.vel.x,P.vel.z)<1.5&&throttle<.08&&state!=='menu'?1:0;A.op=(A.op||0)+clamp(open-(A.op||0),-dt*.7,dt*.7);A.can.rotation.x=-A.op*.72}
}


// ---- per-type geometry (metres). Built from published dimensions (length, span, height, wing area) and three-view proportions.
const M2={};
const mir=a=>a.flatMap(p=>p[0]?[p,[-p[0],...p.slice(1)]]:[p]);
M2.F16={L:15.06,nz:3.0,radome:6.2,
  fus:[[-7.0,.5,.52,.5,.05,2.4],[-6.0,.62,.62,.56,.05,2.5],[-4.5,.78,.66,.62,0,2.6],[-2.5,.9,.66,.66,0,2.8],[-.5,.92,.64,.66,0,2.8],[1.5,.82,.62,.6,0,2.6],[3.0,.7,.6,.5,0,2.4],[4.2,.62,.58,.45,0,2.2],[5.4,.52,.46,.42,0,2.1],[6.2,.42,.36,.36,-.02,2],[7.0,.22,.2,.2,-.05,2],[7.6,0,0,0,-.08,2]],
  parts:[{x:0,mouth:1,st:[[-2.0,.38,.15,.22,-.62,2.2],[0,.5,.2,.32,-.72,2.4],[2.0,.56,.2,.42,-.82,2.6],[3.3,.56,.2,.44,-.86,3]]}],
  wings:[{st:[{x:.85,zle:1.3,zte:-3.95,y:-.08,t:.04},{x:4.6,zle:-1.95,zte:-3.05,y:-.08,t:.03}]},{st:[{x:.55,zle:4.4,zte:.6,y:0,t:.02},{x:1.05,zle:1.35,zte:.6,y:-.05,t:.02}]},
    {st:[{x:.7,zle:-5.0,zte:-7.0,y:-.1,t:.035},{x:2.79,zle:-6.55,zte:-7.35,y:-.25,t:.03}]}],
  fins:[{x:0,y:.5,st:[{h:0,zle:-3.4,zte:-6.45,t:.05},{h:.6,zle:-3.9,zte:-6.5},{h:2.9,zle:-5.75,zte:-6.85,t:.04}]},{x:.62,y:-.42,cant:-2.6,mirror:1,st:[{h:0,zle:-3.9,zte:-4.9},{h:.5,zle:-4.3,zte:-4.95}]}],
  canopy:[3.6,.62,.42,.42,1.45],frame:-1.2,noz:[[0,.05,-7.25,.5,1.2]],
  r9:mir([[4.78,-.08,-2.4,null]]),r120:mir([[3.55,-.55,-1.7,-.12],[2.35,-.6,-1.3,-.1]])};
M2.F16B70=Object.assign({},M2.F16,{parts:[...M2.F16.parts,{x:.95,st:[[-3.4,.3,.22,.15,.48,2],[-1,.38,.28,.15,.5,2],[1.6,.3,.2,.12,.48,2]]}]});
M2.F15C={L:19.43,nz:5.6,radome:7.0,
  fus:[[-8.5,.55,.5,.45,.15,2.4],[-6.5,.75,.55,.5,.15,2.6],[-4,.85,.6,.5,.15,2.8],[-1,.85,.62,.5,.2,2.8],[2,.75,.62,.5,.25,2.6],[4,.68,.62,.48,.2,2.4],[5.5,.6,.55,.45,.15,2.2],[7.0,.5,.45,.4,.1,2],[8.3,.36,.32,.3,.05,2],[9.2,.18,.16,.16,0,2],[9.7,0,0,0,0,2]],
  parts:[{x:1.1,mouth:1,st:[[-8.6,.55,.55,.6,-.1,2.6],[-5,.66,.6,.62,-.1,3],[-1,.64,.62,.62,-.1,3.4],[2.5,.56,.65,.6,-.05,4],[3.6,.55,.68,.6,0,5]]}],
  wings:[{st:[{x:1.6,zle:1.5,zte:-4.6,y:.1,t:.05},{x:6.5,zle:-3.4,zte:-5.0,y:.05,t:.035}]},{st:[{x:1.5,zle:-6.4,zte:-8.9,y:-.05,t:.035},{x:4.3,zle:-8.3,zte:-9.5,y:-.05,t:.03}]}],
  fins:[{x:1.55,y:.5,cant:-.04,mirror:1,st:[{h:0,zle:-4.9,zte:-8.7,t:.05},{h:3.1,zle:-7.8,zte:-9.4,t:.04}]}],
  canopy:[5.0,.95,.5,.5,1.9],frame:-1.5,noz:[[.82,.15,-9.0,.56,1.3],[-.82,.15,-9.0,.56,1.3]],
  r9:mir([[4.05,-.65,-2.4,.05]]),r120:mir([[3.2,-.7,-2.2,.07],[1.55,-.85,1.8,-.55],[1.55,-.85,-3.2,-.55]])};
M2.F15EX=Object.assign({},M2.F15C,{parts:[...M2.F15C.parts,{x:1.72,st:[[-4.6,.3,.35,.3,.05,2],[-1,.36,.4,.32,.05,2],[2.2,.3,.35,.28,.05,2]]}],
  r9:mir([[4.35,-.65,-2.5,.05],[2.9,-.65,-2.3,.08]]),r120:mir([[3.62,-.95,-2.0,.07],[1.55,-.85,1.8,-.55],[1.55,-.85,-3.2,-.55],[2.15,-.75,-.6,-.3]])});
M2.FA18E={L:18.31,nz:5.3,radome:7.0,
  fus:[[-8.8,.5,.45,.4,.15,2.4],[-7,.7,.5,.45,.15,2.6],[-4,.85,.55,.5,.1,2.8],[-1,.9,.55,.55,.05,2.8],[2,.75,.6,.5,.05,2.6],[4,.62,.6,.45,.05,2.3],[5.5,.55,.5,.42,0,2.1],[7,.42,.38,.36,-.05,2],[8.4,.24,.2,.2,-.08,2],[9.1,0,0,0,-.1,2]],
  parts:[{x:1.1,mouth:1,st:[[-6.5,.5,.4,.45,-.25,2.6],[-2,.55,.42,.5,-.3,3],[1.5,.5,.35,.5,-.38,3.4],[2.6,.48,.3,.48,-.42,3.6]]}],
  wings:[{st:[{x:.5,zle:6.0,zte:.8,y:.18,t:.02},{x:1.45,zle:1.4,zte:.6,y:.12,t:.02}]},{st:[{x:1.45,zle:1.0,zte:-3.6,y:.05,t:.05},{x:6.55,zle:-1.95,zte:-3.4,y:0,t:.035}]},
    {st:[{x:1.1,zle:-5.5,zte:-8.0,y:-.05,t:.035},{x:3.5,zle:-7.2,zte:-8.3,y:-.05,t:.03}]}],
  fins:[{x:1.05,y:.45,cant:-.35,mirror:1,st:[{h:0,zle:-2.8,zte:-5.8,t:.05},{h:2.7,zle:-5.3,zte:-6.6,t:.04}]}],
  canopy:[4.6,.8,.48,.46,1.6],frame:-1.3,noz:[[.58,.1,-8.75,.5,1.1],[-.58,.1,-8.75,.5,1.1]],hook:[-8.2,-.3],
  r9:mir([[6.75,0,-2.6,null]]),r120:mir([[4.9,-.62,-1.9,.0],[3.4,-.65,-1.5,.02],[1.15,-.95,-1.0,-.6]])};
M2.GRIPEN={L:14.1,nz:3.6,radome:5.6,
  fus:[[-6.3,.5,.45,.42,.05,2.4],[-5,.6,.55,.5,.05,2.6],[-3,.7,.6,.55,0,2.8],[-.5,.72,.6,.55,0,2.8],[1.5,.66,.6,.5,0,2.6],[3.0,.58,.58,.45,0,2.3],[4.4,.48,.45,.4,-.02,2.1],[5.6,.36,.32,.3,-.04,2],[6.5,.18,.16,.16,-.06,2],[7.0,0,0,0,-.08,2]],
  parts:[{x:.82,mouth:1,st:[[-1.5,.32,.4,.45,-.1,2.4],[1.5,.36,.45,.5,-.05,3],[3.1,.33,.42,.48,0,3.4]]}],
  wings:[{st:[{x:.6,zle:1.3,zte:-4.6,y:-.18,t:.04},{x:4.2,zle:-2.9,zte:-4.1,y:-.2,t:.03}]},{st:[{x:.95,zle:3.2,zte:1.3,y:.2,t:.035},{x:2.45,zle:1.95,zte:1.3,y:.22,t:.03}]}],
  fins:[{x:0,y:.5,st:[{h:0,zle:-2.1,zte:-5.2,t:.05},{h:3.0,zle:-4.6,zte:-5.6,t:.04}]}],
  canopy:[3.5,.72,.42,.42,1.35],frame:-1.1,noz:[[0,.05,-6.6,.47,.9]],
  r9:mir([[4.3,-.2,-3.0,null]]),r120:mir([[3.0,-.65,-2.1,-.22],[1.95,-.68,-1.8,-.2]])};
M2.TYPHOON={L:15.96,nz:4.6,radome:6.3,
  fus:[[-7.1,.55,.5,.45,.15,2.4],[-5.5,.7,.6,.5,.12,2.6],[-3,.8,.62,.55,.05,2.8],[-.5,.8,.62,.55,0,2.8],[2,.66,.62,.5,0,2.4],[3.8,.58,.6,.45,0,2.2],[5.2,.5,.5,.42,0,2],[6.6,.36,.32,.3,-.03,2],[7.5,.18,.16,.16,-.05,2],[7.9,0,0,0,-.06,2]],
  parts:[{x:0,mouth:1,st:[[-3.5,.72,.2,.45,-.65,3],[0,.9,.25,.55,-.7,3.4],[2.2,.88,.22,.55,-.72,4],[3.0,.85,.2,.52,-.72,5]]}],
  wings:[{st:[{x:.75,zle:.9,zte:-6.3,y:-.15,t:.04},{x:5.45,zle:-5.2,zte:-6.2,y:-.18,t:.03}]},{st:[{x:.6,zle:5.0,zte:3.7,y:.15,t:.035},{x:2.2,zle:3.95,zte:3.55,y:.15,t:.03}]}],
  fins:[{x:0,y:.55,st:[{h:0,zle:-2.9,zte:-6.6,t:.05},{h:3.1,zle:-5.9,zte:-7.0,t:.04}]}],
  canopy:[4.05,.78,.44,.44,1.4],frame:-1.2,noz:[[.5,.1,-7.35,.47,1.0],[-.5,.1,-7.35,.47,1.0]],
  r9:mir([[4.75,-.6,-3.4,-.17]]),r120:mir([[3.65,-.62,-2.6,-.16],[2.6,-.62,-2.0,-.16],[.98,-.78,-2.6,-.5]])};
M2.RAFALE={L:15.27,nz:4.3,radome:5.7,probe:[-.38,.62,5.6,1.8],
  fus:[[-6.9,.5,.48,.42,.12,2.4],[-5.3,.62,.58,.5,.1,2.6],[-3,.72,.6,.55,.05,2.8],[-.5,.72,.62,.55,0,2.8],[1.8,.62,.62,.48,0,2.4],[3.6,.55,.6,.42,0,2.2],[5.0,.45,.46,.38,0,2],[6.4,.3,.28,.26,-.03,2],[7.5,0,0,0,-.05,2]],
  parts:[{x:.92,mouth:1,st:[[-1.8,.38,.35,.42,-.35,2.4],[1.0,.42,.38,.46,-.4,2.6],[2.5,.4,.36,.45,-.42,2.2]]}],
  wings:[{st:[{x:.7,zle:1.0,zte:-6.0,y:-.1,t:.04},{x:5.45,zle:-4.6,zte:-5.75,y:-.12,t:.03}]},{st:[{x:.8,zle:2.9,zte:1.3,y:.42,t:.035},{x:2.45,zle:1.7,zte:1.2,y:.45,t:.03}]}],
  fins:[{x:0,y:.5,st:[{h:0,zle:-2.6,zte:-6.3,t:.05},{h:3.1,zle:-5.6,zte:-6.9,t:.04}]}],
  canopy:[3.8,.75,.42,.42,1.3],frame:-1.1,noz:[[.47,.08,-7.0,.45,.9],[-.47,.08,-7.0,.45,.9]],
  r9:mir([[5.45,-.12,-3.6,null],[4.2,-.6,-2.9,-.12]]),r120:mir([[3.0,-.62,-2.2,-.1],[.8,-.75,-2.8,-.5]])};
M2.J10C={L:16.9,nz:4.2,radome:6.6,probe:[-.5,.45,6.6,1.6],
  fus:[[-7.0,.55,.55,.45,.1,2.4],[-5.4,.66,.62,.5,.08,2.6],[-3,.74,.65,.52,.05,2.8],[-.5,.74,.65,.55,0,2.8],[2,.66,.65,.5,0,2.6],[4.0,.58,.62,.45,0,2.3],[5.6,.48,.5,.4,-.02,2.1],[7.0,.32,.3,.28,-.04,2],[8.2,0,0,0,-.06,2]],
  parts:[{x:0,mouth:1,st:[[-3.0,.55,.2,.35,-.6,2.6],[0,.75,.2,.5,-.7,3],[2.8,.78,.2,.55,-.78,3.4],[3.8,.72,.15,.5,-.8,3]]}],
  wings:[{st:[{x:.75,zle:1.6,zte:-5.3,y:-.2,t:.04},{x:2.6,zle:-1.5,zte:-5.1,y:-.22,t:.035},{x:4.88,zle:-4.0,zte:-5.0,y:-.25,t:.03}]},{st:[{x:.75,zle:4.1,zte:2.7,y:.05,t:.035},{x:2.0,zle:3.1,zte:2.6,y:.05,t:.03}]}],
  fins:[{x:0,y:.55,st:[{h:0,zle:-2.3,zte:-6.4,t:.05},{h:3.3,zle:-5.7,zte:-7.3,t:.04}]},{x:.55,y:-.45,cant:-2.55,mirror:1,st:[{h:0,zle:-3.8,zte:-5.6},{h:.75,zle:-4.6,zte:-5.8}]}],
  canopy:[4.6,.8,.44,.46,1.45],frame:-1.2,noz:[[0,.1,-7.0,.55,1.1]],
  r9:mir([[4.35,-.65,-3.2,-.25]]),r120:mir([[3.3,-.7,-2.4,-.23],[2.2,-.72,-1.9,-.22]])};
M2.J20={L:21.2,nz:6.2,radome:8.2,internal:1,
  fus:[[-9.2,.75,.5,.45,.1,2.2],[-7,1.0,.55,.5,.1,2.2],[-4,1.15,.6,.55,.05,2.0],[-1,1.15,.65,.55,0,1.9],[2,1.0,.7,.5,0,1.8],[4.5,.85,.7,.45,0,1.7],[6.5,.72,.55,.4,-.02,1.6],[8.2,.55,.38,.32,-.05,1.6],[9.6,.3,.18,.18,-.06,1.6],[10.4,0,0,0,-.08,1.6]],
  parts:[{x:1.45,mouth:1,n:8,st:[[-5,.55,.45,.5,-.15,2],[0,.62,.5,.55,-.15,2.2],[3.5,.6,.55,.55,-.1,2.2],[4.9,.58,.6,.5,-.05,1.8]]}],
  wings:[{st:[{x:1.4,zle:.4,zte:-7.4,y:0,t:.035},{x:6.5,zle:-5.4,zte:-6.7,y:-.05,t:.03}]},{st:[{x:1.5,zle:4.0,zte:2.1,y:.25,t:.03},{x:3.7,zle:2.5,zte:1.9,y:.25,t:.025}]},{st:[{x:1.1,zle:2.4,zte:.3,y:.1,t:.02},{x:1.6,zle:.6,zte:.2,y:.05,t:.02}]}],
  fins:[{x:1.55,y:.5,cant:-.48,mirror:1,st:[{h:0,zle:-6.1,zte:-8.7,t:.04},{h:2.5,zle:-8.1,zte:-9.6,t:.035}]},{x:1.2,y:-.4,cant:-2.7,mirror:1,st:[{h:0,zle:-6.4,zte:-8.2},{h:.9,zle:-7.4,zte:-8.5}]}],
  canopy:[5.0,.9,.5,.48,1.8],frame:-1.5,noz:[[.78,.1,-9.7,.6,1.2],[-.78,.1,-9.7,.6,1.2]],
  r9:mir([[1.3,-.3,.8,null]]),r120:mir([[.5,-.42,-1.0,null],[.5,-.42,-3.6,null]])};
M2.MIG29={L:17.32,nz:5.0,radome:7.0,irst:[.2,.68,6.0],
  fus:[[-6,.9,.35,.3,.05,3],[-3,1.1,.4,.3,.05,3.2],[0,1.0,.5,.3,.1,3],[2.5,.62,.62,.4,.15,2.4],[4.2,.55,.62,.42,.1,2.2],[5.6,.48,.5,.4,.05,2.1],[7.0,.35,.34,.3,0,2],[8.2,.18,.16,.16,-.02,2],[8.8,0,0,0,-.04,2]],
  parts:[{x:1.05,mouth:1,st:[[-8.0,.55,.55,.55,-.35,2.2],[-5.0,.62,.6,.6,-.4,2.4],[-1.0,.6,.55,.6,-.45,2.8],[2.0,.5,.45,.5,-.55,3.4],[3.4,.48,.42,.48,-.6,4]]}],
  wings:[{st:[{x:.55,zle:5.6,zte:1.0,y:.12,t:.02},{x:1.75,zle:1.2,zte:.6,y:.05,t:.02}]},{st:[{x:1.7,zle:1.2,zte:-3.7,y:0,t:.045},{x:5.68,zle:-2.4,zte:-3.8,y:-.1,t:.035}]},
    {st:[{x:1.6,zle:-5.9,zte:-8.2,y:-.2,t:.035},{x:3.95,zle:-7.5,zte:-8.4,y:-.25,t:.03}]}],
  fins:[{x:1.55,y:.25,cant:-.12,mirror:1,st:[{h:0,zle:-3.9,zte:-7.2,t:.05},{h:3.05,zle:-6.5,zte:-7.9,t:.04}]}],
  canopy:[4.6,.78,.45,.45,1.5],frame:-1.2,noz:[[1.05,-.35,-8.4,.54,1.0],[-1.05,-.35,-8.4,.54,1.0]],
  r9:mir([[4.65,-.55,-2.6,-.1],[3.65,-.55,-2.2,-.05]]),r120:mir([[2.65,-.62,-1.8,-.02]])};
M2.MIG29UPG=Object.assign({},M2.MIG29,{probe:[.55,.45,6.4,1.5],parts:[...M2.MIG29.parts,{x:0,st:[[-6,.45,.5,.02,.35,2],[-1,.5,.55,.02,.4,2.2],[3.0,.4,.45,.02,.45,2]]}],
  r9:mir([[4.65,-.55,-2.6,-.1]]),r120:mir([[3.65,-.55,-2.2,-.05],[2.65,-.62,-1.8,-.02]])});
M2.MIG35=Object.assign({},M2.MIG29,{probe:[.55,.45,6.4,1.5],parts:[...M2.MIG29.parts,{x:0,st:[[-6.5,.5,.75,.02,.35,2],[-1,.55,.8,.02,.4,2.2],[3.4,.42,.55,.02,.5,2]]}],
  r9:mir([[4.95,-.5,-2.9,-.12]]),r120:mir([[4.05,-.55,-2.5,-.1],[3.15,-.58,-2.1,-.06],[2.25,-.62,-1.8,-.02]])});
M2.MIG29K=Object.assign({},M2.MIG35,{hook:[-7.6,-.6],wings:[M2.MIG29.wings[0],{st:[{x:1.7,zle:1.3,zte:-3.9,y:0,t:.045},{x:6.0,zle:-2.6,zte:-4.0,y:-.1,t:.035}]},M2.MIG29.wings[2]]});
M2.SU27={L:21.94,nz:6.8,radome:8.4,irst:[.25,.85,7.7],
  fus:[[-7.5,1.2,.45,.35,.1,3.2],[-4,1.5,.5,.35,.1,3.4],[-.5,1.4,.65,.38,.15,3],[2.5,.9,.8,.45,.2,2.4],[4.6,.72,.8,.5,.15,2.2],[6.4,.62,.68,.5,.1,2.1],[8.2,.48,.46,.42,.05,2],[9.8,.3,.26,.24,0,2],[11.0,0,0,0,-.03,2]],
  parts:[{x:1.35,mouth:1,st:[[-10.2,.62,.62,.62,-.5,2.2],[-6,.72,.66,.66,-.55,2.4],[-1,.7,.6,.7,-.6,2.8],[2.5,.62,.5,.62,-.7,3.4],[4.2,.6,.45,.58,-.75,4]]}],
  stinger:[[-12.0,.12,.12,.12,.05,2],[-9.5,.4,.35,.3,.05,2],[-7.4,.6,.4,.35,.1,2.4]],
  wings:[{st:[{x:.6,zle:7.0,zte:1.5,y:.15,t:.02},{x:2.1,zle:1.6,zte:.8,y:.1,t:.02}]},{st:[{x:2.1,zle:1.6,zte:-5.2,y:.05,t:.045},{x:7.1,zle:-3.0,zte:-4.6,y:-.1,t:.035}]},
    {st:[{x:2.0,zle:-7.6,zte:-10.4,y:-.25,t:.035},{x:4.95,zle:-9.6,zte:-10.7,y:-.3,t:.03}]}],
  fins:[{x:2.05,y:.1,cant:0,mirror:1,st:[{h:0,zle:-5.6,zte:-9.6,t:.05},{h:3.4,zle:-8.8,zte:-10.3,t:.04}]},{x:2.05,y:-.35,cant:-3.0,mirror:1,st:[{h:0,zle:-6.5,zte:-8.2},{h:.9,zle:-7.2,zte:-8.4}]}],
  canopy:[6.1,1.05,.55,.55,1.75],frame:-1.4,noz:[[1.35,-.5,-10.6,.62,1.1],[-1.35,-.5,-10.6,.62,1.1]],
  r9:mir([[7.35,-.1,-3.9,null],[6.0,-.72,-3.4,-.05]]),r120:mir([[4.7,-.85,-2.4,0],[3.4,-.85,-2.0,.02],[1.45,-1.6,1.2,-1.33]])};
M2.SU33=Object.assign({},M2.SU27,{hook:[-10.8,-.6],probe:[.55,.62,9.2,1.5],stinger:[[-11.3,.14,.14,.14,.05,2],[-9.5,.4,.35,.3,.05,2],[-7.4,.6,.4,.35,.1,2.4]],
  wings:[...M2.SU27.wings,{st:[{x:1.0,zle:6.2,zte:4.6,y:.25,t:.03},{x:3.2,zle:4.9,zte:4.4,y:.25,t:.025}]}]});
M2.SU35=Object.assign({},M2.SU27,{probe:[.55,.62,9.2,1.5],stinger:[[-12.6,.12,.12,.12,.05,2],[-9.5,.42,.35,.3,.05,2],[-7.4,.6,.4,.35,.1,2.4]],
  r120:mir([[4.7,-.85,-2.4,0],[3.4,-.85,-2.0,.02],[1.45,-1.6,1.2,-1.33]]).concat([[0,-.72,1.6,-.25],[0,-.72,-3.2,-.25]]),
  r120lr:mir([[1.45,-1.62,1.0,-1.33],[3.4,-.9,-2.0,.02]])});
// Gripen E: 15.2 m (stretched nose and centre section) with a larger wing
{const k=15.2/14.1,G=M2.GRIPEN,sz=a=>a.map(s=>[s[0]*k,...s.slice(1)]),sw=w=>({st:w.st.map(s=>Object.assign({},s,{zle:s.zle*k,zte:s.zte*k,x:s.x*1.04}))});
  M2.GRIPENE=Object.assign({},G,{L:15.2,nz:G.nz*k,radome:G.radome*k,fus:sz(G.fus),parts:G.parts.map(p=>Object.assign({},p,{st:sz(p.st)})),wings:G.wings.map(sw),
    fins:G.fins.map(f=>Object.assign({},f,{st:f.st.map(s=>Object.assign({},s,{zle:s.zle*k,zte:s.zte*k}))})),canopy:[G.canopy[0]*k,...G.canopy.slice(1)],noz:G.noz.map(n=>[n[0],n[1],n[2]*k,n[3]*1.04,n[4]]),
    irst:[.22,.62,5.0*k],r9:G.r9.map(r=>[r[0]*1.04,r[1],r[2]*k,r[3]]),r120:G.r120.map(r=>[r[0]*1.04,r[1],r[2]*k,r[3]])})}
// derived: cockpit eye point, nav lights, engine smoke points, shadow and vapour span for each
for(const id in M2){const S=M2[id],D=AC_DEFS[id];if(!D)continue;const [cz,cy,sx,sy,sz]=S.canopy;
  const wing=S.wings.reduce((a,w)=>{const t=w.st[w.st.length-1];return t.x>a.x?t:a},{x:0});const fin=S.fins[0],ft=fin.st[fin.st.length-1];
  D.eye=[0,cy+sy*.38,cz+sz*.12];
  D.fx=Object.assign({},D.fx||{},{eng:S.noz.map(n=>[n[0],n[2]-n[4]*.6]),vapor:wing.x,nav:[wing.x,ft.zte+.2,(fin.y||0)+ft.h+(fin.x?0:0)],navZ:(wing.zle+wing.zte)/2,shadow:[S.L,wing.x*2],nz:S.nz});
  D.cut={r:.6,full:[-8,cz-1.2],open:[cz-1.2,cz+1.4]}}

// Tu-22M3-style swing-wing bomber (42 m) and a C-130-style transport (30 m long, 40 m span)
function buildBomber(c){
  const g=new THREE.Group(),root=new THREE.Group();root.add(g);
  const body=new THREE.MeshStandardMaterial({color:0x8d9196,roughness:.7,flatShading:true,side:THREE.DoubleSide});
  const dark=new THREE.MeshStandardMaterial({color:0x3a3d40,roughness:.6,flatShading:true,side:THREE.DoubleSide});
  const add=(geo,mat,x,y,z)=>{const m=new THREE.Mesh(geo,mat);m.position.set(x,y,z);g.add(m);return m};
  let geo=new THREE.CylinderGeometry(1.7,1.9,34,12);geo.rotateX(Math.PI/2);add(geo,body,0,0,0);
  geo=new THREE.ConeGeometry(1.7,7,12);geo.rotateX(Math.PI/2);add(geo,body,0,0,20.5);
  for(const s of [1,-1]){add(new THREE.BoxGeometry(1.6,2.2,12),body,2.3*s,-.2,-5);
    const sh=new THREE.Shape();sh.moveTo(2.5*s,6);sh.lineTo(15*s,-4);sh.lineTo(15*s,-6);sh.lineTo(2.5*s,-3);
    const eg=new THREE.ExtrudeGeometry(sh,{depth:.35,bevelEnabled:false});eg.rotateX(Math.PI/2);g.add(new THREE.Mesh(eg,body));
    geo=new THREE.CylinderGeometry(.85,.75,1.2,10,1,true);geo.rotateX(Math.PI/2);add(geo,dark,2.3*s,-.2,-11.5)}
  const ts=new THREE.Shape();ts.moveTo(-9,1.5);ts.lineTo(-17,1.5);ts.lineTo(-19,9);ts.lineTo(-15.5,9);ts.lineTo(-9,1.5);
  const tg=new THREE.ExtrudeGeometry(ts,{depth:.4,bevelEnabled:false});tg.rotateY(-Math.PI/2);tg.translate(.2,0,0);g.add(new THREE.Mesh(tg,body));
  const hs=new THREE.Shape();hs.moveTo(-9,-14);hs.lineTo(9,-14);hs.lineTo(6,-17.5);hs.lineTo(-6,-17.5);
  const he=new THREE.ExtrudeGeometry(hs,{depth:.3,bevelEnabled:false});he.rotateX(Math.PI/2);he.translate(0,1.5,0);g.add(new THREE.Mesh(he,body));
  return root;
}
function buildTransport(c){
  const g=new THREE.Group(),root=new THREE.Group();root.add(g);
  const body=new THREE.MeshStandardMaterial({color:0x6f7a6c,roughness:.75,flatShading:true,side:THREE.DoubleSide});
  const dark=new THREE.MeshStandardMaterial({color:0x2e3330,roughness:.6,flatShading:true});
  const add=(geo,mat,x,y,z)=>{const m=new THREE.Mesh(geo,mat);m.position.set(x,y,z);g.add(m);return m};
  let geo=new THREE.CylinderGeometry(2.1,2.1,22,12);geo.rotateX(Math.PI/2);add(geo,body,0,0,1);
  geo=new THREE.SphereGeometry(2.1,12,8);add(geo,body,0,0,12).scale.set(1,1,1.4);
  geo=new THREE.ConeGeometry(2.1,8,12);geo.rotateX(-Math.PI/2);add(geo,body,0,.7,-14).scale.set(1,.7,1);
  add(new THREE.BoxGeometry(40.4,.5,4),body,0,2,2);
  for(const x of [-12,-6,6,12]){geo=new THREE.CylinderGeometry(.7,.7,4,8);geo.rotateX(Math.PI/2);add(geo,dark,x,1.6,4);add(new THREE.BoxGeometry(4.2,.12,.3),dark,x,1.6,6.1)}
  const ts=new THREE.Shape();ts.moveTo(-12,2);ts.lineTo(-18,2);ts.lineTo(-18.5,10);ts.lineTo(-15,10);ts.lineTo(-12,2);
  const tg=new THREE.ExtrudeGeometry(ts,{depth:.3,bevelEnabled:false});tg.rotateY(-Math.PI/2);tg.translate(.15,0,0);g.add(new THREE.Mesh(tg,body));
  add(new THREE.BoxGeometry(16,.3,4),body,0,1.8,-16.5);
  return root;
}
const PLAYER_COLORS={body:0x8a95a0,dark:0x394049,glass:0xc9a24a,glassE:0x2a1d00,flame:0xffa64a};
const playerJet=buildJet({body:0x8a95a0,dark:0x394049,glass:0xc9a24a,glassE:0x2a1d00,flame:0xffa64a});
scene.add(playerJet);
let pFlame=playerJet.getObjectByName('flame');


