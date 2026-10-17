// Controls guide, mirror layout, text size, leaderboard + share button. usage: node tools/features-test.js
const path = require('path'), assert = require('assert');
(async () => {
  const b = await require('./launch')();
  const p = await b.newPage({ viewport: { width: 900, height: 420 } }); const errs = [];
  p.on('pageerror', e => errs.push(e.message));
  await p.route(/fonts\.(googleapis|gstatic)\.com/, r => r.abort());
  const url = 'file://' + path.resolve(__dirname, '../index.html') + '?test';
  await p.goto(url); await p.waitForTimeout(1500);
  // text size cycles and persists
  await p.click('#mNav [data-go=set]'); await p.click('#sTabs [data-k=hud]'); for (let i = 0; i < 8 && !/115%/.test(await p.textContent('#bText')); i++) await p.click('#sRows .mr[data-name="Text size"] .rm'); assert.match(await p.textContent('#bText'), /115%/);
  // controls guide: first launch shows it, a tap dismisses it, and it stays dismissed
  await p.sortie(); await p.waitForSelector('#tips:not([hidden])', { timeout: 20000 }).catch(() => {});
  assert(await p.isVisible('#tips'), 'guide shows after the first launch');
  assert((await p.$$('#tips .tip')).length >= 8, 'labels drawn');
  await p.screenshot({ path: process.env.SHOT || '/tmp/w/tips.png' });
  await p.mouse.click(450, 200); assert(!(await p.isVisible('#tips')), 'tap dismisses');
  // leaderboard + share: fake a score, open the game-over overlay
  await p.evaluate(() => { __vs.setScore(1234, 5); __vs.lbAdd(); __vs.showOverlay('over'); });
  await p.click('#oTabs [data-o=scores]');   // best scores live on the debrief's Scores tab
  assert(await p.isVisible('#lbBox')); assert.match(await p.textContent('#lbList'), /1234 pts · 5 kills/);
  assert(await p.isVisible('#bShare'));
  await p.evaluate(() => { __vs.setScore(0, 0); __vs.showOverlay('over'); }); assert(!(await p.isVisible('#bShare')), 'no share without a score');
  await p.reload(); await p.waitForTimeout(1200);
  assert.match(await p.textContent('#bText'), /115%/, 'text size persisted');
  // mirror: GUN moves from the right half to the left half
  await p.click('#mNav [data-go=set]'); await p.click('#sTabs [data-k=ctl]'); await p.click('#sRows .mr[data-name="Move buttons"]'); const before = await p.$eval('#bGun', e => e.getBoundingClientRect().x);
  await p.click('#layMirror'); const after = await p.$eval('#bGun', e => e.getBoundingClientRect().x);
  assert(before > 450 && after < 450, `mirrored (${before} -> ${after})`);
  await p.click('#layReset'); assert((await p.$eval('#bGun', e => e.getBoundingClientRect().x)) > 450);
  assert.deepEqual(errs, []); console.log('features ok'); await b.close();
})().catch(e => { console.error(e); process.exit(1); });
