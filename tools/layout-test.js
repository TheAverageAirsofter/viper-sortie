// Movable controls: enter edit mode, drag, persist across reload, size, reset. usage: node tools/layout-test.js
const path = require('path'), assert = require('assert');
(async () => {
  const b = await require('./launch')();
  const p = await b.newPage({ viewport: { width: 900, height: 420 } }); const errs = []; await p.addInitScript(() => { try { localStorage.setItem('vsTips', '1'); } catch (e) {} });
  p.on('pageerror', e => errs.push(e.message));
  await p.route(/fonts\.(googleapis|gstatic)\.com/, r => r.abort());
  await p.goto('file://' + path.resolve(__dirname, '../index.html')); await p.waitForTimeout(1500);
  await p.click('#mNav [data-go=set]'); await p.click('#sRows .mr[data-name="Move buttons"]'); assert(await p.isVisible('#layBar')); assert(await p.isVisible('#bGun')); assert(!(await p.isVisible('#ov')));
  const box = async id => p.$eval(id, e => { const r = e.getBoundingClientRect(); return { x: r.x + r.width / 2, y: r.y + r.height / 2 } });
  const a = await box('#bGun'); await p.mouse.move(a.x, a.y); await p.mouse.down(); await p.mouse.move(a.x - 120, a.y - 60, { steps: 6 }); await p.mouse.up();
  const c = await box('#bGun'); assert(Math.abs(c.x - (a.x - 120)) < 3 && Math.abs(c.y - (a.y - 60)) < 3, 'GUN moved with the pointer');
  // dragging far off screen is clamped
  await p.mouse.move(c.x, c.y); await p.mouse.down(); await p.mouse.move(5000, 5000, { steps: 4 }); await p.mouse.up();
  const off = await p.$eval('#bGun', e => { const r = e.getBoundingClientRect(); return r.right <= innerWidth + 1 && r.bottom <= innerHeight + 1; }); assert(off, 'stays on screen');
  const rounds = await p.textContent('#cGun'); await p.click('#bGun'); assert.equal(await p.textContent('#cGun'), rounds, 'no game action while editing');
  await p.click('#laySize'); assert.match(await p.textContent('#laySize'), /120%/);
  await p.screenshot({ path: process.env.SHOT || '/tmp/w/layout.png' });
  await p.click('#layDone'); assert(await p.isVisible('#ov')); assert(!(await p.isVisible('#bGun')));
  await p.waitForTimeout(800);   // let the browser flush localStorage to its store before the page is torn down (a reload right after the write can read it back empty on CI)
  await p.reload(); await p.waitForTimeout(1500);
  await p.waitForFunction(() => document.getElementById('bGun') && document.getElementById('bGun').style.translate !== '', null, { timeout: 8000 }).catch(() => {});   // slow CI runners: wait for the saved layout to apply
  const info = await p.evaluate(() => ({ ls: localStorage.getItem('viperLayout'), tr: document.getElementById('bGun').style.translate, sc: document.getElementById('bGun').style.scale, ua: navigator.userAgent }));
  assert.ok(info.tr !== '', 'layout persisted: ' + JSON.stringify(info) + ' errs=' + JSON.stringify(errs));
  await p.sortie(); await p.waitForTimeout(2500); assert(await p.isVisible('#bGun'));
  await p.click('#bPause'); await p.waitForTimeout(500);
  assert.deepEqual(errs, []); console.log('layout ok'); await b.close();
})().catch(e => { console.error(e); process.exit(1); });
