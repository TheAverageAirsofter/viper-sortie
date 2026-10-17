/* ---------------- camera ---------------- */
let camSnap=true; const camUp=new V3(0,1,0);
const headQ=new THREE.Quaternion(),headE=new THREE.Euler(),headP=new V3();
function padTarget(){
  if(lockTarget&&lockTarget.alive)return lockTarget;
  let b=null,bd=1e9;for(const e of enemies){const d=e.pos.distanceTo(P.pos);if(d<bd){bd=d;b=e}}return b;
}
function updateCamera(dt){
  if((HG.on||HG.bg)&&hgSaved){applyProj();   // hangar: orbit and pan around a target point, kept inside the hall
    playerJet.visible=true;
    if(HG.bg&&!HG.on&&HG.goal){const g=HG.goal,k=1-Math.exp(-dt*1.8);let da=g.ang-HG.ang;da=Math.atan2(Math.sin(da),Math.cos(da));HG.ang+=da*k;HG.el+=(g.el-HG.el)*k;HG.zoom+=(g.zoom-HG.zoom)*k;   // menu: ease toward the section's camera, plus a slow drift
      HG.t=(HG.t||0)+dt;HG.ang+=Math.cos(HG.t*.17)*dt*.05*g.drift;HG.el+=Math.cos(HG.t*.23)*dt*.012*g.drift}
    else if(!HG.drag&&HG.auto)HG.ang+=dt*.25;
    const r=HG.r*HG.zoom, ce=Math.cos(HG.el);
    HG.tgt.set(clamp(HG.tgt.x,-26,26),clamp(HG.tgt.y,.4,12),clamp(HG.tgt.z,-29,29));
    camera.position.set(HG.tgt.x+Math.sin(HG.ang)*r*ce,HG.tgt.y+Math.sin(HG.el)*r,HG.tgt.z+Math.cos(HG.ang)*r*ce);
    camera.position.x=clamp(camera.position.x,-27,27);camera.position.y=clamp(camera.position.y,.35,16);camera.position.z=clamp(camera.position.z,-31,45);
    camera.up.set(0,1,0); camUp.set(0,1,0); camera.lookAt(HG.tgt); if(hgSky)hgSky.position.copy(camera.position); camSnap=true; return}
  const alive=state==='play'||state==='menu'||state==='paused';
  applyProj();
  let v=VIEWS[view];
  const pt=v==='PADLOCK'?padTarget():null;
  if(v==='PADLOCK'&&!pt)v='CHASE';
  playerJet.visible=(alive||(state!=='menu'&&P.alive))&&v!=='COCKPIT';
  if(!alive&&BT.on&&state==='dead'&&!P.alive){const st=btSpecTarget();if(st){_a.set(0,6,-30).applyQuaternion(st.obj.quaternion).add(st.pos);camera.position.lerp(_a,1-Math.exp(-dt*4));camera.up.set(0,1,0);camera.lookAt(st.pos);return}}
  if(!alive){camera.up.set(0,1,0);if(P.ejected&&chute&&state!=='replay')camera.position.lerp(_a.copy(chute.position).add(_b.set(16,5,16)),1-Math.exp(-dt*3));camera.lookAt(P.pos);return}

  const q=playerJet.quaternion, k=camSnap?1:1-Math.exp(-dt*8); camSnap=false;
  if(look.id===null){const k2=Math.exp(-dt*3);look.yaw*=k2;look.pitch*=k2}
  if(v==='COCKPIT'){
    // head: look angles + g pushes you down into the seat + buffet near the lift limit / transonic
    headQ.setFromEuler(headE.set(look.pitch,look.yaw,0,'YXZ'));
    const sag=clamp((P.n-1)*.007,-.035,.055);
    const buffet=(P.n>.85*(P.nAero||9)&&P.n>2?.004:0)+(P.mach>.95&&P.mach<1.05?.002:0)+shake*.01;
    headP.set(-Math.sin(look.yaw)*.06+rand(-1,1)*buffet,-sag+rand(-1,1)*buffet,Math.abs(Math.sin(look.yaw))*.05);
    cockCam.position.copy(headP); cockCam.quaternion.copy(headQ);
    const base=qTmp2.copy(q).multiply(QRY);
    camera.position.copy(headP).applyQuaternion(base).add(_c.copy(EYE).applyQuaternion(q)).add(P.pos);
    camera.quaternion.copy(base).multiply(headQ);
    camUp.copy(P.up);
  } else if(v==='PADLOCK'){
    _a.subVectors(P.pos,pt.pos).normalize().multiplyScalar(30).addScaledVector(P.up,7).add(P.pos);
    camera.position.lerp(_a,k);
    camUp.lerp(_b.copy(P.up).multiplyScalar(.4).addScaledVector(UP,.6).normalize(),Math.min(1,dt*4)).normalize();
    camera.up.copy(camUp); camera.lookAt(pt.pos);
  } else if(v==='FLYBY'){
    if(!flyCamSet||camera.position.distanceTo(P.pos)>1400){
      flyCam.copy(P.pos).addScaledVector(P.vel,2.5).addScaledVector(P.right,(Math.random()<.5?1:-1)*rand(25,45)).add(_a.set(0,rand(-6,12),0));
      const gh=Math.max(groundH(flyCam.x,flyCam.z),0)+15; if(flyCam.y<gh)flyCam.y=gh;
      flyCamSet=true;
    }
    camera.position.copy(flyCam); camera.up.set(0,1,0); camUp.set(0,1,0); camera.lookAt(P.pos);
  } else {
    // chase, orbitable by dragging the right side
    _a.set(0,4.5,-21).applyAxisAngle(_e.set(1,0,0),-look.pitch*.8).applyAxisAngle(_e.set(0,1,0),-look.yaw).applyQuaternion(q).add(P.pos);
    camera.position.lerp(_a,look.id!==null?1:k);
    camUp.lerp(_b.copy(P.up).multiplyScalar(.75).addScaledVector(UP,.25).normalize(),Math.min(1,dt*5)).normalize();
    camera.up.copy(camUp);
    const ahead=1-Math.min(1,Math.abs(look.yaw)+Math.abs(look.pitch));
    camera.lookAt(_c.set(0,2,40*ahead).applyQuaternion(q).add(P.pos));
  }
  if(shake>0&&(v==='CHASE'||v==='PADLOCK')){const sk=shake*(REDUCED?.25:1)*(v==='COCKPIT'?.15:1);camera.position.x+=rand(-1,1)*sk;camera.position.y+=rand(-1,1)*sk}
}

