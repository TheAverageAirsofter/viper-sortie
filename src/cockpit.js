/* ---------------- cockpit: its own scene in seat coordinates (eye at origin, forward −Z) ---------------- */
const cockScene=new THREE.Scene();
const cockCam=new THREE.PerspectiveCamera(66,1,.02,80);
cockScene.add(new THREE.HemisphereLight(0xcfe0f0,0x15181b,.6*LK));
const cSun=new THREE.DirectionalLight(0xfff0d8,.95*LK); cockScene.add(cSun); cockScene.add(cSun.target);
const cock=new THREE.Group(); cockScene.add(cock);
const EYE=new V3(...AC.eye);                       // pilot eye in jet coordinates
const QRY=new THREE.Quaternion().setFromAxisAngle(UP,Math.PI);
const cmat=(c,o)=>new THREE.MeshStandardMaterial(Object.assign({color:c,roughness:.85,metalness:.05,flatShading:true},o||{}));
const mDark=cmat(0x1c2023),mPanel=cmat(0x2c3135),mGrey=cmat(0x5a6168),mBlack=cmat(0x0c0e10);
const cbox=(w,h,d,m,x,y,z,parent)=>{const b=new THREE.Mesh(new THREE.BoxGeometry(w,h,d),m);b.position.set(x,y,z);(parent||cock).add(b);return b};
// the real airframe around you: nose, wings, tail, stores
let outside=null,outFlame=null,outRails=[];
function buildOutside(){
  if(outside)cock.remove(outside);
  outside=buildJet(PLAYER_COLORS,AC.id); if(typeof applyLivery==='function')applyLivery(outside);
  outside.quaternion.copy(QRY); outside.position.copy(EYE).negate().applyQuaternion(QRY); cock.add(outside);
  const g=outside.children[0], fm=g.getObjectByName('fuse').material;
  g.traverse(o=>{if(o.name==='canopy'||o.name==='fuse'||o.name==='irst'||o.name==='pilot'||o.name==='cframe'||o.name==='wsbow')o.visible=false});
  // replace the fuselage tube with one that is open above the cockpit tub (values in the model's own units)
  const fc=g.getObjectByName('fuseCut'); if(fc){fc.visible=true}else{
  const cut=AC.cut;
  let geo=new THREE.CylinderGeometry(cut.r,cut.r*.9,cut.full[1]-cut.full[0],10); geo.rotateX(Math.PI/2);
  let m=new THREE.Mesh(geo,fm); m.position.z=(cut.full[0]+cut.full[1])/2; g.add(m);
  geo=new THREE.CylinderGeometry(cut.r*1.05,cut.r,cut.open[1]-cut.open[0],12,1,true,Math.PI+.75,Math.PI*2-1.5); geo.rotateX(Math.PI/2);
  m=new THREE.Mesh(geo,fm); m.position.z=(cut.open[0]+cut.open[1])/2; g.add(m)}
  outFlame=outside.getObjectByName('flame'); outRails=[]; outside.traverse(o=>{if(/^r(9|120)_/.test(o.name))outRails.push(o)});
}
buildOutside();
// tub, consoles, seat
cbox(.05,.46,1.5,mDark,-.45,-.39,-.15); cbox(.05,.46,1.5,mDark,.45,-.39,-.15); cbox(.9,.04,1.5,mBlack,0,-.62,-.15);
cbox(.22,.06,.72,mPanel,-.32,-.44,-.12); cbox(.22,.06,.72,mPanel,.32,-.44,-.12);
cbox(.36,.5,.1,mDark,0,-.32,.34); cbox(.26,.16,.1,mDark,0,.04,.33); cbox(.2,.05,.06,cmat(0xc8a530),0,.14,.3); // seat + yellow ejection handle
// canopy rails + bow (the F-16 bubble has no front bow: the frame sits behind your head)
cbox(.035,.035,1.8,mGrey,-.47,-.17,-.2); cbox(.035,.035,1.8,mGrey,.47,-.17,-.2);
const bow=new THREE.Mesh(new THREE.TorusGeometry(.48,.024,6,30,Math.PI),mGrey); bow.position.set(0,-.17,.34); cock.add(bow);
cbox(.12,.035,.01,cmat(0x9fb4c4,{metalness:.8,roughness:.1}),-.2,.24,.33); cbox(.12,.035,.01,cmat(0x9fb4c4,{metalness:.8,roughness:.1}),.2,.24,.33); // mirrors
const canopyGlass=new THREE.Mesh(new THREE.SphereGeometry(1,32,14,0,Math.PI*2,0,Math.PI/2),
  new THREE.MeshBasicMaterial({color:0xe2c98a,transparent:true,opacity:.07,side:THREE.BackSide,depthWrite:false}));
