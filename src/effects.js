/* ---------------- particles ---------------- */
const PMAX=4200;
const pPos=new Float32Array(PMAX*3),pCol=new Float32Array(PMAX*4),pSize=new Float32Array(PMAX);
const pVel=new Float32Array(PMAX*3),pLife=new Float32Array(PMAX),pMaxL=new Float32Array(PMAX),pGrow=new Float32Array(PMAX),pA=new Float32Array(PMAX);
let pNext=0;
const pGeo=new THREE.BufferGeometry();
pGeo.setAttribute('position',new THREE.BufferAttribute(pPos,3).setUsage(THREE.DynamicDrawUsage));
pGeo.setAttribute('pcol',new THREE.BufferAttribute(pCol,4).setUsage(THREE.DynamicDrawUsage));
pGeo.setAttribute('psize',new THREE.BufferAttribute(pSize,1).setUsage(THREE.DynamicDrawUsage));
const pAdd=new Float32Array(PMAX); pGeo.setAttribute('padd',new THREE.BufferAttribute(pAdd,1).setUsage(THREE.DynamicDrawUsage));
/* premultiplied alpha: smoke blends normally, fire and flares add light; both fade into the fog */
const pMat=new THREE.ShaderMaterial({transparent:true,depthWrite:false,blending:THREE.CustomBlending,blendSrc:THREE.OneFactor,blendDst:THREE.OneMinusSrcAlphaFactor,
  uniforms:{scale:{value:400},fogC:{value:new THREE.Color()},fogN:{value:4000},fogF:{value:19000}},
  vertexShader:'attribute float psize,padd;attribute vec4 pcol;uniform float scale,fogN,fogF;varying vec4 vC;varying float vA,vF;void main(){vC=pcol;vA=padd;vec4 mv=modelViewMatrix*vec4(position,1.);vF=smoothstep(fogN,fogF,-mv.z);gl_PointSize=psize*scale/max(1.,-mv.z);gl_Position=projectionMatrix*mv;}',
  fragmentShader:'uniform vec3 fogC;varying vec4 vC;varying float vA,vF;void main(){vec2 q=gl_PointCoord-.5;float r=length(q);if(r>.5)discard;'+
    'float a=vC.a*smoothstep(.5,.05,r)*(.88+.12*sin(atan(q.y,q.x)*5.+r*20.));vec3 c=mix(vC.rgb,fogC,vF*(1.-vA));a*=1.-vF*vA;'+
    'gl_FragColor=vec4(c*a*(1.-vA*.45),a*(1.-vA));}'});
const points=new THREE.Points(pGeo,pMat); points.frustumCulled=false; scene.add(points);
function puff(x,y,z,vx,vy,vz,r,g,b,a,size,grow,life){
  const i=pNext; pNext=(pNext+1)%PMAX;
  pPos[i*3]=x;pPos[i*3+1]=y;pPos[i*3+2]=z; pVel[i*3]=vx;pVel[i*3+1]=vy;pVel[i*3+2]=vz;
  pCol[i*4]=r;pCol[i*4+1]=g;pCol[i*4+2]=b;pCol[i*4+3]=a; pA[i]=a;
  pSize[i]=size;pGrow[i]=grow;pLife[i]=life;pMaxL[i]=life;
  pAdd[i]=r>.94&&b<.8&&g<.97?1:0;   // fire, flames, flares and tracers glow
}
// contrails above ~8 km; wing vapor in hard pulls and a vapor cone near Mach 1 in humid low air
const ENG_OFF={F16:[[0,-8.2]],F16B70:[[0,-8.2]],GRIPEN:[[0,-6.6]],GRIPENE:[[0,-7.1]],MIG29:[[1.05,-8.9],[-1.05,-8.9]],MIG29UPG:[[1.05,-8.9],[-1.05,-8.9]],MIG35:[[1.05,-8.9],[-1.05,-8.9]],SU27:[[1.33,-11.3],[-1.33,-11.3]],SU35:[[1.33,-11.3],[-1.33,-11.3]]};
let fxTick=0; const engOff=t=>(AC_DEFS[t]&&AC_DEFS[t].fx&&AC_DEFS[t].fx.eng)||ENG_OFF[t]||[[0,-8]];
function jetFX(j,type,isPlayer){
  const fx=QUALS[quality].fx; if(!fx||!j.alive&&!isPlayer)return;
  if(!isPlayer&&j.pos.distanceTo(camera.position)>9000)return;
  const offs=engOff(type);
  if(j.pos.y>8000&&(isPlayer||fxTick%2===0)){const life=fx>1?6:3.5;
    for(const [x,z] of offs){_s1.copy(j.pos).addScaledVector(j.right,x).addScaledVector(j.fwd,z);
      puff(_s1.x,_s1.y,_s1.z,rand(-1,1),rand(-1,1),rand(-1,1),.97,.98,1,.42,2.2,6.5,life)}}
  if(j.pos.y<7000&&j.n>6){const span=AC_DEFS[type]&&AC_DEFS[type].fx?AC_DEFS[type].fx.vapor:type.startsWith('SU')?7.3:type.startsWith('MIG29')?5.6:type==='GRIPEN'?4.2:4.9;
    for(let i=0;i<(fx>1?3:1);i++){const x=rand(-span,span);_s1.copy(j.pos).addScaledVector(j.right,x).addScaledVector(j.up,.7).addScaledVector(j.fwd,rand(-2,1));
      puff(_s1.x,_s1.y,_s1.z,j.vel.x*.9,j.vel.y*.9,j.vel.z*.9,1,1,1,.32,1.6,5,.22)}}
  if(j.pos.y<6000&&j.mach>.96&&j.mach<1.03&&isPlayer){
    for(let i=0;i<(fx>1?5:2);i++){const a=Math.random()*Math.PI*2;_s1.copy(j.pos).addScaledVector(j.right,Math.cos(a)*2.4).addScaledVector(j.up,Math.sin(a)*2.4).addScaledVector(j.fwd,-1);
      puff(_s1.x,_s1.y,_s1.z,j.vel.x*.97,j.vel.y*.97,j.vel.z*.97,1,1,1,.3,2,6,.18)}}
}
// battle damage: hit jets trail smoke, badly hit ones burn
function dmgFX(j,type,isPlayer){
  if(!j.alive&&!isPlayer)return; if(!isPlayer&&j.pos.distanceTo(camera.position)>12000)return;
  const k=isPlayer?(P.alive?P.hp/100:1):j.hp/(j.maxHp||(j.kind==='bomber'?5:j.kind==='transport'?8:3)); if(k>=.99)return;
  const fire=isPlayer?(P.sys&&P.sys.eng.some(v=>v===1))||k<.35:k<.5, offs=engOff(type);
  if(Math.random()>(fire?.9:.55))return;
  const [x,z]=offs[Math.random()*offs.length|0]; _s1.copy(j.pos).addScaledVector(j.right,x).addScaledVector(j.fwd,z);
  const s=fire?rand(.08,.16):rand(.35,.5);
  puff(_s1.x,_s1.y,_s1.z,j.vel.x*.15+rand(-2,2),j.vel.y*.15+rand(-1,3),j.vel.z*.15+rand(-2,2),s,s,s,fire?.65:.42,fire?5:3.5,fire?16:10,fire?3.2:2.2);
  if(fire)puff(_s1.x,_s1.y,_s1.z,j.vel.x*.6,j.vel.y*.6,j.vel.z*.6,1,rand(.4,.6),.12,.9,rand(2.5,4),2,.18)}
