// Progression: tech tree, research, buy, modules, crew, rewards, persistence, BR matchmaking. usage: node tools/progress-test.js
const path = require('path'), assert = require('assert');
(async () => {
  const b = await require('./launch')(); const errs = [];
  const open = async (init) => {
    const p = await b.newPage({ viewport: { width: 1100, height: 520 } }); p.on('pageerror', e => errs.push(e.message));
    await p.addInitScript(i => { try { localStorage.setItem('vsTips', '1'); localStorage.setItem('vsSeen', '1'); for (const k in i) localStorage.setItem(k, i[k]); } catch (e) {} }, init || {});
    await p.route(/fonts\.(googleapis|gstatic)\.com/, r => r.abort());
    await p.goto('file://' + path.resolve(__dirname, '../index.html') + '?test&noaq'); await p.waitForTimeout(1500); return p;
  };
  // free play: the tab explains career mode and can switch it on
  let p = await open();
  await p.click('#bHangar'); await p.click('.hgTabs button[data-tab=tree]'); assert.match(await p.textContent('#hgTree'), /Career mode/);
  await p.click('#hgTree [data-act=career]'); await p.waitForTimeout(300); assert(await p.isVisible('#hgTree .tree'), 'tree shows after switching to career'); await p.close();
  // career with some RP and Silver Lions banked
  p = await open({ viperMode: 'career', vsProg: JSON.stringify({ sl: 400000, frp: 3000, rp: { F16: 6000 }, sorties: 3 }) });
  await p.click('#bHangar'); await p.click('.hgTabs button[data-tab=tree]'); await p.waitForTimeout(300);
  const cls = async id => p.$eval(`#hgTree .tn[data-id=${id}]`, e => e.className);
  assert.match(await cls('F16'), /own/); assert.match(await cls('MIG29'), /own/); assert.match(await cls('F15C'), /can/); assert.match(await cls('F15EX'), /lock/);
  assert(!(await p.evaluate(() => /FA18E|F15C/.test(document.getElementById('bAC').textContent))), 'only owned aircraft in the picker');
  // research F15C (4000 RP): paid from the F-16's pool first
  await p.click('#hgTree .tn[data-id=F15C]'); await p.click('#hgTree [data-act=research]'); await p.waitForTimeout(200);
  assert.match(await cls('F15C'), /res/); let g = await p.evaluate(() => ({ rp: __vs.prog.rp.F16, frp: __vs.prog.frp })); assert.equal(g.rp, 2000); assert.equal(g.frp, 3000);
  // buy it (25,000 SL)
  await p.click('#hgTree [data-act=buy]'); await p.waitForTimeout(300); assert.match(await cls('F15C'), /own/); assert.equal(await p.evaluate(() => __vs.prog.sl), 375000);
  // module on the F-16: Engine I raises thrust in the spec sheet
  await p.click('#hgTree .tn[data-id=F16]'); await p.click('#hgTree [data-act=mod][data-m=eng1]'); await p.waitForTimeout(300);
  assert(await p.evaluate(() => __vs.prog.mods.F16.eng1), 'module installed');
  assert.equal(await p.evaluate(() => Math.round(__vs.AC.T_AB / 1000)), 125, 'engine module raises thrust (120 kN x 1.04)');
  // crew skill
  await p.click('#hgTree [data-act=crew][data-k=g]'); assert.equal(await p.evaluate(() => __vs.prog.crew.g), 1);
  // sortie rewards: RP to the aircraft flown, SL earned, repair when lost
  const r = await p.evaluate(() => { const before = __vs.prog.sl, o = __vs.progAward(2000, true, 3, true, false), lost = __vs.progAward(500, false, 0, false, false); return { before, o, lost, after: __vs.prog.sl }; });
  assert(r.o.sl > 3000 && r.o.rep === 0, 'win pays Silver Lions ' + JSON.stringify(r.o)); assert(r.lost.rep > 1000, 'a lost jet costs a repair bill ' + JSON.stringify(r.lost));
  // matchmaking near the flown aircraft's BR
  const mm = await p.evaluate(() => { const set = new Set(); for (let i = 0; i < 300; i++) set.add(__vs.pickBanditType()); return [...set]; });
  assert(mm.length >= 1); await p.close();
  // persistence
  p = await open({ viperMode: 'career' }); await p.evaluate(() => { __vs.prog.res.SU27 = true; __vs.prog.own.SU27 = true; localStorage.setItem('vsProg', JSON.stringify(__vs.prog)); }); await p.waitForTimeout(1500); await p.reload(); await p.waitForTimeout(1200);
  assert(await p.evaluate(() => __vs.prog.own.SU27), 'ownership persists'); await p.close();
  assert.deepEqual(errs, []); console.log('progress ok'); await b.close();
})().catch(e => { console.error(e); process.exit(1); });
