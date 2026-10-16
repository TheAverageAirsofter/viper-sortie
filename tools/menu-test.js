// The redesigned menu: layout fit, tabs, segmented controls, toggles, sliders, card sheets, pause sheet, debrief, keyboard. usage: node tools/menu-test.js
const path = require('path'), assert = require('assert');
(async () => {
  const b = await require('./launch')(); const errs = [];
  const open = async (w, h, init) => {
    const p = await b.newPage({ viewport: { width: w, height: h } }); p.on('pageerror', e => errs.push(e.message));
    await p.addInitScript(i => { try { for (const k in i) localStorage.setItem(k, i[k]); } catch (e) {} }, Object.assign({ vsTips: '1' }, init || {}));
    await p.route(/fonts\.(googleapis|gstatic)\.com/, r => r.abort());
    await p.goto('file://' + path.resolve(__dirname, '../index.html') + '?test&noaq'); await p.waitForTimeout(1400); return p;
  };
  const leg = (p, id) => p.textContent('#' + id);
  const fits = p => p.evaluate(() => { const m = document.getElementById('mBody'); return { sh: m.scrollHeight, ch: m.clientHeight, sw: document.documentElement.scrollWidth, iw: innerWidth }; });
  // --- FLY tab fits a phone in landscape with no scrolling (even with the first-flight hint showing), and nothing overflows sideways at other sizes
  let p = await open(844, 390);
  let f = await fits(p); assert(f.sh <= f.ch + 1, 'FLY tab scrolls at 844x390: ' + JSON.stringify(f)); assert(f.sw <= f.iw, 'no sideways overflow');
  assert(await p.isVisible('#bStart') && await p.isVisible('#bHangar'), 'Launch and Hangar always visible');
  assert(await p.isVisible('#firstRun'), 'first-flight hint on a fresh profile');
  // touch targets: every visible control in the menu is at least 44px tall
  const small = await p.evaluate(() => [...document.querySelectorAll('#ov button, #ov [role=radio], #ov [role=switch], #ov summary')].filter(e => e.offsetParent !== null && !e.closest('#legacy')).map(e => ({ id: e.id || e.textContent.trim().slice(0, 18), h: Math.round(e.getBoundingClientRect().height * 10) / 10 })).filter(x => x.h < 43.5));
  assert.deepEqual(small, [], 'targets under 44px: ' + JSON.stringify(small));
  // segmented controls drive the real settings
  const seg = (label, opt) => p.click(`#fCtl .ctl:has(.cap:text-is("${label}")) [role=radio]:text-is("${opt}")`);
  await seg('Time', 'Night'); assert.match(await leg(p, 'bTime'), /night/i);
  await seg('Weather', 'Rain'); assert.match(await leg(p, 'bWx'), /rain/i);
  await seg('Difficulty', 'Ace'); assert.match(await leg(p, 'bDiff'), /ace/i);
  await seg('Engagement range', 'Extreme'); assert.match(await leg(p, 'bRange'), /extreme/i);
  await seg('Start', 'Runway'); assert.match(await leg(p, 'bStartPos'), /runway/i);
  await seg('Mode', 'Career'); assert.match(await leg(p, 'bMode'), /career/i); await seg('Mode', 'Free');
  assert.equal(await p.getAttribute('#fCtl .ctl:has(.cap:text-is("Time")) [role=radio]:text-is("Night")', 'aria-checked'), 'true');
  // arrow keys move a segmented control
  await p.focus('#fCtl .ctl:has(.cap:text-is("Time")) [role=radio][aria-checked=true]'); await p.keyboard.press('ArrowLeft'); await p.waitForTimeout(150); assert.match(await leg(p, 'bTime'), /dusk/i);
  // mission and map sheets
  await p.click('#cMission'); assert(await p.isVisible('#sheet')); assert((await p.$$('#sheetList .opt')).length >= 12, 'every mission is a card');
  await p.keyboard.press('Escape'); assert(!(await p.isVisible('#sheet')), 'Esc closes the sheet');
  await p.click('#cMission'); await p.click('#sheetList .opt:has-text("Bandit rush")'); assert(!(await p.isVisible('#sheet'))); assert.match(await leg(p, 'bMission'), /rush/i);
  assert.match(await p.textContent('#cMissionDesc'), /8 kills in 5 minutes/);
  await p.click('#cMap'); await p.click('#sheetList .opt:has-text("Desert")'); assert.match(await leg(p, 'bMap'), /desert/i);
  await p.click('#fCtl .chipbtn:has-text("Bandits")'); await p.click('#sheetList .opt:has-text("Su-27S")'); assert.match(await leg(p, 'bBandit'), /Su-27/);
  assert.match(await p.textContent('#mSum'), /Bandit rush/i, 'summary shows the mission');
  await p.screenshot({ path: process.env.SHOT || '/tmp/w/menu-fly.png' });
  // settings: toggles, sliders, segments
  await p.click('#mTabs [data-t=set]'); assert(await p.isVisible('#sCtl'));
  const soundBefore = await leg(p, 'bSound'); await p.click('#sCtl .tog:has-text("Sound")'); assert.notEqual(await leg(p, 'bSound'), soundBefore, 'sound toggle');
  await p.click('#sCtl .seg [role=radio]:text-is("Blue / orange")'); assert.match(await leg(p, 'bPal'), /blue/i);
  await p.click('#sCtl .ctl:has(.cap:text-is("Graphics")) [role=radio]:text-is("High")'); assert.match(await leg(p, 'bQual'), /high/i);
  await p.fill('#sCtl .rng:has-text("Dead zone") input', '3'); await p.dispatchEvent('#sCtl .rng:has-text("Dead zone") input', 'input'); assert.match(await leg(p, 'bDz'), /15/);
  assert(await p.isVisible('#bLayout') && await p.isVisible('#bTips'));
  // pilot: career summary, campaign, scores, lessons, how to fly
  await p.click('#mTabs [data-t=pilot]'); assert(await p.isVisible('#pgCareer')); assert((await p.$$('#pLessons .lesson')).length === 5, 'five lessons');
  await p.click('#pLessons .lesson:has-text("Landing")'); assert.match(await leg(p, 'bMission'), /train/i); assert.match(await leg(p, 'bLesson'), /Landing/);
  await p.click('#mTabs [data-t=pilot]'); await p.click('#howto summary'); assert(await p.isVisible('#ovKeys'), 'how to fly opens');
  // hangar from the footer, then launch from the menu
  await p.click('#mTabs [data-t=fly]'); await p.click('#bHangar'); assert(await p.isVisible('#hangar')); await p.click('#hgClose');
  await p.close();
  // --- other sizes: no sideways overflow, Launch visible
  for (const [w, h] of [[390, 844], [1280, 720], [667, 375]]) { p = await open(w, h); f = await fits(p); assert(f.sw <= f.iw, `overflow at ${w}x${h}: ` + JSON.stringify(f)); assert(await p.isVisible('#bStart'), 'Launch visible at ' + w + 'x' + h); if (h < 400) assert(f.sh <= f.ch + 1, `FLY scrolls at ${w}x${h}: ` + JSON.stringify(f)); await p.close(); }
  // --- pause sheet and debrief
  p = await open(844, 390, { vsSeen: '1' });
  await p.click('#bStart'); await p.waitForTimeout(2500); await p.click('#bPause'); await p.waitForTimeout(500);
  assert(await p.isVisible('#bStart') && /Resume/i.test(await p.textContent('#bStart')), 'Resume'); for (const id of ['bRestart', 'bPhoto', 'bPauseSet', 'bQuit']) assert(await p.isVisible('#' + id), id + ' on the pause sheet');
  assert(!(await p.isVisible('#bHangar')), 'no hangar mid-sortie');
  await p.click('#bPauseSet'); assert(await p.isVisible('#sCtl')); await p.keyboard.press('Escape'); assert(await p.isVisible('#bRestart'), 'Esc goes back to the pause sheet');
  await p.click('#bRestart'); await p.waitForTimeout(1500); assert.equal(await p.evaluate(() => __vs.state), 'play'); assert(!(await p.isVisible('#ov')));
  await p.click('#bPause'); await p.waitForTimeout(400); await p.click('#bStart'); await p.waitForTimeout(500); assert.equal(await p.evaluate(() => __vs.state), 'play', 'resume');
  await p.click('#bPause'); await p.waitForTimeout(400); await p.click('#bQuit'); await p.waitForFunction(() => __vs.state === 'over', null, { timeout: 20000 }); await p.waitForTimeout(500);
  assert(await p.isVisible('#oTabs') && await p.isVisible('#ovStats') && await p.isVisible('#bStart') && await p.isVisible('#bHangar') && await p.isVisible('#bMenu'), 'debrief header, tabs and actions');
  assert.match(await p.textContent('#bStart'), /Fly again/i); await p.click('#oTabs [data-o=scores]'); assert(!(await p.isVisible('#debrief'))); await p.click('#oTabs [data-o=replay]');
  await p.click('#bMenu'); assert(await p.isVisible('#mTabs'), 'Menu button returns to the tabs');
  await p.close();
  assert.deepEqual(errs, []); console.log('menu ok'); await b.close();
})().catch(e => { console.error(e); process.exit(1); });
