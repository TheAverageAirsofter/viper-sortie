/* ---------------- particles ---------------- */
const PMAX=4200;
const pPos=new Float32Array(PMAX*3),pCol=new Float32Array(PMAX*4),pSize=new Float32Array(PMAX);
const pVel=new Float32Array(PMAX*3),pLife=new Float32Array(PMAX),pMaxL=new Float32Array(PMAX),pGrow=new Float32Array(PMAX),pA=new Float32Array(PMAX);
let pNext=0; const pGK=new Float32Array(PMAX);   // per-particle gravity factor: 1 falls like a stone, negative rises (hot smoke)
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
function puff(x,y,z,vx,vy,vz,r,g,b,a,size,grow,life,gk){
  const i=pNext; pGK[i]=gk||0; pNext=(pNext+1)%PMAX;
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
    pVel[i*3+1]-=G*pGK[i]*dt; pVel[i*3]*=drag;pVel[i*3+1]*=drag;pVel[i*3+2]*=drag;
    pSize[i]+=pGrow[i]*dt; pCol[i*4+3]=pA[i]*(pLife[i]/pMaxL[i]);
  }
  pGeo.attributes.position.needsUpdate=true;pGeo.attributes.pcol.needsUpdate=true;pGeo.attributes.psize.needsUpdate=true;pGeo.attributes.padd.needsUpdate=true;
}
/* shockwave rings: a few additive billboards that expand and fade */
const RINGS=[];{const rm=()=>new THREE.ShaderMaterial({transparent:true,depthWrite:false,blending:THREE.AdditiveBlending,uniforms:{a:{value:0},w:{value:.12}},
    vertexShader:'varying vec2 vU;void main(){vU=uv-.5;gl_Position=projectionMatrix*modelViewMatrix*vec4(position,1.);}',
    fragmentShader:'uniform float a,w;varying vec2 vU;void main(){float r=length(vU)*2.;float d=abs(r-.9);float s=smoothstep(w,0.,d)*a;gl_FragColor=vec4(vec3(1.,.82,.55)*s,s);}'});
  for(let i=0;i<6;i++){const m=new THREE.Mesh(new THREE.PlaneGeometry(2,2),rm());m.visible=false;m.frustumCulled=false;m.renderOrder=5;scene.add(m);RINGS.push({m,t:0,life:0,R:0})}}
function ring(p,R){const r=RINGS.find(o=>o.life<=0)||RINGS[0];r.m.position.copy(p);r.t=0;r.life=big_ring_life(R);r.R=R;r.m.visible=true}
const big_ring_life=R=>.55+R/900;
function updateRings(dt){for(const r of RINGS){if(r.life<=0)continue;r.t+=dt;const k=r.t/r.life;
  if(k>=1){r.life=0;r.m.visible=false;continue}
  const e=1-Math.pow(1-k,2.4);r.m.scale.setScalar(Math.max(1,r.R*e));r.m.material.uniforms.a.value=(1-k)*(1-k)*.8;r.m.material.uniforms.w.value=.05+.2*k;r.m.quaternion.copy(camera.quaternion)}}
/* engine heat shimmer: copy a small patch of the finished frame around the exhaust and redraw it with a wobbling refraction offset
   (a screen-space distortion without rendering the scene twice). Needs THREE.FramebufferTexture (r135+), so older builds skip it. */
const HEAT={ok:typeof THREE.FramebufferTexture==='function',S:256,k:0,tex:null,scene:null,cam:null,mat:null,quad:null,v2:null};
function heatInit(){
  HEAT.tex=new THREE.FramebufferTexture(HEAT.S,HEAT.S); HEAT.v2=new THREE.Vector2();
  HEAT.cam=new THREE.OrthographicCamera(0,1,1,0,-1,1); HEAT.scene=new THREE.Scene();
  HEAT.mat=new THREE.ShaderMaterial({depthTest:false,depthWrite:false,uniforms:{tex:{value:HEAT.tex},t:{value:0},k:{value:0},rad:{value:.3},dir:{value:new THREE.Vector2(0,1)}},
    vertexShader:'varying vec2 vU;void main(){vU=uv;gl_Position=projectionMatrix*modelViewMatrix*vec4(position,1.);}',
    fragmentShader:'uniform sampler2D tex;uniform float t,k,rad;uniform vec2 dir;varying vec2 vU;void main(){vec2 c=vU-.5;float al=dot(c,dir),pe=dot(c,vec2(-dir.y,dir.x));'+
      'float m=exp(-(al*al)/(rad*rad*1.7)-(pe*pe)/(rad*rad*.55))*k;'+   // elongated along the exhaust axis
      'vec2 q=vU*14.+vec2(-dir.y,dir.x)*0.;float a=sin(q.x*1.3+t*9.+sin(q.y*1.7-t*6.)*2.)+sin(q.y*2.1-t*11.+sin(q.x*1.1+t*5.)*2.);float b=sin(q.y*1.5+t*8.+sin(q.x*2.3+t*7.))+sin(q.x*2.2+t*10.);'+
      'vec2 o=vec2(a,b)*.0032*m;gl_FragColor=vec4(texture2D(tex,clamp(vU+o,.002,.998)).rgb,1.);}'});
  HEAT.quad=new THREE.Mesh(new THREE.PlaneGeometry(1,1),HEAT.mat); HEAT.quad.frustumCulled=false; HEAT.scene.add(HEAT.quad)}
