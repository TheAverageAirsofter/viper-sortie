// Bundles three.js (node_modules/three) into vendor/three.min.js as a classic script that defines window.THREE,
// so the page works from file:// and inside the Android app with no module loader. usage: node tools/build-three.js
const esbuild = require('esbuild'), fs = require('fs'), path = require('path');
const root = path.resolve(__dirname, '..'), pkg = require(path.join(root, 'node_modules/three/package.json'));
esbuild.buildSync({ entryPoints: [path.join(root, 'node_modules/three/build/three.module.js')], bundle: true, format: 'iife', globalName: 'THREE', minify: true, outfile: path.join(root, 'vendor/three.min.js'), legalComments: 'none', banner: { js: '/* three.js v' + pkg.version + ' (MIT) bundled by tools/build-three.js */' } });
console.log('vendor/three.min.js = three v' + pkg.version + ' (' + fs.statSync(path.join(root, 'vendor/three.min.js')).size + ' bytes)');
