
/* ---------- the hangar building: a real steel hangar with the jet parked on the floor, gear down and canopy open ---------- */
let hgScene=null, hgBanner=null, hgSky=null, hgSaved=null;
const HG_W=56, HG_D=64, HG_H=17, HG_JZ=-4;   // hall width (x), depth (z), wall height; the jet sits at z = HG_JZ, nose toward the open door (+z)
function hgBuild(){
  const sc=new THREE.Scene(), cvs=(w,h,fn,rep)=>{const c=document.createElement('canvas');c.width=w;c.height=h;fn(c.getContext('2d'),w,h);const t=new THREE.CanvasTexture(c);t.wrapS=t.wrapT=THREE.RepeatWrapping;t.anisotropy=8;if(rep)t.repeat.set(rep[0],rep[1]);return t};
  const std=(o)=>new THREE.MeshStandardMaterial(Object.assign({roughness:.7,metalness:.1},o)), box=(w,h,d,m,x,y,z,par)=>{const b=new THREE.Mesh(new THREE.BoxGeometry(w,h,d),m);b.position.set(x,y,z);(par||sc).add(b);return b};
  let r=3;const rnd=()=>(r=(r*16807)%2147483647)/2147483647;
  sc.background=new THREE.Color(0x8fb0d0);
  // ---- floor: sealed concrete with slab joints, a yellow safety box, tyre marks and oil
  const floorTex=cvs(1024,1024,(c,w,h)=>{c.fillStyle='#6c7073';c.fillRect(0,0,w,h);
    for(let i=0;i<9000;i++){c.fillStyle='rgba('+(rnd()<.5?'255,255,255':'0,0,0')+','+(.02+rnd()*.05)+')';c.fillRect(rnd()*w,rnd()*h,1+rnd()*2,1+rnd()*2)}
    for(let i=0;i<26;i++){c.fillStyle='rgba(20,20,22,'+(.05+rnd()*.09)+')';c.beginPath();c.ellipse(rnd()*w,rnd()*h,10+rnd()*50,6+rnd()*24,rnd()*3,0,6.3);c.fill()}
    c.strokeStyle='rgba(0,0,0,.35)';c.lineWidth=2;for(let x=0;x<=w;x+=w/8){c.beginPath();c.moveTo(x,0);c.lineTo(x,h);c.stroke()}for(let y=0;y<=h;y+=h/8){c.beginPath();c.moveTo(0,y);c.lineTo(w,y);c.stroke()}
    const px=x=>(x+HG_W/2)/HG_W*w, pz=z=>(z+HG_D/2)/HG_D*h;                              // world metres -> texture pixels
    c.strokeStyle='#d9b82a';c.lineWidth=7;c.strokeRect(px(-17),pz(HG_JZ-19),px(17)-px(-17),pz(HG_JZ+19)-pz(HG_JZ-19));
    c.setLineDash([22,16]);c.lineWidth=5;c.strokeRect(px(-19),pz(HG_JZ-21),px(19)-px(-19),pz(HG_JZ+21)-pz(HG_JZ-21));c.setLineDash([]);
    c.strokeStyle='rgba(235,235,225,.8)';c.lineWidth=6;c.beginPath();c.moveTo(px(0),pz(HG_JZ+19));c.lineTo(px(0),h);c.stroke();                // taxi line to the door
    for(const [x,z] of [[-5,HG_JZ-1],[5,HG_JZ-1]]){c.fillStyle='rgba(10,10,12,.35)';c.fillRect(px(x)-4,pz(z)-26,8,52)}}),
    floor=new THREE.Mesh(new THREE.PlaneGeometry(HG_W,HG_D).rotateX(-Math.PI/2),std({map:floorTex,roughness:.62,metalness:.08,envMapIntensity:.25}));sc.add(floor);
  // ---- walls: corrugated steel with ribs; the +z wall has a big open door
  const wallTex=cvs(256,16,(c,w,h)=>{for(let x=0;x<w;x+=16){const g=c.createLinearGradient(x,0,x+16,0);g.addColorStop(0,'#b9c2c8');g.addColorStop(.5,'#e4e9ec');g.addColorStop(1,'#a9b2b9');c.fillStyle=g;c.fillRect(x,0,16,h)}},[HG_W/1.2,1]),
    wallM=std({map:wallTex,roughness:.6,metalness:.35,color:0xdfe6ea}), darkM=std({color:0x30363b,roughness:.6,metalness:.5}), yellow=std({color:0xd9b82a,roughness:.6}), steel=std({color:0x5b6670,roughness:.55,metalness:.6});
  box(.5,HG_H,HG_D,wallM,-HG_W/2,HG_H/2,0);box(.5,HG_H,HG_D,wallM,HG_W/2,HG_H/2,0);box(HG_W,HG_H,.5,wallM,0,HG_H/2,-HG_D/2);
  const dw=36,dh=12.5;box((HG_W-dw)/2,HG_H,.5,wallM,-(HG_W+dw)/4,HG_H/2,HG_D/2);box((HG_W-dw)/2,HG_H,.5,wallM,(HG_W+dw)/4,HG_H/2,HG_D/2);box(dw,HG_H-dh,.5,wallM,0,dh+(HG_H-dh)/2,HG_D/2);
  box(5,dh,.6,steel,-dw/2-2.5,dh/2,HG_D/2+.6);box(5,dh,.6,steel,dw/2+2.5,dh/2,HG_D/2+.6);                              // door panels slid aside
  box(dw+.8,.5,.7,yellow,0,dh,HG_D/2);                                                                                  // door header stripe
  // ---- roof: gable of ribbed panels on steel trusses, posts along the walls
  const ridge=HG_H+4.6, slope=Math.atan2(ridge-HG_H,HG_W/2), rl=Math.hypot(HG_W/2,ridge-HG_H);
  for(const s of [-1,1]){const p=new THREE.Mesh(new THREE.PlaneGeometry(rl,HG_D+.6),std({map:wallTex.clone(),roughness:.7,metalness:.4,color:0xb8c0c6,side:THREE.DoubleSide}));
    p.material.map.needsUpdate=true;p.rotation.set(-Math.PI/2,0,-s*slope,'YXZ');p.position.set(s*HG_W/4,(HG_H+ridge)/2,0);sc.add(p)}
  for(let z=-HG_D/2+4;z<=HG_D/2-3;z+=8){
    box(HG_W,.4,.45,steel,0,HG_H-.6,z);                                                                                 // tie beam
    for(const s of [-1,1]){const rf=box(rl,.4,.4,steel,s*HG_W/4,(HG_H+ridge)/2-.25,z);rf.rotation.z=s*slope;
      const dg=box(Math.hypot(HG_W/4,ridge-HG_H-.6)*.98,.25,.3,steel,s*HG_W/8,HG_H-.6+(ridge-HG_H)/2*.5,z);dg.rotation.z=-s*Math.atan2(ridge-HG_H-.6,HG_W/4)*.5}
    box(.35,ridge-HG_H,.35,steel,0,(HG_H-.6+ridge)/2,z)}
  for(let z=-HG_D/2+4;z<=HG_D/2-3;z+=8)for(const s of [-1,1])box(.6,HG_H,.6,steel,s*(HG_W/2-.55),HG_H/2,z);
  box(.7,.5,HG_D,yellow,-HG_W/2+.4,.25,0);box(.7,.5,HG_D,yellow,HG_W/2-.4,.25,0);                                         // wall kick strips
  // ---- lighting: hanging lamps (emissive) with matching point lights, hemisphere fill, sunlight from the door
  const lamp=new THREE.MeshBasicMaterial({color:0xfff6e6});
  for(const x of [-10,10])for(const z of [-24,-8,8,24]){box(6,.18,.7,lamp,x,HG_H-1.4,z);box(.06,1.2,.06,darkM,x-2.5,HG_H-.8,z);box(.06,1.2,.06,darkM,x+2.5,HG_H-.8,z)}
  sc.add(new THREE.HemisphereLight(0xdfe9f2,0x4a4d50,.42*LK));
  for(const [x,z] of [[-9,-14],[9,-14],[0,8]]){const l=new THREE.PointLight(0xfff0dc,85*LK,60,2);l.position.set(x,HG_H-3,z);sc.add(l)}
  const sun=new THREE.DirectionalLight(0xfff0d0,.55*LK);sun.position.set(14,26,70);sc.add(sun);
  // ---- the outside: apron, hills, sky dome
  const apron=new THREE.Mesh(new THREE.PlaneGeometry(400,260).rotateX(-Math.PI/2),std({color:0x74787b,roughness:.9}));apron.position.set(0,-.02,HG_D/2+130);sc.add(apron);
  const grass=new THREE.Mesh(new THREE.PlaneGeometry(2000,2000).rotateX(-Math.PI/2),std({color:0x55703a,roughness:1}));grass.position.y=-.3;sc.add(grass);
  for(let i=0;i<14;i++){const h=new THREE.Mesh(new THREE.SphereGeometry(1,12,8),std({color:i%3?0x4e6b3a:0x5f7a45,roughness:1}));const a=(i/14)*6.28,d=380+rnd()*140;h.scale.set(110+rnd()*90,28+rnd()*34,110+rnd()*90);h.position.set(Math.sin(a)*d,-6,Math.cos(a)*d+60);sc.add(h)}
  hgSky=new THREE.Mesh(new THREE.SphereGeometry(900,24,12),new THREE.ShaderMaterial({side:THREE.BackSide,depthWrite:false,fog:false,
    vertexShader:'varying vec3 vD;void main(){vD=normalize(position);gl_Position=projectionMatrix*modelViewMatrix*vec4(position,1.);}',
    fragmentShader:'varying vec3 vD;void main(){float h=clamp(vD.y,0.,1.);vec3 c=mix(vec3(.86,.9,.93),vec3(.25,.48,.82),pow(h,.45));gl_FragColor=vec4(c,1.);}'}));hgSky.renderOrder=-2;sc.add(hgSky);
  // ---- props: workbench, tool chests, tyres, drums, tow tractor, missile cart, cones, ladder, banners
  const red=std({color:0xa3221c,roughness:.5,metalness:.3}), olive=std({color:0x59603f,roughness:.7}), orange=std({color:0xe0641a,roughness:.6}), black=std({color:0x151617,roughness:.9}), wood=std({color:0x8a6a45,roughness:.8}), chestTex=cvs(128,128,(c,w,h)=>{c.fillStyle='#a3221c';c.fillRect(0,0,w,h);c.fillStyle='rgba(0,0,0,.45)';for(let y=8;y<h;y+=24){c.fillRect(8,y,w-16,2);c.fillStyle='#c9ccd0';c.fillRect(w/2-14,y+8,28,4);c.fillStyle='rgba(0,0,0,.45)'}}),
    chestM=std({map:chestTex,roughness:.45,metalness:.4});
  const X=-HG_W/2+1.4;
  box(1.4,1,7,darkM,X,.5,-12);box(1.5,.08,7.2,wood,X,1.04,-12);box(.9,.5,.9,steel,X,1.33,-10.4);                                // workbench + vise
  for(let i=0;i<3;i++)box(1.1,1.3,.9,chestM,X+.1,.65,-18-i*1.1);box(1.1,.9,1.2,chestM,X+.1,.45,-6.5);
  for(let i=0;i<4;i++){const t=new THREE.Mesh(new THREE.CylinderGeometry(.55,.55,.3,16),black);t.position.set(X+.2,.17+i*.31,-24);t.rotation.x=0;sc.add(t)}   // tyre stack
  for(const z of [-28,-27]){const d=new THREE.Mesh(new THREE.CylinderGeometry(.45,.45,1.1,14),std({color:0x244a7a,metalness:.4}));d.position.set(X+.3,.55,z);sc.add(d)}   // oil drums
  const tr=new THREE.Group();sc.add(tr);box(2.4,1.3,4.2,std({color:0xd9b82a,roughness:.5}),0,.95,0,tr);box(2,1.2,1.8,std({color:0x1d242a,roughness:.4,metalness:.5}),0,1.95,.7,tr);
  for(const [x,z] of [[-1.3,-1.4],[1.3,-1.4],[-1.3,1.5],[1.3,1.5]]){const w=new THREE.Mesh(new THREE.CylinderGeometry(.5,.5,.5,14),black);w.rotation.z=Math.PI/2;w.position.set(x,.5,z);tr.add(w)}
  tr.position.set(HG_W/2-4,0,-20);tr.rotation.y=-.5;
  const cart=new THREE.Group();sc.add(cart);box(1.6,.5,5.2,olive,0,.8,0,cart);for(const x of [-.35,.35]){const m=new THREE.Mesh(new THREE.CylinderGeometry(.11,.11,3.6,10).rotateX(Math.PI/2),std({color:0xe6e6e0,roughness:.5}));m.position.set(x,1.25,0);cart.add(m)
    const nz=new THREE.Mesh(new THREE.ConeGeometry(.11,.5,10).rotateX(Math.PI/2),std({color:0x30353a}));nz.position.set(x,1.25,2.05);cart.add(nz)}
  for(const [x,z] of [[-.6,-2],[.6,-2],[-.6,2],[.6,2]]){const w=new THREE.Mesh(new THREE.CylinderGeometry(.22,.22,.18,12),black);w.rotation.z=Math.PI/2;w.position.set(x,.22,z);cart.add(w)}
  cart.position.set(-HG_W/2+5,0,6);cart.rotation.y=.2;
  for(const [x,z] of [[-17,HG_JZ-21],[17,HG_JZ-21],[-19,HG_JZ+21],[19,HG_JZ+21],[-19,HG_JZ],[19,HG_JZ]]){const c1=new THREE.Mesh(new THREE.ConeGeometry(.32,.75,10),orange);c1.position.set(x,.38,z);sc.add(c1);box(.7,.05,.7,orange,x,.03,z)}   // cones
  for(const z of [-30,-29.2])box(.9,.9,.9,olive,HG_W/2-2,.45,z);
  const ext=new THREE.Mesh(new THREE.CylinderGeometry(.14,.14,.7,10),red);ext.position.set(-HG_W/2+1,.9,-2);sc.add(ext);
  // wall banners: squadron sign (redrawn on every visit) and safety posters
  const bc=document.createElement('canvas');bc.width=1024;bc.height=256;hgBanner={c:bc,t:new THREE.CanvasTexture(bc)};hgBanner.t.anisotropy=8;
  const ban=new THREE.Mesh(new THREE.PlaneGeometry(22,5.5),new THREE.MeshBasicMaterial({map:hgBanner.t}));ban.position.set(0,10.5,-HG_D/2+.3);sc.add(ban);
  const pc=cvs(256,128,(c,w,h)=>{c.fillStyle='#d9b82a';c.fillRect(0,0,w,h);c.fillStyle='#111';c.font='bold 30px sans-serif';c.textAlign='center';c.fillText('NO FOD',w/2,52);c.font='bold 18px sans-serif';c.fillText('CHECK · SECURE · REPORT',w/2,88);c.fillRect(0,h-14,w,14)});
  for(const z of [-18,-4,10]){const p=new THREE.Mesh(new THREE.PlaneGeometry(4,2),new THREE.MeshBasicMaterial({map:pc}));p.position.set(HG_W/2-.32,7,z);p.rotation.y=-Math.PI/2;sc.add(p)}
  // crew ladder (positioned against the cockpit per aircraft in hgEnter), and the jet's soft contact shadow
  hgBuild.ladder=new THREE.Group();for(const s of [-1,1])box(.06,3.2,.06,steel,s*.22,1.6,0,hgBuild.ladder);for(let i=0;i<9;i++)box(.44,.04,.06,steel,0,.35+i*.34,0,hgBuild.ladder);sc.add(hgBuild.ladder);
  hgBuild.blob=new THREE.Mesh(new THREE.PlaneGeometry(1,1).rotateX(-Math.PI/2),new THREE.MeshBasicMaterial({map:radTex([[0,'rgba(0,0,0,.8)'],[.55,'rgba(0,0,0,.45)'],[1,'rgba(0,0,0,0)']]),transparent:true,depthWrite:false}));hgBuild.blob.position.y=.03;sc.add(hgBuild.blob);
  return sc}
