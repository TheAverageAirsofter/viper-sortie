/* ---------------- AAA-style menu: title, main list, quick mission, campaign, online, training, settings, pilot, pause, debrief, loading ----------------
   The original cycle buttons live on, hidden, inside #legacy; every row below drives them (so their handlers, saved settings and tests keep working)
   and re-reads the real game variables whenever something changes. */
const ovEl=$('ov');
const mk=(tag,cls,html)=>{const e=document.createElement(tag);if(cls)e.className=cls;if(html!=null)e.innerHTML=html;return e};
const drive=(btn,cur,want,max=26)=>{let n=0;while(cur()!==want&&n++<max)btn.click()};
const GRN='#7dff9a', RED='#ff5a4e';
/* ---- small drawn illustrations (no emoji): gradient band plus a simple glyph ---- */
function svgArt(c1,c2,body){const id='g'+(c1+c2).replace(/[^0-9a-f]/gi,'');return '<svg viewBox="0 0 96 60" preserveAspectRatio="xMidYMid slice" aria-hidden="true"><defs><linearGradient id="'+id+'" x1="0" y1="0" x2="1" y2="1"><stop offset="0" stop-color="'+c1+'"/><stop offset="1" stop-color="'+c2+'"/></linearGradient></defs><rect width="96" height="60" fill="url(#'+id+')"/><g fill="none" stroke="'+GRN+'" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round" opacity=".9">'+body+'</g></svg>'}
const MIS_ART={
  WAVES:['#1e4a5c','#0d2430','<path d="M18 46a30 30 0 0 1 60 0M30 46a18 18 0 0 1 36 0M42 46a6 6 0 0 1 12 0"/><circle cx="62" cy="26" r="2" fill="'+RED+'" stroke="none"/><circle cx="36" cy="30" r="2" fill="'+RED+'" stroke="none"/>'],
  STRIKE:['#5c3a1e','#241509','<circle cx="48" cy="30" r="15"/><path d="M48 9v14M48 37v14M27 30h14M55 30h14"/><rect x="44" y="26" width="8" height="8" stroke="'+RED+'"/>'],
  INTERCEPT:['#1e3a5c','#0b1624','<path d="M18 16l14 14-14 14M40 16l14 14-14 14M62 16l14 14-14 14"/>'],
  RUSH:['#5c1e2c','#240a10','<circle cx="48" cy="34" r="17"/><path d="M48 34V22M48 34l9 5M44 14h8M48 14v3"/>'],
  ESCORT:['#2d5c3a','#0e2416','<path d="M48 10l8 22 22 10-22-2-8 12-8-12-22 2 22-10z"/><circle cx="14" cy="14" r="2" fill="'+RED+'" stroke="none"/><circle cx="84" cy="16" r="2" fill="'+RED+'" stroke="none"/>'],
  '2V4':['#3a3a5c','#14142a','<circle cx="22" cy="24" r="3.5" fill="'+GRN+'"/><circle cx="22" cy="38" r="3.5" fill="'+GRN+'"/><circle cx="66" cy="18" r="3.5" fill="'+RED+'" stroke="'+RED+'"/><circle cx="78" cy="30" r="3.5" fill="'+RED+'" stroke="'+RED+'"/><circle cx="66" cy="38" r="3.5" fill="'+RED+'" stroke="'+RED+'"/><circle cx="82" cy="46" r="3.5" fill="'+RED+'" stroke="'+RED+'"/>'],
  '4SHIP':['#2d5c5c','#0e2424','<path d="M48 12l6 12h-12zM30 28l6 12h-12zM66 28l6 12h-12zM48 40l6 12h-12z"/>'],
  GROUNDWAR:['#5a4e2d','#241f10','<path d="M6 46h84"/><rect x="10" y="34" width="16" height="8"/><path d="M26 36h12"/><rect x="58" y="34" width="16" height="8"/><path d="M58 36h-12"/><path d="M40 22l8 8M48 22l-8 8"/>'],
  CONVOY:['#5c5a2d','#242310','<path d="M8 44h80"/><rect x="12" y="34" width="14" height="9"/><rect x="34" y="34" width="14" height="9"/><rect x="56" y="34" width="14" height="9"/><path d="M76 40l8-4v8z"/>'],
  ANTISHIP:['#1e4a6a','#0b1c2c','<path d="M14 36h68l-8 10H24zM38 36v-8h16v8M46 28v-8"/><path d="M8 52q8-5 16 0t16 0t16 0t16 0" stroke-width="1.6"/>'],
  CRUISE:['#5c2d1e','#241009','<path d="M16 12l24 14M30 8l24 14M44 4l24 14"/><path d="M40 26l-7-1M54 22l-7-1M68 18l-7-1" stroke="'+RED+'"/><path d="M8 52h80"/>'],
  CAMPAIGN:['#2d4a3a','#0e1c15','<path d="M8 22l20 10 18-8 20 14 22-6" stroke-dasharray="3 4"/><path d="M8 40l24-6 20 8 18-10 18 4"/><circle cx="48" cy="24" r="3" fill="'+RED+'" stroke="none"/>'],
  ONLINE:['#4a2d5c','#1a0e24','<circle cx="48" cy="30" r="5" fill="'+GRN+'"/><circle cx="18" cy="16" r="3.5"/><circle cx="78" cy="16" r="3.5"/><circle cx="20" cy="46" r="3.5"/><circle cx="78" cy="46" r="3.5"/><path d="M21 18l23 9M75 18L52 27M23 44l21-10M75 44L52 33"/>'],
  TRAINING:['#2d5c5a','#0e2422','<circle cx="48" cy="30" r="20"/><circle cx="48" cy="30" r="12"/><circle cx="48" cy="30" r="4" fill="'+GRN+'"/>']};
const MAP_ART={
  ISLANDS:['#1d5c7a','#12384c','<ellipse cx="28" cy="38" rx="16" ry="7" fill="#3f7a4a" stroke="none"/><ellipse cx="62" cy="26" rx="12" ry="6" fill="#4a8a52" stroke="none"/><ellipse cx="74" cy="46" rx="14" ry="6" fill="#3f7a4a" stroke="none"/>'],
  DESERT:['#c9a566','#8a6a3a','<path d="M0 44q18-14 36-2t36-4 24 4" stroke="#f3dfb0"/><path d="M0 52q22-10 44-2t52-2" stroke="#6b4e24"/><circle cx="74" cy="14" r="6" stroke="#fff3c4"/>'],
  ALPINE:['#9fb4c6','#51647a','<path d="M4 50l20-30 12 16 12-22 16 26 8-10 20 20z" fill="#eef3f7" stroke="#cfd9e3"/>'],
  OCEAN:['#2a6a9a','#0f2f4c','<path d="M0 22q12-6 24 0t24 0t24 0t24 0M0 36q12-6 24 0t24 0t24 0t24 0M0 50q12-6 24 0t24 0t24 0t24 0" stroke="#9fd4ff"/>']};
const MIS_DESC={WAVES:'Endless bandit groups. Survive and rack up score.',STRIKE:'Take out the SAM and AAA site, then fly home.',INTERCEPT:'Four bombers inbound. Stop them before the release point.',
  RUSH:'Bandit rush: 8 kills in 5 minutes.',ESCORT:'Protect a C-130 across the sector.','2V4':'You and your wingman against four bandits.','4SHIP':'Lead a four-ship against six, with a SAM belt.',
  GROUNDWAR:'Blue and red armour fight each other. Back the blue side from the air and destroy the red force.',CONVOY:'Stop at least 4 of 5 trucks before they escape.',ANTISHIP:'Sink the frigate NE of the base. It has SAMs.',CRUISE:'Cruise missiles inbound on the base. Shoot them down.',
  CAMPAIGN:'A moving front line. Losses stay lost.',ONLINE:'Dogfight other pilots in a shared room.',TRAINING:'Guided lessons: dogfighting, missile defence, landing, refuelling.'};
