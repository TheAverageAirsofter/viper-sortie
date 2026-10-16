// Builds single-file versions of the game (the "paste it into Claude / publish as an Artifact" workflow) into dist/:
//   viper-sortie.html      everything inlined (three.js r170 + minified game), works offline, ~1 MB
//   viper-sortie.cdn.html  readable game code inline, three.js r128 from cdnjs: closest to the original single file, ~450 KB, easiest to edit in chat
// usage: node tools/build-single.js
const fs = require('fs'), path = require('path'), root = path.resolve(__dirname, '..'), rd = f => fs.readFileSync(path.join(root, f), 'utf8');
const safe = s => s.replace(/<\/script/gi, '<\\/script');
let html = rd('index.html');
const css = rd('css/style.css'), fontData = css.replace(/url\(\.\.\/fonts\/([^)]+)\)/g, (m, f) => 'url(data:font/woff2;base64,' + fs.readFileSync(path.join(root, 'fonts', f)).toString('base64') + ')'), cssNoFonts = css.replace(/@font-face\{[^}]*\}\n?/g, '');
let html0 = html;
html = html.replace('<link rel="stylesheet" href="css/style.css">', () => '@@CSS@@')
  .replace(/<link rel="manifest"[^>]*>\n?/, '').replace(/<link rel="icon"[^>]*>\n?/, '')
  .replace(/<script>if\('serviceWorker'[^\n]*<\/script>\n?/, '');
const make = (three, game, cssText) => html
  .replace('@@CSS@@', () => '<style>\n' + cssText + '</style>')
  .replace('<script src="vendor/three.min.js"></script>', () => three)
  .replace('<script src="js/physics.js"></script>', () => '<script>\n' + safe(rd('js/physics.js')) + '</script>')
  .replace('<script src="js/game.min.js"></script>', () => '<script>\n' + safe(rd(game)) + '</script>');
fs.mkdirSync(path.join(root, 'dist'), { recursive: true });
const full = make('<script>\n' + safe(rd('vendor/three.min.js')) + '</script>', 'js/game.min.js', fontData);
const cdn = make('<script src="https://cdnjs.cloudflare.com/ajax/libs/three.js/r128/three.min.js"></script>', 'js/game.js', cssNoFonts);
fs.writeFileSync(path.join(root, 'dist/viper-sortie.html'), full);
fs.writeFileSync(path.join(root, 'dist/viper-sortie.cdn.html'), cdn);
console.log('dist/viper-sortie.html ' + (full.length / 1024 | 0) + ' KB, dist/viper-sortie.cdn.html ' + (cdn.length / 1024 | 0) + ' KB');