canopyGlass.scale.set(.5,.44,1.55); canopyGlass.position.set(0,-.17,-.18); cock.add(canopyGlass);
// glare shield + instrument panel (live canvas: MFDs, DED, standby gauges)
cbox(1.0,.04,.26,mBlack,0,-.2,-.73);
cbox(.92,.46,.05,mPanel,0,-.43,-.88);
const panelCv=document.createElement('canvas'); panelCv.width=1024; panelCv.height=400;
const pcx=panelCv.getContext('2d'); const panelTex=new THREE.CanvasTexture(panelCv);
panelTex.anisotropy=Math.min(4,renderer.capabilities.getMaxAnisotropy());
const panel=new THREE.Mesh(new THREE.PlaneGeometry(.86,.336),new THREE.MeshBasicMaterial({map:panelTex}));
panel.position.set(0,-.42,-.84); panel.rotation.x=-.22; cock.add(panel);
// HUD combiner glass on the glare shield (≈30° × 21° field, like the F-16's wide-angle HUD)
cbox(.2,.05,.1,mBlack,0,-.165,-.6);
const combiner=new THREE.Mesh(new THREE.PlaneGeometry(.30,.22),new THREE.MeshBasicMaterial({color:0x9fffc0,transparent:true,opacity:.05,depthWrite:false,side:THREE.DoubleSide}));
combiner.position.set(0,-.01,-.58); combiner.rotation.x=-.12; cock.add(combiner);
for(const s of [-1,1]){const f=cbox(.005,.23,.005,mGrey,s*.152,-.01,-.58);f.rotation.x=-.12}
// side-stick (right console) and throttle (left console)
const stickG=new THREE.Group(); stickG.position.set(.32,-.41,-.3); cock.add(stickG);
cbox(.06,.025,.07,mBlack,0,0,0,stickG);
const grip=new THREE.Mesh(new THREE.CylinderGeometry(.017,.022,.11,8),mBlack); grip.position.y=.06; grip.rotation.x=.25; stickG.add(grip);
cbox(.03,.012,.02,cmat(0x8a1c1c),0,.115,-.005,stickG);
const thrG=new THREE.Group(); thrG.position.set(-.32,-.41,-.18); cock.add(thrG);
cbox(.02,.02,.24,mGrey,.035,-.005,-.06,thrG);
const thrGrip=cbox(.05,.08,.06,mBlack,0,.045,0,thrG);

/* surface finish: speckled, scuffed matte plastic on the tub and coaming; switch panels on both side consoles; harness; rounded glare shield */
const cockGrain=(()=>{const S=128,cv=document.createElement('canvas');cv.width=cv.height=S;const c=cv.getContext('2d');let r=11;const rnd=()=>(r=(r*16807)%2147483647)/2147483647;
  c.fillStyle='#d8d8d8';c.fillRect(0,0,S,S);
  for(let i=0;i<1800;i++){const v=rnd()<.5?255:120;c.fillStyle='rgba('+v+','+v+','+v+','+(.05+rnd()*.12)+')';c.fillRect(rnd()*S,rnd()*S,1+rnd()*1.6,1+rnd()*1.6)}
  for(let i=0;i<10;i++){c.strokeStyle='rgba(255,255,255,'+(.08+rnd()*.12)+')';c.lineWidth=1;c.beginPath();const x=rnd()*S,y=rnd()*S;c.moveTo(x,y);c.lineTo(x+rnd()*30-15,y+rnd()*30-15);c.stroke()}   // scuffs
  const t=new THREE.CanvasTexture(cv);t.wrapS=t.wrapT=THREE.RepeatWrapping;t.anisotropy=4;return t})();
