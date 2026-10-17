// Renders icon.svg to the PNG icons used by the Android and Windows builds (assets/). Run: node tools/make-icons.js (needs the headless browser; the PNGs are committed).
const fs = require('fs'), path = require('path'), { chromium } = require('playwright-core');
const root = path.resolve(__dirname, '..'), svg = fs.readFileSync(path.join(root, 'icon.svg'), 'utf8');
const PRE = '/opt/pw-browsers/chromium';
(async () => {
  const b = await chromium.launch({ executablePath: process.env.CHROME || (fs.existsSync(PRE) ? PRE : undefined), args: ['--no-sandbox'] });
  const shot = async (size, out, round) => {
    const p = await b.newPage({ viewport: { width: size, height: size } });
    await p.setContent(`<style>html,body{margin:0;background:transparent}svg{display:block;width:${size}px;height:${size}px;${round ? 'border-radius:50%;overflow:hidden' : ''}}</style>${svg}`);
    fs.mkdirSync(path.dirname(out), { recursive: true });
    await p.screenshot({ path: out, omitBackground: true, clip: { x: 0, y: 0, width: size, height: size } }); await p.close();
  };
  await shot(512, path.join(root, 'assets/icon-512.png'));
  for (const [d, s] of [['mdpi', 48], ['hdpi', 72], ['xhdpi', 96], ['xxhdpi', 144], ['xxxhdpi', 192]]) {
    await shot(s, path.join(root, 'assets/launcher/mipmap-' + d + '/ic_launcher.png'));
    await shot(s, path.join(root, 'assets/launcher/mipmap-' + d + '/ic_launcher_round.png'), true);
  }
  await b.close(); console.log('icons written to assets/');
})();
