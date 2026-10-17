// Air battle: teams spawn, zones capture, the player is shot down, spectates, respawns from the lineup, and the battle ends on points
const assert = require('assert'), path = require('path');
(async () => {
  const b = await require('./launch')();
  const p = await b.newPage({ viewport: { width: 900, height: 420 } }); const errs = [];
  await p.addInitScript(() => { try { localStorage.setItem('vsTips', '1'); localStorage.setItem('viperMission', 'BATTLE'); } catch (e) {} });
  p.on('pageerror', e => errs.push(e.message));
  await p.route(/fonts\.(googleapis|gstatic)\.com/, r => r.abort());
  await p.goto('file://' + path.resolve(__dirname, '../index.html') + '?test'); await p.waitForTimeout(1500);
  await p.sortie(); await p.waitForTimeout(3000);
  const s = await p.evaluate(() => ({ on: __vs.BT.on, z: __vs.BT.zones.length, f: __vs.BT.lineup.length, e: __vs.enemies.length, st: __vs.state }));
  assert(s.on && s.z === 3 && s.f >= 1 && s.e === 4 && s.st === 'play', JSON.stringify(s));
  // holding a zone alone captures it
  await p.evaluate(() => { const z = __vs.BT.zones[0]; __vs.P.pos.set(z.x, 4000, z.z); __vs.enemies.forEach(e => { e.pos.set(0, 4000, 60000) }); });
  await p.waitForFunction(() => __vs.BT.zones[0].prog > .15, null, { timeout: 40000 });
  // shot down: lineup picker appears, battle keeps going
  await p.evaluate(() => __vs.die('shot'));
  await p.waitForSelector('#btPick:not([hidden]) button:not([disabled])', { timeout: 40000 });
  assert.equal(await p.evaluate(() => __vs.state), 'dead');
  const pts0 = await p.evaluate(() => __vs.BT.pts.blue);
  await p.click('#btPick button:not([disabled])');
  await p.waitForFunction(() => __vs.state === 'play' && __vs.P.alive, null, { timeout: 10000 });
  await p.waitForTimeout(1500);
  // points run out: the debrief follows
  await p.evaluate(() => { __vs.BT.pts.red = .2; __vs.BT.zones.forEach(z => { z.own = 1; }); });
  await p.waitForFunction(() => __vs.state === 'over', null, { timeout: 40000 });
  // combined arms: the tank fight sits on zone A and armour kills cost points
  const p2 = await b.newPage({ viewport: { width: 900, height: 420 } });
  await p2.addInitScript(() => { try { localStorage.setItem('vsTips', '1'); localStorage.setItem('viperMission', 'COMBINED'); } catch (e) {} });
  p2.on('pageerror', e => errs.push(e.message)); await p2.route(/fonts\.(googleapis|gstatic)\.com/, r => r.abort());
  await p2.goto('file://' + path.resolve(__dirname, '../index.html') + '?test'); await p2.waitForTimeout(1500);
  await p2.sortie(); await p2.waitForTimeout(3000);
  const c = await p2.evaluate(() => { const V = __vs, red = V.WAR.units.find(u => u.team === 'red' && u.alive); const z = V.BT.zones[0], d = Math.hypot(red.pos.x - z.x, red.pos.z - z.z); const before = V.BT.pts.red; V.warDie(red, null, 'test'); return { on: V.BT.on, g: V.BT.ground, war: V.WAR.on, d, drop: before - V.BT.pts.red }; });
  assert(c.on && c.g && c.war && c.d < 4500 && c.drop >= 6, 'combined arms: ' + JSON.stringify(c));
  assert.deepEqual(errs, []); console.log('battle ok'); await b.close();
})().catch(e => { console.error(e); process.exit(1); });
