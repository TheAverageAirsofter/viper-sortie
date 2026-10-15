// Behavioural checks of the flight model and launch zones, driven through the ?test hook with the game paused. usage: node tools/sim-test.js
const path = require('path'), assert = require('assert');
(async () => {
  const b = await require('./launch')();
  const p = await b.newPage({ viewport: { width: 900, height: 420 } }); const errs = []; await p.addInitScript(() => { try { localStorage.setItem('vsTips', '1'); } catch (e) {} });
  p.on('pageerror', e => errs.push(e.message));
  await p.route(/fonts\.(googleapis|gstatic)\.com/, r => r.abort());
  await p.goto('file://' + path.resolve(__dirname, '../index.html') + '?test'); await p.waitForTimeout(1500);
  await p.click('#bStart'); await p.waitForTimeout(1500); await p.click('#bPause'); await p.waitForTimeout(500);
  const r = await p.evaluate(() => {
    const { P, fly, dlz, AC_DEFS, V3 } = __vs, out = {};
    const reset = (v, y) => { P.pos.set(0, y, 0); P.obj.quaternion.identity(); P.vel.set(0, 0, v); P.n = 1; P.gLim = 9; };
    reset(220, 5000); for (let i = 0; i < 600; i++) fly(P, .02, 0, 0, 0, .8, false);
    out.level = { v: P.vel.length(), y: P.pos.y, n: P.n, mach: P.mach };
    reset(260, 5000); let maxN = 0, v0 = P.vel.length(); for (let i = 0; i < 150; i++) { fly(P, .02, 0, 1, 0, 1, false); maxN = Math.max(maxN, P.n); }
    out.pull = { maxN, gLim: P.gLim, vLoss: v0 - P.vel.length() };
    reset(250, 8000); for (let i = 0; i < 150; i++) fly(P, .02, 0, 0, 0, 1, false); out.ab = { v: P.vel.length() };
    reset(250, 8000); for (let i = 0; i < 150; i++) fly(P, .02, 0, 0, 0, 0, false); out.idle = { v: P.vel.length() };
    const spec = AC_DEFS.F16.mr, sh = { pos: new V3(0, 8000, 0), vel: new V3(0, 0, 400) };
    const mk = vz => ({ pos: new V3(0, 8000, 30000), vel: new V3(0, 0, vz) });
    out.dlz = { head: dlz(spec, sh, mk(-250)), tail: dlz(spec, sh, mk(250)) };
    return out;
  });
  assert.ok(Number.isFinite(r.level.v) && r.level.v > 120 && r.level.v < 600, 'level speed sane ' + r.level.v);
  assert.ok(Math.abs(r.level.y - 5000) < 700, 'level flight holds altitude ' + r.level.y);
  assert.ok(r.pull.maxN <= r.pull.gLim + .01 && r.pull.maxN > 4, 'pull limited by gLim ' + JSON.stringify(r.pull));
  assert.ok(r.pull.vLoss > 0, 'hard turns bleed speed');
  assert.ok(r.ab.v > r.idle.v, 'afterburner out-accelerates idle');
  console.log(JSON.stringify(r.dlz)); assert.ok(r.dlz.head.rmax >= r.dlz.tail.rmax, 'head-on shot reaches at least as far as a tail chase');
  assert.ok(r.dlz.head.rne <= r.dlz.head.rmax + 1 && r.dlz.head.rmax > 0, 'no-escape range within max range');
  assert.deepEqual(errs, []); console.log('sim ok', JSON.stringify({ level: r.level, pull: r.pull, dlz: { head: r.dlz.head.rmax | 0, tail: r.dlz.tail.rmax | 0 } })); await b.close();
})().catch(e => { console.error(e); process.exit(1); });
