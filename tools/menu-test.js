// The AAA menu: title, main list, quick mission rows, campaign, online, training, settings, pause, debrief, loading; fit and touch targets; keyboard and input prompts. usage: node tools/menu-test.js
const path = require('path'), assert = require('assert');
(async () => {
  const b = await require('./launch')(); const errs = [];
  const open = async (w, h, init, load) => {
    const p = await b.newPage({ viewport: { width: w, height: h } }); p.on('pageerror', e => errs.push(e.message));
    await p.addInitScript(i => { try { for (const k in i) localStorage.setItem(k, i[k]); } catch (e) {} }, Object.assign({ vsTips: '1' }, init || {}));
    if (load) await p.addInitScript(l => { window.__loadMs = l; }, load);
    await p.route(/fonts\.(googleapis|gstatic)\.com/, r => r.abort());
    await p.goto('file://' + path.resolve(__dirname, '../index.html') + '?test&noaq'); await p.waitForTimeout(1500); return p;
  };
  const leg = (p, id) => p.textContent('#' + id);
  const pane = (p, k) => p.evaluate(k => { __vs.setPane(k); }, k).then(() => p.waitForTimeout(900));
  const fits = p => p.evaluate(() => { document.getAnimations().forEach(a => { try { a.finish(); } catch (e) {} }); const o = document.querySelector('#ov .pane[data-pane="' + document.getElementById('ov').dataset.pane + '"]'); const r = o.getBoundingClientRect(), t = [...o.querySelectorAll('*')].filter(e => e.offsetParent !== null && !e.closest('#oRep.hid')).map(e => e.getBoundingClientRect()).filter(q => q.width && q.height);
    return { bottom: Math.max(...t.map(q => q.bottom)) - r.bottom, right: Math.max(...t.map(q => q.right)) - innerWidth, sw: document.documentElement.scrollWidth, iw: innerWidth, off: t.length ? [...o.querySelectorAll('*')].filter(e => e.offsetParent !== null && e.getBoundingClientRect().right > innerWidth + 1).slice(0, 4).map(e => e.tagName + '.' + e.className + '#' + e.id) : [], sh: o.scrollHeight, ch: o.clientHeight }; });
  const small = (p) => p.evaluate(() => [...document.querySelectorAll('#ov button, #ov input[type=range]')].filter(e => e.offsetParent !== null && !e.closest('#legacy') && e.tabIndex >= 0).map(e => ({ id: e.id || e.className || e.textContent.trim().slice(0, 18), h: Math.round(e.getBoundingClientRect().height * 10) / 10 })).filter(x => x.h < 43.5));
  // --- title screen, then the main list
  let p = await open(844, 390, { vsTitle: '1' });
  assert.equal(await p.evaluate(() => document.getElementById('ov').dataset.pane), 'title', 'title screen first'); assert(await p.isVisible('#pressAny'));
  await p.keyboard.press('Space'); await p.waitForTimeout(500); assert.equal(await p.evaluate(() => document.getElementById('ov').dataset.pane), 'main', 'any key leaves the title');
  const nav = await p.$$eval('#mNav button', bs => bs.map(x => x.querySelector('b').textContent.trim())); assert.deepEqual(nav, ['Campaign', 'Quick mission', 'Online', 'Hangar', 'Training', 'Settings']);
  assert(await p.isVisible('#firstRun'), 'first-flight hint on a fresh profile'); assert(await p.isVisible('#bRole'));
  assert(await p.isVisible('#mPrompts .kc'), 'keyboard prompts show after a key press');
  await p.mouse.click(400, 300); await p.dispatchEvent('#mNav button:nth-child(2)', 'pointerdown', { pointerType: 'touch' }); await p.waitForTimeout(100);
  assert.equal(await p.evaluate(() => document.getElementById('ov').dataset.input), 'touch', 'prompts follow the last input');
  let f = await fits(p); assert(f.sw <= f.iw, 'no sideways overflow on main');
  { const sm = await small(p); assert(!sm.length, 'main targets under 44px' + ' ' + JSON.stringify(sm)); };
  // --- every screen fits 844x390 without scrolling, Launch visible where it applies, touch targets stay 44px tall
  for (const k of ['quick', 'camp', 'online', 'train', 'set']) {
    await pane(p, k); f = await fits(p); assert(f.bottom <= 2 && f.right <= 1, `${k} overflows at 844x390: ` + JSON.stringify(f)); assert(f.sw <= f.iw, k + ' sideways');
    { const sm = await small(p); assert(!sm.length, k + ' targets under 44px' + ' ' + JSON.stringify(sm)); };
    if (k !== 'set') assert(await p.isVisible('#bStart'), 'Launch visible on ' + k);
  }
  for (const t of ['ctl', 'dsp', 'aud', 'hud', 'gp']) { await p.click('#sTabs [data-k=' + t + ']'); await pane(p, 'set'); await p.click('#sTabs [data-k=' + t + ']'); f = await fits(p); assert(f.bottom <= 2, `settings ${t} overflows: ` + JSON.stringify(f)); }
  await pane(p, 'main');
  // --- quick mission rows drive the real settings
  await p.click('#mNav [data-go=quick]');
  const row = (n, d) => p.click(`#qRows .mr[data-name="${n}"] ${d || '.rm'}`);
  await row('Time'); assert.match(await leg(p, 'bTime'), /dusk/i); await row('Time', '.chev[aria-label^=Previous]'); assert.match(await leg(p, 'bTime'), /day/i);
  for (let i = 0; i < 5 && !/rain/i.test(await leg(p, 'bWx')); i++) await row('Weather'); assert.match(await leg(p, 'bWx'), /rain/i);
  await row('Difficulty'); assert(!/regular/i.test(await leg(p, 'bDiff')));
  await row('Range'); await row('Map'); await row('Start'); assert.match(await leg(p, 'bStartPos'), /runway/i);
  await p.focus('#qRows .mr[data-name=Mission] .rm'); const m0 = await p.textContent('#qBrief h2'); await p.keyboard.press('ArrowRight'); await p.waitForTimeout(150);
  assert.notEqual(await p.textContent('#qBrief h2'), m0, 'right arrow cycles the mission and the briefing follows'); assert(await p.isVisible('#qBrief .diag svg'), 'map diagram');
  for (let i = 0; i < 12 && !/rush/i.test(await leg(p, 'bMission')); i++) await row('Mission'); assert.match(await p.textContent('#qBrief .txt'), /Eight bandits/);
  await p.keyboard.press('ArrowDown'); await p.keyboard.press('ArrowDown'); assert(await p.evaluate(() => document.activeElement.closest('.mr').dataset.name) !== 'Mission', 'down arrow moves the focus');
  await p.keyboard.press('Escape'); await p.waitForTimeout(300); assert.equal(await p.evaluate(() => document.getElementById('ov').dataset.pane), 'main', 'Esc goes back');
  // --- settings: rows, sliders, description area
  await p.click('#mNav [data-go=set]'); await p.click('#sTabs [data-k=aud]'); const snd = await leg(p, 'bSound'); await p.click('#sRows .mr[data-name=Sound] .rm'); assert.notEqual(await leg(p, 'bSound'), snd, 'sound row');
  await p.click('#sTabs [data-k=ctl]'); await p.focus('#sRows .mr[data-name="Dead zone"] input'); await p.keyboard.press('ArrowRight'); await p.waitForTimeout(150); assert.match(await leg(p, 'bDz'), /\d+%/);
  assert.match(await p.textContent('#sdName'), /Dead zone/i, 'description follows the focused setting'); assert((await p.textContent('#sdText')).length > 10);
  await p.keyboard.press('e'); await p.waitForTimeout(200); assert.match(await p.evaluate(() => document.querySelector('#sTabs [aria-selected=true]').textContent), /Display/, 'E switches tab');
  // --- training list with ticks; campaign map; pilot
  await p.click('#mBack'); await p.click('#mNav [data-go=train]'); assert.equal((await p.$$('#pLessons .les')).length, 5); await p.click('#pLessons .les:nth-child(4) .les, #pLessons li:nth-child(4) .les'); assert.match(await leg(p, 'bLesson'), /Landing/); assert.match(await leg(p, 'bMission'), /train/i);
  await p.click('#mBack'); await p.click('#mNav [data-go=camp]'); assert(await p.isVisible('#opSvg')); assert.match(await leg(p, 'bMission'), /campaign/i);
  await p.click('#mBack'); await p.click('#mWallet'); assert(await p.isVisible('#pgCareer'));
  await p.click('#mBack'); await p.click('#bHangar'); assert(await p.isVisible('#hangar')); await p.click('#hgClose'); assert(await p.isVisible('#mNav'));
  await p.close();
  // --- other sizes: no sideways overflow, Launch visible on the quick mission screen
  for (const [w, h] of [[390, 844], [1920, 1080], [667, 375]]) {
    p = await open(w, h); await p.click('#mNav [data-go=quick]'); await p.waitForTimeout(500); f = await fits(p); assert(f.sw <= f.iw, `overflow at ${w}x${h}: ` + JSON.stringify(f)); assert(await p.isVisible('#bStart'), 'Launch visible at ' + w + 'x' + h);
    if (w === 1920) assert(f.bottom <= 2, 'desktop quick mission fits'); await p.close();
  }
  // --- loading screen, pause list, debrief
  p = await open(844, 390, {}, 3000);
  await p.click('#mNav [data-go=quick]'); await p.click('#bStart'); await p.waitForTimeout(300); assert.equal(await p.evaluate(() => document.getElementById('ov').dataset.pane), 'load', 'loading screen'); assert(await p.isVisible('#ldName') && await p.isVisible('#ldTip'));
  await p.waitForFunction(() => __vs.state === 'play', null, { timeout: 20000 }); await p.waitForTimeout(1500); await p.click('#bPause'); await p.waitForTimeout(500);
  assert(/Resume/i.test(await p.textContent('#bStart')), 'Resume'); for (const id of ['bRestart', 'bPhoto', 'bPauseSet', 'bQuit']) assert(await p.isVisible('#' + id), id + ' on the pause list');
  assert(!(await p.isVisible('#bHangar')), 'no hangar mid-sortie');
  await p.click('#bPauseSet'); assert(await p.isVisible('#sRows')); await p.keyboard.press('Escape'); assert(await p.isVisible('#bRestart'), 'Esc goes back to the pause list');
  await p.click('#bQuit'); await p.waitForFunction(() => __vs.state === 'over', null, { timeout: 20000 }); await p.waitForTimeout(800);
  assert(await p.isVisible('#oTabs') && await p.isVisible('#repGrid') && await p.isVisible('#bStart') && await p.isVisible('#bOverHg') && await p.isVisible('#bMenu'), 'debrief header, tabs and actions');
  assert.match(await p.textContent('#ovTitle'), /Mission (success|failed)|Sortie aborted/i); assert.match(await leg(p, 'bStart'), /Fly again/i);
  f = await fits(p); assert(f.bottom <= 2, 'debrief fits 844x390: ' + JSON.stringify(f)); { const sm = await small(p); assert(!sm.length, 'debrief targets' + ' ' + JSON.stringify(sm)); };
  await p.click('#oTabs [data-o=replay]'); assert(await p.isVisible('#debrief')); await p.click('#oTabs [data-o=scores]'); assert(!(await p.isVisible('#debrief')));
  await p.click('#bMenu'); assert(await p.isVisible('#mNav'), 'Continue returns to the main list');
  await p.close();
  // --- top bar after a sortie, battle presets, itemised debrief, research grid, crew cards, daily tasks, phone nav
  p = await open(844, 390);
  const sumCol = async c => p.evaluate(c => { const col = document.querySelectorAll('#ovItems .itCol')[c], num = e => +e.textContent.replace('−', '-').replace(/[+,]/g, ''); return { lines: [...col.querySelectorAll('.it:not(.tot)')].reduce((a, e) => a + num(e.querySelector('b')), 0), total: num(col.querySelector('.it.tot b')) }; }, c);
  assert(await p.isHidden('#wSLb'), 'Silver Lions hidden in Free mode');
  for (const [k, diff, mult] of [['Simulator', /veteran/i, '1.5'], ['Arcade', /rookie/i, '1.0'], ['Realistic', /regular/i, '1.2']]) {
    await p.click('#mNav [data-go=quick]'); await p.waitForTimeout(300);
    for (let i = 0; i < 4 && !(await p.textContent('#qRows .mr[data-name=Preset] .val')).toLowerCase().startsWith(k.toLowerCase()); i++) await p.click('#qRows .mr[data-name=Preset] .rm');
    assert.match(await p.textContent('#qRows .mr[data-name=Preset] .val'), new RegExp(k + '\\s×' + mult.replace('.', '\\.'), 'i')); assert.match(await leg(p, 'bDiff'), diff, k + ' sets the difficulty');
    assert.equal(await p.evaluate(() => __vs.preset), k.toUpperCase()); assert.equal(await p.evaluate(() => localStorage.getItem('vsPreset')), k.toUpperCase());
    await p.click('#mBack');
  }
  await p.click('#mNav [data-go=quick]'); await p.click('#qRows .mr[data-name=Difficulty] .rm');   // override the preset's difficulty by hand
  await p.click('#qRows .mr[data-name=Preset] .rm'); assert(await p.isVisible('#qRows .pchip'), 'confirm chip, not a modal'); assert.equal(await p.evaluate(() => __vs.preset), 'REALISTIC', 'nothing changes before confirming');
  await p.click('#qRows .pchip [data-n]'); assert(!(await p.isVisible('#qRows .pchip'))); await p.click('#qRows .mr[data-name=Preset] .rm'); await p.click('#qRows .pchip [data-y]'); assert.notEqual(await p.evaluate(() => __vs.preset), 'REALISTIC', 'Apply switches the preset');
  // battle rating on the briefing and the out-of-range chip
  assert.match(await p.textContent('#brMine'), /\d+\.\d ±0\.7/); assert.match(await p.textContent('#brEnemy'), /\d+\.\d/);
  await p.evaluate(() => { const e = document.getElementById('bBandit'); for (let i = 0; i < 30 && !/MiG-29\b|Fulcrum|MIG-29/i.test(e.textContent); i++) e.click(); }); await p.waitForTimeout(300);
  const chipNow = await p.isVisible('#qBrief .warnchip'); assert(typeof chipNow === 'boolean');
  await p.click('#mBack');
  // career: sortie rewards, top bar, itemised rows
  await p.evaluate(() => document.getElementById('bMode').click()); await p.waitForTimeout(200); assert(await p.isVisible('#wSLb'), 'Silver Lions shown in Career');
  const before = await p.evaluate(() => ({ sl: __vs.prog.sl, rp: Object.values(__vs.prog.rp).reduce((a, b) => a + b, 0) + __vs.prog.frp }));
  await p.evaluate(() => __vs.endTest({ cause: 'win', score: 800, kills: 3, t: 700, alive: true })); await p.waitForTimeout(1200);
  const after = await p.evaluate(() => ({ sl: __vs.prog.sl, rp: Object.values(__vs.prog.rp).reduce((a, b) => a + b, 0) + __vs.prog.frp }));
  assert(after.rp > before.rp && after.sl > before.sl, 'the sortie paid out');
  assert.equal((await p.textContent('#wRP')).replace(/,/g, ''), String(after.rp), 'top bar RP follows the sortie'); assert.equal((await p.textContent('#wSL')).replace(/,/g, ''), String(after.sl), 'top bar SL follows the sortie');
  assert(await p.evaluate(() => parseFloat(document.querySelector('#wXp i').style.width) > 0), 'XP bar fills');
  assert(await p.isVisible('#ovItems'), 'itemised rewards'); const rpc = await sumCol(0), slc = await sumCol(1);
  assert.equal(rpc.lines, rpc.total, 'RP rows add up ' + JSON.stringify(rpc)); assert.equal(slc.lines, slc.total, 'Silver Lion rows add up ' + JSON.stringify(slc)); assert.equal(slc.total, after.sl - before.sl, 'rows match the real balance change');
  assert(await p.evaluate(() => !!document.getElementById('bReplay')), 'replay button kept');
  await p.evaluate(() => __vs.endTest({ cause: 'shot', score: 100, kills: 1, t: 200, alive: false })); await p.waitForTimeout(1000);
  const lost = await sumCol(1); assert.equal(lost.lines, lost.total, 'loss rows add up (repair is itemised) ' + JSON.stringify(lost)); assert(await p.evaluate(() => [...document.querySelectorAll('#ovItems .it span')].some(e => /Repair/.test(e.textContent))));
  await p.click('#bMenu');
  // research grid: lock states, connectors, pulse, arrow keys
  await p.click('#bHangar'); await p.click('.hgTabs button[data-tab=tree]'); await p.waitForTimeout(300);
  const st = id => p.getAttribute('.tn[data-id=' + id + ']', 'class');
  assert.match(await st('F4E'), /own/); assert.match(await st('F15C'), /can/); assert.match(await st('F15E'), /lock/); assert((await p.$$('#hgTree .tgrid path')).length >= 10, 'connectors'); assert.equal((await p.$$('#hgTree .tn.next')).length, 1, 'one next-research pulse');
  assert.match(await p.textContent('.tn[data-id=F15C] em'), /Research · 20,000 RP/); assert.match(await p.textContent('.tn[data-id=F15E] em'), /Locked/);
  await p.evaluate(() => { __vs.prog.frp = 99999; }); await p.click('.tn[data-id=F15C]'); await p.click('#hgTree [data-act=research]'); await p.waitForTimeout(200);
  assert.match(await st('F15C'), /res/); assert.match(await st('F15E'), /can/); assert.match(await p.textContent('.tn[data-id=F15C] em'), /Researched · 150,000 SL/);
  await p.focus('.tn[data-id=F15C]'); await p.keyboard.press('ArrowRight'); assert.notEqual(await p.evaluate(() => document.activeElement.dataset.id), 'F15C', 'arrow keys move between nodes');
  await p.evaluate(() => { __vs.prog.sl = 1000000; }); await p.click('.tn[data-id=F15C]'); await p.click('#hgTree [data-act=buy]'); await p.waitForTimeout(200); assert.match(await st('F15C'), /own/); assert.match(await p.textContent('.tn[data-id=F15C] em'), /Owned · 150,000 SL/);
  await p.click('#hgClose');
  // crew dossier on the Pilot pane
  await p.click('#mWallet'); const cards = await p.$$('#pgCrew .crc'); assert.equal(cards.length, 3, 'a card per crew skill'); assert.equal((await p.$$('#pgCrew .crc:first-child .pips i')).length, 5);
  await p.evaluate(() => { __vs.prog.sl = 10; __vs.uiSync(); }); assert(await p.isDisabled('#pgCrew [data-k=g]'), 'disabled when Silver Lions are short');
  await p.evaluate(() => { __vs.prog.sl = 9e6; __vs.uiSync(); }); for (let i = 0; i < 5; i++) await p.click('#pgCrew [data-k=g]'); assert.equal((await p.$$('#pgCrew .crc:first-child .pips i.on')).length, 5); assert(await p.isDisabled('#pgCrew [data-k=g]'), 'disabled at level 5'); assert.match(await p.textContent('#pgCrew [data-k=g]'), /Maxed/);
  // daily tasks pay once and reset at local midnight
  const rp0 = await p.evaluate(() => __vs.prog.frp); await p.evaluate(() => __vs.dailyAdd('l', 1)); const rp1 = await p.evaluate(() => __vs.prog.frp); assert.equal(rp1 - rp0, 300, 'Land once pays'); assert.equal(await p.evaluate(() => Object.keys(__vs.daily.done).length), 3, 'the sortie completed the other two'); await p.evaluate(() => __vs.dailyAdd('l', 1)); assert.equal(await p.evaluate(() => __vs.prog.frp), rp1, 'pays once a day');
  await p.evaluate(() => { __vs.uiSync(); }); assert.equal((await p.$$('#pgDaily .dt')).length, 3); assert.equal((await p.$$('#pgDaily .dt.done')).length, 3);
  await p.evaluate(() => { const d = JSON.parse(localStorage.getItem('vsDaily')); d.d = '2000-01-01'; localStorage.setItem('vsDaily', JSON.stringify(d)); location.reload(); }); await p.waitForTimeout(1800);
  await p.evaluate(() => __vs.uiSync()); assert.equal(await p.evaluate(() => Object.keys(__vs.daily.done).length), 0, 'a new day clears the tasks');
  await p.close();
  // phones: the bottom bar shows only under 600px
  p = await open(390, 844); assert(await p.isVisible('#bNav'), 'bottom nav on a phone'); assert.deepEqual(await p.$$eval('#bNav button', bs => bs.map(x => x.textContent)), ['Fly', 'Garage', 'Shop', 'Pilot']);
  const nb = await p.evaluate(() => document.getElementById('bNav').getBoundingClientRect().height); assert(nb >= 44);
  await p.click('#bNav [data-b=garage]'); assert(await p.isVisible('#hangar')); await p.click('#hgClose'); await p.click('#bNav [data-b=shop]'); assert(await p.isVisible('#hgTree')); await p.click('#hgClose'); await p.click('#bNav [data-b=pilot]'); assert(await p.isVisible('#pgCareer'));
  f = await fits(p); assert(f.sw <= f.iw, 'no sideways scroll on a phone'); await p.close();
  p = await open(844, 390); assert(!(await p.isVisible('#bNav')), 'no bottom nav at 844px'); await p.close();
  p = await open(1280, 720); assert(!(await p.isVisible('#bNav')), 'no bottom nav at 1280px'); f = await fits(p); assert(f.sw <= f.iw, 'no sideways scroll at 1280'); await p.close();
  // briefing before the mission: map, goal and opponents; a tap starts it
  p = await open(844, 390, {}, 6000); await p.click('#mNav [data-go=quick]'); await p.click('#bStart'); await p.waitForTimeout(400);
  assert(await p.isVisible('#ldMap svg') && /Goal:/.test(await p.textContent('#ldGoal')) && (await p.textContent('#ldWho')).length > 5 && (await p.textContent('#ldMapName')).length > 3, 'briefing card'); await p.mouse.click(400, 200);
  await p.waitForFunction(() => __vs.state === 'play', null, { timeout: 4000 }); await p.close();
  assert.deepEqual(errs, []); console.log('menu ok'); await b.close();
})().catch(e => { console.error(e); process.exit(1); });
