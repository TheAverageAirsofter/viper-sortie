/* ---------------- Tank battle: you drive one of the ground-war vehicles ----------------
   The player's tank is an ordinary WAR unit with u.player set: the AI skips it (tkDrive runs instead), red units target it,
   shells and the damage modules work on it as on any other. The jet is parked out of sight and P only mirrors the tank's position. */
var TNK={on:false,u:null,v:0,camYaw:0,camPitch:.06,zoom:false,fire:false,kills:0,hold:0,zone:null,range:0,touch:{x:0,y:0},ui:null,baseCd:0};
const TANK_LIST=['M1A1','LEO2A4','CHAL','M60A3','M3','MARDER'];
let tkType='M1A1';try{const v=localStorage.getItem('vsTank');if(TANK_LIST.indexOf(v)>=0)tkType=v}catch(e){}
const TK_HOLD=60;   // seconds holding point A alone to win
function setupTank(){
  warClear();WAR.on=true;WAR.t=0;
  // a dry battlefield: both start lines and everything between them on land
  let cx=0,cz=12000,ok=false;const dry=(x,z)=>{const h=groundH(x,z);return h>8&&h<320};
  for(let r=0;r<16000&&!ok;r+=1000)for(let k=0;k<12&&!ok;k++){const x=Math.cos(k*.52)*r,z=12000+Math.sin(k*.52)*r;let good=true;
    for(let dz=-2200;dz<=2200&&good;dz+=200)for(const dx of [-450,0,450])if(!dry(x+dx,z+dz)){good=false;break}
    if(good){cx=x;cz=z;ok=true}}
  if(!ok)[cx,cz]=findLand(rand(-2000,2000),12000);
  const u=tkSpawn(cx-70,cz-850);
  Object.assign(TNK,{on:true,u,lives:3,respT:0,used:[tkType],air:[],bombs:[],airT:50,pickOpen:false,start:{x:cx-70,z:cz-850},zl:0,lased:0,laseT:0,hitT:0,hitFrom:null,v:0,camYaw:0,camPitch:.05,zoom:false,fire:false,kills:0,hold:0,range:0,zone:{x:cx,z:cz,r:190}});
  ['LEO2A4','M1A1','M60A3','M3','GEPARD'].forEach((id,i)=>warSpawn(id,cx+(i-2)*140+rand(-25,25),cz-900-rand(0,140),0));
  ['T80B','T72A','T72A','T62','BMP2','BMP2','ZSU23'].forEach((id,i)=>warSpawn(id,cx+(i-3)*135+rand(-25,25),cz+850+rand(0,200),Math.PI));
  tkTown(cx,cz);sortie={kind:'TANK'};
  P.pos.set(u.pos.x,u.pos.y+3,u.pos.z);P.vel.set(0,0,0);P.onGround=true;P.scramble=false;P.kcas=0;P.mach=0;P.n=1;
  playerJet.visible=false;tkUI(true);
  message('TANK BATTLE · '+WAR_V[tkType].n.toUpperCase()+' · HOLD POINT A FOR '+TK_HOLD+' S OR DESTROY THE ENEMY',3.2);
}
function tkSpawn(x,z,type){const u=warSpawn(type||tkType,x,z,0);u.obj.traverse(o=>{if(o.name==='mk')o.visible=false});u.player=true;u.cd=0;u.obj.rotation.order='YXZ';return u}
function tkClear(){if(!TNK||!TNK.on)return;TNK.on=false;for(const o of TNK.town||[])scene.remove(o);TNK.town=[];TNK.bld=null;TNK.u=null;tkUI(false);tkPicker(false);for(const a of TNK.air||[])scene.remove(a.obj);for(const b of TNK.bombs||[])scene.remove(b.m);TNK.air=[];TNK.bombs=[];playerJet.visible=true;projKey=''}
// keyboard: W/S drive, A/D steer, arrows aim, Space fire, Z or Shift zoom
function tkKey(code,down){if(!down)return;
  if(TNK.pickOpen&&/^Digit[1-9]$/.test(code)){const k=TANK_LIST.filter(x=>TNK.used.indexOf(x)<0)[+code.slice(5)-1];if(k)tkRespawn(k);return}
  if(code==='Space')TNK.fire=true;
  if(code==='KeyZ'||code==='ShiftLeft'||code==='ShiftRight')tkZoom(1);
  if(code==='Equal'||code==='NumpadAdd')tkZoom(1,true);if(code==='Minus'||code==='NumpadSubtract')tkZoom(-1,true);
  if(code==='KeyR')tkLase()}
