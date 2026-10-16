(function(){
'use strict';
const V3=THREE.Vector3, UP=new V3(0,1,0), ZF=new V3(0,0,1);
const ovc=()=>weather==='OVERCAST'||weather==='RAIN';
/* wind (the air mass moves every jet), gusts and low-level turbulence; set per weather in applyEnv */
const WIND=new V3(); let gust=1, turbK=.2;
const rand=(a,b)=>a+Math.random()*(b-a);
const $=id=>document.getElementById(id);

/* =========== REAL-WORLD NUMBERS (1 world unit = 1 metre) =========== */
const G=9.81, G_MAX=9, G_MIN=-3;
/* Two real jets. Bandits always fly the F-16 profile (aggressors). */
let use120D=false, tvcOn=false, suLR=false, strikeRole=false;
try{strikeRole=localStorage.getItem('vsRole')==='strike'}catch(e){}
try{suLR=localStorage.getItem('vsR37')==='1';use120D=localStorage.getItem('vs120D')==='1';tvcOn=localStorage.getItem('vsTVC')==='1'}catch(e){}
const AC_DEFS={
  F16:{id:'F16',name:'F-16C Block 50',eyebrow:'F-16C Block 50 · Callsign Viper 1',corner:350,
    S:27.87,MASS:12000,CLMAX:1.9,KIND:.12,T_AB:120000,T_MIL:65000,ram:.25,cdK:1,gmax:9,roll:4.2,   // 300 ft², 27,000 lbf AB
    gunRate:100,gunRounds:512,muzzle:1030,gunDmg:1,gunSnd:1800,ammo:'PGU-28',                   // M61A1 20 mm, 6,000 rpm
    srName:'9X',srFull:'AIM-9X',mrName:'120',mrFull:'AIM-120C',srN:2,mrN:4,
    sr:{burn:5,acc:160,cd:7e-5,gmax:50,life:25,fuze:9,gimbal:Math.PI/2,decoy:.08,minR:300,maxR:10000,cone:Math.PI/2,lockT:.8},
    mr:{burn:8,acc:150,cd:4.5e-5,gmax:40,life:60,fuze:12,gimbal:1.2,decoy:0,minR:1000,maxR:37000,cone:1.05,lockT:1.2},
    eye:[0,.95,3.3],
    cm:{fixed:false,decoys:4,maws:false,jam:'ECM',jamName:'ALQ-184 pod',cmds:'CMDS',
      stations:[['1','9X','r9_0'],['3','120C','r120_0'],['4','120C','r120_2'],['6','120C','r120_3'],['7','120C','r120_1'],['9','9X','r9_1']]},
    spec:'<span><b>9 g</b> / −3 g</span><span><b>Mach 2</b> high</span><span>M61A1 <b>6,000 rpm</b> · 500 rds</span><span>AIM-9X <b>Mach 2+</b></span><span>AIM-120C <b>Mach 4 · 40 g</b></span>'},
  GRIPEN:{id:'GRIPEN',name:'JAS 39C Gripen',eyebrow:'JAS 39C Gripen · Callsign Ghost 1',corner:300,
    S:25.54,MASS:8900,CLMAX:2.15,KIND:.13,T_AB:80500,T_MIL:46000,ram:.33,cdK:.79,gmax:9,roll:4.0,  // 275 ft² wing, RM12 54/80.5 kN
    gunRate:28.3,gunRounds:120,muzzle:1100,gunDmg:2,gunSnd:900,ammo:'27MM',                     // BK-27 at 1,700 rpm
    srName:'IRIS',srFull:'IRIS-T',mrName:'MET',mrFull:'METEOR',srN:2,mrN:4,
    sr:{burn:5,acc:190,cd:7e-5,gmax:60,life:25,fuze:9,gimbal:Math.PI/2,decoy:.05,minR:300,maxR:15000,cone:Math.PI/2,lockT:.7},   // Mach 3, 60 g thrust vectoring
    mr:{burn:3,acc:180,sus:40,susAcc:70,vCap:1300,cd:4.5e-5,gmax:40,life:75,fuze:12,gimbal:1.2,decoy:0,minR:1500,maxR:60000,cone:1.05,lockT:1.2}, // ramjet sustain
    eye:[0,.95,3.5],
    cm:{fixed:true,flares:40,chaff:80,decoys:0,maws:true,jam:'JAM',jamName:'EWS 39 internal jammer',cmds:'EWS',
      stations:[['TIP','IRIS','r9_0'],['OUT','MET','r120_0'],['IN','MET','r120_2'],['IN','MET','r120_3'],['OUT','MET','r120_1'],['TIP','IRIS','r9_1']]},
    spec:'<span><b>9 g</b> / −3 g</span><span><b>Mach 2</b> high</span><span>BK-27 <b>1,700 rpm</b> · 120 rds</span><span>IRIS-T <b>Mach 3 · 60 g</b></span><span>Meteor <b>ramjet · Mach 4</b></span>'}
};
AC_DEFS.MIG29={id:'MIG29',name:'MiG-29 (9.12)',eyebrow:'MiG-29 9.12 Fulcrum · Callsign Strizh 1',corner:340,
    S:38.06,MASS:13900,CLMAX:1.75,KIND:.125,T_AB:163000,T_MIL:85000,ram:.5,cdK:1,supK:.35,gmax:9,roll:3.2,  // 2× RD-33: 49.4 / 81.8 kN
    gunRate:27.5,gunRounds:150,muzzle:860,gunDmg:2,gunSnd:700,ammo:'30MM',                         // GSh-30-1
    srName:'R73',srFull:'R-73',mrName:'R27',mrFull:'R-27R',srN:4,mrN:2,
    sr:{burn:5,acc:150,cd:7e-5,gmax:40,life:25,fuze:8,gimbal:1.0,decoy:.12,minR:300,maxR:12000,cone:.7,lockT:.8},           // Mach 2.5, ±40° off-boresight
    mr:{burn:6,acc:170,cd:5e-5,gmax:30,life:60,fuze:12,gimbal:1.0,decoy:0,minR:2000,maxR:42000,cone:1.05,lockT:1.2,sarh:true,launchG:5,termR:12000,dlR:25000}, // inertial + datalink midcourse, semi-active terminal (last ~12 km, game estimate)
    eye:[0,1.0,4.4],cut:{r:.8,full:[0,3.5],open:[3.5,6.8]},
    radar:{modes:['RWS','IRST'],name:'N019'},
    cm:{fixed:true,flares:30,chaff:30,decoys:0,maws:false,jam:null,jamName:'',cmds:'CM',
      stations:[['1','R73','r9_0'],['2','R73','r9_2'],['3','R27','r120_0'],['4','R27','r120_1'],['5','R73','r9_3'],['6','R73','r9_1']]},
    spec:'<span><b>9 g</b> soft limiter</span><span><b>Mach 2.3</b> high</span><span>GSh-30-1 <b>30 mm</b> · 150 rds</span><span>R-73 <b>Mach 2.5</b></span><span>R-27R <b>semi-active radar</b></span>'};
// internal fuel (kg) and engine fuel burn (lb per lbf-hour, dry / max afterburner; F404 max 1.79 per Purdue, others approximate)
Object.assign(AC_DEFS.F16,{fuelCap:3175,sfcDry:.76,sfcAB:1.95,fuelUnit:'LB',engines:1});
AC_DEFS.F16.refuel='boom';AC_DEFS.GRIPEN.refuel='probe';AC_DEFS.MIG29.refuel=null;
AC_DEFS.F16.vne=800; AC_DEFS.GRIPEN.vne=760; AC_DEFS.MIG29.vne=810;
Object.assign(AC_DEFS.GRIPEN,{fuelCap:2270,sfcDry:.84,sfcAB:1.79,fuelUnit:'KG',engines:1});
Object.assign(AC_DEFS.MIG29,{fuelCap:3375,sfcDry:.77,sfcAB:2.05,fuelUnit:'KG',engines:2});
AC_DEFS.F16.radar={modes:['RWS','TWS'],name:'APG-68'}; AC_DEFS.GRIPEN.radar={modes:['RWS','TWS'],name:'PS-05/A'};
AC_DEFS.F16.cut={r:1.0,full:[-6,2.5],open:[2.5,7]}; AC_DEFS.GRIPEN.cut={r:.75,full:[-5.25,1.9],open:[1.9,5.25]};
// Indian MiG-29UPG "Baaz": Zhuk-ME multi-target radar, OLS-UEM IRST, Thales helmet sight, R-77 (RVV-AE) active radar missiles,
// D-29 EW suite plus an Israeli jammer, RD-33 series 3 engines. Same airframe and thrust as the 9.12; heavier with new avionics (estimate).
AC_DEFS.MIG29UPG=Object.assign({},AC_DEFS.MIG29,{id:'MIG29UPG',name:'MiG-29UPG',eyebrow:'MiG-29UPG Baaz · Callsign Baaz 1',corner:345,MASS:14200,
  mrName:'R77',mrFull:'R-77',srN:2,mrN:4,
  mr:{burn:6,acc:175,cd:4.8e-5,gmax:35,life:60,fuze:12,gimbal:1.1,decoy:0,minR:1500,maxR:50000,cone:1.05,lockT:1.2,arh:true,termR:20000,dlR:40000}, // Mach 4, active inside 20 km
  radar:{modes:['RWS','TWS','IRST'],name:'Zhuk-ME'},
  cm:{fixed:true,flares:30,chaff:30,decoys:0,maws:false,jam:'ECM',jamName:'D-29 suite + Israeli jammer',cmds:'CM',
    stations:[['1','R73','r9_0'],['2','R77','r120_0'],['3','R77','r120_2'],['4','R77','r120_3'],['5','R77','r120_1'],['6','R73','r9_1']]},
  spec:'<span><b>9 g</b></span><span><b>Mach 2.3</b> high</span><span>GSh-30-1 <b>30 mm</b></span><span>R-77 <b>Mach 4 · active</b></span><span>Zhuk-ME <b>TWS</b></span><span>R-73 <b>Mach 2.5</b></span>'});
// MiG-35S: 41 m² wing, 2× RD-33MK 52 / 88.2 kN, +9/−3 g, 9 hardpoints, GSh-30-1 with 100 rds, OLS-UEM IRST (air targets to 55 km),
// Zhuk-ME radar (AESA is export-only), L-150 RWR + missile attack warning + MSP-418K DRFM jammer pod, chaff and flares.
// Combat weight, internal fuel and dispenser loads are estimates; 6× R-77-1 + 2× R-73 is a typical air-to-air fit.
AC_DEFS.MIG35=Object.assign({},AC_DEFS.MIG29UPG,{id:'MIG35',name:'MiG-35',eyebrow:'MiG-35S Fulcrum-F · Callsign Gromov 1',corner:340,
  S:41,MASS:15200,CLMAX:1.75,KIND:.12,T_AB:176400,T_MIL:92000,ram:.45,cdK:1.12,supK:.4,roll:3.4,
  gunRounds:100,fuelCap:4000,
  mrName:'R77-1',mrFull:'R-77-1',srN:2,mrN:6,irstR:30000,
  mr:{burn:6,acc:185,cd:4.6e-5,gmax:35,life:70,fuze:12,gimbal:1.1,decoy:0,minR:1500,maxR:62000,cone:1.05,lockT:1.2,arh:true,termR:20000,dlR:50000},
  radar:{modes:['RWS','TWS','IRST'],name:'Zhuk-ME'},
  cm:{fixed:true,flares:32,chaff:32,decoys:0,maws:true,jam:'ECM',jamName:'MSP-418K DRFM jammer pod',cmds:'CM',
    stations:[['1','R73','r9_0'],['2','R77','r120_0'],['3','R77','r120_2'],['4','R77','r120_4'],['5','R77','r120_5'],['6','R77','r120_3'],['7','R77','r120_1'],['8','R73','r9_1']]},
  spec:'<span><b>+9 / −3 g</b></span><span><b>88 kN</b> ×2</span><span>GSh-30-1 · <b>100 rds</b></span><span>R-77-1 <b>110 km</b></span><span>OLS-UEM <b>55 km</b></span><span><b>MAWS</b> + DRFM jammer</span>'});
AC_DEFS.MIG29UPG.irstR=30000;   // UPG also got the OLS-UEM
AC_DEFS.MIG29UPG.refuel='probe'; AC_DEFS.MIG35.refuel='probe';
// F-16 Block 70: F110-GE-129 29,500 lbf, APG-83 AESA (20+ tracks), conformal fuel tanks, Viper Shield internal EW + digital RWR,
// IRST, Auto-GCAS, 12,000 h airframe; 20,300 lb empty, 27,400 lb loaded for air-to-air (Lockheed Martin / F-16.net)
AC_DEFS.F16B70=Object.assign({},AC_DEFS.F16,{id:'F16B70',name:'F-16 Block 70',eyebrow:'F-16 Block 70 Viper · Callsign Viper 1',corner:360,
  MASS:12900,T_AB:131000,T_MIL:71000,cdK:1.06,vne:800,fuelCap:4540,irstR:30000,
  mrName:'120',mrFull:'AIM-120C-7',
  mr:Object.assign({},AC_DEFS.F16.mr,{maxR:42000}),
  radar:{modes:['RWS','TWS','IRST'],name:'APG-83',range:100000},
  cm:{fixed:false,decoys:0,maws:false,jam:'ECM',jamName:'AN/ALQ-254 Viper Shield (internal)',cmds:'CMDS',stations:AC_DEFS.F16.cm.stations},
  spec:'<span><b>29,500 lbf</b> F110-GE-129</span><span>APG-83 <b>AESA</b></span><span><b>CFTs</b> +3,000 lb fuel</span><span>Viper Shield <b>internal EW</b></span><span>AIM-120C-7 · AIM-9X</span>'});
// Gripen E: F414G 98 kN, 3.4 t internal fuel (+40 %), 15.2 m, 16.5 t MTOW, Mach 2 / ~1,400 km/h low, supersonic without afterburner,
// Raven ES-05 AESA with a 100° swashplate field of view, Skyward-G IRST, MAW, Arexis EW, BK-27, Meteor + IRIS-T
AC_DEFS.GRIPENE=Object.assign({},AC_DEFS.GRIPEN,{id:'GRIPENE',name:'Gripen E',eyebrow:'JAS 39E Gripen · Callsign Ghost 1',corner:310,
  S:30,MASS:11300,CLMAX:2.1,KIND:.13,T_AB:98000,T_MIL:58000,ram:.33,cdK:.82,trK:.62,vne:760,
  fuelCap:3400,sfcDry:.84,sfcAB:1.85,irstR:35000,eye:[0,.95,3.6],
  radar:{modes:['RWS','TWS','IRST'],name:'Raven ES-05',range:120000,gimbal:100},
  cm:Object.assign({},AC_DEFS.GRIPEN.cm,{flares:50,chaff:100,jamName:'Arexis EW suite'}),
  spec:'<span><b>98 kN</b> F414G</span><span><b>Supercruise</b> ~M1.2</span><span>Raven <b>AESA</b> ±100°</span><span>Skyward-G <b>IRST</b></span><span>Meteor · IRIS-T</span>'});
// Su-27S Flanker-B: 62 m² wing, 2× AL-31F 75.2 / 122.6 kN, 9,400 kg internal fuel, +9 g, Mach 2.35 high / 1,400 km/h low,
// GSh-30-1, 10 hardpoints, N001 radar, OLS-27 IRST (80–100 km), SPO-15 RWR (Wikipedia). Loadout and cartridge count are estimates.
AC_DEFS.SU27=Object.assign({},AC_DEFS.MIG29,{id:'SU27',name:'Su-27S',eyebrow:'Su-27S Flanker-B · Callsign Sokol 1',corner:340,
  S:62,MASS:23000,CLMAX:1.8,KIND:.11,T_AB:233000,T_MIL:130000,ram:.6,cdK:1,supK:.3,vne:756,gmax:9,roll:3.0,
  gunRounds:150,fuelCap:9400,sfcDry:.75,sfcAB:1.92,engines:2,refuel:null,irstR:40000,irstMax:90000,
  srName:'R73',srFull:'R-73',mrName:'R27ER',mrFull:'R-27ER',srN:4,mrN:6,
  mr:{burn:8,acc:185,cd:4.6e-5,gmax:30,life:75,fuze:12,gimbal:1.0,decoy:0,minR:2000,maxR:60000,cone:1.05,lockT:1.2,sarh:true,launchG:5,termR:14000,dlR:30000},
  radar:{modes:['RWS','IRST'],name:'N001',range:90000},
  eye:[0,1.15,6.6],cut:{r:.8,full:[0,3.5],open:[3.5,6.8]},
  cm:{fixed:true,flares:48,chaff:48,decoys:0,maws:false,jam:null,jamName:'',cmds:'CM',
    stations:[['1','R73','r9_0'],['2','R73','r9_2'],['3','R27','r120_0'],['4','R27','r120_2'],['5','R27','r120_4'],['6','R27','r120_5'],['7','R27','r120_3'],['8','R27','r120_1'],['9','R73','r9_3'],['10','R73','r9_1']]},
  spec:'<span><b>+9 g</b></span><span><b>Mach 2.35</b> high</span><span>2× AL-31F <b>122.6 kN</b></span><span><b>9.4 t</b> internal fuel</span><span>R-27ER · R-73</span><span>OLS-27 <b>IRST</b></span>'});
// Su-35S Flanker-E: 2× AL-41F1S 86.3 / 137.3 kN with 3-D thrust vectoring, 11,500 kg fuel, supercruise > Mach 1.1, Mach 2.25 high,
// Irbis-E radar (tracks 30, engages 8, 400 km vs large targets), OLS-35 IRST, Khibiny-M EW, OAR missile warning (Wikipedia). R-37M per Wikipedia's R-37 page.
AC_DEFS.SU35=Object.assign({},AC_DEFS.SU27,{id:'SU35',name:'Su-35S',eyebrow:'Su-35S Flanker-E · Callsign Rus 1',corner:360,
  MASS:27000,CLMAX:1.85,T_AB:261000,T_MIL:150000,ram:.5,cdK:1.05,supK:.45,trK:.75,roll:3.4,tvc:true,
  fuelCap:11500,refuel:'probe',irstR:45000,irstMax:90000,
  mrName:'R77-1',mrFull:'R-77-1',srN:4,mrN:8,
  mr:Object.assign({},AC_DEFS.MIG35.mr),
  radar:{modes:['RWS','TWS','IRST'],name:'Irbis-E',range:180000,gimbal:120},
  cm:{fixed:true,flares:48,chaff:48,decoys:0,maws:true,jam:'ECM',jamName:'L175M Khibiny-M',cmds:'CM',
    stations:[['1','R73','r9_0'],['2','R73','r9_2'],['3','R77','r120_0'],['4','R77','r120_2'],['5','R77','r120_4'],['6','R77','r120_6'],['7','R77','r120_7'],['8','R77','r120_5'],['9','R77','r120_3'],['10','R77','r120_1'],['11','R73','r9_3'],['12','R73','r9_1']]},
  spec:'<span><b>3-D thrust vectoring</b></span><span><b>Supercruise</b> M1.1+</span><span>Irbis-E <b>±120°</b></span><span><b>11.5 t</b> fuel</span><span>R-77-1 · R-37M option</span><span>Khibiny · <b>MAWS</b></span>'});
// R-37M: Mach 5–6, quoted 200–400 km (vs large targets); game cap 150 km against fighters, datalink then active seeker
/* ---------- more jets (true-scale models built by buildParam). Sources: Wikipedia spec pages; figures marked "est." are game estimates ---------- */
// PL-15: dual-pulse motor, burnout > Mach 5, AESA seeker, two-way datalink; 200–300 km claimed (export PL-15E ~145 km). Game cap 120 km vs fighters.
const PL15={burn:9,acc:200,cd:3.0e-5,gmax:35,life:110,fuze:14,gimbal:1.1,decoy:0,minR:2000,maxR:120000,cone:1.05,lockT:1.2,arh:true,termR:25000,dlR:150000};
// PL-10: imaging-IR, high off-boresight short-range missile (figures est.)
const PL10={burn:5,acc:185,cd:7e-5,gmax:60,life:25,fuze:9,gimbal:Math.PI/2,decoy:.05,minR:300,maxR:18000,cone:Math.PI/2,lockT:.7};
// MICA IR: Mach 4, thrust-vectoring short/medium-range heat seeker (used here as the short-range weapon; figures est.)
const MICA_IR={burn:5,acc:200,cd:6.5e-5,gmax:50,life:30,fuze:9,gimbal:Math.PI/2,decoy:.06,minR:400,maxR:20000,cone:Math.PI/2,lockT:.8};

// F-15C: 56.5 m² wing, 2× F100-PW-220 (~65 / 106 kN, est. from published 14,590 / 23,770 lbf), +9 g, Mach 2.5, M61A1 940 rds,
// 4 fuselage + 2 wing-pylon missile stations (Wikipedia), APG-63(V)3 AESA, ALR-56C RWR, ALQ-135 jammer, ALE-45 (cartridge counts est.)
AC_DEFS.F15C=Object.assign({},AC_DEFS.F16,{id:'F15C',name:'F-15C Eagle',eyebrow:'F-15C Eagle · Callsign Eagle 1',corner:350,
  S:56.5,MASS:19500,CLMAX:1.62,KIND:.11,T_AB:212000,T_MIL:130000,ram:.5,cdK:.98,supK:.02,gmax:9,roll:4.0,vne:800,
  gunRate:100,gunRounds:940,fuelCap:6100,sfcDry:.73,sfcAB:2.05,fuelUnit:'LB',engines:2,refuel:'boom',irstR:0,
  srName:'9X',srFull:'AIM-9X',mrName:'120',mrFull:'AIM-120C',srN:2,mrN:6,sr:AC_DEFS.F16.sr,mr:Object.assign({},AC_DEFS.F16.mr,{maxR:40000}),
  radar:{modes:['RWS','TWS'],name:'APG-63(V)3',range:120000},
  cm:{fixed:true,flares:120,chaff:120,decoys:0,maws:false,jam:'ECM',jamName:'AN/ALQ-135 internal jammer',cmds:'TEWS',
    stations:[['2A','9X','r9_0'],['2B','120C','r120_0'],['3','120C','r120_2'],['4','120C','r120_4'],['6','120C','r120_5'],['7','120C','r120_3'],['8B','120C','r120_1'],['8A','9X','r9_1']]},
  spec:'<span><b>+9 g</b></span><span><b>Mach 2.5</b> high</span><span>2× F100-PW-220</span><span>M61A1 · <b>940 rds</b></span><span>APG-63(V)3 <b>AESA</b></span><span>AIM-120C · AIM-9X</span>',
  fx:{eng:[[.72,-9.6],[-.72,-9.6]],vapor:6.5,nav:[6.5,-8.6,3.6],shadow:[19.4,13],nz:5.2},snd:{f:36,roar:225,wh:.003,twin:1},seek:{flareP:.12,chaffP:.08},
  rwrSym:'15',rwrName:'ALR-56C',srDesc:'AIM-9X heat seeker on the wing pylons',mrDesc:'AIM-120C radar missile (Fox 3): datalink midcourse, active ~16 km out. STT or TWS track',cmDesc:'ALE-45 dispensers',
  model:'F15'});
// F-15EX Eagle II: 2× F110-GE-129 76.3 / 131 kN, 6,150 kg internal fuel, Mach 2.5, +9 g, APG-82(V)1 AESA, EPAWSS (AN/ALQ-250, no missile
// warner per Wikipedia) with ALE-47, M61A1 500 rds, 12 air-to-air missiles typical
AC_DEFS.F15EX=Object.assign({},AC_DEFS.F15C,{id:'F15EX',name:'F-15EX Eagle II',eyebrow:'F-15EX Eagle II · Callsign Eagle 1',corner:355,
  MASS:23500,T_AB:262000,T_MIL:152600,ram:.45,cdK:1.12,supK:.1,gunRounds:512,fuelCap:6150,sfcAB:1.95,
  mrName:'120D',mrFull:'AIM-120D',srN:4,mrN:8,mr:Object.assign({},AC_DEFS.F16.mr),
  radar:{modes:['RWS','TWS'],name:'APG-82(V)1',range:150000},
  cm:{fixed:true,flares:60,chaff:60,decoys:0,maws:false,jam:'ECM',jamName:'EPAWSS (AN/ALQ-250)',cmds:'EPAWSS',
    stations:[['1','9X','r9_0'],['2','120D','r120_0'],['3','120D','r120_2'],['4','120D','r120_4'],['5','120D','r120_6'],['6','9X','r9_2'],
              ['7','9X','r9_3'],['8','120D','r120_7'],['9','120D','r120_5'],['10','120D','r120_3'],['11','120D','r120_1'],['12','9X','r9_1']]},
  spec:'<span><b>131 kN</b> ×2 F110-GE-129</span><span><b>Mach 2.5</b></span><span>APG-82 <b>AESA</b></span><span><b>12</b> missiles</span><span>EPAWSS <b>EW</b></span><span>AIM-120D · AIM-9X</span>',
  rwrName:'EPAWSS',mrDesc:'AIM-120D radar missile (Fox 3): two-way datalink, active ~18 km out',cmDesc:'ALE-47',model:'F15EX'});
// Eurofighter Typhoon: 2× EJ200 60 / 90 kN, supercruise ~M1.1–1.5, BK-27 150 rds, Captor-E AESA with repositioner, PIRATE IRST,
// Praetorian DASS: RWR, missile warner, jammer, chaff/flares, towed decoy (Wikipedia). 51.2 m² wing, 5 t fuel, loadout est.
AC_DEFS.TYPHOON=Object.assign({},AC_DEFS.GRIPEN,{id:'TYPHOON',name:'Eurofighter Typhoon',eyebrow:'Typhoon FGR4 · Callsign Tiffy 1',corner:340,
  S:51.2,MASS:15500,CLMAX:2.0,KIND:.12,T_AB:180000,T_MIL:120000,ram:.4,cdK:.95,trK:.62,supK:.75,gmax:9,roll:4.4,vne:750,
  gunRounds:150,fuelCap:5000,sfcDry:.79,sfcAB:1.73,fuelUnit:'KG',engines:2,refuel:'probe',irstR:40000,irstMax:80000,
  srName:'IRIS',srFull:'IRIS-T',mrName:'MET',mrFull:'METEOR',srN:2,mrN:6,sr:AC_DEFS.GRIPEN.sr,mr:Object.assign({},AC_DEFS.GRIPEN.mr),
  radar:{modes:['RWS','TWS','IRST'],name:'Captor-E',range:130000,gimbal:100},eye:[0,1.05,5.4],
  cm:{fixed:true,flares:40,chaff:80,decoys:2,maws:true,jam:'ECM',jamName:'Praetorian DASS jammer',cmds:'DASS',
    stations:[['1','IRIS','r9_0'],['2','MET','r120_0'],['3','MET','r120_2'],['FUS','MET','r120_4'],['FUS','MET','r120_5'],['11','MET','r120_3'],['12','MET','r120_1'],['13','IRIS','r9_1']]},
  spec:'<span><b>+9 g</b></span><span><b>Supercruise</b> M1.1–1.5</span><span>Captor-E <b>±100°</b></span><span>PIRATE <b>IRST</b></span><span>DASS · <b>MAWS</b> · towed decoy</span><span>Meteor · IRIS-T</span>',
  fx:{eng:[[.55,-7.6],[-.55,-7.6]],vapor:5.4,nav:[5.45,-7.0,3.9],shadow:[16,10.95],nz:4.6},snd:{f:42,roar:280,wh:.008,twin:1},seek:{flareP:.08,chaffP:.05},
  rwrSym:'EF',rwrName:'DASS',srDesc:'IRIS-T heat seeker, Mach 3, thrust vectoring',mrDesc:'Meteor ramjet (Fox 3): two-way datalink, no-escape zone far out',cmDesc:'DASS dispensers',model:'TYPHOON'});
// Rafale C: 2× M88-2 50 / 75 kN, −3.6 to +9 g, supercruise with 4 missiles, 30M791 cannon, RBE2-AA AESA (200 km detection), OSF IRST,
// SPECTRA (detection, jamming, decoys) (Wikipedia). 45.7 m² wing, 4.7 t fuel, MICA IR + Meteor fit est.
AC_DEFS.RAFALE=Object.assign({},AC_DEFS.TYPHOON,{id:'RAFALE',name:'Rafale C',eyebrow:'Rafale C · Callsign Rafale 1',corner:330,
  S:45.7,MASS:14000,CLMAX:2.1,KIND:.12,T_AB:150000,T_MIL:100000,ram:.35,cdK:.9,trK:.68,supK:2.2,roll:4.3,
  gunRate:41.7,gunRounds:125,muzzle:1025,gunSnd:750,ammo:'30MM',fuelCap:4700,sfcDry:.78,sfcAB:1.75,irstR:40000,irstMax:80000,
  srName:'MICA',srFull:'MICA IR',srN:4,mrN:4,sr:MICA_IR,
  radar:{modes:['RWS','TWS','IRST'],name:'RBE2-AA',range:140000,gimbal:70},eye:[0,1.0,4.6],
  cm:{fixed:true,flares:32,chaff:64,decoys:0,maws:true,jam:'ECM',jamName:'SPECTRA',cmds:'SPECTRA',
    stations:[['TIP','MICA','r9_0'],['OUT','MICA','r9_2'],['WING','MET','r120_0'],['FUS','MET','r120_2'],['FUS','MET','r120_3'],['WING','MET','r120_1'],['OUT','MICA','r9_3'],['TIP','MICA','r9_1']]},
  spec:'<span><b>+9 / −3.6 g</b></span><span><b>Supercruise</b> with 4 missiles</span><span>RBE2-AA <b>AESA</b></span><span>OSF <b>IRST</b></span><span>SPECTRA · <b>MAWS</b></span><span>MICA IR · Meteor</span>',
  fx:{eng:[[.45,-7.5],[-.45,-7.5]],vapor:5.3,nav:[5.4,-6.7,3.6],shadow:[15.3,10.9],nz:4.3},snd:{f:44,roar:290,wh:.009,twin:1},seek:{flareP:.08,chaffP:.05},
  rwrSym:'RF',rwrName:'SPECTRA',srDesc:'MICA IR heat seeker, Mach 4, thrust vectoring',cmDesc:'SPECTRA dispensers',model:'RAFALE'});
// J-10C: 1× WS-10B 89.2 kN dry / 135–144 kN AB, Mach 1.8, 37 m² wing, 14 t gross, GSh-23 cannon, KLJ-7A AESA, PL-15 + PL-10 (Wikipedia).
// Internal fuel, combat weight, IRST/EW fit and cartridge counts are est.
AC_DEFS.J10C=Object.assign({},AC_DEFS.GRIPEN,{id:'J10C',name:'J-10C',eyebrow:'J-10C Vigorous Dragon · Callsign Long 1',corner:330,
  S:37,MASS:12800,CLMAX:2.0,KIND:.13,T_AB:138000,T_MIL:89000,ram:.35,cdK:1.0,trK:.9,supK:2.2,gmax:9,roll:4.1,vne:740,
  gunRate:57,gunRounds:200,muzzle:930,gunDmg:1,gunSnd:1100,ammo:'23MM',fuelCap:4000,sfcDry:.78,sfcAB:1.95,fuelUnit:'KG',engines:1,refuel:'probe',irstR:30000,
  srName:'PL10',srFull:'PL-10',mrName:'PL15',mrFull:'PL-15',srN:2,mrN:4,sr:PL10,mr:PL15,
  radar:{modes:['RWS','TWS','IRST'],name:'KLJ-7A',range:120000},eye:[0,1.0,5.3],
  cm:{fixed:true,flares:48,chaff:48,decoys:0,maws:true,jam:'ECM',jamName:'internal EW (fin-tip pod)',cmds:'CM',
    stations:[['1','PL10','r9_0'],['2','PL15','r120_0'],['3','PL15','r120_2'],['5','PL15','r120_3'],['6','PL15','r120_1'],['7','PL10','r9_1']]},
  spec:'<span><b>+9 g</b> (est.)</span><span><b>Mach 1.8</b></span><span>WS-10B <b>~140 kN</b></span><span>KLJ-7A <b>AESA</b></span><span>PL-15 <b>Mach 5</b></span><span>PL-10 · GSh-23</span>',
  fx:{eng:[[0,-8.4]],vapor:4.9,nav:[4.9,-7.4,4.0],shadow:[16.9,9.8],nz:5.0},snd:{f:34,roar:220,wh:.004,twin:0},seek:{flareP:.08,chaffP:.05},
  rwrSym:'10',rwrName:'RWR',srDesc:'PL-10 imaging-IR seeker, high off-boresight',mrDesc:'PL-15 active radar (Fox 3): dual-pulse motor, two-way datalink, active ~25 km out',cmDesc:'48 + 48 cartridges (est.)',model:'J10'});
// J-20: 21.2 m, 13.01 m span, 73 m² wing, 25 t gross, 12 t internal fuel, 2× WS-10C 142–147 kN AB, no internal gun,
// 4 PL-15 in the main bay + 1 PL-10 in each side bay, Type 1475 AESA, EO sensors with all-round coverage (Wikipedia). Dry thrust, g and speed est.
AC_DEFS.J20=Object.assign({},AC_DEFS.SU27,{id:'J20',name:'J-20',eyebrow:'J-20 Mighty Dragon · Callsign Weilong 1',corner:350,
  S:73,MASS:26500,CLMAX:1.85,KIND:.11,T_AB:290000,T_MIL:190000,ram:.45,cdK:1.0,trK:.72,supK:.95,gmax:9,roll:3.6,vne:760,tvc:false,
  gunRounds:0,fuelCap:12000,sfcDry:.76,sfcAB:1.95,fuelUnit:'KG',engines:2,refuel:'probe',irstR:50000,irstMax:90000,
  srName:'PL10',srFull:'PL-10',mrName:'PL15',mrFull:'PL-15',srN:2,mrN:4,sr:PL10,mr:PL15,
  radar:{modes:['RWS','TWS','IRST'],name:'Type 1475 AESA',range:170000},eye:[0,1.15,7.4],
  cm:{fixed:true,flares:32,chaff:32,decoys:0,maws:true,jam:'ECM',jamName:'internal EW (est.)',cmds:'CM',
    stations:[['SIDE L','PL10','r9_0'],['BAY','PL15','r120_0'],['BAY','PL15','r120_2'],['BAY','PL15','r120_3'],['BAY','PL15','r120_1'],['SIDE R','PL10','r9_1']]},
  spec:'<span><b>Internal bays</b> 4× PL-15 + 2× PL-10</span><span>2× WS-10C <b>~145 kN</b></span><span><b>12 t</b> fuel</span><span>Type 1475 <b>AESA</b></span><span>EO <b>all-round</b> sensors</span><span><b>No gun</b></span>',
  fx:{eng:[[.75,-10.3],[-.75,-10.3]],vapor:6.5,nav:[6.5,-9.5,3.8],shadow:[21.2,13],nz:6.5},snd:{f:28,roar:190,wh:.005,twin:1},seek:{flareP:.07,chaffP:.04},
  rwrSym:'20',rwrName:'RWR',srDesc:'PL-10 imaging-IR seeker from the side bays',mrDesc:'PL-15 active radar (Fox 3) from the main bay: two-way datalink, active ~25 km out',cmDesc:'32 + 32 cartridges (est.)',model:'J20'});
// F/A-18E Super Hornet: 18.3 m, 13.6 m span, 46.45 m² wing, 2× F414-GE-400 (62.3 / 98 kN), 6.8 t internal fuel, Mach 1.8, +7.6 g,
// M61A2 (412 rds), APG-79 AESA, ALQ-214 IDECM jammer, ALE-55 towed decoy, ALE-47. Catapult launch, arrested landing (published specs / Wikipedia).
AC_DEFS.FA18E=Object.assign({},AC_DEFS.F15C,{id:'FA18E',name:'F/A-18E Super Hornet',eyebrow:'F/A-18E Super Hornet · Callsign Rhino 1',corner:330,
  S:46.45,MASS:20500,CLMAX:2.0,KIND:.13,T_AB:196000,T_MIL:124600,ram:.35,cdK:1.15,supK:1.4,trK:1.1,gmax:7.6,roll:3.6,vne:700,
  gunRounds:412,fuelCap:6780,sfcDry:.8,sfcAB:1.85,fuelUnit:'LB',engines:2,refuel:'probe',irstR:0,
  srN:2,mrN:6,mr:Object.assign({},AC_DEFS.F16.mr),mrName:'120',mrFull:'AIM-120C',
  radar:{modes:['RWS','TWS'],name:'APG-79',range:120000},
  cm:{fixed:true,flares:60,chaff:60,decoys:2,maws:false,jam:'ECM',jamName:'AN/ALQ-214 IDECM',cmds:'ALE-47',
    stations:[['1','9X','r9_0'],['2','120C','r120_0'],['3','120C','r120_2'],['4','120C','r120_4'],['8','120C','r120_5'],['9','120C','r120_3'],['10','120C','r120_1'],['11','9X','r9_1']]},
  spec:'<span><b>+7.6 g</b></span><span><b>Mach 1.8</b></span><span>2× F414 <b>98 kN</b></span><span>APG-79 <b>AESA</b></span><span>ALE-55 <b>towed decoy</b></span><span><b>Carrier</b> cat + trap</span>',
  fx:{eng:[[.55,-8.2],[-.55,-8.2]],vapor:6.8,nav:[6.85,-7.0,3.6],shadow:[18.3,13.6],nz:5.0},snd:{f:38,roar:240,wh:.004,twin:1},seek:{flareP:.12,chaffP:.07},
  rwrSym:'18',rwrName:'ALR-67',srDesc:'AIM-9X heat seeker on the wingtips',mrDesc:'AIM-120C radar missile (Fox 3): datalink midcourse, active ~16 km out',cmDesc:'ALE-47',model:'FA18',
  carrier:'CATOBAR',vApp:135});
// MiG-29K: 17.3 m, 11.99 m span, 45 m² wing, 4.56 t fuel, 2× RD-33MK 52.96 / 88.3 kN, Mach 2+, +8 g, GSh-30-1 150 rds, Zhuk-ME,
// R-77 / R-27ER / R-73, ski-jump take-off and arrested landing (Wikipedia). Dispenser load and approach speed est.
AC_DEFS.MIG29K=Object.assign({},AC_DEFS.MIG35,{id:'MIG29K',name:'MiG-29K',eyebrow:'MiG-29K Fulcrum-D · Callsign Black Panther 1',corner:340,
  S:45,MASS:17000,T_AB:176600,T_MIL:105900,gmax:8,tvc:false,gunRounds:150,fuelCap:4560,refuel:'probe',
  mrN:4,srN:2,cm:Object.assign({},AC_DEFS.MIG35.cm,{flares:30,chaff:30,maws:false,jam:null,jamName:''}),
  spec:'<span><b>+8 g</b></span><span><b>Mach 2</b>+</span><span>2× RD-33MK <b>88 kN</b></span><span>Zhuk-ME</span><span>R-77 · R-73</span><span><b>Ski-jump</b> + trap</span>',
  fx:{eng:[[1.05,-8.9],[-1.05,-8.9]],vapor:5.9,shadow:[17.3,12],nz:4.6},snd:{f:33,roar:215,wh:.005,twin:1},seek:{flareP:.25,chaffP:.08},
  rwrSym:'29K',rwrName:'L-150',cmDesc:'60 cartridges (est.)',carrier:'STOBAR',vApp:135});
// Su-33: 21.19 m, 14.7 m span, 67.84 m² wing, 9.5 t fuel, 2× AL-31F3 74.5 / 125.5 kN, Mach 2.17, +8 g, GSh-30-1 150 rds, N001,
// 6× R-27E + 4× R-73, canards, ski-jump on Admiral Kuznetsov, 240 km/h landing speed (Wikipedia)
AC_DEFS.SU33=Object.assign({},AC_DEFS.SU27,{id:'SU33',name:'Su-33',eyebrow:'Su-33 Flanker-D · Callsign Kuznetsov 1',corner:340,
  S:67.84,MASS:26000,T_AB:251000,T_MIL:149000,gmax:8,fuelCap:9500,refuel:'probe',
  spec:'<span><b>+8 g</b></span><span><b>Mach 2.17</b></span><span>2× AL-31F3 <b>125.5 kN</b></span><span><b>9.5 t</b> fuel</span><span>R-27E · R-73</span><span><b>Canards</b> · ski-jump</span>',
  fx:{eng:[[1.33,-11.3],[-1.33,-11.3]],vapor:7.3,shadow:[21.2,14.7],nz:6.0},snd:{f:27,roar:185,wh:.004,twin:1},seek:{flareP:.3,chaffP:.15},
  rwrSym:'33',rwrName:'SPO-15',cmDesc:'96 cartridges (est.)',carrier:'STOBAR',vApp:140});
// targeting pods (null = none carried) and cockpit layouts
const PODS={F16:'Sniper XR',F16B70:'Sniper XR',F15EX:'Sniper',FA18E:'ATFLIR',GRIPEN:'LITENING III',GRIPENE:'LITENING 5',TYPHOON:'LITENING III',RAFALE:'TALIOS',MIG29UPG:'LITENING (est.)',MIG35:'OLS-K',J10C:'K/JDC01A'};
const PITS={F16:'F16',F16B70:'LAD',F15C:'TEEN',F15EX:'LAD',FA18E:'HORNET',GRIPEN:'3MFD',GRIPENE:'LAD',TYPHOON:'3MFD',RAFALE:'3MFD',J10C:'3MFD',J20:'LAD',
  MIG29:'RUS',MIG29UPG:'RUS',SU27:'RUS',SU33:'RUS',MIG29K:'RUS2',MIG35:'RUS2',SU35:'RUS2'};
const SIDESTICK={F16:1,F16B70:1,RAFALE:1};
const R37M={burn:12,
acc:200,cd:2.4e-5,gmax:25,life:180,fuze:16,gimbal:1.1,decoy:0,minR:5000,maxR:150000,cone:1.05,lockT:1.5,arh:true,termR:25000,dlR:200000};
AC_DEFS.F16B70.cut=AC_DEFS.F16.cut; AC_DEFS.GRIPENE.cut=AC_DEFS.GRIPEN.cut;
// AMRAAM and Meteor: inertial midcourse with datalink updates from the launcher's radar, own active radar for the end game
// (seeker-on ranges are game estimates; Meteor has a two-way datalink and a longer one)
Object.assign(AC_DEFS.F16.mr,{arh:true,termR:16000,dlR:55000});
Object.assign(AC_DEFS.F16B70.mr,{arh:true,termR:16000,dlR:60000});
Object.assign(AC_DEFS.GRIPEN.mr,{arh:true,termR:20000,dlR:90000});
Object.assign(AC_DEFS.F15C.mr,{arh:true,termR:16000,dlR:55000}); Object.assign(AC_DEFS.F15EX.mr,AC_DEFS.F16.mr,{maxR:56000,cd:3.5e-5,acc:155,dlR:100000,termR:18000}); Object.assign(AC_DEFS.TYPHOON.mr,{arh:true,termR:20000,dlR:90000}); AC_DEFS.RAFALE.mr=AC_DEFS.TYPHOON.mr;
let AC=AC_DEFS.F16; try{const k=localStorage.getItem('viperAC');if(AC_DEFS[k])AC=AC_DEFS[k]}catch(e){}
const SPEC={'9X':AC.sr,'120':AC.mr};
/* ---------------- renderer / scene ---------------- */
const glCanvas=$('gl'), hud=$('hud'), hctx=hud.getContext('2d');
const QUALS={LOW:{dpr:1,seg:110,clouds:16,fx:0,trees:0},MED:{dpr:1.5,seg:150,clouds:30,fx:1,trees:2200},HIGH:{dpr:2,seg:190,clouds:44,fx:2,trees:4500}};
let quality='MED'; try{const q=localStorage.getItem('viperQuality');if(QUALS[q])quality=q}catch(e){}
let DPR=Math.min(window.devicePixelRatio||1,QUALS[quality].dpr);
const renderer=new THREE.WebGLRenderer({canvas:glCanvas,antialias:true,powerPreference:'high-performance'});
renderer.setPixelRatio(DPR); renderer.autoClear=false;
// keep the r128 look on newer three.js: linear output, no colour management, legacy light units
if(THREE.ColorManagement)THREE.ColorManagement.enabled=false; if('outputColorSpace' in renderer)renderer.outputColorSpace=THREE.LinearSRGBColorSpace; if('useLegacyLights' in renderer)renderer.useLegacyLights=true;
// r165+ removed legacy lights: light intensities are pi times lower, so scale ours back up to keep the same look (LK is 1 on older builds)
const LK=(parseInt(THREE.REVISION)>=165)?Math.PI:1;
const scene=new THREE.Scene();
const HORIZON=new THREE.Color(0xc6d9e5);
scene.background=HORIZON;
scene.fog=new THREE.Fog(HORIZON,4000,19000);
const camera=new THREE.PerspectiveCamera(66,1,1,40000);
const hemi=new THREE.HemisphereLight(0xd6e8ff,0x4d5a3c,0.95*LK); scene.add(hemi);
const sun=new THREE.DirectionalLight(0xfff0d8,1.05*LK); sun.position.set(-0.5,1,0.6); scene.add(sun);
const SUN_DIR=sun.position.clone().normalize();
const sky=new THREE.Mesh(new THREE.SphereGeometry(30000,32,16),new THREE.ShaderMaterial({
  side:THREE.BackSide,depthWrite:false,fog:false,
  uniforms:{top:{value:new THREE.Color(0x2b5fae)},hor:{value:HORIZON},bot:{value:new THREE.Color(0x8fa6b0)},sun:{value:SUN_DIR},glow:{value:new THREE.Color(0xfff2dc)},disk:{value:1}},
  vertexShader:'varying vec3 vD;void main(){vD=normalize(position);gl_Position=projectionMatrix*modelViewMatrix*vec4(position,1.);}',
  /* sky: zenith-to-horizon gradient, a haze band on the horizon, warm scattering toward the sun's side, sun halo and disk */
  fragmentShader:'uniform vec3 top,hor,bot,sun,glow;uniform float disk;varying vec3 vD;void main(){vec3 d=normalize(vD);float h=d.y;float s=max(dot(d,sun),0.);'+
    'vec2 a=normalize(d.xz+1e-4),b=normalize(sun.xz+1e-4);float az=max(dot(a,b),0.);'+
    'vec3 H=mix(hor,glow,pow(az,4.)*.75*(1.-clamp(h*2.5,0.,1.)));'+
    'vec3 c=h>0.?mix(H,top,pow(clamp(h,0.,1.),.42)):mix(H,bot,min(1.,-h*6.));'+
    'c=mix(c,H*1.04+.02,exp(-abs(h)*28.)*.55);'+
    'c+=glow*pow(s,7.)*.32+vec3(1.,.95,.85)*pow(s,64.)*.3*disk;'+
    'c+=vec3(1.,.97,.9)*smoothstep(.99945,.9998,s)*2.2*disk;'+
    'gl_FragColor=linearToOutputTexel(vec4(c,1.));}'
}));
sky.renderOrder=-1; scene.add(sky);
const radTex=(stops)=>{const cv=document.createElement('canvas');cv.width=cv.height=128;const c=cv.getContext('2d');const g=c.createRadialGradient(64,64,0,64,64,64);stops.forEach(([o,col])=>g.addColorStop(o,col));c.fillStyle=g;c.fillRect(0,0,128,128);return new THREE.CanvasTexture(cv)};
const GLOW_TEX=radTex([[0,'rgba(255,255,255,1)'],[.18,'rgba(255,255,255,.55)'],[.5,'rgba(255,255,255,.12)'],[1,'rgba(255,255,255,0)']]);
// afterburner shock diamonds and nozzle glow: added to every jet model's flame; toggled per jet with setAB
const DIA_MAT=new THREE.SpriteMaterial({map:GLOW_TEX,color:0xffd9b0,blending:THREE.AdditiveBlending,depthWrite:false,transparent:true,opacity:.7});
function dressFlames(root){
  const fl=[];root.traverse(o=>{if(o.name==='flame')fl.push(o)});
  for(const f of fl){const ms=[];f.traverse(o=>{if(o.isMesh&&o.material.blending===THREE.AdditiveBlending)ms.push(o)});
    for(const m of ms){m.geometry.computeBoundingBox();const bb=m.geometry.boundingBox,len=bb.max.z-bb.min.z,r=(bb.max.x-bb.min.x)/2,z0=bb.max.z;
      const core=new THREE.Mesh(m.geometry,new THREE.MeshBasicMaterial({color:0xfff2d0,transparent:true,opacity:.7,blending:THREE.AdditiveBlending,depthWrite:false}));core.scale.set(.5,.5,.7);core.name='core';m.add(core);
      const gl=new THREE.Sprite(new THREE.SpriteMaterial({map:GLOW_TEX,color:m.material.color,blending:THREE.AdditiveBlending,depthWrite:false,transparent:true,opacity:.8}));gl.position.z=z0-.2;gl.scale.setScalar(r*5);gl.name='nglow';m.add(gl);
      for(let i=0;i<4;i++){const d=new THREE.Sprite(DIA_MAT);d.position.z=z0-len*(.2+i*.19);d.scale.setScalar(r*(1.5-i*.22));d.name='dia';d.visible=false;m.add(d)}}}
  return root}
function setAB(obj,on){if(!obj)return;if(!obj.__dia){obj.__dia=[];obj.traverse(o=>{if(o.name==='dia')obj.__dia.push(o)})}if(obj.__abOn===on)return;obj.__abOn=on;for(const d of obj.__dia)d.visible=on}

/* ---------------- terrain ---------------- */
/* ---------------- maps ---------------- */
var MAPS={ISLANDS:'islands',DESERT:'desert canyons',ALPINE:'snowy alps',OCEAN:'open ocean'}, MAP='ISLANDS';
try{if(MAPS[localStorage.getItem('vsMap')])MAP=localStorage.getItem('vsMap')}catch(e){}
const MAP_ID={ISLANDS:0,DESERT:1,ALPINE:2,OCEAN:3};
const MAP_WX={ISLANDS:'SCATTERED',DESERT:'CLEAR',ALPINE:'OVERCAST',OCEAN:'SCATTERED'};


// airbase: runway along +z at x=0, terrain flattened around it
const BASE_Y=30, RWY={x:0,z0:-1500,z1:1500,w:45};
function rawH(x,z){
  let h=Math.sin(x*0.0011)*Math.cos(z*0.0013)*230+Math.cos(x*0.00071-z*0.00052)*170
       +Math.sin(x*0.0031+z*0.0021)*80+Math.sin(z*0.0049-x*0.0017)*40-40;
  const r=Math.abs(Math.sin(x*0.00045+Math.cos(z*0.0003)*2));
  h=h+(1-r)*280-90;
  if(MAP==='DESERT'){h=h*.45+235+Math.sin(x*.0062+Math.sin(z*.0021)*2)*12+Math.sin(z*.0047+x*.0013)*8;
    if(h>300){const t=Math.min(1,(h-300)/22);h=300+t*t*(3-2*t)*120+Math.max(0,h-322)*.06}}
  else if(MAP==='ALPINE'){const q=1-Math.abs(Math.sin(x*.00052+Math.cos(z*.00041)*1.7)),q2=1-Math.abs(Math.cos(z*.00063-x*.00029+Math.sin(x*.0002)));h=h*1.5+q*q*900+q2*q2*500-260}
  else if(MAP==='OCEAN')h=(h-330)*1.15;
  return h;
}
function groundH(x,z){const d=Math.hypot(x*1.6,z);
  if(d<2600)return BASE_Y; const h=rawH(x,z); if(d>5200)return h; const t=(d-2600)/2600, s=t*t*(3-2*t); return BASE_Y+(h-BASE_Y)*s}
const onRunway=(x,z)=>Math.abs(x-RWY.x)<RWY.w/2+6&&z>RWY.z0-40&&z<RWY.z1+40;
const TSIZE=36000,TSTEP=800;
let tGeo,tPos,tBase,tCol;
function buildTerrainGeo(seg){
  tGeo=new THREE.PlaneGeometry(TSIZE,TSIZE,seg,seg); tGeo.rotateX(-Math.PI/2);
  tPos=tGeo.attributes.position; tBase=tPos.array.slice();
  tCol=new Float32Array(tPos.count*3); tGeo.setAttribute('color',new THREE.BufferAttribute(tCol,3));
  return tGeo;
}
/* tileable value-noise (3 independent channels), used by the terrain shader and to place forests where the shader paints them */
const NOISE=(()=>{const S=256,P=[4,8,16,32,64],vals=new Float32Array(S*S*3);
  const vn=(per,seed)=>{const g=new Float32Array(per*per);let r=seed;for(let i=0;i<g.length;i++){r=(r*16807)%2147483647;g[i]=r/2147483647}
    return (x,y)=>{const xi=Math.floor(x),yi=Math.floor(y),fx=x-xi,fy=y-yi,u=fx*fx*(3-2*fx),v=fy*fy*(3-2*fy),A=(i,j)=>g[((j%per+per)%per)*per+((i%per+per)%per)];
      return A(xi,yi)*(1-u)*(1-v)+A(xi+1,yi)*u*(1-v)+A(xi,yi+1)*(1-u)*v+A(xi+1,yi+1)*u*v}};
  for(let c=0;c<3;c++){const fs=P.map((p,k)=>vn(p,1234+c*977+k*131));let lo=9,hi=-9;
    for(let y=0;y<S;y++)for(let x=0;x<S;x++){let v=0,amp=.5,tot=0;for(let k=0;k<5;k++){v+=fs[k](x/S*P[k],y/S*P[k])*amp;tot+=amp;amp*=.55}v/=tot;vals[(y*S+x)*3+c]=v;if(v<lo)lo=v;if(v>hi)hi=v}
    for(let i=c;i<vals.length;i+=3)vals[i]=(vals[i]-lo)/(hi-lo)}
  const data=new Uint8Array(S*S*4);for(let i=0;i<S*S;i++){data[i*4]=vals[i*3]*255;data[i*4+1]=vals[i*3+1]*255;data[i*4+2]=vals[i*3+2]*255;data[i*4+3]=255}
  const t=new THREE.DataTexture(data,S,S,THREE.RGBAFormat);t.wrapS=t.wrapT=THREE.RepeatWrapping;t.magFilter=THREE.LinearFilter;t.minFilter=THREE.LinearMipmapLinearFilter;t.generateMipmaps=true;t.needsUpdate=true;
  t.at=(u,v,c)=>{u=(u-Math.floor(u))*S-.5;v=(v-Math.floor(v))*S-.5;const x0=Math.floor(u),y0=Math.floor(v),fx=u-x0,fy=v-y0,R=(x,y)=>vals[((((y%S)+S)%S)*S+(((x%S)+S)%S))*3+c];
    return R(x0,y0)*(1-fx)*(1-fy)+R(x0+1,y0)*fx*(1-fy)+R(x0,y0+1)*(1-fx)*fy+R(x0+1,y0+1)*fx*fy};
  return t})();
/* terrain: smooth-shaded, coloured per pixel from height, slope and noise — beaches, meadows, forest, dry upland, rock, snow */
const terrMat=new THREE.MeshLambertMaterial({color:0xffffff});
const TERR_U={mapId:{value:MAP_ID[MAP]||0}};
terrMat.onBeforeCompile=sh=>{sh.uniforms.nTex={value:NOISE};sh.uniforms.mapId=TERR_U.mapId;
  sh.vertexShader=sh.vertexShader.replace('#include <common>','#include <common>\nvarying vec3 vWPos;varying vec3 vWN;')
    .replace('#include <project_vertex>','#include <project_vertex>\nvWPos=(modelMatrix*vec4(transformed,1.)).xyz;vWN=normalize(mat3(modelMatrix)*objectNormal);');
  sh.fragmentShader=sh.fragmentShader.replace('#include <common>',`#include <common>
uniform sampler2D nTex;uniform float mapId;varying vec3 vWPos;varying vec3 vWN;
float hh(vec2 p){return fract(sin(dot(p,vec2(127.1,311.7)))*43758.5453);}
// patchwork farmland on flat lowland: rotated 200 m lots in crop, stubble, plough and pasture colours with row stripes
vec3 fields(vec3 base,float h,float sl,float n1,float n2){
 float m=smoothstep(.1,.05,sl)*smoothstep(5.,14.,h)*(1.-smoothstep(120.,170.,h))*smoothstep(.36,.52,n1);
 if(m<.01)return base;
 mat2 R=mat2(.9659,-.2588,.2588,.9659);vec2 p=R*vWPos.xz;vec2 id=floor(p/215.);vec2 f=fract(p/215.);
 float r=hh(id),r2=hh(id+7.3);
 vec3 c=r<.28?vec3(.62,.58,.27):r<.5?vec3(.37,.5,.2):r<.68?vec3(.45,.34,.22):r<.84?vec3(.29,.43,.17):vec3(.7,.66,.38);
 vec2 dir=r2<.5?vec2(1.,0.):vec2(0.,1.);float rows=.5+.5*sin(dot(p,dir)*(1.1+r2*.9));
 c*=.9+.14*rows*step(.28,r)*step(r,.84);
 float edge=smoothstep(0.,.012,f.x)*smoothstep(0.,.012,f.y)*smoothstep(1.,.988,f.x)*smoothstep(1.,.988,f.y);   // thin hedgerows between lots
 c=mix(vec3(.2,.3,.13),c,edge*.85+.15);
 return mix(base,c,m*.8);}
vec3 terr(){float h=vWPos.y;float sl=1.-normalize(vWN).y;
 float n1=texture2D(nTex,vWPos.xz/2600.).r,n2=texture2D(nTex,vWPos.xz/530.).g,n3=texture2D(nTex,vWPos.xz/95.).b,n4=texture2D(nTex,vWPos.xz/19.).r;
 if(mapId>.5&&mapId<1.5){vec3 c=mix(vec3(.74,.65,.51),vec3(.69,.58,.44),n2*.6+n1*.4);
   c=mix(c,vec3(.80,.72,.58),smoothstep(.55,.85,n1)*.5);
   vec3 rk=mix(vec3(.60,.39,.25),vec3(.44,.28,.19),.5+.5*sin(h*.16+n3*3.));
   c=mix(c,rk,smoothstep(.16,.3,sl+(n3-.5)*.12));
   c=mix(c,vec3(.45,.43,.28),smoothstep(.78,.9,n4)*smoothstep(.25,.1,sl)*.55);
   c=mix(vec3(.72,.66,.50),c,smoothstep(2.,8.,h));
   return c*(.86+.28*n4*(.55+.45*n3));}
 if(mapId>1.5&&mapId<2.5){vec3 c=mix(vec3(.22,.36,.15),vec3(.33,.42,.19),smoothstep(.3,.72,n2));
   c=mix(c,vec3(.11,.21,.10),smoothstep(.45,.7,n1)*(1.-smoothstep(900.,1150.,h)));
   vec3 rk=mix(vec3(.47,.46,.44),vec3(.30,.30,.30),n3);
   c=mix(c,rk,smoothstep(.22,.38,sl+(n3-.5)*.14));
   c=mix(c,rk,smoothstep(1000.,1250.,h+(n2-.5)*200.));
   c=mix(c,vec3(.94,.96,.99),smoothstep(1150.,1350.,h+(n1-.5)*260.)*smoothstep(.55,.25,sl));
   c=mix(vec3(.55,.52,.45),c,smoothstep(3.,10.,h));
   return c*(.84+.32*n4*(.55+.45*n3));}
 vec3 c=mix(vec3(.25,.39,.16),vec3(.40,.48,.21),smoothstep(.3,.72,n2));
 c=mix(c,vec3(.15,.26,.12),smoothstep(.5,.72,n1)*(1.-smoothstep(260.,380.,h)));
 c=mix(c,vec3(.48,.45,.30),smoothstep(190.,390.,h+(n2-.5)*140.));
 vec3 rk=mix(vec3(.45,.42,.37),vec3(.31,.30,.28),n3);
 c=mix(c,rk,smoothstep(.2,.36,sl+(n3-.5)*.14));
 c=mix(c,rk,smoothstep(400.,480.,h+(n2-.5)*90.));
 c=mix(c,vec3(.93,.95,.98),smoothstep(500.,560.,h+(n1-.5)*100.)*smoothstep(.5,.22,sl));
 c=fields(c,h,sl,n1,n2);
 c=mix(vec3(.80,.74,.55),c,smoothstep(4.,15.,h+(n3-.5)*9.));
 c*=.84+.32*n4*(.55+.45*n3);
 float n5=texture2D(nTex,vWPos.xz/5.3).g,n6=texture2D(nTex,vWPos.xz/1.7).b;   // close-range grain for low flying
 float cl=1.-smoothstep(500.,2600.,length(cameraPosition-vWPos));
 c*=1.+cl*((n5-.5)*.26+(n6-.5)*.16);
 float wet=smoothstep(1.6,.1,h);c=mix(c,c*.62,wet*.8);                                  // wet sand at the waterline
 float foam=smoothstep(.55,.0,abs(h-.28-(n3-.5)*.5))*(.55+.45*n6);c=mix(c,vec3(.93,.96,.97),foam*.75);   // surf line
 return c;}`).replace('#include <color_fragment>','#include <color_fragment>\ndiffuseColor.rgb*=terr();')};
const terrain=new THREE.Mesh(buildTerrainGeo(QUALS[quality].seg),terrMat);
terrain.frustumCulled=false; scene.add(terrain);
let tCx=NaN,tCz=NaN;
function updateTerrain(cx,cz){
  tCx=cx;tCz=cz; terrain.position.set(cx,0,cz);
  const a=tPos.array;
  for(let i=0;i<tPos.count;i++){
    const x=tBase[i*3]+cx,z=tBase[i*3+2]+cz,h=groundH(x,z); a[i*3+1]=h;
  }
  tPos.needsUpdate=true; tGeo.computeVertexNormals(); placeTrees(cx,cz); placeTowns(cx,cz);
}
/* water: rolling swell normals, Fresnel sky reflection and a sun glint path */
const waterMat=new THREE.ShaderMaterial({fog:true,
  uniforms:THREE.UniformsUtils.merge([THREE.UniformsLib.fog,{t:{value:0},sunDir:{value:new THREE.Vector3(0,1,0)},sunCol:{value:new THREE.Color(0xfff0d8)},deep:{value:new THREE.Color(0x174a63)},skyc:{value:new THREE.Color(0xc6d9e5)},skyt:{value:new THREE.Color(0x2558a8)},shine:{value:1}}]),
  vertexShader:`varying vec3 vW;
#include <fog_pars_vertex>
void main(){vec4 w=modelMatrix*vec4(position,1.);vW=w.xyz;vec4 mvPosition=viewMatrix*w;gl_Position=projectionMatrix*mvPosition;
#include <fog_vertex>
}`,
  fragmentShader:`uniform float t,shine;uniform vec3 sunDir,sunCol,deep,skyc,skyt;varying vec3 vW;
#include <common>
#include <fog_pars_fragment>
void main(){vec2 p=vW.xz;vec2 g=vec2(0.);
 vec2 q=p+vec2(sin(p.y*.0013),cos(p.x*.0011))*260.;
 g+=vec2(.8,.6)*cos(dot(q,vec2(.8,.6))*.031+t*1.1)*.22;
 g+=vec2(-.5,.86)*cos(dot(q,vec2(-.5,.86))*.057+t*1.7)*.2;
 g+=vec2(.96,-.28)*cos(dot(p,vec2(.96,-.28))*.13+t*2.3)*.18;
 g+=vec2(.2,.98)*cos(dot(q,vec2(.2,.98))*.29+t*3.1)*.13;
 float dist=length(cameraPosition-vW);float hf=1.-smoothstep(600.,2500.,dist);
 g+=vec2(-.9,-.43)*cos(dot(p,vec2(-.9,-.43))*.67+t*4.2)*.09*hf;
 g+=vec2(.6,-.8)*cos(dot(q,vec2(.6,-.8))*1.31+t*5.3)*.06*hf;
float k=.5*clamp(1.-dist/5000.,.06,1.);
 vec3 N=normalize(vec3(-g.x*k,1.,-g.y*k));vec3 V=normalize(cameraPosition-vW);
 float fr=.02+.98*pow(1.-max(dot(N,V),0.),5.);
 vec3 R=reflect(-V,N);vec3 sk=mix(skyc*.94,skyt,clamp(R.y*2.2,0.,1.));
 vec3 c=mix(deep*(.92+.25*g.x),sk,clamp(fr*.9,0.,1.));
 float sd=max(dot(R,sunDir),0.);
 c+=sunCol*(pow(sd,300.)*3.+pow(sd,24.)*.14)*shine;
 gl_FragColor=vec4(c,1.);
#include <fog_fragment>
}`});
const water=new THREE.Mesh(new THREE.PlaneGeometry(TSIZE*1.3,TSIZE*1.3).rotateX(-Math.PI/2),waterMat);
/* forests: instanced conifers placed (deterministically) where the terrain shader paints forest, re-laid when the terrain recentres */
const treeGeo=(()=>{const a=new THREE.ConeGeometry(4.2,13,6);a.translate(0,9.5,0);return a})();
const trees=new THREE.InstancedMesh(treeGeo,new THREE.MeshLambertMaterial({color:0xffffff}),4500);
trees.frustumCulled=false;trees.count=0;scene.add(trees);
{const c=new THREE.Color();for(let i=0;i<4500;i++){c.setRGB(.27+Math.random()*.08,.4+Math.random()*.1,.19+Math.random()*.05);trees.setColorAt(i,c)}trees.instanceColor.needsUpdate=true}
function placeTrees(cx,cz){
  const max=Math.round(QUALS[quality].trees*(MAP==='ALPINE'?1.3:MAP==='OCEAN'?.6:1)); if(!max||MAP==='DESERT'){trees.count=0;trees.instanceMatrix.needsUpdate=true;return}
  const R=3400, cell=Math.round(R*2/Math.sqrt(max*2.2)), m=new THREE.Matrix4(), q=new THREE.Quaternion(), sc=new THREE.Vector3(), ps=new THREE.Vector3(); let n=0;
  const hs=(i,j,k)=>{const v=Math.sin(i*127.1+j*311.7+k*74.7)*43758.5453;return v-Math.floor(v)};
  const i0=Math.floor((cx-R)/cell),i1=Math.floor((cx+R)/cell),j0=Math.floor((cz-R)/cell),j1=Math.floor((cz+R)/cell);
  for(let i=i0;i<=i1&&n<max;i++)for(let j=j0;j<=j1&&n<max;j++){
    const x=(i+hs(i,j,1))*cell, z=(j+hs(i,j,2))*cell;
    if(Math.hypot(x*1.6,z)<3100)continue;
    const f=NOISE.at(x/2600,z/2600,0), p=Math.max(0,Math.min(1,(f-.5)/.2))*.95+.05;
    if(hs(i,j,3)>p)continue;
    const h=groundH(x,z); if(h<14||h>(MAP==='ALPINE'?1080:360))continue;
    if(Math.abs(groundH(x+8,z)-h)>5||Math.abs(groundH(x,z+8)-h)>5)continue;
    const k=.9+hs(i,j,4)*.8; sc.set(k,k*(.85+hs(i,j,5)*.4),k); q.setFromAxisAngle(UP,hs(i,j,6)*6.28); ps.set(x,h-1,z);
    m.compose(ps,q,sc); trees.setMatrixAt(n++,m)}
  trees.count=n; trees.instanceMatrix.needsUpdate=true}
/* settlements: warm clusters of lights on gentle low ground, laid deterministically per 5 km cell and re-laid with the terrain; shown at dusk and night */
const TOWN_MAX=1800, townPos=new Float32Array(TOWN_MAX*3), townCol=new Float32Array(TOWN_MAX*3), townGeo=new THREE.BufferGeometry();
townGeo.setAttribute('position',new THREE.BufferAttribute(townPos,3).setUsage(THREE.DynamicDrawUsage)); townGeo.setAttribute('color',new THREE.BufferAttribute(townCol,3).setUsage(THREE.DynamicDrawUsage)); townGeo.setDrawRange(0,0);
const townLights=new THREE.Points(townGeo,new THREE.PointsMaterial({size:2.6,sizeAttenuation:false,vertexColors:true,transparent:true,opacity:0,blending:THREE.AdditiveBlending,depthWrite:false,fog:false}));
townLights.frustumCulled=false; townLights.visible=false; scene.add(townLights);
function placeTowns(cx,cz){
  if(MAP==='OCEAN'){townGeo.setDrawRange(0,0);return}
  const CELL=5200,R=11000,hs=(i,j,k)=>{const v=Math.sin(i*91.7+j*263.1+k*57.3)*43758.5453;return v-Math.floor(v)}; let n=0;
  for(let i=Math.floor((cx-R)/CELL);i<=Math.floor((cx+R)/CELL);i++)for(let j=Math.floor((cz-R)/CELL);j<=Math.floor((cz+R)/CELL);j++){
    if(hs(i,j,1)>.62)continue; const x=(i+.15+hs(i,j,2)*.7)*CELL,z=(j+.15+hs(i,j,3)*.7)*CELL;
    if(Math.hypot(x*1.6,z)<3600)continue;
    const h=groundH(x,z); if(h<8||h>(MAP==='ALPINE'?900:260)||Math.abs(groundH(x+120,z)-h)>35||Math.abs(groundH(x,z+120)-h)>35)continue;
    const cnt=Math.round(12+hs(i,j,4)*46),rad=140+hs(i,j,5)*320;
    for(let k=0;k<cnt&&n<TOWN_MAX;k++){const a=hs(i,j,10+k)*6.283,r=rad*Math.pow(hs(i,j,80+k),.65),px=x+Math.cos(a)*r,pz=z+Math.sin(a)*r,py=groundH(px,pz);
      if(py<3)continue;townPos[n*3]=px;townPos[n*3+1]=py+4;townPos[n*3+2]=pz;
      const w=.7+hs(i,j,160+k)*.3;townCol[n*3]=1*w;townCol[n*3+1]=.82*w;townCol[n*3+2]=(.45+hs(i,j,240+k)*.2)*w;n++}}
  townGeo.setDrawRange(0,n); townGeo.attributes.position.needsUpdate=true; townGeo.attributes.color.needsUpdate=true}
water.frustumCulled=false; scene.add(water);
// soft sprite clouds: a painted puff texture, lit tops and greyer bases
/* cumulus puffs: many soft lobes, sunlit tops and blue-grey shaded bases baked into three texture variants */
const cloudTexs=[0,1,2].map(v=>{const S=256,cv=document.createElement('canvas');cv.width=cv.height=S;const c=cv.getContext('2d');
  const lobes=14+v*4;for(let i=0;i<lobes;i++){const a=Math.random()*Math.PI,rr=Math.random();
    const x=S/2+Math.cos(a)*rr*S*.3*(v===2?1.25:1),y=S*.56-Math.sin(a)*rr*S*.24,r=S*(.1+Math.random()*.13);
    const g=c.createRadialGradient(x,y,0,x,y,r);g.addColorStop(0,'rgba(255,255,255,.62)');g.addColorStop(.55,'rgba(255,255,255,.36)');g.addColorStop(1,'rgba(255,255,255,0)');c.fillStyle=g;c.fillRect(0,0,S,S)}
  c.globalCompositeOperation='source-atop';const sg=c.createLinearGradient(0,S*.25,0,S*.8);sg.addColorStop(0,'rgba(255,252,246,0)');sg.addColorStop(.55,'rgba(205,214,226,.35)');sg.addColorStop(1,'rgba(128,140,160,.85)');
  c.fillStyle=sg;c.fillRect(0,0,S,S);return new THREE.CanvasTexture(cv)});
const cloudMats=[];   // every cloud's materials, recoloured by applyEnv
const clouds=[];
for(let i=0;i<44;i++){
  const c=new THREE.Group(); const n=8+(Math.random()*7|0); const mats=cloudTexs.map(t=>new THREE.SpriteMaterial({map:t,transparent:true,depthWrite:false,opacity:.95}));
  mats.forEach(m=>cloudMats.push(m)); c.userData.mats=mats;
  for(let j=0;j<n;j++){const y=rand(-70,110);const m=new THREE.Sprite(mats[j%3]);const sc=rand(300,680)*(y>40?.8:1.1);m.scale.set(sc*1.45,sc*.8,1);m.position.set(rand(-480,480),y,rand(-340,340));c.add(m)}
  c.position.set(rand(-15000,15000),rand(2600,4200),rand(-15000,15000)); scene.add(c); clouds.push(c);
}
function applyCloudCount(){const w=typeof weather==='string'?weather:'SCATTERED';clouds.forEach((c,i)=>c.visible=w==='CLEAR'?false:(w==='OVERCAST'||w==='RAIN')?i<Math.min(44,QUALS[quality].clouds+14):i<QUALS[quality].clouds)}
applyCloudCount();


/* ---------------- jet model (true scale: 15 m long, 9.9 m span) ---------------- */
// navigation lights: red left wingtip, green right, white tail (what you see of a jet at night)
const NAVM=[new THREE.MeshBasicMaterial({color:0xff2a2a}),new THREE.MeshBasicMaterial({color:0x2aff5a}),new THREE.MeshBasicMaterial({color:0xffffff})], NAVG=new THREE.SphereGeometry(.22,6,4);
function withNav(root,type){const D=AC_DEFS[type];if(D&&D.fx&&D.fx.nav){const [sp,tl,tp]=D.fx.nav;[[sp,0,D.fx.navZ!=null?D.fx.navZ:-3.5,0],[-sp,0,D.fx.navZ!=null?D.fx.navZ:-3.5,1],[0,tp,tl,2]].forEach(([x,y,z,i])=>{const m=new THREE.Mesh(NAVG,NAVM[i]);m.position.set(x,y,z);m.name='nav';root.children[0].add(m)});return root}
  const f=type.startsWith('F16'), span=type.startsWith('MIG')||type.startsWith('SU')?5.7:type.startsWith('GRIPEN')?4.3:6.7,tail=type.startsWith('MIG')||type.startsWith('SU')?-8.6:type.startsWith('GRIPEN')?-6:-7.4;   // F-16 model is built in 0.75-scale units
  [[span,0,f?-2.2:-1.5,0],[-span,0,f?-2.2:-1.5,1],[0,f?3.6:2.6,tail,2]].forEach(([x,y,z,i])=>{const m=new THREE.Mesh(NAVG,NAVM[i]);m.position.set(x,y,z);m.name='nav';root.children[0].add(m)});return root}
function buildJet(c,type){type=type||'F16';const r=withNav(buildJetBase(c,type),type);
  r.traverse(o=>{const m=o.material;if(m&&m.isMeshStandardMaterial&&!m.__ibl){m.__ibl=true;m.envMapIntensity=.75;if(m.roughness>.55){m.roughness=.48;m.metalness=Math.max(m.metalness,.22)}}});
  return dressFlames(r)}
// per-aircraft size correction [across, up, along] so the lofted shapes match the real length and span; filled in the roster slice
const M2K={};
function buildJetBase(c,type){const D=AC_DEFS[type];if(typeof M2!=='undefined'&&M2[type]){const g=buildLoftJet(c,M2[type],type),k=M2K[type];if(k)g.scale.set(k[0],k[1],k[2]);return g}if(D&&D.model&&MODELS[D.model])return buildParam(c,MODELS[D.model]);if(type==='SU27'||type==='SU35'||type==='SU33')return buildSu(c,type);if(type==='MIG29K')return buildMig29(c,'35');return type==='GRIPEN'?buildGripen(c):type==='GRIPENE'?buildGripen(c,true):type==='F16B70'?buildF16(c,true):type==='MIG29'?buildMig29(c,'A'):type==='MIG29UPG'?buildMig29(c,'UPG'):type==='MIG35'?buildMig29(c,'35'):buildF16(c)}
function buildF16(c,b70){
  const g=new THREE.Group(), root=new THREE.Group(); root.add(g); g.scale.setScalar(.75);
  const body=new THREE.MeshStandardMaterial({color:c.body,roughness:.62,metalness:.1,flatShading:true,side:THREE.DoubleSide});
  const dark=new THREE.MeshStandardMaterial({color:c.dark,roughness:.5,metalness:.3,flatShading:true,side:THREE.DoubleSide});
  const glass=new THREE.MeshStandardMaterial({color:c.glass,roughness:.15,metalness:.55,emissive:c.glassE});
  const white=new THREE.MeshStandardMaterial({color:0xeeeeea,roughness:.5,flatShading:true});
  const add=(geo,mat,x,y,z)=>{const m=new THREE.Mesh(geo,mat);m.position.set(x,y,z);g.add(m);return m};
  let geo=new THREE.CylinderGeometry(1.05,.95,13,10); geo.rotateX(Math.PI/2); add(geo,body,0,0,.5).name='fuse';
  geo=new THREE.ConeGeometry(1.05,5.5,10); geo.rotateX(Math.PI/2); add(geo,body,0,0,9.75);
  geo=new THREE.CylinderGeometry(.05,.05,1.6,4); geo.rotateX(Math.PI/2); add(geo,dark,0,0,13.2);
  const can=add(new THREE.SphereGeometry(1,12,8),glass,0,.95,4.8); can.scale.set(.72,.62,2.4); can.name='canopy';
  add(new THREE.BoxGeometry(.9,.6,8),body,0,.8,-1.2);
  add(new THREE.BoxGeometry(1.7,1.1,3.4),body,0,-1.15,2.3);
  add(new THREE.BoxGeometry(1.45,.85,.2),dark,0,-1.15,4.05);
  add(new THREE.BoxGeometry(1.9,.55,8.5),body,0,-.75,-1.5);
  const plate=(pts,mat,y,depth)=>{for(const s of [1,-1]){
    const sh=new THREE.Shape(); sh.moveTo(pts[0][0]*s,pts[0][1]);
    for(let i=1;i<pts.length;i++) sh.lineTo(pts[i][0]*s,pts[i][1]);
    const eg=new THREE.ExtrudeGeometry(sh,{depth,bevelEnabled:false}); eg.rotateX(Math.PI/2); eg.translate(0,y+depth/2,0);
    g.add(new THREE.Mesh(eg,mat));}};
  plate([[.8,3.2],[6.4,-1.5],[6.4,-2.9],[.8,-4.2]],body,-.1,.22);
  plate([[.9,6.5],[1.9,2.6],[.9,2.6]],body,-.1,.18);
  plate([[.8,-4.8],[3.7,-7.1],[3.7,-7.9],[.8,-7.9]],body,-.2,.16);
  if(b70){ // Block 70: conformal fuel tanks along the upper fuselage; EW is internal, so no pod (IRST pod on the centreline)
    for(const s of [1,-1]){const cft=add(new THREE.BoxGeometry(.75,.55,6.2),body,.75*s,.85,-.2);cft.rotation.z=-.25*s}
    add(new THREE.BoxGeometry(.14,.5,1.4),dark,0,-1.3,.6);
    add(new THREE.CylinderGeometry(.22,.22,3.0,8).rotateX(Math.PI/2),dark,0,-1.75,.6);
    add(new THREE.SphereGeometry(.22,8,6),dark,0,-1.75,2.1);
  } else {
  // ALQ-184 ECM pod on the centreline pylon (station 5)
  add(new THREE.BoxGeometry(.14,.5,1.8),dark,0,-1.3,-.4);
  const pod=add(new THREE.CylinderGeometry(.32,.32,5.2,8).rotateX(Math.PI/2),dark,0,-1.85,-.6); pod.name='ecmPod';
  add(new THREE.ConeGeometry(.32,.8,8).rotateX(Math.PI/2),dark,0,-1.85,2.4);
  }
  const ts=new THREE.Shape(); ts.moveTo(-2.4,.9); ts.lineTo(-6.6,.9); ts.lineTo(-7.7,5.2); ts.lineTo(-6.3,5.2); ts.lineTo(-2.4,.9);
  const tg=new THREE.ExtrudeGeometry(ts,{depth:.2,bevelEnabled:false}); tg.rotateY(-Math.PI/2); tg.translate(.1,0,0); g.add(new THREE.Mesh(tg,body));
  geo=new THREE.CylinderGeometry(.92,.72,1.7,12,1,true); geo.rotateX(Math.PI/2); add(geo,dark,0,0,-6.8);
  // AIM-9X on wingtips, AIM-120C on underwing pylons
  const g9=new THREE.CylinderGeometry(.13,.13,4,6); g9.rotateX(Math.PI/2);
  const g120=new THREE.CylinderGeometry(.17,.17,4.9,6); g120.rotateX(Math.PI/2);
  [6.6,-6.6].forEach((x,i)=>{add(g9,white,x,-.1,-1.6).name='r9_'+i});
  [4.6,-4.6,3.0,-3.0].forEach((x,i)=>{add(g120,white,x,-.75,-1.2).name='r120_'+i});
  const fm=new THREE.MeshBasicMaterial({color:c.flame,transparent:true,opacity:.85,blending:THREE.AdditiveBlending,depthWrite:false});
  geo=new THREE.ConeGeometry(.68,4,10,1,true); geo.rotateX(-Math.PI/2); geo.translate(0,0,-2);
  add(geo,fm,0,0,-7.6).name='flame';
  return root;
}
// JAS 39C: close-coupled canard delta, 14.1 m long, 8.4 m span (true scale)
function buildGripen(c,isE){
  const g=new THREE.Group(), root=new THREE.Group(); root.add(g);
  const body=new THREE.MeshStandardMaterial({color:c.body,roughness:.62,metalness:.1,flatShading:true,side:THREE.DoubleSide});
  const dark=new THREE.MeshStandardMaterial({color:c.dark,roughness:.5,metalness:.3,flatShading:true,side:THREE.DoubleSide});
  const glass=new THREE.MeshStandardMaterial({color:c.glass,roughness:.15,metalness:.55,emissive:c.glassE});
  const white=new THREE.MeshStandardMaterial({color:0xeeeeea,roughness:.5,flatShading:true});
  const add=(geo,mat,x,y,z)=>{const m=new THREE.Mesh(geo,mat);m.position.set(x,y,z);g.add(m);return m};
  let geo=new THREE.CylinderGeometry(.75,.62,10.5,10); geo.rotateX(Math.PI/2); add(geo,body,0,0,0).name='fuse';
  if(isE){g.scale.z=15.2/14.1; add(new THREE.SphereGeometry(.12,8,6),dark,.22,.6,5.2).name='irst';}  // E: stretched 15.2 m, Skyward-G IRST ball
  geo=new THREE.ConeGeometry(.75,3.2,10); geo.rotateX(Math.PI/2); add(geo,body,0,0,6.85);
  geo=new THREE.CylinderGeometry(.04,.04,.9,4); geo.rotateX(Math.PI/2); add(geo,dark,0,0,8.85);
  const can=add(new THREE.SphereGeometry(1,12,8),glass,0,.72,3.6); can.scale.set(.55,.5,1.9); can.name='canopy';
  add(new THREE.BoxGeometry(.7,.45,6),body,0,.55,-.6);
  for(const s of [1,-1]){add(new THREE.BoxGeometry(.6,.95,2.8),body,.95*s,-.1,1.7);add(new THREE.BoxGeometry(.5,.8,.12),dark,.95*s,-.1,3.12)}
  const plate=(pts,mat,y,depth)=>{for(const s of [1,-1]){
    const sh=new THREE.Shape(); sh.moveTo(pts[0][0]*s,pts[0][1]);
    for(let i=1;i<pts.length;i++) sh.lineTo(pts[i][0]*s,pts[i][1]);
    const eg=new THREE.ExtrudeGeometry(sh,{depth,bevelEnabled:false}); eg.rotateX(Math.PI/2); eg.translate(0,y+depth/2,0);
    g.add(new THREE.Mesh(eg,mat));}};
  plate([[.7,1.4],[4.2,-3.3],[4.2,-4.1],[.7,-4.6]],body,-.25,.2);      // delta wing
  plate([[.95,3.1],[2.45,1.7],[2.45,1.25],[.95,1.05]],body,.2,.12);   // close-coupled canards
  const ts=new THREE.Shape(); ts.moveTo(-2.2,.6); ts.lineTo(-5.0,.6); ts.lineTo(-5.7,3.4); ts.lineTo(-4.7,3.4); ts.lineTo(-2.2,.6);
  const tg=new THREE.ExtrudeGeometry(ts,{depth:.16,bevelEnabled:false}); tg.rotateY(-Math.PI/2); tg.translate(.08,0,0); g.add(new THREE.Mesh(tg,body));
  geo=new THREE.CylinderGeometry(.62,.52,1.0,12,1,true); geo.rotateX(Math.PI/2); add(geo,dark,0,0,-5.6);
  // IRIS-T on the wingtips, Meteor on underwing pylons (true lengths 2.9 m / 3.65 m)
  const g9=new THREE.CylinderGeometry(.1,.1,2.94,6); g9.rotateX(Math.PI/2);
  const g120=new THREE.CylinderGeometry(.14,.14,3.65,6); g120.rotateX(Math.PI/2);
  [4.35,-4.35].forEach((x,i)=>{add(g9,white,x,-.25,-2.6).name='r9_'+i});
  [3.0,-3.0,1.95,-1.95].forEach((x,i)=>{add(g120,white,x,-.6,-1.9).name='r120_'+i});
  const fm=new THREE.MeshBasicMaterial({color:c.flame,transparent:true,opacity:.85,blending:THREE.AdditiveBlending,depthWrite:false});
  geo=new THREE.ConeGeometry(.5,3.4,10,1,true); geo.rotateX(-Math.PI/2); geo.translate(0,0,-1.7);
  add(geo,fm,0,0,-6.1).name='flame';
  return root;
}
// MiG-29 9.12: 17.3 m long, 11.4 m span, twin RD-33s, twin canted fins, big LERX (true scale)
// Su-27/Su-35: the Fulcrum layout grown 27 % (21.9 m, 14.7–15.3 m span) with a tail stinger; weapons hung at true size
function buildSu(c,type){
  const root=buildMig29(c,'SU'), g=root.children[0]; g.scale.setScalar(1.266);
  const body=new THREE.MeshStandardMaterial({color:c.body,roughness:.62,metalness:.1,flatShading:true});
  const st=new THREE.Mesh(new THREE.ConeGeometry(.45,3.2,8).rotateX(-Math.PI/2),body); st.position.set(0,-.2,-8.9); g.add(st);
  if(type==='SU35'){const nose=new THREE.Mesh(new THREE.ConeGeometry(.64,2.3,10).rotateX(Math.PI/2),new THREE.MeshStandardMaterial({color:0x5a6066,roughness:.7,flatShading:true}));nose.position.set(0,0,7.95);g.add(nose)}
  const arm=new THREE.Group(); root.add(arm); const white=new THREE.MeshStandardMaterial({color:0xeeeeea,roughness:.5,flatShading:true});
  const msl=(len,r,x,y,z,name)=>{const m=new THREE.Mesh(new THREE.CylinderGeometry(r,r,len,6).rotateX(Math.PI/2),white);m.position.set(x,y,z);m.name=name;arm.add(m)};
  [[7.3,-.4,-3.6],[-7.3,-.4,-3.6],[6.0,-.75,-3.0],[-6.0,-.75,-3.0]].forEach(([x,y,z],i)=>msl(2.9,.11,x,y,z,'r9_'+[0,1,2,3][i]));
  const lr=type==='SU35'&&c===PLAYER_COLORS&&suLR;
  if(type==='SU33'){const cm=new THREE.MeshStandardMaterial({color:c.body,roughness:.62,metalness:.1,flatShading:true,side:THREE.DoubleSide});for(const sg of [1,-1]){const sh=new THREE.Shape();sh.moveTo(.75*sg,5.6);sh.lineTo(2.6*sg,4.4);sh.lineTo(2.6*sg,3.9);sh.lineTo(.75*sg,4.1);const eg=new THREE.ExtrudeGeometry(sh,{depth:.12,bevelEnabled:false});eg.rotateX(Math.PI/2);eg.translate(0,.32,0);g.add(new THREE.Mesh(eg,cm))}}
  if(type==='SU27'||type==='SU33')[[4.7,-.85,-2.4],[-4.7,-.85,-2.4],[3.4,-.85,-2.0],[-3.4,-.85,-2.0],[1.45,-1.75,1.2],[-1.45,-1.75,1.2]].forEach(([x,y,z],i)=>msl(4.78,.17,x,y,z,'r120_'+i));
  else if(lr)[[3.4,-.95,-2.0],[-3.4,-.95,-2.0],[1.45,-1.85,1.2],[-1.45,-1.85,1.2]].forEach(([x,y,z],i)=>msl(4.2,.19,x,y,z,'r120_'+i));
  else [[4.7,-.85,-2.4],[-4.7,-.85,-2.4],[3.4,-.85,-2.0],[-3.4,-.85,-2.0],[1.45,-1.75,1.2],[-1.45,-1.75,1.2],[0,-1.35,3.2],[0,-1.35,-2.4]].forEach(([x,y,z],i)=>msl(3.71,.1,x,y,z,'r120_'+i));
  return root;
}
function buildMig29(c,upg){
  const g=new THREE.Group(), root=new THREE.Group(); root.add(g);
  const body=new THREE.MeshStandardMaterial({color:c.body,roughness:.62,metalness:.1,flatShading:true,side:THREE.DoubleSide});
  const dark=new THREE.MeshStandardMaterial({color:c.dark,roughness:.5,metalness:.3,flatShading:true,side:THREE.DoubleSide});
  const glass=new THREE.MeshStandardMaterial({color:c.glass,roughness:.15,metalness:.55,emissive:c.glassE});
  const white=new THREE.MeshStandardMaterial({color:0xeeeeea,roughness:.5,flatShading:true});
  const add=(geo,mat,x,y,z)=>{const m=new THREE.Mesh(geo,mat);m.position.set(x,y,z);g.add(m);return m};
  let geo=new THREE.CylinderGeometry(.62,.78,6.8,10); geo.rotateX(Math.PI/2); add(geo,body,0,0,3.4).name='fuse';
  geo=new THREE.ConeGeometry(.62,2.2,10); geo.rotateX(Math.PI/2); add(geo,body,0,0,7.9);
  geo=new THREE.CylinderGeometry(.035,.035,1.2,4); geo.rotateX(Math.PI/2); add(geo,dark,0,0,9.5);
  const can=add(new THREE.SphereGeometry(1,12,8),glass,0,.75,4.6); can.scale.set(.55,.5,1.9); can.name='canopy';
  add(new THREE.SphereGeometry(.13,8,6),dark,.18,.72,6.35).name='irst';                            // IRST/laser rangefinder ball
  add(new THREE.BoxGeometry(.8,.5,5.5),body,0,.5,-.4);
  if(upg==='35'){add(new THREE.BoxGeometry(1.1,.75,7.5),body,0,.75,-1.2); geo=new THREE.ConeGeometry(.55,1.6,8); geo.rotateX(Math.PI/2); add(geo,body,0,.75,3.3)} // bigger dorsal spine (fuel + avionics)
  add(new THREE.BoxGeometry(2.6,.5,8),body,0,-.05,-3.4);                                // flat lifting centre body
  for(const s of [1,-1]){
    geo=new THREE.CylinderGeometry(.62,.62,9.3,10); geo.rotateX(Math.PI/2); add(geo,body,1.05*s,-.35,-3.15);
    add(new THREE.BoxGeometry(1.0,.75,2.0),body,1.05*s,-.6,2.5); add(new THREE.BoxGeometry(.85,.6,.12),dark,1.05*s,-.6,3.52);
    geo=new THREE.CylinderGeometry(.6,.5,.9,12,1,true); geo.rotateX(Math.PI/2); add(geo,dark,1.05*s,-.35,-8.2);
  }
  const plate=(pts,mat,y,depth)=>{for(const s of [1,-1]){
    const sh=new THREE.Shape(); sh.moveTo(pts[0][0]*s,pts[0][1]);
    for(let i=1;i<pts.length;i++) sh.lineTo(pts[i][0]*s,pts[i][1]);
    const eg=new THREE.ExtrudeGeometry(sh,{depth,bevelEnabled:false}); eg.rotateX(Math.PI/2); eg.translate(0,y+depth/2,0);
    g.add(new THREE.Mesh(eg,mat));}};
  plate([[1.6,1.0],[5.68,-3.5],[5.68,-4.6],[1.6,-5.2]],body,-.15,.2);   // 42° swept wing
  plate([[.6,5.4],[1.8,1.0],[.6,1.0]],body,-.05,.16);                   // LERX
  plate([[1.6,-6.0],[4.0,-7.6],[4.0,-8.2],[1.6,-8.3]],body,-.2,.14);    // stabilators
  for(const s of [1,-1]){ // twin fins, canted outward
    const ts=new THREE.Shape(); ts.moveTo(-4.0,.3); ts.lineTo(-7.2,.3); ts.lineTo(-7.9,3.4); ts.lineTo(-6.7,3.4); ts.lineTo(-4.0,.3);
    const tg=new THREE.ExtrudeGeometry(ts,{depth:.14,bevelEnabled:false}); tg.rotateY(-Math.PI/2); tg.translate(.07,0,0); tg.rotateZ(-.11*s);
    const f=new THREE.Mesh(tg,body); f.position.x=1.35*s; f.position.y=.1; g.add(f);
  }
  // R-73 on the outer two pylons each side, R-27R inboard (true lengths 2.9 m / 4.08 m)
  const g9=new THREE.CylinderGeometry(.11,.11,2.9,6); g9.rotateX(Math.PI/2);
  const g120=new THREE.CylinderGeometry(.15,.15,4.08,6); g120.rotateX(Math.PI/2);
  if(upg==='SU'){ /* Sukhoi: weapons are hung by buildSu at true size */ } else if(upg==='35'){ // MiG-35: 4 pylons per wing; R-73 outermost, three R-77-1 inboard each side, refuelling probe
    [5.3,-5.3].forEach((x,i)=>{add(g9,white,x,-.5,-2.6).name='r9_'+i});
    const g77=new THREE.CylinderGeometry(.1,.1,3.71,6); g77.rotateX(Math.PI/2);
    [4.4,-4.4,3.5,-3.5,2.6,-2.6].forEach((x,i)=>{add(g77,white,x,-.58,-2.0).name='r120_'+i});
    geo=new THREE.CylinderGeometry(.05,.05,1.6,5); geo.rotateX(Math.PI/2); add(geo,dark,.5,.45,6.8);
  } else if(upg==='UPG'){ // UPG: R-73 outboard, four R-77 (3.6 m, grid-fin tail), and the retractable refuelling probe on the left nose
    [4.6,-4.6].forEach((x,i)=>{add(g9,white,x,-.55,-2.4).name='r9_'+i});
    const g77=new THREE.CylinderGeometry(.1,.1,3.6,6); g77.rotateX(Math.PI/2);
    [3.6,-3.6,2.6,-2.6].forEach((x,i)=>{add(g77,white,x,-.58,-2.0).name='r120_'+i});
    geo=new THREE.CylinderGeometry(.05,.05,1.6,5); geo.rotateX(Math.PI/2); add(geo,dark,.5,.45,6.8);
  } else {
    [4.6,-4.6,3.6,-3.6].forEach((x,i)=>{add(g9,white,x,-.55,-2.4).name='r9_'+i});
    [2.6,-2.6].forEach((x,i)=>{add(g120,white,x,-.6,-1.8).name='r120_'+i});
  }
  const fm=new THREE.MeshBasicMaterial({color:c.flame,transparent:true,opacity:.85,blending:THREE.AdditiveBlending,depthWrite:false});
  const fl=new THREE.Group(); fl.position.set(0,-.35,-8.65); fl.name='flame'; g.add(fl);
  for(const s of [1,-1]){geo=new THREE.ConeGeometry(.48,3.4,10,1,true); geo.rotateX(-Math.PI/2); geo.translate(0,0,-1.7);
    const m=new THREE.Mesh(geo,fm); m.position.x=1.05*s; fl.add(m)}
  return root;
}

/* parametric true-scale model: fuselage tube + nose, intakes, delta/trapezoid wings, canards, tails, nozzles, missile rails.
   +z is forward, +x is the left wing (matches the other models). */
const MODELS={
  F15:{fr:.95,fl:13.6,fz:-1.8,nl:4.2,radome:1,boxes:[[3.3,.9,11.5,0,-.05,-3.2]],intakes:[[1.6,0,1.4,1.0,1.35,4.6],[-1.6,0,1.4,1.0,1.35,4.6]],
    canopy:[4.0,.98,.62,.58,2.1],wing:[[1.5,1.6],[6.5,-3.5],[6.5,-5.1],[1.5,-5.6]],wingY:-.05,htail:[[1.7,-6.6],[4.3,-8.4],[4.3,-9.4],[1.7,-9.1]],htailY:-.05,
    vtails:[{x:1.55,cant:.04,pts:[[-5.0,.45],[-7.6,.45],[-9.3,3.6],[-8.0,3.6]]},{x:-1.55,cant:-.04,pts:[[-5.0,.45],[-7.6,.45],[-9.3,3.6],[-8.0,3.6]]}],
    nozzles:[[.72,0,-9.15,.58],[-.72,0,-9.15,.58]],m9:[3.0,.07],m120:[3.66,.09],
    r9:[[4.45,-.55,-2.7],[-4.45,-.55,-2.7]],r120:[[3.45,-.6,-2.4],[-3.45,-.6,-2.4],[1.75,-.9,1.4],[-1.75,-.9,1.4],[1.75,-.9,-3.6],[-1.75,-.9,-3.6]]},
  TYPHOON:{fr:.8,fl:10.4,fz:-1.6,nl:3.7,radome:1,intakes:[[0,-.85,1.1,1.6,.8,3.4]],canopy:[3.7,.8,.5,.48,1.8],
    wing:[[.75,.9],[5.45,-4.3],[5.45,-4.9],[.75,-6.2]],wingY:-.2,canard:[[.7,4.8],[2.3,3.6],[2.3,3.2],[.7,3.5]],canardY:.2,
    vtails:[{x:0,cant:0,pts:[[-3.4,.7],[-6.3,.7],[-7.0,3.9],[-5.9,3.9]]}],nozzles:[[.5,0,-7.0,.5],[-.5,0,-7.0,.5]],m9:[2.94,.07],m120:[3.65,.09],
    r9:[[4.7,-.45,-3.0],[-4.7,-.45,-3.0]],r120:[[3.6,-.55,-2.3],[-3.6,-.55,-2.3],[2.6,-.55,-1.9],[-2.6,-.55,-1.9],[.78,-.95,-1.0],[-.78,-.95,-1.0]]},
  RAFALE:{fr:.75,fl:9.8,fz:-1.5,nl:3.7,radome:1,intakes:[[.98,-.45,1.0,.7,.9,2.7],[-.98,-.45,1.0,.7,.9,2.7]],canopy:[3.4,.78,.48,.46,1.7],
    wing:[[.8,1.0],[5.45,-4.6],[5.45,-5.25],[.8,-6.0]],wingY:-.15,canard:[[.85,2.7],[2.45,1.5],[2.45,1.1],[.85,1.2]],canardY:.35,
    vtails:[{x:0,cant:0,pts:[[-2.8,.68],[-5.6,.68],[-6.4,3.6],[-5.3,3.6]]}],nozzles:[[.45,0,-6.75,.45],[-.45,0,-6.75,.45]],m9:[3.1,.08],m120:[3.65,.09],
    r9:[[5.45,-.1,-3.5],[-5.45,-.1,-3.5],[4.2,-.5,-2.7],[-4.2,-.5,-2.7]],r120:[[3.0,-.55,-2.1],[-3.0,-.55,-2.1],[.82,-.95,-1.6],[-.82,-.95,-1.6]]},
  J10:{fr:.8,fl:10.8,fz:-1.4,nl:3.7,radome:1,intakes:[[0,-.95,1.5,1.5,.9,3.4]],canopy:[4.1,.82,.5,.52,1.7],
    wing:[[.8,1.5],[4.9,-4.3],[4.9,-4.9],[.8,-5.8]],wingY:-.25,canard:[[.75,4.0],[2.05,3.0],[2.05,2.6],[.75,2.8]],canardY:.15,
    vtails:[{x:0,cant:0,pts:[[-2.6,.7],[-5.9,.7],[-7.0,4.2],[-5.8,4.2]]},{x:.55,cant:2.6,pts:[[-4.6,.4],[-6.3,.4],[-6.6,1.2],[-5.6,1.2]]},{x:-.55,cant:-2.6,pts:[[-4.6,.4],[-6.3,.4],[-6.6,1.2],[-5.6,1.2]]}],
    nozzles:[[0,0,-7.25,.56]],m9:[3.0,.08],m120:[3.99,.1],
    r9:[[4.3,-.55,-2.8],[-4.3,-.55,-2.8]],r120:[[3.3,-.6,-2.2],[-3.3,-.6,-2.2],[2.2,-.6,-1.7],[-2.2,-.6,-1.7]]},
  J20:{fr:1.0,fl:14.6,fz:-1.7,nl:4.6,radome:0,boxes:[[2.8,.7,12.5,0,-.15,-2.0]],intakes:[[1.5,-.05,2.6,.95,1.15,4.2],[-1.5,-.05,2.6,.95,1.15,4.2]],
    canopy:[5.3,1.0,.6,.55,2.4],wing:[[1.25,.6],[6.5,-5.4],[6.5,-6.2],[1.25,-7.3]],wingY:0,canard:[[1.4,4.0],[3.65,2.4],[3.65,1.9],[1.4,2.1]],canardY:.25,
    vtails:[{x:1.4,cant:.35,pts:[[-5.6,.55],[-7.8,.55],[-8.6,2.6],[-7.3,2.6]]},{x:-1.4,cant:-.35,pts:[[-5.6,.55],[-7.8,.55],[-8.6,2.6],[-7.3,2.6]]},
            {x:1.2,cant:2.75,pts:[[-6.0,.5],[-7.8,.5],[-8.2,1.4],[-7.2,1.4]]},{x:-1.2,cant:-2.75,pts:[[-6.0,.5],[-7.8,.5],[-8.2,1.4],[-7.2,1.4]]}],
    nozzles:[[.75,0,-9.45,.6],[-.75,0,-9.45,.6]],m9:[3.0,.08],m120:[3.99,.1],internal:true,
    r9:[[1.25,-.35,.6],[-1.25,-.35,.6]],r120:[[.5,-.6,-1.0],[-.5,-.6,-1.0],[.5,-.6,-3.6],[-.5,-.6,-3.6]]}};
MODELS.FA18={fr:.85,fl:12.0,fz:-1.6,nl:3.6,radome:1,intakes:[[1.25,-.35,.6,.8,.95,2.8],[-1.25,-.35,.6,.8,.95,2.8]],canopy:[3.6,.86,.5,.5,1.9],
  wing:[[1.4,.6],[6.8,-2.2],[6.8,-3.6],[1.4,-4.4]],wingY:-.1,canard:[[.8,6.2],[1.9,1.0],[.8,1.0]],canardY:.05,htail:[[1.3,-5.6],[3.6,-6.9],[3.6,-7.9],[1.3,-7.6]],htailY:-.1,
  vtails:[{x:1.0,cant:.35,pts:[[-3.2,.5],[-5.3,.5],[-6.5,3.1],[-5.4,3.1]]},{x:-1.0,cant:-.35,pts:[[-3.2,.5],[-5.3,.5],[-6.5,3.1],[-5.4,3.1]]}],
  nozzles:[[.55,0,-7.65,.48],[-.55,0,-7.65,.48]],m9:[3.0,.07],m120:[3.66,.09],
  r9:[[6.85,-.05,-3.0],[-6.85,-.05,-3.0]],r120:[[4.9,-.6,-1.9],[-4.9,-.6,-1.9],[3.4,-.6,-1.5],[-3.4,-.6,-1.5],[1.15,-1.05,-1.0],[-1.15,-1.05,-1.0]]};
MODELS.F15EX=Object.assign({},MODELS.F15,{boxes:[[3.3,.9,11.5,0,-.05,-3.2],[.55,.7,6.5,2.15,-.35,-2.6],[.55,.7,6.5,-2.15,-.35,-2.6]],
  r9:[[4.75,-.55,-2.8],[-4.75,-.55,-2.8],[3.35,-.55,-2.7],[-3.35,-.55,-2.7]],
  r120:[[4.05,-.8,-2.4],[-4.05,-.8,-2.4],[1.75,-.9,1.4],[-1.75,-.9,1.4],[1.75,-.9,-3.6],[-1.75,-.9,-3.6],[2.55,-.8,-2.0],[-2.55,-.8,-2.0]]});
// the tube runs 1.6 m further forward (shorter nose cone) so the nose starts well ahead of the cockpit panel
for(const k in MODELS){const M=MODELS[k];if(M.__x)continue;M.__x=1;M.fl+=1.6;M.fz+=.8;M.nl-=1.6}
function buildParam(c,M){
  const g=new THREE.Group(), root=new THREE.Group(); root.add(g);
  const body=new THREE.MeshStandardMaterial({color:c.body,roughness:.62,metalness:.1,flatShading:true,side:THREE.DoubleSide});
  const dark=new THREE.MeshStandardMaterial({color:c.dark,roughness:.5,metalness:.3,flatShading:true,side:THREE.DoubleSide});
  const glass=new THREE.MeshStandardMaterial({color:c.glass,roughness:.15,metalness:.55,emissive:c.glassE});
  const white=new THREE.MeshStandardMaterial({color:0xeeeeea,roughness:.5,flatShading:true});
  const add=(geo,mat,x,y,z)=>{const m=new THREE.Mesh(geo,mat);m.position.set(x,y,z);g.add(m);return m};
  let geo=new THREE.CylinderGeometry(M.fr,M.fr*.86,M.fl,12); geo.rotateX(Math.PI/2); add(geo,body,0,0,M.fz).name='fuse';
  const zf=M.fz+M.fl/2; geo=new THREE.ConeGeometry(M.fr,M.nl,12); geo.rotateX(Math.PI/2); add(geo,M.radome?dark:body,0,0,zf+M.nl/2);
  if(M.radome){geo=new THREE.CylinderGeometry(M.fr,M.fr,.25,12,1,true);geo.rotateX(Math.PI/2);add(geo,body,0,0,zf+.12)}
  (M.boxes||[]).forEach(([w,h,l,x,y,z])=>add(new THREE.BoxGeometry(w,h,l),body,x,y,z));
  (M.intakes||[]).forEach(([x,y,z,w,h,l])=>{add(new THREE.BoxGeometry(w,h,l),body,x,y,z);add(new THREE.BoxGeometry(w*.86,h*.8,.1),dark,x,y,z+l/2+.02)});
  const [cz,cy,sx,sy,sz]=M.canopy; const can=add(new THREE.SphereGeometry(1,12,8),glass,0,cy,cz); can.scale.set(sx,sy,sz); can.name='canopy';
  geo=new THREE.BoxGeometry(sx*1.3,sy*.9,sz*2.4); add(geo,body,0,cy-.18,cz-sz*1.6);   // spine behind the canopy
  const plate=(pts,mat,y,depth)=>{for(const s of [1,-1]){
    const sh=new THREE.Shape(); sh.moveTo(pts[0][0]*s,pts[0][1]); for(let i=1;i<pts.length;i++)sh.lineTo(pts[i][0]*s,pts[i][1]);
    const eg=new THREE.ExtrudeGeometry(sh,{depth,bevelEnabled:false}); eg.rotateX(Math.PI/2); eg.translate(0,y+depth/2,0); g.add(new THREE.Mesh(eg,mat))}};
  plate(M.wing,body,M.wingY,.22); if(M.canard)plate(M.canard,body,M.canardY,.12); if(M.htail)plate(M.htail,body,M.htailY,.14);
  for(const v of M.vtails){const sh=new THREE.Shape(); sh.moveTo(v.pts[0][0],v.pts[0][1]); for(let i=1;i<v.pts.length;i++)sh.lineTo(v.pts[i][0],v.pts[i][1]);
    const tg=new THREE.ExtrudeGeometry(sh,{depth:.16,bevelEnabled:false}); tg.rotateY(-Math.PI/2); tg.translate(.08,0,0);
    const gr=new THREE.Group(); gr.position.x=v.x; gr.rotation.z=v.cant; gr.add(new THREE.Mesh(tg,body)); g.add(gr)}
  for(const [x,y,z,r] of M.nozzles){geo=new THREE.CylinderGeometry(r,r*.86,1.2,12,1,true); geo.rotateX(Math.PI/2); add(geo,dark,x,y,z)}
  const g9=new THREE.CylinderGeometry(M.m9[1],M.m9[1],M.m9[0],6); g9.rotateX(Math.PI/2);
  const g120=new THREE.CylinderGeometry(M.m120[1],M.m120[1],M.m120[0],6); g120.rotateX(Math.PI/2);
  M.r9.forEach((p,i)=>{add(g9,white,...p).name='r9_'+i}); M.r120.forEach((p,i)=>{add(g120,white,...p).name='r120_'+i});
  const fm=new THREE.MeshBasicMaterial({color:c.flame,transparent:true,opacity:.85,blending:THREE.AdditiveBlending,depthWrite:false});
  const zn=M.nozzles[0][2]-.6, fl=new THREE.Group(); fl.position.set(0,M.nozzles[0][1],zn); fl.name='flame'; g.add(fl);
  for(const [x,,,r] of M.nozzles){geo=new THREE.ConeGeometry(r*.85,3.6,10,1,true); geo.rotateX(-Math.PI/2); geo.translate(0,0,-1.8); const m=new THREE.Mesh(geo,fm); m.position.x=x; fl.add(m)}
  return root}
// cockpit eye point and cut-away tube for the parametric jets (model units = metres)
for(const id of ['F15C','F15EX','TYPHOON','RAFALE','J10C','J20','FA18E']){const D=AC_DEFS[id],M=MODELS[D.model];
  D.eye=[0,M.canopy[1]+.14,M.canopy[0]+.15]; D.cut={r:M.fr,full:[M.fz-M.fl/2,M.canopy[0]-1.2],open:[M.canopy[0]-1.2,M.fz+M.fl/2]}}
/* ================= lofted true-scale jet models =================
   fuselage and nacelles: cross-sections [z, halfWidth, heightAbove, depthBelow, centreY, superellipse n] lofted nose-to-tail;
   wings, canards and stabilators: spanwise sections {x, zle, zte, y, t} with a diamond airfoil (t = thickness/chord);
   fins: sections {h, zle, zte} lofted upward, then canted. +z is forward, +x is the left wing, y up; 1 unit = 1 m. */
const LOFT_N=18;
function loftGeo(st,opts){
  opts=opts||{};const N=opts.n||LOFT_N, pos=[], idx=[], sk=opts.skipTop;
  for(const [z,w,ht,hb,yc,ne] of st){const e=2/(ne||2.4);
    for(let j=0;j<N;j++){const a=j/N*Math.PI*2,c=Math.cos(a),s=Math.sin(a);
      pos.push(Math.sign(c)*Math.pow(Math.abs(c),e)*w, (yc||0)+Math.sign(s)*Math.pow(Math.abs(s),e)*(s>=0?ht:hb), z)}}
  for(let i=0;i<st.length-1;i++){const zm=(st[i][0]+st[i+1][0])/2;
    for(let j=0;j<N;j++){const a=i*N+j,b=i*N+(j+1)%N,c=(i+1)*N+j,d=(i+1)*N+(j+1)%N;
      if(sk&&zm>sk[0]&&zm<sk[1]){const ang=(j+.5)/N*Math.PI*2;if(Math.sin(ang)>.35)continue}
      idx.push(a,c,b,b,c,d)}}
  if(opts.capTail!==false){const base=pos.length/3;const s0=st[0];pos.push(0,s0[4]||0,s0[0]);for(let j=0;j<N;j++)idx.push(base,j,(j+1)%N)}
  const g=new THREE.BufferGeometry();g.setAttribute('position',new THREE.Float32BufferAttribute(pos,3));g.setIndex(idx);g.computeVertexNormals();return g}
// spanwise surface (both sides unless half): diamond section, max thickness at 40 % chord
function wingGeo(st,mirror){
  const pos=[],idx=[];
  const sec=(s,sg)=>{const c=s.zle-s.zte,zm=s.zle-c*.4,t=(s.t||.04)*c/2,x=s.x*sg,y=s.y||0;return[[x,y,s.zle],[x,y+t,zm],[x,y,s.zte],[x,y-t,zm]]};
  for(const sg of mirror===false?[1]:[1,-1]){const b0=pos.length/3;
    st.forEach(s=>sec(s,sg).forEach(p=>pos.push(...p)));
    for(let i=0;i<st.length-1;i++)for(let j=0;j<4;j++){const a=b0+i*4+j,b=b0+i*4+(j+1)%4,c=b0+(i+1)*4+j,d=b0+(i+1)*4+(j+1)%4;if(sg>0)idx.push(a,b,c,b,d,c);else idx.push(a,c,b,b,c,d)}
    const L=b0+(st.length-1)*4;if(sg>0)idx.push(L,L+1,L+2,L,L+2,L+3);else idx.push(L,L+2,L+1,L,L+3,L+2)}
  const g=new THREE.BufferGeometry();g.setAttribute('position',new THREE.Float32BufferAttribute(pos,3));g.setIndex(idx);g.computeVertexNormals();g.userData.secN=4;return g}   // secN: four vertices per section, used to orient the paint normals
// fin: sections {h, zle, zte, t} stacked upward from y=0, thickness along x
function finGeo(st){const ws=st.map(s=>({x:s.h,zle:s.zle,zte:s.zte,t:s.t||.05,y:0}));const g=wingGeo(ws,false);
  const p=g.attributes.position;for(let i=0;i<p.count;i++){const x=p.getX(i),y=p.getY(i);p.setXYZ(i,y,x,p.getZ(i))}g.computeVertexNormals();return g}
// missile: body, ogive nose, cruciform fins; named group so launch rails find it
function mslMesh(len,r,mat,name,fin){const g=new THREE.Group();g.name=name;
  const b=new THREE.Mesh(new THREE.CylinderGeometry(r,r,len*.86,8).rotateX(Math.PI/2),mat);b.position.z=-len*.07;g.add(b);
  const n=new THREE.Mesh(new THREE.ConeGeometry(r,len*.14,8).rotateX(Math.PI/2),mat);n.position.z=len*.43;g.add(n);
  const fs=fin||r*3.2;for(const a of [0,Math.PI/2]){const f=new THREE.Mesh(new THREE.BoxGeometry(fs,.012,len*.1),mat);f.rotation.z=a+Math.PI/4;f.position.z=-len*.44;g.add(f);
    const f2=new THREE.Mesh(new THREE.BoxGeometry(fs*.7,.012,len*.06),mat);f2.rotation.z=a+Math.PI/4;f2.position.z=len*.2;g.add(f2)}
  return g}
const MSL_DIM={'AIM-9X':[3.0,.08],'AIM-120C':[3.66,.1],'AIM-120C-7':[3.66,.1],'AIM-120D':[3.66,.1],'R-73':[2.9,.1],'R-27R':[4.08,.13],'R-27ER':[4.78,.15],'R-77':[3.6,.11],'R-77-1':[3.71,.11],
  'R-37M':[4.2,.19],'IRIS-T':[2.94,.08],'METEOR':[3.65,.1],'MICA IR':[3.1,.09],'PL-10':[3.0,.09],'PL-15':[4.0,.11]};
/* ================= jet detail: paint, panel lines, control surfaces, canopies, pilots, decals ================= */
// real-world schemes. p: 0 solid, 1 soft two-tone, 2 splinter, 3 digital. c: three paint colours, b: belly colour (null = same), soot: exhaust staining
const PAINT={
  F16:{p:1,c:['#8e969d','#737b83','#9aa2a8'],nat:'usaf',num:'AF 90-0812',lowvis:1},
  F16B70:{p:1,c:['#868f97','#6c757d','#939ba2'],nat:'usaf',num:'AF 21-1001',lowvis:1},
  F15C:{p:1,c:['#9aa3ab','#7e8995','#a7afb6'],nat:'usaf',num:'AF 86-0172',lowvis:1},
  F15EX:{p:1,c:['#7b858f','#646e78','#858f98'],nat:'usaf',num:'AF 20-0001',lowvis:1},
  FA18E:{p:1,c:['#a2a9af','#8a939b','#adb3b8'],nat:'usn',num:'NE 201',nose:'201',lowvis:1},
  GRIPEN:{p:0,c:['#7f888f','#737c84','#8a9399'],nat:'swe',num:'39271'},
  GRIPENE:{p:0,c:['#6f7880','#646d75','#7a838b'],nat:'swe',num:'39-8'},
  TYPHOON:{p:0,c:['#8d959b','#81898f','#99a0a6'],nat:'raf',num:'ZK342',lowvis:1},
  RAFALE:{p:0,c:['#626d79','#58636f','#6e7984'],nat:'fra',num:'30-GX',lowvis:1},
  J10C:{p:1,c:['#8f989f','#7a858e','#9ca4aa'],nat:'prc',num:'62125',nose:'62125'},
  J20:{p:0,c:['#4d5258','#45494f','#565b61'],nat:'prc',num:'78271',nose:'78271'},
  MIG29:{p:2,c:['#9aa6aa','#76858b','#b3bcbf'],b:'#c8d3da',nat:'rus',nose:'08'},
  MIG29UPG:{p:2,c:['#7e8d9b','#5e6d7c','#9caab5'],b:'#b9c4cc',nat:'ind',num:'KB 3112'},
  MIG35:{p:3,c:['#8ea2b4','#62798f','#bccad5'],b:'#cfd9e1',nat:'rus',nose:'35'},
  MIG29K:{p:0,c:['#5c6a77','#536170','#677581'],b:'#a9b6c1',nat:'rus',nose:'41'},
  SU27:{p:2,c:['#a9bccb','#7f98ad','#5c7a92'],b:'#cbd9e3',nat:'rus',nose:'02'},
  SU33:{p:2,c:['#9fb2c1','#6c8599','#c9d6df'],b:'#cfdbe3',nat:'rus',nose:'77'},
  SU35:{p:3,c:['#7e9bb6','#58779a','#a8c0d3'],b:'#c6d5e0',nat:'rus',nose:'01'}};
const PAINT_DEF={p:0,c:['#8a95a0','#7a8590','#96a0aa']};
function paintMat(type,base){
  const P=PAINT[type]||PAINT_DEF, m=base.clone(); m.color.setHex(0xffffff);
  m.userData.pu={pc0:{value:new THREE.Color(P.c[0])},pc1:{value:new THREE.Color(P.c[1])},pc2:{value:new THREE.Color(P.c[2])},pBel:{value:new THREE.Color(P.b||P.c[0])},
    pPat:{value:P.p},pBelK:{value:P.b?1:0},pTail:{value:-8},pSc:{value:1.9}};
  m.extensions={derivatives:true}; m.userData.paint=1; m.onBeforeCompile=paintCompile; return m}
function paintCompile(sh){const u=this.userData.pu; if(u)for(const k in u)sh.uniforms[k]=u[k]; sh.uniforms.nTex={value:NOISE};
  sh.vertexShader=sh.vertexShader.replace('#include <common>','#include <common>\nattribute vec3 jp;attribute vec3 jn;varying vec3 vJP;varying vec3 vJN;')
    .replace('#include <begin_vertex>','#include <begin_vertex>\nvJP=jp;vJN=jn;');
  sh.fragmentShader=sh.fragmentShader.replace('#include <common>',`#include <common>
uniform vec3 pc0,pc1,pc2,pBel;uniform float pPat,pBelK,pTail,pSc;uniform sampler2D nTex;varying vec3 vJP;varying vec3 vJN;
float ph(vec2 p){return fract(sin(dot(p,vec2(127.1,311.7)))*43758.5453);}
float splinter(vec2 p){vec2 i=floor(p),f=fract(p);float md=9.,id=0.;
 for(int y=-1;y<=1;y++)for(int x=-1;x<=1;x++){vec2 g=vec2(float(x),float(y));vec2 o=vec2(ph(i+g),ph(i+g+17.3));vec2 r=g+o-f;float d=max(abs(r.x),abs(r.y))*.55+length(r)*.45;if(d<md){md=d;id=ph(i+g+5.1);}}
 return id;}
vec3 paint(){vec3 n=normalize(vJN);bool side=abs(n.x)>.62;vec2 p=side?vec2(vJP.z,vJP.y*1.3+3.7):vec2(vJP.z,vJP.x);p/=pSc;
 float id;vec3 c;
 if(pPat<.5){c=pc0;}
 else if(pPat<1.5){float t=texture2D(nTex,p*.09).r;c=mix(pc0,pc1,smoothstep(.47,.53,t+(n.y>.6&&abs(vJP.x)<1.3?.12:0.)));}
 else if(pPat<2.5){id=splinter(p*.75);c=id<.42?pc0:id<.76?pc1:pc2;}
 else {vec2 q=floor(p*5.)/5.;float t=texture2D(nTex,q*.06).g*.7+ph(q)*.3;c=t<.45?pc0:t<.62?pc1:pc2;}
 if(pBelK>.5)c=mix(c,pBel,smoothstep(-.25,-.5,n.y));
 // panel lines: frame stations along the length, plus a panel grid on wings and tails
 float wz=fwidth(vJP.z)+1e-4, lz=abs(fract(vJP.z/1.27+.5)-.5)*1.27, ln=1.-smoothstep(.012,.012+wz*1.4,lz);
 if(abs(n.y)>.6&&abs(vJP.x)>1.25){float wx=fwidth(vJP.x)+1e-4,lx=abs(fract(vJP.x/1.05+.5)-.5)*1.05;ln=max(ln,1.-smoothstep(.012,.012+wx*1.4,lx));}
 ln*=1.-smoothstep(.015,.05,wz);
 float pid=ph(floor(vec2(vJP.z/1.27,vJP.x/1.05+vJP.y)));
 c*=(1.-.24*ln)*(.975+.05*pid);
 // grime and exhaust soot
 float gr=texture2D(nTex,vJP.zx/7.).g;c*=.93+.1*gr;
 c=mix(c,c*.42,smoothstep(pTail+3.2,pTail+.2,vJP.z)*(.55+.35*gr));
 return c;}`).replace('#include <color_fragment>','#include <color_fragment>\ndiffuseColor.rgb=paint();')}
// bake jet-space position and normal into each painted mesh so paint stays put when a surface moves
function bakePaint(g,mat){g.updateMatrixWorld(true);const iv=new THREE.Matrix4().copy(g.matrixWorld).invert(),M=new THREE.Matrix4(),N=new THREE.Matrix3(),v=new THREE.Vector3();
  g.traverse(o=>{if(!o.isMesh||o.material!==mat||o.geometry.attributes.jp)return;const ge=o.geometry,p=ge.attributes.position,nn=ge.attributes.normal;M.multiplyMatrices(iv,o.matrixWorld);N.getNormalMatrix(M);
    const jp=new Float32Array(p.count*3),jn=new Float32Array(p.count*3),c=new THREE.Vector3(),w=new THREE.Vector3();
    for(let i=0;i<p.count;i++){v.fromBufferAttribute(p,i).applyMatrix4(M);jp[i*3]=v.x;jp[i*3+1]=v.y;jp[i*3+2]=v.z;c.add(v)}c.divideScalar(Math.max(1,p.count));
    const sN=ge.userData&&ge.userData.secN;   // wings, fins and control surfaces: face outward from their own section, so dihedral and anhedral don't flip the paint
    for(let i=0;i<p.count;i++){let cx=c.x,cy=c.y,cz=c.z;if(sN){const k=i-i%sN;cx=cy=cz=0;for(let q=0;q<sN;q++){cx+=jp[(k+q)*3];cy+=jp[(k+q)*3+1];cz+=jp[(k+q)*3+2]}cx/=sN;cy/=sN;cz/=sN}
      v.fromBufferAttribute(nn,i).applyMatrix3(N).normalize();w.set(jp[i*3]-cx,(jp[i*3+1]-cy)*3,jp[i*3+2]-cz);if(v.dot(w)<0)v.negate();jn[i*3]=v.x;jn[i*3+1]=v.y;jn[i*3+2]=v.z}
    ge.setAttribute('jp',new THREE.BufferAttribute(jp,3));ge.setAttribute('jn',new THREE.BufferAttribute(jn,3))})}
// national markings and numbers, drawn once per design on a canvas
const DECAL_TEX={};
function decalTex(kind,txt,lowvis){const key=kind+'|'+(txt?txt.s+(txt.red?'r':''):'')+'|'+(lowvis?1:0);if(DECAL_TEX[key])return DECAL_TEX[key];
  const cv=document.createElement('canvas');cv.width=256;cv.height=kind==='text'?128:256;const c=cv.getContext('2d'),W=256,H=cv.height,cx=128,cy=H/2;
  const star=(x,y,r,ri,fill)=>{c.beginPath();for(let i=0;i<10;i++){const a=-Math.PI/2+i*Math.PI/5,rr=i%2?ri:r;c.lineTo(x+Math.cos(a)*rr,y+Math.sin(a)*rr)}c.closePath();c.fillStyle=fill;c.fill()};
  const disc=(r,f)=>{c.beginPath();c.arc(cx,cy,r,0,7);c.fillStyle=f;c.fill()};
  const lv=lowvis;
  if(kind==='usaf'||kind==='usn'){const g=lv?'#4d555c':'#1d3a78';c.fillStyle=g;c.fillRect(8,102,240,52);disc(84,g);star(cx,cy,78,30,lv?'#9aa1a7':'#ffffff');c.fillStyle=lv?'#9aa1a7':'#fff';c.fillRect(56,114,144,28);star(cx,cy,64,24,lv?'#9aa1a7':'#fff');
    c.fillStyle=lv?'#4d555c':'#1d3a78';c.fillRect(10,116,40,24);c.fillRect(206,116,40,24)}
  else if(kind==='swe'){disc(118,lv?'#5d7a95':'#0a5aa8');c.fillStyle=lv?'#c9c9a0':'#f6c400';const cr=(x,y,s)=>{c.fillRect(x-s,y,s*2,s*.7);for(const k of [-1,0,1]){c.beginPath();c.moveTo(x+k*s*.8-s*.25,y);c.lineTo(x+k*s*.8,y-s*.9);c.lineTo(x+k*s*.8+s*.25,y);c.fill()}};
    cr(cx-40,cy-30,22);cr(cx+40,cy-30,22);cr(cx,cy+42,22)}
  else if(kind==='raf'){disc(118,lv?'#7d8fa8':'#1d3f8a');disc(50,lv?'#c98f8f':'#c8102e')}
  else if(kind==='fra'){disc(118,lv?'#a35f62':'#c8102e');disc(82,lv?'#c9cdd1':'#ffffff');disc(46,lv?'#56698a':'#0b3d91')}
  else if(kind==='ita'){disc(118,lv?'#8fa08f':'#009246');disc(80,lv?'#c9ccd0':'#ffffff');disc(44,lv?'#a35f62':'#ce2b37')}
  else if(kind==='ind'){disc(118,'#ff9933');disc(80,'#ffffff');disc(42,'#138808')}
  else if(kind==='ger'){c.fillStyle=lv?'#c9ccd0':'#ffffff';c.fillRect(cx-100,cy-36,200,72);c.fillRect(cx-36,cy-100,72,200);c.fillStyle=lv?'#3b4046':'#0a0a0a';c.fillRect(cx-92,cy-28,184,56);c.fillRect(cx-28,cy-92,56,184)}   // Balkenkreuz
  else if(kind==='jp'){disc(112,lv?'#9aa0a6':'#ffffff');disc(78,lv?'#8f4f56':'#bc002d')}   // hinomaru
  else if(kind==='isr'){disc(118,lv?'#c9ccd0':'#ffffff');c.strokeStyle=lv?'#5b6f9a':'#0038b8';c.lineWidth=11;c.lineJoin='miter';for(const d of [-1,1]){c.beginPath();for(let i=0;i<3;i++){const a=(d>0?-Math.PI/2:Math.PI/2)+i*2*Math.PI/3;c.lineTo(cx+Math.cos(a)*62,cy+Math.sin(a)*62)}c.closePath();c.stroke()}c.fillStyle=lv?'#5b6f9a':'#0038b8';c.fillRect(cx-98,cy-84,196,10);c.fillRect(cx-98,cy+74,196,10)}   // Magen David
  else if(kind==='prc'){c.fillStyle='#c8102e';c.fillRect(4,104,248,48);c.fillStyle='#f6c400';c.fillRect(4,118,248,6);star(cx,cy,104,42,'#f6c400');star(cx,cy,92,37,'#c8102e');
    c.fillStyle='#f6c400';c.font='bold 46px sans-serif';c.textAlign='center';c.textBaseline='middle';c.fillText('八一',cx,cy+6)}
  else if(kind==='rus'){star(cx,cy+8,124,50,'#c8102e');star(cx,cy+8,112,45,'#ffffff');star(cx,cy+8,96,38,'#c8102e')}
  else if(kind==='text'){c.font='bold 92px "Arial Narrow",Arial,sans-serif';c.textAlign='center';c.textBaseline='middle';
    if(txt.red){c.lineWidth=10;c.strokeStyle='#f2f2f2';c.strokeText(txt.s,cx,cy+4);c.fillStyle='#c8102e';c.fillText(txt.s,cx,cy+4)}
    else{c.fillStyle=lv?'#40474e':'#151719';c.fillText(txt.s,cx,cy+4)}}
  const t=new THREE.CanvasTexture(cv);t.anisotropy=4;return DECAL_TEX[key]=t}
const DECAL_MATS={};
function decalMat(kind,txt,lowvis){const key=kind+'|'+(txt?txt.s+(txt.red?'r':''):'')+'|'+(lowvis?1:0);if(DECAL_MATS[key])return DECAL_MATS[key];
  return DECAL_MATS[key]=new THREE.MeshStandardMaterial({map:decalTex(kind,txt,lowvis),transparent:true,alphaTest:.35,roughness:.6,metalness:.1,polygonOffset:true,polygonOffsetFactor:-2,polygonOffsetUnits:-2,depthWrite:false,side:THREE.DoubleSide})}
// cross-section lookups used to sit decals, gear and pods on the skin
function secAt(st,z){if(z<=st[0][0])return st[0];for(let i=1;i<st.length;i++)if(st[i][0]>=z){const a=st[i-1],b=st[i],t=(z-a[0])/(b[0]-a[0]);return a.map((v,k)=>v+(b[k]-v)*t)}return st[st.length-1]}
function bellyAt(S,z,x){let y=(()=>{const s=secAt(S.fus,z);return Math.abs(x)<s[1]?s[4]-s[3]:1e9})();
  for(const p of S.parts||[]){const xs=p.x?[p.x,-p.x]:[0];for(const px of xs){if(z<p.st[0][0]||z>p.st[p.st.length-1][0])continue;const s=secAt(p.st,z);if(Math.abs(x-px)<s[1]*1.05)y=Math.min(y,s[4]-s[3])}}
  return y>1e8?secAt(S.fus,z)[4]-secAt(S.fus,z)[3]:y}
const lerp3=(a,b,t)=>a+(b-a)*t;
function finAt(st,h){if(h<=st[0].h)return st[0];for(let i=1;i<st.length;i++)if(st[i].h>=h){const a=st[i-1],b=st[i],t=(h-a.h)/((b.h-a.h)||1);return{h,zle:lerp3(a.zle,b.zle,t),zte:lerp3(a.zte,b.zte,t),t:lerp3(a.t||.05,b.t||.05,t)}}return st[st.length-1]}
// a hinged trailing-edge strip (aileron, flap, elevon) for one side of a wing
function hingeStrip(r,t,f0,f1,frac,s,mat,kind){
  const at=f=>({x:lerp3(r.x,t.x,f),zle:lerp3(r.zle,t.zle,f),zte:lerp3(r.zte,t.zte,f),y:lerp3(r.y||0,t.y||0,f),t:lerp3(r.t||.04,t.t||.04,f)});
  const a=at(f0),b=at(f1),sec=o=>{const c=o.zle-o.zte;return{x:o.x*s,zle:o.zte+c*frac,zte:o.zte-.02,y:o.y,t:o.t*1.15}};
  const A=sec(a),B=sec(b),geo=wingGeo([A,B],false),piv=new THREE.Vector3(A.x,A.y,A.zle),ax=new THREE.Vector3(B.x-A.x,B.y-A.y,B.zle-A.zle).normalize();if(ax.x<0)ax.negate();
  geo.translate(-piv.x,-piv.y,-piv.z);const grp=new THREE.Group();grp.position.copy(piv);grp.name='cs';grp.userData={cs:kind,s,ax:ax.toArray()};grp.add(new THREE.Mesh(geo,mat));return grp}
function buildLoftJet(c,S,type){
  const g=new THREE.Group(), root=new THREE.Group(); root.add(g);
  const PS=PAINT[type]||PAINT_DEF;
  const body0=new THREE.MeshStandardMaterial({color:c.body,roughness:.5,metalness:.18,side:THREE.DoubleSide}), body=paintMat(type,body0);
  const dark=new THREE.MeshStandardMaterial({color:new THREE.Color(PS.c[1]).multiplyScalar(.62),roughness:.5,metalness:.3,side:THREE.DoubleSide});
  const metal=new THREE.MeshStandardMaterial({color:0x6b6a68,roughness:.35,metalness:.85,side:THREE.DoubleSide});
  const glass=new THREE.MeshPhysicalMaterial({color:new THREE.Color(c.glass).multiplyScalar(.5),roughness:.03,metalness:.3,emissive:c.glassE,transparent:true,opacity:.5,envMapIntensity:2.4,clearcoat:1,clearcoatRoughness:.02,side:THREE.DoubleSide,depthWrite:false});glass.__ibl=true;
  glass.onBeforeCompile=sh=>{sh.fragmentShader=sh.fragmentShader.replace('#include <dithering_fragment>','#include <dithering_fragment>\n float fr=pow(1.-abs(dot(normalize(normal),normalize(vViewPosition))),2.4);gl_FragColor.a=mix(.2,.93,fr);gl_FragColor.rgb+=vec3(.2,.16,.08)*fr;')};   // clear when you look straight through, a bright gold coating at grazing angles
  const white=new THREE.MeshStandardMaterial({color:0xe6e6e0,roughness:.5});
  const black=new THREE.MeshStandardMaterial({color:0x0b0c0d,roughness:.8,side:THREE.DoubleSide});
  const add=(geo,mat,name,par)=>{const m=new THREE.Mesh(geo,mat);if(name)m.name=name;(par||g).add(m);return m};
  // fuselage (radome split off in the dark colour), plus a copy with the cockpit tub opened for the cockpit view
  const rz=S.radome, fst=S.fus;
  if(rz!=null){const k=fst.findIndex(s=>s[0]>=rz);let mid=null;if(k>0&&Math.abs(fst[k][0]-rz)>.01){const a=fst[k-1],b=fst[k],t=(rz-a[0])/(b[0]-a[0]);mid=a.map((v,i)=>v+(b[i]-v)*t)}
    const back=fst.filter(s=>s[0]<=rz+.01).concat(mid?[mid]:[]), front=(mid?[mid]:[]).concat(fst.filter(s=>s[0]>=rz-.01));add(loftGeo(back),body,'fuse').userData.st=back;add(loftGeo(front,{capTail:false}),dark,'radome')}
  else add(loftGeo(fst),body,'fuse');
  const cz=S.canopy[0],cut=add(loftGeo(rz!=null?g.getObjectByName('fuse').userData.st:fst,{skipTop:[cz-1.3,cz+1.4]}),body,'fuseCut');cut.visible=false;
  for(const p of S.parts||[]){const xs=p.x?[p.x,-p.x]:[0];for(const x of xs){const m=add(loftGeo(p.st,{n:p.n||12}),p.dark?dark:body);m.position.x=x;
      if(p.mouth){const [z,w,ht,hb,yc]=p.st[p.st.length-1];const mo=add(new THREE.PlaneGeometry(w*1.8,(ht+hb)*.9),black);mo.position.set(x,yc+(ht-hb)/2,z-.02)}}}
  // control surfaces follow every station of a multi-section wing (one strip per segment) so they stay inside the planform
  const segStrips=(st,lo,hi,frac,sd,mat,kind)=>{const x0=st[0].x,span=st[st.length-1].x-x0;if(!(span>0))return;
    for(let i=0;i<st.length-1;i++){const a=st[i],b=st[i+1],fa=(a.x-x0)/span,fb=(b.x-x0)/span,l=Math.max(lo,fa),h=Math.min(hi,fb);if(h-l<.03)continue;g.add(hingeStrip(a,b,(l-fa)/(fb-fa),(h-fa)/(fb-fa),frac,sd,mat,kind))}};
  // flying surfaces: the biggest is the wing; stubby ones are strakes/LERX; the rest move (tailplanes behind, canards ahead)
  const ws=S.wings.map(w=>{const r=w.st[0],t=w.st[w.st.length-1];return{w,r,t,span:t.x-r.x,ch:r.zle-r.zte}});
  const main=ws.reduce((a,b)=>b.t.x>a.t.x?b:a);
  ws.forEach(o=>{o.kind=o===main?'main':o.span/o.ch<.5?'fix':o.r.zle<main.r.zte?'stab':'can'});
  const hasStab=ws.some(o=>o.kind==='stab');
  for(const o of ws){const mat=o.w.dark?dark:body;
    if(o.kind==='main'||o.kind==='fix'){add(wingGeo(o.w.st),mat);
      if(o.kind==='main')for(const s of [1,-1]){
        if(hasStab){segStrips(o.w.st,.52,.94,.24,s,mat,'ail');segStrips(o.w.st,.1,.5,.26,s,mat,'flap')}
        else{segStrips(o.w.st,.12,.5,.2,s,mat,'elv');segStrips(o.w.st,.52,.95,.2,s,mat,'elv')}}}
    else for(const s of [1,-1]){const st=o.w.st.map(q=>Object.assign({},q,{x:q.x*s})),geo=wingGeo(st,false),pz=o.r.zle-o.ch*.42,piv=new THREE.Vector3(o.r.x*s,o.r.y||0,pz);
      geo.translate(-piv.x,-piv.y,-piv.z);const grp=new THREE.Group();grp.position.copy(piv);grp.name='cs';grp.userData={cs:o.kind,s,ax:[1,0,0]};add(geo,mat,null,grp);g.add(grp)}}
  // fins: rudders on the trailing edge; the J-20's fins are all-moving
  const allMove=type==='J20';
  for(const f of S.fins||[]){const xs=f.mirror?[f.x,-f.x]:[f.x||0];xs.forEach((x,i)=>{const gr=new THREE.Group();gr.name='finG';gr.position.set(x,f.y||0,0);gr.rotation.z=(i?-1:1)*(f.cant||0);g.add(gr);
      const ventral=Math.abs(f.cant||0)>1.5, top=f.st[f.st.length-1].h;
      if(allMove&&!ventral){const b0=finAt(f.st,0),pz=b0.zle-(b0.zle-b0.zte)*.45,geo=finGeo(f.st);geo.translate(0,0,-pz);const mg=new THREE.Group();mg.position.z=pz;mg.name='cs';mg.userData={cs:'afin',s:i?-1:1,ax:[0,1,0]};add(geo,body,null,mg);gr.add(mg)}
      else add(finGeo(f.st),body,null,gr);
      if(!ventral&&!allMove){const a=finAt(f.st,top*.1),b=finAt(f.st,top*.86),sc=o=>{const ch=o.zle-o.zte;return{h:o.h,zle:o.zte+ch*.3,zte:o.zte-.02,t:(o.t||.05)*1.1}};
        const A=sc(a),B=sc(b),geo=finGeo([A,B]);geo.translate(0,-A.h,-A.zle);const rg=new THREE.Group();rg.position.set(0,A.h,A.zle);rg.name='cs';
        rg.userData={cs:'rud',s:i?-1:1,ax:new THREE.Vector3(0,B.h-A.h,B.zle-A.zle).normalize().toArray()};add(geo,body,null,rg);gr.add(rg)}
      // fin markings
      if(!ventral){const m=finAt(f.st,top*.55),ch=m.zle-m.zte,hw=(m.t||.05)*ch/2*.9+.015;
        const fk=PS.nat==='rus'||PS.nat==='prc'?PS.nat:PS.nat==='fra'||PS.nat==='raf'||PS.nat==='swe'||PS.nat==='ind'||PS.nat==='ita'?PS.nat:null;
        for(const sd of [1,-1]){
          if(fk){const sz=Math.min(ch*.5,1.05),d=add(new THREE.PlaneGeometry(sz,sz*(fk==='prc'?.62:1)),decalMat(fk,null,PS.lowvis),'decal',gr);d.position.set(sd*hw,m.h,m.zle-ch*.5);d.rotation.y=sd*Math.PI/2}
          if(PS.num){const t2=finAt(f.st,top*(fk?.24:.5)),c2=t2.zle-t2.zte,w2=Math.min(c2*.75,1.6),d=add(new THREE.PlaneGeometry(w2,w2*.5),decalMat('text',{s:PS.num},PS.lowvis),'decal',gr);
            d.position.set(sd*((t2.t||.05)*c2/2*.9+.016),t2.h,t2.zle-c2*.5);d.rotation.y=sd*Math.PI/2}}}})}
  // wing markings (top surface)
  {const o=main,f=.6,x=lerp3(o.r.x,o.t.x,f),zle=lerp3(o.r.zle,o.t.zle,f),zte=lerp3(o.r.zte,o.t.zte,f),ch=zle-zte,y=lerp3(o.r.y||0,o.t.y||0,f),th=lerp3(o.r.t||.04,o.t.t||.04,f)*ch/2*.92;
    const nk=PS.nat==='usn'?'usaf':PS.nat, sz=Math.min(ch*.62,PS.nat==='usaf'||PS.nat==='usn'?1.5:1.25);
    if(nk)for(const s of (nk==='usaf'?[1]:[1,-1])){const d=add(new THREE.PlaneGeometry(sz*(nk==='usaf'||nk==='prc'?1.6:1),sz*(nk==='usaf'?.65:nk==='prc'?.62:1)),decalMat(nk,null,PS.lowvis),'decal');d.position.set(x*s,y+th+.02,zle-ch*.45);d.rotation.x=-Math.PI/2}}
  // nose numbers (Russian red bort numbers, Chinese and US Navy modex)
  if(PS.nose||PS.nat==='usaf'||PS.nat==='usn'){const zN=(rz!=null?Math.min(rz-.7,cz-1.1):cz-1.6),s=secAt(fst,zN);
    for(const sd of [1,-1]){let mat,w;if(PS.nose){mat=decalMat('text',{s:PS.nose,red:PS.nat==='rus'},PS.lowvis);w=PS.nose.length>3?1.1:.95}
      else{mat=decalMat(PS.nat,null,PS.lowvis);w=.85}
      const zz=PS.nose?zN:cz-1.75-.4, ss=PS.nose?s:secAt(fst,zz), d=add(new THREE.PlaneGeometry(w,w*(PS.nose?.5:.4)),mat,'decal');d.position.set(sd*(ss[1]+.012),ss[4]+(PS.nose?-.02:-ss[3]*.35),zz);d.rotation.y=sd*Math.PI/2}}
  // canopy: hinged at the back so it can open on the ground; frames by type
  const [cZ,cY,sx,sy,sz]=S.canopy, cg=new THREE.Group(); cg.name='canopyG'; cg.position.set(0,cY,cZ-sz*.92); g.add(cg);
  const can=add(new THREE.SphereGeometry(1,24,14),glass,'canopy',cg); can.position.set(0,0,sz*.92); can.scale.set(sx,sy,sz);
  const bow=(zo,par,name)=>{const k=Math.sqrt(Math.max(.05,1-(zo/sz)**2)),fr=add(new THREE.TorusGeometry(sx*k*.99,.035,5,18,Math.PI),dark,name||'cframe',par||cg);fr.position.set(0,0,(par===g?cZ:sz*.92)+zo);if(par===g)fr.position.y=cY;fr.scale.set(1,sy/sx,1);return fr};
  if(S.frame)bow(S.frame);
  if(!/^F16/.test(type))bow(sz*.58,g,'wsbow');
  if(type==='F15EX')bow(-.1);
  if(/^(MIG|SU)/.test(type))bow(sz*.12);
  for(const s of [1,-1]){const r=add(new THREE.BoxGeometry(.05,.05,sz*1.75),dark,'cframe',cg);r.position.set(s*sx*.99,0,sz*.92)}
  // pilot (helmet, visor, shoulders), hidden in the cockpit view
  {const D=AC_DEFS[type],e=D&&D.eye?D.eye:[0,cY+sy*.38,cZ+sz*.12],pg=new THREE.Group();pg.name='pilot';g.add(pg);
    const rus=/^(MIG|SU)/.test(type),hm=new THREE.MeshStandardMaterial({color:rus?0xe8e8e2:0x6f7478,roughness:.45}),vm=new THREE.MeshStandardMaterial({color:0x1a1408,roughness:.08,metalness:.9}),sm=new THREE.MeshStandardMaterial({color:rus?0x55603f:0x4f5a43,roughness:.9});
    const h=add(new THREE.SphereGeometry(.15,12,10),hm,null,pg);h.position.set(0,e[1]-.05,e[2]-.1);
    const v=add(new THREE.SphereGeometry(.152,12,8,-Math.PI*.35,Math.PI*.7,Math.PI*.3,Math.PI*.3),vm,null,pg);v.position.copy(h.position);
    const sh=add(new THREE.BoxGeometry(.46,.3,.32),sm,null,pg);sh.position.set(0,e[1]-.36,e[2]-.18);
    const hr=add(new THREE.BoxGeometry(.5,.55,.12),dark,null,pg);hr.position.set(0,e[1]-.15,e[2]-.42)}
  if(S.irst){const ir=add(new THREE.SphereGeometry(.13,10,8),new THREE.MeshStandardMaterial({color:0x2a2a1a,roughness:.1,metalness:.8}),'irst');ir.position.set(...S.irst)}
  {const tip=fst[fst.length-1],pt=add(new THREE.CylinderGeometry(.013,.02,1.1,6).rotateX(Math.PI/2),metal);pt.position.set(0,tip[4],tip[0]+.42);                       // pitot boom
   const aT=cz-S.canopy[4]*1.05-.7,sT=secAt(fst,aT),bl=add(new THREE.BoxGeometry(.018,.2,.14),dark);bl.position.set(0,sT[4]+sT[2]+.08,aT);                       // spine blade antenna
   const aB=cz-1.9,sB=secAt(fst,aB),bb=add(new THREE.BoxGeometry(.018,.16,.12),dark);bb.position.set(0,sB[4]-sB[3]-.07,aB);                                        // belly blade antenna
   const zD=Math.min(...S.noz.map(n=>n[2]))+3.4,sD=secAt(fst,zD);for(const sx2 of [-1,1]){const d=add(new THREE.BoxGeometry(.2,.025,.46),black);d.position.set(sx2*Math.min(.32,sD[1]*.45),sD[4]-sD[3]+.005,zD)}}   // chaff/flare dispensers
  if(S.probe){const pr=add(new THREE.CylinderGeometry(.045,.045,S.probe[3],5).rotateX(Math.PI/2),dark);pr.position.set(S.probe[0],S.probe[1],S.probe[2])}
  if(S.stinger)add(loftGeo(S.stinger,{n:10}),body);
  // nozzles: petals open in afterburner; thrust-vectoring ones swivel; a faint heat-haze plume behind each
  const fm=new THREE.MeshBasicMaterial({color:c.flame,transparent:true,opacity:.85,blending:THREE.AdditiveBlending,depthWrite:false});
  const fl=new THREE.Group(); fl.name='flame'; fl.position.set(0,S.noz[0][1],S.noz[0][2]-S.noz[0][4]*.5-.1); g.add(fl);
  for(const [x,y,z,r,len] of S.noz){const ng=new THREE.Group();ng.name='nozG';ng.userData={s:Math.sign(x)};ng.position.set(x,y,z+len*.5);g.add(ng);
    const n=add(new THREE.CylinderGeometry(r*.94,r,len,18,1,true).rotateX(Math.PI/2),metal,'noz',ng);n.position.z=-len*.5;
    const lip=add(new THREE.TorusGeometry(r*.98,.03,4,18),dark,null,n);lip.position.z=-len*.5;
    const th=add(new THREE.CircleGeometry(r*.85,16),black,null,ng);th.position.z=-len*.2;th.rotation.y=Math.PI;
    const hz=add(HAZE_GEO,HAZE_MAT,'haze',ng);hz.position.z=-len;hz.scale.set(r/.5,r/.5,1);
    const cgm=new THREE.ConeGeometry(r*.82,3.6,12,1,true);cgm.rotateX(-Math.PI/2);cgm.translate(0,0,-1.8);const m=new THREE.Mesh(cgm,fm);m.position.x=x;fl.add(m)}
  // stores: rails carry the real missile sizes for this jet's weapons; pylons go away with their missile
  const ac=AC_DEFS[type], d9=MSL_DIM[ac.srFull]||[3,.09], dM=MSL_DIM[ac.mrFull]||[3.7,.1];
  const lr=type==='SU35'&&c===PLAYER_COLORS&&suLR, d120=lr?MSL_DIM['R-37M']:dM;
  const pyl=(x,y,z,top,nm)=>{if(top==null||top-y<.25)return;const p=add(new THREE.BoxGeometry(.09,top-y-.1,1.4),dark,'py_'+nm);p.position.set(x,(top+y)/2,z)};
  (S.r9||[]).forEach(([x,y,z,top],i)=>{const m=mslMesh(d9[0],d9[1],white,'r9_'+i);m.position.set(x,y,z);g.add(m);pyl(x,y+d9[1],z,top,'r9_'+i)});
  (lr&&S.r120lr?S.r120lr:S.r120||[]).forEach(([x,y,z,top],i)=>{const m=mslMesh(d120[0],d120[1],white,'r120_'+i);m.position.set(x,y,z);g.add(m);if(!S.internal)pyl(x,y+d120[1],z,top,'r120_'+i)});
  if(S.hook){const h=add(new THREE.BoxGeometry(.08,.08,1.6),dark);h.position.set(0,S.hook[1],S.hook[0])}
  body.userData.pu.pTail.value=Math.min(...S.noz.map(n=>n[2]))+.6;
  bakePaint(g,body);
  root.userData.spec=S;
  return root}
// heat haze: a faint, rippling plume behind each nozzle
const HAZE_GEO=(()=>{const g=new THREE.CylinderGeometry(1.15,.5,7,14,6,true);g.rotateX(Math.PI/2);g.translate(0,0,-3.5);return g})();
const HAZE_MAT=new THREE.ShaderMaterial({transparent:true,depthWrite:false,side:THREE.DoubleSide,uniforms:{t:{value:0},k:{value:0}},
  vertexShader:'varying vec3 vP;varying float vF;void main(){vP=position;vec4 mv=modelViewMatrix*vec4(position,1.);vec3 n=normalize(normalMatrix*normal);vF=abs(dot(n,normalize(-mv.xyz)));gl_Position=projectionMatrix*mv;}',
  fragmentShader:'uniform float t,k;varying vec3 vP;varying float vF;void main(){float a=sin(vP.z*3.1+t*31.)*sin(atan(vP.y,vP.x)*5.+vP.z*1.7-t*23.)*.5+.5;float f=smoothstep(-7.,-4.5,vP.z)*smoothstep(0.,-.6,vP.z);'+
    'gl_FragColor=vec4(vec3(.9+.1*a),(.012+.03*a)*f*vF*vF*k);}'});
// far-away jets drop their small details (markings, pilot, frames, haze) to save draw calls
const DET_NAMES=new Set(['decal','pilot','haze','cframe','wsbow','hole','cs']);
function lodJet(obj,d){if(!obj)return;const far=d>1400;if(obj.__far===far)return;obj.__far=far;
  if(!obj.__det){obj.__det=[];obj.traverse(o=>{if(DET_NAMES.has(o.name)&&o.name!=='cs')obj.__det.push(o)})}
  for(const o of obj.__det)o.visible=!far}
// control surfaces, nozzles and canopy follow the stick, throttle and ground state
const _ax=new THREE.Vector3();
function animJet(obj,j,dt,isPlayer){
  if(!obj)return; let A=obj.__anim;
  if(!A){A=obj.__anim={cs:[],noz:[],can:null,d:new Map()};obj.traverse(o=>{if(o.name==='cs')A.cs.push(o);else if(o.name==='nozG')A.noz.push(o);else if(o.name==='canopyG')A.can=o;else if(o.name&&o.name.startsWith('py_'))(A.py||(A.py=[])).push(o)});
    if(A.py)A.py.forEach(p=>p.__rail=obj.getObjectByName(p.name.slice(3)))}
  const ci=j&&j.ci||[0,0,0,0], ground=isPlayer&&P.onGround, k=1-Math.exp(-dt*12);
  const r=ground?0:ci[0], p=ground?0:ci[1], y=ci[2]||0, thr=isPlayer?throttle:(ci[3]||.6), slow=j&&j.kcas!=null?clamp((230-j.kcas)/90,0,1):0, gearDn=isPlayer&&P.gear?1:0;
  for(const o of A.cs){const u=o.userData,s=u.s;let t=0;
    switch(u.cs){case 'stab':t=-p*.33+s*r*.12;break;case 'can':t=p*.28-s*r*.04;break;case 'ail':t=s*r*.38;break;case 'flap':t=Math.max(slow*.4,gearDn*.55);break;
      case 'elv':t=s*r*.3-p*.28;break;case 'rud':t=y*.45-r*.06;break;case 'afin':t=(y*.3-r*.04)*s;break}
    const d=(o.__d||0)+(t-(o.__d||0))*k;o.__d=d;_ax.fromArray(u.ax);o.quaternion.setFromAxisAngle(_ax,u.cs==='rud'||u.cs==='afin'?d:-d)}
  const ab=thr>.81, tv=j&&j.ac&&j.ac.tvc;
  for(const n of A.noz){const ns=ab?1.13:thr<.25?1.02:.93,c=n.children[0];if(c){const v=c.scale.x+(ns-c.scale.x)*k*.5;c.scale.set(v,v,1)}
    if(tv){const tt=clamp(p*.28+n.userData.s*r*.08,-.26,.26);n.rotation.x+=(tt-n.rotation.x)*k}}
  if(A.py)for(const q of A.py)if(q.__rail)q.visible=q.__rail.visible;
  if(A.can){const open=isPlayer&&P.onGround&&Math.hypot(P.vel.x,P.vel.z)<1.5&&throttle<.08&&(state!=='menu'||HG.on)?1:0;A.op=(A.op||0)+clamp(open-(A.op||0),-dt*.7,dt*.7);A.can.rotation.x=-A.op*.72}
}


// ---- per-type geometry (metres). Built from published dimensions (length, span, height, wing area) and three-view proportions.
const M2={};
const mir=a=>a.flatMap(p=>p[0]?[p,[-p[0],...p.slice(1)]]:[p]);
M2.F16={L:15.06,nz:3.0,radome:6.2,
  fus:[[-7.0,.5,.52,.5,.05,2.4],[-6.0,.62,.62,.56,.05,2.5],[-4.5,.78,.66,.62,0,2.6],[-2.5,.9,.66,.66,0,2.8],[-.5,.92,.64,.66,0,2.8],[1.5,.82,.62,.6,0,2.6],[3.0,.7,.6,.5,0,2.4],[4.2,.62,.58,.45,0,2.2],[5.4,.52,.46,.42,0,2.1],[6.2,.42,.36,.36,-.02,2],[7.0,.22,.2,.2,-.05,2],[7.6,0,0,0,-.08,2]],
  parts:[{x:0,mouth:1,st:[[-2.0,.38,.15,.22,-.62,2.2],[0,.5,.2,.32,-.72,2.4],[2.0,.56,.26,.4,-.76,2.6],[3.3,.56,.28,.4,-.76,3]]},
    {x:0,st:[[2.2,.2,.1,.1,.6,2],[1.0,.3,.2,.1,.6,2],[-1.5,.34,.24,.1,.58,2],[-4,.3,.2,.1,.54,2],[-5.6,.2,.1,.1,.5,2],[-6.5,0,0,0,.5,2]]}],
  wings:[{st:[{x:.85,zle:1.3,zte:-3.95,y:-.08,t:.04},{x:4.6,zle:-1.95,zte:-3.05,y:-.08,t:.03}]},{st:[{x:.55,zle:4.4,zte:.6,y:0,t:.02},{x:1.05,zle:1.35,zte:.6,y:-.05,t:.02}]},
    {st:[{x:.7,zle:-5.0,zte:-7.0,y:-.1,t:.035},{x:2.79,zle:-6.55,zte:-7.35,y:-.25,t:.03}]}],
  fins:[{x:0,y:.5,st:[{h:0,zle:-3.4,zte:-6.45,t:.05},{h:.6,zle:-3.9,zte:-6.5},{h:2.9,zle:-5.75,zte:-6.85,t:.04}]},{x:.62,y:-.42,cant:-2.6,mirror:1,st:[{h:0,zle:-3.9,zte:-4.9},{h:.5,zle:-4.3,zte:-4.95}]}],
  canopy:[3.6,.62,.42,.42,1.45],frame:-1.2,noz:[[0,.05,-7.25,.5,1.2]],
  r9:mir([[4.78,-.08,-2.4,null]]),r120:mir([[3.55,-.55,-1.7,-.12],[2.35,-.6,-1.3,-.1]])};
M2.F16B70=Object.assign({},M2.F16,{parts:[...M2.F16.parts,{x:.8,st:[[-3.4,.3,.22,.2,.4,2],[-1,.38,.26,.2,.42,2],[1.6,.3,.2,.18,.38,2]]}]});
M2.F15C={L:19.43,nz:5.6,radome:7.0,
  fus:[[-8.5,.55,.5,.45,.15,2.4],[-6.5,.75,.55,.5,.15,2.6],[-4,.85,.6,.5,.15,2.8],[-1,.85,.62,.5,.2,2.8],[2,.75,.62,.5,.25,2.6],[4,.68,.62,.48,.2,2.4],[5.5,.6,.55,.45,.15,2.2],[7.0,.5,.45,.4,.1,2],[8.3,.36,.32,.3,.05,2],[9.2,.18,.16,.16,0,2],[9.7,0,0,0,0,2]],
  parts:[{x:1.1,mouth:1,st:[[-8.6,.55,.55,.6,-.1,2.6],[-5,.66,.6,.62,-.1,3],[-1,.64,.62,.62,-.1,3.4],[2.5,.56,.65,.6,-.05,4],[3.6,.55,.68,.6,0,5]]}],
  wings:[{st:[{x:1.6,zle:1.5,zte:-4.6,y:.1,t:.05},{x:6.5,zle:-3.4,zte:-5.0,y:.05,t:.035}]},{st:[{x:1.5,zle:-6.4,zte:-8.9,y:-.05,t:.035},{x:4.3,zle:-8.3,zte:-9.5,y:-.05,t:.03}]}],
  fins:[{x:1.55,y:.5,cant:-.04,mirror:1,st:[{h:0,zle:-4.9,zte:-8.7,t:.05},{h:3.1,zle:-7.8,zte:-9.4,t:.04}]}],
  canopy:[5.0,.95,.5,.5,1.9],frame:-1.5,noz:[[.82,.15,-9.0,.56,1.3],[-.82,.15,-9.0,.56,1.3]],
  r9:mir([[4.05,-.65,-2.4,.05]]),r120:mir([[3.2,-.7,-2.2,.07],[1.55,-.85,1.8,-.55],[1.55,-.85,-3.2,-.55]])};
M2.F15EX=Object.assign({},M2.F15C,{parts:[...M2.F15C.parts,{x:1.72,st:[[-4.6,.3,.35,.3,.05,2],[-1,.36,.4,.32,.05,2],[2.2,.3,.35,.28,.05,2]]}],
  r9:mir([[4.35,-.65,-2.5,.05],[2.9,-.65,-2.3,.08]]),r120:mir([[3.62,-.95,-2.0,.07],[1.55,-.85,1.8,-.55],[1.55,-.85,-3.2,-.55],[2.15,-.75,-.6,-.3]])});
M2.FA18E={L:18.31,nz:5.3,radome:7.0,
  fus:[[-8.8,.5,.45,.4,.15,2.4],[-7,.7,.5,.45,.15,2.6],[-4,.85,.55,.5,.1,2.8],[-1,.9,.55,.55,.05,2.8],[2,.75,.6,.5,.05,2.6],[4,.62,.6,.45,.05,2.3],[5.5,.55,.5,.42,0,2.1],[7,.42,.38,.36,-.05,2],[8.4,.24,.2,.2,-.08,2],[9.1,0,0,0,-.1,2]],
  parts:[{x:1.1,mouth:1,st:[[-6.5,.5,.4,.45,-.25,2.6],[-2,.55,.42,.5,-.3,3],[1.5,.5,.35,.5,-.38,3.4],[2.6,.48,.3,.48,-.42,3.6]]}],
  wings:[{st:[{x:.5,zle:6.0,zte:.8,y:.18,t:.02},{x:1.45,zle:1.4,zte:.6,y:.12,t:.02}]},{st:[{x:1.45,zle:1.0,zte:-3.6,y:.05,t:.05},{x:6.55,zle:-1.95,zte:-3.4,y:0,t:.035}]},
    {st:[{x:1.1,zle:-5.5,zte:-8.0,y:-.05,t:.035},{x:3.5,zle:-7.2,zte:-8.3,y:-.05,t:.03}]}],
  fins:[{x:1.05,y:.45,cant:-.35,mirror:1,st:[{h:0,zle:-2.8,zte:-5.8,t:.05},{h:2.7,zle:-5.3,zte:-6.6,t:.04}]}],
  canopy:[4.6,.8,.48,.46,1.6],frame:-1.3,noz:[[.58,.1,-8.75,.5,1.1],[-.58,.1,-8.75,.5,1.1]],hook:[-8.2,-.3],
  r9:mir([[6.75,0,-2.6,null]]),r120:mir([[4.9,-.62,-1.9,.0],[3.4,-.65,-1.5,.02],[1.15,-.95,-1.0,-.6]])};
M2.GRIPEN={L:14.1,nz:3.6,radome:5.6,
  fus:[[-6.3,.5,.45,.42,.05,2.4],[-5,.6,.55,.5,.05,2.6],[-3,.7,.6,.55,0,2.8],[-.5,.72,.6,.55,0,2.8],[1.5,.66,.6,.5,0,2.6],[3.0,.58,.58,.45,0,2.3],[4.4,.48,.45,.4,-.02,2.1],[5.6,.36,.32,.3,-.04,2],[6.5,.18,.16,.16,-.06,2],[7.0,0,0,0,-.08,2]],
  parts:[{x:.82,mouth:1,st:[[-1.5,.32,.4,.45,-.1,2.4],[1.5,.36,.45,.5,-.05,3],[3.1,.33,.42,.48,0,3.4]]}],
  wings:[{st:[{x:.6,zle:1.3,zte:-4.6,y:-.18,t:.04},{x:4.2,zle:-2.9,zte:-4.1,y:-.2,t:.03}]},{st:[{x:.95,zle:3.2,zte:1.3,y:.2,t:.035},{x:2.45,zle:1.95,zte:1.3,y:.22,t:.03}]}],
  fins:[{x:0,y:.5,st:[{h:0,zle:-2.1,zte:-5.2,t:.05},{h:3.0,zle:-4.6,zte:-5.6,t:.04}]}],
  canopy:[3.5,.72,.42,.42,1.35],frame:-1.1,noz:[[0,.05,-6.6,.47,.9]],
  r9:mir([[4.3,-.2,-3.0,null]]),r120:mir([[3.0,-.65,-2.1,-.22],[1.95,-.68,-1.8,-.2]])};
M2.TYPHOON={L:15.96,nz:4.6,radome:6.3,
  fus:[[-7.1,.55,.5,.45,.15,2.4],[-5.5,.7,.6,.5,.12,2.6],[-3,.8,.62,.55,.05,2.8],[-.5,.8,.62,.55,0,2.8],[2,.66,.62,.5,0,2.4],[3.8,.58,.6,.45,0,2.2],[5.2,.5,.5,.42,0,2],[6.6,.36,.32,.3,-.03,2],[7.5,.18,.16,.16,-.05,2],[7.9,0,0,0,-.06,2]],
  parts:[{x:0,mouth:1,st:[[-3.5,.72,.2,.45,-.65,3],[0,.9,.25,.55,-.7,3.4],[2.2,.88,.22,.55,-.72,4],[3.0,.85,.2,.52,-.72,5]]}],
  wings:[{st:[{x:.75,zle:.9,zte:-6.3,y:-.15,t:.04},{x:5.45,zle:-5.2,zte:-6.2,y:-.18,t:.03}]},{st:[{x:.6,zle:5.0,zte:3.7,y:.15,t:.035},{x:2.2,zle:3.95,zte:3.55,y:.15,t:.03}]}],
  fins:[{x:0,y:.55,st:[{h:0,zle:-2.9,zte:-6.6,t:.05},{h:3.1,zle:-5.9,zte:-7.0,t:.04}]}],
  canopy:[4.05,.78,.44,.44,1.4],frame:-1.2,noz:[[.5,.1,-7.35,.47,1.0],[-.5,.1,-7.35,.47,1.0]],
  r9:mir([[4.75,-.6,-3.4,-.17]]),r120:mir([[3.65,-.62,-2.6,-.16],[2.6,-.62,-2.0,-.16],[.98,-.78,-2.6,-.5]])};
M2.RAFALE={L:15.27,nz:4.3,radome:5.7,probe:[-.38,.62,5.6,1.8],
  fus:[[-6.9,.5,.48,.42,.12,2.4],[-5.3,.62,.58,.5,.1,2.6],[-3,.72,.6,.55,.05,2.8],[-.5,.72,.62,.55,0,2.8],[1.8,.62,.62,.48,0,2.4],[3.6,.55,.6,.42,0,2.2],[5.0,.45,.46,.38,0,2],[6.4,.3,.28,.26,-.03,2],[7.5,0,0,0,-.05,2]],
  parts:[{x:.92,mouth:1,st:[[-1.8,.38,.35,.42,-.35,2.4],[1.0,.42,.38,.46,-.4,2.6],[2.5,.4,.36,.45,-.42,2.2]]}],
  wings:[{st:[{x:.7,zle:1.0,zte:-6.0,y:-.1,t:.04},{x:5.45,zle:-4.6,zte:-5.75,y:-.12,t:.03}]},{st:[{x:.8,zle:2.9,zte:1.3,y:.42,t:.035},{x:2.45,zle:1.7,zte:1.2,y:.45,t:.03}]}],
  fins:[{x:0,y:.5,st:[{h:0,zle:-2.6,zte:-6.3,t:.05},{h:3.1,zle:-5.6,zte:-6.9,t:.04}]}],
  canopy:[3.8,.75,.42,.42,1.3],frame:-1.1,noz:[[.47,.08,-7.0,.45,.9],[-.47,.08,-7.0,.45,.9]],
  r9:mir([[5.45,-.12,-3.6,null],[4.2,-.6,-2.9,-.12]]),r120:mir([[3.0,-.62,-2.2,-.1],[.8,-.75,-2.8,-.5]])};
M2.J10C={L:16.9,nz:4.2,radome:6.6,probe:[-.5,.45,6.6,1.6],
  fus:[[-7.0,.55,.55,.45,.1,2.4],[-5.4,.66,.62,.5,.08,2.6],[-3,.74,.65,.52,.05,2.8],[-.5,.74,.65,.55,0,2.8],[2,.66,.65,.5,0,2.6],[4.0,.58,.62,.45,0,2.3],[5.6,.48,.5,.4,-.02,2.1],[7.0,.32,.3,.28,-.04,2],[8.2,0,0,0,-.06,2]],
  parts:[{x:0,mouth:1,st:[[-3.0,.55,.2,.35,-.6,2.6],[0,.75,.2,.5,-.7,3],[2.8,.78,.2,.55,-.78,3.4],[3.8,.72,.15,.5,-.8,3]]}],
  wings:[{st:[{x:.75,zle:1.6,zte:-5.3,y:-.2,t:.04},{x:2.6,zle:-1.5,zte:-5.1,y:-.22,t:.035},{x:4.88,zle:-4.0,zte:-5.0,y:-.25,t:.03}]},{st:[{x:.75,zle:4.1,zte:2.7,y:.05,t:.035},{x:2.0,zle:3.1,zte:2.6,y:.05,t:.03}]}],
  fins:[{x:0,y:.55,st:[{h:0,zle:-2.3,zte:-6.4,t:.05},{h:3.3,zle:-5.7,zte:-7.3,t:.04}]},{x:.55,y:-.45,cant:-2.55,mirror:1,st:[{h:0,zle:-3.8,zte:-5.6},{h:.75,zle:-4.6,zte:-5.8}]}],
  canopy:[4.6,.8,.44,.46,1.45],frame:-1.2,noz:[[0,.1,-7.0,.55,1.1]],
  r9:mir([[4.35,-.65,-3.2,-.25]]),r120:mir([[3.3,-.7,-2.4,-.23],[2.2,-.72,-1.9,-.22]])};
M2.J20={L:21.2,nz:6.2,radome:8.2,internal:1,
  fus:[[-9.2,.75,.5,.45,.1,2.2],[-7,1.0,.55,.5,.1,2.2],[-4,1.15,.6,.55,.05,2.0],[-1,1.15,.65,.55,0,1.9],[2,1.0,.7,.5,0,1.8],[4.5,.85,.7,.45,0,1.7],[6.5,.72,.55,.4,-.02,1.6],[8.2,.55,.38,.32,-.05,1.6],[9.6,.3,.18,.18,-.06,1.6],[10.4,0,0,0,-.08,1.6]],
  parts:[{x:1.45,mouth:1,n:8,st:[[-5,.55,.45,.5,-.15,2],[0,.62,.5,.55,-.15,2.2],[3.5,.6,.55,.55,-.1,2.2],[4.9,.58,.6,.5,-.05,1.8]]}],
  wings:[{st:[{x:1.4,zle:.4,zte:-7.4,y:0,t:.035},{x:6.5,zle:-5.4,zte:-6.7,y:-.05,t:.03}]},{st:[{x:1.5,zle:4.0,zte:2.1,y:.25,t:.03},{x:3.7,zle:2.5,zte:1.9,y:.25,t:.025}]},{st:[{x:1.1,zle:2.4,zte:.3,y:.1,t:.02},{x:1.6,zle:.6,zte:.2,y:.05,t:.02}]}],
  fins:[{x:1.55,y:.5,cant:-.48,mirror:1,st:[{h:0,zle:-6.1,zte:-8.7,t:.04},{h:2.5,zle:-8.1,zte:-9.6,t:.035}]},{x:1.2,y:-.4,cant:-2.7,mirror:1,st:[{h:0,zle:-6.4,zte:-8.2},{h:.9,zle:-7.4,zte:-8.5}]}],
  canopy:[5.0,.9,.5,.48,1.8],frame:-1.5,noz:[[.78,.1,-9.7,.6,1.2],[-.78,.1,-9.7,.6,1.2]],
  r9:mir([[1.3,-.3,.8,null]]),r120:mir([[.5,-.42,-1.0,null],[.5,-.42,-3.6,null]])};
M2.MIG29={L:17.32,nz:5.0,radome:7.0,irst:[.2,.68,6.0],
  fus:[[-6,.9,.35,.3,.05,3],[-3,1.1,.4,.3,.05,3.2],[0,1.0,.5,.3,.1,3],[2.5,.62,.62,.4,.15,2.4],[4.2,.55,.62,.42,.1,2.2],[5.6,.48,.5,.4,.05,2.1],[7.0,.35,.34,.3,0,2],[8.2,.18,.16,.16,-.02,2],[8.8,0,0,0,-.04,2]],
  parts:[{x:1.05,mouth:1,st:[[-8.0,.55,.55,.55,-.35,2.2],[-5.0,.62,.6,.6,-.4,2.4],[-1.0,.6,.55,.6,-.45,2.8],[2.0,.5,.45,.5,-.55,3.4],[3.4,.48,.42,.48,-.6,4]]}],
  wings:[{st:[{x:.55,zle:5.6,zte:1.0,y:.12,t:.02},{x:1.75,zle:1.2,zte:.6,y:.05,t:.02}]},{st:[{x:1.7,zle:1.2,zte:-3.7,y:0,t:.045},{x:5.68,zle:-2.4,zte:-3.8,y:-.1,t:.035}]},
    {st:[{x:1.6,zle:-5.9,zte:-8.2,y:-.2,t:.035},{x:3.95,zle:-7.5,zte:-8.4,y:-.25,t:.03}]}],
  fins:[{x:1.55,y:.25,cant:-.12,mirror:1,st:[{h:0,zle:-3.9,zte:-7.2,t:.05},{h:3.05,zle:-6.5,zte:-7.9,t:.04}]}],
  canopy:[4.6,.78,.45,.45,1.5],frame:-1.2,noz:[[1.05,-.35,-8.4,.54,1.0],[-1.05,-.35,-8.4,.54,1.0]],
  r9:mir([[4.65,-.55,-2.6,-.1],[3.65,-.55,-2.2,-.05]]),r120:mir([[2.65,-.62,-1.8,-.02]])};
M2.MIG29UPG=Object.assign({},M2.MIG29,{probe:[.55,.45,6.4,1.5],parts:[...M2.MIG29.parts,{x:0,st:[[-6,.45,.5,.02,.35,2],[-1,.5,.55,.02,.4,2.2],[3.0,.4,.45,.02,.45,2]]}],
  r9:mir([[4.65,-.55,-2.6,-.1]]),r120:mir([[3.65,-.55,-2.2,-.05],[2.65,-.62,-1.8,-.02]])});
M2.MIG35=Object.assign({},M2.MIG29,{probe:[.55,.45,6.4,1.5],parts:[...M2.MIG29.parts,{x:0,st:[[-6.5,.5,.75,.02,.35,2],[-1,.55,.8,.02,.4,2.2],[3.4,.42,.55,.02,.5,2]]}],
  r9:mir([[4.95,-.5,-2.9,-.12]]),r120:mir([[4.05,-.55,-2.5,-.1],[3.15,-.58,-2.1,-.06],[2.25,-.62,-1.8,-.02]])});
M2.MIG29K=Object.assign({},M2.MIG35,{hook:[-7.6,-.6],wings:[M2.MIG29.wings[0],{st:[{x:1.7,zle:1.3,zte:-3.9,y:0,t:.045},{x:6.0,zle:-2.6,zte:-4.0,y:-.1,t:.035}]},M2.MIG29.wings[2]]});
M2.SU27={L:21.94,nz:6.8,radome:8.4,irst:[.25,.85,7.7],
  fus:[[-7.5,1.2,.45,.35,.1,3.2],[-4,1.5,.5,.35,.1,3.4],[-.5,1.4,.65,.38,.15,3],[2.5,.9,.8,.45,.2,2.4],[4.6,.72,.8,.5,.15,2.2],[6.4,.62,.68,.5,.1,2.1],[8.2,.48,.46,.42,.05,2],[9.8,.3,.26,.24,0,2],[11.0,0,0,0,-.03,2]],
  parts:[{x:1.35,mouth:1,st:[[-10.2,.62,.62,.62,-.5,2.2],[-6,.72,.66,.66,-.55,2.4],[-1,.7,.6,.7,-.6,2.8],[2.5,.62,.5,.62,-.7,3.4],[4.2,.6,.45,.58,-.75,4]]}],
  stinger:[[-12.0,.12,.12,.12,.05,2],[-9.5,.4,.35,.3,.05,2],[-7.4,.6,.4,.35,.1,2.4]],
  wings:[{st:[{x:.6,zle:7.0,zte:1.5,y:.15,t:.02},{x:2.1,zle:1.6,zte:.8,y:.1,t:.02}]},{st:[{x:2.1,zle:1.6,zte:-5.2,y:.05,t:.045},{x:7.1,zle:-3.0,zte:-4.6,y:-.1,t:.035}]},
    {st:[{x:2.0,zle:-7.6,zte:-10.4,y:-.25,t:.035},{x:4.95,zle:-9.6,zte:-10.7,y:-.3,t:.03}]}],
  fins:[{x:2.05,y:.1,cant:0,mirror:1,st:[{h:0,zle:-5.6,zte:-9.6,t:.05},{h:3.4,zle:-8.8,zte:-10.3,t:.04}]},{x:2.05,y:-.35,cant:-3.0,mirror:1,st:[{h:0,zle:-6.5,zte:-8.2},{h:.9,zle:-7.2,zte:-8.4}]}],
  canopy:[6.1,1.05,.55,.55,1.75],frame:-1.4,noz:[[1.35,-.5,-10.6,.62,1.1],[-1.35,-.5,-10.6,.62,1.1]],
  r9:mir([[7.35,-.1,-3.9,null],[6.0,-.72,-3.4,-.05]]),r120:mir([[4.7,-.85,-2.4,0],[3.4,-.85,-2.0,.02],[1.45,-1.6,1.2,-1.33]])};
M2.SU33=Object.assign({},M2.SU27,{hook:[-10.8,-.6],probe:[.55,.62,9.2,1.5],stinger:[[-11.3,.14,.14,.14,.05,2],[-9.5,.4,.35,.3,.05,2],[-7.4,.6,.4,.35,.1,2.4]],
  wings:[...M2.SU27.wings,{st:[{x:1.0,zle:6.2,zte:4.6,y:.25,t:.03},{x:3.2,zle:4.9,zte:4.4,y:.25,t:.025}]}]});
M2.SU35=Object.assign({},M2.SU27,{probe:[.55,.62,9.2,1.5],stinger:[[-12.6,.12,.12,.12,.05,2],[-9.5,.42,.35,.3,.05,2],[-7.4,.6,.4,.35,.1,2.4]],
  r120:mir([[4.7,-.85,-2.4,0],[3.4,-.85,-2.0,.02],[1.45,-1.6,1.2,-1.33]]).concat([[0,-.72,1.6,-.25],[0,-.72,-3.2,-.25]]),
  r120lr:mir([[1.45,-1.62,1.0,-1.33],[3.4,-.9,-2.0,.02]])});
// Gripen E: 15.2 m (stretched nose and centre section) with a larger wing
{const k=15.2/14.1,G=M2.GRIPEN,sz=a=>a.map(s=>[s[0]*k,...s.slice(1)]),sw=w=>({st:w.st.map(s=>Object.assign({},s,{zle:s.zle*k,zte:s.zte*k,x:s.x*1.04}))});
  M2.GRIPENE=Object.assign({},G,{L:15.2,nz:G.nz*k,radome:G.radome*k,fus:sz(G.fus),parts:G.parts.map(p=>Object.assign({},p,{st:sz(p.st)})),wings:G.wings.map(sw),
    fins:G.fins.map(f=>Object.assign({},f,{st:f.st.map(s=>Object.assign({},s,{zle:s.zle*k,zte:s.zte*k}))})),canopy:[G.canopy[0]*k,...G.canopy.slice(1)],noz:G.noz.map(n=>[n[0],n[1],n[2]*k,n[3]*1.04,n[4]]),
    irst:[.22,.62,5.0*k],r9:G.r9.map(r=>[r[0]*1.04,r[1],r[2]*k,r[3]]),r120:G.r120.map(r=>[r[0]*1.04,r[1],r[2]*k,r[3]])})}
// derived: cockpit eye point, nav lights, engine smoke points, shadow and vapour span for each
function m2Fit(id){const S=M2[id],D=AC_DEFS[id];if(!D)return;const [cz,cy,sx,sy,sz]=S.canopy;
  const wing=S.wings.reduce((a,w)=>{const t=w.st[w.st.length-1];return t.x>a.x?t:a},{x:0});const fin=S.fins[0],ft=fin.st[fin.st.length-1];
  D.eye=[0,cy+sy*.38,cz+sz*.12];
  D.fx=Object.assign({},D.fx||{},{eng:S.noz.map(n=>[n[0],n[2]-n[4]*.6]),vapor:wing.x,nav:[wing.x,ft.zte+.2,(fin.y||0)+ft.h+(fin.x?0:0)],navZ:(wing.zle+wing.zte)/2,shadow:[S.L,wing.x*2],nz:S.nz});
  D.cut={r:.6,full:[-8,cz-1.2],open:[cz-1.2,cz+1.4]}}
for(const id in M2)m2Fit(id);   // the roster slice fits the later jets the same way

// Tu-22M3-style swing-wing bomber (42 m) and a C-130-style transport (30 m long, 40 m span)
function buildBomber(c){
  const g=new THREE.Group(),root=new THREE.Group();root.add(g);
  const body=new THREE.MeshStandardMaterial({color:0x8d9196,roughness:.7,flatShading:true,side:THREE.DoubleSide});
  const dark=new THREE.MeshStandardMaterial({color:0x3a3d40,roughness:.6,flatShading:true,side:THREE.DoubleSide});
  const add=(geo,mat,x,y,z)=>{const m=new THREE.Mesh(geo,mat);m.position.set(x,y,z);g.add(m);return m};
  let geo=new THREE.CylinderGeometry(1.7,1.9,34,12);geo.rotateX(Math.PI/2);add(geo,body,0,0,0);
  geo=new THREE.ConeGeometry(1.7,7,12);geo.rotateX(Math.PI/2);add(geo,body,0,0,20.5);
  for(const s of [1,-1]){add(new THREE.BoxGeometry(1.6,2.2,12),body,2.3*s,-.2,-5);
    const sh=new THREE.Shape();sh.moveTo(2.5*s,6);sh.lineTo(15*s,-4);sh.lineTo(15*s,-6);sh.lineTo(2.5*s,-3);
    const eg=new THREE.ExtrudeGeometry(sh,{depth:.35,bevelEnabled:false});eg.rotateX(Math.PI/2);g.add(new THREE.Mesh(eg,body));
    geo=new THREE.CylinderGeometry(.85,.75,1.2,10,1,true);geo.rotateX(Math.PI/2);add(geo,dark,2.3*s,-.2,-11.5)}
  const ts=new THREE.Shape();ts.moveTo(-9,1.5);ts.lineTo(-17,1.5);ts.lineTo(-19,9);ts.lineTo(-15.5,9);ts.lineTo(-9,1.5);
  const tg=new THREE.ExtrudeGeometry(ts,{depth:.4,bevelEnabled:false});tg.rotateY(-Math.PI/2);tg.translate(.2,0,0);g.add(new THREE.Mesh(tg,body));
  const hs=new THREE.Shape();hs.moveTo(-9,-14);hs.lineTo(9,-14);hs.lineTo(6,-17.5);hs.lineTo(-6,-17.5);
  const he=new THREE.ExtrudeGeometry(hs,{depth:.3,bevelEnabled:false});he.rotateX(Math.PI/2);he.translate(0,1.5,0);g.add(new THREE.Mesh(he,body));
  return root;
}
function buildTransport(c){
  const g=new THREE.Group(),root=new THREE.Group();root.add(g);
  const body=new THREE.MeshStandardMaterial({color:0x6f7a6c,roughness:.75,flatShading:true,side:THREE.DoubleSide});
  const dark=new THREE.MeshStandardMaterial({color:0x2e3330,roughness:.6,flatShading:true});
  const add=(geo,mat,x,y,z)=>{const m=new THREE.Mesh(geo,mat);m.position.set(x,y,z);g.add(m);return m};
  let geo=new THREE.CylinderGeometry(2.1,2.1,22,12);geo.rotateX(Math.PI/2);add(geo,body,0,0,1);
  geo=new THREE.SphereGeometry(2.1,12,8);add(geo,body,0,0,12).scale.set(1,1,1.4);
  geo=new THREE.ConeGeometry(2.1,8,12);geo.rotateX(-Math.PI/2);add(geo,body,0,.7,-14).scale.set(1,.7,1);
  add(new THREE.BoxGeometry(40.4,.5,4),body,0,2,2);
  for(const x of [-12,-6,6,12]){geo=new THREE.CylinderGeometry(.7,.7,4,8);geo.rotateX(Math.PI/2);add(geo,dark,x,1.6,4);add(new THREE.BoxGeometry(4.2,.12,.3),dark,x,1.6,6.1)}
  const ts=new THREE.Shape();ts.moveTo(-12,2);ts.lineTo(-18,2);ts.lineTo(-18.5,10);ts.lineTo(-15,10);ts.lineTo(-12,2);
  const tg=new THREE.ExtrudeGeometry(ts,{depth:.3,bevelEnabled:false});tg.rotateY(-Math.PI/2);tg.translate(.15,0,0);g.add(new THREE.Mesh(tg,body));
  add(new THREE.BoxGeometry(16,.3,4),body,0,1.8,-16.5);
  return root;
}
const PLAYER_COLORS={body:0x8a95a0,dark:0x394049,glass:0xc9a24a,glassE:0x2a1d00,flame:0xffa64a};
const playerJet=buildJet({body:0x8a95a0,dark:0x394049,glass:0xc9a24a,glassE:0x2a1d00,flame:0xffa64a});
scene.add(playerJet);
let pFlame=playerJet.getObjectByName('flame');


/* ---------------- roster: more real aircraft (derived from the base jets, with their own numbers, missiles and lofted models) ----------------
   Sources: manufacturer and air-force fact sheets, Wikipedia spec pages. Figures marked "est." are game estimates (combat weight, fuel, cartridge counts, missile ranges). */
const dv=(base,id,name,call,o)=>(AC_DEFS[id]=Object.assign({},AC_DEFS[base],{id,name,eyebrow:name+' · Callsign '+call+' 1'},o));
const cmo=(flares,chaff,decoys,maws,jam,jamName,cmds,stations)=>({fixed:true,flares,chaff,decoys,maws,jam,jamName,cmds,stations});
const stn=(sr,mr)=>[...sr.map((l,i)=>[l[0],l[1],'r9_'+i]),...mr.map((l,i)=>[l[0],l[1],'r120_'+i])];
// short-range heat seekers (game values; ranges and gimbal limits est.)
const SRM={
  AIM9B:{burn:2.5,acc:110,cd:8e-5,gmax:16,life:18,fuze:7,gimbal:.5,decoy:.35,minR:600,maxR:3500,cone:.3,lockT:1.5,rear:true},     // rear-aspect, flare-prone
  AIM9P:{burn:3.5,acc:135,cd:7.5e-5,gmax:25,life:22,fuze:7,gimbal:.7,decoy:.2,minR:500,maxR:6000,cone:.4,lockT:1.2,rear:true},
  AIM9L:{burn:4,acc:150,cd:7e-5,gmax:32,life:25,fuze:8,gimbal:.9,decoy:.14,minR:400,maxR:8500,cone:.55,lockT:1},        // all-aspect
  R60:{burn:3.5,acc:150,cd:7e-5,gmax:35,life:18,fuze:6,gimbal:.7,decoy:.2,minR:300,maxR:6000,cone:.5,lockT:1},
  AAM3:{burn:4,acc:150,cd:7e-5,gmax:35,life:25,fuze:8,gimbal:1.0,decoy:.12,minR:400,maxR:9000,cone:.65,lockT:.9},
  AAM5:{burn:5,acc:165,cd:7e-5,gmax:50,life:25,fuze:9,gimbal:1.4,decoy:.07,minR:300,maxR:13000,cone:1.3,lockT:.7},
  PY3:{burn:4.5,acc:165,cd:7e-5,gmax:35,life:25,fuze:8,gimbal:1.0,decoy:.1,minR:400,maxR:10000,cone:.9,lockT:.8},
  PY5:{burn:5,acc:190,cd:7e-5,gmax:60,life:25,fuze:9,gimbal:Math.PI/2,decoy:.05,minR:300,maxR:17000,cone:Math.PI/2,lockT:.7},
  ASRAAM:{burn:5.5,acc:195,cd:6.5e-5,gmax:60,life:28,fuze:9,gimbal:Math.PI/2,decoy:.05,minR:300,maxR:18000,cone:Math.PI/2,lockT:.7},
  REDTOP:{burn:3.5,acc:125,cd:7e-5,gmax:22,life:20,fuze:7,gimbal:.7,decoy:.16,minR:500,maxR:9000,cone:.4,lockT:1.2,rear:true},
  FALCON:{burn:2.5,acc:105,cd:8e-5,gmax:18,life:15,fuze:6,gimbal:.5,decoy:.3,minR:500,maxR:6000,cone:.35,lockT:1.5,rear:true}};
// radar missiles: semi-active Sparrow family (the launcher keeps illuminating), AMRAAM A/B, AAM-4, Derby
const MRM={
  AIM7E:{burn:4.5,acc:150,cd:5.5e-5,gmax:22,life:50,fuze:9,gimbal:.9,decoy:0,minR:1500,maxR:24000,cone:.9,lockT:1.8,sarh:true,launchG:4,termR:30000,dlR:0},
  AIM7:{burn:5,acc:175,cd:5e-5,gmax:25,life:55,fuze:10,gimbal:1.0,decoy:0,minR:1500,maxR:35000,cone:1.05,lockT:1.5,sarh:true,launchG:5,termR:45000,dlR:0},
  SKYFLASH:{burn:5,acc:180,cd:5e-5,gmax:28,life:60,fuze:10,gimbal:1.0,decoy:0,minR:1500,maxR:42000,cone:1.05,lockT:1.5,sarh:true,launchG:5,termR:50000,dlR:0},
  R3R:{burn:3.5,acc:120,cd:7e-5,gmax:12,life:25,fuze:7,gimbal:.6,decoy:.05,minR:700,maxR:8000,cone:.45,lockT:1.6,sarh:true,launchG:3,termR:10000,dlR:0},
  RB27:{burn:3.5,acc:130,cd:6e-5,gmax:15,life:30,fuze:8,gimbal:.7,decoy:0,minR:1000,maxR:14000,cone:.7,lockT:1.5,sarh:true,launchG:4,termR:20000,dlR:0}};
MRM.AIM120B=Object.assign({},AC_DEFS.F16.mr,{maxR:32000,dlR:40000,termR:14000});
MRM.AAM4=Object.assign({},AC_DEFS.F16.mr,{maxR:55000,gmax:40,acc:155,dlR:70000,termR:20000});
MRM.DERBY=Object.assign({},AC_DEFS.F16.mr,{maxR:50000,gmax:35,dlR:40000,termR:15000});
const SRD=(n,r,w)=>({srName:n,srFull:r,sr:w});

/* ===== United States ===== */
// F-4E Phantom II: 49.2 m² wing, 2× J79-GE-17 52.9 / 79.6 kN, +6.5 g in combat, Mach 2.2, M61A1 (639 rds), AIM-9L + AIM-7M, APQ-120 (no track-while-scan)
dv('F15C','F4E','F-4E Phantom II','Phantom',{corner:440,
  S:49.2,MASS:17500,CLMAX:1.45,KIND:.12,T_AB:159000,T_MIL:105800,ram:.45,cdK:1.35,supK:.15,gmax:7,roll:3.0,vne:800,
  gunRate:100,gunRounds:640,fuelCap:5900,sfcDry:.85,sfcAB:1.9,fuelUnit:'LB',engines:2,refuel:'boom',irstR:0,irstMax:0,
  srName:'9L',srFull:'AIM-9L',mrName:'7M',mrFull:'AIM-7M',srN:4,mrN:4,sr:SRM.AIM9L,mr:MRM.AIM7,
  radar:{modes:['RWS'],name:'AN/APQ-120',range:70000},
  cm:cmo(30,60,0,false,null,'','ALE-40',stn([['2A','9L'],['2B','9L'],['8A','9L'],['8B','9L']],[['5','7M'],['6','7M'],['7','7M'],['4','7M']])),
  spec:'<span><b>+6.5 g</b> (heavy, draggy)</span><span><b>Mach 2.2</b></span><span>2× J79 <b>79.6 kN</b></span><span>M61A1 · <b>639 rds</b></span><span>AIM-7M · AIM-9L</span><span>No look-down TWS</span>',
  snd:{f:34,roar:240,wh:.002,twin:1,howl:[130,.01]},seek:{flareP:.04,chaffP:.03},rwrSym:'F4',rwrName:'ALR-46',srDesc:'AIM-9L all-aspect heat seeker on the inboard pylons',mrDesc:'AIM-7M Sparrow (Fox 1): you must keep the radar lock until it hits',cmDesc:'ALE-40 dispensers'});
delete AC_DEFS.F4E.model;
// F/A-18C Hornet: 37.16 m² wing, 2× F404-GE-402 (48.9 / 78.7 kN), +7.5 g, M61A2 (578 rds), APG-73, AIM-120C + AIM-9M/X, catapult and trap
dv('FA18E','FA18C','F/A-18C Hornet','Hornet',{corner:330,
  S:37.16,MASS:16500,CLMAX:1.95,KIND:.13,T_AB:157400,T_MIL:97800,ram:.4,cdK:1.1,supK:1,trK:.9,gmax:7.5,roll:4.2,vne:700,
  gunRounds:578,fuelCap:4900,sfcDry:.8,sfcAB:1.85,fuelUnit:'LB',engines:2,
  srN:2,mrN:4,
  radar:{modes:['RWS','TWS'],name:'AN/APG-73',range:100000},
  cm:cmo(30,60,0,false,'ECM','ALQ-126B jammer','ALE-47',stn([['1','9X'],['9','9X']],[['2','120C'],['8','120C'],['4','120C'],['6','120C']])),
  spec:'<span><b>+7.5 g</b></span><span><b>Mach 1.8</b></span><span>2× F404 <b>78.7 kN</b></span><span>APG-73</span><span>AIM-120C · AIM-9X</span><span><b>Carrier</b> cat + trap</span>',
  snd:{f:39,roar:245,wh:.005,twin:1,howl:[210,.01]},seek:{flareP:.12,chaffP:.07},rwrSym:'18',rwrName:'ALR-67',cmDesc:'ALE-47',carrier:'CATOBAR',vApp:135});
delete AC_DEFS.FA18C.model;
// F-15E Strike Eagle: 2-seat, 2× F100-PW-229 (79 / 129 kN), conformal tanks, APG-70, LANTIRN, 7.7 t fuel with CFTs (est.), +9 g (lighter loads)
dv('F15C','F15E','F-15E Strike Eagle','Strike Eagle',{corner:360,
  MASS:24500,T_AB:258000,T_MIL:158000,cdK:1.1,supK:.05,gunRounds:512,fuelCap:7700,
  mr:Object.assign({},AC_DEFS.F16.mr,{maxR:40000}),mrName:'120',mrFull:'AIM-120C',srN:2,mrN:6,
  radar:{modes:['RWS','TWS'],name:'AN/APG-70',range:110000},
  spec:'<span><b>+9 g</b> clean</span><span><b>Mach 2.5</b></span><span>2× F100-229 <b>129 kN</b></span><span><b>CFTs</b> · 7.7 t fuel</span><span>APG-70 · LANTIRN</span><span>2 seats</span>',
  snd:{f:35,roar:222,wh:.004,twin:1,howl:[160,.011]},cmDesc:'ALE-45 dispensers'});
delete AC_DEFS.F15E.model;
// F-35A: 42.7 m² wing, F135-PW-100 (125 / 191 kN), +9 g, 8.3 t internal fuel, GAU-22/A 25 mm (182 rds), APG-81 AESA, EOTS + DAS, internal bay (4× AIM-120)
dv('J20','F35A','F-35A Lightning II','Panther',{corner:340,
  S:42.7,MASS:17300,CLMAX:1.9,KIND:.115,T_AB:191000,T_MIL:125000,ram:.4,cdK:1.0,trK:.85,supK:.5,gmax:9,roll:4.0,vne:740,tvc:false,
  gunRate:55,gunRounds:182,muzzle:1050,gunDmg:2,gunSnd:1300,ammo:'25MM',
  fuelCap:8300,sfcDry:.8,sfcAB:1.9,fuelUnit:'KG',engines:1,refuel:'boom',irstR:40000,irstMax:80000,
  srName:'9X',srFull:'AIM-9X',mrName:'120',mrFull:'AIM-120C-7',srN:2,mrN:4,sr:AC_DEFS.F16.sr,mr:Object.assign({},AC_DEFS.F16.mr,{maxR:42000}),
  radar:{modes:['RWS','TWS','IRST'],name:'AN/APG-81',range:150000,gimbal:100},eye:[0,1.05,3.8],
  cm:cmo(60,60,0,true,'ECM','AN/ASQ-239 Barracuda','CMDS',stn([['PYL L','9X'],['PYL R','9X']],[['BAY','120C'],['BAY','120C'],['BAY','120C'],['BAY','120C']])),
  spec:'<span><b>+9 g</b></span><span><b>Low observable</b> · internal bay</span><span>F135 <b>191 kN</b></span><span>APG-81 <b>AESA</b> · EOTS · DAS</span><span>GAU-22/A <b>25 mm</b></span><span>AIM-120C-7 × 4 inside</span>',
  snd:{f:30,roar:205,wh:.007,twin:0,howl:[240,.012]},seek:{flareP:.06,chaffP:.03},rwrSym:'35',rwrName:'ASQ-239',srDesc:'AIM-9X on wing pylons (breaks stealth)',mrDesc:'AIM-120C-7 from the internal bay (Fox 3)',cmDesc:'ALE-47',carrier:null,model:undefined});
delete AC_DEFS.F35A.model; delete AC_DEFS.F35A.carrier;
// F-22A Raptor: 78 m² wing, 2× F119-PW-100 (~116 / 156 kN, supercruise), 2-D thrust vectoring, +9 g, M61A2 (480 rds), APG-77 AESA, 6× AIM-120 + 2× AIM-9X inside
dv('J20','F22A','F-22A Raptor','Raptor',{corner:330,
  S:78,MASS:25000,CLMAX:2.0,KIND:.105,T_AB:312000,T_MIL:232000,ram:.35,cdK:.95,trK:.8,supK:1.1,gmax:9,roll:5.0,vne:780,tvc:true,
  gunRate:100,gunRounds:480,muzzle:1030,gunDmg:1,gunSnd:1800,ammo:'PGU-28',
  fuelCap:8200,sfcDry:.75,sfcAB:1.85,fuelUnit:'KG',engines:2,refuel:'boom',irstR:0,irstMax:0,
  srName:'9X',srFull:'AIM-9X',mrName:'120D',mrFull:'AIM-120D',srN:2,mrN:6,sr:AC_DEFS.F16.sr,mr:Object.assign({},AC_DEFS.F16.mr,{maxR:56000,cd:3.5e-5,acc:155,dlR:100000,termR:18000}),
  radar:{modes:['RWS','TWS'],name:'AN/APG-77',range:180000,gimbal:120},eye:[0,1.25,5.0],
  cm:cmo(60,60,0,true,'ECM','AN/ALR-94 / ALE-57','CMDS',stn([['SIDE L','9X'],['SIDE R','9X']],[['BAY','120D'],['BAY','120D'],['BAY','120D'],['BAY','120D'],['BAY','120D'],['BAY','120D']])),
  spec:'<span><b>+9 g</b> · <b>2-D thrust vectoring</b></span><span><b>Supercruise</b> M1.5+</span><span>2× F119 <b>156 kN</b></span><span>APG-77 <b>AESA</b> · ALR-94</span><span>6× AIM-120D + 2× AIM-9X <b>inside</b></span><span>Very low RCS</span>',
  snd:{f:29,roar:195,wh:.005,twin:1,howl:[170,.011]},seek:{flareP:.05,chaffP:.02},rwrSym:'22',rwrName:'ALR-94',srDesc:'AIM-9X from the side bays',mrDesc:'AIM-120D from the main bays (Fox 3): datalink, active ~18 km out',cmDesc:'ALE-52'});
delete AC_DEFS.F22A.model;

/* ===== Russia ===== */
// MiG-21bis: 23 m² delta wing, R25-300 (40.3 / 69.7 kN), +8 g, GSh-23L (200 rds), RP-22 Sapfir, R-60M + R-3R (semi-active), no countermeasure bays beyond ASO-2 flares
dv('MIG29','MIG21','MiG-21bis','Fishbed',{corner:400,
  S:23,MASS:8400,CLMAX:1.4,KIND:.14,T_AB:69700,T_MIL:40300,ram:.35,cdK:1.05,supK:.1,gmax:8,roll:4.0,vne:800,tvc:false,
  gunRate:50,gunRounds:250,muzzle:690,gunDmg:1,gunSnd:1200,ammo:'23MM',
  fuelCap:2300,sfcDry:.95,sfcAB:2.1,fuelUnit:'KG',engines:1,refuel:null,irstR:0,irstMax:0,
  srName:'R60',srFull:'R-60M',mrName:'R3R',mrFull:'R-3R',srN:4,mrN:2,sr:SRM.R60,mr:MRM.R3R,
  radar:{modes:['RWS'],name:'RP-22 Sapfir',range:30000},
  cm:cmo(0,0,0,false,null,'','none',stn([['1','R60'],['2','R60'],['3','R60'],['4','R60']],[['5','R3R'],['6','R3R']])),
  spec:'<span><b>+8 g</b></span><span><b>Mach 2.05</b></span><span>R25-300 <b>69.7 kN</b></span><span>GSh-23L · <b>200 rds</b></span><span>R-60M · R-3R</span><span>Short-range radar · no countermeasures</span>',
  snd:{f:30,roar:215,wh:.004,twin:0,howl:[150,.012]},seek:{flareP:.04,chaffP:.02},rwrSym:'21',rwrName:'SPO-10',srDesc:'R-60M heat seeker, short range',mrDesc:'R-3R semi-active radar missile: hold the lock to impact',cmDesc:'none'});
delete AC_DEFS.MIG21.model;
// Su-30SM: 62 m² wing, 2× AL-31FP (76.2 / 122.6 kN) with 2-axis thrust vectoring, N011M Bars PESA, OLS-30, 9.4 t fuel, R-77-1 + R-73, 2 seats
dv('SU27','SU30SM','Su-30SM','Flanker',{corner:350,
  MASS:25500,T_AB:245000,T_MIL:152000,CLMAX:1.85,KIND:.11,roll:3.2,tvc:true,fuelCap:9400,refuel:'probe',irstR:45000,irstMax:90000,
  mrName:'R77-1',mrFull:'R-77-1',mr:Object.assign({},AC_DEFS.MIG35.mr),
  radar:{modes:['RWS','TWS','IRST'],name:'N011M Bars',range:140000,gimbal:90},
  cm:cmo(48,48,0,true,'ECM','SAP-518 jammer pod','CM',AC_DEFS.SU27.cm.stations),
  spec:'<span><b>+9 g</b></span><span><b>Mach 2</b></span><span>2× AL-31FP <b>vectoring</b></span><span>Bars <b>PESA</b> · OLS-30</span><span>R-77-1 · R-73</span><span>2 seats</span>',
  snd:{f:27,roar:185,wh:.004,twin:1,howl:[430,.021]},seek:{flareP:.1,chaffP:.06},rwrSym:'30',rwrName:'L150',mrDesc:'R-77-1 active radar missile (Fox 3)',cmDesc:'96 cartridges (est.)'});
// Su-57: 78.8 m² wing, 2× AL-41F1 (88 / 142 kN), 3-D thrust vectoring, supercruise, N036 Byelka AESA, internal bays (4× R-77M + 2 side R-74M)
dv('SU35','SU57','Su-57','Felon',{corner:355,
  S:78.8,MASS:25000,CLMAX:2.0,KIND:.105,T_AB:284000,T_MIL:176000,ram:.4,cdK:.97,trK:.78,supK:1.0,gmax:9,roll:3.8,vne:780,tvc:true,
  gunRate:27.5,gunRounds:150,muzzle:860,gunDmg:2,gunSnd:700,
  fuelCap:10300,refuel:'probe',irstR:50000,irstMax:90000,
  srName:'R74',srFull:'R-74M',mrName:'R77-1',mrFull:'R-77-1',srN:2,mrN:6,sr:AC_DEFS.SU35.sr,mr:Object.assign({},AC_DEFS.MIG35.mr),
  radar:{modes:['RWS','TWS','IRST'],name:'N036 Byelka AESA',range:160000,gimbal:120},eye:[0,1.15,6.0],
  cm:cmo(48,48,0,true,'ECM','L402 Himalayas','CM',stn([['SIDE L','R74'],['SIDE R','R74']],[['BAY','R77'],['BAY','R77'],['BAY','R77'],['BAY','R77'],['BAY','R77'],['BAY','R77']])),
  spec:'<span><b>3-D thrust vectoring</b></span><span><b>Supercruise</b></span><span>2× AL-41F1 <b>142 kN</b></span><span>N036 <b>AESA</b></span><span><b>Internal bays</b> 6× R-77 + 2× R-74M</span><span>Low RCS (est.)</span>',
  snd:{f:25,roar:178,wh:.006,twin:1,howl:[400,.022]},seek:{flareP:.06,chaffP:.03},rwrSym:'57',rwrName:'L402',cmDesc:'96 cartridges (est.)'});
delete AC_DEFS.SU57.model;

/* ===== Germany ===== */
// F-104G Starfighter: 18.2 m² wing, J79-MTU-J1K (52.8 / 79.6 kN), +7 g, M61A1 (725 rds), AIM-9B at the wing tips, NASARR ranging radar, very fast but a poor turner
dv('F16','F104G','F-104G Starfighter','Zipper',{corner:480,
  S:18.22,MASS:9300,CLMAX:1.05,KIND:.18,T_AB:79600,T_MIL:52800,ram:.45,cdK:1.0,supK:.12,gmax:7,roll:5.5,vne:880,
  gunRate:100,gunRounds:750,muzzle:1030,gunDmg:1,gunSnd:1800,ammo:'PGU-28',
  fuelCap:3500,sfcDry:.95,sfcAB:1.95,fuelUnit:'LB',engines:1,refuel:null,irstR:0,irstMax:0,
  srName:'9B',srFull:'AIM-9B',mrName:'-',mrFull:'none',srN:4,mrN:0,sr:SRM.AIM9B,mr:MRM.AIM7,
  radar:{modes:['RWS'],name:'NASARR F15A',range:25000},
  cm:cmo(30,30,0,false,null,'','CM',stn([['TIP L','9B'],['TIP R','9B'],['PYL L','9B'],['PYL R','9B']],[])),
  spec:'<span><b>+7 g</b> · tiny wing</span><span><b>Mach 2</b></span><span>J79 <b>79.6 kN</b></span><span>M61A1 · <b>750 rds</b></span><span>4× AIM-9B · ranging radar</span><span>60 countermeasures</span>',
  snd:{f:36,roar:235,wh:.003,twin:0,howl:[190,.011]},seek:{flareP:.02,chaffP:.01},rwrSym:'104',rwrName:'none',srDesc:'AIM-9B Sidewinder at the wing tips and pylons (rear aspect, short range)',mrDesc:'No radar missiles',cmDesc:'60 cartridges'});
delete AC_DEFS.F104G.model; AC_DEFS.F104G.cut={r:.55,full:[-6,2.8],open:[2.8,6.5]};
// F-4F Phantom II (ICE): upgraded Luftwaffe Phantom, APG-65 radar, AIM-120B + AIM-9L, no leading-edge slats
dv('F4E','F4F','F-4F Phantom II ICE','Phantom',{corner:440,
  MASS:17200,mrName:'120B',mrFull:'AIM-120B',mr:MRM.AIM120B,
  radar:{modes:['RWS','TWS'],name:'AN/APG-65',range:90000},
  cm:cmo(60,60,0,false,null,'','ALE-40',AC_DEFS.F4E.cm.stations),
  spec:'<span><b>+6.5 g</b></span><span><b>Mach 2.2</b></span><span>2× J79 <b>79.6 kN</b></span><span>APG-65 <b>TWS</b></span><span>AIM-120B · AIM-9L</span><span>ICE upgrade</span>',
  mrDesc:'AIM-120B AMRAAM (Fox 3): datalink, active seeker near the end'});
// MiG-29G: the former East German Fulcrums flown by the Luftwaffe 1993-2004 (9.12 with NATO radios and IFF)
dv('MIG29','MIG29G','MiG-29G Fulcrum','Fulcrum',{});
delete AC_DEFS.MIG29G.model;
// Eurofighter EF2000 Tranche 1 (Luftwaffe): 2× EJ200 (60 / 90 kN), CAPTOR-M mechanical radar, AIM-120C-5 + IRIS-T, no IRST yet
dv('TYPHOON','EF2K1','Eurofighter EF2000 T1','Taifun',{corner:340,
  MASS:15200,mrName:'120',mrFull:'AIM-120C-5',mr:Object.assign({},AC_DEFS.F16.mr,{maxR:40000}),mrN:6,irstR:0,irstMax:0,
  radar:{modes:['RWS','TWS'],name:'CAPTOR-M',range:100000,gimbal:70},
  cm:cmo(40,80,2,true,'ECM','DASS jammer','DASS',AC_DEFS.TYPHOON.cm.stations.map(s=>/MET/.test(s[1])?[s[0],'120C',s[2]]:s)),
  spec:'<span><b>+9 g</b></span><span><b>Supercruise</b> M1.1</span><span>CAPTOR-M <b>mechanical scan</b></span><span>DASS · <b>MAWS</b></span><span>AIM-120C-5 · IRIS-T</span>',
  mrDesc:'AIM-120C-5 radar missile (Fox 3): datalink midcourse, active ~16 km out'});
delete AC_DEFS.EF2K1.model;
// Eurofighter EF2000 Tranche 3 (Luftwaffe): CAPTOR-E AESA, PIRATE IRST, Meteor
dv('TYPHOON','EF2K3','Eurofighter EF2000 T3','Taifun',{});
delete AC_DEFS.EF2K3.model;
// F-35A (Luftwaffe order of 35 aircraft): same jet as the US F-35A
dv('F35A','F35DE','F-35A Lightning II (Luftwaffe)','Lightning',{});

/* ===== Japan ===== */
// F-4EJ Kai: Mitsubishi-built Phantom, APG-66J look-down radar, AIM-7F + AIM-9L + AAM-3, JM61A1 (639 rds)
// F-4EJ: Mitsubishi-built Phantom as delivered (AIM-7E-2 and AIM-9P, APQ-120, JM61A1), no look-down radar
dv('F4E','F4EJ','F-4EJ Phantom II','Phantom',{corner:440,
  srName:'9P',srFull:'AIM-9P',sr:SRM.AIM9P,mrName:'7E',mrFull:'AIM-7E-2',mr:MRM.AIM7E,
  cm:cmo(30,60,0,false,null,'','ALE-40',stn([['2A','9P'],['2B','9P'],['8A','9P'],['8B','9P']],[['5','7E'],['6','7E'],['7','7E'],['4','7E']])),
  spec:'<span><b>+6.5 g</b></span><span><b>Mach 2.2</b></span><span>2× J79-IHI <b>79.6 kN</b></span><span>APQ-120</span><span>AIM-7E-2 · AIM-9P</span><span>JM61A1 · 639 rds</span>',
  srDesc:'AIM-9P heat seeker (rear aspect, short range)',mrDesc:'AIM-7E-2 Sparrow (Fox 1): hold the lock, short reach'});
// F-4E (Israeli Air Force): US-built Phantom flown by Israel in the 1970s-80s with Shafrir 2 / AIM-9P and AIM-7E-2
dv('F4E','F4EIL','F-4E Phantom II (IAF)','Phantom',{corner:440,
  srName:'SHAF2',srFull:'Shafrir 2',sr:SRM.AIM9P,mrName:'7E',mrFull:'AIM-7E-2',mr:MRM.AIM7E,
  cm:cmo(30,60,0,false,null,'','ALE-40',stn([['2A','Shaf'],['2B','Shaf'],['8A','Shaf'],['8B','Shaf']],[['5','7E'],['6','7E'],['7','7E'],['4','7E']])),
  spec:'<span><b>+6.5 g</b></span><span><b>Mach 2.2</b></span><span>2× J79 <b>79.6 kN</b></span><span>APQ-120</span><span>AIM-7E-2 · Shafrir 2</span><span>M61A1 · 639 rds</span>',
  srDesc:'Shafrir 2 heat seeker, short range',mrDesc:'AIM-7E-2 Sparrow (Fox 1): hold the lock, short reach'});
// F-4EJ Kai: the upgraded Japanese Phantom, APG-66J look-down radar, AIM-7F + AAM-3
dv('F4E','F4EJK','F-4EJ Kai Phantom II','Phantom',{corner:440,
  srName:'AAM3',srFull:'AAM-3',sr:SRM.AAM3,mrName:'7F',mrFull:'AIM-7F',
  radar:{modes:['RWS','TWS'],name:'AN/APG-66J',range:90000},
  cm:cmo(30,60,0,false,'ECM','J/ALQ-8 pod','ALE-40',stn([['2A','AAM3'],['2B','AAM3'],['8A','AAM3'],['8B','AAM3']],[['5','7F'],['6','7F'],['7','7F'],['4','7F']])),
  spec:'<span><b>+6.5 g</b></span><span><b>Mach 2.2</b></span><span>2× J79-IHI <b>79.6 kN</b></span><span>APG-66J <b>look-down</b></span><span>AIM-7F · AAM-3</span><span>JM61A1 · 639 rds</span>',
  srDesc:'AAM-3 (Type 90) heat seeker on the inboard pylons',mrDesc:'AIM-7F Sparrow (Fox 1): hold the lock'});
// F-15J: Mitsubishi-built Eagle (APG-63, no export-restricted EW), AIM-7M + AAM-3, JM61A1
dv('F15C','F15J','F-15J Eagle','Eagle',{corner:350,
  srName:'AAM3',srFull:'AAM-3',sr:SRM.AAM3,mrName:'7M',mrFull:'AIM-7M',mr:MRM.AIM7,mrN:6,
  radar:{modes:['RWS','TWS'],name:'AN/APG-63',range:100000},
  cm:cmo(30,60,0,false,'ECM','J/ALQ-8 jammer','ALE-45',stn([['2A','AAM3'],['8A','AAM3']],[['2B','7M'],['3','7M'],['4','7M'],['6','7M'],['7','7M'],['8B','7M']])),
  spec:'<span><b>+9 g</b></span><span><b>Mach 2.5</b></span><span>2× F100-IHI <b>106 kN</b></span><span>APG-63</span><span>AIM-7M · AAM-3</span><span>JM61A1 · 940 rds</span>',
  srDesc:'AAM-3 (Type 90) heat seeker',mrDesc:'AIM-7M Sparrow (Fox 1): hold the lock'});
delete AC_DEFS.F15J.model;
// F-15J Kai (MSIP II): J/APG-1 AESA-class upgrade, AAM-4B active radar missile, AAM-5
dv('F15J','F15JK','F-15J Kai Eagle','Eagle',{corner:355,
  srName:'AAM5',srFull:'AAM-5',sr:SRM.AAM5,mrName:'AAM4',mrFull:'AAM-4B',mr:MRM.AAM4,mrN:6,
  radar:{modes:['RWS','TWS','IRST'],name:'J/APG-1 AESA',range:130000,gimbal:90},irstR:30000,irstMax:70000,
  cm:cmo(60,60,0,true,'ECM','J/ALQ-8 jammer','ALE-47',stn([['2A','AAM5'],['8A','AAM5']],[['2B','AAM4'],['3','AAM4'],['4','AAM4'],['6','AAM4'],['7','AAM4'],['8B','AAM4']])),
  spec:'<span><b>+9 g</b></span><span><b>Mach 2.5</b></span><span>J/APG-1 <b>AESA</b></span><span>AAM-4B <b>active radar</b></span><span>AAM-5 <b>off-boresight IR</b></span><span><b>MAWS</b></span>',
  srDesc:'AAM-5 (Type 04) high off-boresight heat seeker',mrDesc:'AAM-4B active radar missile (Fox 3): datalink, active seeker near the end'});
// F-2A: Mitsubishi / Lockheed Martin, F-16 derived with a 34.84 m² wing, F110-GE-129 (76 / 131 kN), +9 g, JM61A1 (512 rds), J/APG-1 AESA, AAM-4 + AAM-5
dv('F16B70','F2A','F-2A','Viper Zero',{corner:360,
  S:34.84,MASS:12800,CLMAX:2.0,KIND:.12,T_AB:131000,T_MIL:76000,cdK:1.06,roll:4.3,vne:780,
  gunRounds:512,fuelCap:4600,refuel:null,irstR:0,irstMax:0,
  srName:'AAM5',srFull:'AAM-5',sr:SRM.AAM5,mrName:'AAM4',mrFull:'AAM-4',mr:MRM.AAM4,srN:2,mrN:4,
  radar:{modes:['RWS','TWS'],name:'J/APG-1 AESA',range:110000},
  cm:cmo(30,30,0,false,'ECM','J/ALQ-3 jammer','CMDS',stn([['1','AAM5'],['9','AAM5']],[['3','AAM4'],['4','AAM4'],['6','AAM4'],['7','AAM4']])),
  spec:'<span><b>+9 g</b> · larger composite wing</span><span><b>Mach 2</b></span><span>F110 <b>131 kN</b></span><span>J/APG-1 <b>AESA</b></span><span>AAM-4 · AAM-5</span><span>JM61A1 · 512 rds</span>',
  srDesc:'AAM-5 (Type 04) high off-boresight heat seeker',mrDesc:'AAM-4 active radar missile (Fox 3): datalink, active seeker near the end'});
delete AC_DEFS.F2A.model;
// F-35A (JASDF): same jet, AAM-4B / AAM-5 not yet cleared inside the bay so AIM-120 / AIM-9X stay
dv('F35A','F35AJ','F-35A Lightning II (JASDF)','Lightning',{});
// F-35B (JASDF / UK): STOVL, shaft-driven lift fan: shorter-legged, lower thrust figure (F135-PW-600: 125 / 180 kN class), 6.1 t internal fuel, +7 g
dv('F35A','F35B','F-35B Lightning II','Lightning',{corner:330,
  T_AB:178000,MASS:16800,gmax:7,fuelCap:6100,
  spec:'<span><b>+7 g</b></span><span><b>STOVL</b> · lift fan</span><span>F135 <b>~180 kN</b></span><span>APG-81 <b>AESA</b> · EOTS · DAS</span><span>GAU-22/A <b>25 mm</b> pod</span><span>AIM-120C-7 × 4 inside</span>',
  carrier:'STOBAR',vApp:125});
// F-35B (JASDF): Izumo-class STOVL jets
dv('F35B','F35BJ','F-35B Lightning II (JASDF)','Lightning',{});

/* ===== Israel ===== */
// Kfir C.7: IAI, Mirage III airframe, J79-GE-J1E (52.9 / 83.4 kN), 2× DEFA 30 mm (280 rds), Python 3, ranging radar only, canards + dogtooth wing
dv('F16','KFIR','Kfir C.7','Kfir',{corner:420,
  S:34.8,MASS:9800,CLMAX:1.6,KIND:.13,T_AB:83400,T_MIL:52900,ram:.4,cdK:1.1,supK:.15,gmax:7.5,roll:4.5,vne:850,
  gunRate:43,gunRounds:280,muzzle:800,gunDmg:2,gunSnd:900,ammo:'30MM',
  fuelCap:3000,sfcDry:.85,sfcAB:1.95,fuelUnit:'KG',engines:1,refuel:null,irstR:0,irstMax:0,
  srName:'PY3',srFull:'Python 3',mrName:'-',mrFull:'none',srN:4,mrN:0,sr:SRM.PY3,mr:MRM.AIM7,
  radar:{modes:['RWS'],name:'EL/M-2001B',range:20000},
  cm:cmo(30,30,0,false,null,'','chaff/flare',stn([['1','Py3'],['2','Py3'],['3','Py3'],['4','Py3']],[])),
  spec:'<span><b>+7.5 g</b></span><span><b>Mach 2.3</b></span><span>J79 <b>83.4 kN</b></span><span>2× DEFA <b>30 mm</b></span><span>Python 3 · ranging radar</span><span>Canards</span>',
  snd:{f:36,roar:235,wh:.003,twin:0,howl:[190,.011]},seek:{flareP:.05,chaffP:.03},rwrSym:'KF',rwrName:'RWR (est.)',srDesc:'Python 3 all-aspect heat seeker',mrDesc:'No radar missiles',cmDesc:'60 cartridges (est.)'});
delete AC_DEFS.KFIR.model; AC_DEFS.KFIR.cut={r:.6,full:[-6,2.6],open:[2.6,6.2]};
// F-4E Kurnass 2000: IAI upgrade with the APG-76 multi-mode radar, Python 4 helmet-cued missiles, AIM-7 + AIM-9L
dv('F4E','F4E2K','F-4E Kurnass 2000','Kurnass',{corner:440,
  srName:'PY4',srFull:'Python 4',sr:SRM.PY5,mrName:'7M',mrFull:'AIM-7M',
  radar:{modes:['RWS','TWS'],name:'AN/APG-76',range:100000},
  cm:cmo(30,60,0,false,'ECM','Elisra jammer pod','ALE-40',stn([['2A','Py4'],['2B','Py4'],['8A','Py4'],['8B','Py4']],[['5','7M'],['6','7M'],['7','7M'],['4','7M']])),
  spec:'<span><b>+6.5 g</b></span><span><b>Mach 2.2</b></span><span>2× J79 <b>79.6 kN</b></span><span>APG-76 <b>multi-mode</b></span><span>AIM-7M · Python 4</span><span>Helmet cueing</span>',
  srDesc:'Python 4 heat seeker, helmet-cued, high off-boresight',mrDesc:'AIM-7M Sparrow (Fox 1): hold the lock'});
// F-15C Baz: Israeli Eagle with Elisra EW, Python 5 and AIM-120B
dv('F15C','F15BAZ','F-15C Baz','Baz',{corner:350,
  srName:'PY5',srFull:'Python 5',sr:SRM.PY5,mrName:'120B',mrFull:'AIM-120B',mr:MRM.AIM120B,mrN:6,
  radar:{modes:['RWS','TWS'],name:'AN/APG-63(V)1',range:110000},
  cm:cmo(30,60,0,false,'ECM','Elisra EW suite','ALE-45',stn([['2A','Py5'],['8A','Py5']],[['2B','120B'],['3','120B'],['4','120B'],['6','120B'],['7','120B'],['8B','120B']])),
  spec:'<span><b>+9 g</b></span><span><b>Mach 2.5</b></span><span>2× F100 <b>106 kN</b></span><span>APG-63(V)1</span><span>AIM-120B · Python 5</span><span>Elisra EW</span>',
  srDesc:'Python 5 heat seeker, lock-on after launch, very wide field of view',mrDesc:'AIM-120B AMRAAM (Fox 3)'});
delete AC_DEFS.F15BAZ.model;
// F-16C Barak: Block 30/40 Barak, F110-GE-100 (76 / 127 kN), APG-68(V)5, Python 5 + AIM-120B
dv('F16','F16BARAK','F-16C Barak','Barak',{corner:350,
  T_AB:127000,T_MIL:76000,MASS:12000,vne:780,fuelCap:3175,
  srName:'PY5',srFull:'Python 5',sr:SRM.PY5,mrName:'120B',mrFull:'AIM-120B',mr:MRM.AIM120B,
  radar:{modes:['RWS','TWS'],name:'AN/APG-68(V)5',range:90000},
  cm:cmo(30,60,0,false,'ECM','Elisra jammer pod','CMDS',stn([['1','Py5'],['9','Py5']],[['3','120B'],['4','120B'],['6','120B'],['7','120B']])),
  spec:'<span><b>+9 g</b></span><span><b>Mach 2</b></span><span>F110-GE-100 <b>127 kN</b></span><span>APG-68(V)5</span><span>AIM-120B · Python 5</span><span>Elisra EW</span>',
  srDesc:'Python 5 heat seeker, lock-on after launch',mrDesc:'AIM-120B AMRAAM (Fox 3)'});
// F-16I Sufa: two-seat Block 52+, F100-PW-229 (79 / 129 kN), conformal tanks, APG-68(V)9, Derby + Python 5
dv('F16B70','F16I',"F-16I Sufa",'Sufa',{corner:350,
  MASS:13500,T_AB:129000,T_MIL:79000,fuelCap:4540,irstR:0,irstMax:0,
  srName:'PY5',srFull:'Python 5',sr:SRM.PY5,mrName:'DERBY',mrFull:'Derby',mr:MRM.DERBY,
  radar:{modes:['RWS','TWS'],name:'AN/APG-68(V)9',range:110000},
  cm:cmo(30,60,0,false,'ECM','Elisra SPS-3000 (internal)','CMDS',stn([['1','Py5'],['9','Py5']],[['3','Derby'],['4','Derby'],['6','Derby'],['7','Derby']])),
  spec:'<span><b>+9 g</b> · 2 seats</span><span><b>Mach 2</b></span><span>F100-229 <b>129 kN</b></span><span><b>CFTs</b> · APG-68(V)9</span><span>Derby · Python 5</span><span>Elisra EW</span>',
  srDesc:'Python 5 heat seeker, lock-on after launch',mrDesc:'Derby active radar missile (Fox 3)'});
// F-15I Ra'am: Israeli Strike Eagle, APG-70I, Derby + Python 5
dv('F15E','F15I',"F-15I Ra'am",'Raam',{corner:360,
  srName:'PY5',srFull:'Python 5',sr:SRM.PY5,mrName:'DERBY',mrFull:'Derby',mr:MRM.DERBY,
  radar:{modes:['RWS','TWS'],name:'AN/APG-70I',range:115000},
  cm:cmo(30,60,0,false,'ECM','Elisra SPS-2110','ALE-45',stn([['2A','Py5'],['8A','Py5']],[['2B','Derby'],['3','Derby'],['4','Derby'],['6','Derby'],['7','Derby'],['8B','Derby']])),
  spec:'<span><b>+9 g</b> · 2 seats</span><span><b>Mach 2.5</b></span><span>2× F100-229 <b>129 kN</b></span><span><b>CFTs</b> · APG-70I</span><span>Derby · Python 5</span><span>Elisra EW</span>',
  srDesc:'Python 5 heat seeker, lock-on after launch',mrDesc:'Derby active radar missile (Fox 3)'});
delete AC_DEFS.F15I.model;
// F-35I Adir: Israeli F-35A with its own EW and command software
dv('F35A','F35I','F-35I Adir','Adir',{srName:'PY5',srFull:'Python 5',sr:SRM.PY5,
  cm:cmo(60,60,0,true,'ECM','AN/ASQ-239 + Israeli EW','CMDS',stn([['PYL L','Py5'],['PYL R','Py5']],[['BAY','120C'],['BAY','120C'],['BAY','120C'],['BAY','120C']])),
  srDesc:'Python 5 on wing pylons (breaks stealth)'});

/* ===== Sweden ===== */
// J 35F Draken: 49.2 m² double-delta wing, RM6C (Avon 56.9 / 78.5 kN), +7 g, 2× ADEN 30 mm (200 rds), Rb 27 (semi-active) + Rb 28 (IR Falcon), PS-01/A
dv('F16','J35F','J 35F Draken','Draken',{corner:400,
  S:49.2,MASS:8500,CLMAX:1.4,KIND:.11,T_AB:78500,T_MIL:56900,ram:.4,cdK:1.1,supK:.1,gmax:7,roll:3.8,vne:850,
  gunRate:23.3,gunRounds:90,muzzle:790,gunDmg:2,gunSnd:900,ammo:'30MM',
  fuelCap:2300,sfcDry:.9,sfcAB:2.0,fuelUnit:'KG',engines:1,refuel:null,irstR:0,irstMax:0,
  srName:'RB28',srFull:'Rb 28 Falcon',mrName:'RB27',mrFull:'Rb 27',srN:2,mrN:2,sr:SRM.FALCON,mr:MRM.RB27,
  radar:{modes:['RWS'],name:'PS-01/A',range:30000},
  cm:cmo(0,0,0,false,null,'','none',stn([['2A','Rb28'],['2B','Rb28']],[['3A','Rb27'],['3B','Rb27']])),
  spec:'<span><b>+7 g</b></span><span><b>Mach 2</b></span><span>RM6C <b>78.5 kN</b></span><span>2× ADEN <b>30 mm</b></span><span>Rb 27 · Rb 28</span><span>Double delta</span>',
  snd:{f:36,roar:238,wh:.004,twin:0,howl:[170,.012]},seek:{flareP:.02,chaffP:.01},rwrSym:'35',rwrName:'none',srDesc:'Rb 28 (AIM-4D Falcon) heat seeker, short range',mrDesc:'Rb 27 (AIM-26B) semi-active radar missile',cmDesc:'none'});
delete AC_DEFS.J35F.model; AC_DEFS.J35F.cut={r:.6,full:[-5,2.4],open:[2.4,5.8]};
// JA 37 Viggen: 46 m² canard-delta, RM8B (72.8 / 125 kN), +7 g, KCA 30 mm (150 rds), PS-46/A pulse-Doppler, Rb 71 Sky Flash + Rb 74 (AIM-9L)
dv('F16','JA37','JA 37 Viggen','Viggen',{corner:440,
  S:46,MASS:15500,CLMAX:1.9,KIND:.11,T_AB:125000,T_MIL:72800,ram:.35,cdK:1.05,supK:.15,gmax:7,roll:4.0,vne:880,
  gunRate:22.5,gunRounds:150,muzzle:1050,gunDmg:2,gunSnd:900,ammo:'30MM',
  fuelCap:4500,sfcDry:.85,sfcAB:2.0,fuelUnit:'KG',engines:1,refuel:null,irstR:0,irstMax:0,
  srName:'RB74',srFull:'Rb 74',mrName:'RB71',mrFull:'Rb 71 Sky Flash',srN:6,mrN:2,sr:SRM.AIM9L,mr:MRM.SKYFLASH,
  radar:{modes:['RWS','TWS'],name:'PS-46/A',range:80000},
  cm:cmo(60,120,0,false,'ECM','BOZ-100 pod','BOZ',stn([['6A','Rb74'],['6B','Rb74'],['7A','Rb74'],['7B','Rb74'],['4A','Rb74'],['4B','Rb74']],[['5A','Rb71'],['5B','Rb71']])),
  spec:'<span><b>+7 g</b></span><span><b>Mach 2</b></span><span>RM8B <b>125 kN</b></span><span>PS-46/A <b>look-down</b></span><span>Rb 71 · Rb 74</span><span>Canard-delta</span>',
  snd:{f:30,roar:215,wh:.004,twin:0,howl:[170,.014]},seek:{flareP:.06,chaffP:.05},rwrSym:'37',rwrName:'RWR (est.)',srDesc:'Rb 74 (AIM-9L) heat seeker on the wing pylons',mrDesc:'Rb 71 Sky Flash semi-active radar missile: hold the lock',cmDesc:'BOZ dispensers'});
delete AC_DEFS.JA37.model;

/* ===== United Kingdom ===== */
// English Electric Lightning F.6: 35.3 m² wing, 2× Avon 301R (about 73 kN each with reheat), 2× ADEN (240 rds), Red Top, AI.23 AIRPASS
dv('F16','LIGHTNING','English Electric Lightning F.6','Lightning',{corner:430,
  S:35.3,MASS:15500,CLMAX:1.3,KIND:.13,T_AB:145600,T_MIL:112000,ram:.45,cdK:1.15,supK:.1,gmax:6.5,roll:4.5,vne:850,
  gunRate:43,gunRounds:240,muzzle:790,gunDmg:2,gunSnd:900,ammo:'30MM',
  fuelCap:4500,sfcDry:.9,sfcAB:2.1,fuelUnit:'KG',engines:2,refuel:'probe',irstR:0,irstMax:0,
  srName:'REDTOP',srFull:'Red Top',mrName:'-',mrFull:'none',srN:2,mrN:0,sr:SRM.REDTOP,mr:MRM.AIM7,
  radar:{modes:['RWS'],name:'AI.23 AIRPASS',range:40000},
  cm:cmo(0,0,0,false,null,'','none',stn([['L','RedTop'],['R','RedTop']],[])),
  spec:'<span><b>+6.5 g</b></span><span><b>Mach 2.1</b> · huge climb</span><span>2× Avon <b>stacked</b></span><span>2× ADEN <b>30 mm</b></span><span>Red Top · AIRPASS</span><span>Short legs</span>',
  snd:{f:32,roar:225,wh:.003,twin:1,howl:[200,.012]},seek:{flareP:.02,chaffP:.01},rwrSym:'LI',rwrName:'none',srDesc:'Red Top heat seeker, short range',mrDesc:'No radar missiles',cmDesc:'none'});
delete AC_DEFS.LIGHTNING.model; AC_DEFS.LIGHTNING.cut={r:.55,full:[-6,3.5],open:[3.5,6.2]};
// F-4 Phantom FGR.2: RAF Phantom with 2× Rolls-Royce Spey 202 (54.7 / 91.2 kN), AN/AWG-12, Sky Flash + AIM-9L
dv('F4E','PHANTOM2','F-4 Phantom FGR.2','Phantom',{corner:440,
  MASS:18500,T_AB:182400,T_MIL:109400,gunRounds:640,
  mrName:'SKYFLASH',mrFull:'Sky Flash',mr:MRM.SKYFLASH,
  radar:{modes:['RWS'],name:'AN/AWG-12',range:60000},
  cm:cmo(30,30,0,false,null,'','ALE-40',stn([['2A','9L'],['2B','9L'],['8A','9L'],['8B','9L']],[['5','SkyFl'],['6','SkyFl'],['7','SkyFl'],['4','SkyFl']])),
  spec:'<span><b>+6.5 g</b></span><span><b>Mach 2.1</b></span><span>2× Spey <b>91.2 kN</b></span><span>AWG-12</span><span>Sky Flash · AIM-9L</span><span>SUU-23 gun pod</span>',
  mrDesc:'Sky Flash semi-active radar missile (Fox 1): hold the lock'});
// Tornado F.3 (ADV): 26.6 m² swing wing, 2× RB199-34R (40.5 / 73.5 kN), +7.5 g, BK-27 (180 rds), AI.24 Foxhunter, Sky Flash + AIM-9L
dv('F15C','TORNADO3','Tornado F.3','Tornado',{corner:420,
  S:26.6,MASS:22500,CLMAX:1.6,KIND:.12,T_AB:147000,T_MIL:81000,ram:.5,cdK:1.2,supK:.2,gmax:7.5,roll:3.0,vne:760,
  gunRate:28,gunRounds:180,muzzle:1100,gunDmg:2,gunSnd:900,ammo:'27MM',
  fuelCap:5500,sfcDry:.8,sfcAB:1.85,fuelUnit:'KG',engines:2,refuel:'probe',irstR:0,irstMax:0,
  srName:'9L',srFull:'AIM-9L',mrName:'SKYFLASH',mrFull:'Sky Flash',srN:2,mrN:4,sr:SRM.AIM9L,mr:MRM.SKYFLASH,
  radar:{modes:['RWS','TWS'],name:'AI.24 Foxhunter',range:120000},
  cm:cmo(30,60,0,false,'ECM','Sky Shadow pod','Phimat',stn([['1','9L'],['9','9L']],[['FUS 1','SkyFl'],['FUS 2','SkyFl'],['FUS 3','SkyFl'],['FUS 4','SkyFl']])),
  spec:'<span><b>+7.5 g</b></span><span><b>Mach 2.2</b></span><span>2× RB199 <b>73.5 kN</b></span><span>Foxhunter <b>TWS</b></span><span>Sky Flash · AIM-9L</span><span>BK-27 · 180 rds</span>',
  snd:{f:38,roar:230,wh:.007,twin:1,howl:[250,.011]},seek:{flareP:.08,chaffP:.1},rwrSym:'TF',rwrName:'ARI 23491',srDesc:'AIM-9L on the wing glove pylons',mrDesc:'Sky Flash semi-active radar missile (Fox 1): hold the lock',cmDesc:'Phimat chaff pods'});
delete AC_DEFS.TORNADO3.model;

/* ===== China ===== */
// J-7G: Chengdu, MiG-21 derived, 24.9 m² wing, WP-13F (41.2 / 64.7 kN), +8 g, 2× Type 23-III (200 rds), Type KLJ-6E Falcon Doppler radar, PL-8 / PL-5E
dv('MIG21','J7G','J-7G','Falcon',{corner:410,
  S:24.9,MASS:8200,T_AB:64700,T_MIL:41200,gunRate:14.2,gunRounds:60,   // Type 30-1: 850 rpm, 60 rounds (wiki)
  srName:'PL8',srFull:'PL-8',mrName:'-',mrFull:'none',srN:2,mrN:0,sr:SRM.PY3,mr:MRM.R3R,
  radar:{modes:['RWS','TWS'],name:'KLJ-6E Falcon',range:45000},
  cm:cmo(40,0,0,false,null,'','CM',stn([['1','PL8'],['4','PL8']],[])),
  spec:'<span><b>+8 g</b></span><span><b>Mach 2</b></span><span>WP-13F <b>64.7 kN</b></span><span>KLJ-6E <b>Doppler</b></span><span>PL-8 heat seeker</span><span>Twin 23 mm</span>',
  rwrSym:'J7',rwrName:'RWR (est.)',srDesc:'PL-8 heat seeker (Python 3 derived)',mrDesc:'No radar missiles',cmDesc:'40 flares (est.)'});
// J-11B: Shenyang Flanker with WS-10A engines (about 76 / 132 kN), +9 g, Type 1493 PESA, PL-12 + PL-10 / PL-8
const PL12=Object.assign({},AC_DEFS.MIG35.mr,{maxR:70000,dlR:55000,termR:20000,acc:180});
const prcSt=ss=>ss.map(s=>[s[0],/r9_/.test(s[2])?'PL10':'PL12',s[2]]);
dv('SU27','J11B','J-11B','Flanker',{corner:345,
  MASS:24000,T_AB:264000,T_MIL:152000,gmax:9,roll:3.2,fuelCap:9400,refuel:'probe',irstR:40000,irstMax:90000,
  srName:'PL10',srFull:'PL-10',sr:PL10,mrName:'PL12',mrFull:'PL-12',mr:PL12,srN:4,mrN:6,
  radar:{modes:['RWS','TWS','IRST'],name:'Type 1493 PESA',range:120000,gimbal:90},
  cm:cmo(48,48,0,false,'ECM','KG300G pod','CM',prcSt(AC_DEFS.SU27.cm.stations)),
  spec:'<span><b>+9 g</b></span><span><b>Mach 2.2</b></span><span>2× WS-10A <b>132 kN</b></span><span>Type 1493 <b>PESA</b></span><span>PL-12 · PL-10</span><span>30 mm gun</span>',
  rwrSym:'11',rwrName:'RWR (est.)',srDesc:'PL-10 imaging-IR heat seeker',mrDesc:'PL-12 active radar missile (Fox 3)',cmDesc:'96 cartridges (est.)'});
// J-15: carrier Flanker with canards and folding wings, WS-10H (about 117 / 132 kN), STOBAR on Liaoning and Shandong
dv('SU33','J15','J-15 Flying Shark','Shark',{corner:340,
  MASS:25500,T_AB:264000,T_MIL:152000,
  srName:'PL10',srFull:'PL-10',sr:PL10,mrName:'PL12',mrFull:'PL-12',mr:PL12,srN:4,mrN:6,
  radar:{modes:['RWS','TWS','IRST'],name:'Type 1493 PESA',range:110000,gimbal:90},
  cm:cmo(48,48,0,false,'ECM','KG300G pod','CM',prcSt(AC_DEFS.SU27.cm.stations)),
  spec:'<span><b>+8 g</b></span><span><b>Mach 2.2</b></span><span>2× WS-10H</span><span>Type 1493 <b>PESA</b></span><span>PL-12 · PL-10</span><span><b>Ski-jump</b> + trap</span>',
  rwrSym:'15',rwrName:'RWR (est.)',srDesc:'PL-10 imaging-IR heat seeker',mrDesc:'PL-12 active radar missile (Fox 3)',cmDesc:'96 cartridges (est.)'});
// J-16: two-seat multirole Flanker with an AESA radar, WS-10B, PL-15
dv('SU30SM','J16','J-16','Flanker',{corner:350,
  T_AB:264000,T_MIL:152000,
  srName:'PL10',srFull:'PL-10',sr:PL10,mrName:'PL15',mrFull:'PL-15',mr:PL15,srN:4,mrN:6,
  radar:{modes:['RWS','TWS','IRST'],name:'Type 1475 AESA',range:160000,gimbal:100},
  cm:cmo(48,48,0,true,'ECM','internal EW (est.)','CM',prcSt(AC_DEFS.SU27.cm.stations).map(s=>/PL12/.test(s[1])?[s[0],'PL15',s[2]]:s)),
  spec:'<span><b>+9 g</b> · 2 seats</span><span><b>Mach 2</b></span><span>2× WS-10B</span><span>Type 1475 <b>AESA</b></span><span>PL-15 · PL-10</span><span><b>MAWS</b></span>',
  rwrSym:'16',rwrName:'RWR (est.)',srDesc:'PL-10 imaging-IR heat seeker',mrDesc:'PL-15 active radar missile (Fox 3): two-way datalink',cmDesc:'96 cartridges (est.)'});

/* ================= lofted models for the new jets (true scale, +z forward, 1 unit = 1 m; same schema as render.js) ================= */
// F-4E Phantom II: 19.2 m, 11.7 m span, drooped stabilators, upturned outer wing panels, tandem cockpits
M2.F4E={L:19.2,nz:5.8,radome:6.8,
  fus:[[-9.3,.35,.35,.35,.1,2.2],[-8,.75,.6,.55,.05,2.4],[-6,.95,.66,.6,0,2.6],[-3,1.05,.68,.6,0,2.8],[-.5,1.0,.7,.6,0,2.8],[2,.9,.7,.55,.02,2.6],[4,.8,.66,.52,-.02,2.4],[6,.7,.56,.5,-.12,2.2],[7.6,.55,.46,.44,-.24,2.1],[8.8,.34,.3,.3,-.36,2],[9.4,.14,.14,.14,-.42,2],[9.7,0,0,0,-.44,2]],
  parts:[{x:0,st:[[3.4,.3,.2,.1,.78,2.2],[1.2,.52,.3,.12,.8,2.4],[-2,.54,.3,.12,.78,2.4],[-5,.4,.22,.1,.7,2.2],[-7.8,.18,.1,.08,.58,2]]},{x:1.1,mouth:1,st:[[-3.4,.52,.55,.62,-.2,3],[-.2,.6,.7,.7,-.12,3.4],[2.2,.55,.78,.7,-.05,4],[3.2,.52,.82,.7,0,5]]}],
  wings:[{st:[{x:.95,zle:2.2,zte:-4.5,y:-.12,t:.05},{x:3.6,zle:-.7,zte:-4.5,y:-.05,t:.04},{x:5.85,zle:-2.4,zte:-4.7,y:.55,t:.03}]},
    {st:[{x:.95,zle:-7.0,zte:-9.1,y:-.05,t:.04},{x:3.7,zle:-8.3,zte:-9.9,y:-1.45,t:.03}]}],
  fins:[{x:0,y:.62,st:[{h:0,zle:-3.6,zte:-8.6,t:.05},{h:3.4,zle:-7.2,zte:-9.4,t:.04}]}],
  canopy:[4.5,.95,.52,.5,2.7],frame:-1.3,noz:[[.52,.12,-8.9,.52,1.1],[-.52,.12,-8.9,.52,1.1]],
  r9:mir([[2.8,-.78,-.2,.05],[2.8,-.78,-1.7,.05]]),r120:mir([[.55,-1.0,1.6,null],[.55,-1.0,-1.8,null]])};
// F-35A: 15.7 m, 10.7 m span, canted twin tails, DSI intakes, internal weapons bays
M2.F35A={L:15.67,nz:4.6,radome:6.2,internal:1,
  fus:[[-7.0,.42,.45,.4,.05,2.3],[-5.8,.7,.55,.5,.05,2.5],[-4,.9,.62,.62,0,2.6],[-1.5,.98,.66,.68,0,2.7],[1,.92,.64,.64,0,2.6],[3.2,.78,.55,.5,0,2.4],[5,.55,.4,.38,-.02,2.2],[6.5,.35,.26,.26,-.04,2.1],[7.6,.1,.1,.1,-.05,2],[7.9,0,0,0,-.05,2]],
  parts:[{x:.95,mouth:1,st:[[-1.2,.36,.34,.5,-.3,2.6],[.8,.44,.38,.55,-.34,3],[2.5,.43,.34,.52,-.34,3.4],[3.2,.41,.3,.5,-.34,4]]}],
  wings:[{st:[{x:.9,zle:1.0,zte:-4.6,y:-.1,t:.04},{x:5.35,zle:-2.1,zte:-4.5,y:-.1,t:.03}]},{st:[{x:.6,zle:4.0,zte:.8,y:0,t:.02},{x:1.0,zle:1.1,zte:.8,y:0,t:.02}]},
    {st:[{x:.8,zle:-5.1,zte:-7.2,y:-.12,t:.035},{x:3.0,zle:-6.4,zte:-7.5,y:-.2,t:.03}]}],
  fins:[{x:.95,y:.42,cant:-.35,mirror:1,st:[{h:0,zle:-3.4,zte:-6.4,t:.05},{h:2.0,zle:-5.9,zte:-7.2,t:.04}]}],
  canopy:[3.7,.64,.5,.4,1.4],frame:-1.1,noz:[[0,.05,-7.25,.55,1.3]],
  r9:mir([[3.4,-.28,-2.9,.0]]),r120:mir([[.5,-.5,2.0,null],[.5,-.5,-.6,null]])};
// F-22A: 18.9 m, 13.6 m span, 2-D vectoring nozzles, canted tails, wide trapezoid wings, internal bays
M2.F22A={L:18.9,nz:5.4,radome:7.6,internal:1,
  fus:[[-9.3,.55,.4,.35,.15,2.3],[-8,.85,.5,.45,.1,2.5],[-5,1.05,.6,.55,.05,2.7],[-1.5,1.1,.62,.62,0,2.8],[2,.95,.6,.6,0,2.6],[4.8,.66,.48,.45,0,2.4],[7,.45,.33,.3,-.04,2.2],[8.6,.22,.2,.18,-.06,2],[9.6,0,0,0,-.08,2]],
  parts:[{x:1.15,mouth:1,st:[[-2.5,.4,.36,.58,-.3,2.6],[.5,.5,.4,.62,-.34,3.2],[3.0,.48,.36,.6,-.36,3.8],[3.9,.46,.33,.58,-.36,4.4]]},{x:1.5,st:[[-9.5,.58,.38,.42,0,2.6],[-6,.7,.5,.5,0,2.8],[-2,.66,.5,.5,0,3]]}],
  wings:[{st:[{x:1.3,zle:3.0,zte:-6.0,y:-.05,t:.04},{x:6.78,zle:-2.0,zte:-3.9,y:-.05,t:.03}]},{st:[{x:.8,zle:7.2,zte:2.6,y:0,t:.02},{x:1.6,zle:3.4,zte:2.6,y:0,t:.02}]},
    {st:[{x:1.3,zle:-6.4,zte:-9.6,y:-.1,t:.035},{x:3.9,zle:-8.5,zte:-9.7,y:-.1,t:.03}]}],
  fins:[{x:1.9,y:.4,cant:-.47,mirror:1,st:[{h:0,zle:-5.2,zte:-9.0,t:.05},{h:2.4,zle:-8.2,zte:-9.8,t:.04}]}],
  canopy:[5.0,.78,.55,.42,1.8],frame:-1.2,noz:[[.78,.08,-9.7,.55,1.0],[-.78,.08,-9.7,.55,1.0]],
  r9:mir([[1.2,-.1,1.5,null]]),r120:mir([[.85,-.45,2.4,null],[.85,-.45,-.4,null],[.35,-.62,.9,null]])};
// F-104G Starfighter: 16.7 m, 6.7 m span, razor wings, T-tail, wing-tip Sidewinders
M2.F104G={L:16.7,nz:3.8,radome:6.4,
  fus:[[-8.0,.4,.4,.35,0,2.3],[-6.5,.55,.5,.45,0,2.5],[-4,.7,.55,.5,0,2.7],[-1,.72,.55,.5,0,2.8],[2,.62,.5,.45,0,2.6],[4,.55,.48,.42,0,2.4],[6,.4,.35,.3,0,2.2],[7.5,.25,.2,.2,0,2],[8.5,0,0,0,0,2]],
  parts:[{x:.78,mouth:1,st:[[-.6,.3,.36,.36,0,2.4],[1.0,.34,.42,.42,0,3],[2.4,.32,.4,.4,0,3.4]]}],
  wings:[{st:[{x:.7,zle:.9,zte:-3.3,y:-.12,t:.03},{x:3.34,zle:-.5,zte:-1.7,y:-.12,t:.025}]},{st:[{x:.3,zle:-6.9,zte:-8.3,y:2.9,t:.03},{x:1.9,zle:-7.5,zte:-8.3,y:2.9,t:.025}]}],
  fins:[{x:0,y:.4,st:[{h:0,zle:-4.0,zte:-8.0,t:.05},{h:2.5,zle:-6.8,zte:-8.4,t:.04}]}],
  canopy:[3.5,.5,.4,.36,1.2],frame:-1,noz:[[0,0,-8.2,.45,1.1]],
  r9:mir([[3.45,-.12,-.35,null],[2.0,-.45,-.3,-.05]]),r120:[]};
// MiG-21bis: 15 m, 7.2 m span, delta wing with all-moving tailplane, shock cone
M2.MIG21={L:14.8,nz:3.2,radome:5.6,
  fus:[[-6.8,.5,.5,.45,0,2.3],[-5.5,.6,.55,.5,0,2.5],[-3,.62,.6,.55,0,2.7],[-.5,.65,.6,.55,.05,2.8],[2,.58,.58,.5,.05,2.6],[4,.5,.5,.45,.05,2.4],[5.5,.46,.46,.42,.05,2.4],[6.6,.44,.42,.4,0,2.3],[7.15,.18,.18,.18,0,2],[7.4,0,0,0,0,2]],
  parts:[],
  wings:[{st:[{x:.55,zle:1.8,zte:-4.0,y:-.25,t:.04},{x:3.57,zle:-.3,zte:-2.1,y:-.25,t:.03}]},{st:[{x:.55,zle:-5.2,zte:-6.9,y:-.1,t:.03},{x:2.0,zle:-6.3,zte:-7.2,y:-.1,t:.025}]}],
  fins:[{x:0,y:.5,st:[{h:0,zle:-2.6,zte:-6.2,t:.05},{h:2.2,zle:-5.2,zte:-6.9,t:.04}]}],
  canopy:[2.7,.58,.36,.34,1.35],frame:-1,noz:[[0,.1,-6.9,.42,1.0]],
  r9:mir([[2.4,-.34,-.8,-.06],[3.0,-.3,-1.6,-.06]]),r120:mir([[1.4,-.3,-.4,-.06]])};
// Su-57: 19.8 m, 14.1 m span, wide spaced engines, LEVCON-less blended wing, canted all-moving tails, internal bays
M2.SU57={L:19.5,nz:5.8,radome:7.2,internal:1,
  fus:[[-9.5,.5,.42,.4,.1,2.4],[-8,.7,.5,.45,.1,2.6],[-5,.95,.62,.55,.05,2.8],[-1.5,1.05,.65,.6,0,2.8],[2,.9,.62,.58,0,2.6],[4.8,.65,.5,.45,0,2.3],[7.2,.45,.35,.32,-.03,2.2],[9.0,.25,.2,.2,-.05,2.1],[10.0,0,0,0,-.06,2]],
  parts:[{x:1.1,mouth:1,st:[[-2.2,.42,.35,.55,-.4,2.6],[1.4,.5,.38,.58,-.42,3.2],[3.3,.48,.36,.55,-.42,3.8],[4.0,.46,.33,.52,-.42,4.4]]},{x:1.55,st:[[-10.2,.55,.45,.5,-.05,2.8],[-6,.7,.55,.55,-.1,3],[-2,.66,.5,.55,-.12,3.2]]}],
  wings:[{st:[{x:1.5,zle:3.0,zte:-5.8,y:0,t:.04},{x:6.1,zle:-2.2,zte:-5.0,y:0,t:.03}]},{st:[{x:.9,zle:7.2,zte:2.6,y:.05,t:.02},{x:1.7,zle:3.2,zte:2.6,y:.05,t:.02}]},
    {st:[{x:1.6,zle:-7.8,zte:-10.6,y:-.05,t:.035},{x:3.9,zle:-9.8,zte:-11.0,y:-.05,t:.03}]}],
  fins:[{x:2.0,y:.4,cant:-.5,mirror:1,st:[{h:0,zle:-5.5,zte:-10.0,t:.05},{h:2.6,zle:-8.8,zte:-10.8,t:.04}]}],
  canopy:[5.6,.76,.55,.42,1.9],frame:-1.2,noz:[[1.1,.1,-11.0,.55,1.2],[-1.1,.1,-11.0,.55,1.2]],
  r9:mir([[1.25,-.15,2.0,null]]),r120:mir([[.85,-.55,2.4,null],[.85,-.55,-.4,null],[.45,-.62,1.0,null]])};
// Draken: 15.4 m, 9.4 m span, double delta, no tailplane
M2.J35F={L:15.35,nz:3.6,radome:5.8,
  fus:[[-6.8,.45,.5,.45,0,2.3],[-5.2,.62,.58,.5,0,2.5],[-3,.65,.6,.5,0,2.7],[-.5,.6,.55,.5,0,2.7],[2,.5,.5,.45,0,2.5],[4,.42,.42,.4,0,2.3],[5.8,.34,.3,.3,0,2.1],[7.1,.2,.18,.18,0,2],[7.7,0,0,0,0,2]],
  parts:[{x:.72,mouth:1,st:[[-.6,.27,.3,.3,.1,2.4],[1.2,.3,.34,.34,.1,3],[2.4,.28,.3,.3,.1,3.6]]}],
  wings:[{st:[{x:.55,zle:3.4,zte:-5.8,y:-.18,t:.04},{x:1.7,zle:2.2,zte:-5.6,y:-.18,t:.035},{x:4.7,zle:-1.8,zte:-4.2,y:-.18,t:.025}]}],
  fins:[{x:0,y:.45,st:[{h:0,zle:-2.7,zte:-6.6,t:.05},{h:2.7,zle:-5.2,zte:-7.0,t:.04}]}],
  canopy:[2.3,.55,.4,.35,1.35],frame:-1,noz:[[0,.05,-6.8,.5,1.1]],
  r9:mir([[1.8,-.4,-.9,-.05]]),r120:mir([[3.7,-.38,-2.3,-.05]])};
// Viggen: 16.4 m, 10.6 m span, canard-delta with a tall fin
M2.JA37={L:16.4,nz:4.2,radome:6.2,
  fus:[[-7.6,.55,.5,.45,.1,2.4],[-6,.75,.62,.55,.1,2.6],[-3.5,.85,.68,.6,.05,2.8],[-.5,.8,.62,.58,0,2.8],[2.5,.62,.55,.5,0,2.5],[4.5,.5,.45,.4,0,2.3],[6.2,.38,.32,.3,0,2.1],[7.5,.2,.18,.18,-.02,2],[8.2,0,0,0,0,2]],
  parts:[{x:.9,mouth:1,st:[[-1.5,.4,.55,.55,-.15,2.6],[1.0,.48,.6,.6,-.1,3],[3.0,.45,.55,.55,-.05,3.4],[3.8,.43,.5,.5,-.05,4]]}],
  wings:[{st:[{x:.9,zle:.6,zte:-6.4,y:-.12,t:.04},{x:3.2,zle:-1.4,zte:-6.4,y:-.12,t:.035},{x:5.3,zle:-3.9,zte:-6.0,y:-.12,t:.025}]},{st:[{x:.9,zle:4.3,zte:3.0,y:.45,t:.03},{x:2.6,zle:3.6,zte:2.8,y:.5,t:.025}]}],
  fins:[{x:0,y:.5,st:[{h:0,zle:-2.5,zte:-6.9,t:.05},{h:3.7,zle:-5.6,zte:-7.4,t:.04}]}],
  canopy:[3.4,.7,.42,.4,1.45],frame:-1.1,noz:[[0,.05,-7.7,.55,1.2]],
  r9:mir([[2.7,-.18,-1.6,.0],[4.3,-.18,-2.8,.0],[1.6,-.4,.2,-.05]]),r120:mir([[2.0,-.45,-.4,-.08]])};
// Lightning F.6: 16.8 m, 10.6 m span, 60° swept wings, two Avons stacked in the fuselage, nose intake
M2.LIGHTNING={L:16.8,nz:4.2,radome:7.4,
  fus:[[-8.0,.55,.7,.6,.1,2.2],[-6.5,.72,.85,.8,.1,2.5],[-4,.85,1.0,.9,.1,2.6],[-1,.85,1.0,.9,.1,2.7],[2,.8,.95,.85,.05,2.6],[4.2,.7,.85,.75,.05,2.4],[6.0,.6,.7,.65,0,2.3],[7.5,.52,.55,.5,0,2.2],[8.4,.4,.4,.4,0,2.1],[8.5,0,0,0,0,2]],
  parts:[],
  wings:[{st:[{x:.85,zle:1.8,zte:-3.7,y:-.55,t:.04},{x:5.3,zle:-3.4,zte:-5.0,y:-.55,t:.03}]},{st:[{x:.8,zle:-6.0,zte:-8.0,y:-.6,t:.035},{x:2.5,zle:-7.3,zte:-8.6,y:-.8,t:.03}]}],
  fins:[{x:0,y:.9,st:[{h:0,zle:-3.0,zte:-8.2,t:.05},{h:3.0,zle:-6.4,zte:-8.7,t:.04}]}],
  canopy:[3.9,1.15,.45,.38,1.45],frame:-1.2,noz:[[0,.45,-8.5,.38,1.0],[0,-.35,-8.5,.38,1.0]],
  r9:mir([[1.0,-.1,3.0,null]]),r120:[]};
// Tornado F.3: 18.7 m, swing wing shown at 45°, two engines, intakes under the wing roots
M2.TORNADO3={L:18.7,nz:5.6,radome:6.6,
  fus:[[-9.0,.55,.5,.45,.05,2.3],[-7.5,.85,.62,.55,0,2.5],[-5,1.1,.7,.6,0,2.7],[-1.5,1.12,.7,.62,0,2.8],[2,.95,.66,.6,0,2.6],[4.5,.75,.6,.55,0,2.4],[6.5,.55,.45,.4,0,2.2],[8,.38,.3,.28,-.02,2.1],[9.0,.18,.15,.15,-.03,2],[9.4,0,0,0,-.04,2]],
  parts:[{x:1.15,mouth:1,st:[[-3.5,.45,.45,.55,-.2,3],[-.5,.5,.5,.6,-.3,3.4],[1.5,.48,.45,.58,-.34,3.8],[2.5,.46,.4,.55,-.36,4]]}],
  wings:[{st:[{x:1.1,zle:1.0,zte:-3.2,y:.2,t:.04},{x:5.2,zle:-3.1,zte:-5.2,y:.2,t:.03}]},{st:[{x:1.1,zle:-6.3,zte:-8.9,y:-.1,t:.035},{x:3.5,zle:-8.2,zte:-9.5,y:-.1,t:.03}]}],
  fins:[{x:0,y:.45,st:[{h:0,zle:-3.8,zte:-8.8,t:.05},{h:3.5,zle:-7.2,zte:-9.4,t:.04}]}],
  canopy:[4.4,.86,.5,.5,1.9],frame:-1.3,noz:[[.55,.05,-9.0,.5,1.1],[-.55,.05,-9.0,.5,1.1]],
  r9:mir([[2.4,-.4,-.4,.2]]),r120:mir([[.55,-.82,1.5,null],[.55,-.82,-2.4,null]])};
// Kfir: 15.7 m, 8.2 m span, Mirage III delta with canards and a long nose
M2.KFIR={L:15.65,nz:3.6,radome:6.2,
  fus:[[-7.2,.5,.5,.45,0,2.3],[-5.8,.65,.58,.5,0,2.5],[-3,.7,.6,.55,0,2.7],[-.5,.68,.58,.55,0,2.8],[2,.58,.52,.5,0,2.6],[4,.5,.45,.42,0,2.4],[5.8,.4,.34,.34,0,2.2],[7.0,.24,.2,.2,0,2],[7.8,0,0,0,0,2]],
  parts:[{x:.78,mouth:1,st:[[-.2,.26,.34,.34,.05,2.4],[1.2,.3,.4,.4,.05,3],[2.6,.3,.38,.38,.05,3.4]]}],
  wings:[{st:[{x:.55,zle:2.0,zte:-4.6,y:-.3,t:.04},{x:4.11,zle:-1.8,zte:-3.0,y:-.3,t:.03}]},{st:[{x:.8,zle:3.8,zte:3.0,y:.3,t:.025},{x:1.6,zle:3.4,zte:3.0,y:.3,t:.02}]}],
  fins:[{x:0,y:.5,st:[{h:0,zle:-2.4,zte:-6.4,t:.05},{h:2.3,zle:-5.4,zte:-7.0,t:.04}]}],
  canopy:[3.2,.6,.4,.36,1.35],frame:-1,noz:[[0,.05,-7.1,.5,1.1]],
  r9:mir([[1.7,-.32,-1.8,-.06],[2.7,-.32,-2.0,-.06]]),r120:[]};
// variants that share a hull
const m2Alias=(id,src,patch)=>{M2[id]=patch?Object.assign({},M2[src],patch):M2[src]};
m2Alias('F15E','F15C',{parts:[...M2.F15C.parts,{x:1.72,st:[[-4.6,.3,.35,.3,.05,2],[-1,.36,.4,.32,.05,2],[2.2,.3,.35,.28,.05,2]]}],canopy:[4.9,.95,.5,.5,2.25]});
m2Alias('FA18C','FA18E');
m2Alias('F2A','F16',{wings:[{st:[{x:.85,zle:1.5,zte:-4.2,y:-.08,t:.04},{x:5.6,zle:-1.9,zte:-3.4,y:-.08,t:.03}]},M2.F16.wings[1],M2.F16.wings[2]],r9:mir([[5.5,-.08,-2.7,null]])});
for(const [id,src] of [['F4F','F4E'],['F4EJ','F4E'],['F4EJK','F4E'],['F4EIL','F4E'],['F4E2K','F4E'],['PHANTOM2','F4E'],['F15J','F15C'],['F15JK','F15C'],['F15BAZ','F15C'],['F15I','F15E'],['F16BARAK','F16'],['F16I','F16B70'],
  ['F35DE','F35A'],['F35AJ','F35A'],['F35B','F35A'],['F35BJ','F35A'],['F35I','F35A'],['MIG29G','MIG29'],['EF2K1','TYPHOON'],['EF2K3','TYPHOON'],['SU30SM','SU35'],['J7G','MIG21'],['J11B','SU27'],['J15','SU33'],['J16','SU35']])m2Alias(id,src);
// two-seat and STOVL variants get their own canopy, canards or lift-fan hump on top of the shared hull
m2Alias('SU30SM','SU35',{canopy:[5.3,1.05,.55,.55,2.5],wings:[...M2.SU35.wings,M2.SU33.wings[3]]});
m2Alias('J16','SU35',{canopy:[5.3,1.05,.55,.55,2.5]});
m2Alias('F16I','F16B70',{canopy:[3.1,.62,.42,.42,2.3]});
{const fan={x:0,st:[[-3.8,.1,.05,.05,.62,2],[-3.0,.45,.2,.1,.62,2.2],[-1.4,.55,.22,.1,.64,2.2],[-.4,.45,.18,.1,.62,2.2],[0,.2,.08,.08,.6,2]]};
  for(const id of ['F35B','F35BJ'])m2Alias(id,'F35A',{parts:[...M2.F35A.parts,fan]})}
for(const id of ['F4E','F35A','F22A','F104G','MIG21','SU57','J35F','JA37','LIGHTNING','TORNADO3','KFIR','F15E','FA18C','F2A','F4F','F4EJ','F4EJK','F4EIL','F4E2K','PHANTOM2','F15J','F15JK','F15BAZ','F15I','F16BARAK','F16I','F35DE','F35AJ','F35B','F35BJ','F35I',
  'MIG29G','EF2K1','EF2K3','SU30SM','J7G','J11B','J15','J16'])m2Fit(id);
// the saved aircraft may be one of the new ones
try{const k=localStorage.getItem('viperAC');if(AC_DEFS[k])AC=AC_DEFS[k]}catch(e){}

/* ---- tables that other slices own get their rows from here (they run later, so they call these) ---- */
const ROSTER_LIKE={F15E:'F15C',FA18C:'FA18E',F4F:'F4E',F4EJ:'F4E',F4EJK:'F4E',F4EIL:'F4E',F4E2K:'F4E',PHANTOM2:'F4E',F15J:'F15C',F15JK:'F15C',F15BAZ:'F15C',F15I:'F15C',F16BARAK:'F16',F16I:'F16B70',F2A:'F16B70',
  F35DE:'F35A',F35AJ:'F35A',F35B:'F35A',F35BJ:'F35A',F35I:'F35A',MIG29G:'MIG29',EF2K1:'TYPHOON',EF2K3:'TYPHOON',SU30SM:'SU35',J7G:'MIG21',J11B:'SU27',J15:'SU33',J16:'SU35'};
const ROSTER_IDS=['F4E','FA18C','F15E','F35A','F22A','MIG21','SU30SM','SU57','F104G','F4F','MIG29G','EF2K1','EF2K3','F35DE','F4EJ','F4EJK','F4EIL','F15J','F15JK','F2A','F35AJ','F35B','F35BJ','KFIR','F4E2K','F15BAZ','F16BARAK','F16I','F15I','F35I',
  'J35F','JA37','LIGHTNING','PHANTOM2','TORNADO3','J7G','J11B','J15','J16'];
const rosterFill=(T,own)=>{Object.assign(T,own);for(const k in ROSTER_LIKE)if(T[k]==null&&T[ROSTER_LIKE[k]]!=null)T[k]=T[ROSTER_LIKE[k]]};
Object.assign(PODS,{F15E:'LANTIRN',FA18C:'LITENING AT',F16I:'LITENING',F15I:'LITENING',F35A:'EOTS',F35DE:'EOTS',F35AJ:'EOTS',F35B:'EOTS',F35BJ:'EOTS',F35I:'EOTS',F22A:null,SU57:'OLS-50M',J16:'KZ900',J11B:null});
Object.assign(PITS,{F4E:'TEEN',F4F:'TEEN',F4EJ:'TEEN',F4EJK:'TEEN',F4EIL:'TEEN',F4E2K:'TEEN',PHANTOM2:'TEEN',FA18C:'HORNET',F15E:'LAD',F15J:'TEEN',F15JK:'LAD',F15BAZ:'TEEN',F15I:'LAD',F35A:'LAD',F35DE:'LAD',F35AJ:'LAD',F35B:'LAD',F35BJ:'LAD',F35I:'LAD',F22A:'LAD',
  F104G:'TEEN',MIG21:'RUS',MIG29G:'RUS',SU30SM:'RUS2',SU57:'RUS2',J35F:'TEEN',JA37:'TEEN',LIGHTNING:'TEEN',TORNADO3:'3MFD',KFIR:'TEEN',F16I:'LAD',EF2K1:'3MFD',EF2K3:'3MFD',J7G:'RUS',J11B:'RUS2',J15:'RUS2',J16:'3MFD'});
for(const id of ['F16BARAK','F16I','F2A','F35A','F35DE','F35AJ','F35B','F35BJ','F35I'])SIDESTICK[id]=1;
Object.assign(PAINT,{
  F4E:{p:2,c:['#6b7345','#8a7a4f','#a1a27a'],b:'#b9bcc0',nat:'usaf',num:'AF 68-0338'},
  FA18C:{p:1,c:['#8b939a','#6f7881','#9aa1a7'],nat:'usn',num:'NE 400',nose:'400',lowvis:1},
  F15E:{p:1,c:['#838c95','#6a7580','#8f979f'],nat:'usaf',num:'AF 90-0233',lowvis:1},
  F35A:{p:0,c:['#7b8187','#70767c','#868c92'],nat:'usaf',num:'AF 13-5072',lowvis:1},
  F22A:{p:0,c:['#686f76','#5f666d','#737a81'],nat:'usaf',num:'AF 09-4190',lowvis:1},
  F104G:{p:2,c:['#6f7a52','#8a8f6b','#5b6340'],b:'#b8bcc0',nat:'ger',num:'20+01'},
  F4F:{p:0,c:['#8e949a','#7a8188','#9aa0a6'],nat:'ger',num:'38+10',lowvis:1},
  MIG29G:{p:0,c:['#8a9096','#767d84','#979ea4'],nat:'ger',num:'29+10'},
  EF2K1:{p:0,c:['#858c93','#7a8188','#9199a0'],nat:'ger',num:'30+43',lowvis:1},
  EF2K3:{p:0,c:['#858c93','#7a8188','#9199a0'],nat:'ger',num:'31+30',lowvis:1},
  F35DE:{p:0,c:['#7b8187','#70767c','#868c92'],nat:'ger',num:'31+01',lowvis:1},
  F4EJ:{p:1,c:['#9aa4ac','#7e8a95','#aeb7bd'],nat:'jp',num:'17-8301',lowvis:1},
  F4EJK:{p:1,c:['#9aa4ac','#7e8a95','#aeb7bd'],nat:'jp',num:'17-8440',lowvis:1},
  F4EIL:{p:2,c:['#b0a47a','#8d9a7e','#7f8c97'],b:'#bcc4cb',nat:'isr',num:'69'},
  F15J:{p:1,c:['#8b96a1','#6e7b88','#9aa5af'],nat:'jp',num:'92-8920',lowvis:1},
  F15JK:{p:1,c:['#85909b','#68757f','#939ea8'],nat:'jp',num:'12-8808',lowvis:1},
  F2A:{p:1,c:['#8f9ba6','#74818d','#a0abb4'],nat:'jp',num:'63-8523',lowvis:1},
  F35AJ:{p:0,c:['#7b8187','#70767c','#868c92'],nat:'jp',num:'79-8701',lowvis:1},
  F35B:{p:0,c:['#7b8187','#70767c','#868c92'],nat:'raf',num:'ZM148',lowvis:1},
  F35BJ:{p:0,c:['#7b8187','#70767c','#868c92'],nat:'jp',num:'89-8711',lowvis:1},
  KFIR:{p:2,c:['#b0a47a','#8d9a7e','#7f8c97'],b:'#bcc4cb',nat:'isr',num:'219'},
  F4E2K:{p:1,c:['#929aa1','#7b838c','#a0a7ad'],nat:'isr',num:'154'},
  F15BAZ:{p:1,c:['#9aa3ab','#7e8995','#a7afb6'],nat:'isr',num:'684',lowvis:1},
  F16BARAK:{p:1,c:['#8e969d','#737b83','#9aa2a8'],nat:'isr',num:'352',lowvis:1},
  F16I:{p:1,c:['#868f97','#6c757d','#939ba2'],nat:'isr',num:'831',lowvis:1},
  F15I:{p:1,c:['#838c95','#6a7580','#8f979f'],nat:'isr',num:'201',lowvis:1},
  F35I:{p:0,c:['#7b8187','#70767c','#868c92'],nat:'isr',num:'901',lowvis:1},
  J35F:{p:2,c:['#5f6b4c','#7a8265','#8a9296'],b:'#b9bcc0',nat:'swe',num:'35-60'},
  JA37:{p:2,c:['#5c6a4c','#757d63','#6a7480'],b:'#aab0b5',nat:'swe',num:'37-34'},
  LIGHTNING:{p:0,c:['#b7bcc2','#a3a9b0','#c4c9ce'],nat:'raf',num:'XR749'},
  PHANTOM2:{p:2,c:['#6a7260','#58625a','#7d857c'],b:'#aab0b5',nat:'raf',num:'XV401'},
  TORNADO3:{p:0,c:['#8a9096','#7a8188','#979ea4'],nat:'raf',num:'ZE167',lowvis:1},
  MIG21:{p:2,c:['#6f7a55','#8a8c6a','#7a8a99'],b:'#b0b5ba',nat:'rus',num:'21',nose:'21'},
  SU30SM:{p:3,c:['#7a8a96','#5c6f7f','#a0acb5'],nat:'rus',num:'RF-81703',nose:'30'},
  SU57:{p:0,c:['#7a838c','#6c747c','#868e96'],nat:'rus',num:'58',nose:'58',lowvis:1},
  J7G:{p:1,c:['#8f989f','#7a858e','#9ca4aa'],nat:'prc',num:'71234',nose:'71234'},
  J11B:{p:3,c:['#8d97a3','#6e7c8c','#a0aab4'],nat:'prc',num:'13200',nose:'13200'},
  J15:{p:3,c:['#8a95a1','#6c7a8a','#9ea8b2'],nat:'prc',num:'552',nose:'552'},
  J16:{p:1,c:['#8f98a3','#74808c','#a1aab3'],nat:'prc',num:'67010',nose:'67010'}});


/* ===== more aircraft: F-5E, F-14B, MiG-23ML, MiG-25PD, J-8F, Mirage F1C, Mirage 2000-5F (BRs and loadouts follow War Thunder where known, otherwise estimates; hulls are shared where the real shapes are close) ===== */
SRM.R550=Object.assign({},SRM.AIM9L,{acc:155,gmax:30,maxR:8000,gimbal:.8});
SRM.MICAIR=Object.assign({},SRM.PY3,{acc:185,gmax:50,maxR:15000,gimbal:1.2,cone:1.2});
MRM.R530F={burn:4,acc:150,cd:5.5e-5,gmax:20,life:40,fuze:9,gimbal:.9,decoy:0,minR:1500,maxR:22000,cone:.9,lockT:1.8,sarh:true,launchG:4,termR:28000,dlR:0};
MRM.R23R={burn:4,acc:150,cd:5.5e-5,gmax:18,life:45,fuze:9,gimbal:.8,decoy:0,minR:1500,maxR:24000,cone:.8,lockT:1.8,sarh:true,launchG:4,termR:30000,dlR:0};
MRM.R40R={burn:5,acc:200,cd:5e-5,gmax:15,life:60,fuze:10,gimbal:.8,decoy:0,minR:2000,maxR:38000,cone:.8,lockT:2,sarh:true,launchG:3,termR:48000,dlR:0};
MRM.PL11={burn:4,acc:150,cd:5.5e-5,gmax:20,life:45,fuze:9,gimbal:.9,decoy:0,minR:1500,maxR:24000,cone:.9,lockT:1.8,sarh:true,launchG:4,termR:30000,dlR:0};
MRM.MICAEM=Object.assign({},AC_DEFS.F16.mr,{maxR:45000,gmax:45,dlR:60000,termR:15000});
MRM.AIM54=Object.assign({},AC_DEFS.F16.mr,{maxR:70000,gmax:20,acc:190,dlR:90000,termR:20000});
// F-5E Tiger II: Northrop, 2× J85-GE-21 (22.2 kN AB each), 17.3 m² wing, +7.3 g, 2× M39 20 mm (280 rds each), 2 wing-tip + 2 pylon AIM-9, ranging radar only
dv('F104G','F5E','F-5E Tiger II','Tiger',{corner:380,
  S:17.3,MASS:6800,CLMAX:1.25,KIND:.15,T_AB:44500,T_MIL:30000,ram:.4,cdK:1.0,supK:.1,gmax:7.3,roll:6.0,vne:700,
  gunRate:50,gunRounds:560,muzzle:1030,gunDmg:1,gunSnd:1800,ammo:'PGU-28',
  fuelCap:2050,sfcDry:.95,sfcAB:2.1,fuelUnit:'LB',engines:2,refuel:null,irstR:0,irstMax:0,
  srName:'9P',srFull:'AIM-9P',mrName:'-',mrFull:'none',srN:4,mrN:0,sr:SRM.AIM9P,mr:MRM.AIM7,
  radar:{modes:['RWS'],name:'AN/APQ-159',range:15000},
  cm:cmo(0,0,0,false,null,'','none',stn([['TIP L','9P'],['TIP R','9P'],['PYL L','9P'],['PYL R','9P']],[])),
  spec:'<span><b>+7.3 g</b></span><span><b>Mach 1.6</b></span><span>2× J85 <b>44.5 kN</b></span><span>2× M39 · <b>560 rds</b></span><span>4× AIM-9P · ranging radar</span><span>No countermeasures</span>',
  snd:{f:36,roar:240,wh:.004,twin:1,howl:[220,.012]},seek:{flareP:.02,chaffP:.01},rwrSym:'F5',rwrName:'none',srDesc:'AIM-9P Sidewinder (rear aspect, short range)',mrDesc:'No radar missiles',cmDesc:'none'});
// F-14B Tomcat: variable-sweep, 2× F110-GE-400 (126 kN AB each), AN/AWG-9 (up to 6 AIM-54), 2 AIM-9, M61A1 (675 rds)
dv('F15C','F14B','F-14B Tomcat','Tomcat',{corner:420,
  S:52.5,MASS:23500,CLMAX:1.5,KIND:.12,T_AB:253000,T_MIL:162000,ram:.45,cdK:1.4,supK:.15,gmax:6.5,roll:3.3,vne:800,
  gunRate:100,gunRounds:675,muzzle:1030,gunDmg:1,gunSnd:1800,ammo:'PGU-28',
  fuelCap:7300,sfcDry:.85,sfcAB:1.9,fuelUnit:'KG',engines:2,refuel:'probe',irstR:0,irstMax:0,
  srName:'9L',srFull:'AIM-9L',mrName:'54C',mrFull:'AIM-54C',srN:2,mrN:6,sr:SRM.AIM9L,mr:MRM.AIM54,
  radar:{modes:['RWS','TWS'],name:'AN/AWG-9',range:180000},
  cm:cmo(60,30,0,false,null,'','ALE-39',stn([['1A','9L'],['1B','9L']],[['3','54C'],['4','54C'],['5','54C'],['6','54C'],['7','54C'],['8','54C']])),
  spec:'<span><b>+6.5 g</b> · variable sweep</span><span><b>Mach 2.3</b></span><span>2× F110 <b>253 kN</b></span><span>AWG-9 <b>180 km</b></span><span>6× AIM-54C · 2× AIM-9L</span><span>M61A1 · <b>675 rds</b></span>',
  snd:{f:25,roar:190,wh:.006,twin:1,howl:[300,.02]},seek:{flareP:.04,chaffP:.03},rwrSym:'14',rwrName:'AN/ALR-67',srDesc:'AIM-9L Sidewinder, all-aspect',mrDesc:'AIM-54C Phoenix (Fox 3): active radar, launch and leave',cmDesc:'90 cartridges (est.)'});
// MiG-23ML: swing-wing interceptor, R-35-300 (127 kN AB), 23-mm GSh-23L, R-24/R-23R and R-60
dv('MIG21','MIG23ML','MiG-23ML','Flogger',{corner:450,
  S:34.2,MASS:14500,CLMAX:1.4,KIND:.13,T_AB:127000,T_MIL:83000,ram:.4,cdK:1.2,supK:.12,gmax:8.5,roll:3.8,vne:850,
  gunRate:50,gunRounds:200,muzzle:715,gunDmg:1,gunSnd:1200,ammo:'23MM',
  fuelCap:4900,sfcDry:.95,sfcAB:2.1,fuelUnit:'KG',engines:1,refuel:null,
  srName:'R60',srFull:'R-60M',mrName:'R23R',mrFull:'R-23R',srN:4,mrN:2,sr:SRM.R60,mr:MRM.R23R,
  radar:{modes:['RWS'],name:'Sapfir-23ML',range:55000},
  cm:cmo(0,0,0,false,null,'','none',stn([['1','R60'],['2','R60'],['3','R60'],['4','R60']],[['5','R23R'],['6','R23R']])),
  spec:'<span><b>+8.5 g</b> · variable sweep</span><span><b>Mach 2.35</b></span><span>R-35 <b>127 kN</b></span><span>GSh-23L · <b>200 rds</b></span><span>R-23R · R-60M</span><span>No countermeasures</span>',
  snd:{f:30,roar:215,wh:.004,twin:0,howl:[150,.012]},seek:{flareP:.04,chaffP:.02},rwrSym:'23',rwrName:'SPO-15',srDesc:'R-60M heat seeker, short range',mrDesc:'R-23R semi-active radar missile: hold the lock to impact',cmDesc:'none'});
// MiG-25PD: Mach 2.8 interceptor, 2× R-15BD-300 (110 kN AB each), Sapfir-25 radar, 4× R-40RD + 2× R-60, no gun
dv('F15C','MIG25PD','MiG-25PD','Foxbat',{corner:520,
  S:61.4,MASS:34000,CLMAX:1.1,KIND:.12,T_AB:220000,T_MIL:150000,ram:.5,cdK:1.2,supK:.1,gmax:5,roll:2.2,vne:1000,
  gunRate:0,gunRounds:0,muzzle:700,gunDmg:1,gunSnd:1200,ammo:'23MM',
  fuelCap:14500,sfcDry:1.1,sfcAB:2.3,fuelUnit:'KG',engines:2,refuel:null,irstR:0,irstMax:0,
  srName:'R60',srFull:'R-60M',mrName:'R40R',mrFull:'R-40RD',srN:2,mrN:4,sr:SRM.R60,mr:MRM.R40R,
  radar:{modes:['RWS'],name:'Sapfir-25',range:85000},
  cm:cmo(0,0,0,false,null,'','none',stn([['1','R60'],['2','R60']],[['3','R40'],['4','R40'],['5','R40'],['6','R40']])),
  spec:'<span><b>+5 g</b> (limited)</span><span><b>Mach 2.8</b></span><span>2× R-15 <b>220 kN</b></span><span>Sapfir-25 radar</span><span>R-40RD · R-60M</span><span>No gun, no countermeasures</span>',
  snd:{f:24,roar:185,wh:.006,twin:1,howl:[300,.02]},seek:{flareP:.03,chaffP:.02},rwrSym:'25',rwrName:'SPO-10',srDesc:'R-60M heat seeker, short range',mrDesc:'R-40RD semi-active radar missile: hold the lock to impact',cmDesc:'none'});
// J-8F: Shenyang twin-engine interceptor, 2× WP-13B (68.6 kN AB each), 23-mm Type 23-III, PL-8 + PL-11
dv('MIG21','J8F','J-8F','Finback',{corner:450,
  S:42.2,MASS:14800,CLMAX:1.3,KIND:.13,T_AB:137000,T_MIL:90000,ram:.4,cdK:1.15,supK:.12,gmax:7.5,roll:3.8,vne:850,
  gunRate:50,gunRounds:200,muzzle:715,gunDmg:1,gunSnd:1200,ammo:'23MM',
  fuelCap:4600,sfcDry:.95,sfcAB:2.1,fuelUnit:'KG',engines:2,refuel:null,
  srName:'PL8',srFull:'PL-8',mrName:'PL11',mrFull:'PL-11',srN:4,mrN:2,sr:SRM.PY3,mr:MRM.PL11,
  radar:{modes:['RWS'],name:'Type 1492',range:70000},
  cm:cmo(30,30,0,false,null,'','chaff/flare',stn([['1','PL8'],['2','PL8'],['3','PL8'],['4','PL8']],[['5','PL11'],['6','PL11']])),
  spec:'<span><b>+7.5 g</b></span><span><b>Mach 2.2</b></span><span>2× WP-13B <b>137 kN</b></span><span>Type 23-III · <b>200 rds</b></span><span>PL-11 · PL-8</span><span>60 countermeasures (est.)</span>',
  snd:{f:30,roar:215,wh:.004,twin:1,howl:[180,.014]},seek:{flareP:.05,chaffP:.03},rwrSym:'J8',rwrName:'RWR (est.)',srDesc:'PL-8 all-aspect heat seeker',mrDesc:'PL-11 semi-active radar missile: hold the lock to impact',cmDesc:'60 cartridges (est.)'});
// Mirage F1C: Dassault, Atar 9K-50 (70.6 kN AB), 2× DEFA 553 30 mm (135 rds each), R.550 Magic at the tips, Matra R.530F, Cyrano IV radar
dv('KFIR','MIRAGEF1','Mirage F1C','Cigogne',{corner:430,
  S:25,MASS:8500,CLMAX:1.45,KIND:.14,T_AB:70600,T_MIL:49000,ram:.4,cdK:1.1,supK:.13,gmax:7.5,roll:4.5,vne:850,
  gunRate:43,gunRounds:270,muzzle:800,gunDmg:2,gunSnd:900,ammo:'30MM',
  fuelCap:2900,sfcDry:.85,sfcAB:1.95,fuelUnit:'KG',engines:1,refuel:null,irstR:0,irstMax:0,
  srName:'R550',srFull:'R.550 Magic',mrName:'530F',mrFull:'R.530F',srN:2,mrN:2,sr:SRM.R550,mr:MRM.R530F,
  radar:{modes:['RWS'],name:'Cyrano IV',range:35000},
  cm:cmo(0,0,0,false,null,'','none',stn([['TIP L','R550'],['TIP R','R550']],[['PYL L','530F'],['PYL R','530F']])),
  spec:'<span><b>+7.5 g</b></span><span><b>Mach 2.2</b></span><span>Atar <b>70.6 kN</b></span><span>2× DEFA · <b>270 rds</b></span><span>R.550 Magic · R.530F</span><span>No countermeasures</span>',
  snd:{f:36,roar:235,wh:.003,twin:0,howl:[190,.011]},seek:{flareP:.04,chaffP:.02},rwrSym:'F1',rwrName:'none',srDesc:'R.550 Magic heat seeker',mrDesc:'R.530F semi-active radar missile: hold the lock to impact',cmDesc:'none'});
// Mirage 2000-5F: delta fly-by-wire fighter, M53-P2 (95.1 kN AB), RDY radar, MICA EM + Magic II, 2× DEFA 554 (125 rds each)
dv('KFIR','M2000','Mirage 2000-5F','Mirage',{corner:440,
  S:41,MASS:10200,CLMAX:1.7,KIND:.12,T_AB:95100,T_MIL:64300,ram:.4,cdK:1.0,supK:.1,gmax:9,roll:5.0,vne:880,
  gunRate:43,gunRounds:250,muzzle:800,gunDmg:2,gunSnd:900,ammo:'30MM',
  fuelCap:3200,sfcDry:.85,sfcAB:1.9,fuelUnit:'KG',engines:1,refuel:'probe',irstR:0,irstMax:0,
  srName:'R550',srFull:'Magic II',mrName:'MICA',mrFull:'MICA EM',srN:2,mrN:4,sr:SRM.R550,mr:MRM.MICAEM,
  radar:{modes:['RWS','TWS'],name:'RDY-2',range:90000},
  cm:cmo(112,112,0,false,'ECM','Spirale','Spirale',stn([['TIP L','Magic'],['TIP R','Magic']],[['3A','MICA'],['3B','MICA'],['7A','MICA'],['7B','MICA']])),
  spec:'<span><b>+9 g</b> · delta, fly-by-wire</span><span><b>Mach 2.2</b></span><span>M53-P2 <b>95.1 kN</b></span><span>RDY-2 <b>90 km</b></span><span>MICA EM · Magic II</span><span>Spirale countermeasures</span>',
  snd:{f:34,roar:230,wh:.004,twin:0,howl:[200,.012]},seek:{flareP:.1,chaffP:.08},rwrSym:'M2',rwrName:'Serval',srDesc:'Magic II heat seeker, high off-boresight',mrDesc:'MICA EM active radar missile (Fox 3): launch and leave',cmDesc:'224 cartridges (est.)'});
for(const id of ['F5E','F14B','MIG23ML','MIG25PD','J8F','MIRAGEF1','M2000']){delete AC_DEFS[id].model}
AC_DEFS.MIRAGEF1.cut=AC_DEFS.M2000.cut=AC_DEFS.KFIR.cut; AC_DEFS.F5E.cut=AC_DEFS.F104G.cut;

// models: the F-5E has its own loft; the rest reuse the closest real hull and are resized to the real length and span below
M2.F5E={L:14.45,nz:3.4,radome:5.4,
  fus:[[-6.6,.55,.5,.45,0,2.3],[-5,.65,.55,.5,0,2.5],[-2.5,.62,.52,.5,.02,2.7],[0,.58,.5,.46,.05,2.8],[2,.5,.44,.4,.05,2.6],[4,.38,.34,.3,.02,2.4],[5.6,.26,.22,.2,0,2.2],[6.6,.12,.1,.1,0,2],[7.2,0,0,0,0,2]],
  parts:[],
  wings:[{st:[{x:.6,zle:3.4,zte:-2.8,y:-.15,t:.04},{x:1.3,zle:1.9,zte:-2.8,y:-.15,t:.035},{x:4.0,zle:-.8,zte:-2.4,y:-.15,t:.03}]},{st:[{x:.5,zle:-5.2,zte:-6.5,y:-.05,t:.03},{x:2.0,zle:-5.9,zte:-6.9,y:-.05,t:.025}]}],
  fins:[{x:0,y:.5,st:[{h:0,zle:-2.4,zte:-6.4,t:.05},{h:2.0,zle:-4.6,zte:-6.9,t:.04}]}],
  canopy:[3.0,.5,.36,.34,1.3],frame:-1,noz:[[.28,0,-6.8,.3,.9],[-.28,0,-6.8,.3,.9]],
  r9:mir([[4.06,-.15,-.4,null],[2.2,-.4,-.9,-.05]]),r120:[]};
// F-14B Tomcat: 19.1 m, 11.65 m span with the wings swept back, fat flat centre section between two widely spaced engines, glove vanes, twin fins, Phoenix tunnel stations
M2.F14B={L:19.1,nz:5.6,radome:6.4,
  fus:[[-8.4,.3,.28,.28,.05,2],[-7.2,.55,.38,.35,.1,2.2],[-5,.85,.45,.4,.1,2.4],[-2,1.1,.55,.45,.1,2.6],[1,1.2,.6,.45,.1,2.7],[3.2,1.05,.64,.48,.05,2.6],[5,.78,.6,.5,0,2.4],[6.5,.56,.5,.46,-.02,2.2],[8,.38,.34,.34,-.05,2.1],[9.1,.18,.16,.16,-.08,2],[9.6,0,0,0,-.08,2]],
  parts:[{x:1.5,mouth:1,st:[[-8.5,.5,.5,.5,0,2.4],[-6,.62,.64,.62,-.02,2.6],[-2,.68,.66,.64,-.05,3],[2,.62,.62,.62,-.1,3.4],[3.5,.6,.68,.62,-.12,5]]}],
  wings:[{st:[{x:1.6,zle:2.4,zte:-3.4,y:.2,t:.05},{x:5.82,zle:-5.0,zte:-6.4,y:.2,t:.03}]},{st:[{x:1.2,zle:6.2,zte:-1.0,y:.15,t:.03},{x:2.1,zle:2.6,zte:-1.6,y:.15,t:.025}]},
    {st:[{x:1.5,zle:-6.2,zte:-8.8,y:-.15,t:.04},{x:4.0,zle:-8.0,zte:-9.6,y:-.15,t:.03}]}],
  fins:[{x:1.75,y:.5,cant:-.08,mirror:1,st:[{h:0,zle:-5.2,zte:-9.0,t:.05},{h:2.9,zle:-8.0,zte:-9.7,t:.04}]}],
  canopy:[4.9,.82,.5,.48,2.5],frame:-1.5,noz:[[1.5,0,-8.9,.58,1.3],[-1.5,0,-8.9,.58,1.3]],
  r9:mir([[2.55,-.22,2.4,.15]]),r120:mir([[.5,-.62,3.4,null],[.5,-.62,-.5,null],[2.55,-.55,-2.0,.1]])};
// MiG-25PD: 23.8 m, 14.0 m span, huge wedge-intake nacelles, trapezoid anhedral wings, twin canted fins, all-moving tailplanes
M2.MIG25PD={L:23.8,nz:7.4,radome:7.0,
  fus:[[-11.0,.4,.35,.35,0,2],[-9.5,.6,.45,.4,0,2.3],[-6,.7,.55,.45,.1,2.5],[-2,.75,.6,.5,.1,2.7],[1,.72,.62,.5,.1,2.7],[3.5,.66,.62,.5,.05,2.5],[5.5,.56,.5,.45,0,2.3],[8,.45,.4,.38,-.05,2.2],[10.5,.24,.22,.22,-.08,2],[11.9,0,0,0,-.1,2]],
  parts:[{x:1.6,mouth:1,st:[[-11.2,.55,.55,.5,0,2.4],[-7,.7,.7,.66,0,2.6],[-2,.78,.8,.72,-.05,3],[2.5,.76,.82,.72,-.1,3.6],[4.2,.72,.88,.76,-.12,5]]}],
  wings:[{st:[{x:1.2,zle:1.0,zte:-7.0,y:-.2,t:.04},{x:7.01,zle:-4.0,zte:-6.6,y:-.95,t:.025}]},{st:[{x:1.4,zle:-8.2,zte:-11.2,y:-.1,t:.035},{x:4.0,zle:-9.7,zte:-11.8,y:-.5,t:.03}]}],
  fins:[{x:1.75,y:.75,cant:-.15,mirror:1,st:[{h:0,zle:-5.8,zte:-11.3,t:.05},{h:3.6,zle:-9.0,zte:-11.9,t:.04}]}],
  canopy:[5.2,.78,.42,.4,1.9],frame:-1.4,noz:[[1.6,0,-11.3,.72,1.3],[-1.6,0,-11.3,.72,1.3]],
  r9:mir([[4.8,-.85,-5.2,-.55]]),r120:mir([[2.9,-.6,-4.5,-.2],[5.9,-1.05,-5.0,-.65]])};
// MiG-23ML: 16.7 m, 8.2 m span swept (14.0 m spread), side intakes behind the cockpit, glove, big dorsal fin, ventral fins
M2.MIG23ML={L:16.7,nz:5.2,radome:5.8,
  fus:[[-7.8,.5,.45,.45,0,2.3],[-6,.7,.55,.5,0,2.5],[-3,.78,.6,.55,0,2.7],[0,.82,.62,.58,0,2.8],[2.5,.78,.62,.55,.05,2.6],[4.5,.66,.55,.5,.05,2.4],[6.2,.5,.42,.42,.02,2.2],[7.6,.3,.26,.26,0,2],[8.35,0,0,0,0,2]],
  parts:[{x:.95,mouth:1,st:[[-2.5,.38,.55,.5,-.05,2],[-.5,.44,.6,.55,-.05,2.2],[1.2,.45,.6,.55,-.05,3.2],[2.2,.42,.6,.55,-.05,5]]}],
  wings:[{st:[{x:1.4,zle:.9,zte:-4.6,y:.35,t:.045},{x:4.08,zle:-5.0,zte:-6.4,y:.35,t:.03}]},{st:[{x:.6,zle:3.4,zte:-.2,y:.3,t:.03},{x:1.5,zle:.95,zte:-.5,y:.3,t:.025}]},
    {st:[{x:.9,zle:-6.2,zte:-8.2,y:-.2,t:.03},{x:3.4,zle:-7.2,zte:-8.4,y:-.2,t:.025}]}],
  fins:[{x:0,y:.5,st:[{h:0,zle:-2.0,zte:-7.2,t:.05},{h:2.8,zle:-6.2,zte:-8.0,t:.04}]},{x:.6,y:-.45,cant:-2.55,mirror:1,st:[{h:0,zle:-4.4,zte:-7.0},{h:.8,zle:-5.2,zte:-7.2}]}],
  canopy:[3.5,.6,.4,.38,1.5],frame:-1,noz:[[0,0,-8.0,.55,.9]],
  r9:mir([[1.5,-.4,-.9,.1],[1.5,-.4,1.3,.1]]),r120:mir([[.95,-.55,-.8,-.18]])};
// J-8F: 21.6 m with the probe, 9.3 m span, twin engines, delta wing with cheek intakes behind the cockpit, tall single fin, two ventral strakes
M2.J8F={L:21.5,nz:6.8,radome:7.2,
  fus:[[-10.0,.5,.45,.45,0,2.3],[-8,.8,.6,.55,0,2.5],[-4,.9,.65,.6,0,2.7],[0,.9,.65,.6,.05,2.8],[3.5,.8,.62,.55,.05,2.6],[5.5,.62,.5,.5,0,2.4],[7.5,.55,.45,.45,0,2.2],[9.5,.4,.32,.32,0,2],[10.4,.16,.14,.14,0,2],[10.75,0,0,0,0,2]],
  parts:[{x:1.05,mouth:1,st:[[-8.5,.45,.5,.5,0,2.4],[-4,.52,.6,.58,-.05,2.6],[0,.55,.62,.6,-.05,3],[2.5,.52,.6,.58,-.05,3.4],[4.2,.5,.58,.58,-.05,5]]}],
  wings:[{st:[{x:.9,zle:3.0,zte:-6.2,y:-.2,t:.04},{x:4.67,zle:-2.5,zte:-5.6,y:-.2,t:.03}]},{st:[{x:1.1,zle:-8.0,zte:-10.4,y:-.35,t:.035},{x:3.6,zle:-9.0,zte:-10.8,y:-.35,t:.03}]}],
  fins:[{x:0,y:.6,st:[{h:0,zle:-3.0,zte:-9.8,t:.05},{h:3.2,zle:-8.0,zte:-10.8,t:.04}]},{x:.9,y:-.55,cant:-2.55,mirror:1,st:[{h:0,zle:-6,zte:-9},{h:.7,zle:-7.2,zte:-9.4}]}],
  canopy:[5.8,.78,.4,.4,1.8],frame:-1.2,noz:[[.6,0,-10.2,.5,1.1],[-.6,0,-10.2,.5,1.1]],
  r9:mir([[2.0,-.55,-.8,-.15],[3.8,-.5,-1.5,-.15]]),r120:mir([[1.2,-.9,-3.5,-.3]])};
m2Alias('MIRAGEF1','KFIR',{wings:[{st:[{x:.6,zle:1.6,zte:-3.2,y:.3,t:.04},{x:4.2,zle:-1.2,zte:-2.8,y:.3,t:.03}]},{st:[{x:.5,zle:-5.6,zte:-7.0,y:-.1,t:.03},{x:2.0,zle:-6.3,zte:-7.3,y:-.1,t:.025}]}],r9:mir([[4.2,.3,-1.9,null]]),r120:mir([[1.8,-.45,-.6,-.05]])});
m2Alias('M2000','KFIR',{wings:[{st:[{x:.6,zle:1.6,zte:-5.4,y:-.1,t:.045},{x:4.56,zle:-2.6,zte:-4.8,y:-.1,t:.03}]}],r9:mir([[4.5,-.1,-3.4,null]]),r120:mir([[1.8,-.45,-.6,-.05],[3.2,-.4,-1.8,-.05]])});
for(const id of ['F5E','F14B','MIG25PD','MIG23ML','J8F','MIRAGEF1','M2000'])m2Fit(id);
Object.assign(M2K,{MIRAGEF1:[1,1,.975],M2000:[.97,1,.92]});
ROSTER_IDS.push('F5E','F14B','MIG23ML','MIG25PD','J8F','MIRAGEF1','M2000');
Object.assign(ROSTER_LIKE,{F5E:'F104G',F14B:'F15C',MIG23ML:'MIG21',MIG25PD:'SU27',J8F:'MIG21',MIRAGEF1:'KFIR',M2000:'KFIR'});
Object.assign(PITS,{F5E:'TEEN',F14B:'TEEN',MIG23ML:'RUS',MIG25PD:'RUS',J8F:'RUS',MIRAGEF1:'TEEN',M2000:'3MFD'});
Object.assign(PAINT,{
  F5E:{p:2,c:['#b9ad8a','#8f9a82','#7b8a99'],b:'#bcc2c8',nat:'usaf',num:'AF 74-1559'},
  F14B:{p:1,c:['#8a929a','#707a84','#9aa2a9'],nat:'usn',num:'NE 101',nose:'101'},
  MIG23ML:{p:2,c:['#808a6a','#9a9c80','#7a8a99'],b:'#b0b5ba',nat:'rus',num:'23',nose:'23'},
  MIG25PD:{p:0,c:['#9ea5ad','#8e969e','#a8afb6'],nat:'rus',num:'25',nose:'25'},
  J8F:{p:2,c:['#7d8a78','#98a08c','#7f95a8'],b:'#b4b9be',nat:'prc',num:'81'},
  MIRAGEF1:{p:2,c:['#6f7a55','#8d9170','#7e8d9a'],b:'#b9bdc2',nat:'fra',num:'12-YA'},
  M2000:{p:1,c:['#7e8a96','#6a7681','#8a95a0'],nat:'fra',num:'2-EA',lowvis:1}});

/* ===== Cold War jets: F-8E Crusader, F-100D Super Sabre, MiG-19PT, MiG-21F-13, Hunter F.6, Mirage IIIC (BR, guns, weapons and sizes from the War Thunder wiki; masses, thrust and fuel from fact sheets, est. where noted) ===== */
SRM.AIM9D=Object.assign({},SRM.AIM9B,{acc:120,gmax:20,maxR:5000,gimbal:.55,lockT:1.3});          // cooled seeker, still rear-aspect
SRM.R3S=Object.assign({},SRM.AIM9B,{acc:112,gmax:16,maxR:3800});                                   // AA-2 Atoll, a Sidewinder copy
SRM.MAGIC1=Object.assign({},SRM.AIM9P,{acc:130,gmax:22,maxR:5500,gimbal:.6});
// F-8E Crusader: Vought, J57-P-20A (80 kN AB), 32.5 m² variable-incidence wing, 2× Colt Mk 12 20 mm (250 rds), AIM-9D on the fuselage rails, ranging radar only
dv('F104G','F8E','F-8E Crusader','Gunfighter',{corner:400,
  S:32.5,MASS:11500,CLMAX:1.35,KIND:.13,T_AB:80000,T_MIL:48000,ram:.4,cdK:.85,supK:.1,gmax:7.5,roll:4.0,vne:830,
  gunRate:33,gunRounds:250,muzzle:1030,gunDmg:1,gunSnd:1500,ammo:'20MM',
  fuelCap:4160,sfcDry:.88,sfcAB:2.0,fuelUnit:'KG',engines:1,refuel:'probe',irstR:0,irstMax:0,
  srName:'9D',srFull:'AIM-9D',mrName:'-',mrFull:'none',srN:4,mrN:0,sr:SRM.AIM9D,mr:MRM.AIM7,
  radar:{modes:['RWS'],name:'AN/APS-67',range:12000},
  cm:cmo(0,0,0,false,null,'','none',stn([['L1','9D'],['L2','9D'],['R1','9D'],['R2','9D']],[])),
  spec:'<span><b>+7.5 g</b> · variable-incidence wing</span><span><b>Mach 1.8</b></span><span>J57 <b>80 kN</b></span><span>2× Mk 12 · <b>250 rds</b></span><span>4× AIM-9D · ranging radar</span><span>No countermeasures</span>',
  snd:{f:30,roar:230,wh:.003,twin:0,howl:[170,.01]},seek:{flareP:.02,chaffP:.01},rwrSym:'F8',rwrName:'none',srDesc:'AIM-9D Sidewinder (rear aspect, short range)',mrDesc:'No radar missiles',cmDesc:'none'});
// F-100D Super Sabre: North American, J57-P-21 (75 kN AB), 49.1 m² wing, 4× M39A1 20 mm (800 rds), AIM-9B, no radar missiles
dv('F104G','F100D','F-100D Super Sabre','Hun',{corner:380,
  S:49.1,MASS:11800,CLMAX:1.25,KIND:.14,T_AB:75000,T_MIL:47000,ram:.4,cdK:.8,supK:.15,gmax:7.0,roll:3.6,vne:735,
  gunRate:100,gunRounds:800,muzzle:1030,gunDmg:1,gunSnd:1800,ammo:'20MM',
  fuelCap:3500,sfcDry:.9,sfcAB:2.0,fuelUnit:'KG',engines:1,refuel:'probe',irstR:0,irstMax:0,
  srName:'9B',srFull:'AIM-9B',mrName:'-',mrFull:'none',srN:2,mrN:0,sr:SRM.AIM9B,mr:MRM.AIM7,
  radar:{modes:['RWS'],name:'AN/APG-30',range:6000},
  cm:cmo(0,0,0,false,null,'','none',stn([['PYL L','9B'],['PYL R','9B']],[])),
  spec:'<span><b>+7 g</b></span><span><b>Mach 1.3</b></span><span>J57 <b>75 kN</b></span><span>4× M39A1 · <b>800 rds</b></span><span>2× AIM-9B · gun-ranging radar</span><span>No countermeasures</span>',
  snd:{f:32,roar:235,wh:.003,twin:0,howl:[150,.01]},seek:{flareP:.02,chaffP:.01},rwrSym:'F1',rwrName:'none',srDesc:'AIM-9B Sidewinder (rear aspect, short range)',mrDesc:'No radar missiles',cmDesc:'none'});
// MiG-19PT: Shenyang-class twin RD-9B (63.7 kN AB), 25 m² wing, 2× NR-30 30 mm (140 rds), R-3S, ranging radar
dv('MIG21','MIG19PT','MiG-19PT','Farmer',{corner:330,
  S:25,MASS:7400,CLMAX:1.25,KIND:.14,T_AB:64000,T_MIL:50000,ram:.35,cdK:1.25,supK:.2,gmax:8,roll:5.2,vne:680,
  gunRate:28,gunRounds:140,muzzle:780,gunDmg:2,gunSnd:900,ammo:'30MM',
  fuelCap:1800,sfcDry:1.0,sfcAB:2.1,fuelUnit:'KG',engines:2,refuel:null,
  srName:'R3S',srFull:'R-3S',mrName:'-',mrFull:'none',srN:2,mrN:0,sr:SRM.R3S,mr:MRM.R3R,
  radar:{modes:['RWS'],name:'RP-1 Izumrud',range:10000},
  cm:cmo(0,0,0,false,null,'','none',stn([['1','R3S'],['2','R3S']],[])),
  spec:'<span><b>+8 g</b></span><span><b>Mach 1.35</b></span><span>2× RD-9B <b>64 kN</b></span><span>2× NR-30 · <b>140 rds</b></span><span>2× R-3S · ranging radar</span><span>No countermeasures</span>',
  snd:{f:32,roar:220,wh:.002,twin:1,howl:[140,.01]},seek:{flareP:.02,chaffP:.01},rwrSym:'19',rwrName:'none',srDesc:'R-3S heat seeker (rear aspect, short range)',mrDesc:'No radar missiles',cmDesc:'none'});
// MiG-21F-13: R-11F-300 (56 kN AB), 23 m² delta, one NR-30 (60 rds), 2× R-3S, ranging radar
dv('MIG21','MIG21F13','MiG-21F-13','Fishbed',{corner:360,
  S:23,MASS:6600,CLMAX:1.2,KIND:.14,T_AB:56000,T_MIL:38000,ram:.4,cdK:.75,supK:.15,gmax:7.5,roll:5.6,vne:710,
  gunRate:14.2,gunRounds:60,muzzle:780,gunDmg:2,gunSnd:900,ammo:'30MM',
  fuelCap:2030,sfcDry:.95,sfcAB:2.1,fuelUnit:'KG',engines:1,refuel:null,
  srName:'R3S',srFull:'R-3S',mrName:'-',mrFull:'none',srN:2,mrN:0,sr:SRM.R3S,mr:MRM.R3R,
  radar:{modes:['RWS'],name:'TsD-30 ranging',range:6000},
  cm:cmo(0,0,0,false,null,'','none',stn([['1','R3S'],['2','R3S']],[])),
  spec:'<span><b>+7.5 g</b></span><span><b>Mach 2.0</b></span><span>R-11F <b>56 kN</b></span><span>NR-30 · <b>60 rds</b></span><span>2× R-3S · ranging radar</span><span>No countermeasures</span>',
  snd:{f:32,roar:225,wh:.004,twin:0,howl:[160,.011]},seek:{flareP:.02,chaffP:.01},rwrSym:'21',rwrName:'none',srDesc:'R-3S heat seeker (rear aspect, short range)',mrDesc:'No radar missiles',cmDesc:'none'});
// Hunter F.6: Hawker, Avon 207 (45 kN, no afterburner), 32.4 m² swept wing, 4× ADEN 30 mm (600 rds), AIM-9B
dv('F104G','HUNTER','Hunter F.6','Hunter',{corner:340,
  S:32.4,MASS:7800,CLMAX:1.3,KIND:.12,T_AB:45800,T_MIL:45000,ram:.3,cdK:1.0,supK:.3,gmax:7.5,roll:4.4,vne:640,
  gunRate:80,gunRounds:600,muzzle:790,gunDmg:2,gunSnd:900,ammo:'30MM',
  fuelCap:1370,sfcDry:.85,sfcAB:.85,fuelUnit:'KG',engines:1,refuel:null,irstR:0,irstMax:0,
  srName:'9B',srFull:'AIM-9B',mrName:'-',mrFull:'none',srN:4,mrN:0,sr:SRM.AIM9B,mr:MRM.AIM7,
  radar:{modes:['RWS'],name:'AN/APG-30 ranging',range:5000},
  cm:cmo(0,0,0,false,null,'','none',stn([['1','9B'],['2','9B'],['3','9B'],['4','9B']],[])),
  spec:'<span><b>+7.5 g</b></span><span><b>Mach 0.95</b> (no afterburner)</span><span>Avon <b>45 kN</b></span><span>4× ADEN · <b>600 rds</b></span><span>4× AIM-9B</span><span>No countermeasures</span>',
  snd:{f:30,roar:195,wh:.003,twin:0,howl:[210,.012]},seek:{flareP:.02,chaffP:.01},rwrSym:'HU',rwrName:'none',srDesc:'AIM-9B Sidewinder (rear aspect, short range)',mrDesc:'No radar missiles',cmDesc:'none'});
// Mirage IIIC: Dassault delta, Atar 9B (60.8 kN AB), 35 m² wing, 2× DEFA 552 30 mm (250 rds), R.550 Magic 1 + R.530 on the centreline, Cyrano I radar
MRM.R530=Object.assign({},MRM.R530F,{acc:140,gmax:15,maxR:18000,termR:22000});
dv('KFIR','MIRAGE3C','Mirage IIIC','Delta',{corner:380,
  S:35,MASS:7900,CLMAX:1.1,KIND:.15,T_AB:60800,T_MIL:41200,ram:.4,cdK:.45,supK:.15,gmax:7,roll:4.2,vne:790,
  gunRate:40,gunRounds:250,muzzle:800,gunDmg:2,gunSnd:900,ammo:'30MM',
  fuelCap:1870,sfcDry:.9,sfcAB:2.0,fuelUnit:'KG',engines:1,refuel:null,irstR:0,irstMax:0,
  srName:'MAGIC',srFull:'R.550 Magic',mrName:'530',mrFull:'R.530',srN:2,mrN:1,sr:SRM.MAGIC1,mr:MRM.R530,
  radar:{modes:['RWS'],name:'Cyrano Ibis',range:25000},
  cm:cmo(0,0,0,false,null,'','none',stn([['PYL L','Magic'],['PYL R','Magic']],[['CL','530']])),
  spec:'<span><b>+7 g</b> · delta</span><span><b>Mach 2.0</b></span><span>Atar 9B <b>60.8 kN</b></span><span>2× DEFA · <b>250 rds</b></span><span>R.550 Magic · R.530</span><span>No countermeasures</span>',
  snd:{f:36,roar:230,wh:.003,twin:0,howl:[185,.011]},seek:{flareP:.02,chaffP:.01},rwrSym:'M3',rwrName:'none',srDesc:'R.550 Magic heat seeker',mrDesc:'R.530 semi-active radar missile: hold the lock to impact',cmDesc:'none'});
for(const id of ['F8E','F100D','MIG19PT','MIG21F13','HUNTER','MIRAGE3C']){delete AC_DEFS[id].model}
AC_DEFS.F8E.cut=AC_DEFS.F100D.cut=AC_DEFS.HUNTER.cut=AC_DEFS.F104G.cut; AC_DEFS.MIG19PT.cut=AC_DEFS.MIG21F13.cut=AC_DEFS.MIG21.cut; AC_DEFS.MIRAGE3C.cut=AC_DEFS.KFIR.cut;
// F-8E Crusader: 16.6 m, 10.8 m span, chin intake, high swept wing, low all-moving tail, ventral fins
M2.F8E={L:16.6,nz:5.2,radome:6.6,
  fus:[[-8.0,.45,.4,.4,0,2.3],[-6.0,.7,.5,.5,0,2.5],[-3.0,.82,.6,.6,.05,2.7],[0,.85,.62,.62,.1,2.8],[2.5,.78,.6,.58,.05,2.6],[4.5,.65,.5,.5,0,2.4],[6.2,.5,.42,.42,-.05,2.2],[7.5,.3,.26,.26,-.05,2],[8.3,0,0,0,-.05,2]],
  parts:[{x:0,mouth:1,st:[[-2.5,.4,.3,.35,-.7,2.4],[0,.52,.35,.4,-.72,2.8],[3.0,.5,.34,.4,-.72,3.2],[5.0,.48,.32,.4,-.72,5]]}],
  wings:[{st:[{x:.8,zle:2.2,zte:-3.0,y:.5,t:.04},{x:5.4,zle:-2.4,zte:-4.4,y:.5,t:.03}]},{st:[{x:.7,zle:-6.3,zte:-8.2,y:-.1,t:.03},{x:3.1,zle:-7.4,zte:-8.5,y:-.1,t:.025}]}],
  fins:[{x:0,y:.5,st:[{h:0,zle:-3.4,zte:-7.6,t:.05},{h:2.4,zle:-6.8,zte:-8.3,t:.04}]},{x:.5,y:-.45,cant:-2.55,mirror:1,st:[{h:0,zle:-5.6,zte:-7.6},{h:.6,zle:-6.5,zte:-7.8}]}],
  canopy:[3.4,.62,.42,.4,1.6],frame:-1,noz:[[0,0,-7.6,.5,1.0]],
  r9:mir([[.95,-.2,2.2,null],[.95,-.2,-.1,null]]),r120:[]};
// F-100D Super Sabre: 14.3 m, 11.8 m span, nose intake, low swept wing, fixed-chord tailplane, tall swept fin
M2.F100D={L:14.3,nz:4.8,radome:null,
  fus:[[-7.0,.45,.4,.4,0,2.3],[-5.2,.65,.5,.5,0,2.5],[-2.5,.78,.58,.55,0,2.7],[0,.8,.6,.55,.05,2.8],[2.5,.74,.58,.52,.05,2.6],[4.5,.7,.52,.5,0,2.4],[6.0,.68,.52,.5,0,2.2],[6.9,.66,.5,.5,0,2],[7.15,0,0,0,0,2]],
  parts:[{x:0,mouth:1,st:[[5.5,.62,.48,.48,0,3],[6.8,.62,.48,.48,0,3],[7.1,.6,.47,.47,0,5]]}],
  wings:[{st:[{x:.8,zle:1.4,zte:-3.8,y:-.35,t:.04},{x:5.9,zle:-3.6,zte:-5.4,y:-.2,t:.03}]},{st:[{x:.7,zle:-5.4,zte:-6.9,y:-.25,t:.03},{x:2.8,zle:-6.4,zte:-7.15,y:-.25,t:.025}]}],
  fins:[{x:0,y:.5,st:[{h:0,zle:-2.8,zte:-6.6,t:.05},{h:2.8,zle:-6.2,zte:-7.15,t:.04}]}],
  canopy:[2.8,.6,.4,.4,1.5],frame:-1,noz:[[0,0,-6.5,.52,.9]],
  r9:mir([[3.0,-.6,-1.6,-.25]]),r120:[]};
// MiG-19PT: 13.0 m, 9.0 m span, nose intake with centre cone, twin engines, swept wing with fences, swept tail
M2.MIG19PT={L:13.0,nz:4.3,radome:5.8,
  fus:[[-6.3,.4,.35,.35,0,2.2],[-5,.62,.5,.45,0,2.4],[-2.5,.72,.58,.55,0,2.6],[0,.72,.6,.55,.05,2.7],[2.5,.66,.55,.5,.05,2.5],[4.2,.6,.5,.48,0,2.3],[5.4,.58,.48,.48,0,2.1],[6.0,.5,.4,.4,0,2],[6.5,0,0,0,0,2]],
  parts:[{x:0,mouth:1,st:[[3.6,.56,.48,.48,0,3],[5.2,.58,.5,.5,0,3],[5.9,.58,.5,.5,0,5]]}],
  wings:[{st:[{x:.7,zle:1.8,zte:-2.9,y:0,t:.04},{x:4.5,zle:-3.2,zte:-4.6,y:0,t:.03}]},{st:[{x:.6,zle:-4.8,zte:-6.1,y:.1,t:.03},{x:2.4,zle:-5.6,zte:-6.5,y:.1,t:.025}]}],
  fins:[{x:0,y:.5,st:[{h:0,zle:-2.4,zte:-5.6,t:.05},{h:2.3,zle:-5.0,zte:-6.5,t:.04}]}],
  canopy:[2.6,.6,.38,.36,1.4],frame:-1,noz:[[.38,0,-6.3,.36,.8],[-.38,0,-6.3,.36,.8]],
  r9:mir([[3.3,-.4,-1.2,-.05]]),r120:[]};
// Hunter F.6: 14.0 m, 10.3 m span, wing-root intakes, 35° wing, high tailplane, single pipe
M2.HUNTER={L:14.0,nz:4.6,radome:6.0,
  fus:[[-7.0,.4,.35,.35,0,2.2],[-5.5,.55,.5,.5,0,2.4],[-3,.62,.58,.58,0,2.6],[0,.68,.6,.6,.05,2.8],[2.5,.66,.56,.55,.05,2.6],[4.5,.5,.45,.45,0,2.4],[6.0,.36,.34,.34,0,2.2],[6.8,.18,.16,.16,0,2],[7.2,0,0,0,0,2]],
  parts:[{x:.9,mouth:1,st:[[-1.5,.3,.32,.32,-.05,2.2],[.2,.34,.34,.34,-.05,2.6],[1.8,.34,.34,.34,-.05,3.4],[2.5,.32,.32,.32,-.05,5]]}],
  wings:[{st:[{x:.9,zle:1.5,zte:-2.7,y:-.1,t:.045},{x:5.15,zle:-1.4,zte:-3.2,y:-.1,t:.03}]},{st:[{x:.5,zle:-5.2,zte:-6.5,y:.35,t:.03},{x:2.2,zle:-5.9,zte:-6.9,y:.35,t:.025}]}],
  fins:[{x:0,y:.55,st:[{h:0,zle:-2.8,zte:-6.4,t:.05},{h:2.5,zle:-5.6,zte:-7.0,t:.04}]}],
  canopy:[3.2,.6,.4,.38,1.45],frame:-1,noz:[[0,0,-6.9,.38,.7]],
  r9:mir([[2.5,-.45,-.6,-.12],[3.7,-.4,-1.0,-.1]]),r120:[]};
m2Alias('MIG21F13','MIG21',{fins:[{x:0,y:.5,st:[{h:0,zle:-2.6,zte:-6.2,t:.05},{h:1.9,zle:-5.2,zte:-6.9,t:.04}]}],r9:mir([[2.4,-.34,-.8,-.06]]),r120:[]});
m2Alias('MIRAGE3C','KFIR',{wings:[M2.KFIR.wings[0]],r9:mir([[2.6,-.3,-1.9,-.06]]),r120:[[0,-.5,-.3,-.04]]});
for(const id of ['F8E','F100D','MIG19PT','MIG21F13','HUNTER','MIRAGE3C'])m2Fit(id);
ROSTER_IDS.push('F8E','F100D','MIG19PT','MIG21F13','HUNTER','MIRAGE3C');
Object.assign(ROSTER_LIKE,{F8E:'F104G',F100D:'F104G',HUNTER:'F104G',MIG19PT:'MIG21',MIG21F13:'MIG21',MIRAGE3C:'KFIR'});
Object.assign(PITS,{F8E:'TEEN',F100D:'TEEN',HUNTER:'TEEN',MIG19PT:'RUS',MIG21F13:'RUS',MIRAGE3C:'TEEN'});
Object.assign(PAINT,{
  F8E:{p:1,c:['#8d9399','#6f767d','#a0a7ad'],b:'#c4c9ce',nat:'usn',num:'NK 102',nose:'102'},
  F100D:{p:0,c:['#b4b9be','#9ea4aa','#c2c7cc'],nat:'usaf',num:'FW 54-2243'},
  MIG19PT:{p:0,c:['#a9b0b7','#98a0a7','#b6bcc2'],nat:'rus',num:'19',nose:'19'},
  MIG21F13:{p:2,c:['#7c8663','#929775','#7d8c99'],b:'#b0b5ba',nat:'rus',num:'21',nose:'21'},
  HUNTER:{p:2,c:['#5f6a4f','#7a8068','#8a9298'],b:'#aab0b5',nat:'raf',num:'XG190'},
  MIRAGE3C:{p:2,c:['#8e969d','#a7adb3','#7d8995'],b:'#b9bdc2',nat:'fra',num:'3-XA'}});

/* ===== Cold War jets, second batch: F-4C, F-5A, J 35D Draken, J 29F Tunnan, J-6A, MiG-21MF (War Thunder wiki for BR, guns, missiles and sizes; est. elsewhere) ===== */
SRM.RB24=Object.assign({},SRM.AIM9B);                                                              // Swedish licence-built Sidewinder
SRM.AIM9E=Object.assign({},SRM.AIM9P,{acc:130,gmax:22,maxR:5500,gimbal:.6});
MRM.AIM7D=Object.assign({},MRM.AIM7E,{acc:140,gmax:18,maxR:18000,termR:22000});
// F-4C Phantom II: 17.8 m (no gun nose), 2× J79-GE-15, no gun, AIM-9B + AIM-7D, APQ-100
dv('F4E','F4C','F-4C Phantom II','Phantom',{corner:430,
  MASS:16500,cdK:1.1,gmax:7,gunRate:0,gunRounds:0,ammo:'20MM',
  srName:'9B',srFull:'AIM-9B',mrName:'7D',mrFull:'AIM-7D',srN:4,mrN:4,sr:SRM.AIM9B,mr:MRM.AIM7D,
  radar:{modes:['RWS'],name:'AN/APQ-100',range:60000},
  cm:cmo(0,0,0,false,null,'','none',stn([['1','9B'],['2','9B'],['3','9B'],['4','9B']],[['5','7D'],['6','7D'],['7','7D'],['8','7D']])),
  spec:'<span><b>+7 g</b></span><span><b>Mach 2.2</b></span><span>2× J79 <b>~160 kN</b></span><span>No gun</span><span>AIM-7D · AIM-9B</span><span>No countermeasures</span>',
  rwrSym:'F4',rwrName:'none',srDesc:'AIM-9B Sidewinder (rear aspect, short range)',mrDesc:'AIM-7D Sparrow: semi-active, hold the lock to impact',cmDesc:'none'});
// F-5A Freedom Fighter: 2× J85-GE-13 (36 kN AB), 15.8 m² wing, 2× M39A2 (560 rds), AIM-9E, no radar
dv('F5E','F5A','F-5A Freedom Fighter','Freedom',{corner:370,
  S:15.8,MASS:5600,T_AB:36500,T_MIL:24500,gmax:7.3,roll:6.2,vne:710,
  srName:'9E',srFull:'AIM-9E',srN:2,sr:SRM.AIM9E,
  radar:{modes:['RWS'],name:'Gun sight (no radar)',range:3000},
  cm:cmo(0,0,0,false,null,'','none',stn([['TIP L','9E'],['TIP R','9E']],[])),
  spec:'<span><b>+7.3 g</b></span><span><b>Mach 1.4</b></span><span>2× J85 <b>36 kN</b></span><span>2× M39A2 · <b>560 rds</b></span><span>2× AIM-9E</span><span>No countermeasures</span>',
  srDesc:'AIM-9E Sidewinder (rear aspect, short range)'});
// J 35D Draken: RM6C, 2× Akan m/55 30 mm (200 rds), 2× Rb 24, ranging radar
dv('J35F','J35D','J 35D Draken','Draken',{corner:400,
  cdK:.6,gunRate:46.7,gunRounds:200,
  srName:'RB24',srFull:'Rb 24',srN:2,sr:SRM.RB24,mrName:'-',mrFull:'none',mrN:0,
  radar:{modes:['RWS'],name:'PS-03 ranging',range:12000},
  cm:cmo(0,0,0,false,null,'','none',stn([['L','RB24'],['R','RB24']],[])),
  spec:'<span><b>+7 g</b> · double delta</span><span><b>Mach 2.0</b></span><span>RM6C <b>78 kN</b></span><span>2× Akan · <b>200 rds</b></span><span>2× Rb 24</span><span>No countermeasures</span>',
  srDesc:'Rb 24 (Sidewinder, rear aspect, short range)',mrDesc:'No radar missiles',cmDesc:'none'});
// J 29F Tunnan: Svenska Ghost RM2B with afterburner (~61 kN), 24 m² wing, 4× Akan m/47C 20 mm (720 rds), Rb 24
dv('F104G','J29F','J 29F Tunnan','Tunnan',{corner:340,
  S:24.2,MASS:6200,CLMAX:1.35,KIND:.12,T_AB:61000,T_MIL:44000,ram:.3,cdK:2.0,supK:.3,gmax:7,roll:4.2,vne:600,
  gunRate:50,gunRounds:720,muzzle:800,gunDmg:1,gunSnd:1500,ammo:'20MM',
  fuelCap:1720,sfcDry:.85,sfcAB:1.9,fuelUnit:'KG',engines:1,refuel:null,irstR:0,irstMax:0,
  srName:'RB24',srFull:'Rb 24',mrName:'-',mrFull:'none',srN:2,mrN:0,sr:SRM.RB24,mr:MRM.AIM7,
  radar:{modes:['RWS'],name:'Ranging sight',range:3000},
  cm:cmo(0,0,0,false,null,'','none',stn([['L','RB24'],['R','RB24']],[])),
  spec:'<span><b>+7 g</b></span><span><b>Mach 0.95</b></span><span>RM2B <b>61 kN</b></span><span>4× Akan m/47 · <b>720 rds</b></span><span>2× Rb 24</span><span>No countermeasures</span>',
  snd:{f:30,roar:200,wh:.003,twin:0,howl:[190,.012]},seek:{flareP:.02,chaffP:.01},rwrSym:'29',rwrName:'none',srDesc:'Rb 24 (Sidewinder, rear aspect, short range)',mrDesc:'No radar missiles',cmDesc:'none'});
// J-6A: Chinese MiG-19, 2× WP-6A (64 kN AB), 2× Type 30-1 (140 rds), PL-2, no radar
dv('MIG19PT','J6A','J-6A','Farmer',{corner:330,
  gunRate:28,gunRounds:140,
  srName:'PL2',srFull:'PL-2',srN:2,sr:SRM.R3S,
  radar:{modes:['RWS'],name:'Gun sight (no radar)',range:3000},
  cm:cmo(0,0,0,false,null,'','none',stn([['1','PL2'],['2','PL2']],[])),
  spec:'<span><b>+8 g</b></span><span><b>Mach 1.35</b></span><span>2× WP-6A <b>64 kN</b></span><span>2× Type 30-1 · <b>140 rds</b></span><span>2× PL-2</span><span>No countermeasures</span>',
  srDesc:'PL-2 heat seeker (rear aspect, short range)'});
// MiG-21MF: R-13-300 (64.7 kN AB), GSh-23L (200 rds), R-60 + R-3R, Sapfir-21
dv('MIG21','MIG21MF','MiG-21MF','Fishbed',{corner:370,
  S:23,MASS:7200,T_AB:64700,T_MIL:40200,cdK:.75,gmax:8,roll:5.6,vne:735,
  gunRate:56.6,gunRounds:200,muzzle:715,gunDmg:1,gunSnd:1200,ammo:'23MM',
  fuelCap:2300,
  srName:'R60',srFull:'R-60',srN:2,sr:SRM.R60,mrName:'R3R',mrFull:'R-3R',mrN:2,mr:MRM.R3R,
  radar:{modes:['RWS'],name:'RP-21 Sapfir',range:30000},
  cm:cmo(0,0,0,false,null,'','none',stn([['1','R60'],['2','R60']],[['3','R3R'],['4','R3R']])),
  spec:'<span><b>+8 g</b></span><span><b>Mach 2.05</b></span><span>R-13 <b>64.7 kN</b></span><span>GSh-23L · <b>200 rds</b></span><span>R-3R · R-60</span><span>No countermeasures</span>',
  srDesc:'R-60 heat seeker, short range',mrDesc:'R-3R semi-active radar missile: hold the lock to impact',cmDesc:'none'});
AC_DEFS.J35F.cdK=.6;   // the Draken is a Mach 2 jet: the old drag factor held it near Mach 1
for(const id of ['F4C','F5A','J35D','J29F','J6A','MIG21MF']){delete AC_DEFS[id].model}
AC_DEFS.J29F.cut=AC_DEFS.F104G.cut;
// J 29F Tunnan "flying barrel": 10.2 m, 11.0 m span, round fuselage with a nose intake, 25° wing, tailplane on the tailpipe
M2.J29F={L:10.2,nz:3.3,radome:null,
  fus:[[-5.1,.2,.2,.2,0,2],[-4.2,.4,.4,.4,0,2.2],[-2.5,.78,.7,.7,0,2.5],[-.5,.92,.78,.74,0,2.7],[1.2,.9,.76,.72,.05,2.7],[2.8,.8,.68,.66,.05,2.5],[3.8,.7,.6,.6,0,2.3],[4.5,.62,.52,.52,0,2.1],[4.85,.5,.4,.4,0,2],[5.1,0,0,0,0,2]],
  parts:[{x:0,mouth:1,st:[[3.4,.55,.46,.46,0,3],[4.7,.58,.5,.5,0,3],[5.0,.56,.48,.48,0,5]]}],
  wings:[{st:[{x:.85,zle:1.2,zte:-1.9,y:-.1,t:.045},{x:5.5,zle:-.9,zte:-2.6,y:-.1,t:.03}]},{st:[{x:.5,zle:-3.9,zte:-4.9,y:.3,t:.03},{x:2.3,zle:-4.2,zte:-5.0,y:.3,t:.025}]}],
  fins:[{x:0,y:.7,st:[{h:0,zle:-2.2,zte:-4.9,t:.05},{h:1.9,zle:-3.8,zte:-5.1,t:.04}]}],
  canopy:[1.2,.82,.45,.42,1.6],frame:-1,noz:[[0,0,-4.8,.5,.7]],
  r9:mir([[3.3,-.35,-.8,-.08]]),r120:[]};
m2Alias('F4C','F4E');
m2Alias('F5A','F5E',{wings:[{st:[{x:.6,zle:2.8,zte:-2.8,y:-.15,t:.04},{x:1.3,zle:1.9,zte:-2.8,y:-.15,t:.035},{x:3.85,zle:-.8,zte:-2.4,y:-.15,t:.03}]},M2.F5E.wings[1]],r9:mir([[3.85,-.15,-.4,null]]),r120:[]});
m2Alias('J35D','J35F',{r120:[]});
m2Alias('J6A','MIG19PT');
m2Alias('MIG21MF','MIG21',{r9:mir([[2.4,-.34,-.8,-.06]]),r120:mir([[1.4,-.3,-.4,-.06]])});
for(const id of ['F4C','F5A','J35D','J29F','J6A','MIG21MF'])m2Fit(id);
Object.assign(M2K,{F4C:[1,1,.927],MIG21MF:[1,1,.955]});
ROSTER_IDS.push('F4C','F5A','J35D','J29F','J6A','MIG21MF');
Object.assign(ROSTER_LIKE,{F4C:'F4E',F5A:'F104G',J35D:'J35F',J29F:'F104G',J6A:'MIG21',MIG21MF:'MIG21'});
Object.assign(PITS,{F4C:'TEEN',F5A:'TEEN',J35D:'TEEN',J29F:'TEEN',J6A:'RUS',MIG21MF:'RUS'});
Object.assign(PAINT,{
  F4C:{p:2,c:['#6f776a','#5b655d','#8b928a'],b:'#aab0b5',nat:'usaf',num:'AF 63-7699'},
  F5A:{p:2,c:['#b9ad8a','#8f9a82','#7b8a99'],b:'#bcc2c8',nat:'usaf',num:'AF 65-10506'},
  J35D:{p:2,c:['#5f6b4c','#7a8265','#8a9296'],b:'#b9bcc0',nat:'swe',num:'35-12'},
  J29F:{p:2,c:['#68744f','#80876a','#8a9296'],b:'#b9bcc0',nat:'swe',num:'29-23'},
  J6A:{p:0,c:['#a9b0b7','#98a0a7','#b6bcc2'],nat:'prc',num:'6021',nose:'6021'},
  MIG21MF:{p:2,c:['#7a8663','#8e9475','#7d8c99'],b:'#b0b5ba',nat:'rus',num:'27',nose:'27'}});

/* ===== CAS and strike jets, and the Italian tree: A-4E, A-7E, A-10A, Su-25, Su-22M3, Alpha Jet A, G.91Y, AMX, F-104S, Tornado IDS (Italy), Jaguar GR.1, Q-5A (BR, guns, sizes from the War Thunder wiki; est. elsewhere) ===== */
SRM.AIM9G=Object.assign({},SRM.AIM9D,{acc:125});
const NOSR=SRM.AIM9B;   // aircraft with no air-to-air missiles keep a placeholder seeker; srN is 0 so none is carried
// A-10A Thunderbolt II: 2× TF34-GE-100A (80.6 kN), 47 m² wing, GAU-8/A 30 mm (1,174 rds), AGM-65, AIM-9L, no radar
dv('F104G','A10A','A-10A Thunderbolt II','Hog',{corner:240,
  S:47,MASS:14800,CLMAX:1.75,KIND:.09,T_AB:81000,T_MIL:80600,ram:.2,cdK:3.2,supK:.5,gmax:6.5,roll:3.4,vne:470,
  gunRate:65,gunRounds:1174,muzzle:1010,gunDmg:3,gunSnd:2200,ammo:'30MM',
  fuelCap:4850,sfcDry:.37,sfcAB:.37,fuelUnit:'KG',engines:2,refuel:'boom',irstR:0,irstMax:0,
  srName:'9L',srFull:'AIM-9L',mrName:'-',mrFull:'none',srN:2,mrN:0,sr:SRM.AIM9L,mr:MRM.AIM7,
  radar:{modes:['RWS'],name:'None (Pave Penny)',range:2000},
  cm:cmo(120,60,0,false,null,'','ALE-40',stn([['L','9L'],['R','9L']],[])),
  spec:'<span><b>+6.5 g</b> · armoured tub</span><span><b>Mach 0.56</b></span><span>2× TF34 <b>80.6 kN</b></span><span>GAU-8/A · <b>1,174 rds</b></span><span>AGM-65 · Mk 82 · Mk 84</span><span>2× AIM-9L</span>',
  snd:{f:20,roar:150,wh:.012,twin:1,howl:[420,.03]},seek:{flareP:.05,chaffP:.02},rwrSym:'A1',rwrName:'AN/ALR-46',srDesc:'AIM-9L Sidewinder, all-aspect',mrDesc:'No radar missiles',cmDesc:'180 cartridges (est.)'});
// Su-25: 2× R-95Sh (80 kN), 30 m² wing, GSh-30-2 (250 rds), Kh-25ML, R-60
dv('MIG21','SU25','Su-25 Frogfoot','Grach',{corner:270,
  S:30.1,MASS:14200,CLMAX:1.6,KIND:.1,T_AB:81000,T_MIL:80000,ram:.2,cdK:1.8,supK:.5,gmax:6.5,roll:4.0,vne:580,
  gunRate:50,gunRounds:250,muzzle:880,gunDmg:2,gunSnd:900,ammo:'30MM',
  fuelCap:2900,sfcDry:.8,sfcAB:.8,fuelUnit:'KG',engines:2,refuel:null,
  srName:'R60',srFull:'R-60M',mrName:'-',mrFull:'none',srN:2,mrN:0,sr:SRM.R60,mr:MRM.R3R,
  radar:{modes:['RWS'],name:'Klen-PS laser ranger',range:5000},
  cm:cmo(256,0,0,false,null,'','UV-26',stn([['L','R60'],['R','R60']],[])),
  spec:'<span><b>+6.5 g</b> · titanium cockpit tub</span><span><b>Mach 0.8</b></span><span>2× R-95Sh <b>80 kN</b></span><span>GSh-30-2 · <b>250 rds</b></span><span>Kh-25ML · FAB bombs</span><span>2× R-60M</span>',
  snd:{f:24,roar:170,wh:.006,twin:1,howl:[300,.02]},seek:{flareP:.06,chaffP:.02},rwrSym:'25',rwrName:'SPO-15',srDesc:'R-60M heat seeker, short range',mrDesc:'No radar missiles',cmDesc:'256 cartridges'});
// A-7E Corsair II: TF41-A-2 (64.5 kN), 34.8 m² wing, M61A1 (1,000 rds), AIM-9G, Mk 82 / Mk 84
dv('F104G','A7E','A-7E Corsair II','Corsair',{corner:300,
  S:34.8,MASS:11800,CLMAX:1.5,KIND:.11,T_AB:65000,T_MIL:64500,ram:.3,cdK:1.4,supK:.4,gmax:6.5,roll:3.6,vne:670,
  gunRate:100,gunRounds:1000,muzzle:1030,gunDmg:1,gunSnd:1800,ammo:'20MM',
  fuelCap:4550,sfcDry:.65,sfcAB:.65,fuelUnit:'KG',engines:1,refuel:'probe',irstR:0,irstMax:0,
  srName:'9G',srFull:'AIM-9G',mrName:'-',mrFull:'none',srN:2,mrN:0,sr:SRM.AIM9G,mr:MRM.AIM7,
  radar:{modes:['RWS'],name:'AN/APQ-126',range:15000},
  cm:cmo(30,30,0,false,null,'','ALE-29',stn([['L','9G'],['R','9G']],[])),
  spec:'<span><b>+6.5 g</b></span><span><b>Mach 0.95</b> (no afterburner)</span><span>TF41 <b>64.5 kN</b></span><span>M61A1 · <b>1,000 rds</b></span><span>6× Mk 82 / Mk 84</span><span>2× AIM-9G</span>',
  snd:{f:26,roar:185,wh:.008,twin:0,howl:[330,.02]},seek:{flareP:.03,chaffP:.02},rwrSym:'A7',rwrName:'AN/APR-43',srDesc:'AIM-9G Sidewinder (rear aspect)',mrDesc:'No radar missiles',cmDesc:'60 cartridges (est.)'});
// A-4E Skyhawk: J52-P-6A (38 kN), 24.2 m² delta, 2× Colt Mk 12 20 mm (200 rds), AIM-9B
dv('F104G','A4E','A-4E Skyhawk','Scooter',{corner:320,
  S:24.2,MASS:6300,CLMAX:1.35,KIND:.12,T_AB:38000,T_MIL:37700,ram:.3,cdK:1.1,supK:.4,gmax:7,roll:5.0,vne:630,
  gunRate:33,gunRounds:200,muzzle:1030,gunDmg:1,gunSnd:1500,ammo:'20MM',
  fuelCap:2470,sfcDry:.85,sfcAB:.85,fuelUnit:'KG',engines:1,refuel:'probe',irstR:0,irstMax:0,
  srName:'9B',srFull:'AIM-9B',mrName:'-',mrFull:'none',srN:2,mrN:0,sr:SRM.AIM9B,mr:MRM.AIM7,
  radar:{modes:['RWS'],name:'AN/APG-53 ranging',range:6000},
  cm:cmo(0,0,0,false,null,'','none',stn([['L','9B'],['R','9B']],[])),
  spec:'<span><b>+7 g</b> · delta</span><span><b>Mach 0.9</b> (no afterburner)</span><span>J52 <b>38 kN</b></span><span>2× Mk 12 · <b>200 rds</b></span><span>3× Mk 82</span><span>2× AIM-9B</span>',
  snd:{f:30,roar:200,wh:.004,twin:0,howl:[220,.012]},seek:{flareP:.02,chaffP:.01},rwrSym:'A4',rwrName:'none',srDesc:'AIM-9B Sidewinder (rear aspect)',mrDesc:'No radar missiles',cmDesc:'none'});
// Su-22M3: swing-wing, R-29BS-300 (112 kN AB), 2× NR-30 (160 rds), R-60, Kh-25ML, FAB bombs
dv('MIG21','SU22M3','Su-22M3 Fitter','Fitter',{corner:420,
  S:34.5,MASS:15500,CLMAX:1.35,KIND:.13,T_AB:112000,T_MIL:76400,ram:.4,cdK:.9,supK:.15,gmax:7,roll:3.6,vne:765,
  gunRate:28,gunRounds:160,muzzle:780,gunDmg:2,gunSnd:900,ammo:'30MM',
  fuelCap:3800,sfcDry:.9,sfcAB:2.1,fuelUnit:'KG',engines:1,refuel:null,
  srName:'R60',srFull:'R-60MK',mrName:'-',mrFull:'none',srN:2,mrN:0,sr:SRM.R60,mr:MRM.R3R,
  radar:{modes:['RWS'],name:'Klen-PS laser ranger',range:5000},
  cm:cmo(0,0,0,false,null,'','none',stn([['L','R60'],['R','R60']],[])),
  spec:'<span><b>+7 g</b> · variable sweep</span><span><b>Mach 2.1</b></span><span>R-29BS <b>112 kN</b></span><span>2× NR-30 · <b>160 rds</b></span><span>Kh-25ML · FAB bombs</span><span>2× R-60MK</span>',
  snd:{f:28,roar:215,wh:.004,twin:0,howl:[150,.012]},seek:{flareP:.03,chaffP:.02},rwrSym:'22',rwrName:'SPO-15',srDesc:'R-60MK heat seeker, short range',mrDesc:'No radar missiles',cmDesc:'none'});
// Alpha Jet A: 2× Larzac 04-C6 (26 kN), 17.5 m² wing, no internal gun, bombs and rockets only
dv('F104G','ALPHAJET','Alpha Jet A','Alpha',{corner:320,
  S:17.5,MASS:5400,CLMAX:1.3,KIND:.12,T_AB:26600,T_MIL:26400,ram:.3,cdK:1.3,supK:.4,gmax:7,roll:5.0,vne:610,
  gunRate:0,gunRounds:0,muzzle:800,gunDmg:1,gunSnd:900,ammo:'27MM',
  fuelCap:1600,sfcDry:.75,sfcAB:.75,fuelUnit:'KG',engines:2,refuel:null,irstR:0,irstMax:0,
  srName:'-',srFull:'none',mrName:'-',mrFull:'none',srN:0,mrN:0,sr:NOSR,mr:MRM.AIM7,
  radar:{modes:['RWS'],name:'None',range:1000},
  cm:cmo(0,0,0,false,null,'','none',[]),
  spec:'<span><b>+7 g</b></span><span><b>Mach 0.85</b> (no afterburner)</span><span>2× Larzac <b>26 kN</b></span><span>No gun</span><span>4× Mk 82 · rockets</span><span>No missiles</span>',
  snd:{f:36,roar:190,wh:.004,twin:1,howl:[260,.015]},seek:{flareP:.02,chaffP:.01},rwrSym:'AJ',rwrName:'none',srDesc:'No air-to-air missiles',mrDesc:'No radar missiles',cmDesc:'none'});
// G.91Y: 2× J85-GE-13A (36 kN AB), 18.1 m² wing, 2× DEFA 552 (250 rds), bombs and rockets
dv('F104G','G91Y','G.91Y','Yankee',{corner:340,
  S:18.1,MASS:5600,CLMAX:1.3,KIND:.12,T_AB:36200,T_MIL:24400,ram:.3,cdK:1.4,supK:.4,gmax:7.5,roll:5.0,vne:610,
  gunRate:40,gunRounds:250,muzzle:800,gunDmg:2,gunSnd:900,ammo:'30MM',
  fuelCap:2520,sfcDry:.95,sfcAB:2.0,fuelUnit:'KG',engines:2,refuel:null,irstR:0,irstMax:0,
  srName:'-',srFull:'none',mrName:'-',mrFull:'none',srN:0,mrN:0,sr:NOSR,mr:MRM.AIM7,
  radar:{modes:['RWS'],name:'None',range:1000},
  cm:cmo(0,0,0,false,null,'','none',[]),
  spec:'<span><b>+7.5 g</b></span><span><b>Mach 0.95</b></span><span>2× J85 <b>36 kN</b></span><span>2× DEFA · <b>250 rds</b></span><span>4× Mk 82 · rockets</span><span>No missiles</span>',
  snd:{f:34,roar:205,wh:.003,twin:1,howl:[180,.012]},seek:{flareP:.02,chaffP:.01},rwrSym:'G9',rwrName:'none',srDesc:'No air-to-air missiles',mrDesc:'No radar missiles',cmDesc:'none'});
// Jaguar GR.1: 2× Adour Mk 102 (65 kN AB), 24.2 m² wing, 2× ADEN (300 rds), AIM-9G, bombs
dv('F104G','JAGUAR','Jaguar GR.1','Jaguar',{corner:380,
  S:24.2,MASS:9800,CLMAX:1.35,KIND:.13,T_AB:65000,T_MIL:45600,ram:.35,cdK:.8,supK:.2,gmax:7.5,roll:5.0,vne:690,
  gunRate:40,gunRounds:300,muzzle:790,gunDmg:2,gunSnd:900,ammo:'30MM',
  fuelCap:3250,sfcDry:.8,sfcAB:1.9,fuelUnit:'KG',engines:2,refuel:'probe',irstR:0,irstMax:0,
  srName:'9G',srFull:'AIM-9G',mrName:'-',mrFull:'none',srN:2,mrN:0,sr:SRM.AIM9G,mr:MRM.AIM7,
  radar:{modes:['RWS'],name:'Laser ranger (no radar)',range:5000},
  cm:cmo(0,0,0,false,null,'','none',stn([['L','9G'],['R','9G']],[])),
  spec:'<span><b>+7.5 g</b></span><span><b>Mach 1.6</b></span><span>2× Adour <b>65 kN</b></span><span>2× ADEN · <b>300 rds</b></span><span>Mk 82 / 1,000 lb bombs</span><span>2× AIM-9G</span>',
  snd:{f:32,roar:215,wh:.004,twin:1,howl:[240,.014]},seek:{flareP:.02,chaffP:.01},rwrSym:'JG',rwrName:'none',srDesc:'AIM-9G Sidewinder (rear aspect)',mrDesc:'No radar missiles',cmDesc:'none'});
// Q-5A: Chinese MiG-19 derivative, 2× WP-6A (64 kN AB), 28 m² wing, 2× Type 23-2K (240 rds), bombs only
dv('MIG21','Q5A','Q-5A Fantan','Fantan',{corner:340,
  S:27.95,MASS:9000,CLMAX:1.2,KIND:.14,T_AB:64000,T_MIL:50000,ram:.35,cdK:1.25,supK:.2,gmax:7,roll:5.0,vne:680,
  gunRate:38,gunRounds:240,muzzle:715,gunDmg:1,gunSnd:1200,ammo:'23MM',
  fuelCap:2830,sfcDry:1.0,sfcAB:2.1,fuelUnit:'KG',engines:2,refuel:null,
  srName:'-',srFull:'none',mrName:'-',mrFull:'none',srN:0,mrN:0,sr:NOSR,mr:MRM.R3R,
  radar:{modes:['RWS'],name:'None',range:1000},
  cm:cmo(0,0,0,false,null,'','none',[]),
  spec:'<span><b>+7 g</b></span><span><b>Mach 1.3</b></span><span>2× WP-6A <b>64 kN</b></span><span>2× Type 23-2K · <b>240 rds</b></span><span>4× 250 kg bombs</span><span>No missiles</span>',
  snd:{f:32,roar:220,wh:.002,twin:1,howl:[140,.01]},seek:{flareP:.02,chaffP:.01},rwrSym:'Q5',rwrName:'none',srDesc:'No air-to-air missiles',mrDesc:'No radar missiles',cmDesc:'none'});
// AMX: Spey 807 (49 kN), 21 m² wing, M61A1 (400 rds), AIM-9L, bombs
dv('F104G','AMX','AMX','Ghibli',{corner:360,
  S:21,MASS:8400,CLMAX:1.35,KIND:.12,T_AB:49300,T_MIL:49100,ram:.3,cdK:1.8,supK:.4,gmax:7.5,roll:5.0,vne:640,
  gunRate:100,gunRounds:400,muzzle:1030,gunDmg:1,gunSnd:1800,ammo:'20MM',
  fuelCap:2570,sfcDry:.78,sfcAB:.78,fuelUnit:'KG',engines:1,refuel:'probe',irstR:0,irstMax:0,
  srName:'9L',srFull:'AIM-9L',mrName:'-',mrFull:'none',srN:2,mrN:0,sr:SRM.AIM9L,mr:MRM.AIM7,
  radar:{modes:['RWS'],name:'Pointer ranging radar',range:15000},
  cm:cmo(60,60,0,false,null,'','chaff/flare',stn([['L','9L'],['R','9L']],[])),
  spec:'<span><b>+7.5 g</b></span><span><b>Mach 0.9</b> (no afterburner)</span><span>Spey <b>49 kN</b></span><span>M61A1 · <b>400 rds</b></span><span>Mk 82 / Mk 84</span><span>2× AIM-9L</span>',
  snd:{f:28,roar:190,wh:.006,twin:0,howl:[280,.016]},seek:{flareP:.04,chaffP:.03},rwrSym:'AX',rwrName:'RWR (est.)',srDesc:'AIM-9L Sidewinder, all-aspect',mrDesc:'No radar missiles',cmDesc:'120 cartridges (est.)'});
// F-104S: J79-GE-19 (79.6 kN AB), AIM-9J and AIM-7E, M61A1 (750 rds); the Italian interceptor of the Starfighter
dv('F104G','F104S','F-104S Starfighter','Starfighter',{corner:430,
  gunRate:100,gunRounds:750,
  srName:'9J',srFull:'AIM-9J',srN:2,sr:SRM.AIM9P,mrName:'7E',mrFull:'AIM-7E',mrN:2,mr:MRM.AIM7E,
  radar:{modes:['RWS'],name:'NASARR R-21G',range:45000},
  cm:cmo(0,0,0,false,null,'','none',stn([['TIP L','9J'],['TIP R','9J']],[['L','7E'],['R','7E']])),
  spec:'<span><b>+7 g</b></span><span><b>Mach 2.2</b></span><span>J79 <b>79.6 kN</b></span><span>M61A1 · <b>750 rds</b></span><span>AIM-7E · AIM-9J</span><span>No countermeasures</span>',
  srDesc:'AIM-9J Sidewinder (rear aspect)',mrDesc:'AIM-7E Sparrow: semi-active, hold the lock to impact',cmDesc:'none'});
// Tornado IDS (Italy): RB199 (143 kN AB), 2× BK27 (360 rds), AIM-9L, Mk 82 / Mk 84; no air-intercept radar
dv('TORNADO3','TORNADOIT','Tornado IDS','Tornado',{corner:420,
  MASS:17500,gmax:7,T_AB:143000,T_MIL:81000,cdK:1.3,
  gunRate:56.7,gunRounds:360,
  srName:'9L',srFull:'AIM-9L',srN:2,sr:SRM.AIM9L,mrName:'-',mrFull:'none',mrN:0,mr:MRM.AIM7,
  radar:{modes:['RWS'],name:'Terrain-following radar',range:25000},
  cm:cmo(28,100,0,true,'ECM','Sky Shadow','BOZ-107',stn([['L','9L'],['R','9L']],[])),
  spec:'<span><b>+7 g</b> · variable sweep</span><span><b>Mach 2.2</b></span><span>2× RB199 <b>143 kN</b></span><span>2× BK27 · <b>360 rds</b></span><span>Mk 82 / Mk 84</span><span>2× AIM-9L</span>',
  srDesc:'AIM-9L Sidewinder, all-aspect',mrDesc:'No radar missiles',cmDesc:'128 cartridges (est.)'});
AC_DEFS.TORNADOIT.cut=AC_DEFS.TORNADO3.cut;
for(const id of ['A10A','SU25','A7E','A4E','SU22M3','ALPHAJET','G91Y','JAGUAR','Q5A','AMX','F104S','TORNADOIT']){delete AC_DEFS[id].model}
for(const id of ['A10A','A7E','A4E','ALPHAJET','G91Y','JAGUAR','AMX','F104S'])AC_DEFS[id].cut=AC_DEFS.F104G.cut;
for(const id of ['SU25','SU22M3','Q5A'])AC_DEFS[id].cut=AC_DEFS.MIG21.cut;
// A-10A: 16.3 m, 17.5 m span, thick straight wing, twin engines on the rear fuselage, twin endplate fins on a high tailplane
M2.A10A={L:16.3,nz:5.2,radome:null,
  fus:[[-8.0,.3,.3,.3,.4,2],[-6.5,.55,.5,.4,.3,2.3],[-4,.62,.6,.5,.2,2.5],[-1,.72,.7,.6,0,2.6],[2,.7,.7,.62,0,2.6],[4.5,.65,.62,.55,-.05,2.4],[6.5,.5,.48,.45,-.05,2.2],[7.6,.35,.32,.3,-.05,2.1],[8.15,0,0,0,-.05,2]],
  parts:[{x:1.55,mouth:1,st:[[-7.6,.42,.42,.42,.95,2.3],[-4.5,.58,.6,.58,.95,2.6],[-1.5,.6,.6,.6,.95,2.8],[-.6,.55,.55,.55,.95,5]]}],
  wings:[{st:[{x:.8,zle:2.2,zte:-2.6,y:-.4,t:.1},{x:3.8,zle:1.9,zte:-2.4,y:-.35,t:.08},{x:8.76,zle:1.1,zte:-1.7,y:-.15,t:.05}]},{st:[{x:.7,zle:-6.2,zte:-8.0,y:.95,t:.05},{x:3.8,zle:-6.5,zte:-8.1,y:.95,t:.04}]}],
  fins:[{x:3.7,y:.95,mirror:1,st:[{h:0,zle:-6.4,zte:-8.0,t:.05},{h:1.9,zle:-7.0,zte:-8.2,t:.04}]}],
  canopy:[4.3,.82,.45,.42,1.9],frame:-1,noz:[[1.55,.95,-7.4,.4,.9],[-1.55,.95,-7.4,.4,.9]],
  r9:mir([[5.0,-.75,.4,-.35]]),r120:[]};
// Su-25: 15.5 m, 14.4 m span, wing-root intakes, drooped tips, tall fin with a tip fairing
M2.SU25={L:15.5,nz:4.9,radome:null,
  fus:[[-7.4,.35,.3,.3,.15,2.2],[-6,.55,.5,.4,.1,2.4],[-3.5,.65,.6,.5,.05,2.6],[-.5,.62,.6,.5,.05,2.6],[2.5,.55,.55,.45,.05,2.5],[4.5,.5,.48,.42,0,2.3],[6.2,.4,.38,.36,-.05,2.1],[7.3,.2,.2,.2,-.1,2],[7.76,0,0,0,-.1,2]],
  parts:[{x:1.0,mouth:1,st:[[-6.8,.4,.42,.42,.15,2.2],[-3,.5,.5,.5,.05,2.6],[0,.55,.52,.52,0,3],[2.4,.5,.5,.5,0,3.4],[3.0,.48,.5,.5,0,5]]}],
  wings:[{st:[{x:.9,zle:1.9,zte:-2.8,y:.2,t:.08},{x:4.2,zle:.7,zte:-2.6,y:.2,t:.06},{x:7.18,zle:-.4,zte:-2.0,y:.05,t:.04}]},{st:[{x:.5,zle:-5.2,zte:-7.0,y:.15,t:.03},{x:2.6,zle:-6.2,zte:-7.2,y:.15,t:.025}]}],
  fins:[{x:0,y:.5,st:[{h:0,zle:-3.4,zte:-7.0,t:.05},{h:2.6,zle:-6.2,zte:-7.6,t:.04}]}],
  canopy:[4.9,.72,.4,.38,1.5],frame:-1,noz:[[1.0,.15,-7.2,.4,.8],[-1.0,.15,-7.2,.4,.8]],
  r9:mir([[6.0,-.45,-1.0,-.05]]),r120:[]};
// A-7E Corsair II: 14.1 m, 11.8 m span, nose intake, shoulder wing, low tailplane
M2.A7E={L:14.1,nz:4.6,radome:null,
  fus:[[-6.9,.45,.4,.4,0,2.3],[-5.2,.62,.52,.5,0,2.5],[-2.5,.78,.62,.58,.05,2.7],[0,.8,.64,.6,.05,2.8],[2.5,.75,.6,.55,.05,2.6],[4.3,.7,.55,.52,0,2.4],[5.8,.62,.5,.5,0,2.3],[6.7,.5,.42,.42,0,2.1],[7.03,0,0,0,0,2]],
  parts:[{x:0,mouth:1,st:[[3.4,.6,.5,.5,0,3],[5.8,.62,.5,.5,0,3],[6.6,.6,.5,.5,0,5]]}],
  wings:[{st:[{x:.8,zle:1.9,zte:-2.4,y:.55,t:.05},{x:5.9,zle:-2.0,zte:-3.6,y:.35,t:.03}]},{st:[{x:.7,zle:-5.2,zte:-6.6,y:-.15,t:.03},{x:2.8,zle:-6.2,zte:-7.0,y:-.15,t:.025}]}],
  fins:[{x:0,y:.55,st:[{h:0,zle:-2.8,zte:-6.6,t:.05},{h:2.4,zle:-5.6,zte:-7.0,t:.04}]}],
  canopy:[2.6,.62,.4,.38,1.5],frame:-1,noz:[[0,0,-6.2,.5,.9]],
  r9:mir([[.95,-.3,2.0,null]]),r120:[]};
// A-4E Skyhawk: 12.3 m, 8.4 m span, small delta, cheek intakes, tall fin
M2.A4E={L:12.3,nz:3.6,radome:null,
  fus:[[-5.8,.3,.3,.3,0,2],[-4.5,.5,.45,.4,.05,2.3],[-2.5,.62,.52,.48,.05,2.5],[0,.64,.55,.5,.05,2.7],[2,.6,.52,.48,.05,2.6],[3.6,.5,.45,.4,0,2.4],[5,.35,.3,.3,0,2.2],[5.8,.15,.14,.14,0,2],[6.15,0,0,0,0,2]],
  parts:[{x:.7,mouth:1,st:[[-.8,.25,.3,.3,0,2.2],[.6,.3,.34,.34,0,3],[1.8,.3,.34,.34,0,3.4],[2.5,.28,.32,.32,0,5]]}],
  wings:[{st:[{x:.6,zle:2.2,zte:-3.6,y:-.05,t:.05},{x:4.19,zle:-.9,zte:-3.0,y:-.05,t:.03}]},{st:[{x:.5,zle:-4.6,zte:-5.8,y:.15,t:.03},{x:1.9,zle:-5.1,zte:-5.9,y:.15,t:.025}]}],
  fins:[{x:0,y:.5,st:[{h:0,zle:-2.4,zte:-5.6,t:.05},{h:2.2,zle:-4.6,zte:-6.1,t:.04}]}],
  canopy:[2.8,.5,.36,.34,1.4],frame:-1,noz:[[0,0,-5.7,.4,.8]],
  r9:mir([[2.2,-.45,.8,-.08]]),r120:[]};
// Su-22M3: 18.9 m, 10.0 m span swept, nose intake with shock cone, fixed glove, tall fin
M2.SU22M3={L:18.9,nz:5.8,radome:null,
  fus:[[-9.0,.5,.45,.45,0,2.3],[-7,.7,.6,.55,0,2.5],[-4,.8,.65,.6,0,2.7],[-1,.8,.65,.6,.05,2.8],[2,.75,.62,.58,.05,2.6],[4.5,.7,.58,.55,0,2.4],[6.8,.62,.5,.5,0,2.2],[8.3,.5,.4,.4,0,2.1],[9.1,.3,.25,.25,0,2],[9.45,0,0,0,0,2]],
  parts:[{x:0,mouth:1,st:[[4.0,.6,.52,.52,0,3],[7.0,.62,.5,.5,0,3],[8.0,.6,.48,.48,0,5]]}],
  wings:[{st:[{x:.8,zle:3.4,zte:-3.8,y:.25,t:.05},{x:1.9,zle:1.9,zte:-3.4,y:.25,t:.04}]},{st:[{x:1.9,zle:.8,zte:-3.2,y:.25,t:.04},{x:5.0,zle:-3.6,zte:-5.6,y:.25,t:.03}]},{st:[{x:.8,zle:-6.6,zte:-9.0,y:-.1,t:.03},{x:3.3,zle:-8.0,zte:-9.4,y:-.1,t:.025}]}],
  fins:[{x:0,y:.5,st:[{h:0,zle:-3.4,zte:-8.6,t:.05},{h:3.0,zle:-7.6,zte:-9.3,t:.04}]}],
  canopy:[3.8,.62,.4,.38,1.6],frame:-1,noz:[[0,0,-9.0,.7,1.0]],
  r9:mir([[1.5,-.2,-1.5,.15]]),r120:[]};
// Alpha Jet A: 12.0 m, 9.1 m span, tandem seats, cheek intakes, shoulder wing
M2.ALPHAJET={L:12.0,nz:3.8,radome:null,
  fus:[[-5.8,.3,.3,.3,.05,2.2],[-4.5,.5,.45,.4,.05,2.4],[-2.5,.62,.52,.45,.05,2.6],[0,.65,.55,.45,.1,2.7],[2.2,.58,.52,.42,.05,2.6],[3.8,.45,.4,.36,0,2.4],[5.0,.3,.28,.26,0,2.2],[5.7,.12,.1,.1,0,2],[6.0,0,0,0,0,2]],
  parts:[{x:.62,mouth:1,st:[[-1.5,.25,.3,.3,.1,2.2],[.5,.3,.34,.32,.1,3],[1.6,.3,.34,.32,.1,3.4],[2.2,.28,.32,.3,.1,5]]}],
  wings:[{st:[{x:.7,zle:.9,zte:-2.6,y:.45,t:.045},{x:4.55,zle:-1.2,zte:-2.9,y:.45,t:.03}]},{st:[{x:.5,zle:-4.4,zte:-5.6,y:.15,t:.03},{x:2.2,zle:-4.9,zte:-5.8,y:.15,t:.025}]}],
  fins:[{x:0,y:.45,st:[{h:0,zle:-2.6,zte:-5.6,t:.05},{h:2.2,zle:-4.6,zte:-6.0,t:.04}]}],
  canopy:[2.0,.58,.38,.36,2.2],frame:-1,noz:[[.4,.1,-5.5,.3,.7],[-.4,.1,-5.5,.3,.7]],
  r9:[],r120:[]};
// G.91Y: 11.7 m, 9.0 m span, swept wing, twin J85s, cheek intakes
M2.G91Y={L:11.4,nz:3.4,radome:null,
  fus:[[-5.4,.25,.25,.25,0,2.2],[-4.2,.45,.42,.4,0,2.4],[-2.2,.55,.5,.45,.05,2.6],[0,.58,.52,.48,.05,2.7],[2,.5,.48,.44,.05,2.6],[3.6,.4,.4,.38,0,2.4],[4.8,.28,.28,.26,0,2.2],[5.4,.12,.12,.12,0,2],[5.6,0,0,0,0,2]],
  parts:[{x:.6,mouth:1,st:[[-1.2,.22,.26,.26,.1,2.2],[.4,.26,.3,.3,.1,3],[1.5,.26,.3,.3,.1,3.4],[2.0,.24,.28,.28,.1,5]]}],
  wings:[{st:[{x:.6,zle:1.5,zte:-2.2,y:.1,t:.04},{x:4.5,zle:-1.4,zte:-3.0,y:.1,t:.03}]},{st:[{x:.4,zle:-4.0,zte:-5.2,y:.55,t:.03},{x:2.0,zle:-4.6,zte:-5.4,y:.55,t:.025}]}],
  fins:[{x:0,y:.45,st:[{h:0,zle:-2.2,zte:-5.2,t:.05},{h:1.8,zle:-4.2,zte:-5.6,t:.04}]}],
  canopy:[2.0,.52,.36,.34,1.3],frame:-1,noz:[[.35,.1,-5.3,.28,.6],[-.35,.1,-5.3,.28,.6]],
  r9:[],r120:[]};
// Jaguar GR.1: 16.8 m, 8.7 m span, high anhedral wing, cheek intakes, long nose, low tailplane
M2.JAGUAR={L:16.8,nz:5.4,radome:null,
  fus:[[-8.0,.4,.4,.4,.1,2.2],[-6.2,.65,.55,.5,.1,2.4],[-3.5,.7,.62,.55,.1,2.6],[-.5,.7,.6,.55,.1,2.7],[2.2,.62,.55,.5,.05,2.6],[4.6,.5,.45,.4,0,2.4],[6.4,.42,.38,.36,-.1,2.2],[7.6,.3,.26,.25,-.2,2],[8.4,0,0,0,-.25,2]],
  parts:[{x:.75,mouth:1,st:[[-3.6,.35,.4,.4,.1,2.2],[-1,.4,.48,.45,.1,2.6],[1.2,.4,.5,.46,0,3.2],[2.4,.38,.48,.46,0,5]]}],
  wings:[{st:[{x:.8,zle:2.0,zte:-3.3,y:.55,t:.045},{x:4.35,zle:-1.6,zte:-3.6,y:.15,t:.03}]},{st:[{x:.7,zle:-6.4,zte:-8.2,y:-.1,t:.03},{x:2.6,zle:-7.2,zte:-8.4,y:-.5,t:.025}]}],
  fins:[{x:0,y:.6,st:[{h:0,zle:-3.6,zte:-8.2,t:.05},{h:2.5,zle:-7.0,zte:-8.6,t:.04}]}],
  canopy:[4.4,.68,.4,.38,1.7],frame:-1,noz:[[.45,.05,-8.0,.38,.8],[-.45,.05,-8.0,.38,.8]],
  r9:mir([[1.9,.85,-.4,null]]),r120:[]};
// Q-5A: 15.4 m, 9.7 m span, MiG-19 lineage with side intakes and a pointed nose
M2.Q5A={L:15.4,nz:4.8,radome:null,
  fus:[[-7.4,.4,.35,.35,0,2.2],[-6,.62,.5,.45,0,2.4],[-3,.72,.58,.55,0,2.6],[0,.7,.6,.55,.05,2.7],[3,.6,.55,.5,.05,2.5],[5,.5,.45,.42,0,2.3],[6.5,.3,.28,.28,0,2.1],[7.3,.12,.12,.12,0,2],[7.7,0,0,0,0,2]],
  parts:[{x:.72,mouth:1,st:[[-1,.3,.4,.4,.05,2.2],[.8,.34,.45,.45,.05,3],[2.6,.32,.42,.42,.05,3.4],[3.4,.3,.4,.4,.05,5]]}],
  wings:[{st:[{x:.75,zle:2.0,zte:-3.0,y:-.1,t:.04},{x:4.85,zle:-3.0,zte:-4.8,y:-.1,t:.03}]},{st:[{x:.6,zle:-5.6,zte:-7.0,y:.1,t:.03},{x:2.5,zle:-6.4,zte:-7.4,y:.1,t:.025}]}],
  fins:[{x:0,y:.5,st:[{h:0,zle:-3,zte:-6.6,t:.05},{h:2.4,zle:-5.8,zte:-7.4,t:.04}]}],
  canopy:[3.8,.55,.38,.36,1.4],frame:-1,noz:[[.38,0,-7.3,.38,.8],[-.38,0,-7.3,.38,.8]],
  r9:[],r120:[]};
// AMX: 13.2 m, 8.9 m span, cheek intakes, 27° wing, wingtip rails
M2.AMX={L:13.2,nz:4.2,radome:null,
  fus:[[-6.3,.38,.36,.36,.05,2.2],[-4.8,.55,.5,.45,.05,2.4],[-2.8,.62,.55,.5,.05,2.6],[-.5,.62,.56,.5,.05,2.7],[1.8,.56,.52,.46,.05,2.6],[3.6,.45,.45,.4,0,2.4],[5.0,.3,.32,.3,0,2.2],[6.0,.12,.14,.14,0,2],[6.6,0,0,0,0,2]],
  parts:[{x:.62,mouth:1,st:[[-1.8,.3,.34,.34,.08,2.2],[.2,.34,.4,.38,.08,3],[1.6,.34,.4,.38,.08,3.4],[2.3,.32,.38,.36,.08,5]]}],
  wings:[{st:[{x:.7,zle:1.4,zte:-2.8,y:.25,t:.045},{x:4.43,zle:-.5,zte:-2.4,y:.1,t:.03}]},{st:[{x:.5,zle:-4.8,zte:-6.0,y:.1,t:.03},{x:2.3,zle:-5.3,zte:-6.2,y:.1,t:.025}]}],
  fins:[{x:0,y:.5,st:[{h:0,zle:-2.8,zte:-6.0,t:.05},{h:2.4,zle:-5.0,zte:-6.5,t:.04}]}],
  canopy:[2.6,.55,.36,.34,1.5],frame:-1,noz:[[0,.05,-6.0,.42,.7]],
  r9:mir([[4.5,.1,-1.2,null]]),r120:[]};
m2Alias('F104S','F104G',{r9:mir([[3.45,-.12,-.35,null]]),r120:mir([[2.0,-.45,-.3,-.05]])});
m2Alias('TORNADOIT','TORNADO3',{wings:[{st:[{x:1.1,zle:1.0,zte:-3.2,y:.2,t:.04},{x:4.3,zle:-3.1,zte:-5.2,y:.2,t:.03}]},M2.TORNADO3.wings[1]],r9:mir([[2.4,-.4,-.4,.2]]),r120:[]});
for(const id of ['A10A','SU25','A7E','A4E','SU22M3','ALPHAJET','G91Y','JAGUAR','Q5A','AMX','F104S','TORNADOIT'])m2Fit(id);
Object.assign(M2K,{TORNADOIT:[1,1,.88]});
ROSTER_IDS.push('A10A','SU25','A7E','A4E','SU22M3','ALPHAJET','G91Y','JAGUAR','Q5A','AMX','F104S','TORNADOIT');
Object.assign(ROSTER_LIKE,{A10A:'F104G',A7E:'F104G',A4E:'F104G',ALPHAJET:'F104G',G91Y:'F104G',JAGUAR:'F104G',AMX:'F104G',F104S:'F104G',SU25:'MIG21',SU22M3:'MIG21',Q5A:'MIG21',TORNADOIT:'TORNADO3'});
Object.assign(PITS,{A10A:'TEEN',A7E:'TEEN',A4E:'TEEN',ALPHAJET:'TEEN',G91Y:'TEEN',JAGUAR:'TEEN',AMX:'TEEN',F104S:'TEEN',SU25:'RUS',SU22M3:'RUS',Q5A:'RUS',TORNADOIT:'3MFD'});
Object.assign(PAINT,{
  A10A:{p:1,c:['#5f6a55','#4d5a4a','#717a6c'],b:'#8c928c',nat:'usaf',num:'AF 78-0583',lowvis:1},
  A7E:{p:1,c:['#8a929a','#707a84','#9aa2a9'],nat:'usn',num:'AB 301',nose:'301'},
  A4E:{p:1,c:['#8a929a','#707a84','#9aa2a9'],nat:'usn',num:'NM 402',nose:'402'},
  SU25:{p:2,c:['#6b7a55','#8a8c6a','#7a8a99'],b:'#b0b5ba',nat:'rus',num:'25',nose:'25'},
  SU22M3:{p:2,c:['#7a8663','#8e9475','#7d8c99'],b:'#b0b5ba',nat:'rus',num:'22',nose:'22'},
  ALPHAJET:{p:2,c:['#6a7260','#58625a','#7d857c'],b:'#aab0b5',nat:'ger',num:'40+85'},
  G91Y:{p:2,c:['#7a8563','#8f9576','#7d8c99'],b:'#b0b5ba',nat:'ita',num:'MM6911'},
  JAGUAR:{p:2,c:['#5f6a4f','#7a8068','#8a9298'],b:'#aab0b5',nat:'raf',num:'XX110'},
  Q5A:{p:2,c:['#7d8a78','#98a08c','#7f95a8'],b:'#b4b9be',nat:'prc',num:'41101'},
  AMX:{p:1,c:['#8c949b','#737b83','#9aa2a8'],nat:'ita',num:'MM7123',lowvis:1},
  F104S:{p:2,c:['#a1a7ac','#8b9298','#b0b5ba'],b:'#bcc2c8',nat:'ita',num:'MM6928'},
  TORNADOIT:{p:1,c:['#8a9096','#7a8188','#979ea4'],nat:'ita',num:'MM7002',lowvis:1}});

/* size corrections measured against public length and span (tools/real-dims.json); [across, up, along] */
Object.assign(M2K,{MIG21F13:[1,1,.955],MIRAGE3C:[1,1,.96],SU57:[1.156,1.03,.93],TORNADO3:[1,1,.88],J7G:[1.165,1,1],FA18C:[.94,.97,.928],J10C:[1,1,1.073],MIG21:[1,1,1.065],F22A:[1,1,.955],F16:[1.03,1,.975],F16B70:[1.03,1,.975],F16BARAK:[1.03,1,.975],F16I:[1.03,1,.975],FA18E:[1.04,1,1],MIG35:[1.056,1,.978],SU27:[1.035,1,.99],SU35:[1.08,1,.99],SU30SM:[1.035,1,.99],J11B:[1.035,1,.99],J16:[1.035,1,.99],J15:[1.035,1,.957],SU33:[1.035,1,.957],PHANTOM2:[1,1,.917]});
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

/* ---------------- particles ---------------- */
const PMAX=4200;
const pPos=new Float32Array(PMAX*3),pCol=new Float32Array(PMAX*4),pSize=new Float32Array(PMAX);
const pVel=new Float32Array(PMAX*3),pLife=new Float32Array(PMAX),pMaxL=new Float32Array(PMAX),pGrow=new Float32Array(PMAX),pA=new Float32Array(PMAX);
let pNext=0; const pGK=new Float32Array(PMAX);   // per-particle gravity factor: 1 falls like a stone, negative rises (hot smoke)
const pGeo=new THREE.BufferGeometry();
pGeo.setAttribute('position',new THREE.BufferAttribute(pPos,3).setUsage(THREE.DynamicDrawUsage));
pGeo.setAttribute('pcol',new THREE.BufferAttribute(pCol,4).setUsage(THREE.DynamicDrawUsage));
pGeo.setAttribute('psize',new THREE.BufferAttribute(pSize,1).setUsage(THREE.DynamicDrawUsage));
const pAdd=new Float32Array(PMAX); pGeo.setAttribute('padd',new THREE.BufferAttribute(pAdd,1).setUsage(THREE.DynamicDrawUsage));
/* premultiplied alpha: smoke blends normally, fire and flares add light; both fade into the fog */
const pMat=new THREE.ShaderMaterial({transparent:true,depthWrite:false,blending:THREE.CustomBlending,blendSrc:THREE.OneFactor,blendDst:THREE.OneMinusSrcAlphaFactor,
  uniforms:{scale:{value:400},fogC:{value:new THREE.Color()},fogN:{value:4000},fogF:{value:19000}},
  vertexShader:'attribute float psize,padd;attribute vec4 pcol;uniform float scale,fogN,fogF;varying vec4 vC;varying float vA,vF;void main(){vC=pcol;vA=padd;vec4 mv=modelViewMatrix*vec4(position,1.);vF=smoothstep(fogN,fogF,-mv.z);gl_PointSize=psize*scale/max(1.,-mv.z);gl_Position=projectionMatrix*mv;}',
  fragmentShader:'uniform vec3 fogC;varying vec4 vC;varying float vA,vF;void main(){vec2 q=gl_PointCoord-.5;float r=length(q);if(r>.5)discard;'+
    'float a=vC.a*smoothstep(.5,.05,r)*(.88+.12*sin(atan(q.y,q.x)*5.+r*20.));vec3 c=mix(vC.rgb,fogC,vF*(1.-vA));a*=1.-vF*vA;'+
    'gl_FragColor=vec4(c*a*(1.-vA*.45),a*(1.-vA));}'});
const points=new THREE.Points(pGeo,pMat); points.frustumCulled=false; scene.add(points);
function puff(x,y,z,vx,vy,vz,r,g,b,a,size,grow,life,gk){
  const i=pNext; pGK[i]=gk||0; pNext=(pNext+1)%PMAX;
  pPos[i*3]=x;pPos[i*3+1]=y;pPos[i*3+2]=z; pVel[i*3]=vx;pVel[i*3+1]=vy;pVel[i*3+2]=vz;
  pCol[i*4]=r;pCol[i*4+1]=g;pCol[i*4+2]=b;pCol[i*4+3]=a; pA[i]=a;
  pSize[i]=size;pGrow[i]=grow;pLife[i]=life;pMaxL[i]=life;
  pAdd[i]=r>.94&&b<.8&&g<.97?1:0;   // fire, flames, flares and tracers glow
}
// contrails above ~8 km; wing vapor in hard pulls and a vapor cone near Mach 1 in humid low air
const ENG_OFF={F16:[[0,-8.2]],F16B70:[[0,-8.2]],GRIPEN:[[0,-6.6]],GRIPENE:[[0,-7.1]],MIG29:[[1.05,-8.9],[-1.05,-8.9]],MIG29UPG:[[1.05,-8.9],[-1.05,-8.9]],MIG35:[[1.05,-8.9],[-1.05,-8.9]],SU27:[[1.33,-11.3],[-1.33,-11.3]],SU35:[[1.33,-11.3],[-1.33,-11.3]]};
let fxTick=0; const engOff=t=>(AC_DEFS[t]&&AC_DEFS[t].fx&&AC_DEFS[t].fx.eng)||ENG_OFF[t]||[[0,-8]];
function jetFX(j,type,isPlayer){
  const fx=QUALS[quality].fx; if(!fx||!j.alive&&!isPlayer)return;
  if(!isPlayer&&j.pos.distanceTo(camera.position)>9000)return;
  const offs=engOff(type);
  if(j.pos.y>8000&&(isPlayer||fxTick%2===0)){const life=fx>1?6:3.5;
    for(const [x,z] of offs){_s1.copy(j.pos).addScaledVector(j.right,x).addScaledVector(j.fwd,z);
      puff(_s1.x,_s1.y,_s1.z,rand(-1,1),rand(-1,1),rand(-1,1),.97,.98,1,.42,2.2,6.5,life)}}
  if(j.pos.y<7000&&j.n>6){const span=AC_DEFS[type]&&AC_DEFS[type].fx?AC_DEFS[type].fx.vapor:type.startsWith('SU')?7.3:type.startsWith('MIG29')?5.6:type==='GRIPEN'?4.2:4.9;
    for(let i=0;i<(fx>1?3:1);i++){const x=rand(-span,span);_s1.copy(j.pos).addScaledVector(j.right,x).addScaledVector(j.up,.7).addScaledVector(j.fwd,rand(-2,1));
      puff(_s1.x,_s1.y,_s1.z,j.vel.x*.9,j.vel.y*.9,j.vel.z*.9,1,1,1,.32,1.6,5,.22)}}
  if(j.pos.y<6000&&j.mach>.96&&j.mach<1.03&&isPlayer){
    for(let i=0;i<(fx>1?5:2);i++){const a=Math.random()*Math.PI*2;_s1.copy(j.pos).addScaledVector(j.right,Math.cos(a)*2.4).addScaledVector(j.up,Math.sin(a)*2.4).addScaledVector(j.fwd,-1);
      puff(_s1.x,_s1.y,_s1.z,j.vel.x*.97,j.vel.y*.97,j.vel.z*.97,1,1,1,.3,2,6,.18)}}
}
// battle damage: hit jets trail smoke, badly hit ones burn
function dmgFX(j,type,isPlayer){
  if(!j.alive&&!isPlayer)return; if(!isPlayer&&j.pos.distanceTo(camera.position)>12000)return;
  const k=isPlayer?(P.alive?P.hp/100:1):j.hp/(j.maxHp||(j.kind==='bomber'?5:j.kind==='transport'?8:3)); if(k>=.99)return;
  const fire=isPlayer?(P.sys&&P.sys.eng.some(v=>v===1))||k<.35:k<.5, offs=engOff(type);
  if(Math.random()>(fire?.9:.55))return;
  const [x,z]=offs[Math.random()*offs.length|0]; _s1.copy(j.pos).addScaledVector(j.right,x).addScaledVector(j.fwd,z);
  const s=fire?rand(.08,.16):rand(.35,.5);
  puff(_s1.x,_s1.y,_s1.z,j.vel.x*.15+rand(-2,2),j.vel.y*.15+rand(-1,3),j.vel.z*.15+rand(-2,2),s,s,s,fire?.65:.42,fire?5:3.5,fire?16:10,fire?3.2:2.2);
  if(fire)puff(_s1.x,_s1.y,_s1.z,j.vel.x*.6,j.vel.y*.6,j.vel.z*.6,1,rand(.4,.6),.12,.9,rand(2.5,4),2,.18)}
function updateParticles(dt){
  const drag=Math.max(0,1-dt*1.6);
  for(let i=0;i<PMAX;i++){
    if(pLife[i]<=0){pSize[i]=0;continue}
    pLife[i]-=dt; if(pLife[i]<=0){pSize[i]=0;continue}
    pPos[i*3]+=pVel[i*3]*dt;pPos[i*3+1]+=pVel[i*3+1]*dt;pPos[i*3+2]+=pVel[i*3+2]*dt;
    pVel[i*3+1]-=G*pGK[i]*dt; pVel[i*3]*=drag;pVel[i*3+1]*=drag;pVel[i*3+2]*=drag;
    pSize[i]+=pGrow[i]*dt; pCol[i*4+3]=pA[i]*(pLife[i]/pMaxL[i]);
  }
  pGeo.attributes.position.needsUpdate=true;pGeo.attributes.pcol.needsUpdate=true;pGeo.attributes.psize.needsUpdate=true;pGeo.attributes.padd.needsUpdate=true;
}
/* shockwave rings: a few additive billboards that expand and fade */
const RINGS=[];{const rm=()=>new THREE.ShaderMaterial({transparent:true,depthWrite:false,blending:THREE.AdditiveBlending,uniforms:{a:{value:0},w:{value:.12}},
    vertexShader:'varying vec2 vU;void main(){vU=uv-.5;gl_Position=projectionMatrix*modelViewMatrix*vec4(position,1.);}',
    fragmentShader:'uniform float a,w;varying vec2 vU;void main(){float r=length(vU)*2.;float d=abs(r-.9);float s=smoothstep(w,0.,d)*a;gl_FragColor=vec4(vec3(1.,.82,.55)*s,s);}'});
  for(let i=0;i<6;i++){const m=new THREE.Mesh(new THREE.PlaneGeometry(2,2),rm());m.visible=false;m.frustumCulled=false;m.renderOrder=5;scene.add(m);RINGS.push({m,t:0,life:0,R:0})}}
function ring(p,R){const r=RINGS.find(o=>o.life<=0)||RINGS[0];r.m.position.copy(p);r.t=0;r.life=big_ring_life(R);r.R=R;r.m.visible=true}
const big_ring_life=R=>.55+R/900;
function updateRings(dt){for(const r of RINGS){if(r.life<=0)continue;r.t+=dt;const k=r.t/r.life;
  if(k>=1){r.life=0;r.m.visible=false;continue}
  const e=1-Math.pow(1-k,2.4);r.m.scale.setScalar(Math.max(1,r.R*e));r.m.material.uniforms.a.value=(1-k)*(1-k)*.8;r.m.material.uniforms.w.value=.05+.2*k;r.m.quaternion.copy(camera.quaternion)}}
/* engine heat shimmer: copy a small patch of the finished frame around the exhaust and redraw it with a wobbling refraction offset
   (a screen-space distortion without rendering the scene twice). Needs THREE.FramebufferTexture (r135+), so older builds skip it. */
const HEAT={ok:typeof THREE.FramebufferTexture==='function',S:256,k:0,tex:null,scene:null,cam:null,mat:null,quad:null,v2:null};
function heatInit(){
  HEAT.tex=new THREE.FramebufferTexture(HEAT.S,HEAT.S); HEAT.v2=new THREE.Vector2();
  HEAT.cam=new THREE.OrthographicCamera(0,1,1,0,-1,1); HEAT.scene=new THREE.Scene();
  HEAT.mat=new THREE.ShaderMaterial({depthTest:false,depthWrite:false,uniforms:{tex:{value:HEAT.tex},t:{value:0},k:{value:0},rad:{value:.3},dir:{value:new THREE.Vector2(0,1)}},
    vertexShader:'varying vec2 vU;void main(){vU=uv;gl_Position=projectionMatrix*modelViewMatrix*vec4(position,1.);}',
    fragmentShader:'uniform sampler2D tex;uniform float t,k,rad;uniform vec2 dir;varying vec2 vU;void main(){vec2 c=vU-.5;float al=dot(c,dir),pe=dot(c,vec2(-dir.y,dir.x));'+
      'float m=exp(-(al*al)/(rad*rad*1.7)-(pe*pe)/(rad*rad*.55))*k;'+   // elongated along the exhaust axis
      'vec2 q=vU*14.+vec2(-dir.y,dir.x)*0.;float a=sin(q.x*1.3+t*9.+sin(q.y*1.7-t*6.)*2.)+sin(q.y*2.1-t*11.+sin(q.x*1.1+t*5.)*2.);float b=sin(q.y*1.5+t*8.+sin(q.x*2.3+t*7.))+sin(q.x*2.2+t*10.);'+
      'vec2 o=vec2(a,b)*.0032*m;gl_FragColor=vec4(texture2D(tex,clamp(vU+o,.002,.998)).rgb,1.);}'});
  HEAT.quad=new THREE.Mesh(new THREE.PlaneGeometry(1,1),HEAT.mat); HEAT.quad.frustumCulled=false; HEAT.scene.add(HEAT.quad)}
function heatPass(){
  if(!HEAT.ok||!QUALS[quality].fx||!P.alive||P.onGround&&Math.hypot(P.vel.x,P.vel.z)<8)return;
  const thr=clamp((throttle-.35)/.65,0,1); HEAT.k+=((thr>0?.25+.75*thr:0)-HEAT.k)*.15; if(HEAT.k<.02)return;
  if(!HEAT.tex)heatInit();
  const off=engOff(AC.id)[0][1], a=_s1.copy(P.pos).addScaledVector(P.fwd,off-3), b=_s2.copy(P.pos).addScaledVector(P.fwd,off-45);
  const pa=proj(a), pb=proj(b); if(!pa.ok)return;
  const d=camera.position.distanceTo(a), ppm=(H*DPR/2)/Math.tan(camera.fov*Math.PI/360)/Math.max(d,5), S=HEAT.S;
  const rad=clamp(ppm*20,.04,.5*S)/S*2*.5;                                                     // shimmer radius as a fraction of the patch (patch = S px)
  if(ppm*20<14)return;                                                                        // too far away to see
  const cx=pa.x*DPR, cy=(H-pa.y)*DPR, bw=W*DPR, bh=H*DPR, x0=clamp(Math.round(cx-S/2),0,Math.max(0,bw-S)), y0=clamp(Math.round(cy-S/2),0,Math.max(0,bh-S));
  HEAT.v2.set(x0,y0); renderer.copyFramebufferToTexture(HEAT.tex,HEAT.v2);
  let dx=(pb.x-pa.x),dy=-(pb.y-pa.y),l=Math.hypot(dx,dy); if(l<2){dx=0;dy=1}else{dx/=l;dy/=l}
  const u=HEAT.mat.uniforms; u.t.value=clock; u.k.value=HEAT.k; u.rad.value=Math.min(.45,rad); u.dir.value.set(dx,dy);
  HEAT.cam.right=bw; HEAT.cam.top=bh; HEAT.cam.updateProjectionMatrix(); HEAT.quad.scale.set(S,S,1); HEAT.quad.position.set(x0+S/2,y0+S/2,0);
  renderer.render(HEAT.scene,HEAT.cam)}
function explode(p,big,noRec){
  if(!noRec&&typeof REC3!=='undefined')REC3.booms.push({t:clock,p:p.toArray(),big});
  boomLight.position.copy(p); boomLight.intensity=(big?4:2.2)*LK; boomLight.distance=big?2600:1500;
  const S=big?1:.55, rv=()=>new V3(rand(-1,1),rand(-1,1),rand(-1,1)).normalize();
  puff(p.x,p.y,p.z,0,0,0,1,.93,.7,1,(big?110:50),(big?260:110),.16);                                   // white-hot flash
  for(let i=0;i<(big?10:5);i++){const d=rv().multiplyScalar(rand(8,40)*S);puff(p.x,p.y,p.z,d.x,d.y+rand(8,25)*S,d.z,1,.72,.28,.5,rand(34,60)*S,rand(60,100)*S,rand(.7,1.2),-.15)}   // fireball core
  for(let i=0;i<(big?38:16);i++){const d=rv().multiplyScalar(rand(30,120)*S);puff(p.x,p.y,p.z,d.x,d.y+rand(0,25)*S,d.z,1,rand(.36,.55),.1,.62,rand(20,40)*S,rand(26,46)*S,rand(1,2.2),-.3)}   // orange fire
  for(let i=0;i<(big?44:18);i++){const d=rv().multiplyScalar(rand(60,230)*S);puff(p.x,p.y,p.z,d.x,d.y+rand(10,60)*S,d.z,1,rand(.75,.95),rand(.4,.6),1,rand(1.4,3)*S+.6,rand(0,2),rand(.5,1.7),.55)}   // embers
  for(let i=0;i<(big?22:9);i++){const d=rv().multiplyScalar(rand(40,150)*S),s=rand(.08,.16);puff(p.x,p.y,p.z,d.x,d.y+rand(10,50)*S,d.z,s,s*.95,s*.9,.95,rand(2,5)*S+1,0,rand(1.6,3.6),.7)}   // debris
  for(let i=0;i<(big?30:12);i++){const d=rv().multiplyScalar(rand(10,55)*S),s=rand(.1,.2);puff(p.x,p.y,p.z,d.x,d.y*.5+rand(6,16)*S,d.z,s,s,s,.5,rand(14,26)*S,rand(8,18)*S,rand(4.5,8)*(big?1:.7),-1.1)}   // black smoke column
  for(let i=0;i<(big?14:5);i++){const d=rv().multiplyScalar(rand(20,70)*S),s=rand(.32,.46);puff(p.x,p.y+rand(5,25)*S,p.z,d.x,d.y*.4+rand(10,20)*S,d.z,s,s,s*1.03,.32,rand(20,36)*S,rand(10,20)*S,rand(6,10)*(big?1:.7),-.8)}   // lighter smoke cap
  ring(p,big?330:150);
  const dist=p.distanceTo(camera.position), vol=clamp(1-dist/6000,0.05,1)*(big?1:.5), lag=Math.min(dist/340,12);   // you see it first, then hear it
  if(lag<.15||state==='replay')sndBoom(vol); else setTimeout(()=>{if(state==='play')sndBoom(vol)},lag*1000);
}

/* ---------------- pools ---------------- */
function makePool(n,geo,mat){const arr=[];for(let i=0;i<n;i++){const m=new THREE.Mesh(geo,mat);m.visible=false;m.frustumCulled=false;scene.add(m);arr.push({m,on:false,vel:new V3(),prev:new V3(),life:0,t:0,type:'',target:null,owner:null});}return arr}
function take(pool){for(const b of pool) if(!b.on) return b; return pool[0]}
function kill(b){b.on=false;b.m.visible=false}
const tracerGeo=new THREE.BoxGeometry(.3,.3,14);
const pBullets=makePool(240,tracerGeo,new THREE.MeshBasicMaterial({color:0xffe27a}));
const eBullets=makePool(160,tracerGeo,new THREE.MeshBasicMaterial({color:0xff6a4d}));
const mslGeo=new THREE.CylinderGeometry(.13,.13,3,6).rotateX(Math.PI/2);
const missiles=makePool(8,mslGeo,new THREE.MeshStandardMaterial({color:0xf2f2ee,flatShading:true}));


/* ---------- post-processing (Medium and High): HDR scene target, bloom, filmic highlight roll-off, grade and vignette ----------
   The scene is drawn into a half-float target so additive glows (sun, afterburners, explosions, flares) can exceed 1 and bloom; a few dual-Kawase mips
   build the glow and one composite pass adds it with a gentle S-curve, split-tone grade, a touch of edge fringing and a vignette. Needs WebGL2 and float targets;
   anything else (and Low quality) keeps the plain direct render. Tests skip it unless the page has &post. */
const POST={ok:false,fail:false,w:0,h:0,rt:null,mips:[],scene:null,cam:null,quad:null,on:true};
try{POST.on=localStorage.getItem('vsPost')!=='0'}catch(e){}
const POST_TEST=/[?&]test\b/.test(location.search)&&!/[?&]post\b/.test(location.search);
const postActive=()=>POST.on&&!POST_TEST&&!POST.fail&&QUALS[quality].fx>0;
function postInit(){
  if(POST.scene)return true;
  try{
    const ext=renderer.extensions;
    if(!renderer.capabilities.isWebGL2||!(ext.has('EXT_color_buffer_float')||ext.has('EXT_color_buffer_half_float'))){POST.fail=true;return false}
    POST.scene=new THREE.Scene();POST.cam=new THREE.OrthographicCamera(-1,1,1,-1,0,1);
    const tri=new THREE.BufferGeometry();tri.setAttribute('position',new THREE.Float32BufferAttribute([-1,-1,0,3,-1,0,-1,3,0],3));tri.setAttribute('uv',new THREE.Float32BufferAttribute([0,0,2,0,0,2],2));
    const VS='varying vec2 vUv;void main(){vUv=uv;gl_Position=vec4(position.xy,0.,1.);}';
    const mk=(fs,uniforms,extra)=>new THREE.ShaderMaterial(Object.assign({vertexShader:VS,fragmentShader:fs,uniforms,depthTest:false,depthWrite:false},extra||{}));
    const HEAD='uniform sampler2D tex;uniform vec2 px;varying vec2 vUv;vec3 s(vec2 o){return texture2D(tex,vUv+o*px).rgb;}';
    POST.mBright=mk(HEAD+'uniform float thr,knee;void main(){vec3 c=(s(vec2(-1.,-1.))+s(vec2(1.,-1.))+s(vec2(-1.,1.))+s(vec2(1.,1.)))*.25;float l=max(max(c.r,c.g),c.b);float q=clamp(l-thr+knee,0.,2.*knee);q=q*q/(4.*knee+1e-4);gl_FragColor=vec4(c*(max(q,l-thr)/max(l,1e-4)),1.);}',
      {tex:{value:null},px:{value:new THREE.Vector2()},thr:{value:.96},knee:{value:.3}});
    POST.mDown=mk(HEAD+'void main(){vec3 c=texture2D(tex,vUv).rgb*4.+s(vec2(-1.,-1.))+s(vec2(1.,-1.))+s(vec2(-1.,1.))+s(vec2(1.,1.));gl_FragColor=vec4(c/8.,1.);}',{tex:{value:null},px:{value:new THREE.Vector2()}});
    POST.mUp=mk(HEAD+'uniform float w;void main(){vec3 c=(s(vec2(-1.,-1.))+s(vec2(1.,-1.))+s(vec2(-1.,1.))+s(vec2(1.,1.))+s(vec2(0.,-1.5))+s(vec2(0.,1.5))+s(vec2(-1.5,0.))+s(vec2(1.5,0.)))*.125;gl_FragColor=vec4(c*w,1.);}',
      {tex:{value:null},px:{value:new THREE.Vector2()},w:{value:1}},{blending:THREE.AdditiveBlending,transparent:true});
    POST.mComp=mk('uniform sampler2D tex,bloom;uniform float bk,vig,sat;uniform vec2 px;varying vec2 vUv;'+
      'void main(){vec2 d=vUv-.5;float r2=dot(d,d);vec3 c=texture2D(tex,vUv).rgb;c.r=texture2D(tex,vUv+d*r2*.012).r;c.b=texture2D(tex,vUv-d*r2*.012).b;'+   // edge fringing
      'c+=texture2D(bloom,vUv).rgb*bk;'+
      'vec3 over=max(c-1.,0.);c=min(c,vec3(1.))+over/(1.+over);'+                                                                                          // highlight roll-off: hot cores keep a bright shoulder
      'c=clamp(c,0.,1.);c=mix(c,c*c*(3.-2.*c),.22);'+                                                                                                      // gentle S-curve
      'float l=dot(c,vec3(.299,.587,.114));c=mix(vec3(l),c,sat);c+=vec3(-.012,.004,.016)*(1.-l)+vec3(.016,.007,-.012)*l*l;'+                                  // split tone: cool shadows, warm highlights
      'c*=1.-vig*smoothstep(.28,.95,length(d)*1.55);gl_FragColor=vec4(c,1.);}',
      {tex:{value:null},bloom:{value:null},px:{value:new THREE.Vector2()},bk:{value:.4},vig:{value:.24},sat:{value:1.07}});
    POST.quad=new THREE.Mesh(tri,POST.mComp);POST.quad.frustumCulled=false;POST.scene.add(POST.quad);POST.ok=true;return true
  }catch(e){POST.fail=true;return false}}
function postSize(){
  const sz=renderer.getDrawingBufferSize(new THREE.Vector2()),w=Math.max(2,sz.x|0),h=Math.max(2,sz.y|0);
  if(POST.rt&&w===POST.w&&h===POST.h)return;
  POST.w=w;POST.h=h;if(POST.rt)POST.rt.dispose();POST.mips.forEach(m=>m.dispose());POST.mips=[];
  POST.rt=new THREE.WebGLRenderTarget(w,h,{type:THREE.HalfFloatType,samples:QUALS[quality].fx>1?4:2,depthBuffer:true,minFilter:THREE.LinearFilter,magFilter:THREE.LinearFilter});
  const n=QUALS[quality].fx>1?5:4;let mw=w>>1,mh=h>>1;
  for(let i=0;i<n;i++){POST.mips.push(new THREE.WebGLRenderTarget(Math.max(2,mw),Math.max(2,mh),{type:THREE.HalfFloatType,depthBuffer:false,minFilter:THREE.LinearFilter,magFilter:THREE.LinearFilter}));mw>>=1;mh>>=1}}
const postPass=(mat,src,dst)=>{mat.uniforms.tex.value=src.texture;if(mat.uniforms.px)mat.uniforms.px.value.set(1/src.width,1/src.height);POST.quad.material=mat;renderer.setRenderTarget(dst);renderer.render(POST.scene,POST.cam)};
// draw `scn` (and the cockpit when asked) through the pipeline to the screen; returns false when post is off so the caller renders directly
function postRender(scn,cam,cockpit){
  if(!postActive()||!postInit())return false;
  postSize();const R=renderer;
  R.setRenderTarget(POST.rt);R.clear();R.render(scn,cam);
  if(cockpit){R.clearDepth();R.render(cockScene,cockCam)}
  const M=POST.mips;postPass(POST.mBright,POST.rt,M[0]);
  for(let i=1;i<M.length;i++)postPass(POST.mDown,M[i-1],M[i]);
  for(let i=M.length-1;i>0;i--){POST.mUp.uniforms.w.value=i===1?1:.9;postPass(POST.mUp,M[i],M[i-1])}
  const u=POST.mComp.uniforms;u.bloom.value=M[0].texture;u.bk.value=state==='menu'||HG.on?.5:.34;
  POST.quad.material=POST.mComp;u.tex.value=POST.rt.texture;R.setRenderTarget(null);R.render(POST.scene,POST.cam);
  return true}
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

/* ---------------- flight model (shared by player and bandits) ---------------- */
const _f=new V3(),_u=new V3(),_r=new V3(),_vd=new V3(),qa=new THREE.Quaternion();
function newJet(obj,gLim,ac){return {ac:ac||AC_DEFS.F16,obj,pos:obj.position,vel:new V3(),n:1,gLim,qd:0,mach:0,kcas:0,fwd:new V3(0,0,1),up:new V3(0,1,0),right:new V3(-1,0,0)}}
function axes(j){const q=j.obj.quaternion;j.fwd.set(0,0,1).applyQuaternion(q);j.up.set(0,1,0).applyQuaternion(q);j.right.set(-1,0,0).applyQuaternion(q)}
function fly(j,dt,rollIn,pitchIn,yawIn,thr,brake){
  const q=j.obj.quaternion, A=j.ac; j.ci=[rollIn,pitchIn,yawIn||0,thr];
  j.obj.rotateZ(rollIn*A.roll*(j.rollK??1)*clamp(j.qd/9000,A.tvc?.45:.15,1)*dt);
  axes(j);
  if(yawIn){qa.setFromAxisAngle(j.up,-yawIn*.12*dt);q.premultiply(qa);j.vel.applyQuaternion(qa);axes(j)}
  const at=atm(j.pos.y); let v=j.vel.length();
  if(v<5){j.vel.copy(j.fwd).multiplyScalar(5);v=5}
  const qd=.5*at.rho*v*v; j.qd=qd; j.mach=v/at.a; j.kcas=v*Math.sqrt(at.sig)*1.944;
  const MS=j.mass||A.MASS; const nAero=qd*A.S*A.CLMAX/(MS*G); j.nAero=nAero;
  // thrust vectoring (MiG-35 option): the nozzles keep pulling the nose round below ~260 kt, past what the wing alone gives
  const tv=A.tvc&&thr>.3?1+.7*clamp((260-j.kcas)/120,0,1):1;
  const nHi=Math.min(j.gLim,nAero*tv), nLo=Math.max(G_MIN,-nAero*.55*tv);
  const nCmd=pitchIn>=0?1+pitchIn*(j.gLim-1):1+pitchIn*(1-G_MIN);
  j.n+=(clamp(nCmd,nLo,nHi)-j.n)*Math.min(1,dt*7);   // FLCS g-onset
  j.n=clamp(j.n,nLo,nHi);
  const CL=j.n*MS*G/(qd*A.S+1);
  j.alpha=clamp(26*CL/A.CLMAX,-20,45);   // degrees: linear lift curve reaching CLmax at ~26 deg (the F-16 FLCS limits alpha to about 25)
  const over=A.vne?Math.max(0,j.kcas-A.vne)/50:0;   // past the low-level airspeed limit drag climbs steeply
  const D=qd*A.S*(cd0(j.mach,A)*A.cdK*(1+over*over*4)+A.KIND*CL*CL*(CL>A.CLMAX?1+(CL-A.CLMAX)*1.5:1)+(brake?.06:0)+(j.xcd||0));
  const T=thrust(A,thr,at.sig,j.mach,j.pos.y)*(j.thrK??1); j.lastT=T;
  _f.copy(j.fwd).multiplyScalar((T-D)/MS).addScaledVector(j.up,j.n*G); _f.y-=G;
  j.vel.addScaledVector(_f,dt); j.pos.addScaledVector(j.vel,dt); j.pos.addScaledVector(WIND,gust*dt);
  if(j===P&&turbK>0){const agl=j.pos.y-Math.max(groundH(j.pos.x,j.pos.z),0), nearDeck=ovc()&&Math.abs(j.pos.y-DECK_Y)<500?.6:0,
      k=turbK*(clamp(1-(agl-1500)/3500,.25,1)+nearDeck)*clamp(v/120,.3,1.2), t=clock;
    const bp=Math.sin(t*2.7)*.6+Math.sin(t*4.9+1.3)*.3+Math.sin(t*9.1+.7)*.15, br=Math.sin(t*3.3+2.1)*.6+Math.sin(t*6.1+.4)*.3+Math.sin(t*11.3)*.12;
    j.obj.rotateX(bp*.035*k*dt*6); j.obj.rotateZ(br*.05*k*dt*6); axes(j); j.vel.y+=bp*k*2.2*dt*6*.4}
  _vd.copy(j.vel).normalize(); qa.setFromUnitVectors(j.fwd,_vd); q.premultiply(qa); q.normalize();
  axes(j);
}
const bankOf=j=>Math.atan2(-j.right.y,j.up.y);

/* ---------------- time of day and weather ---------------- */
const TIMES={DAY:'day',DUSK:'dusk',NIGHT:'night'}, WXS={CLEAR:'clear',SCATTERED:'scattered clouds',OVERCAST:'overcast',RAIN:'rain and wind'};
var timeOfDay='DAY', weather='SCATTERED';   /* var: read by applyCloudCount before this line runs */ try{if(TIMES[localStorage.getItem('vsTime')])timeOfDay=localStorage.getItem('vsTime');if(WXS[localStorage.getItem('vsWx')])weather=localStorage.getItem('vsWx')}catch(e){}
const DECK_Y=3300;
const deck=new THREE.Mesh(new THREE.PlaneGeometry(70000,70000).rotateX(-Math.PI/2),new THREE.MeshLambertMaterial({color:0xd4d9de,transparent:true,opacity:.97,side:THREE.DoubleSide,depthWrite:true}));
deck.position.y=DECK_Y; deck.visible=false; deck.frustumCulled=false; scene.add(deck);
const stars=(()=>{const n=1500,a=new Float32Array(n*3);for(let i=0;i<n;i++){const u=Math.random(),v=Math.random()*.95+.05,th=u*Math.PI*2,ph=Math.acos(1-v);a[i*3]=Math.sin(ph)*Math.cos(th)*28000;a[i*3+1]=Math.cos(ph)*28000;a[i*3+2]=Math.sin(ph)*Math.sin(th)*28000}
  const g=new THREE.BufferGeometry();g.setAttribute('position',new THREE.BufferAttribute(a,3));const p=new THREE.Points(g,new THREE.PointsMaterial({color:0xffffff,size:2,sizeAttenuation:false,fog:false,transparent:true,opacity:.85}));p.visible=false;p.frustumCulled=false;scene.add(p);return p})();
/* image-based lighting: the sky is rendered into a blurred environment map so metal, canopies and paint pick up sky reflections */
const pmrem=new THREE.PMREMGenerator(renderer), envScene=new THREE.Scene(); envScene.add(new THREE.Mesh(new THREE.SphereGeometry(10,32,16),sky.material)); let envRT=null;
function updateEnvMap(){try{const rt=pmrem.fromScene(envScene,.03);if(envRT)envRT.dispose();envRT=rt;scene.environment=rt.texture;cockScene.environment=rt.texture}catch(e){}}
const glare=new THREE.Sprite(new THREE.SpriteMaterial({map:GLOW_TEX,blending:THREE.AdditiveBlending,depthWrite:false,fog:false,transparent:true,opacity:.5}));
glare.scale.setScalar(9000); glare.renderOrder=0; scene.add(glare);
const jetShadow=new THREE.Mesh(new THREE.PlaneGeometry(1,1).rotateX(-Math.PI/2),new THREE.MeshBasicMaterial({map:radTex([[0,'rgba(0,0,0,.95)'],[.45,'rgba(0,0,0,.7)'],[1,'rgba(0,0,0,0)']]),transparent:true,depthWrite:false,polygonOffset:true,polygonOffsetFactor:-4,opacity:.5}));
jetShadow.renderOrder=1; jetShadow.visible=false; scene.add(jetShadow);
function updateShadow(){
  const gh=Math.max(groundH(P.pos.x,P.pos.z),0), agl=P.pos.y-gh, k=timeOfDay==='NIGHT'||ovc()?.25:1;
  if(!P.alive||agl>700||SUN_DIR.y<.05){jetShadow.visible=false;return}
  const off=Math.min(agl/SUN_DIR.y,3000); const x=P.pos.x-SUN_DIR.x*off, z=P.pos.z-SUN_DIR.z*off;
  jetShadow.visible=true; jetShadow.position.set(x,(onRunway(x,z)?BASE_Y+.2:Math.max(groundH(x,z),0))+.4,z);
  const L=AC.fx?AC.fx.shadow[0]:AC.id.startsWith('SU')?22:AC.id.startsWith('MIG')?17:15, Sp=AC.fx?AC.fx.shadow[1]:AC.id.startsWith('SU')?15:AC.id.startsWith('MIG')?11.4:AC.id.startsWith('GRIPEN')?8.6:9.9, gr=1+agl/250;
  jetShadow.scale.set(Sp*1.1*gr,1,L*1.05*gr); jetShadow.rotation.y=Math.atan2(P.fwd.x,P.fwd.z); jetShadow.material.opacity=.55*k*(1-agl/700)/gr}
const boomLight=new THREE.PointLight(0xffa050,0,2200,2); scene.add(boomLight);
/* rain: streaks in a box around the camera, slanted by your own speed */
const RAIN_N=900, rainPos=new Float32Array(RAIN_N*6), rainOff=new Float32Array(RAIN_N*3);
for(let i=0;i<RAIN_N;i++){rainOff[i*3]=rand(-45,45);rainOff[i*3+1]=rand(-30,30);rainOff[i*3+2]=rand(-45,45)}
const rainGeo=new THREE.BufferGeometry(); rainGeo.setAttribute('position',new THREE.BufferAttribute(rainPos,3).setUsage(THREE.DynamicDrawUsage));
const rain=new THREE.LineSegments(rainGeo,new THREE.LineBasicMaterial({color:0xc8d2dc,transparent:true,opacity:.35,depthWrite:false}));
rain.frustumCulled=false; rain.visible=false; scene.add(rain);
/* thunderstorms: in rain, bolts flash the whole scene in a short stutter, and the thunder arrives after distance / 340 s */
const flashLt=new THREE.AmbientLight(0xdfe8ff,0); scene.add(flashLt);
const LT={next:7,seq:[],t:0,force:false};
function updateLightning(dt){
  if(weather!=='RAIN'||!(state==='play'||state==='menu')){flashLt.intensity=0;LT.seq.length=0;return}
  LT.next-=dt; if(LT.force||LT.next<=0){LT.force=false;LT.next=rand(6,16);LT.t=0;
    LT.seq=[[0,.07,1],[.07,.13,0],[.13,.3,.7],[.3,.38,0],[.38,.46,.5]];                 // [from, to, strength] seconds
    const dist=rand(1500,9000);setTimeout(()=>{if(state==='play')sndBoom(clamp(1-dist/11000,.12,.55))},dist/340*1000)}
  let f=0;if(LT.seq.length){LT.t+=dt;for(const [a,b,s] of LT.seq)if(LT.t>=a&&LT.t<b)f=s;if(LT.t>LT.seq[LT.seq.length-1][1])LT.seq.length=0}
  flashLt.intensity=f*1.7*LK;
}
function updateRain(dt){
  const sn=MAP==='ALPINE'; rain.material.color.setHex(sn?0xffffff:0xc8d2dc); rain.material.opacity=sn?.8:.35;
  const on=(weather==='RAIN'||(sn&&weather==='OVERCAST'))&&camera.position.y<DECK_Y&&(state==='play'||state==='menu'||state==='paused'||state==='replay'); rain.visible=on; if(!on)return;
  const vx=-P.vel.x+WIND.x, vy=(sn?-2.2:-9)-P.vel.y, vz=-P.vel.z+WIND.z, sp=Math.hypot(vx,vy,vz)||1, L=sn?Math.min(2.2,.2+sp*.007):Math.min(14,1.5+sp*.035), c=camera.position;
  for(let i=0;i<RAIN_N;i++){let x=rainOff[i*3]+vx*dt,y=rainOff[i*3+1]+vy*dt,z=rainOff[i*3+2]+vz*dt;
    x=((x+45)%90+90)%90-45; y=((y+30)%60+60)%60-30; z=((z+45)%90+90)%90-45; rainOff[i*3]=x;rainOff[i*3+1]=y;rainOff[i*3+2]=z;
    const j=i*6; rainPos[j]=c.x+x;rainPos[j+1]=c.y+y;rainPos[j+2]=c.z+z; rainPos[j+3]=c.x+x-vx/sp*L;rainPos[j+4]=c.y+y-vy/sp*L;rainPos[j+5]=c.z+z-vz/sp*L}
  rainGeo.attributes.position.needsUpdate=true}
function applyEnv(){
  const E={DAY:{top:0x2558a8,hor:0xc9dce8,bot:0x8fa6b0,sun:[-.5,.62,.6],sc:0xfff0d8,si:1.1,hi:.9,cl:1,glow:0xfff1d6,deep:0x15475f,ct:[1,1,1],glare:.5},
           DUSK:{top:0x22305a,hor:0xd9946e,bot:0x5d5054,sun:[-.9,.09,.42],sc:0xffa860,si:.9,hi:.5,cl:.9,glow:0xff7a30,deep:0x1d2a38,ct:[1,.86,.76],glare:.85},
           NIGHT:{top:0x02050c,hor:0x0c1626,bot:0x05080c,sun:[.4,.55,-.7],sc:0x9fb4d8,si:.18,hi:.16,cl:.28,glow:0x1a2a48,deep:0x03070d,ct:[.85,.9,1],glare:.12}}[timeOfDay];
  const u=sky.material.uniforms; u.top.value.setHex(E.top); u.hor.value.setHex(E.hor); u.bot.value.setHex(E.bot); u.glow.value.setHex(E.glow); u.disk.value=timeOfDay==='NIGHT'?.35:1;
  SUN_DIR.set(...E.sun).normalize(); sun.position.copy(SUN_DIR); sun.color.setHex(E.sc);
  const oc=ovc();
  sun.intensity=E.si*LK*(oc?.55:1)*(weather==='RAIN'?.75:1); hemi.intensity=E.hi*LK*(oc?.8:1)*(weather==='RAIN'?.85:1);
  {const sp={CLEAR:3,SCATTERED:7,OVERCAST:11,RAIN:15}[weather]||7,a=Math.random()*Math.PI*2;WIND.set(Math.sin(a)*sp,0,Math.cos(a)*sp);turbK={CLEAR:.12,SCATTERED:.3,OVERCAST:.55,RAIN:.9}[weather]||.3}
  rain.visible=false;
  scene.background=new THREE.Color(E.hor); scene.fog.color.setHex(E.hor); scene.fog.far=weather==='RAIN'?9000:oc?14000:16800; scene.fog.near=weather==='RAIN'?900:oc?2500:4000;
  cloudMats.forEach(m=>m.color.setRGB(E.cl*E.ct[0],E.cl*E.ct[1],E.cl*E.ct[2]));
  deck.material.color.setScalar(.84*E.cl); deck.visible=oc;
  stars.visible=timeOfDay==='NIGHT'&&!oc;
  const wu=waterMat.uniforms; wu.sunDir.value.copy(SUN_DIR); wu.sunCol.value.setHex(E.sc); wu.deep.value.setHex(E.deep); wu.skyc.value.setHex(E.hor); wu.skyt.value.setHex(E.top); wu.shine.value=oc?.15:timeOfDay==='NIGHT'?.35:1;
  glare.material.opacity=oc?0:E.glare; glare.material.color.setHex(E.sc);
  updateEnvMap();
  if(weather==='RAIN')scene.background.multiplyScalar(.82),scene.fog.color.multiplyScalar(.82),sky.material.uniforms.hor.value.multiplyScalar(.82),sky.material.uniforms.top.value.lerp(sky.material.uniforms.hor.value,.6);
  townLights.visible=timeOfDay!=='DAY'; townLights.material.opacity=timeOfDay==='NIGHT'?(oc?.45:.95):.35;
  if(rwyLights){rwyLights.material.opacity=timeOfDay==='NIGHT'?1:timeOfDay==='DUSK'?.8:.45;rwyLights.material.size=timeOfDay==='NIGHT'?3.2:2.2}
  if(MAP==='DESERT'){const dc=new THREE.Color(timeOfDay==='NIGHT'?0x1a1612:0xd8c39b);scene.fog.color.lerp(dc,.45);scene.background.copy(scene.fog.color);sky.material.uniforms.hor.value.lerp(dc,.4);scene.fog.far*=.78;scene.fog.near*=.6;updateEnvMap()}
  if(MAP==='OCEAN'){WIND.multiplyScalar(1.6);turbK+=.1}
  if(typeof TERR_U!=='undefined')TERR_U.mapId.value=MAP_ID[MAP]||0;
  applyCloudCount();
  if(typeof syncSensors==='function')syncSensors();
  $('bTime').textContent='Time: '+TIMES[timeOfDay]; $('bWx').textContent='Weather: '+(MAP==='ALPINE'&&(weather==='RAIN'||weather==='OVERCAST')?(weather==='RAIN'?'blizzard':'snow'):WXS[weather]); $('bMap').textContent='Map: '+MAPS[MAP];
}
// heat-seekers can't see through cloud, and one looking near the sun can lock onto it instead
function irBlocked(a,b){
  if(ovc()&&(a.y-DECK_Y)*(b.y-DECK_Y)<0)return true;
  if(weather==='SCATTERED')for(const cl of clouds){if(!cl.visible)continue;if(Math.abs(cl.position.y-(a.y+b.y)/2)>2500)continue;if(distSeg(cl.position,a,b)<360)return true}
  return false;
}
// early heat seekers (AIM-9B/P, Falcon, Red Top) only see a hot tailpipe: they need the target moving away from the shooter
const rearOK=(from,tg,k)=>{if(!tg||!tg.fwd)return true;_s1.subVectors(from,tg.pos).normalize();return tg.fwd.dot(_s1)<(k==null?-.45:k)};
function irEnv(m,tg,dt){   // returns a miss reason or ''
  m.envT=(m.envT||0)-dt; if(m.envT>0)return ''; m.envT=.25;
  {const sp=m.spec||SPEC[m.type];if(sp&&sp.rear&&!rearOK(m.m.position,tg,.2))return 'REAR-ASPECT SEEKER: TARGET TURNED HEAD-ON'}
  if(irBlocked(m.m.position,tg.pos))return 'LOST THE TARGET IN CLOUD';
  if(weather==='RAIN'&&m.m.position.distanceTo(tg.pos)>3500&&Math.random()<.12)return 'LOST THE TARGET IN RAIN';
  if(timeOfDay!=='NIGHT'&&weather!=='OVERCAST'){_s1.subVectors(tg.pos,m.m.position).normalize(); if(_s1.angleTo(SUN_DIR)<.14&&Math.random()<.35)return 'SEEKER LOCKED ONTO THE SUN'}
  return '';
}
$('bVoice').textContent='Voice warnings: '+(VOICE.on?'on':'off');
$('bVoice').addEventListener('click',()=>{VOICE.on=!VOICE.on;try{localStorage.setItem('vsVoice',VOICE.on?'1':'0')}catch(e){};$('bVoice').textContent='Voice warnings: '+(VOICE.on?'on':'off');if(VOICE.on){pickVoices();say('lock',0)}});
$('bTime').addEventListener('click',()=>{const k=Object.keys(TIMES);timeOfDay=k[(k.indexOf(timeOfDay)+1)%k.length];try{localStorage.setItem('vsTime',timeOfDay)}catch(e){};applyEnv()});
$('bMap').addEventListener('click',()=>{const k=Object.keys(MAPS);MAP=k[(k.indexOf(MAP)+1)%k.length];weather=MAP_WX[MAP];try{localStorage.setItem('vsMap',MAP);localStorage.setItem('vsWx',weather)}catch(e){};tCx=NaN;applyEnv()});
$('bKc').addEventListener('click',()=>{KC.on=!KC.on;try{localStorage.setItem('vsKillCam',KC.on?'1':'0')}catch(e){};$('bKc').textContent='Kill cam: '+(KC.on?'on':'off')});
$('bWx').addEventListener('click',()=>{const k=Object.keys(WXS);weather=k[(k.indexOf(weather)+1)%k.length];try{localStorage.setItem('vsWx',weather)}catch(e){};applyEnv()});

/* ---------------- airbase ---------------- */
const base=new THREE.Group(); scene.add(base);
{const rwTex=(()=>{const cv=document.createElement('canvas');cv.width=64;cv.height=1024;const c=cv.getContext('2d');
    c.fillStyle='#3b3e42';c.fillRect(0,0,64,1024);
    {let r=7;const rnd=()=>(r=(r*16807)%2147483647)/2147483647;                                   // weathered concrete: grain, slab joints, patches, rubber and oil
      for(let i=0;i<2600;i++){c.fillStyle='rgba('+(rnd()<.5?'255,255,255':'0,0,0')+','+(.03+rnd()*.07)+')';c.fillRect(rnd()*64,rnd()*1024,1+rnd()*2,1+rnd()*2)}
      for(let i=0;i<14;i++){c.fillStyle='rgba('+(rnd()<.5?'70,72,76':'28,30,32')+',.22)';c.fillRect(rnd()*40,rnd()*980,6+rnd()*18,10+rnd()*40)}
      c.fillStyle='rgba(0,0,0,.35)';for(let y=64;y<1024;y+=128)c.fillRect(0,y,64,1);c.fillRect(31,0,1,1024);
      for(const y0 of [70,800]){for(const x0 of [20,40]){for(let k=0;k<5;k++){c.fillStyle='rgba(8,8,10,'+(.16+rnd()*.14)+')';c.fillRect(x0+rnd()*5-2,y0+k*28+rnd()*10,3+rnd()*4,18+rnd()*34)}}}
      for(let i=0;i<4;i++){c.fillStyle='rgba(15,12,10,.18)';c.beginPath();c.ellipse(24+rnd()*16,300+rnd()*420,2+rnd()*3,5+rnd()*9,0,0,6.3);c.fill()}}
    c.fillStyle='#e8e8e2';
    for(const y of [190,806]){c.fillRect(14,y,12,34);c.fillRect(38,y,12,34)}                          // aiming-point bars
    for(const y of [250,300,350,400,606,656,706,756])for(const s of [-1,1]){c.fillRect(32+s*14-3,y,6,18);c.fillRect(32+s*22-3,y,6,18)}   // touchdown-zone bars
    for(let y=60;y<964;y+=40)c.fillRect(30,y,4,22);           // centreline
    c.fillRect(2,0,3,1024);c.fillRect(59,0,3,1024);            // edges
    for(const y of [6,1000])for(let x=6;x<58;x+=7)c.fillRect(x,y,4,16);   // threshold bars
    const t=new THREE.CanvasTexture(cv);t.anisotropy=8;return t})();
  const rw=new THREE.Mesh(new THREE.PlaneGeometry(RWY.w,RWY.z1-RWY.z0).rotateX(-Math.PI/2),new THREE.MeshLambertMaterial({map:rwTex}));
  rw.position.set(RWY.x,BASE_Y+.15,0); base.add(rw);
  const tw=new THREE.Mesh(new THREE.PlaneGeometry(22,RWY.z1-RWY.z0-400).rotateX(-Math.PI/2),new THREE.MeshLambertMaterial({color:0x4a4d50}));
  tw.position.set(RWY.x+140,BASE_Y+.12,0); base.add(tw);
  const apron=new THREE.Mesh(new THREE.PlaneGeometry(260,420).rotateX(-Math.PI/2),new THREE.MeshLambertMaterial({color:0x55585b}));
  apron.position.set(RWY.x+290,BASE_Y+.1,-200); base.add(apron);
  const bm=new THREE.MeshLambertMaterial({color:0x7c8172}), dm=new THREE.MeshLambertMaterial({color:0x5d6158});
  for(let i=0;i<4;i++){const h=new THREE.Mesh(new THREE.BoxGeometry(46,14,40),bm);h.position.set(RWY.x+380,BASE_Y+7,-360+i*70);base.add(h)}
  const tower=new THREE.Mesh(new THREE.BoxGeometry(10,26,10),dm);tower.position.set(RWY.x+250,BASE_Y+13,120);base.add(tower);
  const cab=new THREE.Mesh(new THREE.BoxGeometry(14,5,14),new THREE.MeshLambertMaterial({color:0x223038,emissive:0x0a1a24}));cab.position.set(RWY.x+250,BASE_Y+28,120);base.add(cab);
  // edge and threshold lights (bright at night)
  const pts=[],cols=[];for(let z=RWY.z0;z<=RWY.z1;z+=60)for(const x of [-RWY.w/2-1,RWY.w/2+1]){pts.push(RWY.x+x,BASE_Y+.6,z);cols.push(1,.95,.8)}
  for(let x=-RWY.w/2;x<=RWY.w/2;x+=4){pts.push(RWY.x+x,BASE_Y+.6,RWY.z0-4);cols.push(.3,1,.4);pts.push(RWY.x+x,BASE_Y+.6,RWY.z1+4);cols.push(.3,1,.4)}
  const lg=new THREE.BufferGeometry();lg.setAttribute('position',new THREE.Float32BufferAttribute(pts,3));lg.setAttribute('color',new THREE.Float32BufferAttribute(cols,3));
  const rl=new THREE.Points(lg,new THREE.PointsMaterial({size:2.2,vertexColors:true,sizeAttenuation:true,transparent:true,opacity:.5,fog:false}));rl.name='rwyLights';base.add(rl);
}
const rwyLights=base.getObjectByName('rwyLights');
// landing gear (world-scale, added to the player jet)
let gearObj=null;
/* ---------------- landing gear: per-type track, wheel sizes, twin nose wheels, mudguards; animated retraction with doors ---------------- */
// mx: half track, mz: main gear station, mr/nr: main and nose wheel radius, nw: nose wheels, mud: nose mudguard, navy: heavy carrier legs
const GEAR_SPEC={F16:{mx:1.18,mz:-.9,mr:.34,nr:.23,nw:1},F16B70:{mx:1.18,mz:-.9,mr:.35,nr:.23,nw:1},F15C:{mx:1.37,mz:-1.7,mr:.42,nr:.29,nw:1},F15EX:{mx:1.37,mz:-1.7,mr:.43,nr:.3,nw:1},
  FA18E:{mx:1.55,mz:-1.5,mr:.4,nr:.28,nw:2,navy:1},GRIPEN:{mx:1.2,mz:-1.25,mr:.3,nr:.21,nw:2},GRIPENE:{mx:1.27,mz:-1.4,mr:.32,nr:.22,nw:2},TYPHOON:{mx:1.7,mz:-1.3,mr:.35,nr:.25,nw:1},
  RAFALE:{mx:1.35,mz:-1.4,mr:.34,nr:.24,nw:1},J10C:{mx:1.3,mz:-1.4,mr:.35,nr:.25,nw:1},J20:{mx:1.75,mz:-2.0,mr:.43,nr:.3,nw:1},
  MIG29:{mx:1.55,mz:-1.7,mr:.42,nr:.27,nw:2,mud:1},MIG29UPG:{mx:1.55,mz:-1.7,mr:.42,nr:.27,nw:2,mud:1},MIG35:{mx:1.55,mz:-1.7,mr:.43,nr:.28,nw:2,mud:1},MIG29K:{mx:1.6,mz:-1.7,mr:.43,nr:.3,nw:2,mud:1,navy:1},
  SU27:{mx:2.17,mz:-2.4,mr:.52,nr:.34,nw:1,mud:1},SU33:{mx:2.17,mz:-2.4,mr:.52,nr:.32,nw:2,mud:1,navy:1},SU35:{mx:2.17,mz:-2.4,mr:.53,nr:.34,nw:1,mud:1}};
rosterFill(GEAR_SPEC,{F4E:{mx:1.7,mz:-.9,mr:.45,nr:.28,nw:2},F35A:{mx:1.2,mz:-1.2,mr:.36,nr:.25,nw:1},F22A:{mx:1.5,mz:-1.3,mr:.38,nr:.26,nw:2},F104G:{mx:1.1,mz:-1.2,mr:.3,nr:.2,nw:1},MIG21:{mx:1.4,mz:-1.2,mr:.35,nr:.22,nw:1},
  SU57:{mx:1.9,mz:-2.3,mr:.5,nr:.3,nw:2,mud:1},J35F:{mx:1.5,mz:-1.2,mr:.35,nr:.22,nw:1},JA37:{mx:1.6,mz:-1.6,mr:.4,nr:.26,nw:2},LIGHTNING:{mx:1.3,mz:-1.2,mr:.3,nr:.22,nw:1},TORNADO3:{mx:1.6,mz:-1.8,mr:.4,nr:.28,nw:2},KFIR:{mx:1.5,mz:-1.2,mr:.34,nr:.22,nw:1}});
function buildGear(){
  if(gearObj)playerJet.remove(gearObj);
  gearObj=new THREE.Group(); gearObj.name='gear';
  const m=new THREE.MeshStandardMaterial({color:0xc8ccd0,roughness:.45,metalness:.5}), ch=new THREE.MeshStandardMaterial({color:0xe8ecef,roughness:.15,metalness:.95}),
    tyre=new THREE.MeshStandardMaterial({color:0x151617,roughness:.92}), hub=new THREE.MeshStandardMaterial({color:0x9da3a8,roughness:.4,metalness:.6}),
    door=new THREE.MeshStandardMaterial({color:new THREE.Color((PAINT[AC.id]||PAINT_DEF).c[0]),roughness:.55,metalness:.15,side:THREE.DoubleSide}), bay=new THREE.MeshStandardMaterial({color:0x2a2c2e,roughness:.8});
  const S=M2[AC.id], G=GEAR_SPEC[AC.id]||{mx:1.2,mz:-1,mr:.35,nr:.24,nw:1}, nz=AC.fx?AC.fx.nz:3.6, legs=[], doors=[];
  const wheel=(r,w)=>{const gw=new THREE.Group();const t=new THREE.Mesh(new THREE.CylinderGeometry(r,r,w,16).rotateZ(Math.PI/2),tyre);gw.add(t);
    const h=new THREE.Mesh(new THREE.CylinderGeometry(r*.55,r*.55,w+.02,10).rotateZ(Math.PI/2),hub);gw.add(h);return gw};
  const leg=(x,z,r,nose)=>{const top=S?bellyAt(S,z,x)+.15:-.5, wy=-GEAR_H+r, L=top-wy, th=(G.navy?1.5:1)*(nose?.07:.09);
    const gl=new THREE.Group(); gl.position.set(x,top,z); gearObj.add(gl);
    const st=new THREE.Mesh(new THREE.CylinderGeometry(th,th,L*.62,8),m); st.position.y=-L*.31; gl.add(st);
    const ol=new THREE.Mesh(new THREE.CylinderGeometry(th*.7,th*.7,L*.45,8),ch); ol.position.y=-L*.72; gl.add(ol);
    const tl=new THREE.Mesh(new THREE.BoxGeometry(.04,L*.22,.16),m); tl.position.set(0,-L*.66,nose?-.1:.12); tl.rotation.x=nose?.35:-.35; gl.add(tl);
    if(G.navy){const br=new THREE.Mesh(new THREE.CylinderGeometry(th*.6,th*.6,L*.75,6),m);br.position.set(0,-L*.4,nose?.0:-.32);br.rotation.x=nose?0:.5;gl.add(br)}
    const n=nose?G.nw:1, w=nose?r*.55:r*.65;
    for(let i=0;i<n;i++){const wh=wheel(r,w);wh.position.set(n>1?(i?-1:1)*(w*.5+th+.02):x>0?-th-w*.5+.0:x<0?th+w*.5:0,-L,0);if(!nose)wh.position.x=0;gl.add(wh)}
    if(nose&&G.mud){const mg=new THREE.Mesh(new THREE.CylinderGeometry(r*1.18,r*1.18,(n>1?w*2+th*2+.1:w+.12),14,1,true,-Math.PI*.15,Math.PI*1.1).rotateZ(Math.PI/2),door);mg.position.y=-L;gl.add(mg)}
    if(nose){const ll=new THREE.Mesh(new THREE.SphereGeometry(.07,8,6),new THREE.MeshBasicMaterial({color:0xfff6dd}));ll.name='llight';ll.position.set(0,-L*.55,.16);gl.add(ll)}
    legs.push({o:gl,nose,s:Math.sign(x)});
    // bay and door(s)
    const bl=Math.min(L*.95,nose?1.6:2.2), bw=nose?.32:.55;
    const b=new THREE.Mesh(new THREE.PlaneGeometry(bw,bl).rotateX(Math.PI/2),bay); b.position.set(x,top-.13,z-(nose?bl*.45:0)); gearObj.add(b); doors.push({o:b,bay:1});
    for(const sd of nose?[1,-1]:[x>0?1:-1]){const dg=new THREE.Group();dg.position.set(x+sd*bw*.5,top-.14,z-(nose?bl*.45:0));const d=new THREE.Mesh(new THREE.BoxGeometry(.02,bw*(nose?.9:1.1),bl),door);d.position.y=-bw*(nose?.45:.55);dg.add(d);gearObj.add(dg);doors.push({o:dg,s:sd})}};
  leg(0,nz,G.nr,true); leg(G.mx,G.mz,G.mr,false); leg(-G.mx,G.mz,G.mr,false);
  gearObj.userData={legs,doors}; gearObj.__legs=legs; gearObj.__doors=doors;
  P.gearT=P.gear?1:0; animGear(0); playerJet.add(gearObj);
}
function animGear(dt){if(!gearObj||!gearObj.__legs)return;const tgt=P.gear?1:0, was=P.gearT??tgt;P.gearT=was+clamp(tgt-was,-dt/3.2,dt/3.2);const t=P.gearT;
  if(dt&&Math.abs(tgt-was)>1e-3&&!P.gearSnd){P.gearSnd=1;sndGearCycle()} if(Math.abs(tgt-t)<1e-3)P.gearSnd=0;
  gearObj.visible=t>.002;
  for(const L of gearObj.__legs){const f=1-t;if(L.nose)L.o.rotation.set(-f*1.62,0,0);else L.o.rotation.set(0,0,-L.s*f*1.5)}
  const dOpen=t>.001&&t<.999?1:t>=.999?.85:0;
  for(const D of gearObj.__doors){if(D.bay){D.o.visible=t>.02;continue}D.o.visible=t>.002;D.o.rotation.z=D.s*(dOpen*1.45)}
  const ll=gearObj.getObjectByName('llight');if(ll)ll.visible=t>.98&&timeOfDay!=='DAY'}
function sndGearCycle(){if(!A.ctx||!A.on)return;const c=A.ctx,t=c.currentTime,o=c.createOscillator();o.type='sawtooth';o.frequency.setValueAtTime(140,t);o.frequency.linearRampToValueAtTime(190,t+2.6);
  const f=c.createBiquadFilter();f.type='bandpass';f.frequency.value=600;const g=c.createGain();g.gain.setValueAtTime(0,t);g.gain.linearRampToValueAtTime(.025,t+.3);g.gain.setValueAtTime(.025,t+2.6);g.gain.linearRampToValueAtTime(0,t+3.1);
  o.connect(f).connect(g).connect(A.master);o.start(t);o.stop(t+3.2);setTimeout(()=>sndNoise(.12,300,.25),3100)}

/* ---------------- battle damage you can see: holes and scorch, wrecks that fall burning, tails that break off ---------------- */
const HOLE_MAT=new THREE.MeshBasicMaterial({map:radTex([[0,'rgba(0,0,0,1)'],[.32,'rgba(10,8,6,.95)'],[.55,'rgba(40,32,24,.6)'],[1,'rgba(30,25,20,0)']]),transparent:true,depthWrite:false,polygonOffset:true,polygonOffsetFactor:-3,polygonOffsetUnits:-3,side:THREE.DoubleSide});
const HOLE_GEO=new THREE.CircleGeometry(1,12);
function addHole(obj,n){if(!obj)return;const g=obj.children[0]||obj;if(!g.__skin){g.__skin=[];g.traverse(o=>{if(o.isMesh&&o.material&&o.material.userData&&o.material.userData.paint)g.__skin.push(o)})}
  if(!g.__skin.length)return; g.__holes=g.__holes||0;
  for(let k=0;k<(n||1)&&g.__holes<14;k++){const ms=g.__skin[Math.random()*g.__skin.length|0],pa=ms.geometry.attributes.position,na=ms.geometry.attributes.normal,i=Math.random()*pa.count|0;
    const h=new THREE.Mesh(HOLE_GEO,HOLE_MAT);h.name='hole';const p=new THREE.Vector3().fromBufferAttribute(pa,i),nn=new THREE.Vector3().fromBufferAttribute(na,i).normalize();
    h.position.copy(p).addScaledVector(nn,.02);h.lookAt(_hv.copy(h.position).add(nn));h.scale.setScalar(rand(.12,.3));ms.add(h);g.__holes++}}
const _hv=new THREE.Vector3();
const WRECKS=[];
function spawnWreck(e){if(!e.obj||WRECKS.length>8)return;const obj=e.obj;scene.add(obj);
  const w={o:obj,vel:e.vel.clone(),spin:new V3(rand(-1.2,1.2),rand(-.4,.4),rand(-2.5,2.5)),t:0,parts:[]};
  addHole(obj,5);
  const g=obj.children[0];
  if(g&&e.kind==='fighter'&&Math.random()<.65){const tail=new THREE.Group();scene.add(tail);obj.updateMatrixWorld(true);
    const tz=Math.min(...(obj.userData.spec?obj.userData.spec.noz.map(n=>n[2]):[-6]))+3.2;
    const pick=[];g.children.forEach(o=>{if(o.name==='finG'||(o.name==='cs'&&o.userData&&o.userData.cs==='stab')||o.name==='nozG'||o.name==='flame')pick.push(o)});
    if(pick.length){pick.forEach(o=>tail.attach(o));w.parts.push({o:tail,vel:e.vel.clone().add(new V3(rand(-15,15),rand(5,20),rand(-15,15))),spin:new V3(rand(-4,4),rand(-4,4),rand(-4,4))})}
    else scene.remove(tail)}
  WRECKS.push(w)}
function updateWrecks(dt){for(let i=WRECKS.length-1;i>=0;i--){const w=WRECKS[i];w.t+=dt;
    const step=(o,vel,spin,fire)=>{vel.y-=G*dt;vel.multiplyScalar(Math.exp(-dt*.25));o.position.addScaledVector(vel,dt);o.rotateX(spin.x*dt);o.rotateY(spin.y*dt);o.rotateZ(spin.z*dt);
      if(fire&&QUALS[quality].fx&&Math.random()<.85){const p=o.position;puff(p.x,p.y,p.z,rand(-2,2),rand(0,3),rand(-2,2),1,rand(.4,.65),.12,.9,rand(4,7),3,.25);
        const s=rand(.06,.14);puff(p.x,p.y,p.z,vel.x*.1,vel.y*.1+3,vel.z*.1,s,s,s,.7,6,18,3.5)}
      return o.position.y<Math.max(groundH(o.position.x,o.position.z),0)+2};
    let gone=step(w.o,w.vel,w.spin,true)||w.t>16;
    for(const p of w.parts){if(p.done)continue;if(step(p.o,p.vel,p.spin,Math.random()<.4)||w.t>16){p.done=1;scene.remove(p.o);if(w.t<16)explode(p.o.position,false,true)}}
    if(gone){if(w.t<16)explode(w.o.position.clone().setY(Math.max(w.o.position.y,Math.max(groundH(w.o.position.x,w.o.position.z),0)+3)),true,true);scene.remove(w.o);w.parts.forEach(p=>scene.remove(p.o));WRECKS.splice(i,1)}}}
function clearWrecks(){for(const w of WRECKS){scene.remove(w.o);w.parts.forEach(p=>scene.remove(p.o))}WRECKS.length=0}

/* ---------------- lighting: canopy sun glint (also how you spot a distant jet), flare light, soft self-shadows on High ---------------- */
const GLINTS=[];for(let i=0;i<10;i++){const s=new THREE.Sprite(new THREE.SpriteMaterial({map:GLOW_TEX,color:0xfff6e0,blending:THREE.AdditiveBlending,depthWrite:false,depthTest:true,transparent:true,fog:false}));s.visible=false;s.renderOrder=3;scene.add(s);GLINTS.push(s)}
const _gl=new THREE.Vector3(),_gn=new THREE.Vector3(),_gv=new THREE.Vector3();
function updateGlints(){let k=0;const day=timeOfDay!=='NIGHT'&&!ovc()&&SUN_DIR.y>0, cock=VIEWS[view]==='COCKPIT';
  if(day){const list=[];if(!cock&&P.alive&&playerJet.visible)list.push(P);for(const e of enemies)if(e.alive&&e.kind==='fighter')list.push(e);for(const f of friends)if(f.alive&&f.kind==='fighter')list.push(f);
    for(const j of list){if(k>=GLINTS.length)break;const S=M2[j===P?AC.id:j.type];if(!S)continue;
      _gl.copy(j.pos).addScaledVector(j.up,S.canopy[1]+S.canopy[3]*.6).addScaledVector(j.fwd,S.canopy[0]);const d=_gl.distanceTo(camera.position);if(d>14000||d<6)continue;
      _gv.subVectors(camera.position,_gl).divideScalar(d);_gn.copy(j.up).multiplyScalar(.85).addScaledVector(j.fwd,.25).normalize();
      const rr=_gn.multiplyScalar(2*_gn.dot(SUN_DIR)).sub(SUN_DIR),a=Math.pow(Math.max(rr.dot(_gv),0),70);if(a<.05)continue;
      const s=GLINTS[k++];s.visible=true;s.position.copy(_gl).addScaledVector(_gv,1.2);s.scale.setScalar(Math.max(1.6,d*.009)*(.5+a));s.material.opacity=Math.min(1,a*1.4)}}
  for(;k<GLINTS.length;k++)GLINTS[k].visible=false}
const flareLight=new THREE.PointLight(0xffd090,0,600,2);scene.add(flareLight);
function updateFlareLight(){let best=null,bd=1e9;for(const o of CM.objs)if(o.type==='flare'&&o.alive){const d=o.pos.distanceTo(camera.position);if(d<bd){bd=d;best=o}}
  if(best&&bd<900){flareLight.position.copy(best.pos);flareLight.intensity=LK*(timeOfDay==='NIGHT'?3:1.4)*(.8+Math.random()*.4)*clamp(best.life/1.5,0,1)}else flareLight.intensity=0}
function setShadows(on){renderer.shadowMap.enabled=on;renderer.shadowMap.type=THREE.PCFSoftShadowMap;sun.castShadow=on;
  if(on){sun.shadow.mapSize.set(1024,1024);const c=sun.shadow.camera;c.left=c.bottom=-15;c.right=c.top=15;c.near=1;c.far=200;c.updateProjectionMatrix();sun.shadow.bias=-.0006;sun.shadow.normalBias=.03;sun.target=playerJet}
  else sun.target=new THREE.Object3D();
  playerJet.traverse(o=>{if(o.isMesh&&!(o.material&&(o.material.transparent||o.material.blending===THREE.AdditiveBlending))){o.castShadow=on;o.receiveShadow=on}});
  scene.traverse(o=>{if(o.material)o.material.needsUpdate=true})}
function shadowFollow(){if(!sun.castShadow)return;sun.position.copy(playerJet.position).addScaledVector(SUN_DIR,100)}

/* ---------------- kill cam: when your missile is about to arrive, time slows and the camera rides behind it into the target ---------------- */
var KC={on:true,t:0,m:null,tg:null,hold:0,cd:0,slow:1,pos:new THREE.Vector3(),last:new THREE.Vector3()};
try{KC.on=localStorage.getItem('vsKillCam')!=='0'}catch(e){}
function killCamWatch(dt){KC.cd=Math.max(0,KC.cd-dt);
  if(KC.t>0){KC.t+=dt; const m=KC.m;
    if(m&&m.on){KC.last.copy(m.m.position)} else if(!KC.hold)KC.hold=KC.t;
    if((KC.hold&&KC.t-KC.hold>1.3)||KC.t>5||state!=='play'||!P.alive)endKillCam();
    return}
  if(!KC.on||KC.cd>0||state!=='play'||!P.alive||P.onGround)return;
  for(const e of eMissiles)if(e.on&&e.target===P&&e.m.position.distanceTo(P.pos)<8000)return;
  for(const m of missiles){if(!m.on||!m.target||!m.target.alive||!m.target.kind)continue;const d=m.m.position.distanceTo(m.target.pos);
    const cl=-_hv.subVectors(m.target.pos,m.m.position).normalize().dot(_gv.subVectors(m.target.vel||m.vel,m.vel));
    if(d<700&&cl>150&&d/cl<1.6&&!m.reason){KC.t=1e-3;KC.m=m;KC.tg=m.target;KC.hold=0;KC.slow=.28;KC.last.copy(m.m.position);$('kcTag').hidden=false;$('hud').style.visibility='hidden';$('ctrls').style.visibility='hidden';
      KC.pos.copy(m.m.position).addScaledVector(_hv.copy(m.vel).normalize(),-28).add(_gv.set(0,6,0));break}}}
function endKillCam(){KC.t=0;KC.m=null;KC.tg=null;KC.slow=1;KC.cd=6;$('kcTag').hidden=true;$('hud').style.visibility='';$('ctrls').style.visibility='';camSnap=true}
function killCamCamera(dt){if(!(KC.t>0))return false;const m=KC.m,tg=KC.tg,p=m&&m.on?m.m.position:KC.last;
  if(m&&m.on){_hv.copy(m.vel).normalize();_gl.copy(p).addScaledVector(_hv,-24).add(_gv.set(0,4.5,0))}else _gl.copy(KC.pos);
  KC.pos.lerp(_gl,1-Math.exp(-dt*6));camera.position.copy(KC.pos);camera.up.set(0,1,0);camera.lookAt(tg&&(tg.alive||KC.hold)?(tg.pos||p):p);return true}

/* ---------------- sound: per-engine character, fly-bys with Doppler, sonic booms ---------------- */
// howl: a narrow resonant tone (the AL-31F's famous howl, the F110's growl), whine: compressor whine level
const ENG_SND={F16:{f:40,roar:250,wh:.003,twin:0,howl:[180,.012]},F16B70:{f:39,roar:240,wh:.003,twin:0,howl:[175,.012]},F15C:{f:36,roar:225,wh:.004,twin:1,howl:[160,.01]},F15EX:{f:34,roar:215,wh:.004,twin:1,howl:[150,.012]},
  FA18E:{f:38,roar:240,wh:.006,twin:1,howl:[210,.01]},GRIPEN:{f:52,roar:330,wh:.014,twin:0,howl:[320,.008]},GRIPENE:{f:48,roar:300,wh:.011,twin:0,howl:[290,.009]},
  TYPHOON:{f:44,roar:290,wh:.012,twin:1,howl:[340,.009]},RAFALE:{f:46,roar:300,wh:.011,twin:1,howl:[300,.009]},J10C:{f:34,roar:220,wh:.005,twin:0,howl:[200,.012]},J20:{f:30,roar:200,wh:.006,twin:1,howl:[190,.012]},
  MIG29:{f:30,roar:200,wh:.004,twin:1,howl:[140,.013]},MIG29UPG:{f:30,roar:200,wh:.004,twin:1,howl:[140,.013]},MIG35:{f:33,roar:215,wh:.005,twin:1,howl:[150,.013]},MIG29K:{f:33,roar:215,wh:.005,twin:1,howl:[150,.013]},
  SU27:{f:27,roar:185,wh:.004,twin:1,howl:[420,.02]},SU33:{f:27,roar:185,wh:.004,twin:1,howl:[410,.02]},SU35:{f:26,roar:180,wh:.006,twin:1,howl:[440,.022]}};
rosterFill(ENG_SND,{F4E:{f:34,roar:240,wh:.002,twin:1,howl:[130,.01]},F35A:{f:30,roar:205,wh:.007,twin:0,howl:[240,.012]},F22A:{f:29,roar:195,wh:.005,twin:1,howl:[170,.011]},F104G:{f:36,roar:235,wh:.003,twin:0,howl:[190,.011]},MIG21:{f:30,roar:215,wh:.004,twin:0,howl:[150,.012]},
  SU57:{f:25,roar:178,wh:.006,twin:1,howl:[400,.022]},J35F:{f:36,roar:238,wh:.004,twin:0,howl:[170,.012]},JA37:{f:30,roar:215,wh:.004,twin:0,howl:[170,.014]},LIGHTNING:{f:32,roar:225,wh:.003,twin:1,howl:[200,.012]},TORNADO3:{f:38,roar:230,wh:.007,twin:1,howl:[250,.011]},KFIR:{f:36,roar:235,wh:.003,twin:0,howl:[190,.011]}});
function sndInitExtra(){if(!A.ctx||A.howl)return;const c=A.ctx;
  A.howl=c.createBufferSource();A.howl.buffer=A.noise;A.howl.loop=true;A.howlF=c.createBiquadFilter();A.howlF.type='bandpass';A.howlF.Q.value=18;A.howlF.frequency.value=400;
  A.howlG=c.createGain();A.howlG.gain.value=0;A.howl.connect(A.howlF).connect(A.howlG).connect(A.master);A.howl.start();
  A.wind=c.createBufferSource();A.wind.buffer=A.noise;A.wind.loop=true;A.windF=c.createBiquadFilter();A.windF.type='highpass';A.windF.frequency.value=1200;A.windG=c.createGain();A.windG.gain.value=0;
  A.wind.connect(A.windF).connect(A.windG).connect(A.master);A.wind.start()}
function sndExtra(){if(!A.ctx)return;sndInitExtra();const t=A.ctx.currentTime,live=(state==='play'||state==='menu')&&(P.thrK??1)>0,s=ENG_SND[AC.id],ab=throttle>.81,k=clamp(P.kcas/700,0,1.2);
  if(s&&s.howl){A.howlF.frequency.setTargetAtTime(s.howl[0]*(.75+Math.min(throttle,.8)*.45+k*.15),t,.25);A.howlG.gain.setTargetAtTime(live?s.howl[1]*(.4+throttle)*(VIEWS[view]==='COCKPIT'?.6:1.3):0,t,.25)}
  A.windG.gain.setTargetAtTime((state==='play'&&P.alive?clamp((P.kcas-120)/600,0,1)*.05*(VIEWS[view]==='COCKPIT'?1:.4):0),t,.3)}
const FLYBY=new Map();
function sndFlyby(){if(!A.ctx||!A.on||state!=='play')return;const cp=camera.position;
  for(const j of enemies.concat(friends)){if(!j.alive||j.kind!=='fighter')continue;const d=j.pos.distanceTo(cp),st=FLYBY.get(j)||{d,near:0,boom:0};
    const closing=st.d-d;
    if(d<420&&closing<0&&!st.near&&j.vel.length()>140){st.near=1;whoosh(clamp(1-d/420,.15,1),j.vel.length())}
    if(d>900)st.near=0;
    if(j.mach>1&&d<1800&&closing<0&&!st.boom){st.boom=1;sonicBoom(clamp(1-d/1800,.2,1))}
    if(d>3500)st.boom=0;st.d=d;FLYBY.set(j,st)}}
function whoosh(v,sp){const c=A.ctx,t=c.currentTime,s=c.createBufferSource();s.buffer=A.noise;const f=c.createBiquadFilter();f.type='bandpass';f.Q.value=1.4;
  f.frequency.setValueAtTime(1500+sp,t);f.frequency.exponentialRampToValueAtTime(220,t+1.6);const g=c.createGain();g.gain.setValueAtTime(.001,t);g.gain.exponentialRampToValueAtTime(.5*v,t+.12);g.gain.exponentialRampToValueAtTime(.001,t+1.9);
  s.connect(f).connect(g).connect(A.master);s.start(t,Math.random(),2)}
function sonicBoom(v){sndNoise(.35,160,1.1*v);setTimeout(()=>sndNoise(.4,150,1.0*v),110);buzz([60,40,80])}

const GEAR_H=1.95;
function setGear(down){P.gear=down; P.xcd=(down?.022:0)+(AC.scd||0)-(P.tanksGone?(AC.tanks||0)*.0025:0); if(!P.alive||state!=='play'||P.onGround)P.gearT=down?1:0; $('nGear').textContent=down?'DOWN':'UP'; $('bGear').classList.toggle('down',down)}
// rolling on the runway: thrust, drag, rolling friction, wheel brakes, nosewheel steering; lift-off once the wing can hold the jet
function groundRoll(dt,rollIn,pitchIn){
  const A=AC, at=atm(P.pos.y); let v=Math.hypot(P.vel.x,P.vel.z);
  const hdg=Math.atan2(P.fwd.x,P.fwd.z)-rollIn*.35*clamp(v/15,0,1)*dt*(v>2?1:0);
  const MS=P.mass||A.MASS, qd=.5*at.rho*v*v, nAero=qd*A.S*A.CLMAX/(MS*G);
  const T=thrust(A,throttle,at.sig,v/at.a,P.pos.y)*(P.thrK??1); P.lastT=T;
  const D=qd*A.S*(cd0(v/at.a,A)*A.cdK+(P.xcd||0)+(brake?.06:0));
  const off=!onRunway(P.pos.x,P.pos.z), fr=(brake&&v>.5?.42:off?.2:.025)*G;   // grass drags the wheels   // wheel brakes when BRK is held (wings roll level, so nearly all weight is on the wheels)
  v=Math.max(0,v+((T-D)/MS-fr)*dt);
  P.vel.set(Math.sin(hdg)*v,0,Math.cos(hdg)*v); P.pos.addScaledVector(P.vel,dt); P.pos.y=BASE_Y+GEAR_H;
  playerJet.quaternion.setFromAxisAngle(UP,hdg); axes(P);
  P.n=1; P.qd=qd; P.mach=v/at.a; P.kcas=v*Math.sqrt(at.sig)*1.944; P.nAero=nAero;
  if(pitchIn>.25&&nAero>1.05){P.onGround=false;P.vel.y=2.5+pitchIn*3;P.pos.y+=.4;P.airT=0;message('ROTATE · GEAR UP WHEN CLIMBING',1.6)}
  if(off&&Math.abs(groundH(P.pos.x,P.pos.z)-BASE_Y)>.5){message('CRASH · ROUGH TERRAIN',2);die('landing')}   // rolled off the flat airfield
  // rearm, refuel and repair after 4 s stopped on the runway
  if(v<1.5){P.stopT=(P.stopT||0)+dt; if(P.stopT>4&&!P.serviced){P.serviced=true;P.fuel=AC.fuelCap;P.hp=100;resetSystems();rearm();CM.flares=cmFlares();CM.chaff=cmChaff();syncCM();
      message('REARMED · REFUELED · REPAIRED',2.2);recEvent('Landed and turned around at the base');if(trainHook)trainHook('stopped')}}
  else {P.stopT=0; if(v>5)P.serviced=false}
}
function checkTouchdown(){
  const g=groundH(P.pos.x,P.pos.z);
  if(P.pos.y>g+GEAR_H||P.onGround||P.vel.y>0)return false;
  const sink=-P.vel.y, bank=Math.abs(bankOf(P));
  // only a clearly wrong arrival destroys the jet (and the screen says why); a firm one costs gear damage instead, as in War Thunder
  const rwy=onRunway(P.pos.x,P.pos.z), flat=Math.abs(g-BASE_Y)<.5;   // the airfield is flat grass all around the strip, so landing beside it is survivable
  const bad=!P.gear?'GEAR UP':!flat?'ROUGH TERRAIN':P.kcas>=280?'TOO FAST':sink>9?'SINK RATE TOO HIGH':bank>.35?'WINGS NOT LEVEL':P.fwd.y<-.2?'NOSE TOO LOW':null;
  if(bad){message('CRASH · '+bad,2.4);recEvent('Crashed on landing: '+bad.toLowerCase());die(P.gear?'landing':'gearup');return true}
  P.onGround=true; P.vel.y=0; P.pos.y=BASE_Y+GEAR_H;
  const hard=sink>5.5||bank>.22||P.kcas>=240||P.fwd.y<-.12||!rwy;
  if(hard){const dmg=Math.round(clamp(15+Math.max(0,sink-5.5)*12+Math.max(0,P.kcas-240)*.4+(rwy?0:20),15,70));P.hp-=dmg;hurtT=.5;shake=.6;sndHit();
    message(rwy?'HARD LANDING · GEAR DAMAGED':'OFF-RUNWAY LANDING · GEAR DAMAGED',2);recEvent('Hard landing at '+Math.round(P.kcas)+' kt, sink '+sink.toFixed(1)+' m/s (-'+dmg+' % airframe)');
    if(P.hp<=0){die('landing');return true}}
  else message(sink<1.5?'GREASED IT':sink<2.8?'TOUCHDOWN':'FIRM TOUCHDOWN',1.6);
  recEvent('Touched down at '+Math.round(P.kcas)+' kt, sink '+sink.toFixed(1)+' m/s');
  {const dt=dailyAdd('l',1);if(dt)message('DAILY TASK · '+dt,2.6)}
  if(trainHook)trainHook('touchdown'); return true;
}
let startOnRunway=false,startCV=false; try{const v=localStorage.getItem('vsStart');startOnRunway=v==='rwy'||v==='cv';startCV=v==='cv'}catch(e){}
function placeOnRunway(){P.pos.set(RWY.x,BASE_Y+GEAR_H,RWY.z0+120);playerJet.quaternion.identity();P.vel.set(0,0,0);P.onGround=true;P.serviced=true;P.scramble=true;P.scrT=0;
  setGear(true);throttle=0;setThr(0);axes(P);qPrev.copy(playerJet.quaternion);camSnap=true;
  message('SCRAMBLE · ROTATE AT '+rotateKt()+' KT',4)}
// speed where the wing can lift the jet off (same test as groundRoll uses)
function rotateKt(){const MS=P.mass||AC.MASS, at=atm(BASE_Y);return Math.round(Math.sqrt(1.05*MS*G/(.5*at.rho*AC.S*AC.CLMAX))*Math.sqrt(at.sig)*1.944/5+.5)*5}
$('bGear').addEventListener('click',()=>{if(P.onGround){message('WEIGHT ON WHEELS',.8);return}setGear(!P.gear);message(P.gear?'GEAR DOWN':'GEAR UP',.8)});
$('b120D').addEventListener('click',()=>{use120D=!use120D;try{localStorage.setItem('vs120D',use120D?'1':'0')}catch(e){};applyAC()});
$('bR37').addEventListener('click',()=>{suLR=!suLR;try{localStorage.setItem('vsR37',suLR?'1':'0')}catch(e){};applyAC()});
$('bTVC').addEventListener('click',()=>{tvcOn=!tvcOn;try{localStorage.setItem('vsTVC',tvcOn?'1':'0')}catch(e){};applyAC()});
function syncStartLbl(){if(startCV&&!AC.carrier){}$('bStartPos').textContent='Start: '+(!startOnRunway?'in the air':startCV&&AC.carrier?'on the carrier':'on the runway')}
$('bStartPos').addEventListener('click',()=>{if(!startOnRunway){startOnRunway=true;startCV=false}else if(!startCV&&AC.carrier){startCV=true}else{startOnRunway=false;startCV=false}try{localStorage.setItem('vsStart',!startOnRunway?'air':startCV?'cv':'rwy')}catch(e){};syncStartLbl()});
syncStartLbl();
let trainHook=null;
/* ---------------- ground threats: Buk-type SAM launchers and radar-guided AAA ----------------
   9M38: Mach 3 (900 m/s), 3–42 km, up to 25 km altitude, semi-active with radio correction (GlobalSecurity) */
const BUK={burn:15,acc:62,cd:5e-5,gmax:22,life:60,fuze:17,gimbal:1.2,chaffP:.1,flareP:0,sarh:true,termR:12000,dlR:45000,minR:3000,maxR:38000};
let ground=[];
function buildSAM(){const g=new THREE.Group();
  const olive=new THREE.MeshLambertMaterial({color:0x4d5a3a}),dk=new THREE.MeshLambertMaterial({color:0x2e3427}),wh=new THREE.MeshLambertMaterial({color:0xd8d8d0});
  const hull=new THREE.Mesh(new THREE.BoxGeometry(3.2,1.8,9),olive);hull.position.y=1.4;g.add(hull);
  const tur=new THREE.Group();tur.position.y=2.4;g.add(tur);
  const dish=new THREE.Mesh(new THREE.CylinderGeometry(1.1,1.1,.3,12).rotateX(Math.PI/2),dk);dish.position.set(0,1.3,1.6);tur.add(dish);
  for(const x of [-.7,.7])for(const y of [.4,1.0]){const m=new THREE.Mesh(new THREE.CylinderGeometry(.2,.2,5.5,6).rotateX(Math.PI/2),wh);m.position.set(x,y,-1);m.rotation.x=-.5;tur.add(m)}
  g.userData.tur=tur;return g}
function buildAAA(){const g=new THREE.Group();const olive=new THREE.MeshLambertMaterial({color:0x56603e}),dk=new THREE.MeshLambertMaterial({color:0x2a2e24});
  const hull=new THREE.Mesh(new THREE.BoxGeometry(3,1.6,6.5),olive);hull.position.y=1.2;g.add(hull);
  const tur=new THREE.Group();tur.position.y=2.2;g.add(tur);tur.add(new THREE.Mesh(new THREE.BoxGeometry(2.4,1,2.6),olive));
  for(const x of [-.5,-.2,.2,.5]){const b=new THREE.Mesh(new THREE.CylinderGeometry(.05,.05,2.5,4).rotateX(Math.PI/2),dk);b.position.set(x,.4,1.6);tur.add(b)}
  g.userData.tur=tur;return g}
// early-warning radar (rotating antenna, cues the SAMs) and a hardened command bunker
function buildRadar(){const g=new THREE.Group();const olive=new THREE.MeshLambertMaterial({color:0x4d5a3a}),dk=new THREE.MeshLambertMaterial({color:0x2e3427});
  const hull=new THREE.Mesh(new THREE.BoxGeometry(3,2,8),olive);hull.position.y=1.5;g.add(hull);const mast=new THREE.Mesh(new THREE.CylinderGeometry(.25,.25,6,6),dk);mast.position.y=5;g.add(mast);
  const tur=new THREE.Group();tur.position.y=8;g.add(tur);const ant=new THREE.Mesh(new THREE.BoxGeometry(9,2.2,.4),dk);tur.add(ant);g.userData.spin=tur;return g}
function buildBunker(){const g=new THREE.Group();const con=new THREE.MeshLambertMaterial({color:0x8a8a80}),dk=new THREE.MeshLambertMaterial({color:0x3a3a36});
  const b=new THREE.Mesh(new THREE.BoxGeometry(22,6,14),con);b.position.y=2;g.add(b);const top=new THREE.Mesh(new THREE.BoxGeometry(18,2,10),con);top.position.y=6;g.add(top);
  const door=new THREE.Mesh(new THREE.BoxGeometry(5,4,.4),dk);door.position.set(0,2,7.1);g.add(door);return g}
function buildTruck(){const g=new THREE.Group();const ol=new THREE.MeshLambertMaterial({color:0x55603e}),dk=new THREE.MeshLambertMaterial({color:0x2a2e24});
  const cab=new THREE.Mesh(new THREE.BoxGeometry(2.4,2.2,2.2),ol);cab.position.set(0,1.6,3);g.add(cab);const box=new THREE.Mesh(new THREE.BoxGeometry(2.5,2.6,5.6),dk);box.position.set(0,1.8,-.8);g.add(box);return g}
// enemy frigate: 125 m, radar mast, vertical-launch SAMs, a gun forward
function buildShip(){const g=new THREE.Group();const gr=new THREE.MeshLambertMaterial({color:0x6c7278}),dk=new THREE.MeshLambertMaterial({color:0x3e4348});
  const h=new THREE.Mesh(new THREE.BoxGeometry(14,8,110),gr);h.position.y=2;g.add(h);const bow=new THREE.Mesh(new THREE.CylinderGeometry(0,7,18,4,1).rotateX(Math.PI/2).rotateZ(Math.PI/4),gr);bow.scale.set(1,.6,1);bow.position.set(0,3,63);g.add(bow);
  const sup=new THREE.Mesh(new THREE.BoxGeometry(10,9,30),gr);sup.position.set(0,10,-5);g.add(sup);const mast=new THREE.Mesh(new THREE.CylinderGeometry(.6,1.2,18,6),dk);mast.position.set(0,23,-2);g.add(mast);
  const tur=new THREE.Group();tur.position.set(0,24,-2);g.add(tur);tur.add(new THREE.Mesh(new THREE.BoxGeometry(6,1.4,.4),dk));
  const vls=new THREE.Mesh(new THREE.BoxGeometry(8,1.2,9),dk);vls.position.set(0,6.6,24);g.add(vls);const gun=new THREE.Mesh(new THREE.BoxGeometry(3,2,4),gr);gun.position.set(0,7,40);g.add(gun);
  g.userData.spin=tur;return g}
const ISLES=[], isleMat=new THREE.MeshLambertMaterial({color:0xcdbb8e});
function clearIsles(){ISLES.forEach(o=>scene.remove(o));ISLES.length=0}
function spawnGround(kind,x,z,objective){
  let lift=0; if(kind!=='ship'&&groundH(x,z)<1.5){lift=2.5;if(!ISLES.some(o=>Math.hypot(o.position.x-x,o.position.z-z)<200)){const is=new THREE.Mesh(new THREE.CylinderGeometry(240,330,6,28),isleMat);is.position.set(x,-.5,z);scene.add(is);ISLES.push(is)}}
  const y=(kind==='ship'?0:Math.max(groundH(x,z),0)+lift)+.2, obj=kind==='sam'?buildSAM():kind==='radar'?buildRadar():kind==='bunker'?buildBunker():kind==='truck'?buildTruck():kind==='ship'?buildShip():buildAAA(); obj.position.set(x,y,z); scene.add(obj);
  const e={kind,team:'red',type:({sam:'SAM',radar:'RADAR',bunker:'BUNKER',truck:'TRUCK',ship:'SHIP'})[kind]||'AAA',obj,pos:obj.position,vel:new V3(),fwd:new V3(0,0,1),up:UP,right:new V3(1,0,0),alive:true,hp:({sam:8,bunker:14,radar:5,truck:2,ship:24})[kind]||6,objective:!!objective,offT:0,
    lockT:0,tgt:null,mslCd:rand(4,8),shots:kind==='sam'?4:kind==='ship'?8:0,id:nextId(),gunAcc:0,seenT:-99};
  ground.push(e); return e;
}
function losClear(a,b){for(let i=1;i<8;i++){const t=i/8,x=a.x+(b.x-a.x)*t,z=a.z+(b.z-a.z)*t,y=a.y+(b.y-a.y)*t;if(Math.max(groundH(x,z),0)>y)return false}return true}
function updateGround(dt){
  if(state!=='play'||!P.alive){for(const g of ground){g.lockT=0;g.tgt=null}return}
  const ewr=ground.some(g=>g.alive&&g.kind==='radar'&&!(g.offT>0));
  for(const g of ground){if(!g.alive||g.war)continue;
    if(g.path){g.s=Math.min(g.s+g.spd*dt,g.path.len);const p=g.path,t=g.s/p.len;g.pos.set(p.a.x+(p.b.x-p.a.x)*t,0,p.a.z+(p.b.z-p.a.z)*t);g.pos.y=Math.max(groundH(g.pos.x,g.pos.z),0)+.2;g.obj.rotation.y=Math.atan2(p.b.x-p.a.x,p.b.z-p.a.z);g.vel.set(p.b.x-p.a.x,0,p.b.z-p.a.z).setLength(g.s<p.len?g.spd:0)}
    if(g.orbit){g.orbit.a+=g.spd/g.orbit.r*dt;g.pos.set(g.orbit.c.x+Math.cos(g.orbit.a)*g.orbit.r,.2,g.orbit.c.z+Math.sin(g.orbit.a)*g.orbit.r);g.obj.rotation.y=Math.atan2(-Math.sin(g.orbit.a),Math.cos(g.orbit.a));g.vel.set(-Math.sin(g.orbit.a),0,Math.cos(g.orbit.a)).multiplyScalar(g.spd);if(g.obj.userData.spin)g.obj.userData.spin.rotation.y+=dt*2}
    if(g.kind==='truck'||g.kind==='bunker')continue;
    if(g.kind==='radar'){if(g.obj.userData.spin&&!(g.offT>0))g.obj.userData.spin.rotation.y+=dt*1.6;g.offT=Math.max(0,(g.offT||0)-dt);continue}
    // an anti-radiation missile inbound: some crews switch the radar off (and stop shooting) to survive it
    if(g.offT>0){g.offT-=dt;g.lockT=0;g.tgt=null;g.spiking=false;continue}
    if(!g.armRolled&&AG.w.some(w=>w.W.kind==='arm'&&w.tgt===g&&w.pos.distanceTo(g.pos)<22000)){g.armRolled=true;if(Math.random()<.35){g.offT=rand(25,40);continue}}
    g.mslCd-=dt; _s1.subVectors(P.pos,g.pos); const d=_s1.length(); _s1.divideScalar(d||1); g.fwd.copy(_s1);
    const tur=g.obj.userData.tur; if(tur)tur.rotation.y=Math.atan2(_s1.x,_s1.z);
    const agl=P.pos.y-Math.max(groundH(P.pos.x,P.pos.z),0);
    if(g.kind==='sam'||g.kind==='ship'){
      // pulse-doppler radar: needs line of sight, loses you in the beam (near-zero closure) and in ground clutter below ~30 m
      const radial=Math.abs(P.vel.dot(_s1)), seen=!P.scramble&&d<45000*rcsK(P,g.pos)&&agl>30&&P.pos.y<25000&&radial>35&&(g.losT=(g.losT||0)-dt,g.losT>0?g.los:(g.losT=.5,g.los=losClear(g.pos.clone().setY(g.pos.y+6),P.pos)));
      if(seen){g.lockT+=dt*(CM.ecm&&d>9000?.4:1)*(ewr?1.5:1);g.tgt=P;g.seenT=clock} else {g.lockT=Math.max(0,g.lockT-dt*1.5);if(g.lockT<=0)g.tgt=null}
      if(g.lockT>.3&&!g.spiking){g.spiking=true;if(rwrMsgT<=0){message('SAM SPIKE',1.2);rwrMsgT=2}} if(g.lockT<=0)g.spiking=false;
      let mine=false;for(const m of eMissiles)if(m.on&&m.owner===g)mine=true;
      if(g.lockT>4&&g.shots>0&&g.mslCd<=0&&!mine&&d>BUK.minR&&d<BUK.maxR){g.shots--;g.mslCd=rand(9,14);launchSAM(g)}
    } else {
      // radar-directed 23 mm: inside ~2.5 km and below ~2,000 m above the gun
      const inR=d<2600&&P.pos.y-g.pos.y<2000&&agl>15&&losClear(g.pos.clone().setY(g.pos.y+3),P.pos);
      g.tgt=inR?P:null; g.lockT=inR?1:0;
      if(inR){g.gunAcc+=dt*12;while(g.gunAcc>=1){g.gunAcc--;const t=d/970;_c.copy(P.pos).addScaledVector(P.vel,t).sub(g.pos).normalize();
        const sp=.018;_c.x+=rand(-sp,sp);_c.y+=rand(-sp,sp);_c.z+=rand(-sp,sp);_c.normalize();
        const b=take(eBullets);b.on=true;b.life=3;b.m.visible=true;b.team='red';b.dmg=1;b.m.position.copy(g.pos).setY(g.pos.y+3);b.vel.copy(_c).multiplyScalar(970);b.m.quaternion.setFromUnitVectors(ZF,_c)}}
      else g.gunAcc=0;
    }
  }
}
function launchSAM(g){
  const m=take(eMissiles);m.on=true;m.type='RDR';m.t=0;m.target=P;m.m.visible=true;m.owner=g;m.team='red';m.spec=BUK;
  m.seen=new Set();m.notchT=0;m.notchRolled=false;m.blindT=0;m.lostT=0;m.dRolled=false;m.mawsWarned=false;m.mawSeen=-99;m.term=false;m.kp=null;m.gmode='';m.jit=m.jit||new V3();m.jit.set(0,0,0);m.jitT=0;m.reason='';
  m.name='9M38 (Buk)'; m.m.scale.set(1.8,1.8,1.9);
  m.m.position.copy(g.pos).setY(g.pos.y+4); m.prev.copy(m.m.position); m.vel.set(0,40,0).addScaledVector(g.fwd,20);
  recLaunch(m,'SAM site',P); message('SAM LAUNCH',1.8); buzz([60,50,60,50,60]); for(let i=0;i<5;i++)setTimeout(()=>sndBeep(1300,.06,.05),i*100);
}
function clearGround(){for(const g of ground)scene.remove(g.obj);ground=[];warClear()}
function killGround(g){if(!g.alive)return;g.alive=false;explode(g.pos.clone().setY(g.pos.y+3),true);g.obj.rotation.z=.3;g.obj.position.y-=1;
  kills++;score+=200*Math.max(1,wave);message(({sam:'SAM SITE DESTROYED',aaa:'AAA DESTROYED',radar:'EW RADAR DESTROYED',bunker:'BUNKER DESTROYED',truck:'TRUCK DESTROYED',ship:'FRIGATE SUNK',tank:'TANK DESTROYED',ifv:'IFV DESTROYED',spaa:'AA VEHICLE DESTROYED'})[g.kind],1.6);recEvent('You destroyed '+({sam:'a SAM launcher',aaa:'an AAA gun',radar:'the early-warning radar',bunker:'the command bunker',truck:'a convoy truck',ship:'the frigate',tank:'a '+g.type,ifv:'a '+g.type,spaa:'a '+g.type})[g.kind]);if(g.war)warWreck(g);if(g.kind==='ship'){g.obj.rotation.z=.25;g.obj.position.y=-4}if(typeof campaignKill==='function')campaignKill(g)}


/* ---------------- air-to-ground: anti-radiation missiles, guided and unguided bombs ----------------
   HARM: Mach 2+, 100+ km class; Kh-31P: ramjet, Mach 3.5, ~110 km; JDAM (GBU-31): up to ~28 km; GBU-39 SDB: ~110 km from altitude;
   AASM Hammer: 15 km low / ~57 km high; Paveway IV, GBU-49, KAB-500 series, LS-6: glide ranges est. Game ranges are trimmed. */
const AGW={
  HARM:{name:'AGM-88 HARM',sh:'HARM',kind:'arm',burn:6,acc:150,cd:3e-5,gmax:20,maxR:80000,minR:5000,blast:15,len:4.2,r:.13},
  KH31P:{name:'Kh-31P',sh:'KH31',kind:'arm',burn:3,acc:170,sus:35,susAcc:55,vCap:1150,cd:3e-5,gmax:18,maxR:90000,minR:5000,blast:18,len:4.7,r:.18},
  YJ91:{name:'YJ-91',sh:'YJ91',kind:'arm',burn:3,acc:170,sus:35,susAcc:55,vCap:1150,cd:3e-5,gmax:18,maxR:90000,minR:5000,blast:18,len:4.7,r:.18},
  JDAM:{name:'GBU-31 JDAM',sh:'JDAM',kind:'gps',glide:2.4,blast:45,len:3.9,r:.23},
  SDB:{name:'GBU-39 SDB',sh:'SDB',kind:'gps',glide:7.5,blast:12,len:1.8,r:.1},
  GBU49:{name:'GBU-49',sh:'GBU49',kind:'gps',glide:1.5,blast:25,len:3.3,r:.14},
  PAVE4:{name:'Paveway IV',sh:'PWIV',kind:'gps',glide:2.4,blast:25,len:3.3,r:.14},
  AASM:{name:'AASM Hammer',sh:'AASM',kind:'gps',glide:3.6,boost:12000,blast:25,len:3.1,r:.16},
  KAB500S:{name:'KAB-500S',sh:'KAB',kind:'gps',glide:1.7,blast:30,len:3.0,r:.2},
  KAB500KR:{name:'KAB-500Kr',sh:'KAB',kind:'gps',glide:1.6,blast:30,len:3.05,r:.2},
  LS6:{name:'LS-6',sh:'LS6',kind:'gps',glide:5.5,blast:30,len:3.4,r:.2},
  FAB500:{name:'FAB-500',sh:'FAB',kind:'dumb',blast:32,len:2.4,r:.2},
  MK82:{name:'Mk 82 500 lb',sh:'MK82',kind:'dumb',blast:28,len:2.2,r:.13},
  MK84:{name:'Mk 84 2,000 lb',sh:'MK84',kind:'dumb',blast:40,len:3.3,r:.23},
  FAB250:{name:'FAB-250',sh:'FAB250',kind:'dumb',blast:26,len:2.1,r:.15},
  AGM65:{name:'AGM-65 Maverick',sh:'MAV',kind:'gps',glide:3,blast:22,len:2.45,r:.15},
  KH25ML:{name:'Kh-25ML',sh:'KH25',kind:'gps',glide:3.4,blast:24,len:3.8,r:.14}};
// strike loadouts: [weapon, count], and how many medium-range air-to-air missiles stay on (game fits, based on each jet's cleared stores)
const STRIKE_LOAD={FA18E:{ag:[['HARM',2],['JDAM',2]],keep:2},MIG29K:{ag:[['KH31P',2],['KAB500KR',2]],keep:2},SU33:{ag:[['FAB500',6]],keep:2},F16:{ag:[['HARM',2],['JDAM',2]],keep:2},F16B70:{ag:[['HARM',2],['JDAM',2]],keep:2},F15EX:{ag:[['JDAM',4]],keep:4},
  GRIPEN:{ag:[['GBU49',2]],keep:2},GRIPENE:{ag:[['SDB',4]],keep:2},TYPHOON:{ag:[['PAVE4',4]],keep:4},RAFALE:{ag:[['AASM',4]],keep:2},
  MIG29:{ag:[['FAB500',4]],keep:0},MIG29UPG:{ag:[['KH31P',2],['KAB500KR',2]],keep:2},MIG35:{ag:[['KH31P',2],['KAB500S',2]],keep:4},
  SU27:{ag:[['FAB500',6]],keep:2},SU35:{ag:[['KH31P',2],['KAB500S',4]],keep:4},J10C:{ag:[['YJ91',2],['LS6',2]],keep:2},
  A10A:{ag:[['AGM65',4],['MK82',4]],keep:0},SU25:{ag:[['KH25ML',2],['FAB250',4]],keep:0},A7E:{ag:[['MK82',6]],keep:0},A4E:{ag:[['MK82',3]],keep:0},SU22M3:{ag:[['KH25ML',2],['FAB250',4]],keep:0},
  ALPHAJET:{ag:[['MK82',4]],keep:0},G91Y:{ag:[['MK82',4]],keep:0},JAGUAR:{ag:[['MK84',2],['MK82',2]],keep:0},Q5A:{ag:[['FAB250',4]],keep:0},AMX:{ag:[['MK84',2],['MK82',2]],keep:0},F104S:{ag:[['MK82',3]],keep:0},TORNADOIT:{ag:[['MK84',2],['MK82',2]],keep:0}};
const AG={load:[],tgt:null,tgtT:0,w:[],sel:0};
AGW.SDB.perSt=4; for(const k of ['GBU49','PAVE4','KAB500KR','AGM65','KH25ML'])AGW[k].track=true;   // laser / TV seekers follow a moving target   // GBU-39s ride four to a BRU-61 rack
// store weights (kg) and the extra stations (centreline / heavy inboard) beyond the missile rails; tanks: max count and fuel per tank.
// Cleared weapons follow each type's real stores where known; tank sizes from published tank capacities (e.g. F-16 370 gal, F-15 600 gal, PTB-2000).
const AGKG={HARM:361,KH31P:600,YJ91:600,JDAM:925,SDB:130,GBU49:240,PAVE4:230,AASM:340,KAB500S:560,KAB500KR:520,LS6:500,FAB500:500,MK82:241,MK84:900,FAB250:250,AGM65:210,KH25ML:300};
const MRKG={'AIM-120C':152,'AIM-120C-7':161,'AIM-120D':161,'R-27R':253,'R-27ER':350,'R-77':175,'R-77-1':190,'R-37M':510,'METEOR':190,'PL-15':210};
const SRKG={'AIM-9X':85,'R-73':105,'IRIS-T':87,'PL-10':89,'MICA IR':112};
const JET_HP={F16:{extra:1,tanks:3,tankKg:1130,ag:['HARM','JDAM']},F16B70:{extra:1,tanks:3,tankKg:1130,ag:['HARM','JDAM']},
  F15C:{extra:1,tanks:3,tankKg:1820,ag:[]},F15EX:{extra:3,tanks:3,tankKg:1820,ag:['JDAM','SDB']},FA18E:{extra:1,tanks:3,tankKg:1500,ag:['HARM','JDAM']},
  GRIPEN:{extra:1,tanks:3,tankKg:880,ag:['GBU49']},GRIPENE:{extra:3,tanks:3,tankKg:880,ag:['SDB','GBU49']},TYPHOON:{extra:1,tanks:3,tankKg:800,ag:['PAVE4']},
  RAFALE:{extra:2,tanks:3,tankKg:1600,ag:['AASM']},MIG29:{extra:1,tanks:3,tankKg:1150,ag:['FAB500']},MIG29UPG:{extra:1,tanks:3,tankKg:1150,ag:['KH31P','KAB500KR','FAB500']},
  MIG29K:{extra:1,tanks:3,tankKg:1150,ag:['KH31P','KAB500KR','FAB500']},MIG35:{extra:1,tanks:3,tankKg:1150,ag:['KH31P','KAB500S','FAB500']},
  SU27:{extra:0,tanks:0,tankKg:0,ag:['FAB500']},SU33:{extra:2,tanks:0,tankKg:0,ag:['FAB500']},SU35:{extra:2,tanks:2,tankKg:1600,ag:['KH31P','KAB500S','FAB500']},
  J10C:{extra:1,tanks:3,tankKg:1100,ag:['YJ91','LS6']},J20:{extra:0,tanks:0,tankKg:0,ag:[]}};
rosterFill(JET_HP,{A10A:{extra:10,tanks:0,tankKg:0,ag:['AGM65','MK82','MK84']},SU25:{extra:8,tanks:2,tankKg:1300,ag:['KH25ML','FAB250','FAB500']},A7E:{extra:6,tanks:2,tankKg:1000,ag:['MK82','MK84']},A4E:{extra:3,tanks:1,tankKg:1000,ag:['MK82']},SU22M3:{extra:6,tanks:2,tankKg:1300,ag:['KH25ML','FAB250','FAB500']},
  ALPHAJET:{extra:4,tanks:1,tankKg:245,ag:['MK82']},G91Y:{extra:4,tanks:2,tankKg:500,ag:['MK82']},JAGUAR:{extra:5,tanks:3,tankKg:1000,ag:['MK82','MK84']},Q5A:{extra:6,tanks:0,tankKg:0,ag:['FAB250']},AMX:{extra:5,tanks:2,tankKg:500,ag:['MK82','MK84']},F104S:{extra:3,tanks:2,tankKg:900,ag:['MK82']},TORNADOIT:{extra:5,tanks:2,tankKg:1170,ag:['MK82','MK84']},
  F4C:{extra:2,tanks:3,tankKg:1800,ag:[]},F5A:{extra:1,tanks:3,tankKg:700,ag:[]},J35D:{extra:0,tanks:1,tankKg:600,ag:[]},J29F:{extra:0,tanks:0,tankKg:0,ag:[]},J6A:{extra:0,tanks:2,tankKg:400,ag:[]},MIG21MF:{extra:1,tanks:2,tankKg:490,ag:[]},F8E:{extra:0,tanks:2,tankKg:1000,ag:[]},F100D:{extra:1,tanks:2,tankKg:1000,ag:[]},MIG19PT:{extra:0,tanks:2,tankKg:400,ag:[]},MIG21F13:{extra:0,tanks:1,tankKg:400,ag:[]},HUNTER:{extra:0,tanks:2,tankKg:540,ag:[]},MIRAGE3C:{extra:0,tanks:2,tankKg:800,ag:[]},F4E:{extra:2,tanks:3,tankKg:1800,ag:['PAVE4']},F35A:{extra:2,tanks:0,tankKg:0,ag:['JDAM']},F22A:{extra:0,tanks:0,tankKg:0,ag:[]},F104G:{extra:1,tanks:2,tankKg:700,ag:[]},
  MIG21:{extra:1,tanks:2,tankKg:400,ag:['FAB500']},SU57:{extra:2,tanks:0,tankKg:0,ag:['KAB500S']},J35F:{extra:0,tanks:1,tankKg:600,ag:[]},JA37:{extra:1,tanks:1,tankKg:1000,ag:[]},
  LIGHTNING:{extra:0,tanks:1,tankKg:1000,ag:[]},TORNADO3:{extra:1,tanks:2,tankKg:1500,ag:[]},KFIR:{extra:2,tanks:3,tankKg:900,ag:['PAVE4']},F15E:{extra:3,tanks:3,tankKg:1820,ag:['JDAM','SDB']},
  F15I:{extra:3,tanks:3,tankKg:1820,ag:['JDAM','SDB']},F16I:{extra:1,tanks:3,tankKg:1130,ag:['JDAM']},F5E:{extra:1,tanks:3,tankKg:900,ag:[]},F14B:{extra:0,tanks:2,tankKg:1000,ag:[]},MIG23ML:{extra:1,tanks:2,tankKg:800,ag:['FAB500']},MIG25PD:{extra:0,tanks:0,tankKg:0,ag:[]},J8F:{extra:1,tanks:2,tankKg:900,ag:['LS6']},MIRAGEF1:{extra:1,tanks:2,tankKg:1100,ag:[]},M2000:{extra:2,tanks:3,tankKg:1700,ag:['LS6']},J7G:{extra:1,tanks:2,tankKg:400,ag:['LS6']},J11B:{extra:1,tanks:0,tankKg:0,ag:['YJ91','LS6']},J15:{extra:1,tanks:0,tankKg:0,ag:['YJ91','LS6']},J16:{extra:2,tanks:2,tankKg:1600,ag:['YJ91','LS6']},SU30SM:{extra:2,tanks:2,tankKg:1600,ag:['KH31P','KAB500S','FAB500']}});
const railsOf=(b,re)=>b.cm.stations.filter(st=>re.test(st[2])).length;
function ldDefault(id){const b=effAC0(id);return{sr:b.srN,mr:ldStockMr(id,b),ag:{},tk:0}}
// a stock career jet carries only the basic missile load until Weapon pylons is installed
function ldStockMr(id,b){return careerOn&&!hasMod(id,'ord1')?Math.min(b.mrN,Math.max(2,Math.ceil(b.mrN/2))):b.mrN}
function ldStrike(id){const b=effAC0(id),SL=STRIKE_LOAD[id];if(!SL)return ldDefault(id);const ag={};SL.ag.forEach(([k,n])=>ag[k]=n);return{sr:b.srN,mr:Math.min(b.mrN,SL.keep),ag,tk:0}}
function ldGet(id){try{const v=JSON.parse(localStorage.getItem('vsLd_'+id)||'null');if(v&&typeof v.sr==='number')return v}catch(e){}return strikeRole&&STRIKE_LOAD[id]?ldStrike(id):ldDefault(id)}
function ldSet(id,v){try{localStorage.setItem('vsLd_'+id,JSON.stringify(v))}catch(e){}}
function ldCap(id){const b=effAC0(id),H=JET_HP[id]||{extra:0,tanks:0,tankKg:0,ag:[]},o=!careerOn||hasMod(id,'ord1'),t=!careerOn||hasMod(id,'tnk1');return{sr:railsOf(b,/^r9_/),hp:o?railsOf(b,/^r120_/):ldStockMr(id,b),extra:o?H.extra:0,tanks:t?H.tanks:0,tankKg:H.tankKg,ag:o?H.ag:[]}}
const ldUsed=(v)=>v.mr+Object.entries(v.ag).reduce((a,[k,n])=>a+Math.ceil(n/(AGW[k].perSt||1)),0)+v.tk;
function ldValid(id,v){const c=ldCap(id);return v.sr>=0&&v.sr<=c.sr&&v.mr>=0&&v.mr<=c.hp&&v.tk>=0&&v.tk<=c.tanks&&Object.keys(v.ag).every(k=>c.ag.includes(k)&&v.ag[k]>=0)&&ldUsed(v)<=c.hp+c.extra}
const agStoreMat=new THREE.MeshStandardMaterial({color:0x8a8f7a,roughness:.6,flatShading:true});
function agCount(){return AG.load.reduce((a,l)=>a+l.n,0)}
function agReset(){AG.load=(AC.agList||[]).map(([k,n])=>({k,n,max:n}));AG.tgt=null;AG.w.forEach(w=>{scene.remove(w.m)});AG.w=[];agStores();agSync()}
// hang the stores on the freed rails (and extra stations under the fuselage)
function agStores(){
  const g=playerJet.children[0]; if(!g)return; g.children.filter(o=>/^(ag_|agpy_|tgp_)/.test(o.name)).forEach(o=>g.remove(o));
  const rails=[]; g.traverse(o=>{const m=/^r120_(\d+)/.exec(o.name);if(m)rails.push([+m[1],o])}); rails.sort((a,b)=>a[0]-b[0]);
  g.children.filter(o=>/^tk_/.test(o.name)).forEach(o=>g.remove(o));
  const free=rails.filter(([i])=>i>=AC.mrN).map(([,o])=>o.position.clone());
  const ref=rails.length?rails[0][1].position:new V3(2,-.6,-1), need=AG.load.reduce((a,l)=>a+Math.ceil(l.max/(AGW[l.k].perSt||1)),0)+(AC.tanks||0);
  const cl=new V3(0,ref.y-.45,ref.z+.2); if(free.length<need)free.push(cl);
  for(let k=0;free.length<need;k++){const s=k%2?-1:1;free.push(new V3(s*(Math.abs(ref.x)*.45+.35*(k>>1)),ref.y-.35,ref.z+.6-(k>>1)*1.2))}
  const sc=M2[AC.id]?1:AC.id.startsWith('F16')?1/.75:AC.id.startsWith('SU')?1/1.266:1;
  // tanks take the centreline first, then the heavy stations
  for(let i=0;i<(AC.tanks||0);i++){const p=free.pop();if(!p)break;const geo=new THREE.CylinderGeometry(.38,.38,4.4,10);
    geo.rotateX(Math.PI/2);const m=new THREE.Mesh(geo,tankMat);m.scale.setScalar(sc);m.position.copy(p).add(new V3(0,-.15,0));m.name='tk_'+i;m.visible=!P.tanksGone;g.add(m);
    const nc=new THREE.Mesh(new THREE.SphereGeometry(.38,10,8),tankMat);nc.scale.set(1,1,2.2);nc.position.z=2.2;m.add(nc);const tc=nc.clone();tc.position.z=-2.2;m.add(tc);
    const fin=new THREE.Mesh(new THREE.BoxGeometry(.02,.5,.6),tankMat);fin.position.set(0,.2,-2.3);m.add(fin);agPylon(g,m.position,.38*sc,'agpy_tk'+i)}
  let n=0;
  for(const l of AG.load){const W=AGW[l.k],per=W.perSt||1;for(let i=0;i<l.max;i++){if(i%per===0)n++;const p=free[n-1];if(!p)continue;
    const m=storeMesh(W);m.scale.setScalar(sc);if(i%per===0)agPylon(g,p,W.r*sc*(per>1?1.6:1),'agpy_'+l.k+i);
    m.position.copy(p);if(per>1){m.position.x+=((i%per)%2-.5)*.32;m.position.y-=Math.floor((i%per)/2)*.26}m.name='ag_'+l.k+'_'+i;m.visible=i<l.n;g.add(m)}}}
const tankMat=new THREE.MeshStandardMaterial({color:0x9aa1a8,roughness:.5,metalness:.2});
const pylMat=new THREE.MeshStandardMaterial({color:0x5c636a,roughness:.55,metalness:.25});
// AG stores with their real shapes: bombs with tail kits and strakes, missiles with wings; a pylon above each station
function storeMesh(W){const g=new THREE.Group(),mat=W.kind==='arm'?new THREE.MeshStandardMaterial({color:0xe6e6e0,roughness:.5}):agStoreMat,L=W.len,r=W.r;
  const b=new THREE.Mesh(new THREE.CylinderGeometry(r,r*.92,L*.72,12).rotateX(Math.PI/2),mat);b.position.z=-L*.06;g.add(b);
  const n=new THREE.Mesh(new THREE.SphereGeometry(r,12,8),mat);n.scale.set(1,1,W.kind==='arm'?2.6:1.5);n.position.z=L*.3;g.add(n);
  const tk=new THREE.Mesh(new THREE.CylinderGeometry(r*.92,r*.62,L*.2,10).rotateX(Math.PI/2),mat);tk.position.z=-L*.52;g.add(tk);
  const fs=W.kind==='arm'?r*3.4:r*3,fl=W.kind==='arm'?L*.12:L*.16;
  for(const a of [0,Math.PI/2]){const f=new THREE.Mesh(new THREE.BoxGeometry(fs,.015,fl),mat);f.rotation.z=a+Math.PI/4;f.position.z=-L*.52;g.add(f);
    if(W.kind!=='dumb'){const s=new THREE.Mesh(new THREE.BoxGeometry(W.kind==='arm'?fs*.9:fs*.55,.012,L*.22),mat);s.rotation.z=a+Math.PI/4;s.position.z=W.kind==='arm'?L*.05:-L*.05;g.add(s)}}
  if(W.kind==='gps'&&W.glide>3){const w=new THREE.Mesh(new THREE.BoxGeometry(r*9,.02,L*.18),mat);w.position.set(0,r*.9,0);g.add(w)}
  return g}
function agPylon(g,p,r,name){const S=M2[AC.id];if(!S)return;const top=bellyAt(S,p.z,p.x)+.05,y0=p.y+r;if(top-y0<.08)return;const m=new THREE.Mesh(new THREE.BoxGeometry(.1,top-y0+.05,1.5),pylMat);m.name=name;m.position.set(p.x,(top+y0)/2,p.z);g.add(m)}
function agSync(){const on=AG.load.length>0;$('bAg').hidden=!on;$('bAgN').hidden=!on;if(!on)return;const l=agPick();
  $('bAg').firstChild.nodeValue=l?AGW[l.k].sh:'AG';$('cAg').textContent=l?l.n:0}
const emitting=g=>g&&g.alive&&(g.kind==='sam'||g.kind==='aaa'||g.kind==='radar'||g.kind==='ship')&&!(g.offT>0);
// weapon choice: an anti-radiation missile against an emitter, otherwise a bomb
function agPick(){const t=AG.tgt, arm=AG.load.find(l=>AGW[l.k].kind==='arm'&&l.n>0), bomb=AG.load.find(l=>AGW[l.k].kind!=='arm'&&l.n>0);
  return t&&emitting(t)&&arm?arm:bomb||arm||null}
function agCandidates(){return ground.filter(g=>g.alive&&g.pos.distanceTo(P.pos)<110000).map(g=>{_s1.subVectors(g.pos,P.pos);const d=_s1.length();return{g,d,a:_s1.normalize().angleTo(P.fwd)}}).filter(c=>c.a<1.2).sort((a,b)=>a.d-b.d)}
function agNext(){const c=agCandidates();if(!c.length){AG.tgt=null;message('NO GROUND TARGETS AHEAD',1);return}
  const i=c.findIndex(x=>x.g===AG.tgt);AG.tgt=c[(i+1)%c.length].g;message('TGT · '+agName(AG.tgt),.9);agSync()}
const agName=g=>({sam:'SAM LAUNCHER',aaa:'AAA',radar:'EW RADAR',bunker:'BUNKER',truck:'TRUCK',ship:'FRIGATE'})[g.kind]||'TARGET';
// how far a glide bomb can reach from here (est.): height and speed set the glide footprint
function agReach(W){if(!W.glide)return 0;const agl=Math.max(0,P.pos.y-Math.max(groundH(P.pos.x,P.pos.z),0));return W.glide*agl*(.55+.45*Math.min(P.mach||.8,1.3))+(W.boost||0)+Math.max(0,P.vel.y)*20}
function agInRange(l,t){if(!l||!t)return false;const W=AGW[l.k],d=Math.hypot(t.pos.x-P.pos.x,t.pos.z-P.pos.z);
  if(W.kind==='arm')return emitting(t)&&d<W.maxR&&d>W.minR; if(W.kind==='gps')return d<agReach(W); return false}
// CCIP: integrate a dumb bomb from release to the ground
const _ci=new V3(),_cv=new V3();
function ccip(){_ci.copy(P.pos);_cv.copy(P.vel);for(let i=0;i<600;i++){_cv.y-=G*.05;_cv.multiplyScalar(1-.0004*_cv.length()*.05);_ci.addScaledVector(_cv,.05);if(_ci.y<=Math.max(groundH(_ci.x,_ci.z),0))return _ci}return null}
function agRelease(){
  if(state!=='play'||!P.alive)return; const l=agPick(); if(!l){message('NO STORES',.8);return}
  const W=AGW[l.k], t=AG.tgt;
  if(W.kind==='arm'&&!emitting(t)){message(t?'TARGET NOT EMITTING':'NO TARGET',1);return}
  if(W.kind==='gps'&&!t){message('NO TARGET',1);return}
  const g=playerJet.children[0], st=g.getObjectByName('ag_'+l.k+'_'+(l.max-l.n)); l.n--;
  const p=new V3(); if(st){st.getWorldPosition(p);st.visible=false}else p.copy(P.pos).addScaledVector(P.up,-1.5);
  const m=storeMesh(W); m.position.copy(p); scene.add(m);
  const w={W,m,pos:m.position,vel:P.vel.clone().addScaledVector(P.up,-3),t:0,tgt:t,aim:t?t.pos.clone():null,reach:W.kind==='gps'?agReach(W):0,start:p.clone(),lift:true,err:new V3()};
  if(t&&W.kind==='gps'&&Math.hypot(t.pos.x-P.pos.x,t.pos.z-P.pos.z)>w.reach)w.short=true;
  AG.w.push(w); recEvent('You released '+W.name+(t?' at the '+agName(t).toLowerCase():''));
  message(W.kind==='arm'?'MAGNUM':W.kind==='dumb'?'BOMBS AWAY':'PICKLE · '+W.sh,1); if(W.kind==='arm')sndMsl(); agSync()}
function agDetonate(w){
  const p=w.pos; explode(p.clone().setY(Math.max(p.y,Math.max(groundH(p.x,p.z),0)+2)),w.W.blast>20);
  let hit=false; for(const g of ground){if(!g.alive)continue;const d=g.pos.distanceTo(p);if(d<w.W.blast){g.hp-=d<w.W.blast*.5?20:8;hit=true;if(g.hp<=0)killGround(g)}}
  if(!hit)message(w.short?'MISS · FELL SHORT':'MISS',1); scene.remove(w.m); w.dead=true}
function updateAG(dt){
  if(AG.load.length&&state==='play'){AG.tgtT-=dt;
    if(AG.tgt&&!AG.tgt.alive)AG.tgt=null;
    if(!AG.tgt&&AG.tgtT<=0){AG.tgtT=.5;const c=agCandidates();if(c.length){AG.tgt=c[0].g;agSync()}}}
  for(const w of AG.w){if(w.dead)continue; w.t+=dt; const W=w.W, v=w.vel.length();
    if(W.kind==='arm'){
      if(w.tgt&&emitting(w.tgt))w.aim.copy(w.tgt.pos);
      else if(w.tgt&&!w.lostSet){w.lostSet=true;w.err.set(rand(-70,70),0,rand(-70,70));w.aim.add(w.err)}   // radar went quiet: fly to the last fix
      const thr=w.t<W.burn?W.acc:(W.sus&&w.t<W.burn+W.sus?W.susAcc:0);
      _a.copy(w.vel).normalize(); w.vel.addScaledVector(_a,thr*dt); if(W.vCap&&w.vel.length()>W.vCap)w.vel.setLength(W.vCap);
      w.vel.y-=G*dt; w.vel.multiplyScalar(1-W.cd*v*dt);
      const d=w.pos.distanceTo(w.aim); _b.copy(w.aim); if(d>12000)_b.y+=d*.18;           // loft on long shots
      _b.sub(w.pos).normalize().multiplyScalar(v); _b.sub(w.vel).multiplyScalar(d<4000?5:2.5); const lim=W.gmax*G*(d<4000?1.5:1); if(_b.length()>lim)_b.setLength(lim); _b.y+=G; w.vel.addScaledVector(_b,dt);
      if(Math.random()<.9)puff(w.pos.x,w.pos.y,w.pos.z,rand(-2,2),rand(-2,2),rand(-2,2),.88,.88,.9,.5,3,9,1.4);
      w.pos.addScaledVector(w.vel,dt); w.m.quaternion.setFromUnitVectors(ZF,_a.copy(w.vel).normalize());
      const dn=w.pos.distanceTo(w.aim); if(dn<20||(w.dmin<200&&dn>w.dmin)||w.pos.y<=Math.max(groundH(w.pos.x,w.pos.z),0)||w.t>140){if(dn>w.dmin&&w.dmin<200)w.pos.lerp(w.aim,0);agDetonate(w)} w.dmin=Math.min(w.dmin??1e9,dn)}
    else{
      if(w.tgt&&w.tgt.alive&&W.track)w.aim.copy(w.tgt.pos);
      if(W.kind==='gps'&&w.lift&&w.aim){const dh=Math.hypot(w.pos.x-w.start.x,w.pos.z-w.start.z);
        if(dh>w.reach)w.lift=false;   // out of energy: it stops gliding and falls
        else{_b.subVectors(w.aim,w.pos).normalize().multiplyScalar(Math.max(170,v*.995));_b.sub(w.vel).multiplyScalar(1.6);const lim=3*G;if(_b.length()>lim)_b.setLength(lim);w.vel.addScaledVector(_b,dt);w.vel.y+=G*dt*.92}}
      w.vel.y-=G*dt; w.vel.multiplyScalar(1-.0004*v*dt);
      w.pos.addScaledVector(w.vel,dt); w.m.quaternion.setFromUnitVectors(ZF,_a.copy(w.vel).normalize());
      if(w.pos.y<=Math.max(groundH(w.pos.x,w.pos.z),0)+(w.aim&&w.pos.distanceTo(w.aim)<6?6:0)||w.t>200)agDetonate(w)}}
  AG.w=AG.w.filter(w=>!w.dead)}
$('bAg').addEventListener('pointerdown',e=>{e.preventDefault();audioInit();agRelease()});
$('bAgN').addEventListener('pointerdown',e=>{e.preventDefault();agNext()});
function drawAGHud(c){
  if(!AG.load.length||state!=='play')return; const l=agPick(), t=AG.tgt;
  if(t){const p=proj(_d.copy(t.pos).setY(t.pos.y+3)); const d=t.pos.distanceTo(P.pos), inR=agInRange(l,t);
    if(p.ok){c.strokeStyle=inR?HUD:WARN;c.lineWidth=1.5;c.strokeRect(p.x-9,p.y-9,18,18);c.beginPath();c.moveTo(p.x-14,p.y);c.lineTo(p.x-9,p.y);c.moveTo(p.x+9,p.y);c.lineTo(p.x+14,p.y);c.stroke();
      txt(c,(emitting(t)?'◆ ':'')+agName(t),p.x,p.y-18,'center',inR?HUD:WARN,10,700)}
    const Wp=l&&AGW[l.k], rng=Wp?(Wp.kind==='arm'?Wp.maxR:Wp.kind==='gps'?agReach(Wp):0):0;
    txt(c,'TGT '+agName(t)+' · '+(d/1000).toFixed(1)+' KM'+(l?' · '+AGW[l.k].sh+(Wp.kind==='dumb'?' · CCIP':inR?' · IN RNG':' · RNG '+(rng/1000).toFixed(0)+' KM'):''),W/2,H*.82,'center',inR?HUD:WARN,12,700)}
  if(l&&AGW[l.k].kind==='dumb'){const ip=ccip();if(ip){const q=proj(ip);if(q.ok){c.strokeStyle=HUD;c.lineWidth=1.5;c.beginPath();c.arc(q.x,q.y,7,0,Math.PI*2);c.stroke();c.fillStyle=HUD;c.fillRect(q.x-1,q.y-1,2,2);
    const fpm=proj(_e.copy(P.pos).addScaledVector(P.vel,3));if(fpm.ok){c.beginPath();c.moveTo(fpm.x,fpm.y);c.lineTo(q.x,q.y);c.stroke()}}}}}

/* ---------------- aircraft carrier: catapult (CATOBAR) or ski-jump (STOBAR) launch, angled deck, 4 arresting wires, optical landing aid ----------------
   ship-local frame: +z bow, +x port. Flight deck 20 m above the sea; the angled landing area is 9° to port. Steams at 6 m/s (12 kt) on a track
   through the widest open water near the base, turning around at each end when you're not around. */
const CV={obj:null,pos:new V3(),vel:new V3(),psi:Math.PI/2,c:new V3(-13600,0,10600),sAlong:0,dir:1,spd:6,kind:'CATOBAR',DECK:20,
  L0:new THREE.Vector2(6,-158),U:new THREE.Vector2(Math.sin(9*Math.PI/180),Math.cos(9*Math.PI/180)),WIRES:[50,62,74,86],TD:72,parts:{}};
function buildCarrier(){const g=new THREE.Group(),P_={};
  const hullM=new THREE.MeshLambertMaterial({color:0x7d848c}),deckM=new THREE.MeshLambertMaterial({color:0x3b3f44}),wm=new THREE.MeshBasicMaterial({color:0xe8e8e0}),ym=new THREE.MeshBasicMaterial({color:0xd8c040});
  const hull=new THREE.Mesh(new THREE.BoxGeometry(40,19,300),hullM);hull.position.set(0,9.5,-10);g.add(hull);
  const bow=new THREE.Mesh(new THREE.CylinderGeometry(0,20,40,4,1).rotateX(Math.PI/2).rotateZ(Math.PI/4),hullM);bow.scale.set(1,.68,1);bow.position.set(0,12,158);g.add(bow);
  const deck=new THREE.Mesh(new THREE.BoxGeometry(76,1,330),deckM);deck.position.set(0,19.5,0);g.add(deck);
  const line=(x0,z0,x1,z1,w,mat,y)=>{const L=Math.hypot(x1-x0,z1-z0),m=new THREE.Mesh(new THREE.BoxGeometry(w,.1,L),mat);m.position.set((x0+x1)/2,20.06+(y||0),(z0+z1)/2);m.rotation.y=Math.atan2(x1-x0,z1-z0);g.add(m);return m};
  const at=s=>[CV.L0.x+CV.U.x*s,CV.L0.y+CV.U.y*s], n=[CV.U.y,-CV.U.x];
  for(let s=10;s<230;s+=14){const a=at(s),b=at(s+7);line(a[0],a[1],b[0],b[1],.5,wm)}                                   // landing centreline
  for(const o of [-12,12]){const a=at(0),b=at(235);line(a[0]+n[0]*o,a[1]+n[1]*o,b[0]+n[0]*o,b[1]+n[1]*o,.4,ym)}       // landing area edges
  for(const w of CV.WIRES){const a=at(w);line(a[0]-n[0]*12,a[1]-n[1]*12,a[0]+n[0]*12,a[1]+n[1]*12,.18,new THREE.MeshBasicMaterial({color:0x222222}),.1)}
  const isl=new THREE.Mesh(new THREE.BoxGeometry(10,20,38),hullM);isl.position.set(-31,30,30);g.add(isl);
  const mast=new THREE.Mesh(new THREE.CylinderGeometry(.6,.9,14,6),hullM);mast.position.set(-31,47,34);g.add(mast);
  const lens=new THREE.Mesh(new THREE.BoxGeometry(1.2,2.2,.6),new THREE.MeshBasicMaterial({color:0xffb030}));lens.position.set(37,21.5,-40);g.add(lens);
  const cats=new THREE.Group();
  for(const x of [-12,-2]){const m=new THREE.Mesh(new THREE.BoxGeometry(.35,.1,95),wm);m.position.set(x,20.07,52);cats.add(m)} g.add(cats);P_.cats=cats;
  // ski-jump ramp: 45 m long, rising to ~6 m with a ~12° exit
  const sh=new THREE.Shape();sh.moveTo(120,0);for(let i=1;i<=10;i++){const z=120+i*4.5;sh.lineTo(z,CV_ramp(z))}sh.lineTo(165,0);sh.lineTo(120,0);
  const rg=new THREE.ExtrudeGeometry(sh,{depth:44,bevelEnabled:false});rg.rotateY(-Math.PI/2);rg.translate(22,20,0);const ramp=new THREE.Mesh(rg,deckM);g.add(ramp);P_.ramp=ramp;
  g.userData.parts=P_;return g}
function CV_ramp(lz){return lz<=120?0:6*Math.pow(Math.min(1,(lz-120)/45),1.6)}
const _cvq=new THREE.Quaternion(),_cvv=new V3();
function cvLocalToWorld(lx,ly,lz,out){return out.set(lx,ly,lz).applyAxisAngle(UP,CV.psi).add(CV.pos)}
function cvWorldToLocal(p,out){return out.copy(p).sub(CV.pos).applyAxisAngle(UP,-CV.psi)}
function cvDeckY(lz){return CV.DECK+(CV.kind==='STOBAR'?CV_ramp(lz):0)}
function initCarrier(){if(!CV.obj){CV.obj=buildCarrier();scene.add(CV.obj)}CV.kind=AC.carrier||'CATOBAR';const p=CV.obj.userData.parts;p.cats.visible=CV.kind==='CATOBAR';p.ramp.visible=CV.kind==='STOBAR';CV.sAlong=-800;CV.dir=1;updateCarrier(0)}
function updateCarrier(dt){
  if(!CV.obj)return; const far=P.pos.distanceTo(CV.pos)>9000&&!P.onDeck;
  CV.sAlong+=CV.dir*CV.spd*dt; if((CV.sAlong>1400&&CV.dir>0&&(far||CV.sAlong>1700))||(CV.sAlong<-1400&&CV.dir<0&&(far||CV.sAlong<-1700)))CV.dir*=-1;
  const base=0.35; CV.psi=CV.dir>0?base:base+Math.PI;   // track runs along this bearing through the open water
  CV.pos.set(CV.c.x+Math.sin(base)*CV.sAlong,0,CV.c.z+Math.cos(base)*CV.sAlong); CV.vel.set(Math.sin(CV.psi),0,Math.cos(CV.psi)).multiplyScalar(CV.spd);
  CV.obj.position.copy(CV.pos); CV.obj.rotation.y=CV.psi}
// ---- on deck
const DK={lx:0,lz:0,h:0,v:0,mode:'',t:0,pitch:0};
function cvSpot(){ // launch position: catapult 1 on the bow, or the long take-off position for the ski-jump
  if(CV.kind==='CATOBAR'){DK.lx=-12;DK.lz=6;DK.mode='cat'}else{DK.lx=-4;DK.lz=-35;DK.mode='ski'} DK.h=0;DK.v=0;DK.t=0;DK.pitch=0;
  message(CV.kind==='CATOBAR'?'ON CAT 1 · MIL OR AB TO LAUNCH':'ON THE DECK · FULL AB TO ROLL',3)}
function placeOnCarrier(){initCarrier();P.onGround=true;P.onDeck=true;P.serviced=true;P.scramble=true;P.scrT=0;setGear(true);throttle=0;setThr(0);cvSpot();deckPose();qPrev.copy(playerJet.quaternion);camSnap=true}
function deckPose(){
  const y=cvDeckY(DK.lz)+GEAR_H; cvLocalToWorld(DK.lx,y,DK.lz,P.pos);
  const sl=CV.kind==='STOBAR'&&DK.lz>120?Math.atan((CV_ramp(DK.lz+.5)-CV_ramp(DK.lz-.5))):0; DK.pitch=sl;
  playerJet.quaternion.setFromAxisAngle(UP,CV.psi+DK.h); _cvq.setFromAxisAngle(_cvv.set(1,0,0),-sl); playerJet.quaternion.multiply(_cvq); axes(P);
  P.vel.copy(CV.vel).addScaledVector(P.fwd,DK.v)}
function deckRoll(dt,rollIn){
  const A=AC, at=atm(CV.DECK), air=DK.v+CV.spd, MS=P.mass||A.MASS, qd=.5*at.rho*air*air;
  const T=thrust(A,throttle,at.sig,air/at.a,CV.DECK)*(P.thrK??1); P.lastT=T; const D=qd*A.S*(cd0(air/at.a,A)*A.cdK+(P.xcd||0));
  DK.t+=dt; P.n=1; P.qd=qd; P.mach=air/at.a; P.kcas=air*Math.sqrt(at.sig)*1.944; P.nAero=qd*A.S*A.CLMAX/(MS*G);
  if(DK.mode==='cat'){if(throttle>=.79){DK.hold=(DK.hold||0)+dt;if(DK.hold>1.8){DK.mode='shot';message('CAT SHOT',1)}}else DK.hold=0}
  else if(DK.mode==='shot'){DK.v=Math.min(DK.v+(75*75/(2*94))*dt,75-CV.spd+2)}
  else if(DK.mode==='ski'){if(throttle>=.79){DK.hold=(DK.hold||0)+dt;if(DK.hold>1.5){DK.mode='roll';message('ROLLING · STAY ON THE CENTRELINE',1.2)}}else DK.hold=0}
  else if(DK.mode==='trap'){DK.v=Math.max(0,DK.v-Math.max(4,DK.v*DK.v/(2*Math.max(8,DK.trapLeft))*1)*dt);DK.trapLeft-=DK.v*dt;if(DK.v<=.3){DK.v=0;DK.mode='stop';DK.t=0}}
  else if(DK.mode==='stop'){DK.v=0;if(DK.t>4&&!P.serviced){P.serviced=true;P.fuel=AC.fuelCap;P.hp=100;resetSystems();rearm();CM.flares=cmFlares();CM.chaff=cmChaff();syncCM();message('REARMED · REFUELED',2)}
    if(DK.t>6.5){P.serviced=true;cvSpot()}}
  if(DK.mode==='roll'){DK.v=Math.max(0,DK.v+((T-D)/MS-(brake?.42:.03)*G)*dt);DK.h-=rollIn*.25*clamp(DK.v/15,0,1)*dt*(DK.v>2?1:0)}
  DK.lz+=Math.cos(DK.h)*DK.v*dt; DK.lx+=Math.sin(DK.h)*DK.v*dt; deckPose();
  // leaving the deck: off the bow / ramp / angled-deck edge
  const off=DK.lz>165||Math.abs(DK.lx)>38||DK.lz<-165||(DK.mode==='shot'&&DK.lz>100);
  if(off){P.onGround=false;P.onDeck=false;P.airT=0;P.pos.y+=.3;
    if(DK.mode==='shot'){P.vel.y+=2.5;message('AIRBORNE · GEAR UP',1.4)}
    else if(CV.kind==='STOBAR'&&DK.lz>165)message('OFF THE RAMP · GEAR UP',1.4);
    DK.mode=''}}
// ---- touchdown on the deck: trap, bolter, ramp strike
function cvContact(){
  if(!CV.obj||P.onGround)return false; const L=cvWorldToLocal(P.pos,_cvv);
  if(Math.abs(L.x)>40||Math.abs(L.z)>170)return false;
  const dy=L.y-(cvDeckY(L.z)+GEAR_H);
  if(dy>0)return false;
  if(L.y<CV.DECK-1&&L.y>0){die('collision');return true}                       // into the side of the ship
  const sink=-(P.vel.y), dx=L.x-CV.L0.x, dz=L.z-CV.L0.y, sAl=dx*CV.U.x+dz*CV.U.y, lat=dx*CV.U.y-dz*CV.U.x;
  if(!P.gear){die('gearup');return true} if(sink>7.5||Math.abs(bankOf(P))>.3){die('landing');return true}
  if(sAl<0){die('landing');recEvent('Ramp strike');return true}
  P.onGround=true;P.onDeck=true;P.serviced=false; const rv=_s1.subVectors(P.vel,CV.vel); _s2.set(Math.sin(CV.psi),0,Math.cos(CV.psi));
  DK.lx=L.x;DK.lz=L.z;DK.h=Math.atan2(rv.x,rv.z)-CV.psi;DK.v=Math.max(0,rv.dot(_s2));DK.t=0;
  const ball=CV.lastBall??0;
  if(AC.carrier&&sAl>40&&sAl<92&&Math.abs(lat)<12){const wi=CV.WIRES.findIndex(w=>w>=sAl-3);const wire=wi<0?4:wi+1;DK.mode='trap';DK.trapLeft=95;
    const grade=wire===3&&Math.abs(ball)<.35&&!CV.waved?'OK':(wire===2||wire===4)&&Math.abs(ball)<.7?'FAIR':CV.waved?'WAVE-OFF IGNORED':'NO GRADE';
    message('TRAP · '+wire+' WIRE · '+grade,2.6);recEvent('Trapped on the '+wire+' wire ('+grade+'), sink '+sink.toFixed(1)+' m/s');buzz([60,40,60])}
  else{DK.mode='roll';message(AC.carrier?'BOLTER · BOLTER · POWER UP':'TOUCH AND GO · NO HOOK',2);recEvent(AC.carrier?'Boltered':'Touch-and-go on the carrier')}
  CV.waved=false; return true}
// ---- optical landing aid ("meatball" / Luna), lineup, on-speed, LSO calls
function cvApproach(){
  if(!CV.obj||P.onDeck||!P.gear)return null;
  const td=cvLocalToWorld(CV.L0.x+CV.U.x*CV.TD,cvDeckY(0),CV.L0.y+CV.U.y*CV.TD,_s3.set(0,0,0)).clone();
  const uw=new V3(CV.U.x,0,CV.U.y).applyAxisAngle(UP,CV.psi), nw=new V3(CV.U.y,0,-CV.U.x).applyAxisAngle(UP,CV.psi);
  const r=new V3().subVectors(P.pos,td), dist=-r.dot(uw), lat=r.dot(nw), h=P.pos.y-td.y;
  if(dist<-50||dist>9000)return null;
  const ang=Math.atan2(h,Math.max(1,dist))*57.3, dev=ang-3.5; CV.lastBall=dev;
  return {dist,lat,h,dev,spd:P.kcas-(AC.vApp||140)}}
function cvLSO(a){
  if(!a||state!=='play')return;
  if(a.dist<2600&&a.dist>150){
    if(a.dist<550&&(a.dev<-1.0||a.dev>1.5||Math.abs(a.lat)>14||a.spd>25)){if(!CV.waved){CV.waved=true;say('waveoff',4);message('WAVE OFF · WAVE OFF',1.6)}}
    else if(a.dev<-.45)say('power',2.4); else if(a.dev>.6)say('high',3); else if(a.lat>8)say('right',3); else if(a.lat<-8)say('left',3)}
  if(a.dist>2600)CV.waved=false}
function drawCarrierHud(c){
  if(!CV.obj||state!=='play')return;
  const a=cvApproach(); cvLSO(a);
  if(!P.onDeck){const sp=cvLocalToWorld(0,22,0,_s3.set(0,0,0)), q=proj(sp), d=P.pos.distanceTo(CV.pos);
    if(q.ok&&(AC.carrier||d<15000)){c.strokeStyle='#6fb7ff';c.lineWidth=1.5;c.beginPath();c.moveTo(q.x,q.y-8);c.lineTo(q.x+8,q.y);c.lineTo(q.x,q.y+8);c.lineTo(q.x-8,q.y);c.closePath();c.stroke();
      txt(c,(CV.kind==='CATOBAR'?'CVN ':'CV ')+(d/1000).toFixed(1),q.x,q.y-16,'center','#6fb7ff',10,700)}}
  if(a&&a.dist<7000){const x0=W*.17,y0=H*.42,cell=10, by=clamp(-a.dev/.18,-6,6)*cell;
    c.fillStyle='rgba(0,0,0,.35)';c.fillRect(x0-48,y0-78,96,156);
    c.fillStyle='#3cff6a';for(const sx of [-1,1])for(let i=1;i<=4;i++)c.fillRect(x0+sx*(10+i*7)-3,y0-1.5,6,3);
    c.fillStyle=a.dev<-1?'#ff3b30':'#ffb030';c.beginPath();c.arc(x0,y0+by,6,0,Math.PI*2);c.fill();
    const lx=clamp(a.lat/2,-40,40);c.strokeStyle='#fff';c.beginPath();c.moveTo(x0-lx,y0+60);c.lineTo(x0-lx,y0+70);c.stroke();c.strokeStyle='rgba(255,255,255,.4)';c.beginPath();c.moveTo(x0-44,y0+65);c.lineTo(x0+44,y0+65);c.stroke();
    txt(c,'BALL',x0,y0-68,'center','#ffb030',10,700);
    txt(c,Math.abs(a.spd)<7?'ON SPEED':a.spd>0?'FAST +'+Math.round(a.spd):'SLOW '+Math.round(a.spd),x0,y0+50,'center',Math.abs(a.spd)<7?HUD:WARN,10,700);
    txt(c,(a.dist/1000).toFixed(1)+' KM · '+(Math.abs(a.lat)<4?'LINED UP':a.lat>0?'COME RIGHT':'COME LEFT'),x0,y0-56,'center',HUD,9,700);
    if(CV.waved&&(clock*3%1)<.6){c.strokeStyle='#ff3b30';c.lineWidth=2;c.strokeRect(W/2-80,H*.55-16,160,32);txt(c,'WAVE OFF',W/2,H*.55,'center','#ff3b30',16,700);c.lineWidth=1.5}}
  if(P.onDeck){const m=DK.mode;txt(c,m==='cat'?'CAT 1 · '+(throttle>=.79?'LAUNCH IN '+Math.max(0,1.8-(DK.hold||0)).toFixed(1):'THROTTLE TO MIL OR AB'):m==='ski'?(throttle>=.79?'BRAKES OFF IN '+Math.max(0,1.5-(DK.hold||0)).toFixed(1):'FULL AFTERBURNER, THEN ROLL'):m==='trap'?'ARRESTED':m==='stop'?(P.serviced?'RESPOTTING':'REARMING · '+Math.max(0,4-DK.t).toFixed(0)):m==='roll'?Math.round(P.kcas)+' KT':'',W/2,H*.82,'center',HUD,12,700)}}

/* ---------------- AWACS / GCI: picture calls, BRAA, threat warnings, commit, splash, home plate ----------------
   BRAA = bearing, range (nm), altitude (thousands of ft), aspect (hot / flank / beam / cold) from your jet */
const GCI={t:0,threatT:0,commitT:0,known:new Set(),lastSay:0,lines:[]};
const brg=(dx,dz)=>{let b=Math.round((Math.atan2(-dx,dz)*180/Math.PI+360)%360);return b===0?360:b};
const pad3=b=>String(b).padStart(3,'0');
function myCall(){const m=/Callsign ([^·]+)$/.exec(AC.eyebrow||'');return (m?m[1]:'Viper 1').trim()}
function gciName(){return /^(MIG|SU)/.test(AC.id)?'Granit':/^J/.test(AC.id)?'Shenying':'Magic'}
function aspect(e){_s1.subVectors(P.pos,e.pos).normalize();const a=Math.acos(clamp(_s1.dot(_s2.copy(e.vel).normalize()),-1,1))*57.3;return a<30?'hot':a<70?'flanking':a<110?'beam':'cold'}
function braa(e){const dx=e.pos.x-P.pos.x,dz=e.pos.z-P.pos.z,d=Math.hypot(dx,dz)/1852;return 'BRAA '+pad3(brg(dx,dz))+', '+Math.round(d)+', angels '+Math.max(1,Math.round(e.pos.y*3.281/1000))+', '+aspect(e)}
// groups: bandits within 5 km of each other are one group
function groups(){const gs=[];for(const e of enemies){if(!e.alive)continue;let g=gs.find(g=>g.lead.pos.distanceTo(e.pos)<5000);if(g)g.n++;else gs.push({lead:e,n:1})}return gs.sort((a,b)=>a.lead.pos.distanceTo(P.pos)-b.lead.pos.distanceTo(P.pos))}
function radio(text,who){const from=who==='wing'?'':who==='lso'?'Paddles: ':gciName()+': ';GCI.lines.push({t:clock,text:from+text});if(GCI.lines.length>3)GCI.lines.shift();
  if(!VOICE.on||!A.on||typeof speechSynthesis==='undefined')return; const now=performance.now(); if(now-GCI.lastSay<600&&who!=='gci!')return; GCI.lastSay=now;
  try{const u=new SpeechSynthesisUtterance(text.replace(/BRAA/g,'bra').replace(/(\d)(\d)(\d),/g,'$1 $2 $3,'));u.rate=1.2;u.pitch=who==='wing'?.95:.8;u.volume=.9;if(VOICE.en)u.voice=VOICE.en;speechSynthesis.speak(u)}catch(e){}}
function gciPicture(){setTimeout(()=>{if(state!=='play')return;const gs=groups();if(!gs.length){radio(myCall()+', picture clean.');return}
  radio(myCall()+', picture, '+gs.length+' group'+(gs.length>1?'s':'')+'. Lead group '+braa(gs[0].lead)+', hostile'+(gs[0].n>1?', '+gs[0].n+' contacts':'')+'.');gs.forEach(g=>GCI.known.add(g.lead.id))},2500)}
function gciBogeyDope(){const gs=groups();if(!gs.length){radio(myCall()+', clean.');return}const g=gs[0];radio(myCall()+', single group '+braa(g.lead)+', hostile.')}
function updateGCI(dt){
  if(state!=='play'||mission==='ONLINE'||mission==='TRAINING'||!P.alive)return; GCI.threatT-=dt;GCI.commitT-=dt;GCI.t-=dt;
  const gs=groups();
  for(const g of gs)if(!GCI.known.has(g.lead.id)){GCI.known.add(g.lead.id);radio(myCall()+', new group '+braa(g.lead)+', hostile'+(g.n>1?', '+g.n+' contacts':'')+'.');break}
  // threat: a bandit inside 10 nm in your rear quarter pointing at you
  if(GCI.threatT<=0)for(const e of enemies){if(!e.alive||e.remote)continue;const d=e.pos.distanceTo(P.pos);_s1.subVectors(e.pos,P.pos).normalize();
    if(d<18000&&_s1.dot(P.fwd)<-.2&&aspect(e)==='hot'){radio(myCall()+', threat, '+braa(e)+'!','gci!');GCI.threatT=14;break}}
  if(GCI.commitT<=0&&gs.length&&gs[0].lead.pos.distanceTo(P.pos)<75000&&!gs[0].committed){gs[0].committed=true;gs[0].lead.gciCommit=true;radio(myCall()+', commit, commit, '+braa(gs[0].lead)+'.');GCI.commitT=30}
  if(P.bingo&&!GCI.rtb){GCI.rtb=true;const dx=-P.pos.x,dz=-P.pos.z;radio(myCall()+', home plate '+pad3(brg(dx,dz))+' for '+Math.round(Math.hypot(dx,dz)/1852)+'.')}}
function gciSplash(){if(mission!=='ONLINE'&&mission!=='TRAINING'&&Math.random()<.8)setTimeout(()=>radio(myCall()+', '+gciName()+' copies splash.'),900)}
function drawRadioLines(c){const now=clock;GCI.lines=GCI.lines.filter(l=>now-l.t<7);let y=TGP.rect?TGP.rect.y+TGP.rect.size+16:H*.17;c.font=`700 11px ${FONT}`;for(const l of GCI.lines){const words=l.text.toUpperCase().split(' ');let line='';for(const w of words){const t=line?line+' '+w:w;if(c.measureText(t).width>W-24&&line){txt(c,line,W/2,y,'center','#9fd3ff',11,700);y+=14;line=w}else line=t}if(line){txt(c,line,W/2,y,'center','#9fd3ff',11,700);y+=15}}}

/* ---------------- ejection and combat search-and-rescue ----------------
   zero-zero seat: fine on the runway, but not inverted near the ground or diving hard at low level; very high speed hurts */
let chute=null;
function buildChute(){const g=new THREE.Group();const seat=new THREE.Mesh(new THREE.BoxGeometry(.7,1.1,.7),new THREE.MeshLambertMaterial({color:0x3a3f36}));g.add(seat);
  const can=new THREE.Mesh(new THREE.SphereGeometry(4.2,12,6,0,Math.PI*2,0,Math.PI/2),new THREE.MeshLambertMaterial({color:0xf08a24,side:THREE.DoubleSide}));can.position.y=7;can.visible=false;can.name='can';g.add(can);
  const lm=new THREE.LineBasicMaterial({color:0xdddddd});for(let i=0;i<6;i++){const a=i/6*Math.PI*2,gg=new THREE.BufferGeometry().setFromPoints([new V3(0,.5,0),new V3(Math.cos(a)*4,7,Math.sin(a)*4)]);const l=new THREE.Line(gg,lm);l.name='ln';l.visible=false;g.add(l)}
  return g}
function ejectOK(){return state==='play'&&P.alive}
function eject(){
  if(!ejectOK())return; const gh=Math.max(groundH(P.pos.x,P.pos.z),0), agl=P.pos.y-gh, inv=Math.abs(bankOf(P))>2.2;
  if(agl<70&&(inv||P.vel.y<-45)&&!P.onGround){message('EJECTION OUTSIDE THE ENVELOPE',2);die('terrain');return}
  const fast=P.kcas>650; P.ejected={t:0,fast}; P.rescued=false;
  if(!chute){chute=buildChute();scene.add(chute)} chute.visible=true; chute.position.copy(P.pos); chute.getObjectByName('can').visible=false; chute.children.forEach(o=>{if(o.name==='ln')o.visible=false});
  P.ejVel=P.vel.clone().multiplyScalar(.35).addScaledVector(P.up,28);
  P.jetGhost={pos:P.pos.clone(),vel:P.vel.clone(),t:0};
  sndNoise(.4,1800,.6,'highpass'); buzz([200]); recEvent('Ejected at '+Math.round(P.kcas)+' kt, '+Math.round(agl*3.281)+' ft');
  die('ejected')}
function updateEject(dt){
  if(!P.ejected)return; const e=P.ejected; e.t+=dt;
  if(P.jetGhost&&P.jetGhost.t>=0){const j=P.jetGhost;j.t+=dt;j.vel.y-=G*dt*.5;j.pos.addScaledVector(j.vel,dt);
    if(j.t>3.5||j.pos.y<Math.max(groundH(j.pos.x,j.pos.z),0)+2){explode(j.pos,true);j.t=-1}}
  if(!chute)return; const v=P.ejVel; if(e.t>1.6){chute.getObjectByName('can').visible=true;chute.children.forEach(o=>{if(o.name==='ln')o.visible=true});v.multiplyScalar(Math.exp(-dt*2.5));v.y=Math.max(v.y-G*dt,-6.5)}else v.y-=G*dt;
  v.x+=WIND.x*dt*.3;v.z+=WIND.z*dt*.3; chute.position.addScaledVector(v,dt);
  const gh=Math.max(groundH(chute.position.x,chute.position.z),0); if(chute.position.y<gh+.5){chute.position.y=gh+.5;v.set(0,0,0);if(!e.down){e.down=true;csar()}}
  if(e.t>6.6&&!e.down){e.down=true;csar()}
  P.pos.copy(chute.position)}
// rescue: helicopters come for you; close to SAMs or enemy fighters it can go wrong
function csar(){const p=chute.position, sea=groundH(p.x,p.z)<0;
  let hostile=0;for(const g of ground)if(g.alive&&g.pos.distanceTo(p)<12000)hostile++;for(const e of enemies)if(e.alive&&!e.remote&&e.pos.distanceTo(p)<15000)hostile++;
  P.rescued=Math.random()<(hostile?Math.max(.35,.85-hostile*.15):.97);
  P.rescueText=P.rescued?(sea?'Picked out of the water by the rescue helicopter':'Picked up by the CSAR helicopter')+(hostile?' under fire':'')+(P.ejected.fast?' · injured in a high-speed ejection':''):'Captured before the rescue helicopter could reach you';
  message(P.rescued?'RESCUE INBOUND':'CSAR ABORTED',2)}
$('bEject').addEventListener('click',()=>{if(!$('bEject').dataset.armed){$('bEject').dataset.armed='1';$('bEject').textContent='PULL AGAIN';setTimeout(()=>{delete $('bEject').dataset.armed;$('bEject').textContent='EJECT'},1600);return}eject()});
function syncEjectBtn(){const show=state==='play'&&P.alive&&(P.hp<45||P.flamedOut||(P.sys&&(P.sys.eng.some(v=>v===1)||P.sys.hyd))||P.fuel<=0);if($('bEject').hidden===show)$('bEject').hidden=!show}

/* ---------------- sortie builders shared by the stand-alone missions and the campaign ---------------- */
let sortie=null;   // {kind, ...} what this flight has to do
function landPath(cx,cz,len){let best=null;for(let k=0;k<16;k++){const a=k/16*Math.PI*2,dx=Math.sin(a),dz=Math.cos(a);let L=0;
    for(let d=0;d<=len;d+=150){const x=cx+dx*d,z=cz+dz*d;if(groundH(x,z)<4||Math.hypot(x*1.6,z)<5200)break;L=d}
    if(!best||L>best.len)best={a:new V3(cx,0,cz),b:new V3(cx+dx*L,0,cz+dz*L),len:L}}return best}
function findLand(cx,cz){for(let r=0;r<12000;r+=500)for(let k=0;k<12;k++){const x=cx+Math.cos(k*.52)*r,z=cz+Math.sin(k*.52)*r;if(groundH(x,z)>12&&groundH(x,z)<300)return [x,z]}return [cx,cz]}
function setupConvoy(cx,cz){const [x,z]=findLand(cx,cz);const p=landPath(x,z,9000);const kinds=['aaa','truck','truck','truck','truck','truck'];
  kinds.forEach((k,i)=>{const g=spawnGround(k,x,z,k==='truck');g.path=p;g.spd=11;g.s=-i*70});
  sortie={kind:'CONVOY',need:4,center:new V3(x,0,z)}; return p}
function setupShip(){const g=spawnGround('ship',19600,21200,true);g.orbit={c:new V3(19600,0,21200),r:900,a:Math.random()*6.28};g.spd=7;sortie={kind:'SHIP',center:g.pos}}
function setupCruise(){sortie={kind:'CRUISE',left:6,t:0,second:false};for(const x of [-6000,0,6000])spawnCruise(new V3(x,400,58000),new V3(x*.1,60,0))}
function setupCAP(cz,n){for(let i=0;i<n;i+=2)spawnPair(pickBanditType(),new V3(rand(-6000,6000),rand(5000,8000),cz+rand(-3000,3000)),new V3(0,5000,0));sortie={kind:'CAP'}}
function sortieStatus(){if(!sortie)return'';const left=ground.filter(g=>g.objective&&g.alive).length;
  return sortie.kind==='GROUNDWAR'?warStatus():sortie.kind==='CONVOY'?'TRUCKS LEFT '+ground.filter(g=>g.kind==='truck'&&g.alive).length:sortie.kind==='SHIP'?'FRIGATE '+(left?'AFLOAT':'SUNK'):sortie.kind==='CRUISE'?'CRUISE MISSILES '+(enemies.filter(e=>e.kind==='cruise').length+(sortie.second?0:3)):sortie.kind==='STRIKE'?'TARGETS LEFT '+left:'BANDITS '+enemies.length}
function sortieCheck(dt){if(!sortie)return;const k=sortie.kind;
  if(k==='GROUNDWAR'){warCheck(dt);return}
  if(k==='CONVOY'){const tr=ground.filter(g=>g.kind==='truck');const dead=tr.filter(g=>!g.alive).length;if(dead>=sortie.need)endMission(true,'Convoy stopped');else if(tr.some(g=>g.alive&&g.s>=g.path.len))endMission(false,'The convoy got through')}
  else if(k==='SHIP'||k==='STRIKE'){if(!ground.some(g=>g.objective&&g.alive))endMission(true,k==='SHIP'?'Frigate sunk':'Target area destroyed')}
  else if(k==='CRUISE'){sortie.t+=dt;if(!sortie.second&&sortie.t>40){sortie.second=true;for(const x of [-3000,3000,9000])spawnCruise(new V3(x,400,60000),new V3(x*.1,60,0));radio(myCall()+', second salvo, '+braa(enemies[enemies.length-1])+'.')}
    if(enemies.some(e=>e.kind==='cruise'&&e.alive&&Math.hypot(e.pos.x,e.pos.z)<1500))endMission(false,'A cruise missile hit the base');else if(sortie.second&&!enemies.some(e=>e.kind==='cruise'))endMission(true,'All cruise missiles intercepted')}
  else if(k==='CAP'){if(!enemies.length)endMission(true,'Airspace clear')}}
/* ---------------- dynamic campaign: six sectors north of the base, a moving front, and losses that stay lost ---------------- */
const SECTORS=['Aster Valley','Brimstone Ridge','Cobalt Lakes','Drover Gap','Ember Coast','Falcon Plateau'];
const CAMP_SORTIES={CAP:'Combat air patrol',STRIKE:'Strike the sector HQ',CONVOY:'Hit the supply convoy',ANTISHIP:'Sink the frigate',CRUISE:'Defend against cruise missiles'};
let camp=null, campSortie='CAP', campNote='';
function campNew(){return{front:2,str:[0,0,100,100,100,100],dead:{},sorties:0,wins:0,log:[]}}
function campLoad(){try{const c=JSON.parse(localStorage.getItem('vsCampaign')||'null');if(c&&c.str)return c}catch(e){}return campNew()}
function campSave(){try{localStorage.setItem('vsCampaign',JSON.stringify(camp))}catch(e){}}
camp=campLoad(); try{campSortie=localStorage.getItem('vsCampSortie')||'CAP'}catch(e){}
const secZ=i=>8000+i*14000;
function setupCampaign(){
  const f=Math.min(camp.front,5), cz=secZ(f), cx=rand(-5000,5000); P.pos.set(0,6000,Math.max(0,cz-34000)); P.vel.set(0,0,240);
  const k=campSortie;
  if(k==='CAP'){setupCAP(cz,f>=4?6:4)}
  else if(k==='STRIKE'){const slots=[['radar',0,1500],['bunker',-600,600],['bunker',700,900],['sam',-3500,-2500],['sam',3800,-1500]];if((camp.dead[f]||[]).length>=slots.length)camp.dead[f]=[];const dead=camp.dead[f]||[];
    slots.forEach(([kind,dx,dz],i)=>{if(dead.includes(i))return;const g=spawnGround(kind,cx+dx,cz+dz,true);g.campSlot=i;g.campSec=f});
    spawnGround('aaa',cx-400,cz-300);spawnGround('aaa',cx+500,cz+200);spawnPair(pickBanditType(),new V3(cx-6000,8000,cz+12000),new V3(0,6000,0));sortie={kind:'STRIKE'}}
  else if(k==='CONVOY'){setupConvoy(cx,cz);spawnPair(pickBanditType(),new V3(cx,7000,cz+15000),new V3(0,5000,0))}
  else if(k==='ANTISHIP'){setupShip();spawnPair(pickBanditType(),new V3(19600,7000,36000),new V3(0,5000,0))}
  else if(k==='CRUISE'){P.pos.set(0,5000,6000);setupCruise()}
  if(f>=3)spawnGround('sam',cx+rand(-6000,6000),cz-9000);   // deeper sectors are better defended
  message('CAMPAIGN · '+SECTORS[f].toUpperCase()+' · '+CAMP_SORTIES[k].toUpperCase(),3.2)}
function campaignKill(g){if(mission!=='CAMPAIGN'||g.campSlot==null)return;(camp.dead[g.campSec]=camp.dead[g.campSec]||[]).push(g.campSlot);campSave()}
function campaignAfter(){
  campNote=''; if(mission!=='CAMPAIGN'||deathCause==='abort')return; const f=camp.front, win=deathCause==='win';
  camp.sorties++; if(win)camp.wins++;
  const hit=win?(campSortie==='STRIKE'?60:campSortie==='CRUISE'?25:40):0;
  if(win){camp.str[f]=Math.max(0,camp.str[f]-hit);campNote=SECTORS[f]+' resistance down to '+camp.str[f]+'%.';
    if(camp.str[f]<=0){camp.front++;delete camp.dead[f];campNote=SECTORS[f]+' captured! The front moves north.';if(camp.front>=6){campNote='Falcon Plateau has fallen — campaign won in '+camp.sorties+' sorties!';camp=Object.assign(campNew(),{log:[]})}}}
  else{camp.str[f]=Math.min(100,camp.str[f]+20);campNote='The sortie failed; '+SECTORS[f]+' reinforced to '+camp.str[f]+'%.';
    if(camp.str[f]>=100&&f>1&&Math.random()<.5){camp.front--;camp.str[camp.front]=60;campNote='The enemy counter-attacked and retook '+SECTORS[camp.front]+'.'}}
  camp.log.unshift(campNote); camp.log=camp.log.slice(0,6); campSave()}
function renderCamp(){const el=$('campMap');if(!el)return;let h='';for(let i=5;i>=0;i--){const blue=i<camp.front,front=i===camp.front;
    h+=`<div class="cs ${blue?'cB':'cR'}${front?' cF':''}"><span>${SECTORS[i]}</span><b>${blue?'held':front?'front · '+camp.str[i]+'%':'enemy'}</b></div>`}
  el.innerHTML=h; $('bSortie').textContent='Sortie: '+CAMP_SORTIES[campSortie]; $('campLog').textContent=camp.log[0]||'Six sectors stand between your base and the enemy capital. Push the front north.'}

/* ---------------- targeting pod (FLIR, white-hot / black-hot, two fields of view) and night-vision goggles ---------------- */
const TGP={mode:0,fov:4,cam:new THREE.PerspectiveCamera(4,1,5,60000),rt:new THREE.WebGLRenderTarget(320,320),rect:null};
const flirMat=new THREE.ShaderMaterial({uniforms:{map:{value:TGP.rt.texture},bh:{value:0},t:{value:0},gain:{value:1}},depthTest:false,depthWrite:false,
  vertexShader:'varying vec2 vUv;void main(){vUv=uv;gl_Position=vec4(position.xy,0.,1.);}',
  fragmentShader:'uniform sampler2D map;uniform float bh,t,gain;varying vec2 vUv;float h(vec2 p){return fract(sin(dot(p,vec2(12.9898,78.233)))*43758.5453);}void main(){vec3 c=texture2D(map,vUv).rgb;float l=dot(c,vec3(.3,.59,.11))*gain;l=clamp((l-.05)*1.35,0.,1.);if(bh>.5)l=1.-l;l+= (h(vUv*320.+t)-.5)*.08;l*=.92+.08*sin(vUv.y*640.);gl_FragColor=vec4(vec3(l),1.);}'});
const flirScene=new THREE.Scene(), flirCam=new THREE.Camera(); flirScene.add(new THREE.Mesh(new THREE.PlaneGeometry(2,2),flirMat));
const _hot=[],_bg=new THREE.Color(0x101214);
function tgpAim(out){if(AG.tgt&&AG.tgt.alive)return out.copy(AG.tgt.pos).setY(AG.tgt.pos.y+2);if(lockTarget&&lockTarget.alive)return out.copy(lockTarget.pos);
  return out.copy(P.pos).addScaledVector(P.fwd,6000).addScaledVector(UP,-2500)}
function renderTGP(){
  if(!TGP.mode||state!=='play'||!P.alive||!AC.pod){TGP.rect=null;return}
  const size=Math.round(Math.min(W,H)*.36), x=Math.round(W*.27), y=Math.round(Math.max(52,H*.12)); TGP.rect={x,y,size};
  const c=TGP.cam; c.fov=TGP.fov; c.updateProjectionMatrix(); c.position.copy(P.pos).addScaledVector(P.up,-1.6); c.up.copy(UP); c.lookAt(tgpAim(_d));
  // hot things glow in the IR picture: engines, vehicles, ships; the sky is cold
  _hot.length=0; const heat=o=>o.traverse(m=>{if(m.material&&m.material.emissive&&!m.material.__h){m.material.__h=1;_hot.push([m.material,m.material.emissive.getHex()]);m.material.emissive.setHex(0xe8e8e8)}});
  for(const g of ground)if(g.alive)heat(g.obj); for(const e of enemies)if(e.alive)heat(e.obj); for(const e of friends)if(e.alive)heat(e.obj); if(CV.obj)heat(CV.obj);
  const bg=scene.background, ff=scene.fog.far, fc=scene.fog.color.getHex(); scene.background=_bg; scene.fog.far=ff*3; scene.fog.color.setHex(0x202426); sky.visible=false; glare.visible=false; rain.visible=false;
  clouds.forEach(cl=>cl.userData.v=cl.visible); clouds.forEach(cl=>cl.visible=false); const ex=playerJet.visible; playerJet.visible=false;
  renderer.setRenderTarget(TGP.rt); renderer.clear(); renderer.render(scene,c); renderer.setRenderTarget(null);
  scene.background=bg; scene.fog.far=ff; scene.fog.color.setHex(fc); sky.visible=true; glare.visible=true; clouds.forEach(cl=>cl.visible=cl.userData.v); playerJet.visible=ex;
  for(const [m,h] of _hot){m.emissive.setHex(h);delete m.__h}
  flirMat.uniforms.gain.value=timeOfDay==='NIGHT'?5:timeOfDay==='DUSK'?1.8:1; flirMat.uniforms.bh.value=TGP.mode===2?1:0; flirMat.uniforms.t.value=clock%10;
  renderer.setViewport(x,H-y-size,size,size); renderer.setScissor(x,H-y-size,size,size); renderer.setScissorTest(true); renderer.clearDepth(); renderer.render(flirScene,flirCam);
  renderer.setScissorTest(false); renderer.setViewport(0,0,W,H);
  const tp=$('tgpTap'); tp.hidden=false; tp.style.left=x+'px'; tp.style.top=y+'px'; tp.style.width=tp.style.height=size+'px'}
function drawTGPHud(c){const r=TGP.rect; if(!r){$('tgpTap').hidden=true;return} const {x,y,size}=r, cx=x+size/2, cy=y+size/2;
  c.strokeStyle='rgba(255,255,255,.85)';c.lineWidth=1.5;c.strokeRect(x,y,size,size);c.beginPath();
  for(const [a,b] of [[-1,0],[1,0],[0,-1],[0,1]]){c.moveTo(cx+a*8,cy+b*8);c.lineTo(cx+a*size*.22,cy+b*size*.22)}c.stroke();c.strokeRect(cx-6,cy-6,12,12);
  const t=AG.tgt&&AG.tgt.alive?AG.tgt:lockTarget, d=t?t.pos.distanceTo(P.pos):0;
  txt(c,(TGP.mode===1?'WHOT':'BHOT')+' · '+(TGP.fov<2?'NFOV':'WFOV')+' · '+AC.pod,x+6,y+12,'left','#fff',10,700);
  txt(c,t?(AG.tgt===t?'TGT '+agName(t):'AIR TRACK')+' · '+(d/1852).toFixed(1)+' NM':'PT · SNOWPLOW',x+6,y+size-12,'left','#fff',10,700);
  txt(c,'TAP TO ZOOM',x+size-6,y+size-12,'right','rgba(255,255,255,.6)',9,700)}
$('tgpTap').addEventListener('pointerdown',e=>{e.preventDefault();TGP.fov=TGP.fov>2?.7:4});
$('cTgp').addEventListener('click',()=>{TGP.mode=(TGP.mode+1)%3;$('nTgp').textContent=['OFF','WHOT','BHOT'][TGP.mode];if(!TGP.mode)$('tgpTap').hidden=true});
let nvgOn=false;
$('cNvg').addEventListener('click',()=>{nvgOn=!nvgOn;$('gl').classList.toggle('nvg',nvgOn);$('nNvg').textContent=nvgOn?'ON':'OFF'});
function drawNVG(c){if(!nvgOn||state!=='play')return;const g=c.createRadialGradient(W/2,H/2,Math.min(W,H)*.42,W/2,H/2,Math.max(W,H)*.62);g.addColorStop(0,'rgba(0,0,0,0)');g.addColorStop(1,'rgba(0,8,0,.92)');c.fillStyle=g;c.fillRect(0,0,W,H)}
function syncSensors(){AC.pod=PODS[AC.id]||null;$('cTgp').hidden=!AC.pod;if(!AC.pod){TGP.mode=0;$('nTgp').textContent='OFF'}
  const dark=timeOfDay!=='DAY';$('cNvg').hidden=!dark;if(!dark&&nvgOn){nvgOn=false;$('gl').classList.remove('nvg');$('nNvg').textContent='OFF'}}

/* ---------------- paint schemes and squadron ---------------- */
// solid / two-tone schemes plus painted camouflage (canvas texture) for the aggressor and splinter schemes
var LIVERIES={default:{n:'default'},aggr:{n:'aggressor blue splinter',camo:['#7e9bb8','#5d7590','#a9bccd']},navy:{n:'navy low-vis grey',body:0x9aa3ab,dark:0x5d656d},
  desert:{n:'desert',camo:['#c8a879','#9b7a52','#e0c9a0']},rusblue:{n:'Russian blue splinter',camo:['#8fb2cf','#5f84a8','#c8d8e4']},plaan:{n:'PLAAF grey',body:0x8c9196,dark:0x50565c},
  black:{n:'black (test squadron)',body:0x2b2e33,dark:0x15171a},tiger:{n:'tiger meet',camo:['#d8a230','#2a2422','#e8c050']}};
var livery='default', squadron=''; try{livery=localStorage.getItem('vsLivery')||'default';squadron=localStorage.getItem('vsSquadron')||''}catch(e){}
var camoTex={};
function camoMap(k){if(camoTex[k])return camoTex[k];const L=LIVERIES[k],cv=document.createElement('canvas');cv.width=cv.height=256;const c=cv.getContext('2d');c.fillStyle=L.camo[0];c.fillRect(0,0,256,256);
  for(let i=0;i<34;i++){c.fillStyle=L.camo[1+(i%2)];c.beginPath();const x=Math.random()*256,y=Math.random()*256,r=18+Math.random()*40;
    if(k==='tiger'){c.fillRect(x,0,8+Math.random()*10,256);continue}
    c.moveTo(x,y);for(let j=0;j<5;j++)c.lineTo(x+Math.cos(j*1.3+i)*r*(.6+Math.random()*.6),y+Math.sin(j*1.3+i)*r*(.6+Math.random()*.6));c.closePath();c.fill()}
  const t=new THREE.CanvasTexture(cv);t.wrapS=t.wrapT=THREE.RepeatWrapping;t.repeat.set(.35,.35);return camoTex[k]=t}
function applyLivery(root){if(!LIVERIES||!livery||livery==='default')return;const L=LIVERIES[livery]||LIVERIES.default;
  root.traverse(o=>{const m=o.material;if(!m||!m.userData||!m.userData.pu||m.__liv)return;m.__liv=1;const u=m.userData.pu;
    if(L.camo){u.pPat.value=2;u.pc0.value.set(L.camo[0]);u.pc1.value.set(L.camo[1]);u.pc2.value.set(L.camo[2]);u.pBelK.value=0}
    else if(L.body){u.pPat.value=0;u.pc0.value.setHex(L.body);u.pBelK.value=0}});
  root.traverse(o=>{const m=o.material;if(!m||!m.isMeshStandardMaterial||m.__liv)return;
    const isBody=m.color.getHex()===PLAYER_COLORS.body, isDark=m.color.getHex()===PLAYER_COLORS.dark;
    if(!isBody&&!isDark)return; const nm=m.clone(); nm.__liv=1;
    if(L.camo&&isBody){nm.map=camoMap(livery);nm.color.setHex(0xffffff)} else if(isBody&&L.body)nm.color.setHex(L.body); else if(isDark&&L.dark)nm.color.setHex(L.dark); else if(isDark&&L.camo)nm.color.set(L.camo[1]);
    o.material=nm})}
$('bLivery').addEventListener('click',()=>{const k=Object.keys(LIVERIES);livery=k[(k.indexOf(livery)+1)%k.length];try{localStorage.setItem('vsLivery',livery)}catch(e){};$('bLivery').textContent='Paint: '+LIVERIES[livery].n;applyAC()});
$('bLivery').textContent='Paint: '+(LIVERIES[livery]||LIVERIES.default).n;
$('sqName').value=squadron; $('sqName').addEventListener('keydown',e=>e.stopPropagation());
$('sqName').addEventListener('input',()=>{squadron=$('sqName').value.trim().slice(0,28);try{localStorage.setItem('vsSquadron',squadron)}catch(e){};if(state==='menu')$('ovEyebrow').textContent=AC.eyebrow+(squadron?' · '+squadron:'')});
$('bSens').addEventListener('click',()=>{const k=Object.keys(SENS);sens=k[(k.indexOf(sens)+1)%k.length];try{localStorage.setItem('vsSens',sens)}catch(e){};syncSettings()});
$('bDz').addEventListener('click',()=>{dz=(dz+1)%DZS.length;try{localStorage.setItem('vsDz',dz)}catch(e){};syncSettings()});
function syncSettings(){$('bSens').textContent='Stick sensitivity: '+sens.toLowerCase();$('bDz').textContent='Dead zone: '+Math.round(DZS[dz]*100)+'%'}
setTimeout(syncSettings,0);
/* ---------------- photo mode: freeze, free orbit camera, hide the HUD, grab a picture ---------------- */
const PHOTO={on:false,yaw:.8,pitch:.25,dist:40,hud:false,drag:null,tgt:null};
function photoStart(){if(state!=='paused')return;PHOTO.on=true;PHOTO.tgt=P.alive?playerJet.position:P.pos;showOverlay(null);$('photoBar').hidden=false;$('hud').style.visibility='hidden';$('ctrls').hidden=true}
function photoStop(){PHOTO.on=false;$('photoBar').hidden=true;$('hud').style.visibility='';$('photoShot').hidden=true;showOverlay('pause')}
function photoCam(){const t=PHOTO.tgt||P.pos,cp=Math.cos(PHOTO.pitch);camera.up.set(0,1,0);camera.position.set(t.x+Math.sin(PHOTO.yaw)*cp*PHOTO.dist,t.y+Math.sin(PHOTO.pitch)*PHOTO.dist,t.z+Math.cos(PHOTO.yaw)*cp*PHOTO.dist);
  const gh=Math.max(groundH(camera.position.x,camera.position.z),0)+3;if(camera.position.y<gh)camera.position.y=gh;camera.lookAt(t);playerJet.visible=P.alive}
let photoGrab=false;
// the picture is grabbed straight after the frame renders, then offered through the viewer's save prompt (falls back to long-press save)
let dlApi=null; const dlReady=(async()=>{try{if(window.claude&&window.claude.use)dlApi=await claude.use('downloads')}catch(e){}})();
function photoCapture(){photoGrab=false;let url;try{url=glCanvas.toDataURL('image/jpeg',.92)}catch(e){message('COULD NOT CAPTURE',1);return}
  $('photoImg').src=url;$('photoShot').hidden=false;$('photoMsg').textContent=dlApi?'Saving…':'Long-press the picture to save it.';
  if(!dlApi)return;
  fetch(url).then(r=>r.blob()).then(blob=>dlApi.save({filename:'viper-sortie-'+new Date().toISOString().slice(0,19).replace(/[:T]/g,'-')+'.jpg',data:blob}))
    .then(()=>{$('photoMsg').textContent='Saved.'}).catch(e=>{$('photoMsg').textContent=e&&e.code==='declined'?'Not saved. Long-press the picture to save it instead.':'Long-press the picture to save it.'})}

/* ---------------- radar cross-section: detection range scales with RCS^(1/4) (radar equation) and with aspect ----------------
   frontal RCS in m², public estimates where they exist, otherwise game estimates; external stores add to it */
const RCS={F16:1.2,F16B70:1.2,F15C:10,F15EX:8,FA18E:1,GRIPEN:.5,GRIPENE:.4,TYPHOON:.5,RAFALE:.5,MIG29:5,MIG29UPG:5,MIG29K:3,MIG35:3,SU27:15,SU33:15,SU35:3,J10C:1.5,J20:.05,CRUISE:.1,BOMBER:60,TRANSPORT:40};
rosterFill(RCS,{A10A:12,SU25:8,A7E:6,A4E:3,SU22M3:7,ALPHAJET:2.5,G91Y:3,JAGUAR:3,Q5A:5,AMX:2.5,F104S:1.5,TORNADOIT:5,F4C:6,F5A:1.5,J35D:3,J29F:3.5,J6A:3,MIG21MF:2,F8E:4,F100D:5,MIG19PT:3,MIG21F13:1.8,HUNTER:4,MIRAGE3C:3,F4E:6,FA18C:1.5,F15E:8,F35A:.02,F22A:.01,SU57:.1,F104G:1.5,MIG21:2,SU30SM:12,J35F:3,JA37:4,LIGHTNING:5,TORNADO3:5,KFIR:3,F2A:1.2,F35B:.02,F35DE:.02,F35AJ:.02,F35BJ:.02,F35I:.015,EF2K1:.6,EF2K3:.5,J7G:2,J11B:15,J15:15,J16:6,MIG29G:5});
const REF_RCS=5;   // radar ranges in the jet data are quoted against a ~5 m² fighter
function storesRCS(ac){if(ac.id==='J20')return 0;return (ac.srN+ac.mrN)*.04+(AG.load||[]).reduce((a,l)=>a+l.n*.12,0)+(ac.tanks&&!P.tanksGone?ac.tanks*.4:0)}
function playerRCS(){return (RCS[AC.id]??3)+storesRCS(AC)}
function rcsOf(t,from){const base=t===P?playerRCS():t.remote?(RCS[t.type]??3):(t.rcs??RCS[t.type]??(t.kind==='bomber'?60:3));
  _s1.subVectors(from,t.pos).normalize(); const c=Math.abs(_s1.dot(t.fwd)), front=_s1.dot(t.fwd)>0;
  return base*(c>.7?(front?1:2.5):c>.35?2.5:6)}   // nose-on smallest, beam biggest, tail (engines) in between
const rcsK=(t,from)=>clamp(Math.pow(rcsOf(t,from)/REF_RCS,.25),.2,2.2);
function radRange(e){return ((AC.radar&&AC.radar.range)||74000)*rcsK(e,P.pos)}

/* ---------------- tanker (boom for F-16s, hose-and-drogue for probe jets) ---------------- */
const TK={obj:null,pos:new V3(),vel:new V3(),fwd:new V3(),up:new V3(0,1,0),right:new V3(),ang:0,c:new V3(0,7000,18000),r:14000,v:200,on:false,
  conn:false,kind:'',dist:1e9,off:new V3(),boom:null,hoses:[]};
function buildTanker(){
  const g=new THREE.Group(),root=new THREE.Group();root.add(g);
  const body=new THREE.MeshStandardMaterial({color:0x9aa3aa,roughness:.7,flatShading:true,side:THREE.DoubleSide}),dark=new THREE.MeshStandardMaterial({color:0x40464c,flatShading:true});
  const add=(geo,mat,x,y,z)=>{const m=new THREE.Mesh(geo,mat);m.position.set(x,y,z);g.add(m);return m};
  let geo=new THREE.CylinderGeometry(2.6,2.6,40,12);geo.rotateX(Math.PI/2);add(geo,body,0,0,0);
  geo=new THREE.SphereGeometry(2.6,12,8);add(geo,body,0,0,20).scale.set(1,1,1.6);
  geo=new THREE.ConeGeometry(2.6,10,12);geo.rotateX(-Math.PI/2);add(geo,body,0,.6,-25).scale.set(1,.7,1);
  const sh=new THREE.Shape();sh.moveTo(2,6);sh.lineTo(24,-6);sh.lineTo(24,-9);sh.lineTo(2,-4);
  for(const s of [1,-1]){const sh2=new THREE.Shape();sh2.moveTo(2*s,6);sh2.lineTo(24*s,-6);sh2.lineTo(24*s,-9);sh2.lineTo(2*s,-4);
    const eg=new THREE.ExtrudeGeometry(sh2,{depth:.5,bevelEnabled:false});eg.rotateX(Math.PI/2);eg.translate(0,-1,0);g.add(new THREE.Mesh(eg,body));
    geo=new THREE.CylinderGeometry(1.4,1.2,5,10);geo.rotateX(Math.PI/2);add(geo,dark,9*s,-2.6,1);
    geo=new THREE.CylinderGeometry(.5,.4,3,8);geo.rotateX(Math.PI/2);add(geo,dark,16*s,-2.2,-6)}  // wing refuelling pods
  const ts=new THREE.Shape();ts.moveTo(-18,2);ts.lineTo(-27,2);ts.lineTo(-29,11);ts.lineTo(-25,11);ts.lineTo(-18,2);
  const tg=new THREE.ExtrudeGeometry(ts,{depth:.5,bevelEnabled:false});tg.rotateY(-Math.PI/2);tg.translate(.25,0,0);g.add(new THREE.Mesh(tg,body));
  add(new THREE.BoxGeometry(18,.4,4),body,0,1.5,-26);
  // boom
  const boom=new THREE.Group();boom.position.set(0,-1.8,-24);g.add(boom);
  geo=new THREE.CylinderGeometry(.25,.18,14,8);geo.rotateX(Math.PI/2);geo.translate(0,0,-7);const bm=new THREE.Mesh(geo,dark);boom.add(bm);boom.rotation.x=-.5;
  // hoses with drogues
  const hoses=[];for(const s of [1,-1]){const h=new THREE.Group();h.position.set(16*s,-2.2,-7.5);g.add(h);
    geo=new THREE.CylinderGeometry(.08,.08,26,5);geo.rotateX(Math.PI/2);geo.translate(0,0,-13);h.add(new THREE.Mesh(geo,dark));
    const dr=new THREE.Mesh(new THREE.ConeGeometry(.6,.9,10,1,true).rotateX(-Math.PI/2),dark);dr.position.set(0,0,-26.3);h.add(dr);h.rotation.x=-.12;hoses.push(h)}
  return {root,boom,hoses};
}
function tankerStart(){
  if(TK.obj)scene.remove(TK.obj);
  const b=buildTanker(); TK.obj=b.root; TK.boom=b.boom; TK.hoses=b.hoses; scene.add(TK.obj); TK.on=true; TK.conn=false; TK.ang=rand(0,Math.PI*2);
}
function tankerStop(){TK.on=false;TK.conn=false;if(TK.obj){scene.remove(TK.obj);TK.obj=null}}
const _tq=new THREE.Quaternion(),_tm=new THREE.Matrix4();
function updateTanker(dt){
  if(!TK.on)return;
  TK.ang+=TK.v/TK.r*dt;
  TK.pos.set(TK.c.x+Math.sin(TK.ang)*TK.r,TK.c.y,TK.c.z+Math.cos(TK.ang)*TK.r);
  TK.fwd.set(Math.cos(TK.ang),0,-Math.sin(TK.ang)); TK.vel.copy(TK.fwd).multiplyScalar(TK.v);
  TK.obj.position.copy(TK.pos); TK.obj.lookAt(_s1.copy(TK.pos).add(TK.fwd)); TK.obj.rotateZ(-.22);   // ~13° bank in the orbit
  TK.obj.updateMatrixWorld();
  const kind=AC.refuel; TK.kind=kind||'';
  if(!kind||!P.alive||state!=='play'){TK.conn=false;TK.dist=1e9;return}
  // contact point on the tanker and receptacle / probe on your jet (world)
  const cp=kind==='boom'?_s2.set(0,-8.5,-37):_s2.set(TK.hoses[0]?16:0,-4.5,-34);
  if(kind==='probe'){const L=_s3.set(16,-4.5,-34).applyMatrix4(TK.obj.matrixWorld),R2=_s4.set(-16,-4.5,-34).applyMatrix4(TK.obj.matrixWorld);
    cp.copy(L.distanceTo(P.pos)<R2.distanceTo(P.pos)?L:R2)} else cp.applyMatrix4(TK.obj.matrixWorld);
  const rp=_s5.set(kind==='boom'?0:-.55,kind==='boom'?1.0:.7,kind==='boom'?2.2:7.6).applyQuaternion(playerJet.quaternion).add(P.pos);
  TK.dist=rp.distanceTo(cp); TK.off.subVectors(cp,rp);    // where the contact point is relative to you (world)
  const rel=_s1.subVectors(P.vel,TK.vel).length();
  const grab=kind==='boom'?14:4.5, keep=kind==='boom'?22:9;
  if(!TK.conn&&TK.dist<grab&&rel<6){TK.conn=true;message('CONTACT',1.2);buzz(40);if(trainHook)trainHook('contact')}
  if(TK.conn&&(TK.dist>keep||rel>9)){TK.conn=false;message('DISCONNECT',1)}
  if(TK.conn){const flow=kind==='boom'?45:18;P.fuel=Math.min(AC.fuelCap,P.fuel+flow*dt);P.bingo=P.fuel<.25*AC.fuelCap;P.lowFuel=P.fuel<.1*AC.fuelCap;
    if(P.fuel>=AC.fuelCap-1){TK.conn=false;message('TANKS FULL · DISCONNECT',1.6);if(trainHook)trainHook('full')}}
  // boom operator flies the boom to you once you're close and stable
  if(kind==='boom'&&TK.boom&&TK.dist<60){_s3.copy(rp);TK.obj.worldToLocal(_s3);const bp=TK.boom.position;
    TK.boom.rotation.x=-clamp(Math.atan2(-( _s3.y-bp.y),-(_s3.z-bp.z)),.3,.85);TK.boom.rotation.y=clamp(Math.atan2(-(_s3.x-bp.x),-(_s3.z-bp.z)),-.25,.25)}
}
// pilot director: how to move to reach the contact point, in your own frame
function tankerCue(){
  if(!TK.on||!TK.kind||TK.dist>400)return '';
  if(TK.conn)return 'CONTACT · FUEL '+Math.round(P.fuel/AC.fuelCap*100)+'%';
  const o=TK.off, f=o.dot(P.fwd), u=o.dot(P.up), r=o.dot(P.right), w=[];
  if(Math.abs(u)>1.5)w.push((u>0?'UP ':'DOWN ')+Math.round(Math.abs(u)));
  if(Math.abs(r)>1.5)w.push((r>0?'RIGHT ':'LEFT ')+Math.round(Math.abs(r)));
  if(Math.abs(f)>2)w.push((f>0?'FWD ':'BACK ')+Math.round(Math.abs(f)));
  const rel=P.vel.dot(TK.fwd)-TK.v;
  return (TK.kind==='boom'?'BOOM ':'DROGUE ')+(w.join(' · ')||'HOLD')+' · '+(rel>0?'+':'')+Math.round(rel*1.944)+' KT';
}

/* ---------------- game state ---------------- */
let state='menu', invert=false, best=0;
try{best=+localStorage.getItem('viperBest')||0;invert=localStorage.getItem('viperInvert')==='1'}catch(e){}
const P=Object.assign(newJet(playerJet,AC.gmax,AC),{hp:100,aim9:AC.srN,aim120:AC.mrN,rounds:AC.gunRounds,gStress:0,gloc:0,gcas:false,maxG:1});
const omega=new V3(), qPrev=new THREE.Quaternion();
let enemies=[],wave=0,score=0,kills=0,waveClearT=0,gunAcc=0,gunSndT=0,hurtT=0,shake=0,deadT=0,deathCause='';
let lockTarget=null,lockT=0,lockDist=0,lockAng=0,can9=false,can120=false,toneT=0;
let msgText='',msgT=0,clock=0,throttle=.8,thrSet=.8;
let gunHeld=false,brake=false,fire9=false,fire120=false;
const HG={on:false,bg:false,ang:.7,el:.2,zoom:1,drag:null,auto:true,pan:false,goal:null,t:0,tgt:new V3(0,2,-4),r:20};   // on = hangar editor panel; bg = hangar scene behind the menu   // hangar: turntable camera around the player's jet
const VIEWS=['CHASE','COCKPIT','PADLOCK','FLYBY']; let view=0; const flyCam=new V3(); let flyCamSet=false;
const keys={};
const REDUCED=!!(window.matchMedia&&matchMedia('(prefers-reduced-motion:reduce)').matches);
const srLive=document.getElementById('srLive');
// kill feed (War Thunder style): short lines in the top-right corner that fade after a few seconds; kind picks the colour
const FEED=[], FEED_LIFE=7;
function feed(text,kind){FEED.push({t:clock,text,kind:kind||(/^You (killed|destroyed)/.test(text)?'kill':/^(Wingman|Your wingman|The C-130)/.test(text)?'loss':'info')});while(FEED.length>6)FEED.shift()}
function message(t,dur){msgText=t;msgT=dur||1.6;if(srLive&&srLive.textContent!==t)srLive.textContent=t}   // mirrored to a screen-reader live region

function rearm(){
  P.aim9=AC.srN;P.aim120=AC.mrN;P.rounds=AC.gunRounds;
  if(typeof cmFlares==='function'){CM.flares=cmFlares();CM.chaff=cmChaff();CM.decoys=Math.max(0,AC.cm.decoys-(CM.decoy?1:0));syncCM()}
  playerJet.traverse(o=>{const m=/^r(9|120)_(\d+)/.exec(o.name);if(m)o.visible=+m[2]<(m[1]==='9'?AC.srN:AC.mrN)});
  P.tanksGone=false; P.jettKg=0; if(typeof agReset==='function')agReset(); const cj=$('cJett'); if(cj)cj.hidden=!(AC.tanks>0); if(typeof setGear==='function')setGear(!!P.gear);
}
function resetPlayer(){
  P.pos.set(0,4000,0); playerJet.quaternion.identity(); playerJet.visible=true;
  P.vel.set(0,0,230); P.onGround=false; P.onDeck=false; P.ejected=null; P.jetGhost=null; P.rescued=false; if(chute)chute.visible=false; P.scramble=false; P.stopT=0; if(typeof setGear==='function')setGear(false); P.n=1; P.hp=100; P.fuel=.75*(AC.intFuel||AC.fuelCap)+(AC.tankFuel||0); P.flamedOut=false; resetSystems(); P.gStress=0; P.gloc=0; P.gcas=false; P.maxG=1; axes(P); qPrev.copy(playerJet.quaternion); omega.set(0,0,0);
  rearm(); throttle=.8; setThr(.8);
}
let friends=[], mission='WAVES', banditType='F16', missionT=0, missionDone=false, spawnQ=[];
try{mission=localStorage.getItem('viperMission')||'WAVES';banditType=localStorage.getItem('viperBandit')||'F16'}catch(e){}
const RUSH_KILLS=8, RUSH_TIME=300;   // time-attack: bandits keep arriving, four at a time
const MISSIONS={WAVES:'Waves',STRIKE:'Strike / SEAD',INTERCEPT:'Intercept bombers',RUSH:'Bandit rush (8 in 5 min)',ESCORT:'Escort the C-130','2V4':'2 v 4 with wingman','4SHIP':'4-ship vs 6',CONVOY:'Convoy attack',GROUNDWAR:'Ground war (CAS)',ANTISHIP:'Anti-ship strike',CRUISE:'Cruise missile defence',CAMPAIGN:'Campaign',ONLINE:'Online dogfight',TRAINING:'Training'};
const LESSONS={BFM:'Dogfighting basics',DEFENSE:'Missile defense',BVR:'Long-range shot',LANDING:'Landing',REFUEL:'Air refueling'};
let lesson='BFM'; try{if(LESSONS[localStorage.getItem('vsLesson')])lesson=localStorage.getItem('vsLesson')}catch(e){}
let trainDefeated=0, trainConnT=0;
const BANDITS={F16:'F-16',F16B70:'F-16 Block 70',GRIPEN:'Gripen',GRIPENE:'Gripen E',MIG29:'MiG-29',MIG29UPG:'MiG-29UPG',MIG35:'MiG-35',SU27:'Su-27S',SU35:'Su-35S',F15C:'F-15C',F15EX:'F-15EX',TYPHOON:'Typhoon',RAFALE:'Rafale',J10C:'J-10C',J20:'J-20',FA18E:'F/A-18E',MIG29K:'MiG-29K',SU33:'Su-33',MIXED:'Mixed'};
// bandit skill: g they'll pull, how fast they notice and react to missiles, how well they defend, shot discipline, gunnery
const DIFF={
  ROOKIE: {name:'Rookie', g:6.5,react:2.0,irSee:1500,defP:.45,cmP:.35,notch:false,notchP:.15,rne:false,iK:.95,rK:1.0, spread:.03, gunR:700, lock:.5, cd:2.0},
  REGULAR:{name:'Regular',g:7.5,react:1.1,irSee:2500,defP:.75,cmP:.6, notch:true,notchP:.3, rne:false,iK:.85,rK:.95,spread:.022,gunR:850, lock:.75,cd:1.4},
  VETERAN:{name:'Veteran',g:8.5,react:.5, irSee:3200,defP:.92,cmP:.85,notch:true,notchP:.45,rne:true, iK:.8, rK:.85,spread:.015,gunR:950, lock:.9, cd:1.1},
  ACE:    {name:'Ace',    g:9,  react:0,  irSee:3500,defP:1,  cmP:1,  notch:true,notchP:.55,rne:true, iK:.75,rK:.8, spread:.012,gunR:1000,lock:1,  cd:1}
};
const REMOTE_SK={notchP:.5};
// Battle presets set existing values only: difficulty (which carries the missile and countermeasure rules), HUD marker level, damage-system severity, and a reward multiplier for progAward.
const PRESETS={ARCADE:{n:'Arcade',diff:'ROOKIE',marks:2,dmg:.6,reward:1},REALISTIC:{n:'Realistic',diff:'REGULAR',marks:1,dmg:1,reward:1.2},SIMULATOR:{n:'Simulator',diff:'VETERAN',marks:0,dmg:1.5,reward:1.5}};
let preset='REALISTIC'; try{const v=localStorage.getItem('vsPreset');if(PRESETS[v])preset=v}catch(e){}
// Engagement range: how far out the fight starts. Short = original; Long/Extreme give time to notch, drag and defend against radar missiles.
const ENG_RANGES={SHORT:{n:'Short',k:1},LONG:{n:'Long',k:2.5},EXTREME:{n:'Extreme',k:4}};
let rangeKey='LONG'; try{const r=localStorage.getItem('viperRange');if(ENG_RANGES[r])rangeKey=r}catch(e){}
const engK=()=>ENG_RANGES[rangeKey].k, farK=()=>1+(engK()-1)*.3;   // engK scales random merge distances; farK scales fixed scripted set-ups
let difficulty='REGULAR'; try{const d=localStorage.getItem('viperDiff');if(DIFF[d])difficulty=d}catch(e){}
const sk=e=>e.sk?e.sk:e.remote?REMOTE_SK:e.team==='red'?DIFF[difficulty]:DIFF.VETERAN;   // your wingman flies at veteran level
const RED_COLORS={body:0x6a3f3a,dark:0x2f2523,glass:0x222a30,glassE:0x000000,flame:0xff6a3a};
const BLUE_COLORS={body:0x7f93a8,dark:0x36404b,glass:0xc9a24a,glassE:0x2a1d00,flame:0xffa64a};
const templates={};
function tmpl(team,type){const k=team+type;
  if(!templates[k])templates[k]=type==='BOMBER'?buildBomber(RED_COLORS):type==='TRANSPORT'?buildTransport(BLUE_COLORS):buildJet(team==='red'?RED_COLORS:BLUE_COLORS,type);
  return templates[k]}
function clearWorld(){
  clearGround(); tankerStop(); clearWrecks(); clearIsles(); if(KC.t>0)endKillCam();
  for(const e of enemies)scene.remove(e.obj); for(const f of friends)scene.remove(f.obj);
  enemies=[];friends=[];spawnQ=[];[...pBullets,...eBullets,...missiles,...eMissiles].forEach(kill);
}
let gunShots=0,gunHits=0;
function startGame(){
  gunShots=0;gunHits=0;clearWorld(); resetPlayer(); resetRadar(); resetCM(); recReset(); rec3Reset(); P.alive=true;
  if(mission!=='ONLINE'){netStop();$('bSb').hidden=true;$('sbBox').hidden=true}
  trainHook=null;
  wave=0;score=0;kills=0;waveClearT=1.5;lockTarget=null;lockT=0;hurtT=0;missionT=0;missionDone=false;
  state='play'; showOverlay(null); $('ctrls').hidden=false; camSnap=true;
  $('cWing').hidden=mission!=='2V4'&&mission!=='4SHIP'&&mission!=='CAMPAIGN';
  if(mission!=='ONLINE'&&mission!=='TRAINING')tankerStart();
  sortie=null; GCI.known.clear(); GCI.lines=[]; GCI.rtb=false; GCI.commitT=7; GCI.threatT=8; initCarrier(); setupMission(); if(mission!=='4SHIP'&&mission!=='ONLINE'&&mission!=='TRAINING')gciPicture(); for(const e of enemies)GCI.known.add(e.id); if(startOnRunway&&mission!=='ONLINE'&&mission!=='TRAINING'){if(startCV&&AC.carrier)placeOnCarrier();else placeOnRunway()} recenterTilt();
}
const FIGHTERS=['F16','F16B70','F15C','F15EX','FA18E','GRIPEN','GRIPENE','TYPHOON','RAFALE','MIG29','MIG29UPG','MIG29K','MIG35','SU27','SU33','SU35','J10C','J20'];
FIGHTERS.push(...ROSTER_IDS);
Object.assign(BANDITS,{F4E:'F-4E Phantom II',FA18C:'F/A-18C',F15E:'F-15E',F35A:'F-35A',F22A:'F-22A',MIG21:'MiG-21bis',SU30SM:'Su-30SM',SU57:'Su-57',F104G:'F-104G',F4F:'F-4F ICE',MIG29G:'MiG-29G',EF2K1:'EF2000 T1',EF2K3:'EF2000 T3',F35DE:'F-35A (Luftwaffe)',
  F4EJ:'F-4EJ',F4EJK:'F-4EJ Kai',F4EIL:'F-4E (IAF)',F15J:'F-15J',F15JK:'F-15J Kai',F2A:'F-2A',F35AJ:'F-35A (JASDF)',F35B:'F-35B',F35BJ:'F-35B (JASDF)',KFIR:'Kfir C.7',F4E2K:'Kurnass 2000',F15BAZ:'F-15C Baz',F16BARAK:'F-16C Barak',F16I:'F-16I Sufa',F15I:"F-15I Ra'am",F35I:'F-35I Adir',
  J35F:'J 35F Draken',JA37:'JA 37 Viggen',LIGHTNING:'Lightning F.6',PHANTOM2:'Phantom FGR.2',TORNADO3:'Tornado F.3',J7G:'J-7G',F5E:'F-5E',F14B:'F-14B',MIG23ML:'MiG-23ML',MIG25PD:'MiG-25PD',J8F:'J-8F',F8E:'F-8E Crusader',F100D:'F-100D Super Sabre',MIG19PT:'MiG-19PT',MIG21F13:'MiG-21F-13',HUNTER:'Hunter F.6',MIRAGE3C:'Mirage IIIC',F4C:'F-4C Phantom II',F5A:'F-5A',J35D:'J 35D Draken',J29F:'J 29F Tunnan',J6A:'J-6A',MIG21MF:'MiG-21MF',A10A:'A-10A Thunderbolt II',SU25:'Su-25',A7E:'A-7E Corsair II',A4E:'A-4E Skyhawk',SU22M3:'Su-22M3',ALPHAJET:'Alpha Jet A',G91Y:'G.91Y',JAGUAR:'Jaguar GR.1',Q5A:'Q-5A',AMX:'AMX',F104S:'F-104S',TORNADOIT:'Tornado IDS',MIRAGEF1:'Mirage F1C',M2000:'Mirage 2000-5F',J11B:'J-11B',J15:'J-15',J16:'J-16'});
{const m=BANDITS.MIXED;delete BANDITS.MIXED;BANDITS.MIXED=m}
// matchmaking: bandits are only ever fighters within MM_BR of the battle rating of the jet you fly (Career and Free play alike)
const MM_BR=1;
const banditPool=()=>{const b=progBR(AC.id),p=FIGHTERS.filter(f=>Math.abs(progBR(f)-b)<=MM_BR+1e-6);return p.length?p:[AC.id]};
function pickBanditType(){const pool=banditPool();if(banditType!=='MIXED'&&pool.indexOf(banditType)>=0)return banditType;   // a fixed choice only counts while it is inside the window
  return pool[Math.random()*pool.length|0]}
// spawn a fighter: team, aircraft type, position, heading toward a point, loadout
function spawnFighter(team,type,pos,lookAt,opts={}){
  const obj=tmpl(team,type).clone(); obj.position.copy(pos); obj.lookAt(lookAt.x,pos.y,lookAt.z); scene.add(obj);
  const ac=AC_DEFS[type], e=Object.assign(newJet(obj,team==='red'?Math.min(DIFF[difficulty].g+wave*.15,ac.gmax):ac.gmax,ac),{
    team,type,kind:'fighter',hp:3,alive:true,mode:'',tgt:null,retgtT:0,lead:null,side:1,engaged:false,crankSide:Math.random()<.5?1:-1,
    flareCd:0,chaffCd:0,gunAcc:0,mslCd:rand(3,6)*(team==='red'?DIFF[difficulty].cd:1),lockT:0,spiking:false,zoneT:0,zI:null,zR:null,
    espec:aiSpecs(type),ir:opts.ir??ac.srN,rdr:opts.rdr??ac.mrN,cmd:'ENGAGE',escortPref:!!opts.escortPref,id:nextId()});
  axes(e); e.vel.copy(e.fwd).multiplyScalar(opts.speed||rand(220,250));
  (team==='red'?enemies:friends).push(e); return e;
}
function spawnHeavy(team,type,pos,wp,speed){
  const obj=tmpl(team,type).clone(); obj.position.copy(pos); obj.lookAt(wp); scene.add(obj);
  const e=Object.assign(newJet(obj,2.5,AC_DEFS.F16),{team,type,kind:type==='BOMBER'?'bomber':'transport',hp:type==='BOMBER'?5:8,alive:true,
    wp:wp.clone(),speed,tgt:null,mslCd:0,retgtT:0,flareCd:0,chaffCd:0,lockT:0,id:nextId()});
  axes(e); e.vel.copy(e.fwd).multiplyScalar(speed); (team==='red'?enemies:friends).push(e); return e;
}
let idSeq=0; const nextId=()=>++idSeq;
// a 2-ship of bandits: lead plus wingman 1.4 km line abreast
function spawnPair(type,center,lookAt,opts={}){
  const l=spawnFighter('red',type,center,lookAt,opts);
  const w=spawnFighter('red',type,center.clone().add(_s5.copy(l.right).multiplyScalar(1400)),lookAt,opts);  // 2-ships fly the same jet
  w.lead=l; w.side=1; return [l,w];
}
function setupMission(){
  if(mission==='TRAINING'){setupLesson();return}
  if(mission==='ONLINE'){netStart();return}
  sortie=null;
  if(mission==='WAVES'){message('WAVES · CLEAR EACH GROUP OF BANDITS',2.4);return}
  if(mission==='CAMPAIGN'){setupCampaign();return}
  if(mission==='CONVOY'){P.pos.set(0,6000,0);P.vel.set(0,0,240);setupConvoy(rand(-4000,4000),34000);spawnPair(pickBanditType(),new V3(0,7000,52000),new V3(0,5000,0));message('CONVOY · STOP AT LEAST 4 OF THE 5 TRUCKS BEFORE THEY GET THROUGH',3);return}
  if(mission==='GROUNDWAR'){setupGroundWar();spawnPair(pickBanditType(),new V3(sortie.center.x,7000,sortie.center.z+16000),new V3(0,5000,0));message('GROUND WAR · SUPPORT THE BLUE ARMOUR (GEPARD COVERS IT) · DESTROY THE '+sortie.need+' RED VEHICLES · ZSU-23-4 AND ZSU-57-2 WILL SHOOT AT YOU',3.6);return}
  if(mission==='ANTISHIP'){P.pos.set(0,6000,0);P.vel.set(0,0,240);setupShip();spawnPair(pickBanditType(),new V3(19600,7000,36000),new V3(0,5000,0));message('ANTI-SHIP · SINK THE FRIGATE NE OF THE BASE · IT HAS SAMS',3);return}
  if(mission==='CRUISE'){P.pos.set(0,5000,6000);P.vel.set(0,0,240);setupCruise();message('CRUISE MISSILES INBOUND FROM THE NORTH · LOW AND FAST · PROTECT THE BASE',3.2);return}
  if(mission==='STRIKE'){
    P.pos.set(0,6500,0); P.vel.set(0,0,240);
    const cx=rand(-4000,4000), cz=rand(38000,44000);
    spawnGround('radar',cx,cz+1500,true); spawnGround('bunker',cx-600,cz+600,true); spawnGround('bunker',cx+700,cz+900,true);
    spawnGround('sam',cx-3500,cz-2500,true); spawnGround('sam',cx+3800,cz-1500,true);
    spawnGround('aaa',cx-400,cz-300); spawnGround('aaa',cx+500,cz+200);
    const tp=pickBanditType(); spawnPair(tp,new V3(cx-6000,8000,cz+12000),new V3(0,6000,0),{rdr:Math.min(2,AC_DEFS[tp].mrN)});
    message(AC.strike?'STRIKE · KILL THE SAMS, RADAR AND BUNKERS · '+Math.round(cz/1000)+' KM NORTH':'STRIKE · '+AC.name.toUpperCase()+' HAS NO STRIKE FIT · USE GUNS OR ESCORT',3.2);return}
  if(mission==='RUSH'){message('BANDIT RUSH · SHOOT DOWN '+RUSH_KILLS+' IN '+fmtT(RUSH_TIME),3);return}
  if(mission==='INTERCEPT'){
    P.pos.set(0,6500,0); P.vel.set(0,0,250);
    const tp=pickBanditType();
    for(let i=0;i<4;i++){const x=(i%2?1:-1)*(700+(i>>1)*500), z=46000+(i>>1)*1500;
      spawnHeavy('red','BOMBER',new V3(x,9000,z),new V3(x*.3,9000,-4000),235)}
    spawnPair(tp,new V3(-3000,10500,43000),new V3(0,9000,0),{rdr:AC_DEFS[tp].mrN});
    spawnGround('sam',7000,30000);spawnGround('sam',-8000,20000);spawnGround('aaa',6400,29200);spawnGround('aaa',-7400,19300);
    message('INTERCEPT · 4 BOMBERS INBOUND · SAMS ALONG THEIR ROUTE',3);return}
  if(mission==='ESCORT'){
    P.pos.set(-900,6200,-600); P.vel.set(0,0,200);
    spawnHeavy('blue','TRANSPORT',new V3(0,5500,0),new V3(0,5500,ESCORT_LEN),150);
    spawnQ=[{t:12,n:2},{t:75,n:2},{t:140,n:2}];
    spawnGround('sam',6000,13000);spawnGround('sam',-6500,26000);spawnGround('aaa',2500,18000);spawnGround('aaa',-2500,31000);
    message('ESCORT · KEEP THE C-130 ALIVE FOR '+Math.round(ESCORT_LEN/150/60*10)/10+' MIN',3);return}
  if(mission==='4SHIP'){
    // two elements: Two on your right, Three on your left with Four on his left
    const two=spawnFighter('blue',AC.id,new V3(1600,4000,-300),new V3(1600,4000,30000),{speed:230}); two.lead=P;two.side=1;two.cs=2;
    const thr=spawnFighter('blue',AC.id,new V3(-1600,4200,-500),new V3(-1600,4200,30000),{speed:230}); thr.lead=P;thr.side=-1;thr.cs=3;
    const fou=spawnFighter('blue',AC.id,new V3(-3000,4200,-800),new V3(-3000,4200,30000),{speed:230}); fou.lead=thr;fou.side=-1;fou.cs=4;
    for(const w of [two,thr,fou]){w.cmd='ENGAGE';w.bombs=2}
    spawnPair(pickBanditType(),new V3(-5000,6000,30000*farK()),new V3(0,4000,0));spawnPair(pickBanditType(),new V3(1000,5500,33000*farK()),new V3(0,4000,0));spawnPair(pickBanditType(),new V3(6000,6500,31000*farK()),new V3(0,4000,0));
    spawnGround('sam',2000,36000);spawnGround('aaa',2600,35400);
    syncWing(); message('4-SHIP · TAP WING TO COMMAND THE FLIGHT',2.8); gciPicture(); return}
  if(mission==='2V4'){
    const w=spawnFighter('blue',AC.id,new V3(1600,4000,-300),new V3(1600,4000,30000),{speed:230});
    w.lead=P;w.side=1;w.cmd='ENGAGE';w.cs=2;w.bombs=2;syncWing();
    const tp=pickBanditType();
    spawnPair(tp,new V3(-4000,6000,26000*farK()),new V3(0,4000,0));
    spawnPair(pickBanditType(),new V3(5000,5000,29000*farK()),new V3(0,4000,0));
    message('2 V 4 · YOUR WINGMAN IS ON YOUR RIGHT',2.6);return}
}
const ESCORT_LEN=36000;
function setupLesson(){
  trainDefeated=0; trainConnT=0; trainHook=lessonHook;
  const ROOK=Object.assign({},DIFF.ROOKIE,{g:6});
  if(lesson==='BFM'){
    P.pos.set(0,4000,0); playerJet.quaternion.identity(); P.vel.set(0,0,230); axes(P);
    const e=spawnFighter('red','F16',new V3(2500,4200,4500),new V3(-6000,4200,4500),{ir:0,rdr:0,speed:220}); e.sk=ROOK; e.gLim=6;
    message('DOGFIGHT · GUNS ONLY · GET BEHIND HIM',2.6);
  } else if(lesson==='DEFENSE'){
    P.pos.set(0,6000,0); playerJet.quaternion.identity(); P.vel.set(0,0,250); axes(P);
    const e=spawnFighter('red','F16B70',new V3(0,7500,32000),new V3(0,7500,0),{ir:0,rdr:6,speed:250});
    e.sk=Object.assign({},DIFF.REGULAR,{lock:1.2,cd:.8,rK:1}); e.holdOff=true; e.drone=false;
    message('MISSILE DEFENSE · DEFEAT 3 RADAR MISSILES',2.6);
  } else if(lesson==='BVR'){
    P.pos.set(0,6500,0); playerJet.quaternion.identity(); P.vel.set(0,0,250); axes(P);
    const e=spawnFighter('red','F16',new V3(-4000,6500,30000),new V3(30000,6500,30000),{ir:0,rdr:0,speed:220}); e.drone=true;
    message('LONG-RANGE SHOT · TARGET DRONE 30 KM AHEAD',2.6);
  } else if(lesson==='LANDING'){
    P.pos.set(RWY.x,BASE_Y+650,RWY.z0-11500); playerJet.quaternion.identity(); P.vel.set(0,-5,120); axes(P); setThr(.45); throttle=.45;
    message('LANDING · RUNWAY 11 KM AHEAD',2.6);
  } else if(lesson==='REFUEL'){
    if(!AC.refuel){message(AC.name.toUpperCase()+' HAS NO REFUELING PROBE · PICK ANOTHER JET',3);setTimeout(()=>endMission(false,AC.name+' cannot refuel in the air'),1500);return}
    tankerStart(); updateTanker(0);
    P.pos.copy(TK.pos).addScaledVector(TK.fwd,-500).add(_s1.set(0,-40,0)); playerJet.lookAt(_s2.copy(P.pos).add(TK.fwd)); axes(P); P.vel.copy(TK.vel); setThr(.62); throttle=.62;
    P.fuel=.35*AC.fuelCap;
    message('AIR REFUELING · JOIN UP BEHIND THE TANKER',2.6);
  }
  qPrev.copy(playerJet.quaternion); camSnap=true;
}
function lessonHook(ev){
  if(mission!=='TRAINING'||missionDone)return;
  if(lesson==='LANDING'&&ev==='stopped')endMission(true,'Landed and stopped on the runway');
  if(lesson==='REFUEL'&&ev==='full')endMission(true,'Tanks full');
}
function lessonMissile(r){   // called when a missile aimed at you ends
  if(mission==='TRAINING'&&lesson==='DEFENSE'&&r.target==='you'&&r.res==='MISS'){trainDefeated++;message('MISSILE DEFEATED · '+trainDefeated+' / 3',1.6);
    if(trainDefeated>=3)endMission(true,'Defeated three radar missiles')}
}
function updateLesson(dt){
  if(state!=='play'||missionDone)return;
  if((lesson==='BFM'||lesson==='BVR')&&!enemies.length)endMission(true,lesson==='BFM'?'Gunned the bandit':'Splashed the drone at long range');
  if(lesson==='REFUEL'&&TK.conn){trainConnT+=dt;if(trainConnT>25)endMission(true,'Held contact for 25 seconds')}
}
function coachText(){
  if(mission!=='TRAINING'||state!=='play')return '';
  const e=enemies[0];
  if(lesson==='BFM'){if(!e)return '';
    const d=e.pos.distanceTo(P.pos), off=P.fwd.angleTo(_s1.subVectors(e.pos,P.pos));
    if(P.kcas<AC.corner-80)return 'Too slow · ease off the stick and use afterburner to get back toward '+AC.corner+' kt';
    if(off>.6)return 'Roll so he is above your nose (top of the HUD), then pull toward him';
    if(d>1100)return 'Good · hold about '+AC.corner+' kt and close in · '+(d/1000).toFixed(1)+' km';
    return 'Guns range · put the pipper on him and hold GUN';}
  if(lesson==='DEFENSE'){let mm=null,md=1e9;for(const m of eMissiles)if(m.on&&m.target===P){const d=m.m.position.distanceTo(P.pos);if(d<md){md=d;mm=m}}
    if(!mm)return 'He is ~30 km out and shoots radar missiles · SPIKE on the RWR means he has locked you · '+trainDefeated+'/3 defeated';
    _s1.subVectors(P.pos,mm.m.position).normalize(); const beam=Math.abs(P.vel.clone().normalize().dot(_s1))<.35;
    if(md<2500)return 'Missile close · break hard toward it and drop chaff!';
    if(md<8000&&!beam)return 'Turn so the missile sits at your 3 or 9 o\'clock, and drop chaff (CHF)';
    if(md<8000)return 'Holding the beam · keep it there, descend, drop chaff · '+(md/1000).toFixed(1)+' km';
    return beam?'Beaming · stay perpendicular to it and dive below it to hide in ground clutter':'Missile inbound '+(md/1000).toFixed(0)+' km · turn to put it at 3 or 9 o\'clock and descend';}
  if(lesson==='BVR'){if(!e)return '';
    let fly=null;for(const m of missiles)if(m.on)fly=m;
    if(fly)return fly.gmode==='ACTIVE'||fly.gmode==='TERM'&&!SPEC['120'].sarh?'Pitbull · the missile has its own radar now; you could turn away':
      SPEC['120'].sarh?'Keep the radar lock until impact (R-27R needs it in the last 12 km)':'Keep the lock (datalink) · turn ~45° off to crank';
    if(!R.stt)return 'Lock the drone · tap LOCK, or open RDR and tap it on the scope';
    if(pZone&&lockDist>pZone.rne)return 'Locked · watch the launch scale on the right · wait until the caret is inside NE ('+(lockDist/1852).toFixed(0)+' nm)';
    return can120?'Inside the no-escape zone · fire the radar missile now':'Point your nose at him to fire';}
  if(lesson==='LANDING'){
    if(P.onGround)return Math.hypot(P.vel.x,P.vel.z)>2?'On the runway · throttle to idle and hold BRK to stop':'Stopped · nicely done';
    const dz=RWY.z0-P.pos.z, want=BASE_Y+Math.max(0,dz)*Math.tan(3*DEG), dy=P.pos.y-want, w=[];
    if(!P.gear)w.push('Lower the GEAR');
    if(P.kcas>175)w.push('Slow to ~150 kt (throttle back, BRK)'); else if(P.kcas<125)w.push('Too slow · add power');
    if(Math.abs(P.pos.x-RWY.x)>25)w.push('Line up · runway is to your '+((P.pos.x-RWY.x)*P.right.x>0?'left':'right'));
    if(dz>300){if(dy>40)w.push('High · descend');else if(dy<-30)w.push('Low · level off');}
    else if(P.vel.y<-4)w.push('Flare · ease back to slow the sink below 4 m/s');
    return w.join(' · ')||'On glide path · 3° to the threshold, keep '+Math.round(P.kcas)+' kt';}
  if(lesson==='REFUEL'){if(!AC.refuel)return '';
    if(TK.conn)return 'Contact · hold position · '+Math.round(P.fuel/AC.fuelCap*100)+'% · '+Math.max(0,25-trainConnT).toFixed(0)+' s to go';
    if(TK.dist>400)return 'Close on the tanker · match its speed (~'+Math.round(TK.v*Math.sqrt(atm(TK.pos.y).sig)*1.944)+' kt) as you get near';
    return 'Follow the director: '+tankerCue();}
  return '';
}
function nextWave(){
  wave++; const n=Math.min(1+wave,6);
  const heading=Math.atan2(P.fwd.x,P.fwd.z);
  for(let i=0;i<n;i+=2){
    const a=heading+rand(-.9,.9), dist=rand(9000,14000)*engK();
    const c=new V3(P.pos.x+Math.sin(a)*dist,0,P.pos.z+Math.cos(a)*dist);
    c.y=Math.max(Math.max(groundH(c.x,c.z),0)+1500,P.pos.y+rand(-1200,1500));
    const tp=pickBanditType(), ac=AC_DEFS[tp], ld={ir:Math.min(2,ac.srN),rdr:wave>=4?ac.mrN:wave>=2?Math.min(2,ac.mrN):0};
    if(n-i>=2)spawnPair(tp,c,P.pos,ld); else spawnFighter('red',tp,c,P.pos,ld);
  }
  if(wave>1){P.hp=Math.min(100,P.hp+35);rearm();refuel()}
  if(wave>=3&&ground.filter(g=>g.alive).length<wave-1){const a=heading+rand(-1,1),d=rand(12000,18000);spawnGround('sam',P.pos.x+Math.sin(a)*d,P.pos.z+Math.cos(a)*d);spawnGround('aaa',P.pos.x+Math.sin(a)*d+600,P.pos.z+Math.cos(a)*d)}
  message('WAVE '+wave+' · '+n+' BANDITS',2.4);
}
function hitAI(t,amt,how,byPlayer){
  if(!t.alive)return;
  if(t.remote){if(byPlayer)netClaimHit(t,how==='GUNS'?4*amt:75,how);puff(t.pos.x,t.pos.y,t.pos.z,0,0,0,.3,.3,.3,.8,14,20,2);return} t.hp-=amt;
  if(t.hp>0){addHole(t.obj,amt>3?4:1);puff(t.pos.x,t.pos.y,t.pos.z,0,0,0,.3,.3,.3,.8,14,20,2);if(t.kind==='fighter'){t.gLim=Math.max(4,(t.gLim||7)*.8);t.rollK=(t.rollK??1)*.85}if(byPlayer&&t.kind==='bomber')message('BOMBER HIT',.8);if(byPlayer&&clock-(t.fdT||-9)>1.5){t.fdT=clock;feed((t.hp<=1?'Critical hit: ':'Hit: ')+(AC_DEFS[t.type]?AC_DEFS[t.type].name:t.kind==='bomber'?'bomber':'target')+' ('+how.replace(' (WINGMAN)','').toLowerCase()+')','hit')}return}
  if(t.team==='red')killEnemy(t,how,byPlayer); else killFriend(t,how);
}
function killEnemy(e,how,byPlayer=true){
  if(!e.alive)return; e.alive=false; scene.remove(e.obj); explode(e.pos,true); spawnWreck(e);
  const nm=e.kind==='bomber'?'BOMBER':e.kind==='cruise'?'CRUISE MISSILE':'BANDIT';
  if(byPlayer)REC3.lastKill={t:clock,id:e.id};
  if(byPlayer)gciSplash();
  if(byPlayer){kills++;score+=(e.kind==='bomber'?150:e.kind==='cruise'?120:100)*Math.max(1,wave)+(how==='GUNS'?50:0);message(e.kind==='cruise'?'CRUISE MISSILE DOWN':how==='GUNS'?'GUNS KILL':'SPLASH · '+how,1.4)}
  else message(nm+' DOWN · '+how,1.4);
  recEvent((byPlayer?'You killed ':'Wingman killed ')+(e.kind==='bomber'?'a bomber':e.kind==='cruise'?'a cruise missile':'a '+(AC_DEFS[e.type]?AC_DEFS[e.type].name:'bandit'))+' ('+how+')');
}
function killFriend(f,how){
  if(!f.alive)return; f.alive=false; scene.remove(f.obj); explode(f.pos,true); spawnWreck(f);
  message(f.kind==='transport'?'C-130 DESTROYED':'WINGMAN DOWN',2.2); recEvent((f.kind==='transport'?'The C-130':'Your wingman')+' was shot down ('+how+')');
}
const WCMDS=['ENGAGE','COVER','REJOIN','SORT','GROUND'], WSHORT={ENGAGE:'ENG',COVER:'COVER',REJOIN:'REJN',SORT:'SORT',GROUND:'GRND'};
function syncWing(){const w=friends.filter(f=>f.kind==='fighter'&&f.alive&&!f.remote);$('nWing').textContent=w.length?WSHORT[w[0].cmd]||'ENG':'—'}
function wingCmd(){const fl=friends.filter(f=>f.kind==='fighter'&&f.alive&&!f.remote);if(!fl.length)return;
  let i=WCMDS.indexOf(fl[0].cmd); do{i=(i+1)%WCMDS.length}while(WCMDS[i]==='GROUND'&&!ground.some(g=>g.alive));
  const c=WCMDS[i]; for(const w of fl){w.cmd=c;w.retgtT=0;w.engaged=c==='ENGAGE'||c==='SORT'||c==='GROUND'}
  const who=fl.length>1?'FLIGHT':'TWO', txt={ENGAGE:who+', ENGAGE',COVER:who+', COVER ME',REJOIN:who+', REJOIN',SORT:who+', SORT · ONE TARGET EACH',GROUND:who+', ATTACK THE GROUND TARGETS'}[c];
  message(txt,1.4); radio(fl.map(w=>w.cs||2).join(', ')+(c==='REJOIN'?', rejoining.':', copy.'),'wing'); syncWing()}
function endMission(win,text){
  if(missionDone)return; missionDone=true; deathCause=win?'win':'fail'; missionText=text; recEvent(text);
  state='dead'; deadT=2.2; $('ctrls').hidden=true; resetStick(); gunHeld=false; brake=false;
}
let missionText='';
function updateMission(dt){
  if(mission==='TRAINING'){updateLesson(dt);return}
  if(state!=='play')return;
  missionT+=dt;
  if(P.scramble&&!P.onGround){P.scrT+=dt;const agl=P.pos.y-BASE_Y;if(agl>600||P.scrT>30){P.scramble=false;message(mission==='WAVES'?'AIRBORNE · BANDITS INBOUND':'AIRBORNE · WEAPONS FREE',2)}}
  if(mission==='STRIKE'){if(!ground.some(g=>g.objective&&g.alive))endMission(true,'Target area destroyed');return}
  if(sortie){sortieCheck(dt);return}
  if(mission==='WAVES'){
    if(enemies.length===0&&!P.scramble){
      if(waveClearT<=0){waveClearT=3;if(wave>0)message('WAVE '+wave+' CLEAR · REARMED & REFUELED',2.4)}
      waveClearT-=dt; if(waveClearT<=0.0001){waveClearT=0;nextWave()}
    }
    return;
  }
  if(mission==='RUSH'){
    if(kills>=RUSH_KILLS){endMission(true,RUSH_KILLS+' bandits down with '+fmtT(RUSH_TIME-missionT)+' to spare');return}
    if(missionT>=RUSH_TIME){endMission(false,'Time expired: '+kills+' of '+RUSH_KILLS+' bandits down');return}
    if(enemies.length<4&&!P.scramble){const heading=Math.atan2(P.fwd.x,P.fwd.z),a=heading+rand(-.9,.9),dist=rand(9000,14000)*engK();
      const c=new V3(P.pos.x+Math.sin(a)*dist,0,P.pos.z+Math.cos(a)*dist);c.y=Math.max(Math.max(groundH(c.x,c.z),0)+1500,P.pos.y+rand(-1200,1500));
      const tp=pickBanditType(),ac=AC_DEFS[tp];spawnPair(tp,c,P.pos,{ir:Math.min(2,ac.srN),rdr:Math.min(2,ac.mrN)})}
    return;
  }
  if(mission==='INTERCEPT'){
    const bombers=enemies.filter(e=>e.kind==='bomber');
    if(bombers.some(b=>b.pos.z<2500))endMission(false,'A bomber reached its release point');
    else if(!bombers.length)endMission(true,'All four bombers destroyed');
    return;
  }
  if(mission==='ESCORT'){
    const tr=friends.find(f=>f.kind==='transport');
    if(!tr||!tr.alive){endMission(false,'The C-130 was shot down');return}
    for(const q of spawnQ)if(!q.done&&missionT>=q.t){q.done=true;
      const a=rand(-.6,.6),d=rand(16000,20000)*farK();const c=new V3(tr.pos.x+Math.sin(a)*d,tr.pos.y+rand(500,2500),tr.pos.z+Math.cos(a)*d);
      const pr=spawnPair(pickBanditType(),c,tr.pos);pr.forEach(x=>x.escortPref=Math.random()<.65);message('BANDITS · 2-SHIP INBOUND ON THE C-130',2)}
    if(tr.pos.z>=ESCORT_LEN-200)endMission(true,'The C-130 made it home');
    return;
  }
  if(mission==='2V4'){if(!enemies.length)endMission(true,'All four bandits destroyed')}
  if(mission==='4SHIP'){if(!enemies.length)endMission(true,'All six bandits destroyed')}
  // ONLINE: free-for-all until you're shot down or abort
}
function die(cause){
  if(state!=='play')return; state='dead'; deathCause=cause; REC3.deathT=clock; if(mission==='ONLINE'&&NET.active)NET.deaths++; deadT=1.8; P.alive=false; missionDone=true; recEvent('You were '+({terrain:'killed hitting the ground',shot:'shot down by guns',missile:'killed by a missile',ejected:'out of the jet (ejected)',collision:'killed in a mid-air collision',landing:'killed crashing on landing',gearup:'killed landing gear-up',abort:'out (sortie aborted)',fuel:'down after running out of fuel'}[cause]||'down'));
  CM.flrHeld=CM.chfHeld=false; if(cause==='ejected'){deadT=7;playerJet.visible=false;$('ctrls').hidden=true;resetStick();gunHeld=false;brake=false;$('bEject').hidden=true;return}
  explode(P.pos,true); explode(P.pos.clone().addScaledVector(P.fwd,10),true);
  playerJet.visible=false; $('ctrls').hidden=true; resetStick(); gunHeld=false; brake=false;
}

/* ---------------- input ---------------- */
const stick={id:null,ox:0,oy:0,x:0,y:0};
const look={id:null,ox:0,oy:0,y0:0,p0:0,yaw:0,pitch:0};
const stickBase=$('stickBase'),stickKnob=$('stickKnob'),stickHint=$('stickHint');
function resetStick(){stick.id=null;stick.x=0;stick.y=0;stickBase.hidden=true;stickKnob.style.transform=''}
glCanvas.addEventListener('pointerdown',e=>{
  if(state!=='play')return;
  if(e.clientX>W*.62){ // right side of the screen: look around (cockpit head / chase orbit)
    if(look.id!==null)return; e.preventDefault();
    look.id=e.pointerId;look.ox=e.clientX;look.oy=e.clientY;look.y0=look.yaw;look.p0=look.pitch;
    try{glCanvas.setPointerCapture(e.pointerId)}catch(_){}
    return;
  }
  if(stick.id!==null)return;
  e.preventDefault(); audioInit();
  stick.id=e.pointerId;stick.ox=e.clientX;stick.oy=e.clientY;stick.x=0;stick.y=0;
  try{glCanvas.setPointerCapture(e.pointerId)}catch(_){}
  stickBase.style.left=stick.ox+'px';stickBase.style.top=stick.oy+'px';stickBase.hidden=false;stickHint.hidden=true;
});
glCanvas.addEventListener('pointermove',e=>{
  if(e.pointerId===look.id){
    look.yaw=clamp(look.y0-(e.clientX-look.ox)*.011,-2.6,2.6);
    look.pitch=clamp(look.p0-(e.clientY-look.oy)*.011,-.7,1.3);
    return;
  }
  if(e.pointerId!==stick.id)return;
  let dx=e.clientX-stick.ox,dy=e.clientY-stick.oy; const R=56,l=Math.hypot(dx,dy);
  if(l>R){dx*=R/l;dy*=R/l}
  stick.x=dx/R;stick.y=dy/R; stickKnob.style.transform=`translate(${dx}px,${dy}px)`;
});
['pointerup','pointercancel'].forEach(t=>glCanvas.addEventListener(t,e=>{if(e.pointerId===stick.id)resetStick();if(e.pointerId===look.id)look.id=null}));
function holdBtn(el,on,off){
  el.addEventListener('pointerdown',e=>{e.preventDefault();audioInit();try{el.setPointerCapture(e.pointerId)}catch(_){};el.classList.add('on');on()});
  ['pointerup','pointercancel','lostpointercapture'].forEach(t=>el.addEventListener(t,()=>{el.classList.remove('on');off&&off()}));
}
holdBtn($('bGun'),()=>gunHeld=true,()=>gunHeld=false);
// throttle slider
const thrEl=$('thr'),thrKnob=$('thrKnob'),thrFill=$('thrFill');
let thrId=null;
function setThr(v){
  v=clamp(v,0,1); if(Math.abs(v-.8)<.035)v=.8;        // MIL detent
  thrSet=v; const pct=Math.round(v*100);
  thrKnob.style.top=(100-v*100)+'%'; thrFill.style.height=(v*100)+'%';
  thrKnob.textContent=v>.8?'AB':v===.8?'MIL':v<.02?'IDLE':pct+'%';
  thrKnob.classList.toggle('ab',v>.8); thrEl.setAttribute('aria-valuenow',pct);
}
function thrFromY(y){const r=thrEl.getBoundingClientRect();setThr(1-(y-r.top)/r.height)}
thrEl.addEventListener('pointerdown',e=>{e.preventDefault();audioInit();thrId=e.pointerId;try{thrEl.setPointerCapture(e.pointerId)}catch(_){};thrFromY(e.clientY)});
thrEl.addEventListener('pointermove',e=>{if(e.pointerId===thrId)thrFromY(e.clientY)});
['pointerup','pointercancel'].forEach(t=>thrEl.addEventListener(t,e=>{if(e.pointerId===thrId)thrId=null}));
thrEl.addEventListener('keydown',e=>{if(e.code==='ArrowUp'){setThr(thrSet+.05);e.preventDefault()}if(e.code==='ArrowDown'){setThr(thrSet-.05);e.preventDefault()}});
setThr(.8);
let lookHinted=false;
function cycleView(){view=(view+1)%VIEWS.length;flyCamSet=false;camSnap=true;look.yaw=look.pitch=0;
  if(VIEWS[view]==='COCKPIT'&&!lookHinted){lookHinted=true;message('DRAG RIGHT SIDE TO LOOK AROUND',2.4)} else message(VIEWS[view]+' VIEW',1)}
$('bCam').addEventListener('click',cycleView);
holdBtn($('bBrake'),()=>brake=true,()=>brake=false);
holdBtn($('b9'),()=>fire9=true);
holdBtn($('b120'),()=>fire120=true);
$('bPause').addEventListener('click',()=>pause());
addEventListener('keydown',e=>{
  keys[e.code]=true; audioInit();
  if(state==='play'){
    if(e.code==='Space'){gunHeld=true;e.preventDefault()}
    if(e.code==='KeyF')fire9=true;
    if(e.code==='KeyR')fire120=true;
    if(e.code==='KeyB')brake=true;
    if(e.code==='KeyV')cycleView();
    if(e.code==='KeyL'&&!e.repeat)$('bGear').click();
    if(e.code==='KeyT')quickLock();
    if(e.code==='KeyY')stepTarget();
    if(e.code==='KeyG')$('rAcm').click();
    if(e.code==='KeyM')$('rMode').click();
    if(e.code==='BracketRight')$('rUp').click();
    if(e.code==='BracketLeft')$('rDn').click();
    if(e.code==='KeyX')$('bRdr').click();
    if(e.code==='KeyZ'&&!CM.flrHeld){CM.flrHeld=true;CM.flrT=0}
    if(e.code==='KeyC'&&!CM.chfHeld){CM.chfHeld=true;CM.chfT=0}
    if(e.code==='KeyJ')toggleECM();
    if(e.code==='KeyK')deployDecoy();
    if(e.code==='KeyH')agRelease();
    if(e.code==='KeyN')agNext();
    if(e.code==='KeyU')$('cAuto').click();
    if(e.code==='KeyP'||e.code==='Escape')pause();
  } else if(state==='paused'&&(e.code==='KeyP'||e.code==='Escape')) resume();
});
addEventListener('keyup',e=>{
  keys[e.code]=false;
  if(e.code==='Space')gunHeld=false;
  if(e.code==='KeyB')brake=false;
  if(e.code==='KeyZ')CM.flrHeld=false;
  if(e.code==='KeyC')CM.chfHeld=false;
});
addEventListener('blur',()=>{for(const k in keys)keys[k]=false;gunHeld=false;brake=false});
document.addEventListener('visibilitychange',()=>{if(document.hidden&&state==='play')pause()});

/* ---------------- overlay ---------------- */
function setInvertLabel(){$('bInvert').textContent=invert?'Stick: push up to climb':'Stick: pull back to climb'}
function setSoundLabel(){$('bSound').textContent='Sound: '+(A.on?'on':'off')}
setInvertLabel();setSoundLabel();
$('bInvert').addEventListener('click',()=>{invert=!invert;setInvertLabel();try{localStorage.setItem('viperInvert',invert?'1':'0')}catch(e){}});
$('bLoad').addEventListener('click',()=>{cmLoad=(cmLoad+1)%CM_LOADS.length;setLoadLabel();
  try{localStorage.setItem('viperCmLoad',cmLoad)}catch(e){}});
$('bSound').addEventListener('click',()=>{A.on=!A.on;setSoundLabel();if(A.master)A.master.gain.value=A.on?.55:0});
$('bStart').addEventListener('click',()=>{audioInit();if(state==='paused')resume();else startGame()});
$('bQuit').addEventListener('click',()=>{state='play';die('abort');deadT=0.01});
function showOverlay(kind){
  const ov=$('ov'); if(!kind){ov.hidden=true;return}
  ov.hidden=false; $('bReplay').hidden=true; $('bPhoto').hidden=true; $('campBox').hidden=mission!=='CAMPAIGN'||kind==='pause'; if(mission==='CAMPAIGN')renderCamp(); $('lobby').hidden=!(mission==='ONLINE'&&kind!=='pause'); if(mission==='ONLINE')renderRoster();
  const stats=$('ovStats'),keysEl=$('ovKeys');
  if(kind==='pause'){
    $('ovEyebrow').textContent='Holding pattern';$('ovTitle').textContent='Paused';
    $('ovLede').textContent=MISSIONS[mission]+' in progress: '+missionStatus().toLowerCase()+'. Everything holds until you resume.';
    stats.hidden=true;keysEl.hidden=false;$('debrief').hidden=true;$('bStart').textContent='Resume';$('bQuit').hidden=false;$('bAC').hidden=true;$('bPhoto').hidden=false;$('bReplay').hidden=!canReplay(true);$('bReplay').textContent='Replay last kill';
  } else {
    const causes={ejected:'Ejected',landing:'Crashed on landing',gearup:'Landed with the gear up',terrain:'Controlled flight into terrain',shot:'Shot down by guns',missile:'Killed by a missile',collision:'Mid-air collision',abort:'Sortie aborted'};
    const win=deathCause==='win', fail=deathCause==='fail';
    $('ovEyebrow').textContent=win||fail?MISSIONS[mission]+' · '+missionText:(causes[deathCause]||'Sortie over');
    $('ovTitle').textContent=win?'Mission Complete':fail?'Mission Failed':deathCause==='abort'?'Sortie Aborted':deathCause==='ejected'?(P.rescued?'Rescued':'Captured'):'Shot Down';
    $('ovLede').textContent=win?'Good work. Scrub the replay below to see how each missile did.':fail?'The replay below shows where it went wrong.':'Watch the replay: every missile shot and why it hit or missed is listed below.';
    if(campNote)$('ovLede').textContent=campNote+' '+$('ovLede').textContent;
    if(lastAward&&lastAward.daily&&lastAward.daily.length)$('ovLede').textContent='Daily task done: '+lastAward.daily.join(', ')+'. '+$('ovLede').textContent;
    if(deathCause==='ejected'&&P.rescueText)$('ovLede').textContent=P.rescueText+'. '+(P.rescued?'You live to fly again; your career record keeps the streak.':'');
    stats.innerHTML=`<div class="stat"><span>Score</span><b>${score}</b></div><div class="stat"><span>${mission==='WAVES'?'Wave':'Time'}</span><b>${mission==='WAVES'?wave:fmtT(missionT)}</b></div><div class="stat"><span>Kills</span><b>${kills}</b></div><div class="stat"><span>Max G</span><b>${P.maxG.toFixed(1)}</b></div><div class="stat"><span>Best</span><b>${best}</b></div>`;
    const rew=$('ovRew');rew.innerHTML='';
    if(lastAward){const d=document.createElement('div');d.className='stat';d.innerHTML='<span>XP</span><b></b>';d.querySelector('b').textContent='+'+lastAward.xp.toLocaleString();rew.appendChild(d);
      if(lastAward.prog){const g=lastAward.prog;for(const [l,v] of [['Silver Lions','+'+g.sl.toLocaleString()],['Repair',g.rep?'−'+g.rep.toLocaleString():'none'],['Free RP','+'+g.fr.toLocaleString()]]){const e=document.createElement('div');e.className='stat';e.innerHTML='<span></span><b></b>';e.children[0].textContent=l;e.children[1].textContent=v;rew.appendChild(e)}}
      if(lastAward.promoted)$('ovLede').textContent='Promoted to '+lastAward.promoted+'!'+(lastAward.newJets.length?' Unlocked: '+lastAward.newJets.join(', ')+'.':'')+' '+$('ovLede').textContent}
    stats.hidden=false;keysEl.hidden=true;$('bStart').textContent='Fly again';$('bReplay').hidden=!canReplay(false);$('bReplay').textContent='Watch replay';$('debrief').hidden=false;openDebrief();$('bQuit').hidden=true;$('bAC').hidden=false;
  }
}
// top-down replay
let dbT=1,dbPlaying=false,dbBounds=null,dbRaf=0;
function openDebrief(){
  const F=REC.frames; dbBounds=null;
  if(F.length){let x0=1e9,x1=-1e9,z0=1e9,z1=-1e9;
    const ext=(x,z)=>{x0=Math.min(x0,x);x1=Math.max(x1,x);z0=Math.min(z0,z);z1=Math.max(z1,z)};
    for(const f of F){if(f.p)ext(f.p[0],f.p[1]);for(const e of f.e)ext(e[1],e[2]);for(const e of f.f)ext(e[1],e[2])}
    const pad=Math.max(2000,(Math.max(x1-x0,z1-z0))*.08);dbBounds={x0:x0-pad,x1:x1+pad,z0:z0-pad,z1:z1+pad}}
  const list=$('dbList'); list.innerHTML='';
  const ms=[...REC.msl.values()];
  if(!ms.length){const li=document.createElement('li');li.textContent='No missiles fired this sortie.';list.appendChild(li)}
  for(const r of ms){const li=document.createElement('li');li.className=r.res==='HIT'?'hit':r.res?'miss':'';
    li.textContent=`${fmtT(r.t)} ${r.who} · ${r.name} → ${r.target}: ${r.res==='HIT'?'HIT':r.res?'MISS, '+r.why.toLowerCase():'in flight when the sortie ended'}`;list.appendChild(li)}
  dbT=1;dbPlaying=false;$('dbPlay').textContent='Play';$('dbSlider').value=1000;drawDebrief();
}
function drawDebrief(){
  const cv=$('dbCanvas'),r=cv.getBoundingClientRect(); if(!r.width)return;
  cv.width=r.width*DPR;cv.height=r.height*DPR;const c=cv.getContext('2d');c.setTransform(DPR,0,0,DPR,0,0);
  const w=r.width,h=r.height;c.fillStyle='#06100c';c.fillRect(0,0,w,h);
  const F=REC.frames;if(!F.length||!dbBounds){$('dbTime').textContent='0:00';return}
  const b=dbBounds,sc=Math.min(w/(b.x1-b.x0),h/(b.z1-b.z0)),ox=(w-(b.x1-b.x0)*sc)/2,oy=(h-(b.z1-b.z0)*sc)/2;
  const X=x=>ox+(b.x1-x)*sc, Y=z=>h-(oy+(z-b.z0)*sc);   // north (+z) up, east (−x) right
  c.strokeStyle='rgba(125,255,154,.08)';c.lineWidth=1;const step=10000;
  for(let x=Math.ceil(b.x0/step)*step;x<b.x1;x+=step){c.beginPath();c.moveTo(X(x),0);c.lineTo(X(x),h);c.stroke()}
  for(let z=Math.ceil(b.z0/step)*step;z<b.z1;z+=step){c.beginPath();c.moveTo(0,Y(z));c.lineTo(w,Y(z));c.stroke()}
  c.fillStyle='rgba(125,255,154,.35)';c.font=`10px ${FONT}`;c.fillText('10 km grid',6,h-6);
  const idx=Math.min(F.length-1,Math.round(dbT*(F.length-1))), tNow=F[idx].t;
  const trails=new Map();
  for(let i=0;i<=idx;i++){const f=F[i];
    const add=(k,x,z,col)=>{if(!trails.has(k))trails.set(k,{col,pts:[]});trails.get(k).pts.push([X(x),Y(z)])};
    if(f.p)add('p',f.p[0],f.p[1],'#7dff9a');for(const e of f.e)add('e'+e[0],e[1],e[2],'#ff5a4e');for(const e of f.f)add('f'+e[0],e[1],e[2],'#6fb7ff');
    for(const m of f.m)add('m'+m[0],m[1],m[2],m[3]==='red'?'rgba(255,180,170,.7)':'rgba(220,255,230,.7)')}
  for(const [k,tr] of trails){c.strokeStyle=tr.col;c.globalAlpha=k[0]==='m'?.6:.55;c.lineWidth=k[0]==='m'?1:1.6;c.beginPath();
    tr.pts.forEach((p,i)=>i?c.lineTo(p[0],p[1]):c.moveTo(p[0],p[1]));c.stroke()}
  c.globalAlpha=1;const f=F[idx];
  const dot=(x,z,col,rad)=>{c.fillStyle=col;c.beginPath();c.arc(X(x),Y(z),rad,0,Math.PI*2);c.fill()};
  if(f.p)dot(f.p[0],f.p[1],'#7dff9a',4);for(const e of f.e)dot(e[1],e[2],'#ff5a4e',e[3]==='fighter'?3.5:5);for(const e of f.f)dot(e[1],e[2],'#6fb7ff',e[3]==='fighter'?3.5:5);
  for(const m of f.m)dot(m[1],m[2],'#ffffff',1.8);
  const ev=REC.events.filter(e=>e.t<=tNow).slice(-2);c.fillStyle='rgba(232,240,234,.85)';c.font=`11px ${FONT}`;
  ev.forEach((e,i)=>c.fillText(fmtT(e.t)+' '+e.text.slice(0,Math.floor(w/6.6)),6,14+i*14));
  $('dbTime').textContent=fmtT(tNow);
}
function dbLoop(){if(!dbPlaying)return;const F=REC.frames;const n=Math.max(1,F.length-1);dbT=Math.min(1,dbT+4/(n)); $('dbSlider').value=Math.round(dbT*1000);drawDebrief();
  if(dbT>=1){dbPlaying=false;$('dbPlay').textContent='Play';return}dbRaf=requestAnimationFrame(dbLoop)}
$('dbPlay').addEventListener('click',()=>{dbPlaying=!dbPlaying;$('dbPlay').textContent=dbPlaying?'Pause':'Play';if(dbPlaying){if(dbT>=1)dbT=0;dbLoop()}});
$('dbSlider').addEventListener('input',e=>{dbT=e.target.value/1000;dbPlaying=false;$('dbPlay').textContent='Play';drawDebrief()});
function pause(){if(state!=='play')return;state='paused';gunHeld=false;brake=false;resetStick();$('ctrls').hidden=true;showOverlay('pause')}
function resume(){recenterTilt();state='play';showOverlay(null);$('ctrls').hidden=false;last=performance.now()}

// Adaptive quality: if play stays under ~35 fps for ~3 s, step the graphics tier down once (not saved as the user's preference).
let aqAvg=16,aqSlow=0,aqCool=0;
const NO_AQ=/[?&]noaq\b/.test(location.search);   // dev/screenshots: keep the chosen quality
function autoQuality(ms){
  if(NO_AQ)return;
  if(state!=='play'||!(ms>0)||ms>250){aqSlow=0;return}   // ignore pauses and tab switches
  aqAvg+=(ms-aqAvg)*.05; aqCool=Math.max(0,aqCool-ms);
  if(aqAvg>28.5&&aqCool<=0){aqSlow+=ms;if(aqSlow>3000){const k=Object.keys(QUALS),i=k.indexOf(quality);aqSlow=0;aqCool=20000;if(i>0){setQuality(k[i-1],true);aqAvg=16;message('GRAPHICS LOWERED FOR FRAME RATE',2.5)}}}
  else aqSlow=0;
}
function setQuality(q,auto){quality=q;if(!auto)try{localStorage.setItem('viperQuality',q)}catch(e){}
  DPR=Math.min(window.devicePixelRatio||1,QUALS[q].dpr); renderer.setPixelRatio(DPR);
  terrain.geometry.dispose(); terrain.geometry=buildTerrainGeo(QUALS[q].seg); tGeo=terrain.geometry; tCx=NaN; applyCloudCount(); resize();
  $('bQual').textContent='Graphics: '+({LOW:'Low',MED:'Medium',HIGH:'High'})[q]; setShadows(q==='HIGH')}
/* ---------------- resize ---------------- */
let W=1,H=1,INS={t:0,r:0,b:0,l:0};
// cockpit uses a tighter field of view and a raised eye point so the HUD and the panel both fit
let projKey='';
function applyProj(){
  // HG.on shifts the jet left of the editor panel; HG.bg parks it right of the menu's aircraft card
  const pit=VIEWS[view]==='COCKPIT', key=pit+'|'+W+'|'+H+'|'+HG.on+'|'+HG.bg; if(key===projKey)return; projKey=key;
  const fov=pit?(W<H?74:58):(W<H?86:66);
  for(const cam of [camera,cockCam]){cam.fov=fov;cam.aspect=W/H;if(pit)cam.setViewOffset(W,H,0,H*(W<H?.07:.16),W,H);else if(HG.on)cam.setViewOffset(W,H,W<H?0:W*.2,W<H?H*.2:0,W,H);else if(HG.bg)cam.setViewOffset(W,H,W<H?0:-W*.14,W<H?-H*.06:0,W,H);else cam.clearViewOffset();cam.updateProjectionMatrix()}
  pMat.uniforms.scale.value=H*DPR/2/Math.tan(fov*Math.PI/360);
}
function resize(){
  W=innerWidth;H=innerHeight;renderer.setSize(W,H,false);
  projKey='';applyProj();
  hud.width=W*DPR;hud.height=H*DPR;hctx.setTransform(DPR,0,0,DPR,0,0);
  const cs=getComputedStyle($('safe'));
  INS={t:parseFloat(cs.paddingTop)||0,r:parseFloat(cs.paddingRight)||0,b:parseFloat(cs.paddingBottom)||0,l:parseFloat(cs.paddingLeft)||0};
}
addEventListener('resize',resize);resize();

/* ---------------- player ---------------- */
const _a=new V3(),_b=new V3(),_c=new V3(),_d=new V3(),_e=new V3();
function distSeg(p,a,b){_a.subVectors(b,a);const l2=_a.lengthSq();let t=l2>0?_b.subVectors(p,a).dot(_a)/l2:0;t=clamp(t,0,1);_c.copy(a).addScaledVector(_a,t);return _c.distanceTo(p)}
// stick shaping: dead zone, then a blend of linear and squared response; sensitivity scales the result
var SENS={Low:.7,Normal:1,High:1.3}, DZS=[0,.05,.1,.15];
var sens='Normal', dz=1; try{sens=localStorage.getItem('vsSens')||'Normal';dz=+(localStorage.getItem('vsDz')??1)}catch(e){}
const shape=v=>{const d=DZS[dz]||0,a=Math.abs(v);if(a<d)return 0;const u=Math.sign(v)*(a-d)/(1-d);return clamp((u*Math.abs(u)*.6+u*.4)*SENS[sens],-1,1)};
/* gamepad (standard mapping): left stick fly, right stick look, RT gun, A short-range, B long-range, X lock, Y view,
   LB flares, RB chaff, LT air-to-ground, D-pad up/down throttle, D-pad left TGP, right wing command, Back radar, Start pause, L3 ECM */
const GP={on:false,x:0,y:0,lx:0,ly:0,prev:[],name:''};
function pollGamepad(dt){let pads=[];try{pads=navigator.getGamepads?navigator.getGamepads():[]}catch(e){}
  const g=[...pads].find(p=>p&&p.connected); if(!g){if(GP.on){GP.on=false;message('CONTROLLER DISCONNECTED',1.2)}GP.x=GP.y=0;return}
  if(!GP.on){GP.on=true;GP.name=g.id;message('CONTROLLER CONNECTED',1.4)}
  const ax=i=>Math.abs(g.axes[i]||0)<.08?0:g.axes[i];
  GP.x=ax(0);GP.y=ax(1);GP.lx=ax(2);GP.ly=ax(3);
  const b=i=>!!(g.buttons[i]&&g.buttons[i].pressed), edge=i=>b(i)&&!GP.prev[i];
  if(b(7))gunHeld=true; else if(GP.prev[7])gunHeld=false;
  if(edge(0))fire9=true; if(edge(1))fire120=true; if(edge(2))quickLock(); if(edge(3))cycleView();
  if(edge(4)){CM.flrHeld=true;CM.flrT=0} if(GP.prev[4]&&!b(4))CM.flrHeld=false;
  if(edge(5)){CM.chfHeld=true;CM.chfT=0} if(GP.prev[5]&&!b(5))CM.chfHeld=false;
  if(edge(6))agRelease(); if(b(12))setThr(thrSet+.5*dt); if(b(13))setThr(thrSet-.5*dt);
  if(edge(14))$('cTgp').click(); if(edge(15))wingCmd(); if(edge(8))$('bRdr').click(); if(edge(9))(state==='play'?pause():state==='paused'?resume():0); if(edge(10))toggleECM();
  if(state==='play'&&(GP.lx||GP.ly)){look.yaw=clamp(look.yaw-GP.lx*2.2*dt,-2.6,2.6);look.pitch=clamp(look.pitch-GP.ly*1.6*dt,-.6,1.2)}
  GP.prev=g.buttons.map(x=>x.pressed)}
const qTmp=new THREE.Quaternion();

/* ---------------- fuel and system damage ---------------- */
// fuel: thrust × specific fuel consumption; jet gets lighter as it burns. Starts at 75 % of internal.
function resetSystems(){P.sys={eng:Array(AC.engines).fill(0),fireT:Array(AC.engines).fill(0),hyd:false,radar:false,leak:false};P.thrK=1;P.rollK=1;P.gLim=AC.gmax;P.bingo=false;P.lowFuel=false}
function refuel(){P.fuel=Math.max(P.fuel||0,.75*AC.fuelCap);resetSystems();P.bingo=false;P.lowFuel=false}
const fuelStr=kg=>AC.fuelUnit==='LB'?Math.round(kg*2.2046/10)*10+' LB':Math.round(kg/10)*10+' KG';
const ENG_NAME=i=>AC.engines>1?(i===0?'LEFT ':'RIGHT '):'';
function damageSystem(n){
  n*=PRESETS[preset].dmg;n=Math.floor(n)+(Math.random()<n%1?1:0);   // preset scales how many systems a hit takes out
  for(let i=0;i<n;i++){const r=Math.random();
    if(r<.32){const ok=P.sys.eng.map((v,j)=>v===0?j:-1).filter(j=>j>=0);if(ok.length){const j=ok[Math.random()*ok.length|0];P.sys.eng[j]=1;P.sys.fireT[j]=7;message(ENG_NAME(j)+'ENGINE FIRE',1.8);recEvent(ENG_NAME(j).toLowerCase()+'engine fire');buzz([200,80,200])}}
    else if(r<.52){if(!P.sys.hyd){P.sys.hyd=true;message('HYDRAULICS FAILED · G AND ROLL LIMITED',1.8);recEvent('Hydraulics failed')}}
    else if(r<.72){if(!P.sys.radar){P.sys.radar=true;if(R.stt&&R.sttSrc==='RDR')breakLock();R.tracks.clear();message('RADAR FAILED',1.6);recEvent('Radar failed')}}
    else if(r<.9){if(!P.sys.leak){P.sys.leak=true;message('FUEL LEAK',1.6);recEvent('Fuel leak')}}
  }
}
function updateSystems(dt,auto){
  const sy=P.sys; let k=0;
  for(let i=0;i<sy.eng.length;i++){
    if(sy.eng[i]===1){sy.fireT[i]-=dt; if(Math.random()<.6)puff(P.pos.x,P.pos.y,P.pos.z,P.vel.x*.2,P.vel.y*.2,P.vel.z*.2,.15,.15,.15,.7,4,10,2.5);
      if(sy.fireT[i]<=0){sy.eng[i]=2;message(ENG_NAME(i)+'ENGINE FAILED',2);recEvent(ENG_NAME(i).toLowerCase()+'engine failed')}}
    k+=sy.eng[i]===0?1:sy.eng[i]===1?.7:0;
  }
  k/=sy.eng.length;
  if(P.fuel<=0)k=0;
  P.thrK=k; P.rollK=sy.hyd?.45:1; P.gLim=sy.hyd?Math.min(5,AC.gmax):AC.gmax;
  if(!auto){
    const sfc=throttle<=.8?AC.sfcDry:AC.sfcDry+(AC.sfcAB-AC.sfcDry)*(throttle-.8)/.2;
    P.fuelFlow=(P.lastT||0)*sfc*2.832e-5;                      // kg/s
    P.fuel=Math.max(0,P.fuel-P.fuelFlow*dt-(sy.leak?3:0)*dt);
    if(!P.bingo&&P.fuel<.25*AC.fuelCap){P.bingo=true;message('BINGO FUEL',2);buzz([60,60,60])}
    if(P.fuel>0)P.flamedOut=false;
    if(!P.lowFuel&&P.fuel<.1*AC.fuelCap){P.lowFuel=true;message('FUEL LOW',2)}
    if(P.fuel<=0&&!P.flamedOut){P.flamedOut=true;message('FLAMEOUT · OUT OF FUEL',2.4);recEvent('Ran out of fuel')}
  }
  P.mass=AC.MASS+(P.fuel-.6*AC.fuelCap)-(P.jettKg||0);
}
function updatePlayer(dt,auto){
  axes(P);
  let rollIn=0,pitchIn=0,yawIn=0;
  const bank=bankOf(P);
  if(auto){
    rollIn=clamp((.4-bank)*2,-1,1);
    const nNeed=1/Math.max(.3,Math.cos(bank))+(4000-P.pos.y)*.0008-P.vel.y*.02;
    pitchIn=nNeed>=1?(nNeed-1)/(G_MAX-1):(nNeed-1)/4;
    throttle=.8;
  } else {
    const kx=(keys.KeyD||keys.ArrowRight?1:0)-(keys.KeyA||keys.ArrowLeft?1:0);
    const ky=(keys.KeyS||keys.ArrowDown?1:0)-(keys.KeyW||keys.ArrowUp?1:0);
    const tx=tilt.on&&stick.id===null?tilt.x:0, ty=tilt.on&&stick.id===null?tilt.y:0;
    rollIn=clamp(shape(stick.x)+kx+tx+shape(GP.x),-1,1);
    const sy=clamp(shape(stick.y)+ky+ty-shape(GP.y)*-1,-1,1); pitchIn=invert?-sy:sy;
    yawIn=(keys.KeyE?1:0)-(keys.KeyQ?1:0);
    // keyboard throttle: Shift/= up, Ctrl/- down
    if(keys.ShiftLeft||keys.ShiftRight||keys.Equal)setThr(thrSet+.5*dt);
    if(keys.ControlLeft||keys.ControlRight||keys.Minus)setThr(thrSet-.5*dt);
    // engine spool: ~3 s idle→MIL, afterburner lights faster
    let cmd=thrSet;
    // G-LOC: pilot is out, hands off the stick
    if(P.gloc>0){rollIn=0;pitchIn=0;yawIn=0}
    // Auto-GCAS: predicts ground impact, rolls wings level and pulls 5 g
    const gh=Math.max(groundH(P.pos.x,P.pos.z),0), agl=P.pos.y-gh;
    const ahead=Math.max(groundH(P.pos.x+P.vel.x*3,P.pos.z+P.vel.z*3),0);
    /* Only the F-16s carry it (fielded on the F-16 in 2014). Like the real one it waits until the last moment a
       roll-level + 5 g pull still clears the ground, then gives the jet back as soon as the flight path is safe.
       Pulling harder than it does yourself overrides its pitch. */
    if(AC.id.startsWith('F16')&&!P.gear&&!P.onGround&&P.alive){
      const v=Math.max(60,P.vel.length()), gam=Math.asin(clamp(P.vel.y/v,-1,1));
      const ahead2=Math.max(groundH(P.pos.x+P.vel.x*2,P.pos.z+P.vel.z*2),0), clr=Math.min(agl,P.pos.y-Math.max(ahead,ahead2));
      const tRoll=.4+Math.abs(bank)/(AC.roll||4), sink=Math.max(0,-P.vel.y);
      const need=sink*tRoll+(gam<0?v*v/(G*4)*(1-Math.cos(gam)):0)+40;
      if(!P.gcas&&((P.vel.y<-1&&clr<need)||(P.pos.y+P.vel.y*2-ahead2)<12)){P.gcas=true;message('AUTO GCAS',1.2)}
      if(P.gcas&&P.vel.y>=1&&clr>40)P.gcas=false;
    } else P.gcas=false;
    if(P.gcas){
      rollIn=clamp(-bank*2.5,-1,1);
      pitchIn=Math.max(pitchIn,Math.abs(bank)<.8?(5-1)/(G_MAX-1):0);
      cmd=Math.max(cmd,.8);
    }
    const rate=cmd>throttle?(throttle>=.8?1.5:.3):.45;
    throttle+=clamp(cmd-throttle,-rate*dt,rate*dt);
  }
  updateSystems(dt,auto);
  P.inRoll=rollIn; P.inPitch=clamp(pitchIn,-1,1);
  if(P.onGround&&!auto)(P.onDeck?deckRoll:groundRoll)(dt,rollIn,clamp(pitchIn,-1,1)); else fly(P,dt,rollIn,clamp(pitchIn,-1,1),yawIn,throttle,brake);
  if(P.pos.y>18000){P.pos.y=18000;if(P.vel.y>0)P.vel.y=0}
  // own angular velocity (for the gunsight)
  qTmp.copy(qPrev).invert().premultiply(playerJet.quaternion);
  if(qTmp.w<0){qTmp.x*=-1;qTmp.y*=-1;qTmp.z*=-1;qTmp.w*=-1}
  const ang=2*Math.acos(clamp(qTmp.w,-1,1)), sn=Math.sqrt(1-qTmp.w*qTmp.w);
  if(sn>1e-6&&dt>0)_e.set(qTmp.x/sn,qTmp.y/sn,qTmp.z/sn).multiplyScalar(ang/dt); else _e.set(0,0,0);
  omega.lerp(_e,.25); qPrev.copy(playerJet.quaternion);
  // pilot g tolerance
  if(!auto){
    P.maxG=Math.max(P.maxG,P.n);
    const over=Math.max(0,P.n-6-.25*crewLvl('g')), under=Math.max(0,-P.n-2);
    if(over>0||under>0)P.gStress+=(Math.pow(over,1.6)*.035+under*.08)*dt; else if(P.n<4.5)P.gStress=Math.max(0,P.gStress-.3*dt);
    if(P.gloc>0){P.gloc-=dt;if(P.gloc<=0)P.gStress=.6}
    else if(P.gStress>=1){P.gloc=5;message('G-LOC',2)}
  }
  const ab=throttle>.81, fw=ab?1.1:.45+throttle*.55; setAB(playerJet,ab); setAB(outside,ab); pFlame.scale.set(fw,fw,ab?.8+(throttle-.8)*5*(1+Math.random()*.25):.1+throttle*.55);
  if(ab&&state==='play'){_d.copy(P.pos).addScaledVector(P.fwd,-8.5);puff(_d.x,_d.y,_d.z,0,0,0,1,.6,.25,.6,1.8,5,.16)}
  if(!auto&&!P.onGround&&state==='play'&&!cvContact()){if(!checkTouchdown()){const gh=Math.max(groundH(P.pos.x,P.pos.z),0);if(P.pos.y<gh+1.2)die('terrain')}}
}

/* ---------------- AI: team-aware fighters (red bandits, blue wingman) and heavies (bombers, transport) ---------------- */
const _s1=new V3(),_s2=new V3(),_s3=new V3(),_s4=new V3(),_s5=new V3();
const RWR_SYM={F16:'16',F16B70:'16',GRIPEN:'39',GRIPENE:'39',MIG29:'29',MIG29UPG:'29',MIG35:'35',SU27:'27',SU35:'S35'};
// bandit missile seekers: how easily each is fooled (game estimates; newer imaging seekers are much harder)
const SEEKER={F16:{flareP:.12,chaffP:.08},F16B70:{flareP:.12,chaffP:.06},GRIPEN:{flareP:.08,chaffP:.06},GRIPENE:{flareP:.08,chaffP:.05},MIG29:{flareP:.3,chaffP:.15},MIG29UPG:{flareP:.3,chaffP:.1},MIG35:{flareP:.25,chaffP:.08},SU27:{flareP:.3,chaffP:.15},SU35:{flareP:.2,chaffP:.07}};
function aiSpecs(type){const ac=AC_DEFS[type],k=SEEKER[type]||ac.seek||{flareP:.15,chaffP:.08};
  return {IR:Object.assign({},ac.sr,{flareP:k.flareP}),RDR:Object.assign({},ac.mr,{chaffP:k.chaffP})}}
function blueJets(){const a=[];if(state==='play'&&P.alive&&!P.scramble)a.push(P);for(const f of friends)if(f.alive)a.push(f);return a}
function pickTarget(e){
  if(e.team==='red'){
    if(e.kind!=='fighter')return null;
    const tr=friends.find(f=>f.alive&&f.kind==='transport');
    if(tr&&e.escortPref)return tr;
    let best=null,bd=60000;for(const b of blueJets()){const d=b.pos.distanceTo(e.pos);if(d<bd){bd=d;best=b}}return best;
  }
  // blue wingman / flight
  if(e.cmd==='REJOIN')return null;
  if(e.cmd==='GROUND'){let best=null,bd=80000;for(const g of ground){if(!g.alive)continue;const d=g.pos.distanceTo(e.pos);if(d<bd){bd=d;best=g}}if(best)return best}
  if(e.cmd==='SORT'){const taken=new Set(friends.filter(f=>f!==e&&f.alive&&f.cmd==='SORT'&&f.tgt).map(f=>f.tgt));if(lockTarget)taken.add(lockTarget);
    let best=null,bd=60000;for(const r of enemies){if(!r.alive||taken.has(r))continue;const d=r.pos.distanceTo(e.pos);if(d<bd){bd=d;best=r}}if(best)return best}
  if(e.cmd==='COVER'){let best=null,bd=20000;for(const r of enemies){if(!r.alive||r.tgt!==P)continue;const d=r.pos.distanceTo(P.pos);if(d<bd){bd=d;best=r}}return best}
  let best=null,bd=60000;for(const r of enemies){if(!r.alive)continue;const d=r.pos.distanceTo(e.pos);if(d<bd){bd=d;best=r}}return best;
}
// which missile coming at this jet does it know about? radar shots via RWR, heat-seekers only by eye (<3.5 km) or a MAW
function threatTo(e){
  let best=null,bd=1e9;
  const look=(m,radar,burning)=>{const d=m.m.position.distanceTo(e.pos);
    const known=radar?d<25000:(d<sk(e).irSee*(weather==='RAIN'?.6:1)||(e.ac&&e.ac.cm.maws&&burning&&d<10000));
    if(known&&d<bd){bd=d;best={m,d,radar}}};
  for(const m of missiles)if(m.on&&m.target===e){if(m.type==='120'&&SPEC['120'].arh&&!m.term)continue;look(m,m.type==='120',m.t<SPEC[m.type].burn)}
  for(const m of eMissiles)if(m.on&&m.target===e&&m.team!==e.team)look(m,m.type==='RDR',m.t<m.spec.burn);
  if(!best)return null;
  // reaction time, and lower-skill pilots sometimes never react to a given missile
  if(e.awareOf!==best.m){e.awareOf=best.m;e.awareT=clock;e.willDef=Math.random()<sk(e).defP}
  if(!e.willDef||clock-e.awareT<sk(e).react)return null;
  return best;
}
// lift-vector steering: roll the lift onto the desired direction, then pull
function steer(e,dt,dir,gK,thr){
  const ang=e.fwd.angleTo(dir);
  const perp=_s1.copy(dir).addScaledVector(e.fwd,-e.fwd.dot(dir));
  const lift=_s2.set(0,0,0);
  if(perp.lengthSq()>1e-8)lift.copy(perp.normalize()).multiplyScalar(Math.min(ang*2.2,1)*e.gLim*gK*G);
  lift.y+=G; lift.addScaledVector(e.fwd,-e.fwd.dot(lift));
  const nNeed=lift.length()/G; lift.normalize();
  const signed=Math.atan2(_s3.crossVectors(e.up,lift).dot(e.fwd),e.up.dot(lift));
  const rollIn=clamp(signed*2.5,-1,1), nCmd=nNeed*Math.max(0,Math.cos(signed));
  const pitchIn=nCmd>=1?(nCmd-1)/(e.gLim-1):(nCmd-1)/4;
  fly(e,dt,rollIn,clamp(pitchIn,-1,1),0,thr,false);
}
function aiDispense(e,type){ // visual flares/chaff from an AI jet
  if(type==='flare')for(let i=0;i<6;i++)puff(e.pos.x,e.pos.y,e.pos.z,e.vel.x*.3+rand(-30,30),e.vel.y*.3-20,e.vel.z*.3+rand(-30,30),1,.95,.7,1,4,2,1.6);
  else for(let i=0;i<8;i++)puff(e.pos.x,e.pos.y,e.pos.z,rand(-15,15),rand(-15,15),rand(-15,15),.78,.8,.84,.55,5,18,rand(2,4));
}
function ownMissileOn(e,t){for(const m of eMissiles)if(m.on&&m.owner===e&&m.target===t)return m;return null}
function missilesAt(t){let n=0;for(const m of eMissiles)if(m.on&&m.target===t)n++;return n}
// subsonic land-attack cruise missile: ~250 m/s, terrain-following at ~60 m, flies to its target point
function buildCruise(){const g=new THREE.Group(),m=new THREE.MeshStandardMaterial({color:0x8d9196,roughness:.6,flatShading:true});
  const b=new THREE.Mesh(new THREE.CylinderGeometry(.32,.32,6.2,8).rotateX(Math.PI/2),m);g.add(b);const n=new THREE.Mesh(new THREE.ConeGeometry(.32,1,8).rotateX(Math.PI/2),m);n.position.z=3.6;g.add(n);
  const w=new THREE.Mesh(new THREE.BoxGeometry(3.2,.06,.5),m);w.position.z=.3;g.add(w);const t=new THREE.Mesh(new THREE.BoxGeometry(.06,.7,.5),m);t.position.set(0,.4,-2.8);g.add(t);return g}
function spawnCruise(pos,wp){const obj=buildCruise();obj.position.copy(pos);obj.lookAt(wp);scene.add(obj);
  const e=Object.assign(newJet(obj,3,AC_DEFS.F16),{team:'red',type:'CRUISE',kind:'cruise',hp:1,alive:true,wp:wp.clone(),speed:245,tgt:null,mslCd:0,retgtT:0,flareCd:0,chaffCd:0,lockT:0,id:nextId(),rcs:.1});
  axes(e);e.vel.copy(e.fwd).multiplyScalar(e.speed);enemies.push(e);return e}
function updateCruise(e,dt){const gh=Math.max(groundH(e.pos.x,e.pos.z),groundH(e.pos.x+e.vel.x*3,e.pos.z+e.vel.z*3),0);
  _s1.set(e.wp.x,gh+60,e.wp.z); dummy.position.copy(e.pos); dummy.lookAt(_s1); e.obj.quaternion.rotateTowards(dummy.quaternion,.6*dt); axes(e);
  e.vel.copy(e.fwd).multiplyScalar(e.speed); e.pos.addScaledVector(e.vel,dt); if(e.pos.y<gh+25)e.pos.y=gh+25; e.kcas=e.speed*1.9;
  if(Math.random()<.4)puff(e.pos.x-e.fwd.x*3,e.pos.y,e.pos.z-e.fwd.z*3,0,0,0,.9,.9,.92,.15,1,3,.5)}
function updateHeavy(e,dt){ if(e.kind==='cruise'){updateCruise(e,dt);return} // bombers and the transport: steady flight to a waypoint, gentle turns
  _s1.subVectors(e.wp,e.pos); dummy.position.copy(e.pos); dummy.lookAt(e.wp);
  e.obj.quaternion.rotateTowards(dummy.quaternion,.05*dt); axes(e);
  e.vel.copy(e.fwd).multiplyScalar(e.speed); e.pos.addScaledVector(e.vel,dt);
  e.kcas=e.speed*Math.sqrt(atm(e.pos.y).sig)*1.944;
}
const dummy=new THREE.Object3D();
function updateAI(e,dt){
  axes(e); e.flareCd-=dt; e.chaffCd-=dt; e.mslCd-=dt; e.retgtT-=dt;
  if(e.kind!=='fighter'){updateHeavy(e,dt);return}
  if(e.drone){steer(e,dt,_s4.copy(e.fwd).setY(0).normalize(),1,.8);return}
  if(e.retgtT<=0||!e.tgt||!e.tgt.alive){e.retgtT=1.5;e.tgt=pickTarget(e)}
  const tg=e.tgt, live=state==='play';
  const dT=tg?tg.pos.distanceTo(e.pos):1e9;
  let th=live?threatTo(e):null;
  if(!th&&live&&e.rwrSpikeT>clock&&e.team==='red')th={m:{m:{position:P.pos}},d:P.pos.distanceTo(e.pos),radar:true};
  const dir=_s4; let thr=.85,gK=1; e.mode='';
  const lead=e.lead&&e.lead.alive!==false?e.lead:null;
  if(lead&&tg&&dT<22000)e.engaged=true;
  const own=tg?ownMissileOn(e,tg):null;
  if(th){
    // missile defence: notch radar shots at range, drag heat-seekers, break at the end
    const mp=th.m.m.position, l=_s5.subVectors(e.pos,mp); l.y=0; l.normalize();
    const side=_s3.set(l.z,0,-l.x); if(side.dot(e.fwd)<0)side.negate();
    if(th.d<2500){e.mode='BREAK';dir.copy(side).addScaledVector(UP,-.15).normalize();thr=1;gK=1}
    else if(th.radar&&sk(e).notch){e.mode='NOTCH';dir.copy(side).addScaledVector(UP,-.18).normalize();thr=.9}
    else {e.mode='DRAG';dir.copy(l).addScaledVector(UP,-.1).normalize();thr=1}
    if(th.radar&&th.d<7000&&e.chaffCd<=0){e.chaffCd=th.d<2500?.4:1.1;if(Math.random()<sk(e).cmP){aiDispense(e,'chaff');e.cmDrop={t:clock,type:'chaff'}}}
    if(!th.radar&&th.d<4000&&e.flareCd<=0){e.flareCd=th.d<2500?.35:.6;if(Math.random()<sk(e).cmP){aiDispense(e,'flare');e.cmDrop={t:clock,type:'flare'}}}
  } else if(own&&(own.spec.sarh||own.t<9)){
    // crank: keep him 45° off the nose so the radar can support the missile while closing slower
    e.mode='CRANK'; const los=_s5.subVectors(tg.pos,e.pos); los.y*=.3; los.normalize();
    dir.copy(los).applyAxisAngle(UP,e.crankSide*.8);
  } else if(!tg||(lead&&!e.engaged)){
    // fly formation (line abreast, 1.4 km) or, with nothing to do, hold heading
    e.mode='FORM';
    if(lead){_s5.copy(lead.pos).addScaledVector(lead.right,1400*e.side).addScaledVector(lead.fwd,-300).addScaledVector(lead.vel,3);
      dir.subVectors(_s5,e.pos).normalize(); const behind=_s3.subVectors(_s5,e.pos).dot(lead.fwd)>0; thr=behind?1:.72}
    else dir.copy(e.fwd);
  } else {
    // attack: pure pursuit long range (stay high), lead pursuit in the fight, unload when slow
    e.mode='ATTACK';
    if(e.holdOff&&dT<21000){dir.subVectors(e.pos,tg.pos);dir.y=0;dir.normalize()}
    else if(dT>15000||ground.includes(tg)){dir.subVectors(tg.pos,e.pos);if(ground.includes(tg))dir.y=Math.max(dir.y,(4500-e.pos.y)/3000);else if(dir.y<0)dir.y*=.3;dir.normalize()}
    else{const t=clamp(dT/900,0,1.2);dir.copy(tg.pos).addScaledVector(tg.vel,t).sub(e.pos).normalize()}
    thr=dT<6000?1:.85; if(e.kcas<300){gK=.65;thr=1} if(e.mach>1.3)thr=.8;
  }
  const gh=Math.max(groundH(e.pos.x,e.pos.z),0), agl=e.pos.y-gh;
  if(agl<900||(e.vel.y<-70&&agl<2600)){dir.copy(e.fwd);dir.y=Math.max(.5,dir.y);dir.normalize();thr=1}
  steer(e,dt,dir,gK,thr*(e.thrK??1));
  const fl=e.obj.getObjectByName('flame'); if(fl)fl.scale.z=thr>.95?1.5:.5; setAB(e.obj,thr>.95);
  if(e.pos.y<Math.max(groundH(e.pos.x,e.pos.z),0)+3){e.alive=false;scene.remove(e.obj);explode(e.pos,true);recEvent((e.team==='red'?'Bandit ':'Wingman ')+'flew into the ground');return}
  if(!live||!tg)return;
  if(ground.includes(tg)){   // flight ground attack: guided bomb release inside ~6 km, then pull off
    const dh=Math.hypot(tg.pos.x-e.pos.x,tg.pos.z-e.pos.z); e.bombCd=(e.bombCd||0)-dt;
    if(dh<6000&&(e.bombs||0)>0&&e.bombCd<=0&&e.pos.y-tg.pos.y>900){e.bombs--;e.bombCd=4;
      const W=AGW.JDAM,m=new THREE.Mesh(new THREE.CylinderGeometry(W.r,W.r*.8,W.len,8).rotateX(Math.PI/2),agStoreMat);m.position.copy(e.pos).addScaledVector(e.up,-1.5);scene.add(m);
      AG.w.push({W,m,pos:m.position,vel:e.vel.clone(),t:0,tgt:tg,aim:tg.pos.clone(),reach:99999,start:m.position.clone(),lift:true,err:new V3()});radio((e.cs||2)+', bombs away.','wing')}
    if((e.bombs||0)<=0&&!e.gndDone){e.gndDone=true;e.cmd='REJOIN';syncWing();radio((e.cs||2)+', Winchester, rejoining.','wing')}
    return}
  _a.subVectors(tg.pos,e.pos); const off=e.fwd.angleTo(_a);
  if(dT<13){if(tg===P){hitAI(e,99,'RAM',true);die('collision')}else{hitAI(e,99,'RAM',false);hitAI(tg,99,'RAM',false)}return}
  // guns: 3° cone inside 1 km
  if(dT<sk(e).gunR&&off<.05&&(e.ac.gunRounds??1)>0){
    e.gunAcc+=dt*(e.ac.gunRate/4);
    while(e.gunAcc>=1){e.gunAcc--;
      const t=gunTof(dT,e.ac.muzzle,atm(e.pos.y).sig); _c.copy(tg.pos).addScaledVector(tg.vel,t*.8).sub(e.pos).normalize();
      const sp=sk(e).spread;_c.x+=rand(-sp,sp);_c.y+=rand(-sp,sp);_c.z+=rand(-sp,sp);_c.normalize();
      const b=take(eBullets);b.on=true;b.life=1.6;b.m.visible=true;b.team=e.team;b.dmg=e.ac.gunDmg;
      b.m.position.copy(e.pos).addScaledVector(e.fwd,9);b.vel.copy(e.vel).addScaledVector(_c,e.ac.muzzle);
      b.m.quaternion.setFromUnitVectors(ZF,_c);
    }
  } else e.gunAcc=0;
  // radar lock (ECM slows it outside ~8 km burn-through), then shots inside his own launch zones
  const jam=tg===P&&CM.ecm&&dT>8000;
  if(dT<35000*(tg===P?rcsK(P,e.pos):1)&&off<1.05)e.lockT+=dt*(jam?.35:1)*sk(e).lock; else e.lockT=Math.max(0,e.lockT-dt*2);
  if(tg===P&&e.lockT>.3&&!e.spiking){e.spiking=true;if(rwrMsgT<=0){message('SPIKE',.9);rwrMsgT=2}}
  if(e.lockT<=0)e.spiking=false;
  e.zoneT-=dt;
  if(e.zoneT<=0){e.zoneT=.5;
    e.zI=e.ir>0?dlz(e.espec.IR,e,tg):null; e.zR=e.rdr>0?dlz(e.espec.RDR,e,tg):null}
  if(e.mslCd<=0&&!own&&missilesAt(tg)<2&&e.mode!=='NOTCH'&&e.mode!=='DRAG'&&e.mode!=='BREAK'){
    const sI=e.espec.IR,sR=e.espec.RDR;
    const D=sk(e), irMax=D.rne?Math.min(e.zI?e.zI.rne*1.15:0,e.zI?e.zI.rmax*D.iK:0):(e.zI?e.zI.rmax*D.iK:0);
    if(e.zI&&dT>sI.minR&&dT<Math.min(irMax,sI.maxR)&&off<sI.cone*.8&&(!sI.rear||rearOK(e.pos,tg))){e.ir--;e.mslCd=rand(5,9)*D.cd;launchAI(e,'IR')}
    else if(e.zR&&e.lockT>2&&dT>sR.minR&&dT<e.zR.rmax*D.rK*(jam?.6:1)&&off<.4&&!(sR.launchG&&e.n>sR.launchG)){e.rdr--;e.mslCd=rand(8,13)*D.cd;launchAI(e,'RDR')}
  }
}

/* ---------------- weapons ---------------- */
/* ---------------- radar (APG-68 style fire-control radar) ---------------- */
const RANGES=[5,10,20,40,80,160];                 // nm display scales
const AZS=[60,30,10];                      // azimuth scan half-widths, deg (A6 / A3 / A1)
const ACMS=[null,'20x30','VSCAN','BORE'];  // dogfight auto-acquisition patterns
const DEG=Math.PI/180;
const R={sttSrc:'RDR',mode:'RWS',az:0,rng:2,acm:0,sweep:0,dir:1,tracks:new Map(),bug:null,stt:null,acqT:0,notchT:0,spiked:null};
const RADAR=R; // alias for places where R is a local screen coordinate
let seekT=null, scopeHits=[];
const qInvP=new THREE.Quaternion();
function relAngles(p){
  _pv.subVectors(p,P.pos).applyQuaternion(qInvP); const d=_pv.length();
  return {az:Math.atan2(-_pv.x,_pv.z),el:Math.atan2(_pv.y,Math.hypot(_pv.x,_pv.z)),d};
}
// a target beaming you (≈0 ground-relative closure) while you look down at it hides in ground clutter
function notched(e){
  _b.subVectors(e.pos,P.pos).normalize();
  return Math.abs(e.vel.dot(_b))<35&&e.pos.y<P.pos.y-200;
}
// IRST detection range (game estimate): ~15 km head-on, farther looking at a hot tailpipe
function irstRange(e){_c.subVectors(P.pos,e.pos).normalize();const rear=e.fwd.dot(_c)<-.3;const b=AC.irstR||15000;return Math.min(AC.irstMax||55000,b*(rear?1.7:1))}
function radarTarget(){
  if(R.stt)return R.acqT>=.5?R.stt:null;
  if(R.mode==='TWS'&&R.bug&&R.tracks.has(R.bug))return R.bug;
  return null;
}
function resetRadar(){R.mode='RWS';R.az=0;R.rng=2;R.acm=0;R.sweep=0;R.tracks.clear();R.bug=null;R.stt=null;R.spiked=null;seekT=null;syncRadarUI()}
function lockOn(e){
  if(!e||!e.alive)return;
  R.stt=e;R.acqT=0;R.notchT=0;R.bug=e;R.sttSrc=R.mode==='IRST'?'IRST':'RDR';
  // bandit's warning receiver hears the lock: at range he may beam and dive to notch you
  if(R.sttSrc==='RDR'&&R.spiked!==e){R.spiked=e; /* IRST is passive: he never hears it */ const d=e.pos.distanceTo(P.pos);
    if(d>6000&&DIFF[difficulty].notch&&Math.random()<.6*DIFF[difficulty].defP)e.rwrSpikeT=clock+3.5}  // he hears the lock and may beam pre-emptively
  syncRadarUI();
}
function breakLock(){R.stt=null;syncRadarUI()}
function quickLock(){
  if(R.stt){breakLock();message('LOCK BROKEN',.8);return}
  // designate the track nearest the nose; with no tracks, try anything inside a 20x30 box within 10 nm
  let best=null,ba=1e9;
  for(const [e] of R.tracks){if(!e.alive)continue;const a=relAngles(e.pos),s=Math.hypot(a.az,a.el);if(s<Math.PI/3&&s<ba){ba=s;best=e}}
  if(!best)for(const e of enemies){const a=relAngles(e.pos);if(a.d<18520&&Math.abs(a.az)<10*DEG&&a.el>-10*DEG&&a.el<20*DEG){best=e;break}}
  if(best){lockOn(best);message('LOCK',.7)} else message('NO RADAR TRACK',1);
}
function stepTarget(){
  const list=[...R.tracks.keys()].filter(e=>e.alive);
  if(!list.length){message('NO TRACKS',.8);return}
  const cur=R.stt||R.bug, i=list.indexOf(cur), next=list[(i+1)%list.length];
  if(R.stt)lockOn(next); else {R.bug=next;syncRadarUI()}
}
function updateRadar(dt){
  qInvP.copy(playerJet.quaternion).invert();
  if(P.sys&&P.sys.radar&&R.mode!=='IRST'){R.tracks.clear();if(R.stt&&R.sttSrc==='RDR')breakLock();return}
  const now=clock;
  for(const [e] of R.tracks)if(!e.alive)R.tracks.delete(e);
  if(R.bug&&!R.bug.alive)R.bug=null;
  if(R.stt&&!R.stt.alive){R.stt=null;syncRadarUI()}
  if(R.stt){
    const e=R.stt,a=relAngles(e.pos); R.acqT+=dt; R.sweep=a.az;
    let lost=null;
    const irst=R.sttSrc==='IRST';
    if(Math.hypot(a.az,a.el)>(irst?30:((AC.radar&&AC.radar.gimbal)||60))*DEG)lost='GIMBAL LIMIT';
    else if(a.d>(irst?irstRange(e)*1.3:radRange(e)*1.1))lost='RANGE';
    if(!irst&&notched(e)){R.notchT+=dt;if(R.notchT>1.5)lost='NOTCHED'} else R.notchT=0;
    if(lost){message('LOCK LOST · '+lost,1.5);breakLock()}
    else R.tracks.set(e,{t:now,az:a.az,d:a.d,pos:e.pos.clone(),vel:e.vel.clone()});
    return;
  }
  const acm=ACMS[R.acm];
  if(acm){
    for(const e of enemies){
      const a=relAngles(e.pos); if(a.d>18520)continue;
      const inP=acm==='20x30'?Math.abs(a.az)<10*DEG&&a.el>-10*DEG&&a.el<20*DEG
              :acm==='VSCAN'?Math.abs(a.az)<5*DEG&&a.el>-10*DEG&&a.el<50*DEG
              :Math.hypot(a.az,a.el)<2.5*DEG;
      if(inP){lockOn(e);message('ACM LOCK',.8);sndBeep(1500,.08,.05);return}
    }
    return;
  }
  if(R.mode==='IRST'){ // passive infrared search: ±30° field, short range, sees hot tailpipes farther, no notch
    for(const e of enemies){const a=relAngles(e.pos);
      if(Math.abs(a.az)<30*DEG&&a.el>-15*DEG&&a.el<30*DEG&&a.d<irstRange(e))R.tracks.set(e,{t:now,az:a.az,d:a.d,pos:e.pos.clone(),vel:e.vel.clone()})}
    for(const [e,tr] of R.tracks)if(now-tr.t>1.5)R.tracks.delete(e);
    R.sweep=0; return;
  }
  // search: antenna sweeps the azimuth limits, ~140°/s, ±30° elevation coverage
  const span=(R.mode==='TWS'?Math.min(AZS[R.az],25):AZS[R.az])*DEG;
  const prev=R.sweep; R.sweep+=R.dir*2.45*dt;
  if(R.sweep>span){R.sweep=span;R.dir=-1} if(R.sweep<-span){R.sweep=-span;R.dir=1}
  const lo=Math.min(prev,R.sweep)-.03,hi=Math.max(prev,R.sweep)+.03;
  for(const e of enemies){
    const a=relAngles(e.pos);
    if(a.az>=lo&&a.az<=hi&&Math.abs(a.el)<30*DEG&&a.d<radRange(e)&&!notched(e))
      R.tracks.set(e,{t:now,az:a.az,d:a.d,pos:e.pos.clone(),vel:e.vel.clone()});
  }
  const keep=R.mode==='TWS'?4.5:2.6;
  for(const [e,tr] of R.tracks)if(now-tr.t>keep){R.tracks.delete(e);if(R.bug===e)R.bug=null}
}
// B-scope: x = azimuth ±60°, y = range. Used by the radar panel and the cockpit MFD.
function drawScope(c,x0,y0,w,h,mfd){
  const RMAX=RANGES[R.rng]*1852, now=clock, G1='#4dff88', fs=mfd?13:10;
  const X=az=>x0+w/2+az/(Math.PI/3)*(w/2-10), Y=d=>y0+h-12-(d/RMAX)*(h-26);
  const hits=[];
  c.save();c.beginPath();c.rect(x0,y0,w,h);c.clip();
  c.fillStyle='#020604';c.fillRect(x0,y0,w,h);
  c.strokeStyle='rgba(77,255,136,.28)';c.lineWidth=1;
  for(let i=1;i<4;i++){const y=Y(RMAX*i/4);c.beginPath();c.moveTo(x0+6,y);c.lineTo(x0+w-6,y);c.stroke()}
  for(const a of [-30,0,30]){const x=X(a*DEG);c.beginPath();c.moveTo(x,y0+12);c.lineTo(x,y0+h-12);c.stroke()}
  const acm=ACMS[R.acm];
  if(!R.stt&&!acm){const span=(R.mode==='IRST'?30:R.mode==='TWS'?Math.min(AZS[R.az],25):AZS[R.az])*DEG;
    c.setLineDash([3,4]);c.strokeStyle='rgba(77,255,136,.7)';for(const s of [-1,1]){const x=X(s*span);c.beginPath();c.moveTo(x,y0+12);c.lineTo(x,y0+h-12);c.stroke()}c.setLineDash([])}
  // antenna azimuth caret
  c.fillStyle=G1;const ax=X(R.stt?R.sweep:acm?0:R.sweep);c.beginPath();c.moveTo(ax,y0+h-10);c.lineTo(ax-5,y0+h-1);c.lineTo(ax+5,y0+h-1);c.closePath();c.fill();
  c.font=`700 ${fs}px ${FONT}`;c.textBaseline='middle';
  if(mfd){ // OSB labels like the real FCR page
    c.textAlign='center';const top=[acm?'ACM':'CRM',R.stt?'STT':R.mode,'NORM','','OVRD'];
    top.forEach((t,i)=>t&&c.fillText(t,x0+24+i*48+4,y0+12));
    ['SWAP','FCR','','DCLT',''].forEach((t,i)=>t&&c.fillText(t,x0+24+i*48+4,y0+h-24));
    c.textAlign='left';c.fillText('▲',x0+4,y0+70);c.fillText(String(RANGES[R.rng]),x0+4,y0+92);c.fillText('▼',x0+4,y0+114);
    c.fillText('A'+(R.mode==='TWS'&&AZS[R.az]>25?'3':String(AZS[R.az]/10)),x0+4,y0+150);
  }
  const blip=(e,az,d,kind,alpha,vel)=>{
    if(d>RMAX||Math.abs(az)>Math.PI/3)return;
    const x=X(az),y=Y(d); hits.push({e,x,y});
    c.globalAlpha=alpha; c.fillStyle=G1;c.strokeStyle=G1;c.lineWidth=mfd?2:1.5;
    const s=mfd?7:5;
    if(kind==='search')c.fillRect(x-s,y-s*.55,s*2,s*1.1);
    else{
      if(kind==='stt'||kind==='bug'){c.fillStyle='#ffffff';c.strokeStyle='#ffffff'}
      if(kind==='track')c.strokeRect(x-s*.8,y-s*.8,s*1.6,s*1.6); else c.fillRect(x-s*.8,y-s*.8,s*1.6,s*1.6);
      if(vel){_e.copy(vel).applyQuaternion(qInvP);const l=Math.hypot(_e.x,_e.z)||1;c.beginPath();c.moveTo(x,y);c.lineTo(x-_e.x/l*s*2.6,y-_e.z/l*s*2.6);c.stroke()}
      if(kind==='stt'||kind==='bug'){c.beginPath();c.arc(x,y,s*1.9,0,Math.PI*2);c.stroke()}
    }
    c.globalAlpha=1;c.fillStyle=G1;c.font=`400 ${fs-2}px ${FONT}`;c.textAlign='center';
    c.fillText(String(Math.round(e.pos.y*3.281/1000)),x,y+s*2.2);
  };
  if(R.stt){const a=relAngles(R.stt.pos);blip(R.stt,a.az,a.d,R.acqT<.5?'track':'stt',1,R.stt.vel)}
  else if(acm){c.textAlign='center';c.fillStyle=G1;c.font=`700 ${fs+4}px ${FONT}`;c.fillText(acm==='20x30'?'20×30':acm,x0+w/2,y0+h*.42);
    c.font=`400 ${fs}px ${FONT}`;c.fillText('AUTO-ACQ ≤10 NM',x0+w/2,y0+h*.42+fs+8)}
  else for(const [e,tr] of R.tracks){
    if(!e.alive)continue;const age=now-tr.t;
    if(R.mode==='TWS'){_d.copy(tr.pos).addScaledVector(tr.vel,age);const a=relAngles(_d);blip(e,a.az,a.d,e===R.bug?'bug':'track',1,tr.vel)}
    else blip(e,tr.az,tr.d,'search',Math.max(.25,1-age/2.6),null);
  }
  // target data line: Mach, altitude, aspect, closure
  const tgt=R.stt||(R.mode==='TWS'&&R.bug);
  if(tgt&&tgt.alive){
    const at=atm(tgt.pos.y),mach=tgt.vel.length()/at.a;
    _a.subVectors(P.pos,tgt.pos).normalize();_b.copy(tgt.vel).normalize();
    const asp=180-Math.acos(clamp(_b.dot(_a),-1,1))/DEG, side=_e.crossVectors(_b,_a).y<0?'R':'L';
    _c.subVectors(tgt.pos,P.pos).normalize(); const vc=-_d.subVectors(tgt.vel,P.vel).dot(_c)*1.944;
    c.fillStyle=G1;c.font=`700 ${fs-1}px ${FONT}`;c.textAlign='center';
    c.fillText(`${mach.toFixed(2)}M ${String(Math.round(asp/10)).padStart(2,'0')}${side} ${Math.round(vc)}VC`,x0+w/2,y0+(mfd?36:10));
  }
  if(!mfd){c.textAlign='left';c.font=`700 ${fs}px ${FONT}`;c.fillStyle=G1;c.fillText(String(RANGES[R.rng]),x0+4,y0+10)}
  c.restore();
  return hits;
}
// radar panel UI
const rdrEl=$('rdr'),scope=$('rScope'),sctx=scope.getContext('2d');
let rdrOpen=false; try{rdrOpen=localStorage.getItem('viperRdr')==='1'}catch(e){}
function syncRadarUI(){
  const acm=ACMS[R.acm];
  $('rMode').textContent=R.stt?(R.sttSrc==='IRST'?'IR LK':'STT'):R.mode; $('rMode').classList.toggle('on',!!R.stt);
  $('rAz').textContent='A'+(R.mode==='TWS'&&AZS[R.az]>25?'2.5':String(AZS[R.az]/10));
  $('rAcm').textContent=acm?(acm==='20x30'?'20×30':acm):'ACM'; $('rAcm').classList.toggle('on',!!acm);
  $('rRng').textContent=RANGES[R.rng];
  rdrEl.hidden=!rdrOpen; $('bRdr').classList.toggle('on',rdrOpen);
}
function sizeScope(){const r=scope.getBoundingClientRect();if(!r.width)return false;
  const w=Math.round(r.width*DPR),h=Math.round(r.height*DPR);if(scope.width!==w||scope.height!==h){scope.width=w;scope.height=h}return true}
function drawRadarPanel(){
  if(rdrEl.hidden||state!=='play')return;
  if(!sizeScope())return;
  const w=scope.width/DPR,h=scope.height/DPR;
  sctx.setTransform(DPR,0,0,DPR,0,0); scopeHits=drawScope(sctx,0,0,w,h,false);
}
$('bRdr').addEventListener('click',()=>{rdrOpen=!rdrOpen;try{localStorage.setItem('viperRdr',rdrOpen?'1':'0')}catch(e){};syncRadarUI();sizeScope()});
$('rMode').addEventListener('click',()=>{if(R.stt)breakLock();else if(R.acm)R.acm=0;else{const ms=AC.radar.modes;R.mode=ms[(ms.indexOf(R.mode)+1)%ms.length];R.tracks.clear();R.bug=null}syncRadarUI()});
$('rAz').addEventListener('click',()=>{R.az=(R.az+1)%AZS.length;syncRadarUI()});
$('rAcm').addEventListener('click',()=>{R.acm=(R.acm+1)%ACMS.length;if(R.stt)breakLock();syncRadarUI()});
$('rUp').addEventListener('click',()=>{R.rng=Math.min(RANGES.length-1,R.rng+1);syncRadarUI()});
$('rDn').addEventListener('click',()=>{R.rng=Math.max(0,R.rng-1);syncRadarUI()});
$('rStep').addEventListener('click',stepTarget);
$('bLock').addEventListener('click',()=>{audioInit();quickLock()});
scope.addEventListener('pointerdown',e=>{
  e.preventDefault();const r=scope.getBoundingClientRect(),x=e.clientX-r.left,y=e.clientY-r.top;
  let best=null,bd=22;for(const h of scopeHits){const d=Math.hypot(h.x-x,h.y-y);if(d<bd){bd=d;best=h.e}}
  if(best){
    if(R.mode==='TWS'&&!R.stt&&R.bug!==best){R.bug=best;syncRadarUI()} // first tap bugs the track, second tap locks
    else {lockOn(best);message('LOCK',.7)}
  } else if(R.stt){breakLock();message('LOCK BROKEN',.8)}
  else if(R.bug){R.bug=null}
});
syncRadarUI();

/* ---------------- launch zones: fly the missile's own motor/drag model forward ---------------- */
// Rmax: he holds course. Rne ("no escape"): he turns tail and runs at his current speed.
function dlz(spec,shooter,target){
  const los=new V3().subVectors(target.pos,shooter.pos), d=los.length(); los.divideScalar(d||1);
  const away=target.vel.dot(los), vt=target.vel.length();
  const f=flyout(spec,(shooter.pos.y+target.pos.y)/2,Math.max(150,shooter.vel.length()));
  let rmax=0,rne=0;
  for(let i=0;i<f.S.length;i++){const t=(i+1)*.25; if(f.V[i]<Math.max(250,vt*1.15))break;
    rmax=Math.max(rmax,f.S[i]-away*t); rne=Math.max(rne,f.S[i]-vt*t)}
  const cap=spec.maxR*(spec.sus?1.4:spec.burn<6?1.6:1.25);   // seeker / radar support limit
  return {rmax:Math.min(rmax,cap),rne:Math.min(rne,cap),rmin:spec.minR,d,vc:-(target.vel.dot(los)-shooter.vel.dot(los))};
}
let pZone=null,pZoneT=0,pZoneW='';
// R-27R: inertial midcourse with radio-correction datalink from the launcher's radar, then semi-active terminal homing.
// Lock can drop in midcourse (it flies to the last known intercept point) but the radar must illuminate the target at the end.
function sarhStep(m,s,tg,lockOK,launcher){
  if(!m.vt)m.vt={pos:new V3(),vel:new V3(),alive:true};
  if(!m.kp){m.kp=tg.pos.clone();m.kv=tg.vel.clone();m.kT=clock}
  if(!m.term&&tg.pos.distanceTo(m.m.position)<s.termR)m.term=true;
  if(m.term){if(s.arh){m.gmode='ACTIVE';return tg} if(lockOK){m.gmode='TERM';return tg} m.gmode='LOST';return null}
  if(lockOK&&launcher.pos.distanceTo(m.m.position)<s.dlR){m.kp.copy(tg.pos);m.kv.copy(tg.vel);m.kT=clock;m.gmode='DL';return tg}
  m.gmode='INS'; m.vt.pos.copy(m.kp).addScaledVector(m.kv,clock-m.kT); m.vt.vel.copy(m.kv); return m.vt;
}
function launch(type,target){
  const isNine=type==='9X';
  const idx=isNine?AC.srN-P.aim9:AC.mrN-P.aim120;
  if(isNine)P.aim9--; else P.aim120--;
  const rail=playerJet.getObjectByName((isNine?'r9_':'r120_')+idx);
  const m=take(missiles); m.on=true; m.type=type; m.t=0; m.target=target; m.m.visible=true;
  m.m.scale.set(isNine?1:1.3,isNine?1:1.3,isNine?1:1.22);
  if(rail){rail.getWorldPosition(m.m.position);rail.visible=false} else m.m.position.copy(P.pos);
  m.m.position.addScaledVector(P.up,-1);
  m.vel.copy(P.vel).addScaledVector(P.up,-4); m.prev.copy(m.m.position);
  m.notchT=0; m.notchRolled=false; m.blindT=0; m.lostT=0; m.term=false; m.kp=null; m.gmode=''; m.reason=target?'':'NO LOCK (BORESIGHT)'; m.team='blue'; m.owner=P; m.name=isNine?AC.srFull:AC.mrFull;
  recLaunch(m,'You',target);
  sndMsl(); buzz(35); message(isNine?'FOX 2':SPEC['120'].sarh?'FOX 1':'FOX 3',1);
}
function updateWeapons(dt){
  updateRadar(dt);
  const s9=SPEC['9X'],s12=SPEC['120'], rt=radarTarget();
  // 9X seeker: slaved to the radar target if it can see it, otherwise searches near the nose for the hottest source
  let seek=null;
  if(rt){_a.subVectors(rt.pos,P.pos);if(P.fwd.angleTo(_a)<s9.cone&&_a.length()<=s9.maxR*1.2&&(!s9.rear||rearOK(P.pos,rt)))seek=rt}
  if(seek&&irBlocked(P.pos,seek.pos))seek=null;
  if(!seek){let ba=.35;for(const e of enemies){if(!e.alive||irBlocked(P.pos,e.pos)||(s9.rear&&!rearOK(P.pos,e)))continue;_a.subVectors(e.pos,P.pos);const a=P.fwd.angleTo(_a);if(a<ba&&_a.length()<=s9.maxR*1.2){ba=a;seek=e}}}
  if(seek&&seek===seekT)lockT+=dt; else {seekT=seek;lockT=0}
  lockTarget=rt||seekT;
  if(lockTarget){_a.subVectors(lockTarget.pos,P.pos);lockDist=_a.length();lockAng=P.fwd.angleTo(_a)} else {lockDist=0;lockAng=0}
  pZoneT-=dt; if(pZoneT<=0){pZoneT=.25; const zt=rt||seekT; pZoneW=rt?'120':'9X'; pZone=zt?dlz(SPEC[pZoneW],P,zt):null}
  let sd=0; if(seekT)sd=seekT.pos.distanceTo(P.pos);
  can9=!!seekT&&lockT>s9.lockT&&sd>=s9.minR&&sd<=s9.maxR;
  can120=!!rt&&lockAng<s12.cone&&lockDist>=s12.minR&&lockDist<=s12.maxR&&!(s12.sarh&&R.sttSrc!=='RDR')&&!(s12.launchG&&P.n>s12.launchG);
  const lb=$('bLock'); lb.textContent=R.stt?'UNLK':'LOCK'; lb.classList.toggle('on',!!R.stt);
  $('b9').classList.toggle('ready',can9&&P.aim9>0);
  $('b120').classList.toggle('ready',can120&&P.aim120>0);
  $('c9').textContent=P.aim9;$('c120').textContent=P.aim120;$('cGun').textContent=P.rounds;
  if(seekT&&state==='play'&&P.aim9>0){toneT-=dt;if(toneT<=0){if(can9){sndBeep(1100,.06,.04,'sawtooth');toneT=.09}else{sndBeep(420,.12,.03,'sawtooth');toneT=.3}}}

  if(fire9){fire9=false; if(P.aim9>0)launch('9X',can9?seekT:null); else message('NO '+AC.srName+' LEFT',1)}
  if(fire120){fire120=false;
    if(P.aim120<=0)message('NO '+AC.mrName+' LEFT',1);
    else if(!rt)message(R.stt?'ACQUIRING':AC.radar.modes.includes('TWS')?'NEED RADAR LOCK OR TWS TRACK':'NEED RADAR LOCK',1.2);
    else if(s12.sarh&&R.sttSrc!=='RDR')message(AC.mrFull+' NEEDS RADAR LOCK, NOT IRST',1.3);
    else if(s12.launchG&&P.n>s12.launchG)message('OVER '+s12.launchG+' G · LAUNCH INHIBITED',1.2);
    else if(!can120)message(lockDist<s12.minR?'TOO CLOSE FOR '+AC.mrName:lockDist>s12.maxR?'OUT OF RANGE':'OFF BORESIGHT',1.1);
    else launch('120',rt)}

  // gun: real rate of fire for the selected jet
  if(gunHeld&&P.rounds>0&&state==='play'){
    gunAcc+=dt*AC.gunRate; gunSndT-=dt; if(gunSndT<=0){sndGun();gunSndT=.05;buzz(12)}
    while(gunAcc>=1&&P.rounds>0){gunAcc--;P.rounds--;gunShots++;
      _d.copy(P.fwd);_d.x+=rand(-.004,.004);_d.y+=rand(-.004,.004);_d.z+=rand(-.004,.004);_d.normalize();
      const b=take(pBullets);b.on=true;b.life=2;b.m.visible=true;
      b.m.position.copy(P.pos).addScaledVector(P.fwd,5).addScaledVector(P.right,-.9).addScaledVector(P.up,.4).addScaledVector(_d,rand(0,15));
      b.prev.copy(b.m.position); b.vel.copy(P.vel).addScaledVector(_d,AC.muzzle); b.m.quaternion.setFromUnitVectors(ZF,_d);
    }
    if(P.rounds===0)message('WINCHESTER · GUN EMPTY',1.4);
  } else gunAcc=0;
  for(const b of pBullets){ if(!b.on)continue;
    if(ground.length)for(const g of ground)if(g.alive&&distSeg(_s1.copy(g.pos).setY(g.pos.y+2),b.prev,b.m.position)<9){kill(b);gunHits++;g.hp-=AC.gunDmg;puff(b.m.position.x,b.m.position.y,b.m.position.z,0,0,0,1,.8,.3,1,5,16,.25);if(g.hp<=0)killGround(g);break}
    if(!b.on)continue;
    b.life-=dt; if(b.life<=0){kill(b);continue}
    b.prev.copy(b.m.position); b.vel.y-=G*dt; b.vel.multiplyScalar(gunDrag(b.vel.length(),atm(b.m.position.y).sig,dt)); b.m.position.addScaledVector(b.vel,dt);
    for(const e of enemies){ if(!e.alive)continue;
      if(distSeg(e.pos,b.prev,b.m.position)<(e.kind==='fighter'?7:14)){kill(b);gunHits++;const p=b.m.position;puff(p.x,p.y,p.z,0,0,0,1,.8,.3,1,5,16,.25);
        hitAI(e,AC.gunDmg,'GUNS',true);break}}
  }
  // missiles: proportional navigation, g-limited by airspeed
  for(const m of missiles){ if(!m.on)continue;
    const s=SPEC[m.type], p=m.m.position, at=atm(p.y);
    m.t+=dt; let v=m.vel.length(); _a.copy(m.vel).divideScalar(v);
    if(m.t<s.burn)m.vel.addScaledVector(_a,s.acc*dt);
    else if(s.sus&&m.t<s.burn+s.sus&&v<s.vCap)m.vel.addScaledVector(_a,s.susAcc*dt); // Meteor ramjet
    m.vel.addScaledVector(_a,-at.rho*s.cd*v*v*dt); m.vel.y-=G*dt;
    v=m.vel.length(); _a.copy(m.vel).divideScalar(v);
    const tg=m.target;
    if(tg&&!tg.alive){m.target=null;m.reason=m.reason||'TARGET ALREADY DESTROYED'}
    if(m.type==='9X'&&m.target&&m.t>.3){const why=irEnv(m,m.target,dt);if(why){m.target=null;m.reason=why}}
    let aim=tg;
    if((s.sarh||s.arh)&&tg&&tg.alive){const g=sarhStep(m,s,tg,(R.stt===tg&&R.sttSrc==='RDR')||(R.mode==='TWS'&&R.tracks.has(tg)&&!(P.sys&&P.sys.radar)),P);
      if(!g){m.target=null;m.reason='NO RADAR LOCK IN TERMINAL PHASE';if(state==='play')message(AC.mrFull+' LOST · NO LOCK IN TERMINAL',1.4)} else aim=g}
    if(m.target&&tg.alive&&m.t>.3){
      const r=_b.subVectors(aim.pos,p);
      if(_a.angleTo(r)>s.gimbal){m.target=null;m.reason='TARGET LEFT SEEKER FIELD'}   // outside seeker gimbal: lost
      else{
        const vr=_c.subVectors(aim.vel,m.vel), om=_d.crossVectors(r,vr).divideScalar(r.lengthSq());
        const acc=_e.crossVectors(om,m.vel).multiplyScalar(4); acc.y+=G;
        acc.addScaledVector(_a,-acc.dot(_a));
        const q=.5*at.rho*v*v, lim=s.gmax*G*clamp(q/40000,m.t<s.burn?.35:.08,1);
        if(acc.length()>lim)acc.setLength(lim);
        if(!(m.blindT>0))m.vel.addScaledVector(acc,dt);
        aiDecoyRoll(m,tg,m.type==='9X'?'IR':'RDR',s.decoy??.08,.06,dt);
      }
    }
    m.prev.copy(p); p.addScaledVector(m.vel,dt);
    m.m.quaternion.setFromUnitVectors(ZF,_a.copy(m.vel).normalize());
    if(m.t<s.burn){puff(p.x,p.y,p.z,rand(-3,3),rand(-3,3),rand(-3,3),.88,.88,.9,.55,3,9,1.6);puff(p.x,p.y,p.z,0,0,0,1,.75,.35,.9,1.8,0,.06)}
    let done=false;
    for(const e of enemies){if(e.alive&&distSeg(e.pos,m.prev,p)<s.fuze*(e.kind==='fighter'?1:1.8)){recMsl(m,'HIT','');hitAI(e,5,m.type==='9X'?AC.srFull:AC.mrFull,true);done=true;break}}
    if(!done&&p.y<Math.max(groundH(p.x,p.z),0)){explode(p,false);done=true;recMsl(m,'MISS',m.reason||'HIT THE GROUND')}
    if(!done&&(m.t>s.life||(m.t>s.burn+(s.sus||0)&&v<250))){explode(p,false);done=true;recMsl(m,'MISS',m.reason||'OUT OF ENERGY')}
    if(!done){if(!m.target){m.lostT=(m.lostT||0)+dt;if(m.lostT>4){explode(p,false);done=true;recMsl(m,'MISS',m.reason||'LOST TARGET')}}else m.lostT=0}
    if(done)kill(m);
  }
  // AI rounds: red rounds hit you and your friends, blue (wingman) rounds hit bandits
  for(const b of eBullets){ if(!b.on)continue;
    b.life-=dt; if(b.life<=0){kill(b);continue}
    b.prev.copy(b.m.position); b.vel.y-=G*dt; b.vel.multiplyScalar(gunDrag(b.vel.length(),atm(b.m.position.y).sig,dt)); b.m.position.addScaledVector(b.vel,dt);
    if(b.team==='ghost')continue;
    if(b.team==='red'){
      if(state==='play'&&P.alive&&distSeg(P.pos,b.prev,b.m.position)<6){
        kill(b);P.hp-=4*(b.dmg||1);if(clock-(P.fdT||-9)>1.5){P.fdT=clock;feed('You were hit by gunfire','loss')}if(Math.random()<.5)addHole(playerJet,1);hurtT=.35;shake=.4;sndHit();buzz(40);
        puff(P.pos.x,P.pos.y+1,P.pos.z,0,0,0,1,.7,.3,1,4,12,.2);
        if(Math.random()<.12*(b.dmg||1))damageSystem(1);
        if(P.hp<=0)die('shot');continue}
      for(const f of friends)if(f.alive&&distSeg(f.pos,b.prev,b.m.position)<(f.kind==='fighter'?7:16)){kill(b);hitAI(f,b.dmg||1,'GUNS',false);break}
    } else for(const e of enemies)if(e.alive&&distSeg(e.pos,b.prev,b.m.position)<(e.kind==='fighter'?7:14)){kill(b);hitAI(e,b.dmg||1,'GUNS (WINGMAN)',false);break}
  }
}

/* ---------------- countermeasures: ALE-47 flares/chaff, ECM pod, ALE-50 towed decoy ---------------- */
// Block 50/52: four ALE-47 canisters on the aft fuselage, flare canister = 15 flares, chaff canister = 30 cartridges.
// ALQ-184(V)9 ECM pod on the centreline with ALE-50 towed decoys (4). No missile approach warning on a standard Block 50.
const CM_LOADS=[[2,2],[3,1],[4,0],[1,3],[0,4]];   // [flare canisters, chaff canisters]; 2+2 is the normal fit
let cmLoad=0; try{cmLoad=clamp(+localStorage.getItem('viperCmLoad')||0,0,CM_LOADS.length-1)}catch(e){}
// Gripen C dispenser capacities aren't published; fixed game values are used for it
const cmFlares=()=>Math.round((AC.cm.fixed?AC.cm.flares:CM_LOADS[cmLoad][0]*15)*(AC.cmK||1)), cmChaff=()=>Math.round((AC.cm.fixed?AC.cm.chaff:CM_LOADS[cmLoad][1]*30)*(AC.cmK||1));
const CM={flares:30,chaff:60,decoys:4,ecm:false,heat:0,auto:false,flrHeld:false,chfHeld:false,flrT:0,chfT:0,autoT:0,decoy:null,objs:[]};
// bandit missiles: an older heat-seeker and a radar missile, both PN-guided and g-limited like yours
const eMissiles=makePool(14,mslGeo,new THREE.MeshStandardMaterial({color:0xcfc6b8,flatShading:true}));
const decoyMesh=new THREE.Mesh(new THREE.CylinderGeometry(.15,.15,1.6,6).rotateX(Math.PI/2),new THREE.MeshStandardMaterial({color:0x50585e,flatShading:true}));
decoyMesh.visible=false; scene.add(decoyMesh);
const cableGeo=new THREE.BufferGeometry().setFromPoints([new V3(),new V3()]);
const cable=new THREE.Line(cableGeo,new THREE.LineBasicMaterial({color:0x2a2a2a})); cable.visible=false; cable.frustumCulled=false; scene.add(cable);
let rwrMsgT=0,warnT=0,warnAlt=false;
function syncCM(){
  $('nFlr').textContent=CM.flares;$('nChf').textContent=CM.chaff;$('nDcy').textContent=CM.decoy?'OUT':CM.decoys;
  $('nEcm').textContent=CM.ecm?'XMIT':'STBY';
  $('cEcm').classList.toggle('on',CM.ecm);
  $('cDcy').classList.toggle('on',!!CM.decoy);
  $('nAuto').textContent=CM.auto?'ON':'OFF';$('cAuto').classList.toggle('on',CM.auto);
}
function cutDecoy(){CM.decoy=null;decoyMesh.visible=false;cable.visible=false}
function resetCM(){CM.flares=cmFlares();CM.chaff=cmChaff();CM.decoys=AC.cm.decoys;CM.ecm=false;CM.objs.length=0;cutDecoy();eMissiles.forEach(kill);syncCM()}
function dispense(type){
  if(state!=='play')return false;
  if(type==='flare'){if(CM.flares<=0){message('FLARES OUT',.8);return false}CM.flares--;CM.flDisp=(CM.flDisp||0)+1}
  else {if(CM.chaff<=0){message('CHAFF OUT',.8);return false}CM.chaff--;CM.chDisp=(CM.chDisp||0)+1}
  const o={type,alive:true,life:type==='flare'?3.5:5,
    pos:P.pos.clone().addScaledVector(P.fwd,-5).addScaledVector(P.up,-1),
    vel:P.vel.clone().multiplyScalar(type==='flare'?.85:.3).addScaledVector(P.up,-25).addScaledVector(P.right,rand(-14,14))};
  CM.objs.push(o);
  if(type==='chaff')for(let i=0;i<10;i++)puff(o.pos.x,o.pos.y,o.pos.z,rand(-15,15),rand(-15,15),rand(-15,15),.78,.8,.84,.55,5,18,rand(2,4));
  sndNoise(.06,3000,.12,'highpass'); syncCM(); return true;
}
function deployDecoy(){
  if(state!=='play')return;
  if(!AC.cm.decoys){message('NO TOWED DECOY ON THIS JET',.9);return}
  if(CM.decoy){message('DECOY ALREADY OUT',.8);return}
  if(CM.decoys<=0){message('NO DECOYS LEFT',.9);return}
  CM.decoys--;CM.decoy={pos:P.pos.clone().addScaledVector(P.fwd,-10),vel:P.vel.clone(),alive:true};
  decoyMesh.visible=true;cable.visible=true;message('DECOY DEPLOYED',1);syncCM();
}
function toggleECM(){
  if(!AC.cm.jam){message('NO JAMMER ON THIS JET',.9);return}
  if(state!=='play')return;
  CM.ecm=!CM.ecm;message(CM.ecm?'ECM TRANSMIT':'ECM STANDBY',.9);syncCM();
}
function inFlightE(){let n=0;for(const m of eMissiles)if(m.on)n++;return n}
function launchAI(e,type){
  const m=take(eMissiles);m.on=true;m.type=type;m.t=0;m.target=e.tgt;m.m.visible=true;m.owner=e;m.team=e.team;m.spec=e.espec[type];
  m.seen=new Set();m.notchT=0;m.notchRolled=false;m.blindT=0;m.lostT=0;m.dRolled=false;m.mawsWarned=false;m.mawSeen=-99;m.term=false;m.kp=null;m.gmode='';m.jit=m.jit||new V3();m.jit.set(0,0,0);m.jitT=0;m.reason='';m.rollT=0;m.nextRoll=0;m.pNotch=false;m.pClutter=false;
  m.name=(type==='IR'?AC_DEFS[e.type].srFull:AC_DEFS[e.type].mrFull);
  m.m.scale.set(type==='IR'?1:1.3,type==='IR'?1:1.3,type==='IR'?1:1.25);
  m.m.position.copy(e.pos).addScaledVector(e.up,-1.5);m.prev.copy(m.m.position);m.vel.copy(e.vel);
  recLaunch(m,e.team==='red'?'Bandit':'Wingman',e.tgt);
  if(e.team==='blue')message('TWO · FOX '+(type==='IR'?'2':m.spec.sarh?'1':'3'),1);
  if(m.target===P&&type==='RDR'){message('MISSILE LAUNCH',1.6);buzz([60,50,60]);for(let i=0;i<4;i++)setTimeout(()=>sndBeep(1300,.06,.05),i*110)}
}
// notch: the target beams the missile (near-zero closure) while the seeker looks down into ground clutter.
// One roll per notch attempt; on success the seeker goes blind and coasts. If the target leaves the notch the seeker
// can re-acquire; if it stays blind ~2.5 s the missile is lost.
function notchCheck(m,tg,dt,p){
  const mp=m.m.position; _s1.subVectors(tg.pos,mp); const d=_s1.length(); _s1.divideScalar(d||1);
  const closing=Math.abs(tg.vel.dot(_s1));   // target's own speed along the line of sight (doppler vs ground clutter)
  const lookDown=(mp.y-tg.pos.y)/(d||1), agl=tg.pos.y-Math.max(groundH(tg.pos.x,tg.pos.z),0);
  if(tg===P){
    /* you: the seeker's velocity gate is ~±60 m/s wide (about ±14° off the beam at 250 m/s); you need clutter behind you
       (it looks down on you, or you're low). Every 1.5 s held in the notch is another roll; chaff in the notch helps a lot */
    const live=!(m.spec&&m.spec.arh)||d<(m.spec.termR||20000)*1.1;   // a Fox 3 still on datalink isn't using its own seeker yet
    const inNotch=live&&closing<60&&(lookDown>.02||agl<1500)&&agl<9000; m.pNotch=inNotch; m.pClutter=lookDown>.02||agl<1500;
    if(inNotch){m.notchT=(m.notchT||0)+dt;
      if(m.notchT>(m.nextRoll||1)&&!(m.blindT>0)){m.nextRoll=m.notchT+1.5;
        let ch=false;for(const o of CM.objs)if(o.type==='chaff'&&o.pos.distanceToSquared(P.pos)<160000)ch=true;
        if(Math.random()<(ch?.9:.6)*(CM.ecm?1.1:1))m.blindT=1.5}}
    else {m.notchT=0;m.nextRoll=0}
    if(m.blindT>0){m.blindT-=dt;
      if(!inNotch&&m.blindT<1.2){m.blindT=0}
      else if(m.blindT<=0){m.blindT=0;m.target=null;m.reason='NOTCHED';return true}}
    return false;
  }
  const inNotch=closing<30&&lookDown>.06&&agl<7000;
  if(inNotch){m.notchT=(m.notchT||0)+dt;if(m.notchT>1.2&&!m.notchRolled){m.notchRolled=true;if(Math.random()<p)m.blindT=2.5}}
  else {m.notchT=0;m.notchRolled=false}
  if(m.blindT>0){m.blindT-=dt;
    if(!inNotch&&m.blindT<2){m.blindT=0}                       // he left the notch: seeker re-acquires
    else if(m.blindT<=0){m.blindT=0;m.target=null;m.reason='NOTCHED';return true}}
  return false;
}
// an AI jet defending against a missile: its flares/chaff (from its own defensive logic) and beaming get rolls
function aiDecoyRoll(m,tg,kind,flareP,chaffP,dt){
  if(!tg||tg===P||!tg.alive)return;
  const drop=tg.cmDrop&&clock-tg.cmDrop.t<.3?tg.cmDrop.type:null;
  if(drop&&!m.seen)m.seen=new Set();
  if(drop&&!m.seen.has(tg.cmDrop)){m.seen.add(tg.cmDrop);
    _s1.subVectors(tg.pos,m.m.position).normalize(); const beam=Math.abs(tg.vel.dot(_s1))<70;
    if(kind==='IR'&&drop==='flare'&&Math.random()<flareP){m.target=null;m.reason='DECOYED BY FLARES';return}
    if(kind==='RDR'&&drop==='chaff'&&Math.random()<chaffP*(beam?1:.15)){m.target=null;m.reason='DECOYED BY CHAFF';return}
  }
  if(kind==='RDR')notchCheck(m,tg,dt,sk(tg).notchP||.3);
}
function updateCM(dt){
  rwrMsgT-=dt; CM.flrT-=dt; CM.chfT-=dt;
  // held buttons fire 2-cartridge salvos every 0.35 s
  if(CM.flrHeld&&CM.flrT<=0){CM.flrT=.35;if(dispense('flare'))dispense('flare')}
  if(CM.chfHeld&&CM.chfT<=0){CM.chfT=.35;if(dispense('chaff'))dispense('chaff')}
  // threat picture
  // RWR hears radars and radar-guided missiles. Heat-seekers are passive: only a missile approach warner
  // (Gripen's UV MAW, not a Block 50 F-16) sees them, and only while the rocket motor burns.
  let spike=false,launch=false,maws=false,samSpike=false,nThreat=0;
  for(const e of enemies)if(e.alive&&e.tgt===P&&e.lockT>0){spike=true;nThreat++}
  for(const m of eMissiles){if(!m.on||m.target!==P)continue;
    if(m.type==='RDR')launch=true;
    if(AC.cm.maws){
      if(m.t<m.spec.burn&&m.m.position.distanceTo(P.pos)<10000){m.mawSeen=clock;if(!m.mawsWarned){m.mawsWarned=true;message('MISSILE · MISSILE',1.4);buzz([80,40,80])}}
      if(clock-m.mawSeen<3)maws=true}}
  for(const g of ghostMsl.values()){if(!g.on||g.tgt!==NET.me)continue;
    if(g.type==='120')launch=true;
    if(AC.cm.maws&&g.burn&&g.m.position.distanceTo(P.pos)<10000){g.mawSeen=clock;if(!g.mawsWarned){g.mawsWarned=true;message('MISSILE · MISSILE',1.4);buzz([80,40,80])}}
    if(AC.cm.maws&&clock-(g.mawSeen||-99)<3)maws=true}
  for(const e of enemies)if(e.remote&&e.alive&&e.lockMe)spike=true;
  for(const g of ground)if(g.alive&&g.kind==='sam'&&g.lockT>.3){spike=true;samSpike=true;nThreat++}
  if(state==='play'){if(nThreat>(CM.nThreat||0)){for(let i=0;i<3;i++)setTimeout(()=>sndBeep(1700,.035,.035,'sine'),i*70)}CM.nThreat=nThreat;
    if(launch&&!CM.vLaunch)say('launch',3); CM.vLaunch=launch; if(maws&&!CM.vMaws)say('maws',3); CM.vMaws=maws}
  // AUTO: RWR cues chaff against radar missiles; with a MAW it also cues flares
  if(CM.auto&&state==='play'){CM.autoT-=dt;
    if(CM.autoT<=0){let rd=false,ir=false;
      for(const m of eMissiles){if(!m.on||m.target!==P)continue;
        if(m.type==='RDR'&&m.m.position.distanceTo(P.pos)<7000)rd=true;
        if(AC.cm.maws&&clock-m.mawSeen<3)ir=true}
      if(ir&&dispense('flare'))dispense('flare');
      if(rd&&dispense('chaff'))dispense('chaff');
      if(ir||rd)CM.autoT=.6}}
  // warning tones
  if(state==='play'){warnT-=dt;if(warnT<=0){
    if(maws){warnAlt=!warnAlt;sndBeep(warnAlt?760:1040,.12,.05);warnT=.14}
    else if(launch){sndBeep(1300,.06,.04);warnT=.16}
    else if(samSpike){warnAlt=!warnAlt;sndBeep(warnAlt?560:680,.16,.03,'triangle');warnT=.32}
    else if(spike){sndBeep(900,.08,.03);warnT=.55}
    else warnT=.2}}
  // expendables
  for(const o of CM.objs){o.life-=dt;if(o.life<=0){o.alive=false;continue}
    o.vel.multiplyScalar(Math.exp(-(o.type==='flare'?1.2:4)*dt)); o.vel.y-=G*dt*(o.type==='flare'?.6:.05); o.pos.addScaledVector(o.vel,dt);
    if(o.type==='flare'){puff(o.pos.x,o.pos.y,o.pos.z,0,0,0,1,.95,.75,1,5,0,.12);puff(o.pos.x,o.pos.y,o.pos.z,rand(-2,2),rand(-2,2),rand(-2,2),.85,.85,.85,.35,2.5,7,1.4)}
    else if(Math.random()<.3)puff(o.pos.x+rand(-8,8),o.pos.y+rand(-8,8),o.pos.z+rand(-8,8),0,-2,0,.85,.88,.92,.45,2,4,1)}
  CM.objs=CM.objs.filter(o=>o.alive);
  // towed decoy on ~100 m of cable
  if(CM.decoy){
    _a.copy(P.pos).addScaledVector(P.fwd,-100).addScaledVector(P.up,-4);
    CM.decoy.pos.lerp(_a,1-Math.exp(-dt*3)); CM.decoy.vel.copy(P.vel);
    decoyMesh.position.copy(CM.decoy.pos); decoyMesh.quaternion.copy(playerJet.quaternion);
    const pa=cableGeo.attributes.position; _b.copy(P.pos).addScaledVector(P.fwd,-3.4).addScaledVector(P.up,-1.5);
    pa.setXYZ(0,_b.x,_b.y,_b.z); pa.setXYZ(1,CM.decoy.pos.x,CM.decoy.pos.y,CM.decoy.pos.z); pa.needsUpdate=true;
  }
}
function updateEnemyMissiles(dt){
  for(const m of eMissiles){ if(!m.on)continue;
    const s=m.spec,p=m.m.position,at=atm(p.y);
    m.t+=dt; let v=m.vel.length(); _a.copy(m.vel).divideScalar(v);
    if(m.t<s.burn)m.vel.addScaledVector(_a,s.acc*dt);
    else if(s.sus&&m.t<s.burn+s.sus&&v<s.vCap)m.vel.addScaledVector(_a,s.susAcc*dt);
    m.vel.addScaledVector(_a,-at.rho*s.cd*v*v*dt); m.vel.y-=G*dt;
    v=m.vel.length(); _a.copy(m.vel).divideScalar(v);
    let tg=m.target; if(tg&&!tg.alive){tg=m.target=null;if(!m.reason)m.reason='TARGET GONE'}
    if(m.type==='IR'&&tg&&(tg===P||tg.kind)&&m.t>.3){const why=irEnv(m,tg,dt);if(why){tg=m.target=null;m.reason=why}}
    // semi-active (R-27R): datalink/inertial midcourse, needs the launcher's radar on the target in the terminal phase
    let vt=null;
    if(tg&&(s.sarh||s.arh)&&(tg===P||tg.kind)){const o=m.owner;
      const lockOK=o.alive&&o.tgt===tg&&o.lockT>0&&o.fwd.angleTo(_s1.subVectors(tg.pos,o.pos))<1.05;
      const g=sarhStep(m,s,tg,lockOK,o);
      if(!g){tg=m.target=null;m.reason='NO ILLUMINATION IN TERMINAL PHASE';if(m.wasOnP)message('MISSILE LOST ILLUMINATION',1)} else if(g!==tg)vt=g}
    if(tg===P)m.wasOnP=true;
    if(tg&&m.t>.3){
      const dT=tg.pos.distanceTo(p);
      if(tg===P){
        if(m.type==='IR'){
          // each new flare in the seeker's view gets one chance to steal it
          for(const o of CM.objs){if(o.type!=='flare'||m.seen.has(o))continue;
            _b.subVectors(o.pos,p);
            if(_a.angleTo(_b)<.35&&_b.length()<dT*1.4){m.seen.add(o);
              const thrK=throttle>.81?.4:throttle<.3?1.4:1;           // afterburner plume outshines flares, idle helps them
              _c.subVectors(p,P.pos).normalize();
              const tail=_c.dot(P.fwd)<-.5?.8:1.2;                    // a seeker staring up your tailpipe is harder to fool
              if(Math.random()<s.flareP*thrK*tail){m.target=o;tg=o;m.reason='DECOYED BY YOUR FLARES';break}}}
        } else {
          _c.subVectors(P.pos,p).normalize(); const beam=Math.abs(P.vel.dot(_c))<70;  // beaming: you and the chaff share the clutter doppler
          for(const o of CM.objs){if(o.type!=='chaff'||m.seen.has(o))continue;
            _b.subVectors(o.pos,p);
            if(_a.angleTo(_b)<.3&&_b.length()<dT*1.3){m.seen.add(o);
              if(Math.random()<s.chaffP*(beam?2.5:.3)*(CM.ecm?1.5:1)){m.target=o;tg=o;m.reason='DECOYED BY YOUR CHAFF';break}}}
          if(tg===P&&CM.decoy&&!m.dRolled&&dT<6000){m.dRolled=true;if(Math.random()<.6){m.target=CM.decoy;tg=CM.decoy;m.reason='PULLED OFF BY TOWED DECOY'}}
          if(tg===P&&notchCheck(m,P,dt,.5)){tg=null;message('MISSILE TRASHED',1)}
        }
      } else if(tg.kind){ aiDecoyRoll(m,tg,m.type,s.flareP,s.chaffP,dt); tg=m.target; }
      if(tg){
        const aim=vt&&tg===m.target&&(tg===P||tg.kind)?vt:tg;
        _b.subVectors(aim.pos,p);
        if(m.type==='RDR'&&CM.ecm&&tg===P){ // jamming noise on its track, gone inside ~2 km burn-through
          m.jitT-=dt;if(m.jitT<=0){m.jitT=.4;const k=clamp((dT-2000)/6000,0,1)*90;m.jit.set(rand(-k,k),rand(-k,k),rand(-k,k))}
          _b.add(m.jit)}
        if(_a.angleTo(_b)>s.gimbal){m.target=null;m.reason=m.reason||'TARGET LEFT SEEKER FIELD'}
        else{
          const vr=_c.subVectors(aim.vel,m.vel), om=_d.crossVectors(_b,vr).divideScalar(_b.lengthSq());
          const acc=_e.crossVectors(om,m.vel).multiplyScalar(4); acc.y+=G; acc.addScaledVector(_a,-acc.dot(_a));
          const q=.5*at.rho*v*v, lim=s.gmax*G*clamp(q/40000,m.t<s.burn?.35:.08,1);
          if(acc.length()>lim)acc.setLength(lim); if(!(m.blindT>0))m.vel.addScaledVector(acc,dt);
        }
      }
    }
    m.prev.copy(p); p.addScaledVector(m.vel,dt);
    m.m.quaternion.setFromUnitVectors(ZF,_a.copy(m.vel).normalize());
    if(m.t<s.burn){puff(p.x,p.y,p.z,rand(-3,3),rand(-3,3),rand(-3,3),.85,.85,.87,.55,3,9,1.6);puff(p.x,p.y,p.z,0,0,0,1,.7,.3,.9,1.8,0,.06)}
    let done=false;
    const fz=s.fuze;
    if(m.team==='red'&&state==='play'&&P.alive&&distSeg(P.pos,m.prev,p)<fz){
      done=true;recMsl(m,'HIT','');explode(p,false);P.hp-=75;addHole(playerJet,5);hurtT=.8;shake=1.2;sndHit();buzz([120,60,200]);message('MISSILE HIT',1.2);feed('Critical hit: you were struck by a missile','loss');damageSystem(2);if(P.hp<=0)die('missile');
    } else if(CM.decoy&&m.target===CM.decoy&&distSeg(CM.decoy.pos,m.prev,p)<fz){done=true;recMsl(m,'MISS','HIT YOUR TOWED DECOY');explode(p,false);cutDecoy();syncCM();message('DECOY HIT · DECOY LOST',1.4)}
    else if(m.target&&m.target.kind&&m.target!==P&&distSeg(m.target.pos,m.prev,p)<fz*(m.target.kind==='fighter'?1:1.8)){done=true;recMsl(m,'HIT','');explode(p,false);hitAI(m.target,5,m.name,false)}
    else if(m.target&&m.target.type&&!m.target.kind&&distSeg(m.target.pos,m.prev,p)<fz){done=true;explode(p,false);recMsl(m,'MISS',m.reason||'DECOYED')}
    if(!done&&p.y<Math.max(groundH(p.x,p.z),0)){explode(p,false);done=true;recMsl(m,'MISS',m.reason||'HIT THE GROUND')}
    if(!done&&(m.t>s.life||(m.t>s.burn+(s.sus||0)&&v<250))){explode(p,false);done=true;recMsl(m,'MISS',m.reason||'OUT OF ENERGY')}
    if(!done){if(!m.target){m.lostT=(m.lostT||0)+dt;if(m.lostT>4){explode(p,false);done=true;recMsl(m,'MISS',m.reason||'LOST TARGET')}}else m.lostT=0}
    if(done)kill(m);
  }
}
function setLoadLabel(){const [f,c]=CM_LOADS[cmLoad];$('bLoad').textContent=`Canisters: ${f} flare + ${c} chaff (${f*15}F / ${c*30}C)`}
setLoadLabel(); CM.flares=cmFlares(); CM.chaff=cmChaff();
// countermeasure buttons
holdBtn($('cFlr'),()=>{CM.flrHeld=true;CM.flrT=0},()=>CM.flrHeld=false);
holdBtn($('cChf'),()=>{CM.chfHeld=true;CM.chfT=0},()=>CM.chfHeld=false);
$('cEcm').addEventListener('click',toggleECM);
$('cDcy').addEventListener('click',deployDecoy);
$('cAuto').addEventListener('click',()=>{CM.auto=!CM.auto;message(CM.auto?'CMDS AUTO':'CMDS MANUAL',.9);syncCM()});
syncCM();

/* ---------------- ground war: War Thunder armour that fights itself while you fly air support ----------------
   Blue (NATO) and red (Eastern bloc) columns close to gun range and trade shells. Red vehicles live in the same `ground` list as the SAMs and trucks, so your bombs,
   guns, missiles, TGP and wingmen already treat them as targets; blue vehicles are friendly and only die to red shells. Vehicles and BRs from the War Thunder wiki;
   gun and speed numbers are game estimates. gun: [range m, reload s, muzzle m/s, damage to vehicles, spread rad]; aa: [range m, rounds/s, damage to you]. */
const WAR_V={
  M1A1:{n:'M1A1 Abrams',team:'blue',cls:'mbt',br:11.7,hp:9,spd:14,gun:[3200,6,1670,3,.0012],look:'box',barrel:6.4,col:0x6d6a4c,hull:[3.6,1,7.8]},
  LEO2A4:{n:'Leopard 2A4',team:'blue',cls:'mbt',br:10.7,hp:8,spd:14,gun:[3100,5.5,1650,3,.0012],look:'box',barrel:6.2,col:0x55613f,hull:[3.5,1,7.7]},
  CHAL:{n:'Challenger Mk.2',team:'blue',cls:'mbt',br:10.3,hp:9,spd:11,gun:[3000,8,1500,3,.0013],look:'box',barrel:6.4,col:0x59603f,hull:[3.5,1.05,7.6]},
  M60A3:{n:'M60A3 TTS',team:'blue',cls:'mbt',br:9.0,hp:7,spd:12,gun:[2800,6.5,1490,2.5,.0016],look:'round',barrel:5.6,col:0x5f6a49,hull:[3.4,1,6.9]},
  M3:{n:'M3 Bradley',team:'blue',cls:'ifv',br:8.3,hp:5,spd:17,gun:[2200,.3,1100,.35,.004],aa:[1500,3,.6],look:'ifv',barrel:2.4,col:0x58623f,hull:[3.0,1.3,6.4]},
  MARDER:{n:'Marder 1A3',team:'blue',cls:'ifv',br:8.0,hp:5,spd:18,gun:[2000,.3,1050,.3,.004],aa:[1500,3,.5],look:'ifv',barrel:2.0,col:0x5b6244,hull:[3.1,1.2,6.7]},
  GEPARD:{n:'Gepard 1A2',team:'blue',cls:'spaa',br:9.7,hp:5,spd:14,gun:[2500,.15,1175,.4,.006],aa:[4500,10,1.2],look:'gepard',barrel:3.2,col:0x55613f,hull:[3.4,1,7.2]},
  M163:{n:'M163 Vulcan',team:'blue',cls:'spaa',br:7.3,hp:3,spd:17,gun:[1800,.1,1030,.2,.008],aa:[2200,12,.7],look:'m163',barrel:1.6,col:0x5b6244,hull:[2.7,1.3,4.9]},
  T80B:{n:'T-80B',team:'red',cls:'mbt',br:10.7,hp:8,spd:15,gun:[3000,7,1780,3,.0013],look:'round',barrel:6.0,col:0x6a5f45,hull:[3.4,.9,6.9]},
  T72A:{n:'T-72A',team:'red',cls:'mbt',br:9.3,hp:8,spd:13,gun:[2900,7,1780,3,.0014],look:'round',barrel:6.0,col:0x655b42,hull:[3.4,.9,6.9]},
  T62:{n:'T-62',team:'red',cls:'mbt',br:8.7,hp:7,spd:12,gun:[2600,8,1600,2.5,.0016],look:'round',barrel:5.6,col:0x6a6046,hull:[3.3,.9,6.6]},
  BMP2:{n:'BMP-2',team:'red',cls:'ifv',br:8.7,hp:5,spd:17,gun:[2200,.25,1000,.4,.004],aa:[1600,3,.6],look:'ifv',barrel:2.2,col:0x6a6046,hull:[3.1,1.1,6.7]},
  ZSU23:{n:'ZSU-23-4M4',team:'red',cls:'spaa',br:9.3,hp:4,spd:13,gun:[1800,.12,950,.25,.01],aa:[2600,14,1],look:'zsu23',barrel:2.6,col:0x655b42,hull:[3.1,1,6.5]},
  ZSU57:{n:'ZSU-57-2',team:'red',cls:'spaa',br:7.0,hp:5,spd:12,gun:[2200,.5,1000,1,.006],aa:[3000,4,2],look:'zsu57',barrel:4.2,col:0x6a6046,hull:[3.2,1,6.4]}};
// crew, ammunition-rack vulnerability (1 = autoloader carousel in the hull, low = blow-out panels) and the gun's pivot (y, z) in the turret
const WAR_X={M1A1:{crew:4,rack:.3,gy:.62,gz:2.25},LEO2A4:{crew:4,rack:.45,gy:.6,gz:2.1},CHAL:{crew:4,rack:.4,gy:.62,gz:2.2},M60A3:{crew:4,rack:.8,gy:.5,gz:1.7},M3:{crew:3,rack:.7,gy:.55,gz:.9},MARDER:{crew:3,rack:.6,gy:.55,gz:.9},
  GEPARD:{crew:3,rack:.5,gy:.8,gz:1.6},M163:{crew:3,rack:.5,gy:.6,gz:.5},T80B:{crew:3,rack:1.3,gy:.5,gz:1.5},T72A:{crew:3,rack:1.4,gy:.5,gz:1.5},T62:{crew:4,rack:.9,gy:.5,gz:1.5},BMP2:{crew:3,rack:1,gy:.55,gz:.8},ZSU23:{crew:4,rack:.6,gy:.75,gz:1.4},ZSU57:{crew:6,rack:.8,gy:.55,gz:1.4}};
for(const k in WAR_X)Object.assign(WAR_V[k],WAR_X[k]);
const WAR={on:false,units:[],sh:[],t:0,debris:[]};
const warMat=c=>new THREE.MeshLambertMaterial({color:c});
const warShellMat={blue:new THREE.MeshBasicMaterial({color:0xfff4c0}),red:new THREE.MeshBasicMaterial({color:0xffb27a})};
const warShellGeo=new THREE.BoxGeometry(.28,.28,7);
for(let i=0;i<48;i++){const m=new THREE.Mesh(warShellGeo,warShellMat.blue);m.visible=false;m.frustumCulled=false;scene.add(m);WAR.sh.push({m,on:false,vel:new V3(),prev:new V3(),life:0,team:'blue',dmg:0,owner:null})}
/* ---- models: parts are collected per material group and merged, so a vehicle costs about seven draw calls ---- */
const _wm4=new THREE.Matrix4(),_wq=new THREE.Quaternion(),_we=new THREE.Euler(),_wv=new V3(),_ws=new V3();
function wPart(list,geo,x,y,z,rx,ry,rz,sx,sy,sz){_we.set(rx||0,ry||0,rz||0);_wq.setFromEuler(_we);_wm4.compose(_wv.set(x,y,z),_wq,_ws.set(sx||1,sy||1,sz||1));const g=geo.index?geo.toNonIndexed():geo.clone();g.applyMatrix4(_wm4);list.push(g)}
function wMerge(list,mat){if(!list.length)return null;const n=list.reduce((a,g)=>a+g.attributes.position.count,0),pos=new Float32Array(n*3),nor=new Float32Array(n*3);let o=0;
  for(const g of list){pos.set(g.attributes.position.array,o*3);nor.set(g.attributes.normal.array,o*3);o+=g.attributes.position.count}
  const G=new THREE.BufferGeometry();G.setAttribute('position',new THREE.BufferAttribute(pos,3));G.setAttribute('normal',new THREE.BufferAttribute(nor,3));return new THREE.Mesh(G,mat)}
// a side-profile polygon (z, y) extruded across x: wedge hulls and sloped turrets
function wPrism(pts,w){const sh=new THREE.Shape();pts.forEach((p,i)=>i?sh.lineTo(p[0],p[1]):sh.moveTo(p[0],p[1]));sh.closePath();const g=new THREE.ExtrudeGeometry(sh,{depth:w,bevelEnabled:false});g.translate(0,0,-w/2);g.rotateY(-Math.PI/2);return g}
const wBox=(w,h,l)=>new THREE.BoxGeometry(w,h,l), wCyl=(r1,r2,h,n)=>new THREE.CylinderGeometry(r1,r2,h,n||10), wSph=()=>new THREE.SphereGeometry(1,14,9);
const wBarrel=(r,len)=>new THREE.CylinderGeometry(r,r,len,8).rotateX(Math.PI/2).translate(0,0,len/2);
function warBuild(d){
  const g=new THREE.Group(),W=d.hull[0],H1=d.hull[1],L=d.hull[2],body=warMat(d.col),tmat=warMat(new THREE.Color(d.col).multiplyScalar(.9).getHex()),dk=warMat(0x24272a),dk2=warMat(0x3a3d3a);
  const hullG=[],sideL=[],sideR=[],turB=[],turD=[],gunG=[];
  const tier=d.look==='ifv'||d.look==='m163';
  // hull: sloped glacis and rear deck
  const hp=d.look==='m163'?[[-L/2,.3],[-L/2,.3+H1],[L/2-1.0,.3+H1],[L/2,.3+H1*.6],[L/2,.3]]:tier?[[-L/2,.3],[-L/2,.3+H1],[L/2-1.5,.3+H1],[L/2,.3+H1*.55],[L/2,.3]]:[[-L/2,.3],[-L/2,.3+H1*.92],[-L/2+1.8,.3+H1],[L/2-2.0,.3+H1],[L/2,.3+H1*.5],[L/2,.3]];
  wPart(hullG,wPrism(hp,W-.35),0,0,0);
  if(!tier||d.look==='m163'){wPart(sideL,wBox(W*.55,.05,1.7),0,.3+H1+.04,-L/2+1.3);}                                       // engine deck grille (hull frame, dark)
  // running gear: road wheels, sprocket, idler, track runs and skirts, one merged mesh per side
  const nW=tier?5:6;
  for(const [sd,list] of [[-1,sideL],[1,sideR]]){const x=sd*(W/2+.12);
    wPart(list,wBox(.8,.95,L+.2),x,.6,0);wPart(list,wBox(.8,.1,L-.2),x,1.12,0);
    for(let i=0;i<nW;i++){const z=-L/2+1.2+(L-2.4)*i/(nW-1);wPart(list,wCyl(.46,.46,.55,12),x+sd*-.12,.55,z,0,0,Math.PI/2)}
    wPart(list,wCyl(.4,.4,.55,12),x-sd*.12,.6,-L/2+.45,0,0,Math.PI/2);wPart(list,wCyl(.36,.36,.55,12),x-sd*.12,.6,L/2-.35,0,0,Math.PI/2);
    if(!tier&&d.team==='blue')wPart(list,wBox(.08,.55,L*.8),x+sd*.42,.95,0)}                                              // side skirts on the NATO tanks
  const yT=.3+H1, T=turB, TD=turD;   // turret frame: y = 0 at the ring
  const top={v:1};
  switch(d.look){
    case 'box':{
      if(d.n.indexOf('Abrams')>=0){wPart(T,wPrism([[-2.5,0],[-2.5,.92],[-.7,1.06],[1.0,.96],[2.0,.72],[2.3,.35],[2.3,0]],3.3),0,0,0);wPart(T,wBox(3.2,.8,1.1),0,.45,-2.75);wPart(T,wBox(.7,.3,.9),-.75,1.1,-.3);wPart(TD,wCyl(.42,.42,.3,10),.75,1.15,-.2);wPart(TD,wBox(1.0,.7,.4),0,.5,2.35);top.v=1.2}
      else if(d.n.indexOf('Leopard')>=0){wPart(T,wPrism([[-2.4,0],[-2.4,.95],[1.7,.95],[2.15,.78],[2.15,0]],3.4),0,0,0);for(const s of [-1,1])wPart(T,wBox(.55,.78,1.5),s*1.55,.45,1.55,0,-s*.55);wPart(T,wBox(3.1,.7,1.0),0,.45,-2.75);wPart(TD,wCyl(.4,.4,.3,10),.8,1.1,-.2);wPart(TD,wBox(.9,.6,.4),0,.5,2.2);top.v=1.05}
      else{wPart(T,wPrism([[-2.6,0],[-2.6,.98],[1.4,1.05],[2.25,.78],[2.25,0]],3.5),0,0,0);wPart(T,wBox(3.3,.85,1.4),0,.5,-2.9);wPart(TD,wCyl(.42,.42,.3,10),.8,1.18,-.4);wPart(TD,wBox(1.1,.7,.4),0,.5,2.3);top.v=1.15}
      break}
    case 'round':{
      const m60=d.n.indexOf('M60')>=0;wPart(T,wSph(),0,m60?.15:.05,.1,0,0,0,m60?1.5:1.6,m60?.85:.55,m60?2.0:1.85);
      wPart(TD,wCyl(.46,.46,.32,10),m60?.65:.55,m60?1.0:.62,-.3);
      if(!m60){wPart(TD,wBox(.5,.3,.6),-.75,.6,1.1);for(const s of [-1,1])for(let i=0;i<3;i++)wPart(TD,wCyl(.07,.07,.3,6),s*(.75+i*.15),.45,1.55,Math.PI/2,0,0);wPart(TD,wCyl(.05,.05,.7,6),.55,.9,-.3)}
      else wPart(TD,wBox(.9,.3,.6),-.9,.55,-.2);
      top.v=m60?1.1:.82;break}
    case 'ifv':{
      const brad=d.n.indexOf('Bradley')>=0,mard=d.n.indexOf('Marder')>=0;
      wPart(T,wBox(brad?1.9:1.7,.85,2.0),brad?-.4:.35,.42,-.2);if(brad)wPart(TD,wBox(.7,.55,1.2),.95,.8,-.4);else if(mard)wPart(TD,wBox(.5,.4,.8),-.1,.9,-.3);else wPart(TD,wBox(.3,.35,.9),-.5,1.0,.1);
      wPart(TD,wCyl(.3,.3,.18,8),brad?-.4:.35,.9,-.3);top.v=.9;break}
    case 'gepard':{
      wPart(T,wPrism([[-1.9,0],[-1.9,1.25],[1.1,1.35],[1.9,.95],[1.9,0]],3.3),0,0,0);
      wPart(TD,wCyl(.06,.06,1.0,6),0,1.8,-1.0);wPart(TD,wCyl(.95,.95,.14,16),0,2.4,-1.0,Math.PI/2.4);wPart(TD,wCyl(.42,.42,.14,12),0,1.55,1.4,Math.PI/2.1);
      for(const s of [-1,1])wPart(TD,wBox(.3,.35,.9),s*1.35,.6,1.2);top.v=1.4;break}
    case 'm163':{
      wPart(T,wCyl(.95,1.0,.65,14),0,.3,0);wPart(T,wBox(.15,.8,1.2),.9,.7,.3);wPart(T,wBox(.15,.8,1.2),-.9,.7,.3);wPart(TD,wBox(1.3,.3,.8),0,.5,-.8);top.v=.8;break}
    case 'zsu23':{
      wPart(T,wBox(2.9,1.2,2.9),0,.6,-.2);wPart(T,wBox(2.6,.2,1.0),0,1.25,.9,-.35);wPart(TD,wCyl(.06,.06,.8,6),0,1.6,-1.0);wPart(TD,wCyl(.85,.85,.14,14),0,2.1,-1.1,Math.PI/2.3);top.v=1.4;break}
    default:{   // ZSU-57-2: open-topped turret with thin walls
      for(const s of [-1,1])wPart(T,wBox(.12,.9,3.0),s*1.4,.45,-.2);wPart(T,wBox(2.9,.9,.12),0,.45,-1.7);wPart(T,wBox(2.9,.5,.12),0,.3,1.3);wPart(TD,wBox(2.6,.1,2.6),0,.05,-.2);top.v=.9}}
  // gun: barrel(s) in their own group so they can elevate and recoil
  const gg=new THREE.Group();gg.position.set(0,d.gy,d.gz);
  if(d.look==='gepard')for(const s of [-1,1]){wPart(gunG,wBarrel(.075,d.barrel),s*1.35,d.gy*0-.15,-d.gz+1.2);wPart(gunG,wCyl(.1,.1,.35,8).rotateX(Math.PI/2),s*1.35,-.15,-d.gz+1.2+d.barrel,0,0,0)}
  else if(d.look==='zsu23')for(const x of [-.55,-.18,.18,.55])for(const y of [-.2,.2])wPart(gunG,wBarrel(.05,d.barrel),x,y,0);
  else if(d.look==='zsu57')for(const x of [-.45,.45])wPart(gunG,wBarrel(.1,d.barrel),x,0,0);
  else if(d.look==='m163')for(let i=0;i<6;i++){const a=i*Math.PI/3;wPart(gunG,wBarrel(.03,d.barrel),Math.cos(a)*.17,Math.sin(a)*.17,0)}
  else if(d.cls==='mbt'){const r=d.n.indexOf('T-')===0?.14:.13;wPart(gunG,wBarrel(r,d.barrel),0,0,0);wPart(gunG,wCyl(r*1.45,r*1.45,.9,10).rotateX(Math.PI/2),0,0,d.barrel*.62);   // bore evacuator
    if(d.n.indexOf('Leopard')>=0||d.n.indexOf('Abrams')>=0||d.n.indexOf('Chall')>=0)wPart(gunG,wCyl(r*1.3,r*1.3,1.4,10).rotateX(Math.PI/2),0,0,.9)}
  else wPart(gunG,wBarrel(.06,d.barrel),0,0,0);
  if(d.look==='gepard')gg.position.set(0,.8,d.gz);
  const hull=wMerge(hullG,body),sl=wMerge(sideL,dk),sr=wMerge(sideR,dk),tb=wMerge(turB,tmat),td=wMerge(turD,dk2),gn=wMerge(gunG,dk);
  const tur=new THREE.Group();tur.position.y=yT;
  g.add(hull);g.add(sl);g.add(sr);g.add(tur);tur.add(tb);if(td)tur.add(td);tur.add(gg);if(gn)gg.add(gn);
  const mk=new THREE.Mesh(new THREE.PlaneGeometry(1.6,1.6).rotateX(-Math.PI/2),new THREE.MeshBasicMaterial({color:d.team==='blue'?0x2b8cff:0xff3b30,side:THREE.DoubleSide}));mk.position.set(0,top.v+.05,-.3);tur.add(mk);   // roof panel: readable from the air
  g.userData={tur,gun:gg,gz:d.gz,sl,sr,yT,L};return g}
function warSpawn(id,x,z,heading){
  const d=WAR_V[id],obj=warBuild(d);obj.position.set(x,Math.max(groundH(x,z),0)+.2,z);obj.rotation.y=heading;scene.add(obj);
  const kind=d.cls==='mbt'?'tank':d.cls==='ifv'?'ifv':'spaa';
  const u={kind,team:d.team,type:d.n,def:d,obj,pos:obj.position,vel:new V3(),fwd:new V3(0,0,1),up:UP,right:new V3(1,0,0),alive:true,hp:d.hp,hpSeen:d.hp,objective:false,offT:0,lockT:0,tgt:null,mslCd:99,shots:0,id:nextId(),gunAcc:0,seenT:-99,
    war:true,heading,aim:null,scanT:rand(0,1),cd:rand(1,d.gun[1]+2),dustT:0,burnT:0,airAcc:0,rec:0,
    mod:{trk:false,eng:false,gun:0,tur:false,fire:false,crew:d.crew,ammo:true},fireT:0,fireLeft:0,note:{}};
  WAR.units.push(u);if(d.team==='red')ground.push(u);return u}
const warEnemy=u=>u.team==='blue'?'red':'blue';
function warPick(u){let best=null,bd=6500;for(const o of WAR.units){if(!o.alive||o.team===u.team)continue;const d=Math.hypot(o.pos.x-u.pos.x,o.pos.z-u.pos.z);if(d<bd){bd=d;best=o}}return best}
const warAng=a=>{while(a>Math.PI)a-=2*Math.PI;while(a<-Math.PI)a+=2*Math.PI;return a};
function warFire(u,t){
  const d=u.def,from=new V3(u.pos.x,u.pos.y+2.4,u.pos.z),to=new V3(t.pos.x,t.pos.y+1.4,t.pos.z),dist=from.distanceTo(to);
  const s=WAR.sh.find(q=>!q.on)||WAR.sh[0],T=dist/d.gun[2],dir=to.sub(from);dir.y+=.5*9.81*T*T;                                    // aim up to drop onto the target
  dir.addScaledVector(t.vel||new V3(),T*.8).normalize();const sp=d.gun[4]*2.6*(u.moving?2.2:1)*(u.mod.gun===1?2.6:1)*(u.mod.crew<d.crew?1.25:1);dir.x+=rand(-sp,sp);dir.y+=rand(-sp,sp);dir.z+=rand(-sp,sp);dir.normalize();
  s.on=true;s.team=u.team;s.dmg=d.gun[3];s.owner=u;s.life=8;s.m.material=warShellMat[u.team];s.m.visible=true;s.m.position.copy(from);s.prev.copy(from);s.vel.copy(dir).multiplyScalar(d.gun[2]);s.m.quaternion.setFromUnitVectors(ZF,dir);
  const big=d.cls==='mbt';puff(from.x+dir.x*4,from.y+dir.y*4,from.z+dir.z*4,dir.x*30,dir.y*30+2,dir.z*30,1,.85,.5,1,big?9:3,big?30:10,.14);                  // muzzle flash
  if(big)puff(from.x,from.y,from.z,dir.x*8,3,dir.z*8,.5,.48,.44,.6,big?7:3,12,2.2);
  u.rec=1;const cd=camera.position.distanceTo(from);if(big&&cd<7000&&typeof sndBoom==='function')sndBoom(clamp(1-cd/7000,0,.45)*.8)}
/* ---- damage modules (War Thunder style): a hit can break the tracks, engine, gun, turret drive, kill crew, hit the ammunition rack or start a fire ---- */
const WAR_NOTE={trk:'tracks damaged',eng:'engine damaged',fire:'engine on fire',gun:'gun barrel damaged',gun2:'gun destroyed',tur:'turret drive damaged',crew:'crewman killed',rack:'ammunition rack hit'};
function warNote(u,k,txt){if(u.note[k])return;u.note[k]=1;if(u.team==='red'||u.def.cls==='mbt')feed((u.team==='blue'?'Blue ':'Red ')+u.def.n+': '+(txt||WAR_NOTE[k]),u.team==='red'?'hit':'loss')}
function warModules(u,dmg,by){
  const d=u.def,m=u.mod,heavy=dmg>=2;
  for(let k=0;k<(heavy?2:1)&&u.alive;k++){const r=Math.random();
    if(r<.14){if(!m.trk){m.trk=true;warNote(u,'trk')}}
    else if(r<.28){if(!m.eng){m.eng=true;warNote(u,'eng');if(Math.random()<.5)warBurn(u)}else if(!m.fire&&Math.random()<.5)warBurn(u)}
    else if(r<.40){if(m.gun<2){m.gun++;warNote(u,m.gun===1?'gun':'gun2')}}
    else if(r<.52){if(!m.tur){m.tur=true;warNote(u,'tur')}}
    else if(r<.68){m.crew--;warNote(u,'crew');if(m.crew<=0){warDie(u,by,'crew knocked out');return}}
    else if(r<.82){warNote(u,'rack');if(Math.random()<(heavy?.55:.05)*d.rack){warDie(u,by,'ammunition detonated');return}}
  }}
function warBurn(u){if(u.mod.fire||!u.alive)return;u.mod.fire=true;u.fireLeft=rand(14,24);warNote(u,'fire')}
function warDamage(u,dmg,by){if(!u.alive)return;u.hp-=dmg;puff(u.pos.x,u.pos.y+2,u.pos.z,0,4,0,.2,.2,.2,.7,8,10,2.5);if(u.hp<=0)warDie(u,by)}
function warWreck(u){u.burnT=45;if(u.obj.userData.tur){u.obj.userData.tur.position.y+=.25;u.obj.userData.tur.rotation.z=.2}
  u.obj.traverse(o=>{if(o.isMesh&&o.material&&o.material.color&&!o.material.isMeshBasicMaterial)o.material=o.material.clone(),o.material.color.setHex(0x1b1b1a)})}
// the turret flies off when the ammunition goes up
function warPop(u){const t=u.obj.userData.tur;if(!t||t.parent!==u.obj)return;u.obj.updateMatrixWorld(true);const wp=new V3();t.getWorldPosition(wp);u.obj.remove(t);t.position.copy(wp);t.rotation.set(0,u.heading,0);scene.add(t);
  WAR.debris.push({o:t,vel:new V3(rand(-4,4),rand(16,22),rand(-4,4)),spin:new V3(rand(-1.5,1.5),rand(-1,1),rand(-1.5,1.5)),t:0})}
function warDie(u,by,why){if(!u.alive)return;u.alive=false;const big=why==='ammunition detonated';explode(new V3(u.pos.x,u.pos.y+2,u.pos.z),big);
  if(big)warPop(u);warWreck(u);
  if(by&&by.def)feed((by.team==='blue'?'Blue ':'Red ')+by.def.n+' destroyed '+u.def.n+(why?' ('+why+')':''),u.team==='red'?'kill':'loss');else if(why)feed(u.def.n+': '+why,u.team==='red'?'kill':'loss')}
const warFlags=u=>{const m=u.mod,a=[];if(m.trk)a.push('TRK');if(m.eng)a.push('ENG');if(m.gun)a.push(m.gun>1?'GUN X':'GUN');if(m.tur)a.push('TUR');if(u.def.crew&&m.crew<u.def.crew)a.push('CREW '+m.crew+'/'+u.def.crew);if(m.fire)a.push('FIRE');return a.join(' ')};
function warClear(){for(const u of WAR.units)if(u.team==='blue')scene.remove(u.obj);WAR.units=[];for(const s of WAR.sh){s.on=false;s.m.visible=false}for(const x of WAR.debris)scene.remove(x.o);WAR.debris=[];WAR.on=false}
function updateWar(dt){
  if(!WAR.on)return;
  if(state!=='play'){return}
  WAR.t+=dt;
  for(const x of WAR.debris){if(x.t>6)continue;x.t+=dt;x.vel.y-=9.81*dt;x.o.position.addScaledVector(x.vel,dt);x.o.rotation.x+=x.spin.x*dt;x.o.rotation.y+=x.spin.y*dt;x.o.rotation.z+=x.spin.z*dt;const gh=Math.max(groundH(x.o.position.x,x.o.position.z),0)+.8;if(x.o.position.y<gh){x.o.position.y=gh;x.t=7}}
  for(const u of WAR.units){
    if(!u.alive){if(u.burnT>0){u.burnT-=dt;u.dustT-=dt;if(u.dustT<=0){u.dustT=.35;puff(u.pos.x+rand(-1,1),u.pos.y+2.5,u.pos.z+rand(-1,1),rand(-1,1),rand(6,10),rand(-1,1),.14,.14,.14,.6,rand(5,9),rand(6,12),rand(3,5),-.3)}}continue}
    const d=u.def,m=u.mod;u.cd-=dt;u.scanT-=dt;
    // module effects from damage taken since last frame (also covers your bombs and gun, which only lower hp)
    if(u.hp<u.hpSeen-1e-6){const dl=u.hpSeen-u.hp;u.hpSeen=u.hp;if(u.hp>0)warModules(u,dl,null);if(!u.alive)continue}
    if(m.fire){u.fireT-=dt;u.hp-=.1*dt;u.hpSeen=u.hp;if(u.fireT<=0){u.fireT=.12;const rx=Math.sin(u.heading)*-3,rz=Math.cos(u.heading)*-3;puff(u.pos.x+rx+rand(-.4,.4),u.pos.y+2.4,u.pos.z+rz+rand(-.4,.4),rand(-1,1),rand(4,8),rand(-1,1),1,.55,.15,.9,rand(2,4),rand(3,6),rand(.5,.9),-.3);if(Math.random()<.4)puff(u.pos.x+rx,u.pos.y+3,u.pos.z+rz,rand(-1,1),rand(7,11),rand(-1,1),.12,.12,.12,.65,rand(4,8),rand(6,12),rand(2,4),-.3)}
      u.fireLeft-=dt;if(u.fireLeft<=0){if(m.crew>0&&Math.random()<.55){m.fire=false;feed(d.n+': fire extinguished','info')}else u.fireLeft=8}
      if(u.hp<=0){warDie(u,null,'burned out');continue}}
    if(u.scanT<=0){u.scanT=.8+Math.random()*.5;u.aim=warPick(u);u.los=!u.aim||losClear(new V3(u.pos.x,u.pos.y+2.4,u.pos.z),new V3(u.aim.pos.x,u.aim.pos.y+1.4,u.aim.pos.z))}
    const t=u.aim&&u.aim.alive?u.aim:null;let dist=1e9,wantH=u.team==='blue'?0:Math.PI;
    if(t){const dx=t.pos.x-u.pos.x,dz=t.pos.z-u.pos.z;dist=Math.hypot(dx,dz);wantH=Math.atan2(dx,dz)}
    u.moving=!m.trk&&(!t||dist>d.gun[0]*.78||u.los===false);   // no line of sight (a ridge in between): keep advancing
    const dh=warAng(wantH-u.heading);if(!m.trk)u.heading+=clamp(dh,-dt*.45,dt*.45);u.obj.rotation.y=u.heading;
    if(u.moving&&Math.abs(dh)<.9){const v=d.spd*.5*(m.eng?.45:1);u.pos.x+=Math.sin(u.heading)*v*dt;u.pos.z+=Math.cos(u.heading)*v*dt;u.vel.set(Math.sin(u.heading)*v,0,Math.cos(u.heading)*v);
      u.dustT-=dt;if(u.dustT<=0){u.dustT=.3;puff(u.pos.x-Math.sin(u.heading)*3,u.pos.y+.4,u.pos.z-Math.cos(u.heading)*3,rand(-1,1),rand(1,2.5),rand(-1,1),.55,.5,.4,.35,rand(4,7),rand(5,9),rand(1.5,2.5),-.2)}}
    else u.vel.set(0,0,0);
    u.pos.y=Math.max(groundH(u.pos.x,u.pos.z),0)+.2;
    // turret follows its target (in the hull's frame); the gun elevates and recoils
    const ud=u.obj.userData,tur=ud.tur;let aimed=false;
    if(t&&tur&&tur.parent===u.obj){const want=Math.atan2(t.pos.x-u.pos.x,t.pos.z-u.pos.z)-u.heading,cur=tur.rotation.y,dd=warAng(want-cur);tur.rotation.y=cur+clamp(dd,-dt*1.2*(m.tur?.25:1),dt*1.2*(m.tur?.25:1));aimed=Math.abs(dd)<.06;
      if(ud.gun){const el=Math.atan2(t.pos.y-u.pos.y-1,Math.max(dist,50))+9.81*dist/(2*d.gun[2]*d.gun[2]);ud.gun.rotation.x+=(-clamp(el,-.12,.35)+(m.gun===1?.08:0)-ud.gun.rotation.x)*Math.min(1,dt*5)}}
    if(ud.gun){u.rec=Math.max(0,u.rec-dt*2.5);ud.gun.position.z=d.gz-u.rec*.4}
    const crewK=m.crew>0?d.crew/m.crew:9;
    if(t&&aimed&&u.cd<=0&&m.gun<2&&dist<d.gun[0]&&u.los!==false){u.cd=d.gun[1]*(.9+Math.random()*.25)*(m.gun===1?1.6:1)*crewK;warFire(u,t)}
    // blue anti-aircraft (Gepard, Vulcan, IFV cannons): bursts at the nearest red fighter, with a hit chance that falls off with range
    if(u.team==='blue'&&d.aa){u.aaT=(u.aaT||0)-dt;if(u.aaT<=0){u.aaT=.35+Math.random()*.2;let bt=null,bdd=d.aa[0];for(const e of enemies){if(!e.alive||e.kind!=='fighter'||e.pos.y-u.pos.y<25)continue;const dd=e.pos.distanceTo(u.pos);if(dd<bdd){bdd=dd;bt=e}}
      if(bt){const ux=(bt.pos.x-u.pos.x)/bdd,uy=(bt.pos.y-u.pos.y)/bdd,uz=(bt.pos.z-u.pos.z)/bdd;for(let k=0;k<3;k++)puff(u.pos.x+ux*8*(k+1),u.pos.y+3+uy*8*(k+1),u.pos.z+uz*8*(k+1),ux*900,uy*900,uz*900,1,.8,.35,1,2.4,0,.55);
        if(Math.random()<clamp(1-bdd/d.aa[0],.05,1)*.45*(d.cls==='spaa'?1:.35)*(m.gun>1?0:1))hitAI(bt,d.aa[2],d.n,false)}}}
    // red anti-aircraft: shoot at you inside range, like the AAA guns
    if(u.team==='red'&&d.aa&&m.gun<2&&P.alive&&!P.scramble){const pd=u.pos.distanceTo(P.pos),agl=P.pos.y-Math.max(groundH(P.pos.x,P.pos.z),0);
      if(pd<d.aa[0]&&P.pos.y-u.pos.y<2600&&agl>15){u.airAcc+=dt*d.aa[1]/crewK;while(u.airAcc>=1){u.airAcc--;const tt=pd/970;_c.copy(P.pos).addScaledVector(P.vel,tt).sub(u.pos).normalize();const sp=d.cls==='spaa'?.018:.04;_c.x+=rand(-sp,sp);_c.y+=rand(-sp,sp);_c.z+=rand(-sp,sp);_c.normalize();
        const b=take(eBullets);b.on=true;b.life=3;b.m.visible=true;b.team='red';b.dmg=d.aa[2];b.m.position.copy(u.pos).setY(u.pos.y+3);b.vel.copy(_c).multiplyScalar(970);b.m.quaternion.setFromUnitVectors(ZF,_c)}}
      else u.airAcc=0}
  }
  // shells in flight
  for(const s of WAR.sh){if(!s.on)continue;s.prev.copy(s.m.position);s.vel.y-=9.81*dt;s.m.position.addScaledVector(s.vel,dt);s.life-=dt;
    s.m.quaternion.setFromUnitVectors(ZF,_s1.copy(s.vel).normalize());
    let hit=null;for(const o of WAR.units){if(!o.alive||o.team===s.team)continue;if(distSeg(_s2.set(o.pos.x,o.pos.y+1.4,o.pos.z),s.prev,s.m.position)<5){hit=o;break}}
    if(hit){s.on=false;s.m.visible=false;const p=s.m.position;puff(p.x,p.y,p.z,0,3,0,1,.8,.4,1,10,22,.2);
      hit.hp-=s.dmg;puff(hit.pos.x,hit.pos.y+2,hit.pos.z,0,5,0,.2,.2,.2,.7,9,10,3);
      if(hit.hp<=0&&hit.alive){hit.alive=false;explode(new V3(hit.pos.x,hit.pos.y+2,hit.pos.z),false);warWreck(hit);if(s.owner&&s.owner.def)feed((s.owner.team==='blue'?'Blue ':'Red ')+s.owner.def.n+' destroyed '+hit.def.n,hit.team==='red'?'kill':'loss')}
      else if(hit.alive){hit.hpSeen=hit.hp+s.dmg;}   // the module roll runs next frame
      continue}
    const gh=Math.max(groundH(s.m.position.x,s.m.position.z),0);
    if(s.m.position.y<gh+.3||s.life<=0){s.on=false;s.m.visible=false;if(s.life>0){const p=s.m.position;puff(p.x,gh+1,p.z,0,4,0,.5,.42,.32,.8,9,16,2,-.2)}}}
}
// the mission: blue armour in the south, red in the north, you overhead
function setupGroundWar(){
  warClear();WAR.on=true;WAR.t=0;
  const [cx,cz]=findLand(rand(-3000,3000),31000),gap=1900;
  const blue=['M1A1','M1A1','LEO2A4','LEO2A4','CHAL','M60A3','M3','MARDER','GEPARD','M163'],red=['T80B','T80B','T80B','T72A','T72A','T62','BMP2','BMP2','ZSU23','ZSU57'];
  blue.forEach((id,i)=>{const k=i%5,r=i>>2;warSpawn(id,cx+(k-2)*140+rand(-20,20),cz-gap-r*110,0)});
  red.forEach((id,i)=>{const k=i%5,r=i>>2;warSpawn(id,cx+(k-2)*140+rand(-20,20),cz+gap+r*110,Math.PI)});
  sortie={kind:'GROUNDWAR',center:new V3(cx,0,cz),need:red.length};
  P.pos.set(0,5500,0);P.vel.set(0,0,240)}
const warAlive=team=>WAR.units.filter(u=>u.team===team&&u.alive).length;
function warStatus(){return 'RED '+warAlive('red')+' · BLUE '+warAlive('blue')}
function warCheck(dt){
  if(!warAlive('red'))endMission(true,'Enemy armour destroyed');
  else if(!warAlive('blue'))endMission(false,'The friendly force was wiped out');
  else if(WAR.t>900)endMission(warAlive('blue')>=warAlive('red'),warAlive('blue')>=warAlive('red')?'Held the line':'Out of time')}

/* ---------------- progression (War Thunder style): research points, silver lions, tech trees, modules, crew ----------------
   Career mode only. RP earned in a sortie go to the aircraft you flew (and 10 % to Free RP); an aircraft is researched with RP from the
   aircraft it descends from (or Free RP), then bought with Silver Lions. Modules and crew skills improve what you own. Bandits are picked near your BR. */
const NATIONS={USA:{n:'United States',c:'#6fb7ff'},RUS:{n:'Russia',c:'#ff8a7a'},GER:{n:'Germany',c:'#cfd3d8'},JPN:{n:'Japan',c:'#ff6f91'},ISR:{n:'Israel',c:'#7fd6ff'},SWE:{n:'Sweden',c:'#ffd166'},GBR:{n:'United Kingdom',c:'#b69cff'},CHN:{n:'China',c:'#ff9d4e'},FRA:{n:'France',c:'#8ea8ff'},ITA:{n:'Italy',c:'#7fd69a'}};
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
  F5E:{n:'USA',r:2,br:11.0,req:'F4E'},F14B:{n:'USA',r:3,br:13.0,req:'F4E'},MIG23ML:{n:'RUS',r:2,br:11.7,req:'MIG21'},MIG25PD:{n:'RUS',r:3,br:11.0,req:'MIG23ML'},J8F:{n:'CHN',r:2,br:13.0,req:'J7G'},
  F100D:{n:'USA',r:1,br:9.3},F8E:{n:'USA',r:1,br:10.7,req:'F100D'},MIG19PT:{n:'RUS',r:1,br:9.3},MIG21F13:{n:'RUS',r:1,br:9.3,req:'MIG19PT'},HUNTER:{n:'GBR',r:1,br:10.0},MIRAGE3C:{n:'FRA',r:1,br:10.0},
  F4C:{n:'USA',r:1,br:10.0,req:'F100D'},F5A:{n:'USA',r:1,br:10.7,req:'F100D'},J29F:{n:'SWE',r:1,br:9.0},J35D:{n:'SWE',r:1,br:10.0,req:'J29F'},J6A:{n:'CHN',r:1,br:9.3,req:'J7G'},MIG21MF:{n:'RUS',r:1,br:10.3,req:'MIG21'},
  A4E:{n:'USA',r:1,br:8.7,req:'F100D'},A7E:{n:'USA',r:2,br:10.3,req:'A4E'},A10A:{n:'USA',r:2,br:10.7,req:'A7E'},SU25:{n:'RUS',r:2,br:10.3,req:'MIG21F13'},SU22M3:{n:'RUS',r:2,br:11.0,req:'SU25'},ALPHAJET:{n:'GER',r:1,br:9.0,req:'F104G'},
  G91Y:{n:'ITA',r:1,br:9.3},AMX:{n:'ITA',r:2,br:10.7,req:'G91Y'},F104S:{n:'ITA',r:2,br:11.3,req:'G91Y'},TORNADOIT:{n:'ITA',r:3,br:11.3,req:'AMX'},JAGUAR:{n:'GBR',r:2,br:9.7,req:'HUNTER'},Q5A:{n:'CHN',r:2,br:10.0,req:'J6A'}};
// War Thunder wiki reference (Realistic battles, stock-to-reference column): [max speed km/h, climb m/s, turn time s, BR]; shown beside the flight-model figures in the hangar spec sheet (wiki.warthunder.com, Oct 2026)
const WTREF={A10A:[665,20.6,30.3,10.7],SU25:[968,67,28.4,10.3],A7E:[1114,42.3,36.2,10.3],A4E:[1066,29.6,38.3,8.7],ALPHAJET:[1005,40.1,31.3,9],JAGUAR:[1464,74.8,31.8,9.7],AMX:[1140,76.3,32.3,10.7],G91Y:[1115,58.8,30.5,9.3],F104S:[2335,225.4,35.7,11.3],TORNADOIT:[1956,154.5,32.5,11.3],Q5A:[1436,139.4,25.8,10],SU22M3:[2205,148.7,27.5,11],F4C:[2228,142.4,27.4,10],F5A:[1428,114,28.2,10.7],J35D:[2130,149.4,26.7,10],J29F:[1032,49,30.2,9],J6A:[1426,159.4,32.8,9.3],MIG21MF:[2190,139.9,34.7,10.3],F8E:[2094,108.6,30.3,10.7],F100D:[1419,88.3,41.2,9.3],MIG19PT:[1426,159.4,32.8,9.3],MIG21F13:[2211,98,34.6,9.3],HUNTER:[1139,54.5,26.7,10],MIRAGE3C:[2091,107.4,29.6,10],F4E:[2058,160.6,28.3,11.3],F16:[2108,260.4,20.8,13.7],F15C:[2542,235.2,23.1,13.7],FA18C:[1807,178,24.2,14.0],F15E:[2658,275.8,22,14.0],F16B70:[2116,267,20.8,14.3],FA18E:[1729,167.1,24,14.3],MIG21:[2177,191.3,38.5,11.0],MIG29:[2357,275.1,20.8,12.7],SU27:[2396,195.2,23.5,13.7],MIG29UPG:[2261,257.7,23.5,13.3],SU33:[2203,168.5,25.5,13.0],MIG29K:[2203,285.7,23.4,13.7],SU30SM:[2212,170,25.1,14.3],MIG35:[2203,285,22.4,14.3],F104G:[2342,229,35.9,11.0],F4F:[2058,162.9,28.3,11.0],MIG29G:[2357,270.4,20.6,13.0],EF2K1:[2097,252.1,20.8,14.3],EF2K3:[2097,252.1,20.8,14.3],F4EJ:[2255,141.9,28.2,11.0],F4EJK:[2255,141.9,28.2,12.3],F15J:[2533,263.3,22.9,12.7],F15JK:[2524,263.8,23,13.7],F2A:[1922,242.8,19.5,13.7],F4EIL:[2058,160.6,28.3,11.3],KFIR:[2322,184.5,28.4,12.0],F4E2K:[2058,160.6,28.3,12.3],F15BAZ:[2524,285.2,21.6,13.7],F16BARAK:[2058,229.4,23.9,13.7],F16I:[2058,247.5,21.8,13.7],F15I:[2657,276.4,22,14.0],J35F:[2127,149.8,26.7,10.3],JA37:[1924,168.6,26.6,12.0],GRIPEN:[2185,213.6,25.1,13.7],GRIPENE:[2209,214.5,25.6,14.3],LIGHTNING:[2240,124.3,27.8,9.3],PHANTOM2:[2190,176.1,27.8,12.0],TORNADO3:[2256,168,29.4,13.0],TYPHOON:[2097,252.1,20.8,14.7],J7G:[2313,153.4,25.3,11.3],J10C:[2108,252.2,21.2,14.3],J11B:[2388,195.3,25.2,13.7],J15:[2384,200.6,24.9,14.7],J16:[2410,212.9,23.4,14.7],MIRAGEF1:[2177,126.8,28.7,12.0],M2000:[2246,156.3,26.3,14.0],RAFALE:[1855,237.9,21,14.7],F5E:[1753,130.7,27.2,11.0],F14B:[2191,195.9,24.8,13.0],MIG23ML:[2339,196.8,33.9,11.7],MIG25PD:[2942,86.1,31.4,11.0],J8F:[2227,182.4,28.4,13.0]};
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
const PROG_START=['F4E','MIG21','F104G','F4EJ','F4EIL','J35F','LIGHTNING','J7G','MIRAGEF1','F100D','MIG19PT','HUNTER','MIRAGE3C','J29F','G91Y'];
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
/* ---------------- sortie recorder for the debrief ---------------- */
const REC={t:0,acc:0,frames:[],events:[],msl:new Map()}; let mslSeq=0;
function recReset(){REC.t=0;REC.acc=0;REC.frames=[];REC.events=[];REC.msl=new Map();mslSeq=0}
function fmtT(t){t=Math.max(0,t|0);return Math.floor(t/60)+':'+String(t%60).padStart(2,'0')}
function recEvent(text){REC.events.push({t:REC.t,text});feed(text)}
function tgtLabel(t){if(!t)return 'nothing (no lock)';if(t.kind==='sam')return 'a SAM site';if(t===P)return 'you';if(t.kind==='bomber')return 'a bomber';if(t.kind==='transport')return 'the C-130';if(t.team==='blue')return 'your wingman';return 'bandit '+t.id+' ('+(AC_DEFS[t.type]?AC_DEFS[t.type].name:'?')+')'}
function recLaunch(m,who,target){m.rid=++mslSeq;
  REC.msl.set(m.rid,{id:m.rid,t:REC.t,who,name:m.name,target:tgtLabel(target),res:null,why:''});
  recEvent(who+' fired '+m.name+' at '+tgtLabel(target))}
function recMsl(m,res,why){const r=REC.msl.get(m.rid);if(!r||r.res)return;r.res=res;r.why=why;r.tEnd=REC.t;lessonMissile(r);
  recEvent(r.who+"'s "+r.name+' → '+r.target+': '+(res==='HIT'?'HIT':'MISSED ('+why.toLowerCase()+')'))}
function recTick(dt){
  if(state!=='play'&&state!=='dead')return;
  REC.t+=dt; REC.acc+=dt; if(REC.acc<.25)return; REC.acc=0;
  const f={t:REC.t,p:P.alive?[P.pos.x,P.pos.z]:null,e:[],f:[],m:[]};
  for(const e of enemies)if(e.alive)f.e.push([e.id,e.pos.x,e.pos.z,e.kind]);
  for(const g of ground)if(g.alive)f.e.push([g.id,g.pos.x,g.pos.z,g.kind]);
  for(const x of friends)if(x.alive)f.f.push([x.id,x.pos.x,x.pos.z,x.kind]);
  for(const m of missiles)if(m.on)f.m.push([m.rid,m.m.position.x,m.m.position.z,'blue']);
  for(const m of eMissiles)if(m.on)f.m.push([m.rid,m.m.position.x,m.m.position.z,m.team]);
  REC.frames.push(f); if(REC.frames.length>3600)REC.frames.shift();
}
/* ---------------- online dogfight (room capability) ----------------
   Everything travels in presence (no event topics), so anyone who can open the page can play.
   Each pilot simulates their own jet and missiles. Shooters claim hits; the victim applies them. */
let roomApi=null, userApi=null, dbApi=null;
const capsReady=(async()=>{try{if(!window.claude||!window.claude.use)return;
  [roomApi,userApi,dbApi]=await Promise.all([claude.use('room'),claude.use('user'),claude.use('db')])}catch(e){}})();
const NET={room:null,active:false,code:'arena',me:null,count:1,remotes:new Map(),known:new Set(),seenHits:new Set(),roster:new Map(),names:new Map(),myName:'',
  mode:'TEAMS',teamPref:'A',team:'B',kills:0,deaths:0,
  hitSeq:0,hits:[],pend:new Map(),sendT:0,lastHitBy:null,tracerT:0};
const ghostMsl=new Map();
const ghostPool=makePool(16,mslGeo,new THREE.MeshStandardMaterial({color:0xcfc6b8,flatShading:true}));
try{NET.mode=localStorage.getItem('vsNetMode')||'TEAMS';NET.teamPref=localStorage.getItem('vsTeam')||'A'}catch(e){}
const TEAMN={B:'Blue',R:'Red'};
// auto team: join whichever side has fewer pilots
function pickTeam(){if(NET.teamPref!=='A')return NET.teamPref;let b=0,r=0;for(const [pe,x] of NET.roster)if(pe!==NET.me&&x.md==='TEAMS'){if(x.tm==='B')b++;else if(x.tm==='R')r++}return b<=r?'B':'R'}
const isMate=pr=>NET.mode==='TEAMS'&&pr.md==='TEAMS'&&pr.tm===NET.team;
function myPresence(extra){return Object.assign({ac:AC.id,md:NET.mode,tm:NET.mode==='TEAMS'?NET.team:null,sk:NET.kills,sd:NET.deaths,a:0},extra||{})}
// lobby: join the room from the menu so you can see who's there before launching
async function netLobby(){
  if(mission!=='ONLINE'||state!=='menu'&&state!=='over')return; await capsReady; if(!roomApi){$('lobNote').textContent='Online play only works inside the Claude app.';renderRoster();return}
  const code=roomName(); try{
    if(NET.room&&NET.room.name!=='vs-'+code){await NET.room.leave().catch(()=>{});NET.room=null;NET.roster.clear()}
    if(!NET.room){NET.room=await roomApi.join('vs-'+code);NET.room.onPeers(netPeers,()=>{NET.room=null})}
    NET.team=pickTeam(); await NET.room.presence(myPresence()); netPeers({peers:NET.room.peers(),joined:[],left:[],updated:[]})}catch(e){$('lobNote').textContent='Could not join the room.'}}
function rosterRows(){const rows=[];for(const [peer,x] of NET.roster){rows.push({peer,me:peer===NET.me,name:peer===NET.me?(NET.myName||'You')+' (you)':(NET.names.get(x.by)||'Pilot'),ac:x.ac,tm:x.md==='TEAMS'?x.tm:null,k:x.sk||0,d:x.sd||0,st:x.a?'flying':'lobby'})}
  rows.sort((a,b)=>(a.tm||'Z').localeCompare(b.tm||'Z')||b.k-a.k);return rows}
function sbHtml(){const rows=rosterRows();let tb=0,tr=0;for(const r of rows){if(r.tm==='B')tb+=r.k;if(r.tm==='R')tr+=r.k}
  const esc=t=>String(t).replace(/[&<>"]/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;'})[c]);
  let h='<tr><th>Pilot</th><th>Jet</th><th>Team</th><th>K</th><th>D</th><th></th></tr>';
  for(const r of rows)h+=`<tr class="${r.me?'me':''}"><td>${esc(r.name)}</td><td>${esc(AC_DEFS[r.ac]?AC_DEFS[r.ac].name:'—')}</td><td class="${r.tm==='B'?'tB':r.tm==='R'?'tR':''}">${r.tm?TEAMN[r.tm]:'FFA'}</td><td>${r.k}</td><td>${r.d}</td><td>${r.st}</td></tr>`;
  if(rows.some(r=>r.tm))h+=`<tr><td colspan="6"><span class="tB">Blue ${tb}</span> · <span class="tR">Red ${tr}</span></td></tr>`;
  return h}
function renderRoster(){const h=sbHtml();$('lobTbl').innerHTML=h;if(!$('sbBox').hidden)$('sbTbl').innerHTML=h;$('lobRoom').textContent=NET.code||roomName()}
function jettTanks(){if(!(AC.tanks>0)||P.tanksGone||state!=='play')return;P.tanksGone=true;
  const drop=(AC.tanks*AC.tankFuel/AC.tanks)||0, left=Math.max(0,P.fuel-AC.intFuel); P.fuel=Math.min(P.fuel,AC.intFuel); P.jettKg=(AC.tanks*(JET_HP[AC.id].tankKg*.14))+0*left;
  playerJet.traverse(o=>{if(/^tk_/.test(o.name)){o.visible=false;const w=new V3();o.getWorldPosition(w);puff(w.x,w.y,w.z,0,-10,0,.6,.6,.6,.4,3,4,.6)}});
  setGear(P.gear);message('TANKS JETTISONED',1.2);$('cJett').hidden=true}
$('cJett').addEventListener('pointerdown',e=>{e.preventDefault();jettTanks()});
$('bSortie').addEventListener('click',()=>{const k=Object.keys(CAMP_SORTIES);campSortie=k[(k.indexOf(campSortie)+1)%k.length];try{localStorage.setItem('vsCampSortie',campSortie)}catch(e){};renderCamp()});
$('bCampReset').addEventListener('click',()=>{if(!$('bCampReset').dataset.sure){$('bCampReset').dataset.sure='1';$('bCampReset').textContent='Tap again to reset';setTimeout(()=>{delete $('bCampReset').dataset.sure;$('bCampReset').textContent='New campaign'},2500);return}camp=campNew();campSave();renderCamp()});
$('bSb').addEventListener('click',()=>{$('sbBox').hidden=!$('sbBox').hidden;renderRoster()});
$('bNetMode').addEventListener('click',()=>{NET.mode=NET.mode==='TEAMS'?'FFA':'TEAMS';try{localStorage.setItem('vsNetMode',NET.mode)}catch(e){};setMenuLabels();netLobby()});
$('bTeam').addEventListener('click',()=>{NET.teamPref=({A:'B',B:'R',R:'A'})[NET.teamPref];try{localStorage.setItem('vsTeam',NET.teamPref)}catch(e){};setMenuLabels();netLobby()});
function roomName(){const v=(($('roomCode').value||'arena').toLowerCase().replace(/[^a-z0-9_.-]/g,'').slice(0,24))||'arena';$('roomCode').value=v;return v}
function netStop(){NET.active=false;if(NET.room)NET.room.presence({a:0,m:[],h:[]}).catch(()=>{});
  for(const r of NET.remotes.values())if(r.obj)scene.remove(r.obj);NET.remotes.clear();for(const g of ghostMsl.values())kill(g);ghostMsl.clear()}
async function netStart(){
  netStop(); NET.code=roomName(); NET.active=true; NET.hits=[]; NET.pend.clear(); NET.lastHitBy=null;
  // spawn somewhere on a 9 km ring around the arena centre, facing in
  NET.team=pickTeam(); const a=NET.mode==='TEAMS'?(NET.team==='B'?Math.PI:0)+rand(-.5,.5):Math.random()*Math.PI*2; P.pos.set(Math.sin(a)*9000,rand(4500,6500),Math.cos(a)*9000);
  playerJet.lookAt(0,P.pos.y,0); axes(P); P.vel.copy(P.fwd).multiplyScalar(240); qPrev.copy(playerJet.quaternion); camSnap=true;
  await capsReady;
  if(!roomApi){message('ONLINE ONLY WORKS INSIDE THE CLAUDE APP · FLYING SOLO',3.5);return}
  try{
    if(NET.room&&NET.room.name!=='vs-'+NET.code){await NET.room.leave().catch(()=>{});NET.room=null}
    if(!NET.room){NET.room=await roomApi.join('vs-'+NET.code);NET.room.onPeers(netPeers,()=>{NET.room=null})}
    netPeers({peers:NET.room.peers(),joined:NET.room.peers(),left:[],updated:[]});
    message('ONLINE · ROOM '+NET.code.toUpperCase()+(NET.mode==='TEAMS'?' · TEAM '+TEAMN[NET.team].toUpperCase():' · FREE FOR ALL'),3); $('bSb').hidden=false;
  }catch(e){NET.room=null;message('COULD NOT JOIN THE ROOM · FLYING SOLO',2.5)}
}
function netPeers(ch){
  let n=0;
  NET.roster.clear();
  for(const p of ch.peers){if(p.sameTab)NET.me=p.peer; if(p.presence&&p.presence.ac&&p.presence.a)n++;
    if(p.presence&&p.presence.ac){NET.roster.set(p.peer,Object.assign({by:p.by},p.presence));
      if(p.by&&!NET.names.has(p.by)&&userApi){NET.names.set(p.by,'');userApi.profiles([p.by]).then(ps=>{const nm=(ps[p.by]&&ps[p.by].name)||'Pilot';NET.names.set(p.by,nm);if(p.sameTab)NET.myName=nm;renderRoster()}).catch(()=>{})}}}
  renderRoster();
  NET.count=Math.max(1,n);
  for(const p of ch.left)netRemove(p.peer,false);
  for(const p of [...ch.joined,...ch.updated])if(!p.sameTab)netRemote(p);
}
function netRemove(peer,boom){const r=NET.remotes.get(peer);if(r){if(r.alive&&boom)explode(r.pos,true);r.alive=false;scene.remove(r.obj);NET.remotes.delete(peer);friends=friends.filter(f=>f!==r)}
  for(const [k,g] of ghostMsl)if(k.startsWith(peer+':')){kill(g);ghostMsl.delete(k)}}
function netRemote(p){
  const pr=p.presence||{};
  const first=!NET.known.has(p.peer); NET.known.add(p.peer);
  if(first)for(const h of (pr.h||[]))NET.seenHits.add(p.peer+':'+h[0]);   // old claims from before we arrived
  if(!NET.active||!(state==='play'||state==='dead'||state==='paused'))return;
  let r=NET.remotes.get(p.peer);
  if(!pr.ac||!AC_DEFS[pr.ac]||!pr.a){
    if(r&&r.alive){if(pr.k===NET.me&&!r.mate){kills++;NET.kills++;score+=300;message('SPLASH · '+(r.name||'PILOT').toUpperCase(),1.8);recEvent('You shot down '+(r.name||'another pilot')+' ('+AC_DEFS[r.type].name+')')}
      else recEvent((r.name||'A pilot')+' went down');netRemove(p.peer,true)}
    return;
  }
  const mate=isMate(pr);
  if(!r||r.type!==pr.ac||!!r.mate!==mate){
    if(r)netRemove(p.peer,false);
    const obj=tmpl(mate?'blue':'red',pr.ac).clone(); scene.add(obj);
    r=Object.assign(newJet(obj,9,AC_DEFS[pr.ac]),{team:mate?'blue':'red',mate,type:pr.ac,kind:'fighter',remote:true,peer:p.peer,hp:100,alive:true,id:nextId(),
      tgt:null,lockT:0,flareCd:0,chaffCd:0,cmDrop:null,fl:pr.fl||0,ch:pr.ch||0,name:'',netP:new V3(),netV:new V3(),netQ:new THREE.Quaternion(),netT:0,mode:''});
    r.pos.fromArray(pr.p||[0,5000,0]);
    NET.remotes.set(p.peer,r); (mate?friends:enemies).push(r);
    if(userApi&&p.by)userApi.profiles([p.by]).then(ps=>{r.name=(ps[p.by]&&ps[p.by].name)||''}).catch(()=>{});
    recEvent((p.by?'A pilot':'A pilot')+' joined in a '+AC_DEFS[pr.ac].name);
  }
  r.netP.fromArray(pr.p||[0,0,0]); r.netV.fromArray(pr.v||[0,0,0]); if(pr.q)r.netQ.fromArray(pr.q); r.netT=performance.now();
  r.n=pr.n||1; r.gun=!!pr.g; r.lockMe=!!NET.me&&pr.l===NET.me; r.tgt=r.lockMe?P:null; r.lockT=r.lockMe?1:0; r.ecmOn=!!pr.e;
  if((pr.fl||0)>r.fl){r.cmDrop={t:clock,type:'flare'};aiDispense(r,'flare')} if((pr.ch||0)>r.ch){r.cmDrop={t:clock,type:'chaff'};aiDispense(r,'chaff')}
  r.fl=pr.fl||0; r.ch=pr.ch||0;
  // hits other pilots claim on me
  for(const h of (pr.h||[])){const key=p.peer+':'+h[0]; if(NET.seenHits.has(key))continue; NET.seenHits.add(key);
    if(h[1]===NET.me&&state==='play'&&P.alive&&!(r&&r.mate)){const dmg=clamp(+h[2]||0,0,120);P.hp-=dmg;   // claims are client-reported, so bound what one claim can do
    hurtT=dmg>40?.8:.35;shake=dmg>40?1.2:.4;sndHit();buzz(dmg>40?[120,60,200]:40);
      NET.lastHitBy=p.peer; if(dmg>40){message('MISSILE HIT',1.2);damageSystem(2)}else if(Math.random()<.1)damageSystem(1);
      if(P.hp<=0)die(dmg>40?'missile':'shot')}}
  // their missiles in flight
  const live=new Set();
  for(const mm of (pr.m||[])){const key=p.peer+':'+mm[0]; live.add(key); let g=ghostMsl.get(key);
    if(!g){g=take(ghostPool);g.on=true;g.m.visible=true;g.mawsWarned=false;g.mawSeen=-99;ghostMsl.set(key,g);
      if(mm[8]===NET.me&&mm[1]==='120'){message('MISSILE LAUNCH',1.6);buzz([60,50,60])}}
    g.type=mm[1]; g.m.position.set(mm[2],mm[3],mm[4]); g.vel.set(mm[5],mm[6],mm[7]); g.tgt=mm[8]; g.burn=!!mm[9]; g.t0=performance.now();}
  for(const [k,g] of ghostMsl)if(k.startsWith(p.peer+':')&&!live.has(k)){explode(g.m.position,false);kill(g);ghostMsl.delete(k)}
}
function netClaimHit(t,dmg,how){NET.pend.set(t.peer,(NET.pend.get(t.peer)||0)+dmg); if(how!=='GUNS')message('HIT · '+(t.name||'PILOT').toUpperCase(),1)}
function updateNet(dt){
  if(!NET.active)return;
  const now=performance.now();
  for(const r of NET.remotes.values()){ if(!r.alive)continue;
    const age=Math.min(.6,(now-r.netT)/1000); _s1.copy(r.netP).addScaledVector(r.netV,age);
    if(r.pos.distanceTo(_s1)>400)r.pos.copy(_s1); else r.pos.lerp(_s1,1-Math.exp(-dt*10));
    r.vel.copy(r.netV); r.obj.quaternion.slerp(r.netQ,1-Math.exp(-dt*10)); axes(r);
    const at=atm(r.pos.y),v=r.vel.length(); r.mach=v/at.a; r.kcas=v*Math.sqrt(at.sig)*1.944;
    if(r.gun&&clock-NET.tracerT>.07){NET.tracerT=clock;const b=take(eBullets);b.on=true;b.life=1.2;b.m.visible=true;b.team='ghost';
      b.m.position.copy(r.pos).addScaledVector(r.fwd,9);b.vel.copy(r.vel).addScaledVector(r.fwd,AC_DEFS[r.type].muzzle);b.m.quaternion.setFromUnitVectors(ZF,r.fwd)}}
  for(const g of ghostMsl.values()){const p=g.m.position;p.addScaledVector(g.vel,dt);g.m.quaternion.setFromUnitVectors(ZF,_s2.copy(g.vel).normalize());
    if(g.burn)puff(p.x,p.y,p.z,rand(-3,3),rand(-3,3),rand(-3,3),.85,.85,.87,.55,3,9,1.6)}
  // my state out ~12 times a second
  NET.sendT-=dt; if(NET.sendT>0||!NET.room)return; NET.sendT=1/12;
  for(const [peer,d] of NET.pend){NET.hits.push([++NET.hitSeq,peer,Math.round(d)])} NET.pend.clear(); if(NET.hits.length>10)NET.hits=NET.hits.slice(-10);
  const r1=x=>Math.round(x*10)/10, q=playerJet.quaternion;
  const msl=[]; for(const m of missiles)if(m.on&&msl.length<8){const pp=m.m.position;
    msl.push([m.rid,m.type,r1(pp.x),r1(pp.y),r1(pp.z),r1(m.vel.x),r1(m.vel.y),r1(m.vel.z),m.target&&m.target.remote?m.target.peer:null,m.t<SPEC[m.type].burn?1:0])}
  const alive=state==='play'&&P.alive;
  NET.room.presence({ac:AC.id,md:NET.mode,tm:NET.mode==='TEAMS'?NET.team:null,sk:NET.kills,sd:NET.deaths,a:alive?1:0,p:[r1(P.pos.x),r1(P.pos.y),r1(P.pos.z)],q:[+q.x.toFixed(4),+q.y.toFixed(4),+q.z.toFixed(4),+q.w.toFixed(4)],
    v:[r1(P.vel.x),r1(P.vel.y),r1(P.vel.z)],n:+P.n.toFixed(1),g:alive&&gunHeld&&P.rounds>0?1:0,
    l:R.stt&&R.stt.remote&&R.sttSrc==='RDR'?R.stt.peer:null,e:CM.ecm?1:0,fl:CM.flDisp||0,ch:CM.chDisp||0,m:msl,h:NET.hits,k:alive?null:NET.lastHitBy}).catch(()=>{});
}
$('roomCode').addEventListener('keydown',e=>e.stopPropagation());

/* ---------------- 3-D replay: the last ~25 s is recorded at 10 Hz; replays the last kill or your death from several cameras ---------------- */
const REC3={buf:[],booms:[],acc:0,lastKill:null,deathT:null};
function rec3Reset(){REC3.buf.length=0;REC3.booms.length=0;REC3.lastKill=null;REC3.deathT=null;REC3.acc=0}
function rec3(dt){
  if(state!=='play'&&state!=='dead')return; REC3.acc+=dt; if(REC3.acc<.1)return; REC3.acc=0;
  const f={t:clock,j:[],m:[]}, J=(id,type,team,obj,ab)=>f.j.push({id,type,team,p:obj.position.toArray(),q:obj.quaternion.toArray(),ab});
  if(P.alive)J('P',AC.id,'blue',playerJet,throttle>.81);
  for(const e of enemies)if(e.alive&&!e.remote)J(e.id,e.kind==='bomber'?'BOMBER':e.type,'red',e.obj,true);
  for(const e of friends)if(e.alive)J(e.id,e.kind==='transport'?'TRANSPORT':e.type,'blue',e.obj,false);
  for(const m of missiles)if(m.on)f.m.push(m.m.position.toArray().concat(m.m.quaternion.toArray()));
  for(const m of eMissiles)if(m.on)f.m.push(m.m.position.toArray().concat(m.m.quaternion.toArray()));
  REC3.buf.push(f); while(REC3.buf.length&&clock-REC3.buf[0].t>26)REC3.buf.shift();
  while(REC3.booms.length&&clock-REC3.booms[0].t>26)REC3.booms.shift()}
let REP=null; const rpMsl=[];
for(let i=0;i<24;i++){const m=new THREE.Mesh(mslGeo,new THREE.MeshStandardMaterial({color:0xeeeeea,flatShading:true}));m.visible=false;m.frustumCulled=false;scene.add(m);rpMsl.push(m)}
const RP_CAMS=['CHASE','ORBIT','MISSILE','FLYBY'];
function canReplay(kill){if(REC3.buf.length<10)return false;if(kill)return !!REC3.lastKill&&REC3.lastKill.t>REC3.buf[0].t+1;return true}
function startReplay(kill){
  if(!canReplay(kill))return;
  const b=REC3.buf, endT=b[b.length-1].t; let from,to,focus,keyT;
  if(kill){keyT=REC3.lastKill.t;from=Math.max(b[0].t,keyT-8);to=Math.min(endT,keyT+3);focus=REC3.lastKill.id}
  else{keyT=REC3.deathT??endT;from=Math.max(b[0].t,keyT-10);to=endT;focus='P'}
  REP={t:from,from,to,keyT,focus,prev:state,view,cam:0,camT:0,manual:false,actors:new Map(),bi:0,boomI:REC3.booms.findIndex(x=>x.t>=from),saved:P.pos.clone(),fly:new V3(),flySet:false,lastFocus:new V3()};
  if(REP.boomI<0)REP.boomI=REC3.booms.length;
  {const f0=b.find(x=>x.t>=from&&x.j.some(j=>j.id===focus)); if(f0){REP.t=Math.max(from,f0.t);REP.lastFocus.fromArray(f0.j.find(j=>j.id===focus).p)} else REP.lastFocus.copy(P.pos)}
  state='replay'; view=0; showOverlay(null); $('ctrls').hidden=true; $('rpBar').hidden=false; resetStick();
  for(const e of enemies)e.obj.visible=false; for(const e of friends)e.obj.visible=false;
  [...missiles,...eMissiles].forEach(m=>m.m.visible=false); camSnap=true; projKey='';
  $('rpLbl').textContent=kill?'KILL REPLAY':'REPLAY'}
function stopReplay(){
  if(!REP)return; for(const a of REP.actors.values())scene.remove(a); rpMsl.forEach(m=>m.visible=false);
  for(const e of enemies)if(e.alive)e.obj.visible=true; for(const e of friends)if(e.alive)e.obj.visible=true;
  [...missiles,...eMissiles].forEach(m=>m.m.visible=m.on);
  P.pos.copy(REP.saved); state=REP.prev; view=REP.view; projKey=''; camSnap=true; $('rpBar').hidden=true;
  showOverlay(state==='paused'?'pause':'over'); REP=null}
$('rpExit').addEventListener('click',stopReplay);
$('bPhoto').addEventListener('click',photoStart); $('phExit').addEventListener('click',photoStop); $('phSnap').addEventListener('click',()=>{photoGrab=true}); $('phClose').addEventListener('click',()=>$('photoShot').hidden=true);
glCanvas.addEventListener('pointerdown',e=>{if(!PHOTO.on)return;PHOTO.drag={x:e.clientX,y:e.clientY,yaw:PHOTO.yaw,p:PHOTO.pitch};glCanvas.setPointerCapture(e.pointerId)});
glCanvas.addEventListener('pointermove',e=>{if(!PHOTO.on||!PHOTO.drag)return;PHOTO.yaw=PHOTO.drag.yaw-(e.clientX-PHOTO.drag.x)*.008;PHOTO.pitch=clamp(PHOTO.drag.p+(e.clientY-PHOTO.drag.y)*.006,-.3,1.4)});
glCanvas.addEventListener('pointerup',()=>{PHOTO.drag=null});
glCanvas.addEventListener('wheel',e=>{if(!PHOTO.on)return;e.preventDefault();PHOTO.dist=clamp(PHOTO.dist*(e.deltaY>0?1.1:.9),12,400)},{passive:false});
{let pd=0;glCanvas.addEventListener('touchmove',e=>{if(!PHOTO.on||e.touches.length<2)return;const d=Math.hypot(e.touches[0].clientX-e.touches[1].clientX,e.touches[0].clientY-e.touches[1].clientY);if(pd)PHOTO.dist=clamp(PHOTO.dist*pd/d,12,400);pd=d},{passive:true});glCanvas.addEventListener('touchend',()=>{pd=0})}
$('rpCam').addEventListener('click',()=>{if(!REP)return;REP.manual=true;REP.cam=(REP.cam+1)%RP_CAMS.length;REP.camT=0;REP.flySet=false});
$('bReplay').addEventListener('click',()=>startReplay(state==='paused'));
function rpActor(j){let a=REP.actors.get(j.id);if(!a){a=tmpl(j.team==='red'?'red':'blue',j.type).clone();scene.add(a);REP.actors.set(j.id,a)}return a}
const _rq1=new THREE.Quaternion(),_rq2=new THREE.Quaternion();
function updateReplay(dt){
  if(!REP)return;
  const slow=Math.abs(REP.t-REP.keyT)<1.4?.35:1; REP.t+=dt*slow; if(REP.t>=REP.to){stopReplay();return}
  const b=REC3.buf; while(REP.bi<b.length-2&&b[REP.bi+1].t<=REP.t)REP.bi++;
  const A=b[REP.bi],B=b[Math.min(REP.bi+1,b.length-1)], u=B.t>A.t?clamp((REP.t-A.t)/(B.t-A.t),0,1):0;
  const seen=new Set(); let focusObj=null;
  for(const ja of A.j){const jb=B.j.find(x=>x.id===ja.id)||ja, a=rpActor(ja); seen.add(ja.id); a.visible=true;
    a.position.fromArray(ja.p).lerp(_a.fromArray(jb.p),u); a.quaternion.slerpQuaternions(_rq1.fromArray(ja.q),_rq2.fromArray(jb.q),u);
    setAB(a,!!ja.ab); if(ja.id===REP.focus)focusObj=a}
  for(const [id,a] of REP.actors)if(!seen.has(id))a.visible=false;
  rpMsl.forEach(m=>m.visible=false);
  A.m.forEach((ma,i)=>{const m=rpMsl[i];if(!m)return;const mb=B.m.length===A.m.length?B.m[i]:ma;m.visible=true;
    m.position.set(ma[0],ma[1],ma[2]).lerp(_a.set(mb[0],mb[1],mb[2]),u);m.quaternion.slerpQuaternions(_rq1.fromArray(ma,3),_rq2.fromArray(mb,3),u);
    if(Math.random()<.8)puff(m.position.x,m.position.y,m.position.z,rand(-2,2),rand(-2,2),rand(-2,2),.88,.88,.9,.5,3,9,1.4)});
  while(REP.boomI<REC3.booms.length&&REC3.booms[REP.boomI].t<=REP.t){const x=REC3.booms[REP.boomI++];explode(_a.fromArray(x.p).clone(),x.big,true)}
  if(focusObj)REP.lastFocus.copy(focusObj.position);
  const fp=REP.lastFocus; P.pos.copy(fp);   // terrain, water and clouds follow the action
  // cameras
  REP.camT+=dt; if(!REP.manual&&REP.camT>3.4){REP.cam=(REP.cam+1)%RP_CAMS.length;REP.camT=0;REP.flySet=false}
  let mode=RP_CAMS[REP.cam];
  let near=null,nd=7000; if(mode==='MISSILE')for(const m of rpMsl)if(m.visible){const d=m.position.distanceTo(fp);if(d<nd){nd=d;near=m}}
  if(mode==='MISSILE'&&!near)mode='ORBIT';
  camera.up.set(0,1,0);
  if(mode==='CHASE'&&focusObj){_b.set(0,0,1).applyQuaternion(focusObj.quaternion);_c.set(0,1,0).applyQuaternion(focusObj.quaternion);
    camera.position.copy(fp).addScaledVector(_b,-38).addScaledVector(_c,9);camera.up.copy(_c);camera.lookAt(_d.copy(fp).addScaledVector(_b,30))}
  else if(mode==='ORBIT'){const a=REP.t*.45;camera.position.set(fp.x+Math.sin(a)*70,fp.y+18,fp.z+Math.cos(a)*70);camera.lookAt(fp)}
  else if(mode==='MISSILE'){_b.set(0,0,1).applyQuaternion(near.quaternion);camera.position.copy(near.position).addScaledVector(_b,-14).add(_c.set(0,2.5,0));camera.lookAt(fp)}
  else {if(!REP.flySet){REP.flySet=true;_b.set(0,0,1).applyQuaternion(focusObj?focusObj.quaternion:camera.quaternion);REP.fly.copy(fp).addScaledVector(_b,180).add(_c.set(rand(-40,40),rand(5,25),rand(-40,40)))}
    camera.position.copy(REP.fly);camera.lookAt(fp)}
  {const gh=Math.max(groundH(camera.position.x,camera.position.z),0)+4;if(camera.position.y<gh)camera.position.y=gh}
  playerJet.visible=false; jetShadow.visible=false;
  $('rpLbl').textContent=(REP.prev==='paused'?'KILL REPLAY':'REPLAY')+' · '+mode+(slow<1?' · SLOW-MO':'')}

/* ---------------- career: pilot record saved per person ---------------- */
const RANKS=[[0,'2nd Lt'],[1500,'1st Lt'],[4000,'Captain'],[8000,'Major'],[15000,'Lt Col'],[25000,'Colonel']];
const UNLOCK={F16:0,GRIPEN:0,MIG29:0,SU27:1,MIG29UPG:1,F15C:1,J10C:2,F16B70:2,RAFALE:3,GRIPENE:3,TYPHOON:4,MIG35:4,F15EX:5,SU35:5,J20:5,FA18E:2,MIG29K:2,SU33:3};
const DIFF_XP={ROOKIE:.5,REGULAR:1,VETERAN:1.5,ACE:2};
let career={xp:0,sorties:0,kills:0,deaths:0,wins:0}, careerOn=false, careerDoc=null, lastAward=null;
try{careerOn=localStorage.getItem('viperMode')==='career';const c=JSON.parse(localStorage.getItem('viperCareer')||'null');if(c&&typeof c.xp==='number')career=Object.assign(career,c)}catch(e){}
const rankIdx=xp=>{let i=0;RANKS.forEach((r,j)=>{if(xp>=r[0])i=j});return i};
const unlocked=id=>!careerOn||progOwned(id);
progMigrate();
(async()=>{await capsReady; try{if(!dbApi||!userApi)return; const id=await userApi.id(); if(!id)return;
  careerDoc=dbApi.doc('data/users/'+id+'/career'); const snap=await careerDoc.get();
  if(snap.exists){const d=snap.data(); if(d&&typeof d.xp==='number'&&d.xp>=career.xp){career=Object.assign({},career,d);syncCareerUI()}}}catch(e){careerDoc=null}})();
function saveCareer(){try{localStorage.setItem('viperCareer',JSON.stringify(career))}catch(e){}
  if(careerDoc)careerDoc.set({...career}).catch(()=>{careerDoc=null})}
function syncCareerUI(){
  $('bMode').textContent='Mode: '+(careerOn?'Career':'Free play');
  const pc=$('pilotCard'); pc.hidden=!careerOn; if(!careerOn)return;
  const ri=rankIdx(career.xp), nx=RANKS[ri+1], nextJet=Object.keys(UNLOCK).find(k=>UNLOCK[k]===ri+1);
  pc.innerHTML='';const b=document.createElement('b');b.textContent=RANKS[ri][1];pc.appendChild(b);
  pc.appendChild(document.createTextNode(` · ${career.xp.toLocaleString()} XP · ${career.kills} kill${career.kills===1?'':'s'} · ${career.wins} mission${career.wins===1?'':'s'} won · ${career.sorties} sortie${career.sorties===1?'':'s'}`+
    ` · ${prog.sl.toLocaleString()} SL · ${prog.frp.toLocaleString()} free RP · Hangar > Tech tree to research and buy`));
  if(!unlocked(AC.id)){AC=AC_DEFS[PROG_START.find(unlocked)||'F4E'];applyAC()}
}
function careerAward(){
  lastAward=null; if(!careerOn||deathCause==='abort'&&missionT<20)return;
  const win=deathCause==='win', before=rankIdx(career.xp);
  const mult=mission==='ONLINE'?1.5:mission==='TRAINING'?.3:DIFF_XP[difficulty];
  const pm=PRESETS[preset].reward, lines=[['Sortie',50],['Kills and score',score],['Mission win',win?1000:0],['Survival',P.alive?250:0],['Rescue',!P.alive&&P.rescued?120:0]].map(l=>[l[0],Math.round(l[1]*mult)]);
  const xp=Math.round((50+score+(win?1000:0)+(P.alive?250:P.rescued?120:0))*mult*pm);   // 50 for flying the sortie; the preset multiplies the lot
  {const d=xp-lines.reduce((a,l)=>a+l[1],0);if(pm===1)lines[1][1]+=d;else if(d)lines.push(['Preset ×'+pm.toFixed(1),d])}   // lines always add up to xp
  career.xp+=xp;career.sorties++;career.kills+=kills;if(!P.alive&&!P.rescued)career.deaths++;if(win)career.wins++;
  const after=rankIdx(career.xp), newJets=Object.keys(UNLOCK).filter(k=>UNLOCK[k]>before&&UNLOCK[k]<=after).map(k=>AC_DEFS[k].name);
  const pg=progAward(xp,win,kills,P.alive||!!P.rescued,!!P.rescued,lines.filter(l=>l[1]));
  const dt=[dailyAdd('k',kills),dailyAdd('m',missionT/60)].filter(Boolean);
  lastAward={xp,promoted:after>before?RANKS[after][1]:null,newJets:[],prog:pg,daily:dt};
  saveCareer(); syncCareerUI();
}
$('bMode').addEventListener('click',()=>{careerOn=!careerOn;try{localStorage.setItem('viperMode',careerOn?'career':'free')}catch(e){};syncCareerUI()});

/* ---------------- hooks filled in by later systems ---------------- */
function buzz(p){try{if(hapticsOn&&navigator.vibrate)navigator.vibrate(p)}catch(e){}}
let hapticsOn=true;
function updateCombat(dt){
  for(const e of enemies) if(e.alive&&!e.remote) updateAI(e,dt);
  updateNet(dt); updateGround(dt); updateWar(dt); updateTanker(dt); updateAG(dt); updateGCI(dt);
  for(const f of friends) if(f.alive&&!f.remote) updateAI(f,dt);
  updateWeapons(dt);
  updateCM(dt);
  updateEnemyMissiles(dt);
  enemies=enemies.filter(e=>e.alive);
  updateMission(dt);
  recTick(dt);
}

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
function drawHUD(){
  const c=hctx; c.clearRect(0,0,W,H); drawNVG(c);
  if(hurtT>0){const g=c.createRadialGradient(W/2,H/2,Math.min(W,H)*.3,W/2,H/2,Math.max(W,H)*.7);g.addColorStop(0,'rgba(255,40,30,0)');g.addColorStop(1,`rgba(255,40,30,${hurtT*1.2})`);c.fillStyle=g;c.fillRect(0,0,W,H)}
  if(state!=='play')return;
  c.lineWidth=1.5;c.strokeStyle=HUD;c.textBaseline='middle';
  const cp=camera.position, vName=VIEWS[view], sight=vName==='CHASE'||vName==='COCKPIT';
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
  txt(c,'HULL',bx-8,by,'right',HUDD,10);
  c.strokeRect(bx,by-5,bw,10);c.fillStyle=P.hp>35?HUD:THREAT;c.fillRect(bx+2,by-3,(bw-4)*Math.max(0,P.hp)/100,6);
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
    if(sy.hyd)w.push('HYD');if(sy.radar)w.push('RDR FAIL');if(sy.leak)w.push('FUEL LEAK')}
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

/* ---------------- loop ---------------- */
let last=performance.now();
// AIM-120D: ~30 % more range than the C-7 (86 nm class), two-way datalink, GPS-aided INS (USAF F-16s carry it; approved for some exports)
function effAC(id){const b0=effAC0(id); let v=ldGet(id);
  if(!ldValid(id,v))v=ldDefault(id);
  if(mission==='STRIKE'&&!Object.values(v.ag).some(n=>n>0)&&STRIKE_LOAD[id])v=ldStrike(id);
  const c=ldCap(id), d=ldDefault(id), H=JET_HP[id]||{tankKg:0};
  const mrKg=MRKG[b0.mrFull]||180, srKg=SRKG[b0.srFull]||95, agList=Object.entries(v.ag).filter(([,n])=>n>0);
  const agKg=agList.reduce((a,[k,n])=>a+AGKG[k]*n+(AGW[k].perSt>1?Math.ceil(n/AGW[k].perSt)*145:0),0), tkFuel=v.tk*H.tankKg;
  const mass=(v.sr-d.sr)*srKg+(v.mr-d.mr)*mrKg+agKg+v.tk*(H.tankKg*.14)+tkFuel*.6;
  const scd=(v.sr-d.sr)*.0006+(v.mr-d.mr)*.0009+agList.reduce((a,[k,n])=>a+Math.ceil(n/(AGW[k].perSt||1))*.0015,0)+v.tk*.0025;
  return modApply(id,Object.assign({},b0,{srN:v.sr,mrN:v.mr,agList,tanks:v.tk,tankFuel:tkFuel,MASS:b0.MASS+mass,scd:Math.max(-.004,scd),fuelCap:b0.fuelCap+tkFuel,
    intFuel:b0.fuelCap,strike:agList.length>0,ld:v}))}
function effAC0(id){const b=AC_DEFS[id];
  if(id.startsWith('F16')&&use120D)return Object.assign({},b,{mrName:'120D',mrFull:'AIM-120D',
    mr:Object.assign({},b.mr,{maxR:56000,cd:3.5e-5,acc:155,dlR:100000,termR:18000}),
    spec:b.spec.replace(/AIM-120C(-7)?/,'AIM-120D')});
  if(id==='SU35'&&suLR)return Object.assign({},b,{mrName:'R37M',mrFull:'R-37M',mrN:4,srN:4,mr:R37M,
    cm:Object.assign({},b.cm,{stations:[['1','R73','r9_0'],['2','R73','r9_2'],['5','R37M','r120_0'],['6','R37M','r120_2'],['7','R37M','r120_3'],['8','R37M','r120_1'],['11','R73','r9_3'],['12','R73','r9_1']]})});
  if(id==='MIG35'&&tvcOn)return Object.assign({},b,{tvc:true,spec:b.spec+'<span><b>Thrust vectoring</b> nozzles</span>'});
  return b}
function syncOptLabels(){
  $('b120D').hidden=!AC.id.startsWith('F16'); $('b120D').textContent='Missiles: '+(use120D?'AIM-120D':AC.id==='F16B70'?'AIM-120C-7':'AIM-120C');
  $('bR37').hidden=AC.id!=='SU35'; $('bR37').textContent='Missiles: '+(suLR?'4× R-37M + 4× R-73':'8× R-77-1 + 4× R-73');

  if(typeof syncStartLbl==='function')syncStartLbl();
  $('bTVC').hidden=AC.id!=='MIG35'; $('bTVC').textContent='Thrust vectoring: '+(tvcOn?'on':'off');
}
function applyAC(){
  AC=effAC(AC.id);
  SPEC['9X']=AC.sr; SPEC['120']=AC.mr; P.ac=AC; P.gLim=AC.gmax;
  EYE.set(...AC.eye);
  while(playerJet.children.length)playerJet.remove(playerJet.children[0]);
  {const nj=buildJet(PLAYER_COLORS,AC.id);applyLivery(nj);playerJet.add(nj.children[0])} pFlame=playerJet.getObjectByName('flame');
  buildOutside(); if(sun.castShadow)playerJet.traverse(o=>{if(o.isMesh&&!(o.material&&o.material.transparent)){o.castShadow=o.receiveShadow=true}});
  $('b9').firstChild.nodeValue=AC.srName; $('b9').setAttribute('aria-label','Fire '+AC.srFull);
  $('b120').firstChild.nodeValue=AC.mrName; $('b120').setAttribute('aria-label','Fire '+AC.mrFull);
  $('cEcm').firstChild.nodeValue=AC.cm.jam||'ECM'; $('cEcm').hidden=!AC.cm.jam; $('kJamRow').hidden=!AC.cm.jam; $('cDcy').hidden=!AC.cm.decoys; $('kDcyRow').hidden=!AC.cm.decoys; $('bLoad').hidden=AC.cm.fixed;
  $('kSr').textContent=AC.srName; $('kMr').textContent=AC.mrName; $('kJam').textContent=AC.cm.jam;
  $('kSrD').textContent=(AC.srDesc?{[AC.id]:AC.srDesc}:{F16:'AIM-9X heat seeker, short range',F16B70:'AIM-9X heat seeker, cued by JHMCS II',GRIPEN:'IRIS-T heat seeker, Mach 3, 60 g',GRIPENE:'IRIS-T heat seeker, Mach 3, 60 g',MIG29:'R-73 heat seeker, ±40° off-boresight with the helmet sight',MIG29UPG:'R-73 heat seeker, cued by the Thales helmet sight',MIG35:'R-73 heat seeker, cued by the NSTsI helmet sight',SU27:'R-73 heat seeker, ±40° off-boresight with the helmet sight',SU35:'R-73 heat seeker, cued by the helmet sight'})[AC.id]+' · F';
  $('kMrD').textContent=AC.mrDesc&&!(AC.id==='F15EX'&&false)?AC.mrDesc+' · R':AC.id==='SU35'?(suLR?'R-37M: Mach 5–6 very long-range missile, datalink then active seeker. Big and less agile; best against non-maneuvering targets · R':'R-77-1 active radar (Fox 3): datalink, active ~20 km out · R'):AC.id==='SU27'?'R-27ER: long-burn semi-active (Fox 1). Datalink midcourse, hold the lock for the last ~14 km, launch under 5 g · R':AC.id==='MIG35'?'R-77-1 active radar (Fox 3), 110 km class: datalink midcourse, active ~20 km out. STT or TWS track · R':AC.id==='MIG29UPG'?'R-77 active radar (Fox 3): datalink midcourse, goes active ~20 km out, fire and forget. STT or TWS track · R':AC.id==='MIG29'?'R-27R: datalink midcourse (lock can drop and re-lock), semi-active terminal (hold lock for the last ~12 km), launch under 5 g · R':(AC.id.startsWith('GRIPEN')?'Meteor ramjet radar missile, long range':AC.id==='F16B70'?'AIM-120C-7 radar missile':'AIM-120C radar missile')+', needs STT lock or TWS track · R';
  $('kCmD').textContent=(AC.cmDesc?{[AC.id]:AC.cmDesc}:{F16:'ALE-47',F16B70:'ALE-47',GRIPEN:'EWS 39 dispensers',GRIPENE:'BOL dispensers',MIG29:'60 cartridges',MIG29UPG:'60 cartridges',MIG35:'64 cartridges',SU27:'96 cartridges',SU35:'96 cartridges'})[AC.id]+': FLR flares vs heat-seekers, CHF chaff vs radar missiles (hold for salvos) · Z / C';
  $('kJamD').textContent=AC.cm.jamName+': slows their lock, spoils radar shots outside burn-through · J';
  $('kAutoD').textContent=AC.cm.maws?'RWR cues chaff, missile approach warner cues flares · U':'RWR-cued chaff against radar missiles. No missile warner: watch for smoke trails · U';
  $('ovSpec').innerHTML=AC.spec; const oc=$('ovCorner'); if(oc)oc.textContent=AC.corner;
  if(state==='menu')$('ovEyebrow').textContent=AC.eyebrow+(squadron?' · '+squadron:'');
  $('bAC').textContent='Aircraft: '+AC.name;
  styleCockpit(); syncSensors(); P.fuel=.75*(AC.intFuel||AC.fuelCap)+(AC.tankFuel||0); resetSystems(); rearm(); resetCM(); resetRadar(); syncOptLabels(); buildGear(); if(typeof renderLd==='function')renderLd();
}
function setMenuLabels(){$('campBox').hidden=mission!=='CAMPAIGN';if(mission==='CAMPAIGN')renderCamp();$('roomRow').hidden=mission!=='ONLINE';const on=mission==='ONLINE';$('bNetMode').hidden=!on;$('bTeam').hidden=!on||NET.mode!=='TEAMS';$('bNetMode').textContent='Online: '+(NET.mode==='TEAMS'?'teams':'free for all');$('bTeam').textContent='Team: '+({A:'auto',B:'blue',R:'red'})[NET.teamPref];$('lobby').hidden=!on||(state!=='menu'&&state!=='over');if(on)setTimeout(netLobby,0);const tr=mission==='TRAINING';$('bLesson').hidden=!tr;$('bLesson').textContent='Lesson: '+LESSONS[lesson];$('bBandit').hidden=mission==='ONLINE'||tr;$('bDiff').hidden=mission==='ONLINE'||tr;$('bDiff').textContent='Difficulty: '+DIFF[difficulty].name;$('bMission').textContent='Mission: '+MISSIONS[mission];$('bBandit').textContent='Bandits: '+BANDITS[banditType]}
$('bMission').addEventListener('click',()=>{const k=Object.keys(MISSIONS);mission=k[(k.indexOf(mission)+1)%k.length];try{localStorage.setItem('viperMission',mission)}catch(e){};setMenuLabels();applyAC()});
const ldApply=v=>{ldSet(AC.id,v);applyAC()};
$('ldAA').addEventListener('click',()=>ldApply(ldDefault(AC.id)));
$('ldST').addEventListener('click',()=>ldApply(ldStrike(AC.id)));
$('ldCL').addEventListener('click',()=>{const v=ldDefault(AC.id);v.mr=0;v.sr=Math.min(2,v.sr);ldApply(v)});
// loadout editor: one row per store type, +/- within the jet's real stations
function renderLd(){
  const id=AC.id, c=ldCap(id), v=JSON.parse(JSON.stringify(ldValid(id,ldGet(id))?ldGet(id):ldDefault(id))), b=effAC0(id), H=JET_HP[id]||{tankKg:0};
  $('ldJet').textContent=AC.name; const rows=$('ldRows'); rows.innerHTML='';
  const free=c.hp+c.extra-ldUsed(v);
  const row=(label,sub,val,canDec,canInc,dec,inc)=>{const r=document.createElement('div');r.className='ldRow';
    r.innerHTML='<span></span><button type="button" aria-label="Fewer">−</button><b></b><button type="button" aria-label="More">+</button>';
    r.children[0].textContent=label;const sm=document.createElement('small');sm.textContent=sub;r.children[0].appendChild(sm);r.children[2].textContent=val;
    r.children[1].disabled=!canDec;r.children[3].disabled=!canInc;r.children[1].onclick=()=>{dec();ldApply(v)};r.children[3].onclick=()=>{inc();ldApply(v)};rows.appendChild(r)};
  row(b.srFull,'short range · '+c.sr+' rails',v.sr,v.sr>0,v.sr<c.sr,()=>v.sr--,()=>v.sr++);
  if(c.hp)row(b.mrFull,'medium/long range · '+c.hp+' stations',v.mr,v.mr>0,v.mr<c.hp&&free>0,()=>v.mr--,()=>v.mr++);
  for(const k of c.ag){const W=AGW[k],n=v.ag[k]||0,per=W.perSt||1;
    row(W.name,(W.kind==='arm'?'anti-radiation':W.kind==='dumb'?'unguided bomb · CCIP':'guided bomb')+(per>1?' · '+per+' per rack':''),n,n>0,(n%per!==0)||free>0,
      ()=>{v.ag[k]=n-1;if(!v.ag[k])delete v.ag[k]},()=>{v.ag[k]=n+1})}
  if(c.tanks)row('Drop tanks','+'+(H.tankKg/1000).toFixed(1)+' t fuel each · drag · JETT button',v.tk,v.tk>0,v.tk<c.tanks&&free>0,()=>v.tk--,()=>v.tk++);
  const e=effAC(id), m=e.MASS+.75*e.intFuel+e.tankFuel-.6*e.fuelCap+.6*e.fuelCap*0, tw=(e.T_AB/(m*G));
  $('ldSum').textContent=`Stations ${ldUsed(v)}/${c.hp+c.extra} · take-off weight ${(m/1000).toFixed(1)} t · thrust/weight ${tw.toFixed(2)} · fuel ${((.75*e.intFuel+e.tankFuel)/1000).toFixed(1)} t`+` · RCS ≈ ${((RCS[id]??3)+storesRCS(e)).toFixed(2)} m² (est.)`+(c.ag.length?'':' · no air-to-ground stores cleared');
  $('bRole').textContent='Loadout: '+[v.sr+'× '+b.srFull,c.hp?v.mr+'× '+b.mrFull:null,...Object.entries(v.ag).filter(([,n])=>n).map(([k,n])=>n+'× '+AGW[k].sh),v.tk?v.tk+' tank'+(v.tk>1?'s':''):null].filter(Boolean).join(', ')+' ▸'}
$('bBandit').addEventListener('click',()=>{const k=Object.keys(BANDITS);banditType=k[(k.indexOf(banditType)+1)%k.length];try{localStorage.setItem('viperBandit',banditType)}catch(e){};setMenuLabels()});
$('cWing').addEventListener('click',wingCmd);
$('cGci').addEventListener('click',()=>{audioInit();radio(gciName()+', '+myCall()+', bogey dope.','wing');setTimeout(gciBogeyDope,1200)});
$('bLesson').addEventListener('click',()=>{const k=Object.keys(LESSONS);lesson=k[(k.indexOf(lesson)+1)%k.length];try{localStorage.setItem('vsLesson',lesson)}catch(e){};setMenuLabels()});
$('bDiff').addEventListener('click',()=>{const k=Object.keys(DIFF);difficulty=k[(k.indexOf(difficulty)+1)%k.length];try{localStorage.setItem('viperDiff',difficulty)}catch(e){};setMenuLabels()});
// tilt to fly: phone motion sensors. Blocked inside the Claude app viewer; works when the HTML file is opened in a phone browser.
const tilt={on:false,got:false,cal:null,x:0,y:0,raw:{r:0,p:0}};
function tiltAxes(e){const a=(screen.orientation&&screen.orientation.angle)??window.orientation??0;
  const b=e.beta||0,g=e.gamma||0;
  if(a===90)return {r:b,p:g}; if(a===270||a===-90)return {r:-b,p:-g}; return {r:g,p:b}}
function onOrient(e){if(e.beta==null)return;tilt.got=true;const v=tiltAxes(e);tilt.raw=v;
  if(!tilt.cal)tilt.cal={...v};
  const dz=x=>Math.abs(x)<.06?0:x;
  tilt.x=dz(clamp((v.r-tilt.cal.r)/28,-1,1)); tilt.y=dz(clamp((v.p-tilt.cal.p)/22,-1,1))}
function recenterTilt(){if(tilt.on)tilt.cal={...tilt.raw}}
async function setTilt(on){
  if(on){
    try{if(window.DeviceOrientationEvent&&typeof DeviceOrientationEvent.requestPermission==='function'){const r=await DeviceOrientationEvent.requestPermission();if(r!=='granted')throw 0}}
    catch(e){message('MOTION SENSORS NOT ALLOWED HERE',2.4);$('bTilt').textContent='Controls: tilt blocked here';return}
    tilt.on=true;tilt.got=false;tilt.cal=null;addEventListener('deviceorientation',onOrient);
    $('bTilt').textContent='Controls: tilt to fly';
    setTimeout(()=>{if(tilt.on&&!tilt.got){tilt.on=false;removeEventListener('deviceorientation',onOrient);
      $('bTilt').textContent='Controls: tilt blocked here (use the downloaded file)'}},1500);
  } else {tilt.on=false;removeEventListener('deviceorientation',onOrient);$('bTilt').textContent='Controls: touch stick'}
  try{localStorage.setItem('viperTilt',tilt.on?'1':'0')}catch(e){}
}
$('bTilt').addEventListener('click',()=>setTilt(!tilt.on));
try{hapticsOn=localStorage.getItem('viperHaptic')!=='0'}catch(e){}
function setHapticLabel(){$('bHaptic').textContent='Vibration: '+(hapticsOn?(navigator.vibrate?'on':'on (not supported on this phone)'):'off')}
$('bHaptic').addEventListener('click',()=>{hapticsOn=!hapticsOn;setHapticLabel();try{localStorage.setItem('viperHaptic',hapticsOn?'1':'0')}catch(e){};buzz(30)});
setHapticLabel();
$('bQual').addEventListener('click',()=>{const k=Object.keys(QUALS);setQuality(k[(k.indexOf(quality)+1)%k.length])});
$('bQual').textContent='Graphics: '+({LOW:'Low',MED:'Medium',HIGH:'High'})[quality];
setMenuLabels();
$('bAC').addEventListener('click',()=>{const order=FIGHTERS;let i=order.indexOf(AC.id);for(let k=0;k<order.length;k++){i=(i+1)%order.length;if(unlocked(order[i]))break}AC=AC_DEFS[order[i]];try{localStorage.setItem('viperAC',AC.id)}catch(e){};applyAC()});
updateTerrain(0,0); resetPlayer(); applyAC(); syncCareerUI(); applyEnv(); setShadows(quality==='HIGH'); $('bKc').textContent='Kill cam: '+(KC.on?'on':'off');
function frame(now){
  requestAnimationFrame(frame); pollGamepad(Math.min(.05,(now-last)/1000)||.016);
  let dt=Math.min(.05,(now-last)/1000); autoQuality(now-last); last=now;
  if(state==='paused')dt=0;
  const rdt=dt; killCamWatch(rdt); if(KC.t>0)dt*=KC.slow;
  clock+=dt;msgT-=dt;hurtT=Math.max(0,hurtT-dt);shake=Math.max(0,shake-dt);
  if(dt>0){
    // sub-step physics for stability at high g / Mach 4 missiles
    const steps=Math.max(1,Math.ceil(dt/.0167)), h=dt/steps; // keeps every step <= ~16.7 ms whatever the frame rate
    for(let s=0;s<steps;s++){
      if(state!=='paused'&&state!=='replay')updateCarrier(h);
      if(state==='menu'){if(!HG.on&&!HG.bg)updatePlayer(h,true)} else if(state==='play')updatePlayer(h,false);
      if(state!=='menu'&&state!=='replay')updateCombat(h);
    }
    rec3(dt); voiceWatch(); updateEject(dt); syncEjectBtn();
    if(state==='dead'){deadT-=dt;if(deadT<=0){state='over';campaignAfter();careerAward();if(score>best){best=score;try{localStorage.setItem('viperBest',best)}catch(e){}}showOverlay('over')}}
    fxTick++; if(P.alive)jetFX(P,AC.id,true);
    for(const e of enemies)if(e.kind==='fighter')jetFX(e,e.type,false);
    for(const f of friends)if(f.kind==='fighter')jetFX(f,f.type,false);
    if(state==='play'||state==='dead'){dmgFX(P,AC.id,true);for(const e of enemies)dmgFX(e,e.type,false);for(const f of friends)dmgFX(f,f.type,false)}
    updateParticles(dt); updateRings(dt);
    animJet(playerJet.children[0],P,dt,true); if(outside&&VIEWS[view]==='COCKPIT')animJet(outside,P,dt,true); animGear(dt); updateWrecks(dt);
    for(const L of [enemies,friends])for(const j of L)if(j.alive&&j.kind==='fighter'){const d=j.pos.distanceTo(camera.position);lodJet(j.obj,d);if(d<3500)animJet(j.obj,j,dt,false)}
  }
  HAZE_MAT.uniforms.t.value=clock; HAZE_MAT.uniforms.k.value=QUALS[quality].fx?1:0;
  const cx=Math.round(P.pos.x/TSTEP)*TSTEP,cz=Math.round(P.pos.z/TSTEP)*TSTEP;
  if(cx!==tCx||cz!==tCz)updateTerrain(cx,cz);
  water.position.set(P.pos.x,0,P.pos.z);
  for(const cl of clouds){
    const dx=cl.position.x-P.pos.x,dz=cl.position.z-P.pos.z;
    if(Math.abs(dx)>16000||Math.abs(dz)>16000){
      const a=Math.atan2(P.fwd.x,P.fwd.z)+rand(-1,1),d=rand(10000,15000);
      cl.position.set(P.pos.x+Math.sin(a)*d,ovc()?rand(3250,3700):rand(2600,4200),P.pos.z+Math.cos(a)*d)}
  }
  deck.position.x=P.pos.x; deck.position.z=P.pos.z; stars.position.copy(camera.position);
  updateCamera(dt||.016); if(killCamCamera(rdt||.016))playerJet.visible=P.alive; if(state==='replay')updateReplay(dt||.016); if(PHOTO.on)photoCam(); sky.position.copy(camera.position);
  waterMat.uniforms.t.value=now*.001; glare.position.copy(camera.position).addScaledVector(SUN_DIR,26000);
  pMat.uniforms.fogC.value.copy(scene.fog.color); pMat.uniforms.fogN.value=scene.fog.near; pMat.uniforms.fogF.value=scene.fog.far;
  if(boomLight.intensity>0)boomLight.intensity=Math.max(0,boomLight.intensity-(dt||.016)*7*LK);
  updateShadow(); gust=1+.35*Math.sin(clock*.7)*Math.sin(clock*1.9+1); updateRain(dt||.016); updateLightning(dt||.016);
  for(const cl of clouds){if(!cl.visible)continue;const d=cl.position.distanceTo(camera.position),o=clamp((d-380)/900,0,1)*.95;if(cl.userData.op!==o){cl.userData.op=o;for(const m of cl.userData.mats)m.opacity=o}}
  sndEngine(); sndExtra(); sndFlyby(); updateGlints(); updateFlareLight(); shadowFollow();
  const scn=(HG.on||HG.bg)&&hgSaved&&hgScene?hgScene:scene, inCock=VIEWS[view]==='COCKPIT'&&!(KC.t>0)&&(state==='play'||state==='menu'||state==='paused');
  if(inCock)updateCockpit(dt||.016);
  if(!postRender(scn,camera,inCock)){
    renderer.clear(); renderer.render(scn,camera); if(VIEWS[view]!=='COCKPIT'&&!(KC.t>0)&&state!=='replay')heatPass();
    if(inCock){renderer.clearDepth(); renderer.render(cockScene,cockCam)}
  }else if(VIEWS[view]!=='COCKPIT'&&!(KC.t>0)&&state!=='replay')heatPass();
  if(TGP.mode&&!PHOTO.on)renderTGP(); else TGP.rect=null;
  if(photoGrab)photoCapture();
  drawHUD(); drawRadarPanel();
}
requestAnimationFrame(frame);

/* ---------- HUD colour palette (colour-blind safe option: cyan friendly, orange threat, yellow warning) ---------- */
const PALS={green:{n:'green',hud:'#7dff9a',dim:'rgba(125,255,154,.45)',warn:'#ffb347',threat:'#ff5a4e'},
  cb:{n:'blue / orange',hud:'#5cd0ff',dim:'rgba(92,208,255,.45)',warn:'#ffe14d',threat:'#ff8c1a'}};
let palKey='green'; try{const k=localStorage.getItem('viperPal');if(PALS[k])palKey=k}catch(e){}
function applyPal(){const p=PALS[palKey],r=document.documentElement.style;HUD=p.hud;HUDD=p.dim;WARN=p.warn;THREAT=p.threat;
  r.setProperty('--hud',p.hud);r.setProperty('--hud-dim',p.dim);r.setProperty('--warn',p.warn);r.setProperty('--threat',p.threat);$('bPal').textContent='HUD colours: '+p.n}
$('bPal').addEventListener('click',()=>{palKey=palKey==='green'?'cb':'green';try{localStorage.setItem('viperPal',palKey)}catch(e){};applyPal()});
applyPal();

/* ---------- first-run hint: point new pilots at the guided lessons ---------- */
(function(){let seen=false;try{seen=!!localStorage.getItem('vsSeen')}catch(e){}
  const box=$('firstRun');box.hidden=seen||mission==='TRAINING';
  const done=()=>{box.hidden=true;try{localStorage.setItem('vsSeen','1')}catch(e){}};
  $('bFirst').addEventListener('click',()=>{mission='TRAINING';try{localStorage.setItem('viperMission',mission)}catch(e){};done();setMenuLabels();applyAC()});
  $('bStart').addEventListener('click',done);
})();

/* ---------- movable controls: drag buttons to where your thumbs rest (saved per device) ---------- */
const LAY_IDS=['bGun','b9','b120','bAg','bAgN','bLock','bGear','bBrake','bRdr','bCam','bPause','bEject','thr','cm'];
const LAY_SIZES=[.85,1,1.2,1.4];
let lay={s:1,p:{}}; try{const v=JSON.parse(localStorage.getItem('viperLayout')||'null');if(v&&typeof v==='object'){lay.s=LAY_SIZES.includes(v.s)?v.s:1;lay.p=v.p&&typeof v.p==='object'?v.p:{}}}catch(e){}
function layApply(){for(const id of LAY_IDS){const el=$(id);if(!el)continue;const o=lay.p[id];
  el.style.translate=o?`${+o[0]||0}px ${+o[1]||0}px`:'';el.style.scale=lay.s===1?'':String(lay.s)}
  const b=$('laySize');if(b)b.textContent='Size '+Math.round(lay.s*100)+'%'}
function laySave(){try{localStorage.setItem('viperLayout',JSON.stringify(lay))}catch(e){}}
layApply();
let layOn=false,layDrag=null,layHidden=[];
function layEnter(){if(layOn)return;layOn=true;document.body.classList.add('laying');
  layHidden=['bAg','bAgN','bEject','cJett','cTgp','cNvg','cWing'].map($).filter(e=>e&&e.hidden);layHidden.forEach(e=>e.hidden=false);   // show the situational buttons so they can be placed too
  $('ctrls').hidden=false;$('layBar').hidden=false;LAY_IDS.forEach(id=>{const e=$(id);if(e)e.classList.add('lay')})}
function layExit(){if(!layOn)return;layOn=false;layDrag=null;document.body.classList.remove('laying');
  layHidden.forEach(e=>e.hidden=true);layHidden=[];$('ctrls').hidden=true;$('layBar').hidden=true;LAY_IDS.forEach(id=>{const e=$(id);if(e)e.classList.remove('lay','drag')});laySave()}
$('bLayout').addEventListener('click',layEnter);
$('layDone').addEventListener('click',layExit);
$('layReset').addEventListener('click',()=>{lay={s:1,p:{}};layApply()});
$('laySize').addEventListener('click',()=>{lay.s=LAY_SIZES[(LAY_SIZES.indexOf(lay.s)+1)%LAY_SIZES.length];layApply()});
// capture phase: while editing, controls only move; they never fire game actions
$('ctrls').addEventListener('pointerdown',e=>{if(!layOn)return;e.stopPropagation();e.preventDefault();
  const el=LAY_IDS.map($).find(x=>x&&x.contains(e.target));if(!el)return;
  const o=lay.p[el.id]||[0,0];layDrag={el,x:e.clientX,y:e.clientY,ox:+o[0]||0,oy:+o[1]||0,r:el.getBoundingClientRect()};el.classList.add('drag')},true);
for(const t of ['click','touchstart','mousedown'])$('ctrls').addEventListener(t,e=>{if(layOn){e.stopPropagation();if(e.cancelable)e.preventDefault()}},true);
addEventListener('pointermove',e=>{if(!layDrag)return;const d=layDrag,r=d.r;
  let dx=e.clientX-d.x,dy=e.clientY-d.y;                                    // keep the whole control on screen
  dx=clamp(dx,-r.left,innerWidth-r.right);dy=clamp(dy,-r.top,innerHeight-r.bottom);
  lay.p[d.el.id]=[Math.round(d.ox+dx),Math.round(d.oy+dy)];layApply()});
addEventListener('pointerup',()=>{if(layDrag){layDrag.el.classList.remove('drag');layDrag=null;laySave()}});
addEventListener('pointercancel',()=>{if(layDrag){layDrag.el.classList.remove('drag');layDrag=null}});

/* ---------- engagement range setting ---------- */
function syncRange(){$('bRange').textContent='Engagement range: '+ENG_RANGES[rangeKey].n.toLowerCase()+' (~'+Math.round(11.5*engK())+' km merge)'}
$('bRange').addEventListener('click',()=>{const k=Object.keys(ENG_RANGES);rangeKey=k[(k.indexOf(rangeKey)+1)%k.length];try{localStorage.setItem('viperRange',rangeKey)}catch(e){};syncRange()});
syncRange();

/* ---------- HUD text size ---------- */
const TXT_SIZES=[1,1.15,1.3]; let txtK=1; try{const v=+localStorage.getItem('viperText');if(TXT_SIZES.includes(v))txtK=v}catch(e){}
function syncText(){TXTK=txtK;$('bText').textContent='HUD text size: '+Math.round(txtK*100)+'%'}
$('bText').addEventListener('click',()=>{txtK=TXT_SIZES[(TXT_SIZES.indexOf(txtK)+1)%TXT_SIZES.length];try{localStorage.setItem('viperText',txtK)}catch(e){};syncText()});
syncText();

/* ---------- left-handed preset: mirror every control across the screen ---------- */
$('layMirror').addEventListener('click',()=>{for(const id of LAY_IDS){const el=$(id);if(!el)continue;
  const was=el.hidden;if(was)el.hidden=false;const r=el.getBoundingClientRect();if(was)el.hidden=true;if(!r.width)continue;
  const o=lay.p[id]||[0,0],dx=innerWidth-r.right-r.left;lay.p[id]=[Math.round((+o[0]||0)+dx),+o[1]||0]}
  layApply()});

/* ---------- controls guide: labels every button; shown once after the first launch ---------- */
const TIPS=[['bGun','<b>GUN</b> hold to fire'],['b9','<b>9X</b> heat-seeking missile'],['b120','<b>120</b> radar missile'],['bLock','<b>LOCK</b> radar target'],
  ['thr','<b>THROTTLE</b> drag; top = afterburner'],['cm','<b>FLR / CHF</b> decoys vs missiles'],['bGear','<b>GEAR</b> up / down'],['bBrake','<b>BRK</b> speed brake'],
  ['bRdr','<b>RDR</b> radar panel'],['bCam','<b>CAM</b> change view'],['bPause','<b>II</b> pause / menu']];
function tipsShow(){const box=$('tips');box.querySelectorAll('.tip').forEach(e=>e.remove());box.hidden=false;
  const placed=[],W_=innerWidth,H_=innerHeight,hit=(a,b)=>a.l<b.r&&a.r>b.l&&a.t<b.b&&a.b>b.t;
  for(const [id,html] of TIPS){const el=$(id);if(!el||el.hidden)continue;const r=el.getBoundingClientRect();if(!r.width)continue;
    const d=document.createElement('div');d.className='tip';d.innerHTML=html;box.appendChild(d);const w=d.offsetWidth,h=d.offsetHeight,cx=r.left+r.width/2,cy=r.top+r.height/2,g=8;
    // try below, above, left, right of the control; take the first spot that is on screen and clear of other labels and of the controls
    const cands=[];for(const o of [0,34,68,104])cands.push([cx,r.bottom+g+o+h/2],[cx,r.top-g-o-h/2],[r.left-g-o-w/2,cy],[r.right+g+o+w/2,cy]);const ctl=TIPS.map(t=>$(t[0])).filter(e=>e&&!e.hidden).map(e=>e.getBoundingClientRect());
    let best=null,bestScore=1e9;
    for(const [x0,y0] of cands){const x=clamp(x0,w/2+4,W_-w/2-4),y=clamp(y0,h/2+4,H_-h/2-4),box_={l:x-w/2,r:x+w/2,t:y-h/2,b:y+h/2};
      let sc=Math.abs(x-x0)+Math.abs(y-y0)+Math.hypot(x-cx,y-cy)*.05;for(const p of placed)if(hit(box_,p))sc+=1000;for(const c of ctl)if(c!==r&&hit(box_,{l:c.left,r:c.right,t:c.top,b:c.bottom}))sc+=100;
      if(sc<bestScore){bestScore=sc;best={x,y,box_}}}
    d.style.left=best.x+'px';d.style.top=best.y+'px';placed.push(best.box_)}}
function tipsHide(){$('tips').hidden=true;try{localStorage.setItem('vsTips','1')}catch(e){}}
$('tips').addEventListener('pointerdown',e=>{e.stopPropagation();e.preventDefault();tipsHide()});
$('bTips').addEventListener('click',()=>{try{localStorage.removeItem('vsTips')}catch(e){};$('bStart').click()});   // launch, then the guide shows
$('bStart').addEventListener('click',()=>{let seen=false;try{seen=!!localStorage.getItem('vsTips')}catch(e){}
  if(!seen)setTimeout(()=>{if(state==='play'&&$('tips').hidden)tipsShow()},700)});

/* ---------- local leaderboard (per mission, top 10) and share ---------- */
function lbGet(m){try{const a=JSON.parse(localStorage.getItem('vsLb_'+m)||'[]');return Array.isArray(a)?a.filter(x=>x&&+x.s>0):[]}catch(e){return[]}}
function lbAdd(){if(!(score>0)||mission==='ONLINE'||mission==='TRAINING')return -1;
  const e={s:score,k:kills,ac:AC.id,t:Date.now()},a=lbGet(mission);a.push(e);a.sort((x,y)=>y.s-x.s);const keep=a.slice(0,10);
  try{localStorage.setItem('vsLb_'+mission,JSON.stringify(keep))}catch(er){};lbLast=e;return keep.indexOf(e)}
let lbLast=null;
function lbRender(over){const a=lbGet(mission),box=$('lbBox');box.hidden=!a.length||!over;if(box.hidden)return;
  $('lbMode').textContent=MISSIONS[mission];const ol=$('lbList');ol.textContent='';
  a.slice(0,5).forEach(e=>{const li=document.createElement('li');li.textContent=e.s+' pts · '+e.k+' kill'+(e.k===1?'':'s')+' · '+(AC_DEFS[e.ac]?AC_DEFS[e.ac].name:e.ac);if(e===lbLast||(lbLast&&e.t===lbLast.t&&e.s===lbLast.s))li.className='me';ol.appendChild(li)})}
function shareText(){return 'Viper Sortie · '+MISSIONS[mission]+': '+score+' pts, '+kills+' kill'+(kills===1?'':'s')+' in the '+AC.name+(missionText?' ('+missionText+')':'')+'.'}
$('bShare').addEventListener('click',async()=>{const t=shareText();
  try{if(navigator.share){await navigator.share({title:'Viper Sortie',text:t});return}}catch(e){if(e&&e.name==='AbortError')return}
  try{await navigator.clipboard.writeText(t);message('RESULT COPIED',1.6)}catch(e){prompt('Copy your result:',t)}});
const _showOverlay=showOverlay;
showOverlay=function(kind){_showOverlay(kind);const over=kind==='over';$('bShare').hidden=!over||!(score>0);lbRender(over)};
const _careerAward=careerAward;
careerAward=function(){lbAdd();return _careerAward.apply(this,arguments)};

/* ---------- test hook (only with ?test in the URL) ---------- */
if(/[?&]test\b/.test(location.search))window.__vs={setThr,HEAT,explode,puff,camera,LT,townLights,flashLt,P,fly,dlz,flyout,AC_DEFS,feed,WAR,WAR_V,warBuild,warSpawn,warModules,warDie,warFlags,updateWar,warAlive,buildJet,PLAYER_COLORS,M2,V3,atm,clamp,lbAdd,showOverlay:k=>showOverlay(k),setScore:(n,k)=>{score=n;kills=k},get state(){return state},get enemies(){return enemies},missiles:()=>missiles.filter(m=>m.on),setAC:id=>{AC=AC_DEFS[id];applyAC()},wt:{   // weapon-test hooks: a clean sky, one drone, scripted launches
  begin:id=>{AC=AC_DEFS[id];applyAC();startGame();return AC.id},
  clear:()=>{waveClearT=1e9;for(const e of enemies){e.alive=false;scene.remove(e.obj)}enemies.length=0;P.pos.set(0,6000,0);P.vel.set(0,0,250);throttle=.7;return state},
  target:(type,dz,away,speed)=>{const e=spawnFighter('red',type,new V3(0,6000,dz),new V3(0,6000,dz+(away?9999:-9999)),{ir:0,rdr:0,speed:speed||220});e.drone=true;return e.id},
  lock:()=>{if(enemies[0])lockOn(enemies[0])},fire:w=>{if(w==='9X')fire9=true;else fire120=true},gun:on=>{gunHeld=on},
  missiles:()=>missiles.filter(m=>m.on),
  st:()=>{const e=enemies[0];return{can9,can120,aim9:P.aim9,aim120:P.aim120,rounds:P.rounds,alive:!!(e&&e.alive),hp:e?e.hp:0,msl:missiles.filter(m=>m.on).length,stt:!!R.stt,sttAcq:R.acqT,d:e?e.pos.distanceTo(P.pos):0,msg:$('msg')?$('msg').textContent:''}}},M2dims:()=>{const o={};for(const id in M2){const S=M2[id],zs=S.fus.map(f=>f[0]).concat(S.noz.map(n=>n[2]-n[4]/2)),L=Math.max(...zs)-Math.min(...zs),sp=2*Math.max(...S.wings.flatMap(w=>w.st.map(q=>q.x)));const k=M2K[id]||[1,1,1];o[id]=[+(L*k[2]).toFixed(2),+(sp*k[0]).toFixed(2)]}return o},ROSTER_IDS,restart:()=>startGame(),spawnAll:()=>{let n=0;for(const id of FIGHTERS){spawnFighter('red',id,P.pos.clone().add(new V3(rand(-4000,4000),rand(-300,300),rand(8000,14000))),P.pos);n++}return n},tableRows:id=>({gear:!!GEAR_SPEC[id],snd:!!ENG_SND[id],hp:!!JET_HP[id],rcs:RCS[id]!=null,paint:!!PAINT[id]||!!(AC_DEFS[id].model),band:!!BANDITS[id],fighter:FIGHTERS.indexOf(id)>=0}),get preset(){return preset},PRESETS,get daily(){return daily},dailyAdd,endTest:o=>{deathCause=o.cause||'win';score=o.score||0;kills=o.kills||0;missionT=o.t||90;P.alive=o.alive!==false;P.rescued=!!o.rescued;state='over';careerAward();showOverlay('over')},get AC(){return AC}};

/* ---------- hangar: pick the aircraft, edit the loadout, change paint, read every spec; the jet turns on a turntable behind the panel ---------- */
const hgEl=$('hangar');
function hgTab(t){for(const b of hgEl.querySelectorAll('.hgTabs button'))b.classList.toggle('on',b.dataset.tab===t);
  $('hgLoad').hidden=t!=='load';$('hgSpec').hidden=t!=='spec';$('hgPaint').hidden=t!=='paint';$('hgTree').hidden=t!=='tree';$('hgMods').hidden=t!=='mods';if(t==='spec')hgSpecs();if(t==='tree')progRender();if(t==='mods')modsRender();progWallet()}
function hgOpen(t){if(state!=='menu'&&state!=='over')return;
  if(!HG.on){HG.on=true;HG.zoom=1;HG.el=.2;HG.ang=.7;HG.auto=true;document.body.classList.add('hangar');hgEl.hidden=false;projKey='';hgEnter()}
  hgTab(t||'load');$('hgName').textContent=AC.name;renderLd()}
function hgClose(){if(!HG.on)return;if(!HG.bg)hgLeave();HG.on=false;HG.drag=null;document.body.classList.remove('hangar');hgEl.hidden=true;projKey='';camSnap=true}
$('bHangar').addEventListener('click',()=>hgOpen('load'));
$('bRole').addEventListener('click',()=>hgOpen('load'));
$('hgClose').addEventListener('click',hgClose);$('ldDone').addEventListener('click',hgClose);
$('hgLaunch').addEventListener('click',()=>{hgClose();$('bStart').click()});
for(const b of hgEl.querySelectorAll('.hgTabs button'))b.addEventListener('click',()=>hgTab(b.dataset.tab));
const hgView=(ang,el,zoom)=>{HG.ang=ang;HG.el=clamp(el,-1.45,1.45);if(zoom)HG.zoom=zoom;HG.auto=false;HG.tgt.set(0,2.2,HG_JZ)};
const hgPan=(dx,dy)=>{const k=HG.r*HG.zoom*.0018;HG.tgt.addScaledVector(_a.set(1,0,0).applyQuaternion(camera.quaternion),-dx*k).addScaledVector(_b.set(0,1,0).applyQuaternion(camera.quaternion),dy*k)};
function bindOrbit(el){const ptr=new Map();let pinch=0,tap=0;
  el.addEventListener('contextmenu',e=>e.preventDefault());
  el.addEventListener('pointerdown',e=>{ptr.set(e.pointerId,{x:e.clientX,y:e.clientY,px:e.clientX,py:e.clientY,pan:e.button===2||e.button===1||e.shiftKey});try{e.target.setPointerCapture(e.pointerId)}catch(er){}
    HG.drag={x:e.clientX,y:e.clientY,a:HG.ang,l:HG.el};HG.auto=false;
    const now=performance.now();if(now-tap<320){hgView(.7,.2,1);HG.auto=true}tap=now;   // double-tap: reset the view and resume the turntable
    if(ptr.size===2){const [p,q]=[...ptr.values()];pinch=Math.hypot(p.x-q.x,p.y-q.y)}});
  el.addEventListener('pointermove',e=>{const p=ptr.get(e.pointerId);if(!p)return;const dx=e.clientX-p.px,dy=e.clientY-p.py;p.px=p.x=e.clientX;p.py=p.y=e.clientY;
    if(ptr.size>=2){const [a,b]=[...ptr.values()],d=Math.hypot(a.x-b.x,a.y-b.y);if(pinch>0)HG.zoom=clamp(HG.zoom*pinch/d,.2,2.6);pinch=d;hgPan(dx/2,dy/2);HG.drag=null;return}   // two fingers: pinch to zoom, drag to pan
    if(p.pan){hgPan(dx,dy);return}
    if(HG.drag){HG.ang=HG.drag.a-(e.clientX-HG.drag.x)*.01;HG.el=clamp(HG.drag.l+(e.clientY-HG.drag.y)*.01,-1.45,1.45)}});
  for(const t of ['pointerup','pointercancel'])el.addEventListener(t,e=>{ptr.delete(e.pointerId);pinch=0;HG.drag=null;if(ptr.size===1){const [p]=[...ptr.values()];HG.drag={x:p.x,y:p.y,a:HG.ang,l:HG.el}}});
  el.addEventListener('wheel',e=>{e.preventDefault();HG.zoom=clamp(HG.zoom*(1+e.deltaY*.0012),.2,2.6)},{passive:false})}
bindOrbit($('hgView'));
// keyboard: WASD / arrows walk the view point across the floor, Q/E lower and raise it
addEventListener('keydown',e=>{if(!HG.on||e.target&&(/INPUT|TEXTAREA/.test(e.target.tagName)||e.target.closest&&e.target.closest('.tn')))return;const s=HG.r*HG.zoom*.04;let used=true;
  const fw=_a.set(0,0,-1).applyQuaternion(camera.quaternion).setY(0).normalize(), rt=_b.set(1,0,0).applyQuaternion(camera.quaternion).setY(0).normalize();
  switch(e.key.toLowerCase()){case 'w':case 'arrowup':HG.tgt.addScaledVector(fw,s);break;case 's':case 'arrowdown':HG.tgt.addScaledVector(fw,-s);break;case 'a':case 'arrowleft':HG.tgt.addScaledVector(rt,-s);break;case 'd':case 'arrowright':HG.tgt.addScaledVector(rt,s);break;case 'e':HG.tgt.y+=s;break;case 'q':HG.tgt.y-=s;break;default:used=false}
  if(used){HG.auto=false;e.preventDefault();e.stopPropagation()}},true);
// quick views: [yaw, elevation, zoom]
const HG_VIEWS={front:[0,.12,1],side:[1.5708,.05,1],rear:[3.1416,.12,1],top:[1.5708,1.4,1.05],under:[1.5708,-1.4,1.05],cockpit:[.62,.45,.34],engine:[3.1416,.1,.4]};
for(const b of document.querySelectorAll('#hgChips button')){const v=HG_VIEWS[b.dataset.v];if(v)b.addEventListener('click',()=>hgView(v[0],v[1],v[2]))}
$('hgChips').querySelector('[data-v=auto]').addEventListener('click',()=>{HG.auto=true;HG.zoom=1});
addEventListener('keydown',e=>{if(e.key==='Escape'&&HG.on){hgClose();e.stopPropagation()}},true);
// the aircraft or loadout changed: keep the title and the spec sheet in step
const _applyAC=applyAC;
applyAC=function(){_applyAC.apply(this,arguments);if(hgSaved)hgRefresh();if(HG.on){$('hgName').textContent=AC.name;if(!$('hgSpec').hidden)hgSpecs()}};
const _startGame=startGame;
startGame=function(){hgClose();HG.bg=false;hgLeave();projKey='';return _startGame.apply(this,arguments)};   // never start a sortie with the jet still parked in the hangar scene
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
  const wt=WTREF[e.id];
  if(wt)h+=T('War Thunder reference (Realistic, wiki)',[['Battle rating','RB '+wt[3].toFixed(1)+(NODES[e.id]?' · rank '+ROMAN[NODES[e.id].r]:'')],['Max speed (reference)',fx(wt[0])+' km/h','game flight model: '+fx(hi.v*3.6)+' km/h at 10 km'],
    ['Rate of climb',fx(wt[1],1)+' m/s'],['Turn time',fx(wt[2],1)+' s','full circle, sea level']]);
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

if(/[?&]test\b/.test(location.search))Object.assign(window.__vs||{},{hgOpen,hgClose,HG,hgParked:()=>!!hgSaved});

/* ---------- the hangar building: a real steel hangar with the jet parked on the floor, gear down and canopy open ---------- */
let hgScene=null, hgBanner=null, hgSky=null, hgSaved=null;
const HG_W=56, HG_D=64, HG_H=17, HG_JZ=-4;   // hall width (x), depth (z), wall height; the jet sits at z = HG_JZ, nose toward the open door (+z)
function hgBuild(){
  const sc=new THREE.Scene(), cvs=(w,h,fn,rep)=>{const c=document.createElement('canvas');c.width=w;c.height=h;fn(c.getContext('2d'),w,h);const t=new THREE.CanvasTexture(c);t.wrapS=t.wrapT=THREE.RepeatWrapping;t.anisotropy=8;if(rep)t.repeat.set(rep[0],rep[1]);return t};
  const std=(o)=>new THREE.MeshStandardMaterial(Object.assign({roughness:.7,metalness:.1},o)), box=(w,h,d,m,x,y,z,par)=>{const b=new THREE.Mesh(new THREE.BoxGeometry(w,h,d),m);b.position.set(x,y,z);(par||sc).add(b);return b};
  let r=3;const rnd=()=>(r=(r*16807)%2147483647)/2147483647;
  sc.background=new THREE.Color(0x8fb0d0);
  // ---- floor: sealed concrete with slab joints, a yellow safety box, tyre marks and oil
  const floorTex=cvs(1024,1024,(c,w,h)=>{c.fillStyle='#6c7073';c.fillRect(0,0,w,h);
    for(let i=0;i<9000;i++){c.fillStyle='rgba('+(rnd()<.5?'255,255,255':'0,0,0')+','+(.02+rnd()*.05)+')';c.fillRect(rnd()*w,rnd()*h,1+rnd()*2,1+rnd()*2)}
    for(let i=0;i<26;i++){c.fillStyle='rgba(20,20,22,'+(.05+rnd()*.09)+')';c.beginPath();c.ellipse(rnd()*w,rnd()*h,10+rnd()*50,6+rnd()*24,rnd()*3,0,6.3);c.fill()}
    c.strokeStyle='rgba(0,0,0,.35)';c.lineWidth=2;for(let x=0;x<=w;x+=w/8){c.beginPath();c.moveTo(x,0);c.lineTo(x,h);c.stroke()}for(let y=0;y<=h;y+=h/8){c.beginPath();c.moveTo(0,y);c.lineTo(w,y);c.stroke()}
    const px=x=>(x+HG_W/2)/HG_W*w, pz=z=>(z+HG_D/2)/HG_D*h;                              // world metres -> texture pixels
    c.strokeStyle='#d9b82a';c.lineWidth=7;c.strokeRect(px(-17),pz(HG_JZ-19),px(17)-px(-17),pz(HG_JZ+19)-pz(HG_JZ-19));
    c.setLineDash([22,16]);c.lineWidth=5;c.strokeRect(px(-19),pz(HG_JZ-21),px(19)-px(-19),pz(HG_JZ+21)-pz(HG_JZ-21));c.setLineDash([]);
    c.strokeStyle='rgba(235,235,225,.8)';c.lineWidth=6;c.beginPath();c.moveTo(px(0),pz(HG_JZ+19));c.lineTo(px(0),h);c.stroke();                // taxi line to the door
    for(const [x,z] of [[-5,HG_JZ-1],[5,HG_JZ-1]]){c.fillStyle='rgba(10,10,12,.35)';c.fillRect(px(x)-4,pz(z)-26,8,52)}}),
    floor=new THREE.Mesh(new THREE.PlaneGeometry(HG_W,HG_D).rotateX(-Math.PI/2),std({map:floorTex,roughness:.62,metalness:.08,envMapIntensity:.25}));sc.add(floor);
  // ---- walls: corrugated steel with ribs; the +z wall has a big open door
  const wallTex=cvs(256,16,(c,w,h)=>{for(let x=0;x<w;x+=16){const g=c.createLinearGradient(x,0,x+16,0);g.addColorStop(0,'#b9c2c8');g.addColorStop(.5,'#e4e9ec');g.addColorStop(1,'#a9b2b9');c.fillStyle=g;c.fillRect(x,0,16,h)}},[HG_W/1.2,1]),
    wallM=std({map:wallTex,roughness:.6,metalness:.35,color:0xdfe6ea}), darkM=std({color:0x30363b,roughness:.6,metalness:.5}), yellow=std({color:0xd9b82a,roughness:.6}), steel=std({color:0x5b6670,roughness:.55,metalness:.6});
  box(.5,HG_H,HG_D,wallM,-HG_W/2,HG_H/2,0);box(.5,HG_H,HG_D,wallM,HG_W/2,HG_H/2,0);box(HG_W,HG_H,.5,wallM,0,HG_H/2,-HG_D/2);
  const dw=36,dh=12.5;box((HG_W-dw)/2,HG_H,.5,wallM,-(HG_W+dw)/4,HG_H/2,HG_D/2);box((HG_W-dw)/2,HG_H,.5,wallM,(HG_W+dw)/4,HG_H/2,HG_D/2);box(dw,HG_H-dh,.5,wallM,0,dh+(HG_H-dh)/2,HG_D/2);
  box(5,dh,.6,steel,-dw/2-2.5,dh/2,HG_D/2+.6);box(5,dh,.6,steel,dw/2+2.5,dh/2,HG_D/2+.6);                              // door panels slid aside
  box(dw+.8,.5,.7,yellow,0,dh,HG_D/2);                                                                                  // door header stripe
  // ---- roof: gable of ribbed panels on steel trusses, posts along the walls
  const ridge=HG_H+4.6, slope=Math.atan2(ridge-HG_H,HG_W/2), rl=Math.hypot(HG_W/2,ridge-HG_H);
  for(const s of [-1,1]){const p=new THREE.Mesh(new THREE.PlaneGeometry(rl,HG_D+.6),std({map:wallTex.clone(),roughness:.7,metalness:.4,color:0xb8c0c6,side:THREE.DoubleSide}));
    p.material.map.needsUpdate=true;p.rotation.set(-Math.PI/2,0,-s*slope,'YXZ');p.position.set(s*HG_W/4,(HG_H+ridge)/2,0);sc.add(p)}
  for(let z=-HG_D/2+4;z<=HG_D/2-3;z+=8){
    box(HG_W,.4,.45,steel,0,HG_H-.6,z);                                                                                 // tie beam
    for(const s of [-1,1]){const rf=box(rl,.4,.4,steel,s*HG_W/4,(HG_H+ridge)/2-.25,z);rf.rotation.z=s*slope;
      const dg=box(Math.hypot(HG_W/4,ridge-HG_H-.6)*.98,.25,.3,steel,s*HG_W/8,HG_H-.6+(ridge-HG_H)/2*.5,z);dg.rotation.z=-s*Math.atan2(ridge-HG_H-.6,HG_W/4)*.5}
    box(.35,ridge-HG_H,.35,steel,0,(HG_H-.6+ridge)/2,z)}
  for(let z=-HG_D/2+4;z<=HG_D/2-3;z+=8)for(const s of [-1,1])box(.6,HG_H,.6,steel,s*(HG_W/2-.55),HG_H/2,z);
  box(.7,.5,HG_D,yellow,-HG_W/2+.4,.25,0);box(.7,.5,HG_D,yellow,HG_W/2-.4,.25,0);                                         // wall kick strips
  // ---- lighting: hanging lamps (emissive) with matching point lights, hemisphere fill, sunlight from the door
  const lamp=new THREE.MeshBasicMaterial({color:0xfff6e6});
  for(const x of [-10,10])for(const z of [-24,-8,8,24]){box(6,.18,.7,lamp,x,HG_H-1.4,z);box(.06,1.2,.06,darkM,x-2.5,HG_H-.8,z);box(.06,1.2,.06,darkM,x+2.5,HG_H-.8,z)}
  sc.add(new THREE.HemisphereLight(0xdfe9f2,0x4a4d50,.42*LK));
  for(const [x,z] of [[-9,-14],[9,-14],[0,8]]){const l=new THREE.PointLight(0xfff0dc,85*LK,60,2);l.position.set(x,HG_H-3,z);sc.add(l)}
  const sun=new THREE.DirectionalLight(0xfff0d0,.55*LK);sun.position.set(14,26,70);sc.add(sun);
  // ---- the outside: apron, hills, sky dome
  const apron=new THREE.Mesh(new THREE.PlaneGeometry(400,260).rotateX(-Math.PI/2),std({color:0x74787b,roughness:.9}));apron.position.set(0,-.02,HG_D/2+130);sc.add(apron);
  const grass=new THREE.Mesh(new THREE.PlaneGeometry(2000,2000).rotateX(-Math.PI/2),std({color:0x55703a,roughness:1}));grass.position.y=-.3;sc.add(grass);
  for(let i=0;i<14;i++){const h=new THREE.Mesh(new THREE.SphereGeometry(1,12,8),std({color:i%3?0x4e6b3a:0x5f7a45,roughness:1}));const a=(i/14)*6.28,d=380+rnd()*140;h.scale.set(110+rnd()*90,28+rnd()*34,110+rnd()*90);h.position.set(Math.sin(a)*d,-6,Math.cos(a)*d+60);sc.add(h)}
  hgSky=new THREE.Mesh(new THREE.SphereGeometry(900,24,12),new THREE.ShaderMaterial({side:THREE.BackSide,depthWrite:false,fog:false,
    vertexShader:'varying vec3 vD;void main(){vD=normalize(position);gl_Position=projectionMatrix*modelViewMatrix*vec4(position,1.);}',
    fragmentShader:'varying vec3 vD;void main(){float h=clamp(vD.y,0.,1.);vec3 c=mix(vec3(.86,.9,.93),vec3(.25,.48,.82),pow(h,.45));gl_FragColor=vec4(c,1.);}'}));hgSky.renderOrder=-2;sc.add(hgSky);
  // ---- props: workbench, tool chests, tyres, drums, tow tractor, missile cart, cones, ladder, banners
  const red=std({color:0xa3221c,roughness:.5,metalness:.3}), olive=std({color:0x59603f,roughness:.7}), orange=std({color:0xe0641a,roughness:.6}), black=std({color:0x151617,roughness:.9}), wood=std({color:0x8a6a45,roughness:.8}), chestTex=cvs(128,128,(c,w,h)=>{c.fillStyle='#a3221c';c.fillRect(0,0,w,h);c.fillStyle='rgba(0,0,0,.45)';for(let y=8;y<h;y+=24){c.fillRect(8,y,w-16,2);c.fillStyle='#c9ccd0';c.fillRect(w/2-14,y+8,28,4);c.fillStyle='rgba(0,0,0,.45)'}}),
    chestM=std({map:chestTex,roughness:.45,metalness:.4});
  const X=-HG_W/2+1.4;
  box(1.4,1,7,darkM,X,.5,-12);box(1.5,.08,7.2,wood,X,1.04,-12);box(.9,.5,.9,steel,X,1.33,-10.4);                                // workbench + vise
  for(let i=0;i<3;i++)box(1.1,1.3,.9,chestM,X+.1,.65,-18-i*1.1);box(1.1,.9,1.2,chestM,X+.1,.45,-6.5);
  for(let i=0;i<4;i++){const t=new THREE.Mesh(new THREE.CylinderGeometry(.55,.55,.3,16),black);t.position.set(X+.2,.17+i*.31,-24);t.rotation.x=0;sc.add(t)}   // tyre stack
  for(const z of [-28,-27]){const d=new THREE.Mesh(new THREE.CylinderGeometry(.45,.45,1.1,14),std({color:0x244a7a,metalness:.4}));d.position.set(X+.3,.55,z);sc.add(d)}   // oil drums
  const tr=new THREE.Group();sc.add(tr);box(2.4,1.3,4.2,std({color:0xd9b82a,roughness:.5}),0,.95,0,tr);box(2,1.2,1.8,std({color:0x1d242a,roughness:.4,metalness:.5}),0,1.95,.7,tr);
  for(const [x,z] of [[-1.3,-1.4],[1.3,-1.4],[-1.3,1.5],[1.3,1.5]]){const w=new THREE.Mesh(new THREE.CylinderGeometry(.5,.5,.5,14),black);w.rotation.z=Math.PI/2;w.position.set(x,.5,z);tr.add(w)}
  tr.position.set(HG_W/2-4,0,-20);tr.rotation.y=-.5;
  const cart=new THREE.Group();sc.add(cart);box(1.6,.5,5.2,olive,0,.8,0,cart);for(const x of [-.35,.35]){const m=new THREE.Mesh(new THREE.CylinderGeometry(.11,.11,3.6,10).rotateX(Math.PI/2),std({color:0xe6e6e0,roughness:.5}));m.position.set(x,1.25,0);cart.add(m)
    const nz=new THREE.Mesh(new THREE.ConeGeometry(.11,.5,10).rotateX(Math.PI/2),std({color:0x30353a}));nz.position.set(x,1.25,2.05);cart.add(nz)}
  for(const [x,z] of [[-.6,-2],[.6,-2],[-.6,2],[.6,2]]){const w=new THREE.Mesh(new THREE.CylinderGeometry(.22,.22,.18,12),black);w.rotation.z=Math.PI/2;w.position.set(x,.22,z);cart.add(w)}
  cart.position.set(-HG_W/2+5,0,6);cart.rotation.y=.2;
  for(const [x,z] of [[-17,HG_JZ-21],[17,HG_JZ-21],[-19,HG_JZ+21],[19,HG_JZ+21],[-19,HG_JZ],[19,HG_JZ]]){const c1=new THREE.Mesh(new THREE.ConeGeometry(.32,.75,10),orange);c1.position.set(x,.38,z);sc.add(c1);box(.7,.05,.7,orange,x,.03,z)}   // cones
  for(const z of [-30,-29.2])box(.9,.9,.9,olive,HG_W/2-2,.45,z);
  const ext=new THREE.Mesh(new THREE.CylinderGeometry(.14,.14,.7,10),red);ext.position.set(-HG_W/2+1,.9,-2);sc.add(ext);
  // wall banners: squadron sign (redrawn on every visit) and safety posters
  const bc=document.createElement('canvas');bc.width=1024;bc.height=256;hgBanner={c:bc,t:new THREE.CanvasTexture(bc)};hgBanner.t.anisotropy=8;
  const ban=new THREE.Mesh(new THREE.PlaneGeometry(22,5.5),new THREE.MeshBasicMaterial({map:hgBanner.t}));ban.position.set(0,10.5,-HG_D/2+.3);sc.add(ban);
  const pc=cvs(256,128,(c,w,h)=>{c.fillStyle='#d9b82a';c.fillRect(0,0,w,h);c.fillStyle='#111';c.font='bold 30px sans-serif';c.textAlign='center';c.fillText('NO FOD',w/2,52);c.font='bold 18px sans-serif';c.fillText('CHECK · SECURE · REPORT',w/2,88);c.fillRect(0,h-14,w,14)});
  for(const z of [-18,-4,10]){const p=new THREE.Mesh(new THREE.PlaneGeometry(4,2),new THREE.MeshBasicMaterial({map:pc}));p.position.set(HG_W/2-.32,7,z);p.rotation.y=-Math.PI/2;sc.add(p)}
  // crew ladder (positioned against the cockpit per aircraft in hgEnter), and the jet's soft contact shadow
  hgBuild.ladder=new THREE.Group();for(const s of [-1,1])box(.06,3.2,.06,steel,s*.22,1.6,0,hgBuild.ladder);for(let i=0;i<9;i++)box(.44,.04,.06,steel,0,.35+i*.34,0,hgBuild.ladder);sc.add(hgBuild.ladder);
  hgBuild.blob=new THREE.Mesh(new THREE.PlaneGeometry(1,1).rotateX(-Math.PI/2),new THREE.MeshBasicMaterial({map:radTex([[0,'rgba(0,0,0,.8)'],[.55,'rgba(0,0,0,.45)'],[1,'rgba(0,0,0,0)']]),transparent:true,depthWrite:false}));hgBuild.blob.position.y=.03;sc.add(hgBuild.blob);
  return sc}
function hgSign(){const c=hgBanner.c.getContext('2d');c.fillStyle='#1b2a3a';c.fillRect(0,0,1024,256);c.fillStyle='#d9b82a';c.fillRect(0,0,1024,14);c.fillRect(0,242,1024,14);
  c.fillStyle='#e8f0ea';c.textAlign='center';c.textBaseline='middle';c.font='800 120px "Saira Condensed",Arial Narrow,sans-serif';c.fillText((squadron||'VIPER SORTIE').toUpperCase().slice(0,22),512,104);
  c.font='700 40px "B612 Mono",monospace';c.fillStyle='#7dff9a';c.fillText(AC.name.toUpperCase(),512,196);hgBanner.t.needsUpdate=true}
// step the jet into the hangar: parked, gear down, engine off, canopy open
function hgEnter(){if(hgSaved)return;if(!hgScene)hgScene=hgBuild();
  if(state==='over')applyAC();   // after a sortie the jet is battered: start from a fresh airframe
  hgSaved={pos:P.pos.clone(),q:playerJet.quaternion.clone(),vel:P.vel.clone(),gear:P.gear,gearT:P.gearT,og:P.onGround,thr:throttle,ci:P.ci};
  hgScene.environment=scene.environment;hgScene.add(playerJet);
  playerJet.visible=true;P.pos.set(0,GEAR_H,HG_JZ);playerJet.quaternion.identity();P.vel.set(0,0,0);P.onGround=true;P.ci=[0,0,0,0];throttle=0;setGear(true);P.gearT=1;axes(P);
  hgRefresh();HG.tgt.set(0,2.2,HG_JZ);HG.r=((typeof M2!=='undefined'&&M2[AC.id]&&M2[AC.id].L)||16)*1.35}
// aircraft or loadout changed while parked: re-fit the shadow, ladder and sign, and keep the engine dark
function hgRefresh(){if(!hgSaved)return;
  const sp=(typeof M2!=='undefined'&&M2[AC.id]&&M2[AC.id].L)||16, span=(S=>S?Math.max(...S.wings.map(w=>w.st[w.st.length-1].x))*2:12)(typeof M2!=='undefined'&&M2[AC.id]);
  hgBuild.blob.scale.set(span*1.25,1,sp*1.2);hgBuild.blob.position.z=HG_JZ;
  const lad=hgBuild.ladder,SC=typeof M2!=='undefined'&&M2[AC.id]&&M2[AC.id].canopy,th=.3,topY=GEAR_H+(SC?SC[1]:.7)-.12,len=topY/Math.cos(th),topX=-((SC?SC[2]:.5)+.1);   // base on the floor, top on the canopy rail
  lad.scale.set(1,len/3.2,1);lad.rotation.set(0,0,-th);lad.position.set(topX-len*Math.sin(th),0,HG_JZ+(SC?SC[0]-.3:AC.eye[2]));
  if(pFlame)pFlame.scale.set(.01,.01,.01);setAB(playerJet,false);P.gearT=1;hgSign()}
function hgLeave(){if(!hgSaved)return;const s=hgSaved;hgSaved=null;hgScene.remove(playerJet);scene.add(playerJet);
  P.pos.copy(s.pos);playerJet.quaternion.copy(s.q);P.vel.copy(s.vel);P.onGround=s.og;P.ci=s.ci;throttle=s.thr;setGear(s.gear);P.gearT=s.gearT;axes(P);camSnap=true}

/* ---------- Tech tree tab in the hangar ---------- */
let progSel=null;
const fmtN=n=>Number(n).toLocaleString('en-US');
const nodeState=id=>!careerOn||progOwned(id)?'own':progRes(id)?'res':progResearchable(id)?'can':'lock';
function progWallet(){$('hgWallet').textContent=careerOn?fmtN(prog.sl)+' SL · '+fmtN(prog.frp)+' free RP':''}
function progDetail(id){
  const n=NODES[id],d=AC_DEFS[id],st=nodeState(id),nat=NATIONS[n.n],req=n.req?AC_DEFS[n.req].name:null,tw=d.T_AB/(d.MASS*G);
  let h='<div class="tdet" title="'+nat.n+' · rank '+ROMAN[n.r]+' · BR '+n.br.toFixed(1)+'"><h3>'+d.name+'</h3><p class="hgNote">'+nat.n+' · rank '+ROMAN[n.r]+' · BR '+n.br.toFixed(1)+' · thrust/weight '+tw.toFixed(2)+' · +'+d.gmax+' g · corner '+d.corner+' kt<br>'+d.srFull+' × '+d.srN+' · '+d.mrFull+' × '+d.mrN+'</p>';
  if(st==='own'){const cur=id===AC.id;h+='<div class="row"><button class="primary" data-act="use" data-id="'+id+'"'+(cur?' disabled':'')+'>'+(cur?'Selected':'Select aircraft')+'</button></div>';
    h+=careerOn?'<p class="hgNote">'+MODS.filter(m=>hasMod(id,m[0])).length+' of '+MODS.length+' modules installed. Open the Mods tab to research more.</p>':'<p class="hgNote">Free play: every aircraft is unlocked with all modules.</p>'}
  else if(st==='res'){const c=SL_PRICE[n.r];h+='<div class="row"><button class="primary" data-act="buy" data-id="'+id+'"'+(prog.sl>=c?'':' disabled')+'>Buy · '+fmtN(c)+' SL</button></div><p class="hgNote">Researched. You have '+fmtN(prog.sl)+' Silver Lions.</p>'}
  else if(st==='can'){const c=RP_COST[n.r];h+='<div class="row"><button class="primary" data-act="research" data-id="'+id+'"'+(progPool(n.req)>=c?'':' disabled')+'>Research · '+fmtN(c)+' RP</button></div><p class="hgNote">Paid from the '+fmtN(prog.rp[n.req]||0)+' RP earned in the '+req+' plus '+fmtN(prog.frp)+' free RP.</p>'}
  else h+='<p class="hgNote">Locked: research the '+req+' first.</p>';
  return h+'</div>'}
/* Mods tab: modules for the aircraft in the hangar, grouped by family. Research costs RP earned in this aircraft (or free RP), then the module is bought with Silver Lions. */
function modsRender(){const el=$('hgMods'),id=AC.id;progWallet();
  if(!careerOn){el.innerHTML='<p class="hgNote">Modifications belong to <b>Career mode</b>: a stock aircraft flies with penalties and you earn the modules by flying it. Free play gives every aircraft all modules for free.</p><div class="row"><button class="primary" data-act="career">Switch to Career</button></div>';return}
  if(!progOwned(id)){el.innerHTML='<p class="hgNote">Buy this aircraft in the Tech tree first.</p>';return}
  const stock=!hasMod(id,'eng1')||!hasMod(id,'afr1')||!hasMod(id,'cms1')||!hasMod(id,'wpn1');
  let h='<p class="hgNote">'+AC.name+(stock?' is flying in stock condition: -6 % thrust, -10 % roll rate, half the countermeasures, -10 % missile range and agility, no drop tanks and only the basic missile load.':' is fully modified.')+' '+fmtN(prog.rp[id]||0)+' RP earned in this aircraft, '+fmtN(prog.frp)+' free RP, '+fmtN(prog.sl)+' SL.</p><div class="mods">';
  for(const m of MODS){const k=m[0],c=modCost(id,m),have=hasMod(id,k),res=modRes(id,k),lockd=m[4]&&!hasMod(id,m[4]),st=have?'own':res?'res':lockd?'lock':'can';
    let btn;if(have)btn='<b class="ok">Installed</b>';else if(lockd)btn='<small>Needs '+MODS.find(x=>x[0]===m[4])[1]+'</small>';
    else if(res)btn='<button type="button" class="primary" data-act="mbuy" data-m="'+k+'"'+(prog.sl>=c.sl?'':' disabled')+'>Buy '+fmtN(c.sl)+' SL</button>';
    else btn='<button type="button" class="ghost" data-act="mres" data-m="'+k+'"'+(progPool(id)>=c.rp?'':' disabled')+'>Research '+fmtN(c.rp)+' RP</button>';
    h+='<div class="mod '+st+'" data-m="'+k+'"><small>'+m[5]+'</small><b>'+m[1]+'</b><p>'+m[3]+'</p>'+btn+'</div>'}
  el.innerHTML=h+'</div>'}
$('hgMods').addEventListener('click',e=>{const t=e.target.closest('[data-act]');if(!t)return;const act=t.dataset.act;
  if(act==='career'){$('bMode').click();modsRender();return}
  const ok=act==='mres'?progModResearch(AC.id,t.dataset.m):act==='mbuy'?progModBuy(AC.id,t.dataset.m):false;
  if(ok){if(act==='mbuy')applyAC();syncCareerUI()}modsRender()});
/* crew skills as cards: name, what it does, five pips, next-level cost; shared by the hangar and the Pilot pane */
function crewCards(){return '<div class="crew">'+CREW.map(c=>{const k=c[0],lv=prog.crew[k]||0,cost=crewCost(k),maxed=lv>=5,poor=prog.sl<cost,off=maxed||poor||!careerOn;
  return '<div class="crc"><b>'+c[1]+'</b><p>'+c[2]+'</p><div class="pips" role="img" aria-label="Level '+lv+' of 5">'+[1,2,3,4,5].map(n=>'<i'+(n<=lv?' class="on"':'')+'></i>').join('')+'</div>'+
    '<button type="button" class="ghost" data-act="crew" data-k="'+k+'"'+(off?' disabled':'')+'>'+(maxed?'Maxed':fmtN(cost)+' SL')+'</button>'+(!careerOn?'<small>Career only</small>':poor&&!maxed?'<small>Need '+fmtN(cost-prog.sl)+' more SL</small>':'')+'</div>'}).join('')+'</div>'}
/* tech tree: each nation is a small graph; nodes sit in rank columns and hairlines join a node to the one it was researched from */
const TN_W=88,TN_H=60,TN_GX=14,TN_GY=8;
function treeLayout(nk){const ids=Object.keys(NODES).filter(i=>NODES[i].n===nk),pos={};let nr=0;
  const place=(id,row,minC)=>{const c=Math.max(NODES[id].r-1,minC);pos[id]={c,r:row};ids.filter(k=>NODES[k].req===id).sort((a,b)=>NODES[a].r-NODES[b].r).forEach((k,i)=>place(k,i===0?row:nr++,c+1))};   // a child always sits right of its parent
  for(const root of ids.filter(i=>!NODES[i].req||NODES[NODES[i].req].n!==nk))place(root,nr++,0);return pos}
function nodeText(i){const n=NODES[i],st=nodeState(i);if(i===AC.id)return 'In hangar';return st==='own'?(!careerOn?'Unlocked':(SL_PRICE[n.r]?'Owned · '+fmtN(SL_PRICE[n.r])+' SL':'Owned')):st==='res'?'Researched · '+fmtN(SL_PRICE[n.r])+' SL':st==='can'?'Research · '+fmtN(RP_COST[n.r])+' RP':'Locked · '+fmtN(RP_COST[n.r])+' RP'}
// the researchable node worth doing next: the cheapest one you can already afford, else the cheapest overall
function nextResearch(){const c=Object.keys(NODES).filter(progResearchable);if(!c.length)return null;const cost=i=>RP_COST[NODES[i].r],ok=c.filter(i=>progPool(NODES[i].req)>=cost(i));return (ok.length?ok:c).sort((a,b)=>cost(a)-cost(b))[0]}
function progRender(){const el=$('hgTree');progWallet();const had=document.activeElement&&el.contains(document.activeElement)?document.activeElement.dataset.id:null;
  if(!progSel||!NODES[progSel])progSel=AC.id;const nx=nextResearch();
  let h=(careerOn?'<p class="hgNote">'+fmtN(prog.sl)+' Silver Lions · '+fmtN(prog.frp)+' free RP · '+prog.sorties+' career sorties. Tap an aircraft, then Select it; double-tap selects at once. Arrow keys move between them.</p>':
    '<p class="hgNote">Free play: every aircraft is unlocked. Tap an aircraft, then Select it; double-tap selects at once. <button class="ghost" data-act="career" type="button">Switch to Career</button> to research and buy them instead.</p>')+'<div class="tree">';
  for(const nk in NATIONS){const pos=treeLayout(nk),ids=Object.keys(pos),mc=Math.max(...ids.map(i=>pos[i].c)),mr=Math.max(...ids.map(i=>pos[i].r)),W=(mc+1)*(TN_W+TN_GX)-TN_GX,Hh=(mr+1)*(TN_H+TN_GY)-TN_GY;
    const X=i=>pos[i].c*(TN_W+TN_GX),Y=i=>pos[i].r*(TN_H+TN_GY);
    const lines=ids.filter(i=>NODES[i].req&&pos[NODES[i].req]).map(i=>{const p=NODES[i].req,x1=X(p)+TN_W,y1=Y(p)+TN_H/2,x2=X(i),y2=Y(i)+TN_H/2,m=(x1+x2)/2,on=progRes(i);
      return '<path d="M'+x1+' '+y1+'C'+m+' '+y1+' '+m+' '+y2+' '+x2+' '+y2+'" class="'+(on?'on':progRes(p)?'nx':'')+'"/>'}).join('');
    h+='<div class="tnat" style="--nc:'+NATIONS[nk].c+'"><h4>'+NATIONS[nk].n+'</h4><div class="tgw"><div class="tgrid" style="width:'+W+'px;height:'+Hh+'px"><svg width="'+W+'" height="'+Hh+'" aria-hidden="true">'+lines+'</svg>'+
      ids.map(i=>'<button type="button" class="tn '+nodeState(i)+(i===progSel?' sel':'')+(i===AC.id?' cur':'')+(i===nx?' next':'')+'" data-id="'+i+'" style="left:'+X(i)+'px;top:'+Y(i)+'px;width:'+TN_W+'px;height:'+TN_H+'px" title="'+AC_DEFS[i].name+'"><b>'+AC_DEFS[i].name+'</b><small>'+ROMAN[NODES[i].r]+' · BR '+NODES[i].br.toFixed(1)+'</small><em>'+nodeText(i)+'</em></button>').join('')+'</div></div></div>'}
  h+='</div>'+progDetail(progSel)+(careerOn?'<h4 class="hgSub">Crew training</h4>'+crewCards():'');
  el.innerHTML=h;if(had){const b=el.querySelector('.tn[data-id="'+had+'"]');if(b)b.focus()}}
// arrow keys move between aircraft by position
$('hgTree').addEventListener('keydown',e=>{const k=e.key;if(['ArrowLeft','ArrowRight','ArrowUp','ArrowDown'].indexOf(k)<0)return;const cur=document.activeElement;if(!cur||!cur.classList.contains('tn'))return;
  const all=[...$('hgTree').querySelectorAll('.tn')],c=cur.getBoundingClientRect(),cx=c.left+c.width/2,cy=c.top+c.height/2,dx=k==='ArrowRight'?1:k==='ArrowLeft'?-1:0,dy=k==='ArrowDown'?1:k==='ArrowUp'?-1:0;let best=null,bs=1e9;
  for(const n of all){if(n===cur)continue;const r=n.getBoundingClientRect(),x=r.left+r.width/2-cx,y=r.top+r.height/2-cy,pr=dx?x*dx:y*dy,sd=dx?Math.abs(y):Math.abs(x);if(pr<4)continue;const sc=pr+sd*2.2;if(sc<bs){bs=sc;best=n}}
  e.preventDefault();if(best)best.focus()});
if(/[?&]test\b/.test(location.search))Object.assign(window.__vs||{},{ldCap,progModResearch,progModBuy,modCost,MODS,prog,progAward,NODES,pickBanditType});
function progUse(id){if(!AC_DEFS[id]||nodeState(id)!=='own')return;AC=AC_DEFS[id];try{localStorage.setItem('viperAC',id)}catch(er){};progSel=id;applyAC();$('hgName').textContent=AC.name;progRender()}
$('hgTree').addEventListener('dblclick',e=>{const t=e.target.closest('.tn');if(t)progUse(t.dataset.id)});
$('hgTree').addEventListener('click',e=>{const t=e.target.closest('[data-id],[data-act]');if(!t)return;const id=t.dataset.id,act=t.dataset.act;
  if(!act){progSel=id;if(nodeState(id)==='own'&&id!==AC.id){progUse(id);message(AC_DEFS[id].name.toUpperCase()+' SELECTED',1.2);return}progRender();return}
  if(act==='career'){$('bMode').click();progRender();return}
  let ok=false;
  if(act==='research')ok=progResearch(id);else if(act==='buy')ok=progBuy(id);else if(act==='crew')ok=progCrew(t.dataset.k);
  else if(act==='use'){progUse(id);return}
  if(ok){if(act==='crew'||act==='buy')applyAC();syncCareerUI();$('hgName').textContent=AC.name}progRender()});
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
const SDESC={'Stick':'Fly with the on-screen stick, or tilt the phone.','Pull back':'Whether pulling the stick back raises the nose (flight-sim) or lowers it.','Sensitivity':'How far the jet turns for a given stick movement.','Dead zone':'Ignore small stick movements near the centre.',
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
    mRow('Stick',()=>[{v:'stick',t:'Touch stick'},{v:'tilt',t:'Tilt'}],()=>tilt.on?'tilt':'stick',v=>{if((v==='tilt')!==tilt.on)$('bTilt').click()}),
    mRow('Pull back',()=>[{v:'up',t:'Climbs'},{v:'dn',t:'Dives'}],()=>invert?'dn':'up',v=>{if((v==='dn')!==invert)$('bInvert').click()}),
    mSlide('Sensitivity',Object.keys(SENS).length,()=>Object.keys(SENS).indexOf(sens),i=>drive($('bSens'),()=>sens,Object.keys(SENS)[i],4),i=>Object.keys(SENS)[i]),
    mSlide('Dead zone',DZS.length,()=>dz,i=>drive($('bDz'),()=>dz,i,6),i=>Math.round(DZS[i]*100)+' %'),
    onoff('Vibration',()=>hapticsOn,()=>$('bHaptic').click()),
    mAct('Move buttons','Edit',()=>$('bLayout').click()),mAct('Controls guide','Show',()=>$('bTips').click()));
  pane.dsp.append(
    mRow('Graphics',()=>Object.keys(QUALS).map(k=>({v:k,t:({LOW:'Low',MED:'Medium',HIGH:'High'})[k]})),()=>quality,v=>drive($('bQual'),()=>quality,v,4)),
    onoff('Cinematic menu',()=>FX.on,()=>{FX.on=!FX.on;lsSet('vsFx',FX.on?'1':'0');ovEl.dataset.fx=FX.on?'on':'off';camGoal(ovEl.dataset.pane)}),
    onoff('Bloom and grading',()=>POST.on,()=>{POST.on=!POST.on;try{localStorage.setItem('vsPost',POST.on?'1':'0')}catch(e){}}),
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
})();
