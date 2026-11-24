// usage: node tools/review-sheet.js OUTDIR F16,SU27  (six views per jet: 3/4 front, side, top with the nose to the right, head-on, rear 3/4, low 3/4; missiles and decals hidden)
// review sheet: 3/4 front, side, top, head-on, rear 3/4, belly-ish; missiles off so shapes read clearly
const path=require('path'),fs=require('fs');
(async()=>{const out=process.argv[2],ids=process.argv[3].split(',');const b=await require('./launch')();const p=await b.newPage({viewport:{width:1500,height:1050}});
p.on('pageerror',e=>console.log('ERR',e.message));await p.route(/fonts\./,r=>r.abort());
await p.goto('file://'+path.resolve(__dirname,'../index.html')+'?test');await p.waitForTimeout(1500);
for(const id of ids){const url=await p.evaluate(id=>{const T=THREE,W=1500,H=1050,r=new T.WebGLRenderer({antialias:true,preserveDrawingBuffer:true});r.setSize(W,H);r.setClearColor(0xd8dde2);
 const sc=new T.Scene();sc.add(new T.HemisphereLight(0xffffff,0x8a9096,2.0));const dl=new T.DirectionalLight(0xffffff,3.0);dl.position.set(-4,8,6);sc.add(dl);
 const j=__vs.buildJet(__vs.PLAYER_COLORS,id);j.traverse(o=>{if(o.name==='haze'||o.name==='flame'||o.name==='decal')o.visible=false;if(o.isMesh&&o.geometry&&o.geometry.userData&&o.geometry.userData.msl)o.visible=false});sc.add(j);
 j.traverse(o=>{if(o.isMesh&&o.material&&o.material.vertexColors&&!o.material.map)o.visible=false});
 j.updateMatrixWorld(true);const bb=new T.Box3(),vis=o=>{for(let q=o;q;q=q.parent)if(!q.visible)return false;return true};j.traverse(o=>{if(o.isMesh&&vis(o)&&o.name!=='flame')bb.expandByObject(o)});const c=bb.getCenter(new T.Vector3()),s=bb.getSize(new T.Vector3()),R=Math.max(s.x,s.z)*.5;
 const V=[[new T.Vector3(-1,.5,1.2),'p'],[new T.Vector3(-1,0,0),'o'],[new T.Vector3(0,1,.0001),'t'],[new T.Vector3(.0001,0,1),'o'],[new T.Vector3(1,.45,-1.1),'p'],[new T.Vector3(-1,-.6,.7),'p']];
 r.setScissorTest(true);V.forEach(([d,k],i)=>{const x=(i%2)*750,y=700-Math.floor(i/2)*350;r.setViewport(x,y,750,350);r.setScissor(x,y,750,350);
  const cam=k==='p'?new T.PerspectiveCamera(20,750/350,.1,500):new T.OrthographicCamera(-R*1.07,R*1.07,R*.5,-R*.5,.1,500);
  cam.position.copy(c).addScaledVector(d.normalize(),k==='p'?R*2.45:100);if(k==='t')cam.up.set(1,0,0);cam.lookAt(c);r.render(sc,cam)});
 return r.domElement.toDataURL('image/png')},id);
 fs.writeFileSync(path.join(out,id+'.png'),Buffer.from(url.split(',')[1],'base64'));}
await b.close()})().catch(e=>{console.error(e);process.exit(1)});