/* ---------------- HUD ---------------- */
let HUD='#7dff9a',HUDD='rgba(125,255,154,.5)',WARN='#ffb347',THREAT='#ff5a4e';
const FONT='"B612 Mono", ui-monospace, Menlo, monospace';
const _pv=new V3();
function proj(v){_pv.copy(v).project(camera);return{x:(_pv.x+1)/2*W,y:(1-_pv.y)/2*H,ok:_pv.z<1&&_pv.z>-1}}
let TXTK=1;   // HUD text size setting
function txt(c,s,x,y,align,col,size,w){c.font=`${w||400} ${(size||12)*TXTK}px ${FONT}`;c.textAlign=align||'left';c.fillStyle=col||HUD;c.fillText(s,x,y)}
const nm=d=>(d/1852).toFixed(d<18520?1:0);
// tall phone screens lift the left/right tapes so the countermeasure column fits under them
const tapeY=()=>W<H?H*.34:H*.42;
function missionStatus(){
  if(BT.on&&isBT())return btStatus();
  if(mission==='TRAINING')return 'TRAINING · '+LESSONS[lesson].toUpperCase();
  if(mission==='ONLINE')return NET.room?('ONLINE · '+(NET.count)+' PILOT'+(NET.count===1?'':'S')+' · '+NET.code.toUpperCase()):'ONLINE · OFFLINE';
  if(sortie)return sortieStatus();
  if(mission==='WAVES')return 'WAVE '+wave;
  if(mission==='STRIKE'){const o=ground.filter(g=>g.objective&&g.alive).length;return 'TARGETS LEFT '+o}
  if(mission==='RUSH')return 'KILLS '+kills+' / '+RUSH_KILLS+' · '+fmtT(Math.max(0,RUSH_TIME-missionT));
  if(mission==='INTERCEPT'){const b=enemies.filter(e=>e.kind==='bomber');const eta=b.length?Math.min(...b.map(x=>Math.max(0,(x.pos.z-2500)/x.speed))):0;return 'BOMBERS '+b.length+' · ETA '+fmtT(eta)}
  if(mission==='ESCORT'){const tr=friends.find(f=>f.kind==='transport');if(!tr)return 'ESCORT';return 'C-130 '+Math.round(clamp(tr.pos.z/ESCORT_LEN,0,1)*100)+'% · '+fmtT((ESCORT_LEN-tr.pos.z)/tr.speed)}
  const w=friends.find(f=>f.kind==='fighter');return 'BANDITS '+enemies.length+' · TWO '+(w&&w.alive?w.cmd:'DOWN');
}
// launch-zone scale: Rmin, Rne (no-escape) bracket, Rmax, and a caret at the current range with closure
function drawDLZ(c,x,y0,y1){
  if(!pZone||!lockTarget)return;
  const z=pZone, top=Math.max(z.rmax*1.15,z.d*1.05,2000), Y=r=>y1-(clamp(r,0,top)/top)*(y1-y0);
  c.save();c.strokeStyle=HUD;c.fillStyle=HUD;c.lineWidth=1.5;
  c.beginPath();c.moveTo(x,y0);c.lineTo(x,y1);c.stroke();
  c.lineWidth=4;c.beginPath();c.moveTo(x,Y(z.rmin));c.lineTo(x,Y(z.rne));c.stroke();c.lineWidth=1.5;
  for(const [r,l] of [[z.rmax,'MAX'],[z.rne,'NE'],[z.rmin,'MIN']]){const y=Y(r);c.beginPath();c.moveTo(x-6,y);c.lineTo(x+6,y);c.stroke();txt(c,l,x+9,y,'left',HUDD,9,700)}
  const yc=Y(z.d), inNE=z.d<=z.rne&&z.d>=z.rmin, col=z.d>z.rmax?WARN:HUD;
  if(!inNE||(clock*3%1)<.7){c.fillStyle=col;c.beginPath();c.moveTo(x-4,yc);c.lineTo(x-14,yc-6);c.lineTo(x-14,yc+6);c.closePath();c.fill()}
  txt(c,(z.d/1852).toFixed(1),x-17,yc,'right',col,10,700);
  txt(c,pZoneW==='120'?AC.mrName:AC.srName,x,y0-10,'center',HUD,10,700);
  txt(c,Math.round(z.vc*1.944)+' VC',x,y1+12,'center',HUDD,9,700);
  if(inNE)txt(c,'RNE',x-17,yc+13,'right',HUD,9,700);
  c.restore();
}
/* tactical map (MAP button in the radar panel, or Tab): north-up, centred on you; each press steps the scale 20 / 50 / 120 km then closes */
const TMAP={z:0,KM:[0,20,50,120]};
function mapStep(){TMAP.z=(TMAP.z+1)%TMAP.KM.length}
$('rMap').addEventListener('click',mapStep);
function drawMap(c){
  const km=TMAP.KM[TMAP.z]*1000, R=Math.min(W,H)*.46, cx=W/2, cy=H/2, k=R/km;
  const X=x=>cx+(x-P.pos.x)*k, Y=z=>cy-(z-P.pos.z)*k;
  c.save();c.fillStyle='rgba(4,10,6,.82)';c.fillRect(0,0,W,H);
  c.strokeStyle='rgba(125,255,154,.16)';c.lineWidth=1;c.font='10px '+FONT;c.fillStyle='rgba(125,255,154,.5)';c.textAlign='left';
  const step=km>60000?20000:km>30000?10000:5000, gx=Math.floor((P.pos.x-km*1.8)/step)*step, gz=Math.floor((P.pos.z-km*1.8)/step)*step;
  for(let x=gx;x<P.pos.x+km*1.8;x+=step){const sx=X(x);if(sx<0||sx>W)continue;c.beginPath();c.moveTo(sx,0);c.lineTo(sx,H);c.stroke()}
  for(let z=gz;z<P.pos.z+km*1.8;z+=step){const sy=Y(z);if(sy<0||sy>H)continue;c.beginPath();c.moveTo(0,sy);c.lineTo(W,sy);c.stroke()}
  c.beginPath();c.arc(cx,cy,R,0,6.283);c.stroke();c.beginPath();c.arc(cx,cy,R/2,0,6.283);c.stroke();
  c.fillText(Math.round(km/2000)+' KM',cx+R/2+4,cy-4);c.fillText(Math.round(km/1000)+' KM',cx+R+4,cy-4);
  if(BT.on)for(const z of BT.zones){const x=X(z.x),y=Y(z.z),col=z.own>0?'#5aa8ff':z.own<0?'#ff5a4e':'#cfd8cf';c.strokeStyle=col;c.lineWidth=2;c.setLineDash([6,5]);c.beginPath();c.arc(x,y,BT_R*k,0,6.283);c.stroke();c.setLineDash([]);txt(c,z.n,x,y,'center',col,14,700)}
  // airfield
  c.strokeStyle='#cfd8cf';c.lineWidth=3;c.beginPath();c.moveTo(X(RWY.x),Y(RWY.z0));c.lineTo(X(RWY.x),Y(RWY.z1));c.stroke();
  const dot=(x,y,col,r,sq)=>{c.fillStyle=col;if(sq)c.fillRect(x-r,y-r,r*2,r*2);else{c.beginPath();c.arc(x,y,r,0,6.283);c.fill()}};
  const head=o=>{const f=_a.set(0,0,1).applyQuaternion(o.obj.quaternion);return Math.atan2(f.x,f.z)};
  const tri=(x,y,h,col,s)=>{c.save();c.translate(x,y);c.rotate(h);c.fillStyle=col;c.beginPath();c.moveTo(0,-s);c.lineTo(s*.7,s*.8);c.lineTo(0,s*.4);c.lineTo(-s*.7,s*.8);c.closePath();c.fill();c.restore()};   // heading h: 0 = north (+z up the screen)
  for(const g of ground)if(g.alive){const x=X(g.pos.x),y=Y(g.pos.z);if(g.kind==='sam'){c.strokeStyle='rgba(255,90,78,.45)';c.setLineDash([4,4]);c.lineWidth=1;c.beginPath();c.arc(x,y,(g.range||15000)*k,0,6.283);c.stroke();c.setLineDash([])}dot(x,y,'#ff5a4e',4,true)}
  if(typeof WAR!=='undefined'&&WAR.on)for(const u of WAR.units)if(u.alive&&u.team==='blue')dot(X(u.pos.x),Y(u.pos.z),'#5aa8ff',4,true);
  for(const f of friends)if(f.alive)tri(X(f.pos.x),Y(f.pos.z),head(f),'#5aa8ff',7);
  for(const e of enemies)if(e.alive)tri(X(e.pos.x),Y(e.pos.z),head(e),'#ff5a4e',7);
  if(typeof NET!=='undefined'&&NET.remotes)for(const r of NET.remotes.values())if(r.alive)tri(X(r.pos.x),Y(r.pos.z),head(r),r.mate?'#5aa8ff':'#ff5a4e',7);
  const ph=Math.atan2(P.fwd.x,P.fwd.z);c.strokeStyle='rgba(255,255,255,.35)';c.lineWidth=1;c.beginPath();c.moveTo(cx,cy);c.lineTo(cx+Math.sin(ph)*R,cy-Math.cos(ph)*R);c.stroke();
  tri(cx,cy,ph,'#ffffff',9);
  txt(c,'TACTICAL MAP · '+TMAP.KM[TMAP.z]+' KM · TAP MAP TO ZOOM / CLOSE',W/2,INS.t+22,'center',HUD,12,700);
  c.restore()}
