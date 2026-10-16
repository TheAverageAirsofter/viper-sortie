// Headless UI checks: first-run hint, training start, colour-blind palette. usage: node tools/ui-test.js
const path = require('path'), assert = require('assert');
(async () => {
  const b = await require('./launch')();
  const p = await b.newPage({ viewport: { width: 900, height: 420 } }); const errs = []; await p.addInitScript(() => { try { localStorage.setItem('vsTips', '1'); } catch (e) {} });
  p.on('pageerror', e => errs.push(e.message));
  await p.route(/fonts\.(googleapis|gstatic)\.com/, r => r.abort());
  await p.goto('file://' + path.resolve(__dirname, '../index.html')); await p.waitForTimeout(2000);
  await p.waitForSelector('#firstRun', { state: 'visible', timeout: 10000 }).catch(() => {});   // slow runners
  assert(await p.isVisible('#firstRun'), 'first-run hint shows on a fresh profile');
  await p.click('#bPal'); assert.match(await p.textContent('#bPal'), /blue/);
  assert.equal(await p.evaluate(() => getComputedStyle(document.documentElement).getPropertyValue('--hud').trim()), '#5cd0ff');
  await p.click('#bFirst'); assert(!(await p.isVisible('#firstRun')));
  assert.match(await p.textContent('#bMission'), /Train/i);
  await p.click('#bStart'); await p.waitForTimeout(4000);
  await p.waitForTimeout(800);   // let localStorage flush before the reload
  await p.reload(); await p.waitForTimeout(1500);
  await p.waitForFunction(() => /blue/.test((document.getElementById('bPal') || {}).textContent || ''), null, { timeout: 10000 }).catch(() => {});
  assert(!(await p.isVisible('#firstRun')), 'hint stays dismissed'); assert.match(await p.textContent('#bPal'), /blue/, 'palette persists');
  assert.deepEqual(errs, []); console.log('ui ok'); await b.close();
})().catch(e => { console.error(e); process.exit(1); });
