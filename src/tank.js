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
  const u=warSpawn(tkType,cx-70,cz-1750,0);u.player=true;u.cd=0;u.obj.rotation.order='YXZ';
  Object.assign(TNK,{on:true,u,v:0,camYaw:0,camPitch:.05,zoom:false,fire:false,kills:0,hold:0,range:0,zone:{x:cx,z:cz,r:190}});
  ['LEO2A4','M1A1','M60A3','M3','GEPARD'].forEach((id,i)=>warSpawn(id,cx+(i-2)*140+rand(-25,25),cz-1800-rand(0,160),0));
  ['T80B','T72A','T72A','T62','BMP2','BMP2','ZSU23'].forEach((id,i)=>warSpawn(id,cx+(i-3)*135+rand(-25,25),cz+1750+rand(0,220),Math.PI));
  sortie={kind:'TANK'};
  P.pos.set(u.pos.x,u.pos.y+3,u.pos.z);P.vel.set(0,0,0);P.onGround=true;P.scramble=false;P.kcas=0;P.mach=0;P.n=1;
  playerJet.visible=false;tkUI(true);
  message('TANK BATTLE · '+WAR_V[tkType].n.toUpperCase()+' · HOLD POINT A FOR '+TK_HOLD+' S OR DESTROY THE ENEMY',3.2);
}
function tkClear(){if(!TNK||!TNK.on)return;TNK.on=false;TNK.u=null;tkUI(false);playerJet.visible=true;projKey=''}
// keyboard: W/S drive, A/D steer, arrows aim, Space fire, Z or Shift zoom
function tkKey(code,down){if(!down)return;
  if(code==='Space')TNK.fire=true;
  if(code==='KeyZ'||code==='ShiftLeft'||code==='ShiftRight')TNK.zoom=!TNK.zoom}
// driving, called from updateWar in place of the AI
function tkDrive(u,dt){const d=u.def,m=u.mod;
  const thrIn=clamp((keys.KeyW?1:0)-(keys.KeyS?1:0)+TNK.touch.y,-1,1),stIn=clamp((keys.KeyD?1:0)-(keys.KeyA?1:0)+TNK.touch.x,-1,1);
  if(keys.ArrowLeft)TNK.camYaw+=dt*(TNK.zoom?.25:1.1);if(keys.ArrowRight)TNK.camYaw-=dt*(TNK.zoom?.25:1.1);
  if(keys.ArrowUp)TNK.camPitch=clamp(TNK.camPitch+dt*(TNK.zoom?.12:.5),-.25,.45);if(keys.ArrowDown)TNK.camPitch=clamp(TNK.camPitch-dt*(TNK.zoom?.12:.5),-.25,.45);
  const vmax=d.spd*(m.eng?.45:1)*(m.trk?0:1)*(m.crew<d.crew?.85:1),want=thrIn>=0?thrIn*vmax:thrIn*vmax*.4;
  const h=u.heading,hx=Math.sin(h),hz=Math.cos(h),rx=Math.cos(h),rz=-Math.sin(h);
  const gH=(x,z)=>Math.max(groundH(x,z),0),fh=gH(u.pos.x+hx*3,u.pos.z+hz*3),bh=gH(u.pos.x-hx*3,u.pos.z-hz*3),slope=(fh-bh)/6;
  TNK.v+=clamp(want-TNK.v,-7*dt,3.2*dt);TNK.v-=9.81*Math.sin(Math.atan(slope))*.35*dt;   // gravity along the slope
  if(Math.abs(slope)>.8&&Math.sign(slope)===Math.sign(TNK.v))TNK.v*=.8;   // too steep
  if(m.trk)TNK.v*=Math.max(0,1-dt*3);
  if(!m.trk)u.heading+=stIn*(.6-Math.min(.25,Math.abs(TNK.v)/Math.max(1,d.spd)*.25))*(TNK.v<-.5?-1:1)*dt;
  {const nx=u.pos.x+Math.sin(u.heading)*TNK.v*dt,nz=u.pos.z+Math.cos(u.heading)*TNK.v*dt;if(groundH(nx,nz)>1.5){u.pos.x=nx;u.pos.z=nz}else TNK.v=0}   // tanks don't swim
  for(const o of WAR.units){if(o===u)continue;const dx=u.pos.x-o.pos.x,dz=u.pos.z-o.pos.z,dd=Math.hypot(dx,dz);if(dd<5.5&&dd>.01){u.pos.x+=dx/dd*(5.5-dd);u.pos.z+=dz/dd*(5.5-dd);TNK.v*=.5}}
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
  for(let t=20;t<hitD;t+=t<400?10:25){const x=o.x+dr.x*t,y=o.y+dr.y*t,z=o.z+dr.z*t;if(y<Math.max(groundH(x,z),0)){hitD=t;break}}
  return hitD}
