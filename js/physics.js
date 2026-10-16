// Flight-physics primitives (ISA atmosphere, drag, thrust). Pure functions, no DOM/three.js, so they can be unit-tested in Node.
const clamp=(v,a,b)=>v<a?a:v>b?b:v;
const T_IDLE=6000;
// ISA standard atmosphere
function atm(h){
  h=Math.max(0,h); let T,rho;
  if(h<11000){T=288.15-0.0065*h;rho=1.225*Math.pow(T/288.15,4.2559)}
  else {T=216.65;rho=0.36392*Math.exp(-(h-11000)/6341.6)}
  return {rho,a:Math.sqrt(401.87*T),sig:rho/1.225};
}
// zero-lift drag vs Mach (transonic rise, supersonic falloff)
function cd0(M,A){
  const tr=(A&&A.trK)||1;   // transonic wave-drag factor (Gripen E's refined shape lets it supercruise)
  if(M<0.85)return .0175;
  if(M<1.05)return .0175+(M-.85)/.2*.0275*tr;
  if(M<1.35)return .0175+(.0275-(M-1.05)/.3*.009)*tr;
  return .0175+.0185*tr+Math.max(0,M-1.8)*.05*((A&&A.supK)||1);
}
function thrust(A,t,sig,M,h){
  // t: 0 = idle, 0.8 = MIL (full dry), 1.0 = max afterburner
  const dry=Math.pow(sig,.85);
  if(t<=.8)return (T_IDLE+(A.T_MIL-T_IDLE)*t/.8)*dry;
  const ab=A.T_AB*Math.pow(sig,.75)*(1+A.ram*M*clamp((h-3000)/8000,0,1));
  return A.T_MIL*dry+(ab-A.T_MIL*dry)*(t-.8)/.2;
}

// Missile kinematics: fly a motor/drag model forward in 0.25 s steps; S = distance flown, V = speed at each step.
function flyout(spec,alt,v0){
  const at=atm(alt), S=[], V=[]; let v=v0,s=0;
  for(let t=0;t<spec.life;t+=.25){
    let a=-at.rho*spec.cd*v*v;
    if(t<spec.burn)a+=spec.acc; else if(spec.sus&&t<spec.burn+spec.sus&&v<spec.vCap)a+=spec.susAcc;
    v+=a*.25; s+=v*.25; S.push(s); V.push(v);
    if(t>spec.burn+(spec.sus||0)&&v<250)break;
  }
  return {S,V};
}
// 20-30 mm cannon rounds: drag grows with speed squared, dv/dt = -GUN_CD*sig*v^2 (fit to PGU-28: ~1.4 s to 1,000 m from 1,030 m/s).
const GUN_CD=7e-4;
function gunTof(d,v0,sig){const c=GUN_CD*(sig||1);return (Math.exp(c*d)-1)/(c*v0)}      // time of flight to range d
function gunDrag(v,sig,dt){return Math.max(0,1-GUN_CD*(sig||1)*v*dt)}                    // multiply the bullet's velocity by this each step
if(typeof module!=='undefined')module.exports={atm,cd0,thrust,flyout,gunTof,gunDrag,clamp,T_IDLE};
