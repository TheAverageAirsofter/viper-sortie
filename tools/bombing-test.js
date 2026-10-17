// Ballistic computer: rocket pods fire a ripple and land; CCRP drops the bomb by itself when the impact point reaches the target; sight and weapon cycling
const assert = require('assert'), path = require('path');
(async () => {
  const b = await require('./launch')();
  const p = await b.newPage({ viewport: { width: 900, height: 420 } }); const errs = [];
  await p.addInitScript(() => { try { localStorage.setItem('vsTips', '1'); localStorage.setItem('viperMode', 'free'); localStorage.setItem('viperMission', 'STRIKE'); localStorage.setItem('viperAC', 'A10A'); } catch (e) {} });
  p.on('pageerror', e => errs.push(e.message));
  await p.route(/fonts\.(googleapis|gstatic)\.com/, r => r.abort());
  await p.goto('file://' + path.resolve(__dirname, '../index.html') + '?test'); await p.waitForTimeout(1500);
  await p.evaluate(() => __vs.wt.begin('A10A')); await p.waitForFunction(() => __vs.state === 'play' && __vs.AG.load.length > 0, null, { timeout: 40000 }); await p.waitForTimeout(1500);
  const r = await p.evaluate(async () => { const V = __vs, G = V.AG; const out = { load: G.load.map(l => l.k + l.n) };
    V.agWpn(); out.pref1 = G.pref; V.agWpn(); out.pref2 = G.pref; V.agWpn(); out.pref3 = G.pref;
    G.pref = 'HYDRA'; const w0 = G.w.length; V.agRelease(); out.rockets = G.w.length - w0;
    V.agSight(); V.agSight(); out.sight = G.sight; G.pref = 'MK82';
    const ip = V.ccip(); const tgt = { alive: true, kind: 'truck', pos: ip.clone(), hp: 1, offT: 0 }; G.tgt = tgt;
    const b0 = G.w.filter(w => w.W.kind === 'dumb').length; V.agRelease(); out.holding = G.hold;
    await new Promise(r => setTimeout(r, 1500)); out.bombs = G.w.filter(w => w.W.kind === 'dumb').length - b0; out.stillHolding = G.hold; return out; });
  assert(r.load.some(x => /HYDRA/.test(x)) && r.rockets >= 5, 'rocket pod ripple: ' + JSON.stringify(r));
  assert(r.sight === 2 && r.holding === true, 'CCRP arms on the first press: ' + JSON.stringify(r));
  assert(r.bombs === 1 && r.stillHolding === false, 'CCRP releases by itself at the release point: ' + JSON.stringify(r));
  await p.waitForTimeout(4000);
  assert.deepEqual(errs, []); console.log('bombing ok'); await b.close();
})().catch(e => { console.error(e); process.exit(1); });
