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
