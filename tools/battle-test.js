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
  await p.waitForFunction(() => __vs.BT.zones[0].prog > .15, null, { timeout: 100000 });
  await p.evaluate(() => { for (let i = 0; i < 4; i++) __vs.btConditions(false); });   // the weather and light drift without errors
  // shot down: lineup picker appears, battle keeps going
  await p.evaluate(() => __vs.die('shot'));
  await p.waitForSelector('#btPick:not([hidden]) button:not([disabled])', { timeout: 100000 });
  assert.equal(await p.evaluate(() => __vs.state), 'dead');
  const pts0 = await p.evaluate(() => __vs.BT.pts.blue);
  await p.click('#btPick button:not([disabled])');
  await p.waitForFunction(() => __vs.state === 'play' && __vs.P.alive, null, { timeout: 10000 });
  await p.waitForTimeout(1500);
  // points run out: the debrief follows
  await p.evaluate(() => { __vs.BT.pts.red = .2; __vs.BT.zones.forEach(z => { z.own = 1; }); });
  await p.waitForFunction(() => __vs.state === 'over', null, { timeout: 100000 });
  // combined arms: the tank fight sits on zone A and armour kills cost points
  await p.close();
  const p2 = await b.newPage({ viewport: { width: 900, height: 420 } });
  await p2.addInitScript(() => { try { localStorage.setItem('vsTips', '1'); localStorage.setItem('viperMission', 'COMBINED'); } catch (e) {} });
  p2.on('pageerror', e => errs.push(e.message)); await p2.route(/fonts\.(googleapis|gstatic)\.com/, r => r.abort());
  await p2.goto('file://' + path.resolve(__dirname, '../index.html') + '?test'); await p2.waitForTimeout(1500);
  await p2.sortie(); await p2.waitForTimeout(3000);
  const c = await p2.evaluate(() => { const V = __vs, red = V.WAR.units.find(u => u.team === 'red' && u.alive); const z = V.BT.zones[0], d = Math.hypot(red.pos.x - z.x, red.pos.z - z.z); const before = V.BT.pts.red; V.warDie(red, null, 'test'); return { on: V.BT.on, g: V.BT.ground, war: V.WAR.on, d, drop: before - V.BT.pts.red }; });
  assert(c.on && c.g && c.war && c.d < 4500 && c.drop >= 6, 'combined arms: ' + JSON.stringify(c));
  // naval battle: three frigates, sinking one costs the enemy 100 points, a frigate afloat bleeds yours
  await p2.close();
  const p3 = await b.newPage({ viewport: { width: 900, height: 420 } });
  await p3.addInitScript(() => { try { localStorage.setItem('vsTips', '1'); localStorage.setItem('viperMission', 'NAVAL'); localStorage.setItem('viperAC', 'FA18E'); } catch (e) {} });
  p3.on('pageerror', e => errs.push(e.message)); await p3.route(/fonts\.(googleapis|gstatic)\.com/, r => r.abort());
  await p3.goto('file://' + path.resolve(__dirname, '../index.html') + '?test'); await p3.waitForTimeout(1500);
  await p3.sortie(); await p3.waitForTimeout(3000);
  const n = await p3.evaluate(() => { const V = __vs, g = V.BT.ships; const b0 = V.BT.pts.blue, r0 = V.BT.pts.red; V.killGround(V.BT.ships[0]); return { n: g.length, naval: V.BT.naval, drop: r0 - V.BT.pts.red, left: g.filter(x => x.alive).length }; });
  assert(n.naval && n.n === 3 && n.drop >= 100 && n.left === 2, 'naval setup and a sinking: ' + JSON.stringify(n));
  assert(await p3.evaluate(() => __vs.P.onDeck), 'a carrier jet launches from the deck in the naval battle');
  await p3.waitForTimeout(1500);
  // online team match logic (no room needed): zones count real pilots, kills cost points, a lost jet offers the lineup
  await p3.close();
  const p4 = await b.newPage({ viewport: { width: 900, height: 420 } });
  await p4.addInitScript(() => { try { localStorage.setItem('vsTips', '1'); localStorage.setItem('viperMission', 'ONLINE'); localStorage.setItem('vsNetMode', 'TEAMS'); } catch (e) {} });
  p4.on('pageerror', e => errs.push(e.message)); await p4.route(/fonts\.(googleapis|gstatic)\.com/, r => r.abort());
  await p4.goto('file://' + path.resolve(__dirname, '../index.html') + '?test'); await p4.waitForTimeout(1500);
  await p4.evaluate(() => { document.getElementById('bStart').click(); });
  await p4.waitForFunction(() => __vs.state === 'play' && __vs.BT.on && __vs.BT.online, null, { timeout: 60000 });
  const on = await p4.evaluate(() => { const V = __vs, N = V.NET; N.me = 'me'; N.team = 'B'; N.roster.clear(); N.roster.set('me', { ac: 'F16', md: 'TEAMS', tm: 'B', sk: 0, sd: 0, a: 1 }); N.roster.set('foe', { ac: 'F4E', md: 'TEAMS', tm: 'R', sk: 0, sd: 0, a: 1 });
    const z = V.BT.zones[0]; V.P.pos.set(z.x, 4000, z.z); return { z: V.BT.zones.length, lineup: V.BT.lineup.length, sp: V.BT.sp }; });
  assert(on.z === 3 && on.lineup >= 1 && on.sp < 20, 'online battle state: ' + JSON.stringify(on));
  await p4.waitForFunction(() => __vs.BT.zones[0].prog > .1, null, { timeout: 100000 });
  const kp = await p4.evaluate(() => { const V = __vs; const before = V.BT.pts.red; V.NET.roster.get('me').sk = 3; return before; });
  await p4.waitForFunction(b0 => __vs.BT.pts.red < b0 - 30, kp, { timeout: 60000 });
  await p4.evaluate(() => __vs.die('shot'));
  await p4.waitForSelector('#btPick:not([hidden]) button:not([disabled])', { timeout: 100000 });
  assert.deepEqual(errs, []); console.log('battle ok'); await b.close();
})().catch(e => { console.error(e); process.exit(1); });