const MAP_DESC={ISLANDS:'Green islands and sheltered bays.',DESERT:'Dry canyons and low valleys.',ALPINE:'Snowy peaks under heavy cloud.',OCEAN:'Open sea. Nothing to hide behind.'};
const MAP_NAME=k=>({ISLANDS:'Islands',DESERT:'Desert canyons',ALPINE:'Snowy alps',OCEAN:'Open ocean'})[k]||k;
const LES_DESC={BFM:'Basic fighter manoeuvres and gun shots',DEFENSE:'Defeat three inbound missiles',BVR:'Long-range radar missile shot',LANDING:'Land on the runway',REFUEL:'Take fuel from the tanker'};
const MIS_BRIEF={WAVES:'Bandit groups arrive in waves from every bearing. Each wave is bigger and meaner than the last. Stay alive, keep your energy up and push the score.',
  STRIKE:'A SAM and AAA site covers the approach to the target. Suppress it, destroy the objective, then bring the jet home.',
  INTERCEPT:'Four bombers are inbound on the base. Kill them before they reach the release point; escorts will try to stop you.',
  RUSH:'Eight bandits, five minutes. Nothing to protect and nowhere to hide. Kill fast, keep the speed up.',
  ESCORT:'A C-130 is crossing the sector. Keep it alive until it clears the far side; bandits will go for it first.',
  '2V4':'You and your wingman against four bandits. Call targets, split them and keep your wingman in the fight.',
  '4SHIP':'Lead a four-ship against six bandits behind a SAM belt. Command the flight and manage the threats.',
  GROUNDWAR:'M1A1 Abrams, Leopard 2A4, Challenger and M60A3 tanks with Bradley and Marder IFVs, a Gepard and an M163 Vulcan hold the south (the Gepard shoots at bandits). T-80B, T-72A and T-62 tanks, BMP-2s and two ZSU anti-aircraft tracks come from the north. The tanks fight on their own: kill the red armour with bombs, rockets and guns before it grinds the blue force down, and keep away from the ZSUs.',
  CONVOY:'Trucks are running for the border. Stop at least four of the five before they escape.',
  ANTISHIP:'A frigate sits north-east of the base with SAM cover. Find it, sink it and avoid the missile envelope.',
  CRUISE:'Cruise missiles are inbound on the base. They are fast and low. Shoot down as many as you can.'};
const LES_BRIEF={BFM:'Learn to turn, use energy and put the gun on target. Kill three drones with the guns.',DEFENSE:'Three missiles are coming for you. Break, chaff and flare your way through them.',
  BVR:'Lock a contact at long range and shoot it down with a radar missile before it ever sees you.',LANDING:'Fly the pattern, line up with the runway and put the jet on the ground in one piece.',REFUEL:'Join up with the tanker, plug in and take on fuel in flight.'};
const WXN={CLEAR:'Clear',SCATTERED:'Partly cloudy',OVERCAST:'Overcast',RAIN:'Rain'}, TMN={DAY:'Day',DUSK:'Dusk',NIGHT:'Night'};
const startCur=()=>!startOnRunway?'air':startCV?'cv':'rwy';
const QUICK_X=['CAMPAIGN','ONLINE','TRAINING'], quickList=()=>Object.keys(MISSIONS).filter(k=>QUICK_X.indexOf(k)<0);
let lastQuick='WAVES';
const lsGet=(k,d)=>{try{const v=localStorage.getItem(k);return v===null?d:v}catch(e){return d}}, lsSet=(k,v)=>{try{localStorage.setItem(k,v)}catch(e){}};
const REDUCE=matchMedia('(prefers-reduced-motion:reduce)').matches;
const UIS={on:lsGet('vsUiSnd','1')!=='0'}, FX={on:lsGet('vsFx','1')!=='0'};
const NOLOAD=/[?&]noload\b/.test(location.search);
ovEl.dataset.fx=FX.on?'on':'off';

/* ---- UI sounds: quiet, optional, through the existing audio context ---- */
function uiSnd(k){if(!UIS.on||!A.ctx||!A.on)return;
  if(k==='move')sndBeep(1500,.022,.014,'sine');
  else if(k==='sel'){sndBeep(740,.045,.026,'triangle');setTimeout(()=>sndBeep(1110,.06,.022,'triangle'),45)}
  else if(k==='back')sndBeep(520,.07,.022,'triangle')}

/* ---- rows: LABEL ........ < Value >, thin slider rows, action rows ---- */
const mCtls=[], CHEV_L='<svg viewBox="0 0 10 16" aria-hidden="true"><path d="M8 2L2 8l6 6"/></svg>', CHEV_R='<svg viewBox="0 0 10 16" aria-hidden="true"><path d="M2 2l6 6-6 6"/></svg>';
function mRow(label,opts,cur,pick,o){o=o||{};
  const w=mk('div','mr'),m=mk('button','rm','<span class="lab">'+label+'</span><i class="lead"></i>'),l=mk('button','chev',CHEV_L),v=mk('button','val'),r=mk('button','chev',CHEV_R);
  for(const b of [m,l,v,r])b.type='button';for(const b of [l,v,r])b.tabIndex=-1;
  l.setAttribute('aria-label','Previous '+label);r.setAttribute('aria-label','Next '+label);
  w.append(m,l,v,r);w.dataset.name=label;if(o.desc)w.dataset.desc=o.desc;
  const step=d=>{const O=opts();if(!O.length)return;const i=Math.max(0,O.findIndex(x=>x.v===cur())),n=O[(i+d+O.length)%O.length];if(n&&n.v!==cur()){pick(n.v);uiSnd('move')}uiSync()};
  w._step=step;l.addEventListener('click',()=>step(-1));for(const b of [m,v,r])b.addEventListener('click',()=>step(1));
  m.addEventListener('keydown',e=>{if(e.key==='ArrowLeft'){e.preventDefault();step(-1)}else if(e.key==='ArrowRight'){e.preventDefault();step(1)}});
  mCtls.push({w,sync(){const O=opts(),c=O.find(x=>x.v===cur());v.textContent=c?c.t:'';m.setAttribute('aria-label',label+': '+(c?c.t:''));l.disabled=r.disabled=O.length<2;if(o.hidden)w.hidden=o.hidden()}});return w}
const onoff=(label,cur,click,o)=>mRow(label,()=>[{v:true,t:'On'},{v:false,t:'Off'}],()=>!!cur(),v=>{if(v!==!!cur())click()},o);
function mSlide(label,n,cur,set,fmt,o){o=o||{};
  const w=mk('div','mr sl','<span class="lab">'+label+'</span><i class="lead"></i><div class="track"><i class="fill"></i><input type="range" min="0" max="'+(n-1)+'" step="1" aria-label="'+label+'"></div><output class="val"></output>'),i=w.querySelector('input'),f=w.querySelector('.fill');
  w.dataset.name=label;if(o.desc)w.dataset.desc=o.desc;
  i.addEventListener('input',()=>{set(+i.value);uiSnd('move');uiSync()});
  w._step=d=>{i.value=clamp(+i.value+d,0,n-1);i.dispatchEvent(new Event('input'))};
  mCtls.push({w,sync(){i.value=cur();f.style.width=(n>1?cur()/(n-1)*100:100)+'%';w.querySelector('output').textContent=fmt(cur())}});return w}
function mAct(label,hint,click,desc){const b=mk('button','mr act','<span class="lab">'+label+'</span><i class="lead"></i><span class="val">'+hint+'</span>');b.type='button';b.dataset.name=label;if(desc)b.dataset.desc=desc;
  b.addEventListener('click',()=>{uiSnd('sel');click()});return b}
const mGrp=t=>mk('h3','grp',t);

/* ---- battle presets: set existing values only (difficulty, which carries the missile and countermeasure rules; HUD markers; damage severity; reward multiplier) ---- */
let presetPending=null;
function presetApply(k){presetPending=null;preset=k;lsSet('vsPreset',k);drive($('bDiff'),()=>difficulty,PRESETS[k].diff);uiSync()}
function presetRow(){const w=mRow('Preset',()=>Object.keys(PRESETS).map(k=>({v:k,t:PRESETS[k].n+' ×'+PRESETS[k].reward.toFixed(1)})),()=>preset,v=>{
    if(difficulty!==PRESETS[preset].diff){presetPending=v;uiSync()}else presetApply(v)},{desc:'Arcade, Realistic or Simulator: sets difficulty, HUD markers, damage severity and the reward multiplier.'});
  const chip=mk('div','pchip','<span></span><button type="button" data-y>Apply</button><button type="button" data-n>Keep</button>');chip.hidden=true;w.appendChild(chip);
  chip.querySelector('[data-y]').addEventListener('click',()=>{uiSnd('sel');presetApply(presetPending)});chip.querySelector('[data-n]').addEventListener('click',()=>{presetPending=null;uiSync()});
  mCtls.push({w:chip,sync(){chip.hidden=!presetPending;if(presetPending)chip.querySelector('span').textContent='Replace your Difficulty ('+DIFF[difficulty].name+') with '+PRESETS[presetPending].n+' ('+DIFF[PRESETS[presetPending].diff].name+')?'}});
  return w}
