
/* ---------------- progression (War Thunder style): research points, silver lions, tech trees, modules, crew ----------------
   Career mode only. RP earned in a sortie go to the aircraft you flew (and 10 % to Free RP); an aircraft is researched with RP from the
   aircraft it descends from (or Free RP), then bought with Silver Lions. Modules and crew skills improve what you own. Bandits are picked near your BR. */
const NATIONS={USA:{n:'United States',c:'#6fb7ff'},RUS:{n:'Russia',c:'#ff8a7a'},GER:{n:'Germany',c:'#cfd3d8'},JPN:{n:'Japan',c:'#ff6f91'},ISR:{n:'Israel',c:'#7fd6ff'},SWE:{n:'Sweden',c:'#ffd166'},GBR:{n:'United Kingdom',c:'#b69cff'},CHN:{n:'China',c:'#ff9d4e'},FRA:{n:'France',c:'#8ea8ff'}};
// battle ratings follow War Thunder's Realistic air battles where an equivalent jet exists there (wiki.warthunder.com, checked Oct 2026; BRs move with patches), estimates otherwise (see README)
const NODES={
  F4E:{n:'USA',r:1,br:11.3},F16:{n:'USA',r:4,br:13.7,req:'F4E'},F15C:{n:'USA',r:4,br:13.7,req:'F4E'},FA18C:{n:'USA',r:4,br:14.0,req:'F4E'},F15E:{n:'USA',r:4,br:14.0,req:'F15C'},F16B70:{n:'USA',r:5,br:14.3,req:'F16'},FA18E:{n:'USA',r:5,br:14.3,req:'FA18C'},F35A:{n:'USA',r:5,br:14.0,req:'F16B70'},F15EX:{n:'USA',r:5,br:14.0,req:'F15E'},F22A:{n:'USA',r:5,br:14.0,req:'F15EX'},
  MIG21:{n:'RUS',r:1,br:11.0},MIG29:{n:'RUS',r:2,br:12.7,req:'MIG21'},SU27:{n:'RUS',r:3,br:13.7,req:'MIG29'},MIG29UPG:{n:'RUS',r:3,br:13.3,req:'MIG29'},SU33:{n:'RUS',r:3,br:13.0,req:'SU27'},MIG29K:{n:'RUS',r:3,br:13.7,req:'MIG29UPG'},SU30SM:{n:'RUS',r:5,br:14.3,req:'SU27'},MIG35:{n:'RUS',r:4,br:14.3,req:'MIG29UPG'},SU35:{n:'RUS',r:5,br:14.0,req:'MIG35'},SU57:{n:'RUS',r:5,br:14.0,req:'SU35'},
  F104G:{n:'GER',r:1,br:11.0},F4F:{n:'GER',r:3,br:11.0,req:'F104G'},MIG29G:{n:'GER',r:2,br:13.0,req:'F104G'},EF2K1:{n:'GER',r:3,br:14.3,req:'F4F'},EF2K3:{n:'GER',r:5,br:14.3,req:'EF2K1'},F35DE:{n:'GER',r:5,br:14.0,req:'EF2K3'},
  F4EJ:{n:'JPN',r:1,br:11.0},F4EJK:{n:'JPN',r:2,br:12.3,req:'F4EJ'},F15J:{n:'JPN',r:3,br:12.7,req:'F4EJK'},F15JK:{n:'JPN',r:4,br:13.7,req:'F15J'},F2A:{n:'JPN',r:4,br:13.7,req:'F15J'},F35AJ:{n:'JPN',r:5,br:14.0,req:'F2A'},F35BJ:{n:'JPN',r:5,br:14.0,req:'F35AJ'},
  F4EIL:{n:'ISR',r:1,br:11.3},KFIR:{n:'ISR',r:2,br:12.0,req:'F4EIL'},F4E2K:{n:'ISR',r:2,br:12.3,req:'F4EIL'},F15BAZ:{n:'ISR',r:3,br:13.7,req:'F4E2K'},F16BARAK:{n:'ISR',r:4,br:13.7,req:'KFIR'},F16I:{n:'ISR',r:5,br:13.7,req:'F16BARAK'},F15I:{n:'ISR',r:5,br:14.0,req:'F15BAZ'},F35I:{n:'ISR',r:5,br:14.0,req:'F16I'},
  J35F:{n:'SWE',r:1,br:10.3},JA37:{n:'SWE',r:2,br:12.0,req:'J35F'},GRIPEN:{n:'SWE',r:4,br:13.7,req:'JA37'},GRIPENE:{n:'SWE',r:5,br:14.3,req:'GRIPEN'},
  LIGHTNING:{n:'GBR',r:1,br:9.3},PHANTOM2:{n:'GBR',r:2,br:12.0,req:'LIGHTNING'},TORNADO3:{n:'GBR',r:3,br:13.0,req:'PHANTOM2'},TYPHOON:{n:'GBR',r:5,br:14.7,req:'TORNADO3'},F35B:{n:'GBR',r:5,br:14.0,req:'TYPHOON'},
  J7G:{n:'CHN',r:1,br:11.3},J10C:{n:'CHN',r:5,br:14.3,req:'J7G'},J11B:{n:'CHN',r:5,br:13.7,req:'J7G'},J15:{n:'CHN',r:4,br:14.7,req:'J11B'},J16:{n:'CHN',r:5,br:14.7,req:'J11B'},J20:{n:'CHN',r:5,br:14.0,req:'J10C'},
  MIRAGEF1:{n:'FRA',r:1,br:12.0},M2000:{n:'FRA',r:3,br:14.0,req:'MIRAGEF1'},RAFALE:{n:'FRA',r:5,br:14.7,req:'M2000'},
  F5E:{n:'USA',r:2,br:11.0,req:'F4E'},F14B:{n:'USA',r:3,br:13.0,req:'F4E'},MIG23ML:{n:'RUS',r:2,br:11.7,req:'MIG21'},MIG25PD:{n:'RUS',r:3,br:11.0,req:'MIG23ML'},J8F:{n:'CHN',r:2,br:13.0,req:'J7G'}};
