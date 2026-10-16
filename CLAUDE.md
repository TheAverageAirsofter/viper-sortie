# Viper Sortie: notes for Claude

Mobile-first 3D F-16 combat flight sim. Static site, no framework. See README.md for the file layout.

## Rules that matter
- **Edit `src/*.js`, never `js/game.js` or `js/game.min.js`** (built files). After editing run `npm run build`; `npm test` fails if the bundles are stale. Commit the built files.
- `src/*.js` are ordered slices of ONE strict-mode IIFE (order is in `tools/build.js`). They share scope, so they are not standalone modules and top-level code can only use things defined in earlier slices (or hoisted functions).
- Pure physics lives in `js/physics.js` (unit-tested in Node). Everything else needs a browser.
- three.js is bundled by `npm run build:three` (esbuild) into `vendor/three.min.js`. Light intensities are scaled by `LK` (pi) because r165+ dropped legacy lights.
- Bump the cache name in `sw.js` when shipped files change.

## Single-file builds
`npm run build` also writes `dist/viper-sortie.cdn.html` and `dist/viper-sortie.html` (everything inlined) for the paste-into-chat / Artifact workflow. If the user brings back a single-file edit made in chat, diff it against the matching dist file and port the change into `src/`, then rebuild.

## Checks (run before pushing)
```
npm install
npm test                      # bundle freshness + unit tests
node tools/smoke.js           # loads and launches, no errors
node tools/ui-test.js         # first-run hint, palette
node tools/play-test.js       # cameras, weapons, countermeasures
node tools/rush-test.js       # Bandit rush mission
node tools/layout-test.js     # movable controls
node tools/features-test.js   # controls guide, mirror, text size, leaderboard
node tools/sim-test.js        # flight model and launch zones (uses the ?test hook)
```
Headless Chromium is at /opt/pw-browsers/chromium in the cloud sandbox (tools/launch.js finds it). Tests that click through gameplay set `vsTips` in localStorage to skip the controls guide.

## Android
`.github/workflows/android.yml` builds the APK with Capacitor (debug-signed). Manual run or a `v*` tag publishes a GitHub Release. Release signing and the Play Store .aab need the four ANDROID_* secrets described in that file. The sandbox cannot build the APK (no Google Maven access); only GitHub Actions can.

## Settings stored in localStorage
viperQuality, viperPal, viperLayout, viperText, viperRange, viperMission, vsLb_<mission>, vsTips, vsSeen, plus the original viper* keys.