function tkCamera(dt){const u=TNK.u;if(!u)return;applyProj();
  const tur=u.obj.userData.tur,cy=Math.cos(TNK.camPitch);
  const dir=new V3(Math.sin(TNK.camYaw)*cy,Math.sin(TNK.camPitch),Math.cos(TNK.camYaw)*cy);
  if(TNK.zoom){u.obj.updateMatrixWorld(true);const p=tur?tur.localToWorld(new V3(0,u.def.gy+.95,u.def.gz+1.0)):u.pos.clone().setY(u.pos.y+2.8);/* the gunner sight sits above the gun, on its axis */camera.position.copy(p);camera.fov=14}
  else{camera.position.set(u.pos.x,u.pos.y+3.6,u.pos.z).addScaledVector(dir,-12).setY(Math.max(u.pos.y+3.6-dir.y*12,Math.max(groundH(camera.position.x,camera.position.z),0)+1.8))}
  camera.lookAt(camera.position.clone().addScaledVector(dir,100));camera.updateProjectionMatrix();projKey='';
  TNK.range=tkRange();TNK.aimPt=camera.position.clone().addScaledVector(camera.getWorldDirection(new V3()),TNK.range)}
function tkSound(){const t=A.ctx.currentTime,v=Math.abs(TNK.v),live=state==='play'&&TNK.u&&TNK.u.alive;
  A.eng.frequency.setTargetAtTime(24+v*2.2,t,.2);A.engG.gain.setTargetAtTime(live?.05:0,t,.2);if(A.eng2G)A.eng2G.gain.setTargetAtTime(0,t,.2);if(A.whG)A.whG.gain.setTargetAtTime(live?.004+v*.0004:0,t,.2);
  A.roarF.frequency.setTargetAtTime(160+v*18,t,.2);A.roarG.gain.setTargetAtTime(live?.05+v*.004:0,t,.2)}
// point A: hold it alone to win; red holding it alone wins for them
function tkCheck(dt){const Z=TNK.zone,u=TNK.u;
  if(!u.alive){endMission(false,'Your tank was knocked out'+(TNK.kills?' · '+TNK.kills+' kill'+(TNK.kills>1?'s':''):''));return}
  let b=0,r=0;for(const o of WAR.units){if(!o.alive)continue;if(Math.hypot(o.pos.x-Z.x,o.pos.z-Z.z)<Z.r){if(o.team==='blue')b++;else r++}}
  if(b&&!r)TNK.hold=Math.min(TK_HOLD,TNK.hold+dt);else if(r&&!b)TNK.hold=Math.max(-TK_HOLD,TNK.hold-dt);
  if(TNK.hold>=TK_HOLD)endMission(true,'Point A captured');else if(TNK.hold<=-TK_HOLD)endMission(false,'The enemy took point A');
  else if(!warAlive('red'))endMission(true,'Enemy armour destroyed');else if(WAR.t>900)endMission(TNK.hold>=0,TNK.hold>=0?'Held the field':'Out of time')}
function tkStatus(){return 'POINT A '+(TNK.hold>0?'BLUE ':TNK.hold<0?'RED ':'')+Math.round(Math.abs(TNK.hold)/TK_HOLD*100)+'% · BLUE '+warAlive('blue')+' · RED '+warAlive('red')}
// HUD: reticle where you look, a circle where the gun points, reload, range, speed, damage, point A and enemy markers
function tkHUD(c){const u=TNK.u;if(!u)return;const d=u.def,col=HUD,pj=v=>{const q=v.clone().project(camera);return q.z<1&&Math.abs(q.x)<1.2&&Math.abs(q.y)<1.2?{x:(q.x+1)/2*W,y:(1-q.y)/2*H}:null};
  const cx=W/2,cy=H/2;c.strokeStyle=col;c.lineWidth=1.5;
  if(TNK.zoom){c.fillStyle='rgba(0,0,0,.55)';c.beginPath();c.rect(0,0,W,H);c.arc(cx,cy,Math.min(W,H)*.46,0,6.3,true);c.fill();
    c.beginPath();c.moveTo(cx-120,cy);c.lineTo(cx-12,cy);c.moveTo(cx+12,cy);c.lineTo(cx+120,cy);c.moveTo(cx,cy+12);c.lineTo(cx,cy+90);c.stroke();
    for(let i=1;i<=4;i++){c.beginPath();c.moveTo(cx-6,cy+i*20);c.lineTo(cx+6,cy+i*20);c.stroke()}}
  else{c.beginPath();c.moveTo(cx-14,cy);c.lineTo(cx-5,cy);c.moveTo(cx+5,cy);c.lineTo(cx+14,cy);c.moveTo(cx,cy-14);c.lineTo(cx,cy-5);c.moveTo(cx,cy+5);c.lineTo(cx,cy+14);c.stroke()}
  {const gun=u.obj.userData.gun;if(gun){u.obj.updateMatrixWorld(true);const m0=gun.localToWorld(new V3(0,0,d.barrel)),dr=new V3(0,0,1).transformDirection(gun.matrixWorld),p=pj(m0.addScaledVector(dr,TNK.range||800));
    if(p){c.strokeStyle=TNK.aimed?col:'rgba(255,200,80,.9)';c.beginPath();c.arc(p.x,p.y,9,0,6.3);c.stroke()}}}
  const rl=u.cd>0?clamp(1-u.cd/(d.gun[1]*(u.mod.crew>0?d.crew/u.mod.crew:9)),0,1):1;c.fillStyle='rgba(0,0,0,.35)';c.fillRect(cx-40,cy+30,80,5);c.fillStyle=rl>=1?col:'#ffb347';c.fillRect(cx-40,cy+30,80*rl,5);
  txt(c,rl>=1?'READY':'RELOAD',cx,cy+46,'center',rl>=1?col:'#ffb347',11,700);
  txt(c,'RNG '+Math.round(TNK.range)+' M',cx+(TNK.zoom?150:60),cy+4,'left',col,12,700);
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
  txt(c,'KILLS '+TNK.kills,W-20,H-120,'right',col,13,700)}
