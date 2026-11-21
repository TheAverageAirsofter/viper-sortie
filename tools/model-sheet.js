// Model contact sheet: renders each aircraft in a three-quarter, side and top view so the shapes can be compared with photos.
// usage: node tools/model-sheet.js OUTDIR ID1,ID2,...   (writes OUTDIR/sheet_<ID>.png)
const path = require('path'), fs = require('fs');
(async () => {
  const out = process.argv[2], ids = (process.argv[3] || 'F16').split(',');
  const b = await require('./launch')();
  const p = await b.newPage({ viewport: { width: 1200, height: 400 } });
  p.on('pageerror', e => console.log('ERR', e.message));
  await p.addInitScript(() => { try { localStorage.setItem('vsTips', '1'); } catch (e) {} });
  await p.route(/fonts\.(googleapis|gstatic)\.com/, r => r.abort());
  await p.goto('file://' + path.resolve(__dirname, '../index.html') + '?test'); await p.waitForTimeout(1500);
  for (const id of ids) {
    const url = await p.evaluate(id => {
      const T = THREE, W = 1200, H = 400, r = new T.WebGLRenderer({ antialias: true, preserveDrawingBuffer: true }); r.setSize(W, H); r.setClearColor(0xd8dde2);
      const sc = new T.Scene(); sc.add(new T.HemisphereLight(0xffffff, 0x8a9096, 2.2)); const dl = new T.DirectionalLight(0xffffff, 3.2); dl.position.set(-4, 8, 6); sc.add(dl);
      const j = id.startsWith('g:') ? __vs[id.slice(2)]() : __vs.buildJet(__vs.PLAYER_COLORS, id); j.traverse(o => { if (o.name === 'haze' || o.name === 'flame') o.visible = false; }); sc.add(j);
      const bb = new T.Box3().setFromObject(j), c = bb.getCenter(new T.Vector3()), s = bb.getSize(new T.Vector3()), R = Math.max(s.x, s.z) * .52;
      const views = [[new T.Vector3(-1, .55, 1.1), 'persp'], [new T.Vector3(-1, 0, 0), 'side'], [new T.Vector3(0, 1, 0.0001), 'top']];
      r.setScissorTest(true);
      views.forEach(([d, k], i) => { const x = i * 400; r.setViewport(x, 0, 400, 400); r.setScissor(x, 0, 400, 400);
        const cam = k === 'persp' ? new T.PerspectiveCamera(22, 1, .1, 500) : new T.OrthographicCamera(-R, R, R, -R, .1, 500);
        cam.position.copy(c).addScaledVector(d.normalize(), k === 'persp' ? R * 3.9 : 100); if (k === 'top') cam.up.set(0, 0, 1); cam.lookAt(c); r.render(sc, cam); });
      return r.domElement.toDataURL('image/png'); }, id);
    fs.writeFileSync(path.join(out, 'sheet_' + id.replace(':', '_') + '.png'), Buffer.from(url.split(',')[1], 'base64')); console.log('wrote', id);
  }
  await b.close();
})().catch(e => { console.error(e); process.exit(1); });
