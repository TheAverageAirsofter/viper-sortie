// Flaps, stall warning and spin: a spin-prone jet departs when slow, nose high and held in full roll + rudder, and recovers once the controls are centred and speed builds; an F-16 does not depart
const assert = require('assert'), path = require('path');
(async () => {
  const b = await require('./launch')();
  const p = await b.newPage({ viewport: { width: 900, height: 420 } }); const errs = [];
  await p.addInitScript(() => { try { localStorage.setItem('vsTips', '1'); localStorage.setItem('viperMode', 'free'); } catch (e) {} });
  p.on('pageerror', e => errs.push(e.message));
  await p.route(/fonts\.(googleapis|gstatic)\.com/, r => r.abort());
  await p.goto('file://' + path.resolve(__dirname, '../index.html') + '?test&noaq'); await p.waitForTimeout(1500);
  const run = async id => { await p.evaluate(i => __vs.wt.begin(i), id); await p.waitForTimeout(900);
    return p.evaluate(() => { const V = __vs, P = V.P; P.pos.set(0, 6000, 0); P.vel.set(0, 25, 62); P.obj.lookAt(0, 6600, 700); const out = {};
      for (let i = 0; i < 160; i++) V.fly(P, .02, 1, 1, 1, .3, false); out.spun = !!P.spin;
      for (let i = 0; i < 4000 && P.spin; i++) { V.fly(P, .02, 0, 0, 0, .8, false); if (P.pos.y < 200) break } out.recovered = !P.spin; out.alt = Math.round(P.pos.y); return out; }); };
  const old = await run('F4E'); assert(old.spun, 'a Phantom departs: ' + JSON.stringify(old)); assert(old.recovered, 'and recovers with the controls centred: ' + JSON.stringify(old));
  const fbw = await run('F16'); assert(!fbw.spun, 'an F-16 does not depart: ' + JSON.stringify(fbw));
  // flaps: landing flaps raise the lift limit and add drag
  const fl = await p.evaluate(() => { const V = __vs, P = V.P; P.vel.set(0, 0, 90); P.obj.quaternion.identity(); P.flaps = 0; P.gear = false; V.fly(P, .02, 0, 0, 0, .5, false); const n0 = P.nAero; P.flaps = 1; V.fly(P, .02, 0, 0, 0, .5, false); return { n0, n1: P.nAero }; });
  assert(fl.n1 > fl.n0 * 1.05, 'combat flaps lift: ' + JSON.stringify(fl));
  assert.deepEqual(errs, []); console.log('stall ok'); await b.close();
})().catch(e => { console.error(e); process.exit(1); });