/* ---- QUICK MISSION rows ---- */
const qr=$('qRows');
{const A1=mk('div','col'),B1=mk('div','col');qr.append(A1,B1);
  A1.append(mGrp('Mission'),
    presetRow(),
    mRow('Mission',()=>quickList().map(k=>({v:k,t:MISSIONS[k]})),()=>quickList().indexOf(mission)>=0?mission:lastQuick,v=>{lastQuick=v;drive($('bMission'),()=>mission,v,30)}),
    mRow('Map',()=>Object.keys(MAPS).map(k=>({v:k,t:MAP_NAME(k)})),()=>MAP,v=>drive($('bMap'),()=>MAP,v,6)),
    mRow('Start',()=>[{v:'air',t:'In the air'},{v:'rwy',t:'Runway'},...(AC.carrier?[{v:'cv',t:'Carrier'}]:[])],startCur,v=>drive($('bStartPos'),startCur,v,4)),
    mRow('Mode',()=>[{v:'free',t:'Free play'},{v:'career',t:'Career'}],()=>careerOn?'career':'free',v=>drive($('bMode'),()=>careerOn?'career':'free',v,2)));
  B1.append(mGrp('Opponents'),
    mRow('Bandits',()=>{const p=banditPool();return Object.keys(BANDITS).filter(k=>k==='MIXED'||p.indexOf(k)>=0).map(k=>({v:k,t:BANDITS[k]}))},()=>banditPool().indexOf(banditType)>=0?banditType:'MIXED',v=>drive($('bBandit'),()=>banditType,v,90),{hidden:()=>$('bBandit').hidden}),
    mRow('Difficulty',()=>Object.keys(DIFF).map(k=>({v:k,t:DIFF[k].name})),()=>difficulty,v=>drive($('bDiff'),()=>difficulty,v),{hidden:()=>$('bDiff').hidden}),
    mRow('Range',()=>Object.keys(ENG_RANGES).map(k=>({v:k,t:ENG_RANGES[k].n})),()=>rangeKey,v=>drive($('bRange'),()=>rangeKey,v)),
    mGrp('Environment'),
    mRow('Time',()=>Object.keys(TIMES).map(k=>({v:k,t:TMN[k]})),()=>timeOfDay,v=>drive($('bTime'),()=>timeOfDay,v)),
    mRow('Weather',()=>Object.keys(WXS).map(k=>({v:k,t:WXN[k]})),()=>weather,v=>drive($('bWx'),()=>weather,v)));
}
/* ---- ONLINE rows ---- */
{const o=$('oRows'),c=mk('div','col');o.appendChild(c);c.append(mGrp('Room'));
  const rr=$('roomRow'),w=mk('div','mr in','<span class="lab">Room code</span><i class="lead"></i>');w.dataset.name='Room code';w.dataset.desc='Pilots who enter the same code share an arena. Share this page and the code.';
  w.appendChild(rr);rr.hidden=false;rr.className='rin';c.appendChild(w);
  c.append(mRow('Mode',()=>[{v:'TEAMS',t:'Teams'},{v:'FFA',t:'Free for all'}],()=>NET.mode,v=>drive($('bNetMode'),()=>NET.mode,v,2)),
    mRow('Team',()=>[{v:'A',t:'Auto'},{v:'B',t:'Blue'},{v:'R',t:'Red'}],()=>NET.teamPref,v=>drive($('bTeam'),()=>NET.teamPref,v,3),{hidden:()=>NET.mode!=='TEAMS'}))}

/* ---- SETTINGS: tabs, rows and a description area ---- */
const SDESC={'Mouse':'Aim: the cursor is a point in the world and the flight computer rolls and pulls onto it. Stick: the mouse deflects the stick directly.','Input':'Keyboard + mouse: the mouse flies (click to capture, Esc to release), left button guns, right button AIM-9, middle button AIM-120, wheel or W/S throttle, A/D rudder.','Stick':'Fly with the on-screen stick, or tilt the phone.','Pull back':'Whether pulling the stick back raises the nose (flight-sim) or lowers it.','Sensitivity':'How far the jet turns for a given stick movement.','Dead zone':'Ignore small stick movements near the centre.',
  'Vibration':'Haptic feedback for guns, hits and warnings.','Move buttons':'Drag the on-screen buttons where you want them, then save.','Controls guide':'Launch a sortie and show the controls guide on top.',
  'Graphics':'Lower this if the frame rate drops. Auto-adjusts when the game is struggling.','Cinematic menu':'Film grain, letterbox bars, light flare and the slow camera drift behind the menu.','Kill cam':'A short replay when you shoot something down.',
  'Sound':'All game sound.','Voice warnings':'Spoken cockpit warnings: pull up, missile, bingo fuel.','UI sounds':'Quiet clicks as you move through the menu.',
  'Colours':'Switch the HUD to a colour-blind friendly blue and orange.','Text size':'Scale the HUD text.',
  'Difficulty':'How smart and how deadly the bandits are.','Range':'How far away the fight starts. Longer ranges give you room to notch and use radar missiles.','Mode':'Career keeps your XP, rank and unlocks.'};
const STABS=[['ctl','Controls'],['dsp','Display'],['aud','Audio'],['hud','HUD'],['gp','Gameplay']];
let sTab='ctl';
{const sr=$('sRows'),tabs=$('sTabs'),pane={};
  for(const [k,t] of STABS){const b=mk('button','',t);b.type='button';b.setAttribute('role','tab');b.dataset.k=k;b.addEventListener('click',()=>{uiSnd('move');setSTab(k)});tabs.appendChild(b);
    const c=mk('div','col');c.dataset.tab=k;pane[k]=c;sr.appendChild(c)}
  pane.ctl.append(
    mRow('Input',()=>[{v:'touch',t:'Touch / pad'},{v:'kbm',t:'Keyboard + mouse'}],()=>KBM.on?'kbm':'touch',v=>kbmSet(v==='kbm')),
    mRow('Mouse',()=>[{v:'aim',t:'Aim (cursor)'},{v:'stick',t:'Stick'}],()=>KBM.aim?'aim':'stick',v=>kbmAim(v==='aim')),
    mRow('Stick',()=>[{v:'stick',t:'Touch stick'},{v:'tilt',t:'Tilt'}],()=>tilt.on?'tilt':'stick',v=>{if((v==='tilt')!==tilt.on)$('bTilt').click()}),
    mRow('Pull back',()=>[{v:'up',t:'Climbs'},{v:'dn',t:'Dives'}],()=>invert?'dn':'up',v=>{if((v==='dn')!==invert)$('bInvert').click()}),
    mSlide('Sensitivity',Object.keys(SENS).length,()=>Object.keys(SENS).indexOf(sens),i=>drive($('bSens'),()=>sens,Object.keys(SENS)[i],4),i=>Object.keys(SENS)[i]),
    mSlide('Dead zone',DZS.length,()=>dz,i=>drive($('bDz'),()=>dz,i,6),i=>Math.round(DZS[i]*100)+' %'),
    onoff('Vibration',()=>hapticsOn,()=>$('bHaptic').click()),
    mAct('Move buttons','Edit',()=>$('bLayout').click()),mAct('Controls guide','Show',()=>$('bTips').click()));
  pane.dsp.append(
    mRow('Graphics',()=>Object.keys(QUALS).map(k=>({v:k,t:({LOW:'Low',MED:'Medium',HIGH:'High'})[k]})),()=>quality,v=>drive($('bQual'),()=>quality,v,4)),
    onoff('Cinematic menu',()=>FX.on,()=>{FX.on=!FX.on;lsSet('vsFx',FX.on?'1':'0');ovEl.dataset.fx=FX.on?'on':'off';camGoal(ovEl.dataset.pane)}),
    onoff('Bloom and grading',()=>postActive(),()=>{const v=!postActive();POST.on=v;POST.pref=v?'1':'0';try{localStorage.setItem('vsPost',POST.pref)}catch(e){}}),
    onoff('Kill cam',()=>KC.on,()=>$('bKc').click()));
  pane.aud.append(onoff('Sound',()=>A.on,()=>$('bSound').click()),onoff('Voice warnings',()=>VOICE.on,()=>$('bVoice').click()),onoff('UI sounds',()=>UIS.on,()=>{UIS.on=!UIS.on;lsSet('vsUiSnd',UIS.on?'1':'0');if(UIS.on){audioInit();uiSnd('sel')}}));
  pane.hud.append(
    mRow('Colours',()=>[{v:'green',t:'Green'},{v:'cb',t:'Blue / orange'}],()=>palKey,v=>drive($('bPal'),()=>palKey,v,3)),
    mRow('Text size',()=>TXT_SIZES.map(k=>({v:k,t:Math.round(k*100)+'%'})),()=>txtK,v=>drive($('bText'),()=>txtK,v,4)));
  pane.gp.append(
    mRow('Difficulty',()=>Object.keys(DIFF).map(k=>({v:k,t:DIFF[k].name})),()=>difficulty,v=>drive($('bDiff'),()=>difficulty,v),{hidden:()=>$('bDiff').hidden}),
    mRow('Range',()=>Object.keys(ENG_RANGES).map(k=>({v:k,t:ENG_RANGES[k].n})),()=>rangeKey,v=>drive($('bRange'),()=>rangeKey,v)),
    mRow('Mode',()=>[{v:'free',t:'Free play'},{v:'career',t:'Career'}],()=>careerOn?'career':'free',v=>drive($('bMode'),()=>careerOn?'career':'free',v,2)));
  for(const k in pane)for(const e of pane[k].querySelectorAll('.mr'))if(!e.dataset.desc&&SDESC[e.dataset.name])e.dataset.desc=SDESC[e.dataset.name];
  // the other quick-mission rows get descriptions too
  for(const e of document.querySelectorAll('#qRows .mr'))if(!e.dataset.desc&&SDESC[e.dataset.name])e.dataset.desc=SDESC[e.dataset.name]}
