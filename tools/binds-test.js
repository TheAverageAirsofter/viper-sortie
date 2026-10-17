// Rebindable keyboard + mouse controls: open the editor, rebind the guns to G (taking it from ACM), set a mouse button, persist, and fire with the new key
const assert = require('assert'), path = require('path');
(async () => {
  const b = await require('./launch')();
  const p = await b.newPage({ viewport: { width: 900, height: 420 } }); const errs = [];
  await p.addInitScript(() => { try { localStorage.setItem('vsTips', '1'); } catch (e) {} });
  p.on('pageerror', e => errs.push(e.message));
  await p.route(/fonts\.(googleapis|gstatic)\.com/, r => r.abort());
  const url = 'file://' + path.resolve(__dirname, '../index.html') + '?test';
  await p.goto(url); await p.waitForTimeout(1500);
  await p.click('#mNav [data-go=set]'); await p.click('#sTabs [data-k=ctl]');
  await p.click('#sRows .mr[data-name="Key bindings"]');
  assert(await p.isVisible('#kbEdit'), 'editor opens');
  await p.click('#kbEdit .kbSw button:first-child');   // classic keys
  await p.click('#kbEdit .kbKey[data-act=gun][data-slot="0"]');
  assert.match(await p.textContent('#kbEdit .kbKey.wait'), /press a key/);
  await p.keyboard.press('KeyG');
  const m = await p.evaluate(() => ({ gun: __vs.KB.map.kb.gun, acm: __vs.KB.map.kb.acm }));
  assert.deepEqual(m.gun, ['KeyG']); assert.deepEqual(m.acm, [], 'the key left its old action');
  await p.selectOption('#kbEdit select[data-btn="1"]', 'lock');
  await p.fill('#kbEdit input[data-btn=msens]', '1.5');
  await p.click('#kbDone');
  assert(!(await p.isVisible('#kbEdit')), 'editor closes');
  await p.reload(); await p.waitForTimeout(1500);
  const saved = await p.evaluate(() => ({ gun: __vs.KB.map.kb.gun, mid: __vs.KB.mouse[1], ms: __vs.KB.msens }));
  assert.deepEqual(saved.gun, ['KeyG']); assert.equal(saved.mid, 'lock'); assert(Math.abs(saved.ms - 1.5) < .01);
  await p.sortie(); await p.waitForFunction(() => __vs.state === 'play', null, { timeout: 20000 }); await p.waitForTimeout(800);
  const r0 = await p.evaluate(() => __vs.P.rounds);
  await p.keyboard.down('KeyG'); await p.waitForTimeout(700); await p.keyboard.up('KeyG');
  const r1 = await p.evaluate(() => __vs.P.rounds);
  assert(r1 < r0, 'the new key fires the guns: ' + r0 + ' -> ' + r1);
  assert.deepEqual(errs, []); console.log('binds ok'); await b.close();
})().catch(e => { console.error(e); process.exit(1); });