function updateParticles(dt){
  const drag=Math.max(0,1-dt*1.6);
  for(let i=0;i<PMAX;i++){
    if(pLife[i]<=0){pSize[i]=0;continue}
    pLife[i]-=dt; if(pLife[i]<=0){pSize[i]=0;continue}
    pPos[i*3]+=pVel[i*3]*dt;pPos[i*3+1]+=pVel[i*3+1]*dt;pPos[i*3+2]+=pVel[i*3+2]*dt;
    pVel[i*3]*=drag;pVel[i*3+1]*=drag;pVel[i*3+2]*=drag;
    pSize[i]+=pGrow[i]*dt; pCol[i*4+3]=pA[i]*(pLife[i]/pMaxL[i]);
  }
  pGeo.attributes.position.needsUpdate=true;pGeo.attributes.pcol.needsUpdate=true;pGeo.attributes.psize.needsUpdate=true;pGeo.attributes.padd.needsUpdate=true;
}
function explode(p,big,noRec){
  const n=big?55:22; if(!noRec&&typeof REC3!=='undefined')REC3.booms.push({t:clock,p:p.toArray(),big});
  boomLight.position.copy(p); boomLight.intensity=big?4:2.2; boomLight.distance=big?2600:1500;
  for(let i=0;i<(big?6:3);i++)puff(p.x,p.y,p.z,rand(-8,8),rand(-8,8),rand(-8,8),1,.9,.6,1,rand(16,26)*(big?1.5:1),40,rand(.15,.3));
  for(let i=0;i<n;i++){const d=new V3(rand(-1,1),rand(-1,1),rand(-1,1)).normalize().multiplyScalar(rand(20,big?150:70));
    puff(p.x,p.y,p.z,d.x,d.y,d.z,1,rand(.38,.7),.1,1,rand(8,20)*(big?1.6:1),30,rand(.4,1.0))}
  for(let i=0;i<n*.6;i++){const d=new V3(rand(-1,1),rand(-.5,1),rand(-1,1)).multiplyScalar(rand(10,50));const s=rand(.24,.4);
    puff(p.x,p.y,p.z,d.x,d.y+10,d.z,s*1.05,s,s*.95,.62,rand(14,24)*(big?1.5:1),45,rand(1.8,3.6))}
  sndBoom(clamp(1-p.distanceTo(camera.position)/6000,0.05,1)*(big?1:.5));
}

/* ---------------- pools ---------------- */
function makePool(n,geo,mat){const arr=[];for(let i=0;i<n;i++){const m=new THREE.Mesh(geo,mat);m.visible=false;m.frustumCulled=false;scene.add(m);arr.push({m,on:false,vel:new V3(),prev:new V3(),life:0,t:0,type:'',target:null,owner:null});}return arr}
function take(pool){for(const b of pool) if(!b.on) return b; return pool[0]}
function kill(b){b.on=false;b.m.visible=false}
const tracerGeo=new THREE.BoxGeometry(.3,.3,14);
const pBullets=makePool(240,tracerGeo,new THREE.MeshBasicMaterial({color:0xffe27a}));
const eBullets=makePool(160,tracerGeo,new THREE.MeshBasicMaterial({color:0xff6a4d}));
const mslGeo=new THREE.CylinderGeometry(.13,.13,3,6).rotateX(Math.PI/2);
const missiles=makePool(8,mslGeo,new THREE.MeshStandardMaterial({color:0xf2f2ee,flatShading:true}));