const RP_COST=[0,0,4000,10000,20000,34000], SL_PRICE=[0,0,25000,70000,150000,280000], ROMAN=['','I','II','III','IV','V'];
// modules: [key, name, cost tier, effect, requires, family]. A stock aircraft flies with penalties; the first module of each family removes one, the second goes beyond stock.
// Each is researched with the RP earned in that aircraft, then bought with Silver Lions.
const MODS=[['afr1','Airframe',1,'Removes the stock roll-rate penalty (-10 %)',null,'Airframe'],['eng1','Engine',1,'Removes the stock thrust penalty (-6 %)',null,'Engine'],
  ['cms1','Dispensers',1,'Removes the stock flare and chaff penalty (-50 %)',null,'Countermeasures'],['wpn1','Missile seekers',2,'Removes the stock missile range and agility penalty (-10 %)',null,'Weapons'],
  ['tnk1','Drop-tank pylons',1,'Fit external fuel tanks (stock jets fly clean)',null,'Fuel'],['ord1','Weapon pylons',1,'Fit extra missiles and air-to-ground stores (stock jets carry only the basic missile load)',null,'Weapons'],
  ['afr2','Airframe II',3,'+5 % roll rate, +3 % lift','afr1','Airframe'],['eng2','Engine II',3,'+4 % thrust','eng1','Engine'],['cms2','Dispensers II',3,'+25 % flares and chaff','cms1','Countermeasures'],
  ['wpn2','Missile seekers II',4,'+6 % missile range, +5 % missile agility','wpn1','Weapons']];