function heatPass(){
  if(!HEAT.ok||!QUALS[quality].fx||!P.alive||P.onGround&&Math.hypot(P.vel.x,P.vel.z)<8)return;
  const thr=clamp((throttle-.35)/.65,0,1); HEAT.k+=((thr>0?.25+.75*thr:0)-HEAT.k)*.15; if(HEAT.k<.02)return;
  if(!HEAT.tex)heatInit();
  const off=engOff(AC.id)[0][1], a=_s1.copy(P.pos).addScaledVector(P.fwd,off-3), b=_s2.copy(P.pos).addScaledVector(P.fwd,off-45);
  const pa=proj(a), pb=proj(b); if(!pa.ok)return;
  const d=camera.position.distanceTo(a), ppm=(H*DPR/2)/Math.tan(camera.fov*Math.PI/360)/Math.max(d,5), S=HEAT.S;
  const rad=clamp(ppm*20,.04,.5*S)/S*2*.5;                                                     // shimmer radius as a fraction of the patch (patch = S px)
  if(ppm*20<14)return;                                                                        // too far away to see
  const cx=pa.x*DPR, cy=(H-pa.y)*DPR, bw=W*DPR, bh=H*DPR, x0=clamp(Math.round(cx-S/2),0,Math.max(0,bw-S)), y0=clamp(Math.round(cy-S/2),0,Math.max(0,bh-S));
  HEAT.v2.set(x0,y0); renderer.copyFramebufferToTexture(HEAT.tex,HEAT.v2);
  let dx=(pb.x-pa.x),dy=-(pb.y-pa.y),l=Math.hypot(dx,dy); if(l<2){dx=0;dy=1}else{dx/=l;dy/=l}
  const u=HEAT.mat.uniforms; u.t.value=clock; u.k.value=HEAT.k; u.rad.value=Math.min(.45,rad); u.dir.value.set(dx,dy);
  HEAT.cam.right=bw; HEAT.cam.top=bh; HEAT.cam.updateProjectionMatrix(); HEAT.quad.scale.set(S,S,1); HEAT.quad.position.set(x0+S/2,y0+S/2,0);
  renderer.render(HEAT.scene,HEAT.cam)}
