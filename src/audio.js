/* ---------------- audio ---------------- */
const A={ctx:null,on:true};
function audioInit(){
  if(A.ctx){if(A.ctx.state==='suspended')A.ctx.resume();return}
  try{A.ctx=new (window.AudioContext||window.webkitAudioContext)()}catch(e){return}
  const c=A.ctx; A.master=c.createGain(); A.master.gain.value=A.on?.55:0; A.master.connect(c.destination);
  A.noise=c.createBuffer(1,c.sampleRate*2,c.sampleRate); const d=A.noise.getChannelData(0); for(let i=0;i<d.length;i++)d[i]=Math.random()*2-1;
  A.roar=c.createBufferSource(); A.roar.buffer=A.noise; A.roar.loop=true;
  A.roarF=c.createBiquadFilter(); A.roarF.type='lowpass'; A.roarF.frequency.value=400;
  A.roarG=c.createGain(); A.roarG.gain.value=0; A.roar.connect(A.roarF).connect(A.roarG).connect(A.master); A.roar.start();
  A.eng=c.createOscillator(); A.eng.type='sawtooth'; A.eng.frequency.value=60;
  A.engF=c.createBiquadFilter(); A.engF.type='lowpass'; A.engF.frequency.value=320;
  A.engG=c.createGain(); A.engG.gain.value=0; A.eng.connect(A.engF).connect(A.engG).connect(A.master); A.eng.start();
  // second engine (MiG-29 twin RD-33s beat against each other) and a turbine whine (Gripen's RM12 is high-pitched)
  A.eng2=c.createOscillator(); A.eng2.type='sawtooth'; A.eng2.frequency.value=61; A.eng2G=c.createGain(); A.eng2G.gain.value=0;
  A.eng2.connect(A.eng2G); A.eng2G.connect(A.engF); A.eng2.start();
  A.wh=c.createOscillator(); A.wh.type='sine'; A.wh.frequency.value=900; A.whG=c.createGain(); A.whG.gain.value=0;
  A.wh.connect(A.whG).connect(A.master); A.wh.start();
}
function sndNoise(dur,freq,gain,type){
  if(!A.ctx||!A.on)return; const c=A.ctx,t=c.currentTime;
  const s=c.createBufferSource(); s.buffer=A.noise; const f=c.createBiquadFilter(); f.type=type||'lowpass'; f.frequency.value=freq;
  const g=c.createGain(); g.gain.setValueAtTime(gain,t); g.gain.exponentialRampToValueAtTime(.001,t+dur);
  s.connect(f).connect(g).connect(A.master); s.start(t,Math.random()*1.5,dur+.05);
}
function sndBeep(freq,dur,gain,type){
  if(!A.ctx||!A.on)return; const c=A.ctx,t=c.currentTime;
  const o=c.createOscillator(); o.type=type||'square'; o.frequency.value=freq; const g=c.createGain();
  g.gain.setValueAtTime(gain,t); g.gain.setValueAtTime(0,t+dur); o.connect(g).connect(A.master); o.start(t); o.stop(t+dur+.02);
}
/* cockpit voice warnings through the browser's speech engine; Russian jets use Russian phrases when a Russian voice is installed */
const VOICE={on:true,last:{},en:null,ru:null};
try{VOICE.on=localStorage.getItem('vsVoice')!=='0'}catch(e){}
function pickVoices(){try{const vs=speechSynthesis.getVoices();VOICE.en=vs.find(v=>/^en/i.test(v.lang)&&/female|samantha|zira|susan|karen|serena|victoria|google us/i.test(v.name))||vs.find(v=>/^en/i.test(v.lang))||null;VOICE.ru=vs.find(v=>/^ru/i.test(v.lang))||null}catch(e){}}
try{pickVoices();speechSynthesis.onvoiceschanged=pickVoices}catch(e){}
const VTXT={pull:['Pull up. Pull up.','Опасная высота'],alt:['Altitude. Altitude.','Высота'],launch:['Missile launch.','Ракета'],maws:['Missile. Missile.','Ракета. Ракета.'],
  bingo:['Bingo fuel. Bingo fuel.','Аварийный остаток топлива'],
  high:["You're high.",'Выше глиссады'],power:['Power.','Обороты'],left:['Come left.','Левее'],right:['Right for lineup.','Правее'],waveoff:['Wave off. Wave off.','Уход на второй круг'],fuel:['Fuel low.','Остаток топлива'],fire:['Warning. Engine fire.','Пожар двигателя'],overg:['Over G.','Перегрузка'],lock:['Lock.','Захват']};
