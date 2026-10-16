// Night settlement lights and rain lightning, via the ?test hook. usage: node tools/visuals-test.js
const path = require('path'), assert = require('assert');
(async () => {
  const b = await require('./launch')(); const errs = [];
  const open = async (clicks) => {
    const p = await b.newPage({ viewport: { width: 900, height: 420 } }); p.on('pageerror', e => errs.push(e.message));
    await p.addInitScript(() => { try { localStorage.setItem('vsTips', '1'); } catch (e) {} });
    await p.route(/fonts\.(googleapis|gstatic)\.com/, r => r.abort());
    await p.goto('file://' + path.resolve(__dirname, '../index.html') + '?test&noaq'); await p.waitForTimeout(1200);
    for (const id of clicks) await p.click(id);
    await p.click('#bStart'); await p.waitForTimeout(2500); return p;
  };
  let p = await open([]);   // day: no settlement lights
  assert.equal(await p.evaluate(() => __vs.townLights.visible), false, 'town lights are off by day'); await p.close();
  p = await open(['#bTime', '#bTime']);   // night: lights on, some placed
  const t = await p.evaluate(() => ({ v: __vs.townLights.visible, o: __vs.townLights.material.opacity, n: __vs.townLights.geometry.drawRange.count }));
  assert(t.v && t.o > .5 && t.n > 10, 'night settlement lights ' + JSON.stringify(t)); await p.close();
  p = await open(['#bWx', '#bWx']);   // rain: a forced bolt lights the scene, then fades
  await p.evaluate(() => { __vs.LT.force = true; });
  let peak = 0; for (let i = 0; i < 40; i++) { peak = Math.max(peak, await p.evaluate(() => __vs.flashLt.intensity)); await p.waitForTimeout(25); }
  assert(peak > 0, 'lightning flashes in rain'); await p.waitForTimeout(800);
  assert.equal(await p.evaluate(() => __vs.flashLt.intensity), 0, 'flash fades'); await p.close();
  assert.deepEqual(errs, []); console.log('visuals ok'); await b.close();
})().catch(e => { console.error(e); process.exit(1); });