const STOCK={thr:.94,roll:.9,cm:.5,mr:.9,ag:.9};
const CREW=[['g','Anti-g training','+0.25 g tolerance per level',8000],['f','Flight skill','+2 % roll rate per level',8000],['d','Ground crew','−8 % repair cost per level',6000]];
const PROG_START=['F4E','MIG21','F104G','F4EJ','F4EIL','J35F','LIGHTNING','J7G','MIRAGEF1'];
let prog={sl:30000,frp:0,rp:{},res:{},own:{},mods:{},crew:{g:0,f:0,d:0},sorties:0,fresh:true};
try{const v=JSON.parse(localStorage.getItem('vsProg')||'null');if(v&&typeof v.sl==='number'){prog=Object.assign(prog,v,{fresh:false});prog.crew=Object.assign({g:0,f:0,d:0},v.crew)}}catch(e){}
for(const k of ['rp','res','own','mods'])if(!prog[k]||typeof prog[k]!=='object')prog[k]={};
for(const id of PROG_START){prog.res[id]=true;prog.own[id]=true}
function progSave(){try{localStorage.setItem('vsProg',JSON.stringify(prog))}catch(e){}}
// players who already earned jets by rank keep them
function progMigrate(){if(!prog.fresh)return;prog.fresh=false;const ri=rankIdx(career.xp);if(career.xp>0){for(const id in NODES)if(UNLOCK[id]!=null&&UNLOCK[id]<=ri){prog.res[id]=true;prog.own[id]=true}prog.sl+=Math.round(career.xp*.8)}progSave()}
const progOwned=id=>!!prog.own[id], progRes=id=>!!prog.res[id], progBR=id=>NODES[id]?NODES[id].br:11.5;
const crewLvl=k=>careerOn?(prog.crew[k]||0):0, hasMod=(id,m)=>careerOn&&!!(prog.mods[id]&&prog.mods[id][m]===true), modRes=(id,m)=>careerOn&&!!(prog.mods[id]&&prog.mods[id][m]);   // true = installed, 'r' = researched, not yet bought
// modules and crew skill change the effective aircraft the whole game uses
function modApply(id,e){if(!careerOn)return e;const H=k=>hasMod(id,k);
  const thr=(H('eng1')?1:STOCK.thr)*(H('eng2')?1.04:1), roll=(H('afr1')?1:STOCK.roll)*(H('afr2')?1.05:1)*Math.pow(1.02,crewLvl('f')), lift=H('afr2')?1.03:1,
    cm=(H('cms1')?1:STOCK.cm)*(H('cms2')?1.25:1), mr=(H('wpn1')?1:STOCK.mr)*(H('wpn2')?1.06:1), ag=(H('wpn1')?1:STOCK.ag)*(H('wpn2')?1.05:1);
  const sc=s=>s?Object.assign({},s,{maxR:s.maxR*mr,gmax:s.gmax*ag}):s;
  return Object.assign({},e,{T_AB:e.T_AB*thr,T_MIL:e.T_MIL*thr,roll:e.roll*roll,CLMAX:e.CLMAX*lift,cmK:cm,sr:sc(e.sr),mr:sc(e.mr)})}
// sortie rewards: RP to the aircraft flown, Free RP, Silver Lions, minus the repair bill if you lost the jet
// parts (optional) names the RP lines; the return value keeps its old fields and adds a breakdown of named lines that add up to the totals
function progAward(rp,win,kills,survived,rescued,parts){const id=AC.id,br=progBR(id);
  const sl=Math.round(rp*1.8+kills*250+(win?1500:0)), full=survived?0:Math.round(18*br*br), afterCrew=survived?0:Math.round(18*br*br*(1-.08*crewLvl('d'))), rep=survived?0:Math.round(18*br*br*(1-.08*crewLvl('d'))*(rescued?.5:1)), fr=Math.round(rp*.1);
  const before=prog.sl;
  prog.rp[id]=(prog.rp[id]||0)+rp;prog.frp+=fr;prog.sl=Math.max(0,prog.sl+sl-rep);prog.sorties++;progSave();
  const rpLines=parts&&parts.length?parts.slice():[['Sortie RP',rp]], slLines=[['RP conversion',Math.round(rp*1.8)],['Kill bonus',kills*250],['Win bonus',win?1500:0]].filter(l=>l[1]);
  if(full){slLines.push(['Repair bill',-full]);if(full-afterCrew)slLines.push(['Crew discount',full-afterCrew]);if(afterCrew-rep)slLines.push(['Rescue discount',afterCrew-rep])}
  const net=prog.sl-before, gap=net-slLines.reduce((a,l)=>a+l[1],0);if(gap)slLines.push(['Balance floor',gap]);
  return {rp,fr,sl,rep,breakdown:{rp:rpLines,sl:slLines,totalRp:rp,totalSl:net,repair:rep,freeRp:fr}}}
