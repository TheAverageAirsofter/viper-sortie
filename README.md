# Viper Sortie

Mobile-first 3D F-16 combat flight sim: energy-based flight model, radar and missiles, AI wings, carrier ops, campaign, replays and optional multiplayer. Static site, no build step.

## Run
```
npm run serve        # then open http://localhost:8080
```
Opening `index.html` directly also works (offline install/caching needs http(s)).

## Layout
| Path | What |
|---|---|
| `index.html` | markup and HUD controls |
| `css/style.css` | styles |
| `js/physics.js` | pure flight maths (atmosphere, drag, thrust), unit-tested |
| `src/*.js` | the game in ordered slices (data, render, cockpit, effects, audio, flight, ops, state, ai, combat, net, hud, main); they share one scope, so they are not standalone modules |
| `js/game.js`, `js/game.min.js` | built from `src/` by `npm run build` and committed; the page loads the minified one |
| `vendor/three.min.js` | three.js r170, bundled by `tools/build-three.js` (esbuild) into a classic script and self-hosted (MIT, see `vendor/three.LICENSE`) |
| `sw.js`, `manifest.webmanifest` | offline play and install as an app |
| `test/`, `tools/smoke.js` | Node unit tests and a headless-Chromium smoke test |

## Test
```
npm install && npm test      # unit tests
npm run build                # rebuild js/game.js after editing src/ (CI check: node tools/build.js --check)
node tools/ui-test.js        # headless UI checks
npm run smoke                # loads the game headless and reports console errors (needs Chromium; set CHROME=/path)
```

## Single-file versions (for pasting into Claude chat / publishing as an Artifact)
`npm run build` also writes `dist/viper-sortie.cdn.html` (about 450 KB: readable game code inline, three.js from cdnjs; closest to the original single file, easiest to edit in chat) and `dist/viper-sortie.html` (about 1 MB, everything inlined, works offline). Edits made to a single file in chat are not automatically merged back into `src/`; to bring them back, ask Claude Code to port the change into `src/`.

## Notes
- **Hangar** (menu > Hangar, or the Loadout button): the aircraft picker, loadout editor, canisters, paint and squadron live here instead of the main menu, with a spec sheet (airframe, performance worked out from the flight model, weapons, sensors, defences) and a turntable of your jet. Look all the way around the jet: drag to orbit (left/right and up/down), scroll or pinch to zoom, double-tap to reset, quick-view buttons (Front, Side, Rear, Top, Under, Cockpit, Engine, Spin); Esc to leave. Not available mid-sortie.
- **Jet models:** every lofted jet now has a pitot boom, blade antennas and chaff/flare dispenser bays; the F-16 and Block 70 gain a dorsal spine from canopy to fin.
- **Visual detail:** explosions are a white flash, fireball, embers, debris, rising smoke and an expanding shockwave ring; engine heat shimmer is a screen-space refraction patch behind the player's exhaust (needs three.js r135+ `FramebufferTexture`, so the r128 single-file build skips it); terrain has patchwork farmland, close-range grain and a surf line; the runway has weathered concrete, rubber, aiming-point and touchdown-zone markings; the cockpit has scuffed textured plastics, switch panels, harness straps and a rounded glare shield.
- **Visuals added:** settlement lights on low, gentle ground at dusk and night (re-laid with the terrain, about 1,800 points max), and thunderstorm lightning in rain (a stuttering scene flash and thunder after distance / 340 s). `?noaq` in the URL turns off the automatic quality drop for screenshots.
- **Realism details:** cannon rounds have quadratic drag fitted to the PGU-28 (about 1.4 s to 1 km, effective range roughly 1-1.5 km); the pipper and the AI's gun lead use the same ballistics. Angle of attack is shown on the HUD (linear lift curve to CLmax at about 26 deg). Explosions are heard after a speed-of-sound delay.
- **Controls guide** labels every button on the first launch (replay it from the menu). **HUD text size** and **Mirror left/right** (in Move buttons) help with comfort and left-handed play.
- **Best scores** are kept per mission on the device, and **Share result** uses the phone's share sheet (or copies the text).
- **Android release:** add the secrets listed at the top of `.github/workflows/android.yml` (keystore, passwords, alias) and the same workflow also builds a signed release APK and an `.aab` for the Play Store. Create the keystore yourself and keep it safe; losing it means you cannot update the app.
- `?test` in the URL exposes a small hook (`window.__vs`) used by `tools/sim-test.js`.
- **Engagement range** (menu): Short is the original (merge ~9-14 km), Long (default, ~2.5x) and Extreme (~4x) start fights farther out, so radar missiles are shot from range and there is time to notch, drag or defend. It scales wave, rush and escort merges and pushes the scripted 2v4 / 4-ship starts back.
- **Move buttons:** menu > "Move buttons…" lets you drag every on-screen control (and the throttle and countermeasure strip) where your thumbs rest, resize them (85–140%), or reset. Saved per device in localStorage.
- CI (`.github/workflows/ci.yml`) runs the unit tests, the bundle-freshness check and the four headless tests on every push.
- `flyout` (missile kinematics) now lives in `js/physics.js` with the other pure maths and is unit-tested.
- three.js is r170 bundled into a classic script (`npm run build:three`), so it works from file:// and in the APK. r165+ removed legacy lights, so light intensities are scaled by pi (`LK`) to keep the original look; colour management is off and output is linear.
- Mission list includes a time-attack "Bandit rush" (8 kills in 5 minutes).
- More headless checks: `node tools/play-test.js` (cameras, weapons, countermeasures) and `node tools/rush-test.js`.
- Physics steps are capped at about 16.7 ms regardless of frame rate.
- If play stays under about 35 fps for a few seconds, graphics drop one tier automatically (your saved choice is untouched).
- Status messages are mirrored to a screen-reader live region; camera shake is reduced under `prefers-reduced-motion`.
- Multiplayer hit claims are client-reported (presence based): duplicates are ignored and a single claim is capped at 120 damage, but it is not cheat-proof without a server.
- Profiling the running game in headless Chromium showed essentially no JavaScript hot spots (frame time is GPU/fill bound), so the tiered graphics settings are the main lever.
- Accessibility: HUD colours can be switched to a colour-blind-safe blue/orange palette. First-run players are offered the guided lessons.

## Android APK
`.github/workflows/android.yml` wraps the game with Capacitor and builds `viper-sortie.apk` (landscape, full screen, debug-signed so it installs directly).
- **Get it:** GitHub > Actions > *Android APK* > latest run > Artifacts, or run the workflow manually / push a `v*` tag to publish a downloadable GitHub Release.
- **Install:** allow "install unknown apps" for your browser, open the APK. It is a debug build, not a Play Store release; a Play Store build needs your own signing key.
- The web build needs no tooling; the APK build only runs in CI (it needs the Android SDK).