function tkZoom(dir,clampIt){const z=(TNK.zl||0)+dir;TNK.zl=clampIt?clamp(z,0,2):(z+3)%3;TNK.zoom=TNK.zl>0}
// laser rangefinder: measure what's under the reticle and lay the gun for that range
function tkLase(){if(!TNK.u||!TNK.u.alive)return;TNK.lased=Math.round(tkRange());TNK.laseT=1;message('RANGE '+TNK.lased+' M',1)}
// driving, called from updateWar in place of the AI
function tkDrive(u,dt){const d=u.def,m=u.mod;
  const thrIn=clamp((keys.KeyW?1:0)-(keys.KeyS?1:0)+TNK.touch.y,-1,1),stIn=clamp((keys.KeyD?1:0)-(keys.KeyA?1:0)+TNK.touch.x,-1,1);
  if(keys.ArrowLeft)TNK.camYaw+=dt*(TNK.zl===2?.12:TNK.zoom?.25:1.1);if(keys.ArrowRight)TNK.camYaw-=dt*(TNK.zl===2?.12:TNK.zoom?.25:1.1);
  if(keys.ArrowUp)TNK.camPitch=clamp(TNK.camPitch+dt*(TNK.zl===2?.06:TNK.zoom?.12:.5),-.25,.45);if(keys.ArrowDown)TNK.camPitch=clamp(TNK.camPitch-dt*(TNK.zl===2?.06:TNK.zoom?.12:.5),-.25,.45);
  const vmax=d.spd*(m.eng?.45:1)*(m.trk?0:1)*(m.crew<d.crew?.85:1),want=thrIn>=0?thrIn*vmax:thrIn*vmax*.4;
  const h=u.heading,hx=Math.sin(h),hz=Math.cos(h),rx=Math.cos(h),rz=-Math.sin(h);
  const gH=(x,z)=>Math.max(groundH(x,z),0),fh=gH(u.pos.x+hx*3,u.pos.z+hz*3),bh=gH(u.pos.x-hx*3,u.pos.z-hz*3),slope=(fh-bh)/6;
  TNK.v+=clamp(want-TNK.v,-7*dt,3.2*dt);TNK.v-=9.81*Math.sin(Math.atan(slope))*.35*dt;   // gravity along the slope
  if(Math.abs(slope)>.8&&Math.sign(slope)===Math.sign(TNK.v))TNK.v*=.8;   // too steep
  if(m.trk)TNK.v*=Math.max(0,1-dt*3);
  if(!m.trk)u.heading+=stIn*(.6-Math.min(.25,Math.abs(TNK.v)/Math.max(1,d.spd)*.25))*(TNK.v<-.5?-1:1)*dt;
  {const nx=u.pos.x+Math.sin(u.heading)*TNK.v*dt,nz=u.pos.z+Math.cos(u.heading)*TNK.v*dt;if(groundH(nx,nz)>1.5){u.pos.x=nx;u.pos.z=nz}else TNK.v=0}   // tanks don't swim
  for(const o of WAR.units){if(o===u)continue;const dx=u.pos.x-o.pos.x,dz=u.pos.z-o.pos.z,dd=Math.hypot(dx,dz);if(dd<5.5&&dd>.01){u.pos.x+=dx/dd*(5.5-dd);u.pos.z+=dz/dd*(5.5-dd);TNK.v*=.5}}
  if(tkPush(u))TNK.v*=.3;
  u.pos.y=Math.max(groundH(u.pos.x,u.pos.z),0)+.2;u.vel.set(Math.sin(u.heading)*TNK.v,0,Math.cos(u.heading)*TNK.v);u.moving=Math.abs(TNK.v)>.6;
  // the hull sits on the slope
  const lh=gH(u.pos.x-rx*1.7,u.pos.z-rz*1.7),rh=gH(u.pos.x+rx*1.7,u.pos.z+rz*1.7);
  u.obj.rotation.set(-Math.atan2(fh-bh,6),u.heading,Math.atan2(rh-lh,3.4));
  if(u.moving){u.dustT-=dt;if(u.dustT<=0){u.dustT=.25;puff(u.pos.x-hx*3,u.pos.y+.4,u.pos.z-hz*3,rand(-1,1),rand(1,2.5),rand(-1,1),.55,.5,.4,.35,rand(4,7),rand(5,9),rand(1.5,2.5),-.2)}}
  // turret and gun follow where you look; the gun is laid on the rangefinder distance so the shell drops onto the reticle
  const ud=u.obj.userData,tur=ud.tur;
  const T=TNK.aimPt;
  if(tur&&tur.parent===u.obj){const want2=warAng((T?Math.atan2(T.x-u.pos.x,T.z-u.pos.z):TNK.camYaw)-u.heading),cur=tur.rotation.y,dd=warAng(want2-cur),rate=(d.cls==='mbt'?.75:1.3)*(m.tur?.25:1);tur.rotation.y=cur+clamp(dd,-dt*rate,dt*rate);TNK.aimed=Math.abs(dd)<.02;
    if(ud.gun){const hd=T?Math.max(30,Math.hypot(T.x-u.pos.x,T.z-u.pos.z)):800,el=(T?Math.atan2(T.y-(u.pos.y+2.4),hd):TNK.camPitch)+9.81*hd/(2*d.gun[2]*d.gun[2])+u.obj.rotation.x;ud.gun.rotation.x+=(-clamp(el,-.15,.35)+(m.gun===1?.04:0)-ud.gun.rotation.x)*Math.min(1,dt*6)}}
  if(ud.gun){u.rec=Math.max(0,u.rec-dt*2.5);ud.gun.position.z=d.gz-u.rec*.4}
  if(TNK.fire){TNK.fire=false;if(m.gun>=2)message('GUN DESTROYED',1);else if(u.cd>0)message('RELOADING',.6);else tkFire(u)}
  P.pos.set(u.pos.x,u.pos.y+3,u.pos.z);P.vel.copy(u.vel);P.kcas=0;P.mach=0;P.n=1;
}
function tkFire(u){const d=u.def,m=u.mod,gun=u.obj.userData.gun;if(!gun)return;u.obj.updateMatrixWorld(true);
  const from=gun.localToWorld(new V3(0,0,d.barrel)),dir=new V3(0,0,1).transformDirection(gun.matrixWorld);
  const sp=d.gun[4]*(u.moving?1.8:1)*(m.gun===1?2.6:1);dir.x+=rand(-sp,sp);dir.y+=rand(-sp,sp);dir.z+=rand(-sp,sp);dir.normalize();
  const s=WAR.sh.find(q=>!q.on)||WAR.sh[0];s.on=true;s.team=u.team;s.dmg=d.gun[3];s.owner=u;s.life=8;s.m.material=warShellMat.blue;s.m.visible=true;s.m.position.copy(from);s.prev.copy(from);s.vel.copy(dir).multiplyScalar(d.gun[2]);s.m.quaternion.setFromUnitVectors(ZF,dir);
  const big=d.cls==='mbt';puff(from.x+dir.x*2,from.y+dir.y*2,from.z+dir.z*2,dir.x*30,dir.y*30+2,dir.z*30,1,.85,.5,1,big?9:3,big?30:10,.14);if(big)puff(from.x,from.y,from.z,dir.x*8,3,dir.z*8,.5,.48,.44,.6,7,12,2.2);
  TNK.shots=(TNK.shots||0)+1;u.rec=1;u.cd=d.gun[1]*(m.gun===1?1.6:1)*(m.crew>0?d.crew/m.crew:9);shake=Math.max(shake,big?.25:.06);if(big)sndBoom(.5);else sndGun();buzz(big?40:10)}
