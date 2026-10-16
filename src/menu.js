
/* ---------------- redesigned menu: Fly / Settings / Pilot tabs, segmented controls, toggles, sliders, card sheets ----------------
   The original cycle buttons live on, hidden, inside #legacy; every control below drives them (so their handlers, saved settings and tests keep working)
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
  CONVOY:'Stop at least 4 of 5 trucks before they escape.',ANTISHIP:'Sink the frigate NE of the base. It has SAMs.',CRUISE:'Cruise missiles inbound on the base. Shoot them down.',
  CAMPAIGN:'A moving front line. Losses stay lost.',ONLINE:'Dogfight other pilots in a shared room.',TRAINING:'Guided lessons: dogfighting, missile defence, landing, refuelling.'};
const MAP_DESC={ISLANDS:'Green islands and sheltered bays.',DESERT:'Dry canyons and low valleys.',ALPINE:'Snowy peaks under heavy cloud.',OCEAN:'Open sea. Nothing to hide behind.'};
const MAP_NAME=k=>({ISLANDS:'Islands',DESERT:'Desert canyons',ALPINE:'Snowy alps',OCEAN:'Open ocean'})[k]||k;
const LES_DESC={BFM:'Basic fighter manoeuvres and gun shots',DEFENSE:'Defeat three inbound missiles',BVR:'Long-range radar missile shot',LANDING:'Land on the runway',REFUEL:'Take fuel from the tanker'};

/* ---- controls ---- */
const ctls=[];                                   // each has sync()
function seg(label,opts,cur,pick,extra){const w=mk('div','ctl'),g=mk('div','seg');g.setAttribute('role','radiogroup');g.setAttribute('aria-label',label);if(label)w.appendChild(mk('span','cap',label));w.appendChild(g);
  if(extra&&extra.span)w.classList.add('w'+extra.span);const c={w,sync(){const o=opts(),had=g.contains(document.activeElement);g.innerHTML='';const cv=cur();o.forEach((x,i)=>{const b=mk('button','',x.t);b.type='button';b.setAttribute('role','radio');b.setAttribute('aria-checked',x.v===cv?'true':'false');b.tabIndex=x.v===cv||(i===0&&!o.some(y=>y.v===cv))?0:-1;if(x.dis)b.disabled=true;
      b.addEventListener('click',()=>{if(x.v!==cur()){pick(x.v);uiSync()}});g.appendChild(b)});if(had){const n=g.querySelector('[aria-checked=true]')||g.firstChild;if(n)n.focus()}if(extra&&extra.hidden)w.hidden=extra.hidden()}};
  g.addEventListener('keydown',e=>{if(e.key!=='ArrowLeft'&&e.key!=='ArrowRight')return;const bs=[...g.querySelectorAll('button:not(:disabled)')],i=bs.indexOf(document.activeElement);if(i<0)return;e.preventDefault();bs[(i+(e.key==='ArrowRight'?1:bs.length-1))%bs.length].click();setTimeout(()=>{const n=g.querySelector('[aria-checked=true]');if(n)n.focus()},0)});
  ctls.push(c);return w}
function tog(label,cur,click){const b=mk('button','tog','<span>'+label+'</span><i></i>');b.type='button';b.setAttribute('role','switch');
  b.addEventListener('click',()=>{click();uiSync()});ctls.push({w:b,sync(){b.setAttribute('aria-checked',cur()?'true':'false')}});return b}
function rng(label,n,cur,set,fmt){const w=mk('div','rng','<div><span>'+label+'</span><output></output></div>'),i=mk('input');i.type='range';i.min=0;i.max=n-1;i.step=1;i.setAttribute('aria-label',label);w.appendChild(i);
  i.addEventListener('input',()=>{set(+i.value);uiSync()});ctls.push({w,sync(){i.value=cur();w.querySelector('output').textContent=fmt(cur())}});return w}
function chip(label,txt,onclick,hid){const b=mk('button','chipbtn','<em style="font-style:normal">'+label+'</em><span></span>');b.type='button';b.addEventListener('click',onclick);const w=mk('div','ctl');w.appendChild(b);ctls.push({w,sync(){b.querySelector('span').textContent=txt();if(hid)w.hidden=hid()}});return w}
const short=(t,n)=>t.length>n?t.slice(0,n-1)+'.':t;
const WXN={CLEAR:'Clear',SCATTERED:'Partly',OVERCAST:'Overcast',RAIN:'Rain'}, TMN={DAY:'Day',DUSK:'Dusk',NIGHT:'Night'};
const startCur=()=>!startOnRunway?'air':startCV?'cv':'rwy';

