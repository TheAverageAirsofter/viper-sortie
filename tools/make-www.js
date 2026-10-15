// Copies the static game into www/ (the Capacitor web root for the Android app).
const fs = require('fs'), path = require('path'), root = path.resolve(__dirname, '..'), out = path.join(root, 'www');
fs.rmSync(out, { recursive: true, force: true });
for (const f of ['index.html', 'manifest.webmanifest', 'icon.svg', 'css', 'js', 'vendor']) fs.cpSync(path.join(root, f), path.join(out, f), { recursive: true });
console.log('www/ ready');