// what's under the reticle: terrain or a vehicle, out to 4 km
function tkRange(){const o=camera.position,dr=new V3();camera.getWorldDirection(dr);let hitD=4000;
  for(const u of WAR.units){if(u===TNK.u||!u.alive)continue;const w=new V3(u.pos.x,u.pos.y+1.4,u.pos.z).sub(o),t=w.dot(dr);if(t<0||t>hitD)continue;if(w.addScaledVector(dr,-t).length()<3.2)hitD=t}
  if(TNK.bld){const t=tkSegHit(o,o.clone().addScaledVector(dr,hitD));if(t>=0)hitD=t*hitD}
  for(let t=20;t<hitD;t+=t<400?10:25){const x=o.x+dr.x*t,y=o.y+dr.y*t,z=o.z+dr.z*t;if(y<Math.max(groundH(x,z),0)){hitD=t;break}}
  return hitD}
function tkCamera(dt){const u=TNK.u;if(!u)return;applyProj();
  const tur=u.obj.userData.tur,cy=Math.cos(TNK.camPitch);
  const dir=new V3(Math.sin(TNK.camYaw)*cy,Math.sin(TNK.camPitch),Math.cos(TNK.camYaw)*cy);
  if(TNK.zoom){u.obj.updateMatrixWorld(true);const p=tur?tur.localToWorld(new V3(0,u.def.gy+.95,u.def.gz+1.0)):u.pos.clone().setY(u.pos.y+2.8);/* the gunner sight sits above the gun, on its axis */camera.position.copy(p);camera.fov=TNK.zl===2?7.5:15}
  else{camera.position.set(u.pos.x,u.pos.y+3.6,u.pos.z).addScaledVector(dir,-12).setY(Math.max(u.pos.y+3.6-dir.y*12,Math.max(groundH(camera.position.x,camera.position.z),0)+1.8))}
  camera.lookAt(camera.position.clone().addScaledVector(dir,100));camera.updateProjectionMatrix();projKey='';
  TNK.range=TNK.lased||800;TNK.aimPt=camera.position.clone().addScaledVector(camera.getWorldDirection(new V3()),TNK.range)}   // the gun is laid on the last lased range
function tkSound(){const t=A.ctx.currentTime,v=Math.abs(TNK.v),live=state==='play'&&TNK.u&&TNK.u.alive;
  A.eng.frequency.setTargetAtTime(24+v*2.2,t,.2);A.engG.gain.setTargetAtTime(live?.05:0,t,.2);if(A.eng2G)A.eng2G.gain.setTargetAtTime(0,t,.2);if(A.whG)A.whG.gain.setTargetAtTime(live?.004+v*.0004:0,t,.2);
  A.roarF.frequency.setTargetAtTime(160+v*18,t,.2);A.roarG.gain.setTargetAtTime(live?.05+v*.004:0,t,.2)}
// point A: hold it alone to win; red holding it alone wins for them
function tkCheck(dt){const Z=TNK.zone,u=TNK.u;
  if(!u.alive){   // three vehicles: watch the wreck, then pick the next one from the lineup (each vehicle once)
    if(TNK.lives>1){TNK.respT+=dt;if(TNK.respT>3&&!TNK.pickOpen)tkPicker(true);if(TNK.respT>18)tkRespawn(TANK_LIST.find(x=>TNK.used.indexOf(x)<0))}
    else endMission(false,'All three tanks knocked out'+(TNK.kills?' · '+TNK.kills+' kill'+(TNK.kills>1?'s':''):''));
    if(!TNK.u.alive)return}
  let b=0,r=0;for(const o of WAR.units){if(!o.alive)continue;if(Math.hypot(o.pos.x-Z.x,o.pos.z-Z.z)<Z.r){if(o.team==='blue')b++;else r++}}
  if(b&&!r)TNK.hold=Math.min(TK_HOLD,TNK.hold+dt);else if(r&&!b)TNK.hold=Math.max(-TK_HOLD,TNK.hold-dt);
  if(TNK.hold>=TK_HOLD)endMission(true,'Point A captured');else if(TNK.hold<=-TK_HOLD)endMission(false,'The enemy took point A');
  else if(!warAlive('red'))endMission(true,'Enemy armour destroyed');else if(WAR.t>900)endMission(TNK.hold>=0,TNK.hold>=0?'Held the field':'Out of time')}
