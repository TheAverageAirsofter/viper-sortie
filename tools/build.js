// Concatenates src/*.js (in ORDER) into js/game.js, wrapped in the same strict-mode IIFE the game has always used.
// The files share one scope on purpose (they are slices of the original script), so they are not standalone modules.
// Also writes js/game.min.js (minified), which index.html loads. usage: node tools/build.js [--check]   (--check fails if either is stale)
const fs = require('fs'), path = require('path');
const ORDER = ['data', 'render', 'roster', 'cockpit', 'effects', 'audio', 'flight', 'ops', 'state', 'ai', 'combat', 'progress', 'net', 'hud', 'main', 'hangar', 'hangar3d', 'progressui', 'menu'];
const root = path.resolve(__dirname, '..');
const out = "(function(){\n'use strict';\n" + ORDER.map(n => fs.readFileSync(path.join(root, 'src', n + '.js'), 'utf8')).join('') + '})();\n';
const dest = path.join(root, 'js', 'game.js'), destMin = path.join(root, 'js', 'game.min.js');
const min = require('esbuild').transformSync(out, { minify: true, legalComments: 'none' }).code;   // what index.html loads
if (process.argv.includes('--check')) {
  if (!fs.existsSync(dest) || fs.readFileSync(dest, 'utf8') !== out || !fs.existsSync(destMin) || fs.readFileSync(destMin, 'utf8') !== min) { console.error('js/game.js is out of date: run npm run build'); process.exit(1); }
  console.log('js/game.js is up to date');
} else { fs.writeFileSync(dest, out); fs.writeFileSync(destMin, min); console.log('built js/game.js (' + out.length + ' bytes) and js/game.min.js (' + min.length + ' bytes)'); }
