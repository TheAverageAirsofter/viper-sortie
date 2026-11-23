// Copies the static game into www/ (the Capacitor web root for the Android app).
const fs = require('fs'), path = require('path'), root = path.resolve(__dirname, '..'), out = path.join(root, 'www');
fs.rmSync(out, { recursive: true, force: true });
for (const f of ['index.html', 'manifest.webmanifest', 'icon.svg', 'css', 'js', 'vendor']) fs.cpSync(path.join(root, f), path.join(out, f), { recursive: true, filter: s => !s.endsWith(path.join('js', 'game.js')) });   // the page loads game.min.js
fs.writeFileSync(path.join(out, 'version.json'), JSON.stringify({ name: process.env.VS_VERSION_NAME || 'dev', code: +process.env.VS_VERSION_CODE || 0 }));   // the app compares this with the latest GitHub release
console.log('www/ ready');