function tkStatus(){return 'POINT A '+(TNK.hold>0?'BLUE ':TNK.hold<0?'RED ':'')+Math.round(Math.abs(TNK.hold)/TK_HOLD*100)+'% · BLUE '+warAlive('blue')+' · RED '+warAlive('red')}
// HUD: reticle where you look, a circle where the gun points, reload, range, speed, damage, point A and enemy markers
function tkHUD(c){const u=TNK.u;if(!u)return;const d=u.def,col=HUD,pj=v=>{const q=v.clone().project(camera);return q.z<1&&Math.abs(q.x)<1.2&&Math.abs(q.y)<1.2?{x:(q.x+1)/2*W,y:(1-q.y)/2*H}:null};
  const cx=W/2,cy=H/2;c.strokeStyle=col;c.lineWidth=1.5;
  if(TNK.zoom){c.fillStyle='rgba(0,0,0,.55)';{const R=Math.min(W,H)*.46;c.beginPath();c.rect(0,0,W,H);c.moveTo(cx+R,cy);c.arc(cx,cy,R,0,Math.PI*2,true);c.fill()}   // moveTo first, or the path joins the corner to the circle with a hairline
    c.beginPath();c.moveTo(cx-120,cy);c.lineTo(cx-12,cy);c.moveTo(cx+12,cy);c.lineTo(cx+120,cy);c.moveTo(cx,cy+12);c.lineTo(cx,cy+90);c.stroke();
    for(let i=1;i<=4;i++){c.beginPath();c.moveTo(cx-6,cy+i*20);c.lineTo(cx+6,cy+i*20);c.stroke()}}
  else{c.beginPath();c.moveTo(cx-14,cy);c.lineTo(cx-5,cy);c.moveTo(cx+5,cy);c.lineTo(cx+14,cy);c.moveTo(cx,cy-14);c.lineTo(cx,cy-5);c.moveTo(cx,cy+5);c.lineTo(cx,cy+14);c.stroke()}
  {const gun=u.obj.userData.gun;if(gun){u.obj.updateMatrixWorld(true);const m0=gun.localToWorld(new V3(0,0,d.barrel)),dr=new V3(0,0,1).transformDirection(gun.matrixWorld),p=pj(m0.addScaledVector(dr,TNK.range||800));
    if(p){c.strokeStyle=TNK.aimed?col:'rgba(255,200,80,.9)';c.beginPath();c.arc(p.x,p.y,9,0,6.3);c.stroke()}}}
  const rl=u.cd>0?clamp(1-u.cd/(d.gun[1]*(u.mod.crew>0?d.crew/u.mod.crew:9)),0,1):1;c.fillStyle='rgba(0,0,0,.35)';c.fillRect(cx-40,cy+30,80,5);c.fillStyle=rl>=1?col:'#ffb347';c.fillRect(cx-40,cy+30,80*rl,5);
  txt(c,rl>=1?'READY':'RELOAD',cx,cy+46,'center',rl>=1?col:'#ffb347',11,700);
  txt(c,'RNG '+(TNK.lased?TNK.lased+' M':'--- (R / RANGE)'),cx+(TNK.zoom?150:60),cy+4,'left',TNK.laseT>0?'#ffe066':col,12,700);if(TNK.laseT>0)TNK.laseT-=1/60;
  if(TNK.zoom)txt(c,TNK.zl===2?'×8':'×4',cx-150,cy+4,'right',col,13,800);
  txt(c,Math.round(Math.abs(TNK.v)*3.6)+' KM/H'+(TNK.v<-.5?' R':''),20,H-120,'left',col,16,700);
  txt(c,d.n.toUpperCase(),20,H-140,'left',col,12,600);
  const fl=warFlags(u);if(fl)txt(c,fl,20,H-100,'left','#ff6b5c',12,700);
  // point A
  {const Z=TNK.zone,p=pj(new V3(Z.x,Math.max(groundH(Z.x,Z.z),0)+25,Z.z)),dz=Math.hypot(Z.x-u.pos.x,Z.z-u.pos.z);
    if(p){c.strokeStyle=TNK.hold>0?'#5cb8ff':TNK.hold<0?'#ff6b5c':col;c.beginPath();c.arc(p.x,p.y,12,0,6.3);c.stroke();txt(c,'A',p.x,p.y+4,'center',c.strokeStyle,12,800);txt(c,(dz/1000).toFixed(1)+' KM',p.x,p.y+26,'center',col,10,600)}
    const w=160,x0=cx-w/2;c.fillStyle='rgba(0,0,0,.35)';c.fillRect(x0,44,w,6);c.fillStyle=TNK.hold>=0?'#5cb8ff':'#ff6b5c';const f=Math.abs(TNK.hold)/TK_HOLD;c.fillRect(TNK.hold>=0?cx:cx-w/2*f,44,w/2*f,6);
    txt(c,'POINT A',cx,38,'center',col,11,700)}
  // enemy markers within 3 km and in sight
  for(const o of WAR.units){if(!o.alive||o.team!=='red')continue;const dd=o.pos.distanceTo(u.pos);if(dd>3000)continue;const p=pj(new V3(o.pos.x,o.pos.y+4.5,o.pos.z));if(!p)continue;
    c.strokeStyle='#ff6b5c';c.beginPath();c.moveTo(p.x,p.y-6);c.lineTo(p.x+6,p.y);c.lineTo(p.x,p.y+6);c.lineTo(p.x-6,p.y);c.closePath();c.stroke();if(dd<1800)txt(c,o.def.n,p.x,p.y-10,'center','#ff6b5c',9,600)}
  txt(c,'KILLS '+TNK.kills+' · TANKS '+TNK.lives+'/3',W-76,32,'right',col,13,700);
  if(!u.alive&&!TNK.pickOpen)txt(c,'KNOCKED OUT',cx,cy-60,'center','#ffb347',22,800);
  for(const a of TNK.air){if(!a.alive)continue;const p=pj(a.pos);if(p){c.strokeStyle='#ff6b5c';c.beginPath();c.moveTo(p.x,p.y-8);c.lineTo(p.x+8,p.y+6);c.lineTo(p.x-8,p.y+6);c.closePath();c.stroke();txt(c,'SU-25 '+(a.pos.distanceTo(u.pos)/1000).toFixed(1)+' KM',p.x,p.y-12,'center','#ff6b5c',10,700)}}
  // where the last hit came from
  if(TNK.hitT>0&&TNK.hitFrom){TNK.hitT-=1/60;const a=Math.atan2(TNK.hitFrom.x-u.pos.x,TNK.hitFrom.z-u.pos.z)-TNK.camYaw;c.strokeStyle='rgba(255,70,50,'+Math.min(1,TNK.hitT)+')';c.lineWidth=6;c.beginPath();c.arc(cx,cy,Math.min(W,H)*.22,-Math.PI/2-a-.3,-Math.PI/2-a+.3);c.stroke();c.lineWidth=1.5}
  // minimap: heading up, 2.5 km radius
  {const mx=95,my=H-260,R=70,k=R/2500,ca=Math.cos(TNK.camYaw),sa=Math.sin(TNK.camYaw),pt=(x,z)=>{const dx=x-u.pos.x,dz=z-u.pos.z,lx=dx*ca-dz*sa,lz=dx*sa+dz*ca;return[mx-lx*k,my-lz*k,Math.hypot(lx,lz)*k<R]};
    c.fillStyle='rgba(0,0,0,.4)';c.beginPath();c.arc(mx,my,R,0,6.3);c.fill();c.strokeStyle=col;c.beginPath();c.arc(mx,my,R,0,6.3);c.stroke();
    {const [x,y,inR]=pt(TNK.zone.x,TNK.zone.z);if(inR){c.strokeStyle=TNK.hold>0?'#5cb8ff':TNK.hold<0?'#ff6b5c':col;c.beginPath();c.arc(x,y,TNK.zone.r*k,0,6.3);c.stroke();txt(c,'A',x,y+4,'center',c.strokeStyle,10,800)}}
    for(const o of WAR.units){if(!o.alive||o===u)continue;const [x,y,inR]=pt(o.pos.x,o.pos.z);if(!inR)continue;c.fillStyle=o.team==='blue'?'#5cb8ff':'#ff6b5c';c.fillRect(x-2.5,y-2.5,5,5)}
    for(const a of TNK.air){if(!a.alive)continue;const [x,y,inR]=pt(a.pos.x,a.pos.z);if(!inR)continue;c.fillStyle='#ff6b5c';c.beginPath();c.moveTo(x,y-5);c.lineTo(x+4,y+4);c.lineTo(x-4,y+4);c.closePath();c.fill()}
    c.fillStyle=col;c.beginPath();c.moveTo(mx,my-7);c.lineTo(mx+5,my+5);c.lineTo(mx-5,my+5);c.closePath();c.fill()}}