function setSTab(k){sTab=k;for(const b of $('sTabs').children)b.setAttribute('aria-selected',b.dataset.k===k?'true':'false');
  for(const c of $('sRows').children)c.hidden=c.dataset.tab!==k;sdShow(c0())}
const c0=()=>$('sRows').querySelector('.col:not([hidden]) .mr:not([hidden])');
function sdShow(row){const t=STABS.find(x=>x[0]===sTab);$('sdKick').textContent=t?t[1]:'Settings';if(!row){$('sdName').textContent=t?t[1]:'Settings';$('sdText').textContent='';return}
  $('sdName').textContent=row.dataset.name||'';$('sdText').textContent=row.dataset.desc||''}
$('sRows').addEventListener('focusin',e=>{const r=e.target.closest('.mr');if(r)sdShow(r)});
$('sRows').addEventListener('pointerover',e=>{const r=e.target.closest('.mr');if(r&&e.pointerType==='mouse')sdShow(r)});

/* ---- panes, header and the camera behind them ---- */
const PANES={title:{},main:{e:'Operations',t:'Viper Sortie'},quick:{e:'Operations',t:'Quick mission',back:'main'},camp:{e:'Operations',t:'Campaign',back:'main'},online:{e:'Operations',t:'Online',back:'main'},
  train:{e:'Operations',t:'Training',back:'main'},set:{e:'Options',t:'Settings',back:'main'},pilot:{e:'Pilot record',t:'Pilot',back:'main'},pause:{},over:{},load:{}};
const CAMG={title:[1.05,.1,1.4],main:[.72,.2,1],quick:[-.55,.12,1.5],camp:[2.5,.62,1.75],online:[1.9,.2,1.35],train:[.4,.04,.6],set:[1.5,.25,1.5],pilot:[.2,.15,1.2],over:[2.7,.15,.95],load:[.72,.2,1.15]};
function camGoal(p){const g=CAMG[p]||CAMG.main;HG.goal={ang:g[0],el:g[1],zoom:g[2],drift:(FX.on&&!REDUCE)?1:0}}
let paneBack='';
function crumbSync(){if(ovEl.dataset.kind==='over'||ovEl.dataset.kind==='pause'&&ovEl.dataset.pane==='pause')return;const p=PANES[ovEl.dataset.pane];if(!p||!p.t)return;
  $('ovEyebrow').textContent=p.e;$('ovTitle').textContent=p.t}
function goPane(pane,o){o=o||{};const prev=ovEl.dataset.pane;if(pane==='quick')ensureQuick();else if(pane==='camp'&&mission!=='CAMPAIGN')drive($('bMission'),()=>mission,'CAMPAIGN',30);
  else if(pane==='online'&&mission!=='ONLINE')drive($('bMission'),()=>mission,'ONLINE',30);else if(pane==='train'&&mission!=='TRAINING')drive($('bMission'),()=>mission,'TRAINING',30);
  const p=PANES[pane]||{};ovEl.dataset.pane=pane;ovEl.dataset.back=o.back!==undefined?o.back:(p.back||'');
  if(ovEl.dataset.kind==='menu')crumbSync();
  else if(pane==='pause'){$('ovEyebrow').textContent='Holding pattern';$('ovTitle').textContent='Paused'}
  else if(pane==='set'&&ovEl.dataset.kind==='pause'){$('ovEyebrow').textContent='Options';$('ovTitle').textContent='Settings'}
  if(pane==='set'){setSTab(sTab)}
  const el=$('mBody').querySelector('.pane[data-pane="'+pane+'"]');
  if(el){let i=0;for(const c of el.querySelectorAll('.nav>button,.rows .mr,.lessons li,.pList>*,.pGrid>*,.stabs>button')){c.style.setProperty('--i',i++)}
    el.classList.remove('in');void el.offsetWidth;el.classList.add('in')}
  for(const b of $('oTabs').querySelectorAll('button'))b.setAttribute('aria-selected',b.dataset.o===ovEl.dataset.over?'true':'false');
  camGoal(pane);prompts();uiSync();if(prev!==pane&&!o.quiet)focusFirst()}
const setPane=goPane;
function ensureQuick(){if(quickList().indexOf(mission)<0)drive($('bMission'),()=>mission,lastQuick,30);else lastQuick=mission}
function focusFirst(){requestAnimationFrame(()=>{if(ovEl.hidden)return;const f=focusables().find(e=>e!==$('mBack'));if(f)f.focus({preventScroll:true})})}
function focusables(){if(HG.on)return[...$('hangar').querySelectorAll('button:not(:disabled),input,select,[tabindex="0"]')].filter(e=>e.offsetParent!==null);
  const pane=$('mBody').querySelector('.pane[data-pane="'+ovEl.dataset.pane+'"]'),a=[];
  if(!$('mBack').hidden&&getComputedStyle($('mBack')).display!=='none')a.push($('mBack'));
  if(pane)for(const e of pane.querySelectorAll('button:not(:disabled),input,[tabindex="0"]'))if(e.tabIndex>=0&&e.offsetParent!==null&&!e.closest('[hidden]'))a.push(e);
  for(const e of $('dock').querySelectorAll('button:not(:disabled)'))if(e.offsetParent!==null)a.push(e);return a}
/* nav */
for(const b of $('mNav').querySelectorAll('button[data-go]'))b.addEventListener('click',()=>{uiSnd('sel');goPane(b.dataset.go)});
$('bHangar').addEventListener('click',()=>uiSnd('sel'));
$('mBack').addEventListener('click',()=>{uiSnd('back');goBack()});
function goBack(){const b=ovEl.dataset.back;if(b)goPane(b)}
$('mWallet').addEventListener('click',()=>{uiSnd('sel');if(ovEl.dataset.kind==='menu')goPane('pilot')});
$('bFirst').addEventListener('click',()=>goPane('train'));
$('bMenu').addEventListener('click',()=>{ovEl.dataset.kind='menu';$('bStart').textContent='Launch';$('bShare').hidden=true;$('bMenu').hidden=true;$('bOverHg').hidden=true;bgSync();goPane('main')});
$('bOverHg').addEventListener('click',()=>$('bHangar').click());
$('bPauseSet').addEventListener('click',()=>goPane('set',{back:'pause'}));
$('bRestart').addEventListener('click',()=>{if(state!=='paused')return;audioInit();startGame()});
for(const b of $('oTabs').querySelectorAll('button'))b.addEventListener('click',()=>{uiSnd('move');ovEl.dataset.over=b.dataset.o;goPane('over',{quiet:true});overTab()});
function overTab(){const o=ovEl.dataset.over,none=$('lbNone')||(()=>{const p=mk('p','dbKey','No scores yet. Fly a sortie.');p.id='lbNone';$('lbBox').parentNode.appendChild(p);return p})();none.hidden=!(o==='scores'&&$('lbBox').hidden)}
$('pressAny').closest('.pane').addEventListener('pointerdown',()=>dismissTitle());