for(const m of [mDark,mPanel,mBlack,mGrey]){m.map=cockGrain;m.roughness=.78;m.needsUpdate=true}
function switchPanel(seed,labels){const W_=256,H_=1024,cv=document.createElement('canvas');cv.width=W_;cv.height=H_;const c=cv.getContext('2d');let r=seed;const rnd=()=>(r=(r*16807)%2147483647)/2147483647;
  c.fillStyle='#23282b';c.fillRect(0,0,W_,H_);c.strokeStyle='#4a5258';c.lineWidth=3;c.strokeRect(4,4,W_-8,H_-8);
  c.font='700 15px "B612 Mono",ui-monospace,Menlo,monospace';c.textAlign='center';c.textBaseline='middle';
  for(let row=0;row<9;row++){const y=60+row*105;c.fillStyle='#8a9298';c.fillText(labels[row%labels.length],W_/2,y-34);
    c.strokeStyle='#3a4146';c.lineWidth=2;c.strokeRect(22,y-24,W_-44,78);
    for(let k=0;k<3;k++){const x=62+k*66,kind=(rnd()*3)|0;
      if(kind===0){c.fillStyle='#0c0e10';c.fillRect(x-14,y-8,28,44);c.fillStyle=rnd()<.5?'#c9cfd4':'#8d959b';c.fillRect(x-5,y+(rnd()<.5?-6:12),10,22)}      // toggle
      else if(kind===1){c.fillStyle='#0c0e10';c.beginPath();c.arc(x,y+14,20,0,6.3);c.fill();c.strokeStyle='#d0d4d8';c.lineWidth=3;c.beginPath();c.moveTo(x,y+14);const a=rnd()*4.4-2.2-1.57;c.lineTo(x+Math.cos(a)*16,y+14+Math.sin(a)*16);c.stroke()}   // knob
      else{c.fillStyle=rnd()<.3?'#ffb347':'#16201a';c.fillRect(x-16,y,32,28);c.strokeStyle='#59636a';c.lineWidth=2;c.strokeRect(x-16,y,32,28)}}}                  // lit button
  const t=new THREE.CanvasTexture(cv);t.anisotropy=4;return t}
{const lab=['MASTER','FUEL','EXT LT','ANTI-ICE','ENG','HYD','AVIONICS','OXYGEN','CMDS'];
  for(const [x,seed] of [[-.32,5],[.32,9]]){const p=new THREE.Mesh(new THREE.PlaneGeometry(.18,.62),new THREE.MeshStandardMaterial({map:switchPanel(seed,lab),roughness:.7,metalness:.05}));
    p.rotation.x=-Math.PI/2; p.position.set(x,-.408,-.12); cock.add(p)}}
// harness straps over the headrest, headrest cushion
for(const s of [-1,1]){const st=cbox(.045,.42,.012,cmat(0x2f3b2a),s*.11,-.1,.285);st.rotation.x=.18;st.rotation.z=s*.12}
cbox(.3,.2,.07,cmat(0x232a30),0,.08,.4);
// rounded glare-shield lip and HUD combiner frame
{const lip=new THREE.Mesh(new THREE.CylinderGeometry(.022,.022,1.0,10),mBlack);lip.rotation.z=Math.PI/2;lip.position.set(0,-.2,-.86);cock.add(lip);
 cbox(.32,.012,.012,mGrey,0,.1,-.585);cbox(.32,.012,.012,mGrey,0,-.12,-.585)}

// re-dress the cockpit for the selected jet: stick position, panel paint (Soviet-era turquoise), layout
function styleCockpit(){const pit=PITS[AC.id]||'F16', rus=pit==='RUS'||pit==='RUS2';
  mPanel.color.setHex(rus?0x3d7a74:0x2c3135); mDark.color.setHex(rus?0x2a5a55:0x1c2023);
  if(SIDESTICK[AC.id]){stickG.position.set(.32,-.41,-.3)}else{stickG.position.set(0,-.5,-.36)}}
