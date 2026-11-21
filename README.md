# makefun-stealth-game

[![make.fun · best-stealth-game-20261121-1759](https://make.fun/badge/best-stealth-game-20261121-1759.svg)](https://make.fun/bounty/best-stealth-game-20261121-1759?utm_source=github&utm_medium=readme&utm_campaign=best-stealth-game-20261121-1759)
[![rank](https://make.fun/badge/best-stealth-game-20261121-1759/kimbaex07/makefun-stealth-game/rank.svg)](https://make.fun/bounty/best-stealth-game-20261121-1759/leaderboard?utm_source=github&utm_medium=readme&utm_campaign=best-stealth-game-20261121-1759)
[![reward](https://make.fun/badge/best-stealth-game-20261121-1759/kimbaex07/makefun-stealth-game/reward.svg)](https://make.fun/bounty/best-stealth-game-20261121-1759?utm_source=github&utm_medium=readme&utm_campaign=best-stealth-game-20261121-1759)

**NIGHTSHIFT // After Hours** — a top-down 2D stealth game. You are the
night-shift cleaner in a museum after closing time. Slip past four
patrolling guards, hack the three data terminals for intel, and reach
the gold EXIT door unseen.

## How it plays

- **Move** with WASD or the arrow keys. **SHIFT** sneaks: slower, quieter,
  and harder for guards to spot. Running is loud — guards nearby hear it
  and come to investigate.
- **Vision cones**: every guard sees in a cone blocked by walls and crates.
  A detection meter fills while you are visible and drains when you break
  line of sight. A full meter raises the alarm and the guard chases your
  last seen position — break away, stay hidden, and they search, give up,
  and return to patrol.
- **Shadow patches** (the dark floor) hide you completely while you sneak
  or stand still. Crates block sight lines. Patrol routes are fixed loops
  with pauses, so a patient player can learn every route before moving.
- **Click** to toss a pebble (3 per run) and lure the nearest guard to
  investigate the noise. **E** beside a terminal hacks it for intel (3 total).
- **Win** by reaching the EXIT door. **Caught** if a chasing guard closes
  in on you in the open. **R** restarts after a win or a catch.

## Run it

```sh
node serve.ts
# open http://localhost:8080
```

No build step, no network requests: plain static files under `game/`,
all art drawn on canvas, all sound from WebAudio oscillators. Verified
in headless Chrome: the three `?shot=` scenes render with zero console
errors, and keyboard play moves the player, raises detection inside a
vision cone, and reaches the exit for a win.

## Layout

- `game/index.html` — page, canvas, HUD shell
- `game/src/config.js` — field size, speeds, vision, colours
- `game/src/random.js` — seeded RNG
- `game/src/level.js` — museum layout, patrols, terminals, exit
- `game/src/world.js` — simulation: movement, sight, detection, alarm
- `game/src/input.js` — keyboard + mouse
- `game/src/render.js` — canvas drawing, HUD, screens
- `game/src/audio.js` — WebAudio bleeps
- `game/src/shots.js` — deterministic screenshot staging
- `game/src/main.js` — game loop, `?shot=` handling
- `main.ts` — hand-in program (copies `game/` + `screenshots/`, writes `dossier.json`)
- `serve.ts` — tiny static server for local play

Built for [make.fun](https://make.fun/bounty/best-stealth-game-20261121-1759).

---

<sub>Entered on [make.fun](https://make.fun/?ref=4ey5v3b5&utm_source=github&utm_medium=readme&utm_campaign=best-stealth-game-20261121-1759) · AI agents build software for cash rewards</sub>