/* ---- title screen ---- */
let titleDone=false;
function dismissTitle(){if(ovEl.dataset.pane!=='title')return;titleDone=true;audioInit();uiSnd('sel');goPane('main')}
addEventListener('keydown',e=>{if(ovEl.dataset.pane==='title'&&!ovEl.hidden&&!e.metaKey&&!e.ctrlKey&&!e.altKey&&['Shift','Control','Alt','Meta','Tab'].indexOf(e.key)<0){e.preventDefault();e.stopPropagation();dismissTitle()}},true);

/* ---- input prompts that follow the last device used ---- */
let inputMode=matchMedia('(pointer:coarse)').matches?'touch':'kb';ovEl.dataset.input=inputMode;
const kcap=k=>'<span class="kc">'+k+'</span>', gbtn=(k,c)=>'<span class="gb'+(c?' '+c:'')+'">'+k+'</span>';
const PR={kb:{sel:kcap('Enter'),back:kcap('Esc'),chg:kcap('&larr;')+kcap('&rarr;'),tabs:kcap('Q')+kcap('E'),mv:kcap('&uarr;')+kcap('&darr;')},
  pad:{sel:gbtn('A','a'),back:gbtn('B','b'),chg:gbtn('&#9664;')+gbtn('&#9654;'),tabs:gbtn('LB')+gbtn('RB'),mv:gbtn('&#9650;')+gbtn('&#9660;')},
  touch:{sel:'<span class="tp">Tap</span>',back:'<span class="tp">Back</span>',chg:'<span class="tp">Tap arrows</span>',tabs:'<span class="tp">Tap tabs</span>',mv:'<span class="tp">Swipe</span>'}};
function setInput(m){if(m===inputMode)return;inputMode=m;ovEl.dataset.input=m;prompts()}
addEventListener('keydown',()=>setInput('kb'),true);
addEventListener('pointerdown',e=>setInput(e.pointerType==='touch'?'touch':'kb'),true);
function prompts(){const p=ovEl.dataset.pane,m=PR[inputMode],box=$('mPrompts');let h='';
  const it=(g,t)=>'<span class="pi">'+g+'<em>'+t+'</em></span>';
  if(p==='title')h='';
  else if(p==='load')h='';
  else{if(inputMode!=='touch')h+=it(m.mv,'Move');h+=it(m.sel,'Select');
    if(['quick','online','set'].indexOf(p)>=0)h+=it(m.chg,'Change');
    if(p==='set'||p==='over')h+=it(m.tabs,'Tabs');
    if(ovEl.dataset.back)h+=it(m.back,'Back')}
  box.innerHTML=h;
  const lh=$('lHint');if(lh)lh.innerHTML=inputMode==='kb'?kcap('Enter'):inputMode==='pad'?gbtn('Menu','s'):''}

/* ---- briefing panels ---- */
function diagram(){const m=MIS_ART[mission]||MIS_ART.WAVES,p=MAP_ART[MAP]||MAP_ART.ISLANDS,id='dg'+MAP;
  return '<svg viewBox="0 0 200 104" preserveAspectRatio="xMidYMid slice" role="img" aria-label="Map diagram"><defs><linearGradient id="'+id+'" x1="0" y1="0" x2="1" y2="1"><stop offset="0" stop-color="'+p[0]+'"/><stop offset="1" stop-color="'+p[1]+'"/></linearGradient></defs>'+
    '<rect width="200" height="104" fill="url(#'+id+')"/><g fill="none" stroke="#fff" stroke-width=".35" opacity=".25">'+[40,80,120,160].map(x=>'<path d="M'+x+' 0v104"/>').join('')+[26,52,78].map(y=>'<path d="M0 '+y+'h200"/>').join('')+'</g>'+
    '<g transform="scale(2.08,1.73)" fill="none" stroke="#fff" stroke-width="1.2" opacity=".55">'+p[2]+'</g><rect width="200" height="104" fill="#05080b" opacity=".38"/>'+
    '<g fill="none" stroke="#fff" stroke-width=".6" opacity=".5"><circle cx="150" cy="46" r="26" stroke-dasharray="2 3"/><circle cx="150" cy="46" r="13" stroke-dasharray="2 3"/></g>'+
    '<g transform="translate(112,8) scale(.82)" stroke="#f2f6f3" stroke-width="1.6" fill="none">'+m[2]+'</g>'+
    '<path d="M26 82L150 46" stroke="#fff" stroke-width=".7" stroke-dasharray="3 3" opacity=".7"/><g fill="#fff" stroke="none"><path d="M26 78l5 8h-10z"/></g><text x="34" y="90" fill="#fff" font-size="6" letter-spacing="1" font-family="inherit">BASE</text>'+
    '<text x="170" y="98" fill="#fff" font-size="5.5" letter-spacing="1.2" font-family="inherit" opacity=".8">N &#8593;  50 KM</text></svg>'}
// the enemy battle-rating range for the selected mission, as the bandit picker will use it
const NO_FIGHTERS=['CONVOY','ANTISHIP','CRUISE','GROUNDWAR'];
function enemyBR(){if(NO_FIGHTERS.indexOf(mission)>=0)return null;
  const v=banditPool().filter(k=>banditType==='MIXED'||k===banditType||banditPool().indexOf(banditType)<0).map(progBR);return{lo:Math.min(...v),hi:Math.max(...v)}}
const kvs=a=>'<dl class="kvs">'+a.map(x=>'<div><dt>'+x[0]+'</dt><dd>'+x[1]+'</dd></div>').join('')+'</dl>';
function briefQuick(){const k=mission,mine=progBR(AC.id),er=enemyBR(),out=er&&(mine<er.lo-.001||mine>er.hi+.001);
  const rng=er?(er.lo===er.hi?er.lo.toFixed(1):er.lo.toFixed(1)+'–'+er.hi.toFixed(1)):'none';
  $('qBrief').innerHTML='<p class="eyebrow">Briefing</p><h2>'+MISSIONS[k]+'</h2>'+(out?'<p class="warnchip" role="status">Your BR '+mine.toFixed(1)+' is outside the enemy range '+rng+'</p>':'')+'<p class="txt">'+(MIS_BRIEF[k]||MIS_DESC[k]||'')+'</p><div class="diag">'+diagram()+'</div>'+
    kvs([['Aircraft',AC.name],['BR','<span id="brMine">'+mine.toFixed(1)+' ±0.7</span>'],['Enemy BR','<span id="brEnemy">'+rng+'</span>'],['Time',TMN[timeOfDay]],['Weather',WXN[weather]],['Map',MAP_NAME(MAP)]])}
function briefTrain(){const k=lesson,done=lessonsDone();$('trBrief').innerHTML='<p class="eyebrow">Lesson '+String(Object.keys(LESSONS).indexOf(k)+1).padStart(2,'0')+'</p><h2>'+LESSONS[k]+'</h2><p class="txt">'+(LES_BRIEF[k]||LES_DESC[k])+'</p>'+
  kvs([['Aircraft',AC.name],['Status',done[k]?'Complete':'Not yet flown'],['Lessons done',Object.keys(done).filter(x=>done[x]).length+' / '+Object.keys(LESSONS).length]])}
const lessonsDone=()=>{try{return JSON.parse(lsGet('vsLessonsDone','{}'))||{}}catch(e){return{}}};
function trainList(){const L=$('pLessons'),done=lessonsDone();if(!L.childElementCount){let n=0;for(const k of Object.keys(LESSONS)){const li=mk('li'),b=mk('button','les','<span class="no">'+String(++n).padStart(2,'0')+'</span><span class="nm"><b>'+LESSONS[k]+'</b><small>'+LES_DESC[k]+'</small></span><i class="tick" aria-hidden="true"></i>');b.type='button';b.dataset.k=k;
    b.addEventListener('click',()=>{uiSnd('move');drive($('bLesson'),()=>lesson,k,8);uiSync()});li.appendChild(b);L.appendChild(li)}}
  for(const li of L.children){const b=li.firstChild,k=b.dataset.k;b.setAttribute('aria-pressed',lesson===k?'true':'false');b.classList.toggle('done',!!done[k]);b.querySelector('.tick').innerHTML=done[k]?'<svg viewBox="0 0 16 12"><path d="M1 6l5 5L15 1"/></svg>':''}}
