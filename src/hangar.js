
/* ---------- hangar: pick the aircraft, edit the loadout, change paint, read every spec; the jet turns on a turntable behind the panel ---------- */
const hgEl=$('hangar');
function hgTab(t){for(const b of hgEl.querySelectorAll('.hgTabs button'))b.classList.toggle('on',b.dataset.tab===t);
  $('hgLoad').hidden=t!=='load';$('hgSpec').hidden=t!=='spec';$('hgPaint').hidden=t!=='paint';if(t==='spec')hgSpecs()}
function hgOpen(t){if(state!=='menu'&&state!=='over')return;
  if(!HG.on){HG.on=true;HG.zoom=1;HG.el=.2;HG.auto=true;document.body.classList.add('hangar');hgEl.hidden=false;projKey=''}
  hgTab(t||'load');$('hgName').textContent=AC.name;renderLd()}
function hgClose(){if(!HG.on)return;HG.on=false;HG.drag=null;document.body.classList.remove('hangar');hgEl.hidden=true;projKey='';camSnap=true}
$('bHangar').addEventListener('click',()=>hgOpen('load'));
$('bRole').addEventListener('click',()=>hgOpen('load'));
$('hgClose').addEventListener('click',hgClose);$('ldDone').addEventListener('click',hgClose);
$('hgLaunch').addEventListener('click',()=>{hgClose();$('bStart').click()});
for(const b of hgEl.querySelectorAll('.hgTabs button'))b.addEventListener('click',()=>hgTab(b.dataset.tab));
const hgPtr=new Map(); let hgPinch=0, hgTap=0;
const hgView=(ang,el,zoom)=>{HG.ang=ang;HG.el=clamp(el,-1.45,1.45);if(zoom)HG.zoom=zoom;HG.auto=false};
$('hgView').addEventListener('pointerdown',e=>{hgPtr.set(e.pointerId,{x:e.clientX,y:e.clientY});try{e.target.setPointerCapture(e.pointerId)}catch(er){}
  HG.drag={x:e.clientX,y:e.clientY,a:HG.ang,l:HG.el};HG.auto=false;
  const now=performance.now();if(now-hgTap<320){hgView(.7,.2,1);HG.auto=true}hgTap=now;   // double-tap: reset the view and resume the turntable
  if(hgPtr.size===2){const [p,q]=[...hgPtr.values()];hgPinch=Math.hypot(p.x-q.x,p.y-q.y)}});
$('hgView').addEventListener('pointermove',e=>{const p=hgPtr.get(e.pointerId);if(!p)return;p.x=e.clientX;p.y=e.clientY;
  if(hgPtr.size>=2){const [a,b]=[...hgPtr.values()],d=Math.hypot(a.x-b.x,a.y-b.y);if(hgPinch>0)HG.zoom=clamp(HG.zoom*hgPinch/d,.22,2.6);hgPinch=d;HG.drag=null;return}
  if(HG.drag){HG.ang=HG.drag.a-(e.clientX-HG.drag.x)*.01;HG.el=clamp(HG.drag.l+(e.clientY-HG.drag.y)*.01,-1.45,1.45)}});
for(const t of ['pointerup','pointercancel'])$('hgView').addEventListener(t,e=>{hgPtr.delete(e.pointerId);hgPinch=0;HG.drag=null;if(hgPtr.size===1){const [p]=[...hgPtr.values()];HG.drag={x:p.x,y:p.y,a:HG.ang,l:HG.el}}});
$('hgView').addEventListener('wheel',e=>{e.preventDefault();HG.zoom=clamp(HG.zoom*(1+e.deltaY*.0012),.22,2.6)},{passive:false});
// quick views: [yaw, elevation, zoom]
const HG_VIEWS={front:[0,.12,1],side:[1.5708,.05,1],rear:[3.1416,.12,1],top:[1.5708,1.4,1.05],under:[1.5708,-1.4,1.05],cockpit:[.62,.45,.34],engine:[3.1416,.1,.4]};
for(const b of document.querySelectorAll('#hgChips button')){const v=HG_VIEWS[b.dataset.v];if(v)b.addEventListener('click',()=>hgView(v[0],v[1],v[2]))}
$('hgChips').querySelector('[data-v=auto]').addEventListener('click',()=>{HG.auto=true;HG.zoom=1});
addEventListener('keydown',e=>{if(e.key==='Escape'&&HG.on){hgClose();e.stopPropagation()}},true);
// the aircraft or loadout changed: keep the title and the spec sheet in step
const _applyAC=applyAC;
applyAC=function(){_applyAC.apply(this,arguments);if(HG.on){$('hgName').textContent=AC.name;if(!$('hgSpec').hidden)hgSpecs()}};
// no aircraft or loadout changes mid-sortie
const _showOverlay2=showOverlay;
showOverlay=function(kind){_showOverlay2(kind);const p=kind==='pause';$('bHangar').hidden=p;$('bRole').hidden=p;if(p)hgClose()};

