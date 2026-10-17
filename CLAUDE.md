# Viper Sortie: notes for Claude

Mobile-first 3D F-16 combat flight sim. Static site, no framework. See README.md for the file layout. Developer / publisher name: **ValidAirsoft Productions** (title screen credit, README, package author).

## Modules
In Career a stock aircraft flies with penalties (`STOCK` in progress.js: -6 % thrust, -10 % roll, half countermeasures, -10 % missile range and agility, no drop tanks, half the missile load). The hangar **Mods** tab (`modsRender` in progressui.js) lists `MODS`: research with the RP earned in that aircraft (state `'r'` in `prog.mods[id]`), then buy with Silver Lions (`true`). Tier I modules lift the penalties and unlock pylons (`tnk1`, `ord1` gate `ldCap` in ops.js); tier II goes beyond stock. Free play ignores modules. Model size corrections live in `M2K` (roster.js).

## Menu notes
`src/menu.js` builds the AAA-style menu: title screen, a left-hand list (Campaign, Quick mission, Online, Hangar, Training, Settings), and panes for each. The original cycle buttons (bTime, bWx, bMission, bPal ...) live hidden in `#legacy`; the "LABEL ... < Value >" rows, sliders and action rows drive them with `drive(btn, getter, want)` and re-read the real game variables in `uiSync()`. Tests that need a setting click the row (`#qRows .mr[data-name=Time] .rm`, `#sRows .mr[...]`) or `document.getElementById(id).click()` for the legacy button. `tools/launch.js` gives test pages the title and the loading delay switched off and a `p.sortie()` helper (Quick mission, then Launch); set `TITLE=1` / `LOAD=1` to keep them. The menu scene is the hangar behind the overlay (`HG.bg`); `camGoal(pane)` eases the camera per pane. Design tokens are CSS variables at the top of `css/style.css` and on `#ov`.
Fonts (Barlow Condensed and Barlow, SIL OFL) are in `fonts/`; the full single-file build embeds them, the cdn build falls back to the Google Fonts link.
Progression extras: battle presets (`PRESETS` in state.js: difficulty, HUD marker level, damage severity, reward multiplier fed into `careerAward`), `progAward` also returns a `breakdown` of named RP and Silver Lion lines for the itemised debrief, daily tasks (`DAILY` in progress.js), and `__vs.endTest({cause,score,kills,t,alive})` to simulate a finished sortie in tests.

## Ground war
`src/groundwar.js` (slice after combat): `WAR_V` lists the War Thunder ground vehicles (M1A1, Leopard 2A4, Challenger, M60A3, M3 Bradley, Marder, Gepard 1A2, M163 Vulcan vs T-80B, T-72A, T-62, BMP-2, ZSU-23-4M4, ZSU-57-2). Red units are pushed into the `ground` list so your weapons, TGP and wingmen treat them as targets; blue units stay in `WAR.units` only. Vehicle models are built in `warBuild` from merged parts (hull, sides, turret, gun). Hits roll damage modules in `warModules` (tracks, engine, gun barrel, turret drive, crew, ammunition rack, fire; `hpSeen` detects hp lost to your bombs and guns too) and `warFlags` shows them on the HUD marker. `updateWar` runs from the main update, shells use their own pool, and the `GROUNDWAR` mission (`setupGroundWar`, `warCheck`) hooks into `sortieStatus` / `sortieCheck`.

