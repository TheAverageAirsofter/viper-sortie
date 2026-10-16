// Every aircraft: its data is complete (stations match the model, tables have a row), the model builds, and a sortie starts and flies for a moment. usage: node tools/roster-test.js [id,id,...]
const path = require('path'), assert = require('assert');
(async () => {
  const b = await require('./launch')(); const errs = [];
  let p = await b.newPage({ viewport: { width: 800, height: 400 } }); p.on('pageerror', e => errs.push(e.message));
  await p.addInitScript(() => { try { localStorage.setItem('vsTips', '1'); localStorage.setItem('vsSeen', '1'); } catch (e) {} });
  await p.route(/fonts\.(googleapis|gstatic)\.com/, r => r.abort());
  await p.goto('file://' + path.resolve(__dirname, '../index.html') + '?test&noaq'); await p.waitForTimeout(1500);
  const newIds = await p.evaluate(() => __vs.ROSTER_IDS);
  const info = await p.evaluate(() => Object.keys(__vs.AC_DEFS).map(id => { const d = __vs.AC_DEFS[id], st = d.cm.stations, n9 = st.filter(s => /^r9_/.test(s[2])).length, n12 = st.filter(s => /^r120_/.test(s[2])).length;
    return { id, name: d.name, n9, n12, srN: d.srN, mrN: d.mrN, miss: ['sr', 'mr', 'radar', 'spec', 'eye', 'cut', 'fx', 'fuelCap', 'S', 'MASS', 'cm'].filter(k => !d[k]).concat(d.T_AB > d.T_MIL ? [] : ['thrust']), node: !!__vs.NODES[id], tables: __vs.tableRows(id) }; }));
  for (const a of info) { assert.deepEqual(a.miss, [], a.id + ' is missing fields'); if (newIds.includes(a.id)) { assert.equal(a.n9, a.srN, a.id + ' short-range stations match srN'); assert.equal(a.n12, a.mrN, a.id + ' radar-missile stations match mrN'); } assert(a.node, a.id + ' is in the tech tree'); assert(a.tables, a.id + ' has table rows ' + JSON.stringify(a.tables)); }
  console.log(info.length + ' aircraft data ok');
  const only = process.argv[2] ? process.argv[2].split(',') : info.map(a => a.id);
  await p.close();
  p = await b.newPage({ viewport: { width: 800, height: 400 } }); p.on('pageerror', e => errs.push(e.message));
  await p.addInitScript(() => { try { localStorage.setItem('vsTips', '1'); localStorage.setItem('vsSeen', '1'); } catch (e) {} });
  await p.route(/fonts\.(googleapis|gstatic)\.com/, r => r.abort());
  await p.goto('file://' + path.resolve(__dirname, '../index.html') + '?test&noaq'); await p.waitForTimeout(1500);
  for (const id of only) {   // fly each one for a moment (restart on the same page: much faster than a reload per jet)
    await p.evaluate(i => { __vs.setAC(i); __vs.restart(); }, id); await p.waitForTimeout(900);
    assert.equal(await p.evaluate(() => __vs.AC.id), id); assert.equal(await p.evaluate(() => __vs.state), 'play', id + ' flies'); assert(await p.evaluate(() => __vs.P.alive && isFinite(__vs.P.pos.y)), id + ' is alive');
  }
  // every type as a bandit: the model and the AI both have to cope
  await p.evaluate(() => { __vs.setAC('F16'); __vs.restart(); }); await p.waitForTimeout(600);
  const n = await p.evaluate(() => __vs.spawnAll()); await p.waitForTimeout(4000); assert.equal(await p.evaluate(() => __vs.state), 'play');
  assert.deepEqual(errs, []); console.log('roster ok (' + only.length + ' sorties, ' + n + ' bandit types)'); await b.close();
})().catch(e => { console.error(e); process.exit(1); });
