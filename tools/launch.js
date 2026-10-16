// Shared headless-Chromium launcher: $CHROME, else the sandbox's pre-installed browser, else Playwright's own download.
// Pages come with the title screen and the loading delay switched off (set TITLE=1 / LOAD=1 to keep them) and a p.sortie() helper:
// Quick mission, then Launch.
const { chromium } = require('playwright-core'), fs = require('fs');
const PRE = '/opt/pw-browsers/chromium';
module.exports = async () => {
  const b = await chromium.launch({ executablePath: process.env.CHROME || (fs.existsSync(PRE) ? PRE : undefined), args: ['--use-gl=swiftshader', '--enable-unsafe-swiftshader', '--no-sandbox'] });
  const np = b.newPage.bind(b);
  b.newPage = async o => {
    const p = await np(o);
    await p.addInitScript(k => { try { if (!k.title) localStorage.setItem('vsTitle', '0'); } catch (e) {} if (!k.load) window.__loadMs = 60; }, { title: !!process.env.TITLE, load: !!process.env.LOAD });
    p.sortie = async () => {   // Quick mission, then Launch (from wherever the menu is)
      if (!(await p.isVisible('#bStart'))) { if (!(await p.isVisible('#mNav [data-go=quick]'))) await p.click('#mBack'); await p.click('#mNav [data-go=quick]'); }
      await p.click('#bStart');
    };
    return p;
  };
  return b;
};
