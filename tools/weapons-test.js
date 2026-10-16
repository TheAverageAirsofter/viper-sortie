// Weapons: missile performance sanity for every type, then live shots: tail-aspect and head-on seekers, Sparrow lock rules, AMRAAM at range, guns. usage: node tools/weapons-test.js
const path = require('path'), assert = require('assert');
(async () => {
  const b = await require('./launch')(); const errs = [];
  const p = await b.newPage({ viewport: { width: 800, height: 400 } }); p.on('pageerror', e => errs.push(e.message));
  await p.addInitScript(() => { try { localStorage.setItem('vsTips', '1'); localStorage.setItem('vsSeen', '1'); localStorage.setItem('viperMode', 'free'); localStorage.setItem('vsWx', 'CLEAR'); localStorage.setItem('vsTime', 'DAY'); } catch (e) {} });
  await p.route(/fonts\.(googleapis|gstatic)\.com/, r => r.abort());
  await p.goto('file://' + path.resolve(__dirname, '../index.html') + '?test&noaq'); await p.waitForTimeout(1500);
  // --- every missile type: a sensible top speed, a flight that reaches its quoted range, minimum range below maximum
  const specs = await p.evaluate(() => { const seen = {}, out = []; for (const id in __vs.AC_DEFS) { const d = __vs.AC_DEFS[id]; for (const [f, s, kind] of [[d.srFull, d.sr, 'ir'], [d.mrFull, d.mr, 'rdr']]) { if (!f || f === 'none' || seen[f]) continue; seen[f] = 1;
    const fo = __vs.flyout(s, 5000, 250); out.push({ f, kind, maxR: s.maxR, minR: s.minR, peak: Math.max(...fo.V), reach: Math.max(...fo.S), gmax: s.gmax, rear: !!s.rear, sarh: !!s.sarh, arh: !!s.arh }); } } return out; });
  for (const s of specs) {
    const mach = s.peak / 320; assert(mach > 1.1 && mach < 5.6, `${s.f} peak speed Mach ${mach.toFixed(1)}`);
    assert(s.minR < s.maxR * .3, s.f + ' minimum range'); assert(s.reach > s.maxR * .45, `${s.f} can reach its quoted range (${Math.round(s.reach)} m flown vs ${s.maxR})`);
    if (s.kind === 'ir') assert(s.maxR <= 20000, s.f + ' heat seeker range'); if (s.rear) assert(s.maxR <= 10000 && s.gmax <= 25, s.f + ' early seeker is weak');
  }
  console.log(specs.length + ' missile types sane');
  const run = async (id, fn) => { await p.evaluate(i => __vs.wt.begin(i), id); await p.waitForTimeout(700); assert.equal(await p.evaluate(() => __vs.wt.clear()), 'play'); return fn(); };
  const st = () => p.evaluate(() => __vs.wt.st());
  const until = async (pred, ms) => { const t0 = Date.now(); let s; while (Date.now() - t0 < ms) { s = await st(); if (pred(s)) return s; await p.waitForTimeout(250); } return s; };
  // --- AIM-9L (all-aspect): tail-on at 4 km locks and kills
  await run('F4F', async () => { await p.evaluate(() => __vs.wt.target('F16', 4000, true, 220)); await p.waitForTimeout(2500);
    let s = await until(x => x.can9, 6000); assert(s.can9, 'AIM-9L locks a target ahead: ' + JSON.stringify(s)); await p.evaluate(() => __vs.wt.fire('9X'));
    s = await until(x => !x.alive, 30000); assert(!s.alive, 'AIM-9L kills the drone'); });
  // --- AIM-9L head-on at 5 km: all-aspect, so it locks too
  await run('F4F', async () => { await p.evaluate(() => __vs.wt.target('F16', 6000, false, 220)); await p.waitForTimeout(2000);
    const s = await until(x => x.can9, 6000); assert(s.can9, 'an all-aspect seeker locks head-on: ' + JSON.stringify(s)); });
  // --- AIM-9B (rear aspect only): refuses a head-on target, accepts a tail-on one
  await run('F104G', async () => { await p.evaluate(() => __vs.wt.target('F16', 2800, false, 220)); await p.waitForTimeout(2200);
    const s = await st(); assert(!s.can9, 'AIM-9B cannot lock head-on: ' + JSON.stringify(s)); });
  await run('F104G', async () => { await p.evaluate(() => __vs.wt.target('F16', 2600, true, 200)); await p.waitForTimeout(2500);
    let s = await until(x => x.can9, 6000); assert(s.can9, 'AIM-9B locks a tail-on target: ' + JSON.stringify(s)); });
  // --- out of range: AIM-9L at 14 km does not fire
  await run('F4F', async () => { await p.evaluate(() => __vs.wt.target('F16', 14000, true, 220)); await p.waitForTimeout(2000); const s = await st(); assert(!s.can9, 'no heat-seeker shot at 14 km'); });
  // --- Sparrow: needs a radar lock (STT), then flies to the target
  await run('F4E', async () => { await p.evaluate(() => __vs.wt.target('F16', 12000, true, 220)); await p.waitForTimeout(2000);
    let s = await st(); assert(!s.can120, 'no Sparrow without a lock'); await p.evaluate(() => __vs.wt.lock()); s = await until(x => x.can120, 8000); assert(s.can120, 'Sparrow ready once locked: ' + JSON.stringify(s));
    await p.evaluate(() => __vs.wt.fire('120')); s = await until(x => !x.alive, 90000); assert(!s.alive, 'Sparrow kills a target it keeps illuminating'); });
  // --- AMRAAM at about 24 km, tail chase
  await run('F16', async () => { await p.evaluate(() => __vs.wt.target('F16B70', 24000, true, 230)); await p.waitForTimeout(2500); await p.evaluate(() => __vs.wt.lock());
    let s = await until(x => x.can120, 9000); assert(s.can120, 'AMRAAM ready at 24 km: ' + JSON.stringify(s)); await p.evaluate(() => __vs.wt.fire('120')); s = await until(x => !x.alive, 150000); assert(!s.alive, 'AIM-120C kills at 24 km'); });
  // --- the gun: a drone 500 m ahead takes hits
  await run('F16', async () => { await p.evaluate(() => __vs.wt.target('F16', 520, true, 245)); await p.waitForTimeout(600); const r0 = (await st()).rounds; await p.evaluate(() => __vs.wt.gun(true));
    const s = await until(x => !x.alive || x.rounds < r0 - 160, 15000); await p.evaluate(() => __vs.wt.gun(false)); assert(s.rounds < r0, 'the gun fires'); assert(!s.alive || s.hp < 3, 'rounds hit the target: ' + JSON.stringify(s)); });
  assert.deepEqual(errs, []); console.log('weapons ok'); await b.close();
})().catch(e => { console.error(e); process.exit(1); });