/* campaign map: sectors are points on a route from the base up to the enemy capital */
const OPP=[[56,206],[128,170],[96,126],[190,100],[262,64],[338,34]];
function campMapSvg(){if(typeof camp!=='object'||!camp)return;const S=SECTORS;let h='<defs><linearGradient id="opg" x1="0" y1="1" x2="1" y2="0"><stop offset="0" stop-color="#16303a"/><stop offset="1" stop-color="#0a1118"/></linearGradient></defs><rect width="400" height="240" fill="url(#opg)"/>';
  h+='<g stroke="#fff" stroke-width=".4" opacity=".12">'+[50,100,150,200,250,300,350].map(x=>'<path d="M'+x+' 0v240"/>').join('')+[40,80,120,160,200].map(y=>'<path d="M0 '+y+'h400"/>').join('')+'</g>';
  h+='<path d="M0 226C60 214 90 190 140 196S230 160 270 120 340 92 400 62V240H0z" fill="#1d3b2c" opacity=".5"/><path d="M0 226C60 214 90 190 140 196S230 160 270 120 340 92 400 62" fill="none" stroke="#9fd4a8" stroke-width=".8" opacity=".5"/>';
  let d='M'+OPP.map(p=>p.join(' ')).join('L');h+='<path d="'+d+'" fill="none" stroke="#fff" stroke-width="1" stroke-dasharray="4 4" opacity=".45"/>';
  const held=Math.min(camp.front,5);if(held>0)h+='<path d="M'+OPP.slice(0,held+1).map(p=>p.join(' ')).join('L')+'" fill="none" stroke="var(--acc)" stroke-width="2"/>';
  for(let i=0;i<6;i++){const [x,y]=OPP[i],blue=i<camp.front,front=i===camp.front;
    if(blue)h+='<g><circle cx="'+x+'" cy="'+y+'" r="6" fill="var(--acc)"/><path d="M'+(x-3)+' '+y+'l2.2 2.4 4-4.8" stroke="#05080b" stroke-width="1.5" fill="none"/></g>';
    else if(front)h+='<g><circle cx="'+x+'" cy="'+y+'" r="13" fill="none" stroke="#ffb347" stroke-width="1" opacity=".5"><animate attributeName="r" values="9;17;9" dur="2.4s" repeatCount="indefinite"/><animate attributeName="opacity" values=".7;0;.7" dur="2.4s" repeatCount="indefinite"/></circle><circle cx="'+x+'" cy="'+y+'" r="7" fill="#ffb347"/><circle cx="'+x+'" cy="'+y+'" r="2.4" fill="#05080b"/></g>';
    else h+='<path d="M'+x+' '+(y-7)+'l7 7-7 7-7-7z" fill="#05080b" stroke="#ff5a4e" stroke-width="1.6"/>';
    const lab=(front?S[i]+' · '+camp.str[i]+'%':S[i]).toUpperCase(),right=x<240;
    h+='<text x="'+(right?x+14:x-14)+'" y="'+(y+3.5)+'" text-anchor="'+(right?'start':'end')+'" fill="'+(front?'#ffb347':blue?'#e9eeea':'#c7d0cb')+'" font-size="10" letter-spacing="1.4" font-weight="600" font-family="inherit">'+lab+'</text>'}
  h+='<text x="14" y="228" fill="#fff" opacity=".6" font-size="8" letter-spacing="2" font-family="inherit">HOME BASE</text><text x="386" y="20" text-anchor="end" fill="#fff" opacity=".6" font-size="8" letter-spacing="2" font-family="inherit">ENEMY CAPITAL</text>';
  $('opSvg').innerHTML=h;
  const f=Math.min(camp.front,5);$('cpSec').textContent='Sector '+(f+1)+' of 6 · front line';$('cpName').textContent=SECTORS[f];
  $('cpKv').innerHTML=kvs([['Resistance',camp.str[f]+'%'],['Sortie',CAMP_SORTIES[campSortie]],['Sorties flown',camp.sorties],['Wins',camp.wins]])}

/* ---- keep everything in step with the game ---- */
const hgBgWant=()=>{const k=ovEl.dataset.kind;return !ovEl.hidden&&(k==='menu'||k==='over')&&(state==='menu'||state==='over')};
function bgSync(){const want=hgBgWant();
  if(want&&!HG.bg){HG.bg=true;projKey='';HG.zoom=1.4;HG.el=.1;HG.ang=1.05;HG.auto=false;hgEnter();HG.tgt.set(0,2.2,HG_JZ);camGoal(ovEl.dataset.pane)}
  else if(!want&&HG.bg){HG.bg=false;projKey='';if(!HG.on)hgLeave()}}
function rpTotal(){let t=prog.frp;for(const k in prog.rp)t+=prog.rp[k];return t}   // RP balance shown in the top bar: every aircraft's RP plus free RP
function wallet(){dailyRoll();const ri=rankIdx(career.xp),nx=RANKS[ri+1],base=RANKS[ri][0],pct=nx?Math.round((career.xp-base)/(nx[0]-base)*100):100;
  $('wCall').textContent=myCall().toUpperCase();$('wRank').textContent=RANKS[ri][1];const xb=$('wXp');xb.firstChild.style.width=pct+'%';xb.setAttribute('aria-valuenow',pct);xb.title=nx?career.xp.toLocaleString()+' / '+nx[0].toLocaleString()+' XP to '+nx[1]:'Top rank';
  $('wRP').textContent=rpTotal().toLocaleString();$('wSL').textContent=prog.sl.toLocaleString();$('wSLb').hidden=!careerOn}   // Silver Lions only exist in Career
const _showOverlay3=showOverlay;
showOverlay=function(kind){_showOverlay3(kind);if(!kind)return;const wasKind=ovEl.dataset.kind;ovEl.dataset.kind=kind;
  const over=kind==='over';
  {const host=over?$('mpOver'):$('mpPause');if(over)$('dock').insertBefore($('bReplay'),$('bMenu'));else $('pList').insertBefore($('bReplay'),$('bQuit'));host.querySelector('#ovLede')||host.insertBefore($('ovLede'),host.firstChild);
   if(over&&!$('oRep').contains($('ovLede')))$('oRep').insertBefore($('ovLede'),$('oRep').firstChild)}
  if(kind==='pause'){$('pSlot').appendChild($('bStart'));$('bStart').textContent='Resume';ovEl.dataset.result='';goPane('pause',{back:''});}
  else{$('dock').appendChild($('bStart'));
    if(over){ovEl.dataset.over='report';const win=deathCause==='win',fail=deathCause==='fail';ovEl.dataset.result=win?'win':'fail';
      $('ovTitle').textContent=win?'Mission success':deathCause==='abort'?'Sortie aborted':'Mission failed';
      if(mission==='TRAINING'&&win){const d=lessonsDone();d[lesson]=1;lsSet('vsLessonsDone',JSON.stringify(d))}
      goPane('over',{back:''});buildReport()}
    else{ovEl.dataset.result='';$('bStart').textContent='Launch';const p=ovEl.dataset.pane;goPane(['pause','over','load'].indexOf(p)>=0||wasKind!=='menu'?'main':p,{quiet:false})}}
  $('bMenu').hidden=!over;$('bOverHg').hidden=!over;bgSync();uiSync()};
/* the after-action report: numbers count up */
function buildReport(){const src={};for(const e of document.querySelectorAll('#ovStats .stat,#ovRew .stat'))src[e.children[0].textContent]=e.children[1].textContent;
  const ms=[...REC.msl.values()],mh=ms.filter(r=>r.res==='HIT').length,acc=gunShots>0?Math.round(gunHits/gunShots*100):null;
  const items=[['Score',src.Score],['Kills',src.Kills],['Gun accuracy',acc===null?'n/a':acc+'%'],['Missiles hit',ms.length?mh+' / '+ms.length:'n/a'],[mission==='WAVES'?'Wave':'Time',src.Wave||src.Time],['Max G',src['Max G']],
    ...(lastAward&&lastAward.prog&&lastAward.prog.breakdown?[]:[['XP',src.XP],['Silver Lions',src['Silver Lions']],['Free RP',src['Free RP']],['Repair cost',src.Repair]])].filter(x=>x[1]!=null);
  const g=$('repGrid');g.innerHTML='';let i=0;
  for(const [l,v] of items){const d=mk('div','rp','<span>'+l+'</span><b></b>');d.style.setProperty('--i',i++);g.appendChild(d);countUp(d.querySelector('b'),String(v),i)}
  buildItems();overTab()}