function drawPanel(){
  const pit=PITS[AC.id]||'F16'; if(pit!=='F16'){drawPanelAlt(pit);return}
  const c=pcx; c.fillStyle='#262b2f'; c.fillRect(0,0,1024,400);
  c.textBaseline='middle';
  const font=(s,w)=>c.font=`${w||700} ${s}px ${FONT}`;
  // MFD bezels with OSB pushbuttons
  for(const x of [20,684]){
    c.fillStyle='#15181a';c.fillRect(x,22,320,356);
    c.fillStyle='#3d4448';for(let i=0;i<5;i++){c.fillRect(x+48+i*48,28,28,13);c.fillRect(x+48+i*48,359,28,13);c.fillRect(x+5,84+i*50,13,28);c.fillRect(x+302,84+i*50,13,28)}
    c.fillStyle='#020604';c.fillRect(x+24,48,272,304);
  }
  // left MFD: FCR page, same picture as the radar panel
  drawScope(c,44,48,272,304,true);
  // right MFD: SMS stores page
  {const x0=708,y0=48,w=272;
    font(13);c.fillStyle='#4dff88';c.textAlign='center';c.fillText('SMS',x0+w/2,y0+12);
    c.fillStyle='#ffd166';c.fillText('MASTER ARM',x0+w/2,y0+40);
    const rails=n=>{const o=playerJet.getObjectByName(n);return o&&o.visible};
    const st=AC.cm.stations;
    const sp=Math.min(46,(w-40)/st.length),bw=Math.min(36,sp-6);
    st.forEach(([n,t,r],i)=>{const x=x0+16+i*sp,y=y0+120,on=rails(r);
      c.strokeStyle='#4dff88';c.strokeRect(x,y,bw,54);c.fillStyle=on?'#4dff88':'#0d2a17';c.fillRect(x+4,y+4,bw-8,30);
      font(st.length>6?9:11);c.fillStyle='#4dff88';c.fillText(n,x+bw/2,y+66);c.fillText(on?t:'—',x+bw/2,y+86)});
    font(14);c.fillStyle='#4dff88';c.textAlign='left';
    c.fillText(`GUN  ${P.rounds}  ${AC.ammo}`,x0+18,y0+228);
    c.fillText(`${AC.srName} ${P.aim9}   ${AC.mrName} ${P.aim120}`,x0+18,y0+256);
    font(13);c.fillText(`${AC.cm.cmds} F${CM.flares} C${CM.chaff}`+(AC.cm.decoys?` D${CM.decoys}`:''),x0+18,y0+284);
  }
  // DED (data entry display)
  {const x=366,y=24,w=292,h=104;c.fillStyle='#0a0f0b';c.fillRect(x,y,w,h);c.strokeStyle='#3d4448';c.strokeRect(x,y,w,h);
    const s=Math.floor(clock),mm=String(Math.floor(s/60)).padStart(2,'0'),ss=String(s%60).padStart(2,'0');
    font(17);c.fillStyle='#b8ff3d';c.textAlign='left';
    c.fillText(`UHF 305.00  STPT ${String(wave).padStart(2,' ')}`,x+12,y+17);
    c.fillText(`VHF  1      ${mm}:${ss}`,x+12,y+40);
    c.fillText(`M${P.mach.toFixed(2)}  ${P.n.toFixed(1)}G  ${Math.round(throttle*100)}%`,x+12,y+63);
    c.fillText(`FUEL ${fuelStr(P.fuel||0)}`,x+12,y+86);
  }
  // caution lights
  const sy=P.sys||{eng:[],hyd:false,radar:false,leak:false};
  const lights=[['MASTER CAUTION',P.hp<50||sy.hyd||sy.radar||sy.leak||sy.eng.some(v=>v>0)||P.bingo,'#ffb347'],['ENG FIRE',sy.eng.some(v=>v===1),'#ff4a3d'],
    ['HYD',sy.hyd,'#ffb347'],['FUEL',P.bingo||sy.leak,'#ffb347'],['GCAS',P.gcas,'#ffb347']];
  lights.forEach(([t,on,col],i)=>{const x=366+i*58,y=140;c.fillStyle=on?col:'#1a1d1f';c.fillRect(x,y,54,34);
    font(10);c.fillStyle=on?'#111':'#4a5054';c.textAlign='center';
    const parts=t.split(' ');parts.forEach((p,j)=>c.fillText(p,x+27,y+17+(j-(parts.length-1)/2)*11))});
  // standby gauges: airspeed, ADI, altimeter
  const dial=(x,y,r)=>{c.fillStyle='#0b0d0e';c.beginPath();c.arc(x,y,r,0,Math.PI*2);c.fill();c.strokeStyle='#4a5054';c.lineWidth=3;c.stroke();c.lineWidth=1.5};
  const needle=(x,y,r,a)=>{c.strokeStyle='#f2f2ea';c.lineWidth=3;c.beginPath();c.moveTo(x,y);c.lineTo(x+Math.sin(a)*r*.85,y-Math.cos(a)*r*.85);c.stroke();c.lineWidth=1.5};
  const ticks=(x,y,r,n)=>{c.strokeStyle='#cfd5d0';for(let i=0;i<n;i++){const a=i/n*Math.PI*2;c.beginPath();c.moveTo(x+Math.sin(a)*r*.82,y-Math.cos(a)*r*.82);c.lineTo(x+Math.sin(a)*r*.95,y-Math.cos(a)*r*.95);c.stroke()}};
  dial(420,290,52);ticks(420,290,52,16);needle(420,290,52,clamp(P.kcas/800,0,1)*Math.PI*2*.9);font(10);c.fillStyle='#cfd5d0';c.textAlign='center';c.fillText('KNOTS',420,316);
  {const x=512,y=290,r=54,bank=bankOf(P),pitch=Math.asin(clamp(P.fwd.y,-1,1));
    c.save();c.beginPath();c.arc(x,y,r,0,Math.PI*2);c.clip();c.translate(x,y);c.rotate(-bank);
    const py=pitch*120;c.fillStyle='#4f86c6';c.fillRect(-r*2,-r*2+py,r*4,r*2);c.fillStyle='#6b4b2e';c.fillRect(-r*2,py,r*4,r*2);
    c.strokeStyle='#fff';c.beginPath();c.moveTo(-r,py);c.lineTo(r,py);c.stroke();c.restore();
    c.strokeStyle='#4a5054';c.lineWidth=3;c.beginPath();c.arc(x,y,r,0,Math.PI*2);c.stroke();
    c.strokeStyle='#ffd166';c.lineWidth=3;c.beginPath();c.moveTo(x-30,y);c.lineTo(x-10,y);c.lineTo(x,y+8);c.lineTo(x+10,y);c.lineTo(x+30,y);c.stroke();c.lineWidth=1.5}
  const ft=P.pos.y*3.281;dial(604,290,52);ticks(604,290,52,10);needle(604,290,52,(ft%10000)/10000*Math.PI*2);
  c.strokeStyle='#9aa39c';c.lineWidth=2;c.beginPath();c.moveTo(604,290);c.lineTo(604+Math.sin((ft%1000)/1000*Math.PI*2)*26,290-Math.cos((ft%1000)/1000*Math.PI*2)*26);c.stroke();
  font(10);c.fillStyle='#cfd5d0';c.fillText('ALT',604,316);
  panelTex.needsUpdate=true;
}