function modCost(id,m){const r=NODES[id]?NODES[id].r:1;return {rp:m[2]*(500+600*(r-1)),sl:m[2]*(3000+4000*(r-1))}}
function progResearchable(id){const n=NODES[id];return !progRes(id)&&n.req&&progRes(n.req)}
function progPool(id){return (prog.rp[id]||0)+prog.frp}
function progResearch(id){const n=NODES[id];if(!n||!progResearchable(id))return false;const c=RP_COST[n.r];if(progPool(n.req)<c)return false;
  const take=Math.min(c,prog.rp[n.req]||0);prog.rp[n.req]=(prog.rp[n.req]||0)-take;prog.frp-=c-take;prog.res[id]=true;progSave();return true}
function progBuy(id){const n=NODES[id];if(!n||!progRes(id)||progOwned(id))return false;const c=SL_PRICE[n.r];if(prog.sl<c)return false;prog.sl-=c;prog.own[id]=true;progSave();return true}
const modOk=(id,m)=>m&&progOwned(id)&&(!m[4]||hasMod(id,m[4]));
function progModResearch(id,mk){const m=MODS.find(x=>x[0]===mk);if(!modOk(id,m)||modRes(id,mk))return false;const c=modCost(id,m);if(progPool(id)<c.rp)return false;
  const take=Math.min(c.rp,prog.rp[id]||0);prog.rp[id]=(prog.rp[id]||0)-take;prog.frp-=c.rp-take;(prog.mods[id]||(prog.mods[id]={}))[mk]='r';progSave();return true}
function progModBuy(id,mk){const m=MODS.find(x=>x[0]===mk);if(!modOk(id,m)||!modRes(id,mk)||hasMod(id,mk))return false;const c=modCost(id,m);if(prog.sl<c.sl)return false;
  prog.sl-=c.sl;prog.mods[id][mk]=true;progSave();return true}
function crewCost(k){const c=CREW.find(x=>x[0]===k);return c[3]*((prog.crew[k]||0)+1)}
function progCrew(k){const lv=prog.crew[k]||0;if(lv>=5||prog.sl<crewCost(k))return false;prog.sl-=crewCost(k);prog.crew[k]=lv+1;progSave();return true}

/* ---------------- daily tasks (Career only): three small goals that pay free RP; progress lives in vsDaily and resets at local midnight ---------------- */
const DAILY=[['k','Shoot down 2 bandits',2,400],['m','Fly 10 minutes in Career',10,500],['l','Land once',1,300]];
const dayKey=()=>{const d=new Date();return d.getFullYear()+'-'+String(d.getMonth()+1).padStart(2,'0')+'-'+String(d.getDate()).padStart(2,'0')};
let daily={d:'',k:0,m:0,l:0,done:{}};
try{const v=JSON.parse(localStorage.getItem('vsDaily')||'null');if(v&&typeof v.d==='string')daily=Object.assign(daily,v,{done:Object.assign({},v.done)})}catch(e){}
const dailySave=()=>{try{localStorage.setItem('vsDaily',JSON.stringify(daily))}catch(e){}};
function dailyRoll(){const t=dayKey();if(daily.d!==t){daily={d:t,k:0,m:0,l:0,done:{}};dailySave()}}
// returns the task text when this call completes it
function dailyAdd(k,n){if(!careerOn||!(n>0))return null;dailyRoll();const t=DAILY.find(x=>x[0]===k);if(!t||daily.done[k])return null;
  daily[k]=Math.min(t[2],(daily[k]||0)+n);let hit=null;if(daily[k]>=t[2]){daily.done[k]=1;prog.frp+=t[3];progSave();hit=t[1]+' (+'+t[3]+' RP)'}dailySave();return hit}
