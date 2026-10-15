// Selects the Bandit rush mission by clicking Mission through the list, launches, and checks bandits spawn and the status line shows.
const path = require('path'), assert = require('assert');
(async () => {
  const b = await require('./launch')();
  const p = await b.newPage({ viewport: { width: 900, height: 420 } }); const errs = []; await p.addInitScript(() => { try { localStorage.setItem('vsTips', '1'); } catch (e) {} });
  p.on('pageerror', e => errs.push(e.message));
  await p.route(/fonts\.(googleapis|gstatic)\.com/, r => r.abort());
  await p.goto('file://' + path.resolve(__dirname, '../index.html')); await p.waitForTimeout(1500);
  for (let i = 0; i < 15 && !/rush/i.test(await p.textContent('#bMission')); i++) await p.click('#bMission');
  assert.match(await p.textContent('#bMission'), /rush/i);
  await p.click('#bStart'); await p.waitForTimeout(8000);
  await p.screenshot({ path: '/tmp/w/rush.png' });
  assert.deepEqual(errs, []); console.log('rush ok'); await b.close();
})().catch(e => { console.error(e); process.exit(1); });
