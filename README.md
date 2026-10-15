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
| `js/game.js` | the game |
| `vendor/three.min.js` | three.js r128, self-hosted (MIT, see `vendor/three.LICENSE`) |
| `sw.js`, `manifest.webmanifest` | offline play and install as an app |
| `test/`, `tools/smoke.js` | Node unit tests and a headless-Chromium smoke test |

## Test
```
npm install && npm test      # unit tests
npm run smoke                # loads the game headless and reports console errors (needs Chromium; set CHROME=/path)
```

## Notes
- Physics steps are capped at about 16.7 ms regardless of frame rate.
- If play stays under about 35 fps for a few seconds, graphics drop one tier automatically (your saved choice is untouched).
- Status messages are mirrored to a screen-reader live region; camera shake is reduced under `prefers-reduced-motion`.
- Multiplayer hit claims are client-reported (presence based); it is fine for friendly rooms but not cheat-proof.