/* ---- FLY tab: right-hand controls ---- */
const fc=$('fCtl');
fc.appendChild(seg('Start',()=>[{v:'air',t:'Air'},{v:'rwy',t:'Runway'},...(AC.carrier?[{v:'cv',t:'Carrier'}]:[])],startCur,v=>drive($('bStartPos'),startCur,v,4)));
fc.appendChild(seg('Time',()=>Object.keys(TIMES).map(k=>({v:k,t:TMN[k]})),()=>timeOfDay,v=>drive($('bTime'),()=>timeOfDay,v)));
fc.appendChild(seg('Weather',()=>Object.keys(WXS).map(k=>({v:k,t:WXN[k]})),()=>weather,v=>drive($('bWx'),()=>weather,v),{span:3}));
fc.appendChild(seg('Difficulty',()=>Object.keys(DIFF).map(k=>({v:k,t:DIFF[k].name})),()=>difficulty,v=>drive($('bDiff'),()=>difficulty,v),{span:3,hidden:()=>$('bDiff').hidden}));
fc.appendChild(seg('Engagement range',()=>Object.keys(ENG_RANGES).map(k=>({v:k,t:ENG_RANGES[k].n})),()=>rangeKey,v=>drive($('bRange'),()=>rangeKey,v)));
fc.appendChild(seg('Mode',()=>[{v:'free',t:'Free'},{v:'career',t:'Career'}],()=>careerOn?'career':'free',v=>drive($('bMode'),()=>careerOn?'career':'free',v,2)));
fc.appendChild(chip('Bandits',()=>BANDITS[banditType]||banditType,()=>openSheet('bandit'),()=>$('bBandit').hidden));
fc.appendChild(chip('Lesson',()=>LESSONS[lesson],()=>openSheet('lesson'),()=>$('bLesson').hidden));
{const on=mk('div','online');fc.appendChild(on);const rr=$('roomRow');on.appendChild(rr);rr.hidden=false;on.appendChild(seg('Online mode',()=>[{v:'TEAMS',t:'Teams'},{v:'FFA',t:'Free for all'}],()=>NET.mode,v=>drive($('bNetMode'),()=>NET.mode,v,2)));
  on.appendChild(seg('Team',()=>[{v:'A',t:'Auto'},{v:'B',t:'Blue'},{v:'R',t:'Red'}],()=>NET.teamPref,v=>drive($('bTeam'),()=>NET.teamPref,v,3),{hidden:()=>NET.mode!=='TEAMS'}));
  ctls.push({w:on,sync(){on.hidden=mission!=='ONLINE'}})}
fc.appendChild($('firstRun'));   // slim first-flight hint across the control grid
// campaign and lobby panels live under the controls on the Fly tab
/* ---- SETTINGS tab ---- */
{const g=$('sCtl'),box=t=>{const b=mk('div','sBox');b.appendChild(mk('p','cap',t));g.appendChild(b);return b};
  let b=box('Controls');
  b.appendChild(seg('Stick',()=>[{v:'stick',t:'Touch stick'},{v:'tilt',t:'Tilt'}],()=>tilt.on?'tilt':'stick',v=>{if((v==='tilt')!==tilt.on)$('bTilt').click()}));
  b.appendChild(tog('Pull back to climb',()=>!invert,()=>$('bInvert').click()));
  b.appendChild(rng('Stick sensitivity',Object.keys(SENS).length,()=>Object.keys(SENS).indexOf(sens),i=>drive($('bSens'),()=>sens,Object.keys(SENS)[i],4),i=>Object.keys(SENS)[i]));
  b.appendChild(rng('Dead zone',DZS.length,()=>dz,i=>drive($('bDz'),()=>dz,i,6),i=>Math.round(DZS[i]*100)+' %'));
  b=box('Sound and feel');
  b.appendChild(tog('Sound',()=>A.on,()=>$('bSound').click()));b.appendChild(tog('Voice warnings',()=>VOICE.on,()=>$('bVoice').click()));b.appendChild(tog('Vibration',()=>hapticsOn,()=>$('bHaptic').click()));b.appendChild(tog('Kill cam',()=>KC.on,()=>$('bKc').click()));
  b=box('Display');
  b.appendChild(seg('Graphics',()=>Object.keys(QUALS).map(k=>({v:k,t:({LOW:'Low',MED:'Medium',HIGH:'High'})[k]})),()=>quality,v=>drive($('bQual'),()=>quality,v,4)));
  b.appendChild(seg('HUD colours',()=>[{v:'green',t:'Green'},{v:'cb',t:'Blue / orange'}],()=>palKey,v=>drive($('bPal'),()=>palKey,v,3)));
  b.appendChild(seg('HUD text size',()=>TXT_SIZES.map(k=>({v:k,t:Math.round(k*100)+'%'})),()=>txtK,v=>drive($('bText'),()=>txtK,v,4)))}

