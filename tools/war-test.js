// Ground war: the CAS mission starts, blue and red armour trade shells on their own, kills reach the feed, and the mission can be won. usage: node tools/war-test.js
const path = require('path'), assert = require('assert');
(async () => {
  const b = await require('./launch')(); const errs = [];
  const p = await b.newPage({ viewport: { width: 800, height: 400 } }); p.on('pageerror', e => errs.push(e.message));
  await p.addInitScript(() => { try { localStorage.setItem('vsTips', '1'); localStorage.setItem('vsSeen', '1'); localStorage.setItem('viperMission', 'GROUNDWAR'); } catch (e) {} });
  await p.route(/fonts\.(googleapis|gstatic)\.com/, r => r.abort());
  await p.goto('file://' + path.resolve(__dirname, '../index.html') + '?test&noaq'); await p.waitForTimeout(1500);
  await p.sortie(); await p.waitForTimeout(2000);
  const s0 = await p.evaluate(() => ({ st: __vs.state, on: __vs.WAR.on, red: __vs.warAlive('red'), blue: __vs.warAlive('blue') }));
  assert.equal(s0.st, 'play'); assert(s0.on && s0.red >= 8 && s0.blue >= 6, 'both forces spawn ' + JSON.stringify(s0));
  // damage modules: heavy hits break tracks, engine, gun, turret drive and crew, start fires, and can detonate the ammunition
  const mods = await p.evaluate(() => { const V = __vs, seen = { trk: 0, eng: 0, gun: 0, tur: 0, crew: 0, fire: 0 }; let dead = 0, popped = 0;
    for (let n = 0; n < 40; n++) { const u = V.warSpawn('T80B', 100 + n * 60, 100, 0); for (let k = 0; k < 4 && u.alive; k++) V.warModules(u, 3, null);
      const m = u.mod; if (m.trk) seen.trk++; if (m.eng) seen.eng++; if (m.gun) seen.gun++; if (m.tur) seen.tur++; if (m.crew < u.def.crew) seen.crew++; if (m.fire) seen.fire++; if (!u.alive) dead++; if (!u.alive && u.obj.userData.tur.parent !== u.obj) popped++; }
    return { seen, dead, popped, flags: V.warFlags({ mod: { trk: true, eng: false, gun: 1, tur: false, fire: true, crew: 2 }, def: { crew: 3 } }) }; });
  assert(mods.seen.crew > 0 && mods.seen.trk > 0 && mods.seen.eng > 0 && mods.seen.gun > 0 && mods.seen.tur > 0 && mods.dead > 0, 'every module breaks and some vehicles die ' + JSON.stringify(mods));
  assert.equal(mods.flags, 'TRK GUN CREW 2/3 FIRE');
  // the Gepard covers the blue force: a bandit parked over it takes fire
  const aa = await p.evaluate(() => { const V = __vs, g = V.warSpawn('GEPARD', 3000, 3000, 0), e = V.enemies.find(x => x.alive && x.kind === 'fighter'); if (!g || !e) return { skip: true };
    const hp0 = e.hp; for (let i = 0; i < 300 && e.alive && e.hp >= hp0; i++) { e.pos.set(g.pos.x + 600, g.pos.y + 900, g.pos.z); V.updateWar(.1); } return { hit: !e.alive || e.hp < hp0 }; });
  assert(aa.skip || aa.hit, 'the Gepard shoots at a bandit overhead ' + JSON.stringify(aa));
  // let them fight with nobody helping: shells must fly and somebody must die
  const r = await p.evaluate(() => { const V = __vs; let shells = 0, lost0 = V.warAlive('red') + V.warAlive('blue');
    for (let i = 0; i < 4000; i++) { V.updateWar(.1); shells = Math.max(shells, V.WAR.sh.filter(s => s.on).length); }
    return { shells, lost: lost0 - (V.warAlive('red') + V.warAlive('blue')) }; });
  assert(r.shells > 0, 'shells are fired'); assert(r.lost > 0, 'vehicles are destroyed by other vehicles ' + JSON.stringify(r));
  // killing every red vehicle (as bombs would) wins the mission
  await p.evaluate(() => { __vs.WAR.units.filter(u => u.team === 'red').forEach(u => { u.alive = false; }); });
  await p.waitForTimeout(1500);
  assert.notEqual(await p.evaluate(() => __vs.state), 'play', 'mission ends when the red force is gone');
  assert.deepEqual(errs, []); console.log('war ok ' + JSON.stringify(r)); await b.close();
})().catch(e => { console.error(e); process.exit(1); });
