// Shared headless-Chromium launcher: $CHROME, else the sandbox's pre-installed browser, else Playwright's own download.
const { chromium } = require('playwright-core'), fs = require('fs');
const PRE = '/opt/pw-browsers/chromium';
module.exports = () => chromium.launch({ executablePath: process.env.CHROME || (fs.existsSync(PRE) ? PRE : undefined), args: ['--use-gl=swiftshader', '--enable-unsafe-swiftshader', '--no-sandbox'] });