function hgSign(){const c=hgBanner.c.getContext('2d');c.fillStyle='#1b2a3a';c.fillRect(0,0,1024,256);c.fillStyle='#d9b82a';c.fillRect(0,0,1024,14);c.fillRect(0,242,1024,14);
  c.fillStyle='#e8f0ea';c.textAlign='center';c.textBaseline='middle';c.font='800 120px "Saira Condensed",Arial Narrow,sans-serif';c.fillText((squadron||'VIPER SORTIE').toUpperCase().slice(0,22),512,104);
  c.font='700 40px "B612 Mono",monospace';c.fillStyle='#7dff9a';c.fillText(AC.name.toUpperCase(),512,196);hgBanner.t.needsUpdate=true}
// step the jet into the hangar: parked, gear down, engine off, canopy open
function hgEnter(){if(hgSaved)return;if(!hgScene)hgScene=hgBuild();
  hgSaved={pos:P.pos.clone(),q:playerJet.quaternion.clone(),vel:P.vel.clone(),gear:P.gear,gearT:P.gearT,og:P.onGround,thr:throttle,ci:P.ci};
  hgScene.environment=scene.environment;hgScene.add(playerJet);
  P.pos.set(0,GEAR_H,HG_JZ);playerJet.quaternion.identity();P.vel.set(0,0,0);P.onGround=true;P.ci=[0,0,0,0];throttle=0;setGear(true);P.gearT=1;axes(P);
  hgRefresh();HG.tgt.set(0,2.2,HG_JZ);HG.r=((typeof M2!=='undefined'&&M2[AC.id]&&M2[AC.id].L)||16)*1.35}
