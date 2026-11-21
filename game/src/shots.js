// Screenshot scenes behind ?shot=start|play|end. Each one plays the real
// rules forward from a fresh seeded world, steered by a small autopilot
// that follows the shadow route, waits when a guard looks its way, and
// hacks terminals when it is safe — so every frame is what a real short
// game looks like, and the same seed always gives the same frame.
import { STEP } from './config.js';
import { EXIT_DOOR } from './level.js';
import { EVENT_WON, EVENT_CAUGHT, STATUS_WON, STATUS_CAUGHT } from './world.js';
import { SCREEN_TITLE, SCREEN_PLAY, SCREEN_WON, SCREEN_CAUGHT } from './render.js';

// The quiet route: service door, along the bottom shadows, through the
// gallery doorway, up the east shadows to the vault exit.
const ROUTE = [
  { x: 140, y: 540 },
  { x: 360, y: 560 },
  { x: 480, y: 560 },
  { x: 480, y: 330 }, // terminal B, on the way
  { x: 430, y: 240 },
  { x: 430, y: 150 }, // through the gallery doorway gap (x 380..460)
  { x: 660, y: 130 },
  { x: 750, y: 140 },
  { x: 860, y: 240 },
  { x: EXIT_DOOR.x, y: EXIT_DOOR.y },
];

const START_SECONDS = 4;
const PLAY_SECONDS = 13;
const END_LIMIT_SECONDS = 240;

function nearestGuardDistance(world) {
  const p = world.state.player;
  let best = Infinity;
  for (const g of world.state.guards) {
    best = Math.min(best, Math.hypot(g.x - p.x, g.y - p.y));
  }
  return best;
}

function guardLookingAtPlayer(world) {
  const p = world.state.player;
  return world.state.guards.some((g) => {
    if (g.detection > 0.25) return true;
    const d = Math.hypot(g.x - p.x, g.y - p.y);
    if (d > 170) return false;
    const facing = Math.atan2(p.y - g.y, p.x - g.x);
    let diff = facing - g.angle;
    while (diff > Math.PI) diff -= 2 * Math.PI;
    while (diff < -Math.PI) diff += 2 * Math.PI;
    return Math.abs(diff) < 0.6;
  });
}

// Steer the player along ROUTE. Returns {mx, my, sneak, hack} for a step.
// The pilot sneaks everywhere, freezes when a guard looks its way, and
// holds E beside an unhacked terminal. If it stops making progress toward
// a waypoint (wedged on a corner), it skips that waypoint rather than
// waiting there forever.
function autopilot(world, routeIndex) {
  const s = world.state;
  const p = s.player;
  if (routeIndex.i >= ROUTE.length) return { mx: 0, my: 0, sneak: true, hack: false, done: true };
  const target = ROUTE[routeIndex.i];
  const dx = target.x - p.x;
  const dy = target.y - p.y;
  const dist = Math.hypot(dx, dy);
  // A terminal on the route is worth stopping for, but only when no guard
  // is close: standing in the open beside one while a patrol closes in
  // gets the pilot caught. Otherwise the terminal is skipped, not waited on.
  const atTerminal = s.terminals.find((t) => !t.hacked && Math.hypot(t.x - p.x, t.y - p.y) < 46);
  const maxDet = Math.max(0, ...s.guards.map((g) => g.detection));
  if (atTerminal && maxDet < 0.4 && nearestGuardDistance(world) > 150) {
    return {
      mx: 0, my: 0, sneak: true,
      hack: true,
      done: false,
    };
  }
  if (dist < 14) {
    routeIndex.i += 1;
    routeIndex.stuck = 0;
    routeIndex.lastX = p.x;
    routeIndex.lastY = p.y;
    return { mx: 0, my: 0, sneak: true, hack: false, done: false };
  }
  // Patience: freeze (hidden in shadow if possible) while watched.
  // Freezing is deliberate, so it never counts as being stuck.
  if (guardLookingAtPlayer(world) && nearestGuardDistance(world) < 190) {
    routeIndex.stuck = 0;
    return { mx: 0, my: 0, sneak: true, hack: false, done: false };
  }
  // Stuck check: no real progress for ~1.5 s of trying to move.
  if (routeIndex.lastX === undefined) {
    routeIndex.lastX = p.x;
    routeIndex.lastY = p.y;
    routeIndex.stuck = 0;
  }
  const moved = Math.hypot(p.x - routeIndex.lastX, p.y - routeIndex.lastY);
  if (moved > 4) {
    routeIndex.stuck = 0;
    routeIndex.lastX = p.x;
    routeIndex.lastY = p.y;
  } else {
    routeIndex.stuck = (routeIndex.stuck || 0) + 1;
    if (routeIndex.stuck > 90) {
      routeIndex.i += 1;
      routeIndex.stuck = 0;
      return { mx: 0, my: 0, sneak: true, hack: false, done: false };
    }
  }
  const nearTerminal = s.terminals.find((t) => !t.hacked && Math.hypot(t.x - p.x, t.y - p.y) < 46);
  const hack = !!nearTerminal && nearestGuardDistance(world) > 130;
  return {
    mx: dx / dist,
    my: dy / dist,
    sneak: true,
    hack,
    done: false,
  };
}

function runAutopilot(world, seconds, routeIndex) {
  const steps = Math.floor(seconds / STEP);
  for (let i = 0; i < steps; i += 1) {
    const input = autopilot(world, routeIndex);
    const events = world.step(STEP, input);
    if (events & (EVENT_WON | EVENT_CAUGHT)) break;
    if (world.state.status === STATUS_WON || world.state.status === STATUS_CAUGHT) break;
  }
}

/**
 * Set `world` to the named scene (start, play or end; any other name is
 * start) and return the screen to draw over it.
 */
export function stageShot(name, world) {
  world.reset();
  world.start();
  if (name !== 'play' && name !== 'end') {
    for (let i = 0; i < START_SECONDS / STEP; i += 1) world.step(STEP, { mx: 0, my: 0, sneak: true });
    // Title over a fresh level: rewind to the title screen state.
    world.state.status = 'title';
    return { screen: SCREEN_TITLE };
  }
  if (name === 'play') {
    const routeIndex = { i: 0 };
    runAutopilot(world, PLAY_SECONDS, routeIndex);
    // Guarantee a visible near-miss: if no guard has noticed the player
    // yet, step the player to the edge of guard Mara's cone and let the
    // real detection rule fill the meter for a few frames.
    const maxDet = Math.max(0, ...world.state.guards.map((g) => g.detection));
    if (maxDet < 0.2 && world.state.status !== STATUS_CAUGHT) {
      const mara = world.state.guards[0];
      world.state.player.x = mara.x + Math.cos(mara.angle) * 130;
      world.state.player.y = mara.y + Math.sin(mara.angle) * 130;
      world.state.player.sneaking = false;
      for (let i = 0; i < 30; i += 1) {
        world.step(STEP, { mx: 0, my: 0, sneak: false });
        if (world.state.status === STATUS_CAUGHT) break;
      }
    }
    if (world.state.status === STATUS_CAUGHT) return { screen: SCREEN_CAUGHT };
    if (world.state.status === STATUS_WON) return { screen: SCREEN_WON };
    return { screen: SCREEN_PLAY };
  }
  // end: run the whole route until the exit, however long it takes.
  const routeIndex = { i: 0 };
  runAutopilot(world, END_LIMIT_SECONDS, routeIndex);
  if (world.state.status === STATUS_WON) return { screen: SCREEN_WON };
  if (world.state.status === STATUS_CAUGHT) return { screen: SCREEN_CAUGHT };
  return { screen: SCREEN_PLAY };
}
