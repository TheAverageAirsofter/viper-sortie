// Model sizes vs the real aircraft (overall length and wingspan in metres, from public data). usage: node tools/dims-test.js
const path = require('path'), assert = require('assert');
if (require.main === module) (async () => {
  const b = await require('./launch')(); const p = await b.newPage({ viewport: { width: 800, height: 400 } });
  await p.addInitScript(() => { try { localStorage.setItem('vsTips', '1'); localStorage.setItem('vsSeen', '1'); } catch (e) {} });
  await p.route(/fonts\.(googleapis|gstatic)\.com/, r => r.abort());
  await p.goto('file://' + path.resolve(__dirname, '../index.html') + '?test&noaq'); await p.waitForTimeout(1500);
  const d = await p.evaluate(() => __vs.M2dims());
  const REAL = require('./real-dims.json'); const bad = []; let n = 0;
  for (const id in d) { const r = REAL[id]; if (!r) { console.log('no reference for', id); continue; } n++;
    const dl = d[id][0] / r[0] - 1, ds = d[id][1] / r[1] - 1; console.log(id.padEnd(9), 'L', d[id][0].toFixed(1), 'vs', r[0], (dl * 100).toFixed(0) + '%', ' S', d[id][1].toFixed(1), 'vs', r[1], (ds * 100).toFixed(0) + '%');
    if (Math.abs(dl) > .05 || Math.abs(ds) > .06) bad.push(id); }
  await b.close(); assert.deepEqual(bad, [], 'models off real size: ' + bad); console.log('dims ok (' + n + ' aircraft)'); })();