// layouts other than the F-16's: large-area display, three MFDs, Hornet, F-15C analog, Russian analog / glass
function drawPanelAlt(pit){
  const c=pcx, rus=pit==='RUS'||pit==='RUS2'; c.fillStyle=rus?'#3d7a74':'#262b2f'; c.fillRect(0,0,1024,400); c.textBaseline='middle';
  const font=(s,w)=>c.font=`${w||700} ${s}px ${FONT}`;
  const screen=(x,y,w,h)=>{c.fillStyle='#15181a';c.fillRect(x-8,y-8,w+16,h+16);c.fillStyle='#020604';c.fillRect(x,y,w,h)};
  const sms=(x0,y0,w)=>{font(13);c.fillStyle='#4dff88';c.textAlign='center';c.fillText(rus?'ВООРУЖЕНИЕ':'STORES',x0+w/2,y0+14);
    const st=AC.cm.stations,sp=Math.min(40,(w-20)/st.length),bw=Math.min(30,sp-5);
    st.forEach(([n,t,r],i)=>{const o=playerJet.getObjectByName(r),on=o&&o.visible,x=x0+10+i*sp,y=y0+40;c.strokeStyle='#4dff88';c.strokeRect(x,y,bw,44);c.fillStyle=on?'#4dff88':'#0d2a17';c.fillRect(x+3,y+3,bw-6,24);font(st.length>8?8:10);c.fillStyle='#4dff88';c.fillText(on?t:'—',x+bw/2,y+56)});
    font(13);c.textAlign='left';c.fillStyle='#4dff88';c.fillText(`GUN ${P.rounds}  ${AC.srName} ${P.aim9}  ${AC.mrName} ${P.aim120}`,x0+8,y0+120);
    if(AG.load.length)c.fillText(AG.load.map(l=>AGW[l.k].sh+' '+l.n).join('  '),x0+8,y0+142);
    c.fillText(`FUEL ${fuelStr(P.fuel||0)}  F${CM.flares} C${CM.chaff}`,x0+8,y0+164)};
  const adi=(x,y,r)=>{const bank=bankOf(P),pitch=Math.asin(clamp(P.fwd.y,-1,1));c.save();c.beginPath();c.arc(x,y,r,0,Math.PI*2);c.clip();c.translate(x,y);c.rotate(-bank);const py=pitch*120;
    c.fillStyle=rus?'#3b6fb0':'#4f86c6';c.fillRect(-r*2,-r*2+py,r*4,r*2);c.fillStyle=rus?'#7a4a26':'#6b4b2e';c.fillRect(-r*2,py,r*4,r*2);c.strokeStyle='#fff';c.beginPath();c.moveTo(-r,py);c.lineTo(r,py);c.stroke();c.restore();
    c.strokeStyle='#4a5054';c.lineWidth=3;c.beginPath();c.arc(x,y,r,0,Math.PI*2);c.stroke();c.strokeStyle='#ffd166';c.beginPath();c.moveTo(x-r*.55,y);c.lineTo(x-r*.18,y);c.lineTo(x,y+r*.14);c.lineTo(x+r*.18,y);c.lineTo(x+r*.55,y);c.stroke();c.lineWidth=1.5};
  const gauge=(x,y,r,frac,label)=>{c.fillStyle='#0b0d0e';c.beginPath();c.arc(x,y,r,0,Math.PI*2);c.fill();c.strokeStyle=rus?'#9fb7b2':'#4a5054';c.lineWidth=3;c.stroke();
    c.strokeStyle='#cfd5d0';c.lineWidth=1.5;for(let i=0;i<12;i++){const a=-Math.PI*.75+i/11*Math.PI*1.5;c.beginPath();c.moveTo(x+Math.sin(a)*r*.75,y-Math.cos(a)*r*.75);c.lineTo(x+Math.sin(a)*r*.92,y-Math.cos(a)*r*.92);c.stroke()}
    const a=-Math.PI*.75+clamp(frac,0,1)*Math.PI*1.5;c.strokeStyle='#f2f2ea';c.lineWidth=3;c.beginPath();c.moveTo(x,y);c.lineTo(x+Math.sin(a)*r*.85,y-Math.cos(a)*r*.85);c.stroke();c.lineWidth=1.5;
    font(9);c.fillStyle='#cfd5d0';c.textAlign='center';c.fillText(label,x,y+r*.5)};
  const caut=(x,y)=>{const sy=P.sys||{eng:[],hyd:false};[['MASTER',P.hp<50||sy.hyd||sy.eng.some(v=>v>0)||P.bingo,'#ffb347'],['FIRE',sy.eng.some(v=>v===1),'#ff4a3d'],['HYD',sy.hyd,'#ffb347'],['FUEL',P.bingo,'#ffb347']]
    .forEach(([t,on,col],i)=>{c.fillStyle=on?col:'#1a1d1f';c.fillRect(x+i*58,y,54,28);font(10);c.fillStyle=on?'#111':'#4a5054';c.textAlign='center';c.fillText(rus?({MASTER:'ОТКАЗ',FIRE:'ПОЖАР',HYD:'ГИДР',FUEL:'ТОПЛ'})[t]:t,x+i*58+27,y+14)})};
  const ft=P.pos.y*3.281;
  if(pit==='LAD'){screen(24,30,976,250);drawScope(c,32,34,560,242,true);sms(612,40,380);caut(24,300);adi(560,340,48);gauge(680,340,44,P.kcas/800,'KT');gauge(790,340,44,(ft%10000)/10000,'ALT');
    font(12);c.fillStyle='#b8ff3d';c.textAlign='left';c.fillText(`M${P.mach.toFixed(2)} ${P.n.toFixed(1)}G ${Math.round(throttle*100)}%`,860,330)}
  else if(pit==='3MFD'||pit==='HORNET'){const w=pit==='HORNET'?280:300;screen(20,40,w,250);drawScope(c,20,40,w,250,true);screen(1004-w,40,w,250);sms(1004-w,40,w);
    const cx=512;screen(cx-110,pit==='HORNET'?150:40,220,pit==='HORNET'?140:250);adi(cx,pit==='HORNET'?220:120,pit==='HORNET'?56:62);
    if(pit==='HORNET'){c.fillStyle='#0a0f0b';c.fillRect(cx-150,26,300,96);font(15);c.fillStyle='#b8ff3d';c.textAlign='center';c.fillText('UFC  '+fuelStr(P.fuel||0),cx,52);c.fillText(`M${P.mach.toFixed(2)}  ${Math.round(P.kcas)} KT  ${P.n.toFixed(1)}G`,cx,84)}
    else{font(13);c.fillStyle='#4dff88';c.textAlign='center';c.fillText(`${Math.round(P.kcas)} KT · ${Math.round(ft)} FT`,cx,230);c.fillText(`HDG ${Math.round((Math.atan2(-P.fwd.x,P.fwd.z)*57.3+360)%360)}`,cx,252)}
    caut(pit==='HORNET'?300:330,330)}
  else if(pit==='TEEN'){screen(30,40,260,250);drawScope(c,30,40,260,250,true);adi(450,140,70);gauge(340,110,46,P.kcas/800,'KT');gauge(560,110,46,(ft%10000)/10000,'ALT');
    gauge(340,240,40,throttle,'RPM L');gauge(450,260,40,throttle,'RPM R');gauge(560,240,40,(P.fuel||0)/AC.fuelCap,'FUEL');screen(700,40,290,250);sms(700,40,290);caut(330,330)}
  else if(pit==='RUS'){ // round gauges and a small TV indicator for the radar/IRST
    c.fillStyle='#1a2b29';c.fillRect(380,24,264,200);c.fillStyle='#030a06';c.fillRect(392,34,240,180);drawScope(c,392,34,240,180,true);
    adi(512,300,62);gauge(100,90,52,P.kcas/1400*1.852,'КМ/Ч');gauge(230,90,52,(ft/3.281%10000)/10000,'ВЫСОТА');gauge(100,230,48,P.mach/2.5,'M');gauge(230,230,48,clamp(P.vel.y/150*.5+.5,0,1),'ВАР');
    gauge(800,90,52,throttle,'ОБ 1');gauge(920,90,52,throttle,'ОБ 2');gauge(800,230,48,(P.fuel||0)/AC.fuelCap,'ТОПЛИВО');gauge(920,230,48,clamp(P.n/9,0,1),'ПЕРЕГР');caut(660,320);
    font(12);c.fillStyle='#e8f0ec';c.textAlign='left';c.fillText(`${AC.srName} ${P.aim9}  ${AC.mrName} ${P.aim120}  ГШ ${P.rounds}`,40,320);c.fillText(`ППИ ${CM.flares}/${CM.chaff}`,40,345)}
  else if(pit==='RUS2'){screen(30,40,300,250);drawScope(c,30,40,300,250,true);screen(694,40,300,250);sms(694,40,300);adi(512,140,70);gauge(420,290,40,P.kcas/800,'KT');gauge(604,290,40,(ft%10000)/10000,'ALT');caut(370,340)}
  panelTex.needsUpdate=true}
