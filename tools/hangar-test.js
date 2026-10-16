// Hangar: open from the menu, switch tabs, read specs, change aircraft and loadout, close, launch. usage: node tools/hangar-test.js
const path = require('path'), assert = require('assert');
(async () => {
  const b = await require('./launch')();
  const p = await b.newPage({ viewport: { width: 1100, height: 520 } }); const errs = [];
  p.on('pageerror', e => errs.push(e.message));
  await p.addInitScript(() => { try { localStorage.setItem('vsTips', '1'); localStorage.setItem('vsSeen', '1'); } catch (e) {} });
  await p.route(/fonts\.(googleapis|gstatic)\.com/, r => r.abort());
  await p.goto('file://' + path.resolve(__dirname, '../index.html') + '?test&noaq'); await p.waitForTimeout(1500);
  assert(!(await p.isVisible('#bAC')), 'aircraft picker is no longer on the main menu');
  assert.match(await p.textContent('#bRole'), /Loadout/);
  await p.click('#bHangar'); await p.waitForTimeout(800);
  assert(await p.isVisible('#hangar')); assert(!(await p.isVisible('#ov')), 'main menu hides while in the hangar');
  assert(await p.isVisible('#ldRows'), 'loadout editor is shown'); assert(await p.isVisible('#bAC'));
  const name0 = await p.textContent('#hgName');
  await p.screenshot({ path: process.env.SHOT || '/tmp/w/hg-load.png' });
  // edit the loadout: strike package, then clean
  await p.click('#ldST'); await p.waitForTimeout(500); const strike = await p.textContent('#bRole');
  await p.click('#ldCL'); await p.waitForTimeout(500); const clean = await p.textContent('#bRole'); assert.notEqual(strike, clean, 'loadout changes');
  // specs
  await p.click('.hgTabs button[data-tab=spec]'); await p.waitForTimeout(400);
  const spec = await p.textContent('#hgSpec');
  for (const w of ['Airframe', 'Performance', 'Weapons', 'Sensors', 'Defences', 'Wingspan', 'Thrust / weight', 'Top speed, sea level', 'AIM-120C', 'Detection range']) assert(spec.includes(w), 'specs mention ' + w);
  await p.screenshot({ path: '/tmp/w/hg-spec.png' });
  // another aircraft: name and specs update
  await p.click('.hgTabs button[data-tab=load]'); await p.click('#bAC'); await p.waitForTimeout(700);
  const name1 = await p.textContent('#hgName'); assert.notEqual(name0, name1, 'aircraft changed ' + name0 + ' -> ' + name1);
  await p.click('.hgTabs button[data-tab=spec]'); await p.waitForTimeout(300); assert((await p.textContent('#hgSpec')).includes('Airframe'));
  // paint tab
  await p.click('.hgTabs button[data-tab=paint]'); assert(await p.isVisible('#bLivery')); assert(await p.isVisible('#sqName'));
  await p.screenshot({ path: '/tmp/w/hg-paint.png' });
  // drag rotates, close returns to the menu, loadout button reopens
  const a0 = await p.evaluate(() => __vs.HG.ang); await p.mouse.move(250, 260); await p.mouse.down(); await p.mouse.move(120, 260, { steps: 5 }); await p.mouse.up();
  assert.notEqual(a0, await p.evaluate(() => __vs.HG.ang), 'dragging turns the jet');
  // look all around: vertical drag tilts, quick views reach top / under / rear, zoom works
  const e0 = await p.evaluate(() => __vs.HG.el); await p.mouse.move(250, 200); await p.mouse.down(); await p.mouse.move(250, 330, { steps: 6 }); await p.mouse.up();
  assert((await p.evaluate(() => __vs.HG.el)) > e0 + .5, 'vertical drag tilts the view');
  await p.click('#hgChips button[data-v=top]'); await p.waitForTimeout(500); assert((await p.evaluate(() => __vs.HG.el)) > 1.2, 'top view'); await p.screenshot({ path: '/tmp/w/hg-top.png' });
  await p.click('#hgChips button[data-v=under]'); await p.waitForTimeout(500); assert((await p.evaluate(() => __vs.HG.el)) < -1.2, 'under view'); await p.screenshot({ path: '/tmp/w/hg-under.png' });
  await p.click('#hgChips button[data-v=rear]'); await p.waitForTimeout(500); await p.screenshot({ path: '/tmp/w/hg-rear.png' });
  await p.click('#hgChips button[data-v=cockpit]'); await p.waitForTimeout(500); assert((await p.evaluate(() => __vs.HG.zoom)) < .5, 'cockpit close-up'); await p.screenshot({ path: '/tmp/w/hg-cockpit.png' });
  await p.mouse.move(250, 260); await p.mouse.wheel(0, 800); assert((await p.evaluate(() => __vs.HG.zoom)) > .45, 'wheel zooms out');
  await p.click('#hgChips button[data-v=auto]'); assert(await p.evaluate(() => __vs.HG.auto), 'spin resumes');
  // pan: right-drag and WASD move the view point; the jet is parked in the hall
  const t0 = await p.evaluate(() => __vs.HG.tgt.toArray()); await p.mouse.move(250, 260); await p.mouse.down({ button: 'right' }); await p.mouse.move(150, 200, { steps: 5 }); await p.mouse.up({ button: 'right' });
  const t1 = await p.evaluate(() => __vs.HG.tgt.toArray()); assert(t0.some((v, i) => Math.abs(v - t1[i]) > .3), 'right-drag pans ' + t0 + ' -> ' + t1);
  await p.keyboard.press('w'); await p.keyboard.press('d'); await p.keyboard.press('e'); const t2 = await p.evaluate(() => __vs.HG.tgt.toArray()); assert(t1.some((v, i) => Math.abs(v - t2[i]) > .05), 'WASD walks the view');
  assert(await p.evaluate(() => __vs.hgParked()), 'jet is parked in the hangar scene');
  await p.click('#hgClose'); assert(await p.isVisible('#ov')); assert(!(await p.isVisible('#hangar'))); assert(!(await p.evaluate(() => __vs.hgParked())), 'jet leaves the hangar');
  await p.click('#bRole'); assert(await p.isVisible('#hangar')); assert(await p.isVisible('#ldRows'));
  await p.keyboard.press('Escape'); assert(!(await p.isVisible('#hangar')), 'Esc closes the hangar');
  // launch straight from the hangar
  await p.click('#bHangar'); await p.click('#hgLaunch'); await p.waitForTimeout(2500);
  assert(!(await p.isVisible('#hangar'))); assert.equal(await p.evaluate(() => __vs.state), 'play');
  await p.click('#bPause'); await p.waitForTimeout(500); assert(!(await p.isVisible('#bHangar')), 'no hangar in the pause menu');
  assert.deepEqual(errs, []); console.log('hangar ok'); await b.close();
})().catch(e => { console.error(e); process.exit(1); });
