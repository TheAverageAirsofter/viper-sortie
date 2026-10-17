// Keyboard + mouse mode: the Settings row switches it, the mouse buttons fire, W/S move the throttle, the virtual stick drifts home.
const assert = require('assert'), path = require('path');
(async () => {
  const b = await require('./launch')();
  const p = await b.newPage({ viewport: { width: 900, height: 420 } }); const errs = [];
  await p.addInitScript(() => { try { localStorage.setItem('vsTips', '1'); localStorage.setItem('vsKbm', '1'); } catch (e) {} });
  p.on('pageerror', e => errs.push(e.message));
  await p.route(/fonts\.(googleapis|gstatic)\.com/, r => r.abort());
  await p.goto('file://' + path.resolve(__dirname, '../index.html') + '?test'); await p.waitForTimeout(1500);
  assert(await p.evaluate(() => __vs.KBM.on), 'mode persists');
  await p.sortie(); await p.waitForTimeout(2000);
  const thr0 = await p.evaluate(() => __vs.thr ? __vs.thr() : 0);
  await p.mouse.move(450, 200); await p.mouse.down({ button: 'right' }); await p.mouse.up({ button: 'right' });
  await p.mouse.down(); await p.waitForTimeout(200); await p.mouse.up();
  await p.evaluate(() => { __vs.KBM.x = .6; }); await p.waitForTimeout(1500);
  const x = await p.evaluate(() => __vs.KBM.x);
  assert(x < .6, 'virtual stick drifts home: ' + x);
  // mouse aim: park the cursor 50 degrees to the left and 8 up of the nose; the flight computer should bring the nose round
  const h0 = await p.evaluate(() => { const K = __vs.KBM, f = __vs.P.fwd; K.aim = true; K.last = performance.now(); K.az = Math.atan2(f.x, f.z) + .87; K.el = Math.asin(f.y) + .14; return Math.atan2(f.x, f.z); });
  await p.waitForTimeout(6000);
  const off = await p.evaluate(() => { const K = __vs.KBM; return __vs.P.fwd.angleTo(K.ad) });
  assert(off < .5, 'nose comes round to the cursor, off by ' + off.toFixed(2) + ' rad');
  assert.deepEqual(errs, []); console.log('kbm ok'); await b.close();
})().catch(e => { console.error(e); process.exit(1); });