// touch: left half drives (a floating stick), right half aims; FIRE and ZOOM buttons
function tkUI(on){
  if(on&&!TNK.ui){const host=$('ctrls').parentNode,el=document.createElement('div');el.id='tkUI';
    el.style.cssText='position:absolute;inset:0;z-index:6;touch-action:none;user-select:none';
    el.innerHTML='<div id="tkDrive" style="position:absolute;left:0;top:0;bottom:0;width:45%"></div><div id="tkLook" style="position:absolute;right:0;top:0;bottom:0;width:55%"></div>'+
      '<button id="tkFire" style="position:absolute;right:22px;bottom:30px;width:92px;height:92px;border-radius:50%;border:2px solid var(--hud,#5cff8a);background:rgba(10,20,12,.55);color:var(--hud,#5cff8a);font:700 16px inherit">FIRE</button>'+
      '<button id="tkZoom" style="position:absolute;right:130px;bottom:44px;width:64px;height:64px;border-radius:50%;border:2px solid var(--hud,#5cff8a);background:rgba(10,20,12,.45);color:var(--hud,#5cff8a);font:700 12px inherit">ZOOM</button>'+
      '<button id="tkRange" style="position:absolute;right:130px;bottom:118px;width:64px;height:44px;border-radius:10px;border:2px solid var(--hud,#5cff8a);background:rgba(10,20,12,.45);color:var(--hud,#5cff8a);font:700 11px inherit">RANGE</button>'+
      '<button id="tkPause" style="position:absolute;right:14px;top:12px;width:46px;height:40px;border:1px solid var(--hud,#5cff8a);background:rgba(10,20,12,.45);color:var(--hud,#5cff8a);font:700 14px inherit">II</button>'+
      '<div id="tkKnob" style="position:absolute;width:54px;height:54px;margin:-27px 0 0 -27px;border-radius:50%;border:2px solid rgba(92,255,138,.7);display:none;pointer-events:none"></div>';
    host.appendChild(el);TNK.ui=el;
    const dv=el.querySelector('#tkDrive'),lk=el.querySelector('#tkLook'),kn=el.querySelector('#tkKnob');let dId=null,o=null,lId=null,lx=0,ly=0;
    dv.addEventListener('pointerdown',e=>{dId=e.pointerId;o={x:e.clientX,y:e.clientY};kn.style.display='block';kn.style.left=e.clientX+'px';kn.style.top=e.clientY+'px';dv.setPointerCapture(e.pointerId);audioInit()});
    dv.addEventListener('pointermove',e=>{if(e.pointerId!==dId)return;TNK.touch.x=clamp((e.clientX-o.x)/60,-1,1);TNK.touch.y=clamp(-(e.clientY-o.y)/60,-1,1)});
    const dEnd=e=>{if(e.pointerId!==dId)return;dId=null;TNK.touch.x=TNK.touch.y=0;kn.style.display='none'};dv.addEventListener('pointerup',dEnd);dv.addEventListener('pointercancel',dEnd);
    lk.addEventListener('pointerdown',e=>{lId=e.pointerId;lx=e.clientX;ly=e.clientY;lk.setPointerCapture(e.pointerId);audioInit()});
    lk.addEventListener('pointermove',e=>{if(e.pointerId!==lId)return;const k=TNK.zl===2?.0006:TNK.zoom?.0012:.005;TNK.camYaw-=(e.clientX-lx)*k;TNK.camPitch=clamp(TNK.camPitch-(e.clientY-ly)*k,-.25,.45);lx=e.clientX;ly=e.clientY});
    const lEnd=e=>{if(e.pointerId===lId)lId=null};lk.addEventListener('pointerup',lEnd);lk.addEventListener('pointercancel',lEnd);
    el.querySelector('#tkFire').addEventListener('pointerdown',e=>{e.stopPropagation();TNK.fire=true});
    el.querySelector('#tkZoom').addEventListener('pointerdown',e=>{e.stopPropagation();tkZoom(1)});el.querySelector('#tkRange').addEventListener('pointerdown',e=>{e.stopPropagation();tkLase()});
    el.querySelector('#tkPause').addEventListener('click',()=>pause())}
  if(TNK.ui)TNK.ui.hidden=!on;if(on)$('ctrls').hidden=true;document.body.classList.toggle('tankmode',!!on)}