const qTmp2=new THREE.Quaternion();
let panelT=0;
function updateCockpit(dt){
  // sunlight in seat coordinates so shadows swing as you roll
  qTmp2.copy(playerJet.quaternion).multiply(QRY).invert();
  cSun.position.copy(SUN_DIR).applyQuaternion(qTmp2).multiplyScalar(10);
  grip.parent.rotation.set(.18*(P.inPitch||0),0,-.18*(P.inRoll||0));
  thrGrip.position.z=-throttle*.17+.04;
  outFlame.scale.copy(pFlame.scale);
  for(const r of outRails){const o=playerJet.getObjectByName(r.name);if(o)r.visible=o.visible}
  panelT-=dt; if(panelT<=0){panelT=.1;drawPanel()}
}
function combinerRect(){
  cockCam.updateMatrixWorld(); combiner.updateMatrixWorld();
  let x0=1e9,x1=-1e9,y0=1e9,y1=-1e9;
  for(const [sx,sy] of [[-1,-1],[1,-1],[1,1],[-1,1]]){
    _pv.set(sx*.15,sy*.11,0).applyMatrix4(combiner.matrixWorld).project(cockCam);
    if(_pv.z>1||_pv.z<-1)return null;
    const x=(_pv.x+1)/2*W,y=(1-_pv.y)/2*H;
    x0=Math.min(x0,x);x1=Math.max(x1,x);y0=Math.min(y0,y);y1=Math.max(y1,y);
  }
  if(x1<0||x0>W||y1<0||y0>H)return null;
  return {x0,x1,y0,y1};
}

