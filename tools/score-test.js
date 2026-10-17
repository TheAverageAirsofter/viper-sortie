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
    e[0].drone = true; __vs.hitAI(e[0], 1, 'GUNS', true); __vs.hitAI(e[0], 1, 'GUNS', true);
    out.hits = __vs.SC.list.map(x => x.text);
    __vs.killEnemy(e[0], 'AIM-9', true); __vs.killEnemy(e[1], 'GUNS', true);
    out.after = __vs.SC.list.map(x => x.text + ' ' + x.pts);
    return out;
  });
  assert(r.hits.some(t => /HIT ×2/.test(t)), 'hits coalesce: ' + r.hits);
  assert(r.after.some(t => /DESTROYED/.test(t)) && r.after.some(t => /DOUBLE KILL/.test(t)), 'kill and double kill: ' + r.after);
  // tactical map: steps through the scales, draws without errors, then closes
  for (let i = 0; i < 3; i++) { await p.evaluate(() => __vs.mapStep()); await p.waitForTimeout(400); }
  assert.equal(await p.evaluate(() => __vs.TMAP.z), 3);
  await p.click('#rMap', { force: true }).catch(() => {}); await p.waitForTimeout(300);
  await p.evaluate(() => __vs.mapStep()); await p.waitForTimeout(300);
  assert.equal(await p.evaluate(() => __vs.TMAP.z), 0, 'map closes');
  // online team match: squadron tags on the scoreboard and the first team to 20 kills wins
  const o = await p.evaluate(() => { const V = __vs, N = V.NET; N.mode = 'TEAMS'; N.me = 'me'; N.won = null; N.names = N.names || new Map();
    N.roster.clear(); N.roster.set('me', { ac: 'F16', md: 'TEAMS', tm: 'B', sk: 12, sd: 1, a: 1, sq: 'VAL' }); N.roster.set('p2', { ac: 'F4E', md: 'TEAMS', tm: 'B', sk: 9, sd: 2, a: 1, sq: 'va<l>!' }); N.roster.set('p3', { ac: 'MIG21', md: 'TEAMS', tm: 'R', sk: 5, sd: 3, a: 1 });
    V.netScoreCheck(); return { won: N.won, html: V.sbHtml(), s: V.netTeamScore() }; });
  assert.equal(o.won, 'B', 'blue reaches 20: ' + JSON.stringify(o.s)); assert(o.html.includes('[VAL] ') && o.html.includes('[VAL] ') && !o.html.includes('<l>'), 'squadron tags, sanitised');
  assert.deepEqual(errs, []); console.log('score ok'); await b.close();
})().catch(e => { console.error(e); process.exit(1); });