// per frame: keep the overlay in step with the game state
function tkFrame(){if(!TNK.on)return;const show=state==='play';if(TNK.ui&&TNK.ui.hidden===show)TNK.ui.hidden=!show;if(show)$('ctrls').hidden=true;playerJet.visible=false}
// a kill by the player's tank
function tkKill(u,by){if(!by||!by.player||u.team!=='red')return;TNK.kills++;kills++;score+=u.def.cls==='mbt'?300:200;message(u.def.n.toUpperCase()+' DESTROYED',1.6);sndKill()}

// the lineup: each of the six blue vehicles can be used once, three per battle
function tkPicker(show){let el=document.getElementById('tkPick');
  if(!show){if(el)el.hidden=true;TNK.pickOpen=false;return}
  if(!el){el=document.createElement('div');el.id='tkPick';el.style.cssText='position:absolute;left:50%;top:50%;transform:translate(-50%,-50%);z-index:7;background:rgba(8,14,10,.9);border:1px solid #5cff8a;padding:12px 14px;display:flex;flex-direction:column;gap:6px;min-width:240px;font:600 14px Barlow,sans-serif;color:#d8ffe4';$('ctrls').parentNode.appendChild(el)}
  const left=TANK_LIST.filter(k=>TNK.used.indexOf(k)<0);
  el.innerHTML='<div style="font-weight:800;letter-spacing:.06em">NEXT TANK · '+(TNK.lives-1)+' LEFT</div>'+left.map((k,i)=>'<button data-k="'+k+'" style="text-align:left;padding:8px 10px;background:rgba(92,255,138,.08);border:1px solid rgba(92,255,138,.5);color:#d8ffe4;font:600 14px Barlow,sans-serif">'+(i+1)+' · '+WAR_V[k].n+' <span style="opacity:.6">('+WAR_V[k].cls.toUpperCase()+')</span></button>').join('');
  el.querySelectorAll('button').forEach(b=>b.addEventListener('click',()=>tkRespawn(b.dataset.k)));el.hidden=false;TNK.pickOpen=true}
function tkRespawn(k){if(!k||TNK.u.alive)return;tkPicker(false);TNK.lives--;TNK.used.push(k);TNK.respT=0;
  TNK.u=tkSpawn(TNK.start.x+rand(-30,30),TNK.start.z,k);TNK.v=0;TNK.camYaw=0;TNK.camPitch=.05;TNK.zoom=false;TNK.zl=0;message(WAR_V[k].n.toUpperCase()+' · VEHICLE '+(4-TNK.lives)+' / 3',2)}