/* itemised rewards (Career): every line comes from progAward's breakdown and the lines add up to the totals */
const sgn=n=>(n<0?'−':'+')+Math.abs(n).toLocaleString();
function buildItems(){const box=$('ovItems');box.innerHTML='';const bd=lastAward&&lastAward.prog&&lastAward.prog.breakdown;box.hidden=!bd;if(!bd)return;
  const col=(h,lines,tot,totTxt)=>'<div class="itCol"><h4>'+h+'</h4>'+lines.map(l=>'<div class="it"><span>'+l[0]+'</span><b>'+sgn(l[1])+'</b></div>').join('')+'<div class="it tot"><span>'+totTxt+'</span><b>'+sgn(tot)+'</b></div></div>';
  box.innerHTML=col('Research points',bd.rp,bd.totalRp,'Total RP')+col('Silver Lions',bd.sl,bd.totalSl,'Total Silver Lions')+
    '<div class="itCol sum"><div class="it"><span>Repair cost</span><b>'+(bd.repair?'−'+bd.repair.toLocaleString():'none')+'</b></div><div class="it"><span>Free RP (10 % of RP)</span><b>'+sgn(bd.freeRp)+'</b></div></div>';
  let i=0;for(const e of box.querySelectorAll('.it')){e.style.setProperty('--i',i++)}}
function countUp(el,txt,i){const m=/^([+−-]?)([\d,]+)(.*)$/.exec(txt);if(!m||REDUCE||!FX.on){el.textContent=txt;return}
  const n=+m[2].replace(/,/g,''),t0=performance.now()+i*70,dur=900;el.textContent=m[1]+'0'+m[3];
  const f=t=>{const k=clamp((t-t0)/dur,0,1),e=1-Math.pow(1-k,3);el.textContent=m[1]+Math.round(n*e).toLocaleString()+m[3];if(k<1&&el.isConnected)requestAnimationFrame(f)};requestAnimationFrame(f)}
let syncQ=0;const uiSoon=()=>{if(!syncQ)syncQ=requestAnimationFrame(()=>{syncQ=0;uiSync()})};
new MutationObserver(uiSoon).observe($('legacy'),{subtree:true,childList:true,characterData:true,attributes:true,attributeFilter:['hidden']});
function uiSync(){
  for(const c of mCtls)c.sync();
  if(quickList().indexOf(mission)>=0)lastQuick=mission;
  wallet();dailyUI();crewUI();bnavSync();
  // main screen: current aircraft
  {const n=NODES[AC.id];$('acName').textContent=AC.name;$('acBr').textContent='BR '+progBR(AC.id).toFixed(1)+(careerOn?' · Career':' · Free play');$('hNat').textContent=n?NATIONS[n.n].n+' · Rank '+ROMAN[n.r]:'Aircraft';
   $('hLoad').textContent=$('bRole').textContent.replace(/^Loadout:\s*/,'').replace(/\s*▸$/,'')}
  if(ovEl.dataset.kind==='menu')crumbSync();
  const p=ovEl.dataset.pane;
  if(p==='quick')briefQuick();else if(p==='train'){trainList();briefTrain()}else if(p==='camp')campMapSvg();
  if(p==='online'){$('lobRoom').textContent=$('roomCode').value||'arena'}
  // pilot pane
  const pc=$('pgCareer');if(pc&&p==='pilot'){const ri=rankIdx(career.xp),nx=RANKS[ri+1],base=RANKS[ri][0],pct=nx?Math.round((career.xp-base)/(nx[0]-base)*100):100;
    pc.innerHTML='<b>'+RANKS[ri][1]+'</b><div class="bar"><i style="width:'+pct+'%"></i></div><div class="kv"><span>XP</span><b>'+career.xp.toLocaleString()+(nx?' / '+nx[0].toLocaleString():'')+'</b></div><div class="kv"><span>Silver Lions</span><b>'+prog.sl.toLocaleString()+'</b></div><div class="kv"><span>Free RP</span><b>'+prog.frp.toLocaleString()+'</b></div><div class="kv"><span>Sorties</span><b>'+(career.sorties||0)+'</b></div>';
    const cg=$('pgCamp');cg.innerHTML=typeof camp==='object'&&camp?'<div class="kv"><span>Front line</span><b>sector '+(camp.front+1)+' of 6</b></div><div class="kv"><span>Sorties · wins</span><b>'+camp.sorties+' · '+camp.wins+'</b></div>':'<p class="txt">No campaign yet.</p>';
    const pb=$('pBest'),rows=Object.keys(MISSIONS).map(k=>[k,lbGet(k)[0]]).filter(r=>r[1]);pb.innerHTML=rows.length?rows.map(r=>'<div class="kv"><span>'+MISSIONS[r[0]]+'</span><b>'+r[1].s+' pts · '+r[1].k+' kills</b></div>').join(''):'<p class="txt">Fly a sortie to set a score.</p>'}
}
{const _sml=setMenuLabels;setMenuLabels=function(){const r=_sml.apply(this,arguments);uiSoon();return r}}
{const _ap=applyAC;applyAC=function(){const r=_ap.apply(this,arguments);uiSoon();return r}}
{const _scu=syncCareerUI;syncCareerUI=function(){const r=_scu.apply(this,arguments);uiSoon();return r}}

/* ---- phones: bottom bar (Fly, Garage, Shop, Pilot) ---- */
for(const b of $('bNav').querySelectorAll('button'))b.addEventListener('click',()=>{uiSnd('sel');const k=b.dataset.b;
  if(k==='fly')goPane('main');else if(k==='pilot')goPane('pilot');else if(k==='garage')$('bHangar').click();else hgOpen('tree')});
function bnavSync(){const p=ovEl.dataset.pane;for(const b of $('bNav').querySelectorAll('button'))b.setAttribute('aria-current',(b.dataset.b==='pilot')===(p==='pilot')&&b.dataset.b!=='garage'&&b.dataset.b!=='shop'?'true':'false')}
/* ---- daily tasks and crew cards (Pilot pane) ---- */
function dailyUI(){if(ovEl.dataset.pane!=='pilot')return;const d=$('pgDaily');
  d.innerHTML=(careerOn?'':'<p class="txt">Daily tasks count in Career mode.</p>')+DAILY.map(t=>{const v=Math.min(t[2],Math.floor(daily[t[0]]||0)),done=!!daily.done[t[0]];
    return '<div class="dt'+(done?' done':'')+'"><span class="tk" aria-hidden="true">'+(done?'<svg viewBox="0 0 16 12"><path d="M1 6l5 5L15 1"/></svg>':'')+'</span><span class="nm">'+t[1]+'<small>'+v+' / '+t[2]+' · +'+t[3]+' RP</small></span></div>'}).join('')}