function drawHUD(){
  const c=hctx; c.clearRect(0,0,W,H); drawNVG(c);
  if(hurtT>0){const g=c.createRadialGradient(W/2,H/2,Math.min(W,H)*.3,W/2,H/2,Math.max(W,H)*.7);g.addColorStop(0,'rgba(255,40,30,0)');g.addColorStop(1,`rgba(255,40,30,${hurtT*1.2})`);c.fillStyle=g;c.fillRect(0,0,W,H)}
  if(state!=='play')return;
  if(TMAP.z){drawMap(c);return}
  c.lineWidth=1.5;c.strokeStyle=HUD;c.textBaseline='middle';
  if(SC.list.length){let y=H*(W<H?.5:.6);const cols={kill:'#ff8a5c',crit:'#ffd24a',bonus:'#8ee0ff'};c.save();c.textBaseline='middle';
    for(const e of SC.list){const age=clock-e.t;if(age>4.5)continue;c.globalAlpha=Math.min(1,(4.5-age)*1.1);txt(c,e.text+(e.pts?'   +'+e.pts:''),W/2,y,'center',cols[e.col]||HUD,e.col==='kill'?15:12,e.col==='kill'?700:500);y+=e.col==='kill'?20:16}
    c.restore();while(SC.list.length&&clock-SC.list[0].t>4.5)SC.list.shift()}
  const cp=camera.position, vName=VIEWS[view], sight=vName==='CHASE'||vName==='COCKPIT';
  if(KBM.on&&KBM.aim&&sight){const ap=proj(_c.copy(cp).addScaledVector(KBM.ad,3000));if(ap.ok){c.save();c.strokeStyle='#ffd24a';c.shadowColor='rgba(255,210,74,.6)';c.shadowBlur=5;c.beginPath();c.arc(ap.x,ap.y,13,0,6.283);c.moveTo(ap.x-20,ap.y);c.lineTo(ap.x-13,ap.y);c.moveTo(ap.x+13,ap.y);c.lineTo(ap.x+20,ap.y);c.moveTo(ap.x,ap.y-20);c.lineTo(ap.x,ap.y-13);c.moveTo(ap.x,ap.y+13);c.lineTo(ap.x,ap.y+20);c.stroke();c.restore()}}
  const pit=vName==='COCKPIT', hr_=pit?combinerRect():null;
  if(sight&&(!pit||hr_)){
  if(hr_){c.save();c.beginPath();c.rect(hr_.x0,hr_.y0,hr_.x1-hr_.x0,hr_.y1-hr_.y0);c.clip();c.shadowColor='rgba(125,255,154,.6)';c.shadowBlur=4}
  // horizon + pitch ladder
  const hf=_a.set(P.fwd.x,0,P.fwd.z); if(hf.lengthSq()<1e-5)hf.set(0,0,1); hf.normalize();
  const hr=_b.crossVectors(UP,hf).normalize();
  c.save();c.globalAlpha=.6;
  for(const deg of [-30,-20,-10,0,10,20,30]){
    const r=deg*Math.PI/180;
    _c.copy(hf).multiplyScalar(Math.cos(r)).addScaledVector(UP,Math.sin(r)).multiplyScalar(900).add(cp);
    const w=deg===0?320:60,gap=deg===0?40:22;
    for(const s of [1,-1]){
      const p1=proj(_d.copy(_c).addScaledVector(hr,gap*s)),p2=proj(_d.copy(_c).addScaledVector(hr,(gap+w)*s));
      if(!p1.ok||!p2.ok)continue;
      c.setLineDash(deg<0?[6,5]:[]);c.beginPath();c.moveTo(p1.x,p1.y);c.lineTo(p2.x,p2.y);c.stroke();
      if(deg!==0)txt(c,String(Math.abs(deg)),p2.x+(p2.x>p1.x?6:-6),p2.y,p2.x>p1.x?'left':'right',HUD,10);
    }
  }
  c.restore();c.setLineDash([]);
  // flight path marker (velocity vector)
  const fpm=proj(_d.copy(P.pos).addScaledVector(P.vel,4));
  if(fpm.ok){c.beginPath();c.arc(fpm.x,fpm.y,6,0,Math.PI*2);c.stroke();
    c.beginPath();c.moveTo(fpm.x-14,fpm.y);c.lineTo(fpm.x-6,fpm.y);c.moveTo(fpm.x+6,fpm.y);c.lineTo(fpm.x+14,fpm.y);c.moveTo(fpm.x,fpm.y-6);c.lineTo(fpm.x,fpm.y-12);c.stroke()}
  // LCOS gun pipper: where rounds will be at target range, corrected for own turn rate
  const gunR=lockTarget&&lockDist<2500?lockDist:900, tof=gunTof(gunR,AC.muzzle,atm(P.pos.y).sig);
  _e.copy(P.fwd).multiplyScalar(gunR); _e.y-=.5*G*tof*tof;
  const w=omega.length(); if(w>1e-4)_e.applyAxisAngle(_c.copy(omega).divideScalar(w),-w*tof);
  const pp=proj(_d.copy(P.pos).add(_e));
  if(pp.ok){c.beginPath();c.arc(pp.x,pp.y,15,0,Math.PI*2);c.stroke();c.fillStyle=HUD;c.fillRect(pp.x-1.5,pp.y-1.5,3,3);
    if(lockTarget&&lockDist<2500){const f=clamp(lockDist/1800,0,1);c.lineWidth=3;c.beginPath();c.arc(pp.x,pp.y,20,-Math.PI/2,-Math.PI/2+Math.PI*2*f);c.stroke();c.lineWidth=1.5}}
  // ACM scan pattern on the HUD
  const acm=ACMS[R.acm];
  if(acm&&!R.stt){
    const dp=(az,el)=>proj(_d.set(-Math.sin(az)*Math.cos(el),Math.sin(el),Math.cos(az)*Math.cos(el)).applyQuaternion(playerJet.quaternion).multiplyScalar(1000).add(P.pos));
    c.save();c.globalAlpha=.8;c.setLineDash([6,5]);c.beginPath();
    if(acm==='20x30'){const pts=[[-10,-10],[10,-10],[10,20],[-10,20]].map(([a,e])=>dp(a*DEG,e*DEG));if(pts.every(p=>p.ok)){c.moveTo(pts[0].x,pts[0].y);pts.slice(1).forEach(p=>c.lineTo(p.x,p.y));c.closePath()}}
    else if(acm==='VSCAN'){for(const s of [-5,5]){const a=dp(s*DEG,-10*DEG),b=dp(s*DEG,50*DEG);if(a.ok&&b.ok){c.moveTo(a.x,a.y);c.lineTo(b.x,b.y)}}}
    else {const p=dp(0,0);if(p.ok){c.setLineDash([]);c.moveTo(p.x-14,p.y);c.lineTo(p.x+14,p.y);c.moveTo(p.x,p.y-14);c.lineTo(p.x,p.y+14)}}
    c.stroke();c.restore();
  }
  if(hr_)c.restore();
  }
  // bandits
  const cx=W/2,cy=H/2,rx=W/2-46-Math.max(INS.l,INS.r),ry=H/2-64-Math.max(INS.t,INS.b);
  for(const e of [...enemies,...friends]){
    if(!e.alive)continue;
    const blue=e.team==='blue', col=blue?'#6fb7ff':THREAT, MK=PRESETS[preset].marks;
    if(!blue&&MK===0)continue;   // Simulator: no bandit markers, just the gauges and the radar
    const p=proj(e.pos),d=e.pos.distanceTo(P.pos);
    const on=p.ok&&p.x>20&&p.x<W-20&&p.y>20&&p.y<H-20;
    c.strokeStyle=col;c.fillStyle=col;
    if(on){const s=e.kind==='fighter'?9:13;
      if(blue){c.beginPath();c.moveTo(p.x-s,p.y+s*.6);c.lineTo(p.x,p.y-s*.6);c.lineTo(p.x+s,p.y+s*.6);c.stroke();txt(c,e.kind==='transport'?'C-130':'TWO',p.x,p.y+20,'center',col,10,700)}
      else{c.beginPath();c.moveTo(p.x,p.y-s);c.lineTo(p.x+s,p.y);c.lineTo(p.x,p.y+s);c.lineTo(p.x-s,p.y);c.closePath();c.stroke();
        if(MK>=2||d<9000)txt(c,(e.kind==='bomber'?'BMR ':'')+nm(d),p.x,p.y+20,'center',col,11);
        if(MK>=2&&!e.remote&&e.kind==='fighter'&&BANDITS[e.type])txt(c,BANDITS[e.type],p.x,p.y-18,'center',col,10,700);   // vehicle tag, like the War Thunder markers   // Realistic: range only when close
        if(e.remote&&MK>=2)txt(c,(e.name||'PILOT').toUpperCase().slice(0,14)+' · '+(AC_DEFS[e.type]?AC_DEFS[e.type].name:''),p.x,p.y-18,'center',col,10,700)}}
    else{_d.copy(e.pos).applyMatrix4(camera.matrixWorldInverse);
      let dx=_d.x,dy=-_d.y; if(Math.abs(dx)+Math.abs(dy)<1e-3)dy=1;
      const a=Math.atan2(dy,dx),x=cx+Math.cos(a)*rx,y=cy+Math.sin(a)*ry;
      c.save();c.translate(x,y);c.rotate(a);c.beginPath();c.moveTo(12,0);c.lineTo(-6,-8);c.lineTo(-6,8);c.closePath();c.fill();c.restore()}
  }
  // ground war: vehicle markers with names, blue squares and red diamonds
  if(WAR.on)for(const u of WAR.units){if(!u.alive)continue;const d=u.pos.distanceTo(P.pos);if(d>16000)continue;const p=proj(u.pos);if(!p.ok||p.x<20||p.x>W-20||p.y<20||p.y>H-20)continue;
    const col=u.team==='blue'?'#6fb7ff':THREAT,s=6;c.strokeStyle=col;c.lineWidth=1.5;
    if(u.team==='blue')c.strokeRect(p.x-s,p.y-s,s*2,s*2);else{c.beginPath();c.moveTo(p.x,p.y-s-1);c.lineTo(p.x+s+1,p.y);c.lineTo(p.x,p.y+s+1);c.lineTo(p.x-s-1,p.y);c.closePath();c.stroke()}
    if(d<10000)txt(c,u.def.n+' '+nm(d)+(warFlags(u)?' · '+warFlags(u):''),p.x,p.y+s+13,'center',col,10)}
  // radar target designator box (STT square, TWS bug triangle) + 9X seeker circle
  const rt=radarTarget();
  if(R.stt){const p=proj(R.stt.pos);if(p.ok){
    const acq=R.acqT<.5, s=acq?22+(1-R.acqT/.5)*26:20, col=acq?WARN:HUD;
    c.strokeStyle=col;c.lineWidth=2;c.strokeRect(p.x-s,p.y-s,s*2,s*2);c.lineWidth=1.5;
    txt(c,acq?'ACQ':(can120&&P.aim120>0?'SHOOT '+AC.mrName:R.sttSrc==='IRST'?'IRST':'STT'),p.x,p.y-s-10,'center',col,11,700);
    txt(c,nm(lockDist)+' NM',p.x,p.y+s+12,'center',col,10);
  }} else if(rt){const p=proj(rt.pos);if(p.ok){
    c.strokeStyle=HUD;c.lineWidth=2;c.beginPath();c.moveTo(p.x,p.y-24);c.lineTo(p.x+20,p.y+14);c.lineTo(p.x-20,p.y+14);c.closePath();c.stroke();c.lineWidth=1.5;
    txt(c,can120&&P.aim120>0?'SHOOT '+AC.mrName:'TWS',p.x,p.y-34,'center',HUD,11,700);
  }}
  if(seekT&&P.aim9>0){const p=proj(seekT.pos);if(p.ok){
    c.strokeStyle=can9?HUD:WARN;c.setLineDash(can9?[]:[5,4]);c.beginPath();c.arc(p.x,p.y,can9?14:14+(1-Math.min(1,lockT/SPEC['9X'].lockT))*20,0,Math.PI*2);c.stroke();c.setLineDash([]);
    if(can9)txt(c,'SHOOT '+AC.srName,p.x,p.y+(seekT===R.stt?44:28),'center',HUD,11,700);
  }}
  c.strokeStyle=HUD;
  // airspeed / mach / g / altitude / heading
  const T=INS.t+14;
  const ft=Math.round(P.pos.y*3.281);
  let hdg=Math.round((Math.atan2(-P.fwd.x,P.fwd.z)*180/Math.PI+360)%360); hdg=hdg===0?360:hdg;
  const corner=Math.abs(P.kcas-AC.corner)<30, gcol=P.n>8||P.n<-2?WARN:HUD;
  const thrTxt=(throttle>.81?'AB ':throttle>=.795?'MIL ':'')+Math.round(throttle*100)+'%'+(brake?' BRK':'');
  if(pit){
    // tapes drawn on the combiner glass, compact like the real HUD
    if(hr_){
      const L=hr_.x0+6,R=hr_.x1-6,midY=(hr_.y0+hr_.y1)/2,sm=hr_.x1-hr_.x0<300;
      const fs=sm?12:15;
      c.save();c.shadowColor='rgba(125,255,154,.6)';c.shadowBlur=4;
      c.strokeRect(L,midY-11,sm?40:56,22);txt(c,String(Math.round(P.kcas)),L+(sm?37:52),midY+1,'right',corner?HUD:P.kcas<200?WARN:HUD,fs,700);
      txt(c,'M'+P.mach.toFixed(2),L,midY+22,'left',HUD,sm?10:11);
      txt(c,P.n.toFixed(1)+'G',L,midY-24,'left',gcol,sm?11:13,700);
      c.strokeRect(R-(sm?46:62),midY-11,sm?46:62,22);txt(c,String(ft),R-3,midY+1,'right',HUD,fs,700);
      txt(c,thrTxt,R,midY+22,'right',throttle>.81?WARN:HUD,sm?9:11,700);
      txt(c,String(hdg).padStart(3,'0'),(L+R)/2,hr_.y0+10,'center',HUD,sm?11:13,700);
      c.restore();
    }
  } else {
    const L=INS.l+16,R=W-INS.r-16,midY=tapeY();
    c.strokeRect(L,midY-15,76,30);txt(c,'KCAS',L,midY-26,'left',HUDD,10);txt(c,String(Math.round(P.kcas)),L+70,midY+1,'right',corner?HUD:P.kcas<200?WARN:HUD,16,700);
    txt(c,'M '+P.mach.toFixed(2),L,midY+28,'left',HUD,12);
    txt(c,'THR '+thrTxt,L,midY+46,'left',throttle>.81?WARN:HUDD,11,700);
    {const al=P.alpha||0;txt(c,'AOA '+al.toFixed(1),L+64,midY-44,'left',Math.abs(al)>24?THREAT:Math.abs(al)>18?WARN:HUDD,11,700)}
    txt(c,'RDR '+(RADAR.stt?(RADAR.acqT<.5?'ACQ':'STT'):ACMS[RADAR.acm]?'ACM':RADAR.mode)+' '+RANGES[RADAR.rng],L,midY+62,'left',RADAR.stt?HUD:HUDD,11,700);
    txt(c,'G',L,midY-62,'left',HUDD,10);txt(c,P.n.toFixed(1),L+18,midY-62,'left',gcol,18,700);
    txt(c,'MAX '+P.maxG.toFixed(1),L,midY-44,'left',HUDD,10);
    c.strokeRect(R-86,midY-15,86,30);txt(c,'ALT FT',R,midY-26,'right',HUDD,10);txt(c,String(ft),R-6,midY+1,'right',HUD,16,700);
    txt(c,(P.vel.y>=0?'+':'')+Math.round(P.vel.y*196.85)+' FPM',R,midY+28,'right',HUDD,10);
    const hy=W<560?T+58:T+28;c.strokeRect(W/2-34,hy,68,24);txt(c,String(hdg).padStart(3,'0'),W/2,hy+13,'center',HUD,14,700);
  }
  const ls=pit||W<560;
  if(W<560){ // narrow: two short lines that fit left of the top buttons
    const room=Math.max(80,W-INS.r-262-INS.l-16), maxc=Math.floor(room/6.2), st=missionStatus();
    txt(c,st.length>maxc?st.slice(0,maxc-1)+'…':st,INS.l+16,T+4,'left',HUD,10,700);
    txt(c,'SCORE '+score,INS.l+16,T+18,'left',HUD,10,700);
  } else {const cxS=Math.min(W/2,(INS.l+16+W-INS.r-312)/2);txt(c,missionStatus()+`   SCORE ${score}`,ls?INS.l+16:cxS,T+10,ls?'left':'center',HUD,12,700)}
  if(enemies.length)txt(c,`BANDITS ${enemies.length}`,(pit||W<560)?INS.l+16:W/2,(pit||W<560)?T+52:T+70,(pit||W<560)?'left':'center',THREAT,11,700);
  // stores + hull
  const nar=pit||W<560,bw=nar?80:110,bx=nar?INS.l+52:W/2-bw/2,by=nar?T+36:T+90;
  if(preset==='ARCADE'){   // Realistic and Simulator show damage only through the module warnings, as in War Thunder
    txt(c,'HULL',bx-8,by,'right',HUDD,10);
    c.strokeRect(bx,by-5,bw,10);c.fillStyle=P.hp>35?HUD:THREAT;c.fillRect(bx+2,by-3,(bw-4)*Math.max(0,P.hp)/100,6)}
  const flash=(clock*4%1)<.55;
  // MAW cues (Gripen): bearing to missiles the UV sensors have seen in the last 3 s
  if(AC.cm.maws)for(const m of eMissiles){
    if(!m.on||m.target!==P||clock-m.mawSeen>3)continue; const p3=m.m.position;
    const p=proj(p3), on=p.ok&&p.x>20&&p.x<W-20&&p.y>20&&p.y<H-20;
    c.strokeStyle=THREAT;c.fillStyle=THREAT;c.lineWidth=2;
    if(on){c.beginPath();c.arc(p.x,p.y,16,0,Math.PI*2);c.stroke();txt(c,'MAW',p.x,p.y+26,'center',THREAT,10,700)}
    else if(flash){_d.copy(p3).applyMatrix4(camera.matrixWorldInverse);let dx=_d.x,dy=-_d.y;if(Math.abs(dx)+Math.abs(dy)<1e-3)dy=1;
      const a=Math.atan2(dy,dx),x=W/2+Math.cos(a)*(W/2-70),y=H/2+Math.sin(a)*(H/2-80);
      c.save();c.translate(x,y);c.rotate(a);c.beginPath();c.moveTo(18,0);c.lineTo(-8,-11);c.lineTo(-8,11);c.closePath();c.fill();c.restore();
      txt(c,'MSL',x-Math.cos(a)*24,y-Math.sin(a)*24,'center',THREAT,10,700)}
    c.lineWidth=1.5;
  }
  // RWR scope (ALR-56M style): bearing around the ring, closer to centre = more dangerous
  {const r=40, cx=W>H?W-INS.r-176:W-INS.r-62, cy=INS.t+112;
    c.save();c.fillStyle='rgba(4,10,8,.55)';c.beginPath();c.arc(cx,cy,r+6,0,Math.PI*2);c.fill();
    c.strokeStyle=HUDD;c.lineWidth=1;c.beginPath();c.arc(cx,cy,r,0,Math.PI*2);c.stroke();c.beginPath();c.arc(cx,cy,r*.5,0,Math.PI*2);c.stroke();
    for(let i=0;i<12;i++){const a=i*Math.PI/6;c.beginPath();c.moveTo(cx+Math.sin(a)*(r-4),cy-Math.cos(a)*(r-4));c.lineTo(cx+Math.sin(a)*r,cy-Math.cos(a)*r);c.stroke()}
    txt(c,AC.rwrName?AC.rwrName:AC.id==='MIG29'||AC.id==='SU27'?'SPO-15':AC.id==='SU35'?'L150':AC.id==='MIG29UPG'?'D-29 RWR':AC.id==='MIG35'?'L-150':AC.id==='F16B70'?'DRWR':AC.id==='GRIPENE'?'AREXIS':'RWR',cx-r-6,cy-r-2,'left',HUDD,9,700);
    for(const e of enemies){
      if(e.kind!=='fighter')continue; const a=relAngles(e.pos); if(a.d>45000)continue; const spk=e.tgt===P&&e.lockT>.3;
      let launched=false;for(const m of eMissiles)if(m.on&&m.owner===e&&m.type==='RDR'&&m.target===P)launched=true;
      const rr=launched||spk?r*.32:a.d<12000?r*.6:r*.85;
      const x=cx+Math.sin(a.az)*rr,y=cy-Math.cos(a.az)*rr;
      if(launched&&!flash)continue;
      txt(c,RWR_SYM[e.type]||(AC_DEFS[e.type]&&AC_DEFS[e.type].rwrSym)||'U',x,y,'center',spk?THREAT:HUD,10,700);
      if(spk){c.strokeStyle=THREAT;c.beginPath();c.moveTo(x,y-10);c.lineTo(x+12,y);c.lineTo(x,y+10);c.lineTo(x-12,y);c.closePath();c.stroke()}
    }
    for(const g of ground){if(!g.alive||!g.tgt)continue;const a=relAngles(g.pos);const rr=g.kind==='sam'?(g.lockT>4?r*.32:r*.6):r*.45;
      const x=cx+Math.sin(a.az)*rr,y=cy-Math.cos(a.az)*rr;txt(c,g.kind==='sam'?'11':'A',x,y,'center',THREAT,10,700);
      if(g.kind==='sam'&&g.lockT>.3){c.strokeStyle=THREAT;c.beginPath();c.moveTo(x,y-10);c.lineTo(x+12,y);c.lineTo(x,y+10);c.lineTo(x-12,y);c.closePath();c.stroke()}}
    for(const m of eMissiles){if(!m.on||m.type!=='RDR'||m.target!==P||!flash)continue;
      const a=relAngles(m.m.position);txt(c,'M',cx+Math.sin(a.az)*r*.18,cy-Math.cos(a.az)*r*.18,'center',THREAT,11,700)}
    if(CM.ecm)txt(c,AC.cm.jam+' XMIT',cx,cy+r+14,'center',HUD,9,700);
    c.restore();
  }
  // launch zone
  if(pit){if(hr_)drawDLZ(c,hr_.x1+22,hr_.y0+12,hr_.y1-8)} else {const R2=W-INS.r-16;drawDLZ(c,R2-8,tapeY()+52,tapeY()+170)}
  // tanker
  if(TK.on&&TK.obj){const p=proj(TK.pos),d=TK.pos.distanceTo(P.pos);if(p.ok&&p.x>0&&p.x<W&&p.y>0&&p.y<H){c.strokeStyle='#6fb7ff';c.lineWidth=2;
    c.beginPath();c.moveTo(p.x-12,p.y+7);c.lineTo(p.x,p.y-5);c.lineTo(p.x+12,p.y+7);c.stroke();c.lineWidth=1.5;
    txt(c,'TANKER '+(d/1852).toFixed(1)+(AC.refuel?'':' · NO PROBE'),p.x,p.y+20,'center','#6fb7ff',10,700)}
    const cue=tankerCue(); if(cue)txt(c,cue,W/2,H*.84,'center',TK.conn?HUD:'#6fb7ff',12,700)}
  // runway: outline once you're near the base, glide-path and gear cues
  {const dB=Math.hypot(P.pos.x-RWY.x,P.pos.z);if(dB<16000&&P.pos.y<BASE_Y+2500&&!P.onGround){
    const pts=[[RWY.x-RWY.w/2,RWY.z0],[RWY.x+RWY.w/2,RWY.z0],[RWY.x+RWY.w/2,RWY.z1],[RWY.x-RWY.w/2,RWY.z1]].map(([x,z])=>proj(_s1.set(x,BASE_Y,z)));
    if(pts.every(q=>q.ok)){c.strokeStyle=HUD;c.beginPath();pts.forEach((q,i)=>i?c.lineTo(q.x,q.y):c.moveTo(q.x,q.y));c.closePath();c.stroke()}
    const thr=Math.abs(P.pos.z-RWY.z0)<Math.abs(P.pos.z-RWY.z1)?RWY.z0:RWY.z1, dz=Math.abs(P.pos.z-thr);
    if(P.gear)txt(c,'RWY '+(Math.hypot(P.pos.x-RWY.x,P.pos.z-thr)/1852).toFixed(1)+' NM · '+Math.round((P.pos.y-BASE_Y)*3.281)+' FT AGL · SINK '+Math.max(0,-P.vel.y).toFixed(1)+' M/S',W/2,H*.88,'center',HUD,11,700);
    if(!P.gear&&P.pos.y-BASE_Y<400&&P.kcas<220&&dz<6000&&(clock*3%1)<.6){c.strokeStyle=WARN;c.lineWidth=2;c.strokeRect(W/2-46,H*.55-14,92,28);txt(c,'GEAR',W/2,H*.55,'center',WARN,15,700);c.lineWidth=1.5}}}
  if(P.scramble&&!P.onDeck&&!(CV.obj&&P.pos.distanceTo(CV.pos)<3000)){const rk=rotateKt(), cue=P.onGround?(thrSet<.8?'1 · PUSH THROTTLE UP TO MIL OR AB':P.kcas<rk?'2 · ROLLING · ROTATE AT '+rk+' KT':'3 · PULL BACK NOW TO LIFT OFF'):P.gear?'4 · GEAR UP · KEEP CLIMBING':'5 · CLIMB · BANDITS HELD UNTIL 600 M';
    txt(c,cue,W/2,H*.7,'center',HUD,13,700)}
  else if(P.onGround&&!P.onDeck)txt(c,'ON THE RUNWAY · '+Math.round(P.kcas)+' KT'+(P.serviced&&Math.hypot(P.vel.x,P.vel.z)<1.5?' · TURNED AROUND':' · STOP 4 S TO REARM'),W/2,H*.88,'center',HUD,11,700);
  // training coach
  {const t=coachText();if(t){c.save();c.font=`700 12px ${FONT}`;const tw=Math.min(W-40,c.measureText(t).width+24),y=pit?H*.66:H*.22;
    c.fillStyle='rgba(4,10,8,.6)';c.fillRect(W/2-tw/2,y-14,tw,28);c.restore();txt(c,t.length*7>W-40?t.slice(0,Math.floor((W-60)/7))+'…':t,W/2,y,'center',HUD,12,700)}}
  // your R-27R in flight: which guidance phase it's in
  for(const m of missiles){if(!m.on||!(SPEC[m.type].sarh||SPEC[m.type].arh)||!m.target)continue;
    const d=(m.target.pos.distanceTo(m.m.position)/1000).toFixed(1);
    const t={DL:'DATALINK MIDCOURSE',INS:SPEC[m.type].arh?'INERTIAL · NO UPDATES':'INERTIAL · RE-LOCK BEFORE TERMINAL',TERM:'TERMINAL · HOLD THE LOCK',ACTIVE:'ACTIVE · PITBULL'}[m.gmode]||'';
    if(t)txt(c,AC.mrName+' '+d+' KM · '+t,W/2,H*.79,'center',m.gmode==='INS'?WARN:HUD,11,700);break}
  // fuel + damage readouts
  if(!pit){txt(c,'FUEL '+fuelStr(P.fuel||0),INS.l+16,tapeY()+78,'left',P.bingo?WARN:HUDD,11,700)}
  {const sy=P.sys,w=[];if(sy){sy.eng.forEach((v,i)=>{if(v===1)w.push(ENG_NAME(i)+'ENG FIRE');if(v===2)w.push(ENG_NAME(i)+'ENG OUT')});
    if(sy.hyd)w.push('HYD');if(sy.radar)w.push('RDR FAIL');if(sy.leak)w.push('FUEL LEAK');if(sy.wL)w.push(sy.wL>=1?'L WING OFF':'L WING');if(sy.wR)w.push(sy.wR>=1?'R WING OFF':'R WING');if(sy.ctl<1)w.push('ELEV');if(sy.flapOff)w.push('FLAPS OFF');if(sy.gun)w.push('GUN JAM');if(sy.pilot)w.push('WOUNDED')}
    if(P.spin)w.push('SPIN');else if(P.nAero<1.02&&!P.onGround)w.push('STALL');if(P.flaps&&!P.onGround)w.push(P.flaps===2?'FLAPS LDG':'FLAPS CBT');
    if(P.flamedOut)w.push('FLAMEOUT'); else if(P.lowFuel)w.push('FUEL LOW'); else if(P.bingo)w.push('BINGO');
    if(w.length)txt(c,w.join(' · '),W/2,H*.74,'center',(clock*2%1)<.7?WARN:'rgba(255,179,71,.5)',12,700)}
  // warnings
  const gh=Math.max(groundH(P.pos.x,P.pos.z),0);
  if(P.gcas){c.strokeStyle=WARN;c.lineWidth=2;c.strokeRect(W/2-80,H*.62-16,160,32);txt(c,'AUTO GCAS',W/2,H*.62,'center',WARN,16,700);c.lineWidth=1.5}
  else if(!P.gear&&P.pos.y-gh<400&&P.vel.y<-20&&(clock*3%1)<.6){c.strokeStyle=WARN;c.lineWidth=2;c.strokeRect(W/2-70,H*.62-16,140,32);txt(c,'PULL UP',W/2,H*.62,'center',WARN,16,700);c.lineWidth=1.5}
  // notch cue for the closest radar missile guiding on you: which way to turn to put it on your beam
  {let nm=null,nd=22000;for(const m of eMissiles){if(!m.on||m.target!==P||m.type!=='RDR')continue;const d=m.m.position.distanceTo(P.pos);if(d<nd){nd=d;nm=m}}
   if(nm){const ux=P.pos.x-nm.m.position.x,uz=P.pos.z-nm.m.position.z,ul=Math.hypot(ux,uz)||1,hx=P.vel.x,hz=P.vel.z,hl=Math.hypot(hx,hz)||1;
     const hdg=Math.atan2(hx,hz), b1=Math.atan2(uz/ul,-ux/ul), b2=Math.atan2(-uz/ul,ux/ul);
     const wrap=a=>Math.atan2(Math.sin(a),Math.cos(a)), d1=wrap(b1-hdg), d2=wrap(b2-hdg), dd=Math.abs(d1)<Math.abs(d2)?d1:d2, deg=Math.round(Math.abs(dd)*57.3);
     let cue,col=WARN;
     if(nm.pNotch){cue=nm.blindT>0?'NOTCHED · HOLD IT':'IN THE NOTCH · HOLD + CHAFF';col=HUD}
     else if(deg<=14&&!nm.pClutter)cue='BEAMING · GO BELOW IT FOR CLUTTER';
     else cue='BEAM IT · TURN '+(dd<0?'RIGHT ':'LEFT ')+deg+'°';
     txt(c,cue+' · '+(nd/1000).toFixed(1)+' KM',W/2,H*.76,'center',col,13,700)}}
  drawAGHud(c); drawCarrierHud(c); drawRadioLines(c); drawTGPHud(c);
  if(P.kcas<160&&!P.onGround&&!(P.gear&&P.pos.y-BASE_Y<300)&&(clock*3%1)<.6)txt(c,'LOW SPEED',W/2,H*.68,'center',WARN,13,700);
  {let n=0;const fx=INS.l+14,fy=H*.68;c.save();c.textAlign='left';c.shadowColor='rgba(0,0,0,.85)';c.shadowBlur=4;
    for(const f of FEED){const age=clock-f.t;if(age>FEED_LIFE)continue;c.globalAlpha=Math.min(1,(FEED_LIFE-age)*1.2);
      txt(c,f.text,fx,fy+n*17*TXTK,'left',f.kind==='kill'?'#ffd166':f.kind==='hit'?HUD:f.kind==='loss'?THREAT:'#b8c4cf',W<500?11:13,f.kind==='kill'?700:500);n++}c.restore()}
  if(msgT>0){c.save();c.globalAlpha=Math.min(1,msgT*2);txt(c,msgText,W/2,pit?H*.58:H*.3,'center',HUD,W<500?16:20,700);c.restore()}
  // grey-out / black-out / red-out
  const gs=P.gloc>0?1:clamp((P.gStress-.35)/.65,0,1);
  if(gs>0){const neg=P.n<-1.5;const g=c.createRadialGradient(W/2,H/2,Math.min(W,H)*(.55-.5*gs),W/2,H/2,Math.max(W,H)*.75);
    const col=neg?'120,0,0':'0,0,0';g.addColorStop(0,`rgba(${col},${gs>.95?.97:0})`);g.addColorStop(1,`rgba(${col},${Math.min(.97,gs*1.1)})`);
    c.fillStyle=g;c.fillRect(0,0,W,H);
    if(P.gloc>0)txt(c,'G-LOC · RECOVERING',W/2,H/2,'center',HUDD,14,700)}
}