// touch: left half drives (a floating stick), right half aims; FIRE and ZOOM buttons
function tkUI(on){
  if(on&&!TNK.ui){const host=$('ctrls').parentNode,el=document.createElement('div');el.id='tkUI';
    el.style.cssText='position:absolute;inset:0;z-index:6;touch-action:none;user-select:none';
    el.innerHTML='<div id="tkDrive" style="position:absolute;left:0;top:0;bottom:0;width:45%"></div><div id="tkLook" style="position:absolute;right:0;top:0;bottom:0;width:55%"></div>'+
      '<button id="tkFire" style="position:absolute;right:22px;bottom:30px;width:92px;height:92px;border-radius:50%;border:2px solid var(--hud,#5cff8a);background:rgba(10,20,12,.55);color:var(--hud,#5cff8a);font:700 16px inherit">FIRE</button>'+
      '<button id="tkZoom" style="position:absolute;right:130px;bottom:44px;width:64px;height:64px;border-radius:50%;border:2px solid var(--hud,#5cff8a);background:rgba(10,20,12,.45);color:var(--hud,#5cff8a);font:700 12px inherit">ZOOM</button>'+
      '<button id="tkPause" style="position:absolute;right:14px;top:12px;width:46px;height:40px;border:1px solid var(--hud,#5cff8a);background:rgba(10,20,12,.45);color:var(--hud,#5cff8a);font:700 14px inherit">II</button>'+
      '<div id="tkKnob" style="position:absolute;width:54px;height:54px;margin:-27px 0 0 -27px;border-radius:50%;border:2px solid rgba(92,255,138,.7);display:none;pointer-events:none"></div>';
    host.appendChild(el);TNK.ui=el;
    const dv=el.querySelector('#tkDrive'),lk=el.querySelector('#tkLook'),kn=el.querySelector('#tkKnob');let dId=null,o=null,lId=null,lx=0,ly=0;
    dv.addEventListener('pointerdown',e=>{dId=e.pointerId;o={x:e.clientX,y:e.clientY};kn.style.display='block';kn.style.left=e.clientX+'px';kn.style.top=e.clientY+'px';dv.setPointerCapture(e.pointerId);audioInit()});
    dv.addEventListener('pointermove',e=>{if(e.pointerId!==dId)return;TNK.touch.x=clamp((e.clientX-o.x)/60,-1,1);TNK.touch.y=clamp(-(e.clientY-o.y)/60,-1,1)});
    const dEnd=e=>{if(e.pointerId!==dId)return;dId=null;TNK.touch.x=TNK.touch.y=0;kn.style.display='none'};dv.addEventListener('pointerup',dEnd);dv.addEventListener('pointercancel',dEnd);
    lk.addEventListener('pointerdown',e=>{lId=e.pointerId;lx=e.clientX;ly=e.clientY;lk.setPointerCapture(e.pointerId);audioInit()});
    lk.addEventListener('pointermove',e=>{if(e.pointerId!==lId)return;const k=TNK.zoom?.0012:.005;TNK.camYaw-=(e.clientX-lx)*k;TNK.camPitch=clamp(TNK.camPitch-(e.clientY-ly)*k,-.25,.45);lx=e.clientX;ly=e.clientY});
    const lEnd=e=>{if(e.pointerId===lId)lId=null};lk.addEventListener('pointerup',lEnd);lk.addEventListener('pointercancel',lEnd);
    el.querySelector('#tkFire').addEventListener('pointerdown',e=>{e.stopPropagation();TNK.fire=true});
    el.querySelector('#tkZoom').addEventListener('pointerdown',e=>{e.stopPropagation();TNK.zoom=!TNK.zoom});
    el.querySelector('#tkPause').addEventListener('click',()=>pause())}
  if(TNK.ui)TNK.ui.hidden=!on;if(on)$('ctrls').hidden=true;document.body.classList.toggle('tankmode',!!on)}
// per frame: keep the overlay in step with the game state
function tkFrame(){if(!TNK.on)return;const show=state==='play';if(TNK.ui&&TNK.ui.hidden===show)TNK.ui.hidden=!show;if(show)$('ctrls').hidden=true;playerJet.visible=false}
// a kill by the player's tank
function tkKill(u,by){if(!by||!by.player||u.team!=='red')return;TNK.kills++;kills++;score+=u.def.cls==='mbt'?300:200;message(u.def.n.toUpperCase()+' DESTROYED',1.6);sndKill()}