/* ---- spec sheet: the airframe, performance worked out from the flight model, weapons, sensors and defences ---- */
const fx=(n,d=0)=>Number(n).toLocaleString('en-US',{maximumFractionDigits:d,minimumFractionDigits:d});
function topSpeed(A,h,mass){const at=atm(h);let best=0;   // fastest speed where afterburner thrust still beats drag at 1 g
  for(let v=100;v<=1100;v+=3){const M=v/at.a,q=.5*at.rho*v*v,CL=mass*G/(q*A.S),D=q*A.S*(cd0(M,A)*A.cdK+A.KIND*CL*CL);if(thrust(A,1,at.sig,M,h)>=D)best=v;else if(best&&v>best+90)break}
  return {v:best,M:best/at.a}}
function seekerText(s,isMr){if(!isMr)return 'Infrared, '+fx(s.gimbal*57.3)+'° seeker gimbal';
  return s.arh?'Active radar: datalink to '+fx(s.dlR/1000)+' km, own seeker inside '+fx(s.termR/1000)+' km':s.sarh?'Semi-active radar with datalink: the launcher must keep illuminating':'Radar-guided'}
function hgSpecs(){
  const e=AC, S=(typeof M2!=='undefined'&&M2[e.id])||null, c=ldCap(e.id), v=ldValid(e.id,ldGet(e.id))?ldGet(e.id):ldDefault(e.id);
  const len=S?S.L:null, span=S?Math.max(...S.wings.map(w=>w.st[w.st.length-1].x))*2:null, hgt=S&&S.fins&&S.fins.length?Math.max(...S.fins.map(f=>(f.y||0)+f.st[f.st.length-1].h))+.5:null;
  const m=e.MASS+.75*e.intFuel+e.tankFuel-.6*e.fuelCap, w=m*G, tw=t=>t/w;
  const sl=topSpeed(e,0,m), hi=topSpeed(e,10000,m), rho0=1.225, stall=Math.sqrt(2*m*G/(rho0*e.S*e.CLMAX));
  const km=(r)=>fx(r/1000)+' km',nm=(r)=>fx(r/1852)+' nm',both=(r)=>km(r)+' ('+nm(r)+')';
  const pk=(s,alt)=>{const f=flyout(s,alt,250);return Math.max(...f.V)};
  const T=(title,rows)=>'<table class="hgT"><caption>'+title+'</caption>'+rows.filter(Boolean).map(([k,val,sub])=>'<tr><th>'+k+'</th><td>'+val+(sub?'<small>'+sub+'</small>':'')+'</td></tr>').join('')+'</table>';
  const sr=e.sr, mr=e.mr, ag=Object.entries(v.ag||{}).filter(([,n])=>n);
  let h='<p class="hgNote">'+e.spec.replace(/<span>/g,'<span style="margin-right:12px">')+'</p>';
  h+=T('Airframe',[['Aircraft',e.name],len?['Length',fx(len,1)+' m ('+fx(len*3.281,1)+' ft)']:null,span?['Wingspan',fx(span,1)+' m ('+fx(span*3.281,1)+' ft)']:null,hgt?['Height',fx(hgt,1)+' m']:null,
    ['Wing area',fx(e.S,1)+' m²'],['Engines',e.engines+' · '+fx(e.T_AB/1000)+' kN with afterburner, '+fx(e.T_MIL/1000)+' kN military',fx(e.T_AB*.2248)+' lbf / '+fx(e.T_MIL*.2248)+' lbf'],
    ['Base / take-off weight',fx(e.MASS)+' kg / '+fx(m)+' kg','as loaded now, 75 % fuel'],['Internal fuel',fx(e.intFuel)+' kg ('+fx(e.intFuel*2.205)+' lb)',e.tankFuel?'+ '+fx(e.tankFuel)+' kg in drop tanks':null],['Refuelling',({boom:'Flying boom',probe:'Probe and drogue'})[e.refuel]||e.refuel||'None']]);
  h+=T('Performance (flight model)',[['Load factor limit','+'+e.gmax+' g / −3 g'],['Roll rate','≈ '+fx(e.roll*57.3)+' °/s at full control authority'],['Corner speed',fx(e.corner)+' kt'],
    ['Thrust / weight','AB '+fx(tw(e.T_AB),2)+' · MIL '+fx(tw(e.T_MIL),2),'at take-off weight'],['Wing loading',fx(m/e.S)+' kg/m²'],['1 g stall speed',fx(stall*1.944)+' kt','sea level, clean'],
    ['Top speed, sea level','Mach '+fx(sl.M,2),fx(sl.v*1.944)+' kt'],['Top speed, 10 km','Mach '+fx(hi.M,2),fx(hi.v*1.944)+' kt'],['Never-exceed (low level)',fx(e.vne)+' kt']]);
  h+=T('Weapons',[['Gun',e.ammo+' · '+fx(e.gunRate*60)+' rpm · '+fx(e.gunRounds)+' rounds','muzzle '+fx(e.muzzle)+' m/s, effective range about 1 km'],
    [e.srFull+' × '+v.sr,'to '+km(sr.maxR)+' (min '+fx(sr.minR)+' m)',seekerText(sr,false)+' · '+fx(sr.gmax)+' g · peak Mach '+fx(pk(sr,5000)/340,1)],
    c.hp?[e.mrFull+' × '+v.mr,'to '+km(mr.maxR)+' (min '+fx(mr.minR)+' m)',seekerText(mr,true)+' · '+fx(mr.gmax)+' g · peak Mach '+fx(pk(mr,8000)/295,1)]:null,
    ...ag.map(([k,n])=>[AGW[k].name+' × '+n,AGW[k].kind==='arm'?'Anti-radiation missile':AGW[k].kind==='dumb'?'Unguided bomb, CCIP aiming':'Guided bomb']),
    v.tk?['Drop tanks × '+v.tk,'+'+fx(v.tk*(JET_HP[e.id]||{tankKg:0}).tankKg)+' kg fuel','drag until jettisoned']:null,
    ['Stations',fx(ldUsed(v))+' of '+fx(c.hp+c.extra)+' used · '+c.sr+' wingtip/short-range rails']]);
  h+=T('Sensors',[['Radar',((e.radar&&e.radar.name)||'Fire-control radar')+' · '+(((e.radar&&e.radar.modes)||['RWS','TWS']).join(' / '))],['Detection range',both((e.radar&&e.radar.range)||74000),'against a typical fighter; smaller radar cross-section is seen later'],
    e.irst?['IRST','Infrared search and track','passive, no radar emission']:null,e.pod?['Targeting pod',e.pod]:null,['Radar cross-section','≈ '+fx((RCS[e.id]??3)+storesRCS(e),2)+' m²','with the current loadout']]);
  h+=T('Defences',[['Flares / chaff',fx(cmFlares())+' / '+fx(cmChaff()),e.cm.cmds+(e.cm.fixed?' · fixed dispenser load':' · choose canisters below the loadout')],e.cm.decoys?['Towed decoy',e.cm.decoys+' × towed decoy']:null,
    e.cm.jam?['Jammer',e.cm.jamName]:null,['Missile warning',e.cm.maws?'Missile approach warner cues flares':'Radar warning receiver only']]);
  $('hgSpec').innerHTML=h}

if(/[?&]test\b/.test(location.search))Object.assign(window.__vs||{},{hgOpen,hgClose,HG});