// red attack jets: an Su-25 pair now and then makes bombing runs on the blue line; blue AA and your main gun can bring them down
function tkAirSpawn(){const Z=TNK.zone,a=rand(-.7,.7),x=Z.x+Math.sin(a)*9000,z=Z.z+Math.cos(a)*9000,y=Math.max(groundH(x,z),0)+800;
  const obj=tmpl('red','SU25').clone();obj.position.set(x,y,z);scene.add(obj);
  const p={obj,pos:obj.position,vel:new V3(Z.x-x,0,Z.z-z).setLength(190),hp:3,alive:true,state:'in',tgt:null,bombs:2,t:0,kind:'cas',bank:0};TNK.air.push(p);return p}
function tkAir(dt){if(!TNK.on||state!=='play')return;
  TNK.airT-=dt;if(TNK.airT<=0&&TNK.air.filter(a=>a.alive).length<2){TNK.airT=rand(65,85);tkAirSpawn();tkAirSpawn().pos.x+=600;message('ENEMY AIRCRAFT INBOUND',2.2)}
  const blue=WAR.units.filter(o=>o.alive&&o.team==='blue');
  for(const a of TNK.air){if(!a.alive)continue;a.t+=dt;
    if(!a.tgt||!a.tgt.alive)a.tgt=TNK.u&&TNK.u.alive&&Math.random()<.5?TNK.u:blue[Math.random()*blue.length|0]||null;
    const g=Math.max(groundH(a.pos.x,a.pos.z),0),want=new V3();let alt=g+700;
    if(a.state==='in'&&a.tgt){want.subVectors(a.tgt.pos,a.pos);const hd=Math.hypot(want.x,want.z);
      if(hd<3200){alt=a.tgt.pos.y+Math.max(180,hd*.28)}
      if(hd<1500&&a.bombs>0){a.bombs--;const b=new THREE.Mesh(new THREE.CylinderGeometry(.2,.2,2.2,8).rotateX(Math.PI/2),warMat(0x3a3d33));b.position.copy(a.pos);scene.add(b);TNK.bombs.push({m:b,vel:a.vel.clone().multiplyScalar(.95),t:0});a.state='out';a.t=0}}
    else{want.copy(a.vel);alt=g+1200;if(a.t>14){a.state=a.bombs>0?'in':'gone';a.t=0}}
    want.y=0;if(want.lengthSq()<1)want.copy(a.vel);want.normalize();
    // turn and climb or descend; keep clear of the ground
    const cur=_c.copy(a.vel).setY(0).normalize(),turn=clamp(cur.x*want.z-cur.z*want.x,-1,1)*-1,yaw=Math.atan2(cur.x,cur.z)+clamp(turn,-.6*dt*2,.6*dt*2);
    const vy=clamp((Math.max(alt,g+150)-a.pos.y)*.4,-60,45);a.vel.set(Math.sin(yaw)*190,vy,Math.cos(yaw)*190);a.pos.addScaledVector(a.vel,dt);
    a.bank+=(clamp(turn*3,-1.1,1.1)-a.bank)*Math.min(1,dt*2);a.obj.quaternion.setFromUnitVectors(ZF,_s1.copy(a.vel).normalize());a.obj.rotateZ(-a.bank);
    if(a.state==='gone'&&a.pos.distanceTo(TNK.u.pos)>12000){a.alive=false;scene.remove(a.obj)}
    if(a.pos.y<g+5){tkAirDown(a,null)}}
  // bombs fall and burst: heavy damage close in, less out to 30 m
  for(let i=TNK.bombs.length-1;i>=0;i--){const b=TNK.bombs[i];b.vel.y-=9.81*dt;b.m.position.addScaledVector(b.vel,dt);b.m.quaternion.setFromUnitVectors(ZF,_s1.copy(b.vel).normalize());
    const g=Math.max(groundH(b.m.position.x,b.m.position.z),0);if(b.m.position.y>g+.5)continue;
    const p=b.m.position.clone().setY(g);explode(p.clone().setY(g+2),true);scene.remove(b.m);TNK.bombs.splice(i,1);
    for(const o of WAR.units){if(!o.alive)continue;const d=Math.hypot(o.pos.x-p.x,o.pos.z-p.z);if(d<30){const dmg=d<12?7:3*(1-d/30)+.5;o.hp-=dmg;if(o.player){hurtT=.8;shake=Math.max(shake,.6);TNK.hitFrom=p.clone();TNK.hitT=1.6;message('BOMB HIT · '+(warFlags(o)||'DAMAGED'),1.4)}if(o.hp<=0)warDie(o,null,'bombed')}}}
  // blue anti-aircraft fire at the jets; your shells can hit a low jet too
  TNK.aaT=(TNK.aaT||0)-dt;if(TNK.aaT<=0){TNK.aaT=.4;for(const o of blue){if(o.player||!o.def.aa||o.mod.gun>1)continue;let bt=null,bd=o.def.aa[0];for(const a of TNK.air){if(!a.alive)continue;const d=a.pos.distanceTo(o.pos);if(d<bd){bd=d;bt=a}}if(!bt)continue;
    const ux=(bt.pos.x-o.pos.x)/bd,uy=(bt.pos.y-o.pos.y)/bd,uz=(bt.pos.z-o.pos.z)/bd;for(let k=0;k<3;k++)puff(o.pos.x+ux*8*(k+1),o.pos.y+3+uy*8*(k+1),o.pos.z+uz*8*(k+1),ux*900,uy*900,uz*900,1,.8,.35,1,2.4,0,.55);
    if(Math.random()<clamp(1-bd/o.def.aa[0],.05,1)*.4*(o.def.cls==='spaa'?1:.35)){bt.hp-=o.def.aa[2];puff(bt.pos.x,bt.pos.y,bt.pos.z,0,0,0,.25,.25,.25,.8,4,8,1.5);if(bt.hp<=0)tkAirDown(bt,o)}}}
  for(const s of WAR.sh){if(!s.on||!s.owner||!s.owner.player)continue;for(const a of TNK.air)if(a.alive&&distSeg(a.pos,s.prev,s.m.position)<12){s.on=false;s.m.visible=false;tkAirDown(a,s.owner);break}}}
