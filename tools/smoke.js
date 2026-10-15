// Headless smoke test: loads the game, starts a sortie, reports console errors and frame time.
// usage: node tools/smoke.js [url]   (needs playwright-core and a Chromium; set CHROME if not at the default path)
const { chromium } = require('playwright-core');
const url = process.argv[2] || 'file://' + require('path').resolve(__dirname, '../index.html');
(async () => {
  const b = await chromium.launch({ executablePath: process.env.CHROME || '/opt/pw-browsers/chromium', args: ['--use-gl=swiftshader', '--enable-unsafe-swiftshader', '--no-sandbox'] });
  const p = await b.newPage({ viewport: { width: 900, height: 420 } });
  const errs = [];
  p.on('pageerror', e => errs.push('pageerror: ' + e.message));
  p.on('console', m => { if (m.type() === 'error') errs.push('console: ' + m.text()); });
  await p.route(/fonts\.(googleapis|gstatic)\.com/, r => r.abort());
  await p.goto(url); await p.waitForTimeout(3000);
  const start = await p.$('#bStart, #ovStart, button.primary');
  console.log('start button:', start ? 'found' : 'none');
  if (start) { await start.click(); await p.waitForTimeout(5000); }
  console.log('state:', await p.evaluate(() => typeof state !== 'undefined' ? state : 'n/a'));
  console.log(errs.length ? errs.join('\n') : 'no errors');
  await p.screenshot({ path: process.env.SHOT || '/tmp/w/shot.png' });
  await b.close(); process.exit(errs.length ? 1 : 0);
})();