/* ---- sheets (bottom sheet of cards for long lists) ---- */
let sheetOpener=null;
function openSheet(kind){const L=$('sheetList');L.innerHTML='';sheetOpener=document.activeElement;let title,items,cur,pick,plain=false;
  if(kind==='mission'){title='Choose a mission';items=Object.keys(MISSIONS).map(k=>({v:k,name:MISSIONS[k],desc:MIS_DESC[k]||'',art:MIS_ART[k]}));cur=mission;pick=v=>drive($('bMission'),()=>mission,v,30)}
  else if(kind==='map'){title='Choose a map';items=Object.keys(MAPS).map(k=>({v:k,name:MAP_NAME(k),desc:MAP_DESC[k],art:MAP_ART[k]}));cur=MAP;pick=v=>drive($('bMap'),()=>MAP,v,6)}
  else if(kind==='bandit'){title='Choose the bandits';plain=true;items=Object.keys(BANDITS).map(k=>({v:k,name:BANDITS[k],desc:k==='MIXED'?'Random jets (matched to your BR in Career)':'BR '+progBR(k).toFixed(1)}));cur=banditType;pick=v=>drive($('bBandit'),()=>banditType,v,24)}
  else{title='Choose a lesson';items=Object.keys(LESSONS).map(k=>({v:k,name:LESSONS[k],desc:LES_DESC[k],art:MIS_ART.TRAINING}));cur=lesson;pick=v=>drive($('bLesson'),()=>lesson,v,8)}
  $('sheetTitle').textContent=title;
  for(const it of items){const b=mk('button','opt'+(plain?' plain':''),(it.art?'<span class="art">'+svgArt(it.art[0],it.art[1],it.art[2])+'</span>':'')+'<span class="ptext"><b>'+it.name+'</b><em>'+it.desc+'</em></span>');b.type='button';b.setAttribute('role','radio');b.setAttribute('aria-checked',it.v===cur?'true':'false');
    b.addEventListener('click',()=>{pick(it.v);closeSheet();uiSync()});L.appendChild(b)}
  $('sheet').hidden=false;const s=L.querySelector('[aria-checked=true]')||L.firstChild;if(s){s.focus();s.scrollIntoView({block:'nearest'})}}
function closeSheet(){if($('sheet').hidden)return;$('sheet').hidden=true;if(sheetOpener&&sheetOpener.isConnected)sheetOpener.focus();sheetOpener=null}
$('sheetClose').addEventListener('click',closeSheet);$('sheetBack').addEventListener('click',closeSheet);
$('cMission').addEventListener('click',()=>openSheet('mission'));$('cMap').addEventListener('click',()=>openSheet('map'));
$('sheet').addEventListener('keydown',e=>{if(e.key==='Escape'){e.stopPropagation();closeSheet()}});

/* ---- tabs and views ---- */
function setPane(pane,nav){ovEl.dataset.pane=pane;ovEl.dataset.nav=nav||'';
  for(const b of $('mTabs').querySelectorAll('button'))b.setAttribute('aria-selected',b.dataset.t===pane?'true':'false');
  for(const b of $('oTabs').querySelectorAll('button'))b.setAttribute('aria-selected',b.dataset.o===ovEl.dataset.over?'true':'false');
  $('mBody').scrollTop=0}
for(const b of $('mTabs').querySelectorAll('button'))b.addEventListener('click',()=>{setPane(b.dataset.t,'tabs');uiSync()});
$('mTabs').addEventListener('keydown',e=>{if(e.key!=='ArrowLeft'&&e.key!=='ArrowRight')return;const bs=[...$('mTabs').querySelectorAll('button')],i=bs.indexOf(document.activeElement);if(i<0)return;e.preventDefault();const n=bs[(i+(e.key==='ArrowRight'?1:bs.length-1))%bs.length];n.focus();n.click()});
for(const b of $('oTabs').querySelectorAll('button'))b.addEventListener('click',()=>{ovEl.dataset.over=b.dataset.o;setPane('over','over')});
$('bMenu').addEventListener('click',()=>{setPane('fly','tabs');uiSync()});
$('bPauseSet').addEventListener('click',()=>setPane('set','back'));
$('mBack').addEventListener('click',()=>setPane('pause',''));
$('bRestart').addEventListener('click',()=>{if(state!=='paused')return;closeSheet();audioInit();startGame();last=performance.now()});

