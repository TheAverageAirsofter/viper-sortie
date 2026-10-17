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
  const n = await p.evaluate(() => { __vs.P.sys.wL = 0; __vs.P.sys.wR = 0; const seen = new Set(); for (let i = 0; i < 200; i++) { const S = __vs.P.sys; const before = JSON.stringify(S); __vs.damageSystem(1); if (JSON.stringify(S) !== before) seen.add(1); } return seen.size });
  await p.waitForTimeout(500);
  assert.deepEqual(errs, []); console.log('damage ok'); await b.close();
})().catch(e => { console.error(e); process.exit(1); });