function say(key,cd){
  if(!VOICE.on||!A.on||typeof speechSynthesis==='undefined')return; const t=performance.now(); if(VOICE.last[key]&&t-VOICE.last[key]<(cd||3)*1000)return; VOICE.last[key]=t;
  try{const ru=/^(MIG|SU)/.test(AC.id)&&VOICE.ru, u=new SpeechSynthesisUtterance(VTXT[key][ru?1:0]); u.rate=1.15;u.pitch=1.05;u.volume=1;
    if(ru)u.voice=VOICE.ru; else if(VOICE.en)u.voice=VOICE.en; if(key==='pull'||key==='maws'||key==='launch')speechSynthesis.cancel(); speechSynthesis.speak(u)}catch(e){}}
const VW={bingo:false,fuel:false,fire:0};
function voiceWatch(){
  if(state!=='play'||!P.alive)return;
  const gh=Math.max(groundH(P.pos.x,P.pos.z),0), agl=P.pos.y-gh;
  if(P.gcas||(!P.gear&&agl<400&&P.vel.y<-20))say('pull',2.6);
  else if(!P.gear&&!P.onGround&&agl<150&&P.vel.y<-6)say('alt',4);
  if(P.bingo&&!VW.bingo)say('bingo',8); VW.bingo=P.bingo;
  if(P.lowFuel&&!VW.fuel)say('fuel',8); VW.fuel=P.lowFuel;
  const fires=P.sys?P.sys.eng.filter(v=>v===1).length:0; if(fires>VW.fire)say('fire',5); VW.fire=fires;
  if(P.n>(P.gLim||AC.gmax)+.4)say('overg',4)}
const sndGun=()=>sndNoise(.07,AC.gunSnd,.3,'bandpass');
const sndBoom=v=>sndNoise(1.4,520,.9*v);
const sndMsl=()=>sndNoise(1.1,1400,.4,'bandpass');
const sndHit=()=>sndNoise(.12,900,.5,'highpass');
const sndSeq=(notes,dur,gain,type)=>notes.forEach((f,i)=>setTimeout(()=>sndBeep(f,dur,gain,type||'sine'),i*(dur*1000+30)));
const sndTear=()=>{sndNoise(.7,1900,.8,'bandpass');sndNoise(.9,220,.9)};      // a wing ripping off
const sndFire=()=>sndSeq([880,660,880,660],.12,.06,'square');                  // fire warning
const sndKill=()=>sndSeq([880,1320],.09,.07);                                  // kill confirmed
const sndCrit=()=>sndBeep(1600,.05,.05,'sine');
const sndZone=up=>sndSeq(up?[660,880,1100]:[880,660,440],.1,.07);
const sndSpawn=()=>sndSeq([520,780],.1,.06);
function sndEngine(){
  if(!A.ctx)return; const t=A.ctx.currentTime;
  const live=(state==='play'||state==='menu')&&(P.thrK??1)>0;
  const k=clamp(P.kcas/700,0,1.2), ab=throttle>.81;
  const snd=ENG_SND[AC.id]||({F16:{f:40,roar:250,wh:0,twin:0},F16B70:{f:39,roar:240,wh:0,twin:0},GRIPEN:{f:52,roar:330,wh:.012,twin:0},GRIPENE:{f:48,roar:300,wh:.01,twin:0},MIG29:{f:30,roar:200,wh:.004,twin:1},MIG29UPG:{f:30,roar:200,wh:.004,twin:1},MIG35:{f:33,roar:215,wh:.005,twin:1},SU27:{f:27,roar:185,wh:.004,twin:1},SU35:{f:26,roar:180,wh:.006,twin:1}})[AC.id]||AC.snd||{f:36,roar:220,wh:.004,twin:1};
  const ef=snd.f+Math.min(throttle,.8)*40+k*40;
  A.eng.frequency.setTargetAtTime(ef,t,.2);
  if(A.eng2){A.eng2.frequency.setTargetAtTime(ef*1.035,t,.2);A.eng2G.gain.setTargetAtTime(live&&snd.twin?.9:0,t,.2)}
  if(A.wh){A.wh.frequency.setTargetAtTime(700+Math.min(throttle,.8)*900+k*300,t,.2);A.whG.gain.setTargetAtTime(live?snd.wh*(.4+throttle):0,t,.2)}
  A.engG.gain.setTargetAtTime(live?.045+(ab?.03:0):0,t,.2);
  A.roarF.frequency.setTargetAtTime(snd.roar+k*600+(ab?900:0),t,.2);
  A.roarG.gain.setTargetAtTime(live?.05+k*.05+(ab?.14:0):0,t,.2);
}

