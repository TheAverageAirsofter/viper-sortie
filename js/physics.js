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

if(typeof module!=='undefined')module.exports={atm,cd0,thrust,clamp,T_IDLE};
