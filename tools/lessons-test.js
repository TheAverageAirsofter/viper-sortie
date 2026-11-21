// New training lessons: FLAPS completes after a held slow turn with flaps out; CCIP completes when the three trucks are destroyed
const assert = require('assert'), path = require('path');
(async () => {
  const b = await require('./launch')(); const errs = [];
  for (const lesson of ['FLAPS', 'CCIP']) {
    const p = await b.newPage({ viewport: { width: 900, height: 420 } });
    await p.addInitScript(l => { try { localStorage.setItem('vsTips', '1'); localStorage.setItem('viperMode', 'free'); localStorage.setItem('viperMission', 'TRAINING'); localStorage.setItem('vsLesson', l); } catch (e) {} }, lesson);
    p.on('pageerror', e => errs.push(e.message)); await p.route(/fonts\.(googleapis|gstatic)\.com/, r => r.abort());
    await p.goto('file://' + path.resolve(__dirname, '../index.html') + '?test&noaq'); await p.waitForTimeout(1500);
    await p.evaluate(() => __vs.wt.begin('F4E')); await p.waitForFunction(() => __vs.state === 'play', null, { timeout: 40000 }); await p.waitForTimeout(1500);
    if (lesson === 'FLAPS') {
      await p.evaluate(() => { const V = __vs, P = V.P; window.__hold = setInterval(() => { P.flaps = 1; P.flapManual = true; P.vel.set(0, 0, 90); P.obj.rotation.z = .6; P.n = 1; }, 50); });   // hold a slow banked turn with flaps out
    } else {
      await p.evaluate(() => { __vs.ground.forEach(g => __vs.killGround(g)); });
    }
    await p.waitForFunction(() => __vs.state === 'dead' || __vs.state === 'over', null, { timeout: 150000 });
    assert.equal(await p.evaluate(() => __vs.deathCause()), 'win', lesson + ' lesson completes');
    await p.close();
  }
  assert.deepEqual(errs, []); console.log('lessons ok'); await b.close();
})().catch(e => { console.error(e); process.exit(1); });
