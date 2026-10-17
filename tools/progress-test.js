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
  await p.click('#bHangar'); await p.click('.hgTabs button[data-tab=tree]'); assert.match(await p.textContent('#hgTree'), /Free play: every aircraft is unlocked/);
  await p.click('#hgTree [data-act=career]'); await p.waitForTimeout(300); assert(await p.isVisible('#hgTree .tree'), 'tree shows after switching to career'); await p.close();
  // career with some RP and Silver Lions banked
  p = await open({ viperMode: 'career', vsProg: JSON.stringify({ sl: 400000, frp: 3000, rp: { MIG21: 6000 }, sorties: 3 }) });
  await p.click('#bHangar'); await p.click('.hgTabs button[data-tab=tree]'); await p.waitForTimeout(300);
  const cls = async id => p.$eval(`#hgTree .tn[data-id=${id}]`, e => e.className);
  assert.match(await cls('F4E'), /own/); assert.match(await cls('MIG21'), /own/); assert.match(await cls('MIG29'), /can/); assert.match(await cls('F15C'), /can/); assert.match(await cls('F15EX'), /lock/);
  assert(!(await p.evaluate(() => /FA18E|F15C/.test(document.getElementById('bAC').textContent))), 'only owned aircraft in the picker');
  // research the MiG-29 (4000 RP): paid from the MiG-21's pool first
  await p.click('#hgTree .tn[data-id=MIG29]'); await p.click('#hgTree [data-act=research]'); await p.waitForTimeout(200);
  assert.match(await cls('MIG29'), /res/); let g = await p.evaluate(() => ({ rp: __vs.prog.rp.MIG21, frp: __vs.prog.frp })); assert.equal(g.rp, 2000); assert.equal(g.frp, 3000);
  // buy it (25,000 SL)
  await p.click('#hgTree [data-act=buy]'); await p.waitForTimeout(300); assert.match(await cls('MIG29'), /own/); assert.equal(await p.evaluate(() => __vs.prog.sl), 378000);
  // modules on the F-4E: a stock career jet flies with penalties; research with RP, buy with SL
  assert.equal(await p.evaluate(() => __vs.AC.id), 'F4E', 'career starts in an owned jet');
  const thr0 = await p.evaluate(() => Math.round(__vs.AC.T_AB / 1000)); assert(thr0 < 159, 'stock thrust is reduced: ' + thr0);
  const cap0 = await p.evaluate(() => ({ tanks: __vs.ldCap('F4E').tanks, hp: __vs.ldCap('F4E').hp }));
  assert.equal(cap0.tanks, 0, 'stock jet has no drop tanks');
  await p.evaluate(() => { __vs.prog.rp.F4E = 5000; });
  await p.click('.hgTabs button[data-tab=mods]'); assert.match(await p.textContent('#hgMods'), /stock condition/);
  await p.click('#hgMods [data-m=eng1] [data-act=mres]'); await p.waitForTimeout(150);
  assert.equal(await p.evaluate(() => __vs.prog.mods.F4E.eng1), 'r', 'researched, not yet installed');
  assert.equal(await p.evaluate(() => Math.round(__vs.AC.T_AB / 1000)), thr0, 'research alone changes nothing');
  await p.click('#hgMods [data-m=eng1] [data-act=mbuy]'); await p.waitForTimeout(300);
  assert.equal(await p.evaluate(() => __vs.prog.mods.F4E.eng1), true, 'module installed');
  assert.equal(await p.evaluate(() => Math.round(__vs.AC.T_AB / 1000)), 159, 'engine module removes the stock penalty');
  assert(await p.isDisabled('#hgMods [data-m=eng2] button') || (await p.textContent('#hgMods [data-m=eng2]')).length > 0, 'tier II shows');
  await p.evaluate(() => { __vs.prog.sl += 200000; });
  for (const m of ['tnk1', 'ord1']) { await p.click('.hgTabs button[data-tab=mods]'); await p.click('#hgMods [data-m=' + m + '] [data-act=mres]'); await p.click('#hgMods [data-m=' + m + '] [data-act=mbuy]'); }
  const cap1 = await p.evaluate(() => ({ tanks: __vs.ldCap('F4E').tanks, hp: __vs.ldCap('F4E').hp })); assert(cap1.tanks > 0 && cap1.hp > cap0.hp, 'pylon modules unlock stores ' + JSON.stringify([cap0, cap1]));
  // crew skill
  await p.click('.hgTabs button[data-tab=tree]');
  await p.click('#hgTree [data-act=crew][data-k=g]'); assert.equal(await p.evaluate(() => __vs.prog.crew.g), 1);
  // sortie rewards: RP to the aircraft flown, SL earned, repair when lost
  const r = await p.evaluate(() => { const before = __vs.prog.sl, o = __vs.progAward(2000, true, 3, true, false), lost = __vs.progAward(500, false, 0, false, false); return { before, o, lost, after: __vs.prog.sl }; });
  assert(r.o.sl > 3000 && r.o.rep === 0, 'win pays Silver Lions ' + JSON.stringify(r.o)); assert(r.lost.rep > 1000, 'a lost jet costs a repair bill ' + JSON.stringify(r.lost));
  // matchmaking near the flown aircraft's BR
  // matchmaking: bandits are only ever within 1.0 BR of the jet you fly, in every mode
  for (const [id, mixed] of [['F4E', true], ['F4E', false], ['JA37', true], ['F22A', true], ['MIG29', false]]) {
    const r = await p.evaluate(([id, mixed]) => { __vs.setAC(id); if (mixed) { const e = document.getElementById('bBandit'); for (let i = 0; i < 90 && !/mixed/i.test(e.textContent); i++) e.click(); } const set = new Set(); for (let i = 0; i < 400; i++) set.add(__vs.pickBanditType()); const br = __vs.NODES[id].br; return { n: set.size, worst: Math.max(...[...set].map(t => Math.abs(__vs.NODES[t].br - br))), types: [...set].slice(0, 6) }; }, [id, mixed]);
    assert(r.n >= 1 && r.worst <= 1.0 + 1e-6, id + (mixed ? ' mixed' : ' fixed') + ' stays within 1.0 BR: ' + JSON.stringify(r));
  } await p.close();
  // persistence
  p = await open({ viperMode: 'career' }); await p.evaluate(() => { __vs.prog.res.SU27 = true; __vs.prog.own.SU27 = true; localStorage.setItem('vsProg', JSON.stringify(__vs.prog)); }); await p.waitForTimeout(1500); await p.reload(); await p.waitForTimeout(1200);
  assert(await p.evaluate(() => __vs.prog.own.SU27), 'ownership persists'); await p.close();
  assert.deepEqual(errs, []); console.log('progress ok'); await b.close();
})().catch(e => { console.error(e); process.exit(1); });
