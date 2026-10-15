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
| `js/game.js` | built from `src/` by `npm run build` and committed, so the site runs without a build |
| `vendor/three.min.js` | three.js r160 (UMD build), self-hosted (MIT, see `vendor/three.LICENSE`) |
| `sw.js`, `manifest.webmanifest` | offline play and install as an app |
| `test/`, `tools/smoke.js` | Node unit tests and a headless-Chromium smoke test |

## Test
```
npm install && npm test      # unit tests
npm run build                # rebuild js/game.js after editing src/ (CI check: node tools/build.js --check)
node tools/ui-test.js        # headless UI checks
npm run smoke                # loads the game headless and reports console errors (needs Chromium; set CHROME=/path)
```

## Notes
- **Move buttons:** menu > "Move buttons…" lets you drag every on-screen control (and the throttle and countermeasure strip) where your thumbs rest, resize them (85–140%), or reset. Saved per device in localStorage.
- CI (`.github/workflows/ci.yml`) runs the unit tests, the bundle-freshness check and the four headless tests on every push.
- `flyout` (missile kinematics) now lives in `js/physics.js` with the other pure maths and is unit-tested.
- three.js is r160 with colour management off, linear output and legacy light units, so it looks like the original r128 build. r161+ drops the UMD build, so going further means moving to ES modules.
- Mission list includes a time-attack "Bandit rush" (8 kills in 5 minutes).
- More headless checks: `node tools/play-test.js` (cameras, weapons, countermeasures) and `node tools/rush-test.js`.
- Physics steps are capped at about 16.7 ms regardless of frame rate.
- If play stays under about 35 fps for a few seconds, graphics drop one tier automatically (your saved choice is untouched).
- Status messages are mirrored to a screen-reader live region; camera shake is reduced under `prefers-reduced-motion`.
- Multiplayer hit claims are client-reported (presence based): duplicates are ignored and a single claim is capped at 120 damage, but it is not cheat-proof without a server.
- Profiling the running game in headless Chromium showed essentially no JavaScript hot spots (frame time is GPU/fill bound), so the tiered graphics settings are the main lever.
- Accessibility: HUD colours can be switched to a colour-blind-safe blue/orange palette. First-run players are offered the guided lessons.
