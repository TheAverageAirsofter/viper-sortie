// Radar sub-modes: PD loses a beaming target, MTI is harder to notch (shorter range), SRC hides low targets in ground clutter; older radars are always SRC
const assert = require('assert'), path = require('path');
(async () => {
  const b = await require('./launch')();
  const p = await b.newPage({ viewport: { width: 900, height: 420 } }); const errs = [];
  await p.addInitScript(() => { try { localStorage.setItem('vsTips', '1'); localStorage.setItem('viperMode', 'free'); } catch (e) {} });
  p.on('pageerror', e => errs.push(e.message));
  await p.route(/fonts\.(googleapis|gstatic)\.com/, r => r.abort());
  await p.goto('file://' + path.resolve(__dirname, '../index.html') + '?test&noaq'); await p.waitForTimeout(1500);
  await p.evaluate(() => __vs.wt.begin('F16')); await p.waitForTimeout(1500);
  const r = await p.evaluate(() => { const V = __vs, P = V.P; P.pos.set(0, 6000, 0); const mk = (vx, y) => ({ pos: new V.V3(10000, y, 0), vel: new V.V3(vx, 0, 200) }); const out = {};
    V.R.sub = 'PD'; out.pdSub = V.radarSub(); out.pdSlow = V.radarBlind(mk(20, 4000)); out.pdFast = V.radarBlind(mk(150, 4000));
    V.cycleRadarSub(); out.mtiSub = V.radarSub(); out.mtiSlow = V.radarBlind(mk(20, 4000)); out.mtiBeam = V.radarBlind(mk(5, 4000));
    V.cycleRadarSub(); out.srcSub = V.radarSub(); P.pos.set(0, 600, 0); P.fwd.set(0, -.5, .87).normalize(); out.clutter = V.clutter(); out.srcLow = V.radarBlind(mk(150, 300)); out.srcHigh = V.radarBlind(mk(150, 3000));
    return out; });
  assert(r.pdSub === 'PD' && r.pdSlow === true && r.pdFast === false, 'PD notch: ' + JSON.stringify(r));
  assert(r.mtiSub === 'MTI' && r.mtiSlow === false && r.mtiBeam === true, 'MTI is harder to notch: ' + JSON.stringify(r));
  assert(r.srcSub === 'SRC' && r.clutter > .4 && r.srcLow === true && r.srcHigh === false, 'SRC clutter hides low targets: ' + JSON.stringify(r));
  await p.evaluate(() => __vs.wt.begin('MIG21')); await p.waitForTimeout(1500);
  assert.equal(await p.evaluate(() => __vs.radarSub()), 'SRC', 'older radars have no Doppler modes');
  assert.deepEqual(errs, []); console.log('radar ok'); await b.close();
})().catch(e => { console.error(e); process.exit(1); });