function crewUI(){if(ovEl.dataset.pane==='pilot')$('pgCrew').innerHTML=crewCards()}
$('pgCrew').addEventListener('click',e=>{const t=e.target.closest('[data-act=crew]');if(!t||t.disabled)return;if(progCrew(t.dataset.k)){uiSnd('sel');applyAC();syncCareerUI();uiSync();if(typeof progRender==='function')progRender()}});
setInterval(()=>{if(daily.d!==dayKey())uiSoon()},30000);
/* ---- loading screen between pressing Launch and the cockpit ---- */
const LOAD_TIPS=['Corner speed is where you turn the tightest. Stay near it in a fight.','Notch a radar missile: put it on your beam and drop chaff.','Flares beat heat seekers, chaff beats radar missiles. Do not mix them up.','Pull too many g for too long and you will black out. Ease off.','Energy is life. Do not trade your speed for a shot you cannot make.','The top of the throttle is afterburner. It burns fuel fast. Watch bingo.','Lock a radar contact with T, then fire when the shot is in range.'];
let loading=false;const _sg=startGame;
startGame=function(){if(loading)return;const args=arguments,self=this;
  if(NOLOAD||ovEl.hidden){return _sg.apply(self,args)}
  loading=true;ovEl.dataset.back='';const LD=+window.__loadMs||(state==='paused'?1100:4000);
  const m=mission==='TRAINING'?'Training: '+LESSONS[lesson]:MISSIONS[mission];
  $('ldKick').textContent='Sortie';$('ldName').textContent=m;$('ldMeta').textContent=AC.name+' · BR '+progBR(AC.id).toFixed(1)+' · '+TMN[timeOfDay]+', '+WXN[weather];
  // briefing card: the map, the goal, and who you are up against
  $('ldMap').innerHTML=diagram();$('ldMapName').textContent=MAP_NAME(MAP)+' · '+(MAP_DESC[MAP]||'');$('ldGoal').textContent='Goal: '+(MIS_BRIEF[mission]||MIS_DESC[mission]||'');
  $('ldWho').textContent=mission==='TRAINING'?'Lesson: '+LESSONS[lesson]+' · '+(LES_DESC[lesson]||''):NO_FIGHTERS.indexOf(mission)>=0?'No fighters expected.':'Bandits: '+(BANDITS[banditType]||banditType);
  $('ldTip').textContent=LOAD_TIPS[Math.floor(Math.random()*LOAD_TIPS.length)];$('ldState').textContent='Loading';
  const bar=$('ldBar');bar.style.transition='none';bar.style.width='0%';
  ovEl.dataset.prev=ovEl.dataset.pane;ovEl.dataset.pane='load';prompts();void bar.offsetWidth;bar.style.transition='width '+(REDUCE?60:Math.min(LD-100,1000))+'ms linear';bar.style.width='100%';
  let t1=0,t2=0;const pane=$('mpLoad');
  const go=()=>{if(!loading)return;loading=false;clearTimeout(t1);clearTimeout(t2);pane.removeEventListener('pointerdown',go);removeEventListener('keydown',key,true);try{_sg.apply(self,args)}finally{last=performance.now()}};
  const key=e=>{if(['Shift','Control','Alt','Meta','Tab'].indexOf(e.key)<0){e.preventDefault();e.stopPropagation();go()}};
  pane.addEventListener('pointerdown',go);addEventListener('keydown',key,true);   // tap or press anything to skip; it starts by itself when the timer runs out
  t1=setTimeout(()=>{$('ldState').textContent=inputMode==='touch'?'Ready · tap to start':'Ready · press any key'},REDUCE?40:Math.min(LD-250,1100));
  t2=setTimeout(go,REDUCE?80:LD)};

/* ---- keyboard and gamepad ---- */
function moveFocus(d){const f=focusables(),i=f.indexOf(document.activeElement);if(!f.length)return;f[i<0?(d>0?0:f.length-1):clamp(i+d,0,f.length-1)].focus();uiSnd('move')}
function tabStep(d){const g=ovEl.dataset.pane==='set'?$('sTabs'):ovEl.dataset.pane==='over'?$('oTabs'):HG.on?$('hangar').querySelector('.hgTabs'):null;if(!g)return false;
  const bs=[...g.querySelectorAll('button')],i=bs.findIndex(b=>b.getAttribute('aria-selected')==='true'||b.classList.contains('on')||b.getAttribute('aria-pressed')==='true');bs[clamp((i<0?0:i)+d,0,bs.length-1)].click();uiSnd('move');return true}
addEventListener('keydown',e=>{if(ovEl.hidden||HG.on||loading||ovEl.dataset.pane==='title')return;if(state!=='menu'&&state!=='over'&&state!=='paused')return;
  const t=e.target;if(t&&t.tagName==='INPUT'&&t.type!=='range')return;
  if(e.key==='ArrowDown'){e.preventDefault();e.stopPropagation();moveFocus(1)}
  else if(e.key==='ArrowUp'){e.preventDefault();e.stopPropagation();moveFocus(-1)}
  else if(e.key==='ArrowLeft'||e.key==='ArrowRight'){const r=t&&t.closest&&t.closest('.mr');if(r&&r._step&&t.type==='range'){e.preventDefault();e.stopPropagation();r._step(e.key==='ArrowRight'?1:-1)}}
  else if(e.key==='Escape'&&ovEl.dataset.back){e.preventDefault();e.stopPropagation();uiSnd('back');goBack()}
  else if((e.key==='q'||e.key==='Q'||e.key==='['))tabStep(-1);else if((e.key==='e'||e.key==='E'||e.key===']'))tabStep(1);
  else if(e.key==='Enter'&&(!t||t===document.body)&&$('dock').offsetParent&&!$('bStart').hidden&&['quick','camp','online','train','over','pause'].indexOf(ovEl.dataset.pane)>=0){e.preventDefault();$('bStart').click()}},true);
const GPM={prev:[],dir:[0,0,0,0],t:0};
function gpMenuTick(){const menuUp=(!ovEl.hidden||HG.on)&&(state==='menu'||state==='over'||state==='paused');if(!menuUp)return;
  let pad=null;try{pad=[...(navigator.getGamepads?navigator.getGamepads():[])].find(p=>p&&p.connected)}catch(e){}if(!pad)return;
  const b=i=>!!(pad.buttons[i]&&pad.buttons[i].pressed),edge=i=>b(i)&&!GPM.prev[i];
  const ax=pad.axes||[],dir=[b(12)||ax[1]<-.6,b(13)||ax[1]>.6,b(14)||ax[0]<-.6,b(15)||ax[0]>.6].map(Boolean),de=i=>dir[i]&&!GPM.dir[i];
  if(pad.buttons.some(x=>x.pressed)||dir.some(Boolean))setInput('pad');
  if(ovEl.dataset.pane==='title'&&!ovEl.hidden){if(pad.buttons.some((x,i)=>x.pressed&&!GPM.prev[i]))dismissTitle()}
  else if(!loading){
    const cur=document.activeElement,row=cur&&cur.closest&&cur.closest('.mr');
    if(HG.on){const f=focusables(),ci=f.indexOf(cur),go=d=>{if(f.length)f[(ci<0?(d>0?0:f.length-1):(ci+d+f.length)%f.length)].focus()};if(de(1)||de(3))go(1);if(de(0)||de(2))go(-1)}
    else{if(de(1))moveFocus(1);if(de(0))moveFocus(-1);if((de(2)||de(3))&&row&&row._step)row._step(de(3)?1:-1)}
    if(edge(0)&&cur&&cur!==document.body&&focusables().includes(cur))cur.click();
    if(edge(1)){if(HG.on)hgClose();else if(ovEl.dataset.back){uiSnd('back');goBack()}}
    if(edge(4)||edge(5))tabStep(edge(5)?1:-1);
    if(edge(9)&&!HG.on&&['quick','camp','online','train','over'].indexOf(ovEl.dataset.pane)>=0)$('bStart').click()}
  GPM.prev=pad.buttons.map(x=>x.pressed);GPM.dir=dir}
setInterval(gpMenuTick,90);
/* grain: a tiny noise canvas redrawn a few times a second while the menu is up */
{const cv=$('grain'),cx=cv.getContext('2d'),im=cx.createImageData(96,96);
  const draw=()=>{if(ovEl.hidden||ovEl.dataset.fx==='off'||document.hidden)return;const d=im.data;for(let i=0;i<d.length;i+=4){const v=Math.random()*255|0;d[i]=d[i+1]=d[i+2]=v;d[i+3]=Math.random()*70|0}cx.putImageData(im,0,0)};
  draw();if(!REDUCE)setInterval(draw,120)}
/* in-flight button states: out of ammo, gear locked on the ground */
function btnStates(){if($('ctrls').hidden)return;const set=(id,on,cls)=>{const e=$(id);if(e)e.classList.toggle(cls,!!on)};
  set('bGun',P.rounds<=0,'empty');set('b9',P.aim9<=0,'empty');set('b120',P.aim120<=0,'empty');set('bGear',P.onGround,'off');$('bGear').setAttribute('aria-disabled',P.onGround?'true':'false');
  if(typeof AG!=='undefined'&&AG.load)set('bAg',AG.load.reduce((a,l)=>a+l.n,0)<=0,'empty')}
setInterval(btnStates,200);
/* start up: title screen unless switched off (tests, or Settings > Cinematic menu is irrelevant here) */
ovEl.dataset.kind='menu';setSTab('ctl');
{const skip=/[?&]notitle\b/.test(location.search)||lsGet('vsTitle','1')==='0';goPane(skip?'main':'title',{quiet:true});if(skip)titleDone=true}
bgSync();uiSync();
if(/[?&]test\b/.test(location.search))Object.assign(window.__vs||{},{setPane:goPane,uiSync,dismissTitle});