function tkAirDown(a,by){if(!a.alive)return;a.alive=false;explode(a.pos.clone(),true);scene.remove(a.obj);
  if(by&&by.player){TNK.kills++;kills++;score+=400;message('SU-25 SHOT DOWN',1.8);sndKill()}else if(by)feed('Blue '+by.def.n+' shot down an Su-25','kill')}

// the town at point A: houses on a street grid round a square, and a church; walls stop shells, block sight lines and block tanks
function tkTown(cx,cz){const walls=[[],[]],roofs=[],bld=[],sq=34,step=32;
  const put=(x,z,w,d,h,rh,tower)=>{let base=1e9;for(const [dx,dz] of [[-w/2,-d/2],[w/2,-d/2],[-w/2,d/2],[w/2,d/2],[0,0]])base=Math.min(base,Math.max(groundH(x+dx,z+dz),0));
    wPart(walls[bld.length%2],wBox(w,h+4,d),x,base+(h+4)/2-4,z);
    if(rh)wPart(roofs,wPrism([[-d/2-.4,0],[0,rh],[d/2+.4,0]],w+.6),x,base+h,z);
    bld.push({x,z,hx:w/2,hz:d/2,y0:base-4,y1:base+h+rh*.7});if(tower){wPart(walls[0],wBox(5,tower+4,5),x+w/2-2.5,base+(tower+4)/2-4,z-d/2+2.5);wPart(roofs,wCyl(0,3.8,6,4).rotateY(Math.PI/4),x+w/2-2.5,base+tower+3,z-d/2+2.5);bld.push({x:x+w/2-2.5,z:z-d/2+2.5,hx:2.5,hz:2.5,y0:base-4,y1:base+tower+4})}};
  for(let gx=-3;gx<=3;gx++)for(let gz=-3;gz<=3;gz++){if(gx===0||gz===0)continue;const x=cx+gx*step+Math.sign(gx)*(sq-step/2),z=cz+gz*step+Math.sign(gz)*(sq-step/2);
    if(gx===2&&gz===-2){put(x,z,14,20,9,5,22);continue}   // the church and its tower
    if(Math.random()<.22)continue;put(x+rand(-3,3),z+rand(-3,3),rand(8,12.5),rand(8,11.5),rand(4.5,8),rand(2.5,3.5))}
  const objs=[wMerge(walls[0],warMat(0xcdbfa4)),wMerge(walls[1],warMat(0xb9ad97)),wMerge(roofs,warMat(0x8c4a33))].filter(Boolean);for(const o of objs)scene.add(o);
  TNK.town=objs;TNK.bld=bld}
function tkBld(x,z,pad){for(const b of TNK.bld||[])if(Math.abs(x-b.x)<b.hx+pad&&Math.abs(z-b.z)<b.hz+pad)return b;return null}
function tkPush(u){if(!TNK.on||!TNK.bld)return false;const b=tkBld(u.pos.x,u.pos.z,2.6);if(!b)return false;
  const dx=u.pos.x-b.x,dz=u.pos.z-b.z,ox=b.hx+2.6-Math.abs(dx),oz=b.hz+2.6-Math.abs(dz);if(ox<oz)u.pos.x+=Math.sign(dx||1)*ox;else u.pos.z+=Math.sign(dz||1)*oz;return true}
// first building a segment a->b enters: the fraction along it, or -1
function tkSegHit(a,b){let best=-1;if(!TNK.bld)return best;const d=[b.x-a.x,b.y-a.y,b.z-a.z],o=[a.x,a.y,a.z];
  for(const B of TNK.bld){const mn=[B.x-B.hx,B.y0,B.z-B.hz],mx=[B.x+B.hx,B.y1,B.z+B.hz];let t0=0,t1=1,ok=true;
    for(let i=0;i<3&&ok;i++){if(Math.abs(d[i])<1e-9){if(o[i]<mn[i]||o[i]>mx[i])ok=false}else{let ta=(mn[i]-o[i])/d[i],tb=(mx[i]-o[i])/d[i];if(ta>tb){const q=ta;ta=tb;tb=q}t0=Math.max(t0,ta);t1=Math.min(t1,tb);if(t0>t1)ok=false}}
    if(ok&&(best<0||t0<best))best=t0}
  return best}