function explode(p,big,noRec){
  if(!noRec&&typeof REC3!=='undefined')REC3.booms.push({t:clock,p:p.toArray(),big});
  boomLight.position.copy(p); boomLight.intensity=(big?4:2.2)*LK; boomLight.distance=big?2600:1500;
  const S=big?1:.55, rv=()=>new V3(rand(-1,1),rand(-1,1),rand(-1,1)).normalize();
  puff(p.x,p.y,p.z,0,0,0,1,.93,.7,1,(big?110:50),(big?260:110),.16);                                   // white-hot flash
  for(let i=0;i<(big?10:5);i++){const d=rv().multiplyScalar(rand(8,40)*S);puff(p.x,p.y,p.z,d.x,d.y+rand(8,25)*S,d.z,1,.72,.28,.5,rand(34,60)*S,rand(60,100)*S,rand(.7,1.2),-.15)}   // fireball core
  for(let i=0;i<(big?38:16);i++){const d=rv().multiplyScalar(rand(30,120)*S);puff(p.x,p.y,p.z,d.x,d.y+rand(0,25)*S,d.z,1,rand(.36,.55),.1,.62,rand(20,40)*S,rand(26,46)*S,rand(1,2.2),-.3)}   // orange fire
  for(let i=0;i<(big?44:18);i++){const d=rv().multiplyScalar(rand(60,230)*S);puff(p.x,p.y,p.z,d.x,d.y+rand(10,60)*S,d.z,1,rand(.75,.95),rand(.4,.6),1,rand(1.4,3)*S+.6,rand(0,2),rand(.5,1.7),.55)}   // embers
  for(let i=0;i<(big?22:9);i++){const d=rv().multiplyScalar(rand(40,150)*S),s=rand(.08,.16);puff(p.x,p.y,p.z,d.x,d.y+rand(10,50)*S,d.z,s,s*.95,s*.9,.95,rand(2,5)*S+1,0,rand(1.6,3.6),.7)}   // debris
  for(let i=0;i<(big?30:12);i++){const d=rv().multiplyScalar(rand(10,55)*S),s=rand(.1,.2);puff(p.x,p.y,p.z,d.x,d.y*.5+rand(6,16)*S,d.z,s,s,s,.5,rand(14,26)*S,rand(8,18)*S,rand(4.5,8)*(big?1:.7),-1.1)}   // black smoke column
  for(let i=0;i<(big?14:5);i++){const d=rv().multiplyScalar(rand(20,70)*S),s=rand(.32,.46);puff(p.x,p.y+rand(5,25)*S,p.z,d.x,d.y*.4+rand(10,20)*S,d.z,s,s,s*1.03,.32,rand(20,36)*S,rand(10,20)*S,rand(6,10)*(big?1:.7),-.8)}   // lighter smoke cap
  ring(p,big?330:150);
  const dist=p.distanceTo(camera.position), vol=clamp(1-dist/6000,0.05,1)*(big?1:.5), lag=Math.min(dist/340,12);   // you see it first, then hear it
  if(lag<.15||state==='replay')sndBoom(vol); else setTimeout(()=>{if(state==='play')sndBoom(vol)},lag*1000);
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


/* ---------- post-processing (Medium and High): HDR scene target, bloom, filmic highlight roll-off, grade and vignette ----------
   The scene is drawn into a half-float target so additive glows (sun, afterburners, explosions, flares) can exceed 1 and bloom; a few dual-Kawase mips
   build the glow and one composite pass adds it with a gentle S-curve, split-tone grade, a touch of edge fringing and a vignette. Needs WebGL2 and float targets;
   anything else (and Low quality) keeps the plain direct render. Tests skip it unless the page has &post. */
const POST={ok:false,fail:false,w:0,h:0,rt:null,mips:[],scene:null,cam:null,quad:null,on:true};
POST.pref=null;try{POST.pref=localStorage.getItem('vsPost')}catch(e){}
POST.on=POST.pref!=='0';   // unset: only High quality runs it (the full-screen passes cost a lot on phones); '1' forces it on Medium too
const POST_TEST=/[?&]test\b/.test(location.search)&&!/[?&]post\b/.test(location.search);
const postActive=()=>POST.on&&!POST_TEST&&!POST.fail&&QUALS[quality].fx>0&&(QUALS[quality].fx>1||POST.pref==='1');
function postInit(){
  if(POST.scene)return true;
  try{
    const ext=renderer.extensions;
    if(!renderer.capabilities.isWebGL2||!(ext.has('EXT_color_buffer_float')||ext.has('EXT_color_buffer_half_float'))){POST.fail=true;return false}
    POST.scene=new THREE.Scene();POST.cam=new THREE.OrthographicCamera(-1,1,1,-1,0,1);
    const tri=new THREE.BufferGeometry();tri.setAttribute('position',new THREE.Float32BufferAttribute([-1,-1,0,3,-1,0,-1,3,0],3));tri.setAttribute('uv',new THREE.Float32BufferAttribute([0,0,2,0,0,2],2));
    const VS='varying vec2 vUv;void main(){vUv=uv;gl_Position=vec4(position.xy,0.,1.);}';
    const mk=(fs,uniforms,extra)=>new THREE.ShaderMaterial(Object.assign({vertexShader:VS,fragmentShader:fs,uniforms,depthTest:false,depthWrite:false},extra||{}));
    const HEAD='uniform sampler2D tex;uniform vec2 px;varying vec2 vUv;vec3 s(vec2 o){return texture2D(tex,vUv+o*px).rgb;}';
    POST.mBright=mk(HEAD+'uniform float thr,knee;void main(){vec3 c=(s(vec2(-1.,-1.))+s(vec2(1.,-1.))+s(vec2(-1.,1.))+s(vec2(1.,1.)))*.25;float l=max(max(c.r,c.g),c.b);float q=clamp(l-thr+knee,0.,2.*knee);q=q*q/(4.*knee+1e-4);gl_FragColor=vec4(c*(max(q,l-thr)/max(l,1e-4)),1.);}',
      {tex:{value:null},px:{value:new THREE.Vector2()},thr:{value:.96},knee:{value:.3}});
    POST.mDown=mk(HEAD+'void main(){vec3 c=texture2D(tex,vUv).rgb*4.+s(vec2(-1.,-1.))+s(vec2(1.,-1.))+s(vec2(-1.,1.))+s(vec2(1.,1.));gl_FragColor=vec4(c/8.,1.);}',{tex:{value:null},px:{value:new THREE.Vector2()}});
    POST.mUp=mk(HEAD+'uniform float w;void main(){vec3 c=(s(vec2(-1.,-1.))+s(vec2(1.,-1.))+s(vec2(-1.,1.))+s(vec2(1.,1.))+s(vec2(0.,-1.5))+s(vec2(0.,1.5))+s(vec2(-1.5,0.))+s(vec2(1.5,0.)))*.125;gl_FragColor=vec4(c*w,1.);}',
      {tex:{value:null},px:{value:new THREE.Vector2()},w:{value:1}},{blending:THREE.AdditiveBlending,transparent:true});
    POST.mComp=mk('uniform sampler2D tex,bloom;uniform float bk,vig,sat;uniform vec2 px;varying vec2 vUv;'+
      'void main(){vec2 d=vUv-.5;float r2=dot(d,d);vec3 c=texture2D(tex,vUv).rgb;c.r=texture2D(tex,vUv+d*r2*.012).r;c.b=texture2D(tex,vUv-d*r2*.012).b;'+   // edge fringing
      'c+=texture2D(bloom,vUv).rgb*bk;'+
      'vec3 over=max(c-1.,0.);c=min(c,vec3(1.))+over/(1.+over);'+                                                                                          // highlight roll-off: hot cores keep a bright shoulder
      'c=clamp(c,0.,1.);c=mix(c,c*c*(3.-2.*c),.22);'+                                                                                                      // gentle S-curve
      'float l=dot(c,vec3(.299,.587,.114));c=mix(vec3(l),c,sat);c+=vec3(-.012,.004,.016)*(1.-l)+vec3(.016,.007,-.012)*l*l;'+                                  // split tone: cool shadows, warm highlights
      'c*=1.-vig*smoothstep(.28,.95,length(d)*1.55);gl_FragColor=vec4(c,1.);}',
      {tex:{value:null},bloom:{value:null},px:{value:new THREE.Vector2()},bk:{value:.4},vig:{value:.24},sat:{value:1.07}});
    POST.quad=new THREE.Mesh(tri,POST.mComp);POST.quad.frustumCulled=false;POST.scene.add(POST.quad);POST.ok=true;return true
  }catch(e){POST.fail=true;return false}}
function postSize(){
  const sz=renderer.getDrawingBufferSize(new THREE.Vector2()),w=Math.max(2,sz.x|0),h=Math.max(2,sz.y|0);
  if(POST.rt&&w===POST.w&&h===POST.h)return;
  POST.w=w;POST.h=h;if(POST.rt)POST.rt.dispose();POST.mips.forEach(m=>m.dispose());POST.mips=[];
  POST.rt=new THREE.WebGLRenderTarget(w,h,{type:THREE.HalfFloatType,samples:QUALS[quality].fx>1?4:0,depthBuffer:true,minFilter:THREE.LinearFilter,magFilter:THREE.LinearFilter});
  const n=QUALS[quality].fx>1?5:4;let mw=w>>1,mh=h>>1;
  for(let i=0;i<n;i++){POST.mips.push(new THREE.WebGLRenderTarget(Math.max(2,mw),Math.max(2,mh),{type:THREE.HalfFloatType,depthBuffer:false,minFilter:THREE.LinearFilter,magFilter:THREE.LinearFilter}));mw>>=1;mh>>=1}}
const postPass=(mat,src,dst)=>{mat.uniforms.tex.value=src.texture;if(mat.uniforms.px)mat.uniforms.px.value.set(1/src.width,1/src.height);POST.quad.material=mat;renderer.setRenderTarget(dst);renderer.render(POST.scene,POST.cam)};
// draw `scn` (and the cockpit when asked) through the pipeline to the screen; returns false when post is off so the caller renders directly
function postRender(scn,cam,cockpit){
  if(!postActive()||!postInit())return false;
  postSize();const R=renderer;
  R.setRenderTarget(POST.rt);R.clear();R.render(scn,cam);
  if(cockpit){R.clearDepth();R.render(cockScene,cockCam)}
  const M=POST.mips;postPass(POST.mBright,POST.rt,M[0]);
  for(let i=1;i<M.length;i++)postPass(POST.mDown,M[i-1],M[i]);
  for(let i=M.length-1;i>0;i--){POST.mUp.uniforms.w.value=i===1?1:.9;postPass(POST.mUp,M[i],M[i-1])}
  const u=POST.mComp.uniforms;u.bloom.value=M[0].texture;u.bk.value=state==='menu'||HG.on?.5:.34;
  POST.quad.material=POST.mComp;u.tex.value=POST.rt.texture;R.setRenderTarget(null);R.render(POST.scene,POST.cam);
  return true}
