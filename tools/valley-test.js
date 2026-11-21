// Valley strike: route and gates, dormant SAMs, the radar ceiling gives you away, both bunkers trigger the egress, home safe wins
const assert = require('assert'), path = require('path');
(async () => {
  const b = await require('./launch')();
  const p = await b.newPage({ viewport: { width: 900, height: 420 } }); const errs = [];
  await p.addInitScript(() => { try { localStorage.setItem('vsTips', '1'); localStorage.setItem('viperMode', 'free'); localStorage.setItem('viperMission', 'VALLEY'); localStorage.setItem('viperAC', 'F16'); } catch (e) {} });
  p.on('pageerror', e => errs.push(e.message));
  await p.route(/fonts\.(googleapis|gstatic)\.com/, r => r.abort());
  await p.goto('file://' + path.resolve(__dirname, '../index.html') + '?test'); await p.waitForTimeout(1500);
  await p.evaluate(() => __vs.wt.begin('F16')); await p.waitForFunction(() => __vs.state === 'play' && __vs.sortie && __vs.sortie.kind === 'VALLEY', null, { timeout: 40000 }); await p.waitForTimeout(800);
  const a = await p.evaluate(() => { const V = __vs, S = V.sortie; return { gates: V.valRings().length, route: S.route.length, sams: S.sams.length, dormant: S.sams.every(g => g.dormant), bunkers: V.ground.filter(g => g.objective).length,
    low: V.P.pos.y, enemies: V.enemies.length, ewr: !!S.ewr, det: S.det }; });
  assert(a.gates >= 5 && a.route >= 10, 'a valley route with gates: ' + JSON.stringify(a));
  assert(a.sams === 3 && a.dormant && a.bunkers === 2 && a.enemies === 0, 'quiet SAMs, two bunkers, no fighters yet: ' + JSON.stringify(a));
  // climb above the radar ceiling in sight of the early-warning radar: detection fills and the defences wake
  await p.evaluate(() => { const V = __vs, S = V.sortie; V.P.pos.set(S.ewr.pos.x, S.ewr.pos.y + 3000, S.ewr.pos.z - 12000); });
  await p.waitForFunction(() => __vs.sortie.comp, null, { timeout: 15000 });
  const c = await p.evaluate(() => { const S = __vs.sortie; return { comp: S.comp, awake: S.sams.every(g => !g.dormant), enemies: __vs.enemies.length }; });
  assert(c.comp && c.awake && c.enemies === 2, 'detected: SAMs up and a pair scrambles: ' + JSON.stringify(c));
  // destroy both bunkers, then fly home
  await p.evaluate(() => { for (const g of __vs.ground) if (g.objective) __vs.killGround(g); });
  await p.waitForFunction(() => __vs.sortie.phase === 'out', null, { timeout: 5000 });
  await p.evaluate(() => { const P = __vs.P; P.pos.set(0, 3000, 5000); for (const e of __vs.enemies) e.pos.set(0, 9000, 60000); });
  await p.waitForFunction(() => __vs.deathCause() === 'win', null, { timeout: 10000 });
  assert.deepEqual(errs, []); console.log('valley ok'); await b.close();
})().catch(e => { console.error(e); process.exit(1); });
