// Concatenates src/*.js (in ORDER) into js/game.js, wrapped in the same strict-mode IIFE the game has always used.
// The files share one scope on purpose (they are slices of the original script), so they are not standalone modules.
// usage: node tools/build.js [--check]   (--check fails if js/game.js is stale)
const fs = require('fs'), path = require('path');
const ORDER = ['data', 'render', 'cockpit', 'effects', 'audio', 'flight', 'ops', 'state', 'ai', 'combat', 'net', 'hud', 'main'];
const root = path.resolve(__dirname, '..');
const out = "(function(){\n'use strict';\n" + ORDER.map(n => fs.readFileSync(path.join(root, 'src', n + '.js'), 'utf8')).join('') + '})();\n';
const dest = path.join(root, 'js', 'game.js');
if (process.argv.includes('--check')) {
  if (!fs.existsSync(dest) || fs.readFileSync(dest, 'utf8') !== out) { console.error('js/game.js is out of date: run npm run build'); process.exit(1); }
  console.log('js/game.js is up to date');
} else { fs.writeFileSync(dest, out); console.log('built js/game.js (' + out.length + ' bytes)'); }