## Aircraft roster
Base jets are in `src/data.js`; `src/roster.js` (slice 3, right after render) defines the rest with `dv(base, id, name, callsign, overrides)`, their lofted models (`M2.<id>`, or `m2Alias` to share a hull) and the PAINT / PODS / PITS rows. Tables owned by later slices (GEAR_SPEC, ENG_SND, JET_HP, RCS, FIGHTERS, BANDITS) are filled with `rosterFill(table, rows)` from `ROSTER_LIKE` (copy a row from a similar jet). New aircraft also need a `NODES` row in `src/progress.js` (nation, rank, BR, `req`); a node with no `req` is a root and must be in `PROG_START`. Station counts in `cm.stations` must match the model's `r9` / `r120` nodes; `node tools/roster-test.js` checks this, flies every jet and spawns every type as a bandit.

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
node tools/hangar-test.js     # hangar: loadout, specs, aircraft, paint
node tools/progress-test.js   # tech tree, research, buy, modules, crew, rewards
node tools/menu-test.js       # every menu screen fits 844x390, rows, presets, top bar, itemised debrief, research grid, crew, daily tasks, phone nav, briefing
node tools/roster-test.js     # every aircraft: data, stations, tables, a short sortie, and as a bandit
node tools/war-test.js        # ground war: WT armour fights itself, kills, mission win
node tools/weapons-test.js    # missile sanity for every type, live shots (rear-aspect seekers, SARH lock, AMRAAM, gun); slow (~8 min)
node tools/dims-test.js       # model length and span against tools/real-dims.json (add a row for every new aircraft)
node tools/visuals-test.js    # night lights, lightning, explosion, heat shimmer, every aircraft model
```
Headless Chromium is at /opt/pw-browsers/chromium in the cloud sandbox (tools/launch.js finds it). Tests that click through gameplay set `vsTips` in localStorage to skip the controls guide.

## Android
**Standing instruction from the owner: after every change that ships (anything under src/, css/, js/, index.html, tools that feed the build), push the branch and then run the "Android APK" workflow (`android.yml`, workflow_dispatch) with the next version number, so the public release APK is always current.** Find the latest release (v44 as of Oct 2026), use the next `vNN` as the `version` input and the working branch as the ref. Docs-only changes don't need a release. Tell the owner the run link and that it was queued.
`.github/workflows/android.yml` builds the APK with Capacitor (debug-signed). Manual run or a `v*` tag publishes a GitHub Release. Release signing and the Play Store .aab need the four ANDROID_* secrets described in that file. The sandbox cannot build the APK (no Google Maven access); only GitHub Actions can.

## Keyboard + mouse
Settings > Controls > Input (`vsKbm`, `KBM` in state.js): the mouse is a relative virtual stick (click captures the pointer, Esc releases and pauses), LMB gun, RMB AIM-9, MMB AIM-120, wheel / W,S throttle, A/D rudder. Mouse aim (`KBM.aim`, default): the cursor is a world direction (`KBM.az/el/ad`) and `updatePlayer` rolls and pulls the nose onto it; the other option deflects the stick directly. `tools/kbm-test.js` covers it.

## Scoring and damage
`scEvent` / `scKill` (state.js) feed the War Thunder style score lines (`SC.list`, drawn in hud.js): hits coalesce, kills chain into double/triple kill bonuses, assists. Player damage (`damageSystem`, `updateSystems`): engine fire, hydraulics, radar, fuel leak, wings (`P.sys.wL/wR`: lower G limit, roll drift, smoke, can tear off under load), elevator, jammed guns, wounded pilot. `tools/score-test.js` and `tools/damage-test.js` cover them. Tactical map: `TMAP` / `drawMap` in hud.js (Tab or the MAP button in the radar panel; scales 20/50/120 km). Ammunition: `BELTS` / `FUSES` in ops.js (hangar loadout buttons `bBelt`, `bFuse`; gun belt scales air and ground damage, bomb fuse scales blast on hard and soft targets).

## Air battle
`src/battle.js` (slice after groundwar): the `BATTLE` mission (Air domination). `BT` holds points, three capture zones (`BT_ZONES`, radius `BT_R`), the lineup and respawn state; `btTick` (from the main loop, runs while dead too) captures zones, drains points, spawns replacements and ends the battle through `endMission`. AI jets get `e.wp` (the zone to fly to) which `updateAI` follows when they have no target. `die()` calls `btDied` (the sortie continues, `deadT` is held open), the `#btPick` panel lists the lineup, `btRespawn` swaps `AC` via `applyAC` + `resetPlayer`, and `updateCamera` spectates a team-mate meanwhile. The tactical map draws the zones. `tools/battle-test.js` covers it.

## Windows exe
The `exe` job in `android.yml` (runs after the `apk` job, so the same dispatch and version number publish both) packs `www/` (from `tools/make-www.js`, plus `fonts/`) with Electron (`desktop/main.js`, electron-builder portable) into a single `viper-sortie.exe` and attaches it to the same release. F11 / Alt+Enter toggles full screen; Shift+Esc leaves it. Unsigned, so Windows SmartScreen shows a warning on first run. The sandbox cannot build it; only Actions can.

## Settings stored in localStorage
vsProg (progression), vsPreset (battle preset), vsDaily (daily task progress: day, counters, done flags; resets at local midnight), vsTitle ('0' skips the title screen), vsFx ('0' turns off grain, letterbox, flare and camera drift), vsUiSnd ('0' mutes menu sounds), vsLessonsDone (completed training lessons), viperQuality, viperPal, viperLayout, viperText, viperRange, viperMission, vsLb_<mission>, vsTips, vsSeen, plus the original viper* keys.
