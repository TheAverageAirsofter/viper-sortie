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