/* ---- keep everything in step with the game ---- */
function modeKind(){return ovEl.dataset.kind||'menu'}
const _showOverlay3=showOverlay;
showOverlay=function(kind){_showOverlay3(kind);if(!kind)return;ovEl.dataset.kind=kind;closeSheet();
  // the debrief gets the lede (promotions, rescue notes) and a Watch replay button; the pause sheet keeps its own
  {const over=kind==='over',host=over?$('mpOver'):$('mpPause');host.insertBefore($('ovLede'),host.firstChild);
   if(over)$('mBar').querySelector('.mActs').insertBefore($('bReplay'),$('bMenu'));else $('pList').insertBefore($('bReplay'),$('bPauseSet'))}
  if(kind==='pause'){setPane('pause','');$('pSlot').appendChild($('bStart'));$('bStart').classList.add('primary')}
  else{$('mBar').querySelector('.mActs').appendChild($('bStart'));if(kind==='over'){ovEl.dataset.over='replay';setPane('over','over')}}
  $('bMenu').hidden=kind!=='over';uiSync()};
let syncQ=0;const uiSoon=()=>{if(!syncQ)syncQ=requestAnimationFrame(()=>{syncQ=0;uiSync()})};
new MutationObserver(uiSoon).observe($('legacy'),{subtree:true,childList:true,characterData:true,attributes:true,attributeFilter:['hidden']});
function uiSync(){
  for(const c of ctls)c.sync();
  // aircraft card and mission / map cards
  $('acName').textContent=AC.name;$('acBr').textContent='BR '+progBR(AC.id).toFixed(1)+(careerOn?' · Career':'');
  const m=MIS_ART[mission]||MIS_ART.WAVES;$('cMissionArt').innerHTML=svgArt(m[0],m[1],m[2]);$('cMissionName').textContent=MISSIONS[mission];$('cMissionDesc').textContent=mission==='TRAINING'?(LESSONS[lesson]+': '+(LES_DESC[lesson]||'')):(MIS_DESC[mission]||'');
  const p=MAP_ART[MAP]||MAP_ART.ISLANDS;$('cMapArt').innerHTML=svgArt(p[0],p[1],p[2]);$('cMapName').textContent=MAP_NAME(MAP);$('cMapDesc').textContent=MAP_DESC[MAP]||'';
  // footer: one-line summary and the hangar button
  $('mSum').textContent=ovEl.dataset.kind==='over'?(($('ovTitle').textContent||'')+' · '+score+' pts · '+kills+' kill'+(kills===1?'':'s')):AC.name+' · BR '+progBR(AC.id).toFixed(1)+' · '+MISSIONS[mission]+' · '+MAP_NAME(MAP)+' · '+TMN[timeOfDay]+', '+(WXN[weather]||weather);
  $('hgSub').textContent=AC.name+(careerOn?' · '+prog.sl.toLocaleString()+' SL · '+prog.frp.toLocaleString()+' RP':'');
  // pilot tab
  const pc=$('pgCareer');if(pc){const ri=rankIdx(career.xp),nx=RANKS[ri+1],base=RANKS[ri][0],pct=nx?Math.round((career.xp-base)/(nx[0]-base)*100):100;
    pc.innerHTML='<b>'+RANKS[ri][1]+'</b><div class="bar"><i style="width:'+pct+'%"></i></div><div class="kv"><span>XP</span><b>'+career.xp.toLocaleString()+(nx?' / '+nx[0].toLocaleString():'')+'</b></div><div class="kv"><span>Silver Lions</span><b>'+prog.sl.toLocaleString()+'</b></div><div class="kv"><span>Free RP</span><b>'+prog.frp.toLocaleString()+'</b></div><div class="kv"><span>Sorties · wins · kills</span><b>'+career.sorties+' · '+career.wins+' · '+career.kills+'</b></div>'+(careerOn?'':'<p class="cap" style="color:var(--warn)">Career mode is off</p>')}
  const cg=$('pgCamp');if(cg){cg.innerHTML=typeof camp==='object'&&camp?'<div class="kv"><span>Front line</span><b>sector '+camp.front+' of 5</b></div><div class="kv"><span>Sorties · wins</span><b>'+camp.sorties+' · '+camp.wins+'</b></div>':'<p>No campaign yet.</p>';
    const b=mk('button','ghost','Open campaign');b.type='button';b.addEventListener('click',()=>{drive($('bMission'),()=>mission,'CAMPAIGN',30);setPane('fly','tabs');uiSync()});cg.appendChild(b)}
  const pb=$('pBest');if(pb){const rows=Object.keys(MISSIONS).map(k=>[k,lbGet(k)[0]]).filter(r=>r[1]);pb.innerHTML=rows.length?rows.map(r=>'<div class="kv"><span>'+MISSIONS[r[0]]+'</span><b>'+r[1].s+' pts · '+r[1].k+' kills</b></div>').join(''):'<p>Fly a sortie to set your first score.</p>'}
  const pl=$('pLessons');if(pl&&!pl.childElementCount){for(const k of Object.keys(LESSONS)){const b=mk('button','lesson',LESSONS[k]+'<span>'+LES_DESC[k]+'</span>');b.type='button';b.dataset.k=k;b.addEventListener('click',()=>{drive($('bMission'),()=>mission,'TRAINING',30);drive($('bLesson'),()=>lesson,k,8);setPane('fly','tabs');uiSync()});pl.appendChild(b)}}
  if(pl)for(const b of pl.children)b.setAttribute('aria-pressed',mission==='TRAINING'&&lesson===b.dataset.k?'true':'false');
}
// other code refreshes these labels, so re-sync after them
{const _sml=setMenuLabels;setMenuLabels=function(){const r=_sml.apply(this,arguments);uiSoon();return r}}
{const _ap=applyAC;applyAC=function(){const r=_ap.apply(this,arguments);uiSoon();return r}}
{const _scu=syncCareerUI;syncCareerUI=function(){const r=_scu.apply(this,arguments);uiSoon();return r}}
ovEl.dataset.kind='menu';setPane('fly','tabs');uiSync();

