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

/* ===== Late additions (BR and figures est. unless the wiki is cited): A-10C, MiG-27M, Su-24M, AJS 37, JA 37DI ===== */
// A-10C: the A-10A rebuilt with precision engagement, ALQ-131 pod, AIM-9M, AGM-65D/H, JDAM
dv('A10A','A10C','A-10C Thunderbolt II','Hog',{
  MASS:15100,cm:cmo(120,60,0,true,'ECM','ALQ-131','ALE-47',stn([['L','9L'],['R','9L']],[])),
  spec:'<span><b>+6.5 g</b> · armoured tub</span><span><b>Mach 0.56</b></span><span>2× TF34 <b>80.6 kN</b></span><span>GAU-8/A · <b>1,174 rds</b></span><span>AGM-65 · JDAM</span><span>2× AIM-9M</span>',
  radar:{modes:['RWS'],name:'None (Litening pod)',range:2000},rwrName:'AN/ALR-69A',cmDesc:'ALE-47 + ALQ-131 pod'});
// MiG-27M: the ground-attack Flogger, R-29B-300 (112 kN AB), GSh-6-23 (260 rds), Kh-25, FAB bombs
dv('MIG23ML','MIG27M','MiG-27M Flogger-D','Flogger',{corner:420,
  MASS:15300,T_AB:112000,T_MIL:78000,gmax:7,
  gunRate:100,gunRounds:260,muzzle:715,gunDmg:2,gunSnd:1600,ammo:'23MM',
  srN:2,mrN:0,mrFull:'none',mrName:'-',
  radar:{modes:['RWS'],name:'Klen laser ranger',range:12000},
  cm:cmo(0,0,0,false,null,'','none',stn([['1','R60'],['2','R60']],[])),
  spec:'<span><b>+7 g</b> · variable sweep</span><span><b>Mach 1.7</b></span><span>R-29B <b>112 kN</b></span><span>GSh-6-23 · <b>260 rds</b></span><span>Kh-25 · FAB bombs</span><span>2× R-60M</span>',
  mrDesc:'No radar missiles'});
// Su-24M: swing-wing deep-strike bomber, 2× AL-21F-3 (110 kN AB each), GSh-6-23 (500 rds), Kh-25/Kh-29, KAB bombs
dv('SU22M3','SU24M','Su-24M Fencer','Fencer',{corner:430,
  MASS:21500,T_AB:220000,T_MIL:150000,S:55,gmax:6.5,vne:800,
  gunRate:100,gunRounds:500,muzzle:715,gunDmg:2,gunSnd:1600,ammo:'23MM',fuelCap:11000,engines:2,
  radar:{modes:['RWS'],name:'Orion-A terrain radar',range:20000},
  spec:'<span><b>+6.5 g</b> · variable sweep</span><span><b>Mach 1.35</b></span><span>2× AL-21F-3 <b>220 kN</b></span><span>GSh-6-23 · <b>500 rds</b></span><span>Kh-29 · KAB-500</span><span>2× R-60M</span>'});
// AJS 37 Viggen: the Swedish attacker, RM8A, ranging radar, Rb 05 / Rb 75, no cannon in the nose fit
dv('JA37','AJS37','AJS 37 Viggen','Viggen',{corner:430,
  MASS:15000,T_AB:118000,T_MIL:68000,
  gunRate:0,gunRounds:0,
  srName:'RB74',srFull:'Rb 74',srN:2,mrN:0,mrName:'-',mrFull:'none',
  radar:{modes:['RWS'],name:'PS-37/A',range:30000},
  cm:cmo(60,120,0,false,'ECM','BOZ-100 pod','BOZ',stn([['6A','Rb74'],['6B','Rb74']],[])),
  spec:'<span><b>+7 g</b></span><span><b>Mach 2</b></span><span>RM8A <b>118 kN</b></span><span>Rb 05 · Rb 75 · bombs</span><span>Canard-delta</span><span>2× Rb 74</span>',
  mrDesc:'No radar missiles'});
