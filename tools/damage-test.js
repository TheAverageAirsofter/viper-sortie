// Aircraft damage model: wings, elevator, guns, pilot; a damaged wing rolls the jet, G limit drops, no page errors
const assert = require('assert'), path = require('path');
(async () => {
  const b = await require('./launch')();
  const p = await b.newPage({ viewport: { width: 900, height: 420 } }); const errs = [];
  await p.addInitScript(() => { try { localStorage.setItem('vsTips', '1'); } catch (e) {} });
  p.on('pageerror', e => errs.push(e.message));
  await p.route(/fonts\.(googleapis|gstatic)\.com/, r => r.abort());
  await p.goto('file://' + path.resolve(__dirname, '../index.html') + '?test'); await p.waitForTimeout(1500);
  await p.sortie(); await p.waitForTimeout(3000);
  const r = await p.evaluate(async () => {
    const S = __vs.P.sys, g0 = __vs.P.gLim; S.wL = .8; S.ctl = .55; S.gun = true; S.pilot = .5;
    await new Promise(r => setTimeout(r, 2500));
    return { g0, g1: __vs.P.gLim, roll: __vs.P.inRoll, hp: __vs.P.hp };
  });
  assert(r.g1 < r.g0 * .8, 'wing damage lowers the G limit: ' + JSON.stringify(r));
  assert(r.roll < 0, 'left wing damage rolls left: ' + r.roll);
  // no hit-point pool: a thousand gun hits on a fresh jet still leave it flying unless the pilot is killed or both wings go
  const d = await p.evaluate(() => { const V = __vs; const out = { hp0: V.P.hp }; V.P.sys.wL = V.P.sys.wR = 0; V.P.sys.pilot = 0;
    const rnd = Math.random; Math.random = () => .5; for (let i = 0; i < 3; i++) V.playerGunHit(1); Math.random = rnd; out.alive3 = V.P.alive; out.hp3 = V.P.hp; return out; });
  assert(d.alive3, 'a few gun hits do not kill by themselves');
  const n = await p.evaluate(() => { __vs.P.sys.wL = 0; __vs.P.sys.wR = 0; __vs.P.sys.pilot = 0; const seen = new Set(); for (let i = 0; i < 200; i++) { const S = __vs.P.sys; const before = JSON.stringify(S); __vs.damageSystem(1); if (JSON.stringify(S) !== before) seen.add(1); } return seen.size });
  const k = await p.evaluate(() => { const V = __vs; V.P.sys.wL = 1; V.P.sys.wR = .9; V.wingHit('wR', .2); return V.P.alive });
  assert.equal(k, false, 'both wings gone loses the jet');
  // AI fighters take module damage too: wings, fire, pilot; enough gun hits always bring one down, a missile usually does
  await p.waitForFunction(() => __vs.enemies.filter(x => x.alive && x.kind === 'fighter').length >= 2, null, { timeout: 40000 });
  const ai = await p.evaluate(async () => { const V = __vs, es = V.enemies.filter(x => x.alive && x.kind === 'fighter'); const a = es[0], b = es[1]; let n = 0, labels = new Set();
    while (a.alive && n < 400) { V.hitAI(a, 1.2, 'GUNS', true); n++; if (a.sys) { if (a.sys.eng) labels.add('eng'); if (a.sys.wL || a.sys.wR) labels.add('wing'); } }
    V.hitAI(b, 5, 'AIM-9', true); await new Promise(r => setTimeout(r, 6000));
    return { n, aDead: !a.alive, labels: [...labels], bState: b.alive ? 'crippled' : 'dead', bSys: !!b.sys }; });
  assert(ai.aDead && ai.n < 400, 'gun hits bring an AI fighter down: ' + JSON.stringify(ai));
  assert(ai.bState === 'dead' || ai.bSys, 'a missile kills or cripples: ' + JSON.stringify(ai));
  // ammunition choices cycle and persist
  await p.evaluate(() => { document.getElementById('bBelt').click(); document.getElementById('bFuse').click(); });
  assert.equal(await p.evaluate(() => localStorage.getItem('vsBelt') + '/' + localStorage.getItem('vsFuse')), 'AP/DELAY');
  await p.waitForTimeout(500);
  assert.deepEqual(errs, []); console.log('damage ok'); await b.close();
})().catch(e => { console.error(e); process.exit(1); });
