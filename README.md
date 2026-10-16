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
- **Menu:** a cinematic title screen, then a left-hand list (Campaign, Quick mission, Online, Hangar, Training, Settings) over the hangar scene, with film grain, letterbox bars and a slow camera drift (Settings > Display > Cinematic menu turns them off). Quick mission is "LABEL ... < Value >" rows plus a live briefing (map diagram, battle ratings with an out-of-range warning); Battle presets (Arcade / Realistic / Simulator) set difficulty, HUD markers, damage severity and a reward multiplier. Campaign is an operations map, Training a numbered lesson list with ticks, Settings has Controls / Display / Audio / HUD / Gameplay tabs with a description area. A top bar shows callsign, rank, XP, RP and Silver Lions; phones under 600 px get a bottom bar (Fly, Garage, Shop, Pilot). Launch shows a briefing card (tap to skip, or it starts after four seconds). The debrief is an after-action report with an itemised RP / Silver Lions breakdown, replay and scores tabs. Prompts at the bottom follow your last input (keyboard, gamepad or touch). Pilot also holds the crew cards and three daily tasks. Every screen fits a phone in landscape (844x390).
- **Modifications:** in Career every aircraft starts stock (reduced thrust, roll rate, countermeasures, missile performance, no drop tanks, half the missile load). The hangar Mods tab lets you research each module with that aircraft's RP and buy it with Silver Lions; tier II modules go past stock.
- **Progression (Career mode, War Thunder style):** flying sorties earns **Research Points (RP)** (credited to the aircraft you flew, plus 10 % as **Free RP**) and **Silver Lions (SL)**. In Hangar > Tech tree you research the next aircraft in each nation's tree (US, Russia, Europe, China) with RP from the aircraft it descends from, then buy it with SL. Each owned aircraft has six modules (engine, airframe, countermeasures, missiles) and the crew has three skills (anti-g, flight skill, ground crew). Losing the jet costs a repair bill that scales with battle rating (BR); with the Bandits setting on Mixed, enemies are picked within 1.0 BR of yours. Save data is `vsProg` in localStorage; players who already had rank-unlocked jets keep them. Free play keeps every aircraft unlocked.
- **Aircraft (70, all real types):** eight tech trees plus a single French jet. **USA:** F-4E, F/A-18C, F-15C, F-15E, F-16C, F-16 Block 70, F/A-18E, F-35A, F-15EX, F-22A. **Russia:** MiG-21bis, MiG-29 (9.12, UPG, K, MiG-35), Su-27, Su-33, Su-30SM, Su-35S, Su-57. **Germany:** F-104G, F-4F ICE, MiG-29G, Eurofighter EF2000 Tranche 1 and 3, F-35A. **Japan:** F-4EJ, F-4EJ Kai, F-15J, F-15J Kai, F-2A, F-35A, F-35B. **Israel:** F-4E (IAF), Kfir C.7, F-4E Kurnass 2000, F-15C Baz, F-16C Barak, F-16I Sufa, F-15I Ra'am, F-35I Adir. **Sweden:** J 35F Draken, JA 37 Viggen, JAS 39C and 39E Gripen. **United Kingdom:** Lightning F.6, Phantom FGR.2, Tornado F.3, Typhoon, F-35B. **China:** J-7G, J-10C, J-11B, J-15, J-16, J-20. **France:** Rafale C. **Cold War additions (BR 9.3-10.7, from the War Thunder wiki):** F-100D Super Sabre and F-8E Crusader (USA), MiG-19PT and MiG-21F-13 (Russia), Hunter F.6 (UK), Mirage IIIC (France), plus F-5E, F-14B, MiG-23ML, MiG-25PD, J-8F and Mirage F1C/2000-5F. Landings only destroy the jet for a clearly wrong arrival (gear up, off the runway, too fast, sink above 9 m/s); a firm landing costs airframe damage. Each has its own weights, thrust, missiles (AIM-7, Sky Flash, Rb 27/28, Python 3/4/5, Derby, AAM-3/4/5, R-3R, R-60, PL-8/10/12/15 ...), radar, countermeasures, cockpit and national markings. Older jets (Draken, Starfighter, MiG-21, Lightning, Kfir) have little or no radar-missile capability, so they are cheap to start with and hard to fly well. Figures marked est. in the code are game estimates.
- **Battle ratings and matchmaking:** every jet has a battle rating (BR) in the tech tree. Where War Thunder has the same or a very close aircraft in Realistic air battles, the BR follows it (checked against the War Thunder wiki and forum in 2026: F-16C 13.7, F-15C MSIP II 13.7, MiG-29SMT 13.3, Su-27 13.3, J-7E 11.3, J-10A 13.7, JA 37D 12.0, J 35D 10.0, F-4EJ Kai 12.3, Kfir C.7 12.0, F-4E 10.7, F-104G 10.7, Tornado F.3 about 12.7); the rest (F-22A, Su-57, F-35 variants, Block 70 and so on) are estimates placed next to their nearest relative. War Thunder shifts BRs with patches, so treat the numbers in `NODES` (`src/progress.js`) as a snapshot you can edit. **Bandits are only ever fighters within 0.7 BR of the jet you fly**, in Career and Free play, for every mission that has bandits; a fixed bandit type only counts while it is inside that window, and the Bandits row lists only the types that qualify. Scripted training targets and other players online are not filtered. Weapons and countermeasure counts follow War Thunder where the wiki or dev blogs gave them (F-16C: 6 air-to-air missiles; F-15C: 8 missiles and 240 countermeasures; MiG-21bis: GSh-23 with 250 rounds, 6 missiles, no countermeasures; F-104G: 750 rounds, 4 AIM-9B, 60 countermeasures; F-4E: 640 rounds, 90 countermeasures; JA 37: 6 short-range missiles + 2 Sky Flash; Kfir C.7: 4 Python 3, no radar missiles); the others use real-world loads.
- **Hangar** (menu > Hangar, or the Loadout button): the aircraft picker, loadout editor, canisters, paint and squadron live here instead of the main menu, with a spec sheet (airframe, performance worked out from the flight model, weapons, sensors, defences) and your jet parked on the floor of a steel hangar (gear down, canopy open, ladder, tool carts, a big door onto the apron, squadron banner). Look all the way around: drag to orbit (left/right and up/down), right-drag / shift-drag / two fingers to pan, WASD and Q/E to walk the view point, scroll or pinch to zoom, double-tap to reset, quick-view buttons (Front, Side, Rear, Top, Under, Cockpit, Engine, Spin); Esc to leave. Not available mid-sortie.
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
