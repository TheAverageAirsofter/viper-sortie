// Scoring events: hits coalesce, a kill pays out, quick kills chain into a multi-kill bonus
const assert = require('assert'), path = require('path');
(async () => {
  const b = await require('./launch')();
  const p = await b.newPage({ viewport: { width: 900, height: 420 } }); const errs = [];
  await p.addInitScript(() => { try { localStorage.setItem('vsTips', '1'); } catch (e) {} });
  p.on('pageerror', e => errs.push(e.message));
  await p.route(/fonts\.(googleapis|gstatic)\.com/, r => r.abort());
  await p.goto('file://' + path.resolve(__dirname, '../index.html') + '?test'); await p.waitForTimeout(1500);
  await p.sortie(); await p.waitForFunction(() => __vs.enemies.filter(x => x.alive).length >= 2, null, { timeout: 30000 });
  const r = await p.evaluate(() => {
    const e = __vs.enemies.filter(x => x.alive); const out = {};
    __vs.hitAI(e[0], 1, 'GUNS', true); __vs.hitAI(e[0], 1, 'GUNS', true);
    out.hits = __vs.SC.list.map(x => x.text);
    __vs.killEnemy(e[0], 'AIM-9', true); __vs.killEnemy(e[1], 'GUNS', true);
    out.after = __vs.SC.list.map(x => x.text + ' ' + x.pts);
    return out;
  });
  assert(r.hits.some(t => /HIT ×2/.test(t)), 'hits coalesce: ' + r.hits);
  assert(r.after.some(t => /DESTROYED/.test(t)) && r.after.some(t => /DOUBLE KILL/.test(t)), 'kill and double kill: ' + r.after);
  await p.waitForTimeout(500);
  assert.deepEqual(errs, []); console.log('score ok'); await b.close();
})().catch(e => { console.error(e); process.exit(1); });
