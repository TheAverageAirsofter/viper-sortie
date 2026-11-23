// Tank battle: the player drives a ground-war unit, aims, fires, the AI targets it, and the battle ends in a win or a loss
const assert = require('assert'), path = require('path');
(async () => {
  const b = await require('./launch')();
  const p = await b.newPage({ viewport: { width: 900, height: 420 } }); const errs = [];
  await p.addInitScript(() => { try { localStorage.setItem('vsTips', '1'); localStorage.setItem('viperMode', 'free'); localStorage.setItem('viperMission', 'TANK'); localStorage.setItem('vsTank', 'M1A1'); } catch (e) {} });
  p.on('pageerror', e => errs.push(e.message));
  await p.route(/fonts\.(googleapis|gstatic)\.com/, r => r.abort());
  await p.goto('file://' + path.resolve(__dirname, '../index.html') + '?test'); await p.waitForTimeout(1500);
  await p.evaluate(() => __vs.wt.begin('F16')); await p.waitForFunction(() => __vs.state === 'play' && __vs.TNK.on && __vs.TNK.u, null, { timeout: 40000 }); await p.waitForTimeout(800);
  const a = await p.evaluate(() => { const T = __vs.TNK; return { type: T.u.def.n, player: !!T.u.player, ui: !!document.getElementById('tkUI') && !document.getElementById('tkUI').hidden, ctrls: document.getElementById('ctrls').hidden, red: __vs.WAR.units.filter(u => u.team === 'red').length, z: T.u.pos.z }; });
  assert(a.player && a.type === 'M1A1 Abrams' && a.ui && a.ctrls && a.red === 7, 'tank spawned with its own controls: ' + JSON.stringify(a));
  // drive forward with W for two seconds
  await p.keyboard.down('KeyW'); await p.waitForFunction(z0 => Math.hypot(__vs.TNK.u.pos.z - z0) > 3, a.z, { timeout: 20000 }).catch(() => {}); await p.keyboard.up('KeyW');
  const moved = await p.evaluate(z0 => ({ d: __vs.TNK.u.pos.z - z0, v: __vs.TNK.v, clock: __vs.clockNow() }), a.z);
  assert(moved.d > 3, 'W drives the tank forward: ' + JSON.stringify(moved));
  // fire: a shell leaves, then the gun reloads
  await p.keyboard.press('Space'); await p.waitForFunction(() => (__vs.TNK.shots || 0) >= 1, null, { timeout: 8000 }).catch(() => {});   // FIRE ranges and waits for the gun to be laid (up to 1.5 s)
  const f = await p.evaluate(() => ({ sh: __vs.TNK.shots || 0, cd: __vs.TNK.u.cd }));
  assert(f.sh >= 1 && f.cd > 1, 'Space fires a shell and starts the reload: ' + JSON.stringify(f));
  await p.keyboard.press('KeyZ'); await p.waitForTimeout(300);
  assert(await p.evaluate(() => __vs.TNK.zoom), 'Z toggles the gunner sight');
  // a kill by the player's tank is credited
  const k = await p.evaluate(() => { const T = __vs.TNK, r = __vs.WAR.units.find(u => u.team === 'red' && u.alive); r.lastBy = T.u; r.hp = 0; r.hpSeen = 0; __vs.warDie(r, null, 'test'); return T.kills; });
  assert(k === 1, 'kill credited: ' + k);
  // ammo, view, repair, hit result
  await p.keyboard.press('KeyQ'); await p.keyboard.press('KeyV');
  const av = await p.evaluate(() => ({ ammo: __vs.TNK.ammo, view: __vs.TNK.view, he: __vs.TNK.heN }));
  assert(av.ammo === 'HE' && av.view === 1 && av.he > 0, 'Q switches to HE, V to the commander view: ' + JSON.stringify(av));
  await p.evaluate(() => { const T = __vs.TNK; T.u.mod.trk = true; T.u.mod.gun = 1; T.v = 0; T.u.moving = false; });
  await p.keyboard.press('KeyF'); await p.evaluate(() => { __vs.TNK.repT = .05; });
  await p.waitForFunction(() => !__vs.TNK.u.mod.trk && !__vs.TNK.u.mod.gun, null, { timeout: 10000 });
  const hr = await p.evaluate(() => { const r = __vs.WAR.units.find(u => u.team === 'red' && u.alive); __vs.tkResult('PENETRATION', r); return __vs.TNK.res.txt; });
  assert(/PENETRATION/.test(hr), 'hit result banner: ' + hr);
  // knocked out: the next of three tanks rolls out at the start line
  await p.evaluate(() => { const u = __vs.TNK.u; u.hp = 0; __vs.warDie(u, null, 'test'); });
  await p.waitForSelector('#tkPick button', { state: 'visible', timeout: 30000 });
  await p.click('#tkPick button:nth-child(3)');
  const rs = await p.evaluate(() => ({ alive: __vs.TNK.u.alive, lives: __vs.TNK.lives, type: __vs.TNK.u.def.n, used: __vs.TNK.used.length }));
  assert(rs.alive && rs.lives === 2 && rs.used === 2 && rs.type !== 'M1A1 Abrams', 'picked the next tank from the lineup: ' + JSON.stringify(rs));
  // enemy jets come in; shooting one down is credited
  await p.evaluate(() => { __vs.TNK.airT = 0; });
  await p.waitForFunction(() => __vs.TNK.air.filter(a => a.alive).length >= 2, null, { timeout: 15000 });
  const j0 = await p.evaluate(() => __vs.TNK.air[0].pos.clone()); await p.waitForTimeout(1000);
  const jm = await p.evaluate(p0 => { const a = __vs.TNK.air[0]; return Math.hypot(a.pos.x - p0.x, a.pos.z - p0.z); }, j0);
  assert(jm > 5, 'the jets fly: ' + jm);
  const k2 = await p.evaluate(() => { const T = __vs.TNK, k = T.kills; __vs.tkAirDown(T.air[0], T.u); return T.kills - k; });
  assert(k2 === 1, 'jet kill credited');
  // holding point A wins
  await p.evaluate(() => { const T = __vs.TNK; T.hold = 59.9; for (const u of __vs.WAR.units) if (u.team === 'red') u.pos.set(T.zone.x + 5000, u.pos.y, T.zone.z + 5000); T.u.pos.set(T.zone.x, T.u.pos.y, T.zone.z); });
  await p.waitForFunction(() => __vs.deathCause() === 'win', null, { timeout: 8000 });
  assert.deepEqual(errs, []); console.log('tank ok'); await b.close();
})().catch(e => { console.error(e); process.exit(1); });