/* ---- keyboard and gamepad ---- */
addEventListener('keydown',e=>{if(e.key==='Escape'&&!$('sheet').hidden){closeSheet();e.stopPropagation()}
  else if(e.key==='Escape'&&!ovEl.hidden&&ovEl.dataset.nav==='back'){setPane('pause','');e.stopPropagation()}},true);
const GPM={prev:[],t:0};
function gpFocusables(){const root=!$('sheet').hidden?$('sheet'):HG.on?$('hangar'):ovEl;return [...root.querySelectorAll('button:not(:disabled),input,summary,[tabindex="0"]')].filter(e=>e.offsetParent!==null&&!e.closest('[hidden]'))}
function gpMenuTick(){const menuUp=(!ovEl.hidden||HG.on)&&(state==='menu'||state==='over'||state==='paused');if(!menuUp)return;
  let pad=null;try{pad=[...(navigator.getGamepads?navigator.getGamepads():[])].find(p=>p&&p.connected)}catch(e){}if(!pad)return;
  const b=i=>!!(pad.buttons[i]&&pad.buttons[i].pressed),edge=i=>b(i)&&!GPM.prev[i];
  const f=gpFocusables(),cur=f.indexOf(document.activeElement);const go=d=>{if(!f.length)return;f[(cur<0?(d>0?0:f.length-1):(cur+d+f.length)%f.length)].focus()};
  if(edge(13)||edge(15))go(1);if(edge(12)||edge(14))go(-1);
  if(edge(0)&&document.activeElement&&f.includes(document.activeElement))document.activeElement.click();
  if(edge(1)){if(!$('sheet').hidden)closeSheet();else if(HG.on)hgClose();else if(ovEl.dataset.nav==='back')setPane('pause','')}
  if(edge(4)||edge(5)){const t=['fly','set','pilot'],i=t.indexOf(ovEl.dataset.pane);if(i>=0&&ovEl.dataset.nav==='tabs'){setPane(t[(i+(edge(5)?1:2))%3],'tabs');uiSync()}}
  if(edge(9)&&!HG.on&&ovEl.dataset.pane!=='pause')$('bStart').click();
  GPM.prev=pad.buttons.map(x=>x.pressed)}
setInterval(gpMenuTick,90);
/* in-flight button states: out of ammo, gear locked on the ground */
function btnStates(){if($('ctrls').hidden)return;const set=(id,on,cls)=>{const e=$(id);if(e)e.classList.toggle(cls,!!on)};
  set('bGun',P.rounds<=0,'empty');set('b9',P.aim9<=0,'empty');set('b120',P.aim120<=0,'empty');set('bGear',P.onGround,'off');$('bGear').setAttribute('aria-disabled',P.onGround?'true':'false');
  if(typeof AG!=='undefined'&&AG.load)set('bAg',AG.load.reduce((a,l)=>a+l.n,0)<=0,'empty')}
setInterval(btnStates,200);
if(/[?&]test\b/.test(location.search))Object.assign(window.__vs||{},{setPane,uiSync,openSheet,closeSheet});
