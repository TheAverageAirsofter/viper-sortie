// Headless gameplay exercise: cycles cameras, fires every weapon, deploys countermeasures, pauses; fails on any page error.
const path = require('path');
(async () => {
  const b = await require('./launch')();
  const p = await b.newPage({ viewport: { width: 900, height: 420 } }); const errs = []; await p.addInitScript(() => { try { localStorage.setItem('vsTips', '1'); } catch (e) {} });
  p.on('pageerror', e => errs.push(e.message));
  await p.route(/fonts\.(googleapis|gstatic)\.com/, r => r.abort());
  await p.goto('file://' + path.resolve(__dirname, '../index.html')); await p.waitForTimeout(1500);
  await p.sortie(); await p.waitForTimeout(2500);
  for (let i = 0; i < 5; i++) { await p.click('#bCam'); await p.waitForTimeout(700); }
  for (const id of ['#bRdr', '#bGear', '#b120', '#b9']) { await p.click(id).catch(() => {}); await p.waitForTimeout(600); }
  for (const t of ['FLR', 'CHF', 'ECM', 'DCY', 'AUTO', 'TGP', 'AWACS']) { await p.getByText(t, { exact: false }).first().click({ timeout: 500 }).catch(() => {}); await p.waitForTimeout(300); }
  await p.mouse.move(100, 300); await p.mouse.down(); await p.mouse.move(180, 250, { steps: 5 }); await p.waitForTimeout(1500); await p.mouse.up();
  await p.click('#bGun', { delay: 800 }).catch(() => {}); await p.waitForTimeout(2000);
  await p.click('#bPause'); await p.waitForTimeout(800);
  console.log(errs.length ? errs.join('\n') : 'play ok'); await p.screenshot({ path: process.env.SHOT || '/tmp/w/play.png' }); await b.close(); process.exit(errs.length ? 1 : 0);
})();