// JA 37DI: the Viggen's final fighter update, upgraded PS-46/A, Rb 99 AMRAAM era avionics
dv('JA37','JA37DI','JA 37DI Viggen','Viggen',{
  MASS:15700,T_AB:127000,radar:{modes:['RWS','TWS'],name:'PS-46/A (upgraded)',range:90000},
  spec:'<span><b>+7 g</b></span><span><b>Mach 2</b></span><span>RM8B <b>127 kN</b></span><span>PS-46/A <b>look-down</b></span><span>Rb 71 · Rb 74</span><span>Canard-delta</span>'});
for(const id of ['A10C','MIG27M','SU24M','AJS37','JA37DI'])delete AC_DEFS[id].model;
for(const id of ['A10C','MIG27M','SU24M','AJS37','JA37DI'])AC_DEFS[id].cut=AC_DEFS[({A10C:'A10A',MIG27M:'MIG23ML',SU24M:'SU22M3',AJS37:'JA37',JA37DI:'JA37'})[id]].cut;
m2Alias('A10C','A10A');m2Alias('MIG27M','MIG23ML',{r9:M2.MIG23ML.r9.slice(0,2),r120:[]});m2Alias('SU24M','SU22M3');
m2Alias('AJS37','JA37',{r9:M2.JA37.r9.slice(0,2),r120:[]});m2Alias('JA37DI','JA37');
for(const id of ['A10C','MIG27M','SU24M','AJS37','JA37DI'])m2Fit(id);
ROSTER_IDS.push('A10C','MIG27M','SU24M','AJS37','JA37DI');
Object.assign(ROSTER_LIKE,{A10C:'A10A',MIG27M:'MIG23ML',SU24M:'SU22M3',AJS37:'JA37',JA37DI:'JA37'});
Object.assign(PITS,{A10C:'TEEN',MIG27M:'RUS',SU24M:'RUS',AJS37:'TEEN',JA37DI:'TEEN'});
Object.assign(PAINT,{
  A10C:{p:1,c:['#5f6a55','#4d5a4a','#717a6c'],b:'#8c928c',nat:'usaf',num:'AF 80-0282',lowvis:1},
  MIG27M:{p:2,c:['#808a6a','#9a9c80','#7a8a99'],b:'#b0b5ba',nat:'rus',num:'27',nose:'27'},
  SU24M:{p:2,c:['#8a929a','#707a84','#9aa2a9'],b:'#b0b5ba',nat:'rus',num:'24',nose:'24'},
  AJS37:{p:2,c:['#5c6a4c','#757d63','#6a7480'],b:'#aab0b5',nat:'swe',num:'37-21'},
  JA37DI:{p:2,c:['#6a737a','#7d868d','#8d969d'],b:'#aab0b5',nat:'swe',num:'37-62'}});
// Balance pass: sustained turn and climb brought toward the War Thunder wiki figures (see WTREF in progress.js)
for(const [id,o] of [['A10A',{MASS:19200}],['A7E',{MASS:15300}],['A4E',{MASS:8200}],['ALPHAJET',{MASS:6410}],['JAGUAR',{MASS:12700}],['G91Y',{MASS:6745}],['F4C',{MASS:18011}],['J35D',{KIND:0.22}],['J29F',{MASS:8100}],['J6A',{KIND:0.247}],['MIG21MF',{MASS:8136,KIND:0.222}],['F100D',{KIND:0.28}],['MIG19PT',{KIND:0.247}],['MIG21F13',{MASS:8600}],['HUNTER',{MASS:9226}],['MIRAGE3C',{MASS:10030}],['MIG21',{KIND:0.265}],['F4F',{KIND:0.173}],['KFIR',{KIND:0.197}],['J35F',{KIND:0.22}],['LIGHTNING',{MASS:20090}],['M2000',{KIND:0.213}],['MIG23ML',{KIND:0.192}],['MIG25PD',{MASS:40404}]])if(AC_DEFS[id])Object.assign(AC_DEFS[id],o);