// aircraft or loadout changed while parked: re-fit the shadow, ladder and sign, and keep the engine dark
function hgRefresh(){if(!hgSaved)return;
  const sp=(typeof M2!=='undefined'&&M2[AC.id]&&M2[AC.id].L)||16, span=(S=>S?Math.max(...S.wings.map(w=>w.st[w.st.length-1].x))*2:12)(typeof M2!=='undefined'&&M2[AC.id]);
  hgBuild.blob.scale.set(span*1.25,1,sp*1.2);hgBuild.blob.position.z=HG_JZ;
  const lad=hgBuild.ladder;lad.position.set(-1.45,GEAR_H-.1,HG_JZ+AC.eye[2]);lad.rotation.set(0,0,-.32);
  if(pFlame)pFlame.scale.set(.01,.01,.01);setAB(playerJet,false);P.gearT=1;hgSign()}
function hgLeave(){if(!hgSaved)return;const s=hgSaved;hgSaved=null;hgScene.remove(playerJet);scene.add(playerJet);
  P.pos.copy(s.pos);playerJet.quaternion.copy(s.q);P.vel.copy(s.vel);P.onGround=s.og;P.ci=s.ci;throttle=s.thr;setGear(s.gear);P.gearT=s.gearT;axes(P);camSnap=true}
