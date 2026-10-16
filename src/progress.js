
/* ---------------- progression (War Thunder style): research points, silver lions, tech trees, modules, crew ----------------
   Career mode only. RP earned in a sortie go to the aircraft you flew (and 10 % to Free RP); an aircraft is researched with RP from the
   aircraft it descends from (or Free RP), then bought with Silver Lions. Modules and crew skills improve what you own. Bandits are picked near your BR. */
const NATIONS={USA:{n:'United States',c:'#6fb7ff'},RUS:{n:'Russia',c:'#ff8a7a'},EUR:{n:'Europe',c:'#ffd166'},CHN:{n:'China',c:'#ff9d4e'}};
const NODES={
  F16:{n:'USA',r:1,br:11.3},F15C:{n:'USA',r:2,br:12.0,req:'F16'},F16B70:{n:'USA',r:3,br:12.3,req:'F15C'},FA18E:{n:'USA',r:3,br:12.0,req:'F15C'},F15EX:{n:'USA',r:4,br:13.0,req:'F16B70'},
  MIG29:{n:'RUS',r:1,br:10.7},SU27:{n:'RUS',r:2,br:11.7,req:'MIG29'},MIG29UPG:{n:'RUS',r:3,br:11.7,req:'SU27'},SU33:{n:'RUS',r:3,br:11.7,req:'SU27'},MIG29K:{n:'RUS',r:3,br:11.3,req:'SU27'},MIG35:{n:'RUS',r:4,br:12.7,req:'MIG29UPG'},SU35:{n:'RUS',r:5,br:13.0,req:'MIG35'},
  GRIPEN:{n:'EUR',r:1,br:11.3},GRIPENE:{n:'EUR',r:2,br:12.7,req:'GRIPEN'},RAFALE:{n:'EUR',r:3,br:12.7,req:'GRIPENE'},TYPHOON:{n:'EUR',r:4,br:12.7,req:'RAFALE'},
  J10C:{n:'CHN',r:1,br:12.0},J20:{n:'CHN',r:4,br:13.3,req:'J10C'}};
const RP_COST=[0,0,4000,10000,20000,34000], SL_PRICE=[0,0,25000,70000,150000,280000], ROMAN=['','I','II','III','IV','V'];
const MODS=[['eng1','Engine I',1,'+4 % thrust'],['afr1','Airframe I',1,'+5 % roll rate'],['cms1','Countermeasures I',2,'+25 % flares and chaff'],['wpn1','Missiles I',2,'+6 % missile range, +5 % missile agility'],
  ['eng2','Engine II',3,'+4 % thrust','eng1'],['afr2','Airframe II',3,'+5 % roll rate, +3 % lift','afr1']];
const CREW=[['g','Anti-g training','+0.25 g tolerance per level',8000],['f','Flight skill','+2 % roll rate per level',8000],['d','Ground crew','−8 % repair cost per level',6000]];
const PROG_START=['F16','MIG29','GRIPEN','J10C'];
let prog={sl:30000,frp:0,rp:{},res:{},own:{},mods:{},crew:{g:0,f:0,d:0},sorties:0,fresh:true};
try{const v=JSON.parse(localStorage.getItem('vsProg')||'null');if(v&&typeof v.sl==='number'){prog=Object.assign(prog,v,{fresh:false});prog.crew=Object.assign({g:0,f:0,d:0},v.crew)}}catch(e){}
for(const k of ['rp','res','own','mods'])if(!prog[k]||typeof prog[k]!=='object')prog[k]={};
for(const id of PROG_START){prog.res[id]=true;prog.own[id]=true}
function progSave(){try{localStorage.setItem('vsProg',JSON.stringify(prog))}catch(e){}}
// players who already earned jets by rank keep them
function progMigrate(){if(!prog.fresh)return;prog.fresh=false;const ri=rankIdx(career.xp);if(career.xp>0){for(const id in NODES)if(UNLOCK[id]!=null&&UNLOCK[id]<=ri){prog.res[id]=true;prog.own[id]=true}prog.sl+=Math.round(career.xp*.8)}progSave()}
const progOwned=id=>!!prog.own[id], progRes=id=>!!prog.res[id], progBR=id=>NODES[id]?NODES[id].br:11.5;
const crewLvl=k=>careerOn?(prog.crew[k]||0):0, hasMod=(id,m)=>careerOn&&!!(prog.mods[id]&&prog.mods[id][m]);
// modules and crew skill change the effective aircraft the whole game uses
function modApply(id,e){if(!careerOn)return e;let thr=1,roll=1,lift=1,cm=1,mr=1,ag=1;
  if(hasMod(id,'eng1'))thr*=1.04;if(hasMod(id,'eng2'))thr*=1.04;if(hasMod(id,'afr1'))roll*=1.05;if(hasMod(id,'afr2')){roll*=1.05;lift*=1.03}
  if(hasMod(id,'cms1'))cm=1.25;if(hasMod(id,'wpn1')){mr=1.06;ag=1.05}roll*=Math.pow(1.02,crewLvl('f'));
  if(thr===1&&roll===1&&lift===1&&cm===1&&mr===1)return e;
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
function modCost(id,m){const r=NODES[id]?NODES[id].r:1;return {rp:m[2]*(600+700*(r-1)),sl:m[2]*(4000+4500*(r-1))}}
function progResearchable(id){const n=NODES[id];return !progRes(id)&&n.req&&progRes(n.req)}
function progPool(id){return (prog.rp[id]||0)+prog.frp}
function progResearch(id){const n=NODES[id];if(!n||!progResearchable(id))return false;const c=RP_COST[n.r];if(progPool(n.req)<c)return false;
  const take=Math.min(c,prog.rp[n.req]||0);prog.rp[n.req]=(prog.rp[n.req]||0)-take;prog.frp-=c-take;prog.res[id]=true;progSave();return true}
function progBuy(id){const n=NODES[id];if(!n||!progRes(id)||progOwned(id))return false;const c=SL_PRICE[n.r];if(prog.sl<c)return false;prog.sl-=c;prog.own[id]=true;progSave();return true}
function progMod(id,mk){const m=MODS.find(x=>x[0]===mk);if(!m||!progOwned(id)||hasMod(id,mk)||(m[4]&&!hasMod(id,m[4])))return false;const c=modCost(id,m);
  if(progPool(id)<c.rp||prog.sl<c.sl)return false;const take=Math.min(c.rp,prog.rp[id]||0);prog.rp[id]=(prog.rp[id]||0)-take;prog.frp-=c.rp-take;prog.sl-=c.sl;
  (prog.mods[id]||(prog.mods[id]={}))[mk]=true;progSave();return true}
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
